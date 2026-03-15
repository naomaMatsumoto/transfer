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
import getEventStaff from "../../controllers/admin/events/getStaff";
import putEventStaff from "../../controllers/admin/events/putStaff";
import listClassTypes from "../../controllers/admin/classTypes/list";
import createClassType from "../../controllers/admin/classTypes/create";
import updateClassType from "../../controllers/admin/classTypes/update";
import deleteClassType from "../../controllers/admin/classTypes/delete";
import listStaff from "../../controllers/admin/staff/list";
import listUsers from "../../controllers/admin/users/list";
import createUser from "../../controllers/admin/users/create";
import updateUser from "../../controllers/admin/users/update";
import deleteUser from "../../controllers/admin/users/delete";
import listReservations from "../../controllers/admin/reservations/list";
import createReservation from "../../controllers/admin/reservations/create";
import cancelReservation from "../../controllers/admin/reservations/cancel";

const router = Router();

router.get("/events", asyncHandler(listEvents));
router.post("/events", asyncHandler(createEvent));
router.post("/events/bulk", asyncHandler(createBulkEvents));
router.post("/events/bulk-delete", asyncHandler(bulkDeleteEvents));
router.post("/events/bulk-status", asyncHandler(bulkStatusEvents));
router.post("/events/bulk-capacity", asyncHandler(bulkCapacityEvents));
router.post("/events/bulk-time", asyncHandler(bulkTimeEvents));
router.delete("/events/:id", asyncHandler(deleteOneEvent));
router.patch("/events/:id/status", asyncHandler(updateEventStatus));
router.patch("/events/:id/time", asyncHandler(updateEventTime));
router.patch("/events/:id/capacity", asyncHandler(updateEventCapacity));
router.get("/events/:id/staff", asyncHandler(getEventStaff));
router.put("/events/:id/staff", asyncHandler(putEventStaff));

router.get("/class-types", asyncHandler(listClassTypes));
router.post("/class-types", asyncHandler(createClassType));
router.put("/class-types/:id", asyncHandler(updateClassType));
router.delete("/class-types/:id", asyncHandler(deleteClassType));

router.get("/staff", asyncHandler(listStaff));

router.get("/users", asyncHandler(listUsers));
router.post("/users", asyncHandler(createUser));
router.patch("/users/:id", asyncHandler(updateUser));
router.delete("/users/:id", asyncHandler(deleteUser));
router.get("/reservations", asyncHandler(listReservations));
router.post("/reservations", asyncHandler(createReservation));
router.patch("/reservations/:id/cancel", asyncHandler(cancelReservation));

export default router;
