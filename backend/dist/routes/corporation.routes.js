"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../middleware/asyncHandler");
const register_1 = __importDefault(require("../controllers/corporation/register"));
const router = (0, express_1.Router)();
router.post("/register", (0, asyncHandler_1.asyncHandler)(register_1.default));
exports.default = router;
