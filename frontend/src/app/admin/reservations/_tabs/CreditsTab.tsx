"use client";

import { useState, useEffect, useCallback } from "react";
import { extractApiError } from "@/app/lib/apiErrors";
import { adminGet, adminPost, adminPatch, adminDelete } from "@/app/lib/api";
import type { ClassType, User, AdminCredit } from "../types";

const CREDITS_PER_PAGE = 50;

type CreditsResponse = { data: AdminCredit[]; total: number; page: number; limit: number };

export function CreditsTab({
  classTypes,
  users,
  flash,
  flashErr,
}: {
  classTypes: ClassType[];
  users: User[];
  flash: (m: string) => void;
  flashErr: (m: string) => void;
}) {
  const [credits, setCredits] = useState<AdminCredit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterUserId, setFilterUserId] = useState<number | "">("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // grant form
  const [grantUserId, setGrantUserId] = useState<number | "">("");
  const [grantClassType, setGrantClassType] = useState<number | "">("");
  const [grantExpires, setGrantExpires] = useState("");
  const [grantNote, setGrantNote] = useState("");

  const loadCredits = useCallback(
    async (p: number) => {
      const params = new URLSearchParams({ page: String(p), limit: String(CREDITS_PER_PAGE) });
      if (filterUserId) params.set("userId", String(filterUserId));
      if (filterStatus) params.set("status", filterStatus);
      try {
        const r = await adminGet<CreditsResponse>(`/makeup-credits?${params.toString()}`);
        if (r.ok && r.data) {
          setCredits(r.data.data);
          setTotal(r.data.total);
        } else {
          setCredits([]);
          setTotal(0);
        }
      } catch {
        flashErr("振替権利読み込み失敗");
      }
    },
    [filterUserId, filterStatus, flashErr],
  );

  useEffect(() => {
    loadCredits(page);
  }, [loadCredits, page]);

  const handleFilterSearch = () => {
    setPage(1);
    loadCredits(1);
  };

  const reload = () => loadCredits(page);

  const handleGrant = async () => {
    if (!grantUserId) {
      flashErr("ユーザーを選択してください");
      return;
    }
    const r = await adminPost("/makeup-credits", {
      userId: grantUserId,
      classTypeId: grantClassType || null,
      expiresAt: grantExpires || null,
      note: grantNote || null,
      createdBy: "admin",
    });
    if (!r.ok) {
      flashErr(extractApiError(r.data));
      return;
    }
    flash("振替権利を付与しました");
    setGrantUserId("");
    setGrantClassType("");
    setGrantExpires("");
    setGrantNote("");
    reload();
  };

  const handleRevoke = async (id: number) => {
    if (!confirm(`振替権利 #${id} を取消しますか？`)) return;
    const r = await adminDelete(`/makeup-credits/${id}`);
    if (!r.ok) {
      flashErr(extractApiError(r.data));
      return;
    }
    flash(`振替権利 #${id} を取消しました`);
    reload();
  };

  const handleRestore = async (id: number) => {
    const r = await adminPatch(`/makeup-credits/${id}`, { status: "granted" });
    if (!r.ok) {
      flashErr(extractApiError(r.data));
      return;
    }
    flash(`振替権利 #${id} を復活しました`);
    reload();
  };

  const handleUpdateExpiry = async (id: number, newExpiry: string) => {
    const r = await adminPatch(`/makeup-credits/${id}`, { expiresAt: newExpiry || null });
    if (!r.ok) {
      flashErr(extractApiError(r.data));
      return;
    }
    flash(`振替権利 #${id} の期限を変更しました`);
    reload();
  };

  const totalPages = Math.ceil(total / CREDITS_PER_PAGE);

  return (
    <div>
      {/* 手動付与フォーム */}
      <div className="card mb-3 card-body">
        <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>振替権利の手動付与</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "8px", alignItems: "end" }}>
          <div>
            <span className="form-label">ユーザー</span>
            <select
              className="form-select"
              value={grantUserId}
              onChange={(e) => setGrantUserId(Number(e.target.value) || "")}
            >
              <option value="">選択</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.phone ? ` (${u.phone})` : ""} (ID:{u.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="form-label">クラス種別（任意）</span>
            <select
              className="form-select"
              value={grantClassType}
              onChange={(e) => setGrantClassType(Number(e.target.value) || "")}
            >
              <option value="">制限なし</option>
              {classTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="form-label">有効期限（任意）</span>
            <input
              type="date"
              className="form-control"
              value={grantExpires}
              onChange={(e) => setGrantExpires(e.target.value)}
            />
          </div>
          <div>
            <span className="form-label">備考</span>
            <input
              type="text"
              className="form-control"
              value={grantNote}
              onChange={(e) => setGrantNote(e.target.value)}
              placeholder="救済付与など"
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={handleGrant}>
            付与
          </button>
        </div>
      </div>

      {/* フィルタ */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
        <select
          className="form-select"
          style={{ width: "180px" }}
          value={filterUserId}
          onChange={(e) => setFilterUserId(Number(e.target.value) || "")}
        >
          <option value="">全ユーザー</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
              {u.phone ? ` (${u.phone})` : ""}
            </option>
          ))}
        </select>
        <select
          className="form-select"
          style={{ width: "140px" }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">全ステータス</option>
          <option value="granted">granted</option>
          <option value="consumed">consumed</option>
          <option value="revoked">revoked</option>
        </select>
        <button type="button" className="btn btn-primary" onClick={handleFilterSearch}>
          検索
        </button>
      </div>

      {/* 一覧 */}
      <div className="card mb-3">
        <table className="table table-striped table-hover mb-0">
          <thead>
            <tr>
              <th>ID</th>
              <th>ユーザー</th>
              <th>クラス</th>
              <th>付与日</th>
              <th>有効期限</th>
              <th>ステータス</th>
              <th>由来</th>
              <th>備考</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {credits.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>
                  {c.user_name} (ID:{c.user_id})
                </td>
                <td>{c.class_type_name ?? "制限なし"}</td>
                <td>{c.granted_at?.slice(0, 10)}</td>
                <td>
                  <input
                    type="date"
                    defaultValue={c.expires_at?.slice(0, 10) ?? ""}
                    className="form-control"
                    style={{ width: "130px" }}
                    onBlur={(e) => {
                      const v = e.target.value;
                      const old = c.expires_at?.slice(0, 10) ?? "";
                      if (v !== old) handleUpdateExpiry(c.id, v);
                    }}
                  />
                </td>
                <td
                  style={{
                    fontWeight: 600,
                    color: c.status === "granted" ? "#059669" : c.status === "revoked" ? "#dc2626" : "#6b7280",
                  }}
                >
                  {c.status}
                </td>
                <td>{c.source}</td>
                <td style={{ fontSize: "12px" }}>{c.note}</td>
                <td>
                  <span className="btn-group btn-group-sm">
                    {c.status === "granted" && (
                      <button type="button" className="btn btn-danger" onClick={() => handleRevoke(c.id)}>
                        取消
                      </button>
                    )}
                    {(c.status === "revoked" || c.status === "consumed") && (
                      <button type="button" className="btn btn-success" onClick={() => handleRestore(c.id)}>
                        復活
                      </button>
                    )}
                  </span>
                </td>
              </tr>
            ))}
            {credits.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-body-secondary py-4">
                  振替権利がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2 py-2">
          <span className="small text-body-secondary">
            {(page - 1) * CREDITS_PER_PAGE + 1}–{Math.min(page * CREDITS_PER_PAGE, total)} / {total} 件
          </span>
          <div className="d-flex align-items-center gap-1">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              前へ
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                className={`btn btn-sm ${p === page ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
