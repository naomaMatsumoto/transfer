"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = updateEventStatus;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function updateEventStatus(req, res, _next) {
    const eventId = Number(req.params.id);
    const body = req.body;
    const { status } = body;
    if (!status || !["scheduled", "canceled_by_admin", "holiday"].includes(status)) {
        res.status(400).json({ error: constants_1.ERR.EVENT_STATUS_INVALID });
        return;
    }
    const [result] = await db_1.pool.query("UPDATE events SET status = ?, updated_at = NOW() WHERE id = ?", [status, eventId]);
    if (result.affectedRows === 0) {
        res.status(404).json({ error: constants_1.ERR.EVENT_NOT_FOUND });
        return;
    }
    res.json({ id: eventId, status });
}
