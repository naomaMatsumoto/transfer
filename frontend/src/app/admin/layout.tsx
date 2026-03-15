"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { ROUTES, RESERVATION_TABS } from "../routes";
import { getApiBase, apiFetch } from "../lib/api";
import styles from "./admin.module.scss";

const TAB_KEYS = RESERVATION_TABS.map((t) => t.key);

function AdminLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [authOk, setAuthOk] = useState<boolean | null>(null);

  useEffect(() => {
    apiFetch(`${getApiBase()}/auth/me`)
      .then((res) => {
        if (res.status === 401) {
          setAuthOk(false);
          router.replace(ROUTES.LOGIN);
          return;
        }
        setAuthOk(true);
      })
      .catch(() => {
        setAuthOk(false);
        router.replace(ROUTES.LOGIN);
      });
  }, [router]);

  const handleLogout = async () => {
    await apiFetch(`${getApiBase()}/auth/logout`, { method: "POST" });
    router.replace(ROUTES.LOGIN);
    router.refresh();
  };

  const isMembers = pathname?.startsWith(ROUTES.ADMIN_MEMBERS);
  const isReservations = pathname?.startsWith(ROUTES.ADMIN_RESERVATIONS);
  const isSettings = pathname?.startsWith(ROUTES.ADMIN_SETTINGS);
  const isStoreSettings = pathname?.startsWith(ROUTES.ADMIN_STORE_SETTINGS);
  const isReports = pathname?.startsWith(ROUTES.ADMIN_REPORTS);
  const isAuditLogs = pathname?.startsWith(ROUTES.ADMIN_AUDIT_LOGS);
  const currentTab = searchParams?.get("tab");
  const activeTab = currentTab && (TAB_KEYS as readonly string[]).includes(currentTab) ? currentTab : "classTypes";

  if (authOk === null || !authOk) {
    return (
      <div className={styles.adminLayout}>
        <div className={styles.adminMainCentered}>
          <span className="text-secondary">認証確認中…</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.adminSidebar}>
        <div className={styles.adminSidebarHeader}>
          <span className={styles.adminSidebarTitle}>管理画面</span>
        </div>

        <nav className={styles.adminSidebarNav}>
          {/* 会員管理 */}
          <Link
            href={ROUTES.ADMIN_MEMBERS}
            className={isMembers ? styles.adminSidebarLinkActive : styles.adminSidebarLink}
          >
            会員管理
          </Link>

          {/* 予約システム（サブメニュー展開） */}
          {isReservations ? (
            <>
              <span className={styles.adminSidebarParent}>予約システム</span>
              {RESERVATION_TABS.map(({ key, label }) => (
                <Link
                  key={key}
                  href={key === "classTypes" ? ROUTES.ADMIN_RESERVATIONS : `${ROUTES.ADMIN_RESERVATIONS}?tab=${key}`}
                  className={activeTab === key ? styles.adminSidebarSubLinkActive : styles.adminSidebarSubLink}
                >
                  {label}
                </Link>
              ))}
            </>
          ) : (
            <Link href={ROUTES.ADMIN_RESERVATIONS} className={styles.adminSidebarLink}>
              予約システム
            </Link>
          )}

          <div className={styles.adminSidebarDivider} />

          {/* 設定（サブメニュー展開） */}
          {isSettings ? (
            <>
              <span className={styles.adminSidebarParent}>設定</span>
              <Link
                href={ROUTES.ADMIN_SETTINGS}
                className={pathname === ROUTES.ADMIN_SETTINGS ? styles.adminSidebarSubLinkActive : styles.adminSidebarSubLink}
              >
                設定メニュー
              </Link>
              <Link
                href={ROUTES.ADMIN_SETTINGS_PASSWORD}
                className={pathname === ROUTES.ADMIN_SETTINGS_PASSWORD ? styles.adminSidebarSubLinkActive : styles.adminSidebarSubLink}
              >
                パスワードの変更
              </Link>
              <Link
                href={ROUTES.ADMIN_SETTINGS_CORPORATION}
                className={pathname === ROUTES.ADMIN_SETTINGS_CORPORATION ? styles.adminSidebarSubLinkActive : styles.adminSidebarSubLink}
              >
                法人名の変更
              </Link>
            </>
          ) : (
            <Link href={ROUTES.ADMIN_SETTINGS} className={styles.adminSidebarLink}>
              設定
            </Link>
          )}

          <Link
            href={ROUTES.ADMIN_STORE_SETTINGS}
            className={isStoreSettings ? styles.adminSidebarLinkActive : styles.adminSidebarLink}
          >
            店舗設定
          </Link>

          <Link
            href={ROUTES.ADMIN_REPORTS}
            className={isReports ? styles.adminSidebarLinkActive : styles.adminSidebarLink}
          >
            レポート
          </Link>

          <Link
            href={ROUTES.ADMIN_AUDIT_LOGS}
            className={isAuditLogs ? styles.adminSidebarLinkActive : styles.adminSidebarLink}
          >
            操作ログ
          </Link>
        </nav>

        {/* フッター：カレンダーへ戻る・ログアウト */}
        <div className={styles.adminSidebarFooter}>
          <Link href={ROUTES.HOME} className={styles.adminSidebarFooterLink}>
            ← カレンダーに戻る
          </Link>
          <button type="button" className={styles.adminSidebarLogout} onClick={handleLogout}>
            ログアウト
          </button>
        </div>
      </aside>

      <main className={styles.adminMain}>
        <div className={styles.adminMainInner}>
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className={styles.adminLayout}>
        <aside className={styles.adminSidebar}>
          <div className={styles.adminSidebarHeader}>
            <span className={styles.adminSidebarTitle}>管理画面</span>
          </div>
          <nav className={`small text-secondary ${styles.adminSidebarNav}`}>読み込み中…</nav>
        </aside>
        <main className={styles.adminMain}>読み込み中…</main>
      </div>
    }>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </Suspense>
  );
}
