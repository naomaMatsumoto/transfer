"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../../middleware/asyncHandler");
const list_1 = __importDefault(require("../../controllers/admin/makeupCredits/list"));
const create_1 = __importDefault(require("../../controllers/admin/makeupCredits/create"));
const update_1 = __importDefault(require("../../controllers/admin/makeupCredits/update"));
const revoke_1 = __importDefault(require("../../controllers/admin/makeupCredits/revoke"));
const router = (0, express_1.Router)();
router.get("/makeup-credits", (0, asyncHandler_1.asyncHandler)(list_1.default));
router.post("/makeup-credits", (0, asyncHandler_1.asyncHandler)(create_1.default));
router.patch("/makeup-credits/:id", (0, asyncHandler_1.asyncHandler)(update_1.default));
router.delete("/makeup-credits/:id", (0, asyncHandler_1.asyncHandler)(revoke_1.default));
exports.default = router;
