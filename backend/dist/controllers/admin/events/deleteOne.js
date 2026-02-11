"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = deleteOneEvent;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function deleteOneEvent(req, res, _next) {
    const eventId = Number(req.params.id);
    const conn = await db_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        const [reservations] = await conn.query("SELECT id FROM reservations WHERE event_id = ? AND status IN ('booked','attended')", [eventId]);
        if (reservations.length > 0) {
            await conn.rollback();
            res.status(400).json({
                error: constants_1.ERR.EVENT_DELETE_HAS_RESERVATIONS,
                count: reservations.length,
            });
            return;
        }
        await conn.query("DELETE FROM reservations WHERE event_id = ?", [eventId]);
        await conn.query("UPDATE makeup_credits SET source_event_id = NULL WHERE source_event_id = ?", [eventId]);
        const [result] = await conn.query("DELETE FROM events WHERE id = ?", [eventId]);
        if (result.affectedRows === 0) {
            await conn.rollback();
            res.status(404).json({ error: constants_1.ERR.EVENT_NOT_FOUND });
            return;
        }
        await conn.commit();
        res.json({ id: eventId, deleted: true });
    }
    catch (err) {
        await conn.rollback();
        throw err;
    }
    finally {
        conn.release();
    }
}
