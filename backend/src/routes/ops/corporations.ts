import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import listCorporations from "../../controllers/ops/corporations/list";
import createCorporation from "../../controllers/ops/corporations/create";
import getCorporationById from "../../controllers/ops/corporations/getById";
import addStoreToCorporation from "../../controllers/ops/corporations/addStore";

const router = Router();
router.get("/", asyncHandler(listCorporations));
router.post("/", asyncHandler(createCorporation));
router.get("/:id", asyncHandler(getCorporationById));
router.post("/:id/stores", asyncHandler(addStoreToCorporation));
export default router;
