"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getApiBase, apiFetch } from "@/app/lib/api";
import { EventsTab } from "@/app/admin/reservations/_tabs/EventsTab";
import { useFlash } from "@/app/lib/useFlash";
import { FlashToast } from "@/app/lib/FlashToast";
import { useOpsData } from "../../../../../hooks";
import { CorporationDetail } from "../../../../../types";
import s from "../../../../../ops.module.scss";

type ClassType = { id: number; code: string; name: string; description?: string | null };
type User = {
  id: number;
  name: string;
  furigana?: string | null;
  email?: string | null;
  phone?: string | null;
  course_type?: string | null;
  stage?: string;
  status?: string;
};
type Staff = { id: number; name: string };

type Tab = "events" | "classTypes" | "users";

// ─── クラス種別タブ ───────────────────────────────────────────────
function ClassTypesPanel({
  apiBase,
  flash,
  flashErr,
}: {
  apiBase: string;
  flash: (m: string) => void;
  flashErr: (m: string) => void;
}) {
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ClassType | null>(null);

  const load = useCallback(async () => {
    const r = await apiFetch(`${apiBase}/class-types`);
    const d = r.ok ? await r.json() : [];
    setClassTypes(Array.isArray(d) ? d : []);
  }, [apiBase]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      flashErr("名前は必須です");
      return;
    }
    const r = await apiFetch(`${apiBase}/class-types`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newCode.trim() || undefined,
        name: newName.trim(),
        description: newDesc.trim() || null,
      }),
    });
    if (!r.ok) {
      flashErr("クラス種別の作成に失敗しました");
      return;
    }
    flash("クラス種別を追加しました");
    setNewCode("");
    setNewName("");
    setNewDesc("");
    void load();
  };

  const startEdit = (ct: ClassType) => {
    setEditId(ct.id);
    setEditCode(ct.code);
    setEditName(ct.name);
    setEditDesc(ct.description ?? "");
  };

  const handleUpdate = async () => {
    if (!editId || !editName.trim()) {
      flashErr("名前は必須です");
      return;
    }
    const r = await apiFetch(`${apiBase}/class-types/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: editCode.trim() || undefined,
        name: editName.trim(),
        description: editDesc.trim() || null,
      }),
    });
    if (!r.ok) {
      flashErr("更新に失敗しました");
      return;
    }
    flash(`クラス種別 #${editId} を更新しました`);
    setEditId(null);
    void load();
  };

  const handleDelete = async (ct: ClassType) => {
    setDeleteTarget(null);
    const r = await apiFetch(`${apiBase}/class-types/${ct.id}`, { method: "DELETE" });
    if (!r.ok) {
      flashErr("削除に失敗しました（使用中のクラス種別は削除できません）");
      return;
    }
    flash(`クラス種別 #${ct.id} を削除しました`);
    void load();
  };

  return (
    <div>
      <div className="card mb-3 card-body">
        <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>クラス種別を追加</h3>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr auto", gap: "8px", alignItems: "end" }}>
          <div>
            <span className="form-label small">コード（任意）</span>
            <input
              type="text"
              className="form-control form-control-sm"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="例: kakekko"
            />
          </div>
          <div>
            <span className="form-label small">名前</span>
            <input
              type="text"
              className="form-control form-control-sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="かけっこ"
            />
          </div>
          <div>
            <span className="form-label small">説明（任意）</span>
            <input
              type="text"
              className="form-control form-control-sm"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="説明"
            />
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleCreate}>
            追加
          </button>
        </div>
      </div>

      <div className="card mb-3">
        <table className="table table-striped table-hover mb-0">
          <thead>
            <tr>
              <th style={{ width: "56px" }}>ID</th>
              <th style={{ width: "140px" }}>コード</th>
              <th style={{ minWidth: "120px" }}>名前</th>
              <th>説明</th>
              <th style={{ width: "160px" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {classTypes.map((ct) => (
              <tr key={ct.id} style={{ verticalAlign: editId === ct.id ? "top" : undefined }}>
                <td>{ct.id}</td>
                {editId === ct.id ? (
                  <>
                    <td>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                      />
                    </td>
                    <td>
                      <span className="btn-group btn-group-sm">
                        <button type="button" className="btn btn-success" onClick={handleUpdate}>
                          保存
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setEditId(null)}>
                          取消
                        </button>
                      </span>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{ct.code}</td>
                    <td style={{ fontWeight: 600 }}>{ct.name}</td>
                    <td style={{ fontSize: "12px", color: "#6b7280" }}>{ct.description ?? "—"}</td>
                    <td>
                      <span className="btn-group btn-group-sm">
                        <button type="button" className="btn btn-primary" onClick={() => startEdit(ct)}>
                          編集
                        </button>
                        <button type="button" className="btn btn-danger" onClick={() => setDeleteTarget(ct)}>
                          削除
                        </button>
                      </span>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {classTypes.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-body-secondary py-4">
                  クラス種別がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div
          className="modal fade show d-block bg-black bg-opacity-50"
          style={{ zIndex: 1050 }}
          onClick={() => setDeleteTarget(null)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">クラス種別の削除</h5>
              </div>
              <div className="modal-body">
                「{deleteTarget.name}」（#{deleteTarget.id}）を削除します。この操作は取り消せません。
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                  キャンセル
                </button>
                <button type="button" className="btn btn-danger" onClick={() => handleDelete(deleteTarget)}>
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 会員タブ ────────────────────────────────────────────────────
const STAGE_OPTIONS = [
  { value: "preschool", label: "未就学児" },
  { value: "elementary", label: "小学生" },
  { value: "junior_high", label: "中学生" },
  { value: "high_school", label: "高校生" },
  { value: "adult", label: "大人" },
  { value: "other", label: "その他" },
];

type UserForm = {
  name: string;
  furigana: string;
  email: string;
  password: string;
  phone: string;
  courseType: string;
  stage: string;
};

function MemberForm({ form, setForm, isEdit }: { form: UserForm; setForm: (f: UserForm) => void; isEdit?: boolean }) {
  return (
    <div className="d-flex flex-column gap-2">
      {[
        { label: "名前", field: "name" as keyof UserForm, required: true, placeholder: "山田 太郎" },
        { label: "フリガナ（任意）", field: "furigana" as keyof UserForm, placeholder: "ヤマダ タロウ" },
        { label: "メール（任意）", field: "email" as keyof UserForm, type: "email", placeholder: "user@example.com" },
        {
          label: isEdit ? "パスワード（変更時のみ）" : "パスワード（任意）",
          field: "password" as keyof UserForm,
          type: "password",
          placeholder: isEdit ? "空欄のままなら変更しません" : "カレンダー・振替予約で使用",
        },
        { label: "電話番号（任意）", field: "phone" as keyof UserForm, placeholder: "090-1234-5678" },
        { label: "コース種別（任意）", field: "courseType" as keyof UserForm, placeholder: "—" },
      ].map(({ label, field, type, placeholder, required }) => (
        <div key={field}>
          <label className="form-label small mb-1">{label}</label>
          <input
            type={type ?? "text"}
            className="form-control form-control-sm"
            value={form[field]}
            required={required}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            placeholder={placeholder}
            autoComplete={field === "password" ? "new-password" : undefined}
          />
        </div>
      ))}
      <div>
        <label className="form-label small mb-1">ステータス</label>
        <select
          className="form-select form-select-sm"
          value={form.stage}
          onChange={(e) => setForm({ ...form, stage: e.target.value })}
        >
          {STAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function UsersPanel({
  apiBase,
  flash,
  flashErr,
}: {
  apiBase: string;
  flash: (m: string) => void;
  flashErr: (m: string) => void;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const EMPTY: UserForm = {
    name: "",
    furigana: "",
    email: "",
    password: "",
    phone: "",
    courseType: "",
    stage: "other",
  };
  const [addForm, setAddForm] = useState<UserForm>(EMPTY);
  const [editForm, setEditForm] = useState<UserForm>(EMPTY);

  const load = useCallback(async () => {
    const r = await apiFetch(`${apiBase}/users`);
    const d = r.ok ? await r.json() : [];
    setUsers(Array.isArray(d) ? d : []);
  }, [apiBase]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!addForm.name.trim()) {
      flashErr("名前は必須です");
      return;
    }
    const r = await apiFetch(`${apiBase}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addForm.name.trim(),
        furigana: addForm.furigana.trim() || null,
        email: addForm.email.trim() || null,
        password: addForm.password.trim() || null,
        phone: addForm.phone.trim() || null,
        course_type: addForm.courseType.trim() || null,
        stage: addForm.stage,
      }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      if (d?.error === "MEMBER_EMAIL_DUPLICATE") {
        flashErr("このメールアドレスは既に登録されています");
        return;
      }
      flashErr("会員の登録に失敗しました");
      return;
    }
    flash("会員を登録しました");
    setAddForm(EMPTY);
    setShowAdd(false);
    void load();
  };

  const startEdit = (u: User) => {
    setEditId(u.id);
    setEditForm({
      name: u.name,
      furigana: u.furigana ?? "",
      email: u.email ?? "",
      password: "",
      phone: u.phone ?? "",
      courseType: u.course_type ?? "",
      stage: u.stage ?? "other",
    });
  };

  const handleUpdate = async () => {
    if (!editId || !editForm.name.trim()) {
      flashErr("名前は必須です");
      return;
    }
    const body: Record<string, unknown> = {
      name: editForm.name.trim(),
      furigana: editForm.furigana.trim() || null,
      email: editForm.email.trim() || null,
      phone: editForm.phone.trim() || null,
      course_type: editForm.courseType.trim() || null,
      stage: editForm.stage,
    };
    if (editForm.password.trim()) body.password = editForm.password.trim();
    const r = await apiFetch(`${apiBase}/users/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      flashErr("更新に失敗しました");
      return;
    }
    flash(`会員 #${editId} を更新しました`);
    setEditId(null);
    void load();
  };

  const handleDelete = async (u: User) => {
    setDeleteTarget(null);
    const r = await apiFetch(`${apiBase}/users/${u.id}`, { method: "DELETE" });
    if (!r.ok) {
      flashErr("削除に失敗しました（振替権利または予約が紐づいています）");
      return;
    }
    flash(`会員 #${u.id} を削除しました`);
    void load();
  };

  return (
    <div>
      <div className="mb-3">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            setShowAdd(true);
            setEditId(null);
          }}
        >
          + 会員を追加
        </button>
      </div>

      <div className="card shadow-sm overflow-hidden mb-3">
        <div className="table-responsive">
          <table className="table table-striped table-hover mb-0" style={{ minWidth: "800px" }}>
            <thead>
              <tr>
                <th style={{ width: "56px" }}>ID</th>
                <th>名前</th>
                <th>フリガナ</th>
                <th>メール</th>
                <th>電話</th>
                <th>コース</th>
                <th>ステータス</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td className="fw-semibold">{u.name}</td>
                  <td className="text-body-secondary small">{u.furigana ?? "—"}</td>
                  <td className="text-body-secondary small">{u.email ?? "—"}</td>
                  <td className="text-body-secondary small">{u.phone ?? "—"}</td>
                  <td className="text-body-secondary small">{u.course_type ?? "—"}</td>
                  <td>
                    <span className="badge bg-success">
                      {STAGE_OPTIONS.find((o) => o.value === u.stage)?.label ?? u.stage ?? "—"}
                    </span>
                  </td>
                  <td>
                    <span className="btn-group btn-group-sm">
                      <button type="button" className="btn btn-primary" onClick={() => startEdit(u)}>
                        編集
                      </button>
                      <button type="button" className="btn btn-danger" onClick={() => setDeleteTarget(u)}>
                        削除
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-body-secondary py-4">
                    会員がいません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 追加モーダル */}
      {showAdd && (
        <div
          className="modal fade show d-block bg-black bg-opacity-50"
          style={{ zIndex: 1050 }}
          onClick={() => setShowAdd(false)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">会員を新規登録</h5>
              </div>
              <div className="modal-body">
                <MemberForm form={addForm} setForm={setAddForm} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>
                  キャンセル
                </button>
                <button type="button" className="btn btn-success" onClick={handleCreate}>
                  登録
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {editId !== null && (
        <div
          className="modal fade show d-block bg-black bg-opacity-50"
          style={{ zIndex: 1050 }}
          onClick={() => setEditId(null)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">会員を編集（#{editId}）</h5>
              </div>
              <div className="modal-body">
                <MemberForm form={editForm} setForm={setEditForm} isEdit />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditId(null)}>
                  キャンセル
                </button>
                <button type="button" className="btn btn-success" onClick={handleUpdate}>
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div
          className="modal fade show d-block bg-black bg-opacity-50"
          style={{ zIndex: 1050 }}
          onClick={() => setDeleteTarget(null)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">会員の削除</h5>
              </div>
              <div className="modal-body">
                「{deleteTarget.name}」（#{deleteTarget.id}
                ）を削除します。振替権利・予約が紐づいている場合は削除できません。
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                  キャンセル
                </button>
                <button type="button" className="btn btn-danger" onClick={() => handleDelete(deleteTarget)}>
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── メインページ ──────────────────────────────────────────────
export default function OpsStoreEventsPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const storeId = params?.storeId as string | undefined;

  const apiBase = id && storeId ? `${getApiBase()}/ops/corporations/${id}/stores/${storeId}` : "";

  const { data: corp } = useOpsData<CorporationDetail>(id ? `/corporations/${id}` : null, "");
  const store = corp?.stores?.find((s) => String(s.id) === storeId);

  const [tab, setTab] = useState<Tab>("events");
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const { msg, err, msgExiting, errExiting, flash, flashErr } = useFlash();

  useEffect(() => {
    if (!apiBase) return;
    apiFetch(`${apiBase}/class-types`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setClassTypes(Array.isArray(d) ? d : []))
      .catch(() => {});
    apiFetch(`${apiBase}/staff`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setStaff(Array.isArray(d) ? d : []))
      .catch(() => {});
    apiFetch(`${apiBase}/users`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [apiBase]);

  if (!id || !storeId || !apiBase) {
    return (
      <div className={s.centered}>
        <p className="text-danger">不正なURLです。</p>
        <Link href="/ops">← 事業者一覧へ</Link>
      </div>
    );
  }

  const TAB_LABELS: { key: Tab; label: string }[] = [
    { key: "events", label: "イベント・休講・予約" },
    { key: "classTypes", label: "クラス種別" },
    { key: "users", label: "会員" },
  ];

  return (
    <div className={s.page}>
      <nav className="mb-3" aria-label="パンくず">
        <Link href="/ops" className="text-body-secondary small me-2">
          事業者一覧
        </Link>
        <span className="text-body-secondary small me-2">/</span>
        <Link href={`/ops/corporations/${id}`} className="text-body-secondary small me-2">
          {corp?.name ?? "事業者"}
        </Link>
        <span className="text-body-secondary small me-2">/</span>
        <span className="small fw-medium">{store?.name ?? `店舗 #${storeId}`}</span>
      </nav>

      <h1 className="h4 mb-3">{store?.name ?? `店舗 #${storeId}`}</h1>

      <FlashToast msg={msg} err={err} msgExiting={msgExiting} errExiting={errExiting} />

      <ul className="nav nav-tabs mb-4">
        {TAB_LABELS.map(({ key, label }) => (
          <li key={key} className="nav-item">
            <button type="button" className={`nav-link ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
              {label}
            </button>
          </li>
        ))}
      </ul>

      {tab === "events" && (
        <EventsTab
          classTypes={classTypes}
          users={users}
          staff={staff}
          flash={flash}
          flashErr={flashErr}
          apiBase={apiBase}
        />
      )}
      {tab === "classTypes" && <ClassTypesPanel apiBase={apiBase} flash={flash} flashErr={flashErr} />}
      {tab === "users" && <UsersPanel apiBase={apiBase} flash={flash} flashErr={flashErr} />}
    </div>
  );
}
