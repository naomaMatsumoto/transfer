"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = revokeMakeupCredit;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function revokeMakeupCredit(req, res, _next) {
    const creditId = Number(req.params.id);
    const [result] = await db_1.pool.query("UPDATE makeup_credits SET status = 'revoked', updated_at = NOW() WHERE id = ?", [creditId]);
    if (result.affectedRows === 0) {
        res.status(404).json({ error: constants_1.ERR.CREDIT_NOT_FOUND });
        return;
    }
    res.json({ id: creditId, status: "revoked" });
}
