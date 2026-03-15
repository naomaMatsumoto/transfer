"use client";

import { useEffect, useState } from "react";
import { adminGet } from "../../lib/api";
import styles from "../admin.module.scss";

type AuditLog = {
  id: number;
  actor_type: string;
  actor_id: number | null;
  action: string;
  target_type: string | null;
  target_id: number | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

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
];

const ACTION_LABELS: Record<string, string> = Object.fromEntries(
  ACTION_GROUPS.flatMap((g) => Object.entries(g.actions)),
);

function formatDetail(detail: Record<string, unknown> | null): string {
  if (!detail) return "-";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(detail)) {
    if (v != null) parts.push(`${k}: ${v}`);
  }
  return parts.join(", ") || "-";
}

const PAGE_SIZE = 50;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");

  const load = async (off: number, action?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(off) });
      if (action) params.set("action", action);
      const r = await adminGet<{ logs: AuditLog[]; total: number }>(`/audit-logs?${params}`);
      if (r.ok && r.data) {
        setLogs(r.data.logs);
        setTotal(r.data.total);
        setOffset(off);
      }
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(0); }, []);

  const handleActionFilter = (value: string) => {
    setActionFilter(value);
    load(0, value || undefined);
  };

  return (
    <div>
      <h1 className={styles.settingsPageTitle}>操作ログ</h1>

      <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
        <select
          className="form-select form-select-sm"
          style={{ width: "auto", minWidth: "200px" }}
          value={actionFilter}
          onChange={(e) => handleActionFilter(e.target.value)}
        >
          <option value="">すべての操作</option>
          {ACTION_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {Object.entries(group.actions).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="small text-body-secondary">全 {total} 件</span>
      </div>

      {loading ? (
        <p className="text-muted">読み込み中…</p>
      ) : logs.length === 0 ? (
        <p className="text-muted">操作ログがありません</p>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-sm table-striped">
              <thead>
                <tr>
                  <th>日時</th>
                  <th>操作者</th>
                  <th>操作</th>
                  <th>対象</th>
                  <th>詳細</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-nowrap small">{new Date(log.created_at).toLocaleString("ja-JP")}</td>
                    <td className="small">
                      {log.actor_type === "admin" ? "管理者" : log.actor_type === "member" ? "会員" : "システム"}
                      {log.actor_id ? ` #${log.actor_id}` : ""}
                    </td>
                    <td className="small">{ACTION_LABELS[log.action] ?? log.action}</td>
                    <td className="small">
                      {log.target_type ? `${log.target_type} #${log.target_id}` : "-"}
                    </td>
                    <td className="small text-muted" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {formatDetail(log.detail)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex gap-2 mt-2 align-items-center">
            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={offset === 0}
              onClick={() => load(Math.max(0, offset - PAGE_SIZE), actionFilter || undefined)}
            >
              前へ
            </button>
            <span className="small text-muted">
              {offset + 1}〜{Math.min(offset + PAGE_SIZE, total)} / {total} 件
            </span>
            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => load(offset + PAGE_SIZE, actionFilter || undefined)}
            >
              次へ
            </button>
          </div>
        </>
      )}
    </div>
  );
}
