import { Router } from "express";
import { ProjectRole } from "@prisma/client";
import { requireAuth } from "../../middlewares/auth";
import { requireProjectRole } from "../../middlewares/projectRole";
import { validate } from "../../middlewares/validate";
import * as auditController from "./controller";
import { listAuditLogsQuerySchema } from "./schema";

// /projects/:id/audit-logs
export const projectAuditRouter = Router({ mergeParams: true });
projectAuditRouter.use(requireAuth);
projectAuditRouter.get(
  "/",
  requireProjectRole(ProjectRole.OWNER),
  validate({ query: listAuditLogsQuerySchema }),
  auditController.listAuditLogs
);
