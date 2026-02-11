"use client";

import { useEffect, useMemo, useState } from "react";
import s from "./calendar.module.scss";
import { getApiErrorMessage } from "@/app/lib/apiErrors";

type EventRow = {
  id: number;
  class_type_id: number;
  class_type_name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  event_status: "scheduled" | "canceled_by_admin" | "holiday";
  reserved_count: number;
  is_reserved_by_user: 0 | 1;
};

type MakeupCredit = {
  id: number;
  class_type_id: number | null;
  granted_at: string;
  expires_at: string | null;
  status: "granted" | "consumed" | "revoked";
  source: "absence" | "admin_holiday";
  source_event_id: number | null;
  note: string | null;
};

const API_BASE = (() => {
  const u = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (u && (u.startsWith("http://") || u.startsWith("https://"))) return u.replace(/\/$/, "");
  return "http://localhost:4000";
})();
const DEMO_USER_ID = 1;

export default function Home() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [credits, setCredits] = useState<MakeupCredit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => { setMounted(true); }, []);

  const toDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const { gridStart, gridEnd, dateList } = useMemo(() => {
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const gridStartTmp = new Date(startOfMonth);
    gridStartTmp.setDate(gridStartTmp.getDate() - gridStartTmp.getDay());
    const gridEndTmp = new Date(endOfMonth);
    gridEndTmp.setDate(gridEndTmp.getDate() + (6 - gridEndTmp.getDay()));
    const dates: string[] = [];
    const cursor = new Date(gridStartTmp);
    while (cursor <= gridEndTmp) {
      dates.push(toDateStr(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return { gridStart: gridStartTmp, gridEnd: gridEndTmp, dateList: dates };
  }, [currentMonth]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const fromStr = toDateStr(gridStart);
        const toStr = toDateStr(gridEnd);
        const [eventsRes, creditsRes] = await Promise.allSettled([
          fetch(`${API_BASE}/events?from=${fromStr}&to=${toStr}&userId=${DEMO_USER_ID}`),
          fetch(`${API_BASE}/makeup-credits?userId=${encodeURIComponent(DEMO_USER_ID)}`),
        ]);
        if (eventsRes.status === "fulfilled" && eventsRes.value.ok) {
          setEvents(await eventsRes.value.json());
        } else {
          setEvents([]);
        }
        if (creditsRes.status === "fulfilled" && creditsRes.value.ok) {
          setCredits(await creditsRes.value.json());
        } else {
          setCredits([]);
        }
      } catch (e: any) {
        setError(e.message ?? "データ取得中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [gridStart, gridEnd]);

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

  const handleCreateReservation = async (ev: EventRow, type: "normal" | "makeup", makeupCreditId?: number) => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: DEMO_USER_ID, eventId: ev.id, reservationType: type, makeupCreditId: makeupCreditId ?? null }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(getApiErrorMessage(data?.error));
      }
      const fromStr = toDateStr(gridStart);
      const toStr = toDateStr(gridEnd);
      const [eventsRes, creditsRes] = await Promise.all([
        fetch(`${API_BASE}/events?from=${fromStr}&to=${toStr}&userId=${DEMO_USER_ID}`),
        fetch(`${API_BASE}/makeup-credits?userId=${encodeURIComponent(DEMO_USER_ID)}`),
      ]);
      setEvents(await eventsRes.json());
      setCredits(await creditsRes.json());
    } catch (e: any) {
      setError(e.message ?? "予約処理中にエラーが発生しました");
    }
  };

  const handleRegisterAbsence = async (ev: EventRow) => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/absences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: DEMO_USER_ID, eventId: ev.id, reason: "Webからの欠席登録" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(getApiErrorMessage(data?.error));
      }
      const creditsRes = await fetch(`${API_BASE}/makeup-credits?userId=${encodeURIComponent(DEMO_USER_ID)}`);
      setCredits(await creditsRes.json());
    } catch (e: any) {
      setError(e.message ?? "欠席登録中にエラーが発生しました");
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toTimeString().slice(0, 5);
  };

  const weekdayClass = (i: number) =>
    i === 0 ? s.weekdaySun : i === 6 ? s.weekdaySat : s.weekdayDefault;

  if (!mounted) {
    return <div className={s.page}><p className={s.muted}>読み込み中...</p></div>;
  }

  return (
    <div className={s.page}>
      <h1 className={s.title}>振替管理カレンダー（デモユーザーID: {DEMO_USER_ID}）</h1>

      {error && <div className={s.errorBanner}>{error}</div>}

      <section className={s.creditsSection}>
        <h2 className={s.sectionTitle}>保有振替権利</h2>
        {credits.length === 0 ? (
          <p className={s.muted}>現在、振替権利はありません。</p>
        ) : (
          <ul className={s.creditsList}>
            {credits.map((c) => (
              <li key={c.id} className={s.creditItem}>
                ID {c.id} / クラス種別ID: {c.class_type_id ?? "制限なし"} / 付与日: {c.granted_at.slice(0, 10)} / 期限: {c.expires_at ? c.expires_at.slice(0, 10) : "なし"} / 由来: {c.source === "absence" ? "欠席" : "休講"}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className={s.sectionTitle}>
          カレンダー（月表示） {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
        </h2>
        <div className={s.monthNav}>
          <button type="button" className={s.monthBtn} onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>◀ 前月</button>
          <button type="button" className={s.monthBtn} onClick={() => { const now = new Date(); setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1)); }}>今月</button>
          <button type="button" className={s.monthBtn} onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>次月 ▶</button>
        </div>

        {loading && <p className={s.muted}>読み込み中...</p>}

        <div className={s.calendarGrid}>
          {["日", "月", "火", "水", "木", "金", "土"].map((w, i) => (
            <div key={w} className={`${s.weekdayHeader} ${weekdayClass(i)}`}>{w}</div>
          ))}

          {dateList.map((date) => {
            const list = eventsByDate.get(date) ?? [];
            const d = new Date(date);
            const dayOfWeek = d.getDay();
            const weekday = "日月火水木金土"[dayOfWeek];
            const isCurrentMonth = d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isToday = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
            const isPast = d < today;

            const cellClass = [
              s.dayCell,
              isToday ? s.dayCellToday : "",
              isPast ? s.dayCellPast : "",
              !isCurrentMonth ? s.dayCellOtherMonth : "",
            ].filter(Boolean).join(" ");

            const numClass = [
              s.dayNumber,
              dayOfWeek === 0 ? s.dayNumberSun : "",
              dayOfWeek === 6 ? s.dayNumberSat : "",
            ].filter(Boolean).join(" ");

            return (
              <div key={date} className={cellClass}>
                <div>
                  <div className={numClass}>{d.getDate()}（{weekday}）</div>
                  <div className={s.daySlotCount}>
                    {list.length > 0 ? `${list.length}件の枠` : "枠なし / 休み"}
                  </div>
                </div>
                {list.length === 0 ? (
                  <p className={s.emptyDay}>この日はイベントが登録されていません。</p>
                ) : (
                  <ul className={s.eventList}>
                    {list.map((ev) => {
                      const isFull = ev.reserved_count >= ev.capacity;
                      const isReservedByUser = ev.is_reserved_by_user === 1;
                      const isHoliday = ev.event_status === "holiday";
                      const isCanceled = ev.event_status === "canceled_by_admin";

                      const itemClass = [
                        s.eventItem,
                        isReservedByUser ? s.eventItemReserved : "",
                        isHoliday || isCanceled ? s.eventItemInactive : "",
                      ].filter(Boolean).join(" ");

                      return (
                        <li key={ev.id} className={itemClass}>
                          <div className={s.eventRow}>
                            <span className={s.eventTime}>
                              {formatTime(ev.starts_at)}〜 {ev.class_type_name ?? `クラスID:${ev.class_type_id}`}
                            </span>
                            <span className={`${s.eventCapacity} ${isFull ? s.eventCapacityFull : s.eventCapacityAvailable}`}>
                              {ev.reserved_count}/{ev.capacity}
                            </span>
                          </div>

                          <div className={s.badgeRow}>
                            {isHoliday && <span className={`${s.badge} ${s.badgeHoliday}`}>休講 / 通常休み</span>}
                            {isCanceled && <span className={`${s.badge} ${s.badgeCanceled}`}>中止（admin）</span>}
                            {isReservedByUser && <span className={`${s.badge} ${s.badgeReserved}`}>あなたの予約</span>}
                          </div>

                          {!isPast && (
                            <div className={s.actionRow}>
                              {!isHoliday && !isCanceled && !isReservedByUser && (
                                <>
                                  <button type="button" className={s.btnNormal} onClick={() => handleCreateReservation(ev, "normal")} disabled={isFull}>通常予約</button>
                                  {credits.length > 0 && !isFull && (
                                    <button type="button" className={s.btnMakeup} onClick={() => handleCreateReservation(ev, "makeup", credits[0]?.id)}>振替予約（先頭の権利を使用）</button>
                                  )}
                                </>
                              )}
                              {isReservedByUser && !isHoliday && !isCanceled && (
                                <button type="button" className={s.btnAbsence} onClick={() => handleRegisterAbsence(ev)}>欠席登録 → 振替権利付与</button>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
