import { Router } from "express";
import * as absencesController from "../controllers/absences.controller";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();
router.post("/absences", asyncHandler(absencesController.create));
export default router;
