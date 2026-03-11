import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAdminRole } from "../../middleware/auth";
import getSettings from "../../controllers/admin/settings/get";
import updatePassword from "../../controllers/admin/settings/updatePassword";
import updateCorporation from "../../controllers/admin/settings/updateCorporation";

const router = Router();
router.get("/", asyncHandler(getSettings));
router.patch("/password", asyncHandler(updatePassword));
router.patch("/corporation", requireAdminRole, asyncHandler(updateCorporation));
export default router;
