"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = cancelReservation;
const db_1 = require("../../../db");
const constants_1 = require("../../../constants");
const corporationStores_1 = require("../../../lib/corporationStores");
async function cancelReservation(req, res, _next) {
    const storeIds = await (0, corporationStores_1.getStoreIdsForRequest)(req);
    if (storeIds.length === 0) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
    }
    const reservationId = Number(req.params.id);
    const storePh = storeIds.map(() => "?").join(",");
    const conn = await db_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.query(`SELECT r.id, r.reservation_type, r.makeup_credit_id, r.status FROM reservations r JOIN events e ON e.id = r.event_id JOIN class_types ct ON ct.id = e.class_type_id JOIN users u ON u.id = r.user_id WHERE r.id = ? AND ct.store_id IN (${storePh}) AND u.store_id IN (${storePh}) FOR UPDATE`, [reservationId, ...storeIds, ...storeIds]);
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
