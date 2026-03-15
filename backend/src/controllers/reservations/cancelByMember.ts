import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../db";
import { checkCancelDeadline } from "../../lib/deadlineCheck";
import { writeAuditLog } from "../../lib/auditLog";
import { unauthorized, badRequest, notFound, ok } from "../../lib/respond";

export default async function cancelReservationByMember(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const memberId = req.session?.memberId;
  if (memberId == null || typeof memberId !== "number") {
    unauthorized(res);
    return;
  }

  const reservationId = Number(req.params.id);
  if (!Number.isInteger(reservationId) || reservationId <= 0) {
    badRequest(res, "INVALID_ID");
    return;
  }

  const [rows] = await pool.query(
    `SELECT r.id, r.user_id, r.status, r.reservation_type, r.makeup_credit_id,
            r.event_id, e.starts_at
     FROM reservations r JOIN events e ON e.id = r.event_id
     WHERE r.id = ? AND r.user_id = ?`,
    [reservationId, memberId]
  );
  const reservation = (rows as { id: number; user_id: number; status: string; reservation_type: string; makeup_credit_id: number | null; event_id: number; starts_at: Date }[])[0];
  if (!reservation) {
    notFound(res, "RESERVATION_NOT_FOUND");
    return;
  }
  if (reservation.status !== "booked") {
    badRequest(res, "RESERVATION_NOT_BOOKED");
    return;
  }

  const cancelMsg = await checkCancelDeadline(reservation.event_id, new Date(reservation.starts_at));
  if (cancelMsg) {
    badRequest(res, "CANCEL_DEADLINE_PASSED", { message: cancelMsg });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "UPDATE reservations SET status = 'canceled_by_user', canceled_at = NOW() WHERE id = ?",
      [reservationId]
    );
    if (reservation.reservation_type === "makeup" && reservation.makeup_credit_id) {
      await conn.query(
        "UPDATE makeup_credits SET status = 'granted', updated_at = NOW() WHERE id = ?",
        [reservation.makeup_credit_id]
      );
    }
    await conn.commit();
    void writeAuditLog({ actorType: "member", actorId: memberId, action: "reservation.cancel", targetType: "reservation", targetId: reservationId, detail: { eventId: reservation.event_id } });
    ok(res, { id: reservationId, status: "canceled_by_user" });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
