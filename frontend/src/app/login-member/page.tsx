"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/app/routes";
import { getApiBase } from "@/app/lib/api";

export default function MemberLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? ROUTES.HOME;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/members/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        if (data.error === "INVALID_EMAIL_OR_PASSWORD") {
          setError("メールアドレスまたはパスワードが正しくありません。");
        } else if (data.error === "EMAIL_PASSWORD_REQUIRED") {
          setError("メールアドレスとパスワードを入力してください。");
        } else if (data.error === "PASSWORD_NOT_SET") {
          setError("このアカウントにはパスワードが設定されていません。店舗にお問い合わせください。");
        } else {
          setError("ログインに失敗しました。");
        }
        return;
      }
      router.push(returnTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-sm" style={{ width: "100%", maxWidth: "380px" }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-4 text-center">会員ログイン</h1>
          <p className="small text-body-secondary mb-3 text-center">
            店舗で登録したメールアドレスとパスワードでログインし、振替予約・欠席登録ができます。
          </p>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}
            <div className="mb-3">
              <label className="form-label">メールアドレス</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="会員登録時のメール"
                autoComplete="email"
                required
              />
            </div>
            <div className="mb-4">
              <label className="form-label">パスワード</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? "ログイン中…" : "ログイン"}
            </button>
          </form>
          <p className="small text-center mt-3 mb-0">
            <Link href={ROUTES.FORGOT_PASSWORD}>パスワードをお忘れの方</Link>
          </p>
          <p className="small text-center mt-2 mb-0">
            <Link href={ROUTES.HOME}>カレンダーに戻る</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
