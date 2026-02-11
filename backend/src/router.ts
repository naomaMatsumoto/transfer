import { Router } from "express";
import healthRoutes from "./routes/health.routes";
import eventsRoutes from "./routes/events.routes";
import makeupCreditsRoutes from "./routes/makeupCredits.routes";
import absencesRoutes from "./routes/absences.routes";
import reservationsRoutes from "./routes/reservations.routes";
import adminRoutes from "./routes/admin";

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
const router = Router();

router.use(healthRoutes);
router.use(eventsRoutes);
router.use(makeupCreditsRoutes);
router.use(absencesRoutes);
router.use(reservationsRoutes);
router.use("/admin", adminRoutes);

export default router;
