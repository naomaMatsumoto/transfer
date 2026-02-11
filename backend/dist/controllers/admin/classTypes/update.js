"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = updateClassType;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function updateClassType(req, res, _next) {
    const id = Number(req.params.id);
    const { code, name, description } = req.body;
    const sets = [];
    const params = [];
    if (code !== undefined) {
        sets.push("code = ?");
        params.push(String(code).trim());
    }
    if (name !== undefined) {
        const v = String(name).trim();
        if (v.length === 0) {
            res.status(400).json({ error: constants_1.ERR.CLASS_TYPE_NAME_EMPTY });
            return;
        }
        sets.push("name = ?");
        params.push(v);
    }
    if (description !== undefined) {
        sets.push("description = ?");
        params.push(description);
    }
    if (sets.length === 0) {
        res.status(400).json({ error: constants_1.ERR.CLASS_TYPE_UPDATE_EMPTY });
        return;
    }
    params.push(id);
    try {
        const [result] = await db_1.pool.query(`UPDATE class_types SET ${sets.join(", ")} WHERE id = ?`, params);
        if (result.affectedRows === 0) {
            res.status(404).json({ error: constants_1.ERR.CLASS_TYPE_NOT_FOUND });
            return;
        }
        res.json({ id, updated: true });
    }
    catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            res.status(400).json({ error: constants_1.ERR.CLASS_TYPE_CODE_DUPLICATE });
            return;
        }
        throw err;
    }
}
