"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createBulkEvents;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function createBulkEvents(req, res, _next) {
    const body = req.body;
    const { classTypeId, startTime, endTime, capacity, weekdays, dateFrom, dateTo, excludeDates } = body;
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
            created.push({ id: result.insertId, date: dateStr });
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    res.status(201).json({ count: created.length, events: created });
}
