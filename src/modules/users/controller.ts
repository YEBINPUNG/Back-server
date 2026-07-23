import { NextFunction, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/AppError";

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) {
      throw AppError.notFound("사용자를 찾을 수 없습니다.");
    }

    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}
