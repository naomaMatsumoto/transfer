"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = putEventStaff;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function putEventStaff(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const eventId = Number(req.params.id);
    const body = req.body;
    const staffIds = Array.isArray(body.staffIds) ? body.staffIds : [];
    const storePh = storeIds.map(() => "?").join(",");
    const [eventRow] = await db_1.pool.query(`SELECT e.id FROM events e JOIN class_types ct ON ct.id = e.class_type_id WHERE e.id = ? AND ct.store_id IN (${storePh})`, [eventId, ...storeIds]);
    const events = eventRow;
    if (events.length === 0) {
        res.status(404).json({ error: constants_1.ERR.EVENT_NOT_FOUND });
        return;
    }
    const conn = await db_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query("DELETE FROM event_staff WHERE event_id = ?", [eventId]);
        if (staffIds.length > 0) {
            const validIds = staffIds.filter((id) => Number.isInteger(id) && id > 0);
            const uniqueIds = [...new Set(validIds)];
            for (const staffId of uniqueIds) {
                const [staffRows] = await conn.query(`SELECT id FROM staff WHERE id = ? AND store_id IN (${storePh})`, [staffId, ...storeIds]);
                if (staffRows.length > 0) {
                    await conn.query("INSERT INTO event_staff (event_id, staff_id) VALUES (?, ?)", [eventId, staffId]);
                }
            }
        }
        await conn.commit();
    }
    catch (e) {
        await conn.rollback();
        throw e;
    }
    finally {
        conn.release();
    }
    const [rows] = await db_1.pool.query(`SELECT s.id, s.name
     FROM event_staff es
     JOIN staff s ON s.id = es.staff_id
     WHERE es.event_id = ?
     ORDER BY s.name ASC`, [eventId]);
    res.json(rows);
}
