"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getApiBase, apiFetch } from "@/app/lib/api";
import { ROUTES } from "@/app/routes";

type CorporationDetail = {
  id: number;
  organization_type?: "corporation" | "sole_proprietor";
  name: string;
  created_at: string;
  stores: { id: number; name: string; created_at: string }[];
  accounts: { id: number; email: string; display_name: string | null; created_at: string }[];
};

const ORG_TYPE_LABEL: Record<string, string> = {
  corporation: "法人",
  sole_proprietor: "個人事業主",
};

export default function OpsCorporationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const [data, setData] = useState<CorporationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newStoreName, setNewStoreName] = useState("");
  const [addingStore, setAddingStore] = useState(false);
  const [addStoreError, setAddStoreError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`${getApiBase()}/ops/corporations/${id}`);
        if (res.status === 404) {
          setError("事業者が見つかりません");
          setData(null);
          return;
        }
        if (!res.ok) {
          setError("取得に失敗しました");
          return;
        }
        const json = (await res.json()) as CorporationDetail;
        setData(json);
      } catch {
        setError("取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newStoreName.trim();
    if (!name || !id) return;
    setAddingStore(true);
    setAddStoreError(null);
    try {
      const res = await apiFetch(`${getApiBase()}/ops/corporations/${id}/stores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddStoreError("店舗の追加に失敗しました");
        return;
      }
      setNewStoreName("");
      if (data) {
        setData({
          ...data,
          stores: [...data.stores, { id: (result as { id: number }).id, name, created_at: new Date().toISOString() }],
        });
      }
    } catch {
      setAddStoreError("店舗の追加に失敗しました");
    } finally {
      setAddingStore(false);
    }
  };

  if (!id) {
    return (
      <div>
        <p className="text-body-secondary">不正なURLです。</p>
        <Link href={ROUTES.OPS_DASHBOARD}>事業者一覧へ</Link>
      </div>
    );
  }

  if (loading) return <p className="text-body-secondary">読み込み中…</p>;
  if (error || !data) {
    return (
      <div>
        <p className="text-danger">{error ?? "データがありません"}</p>
        <Link href={ROUTES.OPS_DASHBOARD}>事業者一覧へ</Link>
      </div>
    );
  }

  return (
    <div>
      <nav className="mb-3">
        <Link href={ROUTES.OPS_DASHBOARD} className="small text-body-secondary">
          ← 事業者一覧
        </Link>
      </nav>
      <h1 className="h4 mb-4">{data.name}</h1>
      <p className="small text-body-secondary">
        {data.organization_type && <span>{ORG_TYPE_LABEL[data.organization_type] ?? data.organization_type} / </span>}
        ID: {data.id} / 登録: {data.created_at.slice(0, 10)}
      </p>

      <section className="mb-4">
        <h2 className="h6 mb-3">店舗一覧</h2>
        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <form onSubmit={handleAddStore} className="d-flex gap-2 flex-wrap align-items-end mb-0">
              <div style={{ minWidth: "180px" }}>
                <label className="form-label small mb-0">新規店舗名</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="例: 〇〇店"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={addingStore}>
                {addingStore ? "追加中…" : "店舗を追加"}
              </button>
            </form>
            {addStoreError && <p className="small text-danger mt-2 mb-0">{addStoreError}</p>}
          </div>
        </div>
        {data.stores.length === 0 ? (
          <p className="small text-body-secondary">店舗がまだありません。</p>
        ) : (
          <ul className="list-group">
            {data.stores.map((s) => (
              <li key={s.id} className="list-group-item d-flex justify-content-between align-items-center">
                <span>{s.name}</span>
                <span className="small text-body-secondary">ID: {s.id}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="h6 mb-3">アカウント一覧（この法人の管理者）</h2>
        {data.accounts.length === 0 ? (
          <p className="small text-body-secondary">アカウントがまだありません。法人申し込みで作成されます。</p>
        ) : (
          <ul className="list-group">
            {data.accounts.map((a) => (
              <li key={a.id} className="list-group-item d-flex justify-content-between align-items-center">
                <span>{a.email} {a.display_name ? `（${a.display_name}）` : ""}</span>
                <span className="small text-body-secondary">ID: {a.id}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
