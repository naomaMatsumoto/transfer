"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createUser;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function createUser(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const storeId = storeIds[0];
    const { name, furigana, email, address, phone, course_type, stage } = req.body;
    if (!name || !String(name).trim()) {
        res.status(400).json({ error: constants_1.ERR.MEMBER_NAME_REQUIRED });
        return;
    }
    const trimmedName = String(name).trim();
    const furiganaVal = furigana != null && String(furigana).trim() !== "" ? String(furigana).trim() : null;
    const emailTrimmed = email != null && String(email).trim() !== "" ? String(email).trim() : null;
    if (emailTrimmed !== null && !(0, constants_1.isValidEmail)(emailTrimmed)) {
        res.status(400).json({ error: constants_1.ERR.MEMBER_EMAIL_INVALID });
        return;
    }
    const addressVal = address == null || String(address).trim() === "" ? null : String(address).trim();
    const phoneVal = phone == null || String(phone).trim() === "" ? null : String(phone).trim();
    const stageVal = stage && constants_1.STAGE_VALUES.includes(stage) ? stage : "other";
    try {
        const [result] = await db_1.pool.query("INSERT INTO users (store_id, name, furigana, email, address, phone, course_type, stage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [storeId, trimmedName, furiganaVal, emailTrimmed, addressVal, phoneVal, course_type ?? null, stageVal]);
        res.status(201).json({
            id: result.insertId,
            name: trimmedName,
            furigana: furiganaVal,
            email: emailTrimmed,
            address: addressVal,
            phone: phoneVal,
            course_type: course_type ?? null,
            stage: stageVal,
        });
    }
    catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            res.status(400).json({ error: constants_1.ERR.MEMBER_EMAIL_DUPLICATE });
            return;
        }
        throw err;
    }
}
