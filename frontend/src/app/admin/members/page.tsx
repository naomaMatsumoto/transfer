"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { getApiErrorMessage } from "@/app/lib/apiErrors";

const API_BASE = (() => {
  const u = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (u && (u.startsWith("http://") || u.startsWith("https://"))) return u.replace(/\/$/, "");
  return "http://localhost:4000";
})();
const FLASH_VISIBLE_MS = 3000;
const FLASH_ERR_VISIBLE_MS = 5000;
const FLASH_EXIT_ANIMATION_MS = 300;
const MEMBERS_PER_PAGE = 50;

type Member = {
  id: number;
  name: string;
  furigana: string | null;
  email: string | null;
  address: string | null;
  phone: string | null;
  course_type: string | null;
  stage: string;
  status?: string;
  created_at?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(s: string): boolean {
  return s.length > 0 && s.length <= 255 && EMAIL_REGEX.test(s);
}

function isMemberEmailError(code: string): boolean {
  return code === "MEMBER_EMAIL_INVALID" || code === "MEMBER_EMAIL_DUPLICATE";
}

function ConfirmModal({
  open,
  title,
  children,
  onConfirm,
  onCancel,
  confirmLabel = "実行",
  confirmColor = "#3b82f6",
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  confirmColor?: string;
}) {
  if (!open) return null;
  return (
    <div className="modal fade show d-block bg-black bg-opacity-50" style={{ zIndex: 1050 }} onClick={onCancel}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
          </div>
          <div className="modal-body">{children}</div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              キャンセル
            </button>
            <button
              type="button"
              className={confirmColor === "#991b1b" ? "btn btn-danger" : "btn btn-primary"}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const stageOptions = [
  { value: "preschool", label: "未就学児" },
  { value: "elementary", label: "小学生" },
  { value: "junior_high", label: "中学生" },
  { value: "high_school", label: "高校生" },
  { value: "adult", label: "大人" },
  { value: "other", label: "その他" },
];

function AddMemberModal({
  open,
  name,
  setName,
  furigana,
  setFurigana,
  email,
  setEmail,
  address,
  setAddress,
  phone,
  setPhone,
  courseType,
  setCourseType,
  stage,
  setStage,
  formError,
  setFormError,
  onSave,
  onCancel,
}: {
  open: boolean;
  name: string;
  setName: (v: string) => void;
  furigana: string;
  setFurigana: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  courseType: string;
  setCourseType: (v: string) => void;
  stage: string;
  setStage: (v: string) => void;
  formError: { field: string; message: string } | null;
  setFormError: (v: { field: string; message: string } | null) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal fade show d-block bg-black bg-opacity-50" style={{ zIndex: 1050 }} onClick={onCancel}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">会員を新規登録</h5>
          </div>
          <div className="modal-body">
          <div className="d-flex flex-column gap-3 mb-0">
          <div className="mb-2">
            <label className="form-label">名前</label>
            <input
              type="text"
              className={`form-control ${formError?.field === "name" ? "is-invalid" : ""}`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (formError?.field === "name") setFormError(null);
              }}
              placeholder="山田 太郎"
            />
            {formError?.field === "name" && <div className="invalid-feedback d-block">{formError.message}</div>}
          </div>
          <div className="mb-2">
            <label className="form-label">フリガナ（任意）</label>
            <input type="text" className="form-control" value={furigana} onChange={(e) => setFurigana(e.target.value)} placeholder="ヤマダ タロウ" />
          </div>
          <div className="mb-2">
            <label className="form-label">メール（任意）</label>
            <input type="email" className={`form-control ${formError?.field === "email" ? "is-invalid" : ""}`} value={email} onChange={(e) => { setEmail(e.target.value); if (formError?.field === "email") setFormError(null); }} placeholder="user@example.com" />
            {formError?.field === "email" && <div className="invalid-feedback d-block">{formError.message}</div>}
          </div>
          <div className="mb-2">
            <label className="form-label">住所（任意）</label>
            <input type="text" className="form-control" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="〇〇市〇〇町1-2-3" />
          </div>
          <div className="mb-2">
            <label className="form-label">電話番号（任意）</label>
            <input type="tel" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="090-1234-5678" />
          </div>
          <div className="mb-2">
            <label className="form-label">コース種別</label>
            <input type="text" className="form-control" value={courseType} onChange={(e) => setCourseType(e.target.value)} placeholder="—" />
          </div>
          <div className="mb-2">
            <label className="form-label">ステータス</label>
            <select className="form-select" value={stage} onChange={(e) => setStage(e.target.value)}>
              {stageOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>キャンセル</button>
            <button type="button" className="btn btn-success" onClick={onSave}>登録</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditMemberModal({
  open,
  editId,
  name,
  setName,
  furigana,
  setFurigana,
  email,
  setEmail,
  address,
  setAddress,
  phone,
  setPhone,
  courseType,
  setCourseType,
  stage,
  setStage,
  formError,
  setFormError,
  onSave,
  onCancel,
}: {
  open: boolean;
  editId: number | null;
  name: string;
  setName: (v: string) => void;
  furigana: string;
  setFurigana: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  courseType: string;
  setCourseType: (v: string) => void;
  stage: string;
  setStage: (v: string) => void;
  formError: { field: string; message: string } | null;
  setFormError: (v: { field: string; message: string } | null) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!open || !editId) return null;
  return (
    <div className="modal fade show d-block bg-black bg-opacity-50" style={{ zIndex: 1050 }} onClick={onCancel}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">会員を編集（#{editId}）</h5>
          </div>
          <div className="modal-body">
          <div className="d-flex flex-column gap-0 mb-0">
          <div className="mb-2">
            <label className="form-label">名前</label>
            <input type="text" className={`form-control ${formError?.field === "name" ? "is-invalid" : ""}`} value={name} onChange={(e) => { setName(e.target.value); if (formError?.field === "name") setFormError(null); }} placeholder="山田 太郎" />
            {formError?.field === "name" && <div className="invalid-feedback d-block">{formError.message}</div>}
          </div>
          <div className="mb-2">
            <label className="form-label">フリガナ（任意）</label>
            <input type="text" className="form-control" value={furigana} onChange={(e) => setFurigana(e.target.value)} placeholder="ヤマダ タロウ" />
          </div>
          <div className="mb-2">
            <label className="form-label">メール（任意）</label>
            <input type="email" className={`form-control ${formError?.field === "email" ? "is-invalid" : ""}`} value={email} onChange={(e) => { setEmail(e.target.value); if (formError?.field === "email") setFormError(null); }} placeholder="user@example.com" />
            {formError?.field === "email" && <div className="invalid-feedback d-block">{formError.message}</div>}
          </div>
          <div className="mb-2">
            <label className="form-label">住所（任意）</label>
            <input type="text" className="form-control" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="〇〇市〇〇町1-2-3" />
          </div>
          <div className="mb-2">
            <label className="form-label">電話番号（任意）</label>
            <input type="tel" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="090-1234-5678" />
          </div>
          <div className="mb-2">
            <label className="form-label">コース種別</label>
            <input type="text" className="form-control" value={courseType} onChange={(e) => setCourseType(e.target.value)} placeholder="—" />
          </div>
          <div className="mb-2">
            <label className="form-label">ステータス</label>
            <select className="form-select" value={stage} onChange={(e) => setStage(e.target.value)}>
              {stageOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>キャンセル</button>
            <button type="button" className="btn btn-success" onClick={onSave}>保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [msgExiting, setMsgExiting] = useState(false);
  const [errExiting, setErrExiting] = useState(false);
  const flashTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      flashTimeoutsRef.current.forEach((t) => clearTimeout(t));
      flashTimeoutsRef.current = [];
    };
  }, []);

  const flash = useCallback((m: string) => {
    setErr("");
    setErrExiting(false);
    setMsg(m);
    setMsgExiting(false);
    flashTimeoutsRef.current.forEach((t) => clearTimeout(t));
    flashTimeoutsRef.current = [];
    flashTimeoutsRef.current.push(
      setTimeout(() => {
        setMsgExiting(true);
        flashTimeoutsRef.current.push(
          setTimeout(() => {
            setMsg("");
          }, FLASH_EXIT_ANIMATION_MS),
        );
      }, FLASH_VISIBLE_MS),
    );
  }, []);

  const flashErr = useCallback((m: string) => {
    setMsg("");
    setMsgExiting(false);
    setErr(m);
    setErrExiting(false);
    flashTimeoutsRef.current.forEach((t) => clearTimeout(t));
    flashTimeoutsRef.current = [];
    flashTimeoutsRef.current.push(
      setTimeout(() => {
        setErrExiting(true);
        flashTimeoutsRef.current.push(
          setTimeout(() => setErr(""), FLASH_EXIT_ANIMATION_MS),
        );
      }, FLASH_ERR_VISIBLE_MS),
    );
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/users`);
      if (!res.ok) throw new Error("failed");
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error("APIがJSONを返していません。バックエンドが起動しているか確認してください。");
      }
      const data = await res.json();
      setMembers(data);
    } catch (e) {
      const isNetwork = e instanceof TypeError && e.message === "Failed to fetch";
      flashErr(isNetwork ? "バックエンドに接続できません。backend で npm run dev を実行していますか？" : "会員一覧の読み込みに失敗しました");
    }
  }, [flashErr]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // 新規
  const [newName, setNewName] = useState("");
  const [newFurigana, setNewFurigana] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCourseType, setNewCourseType] = useState("");
  const [newStage, setNewStage] = useState<string>("other");

  // 編集中
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editFurigana, setEditFurigana] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCourseType, setEditCourseType] = useState("");
  const [editStage, setEditStage] = useState<string>("other");

  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // フィルター
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterStage, setFilterStage] = useState<string>("");

  const filteredMembers = useMemo(() => {
    let list = members;
    const kw = filterKeyword.trim().toLowerCase();
    if (kw) {
      list = list.filter((m) => {
        const name = (m.name ?? "").toLowerCase();
        const furigana = (m.furigana ?? "").toLowerCase();
        const email = (m.email ?? "").toLowerCase();
        const address = (m.address ?? "").toLowerCase();
        const phone = (m.phone ?? "").toLowerCase();
        const course = (m.course_type ?? "").toLowerCase();
        return name.includes(kw) || furigana.includes(kw) || email.includes(kw) || address.includes(kw) || phone.includes(kw) || course.includes(kw);
      });
    }
    if (filterStage) {
      list = list.filter((m) => (m.stage ?? "") === filterStage);
    }
    return list;
  }, [members, filterKeyword, filterStage]);

  const [page, setPage] = useState(1);
  const totalFiltered = filteredMembers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / MEMBERS_PER_PAGE));
  const paginatedMembers = useMemo(
    () => filteredMembers.slice((page - 1) * MEMBERS_PER_PAGE, page * MEMBERS_PER_PAGE),
    [filteredMembers, page]
  );

  useEffect(() => {
    setPage((p) => (p > totalPages && totalPages > 0 ? totalPages : p));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [filterKeyword, filterStage]);

  const [newFormError, setNewFormError] = useState<{ field: string; message: string } | null>(null);
  const [editFormError, setEditFormError] = useState<{ field: string; message: string } | null>(null);

  const handleCreate = async () => {
    setNewFormError(null);
    if (!newName.trim()) {
      setNewFormError({ field: "name", message: "名前は必須です" });
      return;
    }
    const emailVal = newEmail.trim() || null;
    if (emailVal !== null && !isValidEmail(emailVal)) {
      setNewFormError({ field: "email", message: "メールアドレスの形式が正しくありません" });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          furigana: newFurigana.trim() || null,
          email: emailVal,
          address: newAddress.trim() || null,
          phone: newPhone.trim() || null,
          course_type: newCourseType.trim() || null,
          stage: newStage,
        }),
      });
      let data: { error?: string };
      try {
        data = await res.json();
      } catch {
        setNewFormError({
          field: "name",
          message: res.ok ? "応答の解析に失敗しました" : "バックエンドが起動しているか確認してください。",
        });
        return;
      }
      if (!res.ok) {
        const code = data.error ?? "";
        const errMsg = getApiErrorMessage(code);
        setNewFormError({
          field: isMemberEmailError(code) ? "email" : "name",
          message: errMsg,
        });
        return;
      }
      flash("会員を追加しました");
      setShowAddModal(false);
      setNewFormError(null);
      setNewName("");
      setNewFurigana("");
      setNewEmail("");
      setNewAddress("");
      setNewPhone("");
      setNewCourseType("");
      setNewStage("other");
      loadMembers();
    } catch (e) {
      const isNetwork = e instanceof TypeError && e.message === "Failed to fetch";
      setNewFormError({
        field: "name",
        message: isNetwork
          ? "バックエンドに接続できません。ターミナルで backend フォルダで npm run dev が動いているか確認してください。"
          : "通信エラーが発生しました。",
      });
    }
  };

  const startEdit = (m: Member) => {
    setEditId(m.id);
    setEditName(m.name);
    setEditFurigana(m.furigana ?? "");
    setEditEmail(m.email ?? "");
    setEditAddress(m.address ?? "");
    setEditPhone(m.phone ?? "");
    setEditCourseType(m.course_type ?? "");
    setEditStage(m.stage || "other");
    setEditFormError(null);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditFormError(null);
  };

  const handleUpdate = async () => {
    if (!editId) return;
    setEditFormError(null);
    if (!editName.trim()) {
      setEditFormError({ field: "name", message: "名前は必須です" });
      return;
    }
    const emailVal = editEmail.trim() || null;
    const res = await fetch(`${API_BASE}/admin/users/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        furigana: editFurigana.trim() || null,
        email: emailVal,
        address: editAddress.trim() || null,
        phone: editPhone.trim() || null,
        course_type: editCourseType.trim() || null,
        stage: editStage,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const code = data.error ?? "";
      const errMsg = getApiErrorMessage(code);
      setEditFormError({
        field: isMemberEmailError(code) ? "email" : "name",
        message: errMsg,
      });
      return;
    }
    flash(`会員 #${editId} を更新しました`);
    setEditId(null);
    setEditFormError(null);
    loadMembers();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    const res = await fetch(`${API_BASE}/admin/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      flashErr(getApiErrorMessage(data.error));
      return;
    }
    flash(`会員 #${id} を削除しました`);
    loadMembers();
  };

  return (
    <>
      <h1 className="h3 mb-4">会員管理</h1>

      {msg && (
        <div className={`alert alert-success alert-dismissible fade show mb-3 ${msgExiting ? "fade" : ""}`} role="alert">
          {msg}
        </div>
      )}
      {err && (
        <div className={`alert alert-danger alert-dismissible fade show mb-3 ${errExiting ? "fade" : ""}`} role="alert">
          {err}
        </div>
      )}

      <AddMemberModal
        open={showAddModal}
        name={newName}
        setName={setNewName}
        furigana={newFurigana}
        setFurigana={setNewFurigana}
        email={newEmail}
        setEmail={setNewEmail}
        address={newAddress}
        setAddress={setNewAddress}
        phone={newPhone}
        setPhone={setNewPhone}
        courseType={newCourseType}
        setCourseType={setNewCourseType}
        stage={newStage}
        setStage={setNewStage}
        formError={newFormError}
        setFormError={setNewFormError}
        onSave={handleCreate}
        onCancel={() => {
          setShowAddModal(false);
          setNewFormError(null);
        }}
      />

      <EditMemberModal
        open={editId !== null}
        editId={editId}
        name={editName}
        setName={setEditName}
        furigana={editFurigana}
        setFurigana={setEditFurigana}
        email={editEmail}
        setEmail={setEditEmail}
        address={editAddress}
        setAddress={setEditAddress}
        phone={editPhone}
        setPhone={setEditPhone}
        courseType={editCourseType}
        setCourseType={setEditCourseType}
        stage={editStage}
        setStage={setEditStage}
        formError={editFormError}
        setFormError={setEditFormError}
        onSave={handleUpdate}
        onCancel={cancelEdit}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="会員の削除"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="削除する"
        confirmColor="#991b1b"
      >
        {deleteTarget && (
          <>
            会員「{deleteTarget.name}」（#{deleteTarget.id}）を削除します。振替権利・予約が紐づいている場合は削除できません。この操作は取り消せません。
          </>
        )}
      </ConfirmModal>

      {/* 会員追加ボタン・フィルター */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <button type="button" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          会員を追加
        </button>
        <div className="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
          <input
            type="text"
            className="form-control"
            style={{ maxWidth: "360px" }}
            placeholder="キーワード（名前・フリガナ・メール・住所・電話・コース）"
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
          />
          <select
            className="form-select"
            style={{ width: "auto", minWidth: "140px" }}
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
          >
            <option value="">すべてのステータス</option>
            {stageOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {(filterKeyword.trim() || filterStage) && (
            <button type="button" className="btn btn-secondary" onClick={() => { setFilterKeyword(""); setFilterStage(""); }}>
              クリア
            </button>
          )}
        </div>
      </div>

      <div className="card shadow-sm overflow-hidden">
        <div className="table-responsive" style={{ overflowX: "auto" }}>
        <table className="table table-striped table-hover mb-0" style={{ minWidth: "960px" }}>
          <thead>
            <tr>
              <th style={{ width: "56px" }}>ID</th>
              <th>名前</th>
              <th>フリガナ</th>
              <th>メール</th>
              <th>住所</th>
              <th>電話番号</th>
              <th>コース種別</th>
              <th>ステータス</th>
              <th>登録日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {paginatedMembers.map((m) => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td className="fw-semibold">{m.name}</td>
                <td className="text-body-secondary">{m.furigana ?? "—"}</td>
                <td className="text-body-secondary">{m.email ?? "—"}</td>
                <td className="text-body-secondary">{m.address ?? "—"}</td>
                <td className="text-body-secondary">{m.phone ?? "—"}</td>
                <td className="text-body-secondary">{m.course_type ?? "—"}</td>
                <td>
                  <span className="badge bg-success">
                    {stageOptions.find((o) => o.value === m.stage)?.label ?? m.stage ?? "—"}
                  </span>
                </td>
                <td className="text-body-secondary">
                  {m.created_at ? new Date(m.created_at).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }) : "—"}
                </td>
                <td>
                  <div className="btn-group btn-group-sm">
                    <button type="button" className="btn btn-primary" onClick={() => startEdit(m)}>編集</button>
                    <button type="button" className="btn btn-danger" onClick={() => setDeleteTarget(m)}>削除</button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center text-body-secondary py-4">
                  {members.length === 0 ? "会員がありません" : "条件に一致する会員がありません"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {totalFiltered > 0 && (
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 py-2">
          <span className="small text-body-secondary">
            {(page - 1) * MEMBERS_PER_PAGE + 1}-{Math.min(page * MEMBERS_PER_PAGE, totalFiltered)} / {totalFiltered} 件
          </span>
          <div className="d-flex align-items-center gap-1">
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>前へ</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} type="button" className={`btn btn-sm ${p === page ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>次へ</button>
          </div>
        </div>
      )}
    </>
  );
}
