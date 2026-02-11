"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import s from "../admin.module.scss";
import { getApiErrorMessage } from "@/app/lib/apiErrors";

const API_BASE = (() => {
  const u = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (u && (u.startsWith("http://") || u.startsWith("https://"))) return u.replace(/\/$/, "");
  return "http://localhost:4000";
})();
const FLASH_VISIBLE_MS = 3000;
const FLASH_ERR_VISIBLE_MS = 5000;
const FLASH_EXIT_ANIMATION_MS = 300;

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
  scss: s,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  confirmColor?: string;
  scss: { [k: string]: string };
}) {
  if (!open) return null;
  return (
    <div className={s.modalOverlay} onClick={onCancel}>
      <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 className={s.modalTitle}>{title}</h3>
        <div className={s.modalBody}>{children}</div>
        <div className={s.modalFooter}>
          <button type="button" className={s.modalBtnCancel} onClick={onCancel}>
            キャンセル
          </button>
          <button
            type="button"
            className={confirmColor === "#991b1b" ? s.modalBtnConfirmDanger : s.modalBtnConfirm}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
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
  scss: s,
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
  scss: { [k: string]: string };
}) {
  if (!open || !editId) return null;
  return (
    <div className={s.modalOverlay} onClick={onCancel}>
      <div className={s.membersEditModalContent} onClick={(e) => e.stopPropagation()}>
        <h3 className={s.modalTitle}>会員を編集（#{editId}）</h3>
        <div className={s.membersEditFormFields}>
          <div className={s.membersFieldWrap}>
            <span className={s.membersLabel}>名前</span>
            <input
              type="text"
              className={formError?.field === "name" ? s.membersInputError : s.membersInput}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (formError?.field === "name") setFormError(null);
              }}
              placeholder="山田 太郎"
            />
            <span className={s.membersFieldError}>{formError?.field === "name" ? formError.message : "\u00A0"}</span>
          </div>
          <div className={s.membersFieldWrap}>
            <span className={s.membersLabel}>フリガナ（任意）</span>
            <input
              type="text"
              className={s.membersInput}
              value={furigana}
              onChange={(e) => setFurigana(e.target.value)}
              placeholder="ヤマダ タロウ"
            />
            <span className={s.membersFieldError}>{"\u00A0"}</span>
          </div>
          <div className={s.membersFieldWrap}>
            <span className={s.membersLabel}>メール（任意）</span>
            <input
              type="email"
              className={formError?.field === "email" ? s.membersInputError : s.membersInput}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (formError?.field === "email") setFormError(null);
              }}
              placeholder="user@example.com"
            />
            <span className={s.membersFieldError}>{formError?.field === "email" ? formError.message : "\u00A0"}</span>
          </div>
          <div className={s.membersFieldWrap}>
            <span className={s.membersLabel}>住所（任意）</span>
            <input
              type="text"
              className={s.membersInput}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="〇〇市〇〇町1-2-3"
            />
            <span className={s.membersFieldError}>{"\u00A0"}</span>
          </div>
          <div className={s.membersFieldWrap}>
            <span className={s.membersLabel}>電話番号（任意）</span>
            <input
              type="tel"
              className={s.membersInput}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="090-1234-5678"
            />
            <span className={s.membersFieldError}>{"\u00A0"}</span>
          </div>
          <div className={s.membersFieldWrap}>
            <span className={s.membersLabel}>コース種別</span>
            <input
              type="text"
              className={s.membersInput}
              value={courseType}
              onChange={(e) => setCourseType(e.target.value)}
              placeholder="—"
            />
            <span className={s.membersFieldError}>{"\u00A0"}</span>
          </div>
          <div className={s.membersFieldWrap}>
            <span className={s.membersLabel}>ステータス</span>
            <select className={s.membersInput} value={stage} onChange={(e) => setStage(e.target.value)}>
              {stageOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className={s.membersFieldError}>{"\u00A0"}</span>
          </div>
        </div>
        <div className={s.modalFooter}>
          <button type="button" className={s.modalBtnCancel} onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className={s.membersBtnSuccess} onClick={onSave}>
            保存
          </button>
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
    if (emailVal !== null && !isValidEmail(emailVal)) {
      setEditFormError({ field: "email", message: "メールアドレスの形式が正しくありません" });
      return;
    }
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
      <h1 className={s.pageTitle}>会員管理</h1>

      {msg && (
        <div className={`${s.flashWrap} ${msgExiting ? s.flashWrapExiting : ""}`}>
          <div className={`${s.flash} ${s.flashSuccess}`}>{msg}</div>
        </div>
      )}
      {err && (
        <div className={`${s.flashWrap} ${errExiting ? s.flashWrapExiting : ""}`}>
          <div className={`${s.flash} ${s.flashError}`}>{err}</div>
        </div>
      )}

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
        scss={s}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="会員の削除"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="削除する"
        confirmColor="#991b1b"
        scss={s}
      >
        {deleteTarget && (
          <>
            会員「{deleteTarget.name}」（#{deleteTarget.id}）を削除します。振替権利・予約が紐づいている場合は削除できません。この操作は取り消せません。
          </>
        )}
      </ConfirmModal>

      {/* 新規追加 */}
      <div className={s.membersCard}>
        <h3 className={s.membersCardTitle}>会員を追加</h3>
        <div className={s.membersFormGrid}>
          <div className={s.membersFieldWrap}>
            <span className={s.membersLabel}>名前</span>
            <input
              type="text"
              className={newFormError?.field === "name" ? s.membersInputError : s.membersInput}
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (newFormError?.field === "name") setNewFormError(null);
              }}
              placeholder="山田 太郎"
            />
            <span className={s.membersFieldError}>
              {newFormError?.field === "name" ? newFormError.message : "\u00A0"}
            </span>
          </div>
          <div className={s.membersFieldWrap}>
            <span className={s.membersLabel}>フリガナ（任意）</span>
            <input
              type="text"
              className={s.membersInput}
              value={newFurigana}
              onChange={(e) => setNewFurigana(e.target.value)}
              placeholder="ヤマダ タロウ"
            />
            <span className={s.membersFieldError}>{"\u00A0"}</span>
          </div>
          <div className={s.membersFieldWrap}>
            <span className={s.membersLabel}>メール（任意）</span>
            <input
              type="email"
              className={newFormError?.field === "email" ? s.membersInputError : s.membersInput}
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (newFormError?.field === "email") setNewFormError(null);
              }}
              placeholder="user@example.com"
            />
            <span className={s.membersFieldError}>
              {newFormError?.field === "email" ? newFormError.message : "\u00A0"}
            </span>
          </div>
          <div className={s.membersFieldWrap}>
            <span className={s.membersLabel}>住所（任意）</span>
            <input
              type="text"
              className={s.membersInput}
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="〇〇市〇〇町1-2-3"
            />
            <span className={s.membersFieldError}>{"\u00A0"}</span>
          </div>
          <div className={s.membersFieldWrap}>
            <span className={s.membersLabel}>電話番号（任意）</span>
            <input
              type="tel"
              className={s.membersInput}
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="090-1234-5678"
            />
            <span className={s.membersFieldError}>{"\u00A0"}</span>
          </div>
          <div className={s.membersFieldWrap}>
            <span className={s.membersLabel}>コース種別</span>
            <input
              type="text"
              className={s.membersInput}
              value={newCourseType}
              onChange={(e) => setNewCourseType(e.target.value)}
              placeholder="—"
            />
            <span className={s.membersFieldError}>{"\u00A0"}</span>
          </div>
          <div className={s.membersFieldWrap}>
            <span className={s.membersLabel}>ステータス</span>
            <select
              className={s.membersInput}
              value={newStage}
              onChange={(e) => setNewStage(e.target.value)}
            >
              {stageOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className={s.membersFieldError}>{"\u00A0"}</span>
          </div>
          <div className={`${s.membersFieldWrap} ${s.membersFieldWrapCenter}`}>
            <span className={`${s.membersLabel} ${s.membersLabelInvisible}`}>—</span>
            <button type="button" className={s.membersBtnPrimary} onClick={handleCreate}>
              追加
            </button>
            <span className={s.membersFieldError}>{"\u00A0"}</span>
          </div>
        </div>
      </div>

      {/* 一覧 */}
      <div className={s.tableCard}>
        <table className={s.tableCardTable}>
          <thead>
            <tr>
              <th className={s.membersThId}>ID</th>
              <th className={s.membersThName}>名前</th>
              <th className={s.membersThName}>フリガナ</th>
              <th className={s.membersThEmail}>メール</th>
              <th className={s.membersThEmail}>住所</th>
              <th className={s.membersThPhone}>電話番号</th>
              <th className={s.membersThCourse}>コース種別</th>
              <th className={s.membersThCourse}>ステータス</th>
              <th className={s.membersThActions}>操作</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td className={s.membersTableName}>{m.name}</td>
                <td className={s.membersTableMuted}>{m.furigana ?? "—"}</td>
                <td className={s.membersTableMuted}>{m.email ?? "—"}</td>
                <td className={s.membersTableMuted}>{m.address ?? "—"}</td>
                <td className={s.membersTableMuted}>{m.phone ?? "—"}</td>
                <td className={s.membersTableMuted}>{m.course_type ?? "—"}</td>
                <td>
                  <span className={s.membersStageBadge}>
                    {stageOptions.find((o) => o.value === m.stage)?.label ?? m.stage ?? "—"}
                  </span>
                </td>
                <td className={s.membersTdActions}>
                  <span className={s.tableCardActions}>
                    <button type="button" className={s.membersBtnPrimary} onClick={() => startEdit(m)}>
                      編集
                    </button>
                    <button
                      type="button"
                      className={s.membersBtnDanger}
                      onClick={() => setDeleteTarget(m)}
                    >
                      削除
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={9} className={s.tableCardEmpty}>
                  会員がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
