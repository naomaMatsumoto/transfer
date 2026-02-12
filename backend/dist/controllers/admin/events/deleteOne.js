"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = deleteOneEvent;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function deleteOneEvent(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const eventId = Number(req.params.id);
    const storePlaceholders = storeIds.map(() => "?").join(",");
    const conn = await db_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        const [eventScope] = await conn.query(`SELECT e.id FROM events e JOIN class_types ct ON ct.id = e.class_type_id WHERE e.id = ? AND ct.store_id IN (${storePlaceholders})`, [eventId, ...storeIds]);
        if (eventScope.length === 0) {
            await conn.rollback();
            res.status(404).json({ error: constants_1.ERR.EVENT_NOT_FOUND });
            return;
        }
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
