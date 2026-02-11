"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import s from "../admin.module.scss";
import { getApiErrorMessage } from "../lib/apiErrors";

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

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "12px",
  backgroundColor: "#fff",
};
const label: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "2px",
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "13px",
  boxSizing: "border-box",
};
const inputError: React.CSSProperties = {
  ...input,
  border: "1px solid #dc2626",
  outline: "none",
  boxShadow: "0 0 0 1px #dc2626",
};
const fieldErrorMsg: React.CSSProperties = {
  color: "#dc2626",
  fontSize: "11px",
  marginTop: "2px",
  display: "block",
  minHeight: "14px",
  lineHeight: 1.3,
};
const formFieldWrap: React.CSSProperties = {
  minHeight: "58px",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
};
const btn = (color = "#3b82f6", disabled = false): React.CSSProperties => ({
  fontSize: "12px",
  padding: "6px 14px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: disabled ? "#9ca3af" : color,
  color: "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 500,
});

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
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "24px",
          minWidth: "360px",
          animation: "slideUp 0.25s ease",
          maxWidth: "500px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>{title}</h3>
        <div style={{ fontSize: "13px", marginBottom: "16px", color: "#374151" }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              fontSize: "13px",
              padding: "6px 16px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              backgroundColor: "#fff",
              cursor: "pointer",
            }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              fontSize: "13px",
              padding: "6px 16px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: confirmColor,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {confirmLabel}
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

  const stageOptions = [
    { value: "preschool", label: "未就学児" },
    { value: "elementary", label: "小学生" },
    { value: "junior_high", label: "中学生" },
    { value: "high_school", label: "高校生" },
    { value: "other", label: "その他" },
  ];

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

      {/* 新規追加 */}
      <div style={card}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>会員を追加</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 120px 160px 180px 110px 100px 90px auto",
            gap: "8px",
            alignItems: "start",
          }}
        >
          <div style={formFieldWrap}>
            <span style={label}>名前</span>
            <input
              type="text"
              style={newFormError?.field === "name" ? inputError : input}
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (newFormError?.field === "name") setNewFormError(null);
              }}
              placeholder="山田 太郎"
            />
            <span style={fieldErrorMsg}>
              {newFormError?.field === "name" ? newFormError.message : "\u00A0"}
            </span>
          </div>
          <div style={formFieldWrap}>
            <span style={label}>フリガナ（任意）</span>
            <input
              type="text"
              style={input}
              value={newFurigana}
              onChange={(e) => setNewFurigana(e.target.value)}
              placeholder="ヤマダ タロウ"
            />
            <span style={fieldErrorMsg}>{"\u00A0"}</span>
          </div>
          <div style={formFieldWrap}>
            <span style={label}>メール（任意）</span>
            <input
              type="email"
              style={newFormError?.field === "email" ? inputError : input}
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (newFormError?.field === "email") setNewFormError(null);
              }}
              placeholder="user@example.com"
            />
            <span style={fieldErrorMsg}>
              {newFormError?.field === "email" ? newFormError.message : "\u00A0"}
            </span>
          </div>
          <div style={formFieldWrap}>
            <span style={label}>住所（任意）</span>
            <input
              type="text"
              style={input}
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="〇〇市〇〇町1-2-3"
            />
            <span style={fieldErrorMsg}>{"\u00A0"}</span>
          </div>
          <div style={formFieldWrap}>
            <span style={label}>電話番号（任意）</span>
            <input
              type="tel"
              style={input}
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="090-1234-5678"
            />
            <span style={fieldErrorMsg}>{"\u00A0"}</span>
          </div>
          <div style={formFieldWrap}>
            <span style={label}>コース種別</span>
            <input
              type="text"
              style={input}
              value={newCourseType}
              onChange={(e) => setNewCourseType(e.target.value)}
              placeholder="—"
            />
            <span style={fieldErrorMsg}>{"\u00A0"}</span>
          </div>
          <div style={formFieldWrap}>
            <span style={label}>ステータス</span>
            <select
              style={input}
              value={newStage}
              onChange={(e) => setNewStage(e.target.value)}
            >
              {stageOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span style={fieldErrorMsg}>{"\u00A0"}</span>
          </div>
          <div style={{ ...formFieldWrap, justifyContent: "center", paddingTop: "20px" }}>
            <span style={{ ...label, opacity: 0 }}>—</span>
            <button type="button" style={btn()} onClick={handleCreate}>
              追加
            </button>
            <span style={fieldErrorMsg}>{"\u00A0"}</span>
          </div>
        </div>
      </div>

      {/* 一覧 */}
      <div className={s.tableCard}>
        <table className={s.tableCardTable}>
          <thead>
            <tr>
              <th style={{ width: "56px" }}>ID</th>
              <th style={{ minWidth: "100px" }}>名前</th>
              <th style={{ minWidth: "100px" }}>フリガナ</th>
              <th style={{ minWidth: "140px" }}>メール</th>
              <th style={{ minWidth: "140px" }}>住所</th>
              <th style={{ width: "110px" }}>電話番号</th>
              <th style={{ width: "90px" }}>コース種別</th>
              <th style={{ width: "90px" }}>ステータス</th>
              <th style={{ width: "140px" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} style={{ verticalAlign: editId === m.id ? "top" : undefined }}>
                <td>{m.id}</td>
                {editId === m.id ? (
                  <>
                    <td style={{ verticalAlign: "top", minWidth: "120px" }}>
                      <div style={{ minHeight: "52px", display: "flex", flexDirection: "column" }}>
                        <input
                          type="text"
                          style={{
                            ...(editFormError?.field === "name" ? inputError : input),
                            width: "100%",
                            boxSizing: "border-box",
                          }}
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value);
                            if (editFormError?.field === "name") setEditFormError(null);
                          }}
                        />
                        <span style={fieldErrorMsg}>
                          {editFormError?.field === "name" ? editFormError.message : "\u00A0"}
                        </span>
                      </div>
                    </td>
                    <td style={{ verticalAlign: "top" }}>
                      <input
                        type="text"
                        style={{ ...input, width: "100%", boxSizing: "border-box" }}
                        value={editFurigana}
                        onChange={(e) => setEditFurigana(e.target.value)}
                        placeholder="フリガナ"
                      />
                    </td>
                    <td style={{ verticalAlign: "top", minWidth: "160px" }}>
                      <div style={{ minHeight: "52px", display: "flex", flexDirection: "column" }}>
                        <input
                          type="email"
                          style={{
                            ...(editFormError?.field === "email" ? inputError : input),
                            width: "100%",
                            boxSizing: "border-box",
                          }}
                          value={editEmail}
                          onChange={(e) => {
                            setEditEmail(e.target.value);
                            if (editFormError?.field === "email") setEditFormError(null);
                          }}
                        />
                        <span style={fieldErrorMsg}>
                          {editFormError?.field === "email" ? editFormError.message : "\u00A0"}
                        </span>
                      </div>
                    </td>
                    <td style={{ verticalAlign: "top" }}>
                      <input
                        type="text"
                        style={{ ...input, width: "100%", boxSizing: "border-box" }}
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder="住所"
                      />
                    </td>
                    <td style={{ verticalAlign: "top" }}>
                      <input
                        type="tel"
                        style={{ ...input, width: "100%", boxSizing: "border-box" }}
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="電話番号"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        style={{ ...input, width: "100%", boxSizing: "border-box" }}
                        value={editCourseType}
                        onChange={(e) => setEditCourseType(e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        style={input}
                        value={editStage}
                        onChange={(e) => setEditStage(e.target.value)}
                      >
                        {stageOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className={s.tableCardActions}>
                        <button type="button" style={btn("#059669")} onClick={handleUpdate}>
                          保存
                        </button>
                        <button type="button" style={btn("#6b7280")} onClick={cancelEdit}>
                          取消
                        </button>
                      </span>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    <td style={{ fontSize: "12px", color: "#6b7280" }}>{m.furigana ?? "—"}</td>
                    <td style={{ fontSize: "12px", color: "#6b7280" }}>{m.email ?? "—"}</td>
                    <td style={{ fontSize: "12px", color: "#6b7280" }}>{m.address ?? "—"}</td>
                    <td style={{ fontSize: "12px", color: "#6b7280" }}>{m.phone ?? "—"}</td>
                    <td style={{ fontSize: "12px" }}>{m.course_type ?? "—"}</td>
                    <td>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "9999px",
                          fontSize: "11px",
                          backgroundColor: "#ecfdf5",
                          color: "#047857",
                        }}
                      >
                        {stageOptions.find((o) => o.value === m.stage)?.label ?? m.stage ?? "—"}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className={s.tableCardActions}>
                        <button type="button" style={btn("#3b82f6")} onClick={() => startEdit(m)}>
                          編集
                        </button>
                        <button
                          type="button"
                          style={btn("#dc2626")}
                          onClick={() => setDeleteTarget(m)}
                        >
                          削除
                        </button>
                      </span>
                    </td>
                  </>
                )}
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
