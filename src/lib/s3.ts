import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { env } from "../config/env";

export const s3Client = new S3Client({ region: env.AWS_REGION });

const PRESIGN_EXPIRES_SECONDS = 300;

export async function createUploadUrl(originalName: string, contentType: string) {
  if (!env.S3_BUCKET) {
    throw new Error("S3_BUCKET이 설정되지 않았습니다.");
  }
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `uploads/${randomUUID()}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: PRESIGN_EXPIRES_SECONDS });
  return { url, key };
}

export async function createDownloadUrl(key: string) {
  if (!env.S3_BUCKET) {
    throw new Error("S3_BUCKET이 설정되지 않았습니다.");
  }
  const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: PRESIGN_EXPIRES_SECONDS });
}
