import { Router } from "express";
import authRoutes from "../modules/auth/routes";
import usersRoutes from "../modules/users/routes";
import projectsRoutes from "../modules/projects/routes";
import { projectMeetingsRouter, meetingRouter, extractedTaskRouter } from "../modules/meetings/routes";
import { projectTasksRouter, taskRouter } from "../modules/tasks/routes";
import { projectDashboardRouter } from "../modules/dashboard/routes";
import { projectRiskRouter, taskRiskRouter } from "../modules/risk/routes";
import { projectAuditRouter } from "../modules/audit/routes";
import { projectUploadsRouter } from "../modules/uploads/routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);

router.use("/projects", projectsRoutes);
router.use("/projects/:id/meetings", projectMeetingsRouter);
router.use("/projects/:id/tasks", projectTasksRouter);
router.use("/projects/:id/dashboard", projectDashboardRouter);
router.use("/projects/:id/audit-logs", projectAuditRouter);
router.use("/projects/:id/uploads", projectUploadsRouter);
router.use("/projects/:id", projectRiskRouter);

router.use("/meetings", meetingRouter);
router.use("/extracted-tasks", extractedTaskRouter);
router.use("/tasks", taskRouter);
router.use("/tasks", taskRiskRouter);

export default router;
