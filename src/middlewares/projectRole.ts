import { NextFunction, Request, Response } from "express";
import { ProjectRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/AppError";

const ROLE_ORDER: Record<ProjectRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  OWNER: 2,
};

export type ProjectIdResolver = (req: Request) => string | Promise<string>;

// 기본 리졸버: /projects/:id/... 형태의 라우트에서 사용
const defaultResolver: ProjectIdResolver = (req) => req.params.projectId ?? req.params.id;

/**
 * 프로젝트 소속·역할을 서버에서 재검증하는 미들웨어.
 * 비소속 사용자에게는 404를 반환하여 리소스 존재 자체를 은닉한다. (설계서 §5)
 */
export function requireProjectRole(minRole: ProjectRole, resolver: ProjectIdResolver = defaultResolver) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(AppError.unauthorized());
      }

      const projectId = await resolver(req);
      if (!projectId) {
        return next(AppError.notFound("프로젝트를 찾을 수 없습니다."));
      }

      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: req.user.userId } },
      });

      if (!membership) {
        return next(AppError.notFound("프로젝트를 찾을 수 없습니다."));
      }

      if (ROLE_ORDER[membership.role] < ROLE_ORDER[minRole]) {
        return next(AppError.forbidden("이 작업을 수행할 권한이 없습니다."));
      }

      req.projectMembership = { projectId, role: membership.role };
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** 태스크 ID(:id)로부터 소속 프로젝트를 찾는 리졸버 */
export const resolveProjectIdFromTask: ProjectIdResolver = async (req) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    select: { projectId: true, deletedAt: true },
  });
  if (!task || task.deletedAt) throw AppError.notFound("태스크를 찾을 수 없습니다.");
  return task.projectId;
};

/** 회의록 ID(:id)로부터 소속 프로젝트를 찾는 리졸버 */
export const resolveProjectIdFromMeeting: ProjectIdResolver = async (req) => {
  const meeting = await prisma.meetingNote.findUnique({
    where: { id: req.params.id },
    select: { projectId: true, deletedAt: true },
  });
  if (!meeting || meeting.deletedAt) throw AppError.notFound("회의록을 찾을 수 없습니다.");
  return meeting.projectId;
};

/** 추출된 태스크 ID(:id)로부터 소속 프로젝트를 찾는 리졸버 */
export const resolveProjectIdFromExtractedTask: ProjectIdResolver = async (req) => {
  const extracted = await prisma.extractedTask.findUnique({
    where: { id: req.params.id },
    select: { meetingNote: { select: { projectId: true } } },
  });
  if (!extracted) throw AppError.notFound("추출된 태스크를 찾을 수 없습니다.");
  return extracted.meetingNote.projectId;
};
