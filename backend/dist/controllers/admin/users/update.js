"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = updateUser;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function updateUser(req, res, _next) {
    const id = Number(req.params.id);
    const { name, furigana, email, address, phone, course_type, stage } = req.body;
    const updates = [];
    const params = [];
    if (name !== undefined) {
        const v = String(name).trim();
        if (v.length === 0) {
            res.status(400).json({ error: constants_1.ERR.MEMBER_NAME_EMPTY });
            return;
        }
        updates.push("name = ?");
        params.push(v);
    }
    if (furigana !== undefined) {
        updates.push("furigana = ?");
        params.push(furigana == null || String(furigana).trim() === "" ? null : String(furigana).trim());
    }
    if (address !== undefined) {
        updates.push("address = ?");
        params.push(address == null || String(address).trim() === "" ? null : String(address).trim());
    }
    if (phone !== undefined) {
        updates.push("phone = ?");
        params.push(phone == null || String(phone).trim() === "" ? null : String(phone).trim());
    }
    if (email !== undefined) {
        const v = String(email).trim();
        const emailVal = v === "" ? null : v;
        if (emailVal !== null && !(0, constants_1.isValidEmail)(emailVal)) {
            res.status(400).json({ error: constants_1.ERR.MEMBER_EMAIL_INVALID });
            return;
        }
        updates.push("email = ?");
        params.push(emailVal);
    }
    if (course_type !== undefined) {
        updates.push("course_type = ?");
        params.push(course_type === null || course_type === "" ? null : course_type);
    }
    if (stage !== undefined) {
        const v = stage && constants_1.STAGE_VALUES.includes(stage) ? stage : "other";
        updates.push("stage = ?");
        params.push(v);
    }
    if (updates.length === 0) {
        res.status(400).json({ error: constants_1.ERR.MEMBER_UPDATE_EMPTY });
        return;
    }
    params.push(id);
    try {
        const [result] = await db_1.pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
        if (result.affectedRows === 0) {
            res.status(404).json({ error: constants_1.ERR.MEMBER_NOT_FOUND });
            return;
        }
        res.json({ id, updated: true });
    }
    catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            res.status(400).json({ error: constants_1.ERR.MEMBER_EMAIL_DUPLICATE });
            return;
        }
        throw err;
    }
}
