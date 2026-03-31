import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { writeAuditLog, adminActorId } from "../../../lib/auditLog";
import { badRequest, notFound, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";

export default async function cancelReservation(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const storeIds = req.storeIds!;
  const reservationId = Number(req.params.id);
  const storePh = ph(storeIds);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT r.id, r.reservation_type, r.makeup_credit_id, r.status FROM reservations r JOIN events e ON e.id = r.event_id JOIN class_types ct ON ct.id = e.class_type_id JOIN users u ON u.id = r.user_id WHERE r.id = ? AND ct.store_id IN (${storePh}) AND u.store_id IN (${storePh}) FOR UPDATE`,
      [reservationId, ...storeIds, ...storeIds],
    );
    const reservation = (rows as { reservation_type: string; makeup_credit_id: number | null; status: string }[])[0];
    if (!reservation) {
      await conn.rollback();
      notFound(res, ERR.RESERVATION_NOT_FOUND);
      return;
    }
    if (reservation.status !== "booked") {
      await conn.rollback();
      badRequest(res, ERR.RESERVATION_CANCEL_NOT_BOOKED);
      return;
    }

    await conn.query("UPDATE reservations SET status = 'canceled_by_admin', canceled_at = NOW() WHERE id = ?", [
      reservationId,
    ]);

    if (reservation.reservation_type === "makeup" && reservation.makeup_credit_id) {
      await conn.query("UPDATE makeup_credits SET status = 'granted', updated_at = NOW() WHERE id = ?", [
        reservation.makeup_credit_id,
      ]);
    }

    await conn.commit();
    await writeAuditLog({
      actorType: "admin",
      actorId: adminActorId(req),
      action: "reservation.cancel_by_admin",
      targetType: "reservation",
      targetId: reservationId,
    });
    ok(res, { id: reservationId, status: "canceled_by_admin" });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
