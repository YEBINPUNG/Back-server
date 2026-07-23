import { Router } from "express";
import { ProjectRole } from "@prisma/client";
import { requireAuth } from "../../middlewares/auth";
import { requireProjectRole, resolveProjectIdFromTask } from "../../middlewares/projectRole";
import { validate } from "../../middlewares/validate";
import * as tasksController from "./controller";
import { createTaskSchema, updateTaskSchema, listTasksQuerySchema } from "./schema";

// /projects/:id/tasks
export const projectTasksRouter = Router({ mergeParams: true });
projectTasksRouter.use(requireAuth);
projectTasksRouter.post(
  "/",
  requireProjectRole(ProjectRole.MEMBER),
  validate({ body: createTaskSchema }),
  tasksController.createTask
);
projectTasksRouter.get(
  "/",
  requireProjectRole(ProjectRole.VIEWER),
  validate({ query: listTasksQuerySchema }),
  tasksController.listTasks
);

// /tasks/:id
export const taskRouter = Router();
taskRouter.use(requireAuth);
taskRouter.get("/:id", requireProjectRole(ProjectRole.VIEWER, resolveProjectIdFromTask), tasksController.getTask);
taskRouter.patch(
  "/:id",
  requireProjectRole(ProjectRole.MEMBER, resolveProjectIdFromTask),
  validate({ body: updateTaskSchema }),
  tasksController.updateTask
);
// 삭제 권한(Owner 전체 / Member는 본인 담당만)은 컨트롤러·서비스 계층에서 세부 검증한다 (설계서 §5)
taskRouter.delete(
  "/:id",
  requireProjectRole(ProjectRole.MEMBER, resolveProjectIdFromTask),
  tasksController.deleteTask
);
