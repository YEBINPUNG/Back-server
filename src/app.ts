import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

export function createApp() {
  const app = express();

  // 리버스 프록시(Caddy/ALB) 뒤에서 실행되므로 첫 번째 홉을 신뢰한다.
  // (express-rate-limit의 클라이언트 IP 식별, secure 쿠키 판단에 필요)
  app.set("trust proxy", 1);

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/v1", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
