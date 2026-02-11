"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = bulkStatusEvents;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function bulkStatusEvents(req, res, _next) {
    const body = req.body;
    const { ids, status } = body;
    if (!ids || ids.length === 0 || !status) {
        res.status(400).json({ error: constants_1.ERR.EVENT_BULK_STATUS_PARAMS_REQUIRED });
        return;
    }
    if (!["scheduled", "canceled_by_admin", "holiday"].includes(status)) {
        res.status(400).json({ error: constants_1.ERR.EVENT_STATUS_INVALID });
        return;
    }
    const ph = ids.map(() => "?").join(",");
    const [result] = await db_1.pool.query("UPDATE events SET status = ?, updated_at = NOW() WHERE id IN (" + ph + ")", [status, ...ids]);
    res.json({ updated: result.affectedRows, status });
}
