"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = updateEventCapacity;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function updateEventCapacity(req, res, _next) {
    const eventId = Number(req.params.id);
    const body = req.body;
    const { capacity } = body;
    if (capacity == null || capacity < 0) {
        res.status(400).json({ error: constants_1.ERR.EVENT_CAPACITY_INVALID });
        return;
    }
    const [result] = await db_1.pool.query("UPDATE events SET capacity = ?, updated_at = NOW() WHERE id = ?", [capacity, eventId]);
    if (result.affectedRows === 0) {
        res.status(404).json({ error: constants_1.ERR.EVENT_NOT_FOUND });
        return;
    }
    res.json({ id: eventId, capacity });
}
