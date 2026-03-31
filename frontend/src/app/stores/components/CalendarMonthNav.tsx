import s from "@/app/calendar.module.scss";

type Props = {
  year: number;
  month: number;
  onPrev: () => void;
  onThis: () => void;
  onNext: () => void;
};

export function CalendarMonthNav({ year, month, onPrev, onThis, onNext }: Props) {
  return (
    <div className={s.monthNav}>
      <button type="button" className={s.monthBtn} onClick={onPrev}>
        ◀ 前月
      </button>
      <button type="button" className={s.monthBtn} onClick={onThis}>
        今月
      </button>
      <button type="button" className={s.monthBtn} onClick={onNext}>
        次月 ▶
      </button>
    </div>
  );
}
