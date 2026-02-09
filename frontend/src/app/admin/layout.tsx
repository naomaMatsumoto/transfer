"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ROUTES, RESERVATION_TABS } from "../routes";
import s from "./admin.module.scss";

const TAB_KEYS = ["classTypes", "events", "credits", "reservations"];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMembers = pathname?.startsWith(ROUTES.ADMIN_MEMBERS);
  const isReservations = pathname?.startsWith(ROUTES.ADMIN_RESERVATIONS);
  const currentTab = searchParams?.get("tab");
  const activeTab = currentTab && TAB_KEYS.includes(currentTab) ? currentTab : "classTypes";

  return (
    <div className={s.adminLayout}>
      <aside className={s.adminSidebar}>
        <div className={s.adminSidebarHeader}>
          <span className={s.adminSidebarTitle}>管理画面</span>
        </div>
        <nav className={s.adminSidebarNav}>
          <Link
            href={ROUTES.ADMIN_MEMBERS}
            className={isMembers ? s.adminSidebarLinkActive : s.adminSidebarLink}
          >
            会員管理
          </Link>
          {isReservations ? (
            <>
              <div className={s.adminSidebarParent}>予約システム</div>
              {RESERVATION_TABS.map(({ key, label }) => (
                <Link
                  key={key}
                  href={key === "classTypes" ? ROUTES.ADMIN_RESERVATIONS : `${ROUTES.ADMIN_RESERVATIONS}?tab=${key}`}
                  className={activeTab === key ? s.adminSidebarSubLinkActive : s.adminSidebarSubLink}
                >
                  {label}
                </Link>
              ))}
            </>
          ) : (
            <Link
              href={ROUTES.ADMIN_RESERVATIONS}
              className={s.adminSidebarLink}
            >
              予約システム
            </Link>
          )}
          <div className={s.adminSidebarDivider} />
          <Link href={ROUTES.HOME} className={s.adminSidebarLink}>
            カレンダーに戻る
          </Link>
        </nav>
      </aside>
      <main className={s.adminMain}>
        <div className={s.adminMainInner}>{children}</div>
      </main>
    </div>
  );
}
