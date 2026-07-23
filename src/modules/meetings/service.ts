import { ExtractStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/AppError";
import { writeAuditLog } from "../../lib/audit";
import { summarizeMeetingContent, extractTasksFromMeetingContent } from "./ai";
import { ApproveExtractedTaskInput, CreateMeetingInput, UpdateMeetingInput } from "./schema";

export async function createMeeting(projectId: string, authorId: string, input: CreateMeetingInput) {
  return prisma.meetingNote.create({
    data: {
      projectId,
      authorId,
      title: input.title,
      rawContent: input.rawContent,
      meetingDate: input.meetingDate,
    },
  });
}

export async function listMeetings(projectId: string) {
  return prisma.meetingNote.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { meetingDate: "desc" },
    select: {
      id: true,
      title: true,
      summary: true,
      meetingDate: true,
      authorId: true,
      createdAt: true,
    },
  });
}

async function getActiveMeeting(meetingId: string) {
  const meeting = await prisma.meetingNote.findUnique({ where: { id: meetingId } });
  if (!meeting || meeting.deletedAt) {
    throw AppError.notFound("회의록을 찾을 수 없습니다.");
  }
  return meeting;
}

export async function getMeeting(meetingId: string) {
  const meeting = await prisma.meetingNote.findUnique({
    where: { id: meetingId },
    include: {
      extracted: { orderBy: { createdAt: "desc" } },
      author: { select: { id: true, name: true, email: true } },
    },
  });
  if (!meeting || meeting.deletedAt) {
    throw AppError.notFound("회의록을 찾을 수 없습니다.");
  }
  return meeting;
}

export async function updateMeeting(meetingId: string, input: UpdateMeetingInput) {
  await getActiveMeeting(meetingId);
  return prisma.meetingNote.update({
    where: { id: meetingId },
    data: {
      title: input.title,
      rawContent: input.rawContent,
      meetingDate: input.meetingDate,
    },
  });
}

export async function softDeleteMeeting(meetingId: string) {
  await getActiveMeeting(meetingId);
  await prisma.meetingNote.update({ where: { id: meetingId }, data: { deletedAt: new Date() } });
}

export async function summarizeMeeting(meetingId: string) {
  const meeting = await getActiveMeeting(meetingId);
  const summary = await summarizeMeetingContent(meeting.rawContent);

  return prisma.meetingNote.update({
    where: { id: meetingId },
    data: { summary },
  });
}

export async function extractTasks(meetingId: string) {
  const meeting = await getActiveMeeting(meetingId);

  const members = await prisma.projectMember.findMany({
    where: { projectId: meeting.projectId },
    include: { user: { select: { name: true } } },
  });
  const memberNames = members.map((m) => m.user.name);

  const drafts = await extractTasksFromMeetingContent(meeting.rawContent, memberNames);

  // 재추출 시 아직 판단되지 않은(PENDING) 이전 제안은 정리하고 새로 생성한다.
  await prisma.extractedTask.deleteMany({
    where: { meetingNoteId: meetingId, status: ExtractStatus.PENDING },
  });

  if (drafts.length === 0) {
    return [];
  }

  await prisma.extractedTask.createMany({
    data: drafts.map((draft) => ({
      meetingNoteId: meetingId,
      title: draft.title,
      assigneeGuess: draft.assigneeGuess ?? null,
      dueDateGuess: draft.dueDateGuess ? new Date(draft.dueDateGuess) : null,
    })),
  });

  return prisma.extractedTask.findMany({
    where: { meetingNoteId: meetingId, status: ExtractStatus.PENDING },
    orderBy: { createdAt: "desc" },
  });
}

export async function approveExtractedTask(
  extractedTaskId: string,
  actorId: string,
  input: ApproveExtractedTaskInput
) {
  const extracted = await prisma.extractedTask.findUnique({
    where: { id: extractedTaskId },
    include: { meetingNote: true },
  });
  if (!extracted) {
    throw AppError.notFound("추출된 태스크를 찾을 수 없습니다.");
  }
  if (extracted.status !== ExtractStatus.PENDING) {
    throw AppError.conflict("이미 처리된 제안입니다.", "EXTRACTED_TASK_ALREADY_HANDLED");
  }

  if (input.assigneeId) {
    const isMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: extracted.meetingNote.projectId, userId: input.assigneeId },
      },
    });
    if (!isMember) {
      throw AppError.badRequest("담당자가 프로젝트 멤버가 아닙니다.", "ASSIGNEE_NOT_MEMBER");
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        projectId: extracted.meetingNote.projectId,
        title: input.title ?? extracted.title,
        assigneeId: input.assigneeId ?? null,
        dueDate: input.dueDate ?? extracted.dueDateGuess ?? null,
        estimatedHours: input.estimatedHours ?? null,
        sourceMeetingId: extracted.meetingNoteId,
      },
    });

    const updatedExtracted = await tx.extractedTask.update({
      where: { id: extractedTaskId },
      data: { status: ExtractStatus.APPROVED, taskId: task.id },
    });

    return { task, extracted: updatedExtracted };
  });

  await writeAuditLog({
    projectId: extracted.meetingNote.projectId,
    actorId,
    action: "extractedTask.approve",
    target: `extractedTask:${extractedTaskId}`,
    detail: { taskId: result.task.id },
  });

  return result;
}

export async function rejectExtractedTask(extractedTaskId: string, actorId: string) {
  const extracted = await prisma.extractedTask.findUnique({
    where: { id: extractedTaskId },
    include: { meetingNote: true },
  });
  if (!extracted) {
    throw AppError.notFound("추출된 태스크를 찾을 수 없습니다.");
  }
  if (extracted.status !== ExtractStatus.PENDING) {
    throw AppError.conflict("이미 처리된 제안입니다.", "EXTRACTED_TASK_ALREADY_HANDLED");
  }

  const updated = await prisma.extractedTask.update({
    where: { id: extractedTaskId },
    data: { status: ExtractStatus.REJECTED },
  });

  await writeAuditLog({
    projectId: extracted.meetingNote.projectId,
    actorId,
    action: "extractedTask.reject",
    target: `extractedTask:${extractedTaskId}`,
  });

  return updated;
}
