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

const ACTION_LABELS: Record<string, string> = {
  "reservation.create": "予約作成",
  "reservation.cancel": "予約キャンセル（会員）",
  "reservation.cancel_by_admin": "予約キャンセル（管理者）",
  "member.create": "会員登録",
  "member.update": "会員更新",
  "member.delete": "会員削除",
  "waitlist.join": "キャンセル待ち登録",
  "waitlist.leave": "キャンセル待ち取消",
  "store_settings.update": "店舗設定変更",
};

const PAGE_SIZE = 50;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async (off: number) => {
    setLoading(true);
    try {
      const r = await adminGet<{logs: AuditLog[]; total: number}>(`/audit-logs?limit=${PAGE_SIZE}&offset=${off}`);
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

  return (
    <div>
      <h1 className={styles.settingsPageTitle}>操作ログ</h1>

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
                      {log.detail ? JSON.stringify(log.detail) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex gap-2 mt-2">
            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={offset === 0}
              onClick={() => load(Math.max(0, offset - PAGE_SIZE))}
            >
              前へ
            </button>
            <span className="small align-self-center text-muted">
              {offset + 1}〜{Math.min(offset + PAGE_SIZE, total)} / {total}件
            </span>
            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => load(offset + PAGE_SIZE)}
            >
              次へ
            </button>
          </div>
        </>
      )}
    </div>
  );
}
