import { Router } from "express";
import createAbsence from "../controllers/absences/create";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();
router.post("/absences", asyncHandler(createAbsence));
export default router;
