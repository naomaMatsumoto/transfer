"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getApiBase } from "@/app/lib/api";
import { getApiErrorMessage } from "@/app/lib/apiErrors";

type Store = { id: number; name: string };

export default function MemberRegisterPage() {
  const searchParams = useSearchParams();
  const storeParam = searchParams.get("store");
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<number | "">(storeParam ? Number(storeParam) || "" : "");
  const [name, setName] = useState("");
  const [furigana, setFurigana] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${getApiBase()}/stores`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setStores(list);
        if (storeParam) setStoreId(Number(storeParam) || "");
        else if (list.length === 1) setStoreId(list[0].id);
      })
      .catch(() => setStores([]));
  }, [storeParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!storeId) {
      setError("店舗を選択してください");
      return;
    }
    if (!name.trim()) {
      setError("名前を入力してください");
      return;
    }
    if (!email.trim()) {
      setError("メールアドレスを入力してください");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/members/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: Number(storeId),
          name: name.trim(),
          furigana: furigana.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(getApiErrorMessage(data?.error));
        return;
      }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow-sm text-center" style={{ maxWidth: "420px" }}>
          <div className="card-body p-4">
            <div className="text-primary mb-3" style={{ fontSize: "48px" }}>✉</div>
            <h2 className="h5 mb-2">登録を受け付けました</h2>
            <p className="text-body-secondary mb-0">
              ご登録のメールアドレスに認証リンクをお送りしました。<br />
              メール内のリンクをクリックして、会員登録を完了してください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light py-5">
      <div className="card shadow-sm" style={{ width: "100%", maxWidth: "440px" }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-4">会員登録</h1>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}
            <div className="mb-3">
              <label className="form-label">店舗 <span className="text-danger">*</span></label>
              <select
                className="form-select"
                value={storeId}
                onChange={(e) => setStoreId(Number(e.target.value) || "")}
                required
              >
                <option value="">選択してください</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {stores.length === 0 && (
                <p className="small text-body-secondary mt-1 mb-0">店舗を読み込み中…</p>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label">お名前 <span className="text-danger">*</span></label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：山田 花子"
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">ふりがな（任意）</label>
              <input
                type="text"
                className="form-control"
                value={furigana}
                onChange={(e) => setFurigana(e.target.value)}
                placeholder="例：やまだ はなこ"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">メールアドレス <span className="text-danger">*</span></label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="例：hanako@example.com"
                required
              />
              <p className="small text-body-secondary mt-1 mb-0">認証リンクを送信します</p>
            </div>
            <div className="mb-4">
              <label className="form-label">電話番号（任意）</label>
              <input
                type="tel"
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="例：090-1234-5678"
              />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={loading || stores.length === 0}>
              {loading ? "登録中…" : "登録する"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
