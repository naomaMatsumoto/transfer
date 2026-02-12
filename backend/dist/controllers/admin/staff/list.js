"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = listStaff;
const db_1 = require("../../../db");
const corporationStores_1 = require("../../../lib/corporationStores");
async function listStaff(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const placeholders = storeIds.map(() => "?").join(",");
    const [rows] = await db_1.pool.query(`SELECT id, name, created_at FROM staff WHERE store_id IN (${placeholders}) ORDER BY name ASC`, storeIds);
    res.json(rows);
}
