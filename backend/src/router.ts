import { Router } from "express";
import healthRoutes from "./routes/health.routes";
import eventsRoutes from "./routes/events.routes";
import makeupCreditsRoutes from "./routes/makeupCredits.routes";
import absencesRoutes from "./routes/absences.routes";
import reservationsRoutes from "./routes/reservations.routes";
import adminRoutes from "./routes/admin";
import authRoutes from "./routes/auth.routes";
import corporationRoutes from "./routes/corporation.routes";
import storesRoutes from "./routes/stores.routes";
import membersRoutes from "./routes/members.routes";
import opsRoutes from "./routes/ops";
import { requireAuth } from "./middleware/auth";
import { requireStoreAccess } from "./lib/corporationStores";
import { asyncHandler } from "./middleware/asyncHandler";

/**
 * 全ルートを一括登録するルーター
 * URL 一覧:
 *   GET  /health
 *   POST /auth/login, GET /auth/me, POST /auth/logout
 *   POST /corporation/register (法人申し込み)
 *   GET  /stores (会員登録用店舗一覧)
 *   POST /members/register (会員登録)
 *   GET  /events, POST /absences, POST /reservations, GET /makeup-credits
 *   /admin/* (法人管理者・ログイン必須)
 *   /ops/auth/* (運営ログイン), /ops/corporations/* (運営・法人一覧・作成・店舗追加)
 */
const router = Router();

router.use(healthRoutes);
router.use("/auth", authRoutes);
router.use("/corporation", corporationRoutes);
router.use("/stores", storesRoutes);
router.use("/members", membersRoutes);
router.use(eventsRoutes);
router.use(makeupCreditsRoutes);
router.use(absencesRoutes);
router.use(reservationsRoutes);
router.use("/admin", requireAuth, asyncHandler(requireStoreAccess), adminRoutes);
router.use("/ops", opsRoutes);

export default router;
