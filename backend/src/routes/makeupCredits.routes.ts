import { Router } from "express";
import listMakeupCredits from "../controllers/makeupCredits/list";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();
router.get("/makeup-credits", asyncHandler(listMakeupCredits));
export default router;
