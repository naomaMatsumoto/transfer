import { Router } from "express";
import listEvents from "../controllers/events/list";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();
router.get("/events", asyncHandler(listEvents));
export default router;
