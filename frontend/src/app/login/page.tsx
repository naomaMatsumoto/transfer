"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "../routes";
import { publicPost } from "../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await publicPost("/auth/login", { email: email.trim(), password });
      if (!r.ok) {
        const errCode = (r.data as { error?: string })?.error;
        if (errCode === "INVALID_EMAIL_OR_PASSWORD") {
          setError("メールアドレスまたはパスワードが正しくありません。");
        } else if (errCode === "EMAIL_PASSWORD_REQUIRED") {
          setError("メールアドレスとパスワードを入力してください。");
        } else {
          setError("ログインに失敗しました。");
        }
        return;
      }
      router.push(ROUTES.ADMIN_RESERVATIONS);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-sm" style={{ width: "100%", maxWidth: "380px" }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-4 text-center">管理画面ログイン</h1>
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
                placeholder="admin@example.com"
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
          <p className="small text-body-secondary mt-3 mb-0 text-center">初回: admin@example.com / password</p>
          <p className="small text-center mt-2 mb-0">
            <a href={ROUTES.CORPORATION_REGISTER}>法人の新規申し込み</a>
          </p>
        </div>
      </div>
    </div>
  );
}
