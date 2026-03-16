"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { opsFetch, postJson, patchJson } from "./api";
import { CorporationRow, OrganizationType, CorpStatus, ORG_TYPE_LABEL } from "./types";
import { useSubmit } from "./hooks";
import { formatDate } from "./utils";
import {
  PageHeader,
  StatCard,
  StatusBadge,
  DataTable,
  Modal,
  ConfirmModal,
  Loading,
  Empty,
  ErrorAlert,
  FilterBar,
  Pagination,
} from "./components";
import s from "./ops.module.scss";

const CORPS_PER_PAGE = 20;

type StatusFilter = "all" | CorpStatus;

type CorpSummary = {
  total_active: number;
  pending: number;
  email_sent: number;
  active: number;
  total_stores: number;
  total_accounts: number;
};

type CorporationListResponse = {
  rows: CorporationRow[];
  total: number;
  summary: CorpSummary;
};

const DEFAULT_SUMMARY: CorpSummary = {
  total_active: 0,
  pending: 0,
  email_sent: 0,
  active: 0,
  total_stores: 0,
  total_accounts: 0,
};

function effectiveStatus(c: CorporationRow): CorpStatus {
  if (c.deleted_at) return "deleted";
  return c.status ?? "active";
}

export default function OpsDashboardPage() {
  const [corporations, setCorporations] = useState<CorporationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<CorpSummary>(DEFAULT_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [newOrgType, setNewOrgType] = useState<OrganizationType>("corporation");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const createSubmit = useSubmit();

  const [restoreTarget, setRestoreTarget] = useState<CorporationRow | null>(null);
  const [restoring, setRestoring] = useState(false);

  const forceReload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Debounce search (300ms) and reset page
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleStatusChange = (v: StatusFilter) => {
    setStatusFilter(v);
    setPage(0);
  };

  // Fetch corporations from server
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      const qs = new URLSearchParams({
        limit: String(CORPS_PER_PAGE),
        offset: String(page * CORPS_PER_PAGE),
        include_deleted: "1",
      });
      if (debouncedSearch) qs.set("search", debouncedSearch);
      if (statusFilter !== "all") qs.set("status", statusFilter);
      const r = await opsFetch<CorporationListResponse>(`/corporations?${qs}`);
      if (!cancelled) {
        if (r.ok && r.data) {
          setCorporations(r.data.rows);
          setTotal(r.data.total);
          setSummary(r.data.summary);
        } else {
          setError("事業者一覧の取得に失敗しました");
        }
        setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, statusFilter, reloadKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    type CreateResp = { id?: number; code?: string; organization_type?: OrganizationType; accountCreated?: boolean };
    const payload = { name, organizationType: newOrgType } as Record<string, unknown>;
    const email = newEmail.trim();
    const password = newPassword;
    if (email && password) {
      payload.email = email;
      payload.displayName = newDisplayName.trim() || undefined;
      payload.password = password;
    }

    await createSubmit.run(() => postJson("/corporations", payload), {
      errorMsg: "作成に失敗しました",
      onError: (data) => {
        const code = (data as { error?: string })?.error;
        if (code === "EMAIL_ALREADY_EXISTS") return "このメールアドレスは既に登録されています";
        if (code === "PASSWORD_TOO_SHORT") return "パスワードは6文字以上で入力してください";
        return undefined;
      },
      onSuccess: (_data) => {
        setNewName("");
        setNewEmail("");
        setNewDisplayName("");
        setNewPassword("");
        setShowModal(false);
        forceReload();
      },
    });
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    const code = restoreTarget.code ?? restoreTarget.id;
    const r = await patchJson(`/corporations/${code}/restore`);
    setRestoring(false);
    setRestoreTarget(null);
    if (r.ok) forceReload();
  };

  const totalPages = Math.ceil(total / CORPS_PER_PAGE);

  return (
    <div>
      <PageHeader
        title="事業者管理"
        action={
          <button className="btn btn-dark btn-sm" onClick={() => setShowModal(true)}>
            + 新規事業者を追加
          </button>
        }
      />

      <div className={s.statsGrid}>
        <StatCard label="事業者数" value={summary.total_active} sub={`稼働中 ${summary.active}`} />
        <StatCard label="審査中" value={summary.pending} />
        <StatCard label="メール送信済み" value={summary.email_sent} />
        <StatCard label="総店舗数" value={summary.total_stores} />
        <StatCard label="総アカウント数" value={summary.total_accounts} />
      </div>

      <ErrorAlert message={error} />

      <FilterBar>
        <input
          type="text"
          className={`form-control form-control-sm ${s.inputWide}`}
          placeholder="事業者名で検索…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={`form-select form-select-sm ${s.inputNarrow}`}
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
        >
          <option value="all">すべて</option>
          <option value="pending">審査中</option>
          <option value="email_sent">メール送信済み</option>
          <option value="active">稼働中</option>
          <option value="suspended">停止中</option>
          <option value="deleted">削除済み</option>
        </select>
      </FilterBar>

      {loading ? (
        <Loading />
      ) : corporations.length === 0 ? (
        <Empty
          text={
            debouncedSearch || statusFilter !== "all"
              ? "条件に一致する事業者がありません。"
              : "事業者がまだ登録されていません。"
          }
        />
      ) : (
        <DataTable
          rows={corporations}
          rowKey={(c) => c.id}
          columns={[
            {
              key: "name",
              header: "名前",
              render: (c) => (
                <span className={`fw-medium ${c.deleted_at ? "text-body-secondary text-decoration-line-through" : ""}`}>
                  {c.name}
                </span>
              ),
            },
            {
              key: "type",
              header: "種類",
              render: (c) => (
                <span className="small text-body-secondary">
                  {ORG_TYPE_LABEL[c.organization_type ?? "corporation"]}
                </span>
              ),
            },
            { key: "status", header: "ステータス", render: (c) => <StatusBadge status={effectiveStatus(c)} /> },
            { key: "stores", header: "店舗", className: "text-end", render: (c) => c.store_count },
            { key: "accounts", header: "アカウント", className: "text-end", render: (c) => c.account_count },
            {
              key: "date",
              header: "登録日",
              render: (c) => <span className="small text-body-secondary">{formatDate(c.created_at)}</span>,
            },
            {
              key: "action",
              header: "",
              render: (c) =>
                c.deleted_at ? (
                  <button className="btn btn-sm btn-outline-success" onClick={() => setRestoreTarget(c)}>
                    復旧
                  </button>
                ) : (
                  <Link href={`/ops/corporations/${c.code ?? c.id}`} className="btn btn-sm btn-outline-dark">
                    詳細
                  </Link>
                ),
            },
          ]}
        />
      )}

      {total > 0 && (
        <div className="d-flex align-items-center justify-content-between mt-3">
          <span className="small text-body-secondary">
            {page * CORPS_PER_PAGE + 1}–{Math.min((page + 1) * CORPS_PER_PAGE, total)} / {total} 件
          </span>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      {showModal && (
        <Modal title="新規事業者を追加" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate}>
            <div className="mb-3">
              <label className="form-label small">種類</label>
              <select
                className="form-select form-select-sm"
                value={newOrgType}
                onChange={(e) => setNewOrgType(e.target.value as OrganizationType)}
              >
                <option value="corporation">法人</option>
                <option value="sole_proprietor">個人事業主</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label small">
                {newOrgType === "sole_proprietor" ? "屋号・事業者名" : "法人名"}
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={newOrgType === "sole_proprietor" ? "例: 〇〇教室" : "例: 株式会社サンプル"}
              />
            </div>
            <p className="small text-body-secondary mb-2">
              代表者のメール・パスワードを入力すると、管理画面ログイン用アカウントを同時に作成します。（省略可・後から詳細で追加可能）
            </p>
            <div className="mb-3">
              <label className="form-label small">代表者メールアドレス</label>
              <input
                type="email"
                className="form-control form-control-sm"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="例: owner@example.com"
              />
            </div>
            <div className="mb-3">
              <label className="form-label small">表示名</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="例: 管理者"
              />
            </div>
            <div className="mb-3">
              <label className="form-label small">初期パスワード（6文字以上）</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="メールと両方入力でアカウント作成"
              />
            </div>
            {createSubmit.error && <p className="small text-danger mb-2">{createSubmit.error}</p>}
            <button type="submit" className="btn btn-dark btn-sm w-100" disabled={createSubmit.submitting}>
              {createSubmit.submitting ? "作成中…" : "追加する"}
            </button>
          </form>
        </Modal>
      )}

      {restoreTarget && (
        <ConfirmModal
          title="事業者の復旧"
          message={`「${restoreTarget.name}」を復旧しますか？\n復旧後は再び一覧に表示され、店舗・アカウントも利用可能になります。`}
          confirmLabel="復旧する"
          danger={false}
          loading={restoring}
          onConfirm={handleRestore}
          onCancel={() => setRestoreTarget(null)}
        />
      )}
    </div>
  );
}
