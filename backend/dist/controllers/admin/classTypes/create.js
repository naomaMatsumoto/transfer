"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createClassType;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
function generateClassTypeCode(name) {
    const slug = name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff-]/g, "");
    if (slug.length > 0 && slug.length <= 50)
        return slug;
    return "ct_" + String(Date.now());
}
async function createClassType(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const storeId = storeIds[0];
    const body = req.body;
    const { code, name, description } = body;
    if (!name || !String(name).trim()) {
        res.status(400).json({ error: constants_1.ERR.CLASS_TYPE_NAME_REQUIRED });
        return;
    }
    const trimmedName = String(name).trim();
    const codeToUse = code && String(code).trim() ? String(code).trim() : generateClassTypeCode(trimmedName);
    try {
        const [result] = await db_1.pool.query("INSERT INTO class_types (store_id, code, name, description) VALUES (?, ?, ?, ?)", [storeId, codeToUse, trimmedName, description ?? null]);
        const insertId = result.insertId;
        res.status(201).json({ id: insertId, code: codeToUse, name: trimmedName });
    }
    catch (err) {
        const e = err;
        if (e.code === "ER_DUP_ENTRY") {
            res.status(400).json({ error: constants_1.ERR.CLASS_TYPE_CODE_DUPLICATE });
            return;
        }
        throw err;
    }
}
