import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import registerMember from "../controllers/members/register";
import verifyMember from "../controllers/members/verify";

const router = Router();
router.post("/register", asyncHandler(registerMember));
router.get("/verify", asyncHandler(verifyMember));
export default router;
