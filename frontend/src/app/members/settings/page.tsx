"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/app/routes";
import { getApiBase, apiFetch } from "@/app/lib/api";

export default function MemberSettingsPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiFetch(`${getApiBase()}/members/me`)
      .then((res) => {
        setAuthorized(res.ok);
        if (!res.ok) router.replace(`${ROUTES.MEMBER_LOGIN}?returnTo=${encodeURIComponent(ROUTES.MEMBER_SETTINGS)}`);
      })
      .catch(() => {
        setAuthorized(false);
        router.replace(ROUTES.MEMBER_LOGIN);
      })
      .finally(() => setChecked(true));
  }, [router]);

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
      const res = await apiFetch(`${getApiBase()}/members/me/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        if (data.error === "CURRENT_PASSWORD_INVALID") setError("現在のパスワードが正しくありません");
        else if (data.error === "NEW_PASSWORD_TOO_SHORT") setError("新しいパスワードは6文字以上で入力してください");
        else if (data.error === "CURRENT_AND_NEW_PASSWORD_REQUIRED") setError("現在のパスワードと新しいパスワードを入力してください");
        else setError("パスワードの変更に失敗しました");
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

  if (!checked || !authorized) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <p className="text-body-secondary mb-0">確認中…</p>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light py-5">
      <div className="card shadow-sm" style={{ width: "100%", maxWidth: "400px" }}>
        <div className="card-body p-4">
          <p className="mb-3">
            <Link href={ROUTES.HOME} className="small text-body-secondary">← カレンダーに戻る</Link>
          </p>
          <h1 className="h4 mb-4">パスワードの変更</h1>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">現在のパスワード</label>
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
            <div className="mb-3">
              <label className="form-label">新しいパスワード</label>
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
            <div className="mb-4">
              <label className="form-label">新しいパスワード（確認）</label>
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
            <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
              {submitting ? "変更中…" : "パスワードを変更する"}
            </button>
          </form>
          {error && <p className="small text-danger mt-2 mb-0">{error}</p>}
          {success && <p className="small text-success mt-2 mb-0">パスワードを変更しました。</p>}
        </div>
      </div>
    </div>
  );
}
