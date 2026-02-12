"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/app/routes";
import { getApiBase } from "@/app/lib/api";
import { getApiErrorMessage } from "@/app/lib/apiErrors";

type OrganizationType = "corporation" | "sole_proprietor";

export default function CorporationRegisterPage() {
  const router = useRouter();
  const [organizationType, setOrganizationType] = useState<OrganizationType>("corporation");
  const [corporationName, setCorporationName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminDisplayName, setAdminDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/corporation/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationType,
          corporationName: corporationName.trim(),
          storeName: storeName.trim(),
          adminEmail: adminEmail.trim(),
          adminPassword: adminPassword,
          adminDisplayName: adminDisplayName.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(getApiErrorMessage(data?.error));
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push(ROUTES.LOGIN), 2000);
    } finally {
      setLoading(false);
    }
  };

  const isSoleProprietor = organizationType === "sole_proprietor";

  if (success) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow-sm text-center" style={{ maxWidth: "420px" }}>
          <div className="card-body p-4">
            <div className="text-success mb-3" style={{ fontSize: "48px" }}>✓</div>
            <h2 className="h5 mb-2">
              {isSoleProprietor ? "個人事業主の登録が完了しました" : "法人登録が完了しました"}
            </h2>
            <p className="text-body-secondary mb-0">ログイン画面に移動します…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light py-5">
      <div className="card shadow-sm" style={{ width: "100%", maxWidth: "440px" }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-4">事業者申し込み</h1>
          <p className="text-body-secondary small mb-4">
            法人または個人事業主として、店舗と管理者アカウントを登録します。登録後、ログインして管理画面をご利用ください。
          </p>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}
            <div className="mb-3">
              <label className="form-label">事業者の種類 <span className="text-danger">*</span></label>
              <div className="d-flex gap-3">
                <label className="d-flex align-items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="organizationType"
                    value="corporation"
                    checked={organizationType === "corporation"}
                    onChange={() => setOrganizationType("corporation")}
                  />
                  法人
                </label>
                <label className="d-flex align-items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="organizationType"
                    value="sole_proprietor"
                    checked={organizationType === "sole_proprietor"}
                    onChange={() => setOrganizationType("sole_proprietor")}
                  />
                  個人事業主
                </label>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">
                {isSoleProprietor ? "屋号・事業者名" : "法人名"} <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={corporationName}
                onChange={(e) => setCorporationName(e.target.value)}
                placeholder={isSoleProprietor ? "例：〇〇教室" : "例：株式会社〇〇"}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">店舗名 <span className="text-danger">*</span></label>
              <input
                type="text"
                className="form-control"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="例：〇〇教室 本店"
                required
              />
            </div>
            <hr className="my-4" />
            <p className="small fw-semibold text-secondary mb-2">管理者アカウント（ログインに使用）</p>
            <div className="mb-3">
              <label className="form-label">メールアドレス <span className="text-danger">*</span></label>
              <input
                type="email"
                className="form-control"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">パスワード <span className="text-danger">*</span></label>
              <input
                type="password"
                className="form-control"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="6文字以上"
                minLength={6}
                required
              />
            </div>
            <div className="mb-4">
              <label className="form-label">表示名（任意）</label>
              <input
                type="text"
                className="form-control"
                value={adminDisplayName}
                onChange={(e) => setAdminDisplayName(e.target.value)}
                placeholder="例：山田 太郎"
              />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? "登録中…" : "申し込む"}
            </button>
          </form>
          <p className="small text-center mt-3 mb-0">
            <Link href={ROUTES.LOGIN}>ログイン画面へ</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
