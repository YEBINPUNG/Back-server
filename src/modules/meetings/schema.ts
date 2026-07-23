import { z } from "zod";

export const createMeetingSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(200),
  rawContent: z.string().trim().min(1, "회의록 내용을 입력해주세요.").max(20000),
  meetingDate: z.coerce.date(),
});

export const updateMeetingSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  rawContent: z.string().trim().min(1).max(20000).optional(),
  meetingDate: z.coerce.date().optional(),
});

export const approveExtractedTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  estimatedHours: z.number().positive().max(1000).nullable().optional(),
});

// ── LLM 출력 검증 스키마 ──

export const summarizeOutputSchema = z.object({
  summary: z.string().trim().min(1).max(4000),
});

export const extractTasksOutputSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        assigneeGuess: z.string().trim().max(50).nullable().optional(),
        dueDateGuess: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다.")
          .nullable()
          .optional(),
      })
    )
    .max(30),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type ApproveExtractedTaskInput = z.infer<typeof approveExtractedTaskSchema>;
export type ExtractTasksOutput = z.infer<typeof extractTasksOutputSchema>;
