import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";

export default async function cancelReservation(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const reservationId = Number(req.params.id);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT id, reservation_type, makeup_credit_id, status FROM reservations WHERE id = ? FOR UPDATE",
      [reservationId]
    );
    const reservation = (rows as { reservation_type: string; makeup_credit_id: number | null; status: string }[])[0];
    if (!reservation) {
      await conn.rollback();
      res.status(404).json({ error: ERR.RESERVATION_NOT_FOUND });
      return;
    }
    if (reservation.status !== "booked") {
      await conn.rollback();
      res.status(400).json({ error: ERR.RESERVATION_CANCEL_NOT_BOOKED });
      return;
    }

    await conn.query(
      "UPDATE reservations SET status = 'canceled_by_admin', canceled_at = NOW() WHERE id = ?",
      [reservationId]
    );

    if (reservation.reservation_type === "makeup" && reservation.makeup_credit_id) {
      await conn.query(
        "UPDATE makeup_credits SET status = 'granted', updated_at = NOW() WHERE id = ?",
        [reservation.makeup_credit_id]
      );
    }

    await conn.commit();
    res.json({ id: reservationId, status: "canceled_by_admin" });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
