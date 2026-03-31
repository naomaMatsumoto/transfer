import { useMemo, useState, useCallback } from "react";

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useCalendarGrid(initialMonth?: Date) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (initialMonth) return new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const { gridStart, gridEnd, dateList } = useMemo(() => {
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const gStart = new Date(startOfMonth);
    gStart.setDate(gStart.getDate() - gStart.getDay());
    const gEnd = new Date(endOfMonth);
    gEnd.setDate(gEnd.getDate() + (6 - gEnd.getDay()));
    const dates: string[] = [];
    const cursor = new Date(gStart);
    while (cursor <= gEnd) {
      dates.push(toDateStr(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return { gridStart: gStart, gridEnd: gEnd, dateList: dates };
  }, [currentMonth]);

  const setPrevMonth = useCallback(
    () => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)),
    [],
  );
  const setNextMonth = useCallback(
    () => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)),
    [],
  );
  const setThisMonth = useCallback(() => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }, []);

  return {
    currentMonth,
    gridStart,
    gridEnd,
    dateList,
    toDateStr,
    setPrevMonth,
    setNextMonth,
    setThisMonth,
  };
}
