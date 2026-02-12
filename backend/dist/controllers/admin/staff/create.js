"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createStaff;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function createStaff(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const storeId = storeIds[0];
    const body = req.body;
    const name = body.name;
    if (name === undefined || name === null) {
        res.status(400).json({ error: constants_1.ERR.STAFF_NAME_REQUIRED });
        return;
    }
    const trimmed = String(name).trim();
    if (trimmed.length === 0) {
        res.status(400).json({ error: constants_1.ERR.STAFF_NAME_EMPTY });
        return;
    }
    const [result] = await db_1.pool.query("INSERT INTO staff (store_id, name) VALUES (?, ?)", [storeId, trimmed]);
    const insertId = result.insertId;
    res.status(201).json({ id: insertId, name: trimmed });
}
