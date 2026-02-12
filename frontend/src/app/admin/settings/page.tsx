"use client";

import Link from "next/link";
import { ROUTES } from "@/app/routes";

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="h4 mb-4">設定</h1>
      <div className="d-flex flex-column gap-2" style={{ maxWidth: "320px" }}>
        <Link
          href={ROUTES.ADMIN_SETTINGS_PASSWORD}
          className="card shadow-sm text-decoration-none text-body"
        >
          <div className="card-body d-flex align-items-center">
            <span className="fw-medium">パスワードの変更</span>
            <span className="ms-2 text-body-secondary small">→</span>
          </div>
        </Link>
        <Link
          href={ROUTES.ADMIN_SETTINGS_CORPORATION}
          className="card shadow-sm text-decoration-none text-body"
        >
          <div className="card-body d-flex align-items-center">
            <span className="fw-medium">法人名の変更</span>
            <span className="ms-2 text-body-secondary small">→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
