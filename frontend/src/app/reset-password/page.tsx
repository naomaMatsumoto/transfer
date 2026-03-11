"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ROUTES } from "@/app/routes";
import { getApiBase } from "@/app/lib/api";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token.trim()) setError("リンクが正しくありません。");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
      const res = await fetch(`${getApiBase()}/members/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), newPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        if (data.error === "TOKEN_INVALID") setError("リンクが無効です。再度パスワード再設定を申請してください。");
        else if (data.error === "TOKEN_EXPIRED") setError("リンクの有効期限が切れています。再度パスワード再設定を申請してください。");
        else if (data.error === "NEW_PASSWORD_TOO_SHORT") setError("新しいパスワードは6文字以上で入力してください");
        else setError("パスワードの設定に失敗しました");
        return;
      }
      setSuccess(true);
    } catch {
      setError("パスワードの設定に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow-sm text-center" style={{ maxWidth: "420px" }}>
          <div className="card-body p-4">
            <div className="text-success mb-3" style={{ fontSize: "48px" }}>✓</div>
            <h2 className="h5 mb-2">パスワードを変更しました</h2>
            <p className="text-body-secondary mb-4">新しいパスワードで会員ログインできます。</p>
            <Link href={ROUTES.MEMBER_LOGIN} className="btn btn-primary">会員ログインへ</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!token.trim()) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow-sm text-center" style={{ maxWidth: "420px" }}>
          <div className="card-body p-4">
            <p className="text-danger mb-4">リンクが正しくありません。</p>
            <Link href={ROUTES.FORGOT_PASSWORD}>パスワードをお忘れの方</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-sm" style={{ width: "100%", maxWidth: "400px" }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-4">新しいパスワードを設定</h1>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-danger py-2" role="alert">{error}</div>
            )}
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
              {submitting ? "設定中…" : "パスワードを設定する"}
            </button>
          </form>
          <p className="small text-center mt-3 mb-0">
            <Link href={ROUTES.MEMBER_LOGIN}>会員ログインに戻る</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
