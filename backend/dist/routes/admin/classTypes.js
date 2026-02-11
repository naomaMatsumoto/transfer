"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../../middleware/asyncHandler");
const list_1 = __importDefault(require("../../controllers/admin/classTypes/list"));
const create_1 = __importDefault(require("../../controllers/admin/classTypes/create"));
const update_1 = __importDefault(require("../../controllers/admin/classTypes/update"));
const delete_1 = __importDefault(require("../../controllers/admin/classTypes/delete"));
const router = (0, express_1.Router)();
router.get("/class-types", (0, asyncHandler_1.asyncHandler)(list_1.default));
router.post("/class-types", (0, asyncHandler_1.asyncHandler)(create_1.default));
router.patch("/class-types/:id", (0, asyncHandler_1.asyncHandler)(update_1.default));
router.delete("/class-types/:id", (0, asyncHandler_1.asyncHandler)(delete_1.default));
exports.default = router;
