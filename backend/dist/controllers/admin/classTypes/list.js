"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = listClassTypes;
const db_1 = require("../../../db");
async function listClassTypes(_req, res, _next) {
    const [rows] = await db_1.pool.query("SELECT id, code, name, description FROM class_types ORDER BY id ASC");
    res.json(rows);
}
