"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = updateEventTime;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function updateEventTime(req, res, _next) {
    const eventId = Number(req.params.id);
    const body = req.body;
    const { startsAt, endsAt } = body;
    if (!startsAt || !endsAt) {
        res.status(400).json({ error: constants_1.ERR.EVENT_TIME_PARAMS_REQUIRED });
        return;
    }
    const [result] = await db_1.pool.query("UPDATE events SET starts_at = ?, ends_at = ?, updated_at = NOW() WHERE id = ?", [startsAt, endsAt, eventId]);
    if (result.affectedRows === 0) {
        res.status(404).json({ error: constants_1.ERR.EVENT_NOT_FOUND });
        return;
    }
    res.json({ id: eventId, startsAt, endsAt });
}
