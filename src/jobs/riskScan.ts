import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { scanProjectRisks } from "../modules/risk/service";

async function runDailyRiskScan() {
  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  logger.info({ projectCount: projects.length }, "일일 지연 위험 스캔 시작");

  for (const project of projects) {
    try {
      const results = await scanProjectRisks(project.id);
      logger.info({ projectId: project.id, assessed: results.length }, "프로젝트 위험 스캔 완료");
    } catch (err) {
      logger.error({ err, projectId: project.id }, "프로젝트 위험 스캔 실패");
    }
  }
}

/** 매일 오전 9시(KST) 전체 프로젝트 지연 위험 자동 스캔 (설계서 §7.2 5단계) */
export function scheduleRiskScanJob() {
  cron.schedule("0 9 * * *", () => {
    runDailyRiskScan().catch((err) => logger.error({ err }, "일일 위험 스캔 작업 실패"));
  }, { timezone: "Asia/Seoul" });

  logger.info("일일 지연 위험 스캔 cron job 등록 완료 (매일 09:00 Asia/Seoul)");
}
