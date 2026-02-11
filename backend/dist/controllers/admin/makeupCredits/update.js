"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = updateMakeupCredit;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function updateMakeupCredit(req, res, _next) {
    const creditId = Number(req.params.id);
    const body = req.body;
    const { status, expiresAt, note } = body;
    const sets = [];
    const params = [];
    if (status) {
        sets.push("status = ?");
        params.push(status);
    }
    if (expiresAt !== undefined) {
        sets.push("expires_at = ?");
        params.push(expiresAt);
    }
    if (note !== undefined) {
        sets.push("note = ?");
        params.push(note);
    }
    if (sets.length === 0) {
        res.status(400).json({ error: constants_1.ERR.CREDIT_UPDATE_EMPTY });
        return;
    }
    sets.push("updated_at = NOW()");
    params.push(creditId);
    const [result] = await db_1.pool.query("UPDATE makeup_credits SET " + sets.join(", ") + " WHERE id = ?", params);
    if (result.affectedRows === 0) {
        res.status(404).json({ error: constants_1.ERR.CREDIT_NOT_FOUND });
        return;
    }
    res.json({ id: creditId, updated: true });
}
