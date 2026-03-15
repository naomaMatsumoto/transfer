import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { resolveCorporation } from "../../middleware/resolveCorporation";
import { resolveOpsStore } from "../../middleware/resolveOpsStore";
import listCorporations from "../../controllers/ops/corporations/list";
import createCorporation from "../../controllers/ops/corporations/create";
import getCorporationById from "../../controllers/ops/corporations/getById";
import updateCorporation from "../../controllers/ops/corporations/update";
import updateCorporationStatus from "../../controllers/ops/corporations/updateStatus";
import deleteCorporation from "../../controllers/ops/corporations/deleteCorp";
import restoreCorporation from "../../controllers/ops/corporations/restore";
import addStoreToCorporation from "../../controllers/ops/corporations/addStore";
import updateStore from "../../controllers/ops/corporations/updateStore";
import deleteStore from "../../controllers/ops/corporations/deleteStore";
import addAccountToCorporation from "../../controllers/ops/corporations/addAccount";
import resetAccountPassword from "../../controllers/ops/corporations/resetPassword";
import deleteAccount from "../../controllers/ops/corporations/deleteAccount";
import storeScopedRouter from "./storeScoped";

const router = Router();

router.get("/", asyncHandler(listCorporations));
router.post("/", asyncHandler(createCorporation));

router.use("/:id", resolveCorporation);

router.get("/:id", asyncHandler(getCorporationById));
router.put("/:id", asyncHandler(updateCorporation));
router.delete("/:id", asyncHandler(deleteCorporation));
router.patch("/:id/restore", asyncHandler(restoreCorporation));
router.patch("/:id/status", asyncHandler(updateCorporationStatus));

router.post("/:id/stores", asyncHandler(addStoreToCorporation));
router.put("/:id/stores/:storeId", asyncHandler(updateStore));
router.delete("/:id/stores/:storeId", asyncHandler(deleteStore));
router.use("/:id/stores/:storeId", resolveOpsStore, storeScopedRouter);

router.post("/:id/accounts", asyncHandler(addAccountToCorporation));
router.patch("/:id/accounts/:accountId/reset-password", asyncHandler(resetAccountPassword));
router.delete("/:id/accounts/:accountId", asyncHandler(deleteAccount));

export default router;
