"use client";

import { useState } from "react";
import { extractApiError } from "@/app/lib/apiErrors";
import { adminPost, adminPatch, adminDelete } from "@/app/lib/api";
import { ConfirmModal } from "../_components/ConfirmModal";
import type { Staff } from "../types";

export function StaffTab({
  staffList,
  reload,
  flash,
  flashErr,
}: {
  staffList: Staff[];
  reload: () => void;
  flash: (m: string) => void;
  flashErr: (m: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      flashErr("名前は必須です");
      return;
    }
    const r = await adminPost("/staff", { name: trimmed });
    if (!r.ok) {
      flashErr(extractApiError(r.data));
      return;
    }
    flash("スタッフを追加しました");
    setNewName("");
    reload();
  };

  const startEdit = (s: Staff) => {
    setEditId(s.id);
    setEditName(s.name);
  };

  const cancelEdit = () => {
    setEditId(null);
  };

  const handleUpdate = async () => {
    if (!editId) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      flashErr("名前は必須です");
      return;
    }
    const r = await adminPatch(`/staff/${editId}`, { name: trimmed });
    if (!r.ok) {
      flashErr(extractApiError(r.data));
      return;
    }
    flash(`スタッフ #${editId} を更新しました`);
    setEditId(null);
    reload();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    const r = await adminDelete(`/staff/${id}`);
    if (!r.ok) {
      flashErr(extractApiError(r.data));
      return;
    }
    flash(`スタッフ #${id} を削除しました`);
    reload();
  };

  return (
    <div>
      <ConfirmModal
        open={deleteTarget !== null}
        title="スタッフの削除"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="削除する"
        confirmColor="#991b1b"
      >
        {deleteTarget && (
          <>
            スタッフ「{deleteTarget.name}」（#{deleteTarget.id}）を削除します。イベントへの割り当ても解除されます。
          </>
        )}
      </ConfirmModal>

      <div className="card mb-3 card-body">
        <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>スタッフを追加</h3>
        <div style={{ display: "flex", gap: "8px", alignItems: "end" }}>
          <div style={{ flex: 1, maxWidth: "300px" }}>
            <span className="form-label">名前</span>
            <input
              type="text"
              className="form-control"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例: 山田 太郎"
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={handleCreate}>
            追加
          </button>
        </div>
      </div>

      <div className="card card-body">
        <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px" }}>登録済みスタッフ</h3>
        {staffList.length === 0 ? (
          <p className="text-body-secondary mb-0">スタッフがまだいません。上で追加してください。</p>
        ) : (
          <table className="table table-sm">
            <thead>
              <tr>
                <th>ID</th>
                <th>名前</th>
                <th style={{ width: "120px" }}></th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>
                    {editId === s.id ? (
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        style={{ width: "200px" }}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                      />
                    ) : (
                      s.name
                    )}
                  </td>
                  <td>
                    {editId === s.id ? (
                      <>
                        <button type="button" className="btn btn-success btn-sm me-1" onClick={handleUpdate}>
                          保存
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdit}>
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm me-1"
                          onClick={() => startEdit(s)}
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => setDeleteTarget(s)}
                        >
                          削除
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
