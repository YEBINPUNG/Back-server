import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/AppError";
import { hashPassword, verifyPassword, hashToken } from "../../lib/hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt";
import { parseDurationMs } from "../../lib/duration";
import { env } from "../../config/env";
import { LoginInput, SignupInput } from "./schema";

interface PublicUser {
  id: string;
  email: string;
  name: string;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

async function issueTokens(userId: string, email: string): Promise<Tokens> {
  const accessToken = signAccessToken({ userId, email });
  const jti = randomUUID();
  const refreshToken = signRefreshToken({ userId, jti });
  const expiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN));

  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

export async function signup(input: SignupInput): Promise<{ user: PublicUser } & Tokens> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict("이미 가입된 이메일입니다.", "EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email: input.email, passwordHash, name: input.name },
  });

  const tokens = await issueTokens(user.id, user.email);
  return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
}

export async function login(input: LoginInput): Promise<{ user: PublicUser } & Tokens> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || user.deletedAt) {
    throw AppError.unauthorized("이메일 또는 비밀번호가 올바르지 않습니다.", "INVALID_CREDENTIALS");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw AppError.unauthorized("이메일 또는 비밀번호가 올바르지 않습니다.", "INVALID_CREDENTIALS");
  }

  const tokens = await issueTokens(user.id, user.email);
  return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
}

export async function refresh(oldRefreshToken: string): Promise<{ user: PublicUser } & Tokens> {
  let payload;
  try {
    payload = verifyRefreshToken(oldRefreshToken);
  } catch {
    throw AppError.unauthorized("리프레시 토큰이 유효하지 않습니다.", "INVALID_REFRESH_TOKEN");
  }

  const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
  const isValid =
    stored &&
    !stored.revokedAt &&
    stored.expiresAt.getTime() > Date.now() &&
    stored.tokenHash === hashToken(oldRefreshToken);

  if (!stored || !isValid) {
    throw AppError.unauthorized("리프레시 토큰이 유효하지 않습니다.", "INVALID_REFRESH_TOKEN");
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || user.deletedAt) {
    throw AppError.unauthorized("사용자를 찾을 수 없습니다.", "USER_NOT_FOUND");
  }

  // 회전(rotation): 기존 refresh token은 즉시 폐기하고 새 토큰을 발급한다.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokens(user.id, user.email);
  return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
}

export async function logout(refreshTokenRaw: string | undefined): Promise<void> {
  if (!refreshTokenRaw) return;

  try {
    const payload = verifyRefreshToken(refreshTokenRaw);
    await prisma.refreshToken.updateMany({
      where: { id: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    // 이미 만료되었거나 위조된 토큰은 조용히 무시한다.
  }
}
