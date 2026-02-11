"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../../middleware/asyncHandler");
const list_1 = __importDefault(require("../../controllers/admin/reservations/list"));
const create_1 = __importDefault(require("../../controllers/admin/reservations/create"));
const cancel_1 = __importDefault(require("../../controllers/admin/reservations/cancel"));
const router = (0, express_1.Router)();
router.get("/reservations", (0, asyncHandler_1.asyncHandler)(list_1.default));
router.post("/reservations", (0, asyncHandler_1.asyncHandler)(create_1.default));
router.patch("/reservations/:id/cancel", (0, asyncHandler_1.asyncHandler)(cancel_1.default));
exports.default = router;
