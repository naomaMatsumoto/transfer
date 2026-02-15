"use client";

import { useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/app/routes";
import { getApiBase, apiFetch } from "@/app/lib/api";
import styles from "../../admin.module.scss";

export default function AdminSettingsPasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== newPasswordConfirm) {
      setError("新しいパスワードが一致しません");
      return;
    }
    if (newPassword.length < 6) {
      setError("新しいパスワードは6文字以上で入力してください");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch(`${getApiBase()}/admin/settings/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        if (data.error === "CURRENT_PASSWORD_INVALID") {
          setError("現在のパスワードが正しくありません");
        } else if (data.error === "NEW_PASSWORD_TOO_SHORT") {
          setError("新しいパスワードは6文字以上で入力してください");
        } else if (data.error === "CURRENT_AND_NEW_PASSWORD_REQUIRED") {
          setError("現在のパスワードと新しいパスワードを入力してください");
        } else {
          setError("パスワードの変更に失敗しました");
        }
        return;
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch {
      setError("パスワードの変更に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <nav className={styles.settingsBackNav}>
        <Link href={ROUTES.ADMIN_SETTINGS}>← 設定</Link>
      </nav>
      <h1 className={styles.settingsPageTitle}>パスワードの変更</h1>
      <div className={styles.settingsCard}>
        <div className={styles.settingsCardBody}>
          <form onSubmit={handleSubmit}>
            <div className={styles.settingsFormRow}>
              <label className={styles.settingsFormLabel}>現在のパスワード</label>
              <input
                type="password"
                className="form-control"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="現在のパスワード"
                required
                autoComplete="current-password"
              />
            </div>
            <div className={styles.settingsFormRow}>
              <label className={styles.settingsFormLabel}>新しいパスワード</label>
              <input
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6文字以上"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            <div className={styles.settingsFormRow}>
              <label className={styles.settingsFormLabel}>新しいパスワード（確認）</label>
              <input
                type="password"
                className="form-control"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                placeholder="もう一度入力"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "変更中…" : "パスワードを変更する"}
            </button>
          </form>
          {error && <p className={`${styles.settingsFormMessage} ${styles.settingsFormMessageError}`}>{error}</p>}
          {success && <p className={`${styles.settingsFormMessage} ${styles.settingsFormMessageSuccess}`}>パスワードを変更しました。</p>}
        </div>
      </div>
    </div>
  );
}
