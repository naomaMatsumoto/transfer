"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/app/routes";
import s from "@/app/calendar.module.scss";
import {
  useMemberSession,
  useCalendarGrid,
  useStoreCalendar,
} from "../hooks";
import {
  StoreCalendarHeader,
  CreditsSection,
  CalendarMonthNav,
  CalendarGrid,
} from "../components";

export default function StoreCalendarPage() {
  const params = useParams();
  const storeId = params?.storeId as string | undefined;
  const storeIdNum = storeId ? parseInt(storeId, 10) : NaN;
  const [mounted, setMounted] = useState(false);

  const { memberId, checked: memberChecked, isLoggedIn, effectiveUserId } = useMemberSession();
  const {
    currentMonth,
    dateList,
    gridStart,
    gridEnd,
    setPrevMonth,
    setNextMonth,
    setThisMonth,
  } = useCalendarGrid();

  const {
    storeName,
    eventsByDate,
    credits,
    loading,
    error,
    setError,
    updateEventsAfterReserve,
    updateCreditConsumed,
    refreshCredits,
  } = useStoreCalendar({
    storeIdNum: Number.isInteger(storeIdNum) && storeIdNum > 0 ? storeIdNum : 0,
    gridStart,
    gridEnd,
    effectiveUserId,
    isLoggedIn,
    memberId,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleReserveSuccess = (
    eventId: number,
    type: "normal" | "makeup",
    creditId?: number,
  ) => {
    updateEventsAfterReserve(eventId);
    if (type === "makeup" && creditId != null) {
      updateCreditConsumed(creditId);
    }
  };

  const handleAbsenceSuccess = () => {
    void refreshCredits();
  };

  if (!mounted || !storeId) {
    return (
      <div className={s.page}>
        <p className={s.muted}>読み込み中...</p>
      </div>
    );
  }

  if (!Number.isInteger(storeIdNum) || storeIdNum <= 0) {
    return (
      <div className={s.page}>
        <p className={s.muted}>店舗が指定されていません。</p>
        <Link href={ROUTES.HOME}>店舗を選ぶ</Link>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <StoreCalendarHeader
        storeId={storeId}
        storeIdNum={storeIdNum}
        storeName={storeName}
        memberChecked={memberChecked}
        isLoggedIn={isLoggedIn}
      />

      {error && <div className={s.errorBanner}>{error}</div>}

      <CreditsSection isLoggedIn={isLoggedIn} credits={credits} />

      <section>
        <h2 className={s.sectionTitle}>
          カレンダー（月表示） {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
        </h2>
        <CalendarMonthNav
          year={currentMonth.getFullYear()}
          month={currentMonth.getMonth() + 1}
          onPrev={setPrevMonth}
          onThis={setThisMonth}
          onNext={setNextMonth}
        />

        {loading && <p className={s.muted}>読み込み中...</p>}

        <CalendarGrid
          dateList={dateList}
          eventsByDate={eventsByDate}
          currentMonth={currentMonth}
          isLoggedIn={isLoggedIn}
          credits={credits}
          effectiveUserId={effectiveUserId}
          onReserveSuccess={handleReserveSuccess}
          onAbsenceSuccess={handleAbsenceSuccess}
          onError={setError}
        />
      </section>
    </div>
  );
}
