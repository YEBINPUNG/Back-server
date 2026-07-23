import { Prisma, ProjectRole, Task } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/AppError";
import { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from "./schema";

async function assertAssigneeIsMember(projectId: string, assigneeId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: assigneeId } },
  });
  if (!member) {
    throw AppError.badRequest("담당자가 프로젝트 멤버가 아닙니다.", "ASSIGNEE_NOT_MEMBER");
  }
}

export async function createTask(projectId: string, input: CreateTaskInput) {
  if (input.assigneeId) {
    await assertAssigneeIsMember(projectId, input.assigneeId);
  }

  return prisma.task.create({
    data: {
      projectId,
      title: input.title,
      description: input.description,
      assigneeId: input.assigneeId ?? null,
      status: input.status,
      dueDate: input.dueDate ?? null,
      estimatedHours: input.estimatedHours ?? null,
    },
  });
}

export async function listTasks(projectId: string, filters: ListTasksQuery) {
  return prisma.task.findMany({
    where: {
      projectId,
      deletedAt: null,
      status: filters.status,
      assigneeId: filters.assigneeId,
    },
    orderBy: { createdAt: "desc" },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
  });
}

async function getActiveTask(taskId: string): Promise<Task> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.deletedAt) {
    throw AppError.notFound("태스크를 찾을 수 없습니다.");
  }
  return task;
}

export async function getTask(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      history: { orderBy: { createdAt: "desc" }, take: 50 },
      risks: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!task || task.deletedAt) {
    throw AppError.notFound("태스크를 찾을 수 없습니다.");
  }
  return task;
}

const TRACKED_FIELDS = ["title", "description", "status", "assigneeId", "dueDate", "estimatedHours"] as const;

function serializeForHistory(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export async function updateTask(taskId: string, actorId: string, input: UpdateTaskInput) {
  const task = await getActiveTask(taskId);

  if (input.assigneeId) {
    await assertAssigneeIsMember(task.projectId, input.assigneeId);
  }

  const data: Prisma.TaskUpdateInput = {};
  const historyEntries: { field: string; oldValue: string | null; newValue: string | null }[] = [];

  for (const field of TRACKED_FIELDS) {
    if (!(field in input)) continue;
    const newValue = (input as Record<string, unknown>)[field];
    const oldValue = (task as Record<string, unknown>)[field];
    const oldSerialized = serializeForHistory(oldValue);
    const newSerialized = serializeForHistory(newValue);
    if (oldSerialized === newSerialized) continue;

    (data as Record<string, unknown>)[field] = newValue;
    historyEntries.push({ field, oldValue: oldSerialized, newValue: newSerialized });
  }

  if (historyEntries.length === 0) {
    return task;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.task.update({ where: { id: taskId }, data });
    if (historyEntries.length > 0) {
      await tx.taskHistory.createMany({
        data: historyEntries.map((entry) => ({
          taskId,
          actorId,
          field: entry.field,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
        })),
      });
    }
    return result;
  });

  return updated;
}

export function canDeleteTask(task: Task, role: ProjectRole, userId: string): boolean {
  if (role === ProjectRole.OWNER) return true;
  if (role === ProjectRole.MEMBER) return task.assigneeId === userId;
  return false;
}

export async function softDeleteTask(taskId: string, actorId: string, role: ProjectRole) {
  const task = await getActiveTask(taskId);

  if (!canDeleteTask(task, role, actorId)) {
    throw AppError.forbidden("본인이 담당한 태스크만 삭제할 수 있습니다.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.update({ where: { id: taskId }, data: { deletedAt: new Date() } });
    await tx.taskHistory.create({
      data: { taskId, actorId, field: "deletedAt", oldValue: null, newValue: new Date().toISOString() },
    });
  });
}
