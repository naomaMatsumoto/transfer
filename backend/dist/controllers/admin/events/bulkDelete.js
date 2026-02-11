"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = bulkDeleteEvents;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function bulkDeleteEvents(req, res, _next) {
    const { ids } = req.body;
    if (!ids || ids.length === 0) {
        res.status(400).json({ error: constants_1.ERR.EVENT_IDS_REQUIRED });
        return;
    }
    const conn = await db_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        const ph = ids.map(() => "?").join(",");
        const q1 = "SELECT event_id, COUNT(*) AS cnt FROM reservations WHERE event_id IN (" + ph + ") AND status IN ('booked','attended') GROUP BY event_id";
        const [activeRes] = await conn.query(q1, ids);
        const activeEvents = activeRes;
        if (activeEvents.length > 0) {
            await conn.rollback();
            const details = activeEvents.map((r) => ({ eventId: r.event_id, count: r.cnt }));
            res.status(400).json({ error: constants_1.ERR.EVENT_BULK_DELETE_HAS_RESERVATIONS, details });
            return;
        }
        await conn.query("DELETE FROM reservations WHERE event_id IN (" + ph + ")", ids);
        await conn.query("UPDATE makeup_credits SET source_event_id = NULL WHERE source_event_id IN (" + ph + ")", ids);
        const [result] = await conn.query("DELETE FROM events WHERE id IN (" + ph + ")", ids);
        await conn.commit();
        res.json({ deleted: result.affectedRows });
    }
    catch (err) {
        await conn.rollback();
        throw err;
    }
    finally {
        conn.release();
    }
}
