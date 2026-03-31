"use client";

import { useState } from "react";
import { getApiErrorMessage } from "@/app/lib/apiErrors";
import { adminPost } from "@/app/lib/api";
import type { ClassType, User, Staff } from "../../../types";
import type { ReserveRow } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  onReload?: () => void; // called when events should reload but modal should stay open (partial success)
  classTypes: ClassType[];
  users: User[];
  staff: Staff[];
  flash: (m: string) => void;
  flashErr: (m: string) => void;
};

export function EventCreateModal({
  open,
  onClose,
  onCreated,
  onReload,
  classTypes,
  users,
  staff,
  flash,
  flashErr,
}: Props) {
  // mode toggle
  const [eventCreateMode, setEventCreateMode] = useState<"single" | "bulk">("single");
  const [createModalErr, setCreateModalErr] = useState("");

  // single create form
  const [newClassType, setNewClassType] = useState<number | "">("");
  const [newStartsAt, setNewStartsAt] = useState("");
  const [newEndsAt, setNewEndsAt] = useState("");
  const [newCapacity, setNewCapacity] = useState(6);
  const [newEventStaffIds, setNewEventStaffIds] = useState<number[]>([]);
  const [newEventAlsoReserve, setNewEventAlsoReserve] = useState(false);
  const [newEventReserveList, setNewEventReserveList] = useState<ReserveRow[]>([
    { userId: "", type: "normal", creditId: "" },
  ]);
  const [openReserveUserDropdown, setOpenReserveUserDropdown] = useState<number | null>(null);
  const [reserveUserFilter, setReserveUserFilter] = useState("");

  // bulk create form
  const [bulkClassType, setBulkClassType] = useState<number | "">("");
  const [bulkStartTime, setBulkStartTime] = useState("16:00");
  const [bulkEndTime, setBulkEndTime] = useState("17:00");
  const [bulkCapacity, setBulkCapacity] = useState(6);
  const [bulkCreateStaffIds, setBulkCreateStaffIds] = useState<number[]>([]);
  const [bulkWeekdays, setBulkWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6]); // 月〜土（日曜以外）
  const [bulkDateFrom, setBulkDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [bulkDateTo, setBulkDateTo] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [bulkExclude, setBulkExclude] = useState("");
  const [bulkAlsoReserve, setBulkAlsoReserve] = useState(false);
  const [bulkReserveList, setBulkReserveList] = useState<ReserveRow[]>([{ userId: "", type: "normal", creditId: "" }]);
  const [bulkReserveDropdownOpen, setBulkReserveDropdownOpen] = useState<number | null>(null);
  const [bulkReserveFilter, setBulkReserveFilter] = useState("");

  const toggleWeekday = (day: number) => {
    setBulkWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  };

  const handleCreateEvent = async () => {
    setCreateModalErr("");
    if (!newClassType || !newStartsAt || !newEndsAt) {
      setCreateModalErr("入力を埋めてください");
      return;
    }
    const toReserve = newEventAlsoReserve ? newEventReserveList.filter((r) => r.userId !== "") : [];
    if (toReserve.length > newCapacity) {
      setCreateModalErr(`予約数は定員（${newCapacity}人）以内にしてください`);
      return;
    }
    const reserveUserIds = toReserve.map((r) => r.userId);
    if (new Set(reserveUserIds).size !== reserveUserIds.length) {
      setCreateModalErr("同じユーザーは複数回登録できません");
      return;
    }
    const makeupWithoutCredit = toReserve.find((r) => r.type === "makeup" && (r.creditId === "" || !r.creditId));
    if (makeupWithoutCredit) {
      setCreateModalErr("振替で予約する場合は、振替権利を選択してください");
      return;
    }
    const r = await adminPost<{ id: number }>("/events", {
      classTypeId: newClassType,
      startsAt: newStartsAt,
      endsAt: newEndsAt,
      capacity: newCapacity,
      staffIds: newEventStaffIds.length > 0 ? newEventStaffIds : undefined,
    });
    if (!r.ok) {
      setCreateModalErr(getApiErrorMessage((r.data as { error?: string })?.error));
      return;
    }
    const data = r.data as { id: number };
    if (data?.id && toReserve.length > 0) {
      let created = 0;
      for (const row of toReserve) {
        if (!row.userId) continue;
        const rr = await adminPost("/reservations", {
          userId: row.userId,
          eventId: data.id,
          reservationType: row.type,
          makeupCreditId: row.type === "makeup" && row.creditId ? row.creditId : null,
          overrideCapacity: false,
        });
        if (!rr.ok) {
          setCreateModalErr(getApiErrorMessage((rr.data as { error?: string })?.error));
          onReload?.();
          return;
        }
        created++;
      }
      flash(`イベントを作成し、${created} 件の予約を作成しました（イベント #${data.id}）`);
    } else {
      flash("イベントを作成しました");
    }
    setNewClassType("");
    setNewStartsAt("");
    setNewEndsAt("");
    setNewEventStaffIds([]);
    setNewEventAlsoReserve(false);
    setNewEventReserveList([{ userId: "", type: "normal", creditId: "" }]);
    onCreated();
  };

  const handleBulkCreate = async () => {
    setCreateModalErr("");
    if (!bulkClassType) {
      setCreateModalErr("クラス種別を選択してください");
      return;
    }
    if (bulkWeekdays.length === 0) {
      setCreateModalErr("曜日を1つ以上選択してください");
      return;
    }
    const toReserve = bulkAlsoReserve ? bulkReserveList.filter((r) => r.userId !== "") : [];
    if (toReserve.length > bulkCapacity) {
      setCreateModalErr(`予約数は定員（${bulkCapacity}人）以内にしてください`);
      return;
    }
    const reserveUserIds = toReserve.map((r) => r.userId);
    if (new Set(reserveUserIds).size !== reserveUserIds.length) {
      setCreateModalErr("同じユーザーは複数回登録できません");
      return;
    }
    const makeupWithoutCredit = toReserve.find((r) => r.type === "makeup" && (r.creditId === "" || !r.creditId));
    if (makeupWithoutCredit) {
      setCreateModalErr("振替で予約する場合は、振替権利を選択してください");
      return;
    }
    const excludeDates = bulkExclude
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const r = await adminPost<{ count: number; events: { id: number; date: string }[] }>("/events/bulk", {
      classTypeId: bulkClassType,
      startTime: bulkStartTime,
      endTime: bulkEndTime,
      capacity: bulkCapacity,
      weekdays: bulkWeekdays,
      dateFrom: bulkDateFrom,
      dateTo: bulkDateTo,
      excludeDates,
      staffIds: bulkCreateStaffIds.length > 0 ? bulkCreateStaffIds : undefined,
    });
    if (!r.ok) {
      setCreateModalErr(getApiErrorMessage((r.data as { error?: string })?.error));
      return;
    }
    const data = r.data as { count: number; events: { id: number; date: string }[] };
    let reservationsCreated = 0;
    if (data.events?.length > 0 && toReserve.length > 0) {
      for (const ev of data.events) {
        for (const row of toReserve) {
          if (!row.userId) continue;
          const rr = await adminPost("/reservations", {
            userId: row.userId,
            eventId: ev.id,
            reservationType: row.type,
            makeupCreditId: row.type === "makeup" && row.creditId ? row.creditId : null,
            overrideCapacity: false,
          });
          if (rr.ok) reservationsCreated++;
        }
      }
    }
    flash(
      reservationsCreated > 0
        ? `${data.count} 件のイベントを作成し、${reservationsCreated} 件の予約を作成しました`
        : `${data.count} 件のイベントをまとめて作成しました`,
    );
    if (bulkAlsoReserve) setBulkReserveList([{ userId: "", type: "normal", creditId: "" }]);
    setBulkAlsoReserve(false);
    onCreated();
  };

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
        zIndex: 9998,
        animation: "fadeIn 0.2s ease",
      }}
      onClick={() => {
        onClose();
        setCreateModalErr("");
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "24px",
          minWidth: "420px",
          maxWidth: "560px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
          animation: "slideUp 0.25s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fs-6 fw-bold mb-0">イベント作成</h3>
          <button
            type="button"
            className="btn-close"
            onClick={() => {
              onClose();
              setCreateModalErr("");
            }}
            aria-label="閉じる"
          />
        </div>

        {/* Mode toggle */}
        <div className="btn-group btn-group-sm w-100 mb-4">
          <button
            type="button"
            className={`btn ${eventCreateMode === "single" ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => {
              setEventCreateMode("single");
              setCreateModalErr("");
            }}
          >
            1件作成
          </button>
          <button
            type="button"
            className={`btn ${eventCreateMode === "bulk" ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => {
              setEventCreateMode("bulk");
              setCreateModalErr("");
            }}
          >
            一括作成（曜日×期間）
          </button>
        </div>

        {createModalErr && (
          <div className="alert alert-danger py-2 px-3 mb-3 small" role="alert">
            {createModalErr}
          </div>
        )}

        <div key={eventCreateMode}>
          {eventCreateMode === "single" ? (
            <>
              {/* クラス種別 */}
              <div className="mb-3">
                <label className="form-label small fw-medium">クラス種別</label>
                <select
                  className="form-select form-select-sm"
                  value={newClassType}
                  onChange={(e) => setNewClassType(Number(e.target.value) || "")}
                >
                  <option value="">選択してください</option>
                  {classTypes.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 日時 */}
              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-medium">開始日時</label>
                  <input
                    type="datetime-local"
                    className="form-control form-control-sm"
                    value={newStartsAt}
                    onChange={(e) => setNewStartsAt(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-medium">終了日時</label>
                  <input
                    type="datetime-local"
                    className="form-control form-control-sm"
                    value={newEndsAt}
                    onChange={(e) => setNewEndsAt(e.target.value)}
                  />
                </div>
              </div>

              {/* 定員 */}
              <div className="mb-3">
                <label className="form-label small fw-medium">定員（人）</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  style={{ maxWidth: "100px" }}
                  value={newCapacity}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setNewCapacity(v);
                    setNewEventReserveList((prev) => (prev.length > v ? prev.slice(0, v) : prev));
                  }}
                  min={1}
                />
              </div>

              {/* スタッフ */}
              <div className="mb-3">
                <label className="form-label small fw-medium">担当スタッフ</label>
                {staff.length === 0 ? (
                  <p className="small text-body-secondary mb-0">
                    スタッフがいません。スタッフ管理タブで登録してください。
                  </p>
                ) : (
                  <div className="d-flex flex-wrap gap-3">
                    {staff.map((s) => (
                      <label
                        key={s.id}
                        className="d-flex align-items-center gap-2 mb-0 small"
                        style={{ cursor: "pointer" }}
                      >
                        <input
                          type="checkbox"
                          className="form-check-input mt-0"
                          checked={newEventStaffIds.includes(s.id)}
                          onChange={(e) =>
                            setNewEventStaffIds((prev) =>
                              e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                            )
                          }
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 作成と同時に予約 */}
              <div className="border-top pt-3 mb-3">
                <label className="d-flex align-items-center gap-2 mb-0 small" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    className="form-check-input mt-0"
                    checked={newEventAlsoReserve}
                    onChange={(e) => setNewEventAlsoReserve(e.target.checked)}
                  />
                  <span className="fw-medium">作成と同時に予約する</span>
                </label>
                {newEventAlsoReserve && (
                  <div className="mt-3">
                    <p className="small text-body-secondary mb-2">予約するユーザー（定員 {newCapacity} 人まで）</p>
                    {newEventReserveList.map((row, idx) => {
                      const otherSelectedIds = new Set(
                        newEventReserveList
                          .map((r, i) => (i === idx ? null : r.userId))
                          .filter((id): id is number => id !== ""),
                      );
                      const isOpen = openReserveUserDropdown === idx;
                      const selectedUser = row.userId !== "" ? users.find((u) => u.id === row.userId) : null;
                      const displayText = isOpen
                        ? reserveUserFilter
                        : selectedUser
                          ? `${selectedUser.name}${selectedUser.phone ? ` (${selectedUser.phone})` : ""}`
                          : "";
                      const filteredUsers = users.filter(
                        (u) =>
                          !reserveUserFilter.trim() ||
                          u.name.toLowerCase().includes(reserveUserFilter.toLowerCase()) ||
                          (u.phone ?? "").includes(reserveUserFilter),
                      );
                      return (
                        <div key={idx} className="d-flex gap-2 align-items-end mb-2 flex-wrap">
                          <div style={{ position: "relative", flex: "1 1 160px", minWidth: 0 }}>
                            <label className="form-label small mb-1">ユーザー</label>
                            <div
                              className="d-flex align-items-center border rounded"
                              style={{ backgroundColor: "#fff", minHeight: "31px" }}
                            >
                              <input
                                type="text"
                                className="form-control form-control-sm border-0 shadow-none"
                                style={{ flex: 1, minWidth: 0 }}
                                value={displayText}
                                placeholder="名前・電話で検索"
                                onChange={(e) => {
                                  setReserveUserFilter(e.target.value);
                                  if (!isOpen) setOpenReserveUserDropdown(idx);
                                }}
                                onFocus={() => {
                                  setOpenReserveUserDropdown(idx);
                                  setReserveUserFilter(
                                    selectedUser
                                      ? `${selectedUser.name}${selectedUser.phone ? ` (${selectedUser.phone})` : ""}`
                                      : "",
                                  );
                                }}
                                onBlur={() => setTimeout(() => setOpenReserveUserDropdown(null), 150)}
                              />
                              <span className="px-2 text-body-secondary small" style={{ pointerEvents: "none" }}>
                                ▼
                              </span>
                            </div>
                            {isOpen && (
                              <ul
                                className="list-unstyled mb-0 position-absolute w-100 border rounded shadow-sm"
                                style={{
                                  top: "100%",
                                  marginTop: "2px",
                                  maxHeight: "200px",
                                  overflowY: "auto",
                                  backgroundColor: "#fff",
                                  zIndex: 10,
                                  padding: "4px 0",
                                }}
                              >
                                {selectedUser && (
                                  <li
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setNewEventReserveList((prev) =>
                                        prev.map((r, i) => (i === idx ? { ...r, userId: "" } : r)),
                                      );
                                      setOpenReserveUserDropdown(null);
                                      setReserveUserFilter("");
                                    }}
                                    className="px-3 py-2 small text-body-secondary"
                                    style={{ cursor: "pointer", borderBottom: "1px solid #eee" }}
                                  >
                                    選択を解除
                                  </li>
                                )}
                                {filteredUsers.length === 0 ? (
                                  <li className="px-3 py-2 small text-body-secondary">該当なし</li>
                                ) : (
                                  filteredUsers.map((u) => {
                                    const disabled = otherSelectedIds.has(u.id);
                                    return (
                                      <li
                                        key={u.id}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          if (disabled) return;
                                          setNewEventReserveList((prev) =>
                                            prev.map((r, i) => (i === idx ? { ...r, userId: u.id } : r)),
                                          );
                                          setOpenReserveUserDropdown(null);
                                          setReserveUserFilter("");
                                        }}
                                        className="px-3 py-2 small"
                                        style={{
                                          cursor: disabled ? "not-allowed" : "pointer",
                                          opacity: disabled ? 0.5 : 1,
                                          backgroundColor: "transparent",
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
                          <div style={{ flex: "0 0 100px" }}>
                            <label className="form-label small mb-1">種別</label>
                            <select
                              className="form-select form-select-sm"
                              value={row.type}
                              onChange={(e) =>
                                setNewEventReserveList((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, type: e.target.value as "normal" | "makeup" } : r,
                                  ),
                                )
                              }
                            >
                              <option value="normal">通常</option>
                              <option value="makeup">振替</option>
                            </select>
                          </div>
                          {row.type === "makeup" && (
                            <div style={{ flex: "0 0 90px" }}>
                              <label className="form-label small mb-1">権利ID</label>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={row.creditId === "" ? "" : row.creditId}
                                onChange={(e) =>
                                  setNewEventReserveList((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, creditId: Number(e.target.value) || "" } : r,
                                    ),
                                  )
                                }
                              />
                            </div>
                          )}
                          {newEventReserveList.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => setNewEventReserveList((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              削除
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {newEventReserveList.length < newCapacity && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() =>
                          setNewEventReserveList((prev) => [...prev, { userId: "", type: "normal", creditId: "" }])
                        }
                      >
                        ＋もう1人追加
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="d-flex justify-content-end pt-2 border-top">
                <button type="button" className="btn btn-primary btn-sm px-4" onClick={handleCreateEvent}>
                  作成する
                </button>
              </div>
            </>
          ) : (
            <>
              {/* クラス種別 */}
              <div className="mb-3">
                <label className="form-label small fw-medium">クラス種別</label>
                <select
                  className="form-select form-select-sm"
                  value={bulkClassType}
                  onChange={(e) => setBulkClassType(Number(e.target.value) || "")}
                >
                  <option value="">選択してください</option>
                  {classTypes.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 時刻・定員 */}
              <div className="row g-3 mb-3">
                <div className="col-4">
                  <label className="form-label small fw-medium">開始時刻</label>
                  <input
                    type="time"
                    className="form-control form-control-sm"
                    value={bulkStartTime}
                    onChange={(e) => setBulkStartTime(e.target.value)}
                  />
                </div>
                <div className="col-4">
                  <label className="form-label small fw-medium">終了時刻</label>
                  <input
                    type="time"
                    className="form-control form-control-sm"
                    value={bulkEndTime}
                    onChange={(e) => setBulkEndTime(e.target.value)}
                  />
                </div>
                <div className="col-4">
                  <label className="form-label small fw-medium">定員（人）</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={bulkCapacity}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setBulkCapacity(v);
                      setBulkReserveList((prev) => (prev.length > v ? prev.slice(0, v) : prev));
                    }}
                    min={1}
                  />
                </div>
              </div>

              {/* 曜日 */}
              <div className="mb-3">
                <label className="form-label small fw-medium">開催曜日</label>
                <div className="d-flex gap-1 flex-wrap mt-1">
                  {["日", "月", "火", "水", "木", "金", "土"].map((w, i) => (
                    <label
                      key={i}
                      className="d-flex align-items-center justify-content-center small"
                      style={{
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: bulkWeekdays.includes(i) ? "2px solid #0d6efd" : "1px solid #dee2e6",
                        backgroundColor: bulkWeekdays.includes(i) ? "#e7f1ff" : "#fff",
                        color: bulkWeekdays.includes(i) ? "#0a58ca" : "#495057",
                        fontWeight: bulkWeekdays.includes(i) ? 600 : 400,
                        cursor: "pointer",
                        userSelect: "none",
                        minWidth: "36px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={bulkWeekdays.includes(i)}
                        onChange={() => toggleWeekday(i)}
                        style={{ display: "none" }}
                      />
                      {w}
                    </label>
                  ))}
                </div>
              </div>

              {/* スタッフ */}
              <div className="mb-3">
                <label className="form-label small fw-medium">
                  担当スタッフ
                  <span className="text-body-secondary fw-normal ms-1">（全イベントに同じスタッフを割り当て）</span>
                </label>
                {staff.length === 0 ? (
                  <p className="small text-body-secondary mb-0">
                    スタッフがいません。スタッフ管理タブで登録してください。
                  </p>
                ) : (
                  <div className="d-flex flex-wrap gap-3">
                    {staff.map((s) => (
                      <label
                        key={s.id}
                        className="d-flex align-items-center gap-2 mb-0 small"
                        style={{ cursor: "pointer" }}
                      >
                        <input
                          type="checkbox"
                          className="form-check-input mt-0"
                          checked={bulkCreateStaffIds.includes(s.id)}
                          onChange={(e) =>
                            setBulkCreateStaffIds((prev) =>
                              e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                            )
                          }
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 期間 */}
              <div className="row g-3 mb-3">
                <div className="col-4">
                  <label className="form-label small fw-medium">開始日</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={bulkDateFrom}
                    onChange={(e) => setBulkDateFrom(e.target.value)}
                  />
                </div>
                <div className="col-4">
                  <label className="form-label small fw-medium">終了日</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={bulkDateTo}
                    onChange={(e) => setBulkDateTo(e.target.value)}
                  />
                </div>
                <div className="col-4">
                  <label className="form-label small fw-medium">除外日</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={bulkExclude}
                    onChange={(e) => setBulkExclude(e.target.value)}
                    placeholder="2026-03-21, 05-05"
                  />
                </div>
              </div>

              {/* 作成と同時に予約 */}
              <div className="border-top pt-3 mb-3">
                <label className="d-flex align-items-center gap-2 mb-0 small" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    className="form-check-input mt-0"
                    checked={bulkAlsoReserve}
                    onChange={(e) => setBulkAlsoReserve(e.target.checked)}
                  />
                  <span className="fw-medium">作成と同時に予約する</span>
                </label>
                {bulkAlsoReserve && (
                  <div className="mt-3">
                    <p className="small text-body-secondary mb-2">予約するユーザー（定員 {bulkCapacity} 人まで）</p>
                    {bulkReserveList.map((row, idx) => {
                      const otherSelectedIds = new Set(
                        bulkReserveList
                          .map((r, i) => (i === idx ? null : r.userId))
                          .filter((id): id is number => id !== ""),
                      );
                      const isOpen = bulkReserveDropdownOpen === idx;
                      const selectedUser = row.userId !== "" ? users.find((u) => u.id === row.userId) : null;
                      const displayText = isOpen
                        ? bulkReserveFilter
                        : selectedUser
                          ? `${selectedUser.name}${selectedUser.phone ? ` (${selectedUser.phone})` : ""}`
                          : "";
                      const filteredUsers = users.filter(
                        (u) =>
                          !bulkReserveFilter.trim() ||
                          u.name.toLowerCase().includes(bulkReserveFilter.toLowerCase()) ||
                          (u.phone ?? "").includes(bulkReserveFilter),
                      );
                      return (
                        <div key={idx} className="d-flex gap-2 align-items-end mb-2 flex-wrap">
                          <div style={{ position: "relative", flex: "1 1 160px", minWidth: 0 }}>
                            <label className="form-label small mb-1">ユーザー</label>
                            <div
                              className="d-flex align-items-center border rounded"
                              style={{ backgroundColor: "#fff", minHeight: "31px" }}
                            >
                              <input
                                type="text"
                                className="form-control form-control-sm border-0 shadow-none"
                                style={{ flex: 1, minWidth: 0 }}
                                value={displayText}
                                placeholder="名前・電話で検索"
                                onChange={(e) => {
                                  setBulkReserveFilter(e.target.value);
                                  if (!isOpen) setBulkReserveDropdownOpen(idx);
                                }}
                                onFocus={() => {
                                  setBulkReserveDropdownOpen(idx);
                                  setBulkReserveFilter(
                                    selectedUser
                                      ? `${selectedUser.name}${selectedUser.phone ? ` (${selectedUser.phone})` : ""}`
                                      : "",
                                  );
                                }}
                                onBlur={() => setTimeout(() => setBulkReserveDropdownOpen(null), 150)}
                              />
                              <span className="px-2 text-body-secondary small" style={{ pointerEvents: "none" }}>
                                ▼
                              </span>
                            </div>
                            {isOpen && (
                              <ul
                                className="list-unstyled mb-0 position-absolute w-100 border rounded shadow-sm"
                                style={{
                                  top: "100%",
                                  marginTop: "2px",
                                  maxHeight: "200px",
                                  overflowY: "auto",
                                  backgroundColor: "#fff",
                                  zIndex: 10,
                                  padding: "4px 0",
                                }}
                              >
                                {selectedUser && (
                                  <li
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setBulkReserveList((prev) =>
                                        prev.map((r, i) => (i === idx ? { ...r, userId: "" } : r)),
                                      );
                                      setBulkReserveDropdownOpen(null);
                                      setBulkReserveFilter("");
                                    }}
                                    className="px-3 py-2 small text-body-secondary"
                                    style={{ cursor: "pointer", borderBottom: "1px solid #eee" }}
                                  >
                                    選択を解除
                                  </li>
                                )}
                                {filteredUsers.length === 0 ? (
                                  <li className="px-3 py-2 small text-body-secondary">該当なし</li>
                                ) : (
                                  filteredUsers.map((u) => {
                                    const disabled = otherSelectedIds.has(u.id);
                                    return (
                                      <li
                                        key={u.id}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          if (disabled) return;
                                          setBulkReserveList((prev) =>
                                            prev.map((r, i) => (i === idx ? { ...r, userId: u.id } : r)),
                                          );
                                          setBulkReserveDropdownOpen(null);
                                          setBulkReserveFilter("");
                                        }}
                                        className="px-3 py-2 small"
                                        style={{
                                          cursor: disabled ? "not-allowed" : "pointer",
                                          opacity: disabled ? 0.5 : 1,
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
                          <div style={{ flex: "0 0 100px" }}>
                            <label className="form-label small mb-1">種別</label>
                            <select
                              className="form-select form-select-sm"
                              value={row.type}
                              onChange={(e) =>
                                setBulkReserveList((prev) =>
                                  prev.map((r, i) =>
                                    i === idx ? { ...r, type: e.target.value as "normal" | "makeup" } : r,
                                  ),
                                )
                              }
                            >
                              <option value="normal">通常</option>
                              <option value="makeup">振替</option>
                            </select>
                          </div>
                          {row.type === "makeup" && (
                            <div style={{ flex: "0 0 90px" }}>
                              <label className="form-label small mb-1">権利ID</label>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={row.creditId === "" ? "" : row.creditId}
                                onChange={(e) =>
                                  setBulkReserveList((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, creditId: Number(e.target.value) || "" } : r,
                                    ),
                                  )
                                }
                              />
                            </div>
                          )}
                          {bulkReserveList.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => setBulkReserveList((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              削除
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {bulkReserveList.length < bulkCapacity && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() =>
                          setBulkReserveList((prev) => [...prev, { userId: "", type: "normal", creditId: "" }])
                        }
                      >
                        ＋もう1人追加
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="d-flex justify-content-end pt-2 border-top">
                <button type="button" className="btn btn-primary btn-sm px-4" onClick={handleBulkCreate}>
                  まとめて作成
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
