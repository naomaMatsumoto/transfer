"use client";

import { useState, useReducer, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/app/routes";
import { putJson, postJson, patchJson, deleteFetch } from "../../api";
import {
  CorporationDetail,
  OrganizationType,
  CorpStatus,
  ORG_TYPE_LABEL,
  STATUS_CFG,
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
    message: "この事業者を削除しますか？\n削除後は一覧に表示されなくなります（後から復旧可能）。",
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

  const [newStoreName, setNewStoreName] = useState("");
  const storeSubmit = useSubmit();

  const [showAccModal, setShowAccModal] = useState(false);
  const [accForm, accDispatch] = useReducer(accReducer, EMPTY_ACC);
  const accSubmit = useSubmit();

  const [resetResult, setResetResult] = useState<{ accountId: number; password: string } | null>(null);

  const [editingStoreId, setEditingStoreId] = useState<number | null>(null);
  const [editStoreName, setEditStoreName] = useState("");

  const [storeCalDays, setStoreCalDays] = useState<Record<number, string>>({});
  const [storeCalHours, setStoreCalHours] = useState<Record<number, string>>({});
  const [savingStoreId, setSavingStoreId] = useState<number | null>(null);
  const [calSavedStoreId, setCalSavedStoreId] = useState<number | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [roleChanging, setRoleChanging] = useState<number | null>(null);

  // sync edit fields when corp loads
  if (corp && editName === "" && editOrgType === "corporation" && corp.name !== "") {
    setEditName(corp.name);
    setEditOrgType(corp.organization_type ?? "corporation");
  }

  useEffect(() => {
    if (!corp?.stores?.length) return;
    setStoreCalDays((prev) => {
      const next = { ...prev };
      corp.stores.forEach((st) => {
        if (!(st.id in prev)) {
          next[st.id] = st.booking_deadline_days != null ? String(st.booking_deadline_days) : "";
        }
      });
      return next;
    });
    setStoreCalHours((prev) => {
      const next = { ...prev };
      corp.stores.forEach((st) => {
        if (!(st.id in prev)) {
          next[st.id] = st.cancel_deadline_hours != null ? String(st.cancel_deadline_hours) : "";
        }
      });
      return next;
    });
  }, [corp?.stores]);

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

  const setStatusDirect = async (newStatus: "pending" | "email_sent" | "active" | "suspended") => {
    if (!corp || corp.status === newStatus) return;
    const r = await patchJson(`${corpPath}/status`, { status: newStatus });
    if (r.ok) reload();
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
        onError: (data) => {
          const code = (data as { error?: string })?.error;
          if (code === "EMAIL_ALREADY_EXISTS") return "このメールアドレスは既に登録されています。別のメールアドレスを入力してください。";
          if (code === "EMAIL_PASSWORD_REQUIRED") return "メールアドレスとパスワードを入力してください。";
          return undefined;
        },
        onSuccess: () => {
          setShowAccModal(false);
          accDispatch({ type: "reset" });
          reload();
        },
      },
    );
  };

  const handleResetPw = async (accountId: number) => {
    setResetResult(null);
    const r = await patchJson<{ newPassword: string }>(`${corpPath}/accounts/${accountId}/reset-password`);
    if (r.ok && r.data) setResetResult({ accountId, password: r.data.newPassword });
  };

  const handleRoleChange = async (accountId: number, newRole: string) => {
    setRoleChanging(accountId);
    await patchJson(`${corpPath}/accounts/${accountId}`, { role: newRole });
    setRoleChanging(null);
    reload();
  };

  const handleSaveStore = async (storeId: number) => {
    const name = editStoreName.trim();
    if (!name) return;
    const r = await putJson(`${corpPath}/stores/${storeId}`, { name });
    if (r.ok) { setEditingStoreId(null); reload(); }
  };

  const handleSaveCalendar = async (storeId: number) => {
    setCalSavedStoreId(null);
    setSavingStoreId(storeId);
    try {
      const days = storeCalDays[storeId]?.trim();
      const hours = storeCalHours[storeId]?.trim();
      const r = await putJson(`${corpPath}/stores/${storeId}`, {
        booking_deadline_days: days === "" ? null : (parseInt(days, 10) || null),
        cancel_deadline_hours: hours === "" ? null : (parseInt(hours, 10) || null),
      });
      if (r.ok) {
        setCalSavedStoreId(storeId);
        setTimeout(() => setCalSavedStoreId(null), 2000);
        reload();
      }
    } finally {
      setSavingStoreId(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmTarget) return;
    setDeleting(true);

    let ok = false;
    switch (confirmTarget.kind) {
      case "account": {
        const r = await deleteFetch(`${corpPath}/accounts/${confirmTarget.id}`);
        ok = r.ok;
        if (!r.ok && (r.data as { error?: string })?.error === "AT_LEAST_ONE_ACCOUNT_REQUIRED") {
          setAccountError("メールアドレスは最低1件必要です。削除できません。");
        }
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
      setAccountError(null);
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
      {/* Breadcrumb */}
      <nav className="mb-3">
        <Link href={ROUTES.OPS_DASHBOARD} className="small text-body-secondary text-decoration-none">
          ← 事業者一覧
        </Link>
      </nav>

      {/* Deleted alert */}
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

      {/* Management cards: basic info + status side by side */}
      <div className="row g-3 mb-4">
        {/* Basic info */}
        <div className="col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white py-2">
              <span className="fw-semibold small">基本情報の編集</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleSave} className="d-flex gap-2 flex-wrap align-items-end">
                <div className={s.fieldMinSm}>
                  <label className="form-label small mb-1">種類</label>
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
                  <label className="form-label small mb-1">名前</label>
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
              </form>
              {saveSubmit.error && <p className="small text-danger mt-2 mb-0">{saveSubmit.error}</p>}
              {saveMsg && <p className="small text-success mt-2 mb-0">{saveMsg}</p>}
            </div>
          </div>
        </div>

        {/* Status management */}
        <div className="col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white py-2">
              <span className="fw-semibold small">ステータス管理</span>
            </div>
            <div className="card-body">
              <p className="small text-body-secondary mb-2">
                現在: <StatusBadge status={displayStatus} />
              </p>
              <div className="d-flex gap-1 flex-wrap">
                {(["pending", "email_sent", "active", "suspended"] as const).map((st) => {
                  const cfg = STATUS_CFG[st];
                  const isCurrent = corp.status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      className={`btn btn-sm ${isCurrent ? cfg.cls.replace("bg-", "btn-") : "btn-outline-secondary"}`}
                      disabled={isCurrent || isDeleted}
                      onClick={() => setStatusDirect(st)}
                    >
                      {cfg.text}
                    </button>
                  );
                })}
              </div>
              <p className="small text-body-secondary mt-2 mb-0">
                ボタンをクリックしてステータスを変更します。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stores */}
      <section className="mb-4">
        <div className={s.sectionHeader}>
          <h2 className="h6 mb-0">店舗一覧</h2>
        </div>

        {/* Add store form */}
        <div className="card shadow-sm mb-3">
          <div className="card-body py-3">
            <form onSubmit={handleAddStore} className="d-flex gap-2 flex-wrap align-items-end">
              <div className={s.fieldMinMd}>
                <label className="form-label small mb-1">新規店舗名</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="例: 〇〇店"
                />
              </div>
              <button type="submit" className="btn btn-dark btn-sm" disabled={storeSubmit.submitting}>
                {storeSubmit.submitting ? "追加中…" : "+ 店舗を追加"}
              </button>
            </form>
            {storeSubmit.error && <p className="small text-danger mt-2 mb-0">{storeSubmit.error}</p>}
          </div>
        </div>

        {/* Store list */}
        {corp.stores.length === 0 ? (
          <Empty text="店舗がまだありません。" />
        ) : (
          <div className="d-flex flex-column gap-2">
            {corp.stores.map((store) => (
              <div key={store.id} className="card shadow-sm">
                <div className="card-body py-3">
                  {/* Row 1: name + actions */}
                  <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                    <div className="flex-grow-1 min-width-0">
                      {editingStoreId === store.id ? (
                        <div className="d-flex gap-1 align-items-center">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editStoreName}
                            onChange={(e) => setEditStoreName(e.target.value)}
                            onKeyDown={(e) => e.key === "Escape" && setEditingStoreId(null)}
                            autoFocus
                          />
                          <button className="btn btn-dark btn-sm text-nowrap" onClick={() => handleSaveStore(store.id)}>保存</button>
                          <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditingStoreId(null)}>×</button>
                        </div>
                      ) : (
                        <div className="d-flex align-items-baseline gap-2 flex-wrap">
                          <span className="fw-medium">{store.name}</span>
                          {store.public_id && <code className="small text-body-secondary">{store.public_id}</code>}
                          <span className="small text-body-secondary">{formatDate(store.created_at)}</span>
                        </div>
                      )}
                    </div>
                    <div className="d-flex gap-1 flex-shrink-0">
                      <Link
                        href={`/ops/corporations/${id}/stores/${store.id}/events`}
                        className="btn btn-outline-primary btn-sm text-nowrap"
                      >
                        イベント・休講
                      </Link>
                      {editingStoreId !== store.id && (
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => { setEditingStoreId(store.id); setEditStoreName(store.name); }}
                        >
                          名前編集
                        </button>
                      )}
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => setConfirmTarget({ kind: "store", id: store.id })}
                      >
                        削除
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Calendar settings */}
                  <div className="mt-2 pt-2 border-top d-flex gap-3 align-items-end flex-wrap">
                    <span className="small text-body-secondary text-nowrap">カレンダー設定:</span>
                    <div>
                      <label className="form-label small mb-1 text-body-secondary">予約受付期限</label>
                      <div className="d-flex align-items-center gap-1">
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          style={{ width: "80px" }}
                          placeholder="制限なし"
                          min={0}
                          value={storeCalDays[store.id] ?? ""}
                          onChange={(e) => setStoreCalDays((prev) => ({ ...prev, [store.id]: e.target.value }))}
                          aria-label={`${store.name} 予約受付期限`}
                        />
                        <span className="small text-body-secondary text-nowrap">日前</span>
                      </div>
                    </div>
                    <div>
                      <label className="form-label small mb-1 text-body-secondary">キャンセル期限</label>
                      <div className="d-flex align-items-center gap-1">
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          style={{ width: "80px" }}
                          placeholder="制限なし"
                          min={0}
                          value={storeCalHours[store.id] ?? ""}
                          onChange={(e) => setStoreCalHours((prev) => ({ ...prev, [store.id]: e.target.value }))}
                          aria-label={`${store.name} キャンセル期限`}
                        />
                        <span className="small text-body-secondary text-nowrap">時間前</span>
                      </div>
                    </div>
                    <div className="d-flex align-items-end gap-2">
                      <button
                        type="button"
                        className="btn btn-dark btn-sm text-nowrap"
                        disabled={savingStoreId === store.id}
                        onClick={() => handleSaveCalendar(store.id)}
                      >
                        {savingStoreId === store.id ? "保存中…" : "設定保存"}
                      </button>
                      {calSavedStoreId === store.id && (
                        <span className="small text-success text-nowrap">保存しました</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Accounts */}
      <section className="mb-4">
        <div className={s.sectionHeader}>
          <h2 className="h6 mb-0">アカウント一覧</h2>
          <button
            className="btn btn-dark btn-sm"
            onClick={() => { setShowAccModal(true); setAccountError(null); }}
          >
            + アカウント追加
          </button>
        </div>

        {accountError && (
          <div className="alert alert-warning d-flex align-items-center justify-content-between py-2 mb-3" role="alert">
            <span className="small">{accountError}</span>
            <button type="button" className="btn-close btn-sm ms-2" onClick={() => setAccountError(null)} aria-label="閉じる" />
          </div>
        )}

        {/* PW reset result */}
        {resetResult && (
          <div className="alert alert-success d-flex align-items-center justify-content-between py-2 mb-3">
            <span className="small">
              パスワードをリセットしました。新しいパスワード:{" "}
              <code className="fw-bold">{resetResult.password}</code>
            </span>
            <button type="button" className="btn-close btn-sm ms-2" onClick={() => setResetResult(null)} aria-label="閉じる" />
          </div>
        )}

        {corp.accounts.length === 0 ? (
          <>
            <div className="alert alert-warning mb-3">
              アカウントは最低1件登録してください。右上のボタンから追加できます。
            </div>
            <Empty text="アカウントがまだありません。" />
          </>
        ) : (
          <DataTable
            rows={corp.accounts}
            rowKey={(a) => a.id}
            columns={[
              { key: "email", header: "メールアドレス", render: (a) => <span className="small">{a.email}</span> },
              { key: "display", header: "表示名", render: (a) => <span className="small text-body-secondary">{a.display_name ?? "-"}</span> },
              {
                key: "role", header: "ロール", render: (a) => (
                  <select
                    className="form-select form-select-sm"
                    style={{ width: "auto", minWidth: "90px" }}
                    value={a.role ?? "admin"}
                    disabled={roleChanging === a.id}
                    onChange={(e) => handleRoleChange(a.id, e.target.value)}
                  >
                    <option value="admin">管理者</option>
                    <option value="staff">スタッフ</option>
                  </select>
                ),
              },
              {
                key: "actions", header: "", render: (a) => {
                  const isOnlyAccount = corp.accounts.length === 1;
                  return (
                    <div className="d-flex gap-1">
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => handleResetPw(a.id)}>
                        PW リセット
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => setConfirmTarget({ kind: "account", id: a.id })}
                        disabled={isOnlyAccount}
                        title={isOnlyAccount ? "アカウントは最低1件必要です" : undefined}
                      >
                        削除
                      </button>
                    </div>
                  );
                },
              },
            ]}
          />
        )}
      </section>

      {/* Danger zone */}
      {!isDeleted && (
        <section>
          <div className="card border-danger">
            <div className="card-header bg-danger bg-opacity-10 py-2">
              <span className="fw-semibold small text-danger">危険な操作</span>
            </div>
            <div className="card-body">
              <p className="small text-body-secondary mb-3">
                事業者を削除すると一覧に表示されなくなります。削除後も「削除済み」フィルターから復旧できます。
              </p>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => setConfirmTarget({ kind: "corporation" })}
              >
                この事業者を削除する
              </button>
            </div>
          </div>
        </section>
      )}

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

      {/* Confirm modal */}
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
