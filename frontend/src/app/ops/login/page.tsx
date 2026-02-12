"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/app/routes";
import { getApiBase, apiFetch } from "@/app/lib/api";

export default function OpsLoginPage() {
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
      const res = await apiFetch(`${getApiBase()}/ops/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.error === "INVALID_EMAIL_OR_PASSWORD") {
          setError("メールアドレスまたはパスワードが正しくありません。");
        } else if (data?.error === "EMAIL_PASSWORD_REQUIRED") {
          setError("メールアドレスとパスワードを入力してください。");
        } else {
          setError("ログインに失敗しました。");
        }
        return;
      }
      router.push(ROUTES.OPS_DASHBOARD);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-sm" style={{ width: "100%", maxWidth: "380px" }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-4 text-center">運営管理ログイン</h1>
          <p className="small text-body-secondary mb-3 text-center">
            SaaS プラットフォーム運営用
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
                placeholder="ops@example.com"
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
          <p className="small text-body-secondary mt-3 mb-0 text-center">
            初回: ops@example.com / ops-password
          </p>
        </div>
      </div>
    </div>
  );
}
