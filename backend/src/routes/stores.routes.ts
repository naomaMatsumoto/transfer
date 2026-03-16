import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import listStoresPublic from "../controllers/stores/listPublic";
import getStoreById from "../controllers/stores/getById";

const router = Router();
router.get("/", asyncHandler(listStoresPublic));
router.get("/:id", asyncHandler(getStoreById));
export default router;
