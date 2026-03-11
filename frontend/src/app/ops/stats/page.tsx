"use client";

import { useOpsData } from "../hooks";
import { StatsData, STATUS_CFG } from "../types";
import { PageHeader, StatCard, DataTable, Loading, ErrorAlert, StatusBadge } from "../components";
import s from "../ops.module.scss";

export default function OpsStatsPage() {
  const { data, loading, error } = useOpsData<StatsData>("/stats", "統計データの取得に失敗しました");

  if (loading) return <Loading />;
  if (error || !data) return <ErrorAlert message={error} />;

  const sm = data.summary;

  return (
    <div>
      <PageHeader title="統計ダッシュボード" />

      <div className={s.statsGrid}>
        <StatCard label="事業者数" value={sm.total_corporations} sub={`稼働 ${sm.active_corporations} / 停止 ${sm.suspended_corporations}`} />
        <StatCard label="総店舗数" value={sm.total_stores} />
        <StatCard label="総アカウント数" value={sm.total_accounts} />
        <StatCard label="総会員数" value={sm.total_members} />
        <StatCard label="総予約数" value={sm.total_reservations} sub={`有効 ${sm.active_reservations}`} />
        <StatCard label="総イベント数" value={sm.total_events} />
      </div>

      <h2 className="h6 mb-3">事業者別統計</h2>
      <DataTable
        rows={data.perCorporation}
        rowKey={(c) => c.id}
        columns={[
          { key: "name", header: "事業者名", render: (c) => <span className="fw-medium">{c.name}</span> },
          { key: "status", header: "ステータス", render: (c) => <StatusBadge status={c.status} /> },
          { key: "stores", header: "店舗", className: "text-end", render: (c) => c.store_count },
          { key: "accounts", header: "アカウント", className: "text-end", render: (c) => c.account_count },
          { key: "members", header: "会員", className: "text-end", render: (c) => c.member_count },
          { key: "reservations", header: "予約", className: "text-end", render: (c) => c.reservation_count },
        ]}
      />
    </div>
  );
}
