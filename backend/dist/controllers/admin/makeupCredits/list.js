"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = listMakeupCredits;
const db_1 = require("../../../db");
const corporationStores_1 = require("../../../lib/corporationStores");
async function listMakeupCredits(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const storePh = storeIds.map(() => "?").join(",");
    const conditions = [`u.store_id IN (${storePh})`];
    const params = [...storeIds];
    const { userId, status } = req.query;
    if (userId) {
        conditions.push("mc.user_id = ?");
        params.push(Number(userId));
    }
    if (status) {
        conditions.push("mc.status = ?");
        params.push(status);
    }
    const where = "WHERE " + conditions.join(" AND ");
    const sql = "SELECT mc.id, mc.user_id, u.name AS user_name, mc.class_type_id, ct.name AS class_type_name, mc.granted_at, mc.expires_at, mc.status, mc.source, mc.source_event_id, mc.note, mc.created_by FROM makeup_credits mc LEFT JOIN users u ON u.id = mc.user_id LEFT JOIN class_types ct ON ct.id = mc.class_type_id " +
        where +
        " ORDER BY mc.granted_at DESC";
    const [rows] = await db_1.pool.query(sql, params);
    res.json(rows);
}
