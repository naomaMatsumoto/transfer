"use client";

import { useState, useCallback, useEffect } from "react";
import { opsFetch } from "../api";
import { AuditLogRow, AuditLogsResponse } from "../types";
import { PageHeader, DataTable, Loading, Empty, ErrorAlert, Pagination, FilterBar } from "../components";
import { formatDateTime } from "../utils";
import s from "../ops.module.scss";

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  "corporation.update": "事業者 編集",
  "corporation.status": "事業者 ステータス変更",
  "corporation.delete": "事業者 削除",
  "account.create": "アカウント 作成",
  "account.delete": "アカウント 削除",
  "account.reset_password": "アカウント PW リセット",
  "store.delete": "店舗 削除",
};

function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function formatDetail(row: AuditLogRow): string {
  if (!row.detail) return "-";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(row.detail)) {
    if (v != null) parts.push(`${k}: ${v}`);
  }
  return parts.join(", ") || "-";
}

export default function OpsAuditLogsPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
    if (actionFilter) params.set("action", actionFilter);
    const r = await opsFetch<AuditLogsResponse>(`/audit-logs?${params}`);
    if (r.ok && r.data) {
      setRows(r.data.rows);
      setTotal(r.data.total);
    } else {
      setError("監査ログの取得に失敗しました");
    }
    setLoading(false);
  }, [page, actionFilter]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <PageHeader title="監査ログ" />

      <FilterBar>
        <select
          className={`form-select form-select-sm ${s.inputMedium}`}
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
        >
          <option value="">すべてのアクション</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <span className="small text-body-secondary">全 {total} 件</span>
      </FilterBar>

      <ErrorAlert message={error} />
      {loading ? <Loading /> : rows.length === 0 ? <Empty text="ログがありません。" /> : (
        <>
          <DataTable
            rows={rows}
            rowKey={(row) => row.id}
            columns={[
              { key: "date", header: "日時", render: (row) => <span className="small text-body-secondary text-nowrap">{formatDateTime(row.created_at)}</span> },
              { key: "action", header: "アクション", render: (row) => <span className="badge bg-dark">{formatAction(row.action)}</span> },
              { key: "actor", header: "アクター", render: (row) => <span className="small">{row.actor_type}{row.actor_id ? ` #${row.actor_id}` : ""}</span> },
              { key: "target", header: "対象", render: (row) => <span className="small">{row.target_type ? `${row.target_type} #${row.target_id}` : "-"}</span> },
              { key: "detail", header: "詳細", render: (row) => <span className="small text-body-secondary">{formatDetail(row)}</span> },
            ]}
          />
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
