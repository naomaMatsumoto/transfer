"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = listEvents;
const db_1 = require("../../db");
const constants_1 = require("../../constants");
async function listEvents(req, res, _next) {
    const { from, to, userId } = req.query;
    if (!from || !to) {
        res.status(400).json({ error: constants_1.ERR.EVENTS_FROM_TO_REQUIRED });
        return;
    }
    const userIdNum = userId ? Number(userId) : 0;
    const [rows] = await db_1.pool.query(`
    SELECT
      e.id,
      e.class_type_id,
      ct.name AS class_type_name,
      e.starts_at,
      e.ends_at,
      e.capacity,
      e.status AS event_status,
      COALESCE(SUM(CASE WHEN r.status IN ('booked','attended') THEN 1 ELSE 0 END), 0) AS reserved_count,
      MAX(CASE WHEN r.user_id = ? AND r.status IN ('booked','attended') THEN 1 ELSE 0 END) AS is_reserved_by_user
    FROM events e
    LEFT JOIN reservations r ON r.event_id = e.id
    LEFT JOIN class_types ct ON ct.id = e.class_type_id
    WHERE e.starts_at BETWEEN ? AND ?
    GROUP BY e.id
    ORDER BY e.starts_at ASC
  `, [userIdNum, from, to]);
    res.json(rows);
}
