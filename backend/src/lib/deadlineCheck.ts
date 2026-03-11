import { pool } from "../db";

type StoreDeadline = {
  booking_deadline_days: number | null;
  cancel_deadline_hours: number | null;
};

async function getStoreDeadlineByEventId(eventId: number): Promise<StoreDeadline | null> {
  const [rows] = await pool.query(
    `SELECT s.booking_deadline_days, s.cancel_deadline_hours
     FROM events e
     JOIN class_types ct ON ct.id = e.class_type_id
     JOIN stores s ON s.id = ct.store_id
     WHERE e.id = ? LIMIT 1`,
    [eventId]
  );
  return (rows as StoreDeadline[])[0] ?? null;
}

export async function checkBookingDeadline(eventId: number, eventStartsAt: Date): Promise<string | null> {
  const deadline = await getStoreDeadlineByEventId(eventId);
  if (!deadline || deadline.booking_deadline_days == null) return null;
  const cutoff = new Date(eventStartsAt);
  cutoff.setDate(cutoff.getDate() - deadline.booking_deadline_days);
  if (new Date() > cutoff) {
    return `予約受付期限（開始${deadline.booking_deadline_days}日前）を過ぎています`;
  }
  return null;
}

export async function checkCancelDeadline(eventId: number, eventStartsAt: Date): Promise<string | null> {
  const deadline = await getStoreDeadlineByEventId(eventId);
  if (!deadline || deadline.cancel_deadline_hours == null) return null;
  const cutoff = new Date(eventStartsAt);
  cutoff.setTime(cutoff.getTime() - deadline.cancel_deadline_hours * 60 * 60 * 1000);
  if (new Date() > cutoff) {
    return `キャンセル期限（開始${deadline.cancel_deadline_hours}時間前）を過ぎています`;
  }
  return null;
}
