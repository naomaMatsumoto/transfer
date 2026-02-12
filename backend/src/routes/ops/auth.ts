import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import opsLogin from "../../controllers/ops/auth/login";
import opsMe from "../../controllers/ops/auth/me";
import opsLogout from "../../controllers/ops/auth/logout";

const router = Router();
router.post("/login", asyncHandler(opsLogin));
router.get("/me", asyncHandler(opsMe));
router.post("/logout", asyncHandler(opsLogout));
export default router;
