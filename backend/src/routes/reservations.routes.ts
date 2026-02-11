import { Router } from "express";
import createReservation from "../controllers/reservations/create";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();
router.post("/reservations", asyncHandler(createReservation));
export default router;
