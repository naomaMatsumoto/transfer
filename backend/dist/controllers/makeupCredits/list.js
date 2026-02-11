"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = listMakeupCredits;
const db_1 = require("../../db");
const constants_1 = require("../../constants");
async function listMakeupCredits(req, res, _next) {
    const { userId } = req.query;
    const userIdNum = Number(userId);
    if (!userIdNum) {
        res.status(400).json({ error: constants_1.ERR.USER_ID_REQUIRED });
        return;
    }
    const [rows] = await db_1.pool.query("SELECT id, user_id, class_type_id, granted_at, expires_at, status, source, source_event_id, note FROM makeup_credits WHERE user_id = ? AND status = 'granted' ORDER BY granted_at ASC", [userIdNum]);
    res.json(rows);
}
