import { ProjectRole } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/AppError";
import { writeAuditLog } from "../../lib/audit";
import { CreateProjectInput, InviteMemberInput, UpdateProjectInput } from "./schema";

export async function createProject(ownerId: string, input: CreateProjectInput) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: input.name,
        description: input.description,
        dueDate: input.dueDate,
      },
    });
    await tx.projectMember.create({
      data: { projectId: project.id, userId: ownerId, role: ProjectRole.OWNER },
    });
    return project;
  });
}

export async function listMyProjects(userId: string) {
  return prisma.project.findMany({
    where: { deletedAt: null, members: { some: { userId } } },
    orderBy: { createdAt: "desc" },
    include: {
      members: { select: { userId: true, role: true } },
    },
  });
}

export async function getProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!project || project.deletedAt) {
    throw AppError.notFound("프로젝트를 찾을 수 없습니다.");
  }
  return project;
}

export async function updateProject(projectId: string, input: UpdateProjectInput) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.deletedAt) {
    throw AppError.notFound("프로젝트를 찾을 수 없습니다.");
  }

  return prisma.project.update({
    where: { id: projectId },
    data: {
      name: input.name,
      description: input.description,
      dueDate: input.dueDate,
    },
  });
}

export async function softDeleteProject(projectId: string, actorId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.deletedAt) {
    throw AppError.notFound("프로젝트를 찾을 수 없습니다.");
  }

  await prisma.project.update({ where: { id: projectId }, data: { deletedAt: new Date() } });
  await writeAuditLog({
    projectId,
    actorId,
    action: "project.delete",
    target: `project:${projectId}`,
  });
}

export async function inviteMember(projectId: string, actorId: string, input: InviteMemberInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || user.deletedAt) {
    throw AppError.notFound("해당 이메일의 사용자를 찾을 수 없습니다.", "USER_NOT_FOUND");
  }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (existing) {
    throw AppError.conflict("이미 프로젝트에 소속된 사용자입니다.", "ALREADY_MEMBER");
  }

  const member = await prisma.projectMember.create({
    data: { projectId, userId: user.id, role: input.role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  await writeAuditLog({
    projectId,
    actorId,
    action: "member.invite",
    target: `user:${user.id}`,
    detail: { role: input.role },
  });

  return member;
}

async function assertNotLastOwner(projectId: string, excludingUserId: string) {
  const ownerCount = await prisma.projectMember.count({
    where: { projectId, role: ProjectRole.OWNER, userId: { not: excludingUserId } },
  });
  if (ownerCount === 0) {
    throw AppError.conflict("프로젝트에는 최소 1명의 Owner가 있어야 합니다.", "LAST_OWNER");
  }
}

export async function updateMemberRole(
  projectId: string,
  actorId: string,
  targetUserId: string,
  role: ProjectRole
) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  if (!member) {
    throw AppError.notFound("프로젝트 멤버를 찾을 수 없습니다.");
  }

  if (member.role === ProjectRole.OWNER && role !== ProjectRole.OWNER) {
    await assertNotLastOwner(projectId, targetUserId);
  }

  const updated = await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    data: { role },
  });

  await writeAuditLog({
    projectId,
    actorId,
    action: "member.role_change",
    target: `user:${targetUserId}`,
    detail: { from: member.role, to: role },
  });

  return updated;
}

export async function removeMember(projectId: string, actorId: string, targetUserId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  if (!member) {
    throw AppError.notFound("프로젝트 멤버를 찾을 수 없습니다.");
  }

  if (member.role === ProjectRole.OWNER) {
    await assertNotLastOwner(projectId, targetUserId);
  }

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });

  await writeAuditLog({
    projectId,
    actorId,
    action: "member.remove",
    target: `user:${targetUserId}`,
  });
}
