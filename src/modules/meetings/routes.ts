import { Router } from "express";
import { ProjectRole } from "@prisma/client";
import { requireAuth } from "../../middlewares/auth";
import {
  requireProjectRole,
  resolveProjectIdFromMeeting,
  resolveProjectIdFromExtractedTask,
} from "../../middlewares/projectRole";
import { validate } from "../../middlewares/validate";
import { llmRateLimit } from "../../middlewares/rateLimit";
import * as meetingsController from "./controller";
import { createMeetingSchema, updateMeetingSchema, approveExtractedTaskSchema } from "./schema";

// /projects/:id/meetings
export const projectMeetingsRouter = Router({ mergeParams: true });
projectMeetingsRouter.use(requireAuth);
projectMeetingsRouter.post(
  "/",
  requireProjectRole(ProjectRole.MEMBER),
  validate({ body: createMeetingSchema }),
  meetingsController.createMeeting
);
projectMeetingsRouter.get("/", requireProjectRole(ProjectRole.VIEWER), meetingsController.listMeetings);

// /meetings/:id
export const meetingRouter = Router();
meetingRouter.use(requireAuth);
meetingRouter.get(
  "/:id",
  requireProjectRole(ProjectRole.VIEWER, resolveProjectIdFromMeeting),
  meetingsController.getMeeting
);
meetingRouter.patch(
  "/:id",
  requireProjectRole(ProjectRole.MEMBER, resolveProjectIdFromMeeting),
  validate({ body: updateMeetingSchema }),
  meetingsController.updateMeeting
);
meetingRouter.delete(
  "/:id",
  requireProjectRole(ProjectRole.MEMBER, resolveProjectIdFromMeeting),
  meetingsController.deleteMeeting
);
meetingRouter.post(
  "/:id/summarize",
  requireProjectRole(ProjectRole.MEMBER, resolveProjectIdFromMeeting),
  llmRateLimit,
  meetingsController.summarizeMeeting
);
meetingRouter.post(
  "/:id/extract-tasks",
  requireProjectRole(ProjectRole.MEMBER, resolveProjectIdFromMeeting),
  llmRateLimit,
  meetingsController.extractTasks
);

// /extracted-tasks/:id
export const extractedTaskRouter = Router();
extractedTaskRouter.use(requireAuth);
extractedTaskRouter.post(
  "/:id/approve",
  requireProjectRole(ProjectRole.MEMBER, resolveProjectIdFromExtractedTask),
  validate({ body: approveExtractedTaskSchema }),
  meetingsController.approveExtractedTask
);
extractedTaskRouter.post(
  "/:id/reject",
  requireProjectRole(ProjectRole.MEMBER, resolveProjectIdFromExtractedTask),
  meetingsController.rejectExtractedTask
);
