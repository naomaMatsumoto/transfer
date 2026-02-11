import { Router, Request, Response } from "express";
import { pool } from "../../db";
import { ERR } from "../../constants";
import { asyncHandler } from "../../middleware/asyncHandler";

const router = Router();

router.get("/reservations", asyncHandler(async (req: Request, res: Response) => {
  const { eventId, userId } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    if (eventId) {
      conditions.push("r.event_id = ?");
      params.push(Number(eventId));
    }
    if (userId) {
      conditions.push("r.user_id = ?");
      params.push(Number(userId));
    }
    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    const [rows] = await pool.query(
      `
      SELECT
        r.id,
        r.user_id,
        u.name AS user_name,
        r.event_id,
        e.starts_at,
        ct.name AS class_type_name,
        r.reservation_type,
        r.makeup_credit_id,
        r.status,
        r.created_at,
        r.canceled_at
      FROM reservations r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN events e ON e.id = r.event_id
      LEFT JOIN class_types ct ON ct.id = e.class_type_id
      ${where}
      ORDER BY r.created_at DESC
    `,
      params,
    );
    res.json(rows);
}));

router.post("/reservations", asyncHandler(async (req: Request, res: Response) => {
  const { userId, eventId, reservationType, makeupCreditId, overrideCapacity } =
    req.body as {
      userId?: number;
      eventId?: number;
      reservationType?: "normal" | "makeup";
      makeupCreditId?: number | null;
      overrideCapacity?: boolean;
    };

  if (!userId || !eventId || !reservationType) {
    return res.status(400).json({ error: ERR.RESERVATION_PARAMS_REQUIRED });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [eventRows] = await conn.query(
      `
      SELECT
        e.id, e.capacity, e.status,
        COALESCE(SUM(CASE WHEN r.status IN ('booked','attended') THEN 1 ELSE 0 END), 0) AS reserved_count
      FROM events e
      LEFT JOIN reservations r ON r.event_id = e.id
      WHERE e.id = ?
      GROUP BY e.id
      FOR UPDATE
    `,
      [eventId],
    );
    const event = (eventRows as any[])[0];
    if (!event) {
      await conn.rollback();
      return res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
    }

    if (!overrideCapacity && event.reserved_count >= event.capacity) {
      await conn.rollback();
      return res.status(400).json({ error: ERR.EVENT_CAPACITY_FULL_OVERRIDE });
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
    if (reservationType === "makeup" && makeupCreditId) {
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
      `INSERT INTO reservations
        (user_id, event_id, reservation_type, makeup_credit_id, status, created_at)
       VALUES (?, ?, ?, ?, 'booked', NOW())`,
      [userId, eventId, reservationType, makeupIdToUse],
    );

    if (reservationType === "makeup" && makeupIdToUse) {
      await conn.query(
        "UPDATE makeup_credits SET status = 'consumed', updated_at = NOW() WHERE id = ?",
        [makeupIdToUse],
      );
    }

    await conn.commit();
    res.status(201).json({
      id: (result as any).insertId,
      userId,
      eventId,
      reservationType,
      makeupCreditId: makeupIdToUse,
      overrideCapacity: !!overrideCapacity,
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}));

router.patch("/reservations/:id/cancel", asyncHandler(async (req: Request, res: Response) => {
  const reservationId = Number(req.params.id);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT id, reservation_type, makeup_credit_id, status FROM reservations WHERE id = ? FOR UPDATE",
      [reservationId],
    );
    const reservation = (rows as any[])[0];
    if (!reservation) {
      await conn.rollback();
      return res.status(404).json({ error: ERR.RESERVATION_NOT_FOUND });
    }
    if (reservation.status !== "booked") {
      await conn.rollback();
      return res.status(400).json({ error: ERR.RESERVATION_CANCEL_NOT_BOOKED });
    }

    await conn.query(
      "UPDATE reservations SET status = 'canceled_by_admin', canceled_at = NOW() WHERE id = ?",
      [reservationId],
    );

    if (reservation.reservation_type === "makeup" && reservation.makeup_credit_id) {
      await conn.query(
        "UPDATE makeup_credits SET status = 'granted', updated_at = NOW() WHERE id = ?",
        [reservation.makeup_credit_id],
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
}));

export default router;
