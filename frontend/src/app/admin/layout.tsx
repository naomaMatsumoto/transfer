"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { ROUTES, RESERVATION_TABS } from "../routes";
import { getApiBase, apiFetch } from "../lib/api";

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
  const currentTab = searchParams?.get("tab");
  const activeTab = currentTab && TAB_KEYS.includes(currentTab) ? currentTab : "classTypes";

  if (authOk === null || !authOk) {
    return (
      <div className="d-flex flex-row vh-100 bg-light align-items-center justify-content-center">
        <div className="text-secondary">認証確認中…</div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-row vh-100 bg-light">
      <aside className="d-flex flex-column flex-shrink-0 bg-white border-end shadow-sm" style={{ width: "240px" }}>
        <div className="p-3 border-bottom bg-light">
          <span className="fw-semibold text-primary">管理画面</span>
        </div>
        <nav className="nav flex-column p-2 gap-1">
          <Link
            href={ROUTES.ADMIN_MEMBERS}
            className={`nav-link rounded ${isMembers ? "active bg-primary text-white" : "text-secondary"}`}
          >
            会員管理
          </Link>
          {isReservations ? (
            <>
              <div className="small fw-semibold text-primary px-2 py-1 mt-2">予約システム</div>
              {RESERVATION_TABS.map(({ key, label }) => (
                <Link
                  key={key}
                  href={key === "classTypes" ? ROUTES.ADMIN_RESERVATIONS : `${ROUTES.ADMIN_RESERVATIONS}?tab=${key}`}
                  className={`nav-link rounded ps-3 ${activeTab === key ? "active bg-primary text-white" : "text-secondary"}`}
                >
                  {label}
                </Link>
              ))}
            </>
          ) : (
            <Link
              href={ROUTES.ADMIN_RESERVATIONS}
              className="nav-link rounded text-secondary"
            >
              予約システム
            </Link>
          )}
          <hr className="my-2" />
          {isSettings ? (
            <>
              <div className="small fw-semibold text-primary px-2 py-1 mt-2">設定</div>
              <Link
                href={ROUTES.ADMIN_SETTINGS}
                className={`nav-link rounded ps-3 ${pathname === ROUTES.ADMIN_SETTINGS ? "active bg-primary text-white" : "text-secondary"}`}
              >
                設定
              </Link>
              <Link
                href={ROUTES.ADMIN_SETTINGS_PASSWORD}
                className={`nav-link rounded ps-3 ${pathname === ROUTES.ADMIN_SETTINGS_PASSWORD ? "active bg-primary text-white" : "text-secondary"}`}
              >
                パスワードの変更
              </Link>
              <Link
                href={ROUTES.ADMIN_SETTINGS_CORPORATION}
                className={`nav-link rounded ps-3 ${pathname === ROUTES.ADMIN_SETTINGS_CORPORATION ? "active bg-primary text-white" : "text-secondary"}`}
              >
                法人名の変更
              </Link>
            </>
          ) : (
            <Link href={ROUTES.ADMIN_SETTINGS} className="nav-link rounded text-secondary">
              設定
            </Link>
          )}
          <Link href={ROUTES.HOME} className="nav-link rounded text-secondary">
            カレンダーに戻る
          </Link>
          <button
            type="button"
            className="nav-link rounded text-secondary text-start border-0 bg-transparent"
            onClick={handleLogout}
          >
            ログアウト
          </button>
        </nav>
      </aside>
      <main className="flex-grow-1 overflow-auto p-4">
        <div className="container-fluid px-0" style={{ maxWidth: "1100px", minWidth: 0 }}>
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
      <div className="d-flex flex-row vh-100 bg-light">
        <aside className="flex-shrink-0 bg-white border-end p-3" style={{ width: "240px" }}>
          <div className="fw-semibold text-primary">管理画面</div>
          <nav className="small text-secondary mt-2">読み込み中…</nav>
        </aside>
        <main className="flex-grow-1 p-4">読み込み中…</main>
      </div>
    }>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </Suspense>
  );
}
