import type { EventRow } from "../types";
import type { MakeupCredit } from "../types";
import { WEEKDAY_LABELS } from "../constants";
import { DayCell } from "./DayCell";
import s from "@/app/calendar.module.scss";

type Props = {
  dateList: string[];
  eventsByDate: Map<string, EventRow[]>;
  currentMonth: Date;
  isLoggedIn: boolean;
  credits: MakeupCredit[];
  effectiveUserId: number;
  onReserveSuccess: (eventId: number, type: "normal" | "makeup", creditId?: number) => void;
  onAbsenceSuccess: () => void;
  onError: (msg: string | null) => void;
};

function weekdayClass(i: number): string {
  return i === 0 ? s.weekdaySun : i === 6 ? s.weekdaySat : s.weekdayDefault;
}

export function CalendarGrid({
  dateList,
  eventsByDate,
  currentMonth,
  isLoggedIn,
  credits,
  effectiveUserId,
  onReserveSuccess,
  onAbsenceSuccess,
  onError,
}: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className={s.calendarGrid}>
      {WEEKDAY_LABELS.map((w, i) => (
        <div key={w} className={`${s.weekdayHeader} ${weekdayClass(i)}`}>
          {w}
        </div>
      ))}
      {dateList.map((date) => {
        const list = eventsByDate.get(date) ?? [];
        const d = new Date(date);
        const isPast = d < today;
        return (
          <DayCell
            key={date}
            date={date}
            events={list}
            currentMonth={currentMonth}
            isPast={isPast}
            isLoggedIn={isLoggedIn}
            credits={credits}
            effectiveUserId={effectiveUserId}
            onReserveSuccess={onReserveSuccess}
            onAbsenceSuccess={onAbsenceSuccess}
            onError={onError}
          />
        );
      })}
    </div>
  );
}
