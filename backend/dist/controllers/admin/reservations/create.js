"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createReservation;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function createReservation(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const body = req.body;
    const { userId, eventId, reservationType, makeupCreditId, overrideCapacity } = body;
    if (!userId || !eventId || !reservationType) {
        res.status(400).json({ error: constants_1.ERR.RESERVATION_PARAMS_REQUIRED });
        return;
    }
    if (reservationType === "makeup" && !makeupCreditId) {
        res.status(400).json({ error: constants_1.ERR.MAKEUP_CREDIT_ID_REQUIRED });
        return;
    }
    const storePh = storeIds.map(() => "?").join(",");
    const conn = await db_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        const [eventRows] = await conn.query(`SELECT e.id, e.capacity, e.status, COALESCE(SUM(CASE WHEN r.status IN ('booked','attended') THEN 1 ELSE 0 END), 0) AS reserved_count FROM events e LEFT JOIN reservations r ON r.event_id = e.id JOIN class_types ct ON ct.id = e.class_type_id WHERE e.id = ? AND ct.store_id IN (${storePh}) GROUP BY e.id FOR UPDATE`, [eventId, ...storeIds]);
        const event = eventRows[0];
        if (!event) {
            await conn.rollback();
            res.status(404).json({ error: constants_1.ERR.EVENT_NOT_FOUND });
            return;
        }
        const [userRows] = await conn.query(`SELECT id FROM users WHERE id = ? AND store_id IN (${storePh})`, [userId, ...storeIds]);
        if (userRows.length === 0) {
            await conn.rollback();
            res.status(404).json({ error: constants_1.ERR.EVENT_NOT_FOUND });
            return;
        }
        if (!overrideCapacity && event.reserved_count >= event.capacity) {
            await conn.rollback();
            res.status(400).json({ error: constants_1.ERR.EVENT_CAPACITY_FULL_OVERRIDE });
            return;
        }
        const [existing] = await conn.query("SELECT id FROM reservations WHERE user_id = ? AND event_id = ? AND status IN ('booked','attended') FOR UPDATE", [userId, eventId]);
        if (existing.length > 0) {
            await conn.rollback();
            res.status(400).json({ error: constants_1.ERR.RESERVATION_ALREADY_EXISTS });
            return;
        }
        let makeupIdToUse = null;
        if (reservationType === "makeup") {
            const [credits] = await conn.query("SELECT id, status FROM makeup_credits WHERE id = ? AND user_id = ? FOR UPDATE", [makeupCreditId, userId]);
            const credit = credits[0];
            if (!credit || credit.status !== "granted") {
                await conn.rollback();
                res.status(400).json({ error: constants_1.ERR.MAKEUP_CREDIT_NOT_AVAILABLE });
                return;
            }
            makeupIdToUse = credit.id;
        }
        const [result] = await conn.query("INSERT INTO reservations (user_id, event_id, reservation_type, makeup_credit_id, status, created_at) VALUES (?, ?, ?, ?, 'booked', NOW())", [userId, eventId, reservationType, makeupIdToUse]);
        if (reservationType === "makeup" && makeupIdToUse) {
            await conn.query("UPDATE makeup_credits SET status = 'consumed', updated_at = NOW() WHERE id = ?", [makeupIdToUse]);
        }
        await conn.commit();
        res.status(201).json({
            id: result.insertId,
            userId,
            eventId,
            reservationType,
            makeupCreditId: makeupIdToUse,
            overrideCapacity: !!overrideCapacity,
        });
    }
    catch (err) {
        await conn.rollback();
        throw err;
    }
    finally {
        conn.release();
    }
}
