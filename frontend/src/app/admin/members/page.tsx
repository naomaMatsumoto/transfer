"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getApiErrorMessage } from "@/app/lib/apiErrors";
import { adminGet, adminPost, adminPatch, adminDelete } from "@/app/lib/api";
import { useFlash } from "@/app/lib/useFlash";
import { FlashToast } from "@/app/lib/FlashToast";
import {
  type Member,
  stageOptions,
  isValidEmail,
  isMemberEmailError,
  ConfirmModal,
  AddMemberModal,
  EditMemberModal,
} from "./_components/MemberModals";
import styles from "../admin.module.scss";
const MEMBERS_PER_PAGE = 50;

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const { msg, err, msgExiting, errExiting, flash, flashErr } = useFlash();

  const loadMembers = useCallback(async () => {
    try {
      const r = await adminGet<Member[]>("/users");
      if (r.ok && r.data) {
        setMembers(r.data);
      } else {
        throw new Error("failed");
      }
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
  const [newPassword, setNewPassword] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCourseType, setNewCourseType] = useState("");
  const [newStage, setNewStage] = useState<string>("other");

  // 編集中
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editFurigana, setEditFurigana] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
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
      const r = await adminPost("/users", {
        name: newName.trim(),
        furigana: newFurigana.trim() || null,
        email: emailVal,
        password: newPassword.trim() || null,
        address: newAddress.trim() || null,
        phone: newPhone.trim() || null,
        course_type: newCourseType.trim() || null,
        stage: newStage,
      });
      const data = r.data as { error?: string };
      if (!r.ok) {
        const code = data?.error ?? "";
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
      setNewPassword("");
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
    setEditPassword("");
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
    const body: Record<string, unknown> = {
      name: editName.trim(),
      furigana: editFurigana.trim() || null,
      email: emailVal,
      address: editAddress.trim() || null,
      phone: editPhone.trim() || null,
      course_type: editCourseType.trim() || null,
      stage: editStage,
    };
    if (editPassword.trim() !== "") body.password = editPassword.trim();
    const r = await adminPatch(`/users/${editId}`, body);
    const data = r.data as { error?: string };
    if (!r.ok) {
      const code = data?.error ?? "";
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
    const r = await adminDelete(`/users/${id}`);
    if (!r.ok) {
      flashErr(getApiErrorMessage((r.data as { error?: string })?.error));
      return;
    }
    flash(`会員 #${id} を削除しました`);
    loadMembers();
  };

  return (
    <>
      <FlashToast msg={msg} err={err} msgExiting={msgExiting} errExiting={errExiting} />
      <h1 className={styles.settingsPageTitle}>会員管理</h1>

      <AddMemberModal
        open={showAddModal}
        name={newName}
        setName={setNewName}
        furigana={newFurigana}
        setFurigana={setNewFurigana}
        email={newEmail}
        setEmail={setNewEmail}
        password={newPassword}
        setPassword={setNewPassword}
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
        password={editPassword}
        setPassword={setEditPassword}
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
