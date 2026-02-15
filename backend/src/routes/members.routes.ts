import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import registerMember from "../controllers/members/register";
import verifyMember from "../controllers/members/verify";
import membersMe from "../controllers/members/me";
import membersLogin from "../controllers/members/login";

const router = Router();
router.get("/me", asyncHandler(membersMe));
router.post("/login", asyncHandler(membersLogin));
router.post("/register", asyncHandler(registerMember));
router.get("/verify", asyncHandler(verifyMember));
export default router;
