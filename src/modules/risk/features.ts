import { Task, TaskStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { TaskFeatures } from "./schema";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 결정적 피처 계산 (설계서 §7.2 1단계) */
export async function computeTaskFeatures(task: Task): Promise<TaskFeatures> {
  const now = Date.now();

  const daysUntilDue = task.dueDate ? Math.ceil((task.dueDate.getTime() - now) / MS_PER_DAY) : null;

  const lastHistory = await prisma.taskHistory.findFirst({
    where: { taskId: task.id },
    orderBy: { createdAt: "desc" },
  });
  const lastUpdateTime = lastHistory?.createdAt ?? task.updatedAt;
  const daysSinceLastUpdate = Math.max(0, Math.floor((now - lastUpdateTime.getTime()) / MS_PER_DAY));

  const assigneeConcurrentTasks = task.assigneeId
    ? await prisma.task.count({
        where: {
          projectId: task.projectId,
          assigneeId: task.assigneeId,
          deletedAt: null,
          status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
        },
      })
    : 0;

  let elapsedVsEstimate: number | null = null;
  if (task.estimatedHours && task.estimatedHours > 0) {
    const elapsedHours = (now - task.createdAt.getTime()) / (60 * 60 * 1000);
    elapsedVsEstimate = Number((elapsedHours / task.estimatedHours).toFixed(2));
  }

  return { daysUntilDue, daysSinceLastUpdate, assigneeConcurrentTasks, elapsedVsEstimate };
}
