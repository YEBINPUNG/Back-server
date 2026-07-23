import { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/AppError";
import { verifyAccessToken } from "../lib/jwt";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(AppError.unauthorized("로그인이 필요합니다."));
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch {
    next(AppError.unauthorized("토큰이 유효하지 않거나 만료되었습니다.", "INVALID_TOKEN"));
  }
}
