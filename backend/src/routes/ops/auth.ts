import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { rateLimit } from "../../middleware/rateLimit";
import opsLogin from "../../controllers/ops/auth/login";
import opsMe from "../../controllers/ops/auth/me";
import opsLogout from "../../controllers/ops/auth/logout";

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, maxAttempts: 10 });

const router = Router();
router.post("/login", loginLimiter, asyncHandler(opsLogin));
router.get("/me", asyncHandler(opsMe));
router.post("/logout", asyncHandler(opsLogout));
export default router;
