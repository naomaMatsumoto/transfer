"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/app/routes";
import { postJson, resolveLoginError } from "../api";
import s from "../ops.module.scss";

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

    const r = await postJson("/auth/login", { email: email.trim(), password });
    setLoading(false);

    if (!r.ok) {
      setError(resolveLoginError((r.data as { error?: string })?.error));
      return;
    }

    router.push(ROUTES.OPS_DASHBOARD);
    router.refresh();
  };

  return (
    <div className={s.centered}>
      <div className={s.loginCard}>
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <div className={s.loginHeader}>
              <div className={s.loginLogo}>O</div>
              <h1 className="h5 mb-1">Ops Console</h1>
              <p className="small text-body-secondary mb-0">プラットフォーム運営管理</p>
            </div>
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="alert alert-danger py-2" role="alert">
                  {error}
                </div>
              )}
              <div className="mb-3">
                <label className="form-label small">メールアドレス</label>
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
                <label className="form-label small">パスワード</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <button type="submit" className="btn btn-dark w-100" disabled={loading}>
                {loading ? "ログイン中…" : "ログイン"}
              </button>
            </form>
            <p className="small text-body-secondary mt-3 mb-0 text-center">初回: ops@example.com / ops-password</p>
          </div>
        </div>
      </div>
    </div>
  );
}
