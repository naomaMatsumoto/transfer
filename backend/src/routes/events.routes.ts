import { Router } from "express";
import * as eventsController from "../controllers/events.controller";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();
router.get("/events", asyncHandler(eventsController.list));
export default router;
