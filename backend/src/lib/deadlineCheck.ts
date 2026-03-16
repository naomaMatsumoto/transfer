export type StoreDeadline = {
  booking_deadline_days: number | null;
  cancel_deadline_hours: number | null;
};

export function checkBookingDeadlineWithData(deadline: StoreDeadline | null, eventStartsAt: Date): string | null {
  if (!deadline || deadline.booking_deadline_days == null) return null;
  const cutoff = new Date(eventStartsAt);
  cutoff.setDate(cutoff.getDate() - deadline.booking_deadline_days);
  if (new Date() > cutoff) {
    return `予約受付期限（開始${deadline.booking_deadline_days}日前）を過ぎています`;
  }
  return null;
}

export function checkCancelDeadlineWithData(deadline: StoreDeadline | null, eventStartsAt: Date): string | null {
  if (!deadline || deadline.cancel_deadline_hours == null) return null;
  const cutoff = new Date(eventStartsAt);
  cutoff.setTime(cutoff.getTime() - deadline.cancel_deadline_hours * 60 * 60 * 1000);
  if (new Date() > cutoff) {
    return `キャンセル期限（開始${deadline.cancel_deadline_hours}時間前）を過ぎています`;
  }
  return null;
}
