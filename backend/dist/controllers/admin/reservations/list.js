"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = listReservations;
const db_1 = require("../../../db");
const corporationStores_1 = require("../../../lib/corporationStores");
async function listReservations(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const storePh = storeIds.map(() => "?").join(",");
    const conditions = [
        `(ct.store_id IN (${storePh}) AND u.store_id IN (${storePh}))`,
    ];
    const params = [...storeIds, ...storeIds];
    const { eventId, userId } = req.query;
    if (eventId) {
        conditions.push("r.event_id = ?");
        params.push(Number(eventId));
    }
    if (userId) {
        conditions.push("r.user_id = ?");
        params.push(Number(userId));
    }
    const where = "WHERE " + conditions.join(" AND ");
    const sql = `SELECT r.id, r.user_id, u.name AS user_name, r.event_id, e.starts_at, ct.name AS class_type_name, r.reservation_type, r.makeup_credit_id, r.status, r.created_at, r.canceled_at FROM reservations r LEFT JOIN users u ON u.id = r.user_id LEFT JOIN events e ON e.id = r.event_id LEFT JOIN class_types ct ON ct.id = e.class_type_id ` +
        where +
        " ORDER BY r.created_at DESC";
    const [rows] = await db_1.pool.query(sql, params);
    res.json(rows);
}
