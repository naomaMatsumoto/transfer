"use client";

import { useState, useEffect } from "react";
import { opsFetch } from "../api";
import { AuditLogRow, AuditLogsResponse } from "../types";
import { PageHeader, DataTable, Loading, Empty, ErrorAlert, Pagination, FilterBar } from "../components";
import { formatDateTime } from "../utils";
import s from "../ops.module.scss";

const PAGE_SIZE = 50;

type ActionGroup = { label: string; actions: Record<string, string> };

const ACTION_GROUPS: ActionGroup[] = [
  {
    label: "イベント",
    actions: {
      "event.create":          "イベント 作成",
      "event.create_bulk":     "イベント 一括作成",
      "event.delete":          "イベント 削除",
      "event.bulk_delete":     "イベント 一括削除",
      "event.update_capacity": "イベント 定員変更",
      "event.bulk_capacity":   "イベント 一括定員変更",
      "event.update_status":   "イベント ステータス変更",
      "event.bulk_status":     "イベント 一括ステータス変更",
      "event.update_time":     "イベント 時間変更",
      "event.bulk_time":       "イベント 一括時間変更",
      "event.update_staff":    "イベント スタッフ更新",
    },
  },
  {
    label: "クラス種別",
    actions: {
      "class_type.create": "クラス種別 作成",
      "class_type.update": "クラス種別 更新",
      "class_type.delete": "クラス種別 削除",
    },
  },
  {
    label: "スタッフ",
    actions: {
      "staff.create": "スタッフ 作成",
      "staff.update": "スタッフ 更新",
      "staff.delete": "スタッフ 削除",
    },
  },
  {
    label: "振替権利",
    actions: {
      "credit.create": "振替権利 付与",
      "credit.update": "振替権利 更新",
      "credit.revoke": "振替権利 取消",
    },
  },
  {
    label: "予約・会員",
    actions: {
      "reservation.create":         "予約 作成（代理）",
      "reservation.cancel_by_admin": "予約 キャンセル（管理者）",
      "reservation.cancel":          "予約 キャンセル（会員）",
      "waitlist.join":               "キャンセル待ち 登録",
      "waitlist.leave":              "キャンセル待ち 解除",
      "member.create":               "会員 作成",
      "member.update":               "会員 更新",
      "member.delete":               "会員 削除",
    },
  },
  {
    label: "店舗設定",
    actions: {
      "store_settings.update":       "店舗設定 更新",
      "settings.update_corporation": "設定 法人名変更",
      "settings.update_password":    "設定 パスワード変更",
    },
  },
  {
    label: "ops: 事業者",
    actions: {
      "corporation.create":       "事業者 作成",
      "corporation.update":       "事業者 編集",
      "corporation.updateStatus": "事業者 ステータス変更",
      "corporation.delete":       "事業者 削除",
      "corporation.restore":      "事業者 復元",
    },
  },
  {
    label: "ops: 店舗",
    actions: {
      "store.create": "店舗 追加",
      "store.update": "店舗 更新",
      "store.delete": "店舗 削除",
    },
  },
  {
    label: "ops: アカウント",
    actions: {
      "account.create":        "アカウント 作成",
      "account.delete":        "アカウント 削除",
      "account.resetPassword": "アカウント PW リセット",
      "account.role_change":   "アカウント ロール変更",
    },
  },
];

const ACTION_LABELS: Record<string, string> = Object.fromEntries(
  ACTION_GROUPS.flatMap((g) => Object.entries(g.actions)),
);

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

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (actionFilter) params.set("action", actionFilter);
      const r = await opsFetch<AuditLogsResponse>(`/audit-logs?${params}`);
      if (!cancelled) {
        if (r.ok && r.data) {
          setRows(r.data.rows);
          setTotal(r.data.total);
        } else {
          setError("監査ログの取得に失敗しました");
        }
        setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [page, actionFilter]);

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
          {ACTION_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {Object.entries(group.actions).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </optgroup>
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
              { key: "date",   header: "日時",       render: (row) => <span className="small text-body-secondary text-nowrap">{formatDateTime(row.created_at)}</span> },
              { key: "action", header: "アクション", render: (row) => <span className="badge bg-dark">{formatAction(row.action)}</span> },
              { key: "actor",  header: "アクター",   render: (row) => <span className="small">{row.actor_type}{row.actor_id ? ` #${row.actor_id}` : ""}</span> },
              { key: "target", header: "対象",       render: (row) => <span className="small">{row.target_type ? `${row.target_type} #${row.target_id}` : "-"}</span> },
              { key: "detail", header: "詳細",       render: (row) => <span className="small text-body-secondary">{formatDetail(row)}</span> },
            ]}
          />
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
