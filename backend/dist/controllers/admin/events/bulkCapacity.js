"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = bulkCapacityEvents;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function bulkCapacityEvents(req, res, _next) {
    const body = req.body;
    const { ids, capacity } = body;
    if (!ids || ids.length === 0 || capacity == null || capacity < 0) {
        res.status(400).json({ error: constants_1.ERR.EVENT_BULK_CAPACITY_PARAMS_REQUIRED });
        return;
    }
    const placeholders = ids.map(() => "?").join(",");
    const [result] = await db_1.pool.query(`UPDATE events SET capacity = ?, updated_at = NOW() WHERE id IN (${placeholders})`, [capacity, ...ids]);
    res.json({
        updated: result.affectedRows,
        capacity,
    });
}
