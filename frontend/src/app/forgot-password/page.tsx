"use client";

import { useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/app/routes";
import { publicPost } from "@/app/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await publicPost("/members/forgot-password", { email: email.trim().toLowerCase() });
      if (!r.ok) {
        const errCode = (r.data as { error?: string })?.error;
        setError(errCode === "EMAIL_REQUIRED" ? "メールアドレスを入力してください" : "送信に失敗しました");
        return;
      }
      setSent(true);
    } catch {
      setError("送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow-sm text-center" style={{ maxWidth: "420px" }}>
          <div className="card-body p-4">
            <div className="text-primary mb-3" style={{ fontSize: "48px" }}>
              ✉
            </div>
            <h2 className="h5 mb-2">送信しました</h2>
            <p className="text-body-secondary mb-4">
              ご登録のメールアドレスにパスワード再設定用のリンクをお送りしました。
              <br />
              メール内のリンクから新しいパスワードを設定してください。
            </p>
            <Link href={ROUTES.MEMBER_LOGIN} className="btn btn-primary">
              会員ログインへ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-sm" style={{ width: "100%", maxWidth: "380px" }}>
        <div className="card-body p-4">
          <p className="mb-3">
            <Link href={ROUTES.MEMBER_LOGIN} className="small text-body-secondary">
              ← 会員ログインに戻る
            </Link>
          </p>
          <h1 className="h4 mb-4">パスワードをお忘れの方</h1>
          <p className="small text-body-secondary mb-3">
            登録済みのメールアドレスを入力すると、パスワード再設定用のリンクをお送りします。
          </p>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label className="form-label">メールアドレス</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="会員登録時のメール"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
              {submitting ? "送信中…" : "送信する"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
