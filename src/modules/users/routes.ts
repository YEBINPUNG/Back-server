import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import * as usersController from "./controller";

const router = Router();

router.get("/me", requireAuth, usersController.me);

export default router;
