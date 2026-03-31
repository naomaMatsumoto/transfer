import type { EventRow } from "../types";
import { WEEKDAY_JA } from "../constants";
import { EventItem } from "./EventItem";
import type { MakeupCredit } from "../types";
import s from "@/app/calendar.module.scss";

type Props = {
  date: string;
  events: EventRow[];
  currentMonth: Date;
  isPast: boolean;
  isLoggedIn: boolean;
  credits: MakeupCredit[];
  effectiveUserId: number;
  onReserveSuccess: (eventId: number, type: "normal" | "makeup", creditId?: number) => void;
  onAbsenceSuccess: () => void;
  onError: (msg: string | null) => void;
};

export function DayCell({
  date,
  events,
  currentMonth,
  isPast,
  isLoggedIn,
  credits,
  effectiveUserId,
  onReserveSuccess,
  onAbsenceSuccess,
  onError,
}: Props) {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const weekday = WEEKDAY_JA[dayOfWeek];
  const isCurrentMonth =
    d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const cellClass = [
    s.dayCell,
    isToday ? s.dayCellToday : "",
    isPast ? s.dayCellPast : "",
    !isCurrentMonth ? s.dayCellOtherMonth : "",
  ]
    .filter(Boolean)
    .join(" ");

  const numClass = [
    s.dayNumber,
    dayOfWeek === 0 ? s.dayNumberSun : "",
    dayOfWeek === 6 ? s.dayNumberSat : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cellClass}>
      <div>
        <div className={numClass}>
          {d.getDate()}（{weekday}）
        </div>
        <div className={s.daySlotCount}>
          {events.length > 0 ? `${events.length}件の枠` : "枠なし / 休み"}
        </div>
      </div>
      {events.length === 0 ? (
        <p className={s.emptyDay}>この日はイベントが登録されていません。</p>
      ) : (
        <ul className={s.eventList}>
          {events.map((ev) => (
            <EventItem
              key={ev.id}
              ev={ev}
              isPast={isPast}
              isLoggedIn={isLoggedIn}
              credits={credits}
              effectiveUserId={effectiveUserId}
              onReserveSuccess={onReserveSuccess}
              onAbsenceSuccess={onAbsenceSuccess}
              onError={onError}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
