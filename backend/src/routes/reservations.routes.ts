import { Router } from "express";
import * as reservationsController from "../controllers/reservations.controller";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();
router.post("/reservations", asyncHandler(reservationsController.create));
export default router;
