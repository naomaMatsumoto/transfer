"use client";

import { useState, useReducer } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/app/routes";
import { putJson, postJson, patchJson, deleteFetch } from "../../api";
import {
  CorporationDetail,
  OrganizationType,
  CorpStatus,
  ORG_TYPE_LABEL,
} from "../../types";
import { useOpsData, useSubmit } from "../../hooks";
import { formatDate } from "../../utils";
import {
  PageHeader,
  StatusBadge,
  DataTable,
  Modal,
  ConfirmModal,
  Loading,
  ErrorAlert,
  Empty,
} from "../../components";
import s from "../../ops.module.scss";

// ----------------------------------------------------------------
// Account-modal form
// ----------------------------------------------------------------
type AccForm = { email: string; displayName: string; password: string; role: string };
const EMPTY_ACC: AccForm = { email: "", displayName: "", password: "", role: "admin" };

type AccAction = { type: "set"; field: keyof AccForm; value: string } | { type: "reset" };

function accReducer(state: AccForm, action: AccAction): AccForm {
  if (action.type === "reset") return EMPTY_ACC;
  return { ...state, [action.field]: action.value };
}

// ----------------------------------------------------------------
// Confirm state type
// ----------------------------------------------------------------
type ConfirmTarget =
  | { kind: "account"; id: number }
  | { kind: "store"; id: number }
  | { kind: "corporation" }
  | { kind: "suspend" }
  | { kind: "activate" };

