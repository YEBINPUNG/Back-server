import { z } from "zod";

// 업로드 허용 MIME 타입 화이트리스트 (설계서 §8: 입력 검증)
export const ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const presignUploadSchema = z.object({
  fileName: z.string().trim().min(1, "파일 이름을 입력해주세요.").max(255),
  contentType: z.enum(ALLOWED_CONTENT_TYPES, {
    errorMap: () => ({ message: "허용되지 않는 파일 형식입니다." }),
  }),
});

export const presignDownloadQuerySchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "파일 key를 입력해주세요.")
    .max(512)
    // 업로드 시 생성되는 uploads/<uuid>-<name> 형태만 허용해 임의 객체 접근을 차단한다.
    .regex(/^uploads\/[a-zA-Z0-9._\-/]+$/, "잘못된 파일 key입니다."),
});

export type PresignUploadInput = z.infer<typeof presignUploadSchema>;
export type PresignDownloadQuery = z.infer<typeof presignDownloadQuerySchema>;
