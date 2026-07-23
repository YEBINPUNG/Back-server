import { z } from "zod";
import { ProjectRole } from "@prisma/client";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "프로젝트 이름을 입력해주세요.").max(100),
  description: z.string().max(2000).optional(),
  dueDate: z.coerce.date().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(2000).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  role: z.enum(["MEMBER", "VIEWER"]).default("MEMBER"),
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(ProjectRole),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
