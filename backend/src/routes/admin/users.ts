import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAdminRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createUserSchema, updateUserSchema } from "../../schemas/admin/users";
import listUsers from "../../controllers/admin/users/list";
import createUser from "../../controllers/admin/users/create";
import updateUser from "../../controllers/admin/users/update";
import deleteUser from "../../controllers/admin/users/delete";

const router = Router();

router.get("/users", asyncHandler(listUsers));
router.post("/users", validate(createUserSchema), asyncHandler(createUser));
router.patch("/users/:id", validate(updateUserSchema), asyncHandler(updateUser));
router.delete("/users/:id", requireAdminRole, asyncHandler(deleteUser));

export default router;
