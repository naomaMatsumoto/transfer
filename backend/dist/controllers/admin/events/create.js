"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createEvent;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function createEvent(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const body = req.body;
    const { classTypeId, startsAt, endsAt, capacity, staffIds } = body;
    if (!classTypeId || !startsAt || !endsAt) {
        res.status(400).json({ error: constants_1.ERR.EVENT_CREATE_PARAMS_REQUIRED });
        return;
    }
    const placeholders = storeIds.map(() => "?").join(",");
    const [ctRows] = await db_1.pool.query(`SELECT id FROM class_types WHERE id = ? AND store_id IN (${placeholders})`, [classTypeId, ...storeIds]);
    if (ctRows.length === 0) {
        res.status(404).json({ error: constants_1.ERR.CLASS_TYPE_NOT_FOUND });
        return;
    }
    const sql = "INSERT INTO events (class_type_id, starts_at, ends_at, capacity, status) VALUES (?, ?, ?, ?, 'scheduled')";
    const [result] = await db_1.pool.query(sql, [classTypeId, startsAt, endsAt, capacity ?? 6]);
    const insertId = result.insertId;
    const ids = Array.isArray(staffIds) ? staffIds.filter((id) => Number.isInteger(id) && id > 0) : [];
    const uniqueIds = [...new Set(ids)];
    for (const staffId of uniqueIds) {
        const [staffRows] = await db_1.pool.query(`SELECT id FROM staff WHERE id = ? AND store_id IN (${placeholders})`, [staffId, ...storeIds]);
        if (staffRows.length > 0) {
            await db_1.pool.query("INSERT INTO event_staff (event_id, staff_id) VALUES (?, ?)", [insertId, staffId]);
        }
    }
    res.status(201).json({ id: insertId });
}
