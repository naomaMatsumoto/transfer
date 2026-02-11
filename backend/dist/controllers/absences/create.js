"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createAbsence;
const db_1 = require("../../db");
const constants_1 = require("../../constants");
async function createAbsence(req, res, _next) {
    const { userId, eventId, reason } = req.body;
    if (!userId || !eventId) {
        res.status(400).json({ error: constants_1.ERR.USER_ID_EVENT_ID_REQUIRED });
        return;
    }
    const conn = await db_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        const [events] = await conn.query("SELECT id, class_type_id FROM events WHERE id = ? FOR UPDATE", [eventId]);
        const eventRow = events[0];
        if (!eventRow) {
            await conn.rollback();
            res.status(404).json({ error: constants_1.ERR.EVENT_NOT_FOUND });
            return;
        }
        const [result] = await conn.query("INSERT INTO makeup_credits (user_id, class_type_id, granted_at, status, source, source_event_id, note) VALUES (?, ?, NOW(), 'granted', 'absence', ?, ?)", [userId, eventRow.class_type_id, eventId, reason ?? null]);
        await conn.commit();
        res.status(201).json({
            id: result.insertId,
            userId,
            eventId,
            classTypeId: eventRow.class_type_id,
        });
    }
    catch (err) {
        await conn.rollback();
        throw err;
    }
    finally {
        conn.release();
    }
}
