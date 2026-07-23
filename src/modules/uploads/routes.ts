import { Router } from "express";
import { ProjectRole } from "@prisma/client";
import { requireAuth } from "../../middlewares/auth";
import { requireProjectRole } from "../../middlewares/projectRole";
import { validate } from "../../middlewares/validate";
import * as uploadsController from "./controller";
import { presignUploadSchema, presignDownloadQuerySchema } from "./schema";

// /projects/:id/uploads
export const projectUploadsRouter = Router({ mergeParams: true });
projectUploadsRouter.use(requireAuth);

// 업로드는 프로젝트 멤버(MEMBER 이상)만, 다운로드 presign은 뷰어 이상 소속 확인 후 발급한다.
projectUploadsRouter.post(
  "/presign",
  requireProjectRole(ProjectRole.MEMBER),
  validate({ body: presignUploadSchema }),
  uploadsController.presignUpload
);
projectUploadsRouter.get(
  "/download",
  requireProjectRole(ProjectRole.VIEWER),
  validate({ query: presignDownloadQuerySchema }),
  uploadsController.presignDownload
);
