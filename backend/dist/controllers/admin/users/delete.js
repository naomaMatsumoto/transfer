"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = deleteUser;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function deleteUser(req, res, _next) {
    const id = Number(req.params.id);
    const [refCredits] = await db_1.pool.query("SELECT 1 FROM makeup_credits WHERE user_id = ? LIMIT 1", [id]);
    const [refRes] = await db_1.pool.query("SELECT 1 FROM reservations WHERE user_id = ? LIMIT 1", [id]);
    if (refCredits.length > 0 || refRes.length > 0) {
        res.status(400).json({ error: constants_1.ERR.MEMBER_DELETE_HAS_REFERENCES });
        return;
    }
    const [result] = await db_1.pool.query("DELETE FROM users WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
        res.status(404).json({ error: constants_1.ERR.MEMBER_NOT_FOUND });
        return;
    }
    res.json({ id, deleted: true });
}
