"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = updateMakeupCredit;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function updateMakeupCredit(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const creditId = Number(req.params.id);
    const body = req.body;
    const { status, expiresAt, note } = body;
    const sets = [];
    const params = [];
    if (status) {
        sets.push("mc.status = ?");
        params.push(status);
    }
    if (expiresAt !== undefined) {
        sets.push("mc.expires_at = ?");
        params.push(expiresAt);
    }
    if (note !== undefined) {
        sets.push("mc.note = ?");
        params.push(note);
    }
    if (sets.length === 0) {
        res.status(400).json({ error: constants_1.ERR.CREDIT_UPDATE_EMPTY });
        return;
    }
    sets.push("mc.updated_at = NOW()");
    const storePh = storeIds.map(() => "?").join(",");
    params.push(creditId, ...storeIds);
    const [result] = await db_1.pool.query(`UPDATE makeup_credits mc JOIN users u ON u.id = mc.user_id SET ${sets.join(", ")} WHERE mc.id = ? AND u.store_id IN (${storePh})`, params);
    if (result.affectedRows === 0) {
        res.status(404).json({ error: constants_1.ERR.CREDIT_NOT_FOUND });
        return;
    }
    res.json({ id: creditId, updated: true });
}
