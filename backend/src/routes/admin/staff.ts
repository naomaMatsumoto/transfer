import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import listStaff from "../../controllers/admin/staff/list";
import createStaff from "../../controllers/admin/staff/create";
import updateStaff from "../../controllers/admin/staff/update";
import deleteStaff from "../../controllers/admin/staff/delete";

const router = Router();

router.get("/staff", asyncHandler(listStaff));
router.post("/staff", asyncHandler(createStaff));
router.patch("/staff/:id", asyncHandler(updateStaff));
router.delete("/staff/:id", asyncHandler(deleteStaff));

export default router;
