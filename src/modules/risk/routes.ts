import { Router } from "express";
import { ProjectRole } from "@prisma/client";
import { requireAuth } from "../../middlewares/auth";
import { requireProjectRole, resolveProjectIdFromTask } from "../../middlewares/projectRole";
import { llmRateLimit } from "../../middlewares/rateLimit";
import * as riskController from "./controller";

// /projects/:id/risk-scan, /projects/:id/risks
export const projectRiskRouter = Router({ mergeParams: true });
projectRiskRouter.use(requireAuth);
projectRiskRouter.post(
  "/risk-scan",
  requireProjectRole(ProjectRole.MEMBER),
  llmRateLimit,
  riskController.scanProjectRisks
);
projectRiskRouter.get("/risks", requireProjectRole(ProjectRole.VIEWER), riskController.listProjectRisks);

// /tasks/:id/risks
export const taskRiskRouter = Router();
taskRiskRouter.use(requireAuth);
taskRiskRouter.get(
  "/:id/risks",
  requireProjectRole(ProjectRole.VIEWER, resolveProjectIdFromTask),
  riskController.listTaskRisks
);
