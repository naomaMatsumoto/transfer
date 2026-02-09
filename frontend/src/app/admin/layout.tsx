"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "../routes";
import s from "./admin.module.scss";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMembers = pathname?.startsWith(ROUTES.ADMIN_MEMBERS);
  const isReservations = pathname?.startsWith(ROUTES.ADMIN_RESERVATIONS);

  return (
    <div className={s.page}>
      <h1 className={s.pageTitle}>Admin / スタッフ管理</h1>
      <nav className={s.adminNav}>
        <Link
          href={ROUTES.ADMIN_MEMBERS}
          className={isMembers ? s.adminNavLinkActive : s.adminNavLink}
        >
          会員管理
        </Link>
        <Link
          href={ROUTES.ADMIN_RESERVATIONS}
          className={isReservations ? s.adminNavLinkActive : s.adminNavLink}
        >
          予約システム
        </Link>
        <span className={s.adminNavSep}>|</span>
        <Link href={ROUTES.HOME} className={s.adminNavLink}>
          ← カレンダーに戻る
        </Link>
      </nav>
      {children}
    </div>
  );
}
