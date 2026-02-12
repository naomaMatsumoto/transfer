"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/app/routes";
import s from "./calendar.module.scss";

type StoreRow = { id: number; name: string };

const API_BASE = (() => {
  const u = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (u && (u.startsWith("http://") || u.startsWith("https://"))) return u.replace(/\/$/, "");
  return "http://localhost:4000";
})();

export default function Home() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/stores`);
        if (res.ok) {
          const list = (await res.json()) as StoreRow[];
          setStores(list);
        } else {
          setStores([]);
        }
      } catch {
        setStores([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (!mounted) {
    return (
      <div className={s.page}>
        <p className={s.muted}>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <h1 className={s.title}>振替管理カレンダー</h1>
      <p className={s.muted} style={{ marginBottom: "1.5rem" }}>
        店舗を選んでカレンダーを表示します。
      </p>

      {loading ? (
        <p className={s.muted}>店舗一覧を取得しています...</p>
      ) : stores.length === 0 ? (
        <p className={s.muted}>登録されている店舗がありません。</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {stores.map((store) => (
            <li key={store.id} style={{ marginBottom: "0.75rem" }}>
              <Link
                href={`/stores/${store.id}`}
                style={{
                  display: "inline-block",
                  padding: "0.75rem 1.25rem",
                  background: "var(--bs-primary)",
                  color: "white",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                {store.name} のカレンダー →
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: "2rem", fontSize: "0.9rem" }}>
        <Link href={ROUTES.MEMBER_REGISTER} className={s.muted}>
          会員登録
        </Link>
        {" · "}
        <Link href={ROUTES.ADMIN_RESERVATIONS} className={s.muted}>
          管理画面
        </Link>
      </div>
    </div>
  );
}
