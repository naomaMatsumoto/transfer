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
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const corporation_routes_1 = __importDefault(require("./routes/corporation.routes"));
const stores_routes_1 = __importDefault(require("./routes/stores.routes"));
const members_routes_1 = __importDefault(require("./routes/members.routes"));
const auth_1 = require("./middleware/auth");
/**
 * 全ルートを一括登録するルーター
 * URL 一覧:
 *   GET  /health
 *   POST /auth/login, GET /auth/me, POST /auth/logout
 *   POST /corporation/register (法人申し込み)
 *   GET  /stores (会員登録用店舗一覧)
 *   POST /members/register (会員登録)
 *   GET  /events, POST /absences, POST /reservations, GET /makeup-credits
 *   /admin/* (ログイン必須)
 */
const router = (0, express_1.Router)();
router.use(health_routes_1.default);
router.use("/auth", auth_routes_1.default);
router.use("/corporation", corporation_routes_1.default);
router.use("/stores", stores_routes_1.default);
router.use("/members", members_routes_1.default);
router.use(events_routes_1.default);
router.use(makeupCredits_routes_1.default);
router.use(absences_routes_1.default);
router.use(reservations_routes_1.default);
router.use("/admin", auth_1.requireAuth, admin_1.default);
exports.default = router;
