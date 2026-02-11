"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = bulkTimeEvents;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function bulkTimeEvents(req, res, _next) {
    const body = req.body;
    const { ids, startTime, endTime } = body;
    if (!ids || ids.length === 0 || !startTime || !endTime) {
        res.status(400).json({ error: constants_1.ERR.EVENT_BULK_TIME_PARAMS_REQUIRED });
        return;
    }
    let updated = 0;
    for (const id of ids) {
        const [rows] = await db_1.pool.query("SELECT starts_at, ends_at FROM events WHERE id = ?", [id]);
        const row = rows[0];
        if (!row)
            continue;
        const dateStr = new Date(row.starts_at).toISOString().slice(0, 10);
        const newStart = `${dateStr} ${startTime}:00`;
        const newEnd = `${dateStr} ${endTime}:00`;
        await db_1.pool.query("UPDATE events SET starts_at = ?, ends_at = ?, updated_at = NOW() WHERE id = ?", [newStart, newEnd, id]);
        updated++;
    }
    res.json({ updated, startTime, endTime });
}
