import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import listClassTypes from "../../controllers/admin/classTypes/list";
import createClassType from "../../controllers/admin/classTypes/create";
import updateClassType from "../../controllers/admin/classTypes/update";
import deleteClassType from "../../controllers/admin/classTypes/delete";

const router = Router();

router.get("/class-types", asyncHandler(listClassTypes));
router.post("/class-types", asyncHandler(createClassType));
router.patch("/class-types/:id", asyncHandler(updateClassType));
router.delete("/class-types/:id", asyncHandler(deleteClassType));

export default router;
