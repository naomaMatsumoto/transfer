"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = listReservations;
const db_1 = require("../../../db");
async function listReservations(req, res, _next) {
    const { eventId, userId } = req.query;
    const conditions = [];
    const params = [];
    if (eventId) {
        conditions.push("r.event_id = ?");
        params.push(Number(eventId));
    }
    if (userId) {
        conditions.push("r.user_id = ?");
        params.push(Number(userId));
    }
    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    const sql = "SELECT r.id, r.user_id, u.name AS user_name, r.event_id, e.starts_at, ct.name AS class_type_name, r.reservation_type, r.makeup_credit_id, r.status, r.created_at, r.canceled_at FROM reservations r LEFT JOIN users u ON u.id = r.user_id LEFT JOIN events e ON e.id = r.event_id LEFT JOIN class_types ct ON ct.id = e.class_type_id " +
        where +
        " ORDER BY r.created_at DESC";
    const [rows] = await db_1.pool.query(sql, params);
    res.json(rows);
}
