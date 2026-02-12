"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../middleware/asyncHandler");
const listPublic_1 = __importDefault(require("../controllers/stores/listPublic"));
const router = (0, express_1.Router)();
router.get("/", (0, asyncHandler_1.asyncHandler)(listPublic_1.default));
exports.default = router;
