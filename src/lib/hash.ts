import bcrypt from "bcrypt";
import { createHash } from "crypto";

const BCRYPT_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** refresh token은 원문을 DB에 저장하지 않고 SHA-256 해시만 저장한다 (설계서 §4.2, §8) */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
