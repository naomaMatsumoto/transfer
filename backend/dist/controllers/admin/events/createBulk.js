"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createBulkEvents;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function createBulkEvents(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const body = req.body;
    const { classTypeId, startTime, endTime, capacity, weekdays, dateFrom, dateTo, excludeDates, staffIds } = body;
    if (!classTypeId ||
        !startTime ||
        !endTime ||
        !weekdays ||
        weekdays.length === 0 ||
        !dateFrom ||
        !dateTo) {
        res.status(400).json({ error: constants_1.ERR.EVENT_BULK_PARAMS_REQUIRED });
        return;
    }
    const placeholders = storeIds.map(() => "?").join(",");
    const [ctRows] = await db_1.pool.query(`SELECT id FROM class_types WHERE id = ? AND store_id IN (${placeholders})`, [classTypeId, ...storeIds]);
    if (ctRows.length === 0) {
        res.status(404).json({ error: constants_1.ERR.CLASS_TYPE_NOT_FOUND });
        return;
    }
    const excludeSet = new Set(excludeDates ?? []);
    const created = [];
    const cursor = new Date(dateFrom + "T00:00:00");
    const end = new Date(dateTo + "T00:00:00");
    while (cursor <= end) {
        const day = cursor.getDay();
        const y = cursor.getFullYear();
        const m = String(cursor.getMonth() + 1).padStart(2, "0");
        const d = String(cursor.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${d}`;
        if (weekdays.includes(day) && !excludeSet.has(dateStr)) {
            const startsAt = `${dateStr} ${startTime}:00`;
            const endsAt = `${dateStr} ${endTime}:00`;
            const [result] = await db_1.pool.query(`INSERT INTO events (class_type_id, starts_at, ends_at, capacity, status)
         VALUES (?, ?, ?, ?, 'scheduled')`, [classTypeId, startsAt, endsAt, capacity ?? 6]);
            const eventId = result.insertId;
            created.push({ id: eventId, date: dateStr });
            const ids = Array.isArray(staffIds) ? staffIds.filter((id) => Number.isInteger(id) && id > 0) : [];
            const uniqueIds = [...new Set(ids)];
            for (const staffId of uniqueIds) {
                const [staffRows] = await db_1.pool.query(`SELECT id FROM staff WHERE id = ? AND store_id IN (${placeholders})`, [staffId, ...storeIds]);
                if (staffRows.length > 0) {
                    await db_1.pool.query("INSERT INTO event_staff (event_id, staff_id) VALUES (?, ?)", [eventId, staffId]);
                }
            }
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    res.status(201).json({ count: created.length, events: created });
}
