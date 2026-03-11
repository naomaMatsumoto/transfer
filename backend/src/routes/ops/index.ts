import { Router } from "express";
import { requirePlatformAuth } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import authRoutes from "./auth";
import corporationsRoutes from "./corporations";
import getStats from "../../controllers/ops/stats";
import listAuditLogs from "../../controllers/ops/auditLogs";

const router = Router();
router.use("/auth", authRoutes);
router.use("/corporations", requirePlatformAuth, corporationsRoutes);
router.get("/stats", requirePlatformAuth, asyncHandler(getStats));
router.get("/audit-logs", requirePlatformAuth, asyncHandler(listAuditLogs));
export default router;
