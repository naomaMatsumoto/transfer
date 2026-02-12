import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import registerCorporation from "../controllers/corporation/register";

const router = Router();
router.post("/register", asyncHandler(registerCorporation));
export default router;
