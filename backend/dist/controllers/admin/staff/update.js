"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = updateStaff;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function updateStaff(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const id = Number(req.params.id);
    const body = req.body;
    const name = body.name;
    if (name === undefined) {
        res.status(400).json({ error: constants_1.ERR.STAFF_UPDATE_EMPTY });
        return;
    }
    const trimmed = String(name).trim();
    if (trimmed.length === 0) {
        res.status(400).json({ error: constants_1.ERR.STAFF_NAME_EMPTY });
        return;
    }
    const placeholders = storeIds.map(() => "?").join(",");
    const [result] = await db_1.pool.query(`UPDATE staff SET name = ? WHERE id = ? AND store_id IN (${placeholders})`, [trimmed, id, ...storeIds]);
    if (result.affectedRows === 0) {
        res.status(404).json({ error: constants_1.ERR.STAFF_NOT_FOUND });
        return;
    }
    res.json({ id, name: trimmed, updated: true });
}
