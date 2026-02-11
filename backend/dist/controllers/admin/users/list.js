"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = listUsers;
const db_1 = require("../../../db");
async function listUsers(_req, res, _next) {
    const [rows] = await db_1.pool.query("SELECT id, name, furigana, email, address, phone, course_type, stage, status, created_at FROM users ORDER BY id ASC");
    res.json(rows);
}
