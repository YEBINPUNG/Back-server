import { RiskLevel, Task, TaskStatus, User } from "@prisma/client";
import { prisma } from "../../lib/prisma";

const UPCOMING_DUE_WINDOW_DAYS = 3;

type TaskWithAssignee = Task & { assignee: Pick<User, "id" | "name"> | null };

function mapTaskSummary(task: TaskWithAssignee) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    dueDate: task.dueDate,
    assignee: task.assignee ? { id: task.assignee.id, name: task.assignee.name } : null,
  };
}

export async function getDashboard(projectId: string) {
  const tasks = await prisma.task.findMany({
    where: { projectId, deletedAt: null },
    include: { assignee: { select: { id: true, name: true } } },
  });

  const statusCounts: Record<TaskStatus, number> = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  const memberLoad = new Map<string, { userId: string; name: string; count: number }>();

  const now = Date.now();
  const upcoming: TaskWithAssignee[] = [];
  const overdue: TaskWithAssignee[] = [];

  for (const task of tasks) {
    statusCounts[task.status]++;

    if (task.assignee && task.status !== TaskStatus.DONE) {
      const entry = memberLoad.get(task.assignee.id) ?? {
        userId: task.assignee.id,
        name: task.assignee.name,
        count: 0,
      };
      entry.count++;
      memberLoad.set(task.assignee.id, entry);
    }

    if (task.dueDate && task.status !== TaskStatus.DONE) {
      const dueTime = task.dueDate.getTime();
      if (dueTime < now) {
        overdue.push(task);
      } else if (dueTime - now <= UPCOMING_DUE_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
        upcoming.push(task);
      }
    }
  }

  const total = tasks.length;
  const progressRate = total === 0 ? 0 : Math.round((statusCounts.DONE / total) * 100);

  const latestRisks = await prisma.taskRiskAssessment.findMany({
    where: {
      task: { projectId, deletedAt: null },
      riskLevel: { in: [RiskLevel.HIGH, RiskLevel.MEDIUM] },
    },
    orderBy: { createdAt: "desc" },
    distinct: ["taskId"],
    include: { task: { select: { id: true, title: true } } },
  });

  return {
    statusCounts,
    progressRate,
    memberLoad: Array.from(memberLoad.values()).sort((a, b) => b.count - a.count),
    upcomingTasks: upcoming
      .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0))
      .map(mapTaskSummary),
    overdueTasks: overdue
      .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0))
      .map(mapTaskSummary),
    riskyTasks: latestRisks.map((r) => ({
      taskId: r.taskId,
      title: r.task.title,
      riskLevel: r.riskLevel,
      probability: r.probability,
    })),
  };
}
