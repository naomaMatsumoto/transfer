import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import listStoresPublic from "../controllers/stores/listPublic";

const router = Router();
router.get("/", asyncHandler(listStoresPublic));
export default router;
