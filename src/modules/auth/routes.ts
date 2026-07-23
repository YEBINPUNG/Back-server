import { Router } from "express";
import { validate } from "../../middlewares/validate";
import { requireAuth } from "../../middlewares/auth";
import { loginRateLimit } from "../../middlewares/rateLimit";
import { signupSchema, loginSchema } from "./schema";
import * as authController from "./controller";

const router = Router();

router.post("/signup", validate({ body: signupSchema }), authController.signup);
router.post("/login", loginRateLimit, validate({ body: loginSchema }), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", requireAuth, authController.logout);

export default router;
