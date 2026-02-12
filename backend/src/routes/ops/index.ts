import { Router } from "express";
import { requirePlatformAuth } from "../../middleware/auth";
import authRoutes from "./auth";
import corporationsRoutes from "./corporations";

const router = Router();
router.use("/auth", authRoutes);
router.use("/corporations", requirePlatformAuth, corporationsRoutes);
export default router;
