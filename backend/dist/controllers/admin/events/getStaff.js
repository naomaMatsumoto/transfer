"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getEventStaff;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function getEventStaff(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const eventId = Number(req.params.id);
    const storePh = storeIds.map(() => "?").join(",");
    const [eventRow] = await db_1.pool.query(`SELECT e.id FROM events e JOIN class_types ct ON ct.id = e.class_type_id WHERE e.id = ? AND ct.store_id IN (${storePh})`, [eventId, ...storeIds]);
    const events = eventRow;
    if (events.length === 0) {
        res.status(404).json({ error: constants_1.ERR.EVENT_NOT_FOUND });
        return;
    }
    const [rows] = await db_1.pool.query(`SELECT s.id, s.name
     FROM event_staff es
     JOIN staff s ON s.id = es.staff_id
     WHERE es.event_id = ?
     ORDER BY s.name ASC`, [eventId]);
    res.json(rows);
}
