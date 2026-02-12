"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = listStoresPublic;
const db_1 = require("../../db");
/**
 * 会員登録フォーム用。店舗一覧を返す（公開API）
 */
async function listStoresPublic(_req, res, _next) {
    const [rows] = await db_1.pool.query("SELECT id, name FROM stores ORDER BY corporation_id, id ASC");
    res.json(rows);
}
