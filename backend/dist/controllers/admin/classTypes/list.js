"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = listClassTypes;
const db_1 = require("../../../db");
const corporationStores_1 = require("../../../lib/corporationStores");
async function listClassTypes(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const placeholders = storeIds.map(() => "?").join(",");
    const [rows] = await db_1.pool.query(`SELECT id, code, name, description, store_id FROM class_types WHERE store_id IN (${placeholders}) ORDER BY id ASC`, storeIds);
    res.json(rows);
}
