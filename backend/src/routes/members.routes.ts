import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { rateLimit } from "../middleware/rateLimit";
import { memberLoginSchema, forgotPasswordSchema, resetPasswordSchema, updatePasswordSchema } from "../schemas/auth";
import { registerMemberSchema } from "../schemas/members";
import registerMember from "../controllers/members/register";
import verifyMember from "../controllers/members/verify";
import membersMe from "../controllers/members/me";
import membersLogin from "../controllers/members/login";
import membersLogout from "../controllers/members/logout";
import membersUpdatePassword from "../controllers/members/updatePassword";
import membersForgotPassword from "../controllers/members/forgotPassword";
import membersResetPassword from "../controllers/members/resetPassword";

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, maxAttempts: 10 });
const forgotPasswordLimiter = rateLimit({ windowMs: 60 * 60 * 1000, maxAttempts: 5 });

const router = Router();
router.get("/me", asyncHandler(membersMe));
router.post("/login", loginLimiter, validate(memberLoginSchema), asyncHandler(membersLogin));
router.post("/logout", asyncHandler(membersLogout));
router.patch("/me/password", validate(updatePasswordSchema), asyncHandler(membersUpdatePassword));
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(membersForgotPassword),
);
router.post("/reset-password", validate(resetPasswordSchema), asyncHandler(membersResetPassword));
router.post("/register", validate(registerMemberSchema), asyncHandler(registerMember));
router.get("/verify", asyncHandler(verifyMember));
export default router;
