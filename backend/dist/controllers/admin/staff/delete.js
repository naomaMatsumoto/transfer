"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = deleteStaff;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function deleteStaff(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const id = Number(req.params.id);
    const placeholders = storeIds.map(() => "?").join(",");
    const [result] = await db_1.pool.query(`DELETE FROM staff WHERE id = ? AND store_id IN (${placeholders})`, [id, ...storeIds]);
    if (result.affectedRows === 0) {
        res.status(404).json({ error: constants_1.ERR.STAFF_NOT_FOUND });
        return;
    }
    res.json({ id, deleted: true });
}
