import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import login from "../controllers/auth/login";
import me from "../controllers/auth/me";
import logout from "../controllers/auth/logout";

const router = Router();

router.post("/login", asyncHandler(login));
router.get("/me", asyncHandler(me));
router.post("/logout", asyncHandler(logout));

export default router;
