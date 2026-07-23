import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 characters"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("30m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("14d"),

  // LLM 공급자는 OpenAI 호환 API로 추상화한다. 기본값은 무료 티어인 Google Gemini.
  // Groq 등 다른 공급자로 바꾸려면 LLM_BASE_URL / LLM_MODEL / LLM_API_KEY만 교체하면 된다.
  LLM_API_KEY: z.string().min(1, "LLM_API_KEY is required"),
  LLM_BASE_URL: z.string().url().default("https://generativelanguage.googleapis.com/v1beta/openai/"),
  LLM_MODEL: z.string().default("gemini-2.5-flash"),

  AWS_REGION: z.string().default("ap-northeast-2"),
  S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("환경변수 검증 실패:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
