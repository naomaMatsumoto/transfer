"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = listEvents;
const db_1 = require("../../../db");
async function listEvents(req, res, _next) {
    const { from, to } = req.query;
    let where = "";
    const params = [];
    if (from && to) {
        where = "WHERE e.starts_at BETWEEN ? AND ?";
        params.push(from, to);
    }
    const [rows] = await db_1.pool.query(`
    SELECT
      e.id,
      e.class_type_id,
      ct.name AS class_type_name,
      e.starts_at,
      e.ends_at,
      e.capacity,
      e.status,
      COALESCE(SUM(CASE WHEN r.status IN ('booked','attended') THEN 1 ELSE 0 END), 0) AS reserved_count
    FROM events e
    LEFT JOIN reservations r ON r.event_id = e.id
    LEFT JOIN class_types ct ON ct.id = e.class_type_id
    ${where}
    GROUP BY e.id
    ORDER BY e.starts_at ASC
  `, params);
    res.json(rows);
}
