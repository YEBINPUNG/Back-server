import { ProjectRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
      projectMembership?: {
        projectId: string;
        role: ProjectRole;
      };
    }
  }
}

export {};
