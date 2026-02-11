import { Router } from "express";
import getHealth from "../controllers/health/get";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();
router.get("/health", asyncHandler(getHealth));
export default router;
