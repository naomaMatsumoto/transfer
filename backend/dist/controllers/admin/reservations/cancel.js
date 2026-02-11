"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = cancelReservation;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
async function cancelReservation(req, res, _next) {
    const reservationId = Number(req.params.id);
    const conn = await db_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.query("SELECT id, reservation_type, makeup_credit_id, status FROM reservations WHERE id = ? FOR UPDATE", [reservationId]);
        const reservation = rows[0];
        if (!reservation) {
            await conn.rollback();
            res.status(404).json({ error: constants_1.ERR.RESERVATION_NOT_FOUND });
            return;
        }
        if (reservation.status !== "booked") {
            await conn.rollback();
            res.status(400).json({ error: constants_1.ERR.RESERVATION_CANCEL_NOT_BOOKED });
            return;
        }
        await conn.query("UPDATE reservations SET status = 'canceled_by_admin', canceled_at = NOW() WHERE id = ?", [reservationId]);
        if (reservation.reservation_type === "makeup" && reservation.makeup_credit_id) {
            await conn.query("UPDATE makeup_credits SET status = 'granted', updated_at = NOW() WHERE id = ?", [reservation.makeup_credit_id]);
        }
        await conn.commit();
        res.json({ id: reservationId, status: "canceled_by_admin" });
    }
    catch (err) {
        await conn.rollback();
        throw err;
    }
    finally {
        conn.release();
    }
}
