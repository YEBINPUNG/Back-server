import { z } from "zod";
import { TaskStatus } from "@prisma/client";

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(200),
  description: z.string().max(4000).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  estimatedHours: z.number().positive().max(1000).nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(4000).nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  estimatedHours: z.number().positive().max(1000).nullable().optional(),
});

export const listTasksQuerySchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  assigneeId: z.string().uuid().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
