"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/app/routes";
import { getApiBase, apiFetch } from "@/app/lib/api";

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
    apiFetch(`${getApiBase()}/ops/auth/me`)
      .then((res) => {
        if (res.status === 401) {
          setAuthOk(false);
          router.replace(ROUTES.OPS_LOGIN);
          return;
        }
        setAuthOk(true);
      })
      .catch(() => {
        setAuthOk(false);
        router.replace(ROUTES.OPS_LOGIN);
      });
  }, [pathname, router]);

  const handleLogout = async () => {
    await apiFetch(`${getApiBase()}/ops/auth/logout`, { method: "POST" });
    router.replace(ROUTES.OPS_LOGIN);
    router.refresh();
  };

  if (pathname === ROUTES.OPS_LOGIN) {
    return <>{children}</>;
  }

  if (authOk === null || !authOk) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-secondary">認証確認中…</div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-row min-vh-100 bg-light">
      <aside
        className="d-flex flex-column flex-shrink-0 bg-white border-end shadow-sm"
        style={{ width: "220px" }}
      >
        <div className="p-3 border-bottom bg-light">
          <span className="fw-semibold text-primary">運営管理</span>
        </div>
        <nav className="nav flex-column p-2 gap-1">
          <Link
            href={ROUTES.OPS_DASHBOARD}
            className={`nav-link rounded ${pathname === ROUTES.OPS_DASHBOARD ? "active bg-primary text-white" : "text-secondary"}`}
          >
            事業者一覧
          </Link>
        </nav>
        <hr className="my-2" />
        <button
          type="button"
          className="nav-link rounded text-secondary text-start border-0 bg-transparent"
          onClick={handleLogout}
        >
          ログアウト
        </button>
      </aside>
      <main className="flex-grow-1 p-4 overflow-auto">{children}</main>
    </div>
  );
}
