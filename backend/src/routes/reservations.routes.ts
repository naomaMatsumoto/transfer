import { Router } from "express";
import createReservation from "../controllers/reservations/create";
import cancelReservationByMember from "../controllers/reservations/cancelByMember";
import joinWaitlist from "../controllers/waitlist/join";
import leaveWaitlist from "../controllers/waitlist/leave";
import waitlistStatus from "../controllers/waitlist/status";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();
router.post("/reservations", asyncHandler(createReservation));
router.patch("/reservations/:id/cancel", asyncHandler(cancelReservationByMember));

router.post("/waitlist", asyncHandler(joinWaitlist));
router.delete("/waitlist/:eventId", asyncHandler(leaveWaitlist));
router.get("/waitlist/:eventId", asyncHandler(waitlistStatus));
export default router;
