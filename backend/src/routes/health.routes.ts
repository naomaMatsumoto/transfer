import { Router } from "express";
import * as healthController from "../controllers/health.controller";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();
router.get("/health", asyncHandler(healthController.check));
export default router;
