"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createEvent;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function createEvent(req, res, _next) {
    const body = req.body;
    const { classTypeId, startsAt, endsAt, capacity } = body;
    if (!classTypeId || !startsAt || !endsAt) {
        res.status(400).json({ error: constants_1.ERR.EVENT_CREATE_PARAMS_REQUIRED });
        return;
    }
    const sql = "INSERT INTO events (class_type_id, starts_at, ends_at, capacity, status) VALUES (?, ?, ?, ?, 'scheduled')";
    const [result] = await db_1.pool.query(sql, [classTypeId, startsAt, endsAt, capacity ?? 6]);
    const insertId = result.insertId;
    res.status(201).json({ id: insertId });
}
