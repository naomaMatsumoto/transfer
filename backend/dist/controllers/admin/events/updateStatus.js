"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = updateEventStatus;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function updateEventStatus(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const eventId = Number(req.params.id);
    const body = req.body;
    const { status } = body;
    if (!status || !["scheduled", "canceled_by_admin", "holiday"].includes(status)) {
        res.status(400).json({ error: constants_1.ERR.EVENT_STATUS_INVALID });
        return;
    }
    const storePh = storeIds.map(() => "?").join(",");
    const [result] = await db_1.pool.query(`UPDATE events e JOIN class_types ct ON ct.id = e.class_type_id SET e.status = ?, e.updated_at = NOW() WHERE e.id = ? AND ct.store_id IN (${storePh})`, [status, eventId, ...storeIds]);
    if (result.affectedRows === 0) {
        res.status(404).json({ error: constants_1.ERR.EVENT_NOT_FOUND });
        return;
    }
    res.json({ id: eventId, status });
}
