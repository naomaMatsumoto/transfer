import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { registerCorporationSchema } from "../schemas/corporation";
import registerCorporation from "../controllers/corporation/register";

const router = Router();
router.post("/register", validate(registerCorporationSchema), asyncHandler(registerCorporation));
export default router;
