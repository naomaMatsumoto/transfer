import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import listMakeupCredits from "../../controllers/admin/makeupCredits/list";
import createMakeupCredit from "../../controllers/admin/makeupCredits/create";
import updateMakeupCredit from "../../controllers/admin/makeupCredits/update";
import revokeMakeupCredit from "../../controllers/admin/makeupCredits/revoke";

const router = Router();

router.get("/makeup-credits", asyncHandler(listMakeupCredits));
router.post("/makeup-credits", asyncHandler(createMakeupCredit));
router.patch("/makeup-credits/:id", asyncHandler(updateMakeupCredit));
router.delete("/makeup-credits/:id", asyncHandler(revokeMakeupCredit));

export default router;
