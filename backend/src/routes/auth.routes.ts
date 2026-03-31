import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { rateLimit } from "../middleware/rateLimit";
import { loginSchema } from "../schemas/auth";
import login from "../controllers/auth/login";
import me from "../controllers/auth/me";
import logout from "../controllers/auth/logout";

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, maxAttempts: 10 });

const router = Router();

router.post("/login", loginLimiter, validate(loginSchema), asyncHandler(login));
router.get("/me", asyncHandler(me));
router.post("/logout", asyncHandler(logout));

export default router;
