"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/app/routes";
import { getApiBase, apiFetch } from "@/app/lib/api";

export default function AdminSettingsCorporationPage() {
  const [corporationName, setCorporationName] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await apiFetch(`${getApiBase()}/admin/settings`);
        if (!res.ok) {
          setLoadError("設定の取得に失敗しました");
          return;
        }
        const data = (await res.json()) as { corporationName?: string };
        const name = data.corporationName ?? "";
        setCorporationName(name);
        setInputValue(name);
      } catch {
        setLoadError("設定の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = inputValue.trim();
    if (!name) {
      setError("法人名を入力してください");
      return;
    }
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const res = await apiFetch(`${getApiBase()}/admin/settings/corporation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error === "NAME_REQUIRED" ? "法人名を入力してください" : "変更に失敗しました");
        return;
      }
      setSuccess(true);
      setCorporationName(name);
    } catch {
      setError("変更に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-body-secondary">読み込み中…</p>;
  if (loadError) return <div className="alert alert-danger">{loadError}</div>;

  return (
    <div>
      <nav className="mb-3">
        <Link href={ROUTES.ADMIN_SETTINGS} className="small text-body-secondary">
          ← 設定
        </Link>
      </nav>
      <h1 className="h4 mb-4">法人名の変更</h1>
      <div className="card shadow-sm" style={{ maxWidth: "400px" }}>
        <div className="card-body">
          <p className="small text-body-secondary mb-3">
            現在の法人名: <strong>{corporationName || "—"}</strong>
          </p>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label">新しい法人名</label>
              <input
                type="text"
                className="form-control"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="法人名を入力"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "変更中…" : "変更する"}
            </button>
          </form>
          {error && <p className="small text-danger mt-2 mb-0">{error}</p>}
          {success && <p className="small text-success mt-2 mb-0">法人名を変更しました。</p>}
        </div>
      </div>
    </div>
  );
}
