import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIds } from "../../../lib/corporationStores";
import { forbidden, badRequest, notFound, created } from "../../../lib/respond";
import { ph } from "../../../lib/validate";

export default async function createReservation(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIds(req);
  if (storeIds.length === 0) {
    forbidden(res);
    return;
  }
  const body = req.body as {
    userId?: number;
    eventId?: number;
    reservationType?: "normal" | "makeup";
    makeupCreditId?: number | null;
    overrideCapacity?: boolean;
  };
  const { userId, eventId, reservationType, makeupCreditId, overrideCapacity } = body;

  if (!userId || !eventId || !reservationType) {
    badRequest(res, ERR.RESERVATION_PARAMS_REQUIRED);
    return;
  }
  if (reservationType === "makeup" && !makeupCreditId) {
    badRequest(res, ERR.MAKEUP_CREDIT_ID_REQUIRED);
    return;
  }

  const storePh = ph(storeIds);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [eventRows] = await conn.query(
      `SELECT e.id, e.capacity, e.status, COALESCE(SUM(CASE WHEN r.status IN ('booked','attended') THEN 1 ELSE 0 END), 0) AS reserved_count FROM events e LEFT JOIN reservations r ON r.event_id = e.id JOIN class_types ct ON ct.id = e.class_type_id WHERE e.id = ? AND ct.store_id IN (${storePh}) GROUP BY e.id FOR UPDATE`,
      [eventId, ...storeIds]
    );
    const event = (eventRows as { id: number; capacity: number; reserved_count: number }[])[0];
    if (!event) {
      await conn.rollback();
      notFound(res, ERR.EVENT_NOT_FOUND);
      return;
    }

    const [userRows] = await conn.query(
      `SELECT id FROM users WHERE id = ? AND store_id IN (${storePh})`,
      [userId, ...storeIds]
    );
    if ((userRows as unknown[]).length === 0) {
      await conn.rollback();
      notFound(res, ERR.EVENT_NOT_FOUND);
      return;
    }

    if (!overrideCapacity && event.reserved_count >= event.capacity) {
      await conn.rollback();
      badRequest(res, ERR.EVENT_CAPACITY_FULL_OVERRIDE);
      return;
    }

    const [existing] = await conn.query(
      "SELECT id FROM reservations WHERE user_id = ? AND event_id = ? AND status IN ('booked','attended') FOR UPDATE",
      [userId, eventId]
    );
    if ((existing as unknown[]).length > 0) {
      await conn.rollback();
      badRequest(res, ERR.RESERVATION_ALREADY_EXISTS);
      return;
    }

    let makeupIdToUse: number | null = null;
    if (reservationType === "makeup") {
      const [credits] = await conn.query(
        "SELECT id, status FROM makeup_credits WHERE id = ? AND user_id = ? FOR UPDATE",
        [makeupCreditId, userId]
      );
      const credit = (credits as { id: number; status: string }[])[0];
      if (!credit || credit.status !== "granted") {
        await conn.rollback();
        badRequest(res, ERR.MAKEUP_CREDIT_NOT_AVAILABLE);
        return;
      }
      makeupIdToUse = credit.id;
    }

    const [result] = await conn.query(
      "INSERT INTO reservations (user_id, event_id, reservation_type, makeup_credit_id, status, created_at) VALUES (?, ?, ?, ?, 'booked', NOW())",
      [userId, eventId, reservationType, makeupIdToUse]
    );

    if (reservationType === "makeup" && makeupIdToUse) {
      await conn.query(
        "UPDATE makeup_credits SET status = 'consumed', updated_at = NOW() WHERE id = ?",
        [makeupIdToUse]
      );
    }

    await conn.commit();
    created(res, {
      id: (result as { insertId: number }).insertId,
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
}
