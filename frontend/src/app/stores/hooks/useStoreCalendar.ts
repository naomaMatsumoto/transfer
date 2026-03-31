import { useEffect, useState, useMemo } from "react";
import { fetchStore, fetchEvents, fetchMakeupCredits } from "../api";
import { toDateStr } from "./useCalendarGrid";
import type { EventRow, MakeupCredit } from "../types";

type StoreCalendarParams = {
  storeIdNum: number;
  gridStart: Date;
  gridEnd: Date;
  effectiveUserId: number;
  isLoggedIn: boolean;
  memberId: number | null;
};

export function useStoreCalendar({
  storeIdNum,
  gridStart,
  gridEnd,
  effectiveUserId,
  isLoggedIn,
  memberId,
}: StoreCalendarParams) {
  const [storeName, setStoreName] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [credits, setCredits] = useState<MakeupCredit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (storeIdNum <= 0) return;
    fetchStore(storeIdNum)
      .then((data) => setStoreName(data?.name ?? null))
      .catch(() => setStoreName(null));
  }, [storeIdNum]);

  useEffect(() => {
    if (storeIdNum <= 0) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const fromStr = toDateStr(gridStart);
        const toStr = toDateStr(gridEnd);
        const eventsPromise = fetchEvents({
          from: fromStr,
          to: toStr,
          userId: effectiveUserId,
          storeId: storeIdNum,
        });
        const creditsPromise = isLoggedIn && memberId != null
          ? fetchMakeupCredits(memberId)
          : Promise.resolve([]);
        const [eventsList, creditsList] = await Promise.all([eventsPromise, creditsPromise]);
        setEvents(eventsList);
        setCredits(creditsList);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "データ取得中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [storeIdNum, gridStart, gridEnd, effectiveUserId, isLoggedIn, memberId]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const ev of events) {
      const dateKey = ev.starts_at.slice(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(ev);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    }
    return map;
  }, [events]);

  const setErrorState = (msg: string | null) => setError(msg);
  const updateEventsAfterReserve = (eventId: number) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, reserved_count: e.reserved_count + 1, is_reserved_by_user: 1 as const }
          : e,
      ),
    );
  };
  const updateCreditConsumed = (creditId: number) => {
    setCredits((prev) =>
      prev.map((c) => (c.id === creditId ? { ...c, status: "consumed" as const } : c)),
    );
  };
  const refreshCredits = async () => {
    if (memberId == null) return;
    const list = await fetchMakeupCredits(memberId);
    setCredits(list);
  };

  return {
    storeName,
    events,
    credits,
    eventsByDate,
    loading,
    error,
    setError: setErrorState,
    updateEventsAfterReserve,
    updateCreditConsumed,
    refreshCredits,
  };
}
