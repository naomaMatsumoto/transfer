import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import listEvents from "../../controllers/admin/events/list";
import createEvent from "../../controllers/admin/events/create";
import createBulkEvents from "../../controllers/admin/events/createBulk";
import bulkDeleteEvents from "../../controllers/admin/events/bulkDelete";
import bulkStatusEvents from "../../controllers/admin/events/bulkStatus";
import bulkCapacityEvents from "../../controllers/admin/events/bulkCapacity";
import bulkTimeEvents from "../../controllers/admin/events/bulkTime";
import deleteOneEvent from "../../controllers/admin/events/deleteOne";
import updateEventStatus from "../../controllers/admin/events/updateStatus";
import updateEventTime from "../../controllers/admin/events/updateTime";
import updateEventCapacity from "../../controllers/admin/events/updateCapacity";

const router = Router();

router.get("/", asyncHandler(listEvents));
router.post("/", asyncHandler(createEvent));
router.post("/bulk", asyncHandler(createBulkEvents));
router.post("/bulk-delete", asyncHandler(bulkDeleteEvents));
router.post("/bulk-status", asyncHandler(bulkStatusEvents));
router.post("/bulk-capacity", asyncHandler(bulkCapacityEvents));
router.post("/bulk-time", asyncHandler(bulkTimeEvents));
router.delete("/:id", asyncHandler(deleteOneEvent));
router.patch("/:id/status", asyncHandler(updateEventStatus));
router.patch("/:id/time", asyncHandler(updateEventTime));
router.patch("/:id/capacity", asyncHandler(updateEventCapacity));

export default router;
