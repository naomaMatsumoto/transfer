"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { opsFetch, postJson, patchJson } from "./api";
import { CorporationRow, OrganizationType, CorpStatus, ORG_TYPE_LABEL } from "./types";
import { useSubmit } from "./hooks";
import { formatDate } from "./utils";
import { PageHeader, StatCard, StatusBadge, DataTable, Modal, ConfirmModal, Loading, Empty, ErrorAlert, FilterBar } from "./components";
import s from "./ops.module.scss";

type StatusFilter = "all" | CorpStatus;

function effectiveStatus(c: CorporationRow): CorpStatus {
  if (c.deleted_at) return "deleted";
  return c.status ?? "active";
}

export default function OpsDashboardPage() {
  const [corporations, setCorporations] = useState<CorporationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [showModal, setShowModal] = useState(false);
  const [newOrgType, setNewOrgType] = useState<OrganizationType>("corporation");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const createSubmit = useSubmit();

  const [restoreTarget, setRestoreTarget] = useState<CorporationRow | null>(null);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await opsFetch<CorporationRow[]>("/corporations?include_deleted=1");
    if (r.ok && Array.isArray(r.data)) {
      setCorporations(r.data);
    } else {
      setError("事業者一覧の取得に失敗しました");
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

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

    await createSubmit.run(
      () => postJson("/corporations", payload),
      {
        errorMsg: "作成に失敗しました",
        onError: (data) => {
          const code = (data as { error?: string })?.error;
          if (code === "EMAIL_ALREADY_EXISTS") return "このメールアドレスは既に登録されています";
          if (code === "PASSWORD_TOO_SHORT") return "パスワードは6文字以上で入力してください";
          return undefined;
        },
        onSuccess: (data) => {
          const d = data as CreateResp | undefined;
          setNewName("");
          setNewEmail("");
          setNewDisplayName("");
          setNewPassword("");
          setShowModal(false);
          if (d?.id != null) {
            setCorporations((prev) => [
              ...prev,
              {
                id: d.id!,
                code: d.code,
                organization_type: d.organization_type ?? newOrgType,
                name,
                status: "active",
                deleted_at: null,
                created_at: new Date().toISOString(),
                store_count: 0,
                account_count: d.accountCreated ? 1 : 0,
              },
            ]);
          }
        },
      },
    );
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    const code = restoreTarget.code ?? restoreTarget.id;
    const r = await patchJson(`/corporations/${code}/restore`);
    setRestoring(false);
    setRestoreTarget(null);
    if (r.ok) void load();
  };

  const activeCorporations = corporations.filter((c) => !c.deleted_at);
  const totalStores = activeCorporations.reduce((n, c) => n + c.store_count, 0);
  const totalAccounts = activeCorporations.reduce((n, c) => n + c.account_count, 0);
  const activeCount = activeCorporations.filter((c) => c.status === "active").length;

  const filtered = useMemo(() => {
    let list = corporations;
    if (statusFilter !== "all") {
      list = list.filter((c) => effectiveStatus(c) === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [corporations, statusFilter, search]);

  return (
    <div>
      <PageHeader
        title="事業者管理"
        action={<button className="btn btn-dark btn-sm" onClick={() => setShowModal(true)}>+ 新規事業者を追加</button>}
      />

      <div className={s.statsGrid}>
        <StatCard label="事業者数" value={activeCorporations.length} sub={`稼働中 ${activeCount}`} />
        <StatCard label="審査中" value={corporations.filter((c) => !c.deleted_at && c.status === "pending").length} />
        <StatCard label="メール送信済み" value={corporations.filter((c) => !c.deleted_at && c.status === "email_sent").length} />
        <StatCard label="総店舗数" value={totalStores} />
        <StatCard label="総アカウント数" value={totalAccounts} />
      </div>

      <ErrorAlert message={error} />

      {!loading && corporations.length > 0 && (
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
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">すべて</option>
            <option value="pending">審査中</option>
            <option value="email_sent">メール送信済み</option>
            <option value="active">稼働中</option>
            <option value="suspended">停止中</option>
            <option value="deleted">削除済み</option>
          </select>
        </FilterBar>
      )}

      {loading ? <Loading /> : corporations.length === 0 ? (
        <Empty text="事業者がまだ登録されていません。" />
      ) : filtered.length === 0 ? (
        <Empty text="条件に一致する事業者がありません。" />
      ) : (
        <DataTable
          rows={filtered}
          rowKey={(c) => c.id}
          columns={[
            { key: "name", header: "名前", render: (c) => (
              <span className={`fw-medium ${c.deleted_at ? "text-body-secondary text-decoration-line-through" : ""}`}>{c.name}</span>
            )},
            { key: "type", header: "種類", render: (c) => <span className="small text-body-secondary">{ORG_TYPE_LABEL[c.organization_type ?? "corporation"]}</span> },
            { key: "status", header: "ステータス", render: (c) => <StatusBadge status={effectiveStatus(c)} /> },
            { key: "stores", header: "店舗", className: "text-end", render: (c) => c.store_count },
            { key: "accounts", header: "アカウント", className: "text-end", render: (c) => c.account_count },
            { key: "date", header: "登録日", render: (c) => <span className="small text-body-secondary">{formatDate(c.created_at)}</span> },
            { key: "action", header: "", render: (c) => c.deleted_at ? (
              <button className="btn btn-sm btn-outline-success" onClick={() => setRestoreTarget(c)}>復旧</button>
            ) : (
              <Link href={`/ops/corporations/${c.code ?? c.id}`} className="btn btn-sm btn-outline-dark">詳細</Link>
            )},
          ]}
        />
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
