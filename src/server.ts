import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { scheduleRiskScanJob } from "./jobs/riskScan";
import { prisma } from "./lib/prisma";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`서버가 포트 ${env.PORT}에서 실행 중입니다. (${env.NODE_ENV})`);
  scheduleRiskScanJob();
});

async function shutdown(signal: string) {
  logger.info(`${signal} 수신 — 서버 종료 중...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
