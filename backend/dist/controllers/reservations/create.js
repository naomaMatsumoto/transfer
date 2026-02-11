"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createReservation;
const db_1 = require("../../db");
const constants_1 = require("../../constants");
async function createReservation(req, res, _next) {
    const { userId, eventId, reservationType, makeupCreditId } = req.body;
    if (!userId || !eventId || !reservationType) {
        res.status(400).json({ error: constants_1.ERR.RESERVATION_PARAMS_REQUIRED });
        return;
    }
    const conn = await db_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        const [eventRows] = await conn.query(`SELECT e.id, e.capacity, e.status, e.starts_at, e.ends_at,
        COALESCE(SUM(CASE WHEN r.status IN ('booked','attended') THEN 1 ELSE 0 END), 0) AS reserved_count
       FROM events e
       LEFT JOIN reservations r ON r.event_id = e.id WHERE e.id = ? GROUP BY e.id FOR UPDATE`, [eventId]);
        const event = eventRows[0];
        if (!event) {
            await conn.rollback();
            res.status(404).json({ error: constants_1.ERR.EVENT_NOT_FOUND });
            return;
        }
        if (event.status !== "scheduled") {
            await conn.rollback();
            res.status(400).json({ error: constants_1.ERR.EVENT_NOT_BOOKABLE });
            return;
        }
        if (event.reserved_count >= event.capacity) {
            await conn.rollback();
            res.status(400).json({ error: constants_1.ERR.EVENT_CAPACITY_FULL });
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
            if (!makeupCreditId) {
                await conn.rollback();
                res.status(400).json({ error: constants_1.ERR.MAKEUP_CREDIT_ID_REQUIRED });
                return;
            }
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
        const reservationId = result.insertId;
        if (reservationType === "makeup" && makeupIdToUse) {
            await conn.query("UPDATE makeup_credits SET status = 'consumed', updated_at = NOW() WHERE id = ?", [makeupIdToUse]);
        }
        await conn.commit();
        res.status(201).json({
            id: reservationId,
            userId,
            eventId,
            reservationType,
            makeupCreditId: makeupIdToUse,
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
