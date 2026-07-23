import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ListAuditLogsQuery } from "./schema";

/**
 * 프로젝트의 감사 로그를 최신순으로 조회한다. (설계서 §8: 모든 변경 추적)
 * 커서 기반 페이지네이션: 마지막 항목의 id를 cursor로 넘기면 그 다음 페이지를 반환한다.
 */
export async function listProjectAuditLogs(projectId: string, query: ListAuditLogsQuery) {
  const where: Prisma.AuditLogWhereInput = {
    projectId,
    action: query.action,
    actorId: query.actorId,
  };

  // limit + 1건을 조회해 다음 페이지 존재 여부(hasMore)를 판단한다.
  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > query.limit;
  const logs = hasMore ? rows.slice(0, query.limit) : rows;

  // 행위자 이름을 함께 내려준다 (actorId는 FK가 아니라 문자열이므로 별도 조회).
  const actorIds = Array.from(new Set(logs.map((log) => log.actorId)));
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true, email: true },
  });
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  return {
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      target: log.target,
      detail: log.detail,
      createdAt: log.createdAt,
      actor: actorMap.get(log.actorId) ?? { id: log.actorId, name: null, email: null },
    })),
    nextCursor: hasMore ? logs[logs.length - 1].id : null,
  };
}
