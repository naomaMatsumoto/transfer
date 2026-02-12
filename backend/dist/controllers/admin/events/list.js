"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = listEvents;
const db_1 = require("../../../db");
const corporationStores_1 = require("../../../lib/corporationStores");
async function listEvents(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const { from, to } = req.query;
    const storePlaceholders = storeIds.map(() => "?").join(",");
    const conditions = [`ct.store_id IN (${storePlaceholders})`];
    const params = [...storeIds];
    if (from && to) {
        conditions.push("e.starts_at BETWEEN ? AND ?");
        params.push(from, to);
    }
    const where = "WHERE " + conditions.join(" AND ");
    const [rows] = await db_1.pool.query(`
    SELECT
      e.id,
      e.class_type_id,
      ct.name AS class_type_name,
      e.starts_at,
      e.ends_at,
      e.capacity,
      e.status,
      COALESCE(SUM(CASE WHEN r.status IN ('booked','attended') THEN 1 ELSE 0 END), 0) AS reserved_count,
      (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', s.id, 'name', s.name))
       FROM event_staff es
       JOIN staff s ON s.id = es.staff_id
       WHERE es.event_id = e.id) AS staff
    FROM events e
    LEFT JOIN reservations r ON r.event_id = e.id
    LEFT JOIN class_types ct ON ct.id = e.class_type_id
    ${where}
    GROUP BY e.id
    ORDER BY e.starts_at ASC
  `, params);
    const events = rows;
    const normalized = events.map((ev) => {
        let staff = ev.staff;
        if (staff === null || staff === undefined)
            staff = [];
        if (typeof staff === "string") {
            try {
                staff = JSON.parse(staff);
            }
            catch {
                staff = [];
            }
        }
        return { ...ev, staff };
    });
    res.json(normalized);
}
