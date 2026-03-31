import type { EventRow, MakeupCredit } from "../types";
import { formatTime } from "../utils";
import { getApiErrorMessage } from "@/app/lib/apiErrors";
import { postReservation, postAbsence } from "../api";
import s from "@/app/calendar.module.scss";

type Props = {
  ev: EventRow;
  isPast: boolean;
  isLoggedIn: boolean;
  credits: MakeupCredit[];
  effectiveUserId: number;
  onReserveSuccess: (eventId: number, type: "normal" | "makeup", creditId?: number) => void;
  onAbsenceSuccess: () => void;
  onError: (msg: string | null) => void;
};

export function EventItem({
  ev,
  isPast,
  isLoggedIn,
  credits,
  effectiveUserId,
  onReserveSuccess,
  onAbsenceSuccess,
  onError,
}: Props) {
  const isFull = ev.reserved_count >= ev.capacity;
  const isReservedByUser = ev.is_reserved_by_user === 1;
  const isHoliday = ev.event_status === "holiday";
  const isCanceled = ev.event_status === "canceled_by_admin";

  const itemClass = [
    s.eventItem,
    isReservedByUser ? s.eventItemReserved : "",
    isHoliday || isCanceled ? s.eventItemInactive : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleCreateReservation = async (type: "normal" | "makeup", makeupCreditId?: number) => {
    try {
      onError(null);
      const res = await postReservation({
        userId: effectiveUserId,
        eventId: ev.id,
        reservationType: type,
        makeupCreditId: makeupCreditId ?? null,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(getApiErrorMessage(data?.error));
      }
      onReserveSuccess(ev.id, type, makeupCreditId);
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "予約処理中にエラーが発生しました");
    }
  };

  const handleRegisterAbsence = async () => {
    try {
      onError(null);
      const res = await postAbsence({
        userId: effectiveUserId,
        eventId: ev.id,
        reason: "Webからの欠席登録",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(getApiErrorMessage(data?.error));
      }
      await onAbsenceSuccess();
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "欠席登録中にエラーが発生しました");
    }
  };

  return (
    <li className={itemClass}>
      <div className={s.eventRow}>
        <span className={s.eventTime}>
          {formatTime(ev.starts_at)}〜 {ev.class_type_name ?? `クラスID:${ev.class_type_id}`}
        </span>
        <span
          className={`${s.eventCapacity} ${isFull ? s.eventCapacityFull : s.eventCapacityAvailable}`}
        >
          {ev.reserved_count}/{ev.capacity}
        </span>
      </div>

      <div className={s.badgeRow}>
        {isHoliday && <span className={`${s.badge} ${s.badgeHoliday}`}>休講 / 通常休み</span>}
        {isCanceled && <span className={`${s.badge} ${s.badgeCanceled}`}>中止（admin）</span>}
        {isReservedByUser && (
          <span className={`${s.badge} ${s.badgeReserved}`}>あなたの予約</span>
        )}
      </div>

      {!isPast && (
        <div className={s.actionRow}>
          {!isHoliday && !isCanceled && !isReservedByUser && (
            <>
              <button
                type="button"
                className={s.btnNormal}
                onClick={() => handleCreateReservation("normal")}
                disabled={isFull}
              >
                通常予約
              </button>
              {isLoggedIn && credits.length > 0 && !isFull && (
                <button
                  type="button"
                  className={s.btnMakeup}
                  onClick={() => handleCreateReservation("makeup", credits[0]?.id)}
                >
                  振替予約（先頭の権利を使用）
                </button>
              )}
            </>
          )}
          {isLoggedIn && isReservedByUser && !isHoliday && !isCanceled && (
            <button type="button" className={s.btnAbsence} onClick={handleRegisterAbsence}>
              欠席登録 → 振替権利付与
            </button>
          )}
        </div>
      )}
    </li>
  );
}
