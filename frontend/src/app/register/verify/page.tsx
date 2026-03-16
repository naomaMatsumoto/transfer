"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ROUTES } from "@/app/routes";
import { getApiBase } from "@/app/lib/api";
import { getApiErrorMessage } from "@/app/lib/apiErrors";

export default function RegisterVerifyPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const hasToken = !!token?.trim();
  const [status, setStatus] = useState<"loading" | "ok" | "error">(hasToken ? "loading" : "error");
  const [errorMessage, setErrorMessage] = useState<string | null>(hasToken ? null : "認証リンクが正しくありません。");

  useEffect(() => {
    if (!token?.trim()) return;
    const controller = new AbortController();
    fetch(`${getApiBase()}/members/verify?token=${encodeURIComponent(token)}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setStatus("ok");
        } else {
          setStatus("error");
          setErrorMessage(getApiErrorMessage(data?.error));
        }
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setStatus("error");
        setErrorMessage("通信に失敗しました。");
      });
    return () => controller.abort();
  }, [token]);

  if (status === "loading") {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow-sm text-center" style={{ maxWidth: "380px" }}>
          <div className="card-body p-4">
            <p className="text-body-secondary mb-0">認証を確認しています…</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "ok") {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow-sm text-center" style={{ maxWidth: "420px" }}>
          <div className="card-body p-4">
            <div className="text-success mb-3" style={{ fontSize: "48px" }}>
              ✓
            </div>
            <h2 className="h5 mb-2">会員登録が完了しました</h2>
            <p className="text-body-secondary mb-4">カレンダーから予約・欠席登録ができます。</p>
            <Link href={ROUTES.HOME} className="btn btn-primary">
              カレンダーへ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-sm text-center" style={{ maxWidth: "420px" }}>
        <div className="card-body p-4">
          <div className="text-danger mb-3" style={{ fontSize: "48px" }}>
            !
          </div>
          <h2 className="h5 mb-2">認証できませんでした</h2>
          <p className="text-body-secondary mb-4">{errorMessage}</p>
          <Link href={ROUTES.MEMBER_REGISTER} className="btn btn-primary">
            会員登録へ
          </Link>
          <span className="mx-2">または</span>
          <Link href={ROUTES.HOME}>カレンダーに戻る</Link>
        </div>
      </div>
    </div>
  );
}
