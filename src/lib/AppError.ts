export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, code = "BAD_REQUEST", details?: unknown) {
    return new AppError(400, code, message, details);
  }

  static unauthorized(message = "인증이 필요합니다.", code = "UNAUTHORIZED") {
    return new AppError(401, code, message);
  }

  static forbidden(message = "권한이 없습니다.", code = "FORBIDDEN") {
    return new AppError(403, code, message);
  }

  static notFound(message = "리소스를 찾을 수 없습니다.", code = "NOT_FOUND") {
    return new AppError(404, code, message);
  }

  static conflict(message: string, code = "CONFLICT") {
    return new AppError(409, code, message);
  }

  static tooManyRequests(message = "요청이 너무 많습니다.", code = "TOO_MANY_REQUESTS") {
    return new AppError(429, code, message);
  }

  static internal(message = "서버 오류가 발생했습니다.", code = "INTERNAL_ERROR") {
    return new AppError(500, code, message);
  }
}
