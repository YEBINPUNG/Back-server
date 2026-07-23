import { prisma } from "./prisma";

interface AuditLogInput {
  projectId?: string | null;
  actorId: string;
  action: string;
  target: string;
  detail?: unknown;
}

/** 변경 이력 감사 로그 기록 (설계서 §8: 모든 변경은 TaskHistory/AuditLog로 추적) */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      projectId: input.projectId ?? null,
      actorId: input.actorId,
      action: input.action,
      target: input.target,
      detail: input.detail as any,
    },
  });
}
