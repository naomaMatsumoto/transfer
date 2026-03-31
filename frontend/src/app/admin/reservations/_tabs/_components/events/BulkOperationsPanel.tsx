"use client";

import { useState } from "react";
import { getApiErrorMessage, type ApiErrorExtra } from "@/app/lib/apiErrors";
import { adminGet, adminPost, adminPatch } from "@/app/lib/api";
import { ConfirmModal } from "../../../_components/ConfirmModal";
import type { AdminEvent, AdminReservation, User } from "../../../types";

type Props = {
  events: AdminEvent[];
  selectedIds: Set<number>;
  onSelectIds: (ids: Set<number>) => void;
  flash: (m: string) => void;
  flashErr: (m: string) => void;
  onReload: () => void;
  users: User[];
  show: boolean;
};

export function BulkOperationsPanel({
  events,
  selectedIds,
  onSelectIds,
  flash,
  flashErr,
  onReload,
  users,
  show,
}: Props) {
  const [bulkFilterWeekdays, setBulkFilterWeekdays] = useState<number[]>([1, 2, 3, 4, 5]); // 月〜金
  const [bulkFilterStartTime, setBulkFilterStartTime] = useState("16:00");
  const [bulkFilterEndTime, setBulkFilterEndTime] = useState("17:00");
  const [bulkEditStartTime, setBulkEditStartTime] = useState("16:00");
  const [bulkEditEndTime, setBulkEditEndTime] = useState("17:00");
  const [bulkCapacityValue, setBulkCapacityValue] = useState(6);
  const [bulkReserveUserId, setBulkReserveUserId] = useState<number | "">("");
  const [bulkReserveType, setBulkReserveType] = useState<"normal" | "makeup">("normal");
  const [bulkReserveCreditId, setBulkReserveCreditId] = useState<number | "">("");
  const [bulkCancelUserId, setBulkCancelUserId] = useState<number | "">("");

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

  const toggleBulkFilterWeekday = (day: number) => {
    setBulkFilterWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  };

  const selectByCondition = () => {
    if (bulkFilterWeekdays.length === 0) {
      flashErr("曜日を1つ以上選んでください");
      return;
    }
    const start = bulkFilterStartTime;
    const end = bulkFilterEndTime;
    const ids = events
      .filter((ev) => {
        const d = new Date(ev.starts_at);
        const day = d.getDay();
        const t = (ev.starts_at ?? "").slice(11, 16);
        return bulkFilterWeekdays.includes(day) && t >= start && t <= end;
      })
      .map((ev) => ev.id);
    onSelectIds(new Set(ids));
    flash(ids.length > 0 ? `条件に該当する ${ids.length} 件を選択しました` : "条件に該当するイベントはありません");
  };

  const selectAll = () => {
    onSelectIds(new Set(events.map((e) => e.id)));
  };

  const deselectAll = () => {
    onSelectIds(new Set());
  };

  const requestBulkDelete = () => {
    const ids = Array.from(selectedIds).map((id) => Number(id));
    if (ids.length === 0) {
      flashErr("イベントを選択してください");
      return;
    }
    openModal(
      "まとめて削除",
      `${ids.length} 件のイベントを削除します。この操作は取り消せません。`,
      async (p) => {
        const idsToDelete = p?.ids ?? [];
        if (idsToDelete.length === 0) {
          flashErr("削除対象がありません");
          return;
        }
        const r = await adminPost<{ deleted: number }>("/events/bulk-delete", { ids: idsToDelete });
        if (!r.ok) {
          const data = r.data as { error?: string } | undefined;
          if (data?.error === "EVENT_BULK_DELETE_HAS_RESERVATIONS") {
            setModal({
              title: "強制削除の確認",
              message: `${getApiErrorMessage(data.error, data as ApiErrorExtra)} 削除すると予約も取り消されます。それでも強制削除しますか？`,
              confirmLabel: "強制削除する",
              confirmColor: "#991b1b",
              payload: { ids: idsToDelete },
              action: async (payload2) => {
                const idList = payload2?.ids ?? [];
                if (idList.length === 0) return;
                const r2 = await adminPost<{ deleted: number }>("/events/bulk-delete", { ids: idList, force: true });
                if (!r2.ok) {
                  flashErr(getApiErrorMessage((r2.data as { error?: string })?.error, r2.data as ApiErrorExtra));
                  return;
                }
                const result = r2.data as { deleted: number };
                flash(`${result.deleted} 件のイベントを強制削除しました（予約も取り消しました）`);
                onSelectIds(new Set());
                onReload();
              },
            });
            return false;
          }
          flashErr(getApiErrorMessage(data?.error, data as ApiErrorExtra | undefined));
          return;
        }
        const data = r.data as { deleted: number };
        flash(`${data.deleted} 件のイベントを削除しました`);
        onSelectIds(new Set());
        onReload();
      },
      "削除する",
      "#991b1b",
      { ids },
    );
  };

  const requestBulkStatus = (status: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      flashErr("イベントを選択してください");
      return;
    }
    const statusLabel = status === "scheduled" ? "開催" : status === "holiday" ? "通常休み" : "休講";
    openModal("ステータス一括変更", `${ids.length} 件のイベントを「${statusLabel}」に変更します。`, async () => {
      const r = await adminPost<{ updated: number }>("/events/bulk-status", { ids, status });
      if (!r.ok) {
        flashErr(getApiErrorMessage((r.data as { error?: string })?.error));
        return;
      }
      const data = r.data as { updated: number };
      flash(`${data.updated} 件を ${statusLabel} に変更しました`);
      onSelectIds(new Set());
      onReload();
    });
  };

  const requestBulkCapacity = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      flashErr("イベントを選択してください");
      return;
    }
    openModal("定員一括変更", `${ids.length} 件のイベントの定員を ${bulkCapacityValue} 人に変更します。`, async () => {
      const r = await adminPost<{ updated: number; capacity: number }>("/events/bulk-capacity", {
        ids,
        capacity: bulkCapacityValue,
      });
      if (!r.ok) {
        flashErr(getApiErrorMessage((r.data as { error?: string })?.error));
        return;
      }
      const data = r.data as { updated: number; capacity: number };
      flash(`${data.updated} 件の定員を ${data.capacity} に変更しました`);
      onSelectIds(new Set());
      onReload();
    });
  };

  const requestBulkTime = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      flashErr("イベントを選択してください");
      return;
    }
    openModal(
      "時間一括変更",
      `${ids.length} 件のイベントの時間を ${bulkEditStartTime} ～ ${bulkEditEndTime} に変更します。（日付はそのまま）`,
      async () => {
        const r = await adminPost<{ updated: number; startTime: string; endTime: string }>("/events/bulk-time", {
          ids,
          startTime: bulkEditStartTime,
          endTime: bulkEditEndTime,
        });
        if (!r.ok) {
          flashErr(getApiErrorMessage((r.data as { error?: string })?.error));
          return;
        }
        const data = r.data as { updated: number; startTime: string; endTime: string };
        flash(`${data.updated} 件の時間を ${data.startTime}～${data.endTime} に変更しました`);
        onSelectIds(new Set());
        onReload();
      },
    );
  };

  const requestBulkReserveAdd = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      flashErr("イベントを選択してください");
      return;
    }
    if (!bulkReserveUserId) {
      flashErr("ユーザーを選択してください");
      return;
    }
    if (bulkReserveType === "makeup" && !bulkReserveCreditId) {
      flashErr("振替で追加する場合は振替権利IDを入力してください");
      return;
    }
    let created = 0;
    let skipped = 0;
    for (const eventId of ids) {
      const r = await adminPost("/reservations", {
        userId: bulkReserveUserId,
        eventId,
        reservationType: bulkReserveType,
        makeupCreditId: bulkReserveType === "makeup" && bulkReserveCreditId ? bulkReserveCreditId : null,
        overrideCapacity: false,
      });
      if (r.ok) created++;
      else skipped++;
    }
    if (created > 0) {
      flash(
        `選択した ${ids.length} 件のイベントのうち ${created} 件に予約を追加しました${skipped > 0 ? `（${skipped} 件は既に予約済みなどでスキップ）` : ""}`,
      );
      onReload();
    }
    if (created === 0 && skipped > 0) flashErr("すべてスキップされました（既に予約済みまたは定員超過の可能性）");
  };

  const requestBulkReserveCancel = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      flashErr("イベントを選択してください");
      return;
    }
    if (!bulkCancelUserId) {
      flashErr("キャンセルするユーザーを選択してください");
      return;
    }
    let canceled = 0;
    for (const eventId of ids) {
      const listR = await adminGet<AdminReservation[]>(`/reservations?eventId=${eventId}`);
      if (!listR.ok) continue;
      const list = listR.data ?? [];
      const found = list.find(
        (x: AdminReservation) => x.user_id === bulkCancelUserId && x.status !== "canceled" && !x.canceled_at,
      );
      if (!found) continue;
      const cancelR = await adminPatch(`/reservations/${found.id}/cancel`);
      if (cancelR.ok) canceled++;
    }
    if (canceled > 0) {
      const u = users.find((x) => x.id === bulkCancelUserId);
      flash(`選択したイベントから ${u?.name ?? `ID${bulkCancelUserId}`} の予約を ${canceled} 件キャンセルしました`);
      onReload();
    } else {
      flashErr("キャンセルできる予約がありませんでした");
    }
  };

  const hasSelection = selectedIds.size > 0;

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

      {/* まとめ操作パネル（テーブル時は常時、カレンダー時は選択モードのみ） */}
      <div
        className="card mb-3"
        style={{
          padding: show ? "16px" : "0 16px",
          maxHeight: show ? "none" : "0",
          opacity: show ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 0.3s ease, opacity 0.25s ease, padding 0.25s ease, margin 0.25s ease",
          marginBottom: show ? "12px" : "0",
          border: show ? "1px solid #e5e7eb" : "1px solid transparent",
        }}
      >
        {show && (
          <>
            {/* 条件で選択（毎週の予定のように：曜日＋時間） */}
            <div
              style={{
                marginBottom: "16px",
                padding: "14px 16px",
                backgroundColor: "#f0f9ff",
                borderRadius: "10px",
                border: "1px solid #bae6fd",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#0369a1", marginBottom: "10px" }}>
                条件で選択（毎週の予定のように）
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", marginRight: "4px" }}>曜日</span>
                  {(["日", "月", "火", "水", "木", "金", "土"] as const).map((w, i) => (
                    <label
                      key={w}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        border: bulkFilterWeekdays.includes(i) ? "2px solid #0284c7" : "1px solid #e2e8f0",
                        backgroundColor: bulkFilterWeekdays.includes(i) ? "#e0f2fe" : "#fff",
                        color: bulkFilterWeekdays.includes(i)
                          ? "#0369a1"
                          : i === 0
                            ? "#dc2626"
                            : i === 6
                              ? "#2563eb"
                              : "#64748b",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={bulkFilterWeekdays.includes(i)}
                        onChange={() => toggleBulkFilterWeekday(i)}
                        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
                      />
                      {w}
                    </label>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>時間</span>
                  <input
                    type="time"
                    value={bulkFilterStartTime}
                    onChange={(e) => setBulkFilterStartTime(e.target.value)}
                    className="form-control form-control-sm"
                    style={{ width: "90px" }}
                  />
                  <span style={{ fontSize: "12px", color: "#64748b" }}>～</span>
                  <input
                    type="time"
                    value={bulkFilterEndTime}
                    onChange={(e) => setBulkFilterEndTime(e.target.value)}
                    className="form-control form-control-sm"
                    style={{ width: "90px" }}
                  />
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={selectByCondition}>
                  この条件で選択
                </button>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  （現在の表示範囲で{" "}
                  {
                    events.filter((ev) => {
                      const day = new Date(ev.starts_at).getDay();
                      const t = (ev.starts_at ?? "").slice(11, 16);
                      return bulkFilterWeekdays.includes(day) && t >= bulkFilterStartTime && t <= bulkFilterEndTime;
                    }).length
                  }{" "}
                  件が該当）
                </span>
              </div>
            </div>

            <div
              style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}
            >
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>まとめて操作</span>
              <span style={{ fontSize: "13px", color: "#6b7280" }}>{selectedIds.size} 件選択中</span>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={selectAll}>
                全選択
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={deselectAll}>
                選択解除
              </button>
            </div>

            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6b7280",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                  }}
                >
                  ステータス
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={() => requestBulkStatus("scheduled")}
                    disabled={!hasSelection}
                  >
                    開催に
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => requestBulkStatus("holiday")}
                    disabled={!hasSelection}
                  >
                    通常休みに
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => requestBulkStatus("canceled_by_admin")}
                    disabled={!hasSelection}
                  >
                    休講に
                  </button>
                </div>
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6b7280",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                  }}
                >
                  定員
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="number"
                    min={0}
                    value={bulkCapacityValue}
                    onChange={(e) => setBulkCapacityValue(Number(e.target.value))}
                    className="form-control form-control-sm"
                    style={{ width: "64px" }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={requestBulkCapacity}
                    disabled={!hasSelection}
                  >
                    定員変更
                  </button>
                </div>
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6b7280",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                  }}
                >
                  時間
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="time"
                    value={bulkEditStartTime}
                    onChange={(e) => setBulkEditStartTime(e.target.value)}
                    className="form-control form-control-sm"
                    style={{ width: "88px" }}
                  />
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>～</span>
                  <input
                    type="time"
                    value={bulkEditEndTime}
                    onChange={(e) => setBulkEditEndTime(e.target.value)}
                    className="form-control form-control-sm"
                    style={{ width: "88px" }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={requestBulkTime}
                    disabled={!hasSelection}
                  >
                    時間変更
                  </button>
                </div>
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6b7280",
                    marginBottom: "4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                  }}
                >
                  予約（メンバー）
                </div>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "10px" }}>
                  選択したイベントの予約を追加・削除できます
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#059669",
                        marginBottom: "4px",
                        display: "block",
                      }}
                    >
                      追加
                    </span>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                      <select
                        className="form-select form-select-sm"
                        style={{ width: "140px" }}
                        value={bulkReserveUserId === "" ? "" : bulkReserveUserId}
                        onChange={(e) => setBulkReserveUserId(Number(e.target.value) || "")}
                      >
                        <option value="">ユーザー選択</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                            {u.phone ? ` (${u.phone})` : ""}
                          </option>
                        ))}
                      </select>
                      <select
                        className="form-select form-select-sm"
                        style={{ width: "72px" }}
                        value={bulkReserveType}
                        onChange={(e) => setBulkReserveType(e.target.value as "normal" | "makeup")}
                      >
                        <option value="normal">通常</option>
                        <option value="makeup">振替</option>
                      </select>
                      {bulkReserveType === "makeup" && (
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          placeholder="振替ID"
                          style={{ width: "70px" }}
                          value={bulkReserveCreditId === "" ? "" : bulkReserveCreditId}
                          onChange={(e) => setBulkReserveCreditId(Number(e.target.value) || "")}
                        />
                      )}
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        onClick={requestBulkReserveAdd}
                        disabled={!hasSelection || !bulkReserveUserId}
                      >
                        追加
                      </button>
                    </div>
                  </div>
                  <div style={{ paddingTop: "8px", borderTop: "1px solid #e5e7eb" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#b45309",
                        marginBottom: "4px",
                        display: "block",
                      }}
                    >
                      削除（キャンセル）
                    </span>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                      <select
                        className="form-select form-select-sm"
                        style={{ width: "140px" }}
                        value={bulkCancelUserId === "" ? "" : bulkCancelUserId}
                        onChange={(e) => setBulkCancelUserId(Number(e.target.value) || "")}
                      >
                        <option value="">ユーザー選択</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                            {u.phone ? ` (${u.phone})` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-warning btn-sm"
                        onClick={requestBulkReserveCancel}
                        disabled={!hasSelection || !bulkCancelUserId}
                      >
                        予約を削除
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  backgroundColor: "#fef2f2",
                  borderRadius: "8px",
                  border: "1px solid #fecaca",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#b91c1c",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                  }}
                >
                  削除
                </div>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={requestBulkDelete}
                  disabled={!hasSelection}
                >
                  選択をまとめて削除
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
