"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_routes_1 = __importDefault(require("./routes/health.routes"));
const events_routes_1 = __importDefault(require("./routes/events.routes"));
const makeupCredits_routes_1 = __importDefault(require("./routes/makeupCredits.routes"));
const absences_routes_1 = __importDefault(require("./routes/absences.routes"));
const reservations_routes_1 = __importDefault(require("./routes/reservations.routes"));
const admin_1 = __importDefault(require("./routes/admin"));
/**
 * 全ルートを一括登録するルーター
 * URL 一覧:
 *   GET  /health
 *   GET  /events
 *   GET  /makeup-credits
 *   POST /absences
 *   POST /reservations
 *   /admin/*
 *     GET/POST/PATCH/DELETE /admin/users, /admin/users/:id
 *     GET/POST/PATCH/DELETE /admin/class-types, /admin/class-types/:id
 *     GET/POST /admin/events, POST /admin/events/bulk, POST /admin/events/bulk-delete, ...
 *     GET/POST/PATCH/DELETE /admin/makeup-credits, /admin/makeup-credits/:id
 *     GET/POST /admin/reservations, PATCH /admin/reservations/:id/cancel
 */
const router = (0, express_1.Router)();
router.use(health_routes_1.default);
router.use(events_routes_1.default);
router.use(makeupCredits_routes_1.default);
router.use(absences_routes_1.default);
router.use(reservations_routes_1.default);
router.use("/admin", admin_1.default);
exports.default = router;
