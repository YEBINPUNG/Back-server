import rateLimit from "express-rate-limit";

export const loginRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요." } },
});

export const llmRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? req.ip ?? "anonymous",
  message: { error: { code: "TOO_MANY_REQUESTS", message: "AI 호출이 너무 많습니다. 잠시 후 다시 시도하세요." } },
});

// 전역 기본 리밋: 무차별 요청/DoS 완화. 정상 사용에는 지장 없는 수준(IP당 분당 300).
export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." } },
});
