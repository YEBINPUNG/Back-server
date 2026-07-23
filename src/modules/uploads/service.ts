import { env } from "../../config/env";
import { AppError } from "../../lib/AppError";
import { logger } from "../../lib/logger";
import { createUploadUrl, createDownloadUrl } from "../../lib/s3";
import { PresignUploadInput } from "./schema";

const STORAGE_UNAVAILABLE = new AppError(
  503,
  "STORAGE_NOT_CONFIGURED",
  "파일 저장소(S3)가 설정되지 않았습니다. 관리자에게 문의하세요."
);

function assertBucketConfigured() {
  if (!env.S3_BUCKET) {
    throw STORAGE_UNAVAILABLE;
  }
}

/**
 * presign 실행 중 자격 증명 해석 실패는 "저장소 미설정"으로 간주해 503으로 변환한다.
 * (EC2 IAM 역할/환경변수 등 자격 증명이 없으면 서명 자체가 불가능하므로 500 대신 명확한 503을 반환)
 */
function isCredentialsError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const name = err.name ?? "";
  const message = err.message ?? "";
  return /credential/i.test(name) || /credential/i.test(message);
}

async function runPresign<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isCredentialsError(err)) {
      logger.error({ err }, "S3 자격 증명 해석 실패 — 저장소 미설정으로 처리");
      throw STORAGE_UNAVAILABLE;
    }
    throw err;
  }
}

export async function createUploadPresign(input: PresignUploadInput) {
  assertBucketConfigured();
  const { url, key } = await runPresign(() => createUploadUrl(input.fileName, input.contentType));
  return { uploadUrl: url, key, expiresInSeconds: 300 };
}

export async function createDownloadPresign(key: string) {
  assertBucketConfigured();
  const url = await runPresign(() => createDownloadUrl(key));
  return { downloadUrl: url, key, expiresInSeconds: 300 };
}
