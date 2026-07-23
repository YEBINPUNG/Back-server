import { TaskStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/AppError";
import { logger } from "../../lib/logger";
import { computeTaskFeatures } from "./features";
import { ruleBasedAssess } from "./rules";
import { refineRiskWithLLM } from "./ai";
import { FeatureReason } from "./schema";

async function assessAndSaveTaskRisk(task: Awaited<ReturnType<typeof getActiveTasks>>[number]) {
  const features = await computeTaskFeatures(task);
  const ruleAssessment = ruleBasedAssess(features);

  const refined = await refineRiskWithLLM(task, features, ruleAssessment);

  const riskLevel = refined?.riskLevel ?? ruleAssessment.riskLevel;
  const probability = refined?.probability ?? ruleAssessment.probability;
  const reasons: (FeatureReason | { factor: "ai_narrative"; note: string })[] = [...ruleAssessment.reasons];
  if (refined?.narrative) {
    reasons.push({ factor: "ai_narrative", note: refined.narrative });
  }

  return prisma.taskRiskAssessment.create({
    data: {
      taskId: task.id,
      riskLevel,
      probability,
      reasons: reasons as any,
    },
  });
}

function getActiveTasks(projectId: string) {
  return prisma.task.findMany({
    where: {
      projectId,
      deletedAt: null,
      status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
    },
  });
}

export async function scanProjectRisks(projectId: string) {
  const tasks = await getActiveTasks(projectId);

  const results = [];
  for (const task of tasks) {
    try {
      results.push(await assessAndSaveTaskRisk(task));
    } catch (err) {
      logger.error({ err, taskId: task.id }, "태스크 위험도 평가 실패 — 건너뜀");
    }
  }

  return results;
}

export async function listProjectRisks(projectId: string) {
  return prisma.taskRiskAssessment.findMany({
    where: { task: { projectId, deletedAt: null } },
    orderBy: { createdAt: "desc" },
    distinct: ["taskId"],
    include: { task: { select: { id: true, title: true, status: true, dueDate: true, assigneeId: true } } },
  });
}

export async function listTaskRisks(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.deletedAt) {
    throw AppError.notFound("태스크를 찾을 수 없습니다.");
  }

  return prisma.taskRiskAssessment.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  });
}
