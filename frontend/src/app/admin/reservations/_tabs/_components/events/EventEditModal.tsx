"use client";

import { useState, useCallback, useEffect } from "react";
import { getApiErrorMessage, type ApiErrorExtra } from "@/app/lib/apiErrors";
import { adminGet, adminPost, adminPatch, adminPut, adminDelete } from "@/app/lib/api";
import { ConfirmModal } from "../../../_components/ConfirmModal";
import type { AdminEvent, AdminReservation, User, Staff } from "../../../types";
import type { ReserveRow } from "./types";

type Props = {
  event: AdminEvent | null;
  onClose: () => void;
  onSaved: () => void;
  flash: (m: string) => void;
  flashErr: (m: string) => void;
  users: User[];
  staff: Staff[];
};

export function EventEditModal({ event, onClose, onSaved, flash, flashErr, users, staff }: Props) {
  const [editEvStart, setEditEvStart] = useState("");
  const [editEvEnd, setEditEvEnd] = useState("");
  const [editEvCapacity, setEditEvCapacity] = useState(6);
  const [editEvStatus, setEditEvStatus] = useState("scheduled");
  const [editEvStaffIds, setEditEvStaffIds] = useState<number[]>([]);
  const [editEvReservations, setEditEvReservations] = useState<AdminReservation[]>([]);
  const [editEvToCancel, setEditEvToCancel] = useState<Set<number>>(new Set());
  const [editEvToAdd, setEditEvToAdd] = useState<ReserveRow[]>([]);
  const [editEvReserveDropdownOpen, setEditEvReserveDropdownOpen] = useState<number | null>(null);
  const [editEvReserveFilter, setEditEvReserveFilter] = useState("");
  const [editApplyToFuture, setEditApplyToFuture] = useState<"only" | "future">("only");
  const [editModalErr, setEditModalErr] = useState("");

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

  const loadEditEventReservations = useCallback(async (eventId: number) => {
    try {
      const r = await adminGet<AdminReservation[]>(`/reservations?eventId=${eventId}`);
      const list = r.ok && Array.isArray(r.data) ? r.data : [];
      setEditEvReservations(list.filter((res: AdminReservation) => res.status !== "canceled" && !res.canceled_at));
    } catch {
      setEditEvReservations([]);
    }
  }, []);

  // When event prop changes, populate form state
  useEffect(() => {
    if (!event) return;
    setEditEvStart(event.starts_at?.slice(0, 16)?.replace(" ", "T") ?? "");
    setEditEvEnd(event.ends_at?.slice(0, 16)?.replace(" ", "T") ?? "");
    setEditEvCapacity(event.capacity);
    setEditEvStatus(event.status);
    setEditEvStaffIds(Array.isArray(event.staff) ? event.staff.map((s) => s.id) : []);
    setEditEvReservations([]);
    setEditEvToCancel(new Set());
    setEditEvToAdd([]);
    setEditEvReserveDropdownOpen(null);
    setEditEvReserveFilter("");
    setEditApplyToFuture("only");
    setEditModalErr("");
    void loadEditEventReservations(event.id);
  }, [event, loadEditEventReservations]);

  const saveEditEvent = async () => {
    if (!event) return;
    setEditModalErr("");
    const currentCount = editEvReservations.filter((r) => !editEvToCancel.has(r.id)).length;
    const toAdd = editEvToAdd.filter((r) => r.userId !== "");
    if (toAdd.length + currentCount > editEvCapacity) {
      setEditModalErr(`予約数が定員（${editEvCapacity}人）を超えます`);
      return;
    }
    const addUserIds = toAdd.map((r) => r.userId);
    if (new Set(addUserIds).size !== addUserIds.length) {
      setEditModalErr("同じユーザーは複数回登録できません");
      return;
    }
    const existingUserIds = new Set(editEvReservations.filter((r) => !editEvToCancel.has(r.id)).map((r) => r.user_id));
    for (const row of toAdd) {
      const uid = row.userId;
      if (uid === "") continue;
      if (existingUserIds.has(uid)) {
        setEditModalErr("既に予約済みのユーザーは追加できません");
        return;
      }
    }
    const makeupWithoutCredit = toAdd.find((r) => r.type === "makeup" && (r.creditId === "" || !r.creditId));
    if (makeupWithoutCredit) {
      setEditModalErr("振替で予約する場合は、振替権利を選択してください");
      return;
    }
    try {
      for (const id of editEvToCancel) {
        const r = await adminPatch(`/reservations/${id}/cancel`);
        if (!r.ok) {
          setEditModalErr(getApiErrorMessage((r.data as { error?: string })?.error));
          return;
        }
      }
      for (const row of toAdd) {
        if (!row.userId) continue;
        const r = await adminPost("/reservations", {
          userId: row.userId,
          eventId: event.id,
          reservationType: row.type,
          makeupCreditId: row.type === "makeup" && row.creditId ? row.creditId : null,
          overrideCapacity: false,
        });
        if (!r.ok) {
          setEditModalErr(getApiErrorMessage((r.data as { error?: string })?.error));
          return;
        }
      }
      // 時間・定員・ステータス
      await adminPatch(`/events/${event.id}/time`, {
        startsAt: editEvStart.replace("T", " "),
        endsAt: editEvEnd.replace("T", " "),
      });
      await adminPatch(`/events/${event.id}/capacity`, { capacity: editEvCapacity });
      if (editEvStatus !== event.status) {
        await adminPatch(`/events/${event.id}/status`, { status: editEvStatus });
      }
      await adminPut(`/events/${event.id}/staff`, { staffIds: editEvStaffIds });
      let futureUpdated = 0;
      const userIdsToCancel = editEvReservations.filter((r) => editEvToCancel.has(r.id)).map((r) => r.user_id);
      if (editApplyToFuture === "future") {
        const origDate = new Date(event.starts_at);
        const origWeekday = origDate.getDay();
        const origStartTime = (event.starts_at ?? "").slice(11, 16);
        const fromStr = event.starts_at?.slice(0, 10) ?? "";
        const toDate = new Date(origDate);
        toDate.setFullYear(toDate.getFullYear() + 1);
        const toStr = toDate.toISOString().slice(0, 10);
        const futureR = await adminGet<AdminEvent[]>(`/events?from=${fromStr}&to=${toStr}`);
        if (futureR.ok && futureR.data) {
          const list = futureR.data;
          const newStartTime = editEvStart.replace("T", " ").slice(11, 16);
          const newEndTime = editEvEnd.replace("T", " ").slice(11, 16);
          const editEventStartMs = new Date(event.starts_at).getTime();
          for (const ev of list) {
            if (ev.id === event.id) continue;
            const evStart = new Date(ev.starts_at);
            if (evStart.getTime() <= editEventStartMs) continue;
            if (evStart.getDay() !== origWeekday) continue;
            if ((ev.starts_at ?? "").slice(11, 16) !== origStartTime) continue;
            const dateStr = ev.starts_at?.slice(0, 10) ?? "";
            const startsAt = `${dateStr} ${newStartTime}`;
            const endsAt = `${dateStr} ${newEndTime}`;
            await adminPatch(`/events/${ev.id}/time`, { startsAt, endsAt });
            await adminPatch(`/events/${ev.id}/capacity`, { capacity: editEvCapacity });
            await adminPatch(`/events/${ev.id}/status`, { status: editEvStatus });
            await adminPut(`/events/${ev.id}/staff`, { staffIds: editEvStaffIds });
            // 予約（ユーザー）も反映: 今回キャンセルしたユーザーを今後のイベントからもキャンセル
            try {
              for (const uid of userIdsToCancel) {
                const listR = await adminGet<AdminReservation[]>(`/reservations?eventId=${ev.id}`);
                if (!listR.ok) continue;
                const reservations = listR.data ?? [];
                const found = reservations.find((x) => x.user_id === uid && x.status !== "canceled" && !x.canceled_at);
                if (found) await adminPatch(`/reservations/${found.id}/cancel`);
              }
              // 今回追加した予約を今後のイベントにも追加
              for (const row of toAdd) {
                if (!row.userId) continue;
                const addR = await adminPost("/reservations", {
                  userId: row.userId,
                  eventId: ev.id,
                  reservationType: row.type,
                  makeupCreditId: row.type === "makeup" && row.creditId ? row.creditId : null,
                  overrideCapacity: false,
                });
                if (!addR.ok) break;
              }
            } catch {
              // 1件の予約反映失敗でも他は続行
            }
            futureUpdated++;
          }
        }
      }
      flash(
        futureUpdated > 0
          ? `イベント #${event.id} を更新し、同じ曜日・時間の今後の ${futureUpdated} 件にも反映しました`
          : `イベント #${event.id} を更新しました`,
      );
      onClose();
      onSaved();
    } catch {
      setEditModalErr("更新に失敗しました");
    }
  };

  const deleteFromEditModal = () => {
    if (!event) return;
    const idToDelete = event.id;
    const applyToFuture = editApplyToFuture === "future";
    const confirmMessage = applyToFuture
      ? `イベント #${idToDelete} と、同じ曜日・時間の今後のイベントを削除します。この操作は取り消せません。`
      : `イベント #${idToDelete} を削除します。この操作は取り消せません。`;
    openModal(
      "イベント削除",
      confirmMessage,
      async () => {
        const doDeleteIds = async (ids: number[], useForce: boolean) => {
          return adminPost("/events/bulk-delete", { ids, force: useForce });
        };
        const runDelete = async (ids: number[]): Promise<boolean> => {
          const r = await doDeleteIds(ids, false);
          if (r.ok) return true;
          const data = r.data as { error?: string } | undefined;
          if (data?.error === "EVENT_BULK_DELETE_HAS_RESERVATIONS" || data?.error === "EVENT_IDS_REQUIRED") {
            const rForce = await doDeleteIds(ids, true);
            if (!rForce.ok) {
              flashErr(getApiErrorMessage((rForce.data as { error?: string })?.error, rForce.data as ApiErrorExtra));
              return false;
            }
            return true;
          }
          flashErr(getApiErrorMessage(data?.error, data as ApiErrorExtra | undefined));
          return false;
        };
        if (applyToFuture) {
          const origDate = new Date(event.starts_at);
          const origWeekday = origDate.getDay();
          const origStartTime = (event.starts_at ?? "").slice(11, 16);
          const fromStr = event.starts_at?.slice(0, 10) ?? "";
          const toDate = new Date(origDate);
          toDate.setFullYear(toDate.getFullYear() + 1);
          const toStr = toDate.toISOString().slice(0, 10);
          const listR = await adminGet<AdminEvent[]>(`/events?from=${fromStr}&to=${toStr}`);
          if (!listR.ok) {
            flashErr("今後のイベントの取得に失敗しました");
            return;
          }
          const list = listR.data ?? [];
          const editEventStartMs = new Date(event.starts_at).getTime();
          const idsToDelete = list
            .filter((ev) => {
              const evStart = new Date(ev.starts_at);
              return (
                evStart.getTime() >= editEventStartMs &&
                evStart.getDay() === origWeekday &&
                (ev.starts_at ?? "").slice(11, 16) === origStartTime
              );
            })
            .map((ev) => ev.id);
          if (idsToDelete.length === 0) {
            flashErr("削除対象のイベントが見つかりませんでした");
            return;
          }
          const ok = await runDelete(idsToDelete);
          if (ok) {
            flash(
              idsToDelete.length > 1
                ? `イベント #${idToDelete} と、同じ曜日・時間の今後の ${idsToDelete.length - 1} 件を削除しました`
                : `イベント #${idToDelete} を削除しました`,
            );
            onClose();
            onSaved();
          }
          return;
        }
        const r = await adminDelete(`/events/${idToDelete}`);
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
                const listR = await adminGet<AdminReservation[]>(`/reservations?eventId=${idToDelete}`);
                if (listR.ok && listR.data) {
                  for (const res of listR.data) {
                    if (res.status !== "canceled" && !res.canceled_at) {
                      await adminPatch(`/reservations/${res.id}/cancel`);
                    }
                  }
                }
                const delR = await adminDelete(`/events/${idToDelete}`);
                if (!delR.ok) {
                  flashErr(getApiErrorMessage((delR.data as { error?: string })?.error, delR.data as ApiErrorExtra));
                  return;
                }
                flash(`イベント #${idToDelete} を強制削除しました（予約も取り消しました）`);
                onClose();
                onSaved();
              },
            });
            return false;
          }
          flashErr(getApiErrorMessage(data?.error, data as ApiErrorExtra | undefined));
          return;
        }
        flash(`イベント #${idToDelete} を削除しました`);
        onClose();
        onSaved();
      },
      "削除する",
      "#991b1b",
    );
  };

  if (!event) return null;

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

      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9998,
          animation: "fadeIn 0.2s ease",
        }}
        onClick={() => {
          onClose();
          setEditModalErr("");
        }}
      >
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "24px",
            minWidth: "420px",
            maxWidth: "520px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
            animation: "slideUp 0.25s ease",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>イベント編集（#{event.id}）</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "100px 1fr",
              gap: "10px 12px",
              alignItems: "center",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            <span className="form-label">クラス</span>
            <span style={{ fontWeight: 600 }}>{event.class_type_name}</span>

            <span className="form-label">開始日時</span>
            <input
              type="datetime-local"
              className="form-control"
              value={editEvStart}
              onChange={(e) => setEditEvStart(e.target.value)}
            />

            <span className="form-label">終了日時</span>
            <input
              type="datetime-local"
              className="form-control"
              value={editEvEnd}
              onChange={(e) => setEditEvEnd(e.target.value)}
            />

            <span className="form-label">定員</span>
            <input
              type="number"
              min={0}
              className="form-control"
              style={{ width: "80px" }}
              value={editEvCapacity}
              onChange={(e) => setEditEvCapacity(Number(e.target.value))}
            />

            <span className="form-label">ステータス</span>
            <div style={{ display: "flex", gap: "6px" }}>
              {(
                [
                  ["scheduled", "開催", "#059669"],
                  ["holiday", "通常休み", "#6b7280"],
                  ["canceled_by_admin", "休講", "#dc2626"],
                ] as const
              ).map(([val, lbl, color]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setEditEvStatus(val)}
                  style={{
                    fontSize: "12px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: editEvStatus === val ? `2px solid ${color}` : "1px solid #d1d5db",
                    backgroundColor:
                      editEvStatus === val
                        ? val === "scheduled"
                          ? "#d1fae5"
                          : val === "holiday"
                            ? "#e5e7eb"
                            : "#fee2e2"
                        : "#fff",
                    color: editEvStatus === val ? color : "#6b7280",
                    fontWeight: editEvStatus === val ? 700 : 400,
                    cursor: "pointer",
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <span className="form-label">予約数</span>
            <span>
              {editEvReservations.filter((r) => !editEvToCancel.has(r.id)).length +
                editEvToAdd.filter((r) => r.userId !== "").length}{" "}
              / {editEvCapacity}
            </span>

            <span className="form-label" style={{ fontSize: "15px" }}>
              担当スタッフ（何名でも登録可能）
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {staff.length === 0 ? (
                <span className="text-body-secondary" style={{ fontSize: "14px" }}>
                  スタッフが未登録です（スタッフ管理で追加）
                </span>
              ) : (
                staff.map((s) => (
                  <label
                    key={s.id}
                    className="d-flex align-items-center gap-2"
                    style={{ fontSize: "16px", cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      className="form-check-input"
                      style={{ width: "18px", height: "18px", marginTop: 0 }}
                      checked={editEvStaffIds.includes(s.id)}
                      onChange={(e) => {
                        setEditEvStaffIds((prev) =>
                          e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                        );
                      }}
                    />
                    {s.name}
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-top">
            <span className="form-label d-block mb-2">予約ユーザー（メンバー）</span>
            {editEvReservations
              .filter((r) => !editEvToCancel.has(r.id))
              .map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "6px",
                    padding: "6px 8px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "6px",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ flex: 1 }}>
                    {r.user_name}
                    {r.reservation_type === "makeup" ? "（振替）" : ""}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => setEditEvToCancel((prev) => new Set(prev).add(r.id))}
                  >
                    削除
                  </button>
                </div>
              ))}
            {editEvToAdd.map((row, idx) => {
              const otherSelectedIds = new Set([
                ...editEvReservations.filter((r) => !editEvToCancel.has(r.id)).map((r) => r.user_id),
                ...editEvToAdd.map((r, i) => (i === idx ? null : r.userId)).filter((id): id is number => id !== ""),
              ]);
              const isOpen = editEvReserveDropdownOpen === idx;
              const selectedUser = row.userId !== "" ? users.find((u) => u.id === row.userId) : null;
              const displayText = isOpen
                ? editEvReserveFilter
                : selectedUser
                  ? `${selectedUser.name}${selectedUser.phone ? ` (${selectedUser.phone})` : ""}`
                  : "";
              const filteredUsers = users.filter(
                (u) =>
                  !editEvReserveFilter.trim() ||
                  u.name.toLowerCase().includes(editEvReserveFilter.toLowerCase()) ||
                  (u.phone ?? "").includes(editEvReserveFilter),
              );
              return (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 120px 100px auto",
                    gap: "8px",
                    alignItems: "end",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <span className="form-label">ユーザー</span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        border: "1px solid #dee2e6",
                        borderRadius: "6px",
                        backgroundColor: "#fff",
                        minHeight: "38px",
                      }}
                    >
                      <input
                        type="text"
                        className="form-control border-0"
                        style={{ flex: 1, minWidth: 0 }}
                        value={displayText}
                        placeholder="ユーザーを選択"
                        onChange={(e) => {
                          setEditEvReserveFilter(e.target.value);
                          if (!isOpen) setEditEvReserveDropdownOpen(idx);
                        }}
                        onFocus={() => {
                          setEditEvReserveDropdownOpen(idx);
                          setEditEvReserveFilter(
                            selectedUser
                              ? `${selectedUser.name}${selectedUser.phone ? ` (${selectedUser.phone})` : ""}`
                              : "",
                          );
                        }}
                        onBlur={() => setTimeout(() => setEditEvReserveDropdownOpen(null), 150)}
                      />
                      <span style={{ padding: "0 8px", color: "#6c757d", pointerEvents: "none" }}>▼</span>
                    </div>
                    {isOpen && (
                      <ul
                        className="list-unstyled mb-0"
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          top: "100%",
                          marginTop: "2px",
                          maxHeight: "200px",
                          overflowY: "auto",
                          border: "1px solid #dee2e6",
                          borderRadius: "6px",
                          backgroundColor: "#fff",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          zIndex: 10,
                          padding: "4px 0",
                        }}
                      >
                        {selectedUser && (
                          <li
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setEditEvToAdd((prev) => prev.map((r, i) => (i === idx ? { ...r, userId: "" } : r)));
                              setEditEvReserveDropdownOpen(null);
                              setEditEvReserveFilter("");
                            }}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              color: "#6c757d",
                              fontSize: "13px",
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            選択を解除
                          </li>
                        )}
                        {filteredUsers.length === 0 ? (
                          <li style={{ padding: "8px 12px", color: "#6c757d", fontSize: "14px" }}>該当なし</li>
                        ) : (
                          filteredUsers.map((u) => {
                            const disabled = otherSelectedIds.has(u.id);
                            return (
                              <li
                                key={u.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  if (disabled) return;
                                  setEditEvToAdd((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, userId: u.id } : r)),
                                  );
                                  setEditEvReserveDropdownOpen(null);
                                  setEditEvReserveFilter("");
                                }}
                                style={{
                                  padding: "8px 12px",
                                  cursor: disabled ? "not-allowed" : "pointer",
                                  opacity: disabled ? 0.5 : 1,
                                  color: disabled ? "#adb5bd" : "#212529",
                                  backgroundColor: disabled ? "#f8f9fa" : "transparent",
                                  fontSize: "14px",
                                }}
                              >
                                {u.name}
                                {u.phone ? ` (${u.phone})` : ""}
                                {disabled ? " — 選択済み" : ""}
                              </li>
                            );
                          })
                        )}
                      </ul>
                    )}
                  </div>
                  <div>
                    <span className="form-label">種別</span>
                    <select
                      className="form-select"
                      value={row.type}
                      onChange={(e) =>
                        setEditEvToAdd((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, type: e.target.value as "normal" | "makeup" } : r)),
                        )
                      }
                    >
                      <option value="normal">通常</option>
                      <option value="makeup">振替</option>
                    </select>
                  </div>
                  {row.type === "makeup" ? (
                    <div>
                      <span className="form-label">振替権利ID</span>
                      <input
                        type="number"
                        className="form-control"
                        value={row.creditId === "" ? "" : row.creditId}
                        onChange={(e) =>
                          setEditEvToAdd((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, creditId: Number(e.target.value) || "" } : r)),
                          )
                        }
                      />
                    </div>
                  ) : (
                    <div />
                  )}
                  <div>
                    {editEvToAdd.length > 1 ? (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => setEditEvToAdd((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        削除
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {editEvReservations.filter((r) => !editEvToCancel.has(r.id)).length +
              editEvToAdd.filter((r) => r.userId !== "").length <
              editEvCapacity && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setEditEvToAdd((prev) => [...prev, { userId: "", type: "normal", creditId: "" }])}
              >
                ＋もう1人追加
              </button>
            )}
          </div>

          <div
            style={{
              marginTop: "16px",
              padding: "12px 14px",
              backgroundColor: "#f0f9ff",
              borderRadius: "8px",
              border: "1px solid #bae6fd",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#0369a1", marginBottom: "8px" }}>
              変更の反映（毎週予約のように）
            </div>
            <label
              style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "6px" }}
            >
              <input
                type="radio"
                name="editApplyTo"
                checked={editApplyToFuture === "only"}
                onChange={() => setEditApplyToFuture("only")}
              />
              <span style={{ fontSize: "13px" }}>このイベントのみ</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="radio"
                name="editApplyTo"
                checked={editApplyToFuture === "future"}
                onChange={() => setEditApplyToFuture("future")}
              />
              <span style={{ fontSize: "13px" }}>同じ曜日・時間の今後のイベントにも反映する</span>
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
            <button
              type="button"
              onClick={deleteFromEditModal}
              style={{
                fontSize: "13px",
                padding: "6px 16px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#991b1b",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              削除
            </button>
            {editModalErr && (
              <div className="alert alert-danger py-2 px-3 mb-0 small" role="alert">
                {editModalErr}
              </div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setEditModalErr("");
                }}
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
                onClick={saveEditEvent}
                style={{
                  fontSize: "13px",
                  padding: "6px 16px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#3b82f6",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
