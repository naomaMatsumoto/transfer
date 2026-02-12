"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = bulkTimeEvents;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function bulkTimeEvents(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const body = req.body;
    const { ids, startTime, endTime } = body;
    if (!ids || ids.length === 0 || !startTime || !endTime) {
        res.status(400).json({ error: constants_1.ERR.EVENT_BULK_TIME_PARAMS_REQUIRED });
        return;
    }
    const storePh = storeIds.map(() => "?").join(",");
    let updated = 0;
    for (const id of ids) {
        const [rows] = await db_1.pool.query(`SELECT e.starts_at, e.ends_at FROM events e JOIN class_types ct ON ct.id = e.class_type_id WHERE e.id = ? AND ct.store_id IN (${storePh})`, [id, ...storeIds]);
        const row = rows[0];
        if (!row)
            continue;
        const dateStr = (row.starts_at ?? "").toString().slice(0, 10);
        if (!dateStr || dateStr.length < 10)
            continue;
        const newStart = `${dateStr} ${startTime}:00`;
        const newEnd = `${dateStr} ${endTime}:00`;
        await db_1.pool.query("UPDATE events SET starts_at = ?, ends_at = ?, updated_at = NOW() WHERE id = ?", [newStart, newEnd, id]);
        updated++;
    }
    res.json({ updated, startTime, endTime });
}
