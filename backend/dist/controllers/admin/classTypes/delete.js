"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = deleteClassType;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function deleteClassType(req, res, _next) {
    const id = Number(req.params.id);
    try {
        const [result] = await db_1.pool.query("DELETE FROM class_types WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            res.status(404).json({ error: constants_1.ERR.CLASS_TYPE_NOT_FOUND });
            return;
        }
        res.json({ id, deleted: true });
    }
    catch (err) {
        if (err.code === "ER_ROW_IS_REFERENCED_2") {
            res.status(400).json({ error: constants_1.ERR.CLASS_TYPE_IN_USE });
            return;
        }
        throw err;
    }
}
