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

// LLM 원출력은 느슨하게 파싱만 한다(무료 모델이 형식을 완벽히 지키지 않으므로).
// 실제 정규화(길이 제한, 날짜 형식 검증→null)는 ai.ts에서 수행해 검증 실패로 전체를 버리지 않는다.
export const summarizeOutputSchema = z.object({
  summary: z.string().min(1),
});

export const extractTasksOutputSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      assigneeGuess: z.string().nullish(),
      dueDateGuess: z.string().nullish(),
    })
  ),
});

/** 정규화된 추출 태스크 초안 (ai.ts가 반환하고 service가 저장) */
export interface ExtractedTaskDraft {
  title: string;
  assigneeGuess: string | null;
  dueDateGuess: string | null;
}

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type ApproveExtractedTaskInput = z.infer<typeof approveExtractedTaskSchema>;
export type ExtractTasksOutput = z.infer<typeof extractTasksOutputSchema>;
