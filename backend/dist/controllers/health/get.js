"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getHealth;
const db_1 = require("../../db");
async function getHealth(_req, res, _next) {
    const [rows] = await db_1.pool.query("SELECT 1");
    res.json({ status: "ok", db: rows });
}
