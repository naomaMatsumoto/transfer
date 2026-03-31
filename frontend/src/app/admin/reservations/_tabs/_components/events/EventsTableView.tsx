"use client";

import { useState } from "react";
import { getApiErrorMessage, type ApiErrorExtra } from "@/app/lib/apiErrors";
import { adminGet, adminPatch, adminDelete } from "@/app/lib/api";
import { ConfirmModal } from "../../../_components/ConfirmModal";
import type { AdminEvent, AdminReservation } from "../../../types";

type Props = {
  events: AdminEvent[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  flash: (m: string) => void;
  flashErr: (m: string) => void;
  onReload: () => void;
};

export function EventsTableView({
  events,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  flash,
  flashErr,
  onReload,
}: Props) {
  // 編集中のイベント時間
  const [editTimeId, setEditTimeId] = useState<number | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  const [modal, setModal] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor: string;
    action: (payload?: { ids?: number[] }) => Promise<void | false>;
    payload?: { ids: number[] };
  } | null>(null);

  const openModal = (
    title: string,
    message: string,
    action: (payload?: { ids?: number[] }) => Promise<void | false>,
    confirmLabel = "実行",
    confirmColor = "#3b82f6",
    payload?: { ids: number[] },
  ) => {
    setModal({ title, message, confirmLabel, confirmColor, action, payload });
  };

  const execModal = async () => {
    if (!modal) return;
    const keepOpen = await modal.action(modal.payload);
    if (keepOpen !== false) setModal(null);
  };

  const handleStatusChange = async (id: number, status: string) => {
    const r = await adminPatch(`/events/${id}/status`, { status });
    if (!r.ok) {
      flashErr(getApiErrorMessage((r.data as { error?: string })?.error));
      return;
    }
    flash(`イベント#${id} → ${status}`);
    onReload();
  };

  const handleCapacityChange = async (id: number, capacity: number) => {
    const r = await adminPatch(`/events/${id}/capacity`, { capacity });
    if (!r.ok) {
      flashErr(getApiErrorMessage((r.data as { error?: string })?.error));
      return;
    }
    flash(`イベント#${id} 定員 → ${capacity}`);
    onReload();
  };

  const handleTimeChange = async (id: number, startsAt: string, endsAt: string) => {
    const r = await adminPatch(`/events/${id}/time`, { startsAt, endsAt });
    if (!r.ok) {
      flashErr(getApiErrorMessage((r.data as { error?: string })?.error));
      return;
    }
    flash(`イベント #${id} の時間を変更しました`);
    onReload();
  };

  const startTimeEdit = (ev: AdminEvent) => {
    setEditTimeId(ev.id);
    // datetime-local用: "YYYY-MM-DDTHH:MM"
    setEditStart(ev.starts_at?.slice(0, 16)?.replace(" ", "T") ?? "");
    setEditEnd(ev.ends_at?.slice(0, 16)?.replace(" ", "T") ?? "");
  };

  const cancelTimeEdit = () => {
    setEditTimeId(null);
  };

  const saveTimeEdit = async () => {
    if (!editTimeId || !editStart || !editEnd) return;
    await handleTimeChange(editTimeId, editStart.replace("T", " "), editEnd.replace("T", " "));
    setEditTimeId(null);
  };

  const handleDeleteEvent = (id: number) => {
    openModal(
      "イベント削除",
      `イベント #${id} を削除します。この操作は取り消せません。`,
      async () => {
        const r = await adminDelete(`/events/${id}`);
        if (!r.ok) {
          const data = r.data as { error?: string; count?: number } | undefined;
          if (data?.error === "EVENT_DELETE_HAS_RESERVATIONS") {
            const count = data?.count ?? 0;
            setModal({
              title: "強制削除の確認",
              message: `このイベントには有効な予約が ${count} 件あります。削除すると予約も取り消されます。それでも強制削除しますか？`,
              confirmLabel: "強制削除する",
              confirmColor: "#991b1b",
              action: async () => {
                const listR = await adminGet<AdminReservation[]>(`/reservations?eventId=${id}`);
                if (listR.ok && listR.data) {
                  for (const res of listR.data) {
                    if (res.status !== "canceled" && !res.canceled_at) {
                      await adminPatch(`/reservations/${res.id}/cancel`);
                    }
                  }
                }
                const delR = await adminDelete(`/events/${id}`);
                if (!delR.ok) {
                  flashErr(getApiErrorMessage((delR.data as { error?: string })?.error, delR.data as ApiErrorExtra));
                  return;
                }
                flash(`イベント #${id} を強制削除しました（予約も取り消しました）`);
                onReload();
              },
            });
            return false;
          }
          flashErr(getApiErrorMessage(data?.error, data));
          return;
        }
        flash(`イベント #${id} を削除しました`);
        onReload();
      },
      "削除する",
      "#991b1b",
    );
  };

  return (
    <>
      <ConfirmModal
        open={modal !== null}
        title={modal?.title ?? ""}
        onConfirm={execModal}
        onCancel={() => setModal(null)}
        confirmLabel={modal?.confirmLabel ?? "実行"}
        confirmColor={modal?.confirmColor ?? "#3b82f6"}
      >
        {modal?.message}
      </ConfirmModal>

      <div className="card mb-3">
        <table className="table table-striped table-hover mb-0">
          <thead>
            <tr>
              <th style={{ width: "36px" }}>
                <input
                  type="checkbox"
                  checked={selectedIds.size === events.length && events.length > 0}
                  onChange={() => (selectedIds.size === events.length ? onDeselectAll() : onSelectAll())}
                />
              </th>
              <th style={{ width: "48px" }}>ID</th>
              <th>クラス</th>
              <th>日時</th>
              <th style={{ width: "64px" }}>定員</th>
              <th style={{ width: "64px" }}>予約数</th>
              <th style={{ width: "90px" }}>ステータス</th>
              <th style={{ width: "120px" }}>スタッフ</th>
              <th style={{ minWidth: "200px" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} className={selectedIds.has(ev.id) ? "table-primary" : undefined}>
                <td>
                  <input type="checkbox" checked={selectedIds.has(ev.id)} onChange={() => onToggleSelect(ev.id)} />
                </td>
                <td>{ev.id}</td>
                <td>{ev.class_type_name}</td>
                <td>
                  {editTimeId === ev.id ? (
                    <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="datetime-local"
                        className="form-control"
                        style={{ width: "170px", fontSize: "12px" }}
                        value={editStart}
                        onChange={(e) => setEditStart(e.target.value)}
                      />
                      <span>～</span>
                      <input
                        type="datetime-local"
                        className="form-control"
                        style={{ width: "170px", fontSize: "12px" }}
                        value={editEnd}
                        onChange={(e) => setEditEnd(e.target.value)}
                      />
                      <button type="button" className="btn btn-success" onClick={saveTimeEdit}>
                        保存
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={cancelTimeEdit}>
                        取消
                      </button>
                    </div>
                  ) : (
                    <span
                      style={{ cursor: "pointer" }}
                      onClick={() => startTimeEdit(ev)}
                      title="クリックで時間を編集"
                    >
                      {(() => {
                        const d = new Date(ev.starts_at);
                        const e = new Date(ev.ends_at);
                        const w = "日月火水木金土"[d.getDay()];
                        const color = d.getDay() === 0 ? "#dc2626" : d.getDay() === 6 ? "#2563eb" : "#6b7280";
                        const fmt = (dt: Date) => `${dt.getHours()}:${String(dt.getMinutes()).padStart(2, "0")}`;
                        return (
                          <>
                            {d.getFullYear()}年{d.getMonth() + 1}月{d.getDate()}日
                            <span style={{ color, fontWeight: 600 }}>({w})</span>
                            {fmt(d)} ～ {fmt(e)}
                            <span style={{ marginLeft: "4px", fontSize: "10px", color: "#9ca3af" }}>✏️</span>
                          </>
                        );
                      })()}
                    </span>
                  )}
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    defaultValue={ev.capacity}
                    className="form-control"
                    style={{ width: "50px" }}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== ev.capacity) handleCapacityChange(ev.id, v);
                    }}
                  />
                </td>
                <td>{ev.reserved_count}</td>
                <td>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 10px",
                      borderRadius: "9999px",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: ev.status === "scheduled" ? "#065f46" : ev.status === "holiday" ? "#374151" : "#991b1b",
                      backgroundColor:
                        ev.status === "scheduled" ? "#d1fae5" : ev.status === "holiday" ? "#e5e7eb" : "#fee2e2",
                      border:
                        ev.status === "scheduled"
                          ? "1px solid #6ee7b7"
                          : ev.status === "holiday"
                            ? "1px solid #d1d5db"
                            : "1px solid #fca5a5",
                    }}
                  >
                    {ev.status === "scheduled" ? "● 開催" : ev.status === "holiday" ? "■ 通常休み" : "▲ 休講"}
                  </span>
                </td>
                <td style={{ fontSize: "12px", color: "#4b5563" }}>
                  {Array.isArray(ev.staff) && ev.staff.length > 0 ? ev.staff.map((s) => s.name).join("、") : "—"}
                </td>
                <td>
                  <span className="btn-group btn-group-sm">
                    <button
                      type="button"
                      disabled={ev.status === "scheduled"}
                      className="btn btn-success btn-sm"
                      onClick={() => handleStatusChange(ev.id, "scheduled")}
                    >
                      開催に戻す
                    </button>
                    <button
                      type="button"
                      disabled={ev.status === "holiday"}
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleStatusChange(ev.id, "holiday")}
                    >
                      通常休みに
                    </button>
                    <button
                      type="button"
                      disabled={ev.status === "canceled_by_admin"}
                      className="btn btn-danger btn-sm"
                      onClick={() => handleStatusChange(ev.id, "canceled_by_admin")}
                    >
                      休講に
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => handleDeleteEvent(ev.id)}>
                      削除
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-body-secondary py-4">
                  イベントがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
