"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = bulkCapacityEvents;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function bulkCapacityEvents(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const body = req.body;
    const { ids, capacity } = body;
    if (!ids || ids.length === 0 || capacity == null || capacity < 0) {
        res.status(400).json({ error: constants_1.ERR.EVENT_BULK_CAPACITY_PARAMS_REQUIRED });
        return;
    }
    const storePh = storeIds.map(() => "?").join(",");
    const placeholders = ids.map(() => "?").join(",");
    const [result] = await db_1.pool.query(`UPDATE events e JOIN class_types ct ON ct.id = e.class_type_id SET e.capacity = ?, e.updated_at = NOW() WHERE e.id IN (${placeholders}) AND ct.store_id IN (${storePh})`, [capacity, ...ids, ...storeIds]);
    res.json({
        updated: result.affectedRows,
        capacity,
    });
}
