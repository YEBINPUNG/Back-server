import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../lib/AppError";
import { logger } from "../lib/logger";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "요청한 경로를 찾을 수 없습니다." },
  });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err }, err.message);
    }
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "요청 값이 올바르지 않습니다.",
        details: err.flatten(),
      },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({
        error: { code: "DUPLICATE_RESOURCE", message: "이미 존재하는 리소스입니다." },
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "리소스를 찾을 수 없습니다." },
      });
      return;
    }
  }

  // body-parser 등 하위 미들웨어가 던지는 클라이언트 오류(잘못된 JSON, 페이로드 초과 등)는
  // 500이 아니라 해당 4xx로 반환한다. (예: 깨진 JSON → 400)
  const httpStatus = (err as { status?: number; statusCode?: number })?.status ??
    (err as { status?: number; statusCode?: number })?.statusCode;
  if (typeof httpStatus === "number" && httpStatus >= 400 && httpStatus < 500) {
    res.status(httpStatus).json({
      error: { code: "BAD_REQUEST", message: "요청을 처리할 수 없습니다. 입력을 확인해주세요." },
    });
    return;
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
  });
}
