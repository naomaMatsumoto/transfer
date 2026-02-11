import { Request, Response, NextFunction } from "express";
import { pool } from "../db";
import { ERR } from "../constants";

export async function create(req: Request, res: Response, _next: NextFunction) {
  const { userId, eventId, reservationType, makeupCreditId } = req.body as {
    userId?: number;
    eventId?: number;
    reservationType?: "normal" | "makeup";
    makeupCreditId?: number | null;
  };
  if (!userId || !eventId || !reservationType) {
    return res.status(400).json({ error: ERR.RESERVATION_PARAMS_REQUIRED });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [eventRows] = await conn.query(
      `SELECT e.id, e.capacity, e.status, e.starts_at, e.ends_at,
        COALESCE(SUM(CASE WHEN r.status IN ('booked','attended') THEN 1 ELSE 0 END), 0) AS reserved_count
       FROM events e
       LEFT JOIN reservations r ON r.event_id = e.id WHERE e.id = ? GROUP BY e.id FOR UPDATE`,
      [eventId],
    );
    const event = (eventRows as any[])[0];
    if (!event) {
      await conn.rollback();
      return res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
    }
    if (event.status !== "scheduled") {
      await conn.rollback();
      return res.status(400).json({ error: ERR.EVENT_NOT_BOOKABLE });
    }
    if (event.reserved_count >= event.capacity) {
      await conn.rollback();
      return res.status(400).json({ error: ERR.EVENT_CAPACITY_FULL });
    }
    const [existing] = await conn.query(
      "SELECT id FROM reservations WHERE user_id = ? AND event_id = ? AND status IN ('booked','attended') FOR UPDATE",
      [userId, eventId],
    );
    if ((existing as any[]).length > 0) {
      await conn.rollback();
      return res.status(400).json({ error: ERR.RESERVATION_ALREADY_EXISTS });
    }
    let makeupIdToUse: number | null = null;
    if (reservationType === "makeup") {
      if (!makeupCreditId) {
        await conn.rollback();
        return res.status(400).json({ error: ERR.MAKEUP_CREDIT_ID_REQUIRED });
      }
      const [credits] = await conn.query(
        "SELECT id, status FROM makeup_credits WHERE id = ? AND user_id = ? FOR UPDATE",
        [makeupCreditId, userId],
      );
      const credit = (credits as any[])[0];
      if (!credit || credit.status !== "granted") {
        await conn.rollback();
        return res.status(400).json({ error: ERR.MAKEUP_CREDIT_NOT_AVAILABLE });
      }
      makeupIdToUse = credit.id;
    }
    const [result] = await conn.query(
      "INSERT INTO reservations (user_id, event_id, reservation_type, makeup_credit_id, status, created_at) VALUES (?, ?, ?, ?, 'booked', NOW())",
      [userId, eventId, reservationType, makeupIdToUse],
    );
    const reservationId = (result as any).insertId;
    if (reservationType === "makeup" && makeupIdToUse) {
      await conn.query(
        "UPDATE makeup_credits SET status = 'consumed', updated_at = NOW() WHERE id = ?",
        [makeupIdToUse],
      );
    }
    await conn.commit();
    res.status(201).json({
      id: reservationId,
      userId,
      eventId,
      reservationType,
      makeupCreditId: makeupIdToUse,
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
