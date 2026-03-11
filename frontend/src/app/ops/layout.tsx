"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/app/routes";
import { opsFetch, postJson } from "./api";
import s from "./ops.module.scss";

function IconBuilding() {
  return (
    <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22V12h6v10" /><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconLog() {
  return (
    <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg className={s.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [authOk, setAuthOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (pathname === ROUTES.OPS_LOGIN) {
      setAuthOk(true);
      return;
    }
    opsFetch("/auth/me").then((r) => {
      if (!r.ok || r.status === 401) {
        setAuthOk(false);
        router.replace(ROUTES.OPS_LOGIN);
      } else {
        setAuthOk(true);
      }
    });
  }, [pathname, router]);

  const handleLogout = async () => {
    await postJson("/auth/logout", {});
    router.replace(ROUTES.OPS_LOGIN);
    router.refresh();
  };

  if (pathname === ROUTES.OPS_LOGIN) {
    return <>{children}</>;
  }

  if (authOk === null || !authOk) {
    return (
      <div className={s.centered}>
        <div>認証確認中…</div>
      </div>
    );
  }

  const navItems: { href: string; icon: React.ReactNode; label: string; exact?: boolean }[] = [
    { href: ROUTES.OPS_DASHBOARD, icon: <IconBuilding />, label: "事業者管理" },
    { href: ROUTES.OPS_STATS, icon: <IconChart />, label: "統計ダッシュボード" },
    { href: ROUTES.OPS_AUDIT_LOGS, icon: <IconLog />, label: "監査ログ" },
  ];

  const isActive = (href: string) => {
    if (href === ROUTES.OPS_DASHBOARD) {
      return pathname === href || pathname.startsWith("/ops/corporations");
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className={s.shell}>
      <aside className={s.sidebar}>
        <div className={s.sidebarHeader}>
          <span className={s.logoMark}>O</span>
          <div>
            <div className={s.logoText}>Ops Console</div>
            <div className={s.logoSub}>Platform Admin</div>
          </div>
        </div>

        <nav className={s.sidebarNav}>
          <span className={s.sidebarLabel}>メニュー</span>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? s.navLinkActive : s.navLink}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={s.sidebarFooter}>
          <button type="button" className={s.logoutBtn} onClick={handleLogout}>
            <IconLogout />
            ログアウト
          </button>
        </div>
      </aside>

      <main className={s.main}>{children}</main>
    </div>
  );
}
