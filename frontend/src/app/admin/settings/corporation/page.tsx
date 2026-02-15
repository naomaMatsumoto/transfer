"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/app/routes";
import { getApiBase, apiFetch } from "@/app/lib/api";
import styles from "../../admin.module.scss";

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
      <nav className={styles.settingsBackNav}>
        <Link href={ROUTES.ADMIN_SETTINGS}>← 設定</Link>
      </nav>
      <h1 className={styles.settingsPageTitle}>法人名の変更</h1>
      <div className={styles.settingsCard}>
        <div className={styles.settingsCardBody}>
          <p className={styles.settingsCardMuted}>
            現在の法人名: <strong>{corporationName || "—"}</strong>
          </p>
          <form onSubmit={handleSubmit}>
            <div className={styles.settingsFormRow}>
              <label className={styles.settingsFormLabel}>新しい法人名</label>
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
          {error && <p className={`${styles.settingsFormMessage} ${styles.settingsFormMessageError}`}>{error}</p>}
          {success && <p className={`${styles.settingsFormMessage} ${styles.settingsFormMessageSuccess}`}>法人名を変更しました。</p>}
        </div>
      </div>
    </div>
  );
}
