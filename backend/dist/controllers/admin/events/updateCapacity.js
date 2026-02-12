"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = updateEventCapacity;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function updateEventCapacity(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const eventId = Number(req.params.id);
    const body = req.body;
    const { capacity } = body;
    if (capacity == null || capacity < 0) {
        res.status(400).json({ error: constants_1.ERR.EVENT_CAPACITY_INVALID });
        return;
    }
    const storePh = storeIds.map(() => "?").join(",");
    const [result] = await db_1.pool.query(`UPDATE events e JOIN class_types ct ON ct.id = e.class_type_id SET e.capacity = ?, e.updated_at = NOW() WHERE e.id = ? AND ct.store_id IN (${storePh})`, [capacity, eventId, ...storeIds]);
    if (result.affectedRows === 0) {
        res.status(404).json({ error: constants_1.ERR.EVENT_NOT_FOUND });
        return;
    }
    res.json({ id: eventId, capacity });
}
