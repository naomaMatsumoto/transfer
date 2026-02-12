"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../middleware/asyncHandler");
const login_1 = __importDefault(require("../controllers/auth/login"));
const me_1 = __importDefault(require("../controllers/auth/me"));
const logout_1 = __importDefault(require("../controllers/auth/logout"));
const router = (0, express_1.Router)();
router.post("/login", (0, asyncHandler_1.asyncHandler)(login_1.default));
router.get("/me", (0, asyncHandler_1.asyncHandler)(me_1.default));
router.post("/logout", (0, asyncHandler_1.asyncHandler)(logout_1.default));
exports.default = router;
