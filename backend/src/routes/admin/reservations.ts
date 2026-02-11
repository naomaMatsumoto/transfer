import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import listReservations from "../../controllers/admin/reservations/list";
import createReservation from "../../controllers/admin/reservations/create";
import cancelReservation from "../../controllers/admin/reservations/cancel";

const router = Router();

router.get("/reservations", asyncHandler(listReservations));
router.post("/reservations", asyncHandler(createReservation));
router.patch("/reservations/:id/cancel", asyncHandler(cancelReservation));

export default router;
