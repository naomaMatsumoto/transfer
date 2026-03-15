"use client";

import { useState } from "react";
import { extractApiError } from "@/app/lib/apiErrors";
import { adminPost, adminPatch, adminDelete } from "@/app/lib/api";
import { ConfirmModal } from "../_components/ConfirmModal";
import type { ClassType } from "../types";

export function ClassTypesTab({ classTypes, reload, flash, flashErr }: { classTypes: ClassType[]; reload: () => void; flash: (m: string) => void; flashErr: (m: string) => void }) {
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // 編集中の行
  const [editId, setEditId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // 削除確認モーダル
  const [deleteTarget, setDeleteTarget] = useState<ClassType | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) { flashErr("名前は必須です"); return; }
    const r = await adminPost("/class-types", {
      code: newCode.trim() || undefined,
      name: newName.trim(),
      description: newDesc.trim() || null,
    });
    if (!r.ok) {
      flashErr(extractApiError(r.data));
      return;
    }
    flash("クラス種別を作成しました");
    setNewCode(""); setNewName(""); setNewDesc("");
    reload();
  };

  const startEdit = (ct: ClassType) => {
    setEditId(ct.id);
    setEditCode(ct.code);
    setEditName(ct.name);
    setEditDesc(ct.description ?? "");
  };

  const cancelEdit = () => { setEditId(null); };

  const handleUpdate = async () => {
    if (!editId) return;
    if (!editName.trim()) { flashErr("名前は必須です"); return; }
    const r = await adminPatch(`/class-types/${editId}`, {
      code: editCode.trim() || undefined,
      name: editName.trim(),
      description: editDesc.trim() || null,
    });
    if (!r.ok) {
      flashErr(extractApiError(r.data));
      return;
    }
    flash(`クラス種別 #${editId} を更新しました`);
    setEditId(null);
    reload();
  };

  const requestDelete = (ct: ClassType) => {
    setDeleteTarget(ct);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    const r = await adminDelete(`/class-types/${id}`);
    if (!r.ok) {
      flashErr(extractApiError(r.data));
      return;
    }
    flash(`クラス種別 #${id} を削除しました`);
    reload();
  };

  return (
    <div>
      {/* 削除確認モーダル */}
      <ConfirmModal
        open={deleteTarget !== null}
        title="クラス種別の削除"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="削除する"
        confirmColor="#991b1b"
      >
        {deleteTarget && (
          <>クラス種別「{deleteTarget.name}」（#{deleteTarget.id}）を削除します。この操作は取り消せません。</>
        )}
      </ConfirmModal>

      {/* 新規作成フォーム */}
      <div className="card mb-3 card-body">
        <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>クラス種別を追加</h3>
        <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 1fr auto", gap: "8px", alignItems: "end" }}>
          <div>
            <span className="form-label">コード（任意・未入力なら名前から自動）</span>
            <input type="text" className="form-control" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="例: kakekko" />
          </div>
          <div>
            <span className="form-label">名前</span>
            <input type="text" className="form-control" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="かけっこ" />
          </div>
          <div>
            <span className="form-label">説明（任意）</span>
            <input type="text" className="form-control" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="かけっこクラスの説明" />
          </div>
          <button type="button" className="btn btn-primary" onClick={handleCreate}>追加</button>
        </div>
      </div>

      {/* 一覧テーブル（共通 tableCard モジュール） */}
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
                      <input type="text" className="form-control" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }} value={editCode} onChange={(e) => setEditCode(e.target.value)} />
                    </td>
                    <td>
                      <input type="text" className="form-control" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }} value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </td>
                    <td>
                      <input type="text" className="form-control" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className="btn-group btn-group-sm">
                        <button type="button" className="btn btn-success" onClick={handleUpdate}>保存</button>
                        <button type="button" className="btn btn-secondary" onClick={cancelEdit}>取消</button>
                      </span>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{ct.code}</td>
                    <td style={{ fontWeight: 600 }}>{ct.name}</td>
                    <td style={{ fontSize: "12px", color: "#6b7280" }}>{ct.description ?? "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className="btn-group btn-group-sm">
                        <button type="button" className="btn btn-primary" onClick={() => startEdit(ct)}>編集</button>
                        <button type="button" className="btn btn-danger" onClick={() => requestDelete(ct)}>削除</button>
                      </span>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {classTypes.length === 0 && (
              <tr><td colSpan={5} className="text-center text-body-secondary py-4">クラス種別がありません</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
