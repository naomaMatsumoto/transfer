"use client";

import { useEffect, useState, useMemo } from "react";
import { getApiBase, adminGet } from "../../lib/api";
import styles from "../admin.module.scss";

type MonthRow = {
  month: string;
  total_reservations: number;
  booked: number;
  attended: number;
  no_show: number;
  canceled: number;
  makeup_used: number;
};

type MemberStats = {
  active_members: number;
  paused_members: number;
  withdrawn_members: number;
};

function defaultRange() {
  const now = new Date();
  const from = `${now.getFullYear()}-01-01`;
  const toYear = now.getFullYear() + 1;
  const to = `${toYear}-01-01`;
  return { from, to };
}

export default function ReportsPage() {
  const { from: defFrom, to: defTo } = useMemo(defaultRange, []);
  const [from, setFrom] = useState(defFrom);
  const [to, setTo] = useState(defTo);
  const [data, setData] = useState<{
    reservationsByMonth: MonthRow[];
    absencesByMonth: { month: string; absence_count: number }[];
    memberStats: MemberStats;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await adminGet<{
        reservationsByMonth: MonthRow[];
        absencesByMonth: { month: string; absence_count: number }[];
        memberStats: MemberStats;
      }>(`/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (!r.ok) throw new Error("Failed");
      setData(r.data ?? null);
    } catch {
      setErr("読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, []);

  const handleCsvDownload = () => {
    const url = `${getApiBase()}/admin/reports/csv?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    window.open(url, "_blank");
  };

  return (
    <div>
      <h1 className={styles.settingsPageTitle}>レポート・集計</h1>

      <div className="d-flex gap-2 align-items-end mb-4 flex-wrap">
        <div>
          <label className="form-label small">開始日</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="form-label small">終了日</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-sm" onClick={load} disabled={loading}>
          {loading ? "読み込み中…" : "集計"}
        </button>
        <button className="btn btn-outline-secondary btn-sm" onClick={handleCsvDownload}>
          CSV出力
        </button>
      </div>

      {err && <p className="text-danger">{err}</p>}

      {data && (
        <>
          <div className="row mb-4 g-3">
            <div className="col-auto">
              <div className="card">
                <div className="card-body text-center">
                  <div className="text-muted small">アクティブ会員</div>
                  <div className="fs-3 fw-bold">{data.memberStats?.active_members ?? 0}</div>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="card">
                <div className="card-body text-center">
                  <div className="text-muted small">停止中</div>
                  <div className="fs-3 fw-bold text-warning">{data.memberStats?.paused_members ?? 0}</div>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="card">
                <div className="card-body text-center">
                  <div className="text-muted small">退会済み</div>
                  <div className="fs-3 fw-bold text-secondary">{data.memberStats?.withdrawn_members ?? 0}</div>
                </div>
              </div>
            </div>
          </div>

          <h5 className="fw-semibold">月別予約統計</h5>
          {data.reservationsByMonth.length === 0 ? (
            <p className="text-muted">該当期間のデータがありません</p>
          ) : (
            <div className="table-responsive mb-4">
              <table className="table table-sm table-striped">
                <thead>
                  <tr>
                    <th>月</th>
                    <th>総予約</th>
                    <th>予約中</th>
                    <th>出席</th>
                    <th>欠席</th>
                    <th>キャンセル</th>
                    <th>振替利用</th>
                    <th>欠席率</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reservationsByMonth.map((r) => {
                    const total = r.attended + r.no_show;
                    const rate = total > 0 ? ((r.no_show / total) * 100).toFixed(1) : "-";
                    return (
                      <tr key={r.month}>
                        <td>{r.month}</td>
                        <td>{r.total_reservations}</td>
                        <td>{r.booked}</td>
                        <td>{r.attended}</td>
                        <td>{r.no_show}</td>
                        <td>{r.canceled}</td>
                        <td>{r.makeup_used}</td>
                        <td>{rate === "-" ? rate : `${rate}%`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
