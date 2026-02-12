"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createMakeupCredit;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function createMakeupCredit(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const body = req.body;
    const { userId, classTypeId, expiresAt, note, createdBy } = body;
    if (!userId) {
        res.status(400).json({ error: constants_1.ERR.CREDIT_USER_ID_REQUIRED });
        return;
    }
    const storePh = storeIds.map(() => "?").join(",");
    const [userRows] = await db_1.pool.query(`SELECT id FROM users WHERE id = ? AND store_id IN (${storePh})`, [userId, ...storeIds]);
    if (userRows.length === 0) {
        res.status(404).json({ error: constants_1.ERR.CREDIT_NOT_FOUND });
        return;
    }
    if (classTypeId != null) {
        const [ctRows] = await db_1.pool.query(`SELECT id FROM class_types WHERE id = ? AND store_id IN (${storePh})`, [classTypeId, ...storeIds]);
        if (ctRows.length === 0) {
            res.status(404).json({ error: constants_1.ERR.CLASS_TYPE_NOT_FOUND });
            return;
        }
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
