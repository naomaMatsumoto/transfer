"use client";

import { useEffect, useState } from "react";
import { getApiBase, apiFetch } from "../../lib/api";
import styles from "../admin.module.scss";

export default function StoreSettingsPage() {
  const [bookingDays, setBookingDays] = useState<string>("");
  const [cancelHours, setCancelHours] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    apiFetch(`${getApiBase()}/admin/store-settings`)
      .then((r) => r.json())
      .then((d) => {
        setBookingDays(d.booking_deadline_days != null ? String(d.booking_deadline_days) : "");
        setCancelHours(d.cancel_deadline_hours != null ? String(d.cancel_deadline_hours) : "");
      })
      .catch(() => setErr("読み込みに失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const body: Record<string, number | null> = {
        booking_deadline_days: bookingDays.trim() === "" ? null : Number(bookingDays),
        cancel_deadline_hours: cancelHours.trim() === "" ? null : Number(cancelHours),
      };
      const res = await apiFetch(`${getApiBase()}/admin/store-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.message || "保存に失敗しました");
        return;
      }
      setMsg("保存しました");
    } catch {
      setErr("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-secondary">読み込み中…</p>;

  return (
    <div>
      <h1 className={styles.settingsPageTitle}>店舗設定</h1>
      <div className={styles.settingsCard}>
        <div className={styles.settingsCardBody}>
          <div className={styles.settingsFormRow}>
            <label className={styles.settingsFormLabel}>予約受付期限（○日前まで）</label>
            <input
              type="number"
              className="form-control"
              value={bookingDays}
              onChange={(e) => setBookingDays(e.target.value)}
              placeholder="未設定（制限なし）"
              min={0}
            />
            <small className="text-muted">空欄にすると制限なし</small>
          </div>
          <div className={styles.settingsFormRow}>
            <label className={styles.settingsFormLabel}>キャンセル期限（開始○時間前まで）</label>
            <input
              type="number"
              className="form-control"
              value={cancelHours}
              onChange={(e) => setCancelHours(e.target.value)}
              placeholder="未設定（制限なし）"
              min={0}
            />
            <small className="text-muted">空欄にすると制限なし</small>
          </div>
          {err && <p className={`${styles.settingsFormMessage} ${styles.settingsFormMessageError}`}>{err}</p>}
          {msg && <p className={`${styles.settingsFormMessage} ${styles.settingsFormMessageSuccess}`}>{msg}</p>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
