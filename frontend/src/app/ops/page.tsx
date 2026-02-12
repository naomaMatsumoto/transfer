"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getApiBase, apiFetch } from "@/app/lib/api";

type OrganizationType = "corporation" | "sole_proprietor";

type CorporationRow = {
  id: number;
  organization_type: OrganizationType;
  name: string;
  created_at: string;
  store_count: number;
  account_count: number;
};

const ORG_TYPE_LABEL: Record<OrganizationType, string> = {
  corporation: "法人",
  sole_proprietor: "個人事業主",
};

export default function OpsDashboardPage() {
  const [corporations, setCorporations] = useState<CorporationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newOrgType, setNewOrgType] = useState<OrganizationType>("corporation");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`${getApiBase()}/ops/corporations`);
        if (!res.ok) {
          setError("法人一覧の取得に失敗しました");
          return;
        }
        const data = (await res.json()) as CorporationRow[];
        setCorporations(Array.isArray(data) ? data : []);
      } catch {
        setError("法人一覧の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await apiFetch(`${getApiBase()}/ops/corporations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, organizationType: newOrgType }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: number; organization_type?: OrganizationType; error?: string };
      if (!res.ok) {
        setCreateError(data.error === "NAME_REQUIRED" ? "名前を入力してください" : "作成に失敗しました");
        return;
      }
      setNewName("");
      if (data.id != null) {
        setCorporations((prev) => [
          ...prev,
          { id: data.id!, organization_type: data.organization_type ?? newOrgType, name, created_at: new Date().toISOString(), store_count: 0, account_count: 0 },
        ]);
      }
    } catch {
      setCreateError("作成に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1 className="h4 mb-4">事業者一覧（SaaS 運営）</h1>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h6 mb-3">新規事業者を追加</h2>
          <form onSubmit={handleCreate} className="d-flex gap-2 flex-wrap align-items-end">
            <div style={{ minWidth: "140px" }}>
              <label className="form-label small mb-0">種類</label>
              <select
                className="form-select form-select-sm"
                value={newOrgType}
                onChange={(e) => setNewOrgType(e.target.value as OrganizationType)}
              >
                <option value="corporation">法人</option>
                <option value="sole_proprietor">個人事業主</option>
              </select>
            </div>
            <div className="flex-grow-1" style={{ minWidth: "200px" }}>
              <label className="form-label small mb-0">{newOrgType === "sole_proprietor" ? "屋号・事業者名" : "法人名"}</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={newOrgType === "sole_proprietor" ? "例: 〇〇教室" : "例: 株式会社サンプル"}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={creating}>
              {creating ? "作成中…" : "追加"}
            </button>
          </form>
          {createError && <p className="small text-danger mt-2 mb-0">{createError}</p>}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <p className="text-body-secondary">読み込み中…</p>
      ) : corporations.length === 0 ? (
        <p className="text-body-secondary">事業者がまだ登録されていません。上記から追加してください。</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover bg-white shadow-sm">
            <thead>
              <tr>
                <th>ID</th>
                <th>種類</th>
                <th>名前</th>
                <th>店舗数</th>
                <th>アカウント数</th>
                <th>登録日</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {corporations.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{ORG_TYPE_LABEL[c.organization_type ?? "corporation"]}</td>
                  <td>{c.name}</td>
                  <td>{c.store_count}</td>
                  <td>{c.account_count}</td>
                  <td className="small text-body-secondary">{c.created_at.slice(0, 10)}</td>
                  <td>
                    <Link href={`/ops/corporations/${c.id}`} className="btn btn-sm btn-outline-primary">
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
