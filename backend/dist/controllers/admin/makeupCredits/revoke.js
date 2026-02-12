"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = revokeMakeupCredit;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function revokeMakeupCredit(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const creditId = Number(req.params.id);
    const storePh = storeIds.map(() => "?").join(",");
    const [result] = await db_1.pool.query(`UPDATE makeup_credits mc JOIN users u ON u.id = mc.user_id SET mc.status = 'revoked', mc.updated_at = NOW() WHERE mc.id = ? AND u.store_id IN (${storePh})`, [creditId, ...storeIds]);
    if (result.affectedRows === 0) {
        res.status(404).json({ error: constants_1.ERR.CREDIT_NOT_FOUND });
        return;
    }
    res.json({ id: creditId, status: "revoked" });
}
