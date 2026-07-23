import { Router } from "express";
import { ProjectRole } from "@prisma/client";
import { requireAuth } from "../../middlewares/auth";
import { requireProjectRole } from "../../middlewares/projectRole";
import * as dashboardController from "./controller";

// /projects/:id/dashboard
export const projectDashboardRouter = Router({ mergeParams: true });
projectDashboardRouter.use(requireAuth);
projectDashboardRouter.get("/", requireProjectRole(ProjectRole.VIEWER), dashboardController.getDashboard);