const CONFIRM_CFG: Record<ConfirmTarget["kind"], { title: string; message: string; label: string; danger: boolean }> = {
  account: {
    title: "アカウント削除",
    message: "このアカウントを削除しますか？",
    label: "削除する",
    danger: true,
  },
  store: {
    title: "店舗削除",
    message: "この店舗を削除しますか？\n関連データも削除されます。",
    label: "削除する",
    danger: true,
  },
  corporation: {
    title: "事業者削除",
    message: "この事業者を削除しますか？\n削除後は一覧に表示されなくなります。",
    label: "削除する",
    danger: true,
  },
  suspend: {
    title: "事業者を停止",
    message: "この事業者を停止しますか？\n停止中は店舗の公開ページやログインが無効になります。",
    label: "停止する",
    danger: true,
  },
  activate: {
    title: "事業者を稼働に戻す",
    message: "この事業者を再び稼働状態にしますか？",
    label: "稼働に戻す",
    danger: false,
  },
};

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------
export default function OpsCorporationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const corpPath = `/corporations/${id}`;

  const { data: corp, loading, error, reload } = useOpsData<CorporationDetail>(
    id ? corpPath : null,
    "取得に失敗しました",
  );

  const [editName, setEditName] = useState("");
  const [editOrgType, setEditOrgType] = useState<OrganizationType>("corporation");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const saveSubmit = useSubmit();

  // togglingStatus removed — handled via confirmTarget

  const [newStoreName, setNewStoreName] = useState("");
  const storeSubmit = useSubmit();

  const [showAccModal, setShowAccModal] = useState(false);
  const [accForm, accDispatch] = useReducer(accReducer, EMPTY_ACC);
  const accSubmit = useSubmit();

  const [resetResult, setResetResult] = useState<{ accountId: number; password: string } | null>(null);

  const [editingStoreId, setEditingStoreId] = useState<number | null>(null);
  const [editStoreName, setEditStoreName] = useState("");

  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  // sync edit fields when corp loads
  if (corp && editName === "" && editOrgType === "corporation" && corp.name !== "") {
    setEditName(corp.name);
    setEditOrgType(corp.organization_type ?? "corporation");
  }

  // ---- handlers ----
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMsg(null);
    await saveSubmit.run(
      () => putJson(corpPath, { name: editName.trim(), organizationType: editOrgType }),
      {
        errorMsg: "保存に失敗しました",
        onSuccess: () => {
          setSaveMsg("保存しました");
          setTimeout(() => setSaveMsg(null), 2000);
          reload();
        },
      },
    );
  };

  const requestToggleStatus = () => {
    if (!corp) return;
    setConfirmTarget(corp.status === "suspended" ? { kind: "activate" } : { kind: "suspend" });
  };

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newStoreName.trim();
    if (!name) return;
    await storeSubmit.run(
      () => postJson(`${corpPath}/stores`, { name }),
      {
        errorMsg: "店舗の追加に失敗しました",
        onSuccess: () => { setNewStoreName(""); reload(); },
      },
    );
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    await accSubmit.run(
      () => postJson(`${corpPath}/accounts`, {
        email: accForm.email.trim(),
        displayName: accForm.displayName.trim() || null,
        password: accForm.password,
        role: accForm.role,
      }),
      {
        errorMsg: "アカウントの追加に失敗しました",
        onSuccess: () => {
          setShowAccModal(false);
          accDispatch({ type: "reset" });
          reload();
        },
      },
    );
  };

  const handleResetPw = async (accountId: number) => {
    const r = await patchJson<{ newPassword: string }>(`${corpPath}/accounts/${accountId}/reset-password`);
    if (r.ok && r.data) setResetResult({ accountId, password: r.data.newPassword });
  };

  const handleSaveStore = async (storeId: number) => {
    const name = editStoreName.trim();
    if (!name) return;
    const r = await putJson(`${corpPath}/stores/${storeId}`, { name });
    if (r.ok) { setEditingStoreId(null); reload(); }
  };

  const handleConfirmAction = async () => {
    if (!confirmTarget) return;
    setDeleting(true);

    let ok = false;
    switch (confirmTarget.kind) {
      case "account": {
        const r = await deleteFetch(`${corpPath}/accounts/${confirmTarget.id}`);
        ok = r.ok;
        break;
      }
      case "store": {
        const r = await deleteFetch(`${corpPath}/stores/${confirmTarget.id}`);
        ok = r.ok;
        break;
      }
      case "corporation": {
        const r = await deleteFetch(corpPath);
        ok = r.ok;
        break;
      }
      case "suspend": {
        const r = await patchJson(`${corpPath}/status`, { status: "suspended" });
        ok = r.ok;
        break;
      }
      case "activate": {
        const r = await patchJson(`${corpPath}/status`, { status: "active" });
        ok = r.ok;
        break;
      }
    }

    setDeleting(false);
    setConfirmTarget(null);

    if (ok) {
      if (confirmTarget.kind === "corporation") {
        router.push(ROUTES.OPS_DASHBOARD);
      } else {
        reload();
      }
    }
  };

  // ---- render ----
  if (!id) {
    return (
      <div>
        <p className="text-danger">不正なURLです。</p>
        <Link href={ROUTES.OPS_DASHBOARD}>← 事業者一覧へ</Link>
      </div>
    );
  }

  if (loading) return <Loading />;
  if (error || !corp) {
    return (
      <div>
        <ErrorAlert message={error ?? "データがありません"} />
        <Link href={ROUTES.OPS_DASHBOARD}>← 事業者一覧へ</Link>
      </div>
    );
  }

  const isDeleted = !!corp.deleted_at;
  const displayStatus = isDeleted ? "deleted" as const : corp.status;
  const confirmCfg = confirmTarget ? CONFIRM_CFG[confirmTarget.kind] : null;

  const handleRestore = async () => {
    setDeleting(true);
    const r = await patchJson(`${corpPath}/restore`);
    setDeleting(false);
    if (r.ok) reload();
  };

  return (
    <div>
      <nav className="mb-3">
        <Link href={ROUTES.OPS_DASHBOARD} className="small text-body-secondary text-decoration-none">
          ← 事業者一覧
        </Link>
      </nav>

      {isDeleted && (
        <div className="alert alert-warning d-flex align-items-center justify-content-between mb-4">
          <span>この事業者は削除済みです。復旧すると再び利用可能になります。</span>
          <button className="btn btn-success btn-sm" onClick={handleRestore} disabled={deleting}>
            {deleting ? "復旧中…" : "復旧する"}
          </button>
        </div>
      )}

      {/* Header */}
      <div className={s.detailHeader}>
        <h1 className={`${s.pageTitle} ${isDeleted ? "text-body-secondary" : ""}`}>{corp.name}</h1>
        <StatusBadge status={displayStatus} />
      </div>
      <p className={s.detailMeta}>
        {corp.organization_type && <>{ORG_TYPE_LABEL[corp.organization_type]} / </>}
        登録: {formatDate(corp.created_at)}
        {corp.code && <> / Code: <code>{corp.code}</code></>}
      </p>

      {/* Edit card */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white">
          <span className="fw-semibold small">基本情報の編集</span>
        </div>
        <div className="card-body">
          <form onSubmit={handleSave} className="d-flex gap-2 flex-wrap align-items-end">
            <div className={s.fieldMinSm}>
              <label className="form-label small mb-0">種類</label>
              <select
                className="form-select form-select-sm"
                value={editOrgType}
                onChange={(e) => setEditOrgType(e.target.value as OrganizationType)}
              >
                <option value="corporation">法人</option>
                <option value="sole_proprietor">個人事業主</option>
              </select>
            </div>
            <div className={`flex-grow-1 ${s.fieldMinLg}`}>
              <label className="form-label small mb-0">名前</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-dark btn-sm" disabled={saveSubmit.submitting}>
              {saveSubmit.submitting ? "保存中…" : "保存"}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${corp.status === "suspended" ? "btn-outline-success" : "btn-outline-danger"}`}
              onClick={requestToggleStatus}
            >
              {corp.status === "suspended" ? "稼働に戻す" : "停止する"}
            </button>
          </form>
          {saveMsg && <p className="small text-success mt-2 mb-0">{saveMsg}</p>}
          <hr className="my-3" />
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => setConfirmTarget({ kind: "corporation" })}
          >
            この事業者を削除
          </button>
        </div>
      </div>

      {/* Stores */}
      <section className="mb-4">
        <div className={s.sectionHeader}>
          <h2 className="h6 mb-0">店舗一覧</h2>
        </div>
        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <form onSubmit={handleAddStore} className="d-flex gap-2 flex-wrap align-items-end mb-0">
              <div className={s.fieldMinMd}>
                <label className="form-label small mb-0">新規店舗名</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="例: 〇〇店"
                />
              </div>
              <button type="submit" className="btn btn-dark btn-sm" disabled={storeSubmit.submitting}>
                {storeSubmit.submitting ? "追加中…" : "店舗を追加"}
              </button>
            </form>
            {storeSubmit.error && <p className="small text-danger mt-2 mb-0">{storeSubmit.error}</p>}
          </div>
        </div>
        {corp.stores.length === 0 ? <Empty text="店舗がまだありません。" /> : (
          <DataTable
            rows={corp.stores}
            rowKey={(st) => st.id}
            columns={[
              {
                key: "name", header: "店舗名", render: (store) =>
                  editingStoreId === store.id ? (
                    <div className="d-flex gap-1">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={editStoreName}
                        onChange={(e) => setEditStoreName(e.target.value)}
                        onKeyDown={(e) => e.key === "Escape" && setEditingStoreId(null)}
                      />
                      <button className="btn btn-dark btn-sm" onClick={() => handleSaveStore(store.id)}>保存</button>
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditingStoreId(null)}>×</button>
                    </div>
                  ) : <span className="fw-medium">{store.name}</span>,
              },
              { key: "pid", header: "Public ID", className: "small text-body-secondary", render: (st) => <code>{st.public_id ?? "-"}</code> },
              { key: "date", header: "登録日", className: "small text-body-secondary", render: (st) => formatDate(st.created_at) },
              {
                key: "actions", header: "", render: (store) => (
                  <div className="d-flex gap-1">
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => { setEditingStoreId(store.id); setEditStoreName(store.name); }}>編集</button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => setConfirmTarget({ kind: "store", id: store.id })}>削除</button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </section>

      {/* Accounts */}
      <section>
        <div className={s.sectionHeader}>
          <h2 className="h6 mb-0">アカウント一覧</h2>
          <button className="btn btn-dark btn-sm" onClick={() => setShowAccModal(true)}>+ アカウント追加</button>
        </div>
        {corp.accounts.length === 0 ? <Empty text="アカウントがまだありません。" /> : (
          <DataTable
            rows={corp.accounts}
            rowKey={(a) => a.id}
            columns={[
              { key: "email", header: "メールアドレス", render: (a) => a.email },
              { key: "display", header: "表示名", render: (a) => <span className="text-body-secondary">{a.display_name ?? "-"}</span> },
              { key: "role", header: "ロール", render: (a) => <span className="badge bg-secondary">{a.role ?? "admin"}</span> },
              {
                key: "actions", header: "", render: (a) => (
                  <div className="d-flex gap-1 align-items-center flex-wrap">
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => handleResetPw(a.id)}>PW リセット</button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => setConfirmTarget({ kind: "account", id: a.id })}>削除</button>
                    {resetResult?.accountId === a.id && (
                      <span className="small text-success">新PW: <code>{resetResult.password}</code></span>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </section>

      {/* Add account modal */}
      {showAccModal && (
        <Modal title="アカウント追加" onClose={() => setShowAccModal(false)}>
          <form onSubmit={handleAddAccount}>
            <div className="mb-3">
              <label className="form-label small">メールアドレス</label>
              <input type="email" className="form-control form-control-sm" value={accForm.email} onChange={(e) => accDispatch({ type: "set", field: "email", value: e.target.value })} required />
            </div>
            <div className="mb-3">
              <label className="form-label small">表示名</label>
              <input type="text" className="form-control form-control-sm" value={accForm.displayName} onChange={(e) => accDispatch({ type: "set", field: "displayName", value: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label small">パスワード</label>
              <input type="text" className="form-control form-control-sm" value={accForm.password} onChange={(e) => accDispatch({ type: "set", field: "password", value: e.target.value })} required />
            </div>
            <div className="mb-3">
              <label className="form-label small">ロール</label>
              <select className="form-select form-select-sm" value={accForm.role} onChange={(e) => accDispatch({ type: "set", field: "role", value: e.target.value })}>
                <option value="admin">管理者</option>
                <option value="staff">スタッフ</option>
              </select>
            </div>
            {accSubmit.error && <p className="small text-danger mb-2">{accSubmit.error}</p>}
            <button type="submit" className="btn btn-dark btn-sm w-100" disabled={accSubmit.submitting}>
              {accSubmit.submitting ? "追加中…" : "追加する"}
            </button>
          </form>
        </Modal>
      )}

      {/* Delete confirm modal */}
      {confirmTarget && confirmCfg && (
        <ConfirmModal
          title={confirmCfg.title}
          message={confirmCfg.message}
          confirmLabel={confirmCfg.label}
          danger={confirmCfg.danger}
          loading={deleting}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}
