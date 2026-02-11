"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createMakeupCredit;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function createMakeupCredit(req, res, _next) {
    const body = req.body;
    const { userId, classTypeId, expiresAt, note, createdBy } = body;
    if (!userId) {
        res.status(400).json({ error: constants_1.ERR.CREDIT_USER_ID_REQUIRED });
        return;
    }
    const sql = "INSERT INTO makeup_credits (user_id, class_type_id, granted_at, expires_at, status, source, note, created_by) VALUES (?, ?, NOW(), ?, 'granted', 'admin_holiday', ?, ?)";
    const [result] = await db_1.pool.query(sql, [
        userId,
        classTypeId ?? null,
        expiresAt ?? null,
        note ?? null,
        createdBy ?? "admin",
    ]);
    res.status(201).json({ id: result.insertId });
}
