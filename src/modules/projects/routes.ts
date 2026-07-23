import { Router } from "express";
import { ProjectRole } from "@prisma/client";
import { requireAuth } from "../../middlewares/auth";
import { requireProjectRole } from "../../middlewares/projectRole";
import { validate } from "../../middlewares/validate";
import * as projectsController from "./controller";
import { createProjectSchema, updateProjectSchema, inviteMemberSchema, updateMemberRoleSchema } from "./schema";

const router = Router();

router.use(requireAuth);

router.post("/", validate({ body: createProjectSchema }), projectsController.createProject);
router.get("/", projectsController.listMyProjects);

router.get("/:id", requireProjectRole(ProjectRole.VIEWER), projectsController.getProject);
router.patch(
  "/:id",
  requireProjectRole(ProjectRole.OWNER),
  validate({ body: updateProjectSchema }),
  projectsController.updateProject
);
router.delete("/:id", requireProjectRole(ProjectRole.OWNER), projectsController.deleteProject);

router.post(
  "/:id/members",
  requireProjectRole(ProjectRole.OWNER),
  validate({ body: inviteMemberSchema }),
  projectsController.inviteMember
);
router.patch(
  "/:id/members/:userId",
  requireProjectRole(ProjectRole.OWNER),
  validate({ body: updateMemberRoleSchema }),
  projectsController.updateMemberRole
);
router.delete(
  "/:id/members/:userId",
  requireProjectRole(ProjectRole.OWNER),
  projectsController.removeMember
);

export default router;
