import { Router } from "express";
import * as makeupCreditsController from "../controllers/makeupCredits.controller";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();
router.get("/makeup-credits", asyncHandler(makeupCreditsController.list));
export default router;
