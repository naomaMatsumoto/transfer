"use client";

import { useState, useCallback, useEffect } from "react";
import { getApiErrorMessage, type ApiErrorExtra } from "@/app/lib/apiErrors";
import { adminGet, adminPost, adminPatch, adminPut, adminDelete } from "@/app/lib/api";
import { ConfirmModal } from "../_components/ConfirmModal";
import type { ClassType, User, Staff, AdminEvent, AdminReservation } from "../types";

export function EventsTab({ classTypes, users, staff, flash, flashErr }: { classTypes: ClassType[]; users: User[]; staff: Staff[]; flash: (m: string) => void; flashErr: (m: string) => void; apiBase?: string }) {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10);
  });

  // event create form (1件 / 一括の切替)
  const [eventCreateMode, setEventCreateMode] = useState<"single" | "bulk">("single");
  const [newClassType, setNewClassType] = useState<number | "">("");
  const [newStartsAt, setNewStartsAt] = useState("");
  const [newEndsAt, setNewEndsAt] = useState("");
  const [newCapacity, setNewCapacity] = useState(6);
  const [newEventStaffIds, setNewEventStaffIds] = useState<number[]>([]);
  // 1件作成と同時に予約する（定員数だけ登録可能）
  const [newEventAlsoReserve, setNewEventAlsoReserve] = useState(false);
  type ReserveRow = { userId: number | ""; type: "normal" | "makeup"; creditId: number | "" };
  const [newEventReserveList, setNewEventReserveList] = useState<ReserveRow[]>([{ userId: "", type: "normal", creditId: "" }]);
  const [openReserveUserDropdown, setOpenReserveUserDropdown] = useState<number | null>(null);
  const [reserveUserFilter, setReserveUserFilter] = useState("");
  const [createEventModalOpen, setCreateEventModalOpen] = useState(false);
  const [createModalErr, setCreateModalErr] = useState("");
  const [editModalErr, setEditModalErr] = useState("");

  // 選択（まとめ操作用）
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkCapacityValue, setBulkCapacityValue] = useState(6);
  // 複合条件（曜日＋時間）で選択する用（毎週予約のようなイメージ）
  const [bulkFilterWeekdays, setBulkFilterWeekdays] = useState<number[]>([1, 2, 3, 4, 5]); // 月〜金
  const [bulkFilterStartTime, setBulkFilterStartTime] = useState("16:00");
  const [bulkFilterEndTime, setBulkFilterEndTime] = useState("17:00");

  const toggleBulkFilterWeekday = (day: number) => {
    setBulkFilterWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const selectByCondition = () => {
    if (bulkFilterWeekdays.length === 0) { flashErr("曜日を1つ以上選んでください"); return; }
    const start = bulkFilterStartTime;
    const end = bulkFilterEndTime;
    const ids = events.filter((ev) => {
      const d = new Date(ev.starts_at);
      const day = d.getDay();
      const t = (ev.starts_at ?? "").slice(11, 16);
      return bulkFilterWeekdays.includes(day) && t >= start && t <= end;
    }).map((ev) => ev.id);
    setSelectedIds(new Set(ids));
    flash(ids.length > 0 ? `条件に該当する ${ids.length} 件を選択しました` : "条件に該当するイベントはありません");
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(events.map((e) => e.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // イベント編集モーダル
  const [editEvent, setEditEvent] = useState<AdminEvent | null>(null);
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
  // 保存時に「このイベントのみ」か「今後の同じ曜日・時間にも反映」か（Googleカレンダーの毎週予約のような動作）
  const [editApplyToFuture, setEditApplyToFuture] = useState<"only" | "future">("only");

  const loadEditEventReservations = useCallback(async (eventId: number) => {
    try {
      const r = await adminGet<AdminReservation[]>(`/reservations?eventId=${eventId}`);
      const list = r.ok && Array.isArray(r.data) ? r.data : [];
      setEditEvReservations(list.filter((res: AdminReservation) => res.status !== "canceled" && !res.canceled_at));
    } catch { setEditEvReservations([]); }
  }, []);

  const openEditModal = (ev: AdminEvent) => {
    setEditEvent(ev);
    setEditEvStart(ev.starts_at?.slice(0, 16)?.replace(" ", "T") ?? "");
    setEditEvEnd(ev.ends_at?.slice(0, 16)?.replace(" ", "T") ?? "");
    setEditEvCapacity(ev.capacity);
    setEditEvStatus(ev.status);
    setEditEvStaffIds(Array.isArray(ev.staff) ? ev.staff.map((s) => s.id) : []);
    setEditEvReservations([]);
    setEditEvToCancel(new Set());
    setEditEvToAdd([]);
    setEditEvReserveDropdownOpen(null);
    setEditEvReserveFilter("");
    setEditApplyToFuture("only");
    void loadEditEventReservations(ev.id);
  };

  const saveEditEvent = async () => {
    if (!editEvent) return;
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
    const existingUserIds = new Set(
      editEvReservations.filter((r) => !editEvToCancel.has(r.id)).map((r) => r.user_id)
    );
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
          eventId: editEvent.id,
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
      await adminPatch(`/events/${editEvent.id}/time`, { startsAt: editEvStart.replace("T", " "), endsAt: editEvEnd.replace("T", " ") });
      await adminPatch(`/events/${editEvent.id}/capacity`, { capacity: editEvCapacity });
      if (editEvStatus !== editEvent.status) {
        await adminPatch(`/events/${editEvent.id}/status`, { status: editEvStatus });
      }
      await adminPut(`/events/${editEvent.id}/staff`, { staffIds: editEvStaffIds });
      let futureUpdated = 0;
      const userIdsToCancel = editEvReservations
        .filter((r) => editEvToCancel.has(r.id))
        .map((r) => r.user_id);
      if (editApplyToFuture === "future") {
        const origDate = new Date(editEvent.starts_at);
        const origWeekday = origDate.getDay();
        const origStartTime = (editEvent.starts_at ?? "").slice(11, 16);
        const fromStr = editEvent.starts_at?.slice(0, 10) ?? "";
        const toDate = new Date(origDate);
        toDate.setFullYear(toDate.getFullYear() + 1);
        const toStr = toDate.toISOString().slice(0, 10);
        const futureR = await adminGet<AdminEvent[]>(`/events?from=${fromStr}&to=${toStr}`);
        if (futureR.ok && futureR.data) {
          const list = futureR.data;
          const newStartTime = editEvStart.replace("T", " ").slice(11, 16);
          const newEndTime = editEvEnd.replace("T", " ").slice(11, 16);
          const editEventStartMs = new Date(editEvent.starts_at).getTime();
          for (const ev of list) {
            if (ev.id === editEvent.id) continue;
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
      flash(futureUpdated > 0
        ? `イベント #${editEvent.id} を更新し、同じ曜日・時間の今後の ${futureUpdated} 件にも反映しました`
        : `イベント #${editEvent.id} を更新しました`);
      setEditEvent(null);
      loadEvents();
    } catch {
      setEditModalErr("更新に失敗しました");
    }
  };

  const deleteFromEditModal = () => {
    if (!editEvent) return;
    const idToDelete = editEvent.id;
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
          const origDate = new Date(editEvent.starts_at);
          const origWeekday = origDate.getDay();
          const origStartTime = (editEvent.starts_at ?? "").slice(11, 16);
          const fromStr = editEvent.starts_at?.slice(0, 10) ?? "";
          const toDate = new Date(origDate);
          toDate.setFullYear(toDate.getFullYear() + 1);
          const toStr = toDate.toISOString().slice(0, 10);
          const listR = await adminGet<AdminEvent[]>(`/events?from=${fromStr}&to=${toStr}`);
          if (!listR.ok) {
            flashErr("今後のイベントの取得に失敗しました");
            return;
          }
          const list = listR.data ?? [];
          const editEventStartMs = new Date(editEvent.starts_at).getTime();
          const idsToDelete = list
            .filter((ev) => {
              const evStart = new Date(ev.starts_at);
              return evStart.getTime() >= editEventStartMs && evStart.getDay() === origWeekday && (ev.starts_at ?? "").slice(11, 16) === origStartTime;
            })
            .map((ev) => ev.id);
          if (idsToDelete.length === 0) {
            flashErr("削除対象のイベントが見つかりませんでした");
            return;
          }
          const ok = await runDelete(idsToDelete);
          if (ok) {
            flash(idsToDelete.length > 1
              ? `イベント #${idToDelete} と、同じ曜日・時間の今後の ${idsToDelete.length - 1} 件を削除しました`
              : `イベント #${idToDelete} を削除しました`);
            setEditEvent(null);
            loadEvents();
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
                setEditEvent(null);
                loadEvents();
              },
            });
            return false;
          }
          flashErr(getApiErrorMessage(data?.error, data as ApiErrorExtra | undefined));
          return;
        }
        flash(`イベント #${idToDelete} を削除しました`);
        setEditEvent(null);
        loadEvents();
      },
      "削除する",
      "#991b1b",
    );
  };

  // 確認モーダル状態（payload で ids を渡し、実行時に確実に送る）。action が false を返したらモーダルを閉じない（警告モーダルに差し替え用）
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

  const requestBulkDelete = () => {
    const ids = Array.from(selectedIds).map((id) => Number(id));
    if (ids.length === 0) { flashErr("イベントを選択してください"); return; }
    openModal(
      "まとめて削除",
      `${ids.length} 件のイベントを削除します。この操作は取り消せません。`,
      async (p) => {
        const idsToDelete = p?.ids ?? [];
        if (idsToDelete.length === 0) { flashErr("削除対象がありません"); return; }
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
                setSelectedIds(new Set());
                loadEvents();
              },
            });
            return false;
          }
          flashErr(getApiErrorMessage(data?.error, data as ApiErrorExtra | undefined));
          return;
        }
        const data = r.data as { deleted: number };
        flash(`${data.deleted} 件のイベントを削除しました`);
        setSelectedIds(new Set());
        loadEvents();
      },
      "削除する",
      "#991b1b",
      { ids },
    );
  };

  const requestBulkStatus = (status: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { flashErr("イベントを選択してください"); return; }
    const statusLabel = status === "scheduled" ? "開催" : status === "holiday" ? "通常休み" : "休講";
    openModal(
      "ステータス一括変更",
      `${ids.length} 件のイベントを「${statusLabel}」に変更します。`,
      async () => {
        const r = await adminPost<{ updated: number }>("/events/bulk-status", { ids, status });
        if (!r.ok) {
          flashErr(getApiErrorMessage((r.data as { error?: string })?.error));
          return;
        }
        const data = r.data as { updated: number };
        flash(`${data.updated} 件を ${statusLabel} に変更しました`);
        setSelectedIds(new Set());
        loadEvents();
      },
    );
  };

  const requestBulkCapacity = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { flashErr("イベントを選択してください"); return; }
    openModal(
      "定員一括変更",
      `${ids.length} 件のイベントの定員を ${bulkCapacityValue} 人に変更します。`,
      async () => {
        const r = await adminPost<{ updated: number; capacity: number }>("/events/bulk-capacity", { ids, capacity: bulkCapacityValue });
        if (!r.ok) {
          flashErr(getApiErrorMessage((r.data as { error?: string })?.error));
          return;
        }
        const data = r.data as { updated: number; capacity: number };
        flash(`${data.updated} 件の定員を ${data.capacity} に変更しました`);
        setSelectedIds(new Set());
        loadEvents();
      },
    );
  };

  // bulk time change
  const [bulkEditStartTime, setBulkEditStartTime] = useState("16:00");
  const [bulkEditEndTime, setBulkEditEndTime] = useState("17:00");

  // まとめ操作: 予約（ユーザー）の一括追加・一括キャンセル
  const [bulkReserveUserId, setBulkReserveUserId] = useState<number | "">("");
  const [bulkReserveType, setBulkReserveType] = useState<"normal" | "makeup">("normal");
  const [bulkReserveCreditId, setBulkReserveCreditId] = useState<number | "">("");
  const [bulkCancelUserId, setBulkCancelUserId] = useState<number | "">("");

  const requestBulkReserveAdd = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { flashErr("イベントを選択してください"); return; }
    if (!bulkReserveUserId) { flashErr("ユーザーを選択してください"); return; }
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
      flash(`選択した ${ids.length} 件のイベントのうち ${created} 件に予約を追加しました${skipped > 0 ? `（${skipped} 件は既に予約済みなどでスキップ）` : ""}`);
      loadEvents();
    }
    if (created === 0 && skipped > 0) flashErr("すべてスキップされました（既に予約済みまたは定員超過の可能性）");
  };

  const requestBulkReserveCancel = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { flashErr("イベントを選択してください"); return; }
    if (!bulkCancelUserId) { flashErr("キャンセルするユーザーを選択してください"); return; }
    let canceled = 0;
    for (const eventId of ids) {
      const listR = await adminGet<AdminReservation[]>(`/reservations?eventId=${eventId}`);
      if (!listR.ok) continue;
      const list = listR.data ?? [];
      const found = list.find((x: AdminReservation) => x.user_id === bulkCancelUserId && x.status !== "canceled" && !x.canceled_at);
      if (!found) continue;
      const cancelR = await adminPatch(`/reservations/${found.id}/cancel`);
      if (cancelR.ok) canceled++;
    }
    if (canceled > 0) {
      const u = users.find((x) => x.id === bulkCancelUserId);
      flash(`選択したイベントから ${u?.name ?? `ID${bulkCancelUserId}`} の予約を ${canceled} 件キャンセルしました`);
      loadEvents();
    } else {
      flashErr("キャンセルできる予約がありませんでした");
    }
  };

  const requestBulkTime = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { flashErr("イベントを選択してください"); return; }
    openModal(
      "時間一括変更",
      `${ids.length} 件のイベントの時間を ${bulkEditStartTime} ～ ${bulkEditEndTime} に変更します。（日付はそのまま）`,
      async () => {
        const r = await adminPost<{ updated: number; startTime: string; endTime: string }>("/events/bulk-time", { ids, startTime: bulkEditStartTime, endTime: bulkEditEndTime });
        if (!r.ok) {
          flashErr(getApiErrorMessage((r.data as { error?: string })?.error));
          return;
        }
        const data = r.data as { updated: number; startTime: string; endTime: string };
        flash(`${data.updated} 件の時間を ${data.startTime}～${data.endTime} に変更しました`);
        setSelectedIds(new Set());
        loadEvents();
      },
    );
  };

  // bulk create form
  const [bulkClassType, setBulkClassType] = useState<number | "">("");
  const [bulkStartTime, setBulkStartTime] = useState("16:00");
  const [bulkEndTime, setBulkEndTime] = useState("17:00");
  const [bulkCapacity, setBulkCapacity] = useState(6);
  const [bulkCreateStaffIds, setBulkCreateStaffIds] = useState<number[]>([]);
  const [bulkWeekdays, setBulkWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6]); // 月〜土（日曜以外）
  const [bulkDateFrom, setBulkDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [bulkDateTo, setBulkDateTo] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10);
  });
  const [bulkExclude, setBulkExclude] = useState("");
  const [bulkAlsoReserve, setBulkAlsoReserve] = useState(false);
  const [bulkReserveList, setBulkReserveList] = useState<ReserveRow[]>([{ userId: "", type: "normal", creditId: "" }]);
  const [bulkReserveDropdownOpen, setBulkReserveDropdownOpen] = useState<number | null>(null);
  const [bulkReserveFilter, setBulkReserveFilter] = useState("");

  const loadEvents = useCallback(async () => {
    try {
      const r = await adminGet<AdminEvent[]>(`/events?from=${from}&to=${to}`);
      setEvents(r.ok && Array.isArray(r.data) ? r.data : []);
    } catch { flashErr("イベント読み込み失敗"); }
  }, [from, to, flashErr]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleCreateEvent = async () => {
    setCreateModalErr("");
    if (!newClassType || !newStartsAt || !newEndsAt) { setCreateModalErr("入力を埋めてください"); return; }
    const toReserve = newEventAlsoReserve ? newEventReserveList.filter((r) => r.userId !== "") : [];
    if (toReserve.length > newCapacity) { setCreateModalErr(`予約数は定員（${newCapacity}人）以内にしてください`); return; }
    const reserveUserIds = toReserve.map((r) => r.userId);
    if (new Set(reserveUserIds).size !== reserveUserIds.length) { setCreateModalErr("同じユーザーは複数回登録できません"); return; }
    const makeupWithoutCredit = toReserve.find((r) => r.type === "makeup" && (r.creditId === "" || !r.creditId));
    if (makeupWithoutCredit) { setCreateModalErr("振替で予約する場合は、振替権利を選択してください"); return; }
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
          loadEvents();
          return;
        }
        created++;
      }
      flash(`イベントを作成し、${created} 件の予約を作成しました（イベント #${data.id}）`);
    } else {
      flash("イベントを作成しました");
    }
    setNewClassType(""); setNewStartsAt(""); setNewEndsAt("");
    setNewEventStaffIds([]);
    setNewEventAlsoReserve(false);
    setNewEventReserveList([{ userId: "", type: "normal", creditId: "" }]);
    setCreateEventModalOpen(false);
    loadEvents();
  };

  const handleBulkCreate = async () => {
    setCreateModalErr("");
    if (!bulkClassType) { setCreateModalErr("クラス種別を選択してください"); return; }
    if (bulkWeekdays.length === 0) { setCreateModalErr("曜日を1つ以上選択してください"); return; }
    const toReserve = bulkAlsoReserve ? bulkReserveList.filter((r) => r.userId !== "") : [];
    if (toReserve.length > bulkCapacity) { setCreateModalErr(`予約数は定員（${bulkCapacity}人）以内にしてください`); return; }
    const reserveUserIds = toReserve.map((r) => r.userId);
    if (new Set(reserveUserIds).size !== reserveUserIds.length) { setCreateModalErr("同じユーザーは複数回登録できません"); return; }
    const makeupWithoutCredit = toReserve.find((r) => r.type === "makeup" && (r.creditId === "" || !r.creditId));
    if (makeupWithoutCredit) { setCreateModalErr("振替で予約する場合は、振替権利を選択してください"); return; }
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
    flash(reservationsCreated > 0
      ? `${data.count} 件のイベントを作成し、${reservationsCreated} 件の予約を作成しました`
      : `${data.count} 件のイベントをまとめて作成しました`);
    if (bulkAlsoReserve) setBulkReserveList([{ userId: "", type: "normal", creditId: "" }]);
    setBulkAlsoReserve(false);
    setCreateEventModalOpen(false);
    loadEvents();
  };

  const toggleWeekday = (day: number) => {
    setBulkWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const handleStatusChange = async (id: number, status: string) => {
    const r = await adminPatch(`/events/${id}/status`, { status });
    if (!r.ok) {
      flashErr(getApiErrorMessage((r.data as { error?: string })?.error));
      return;
    }
    flash(`イベント#${id} → ${status}`); loadEvents();
  };

  const handleCapacityChange = async (id: number, capacity: number) => {
    const r = await adminPatch(`/events/${id}/capacity`, { capacity });
    if (!r.ok) {
      flashErr(getApiErrorMessage((r.data as { error?: string })?.error));
      return;
    }
    flash(`イベント#${id} 定員 → ${capacity}`); loadEvents();
  };

  const handleTimeChange = async (id: number, startsAt: string, endsAt: string) => {
    const r = await adminPatch(`/events/${id}/time`, { startsAt, endsAt });
    if (!r.ok) {
      flashErr(getApiErrorMessage((r.data as { error?: string })?.error));
      return;
    }
    flash(`イベント #${id} の時間を変更しました`); loadEvents();
  };

  // 編集中のイベント時間
  const [editTimeId, setEditTimeId] = useState<number | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  const startTimeEdit = (ev: AdminEvent) => {
    setEditTimeId(ev.id);
    // datetime-local用: "YYYY-MM-DDTHH:MM"
    setEditStart(ev.starts_at?.slice(0, 16)?.replace(" ", "T") ?? "");
    setEditEnd(ev.ends_at?.slice(0, 16)?.replace(" ", "T") ?? "");
  };

  const cancelTimeEdit = () => { setEditTimeId(null); };

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
                loadEvents();
              },
            });
            return false;
          }
          flashErr(getApiErrorMessage(data?.error, data));
          return;
        }
        flash(`イベント #${id} を削除しました`); loadEvents();
      },
      "削除する",
      "#991b1b",
    );
  };

  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");
  // カレンダーのクリックモード: "edit" = 編集, "select" = 選択
  const [calClickMode, setCalClickMode] = useState<"edit" | "select">("edit");
  // カレンダー用: 月の状態
  const [calMonth, setCalMonth] = useState<Date>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const toDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const calGrid = (() => {
    const startOfMonth = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const endOfMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
    const gridStartTmp = new Date(startOfMonth);
    gridStartTmp.setDate(gridStartTmp.getDate() - gridStartTmp.getDay());
    const gridEndTmp = new Date(endOfMonth);
    gridEndTmp.setDate(gridEndTmp.getDate() + (6 - gridEndTmp.getDay()));
    const dates: string[] = [];
    const cursor = new Date(gridStartTmp);
    while (cursor <= gridEndTmp) {
      dates.push(toDateStr(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  })();

  const eventsByDate = (() => {
    const map = new Map<string, AdminEvent[]>();
    for (const ev of events) {
      const dateKey = (ev.starts_at ?? "").slice(0, 10);
      if (!dateKey) continue;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(ev);
    }
    return map;
  })();

  const _statusColor = (s: string) => s === "scheduled" ? "#059669" : s === "holiday" ? "#6b7280" : "#dc2626";
  const _statusLabel = (s: string) => s === "scheduled" ? "開催" : s === "holiday" ? "休み" : "休講";

  return (
    <div className="bg-white rounded-3 shadow-sm p-4">
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

      {/* イベント編集モーダル */}
      {editEvent && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998, animation: "fadeIn 0.2s ease" }}
          onClick={() => { setEditEvent(null); setEditModalErr(""); }}
        >
          <div
            style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "24px", minWidth: "420px", maxWidth: "520px", boxShadow: "0 8px 30px rgba(0,0,0,0.2)", animation: "slideUp 0.25s ease" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>
              イベント編集（#{editEvent.id}）
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "10px 12px", alignItems: "center", fontSize: "13px", marginBottom: "16px" }}>
              <span className="form-label">クラス</span>
              <span style={{ fontWeight: 600 }}>{editEvent.class_type_name}</span>

              <span className="form-label">開始日時</span>
              <input type="datetime-local" className="form-control" value={editEvStart} onChange={(e) => setEditEvStart(e.target.value)} />

              <span className="form-label">終了日時</span>
              <input type="datetime-local" className="form-control" value={editEvEnd} onChange={(e) => setEditEvEnd(e.target.value)} />

              <span className="form-label">定員</span>
              <input type="number" min={0} className="form-control" style={{ width: "80px" }} value={editEvCapacity} onChange={(e) => setEditEvCapacity(Number(e.target.value))} />

              <span className="form-label">ステータス</span>
              <div style={{ display: "flex", gap: "6px" }}>
                {([["scheduled", "開催", "#059669"], ["holiday", "通常休み", "#6b7280"], ["canceled_by_admin", "休講", "#dc2626"]] as const).map(([val, lbl, color]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setEditEvStatus(val)}
                    style={{
                      fontSize: "12px",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: editEvStatus === val ? `2px solid ${color}` : "1px solid #d1d5db",
                      backgroundColor: editEvStatus === val ? (val === "scheduled" ? "#d1fae5" : val === "holiday" ? "#e5e7eb" : "#fee2e2") : "#fff",
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
              <span>{editEvReservations.filter((r) => !editEvToCancel.has(r.id)).length + editEvToAdd.filter((r) => r.userId !== "").length} / {editEvCapacity}</span>

              <span className="form-label" style={{ fontSize: "15px" }}>担当スタッフ（何名でも登録可能）</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                {staff.length === 0 ? (
                  <span className="text-body-secondary" style={{ fontSize: "14px" }}>スタッフが未登録です（スタッフ管理で追加）</span>
                ) : (
                  staff.map((s) => (
                    <label key={s.id} className="d-flex align-items-center gap-2" style={{ fontSize: "16px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        style={{ width: "18px", height: "18px", marginTop: 0 }}
                        checked={editEvStaffIds.includes(s.id)}
                        onChange={(e) => {
                          setEditEvStaffIds((prev) => e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id));
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
                    <span style={{ flex: 1 }}>{r.user_name}{r.reservation_type === "makeup" ? "（振替）" : ""}</span>
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
                const displayText = isOpen ? editEvReserveFilter : (selectedUser ? `${selectedUser.name}${selectedUser.phone ? ` (${selectedUser.phone})` : ""}` : "");
                const filteredUsers = users.filter(
                  (u) =>
                    !editEvReserveFilter.trim() ||
                    u.name.toLowerCase().includes(editEvReserveFilter.toLowerCase()) ||
                    (u.phone ?? "").includes(editEvReserveFilter)
                );
                return (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px auto", gap: "8px", alignItems: "end", marginBottom: "8px" }}>
                    <div style={{ position: "relative" }}>
                      <span className="form-label">ユーザー</span>
                      <div style={{ display: "flex", alignItems: "center", border: "1px solid #dee2e6", borderRadius: "6px", backgroundColor: "#fff", minHeight: "38px" }}>
                        <input
                          type="text"
                          className="form-control border-0"
                          style={{ flex: 1, minWidth: 0 }}
                          value={displayText}
                          placeholder="ユーザーを選択"
                          onChange={(e) => { setEditEvReserveFilter(e.target.value); if (!isOpen) setEditEvReserveDropdownOpen(idx); }}
                          onFocus={() => { setEditEvReserveDropdownOpen(idx); setEditEvReserveFilter(selectedUser ? `${selectedUser.name}${selectedUser.phone ? ` (${selectedUser.phone})` : ""}` : ""); }}
                          onBlur={() => setTimeout(() => setEditEvReserveDropdownOpen(null), 150)}
                        />
                        <span style={{ padding: "0 8px", color: "#6c757d", pointerEvents: "none" }}>▼</span>
                      </div>
                      {isOpen && (
                        <ul className="list-unstyled mb-0" style={{ position: "absolute", left: 0, right: 0, top: "100%", marginTop: "2px", maxHeight: "200px", overflowY: "auto", border: "1px solid #dee2e6", borderRadius: "6px", backgroundColor: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 10, padding: "4px 0" }}>
                          {selectedUser && (
                            <li
                              onMouseDown={(e) => { e.preventDefault(); setEditEvToAdd((prev) => prev.map((r, i) => (i === idx ? { ...r, userId: "" } : r))); setEditEvReserveDropdownOpen(null); setEditEvReserveFilter(""); }}
                              style={{ padding: "8px 12px", cursor: "pointer", color: "#6c757d", fontSize: "13px", borderBottom: "1px solid #eee" }}
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
                                    setEditEvToAdd((prev) => prev.map((r, i) => (i === idx ? { ...r, userId: u.id } : r)));
                                    setEditEvReserveDropdownOpen(null);
                                    setEditEvReserveFilter("");
                                  }}
                                  style={{ padding: "8px 12px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, color: disabled ? "#adb5bd" : "#212529", backgroundColor: disabled ? "#f8f9fa" : "transparent", fontSize: "14px" }}
                                >
                                  {u.name}{u.phone ? ` (${u.phone})` : ""}{disabled ? " — 選択済み" : ""}
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
                        onChange={(e) => setEditEvToAdd((prev) => prev.map((r, i) => (i === idx ? { ...r, type: e.target.value as "normal" | "makeup" } : r)))}
                      >
                        <option value="normal">通常</option>
                        <option value="makeup">振替</option>
                      </select>
                    </div>
                    {row.type === "makeup" ? (
                      <div>
                        <span className="form-label">振替権利ID</span>
                        <input type="number" className="form-control" value={row.creditId === "" ? "" : row.creditId} onChange={(e) => setEditEvToAdd((prev) => prev.map((r, i) => (i === idx ? { ...r, creditId: Number(e.target.value) || "" } : r)))} />
                      </div>
                    ) : (
                      <div />
                    )}
                    <div>
                      {editEvToAdd.length > 1 ? (
                        <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setEditEvToAdd((prev) => prev.filter((_, i) => i !== idx))}>削除</button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {editEvReservations.filter((r) => !editEvToCancel.has(r.id)).length + editEvToAdd.filter((r) => r.userId !== "").length < editEvCapacity && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setEditEvToAdd((prev) => [...prev, { userId: "", type: "normal", creditId: "" }])}
                >
                  ＋もう1人追加
                </button>
              )}
            </div>

            <div style={{ marginTop: "16px", padding: "12px 14px", backgroundColor: "#f0f9ff", borderRadius: "8px", border: "1px solid #bae6fd" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#0369a1", marginBottom: "8px" }}>変更の反映（毎週予約のように）</div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "6px" }}>
                <input type="radio" name="editApplyTo" checked={editApplyToFuture === "only"} onChange={() => setEditApplyToFuture("only")} />
                <span style={{ fontSize: "13px" }}>このイベントのみ</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input type="radio" name="editApplyTo" checked={editApplyToFuture === "future"} onChange={() => setEditApplyToFuture("future")} />
                <span style={{ fontSize: "13px" }}>同じ曜日・時間の今後のイベントにも反映する</span>
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
              <button
                type="button"
                onClick={deleteFromEditModal}
                style={{ fontSize: "13px", padding: "6px 16px", borderRadius: "6px", border: "none", backgroundColor: "#991b1b", color: "#fff", cursor: "pointer", fontWeight: 600 }}
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
                  onClick={() => { setEditEvent(null); setEditModalErr(""); }}
                  style={{ fontSize: "13px", padding: "6px 16px", borderRadius: "6px", border: "1px solid #d1d5db", backgroundColor: "#fff", cursor: "pointer" }}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={saveEditEvent}
                  style={{ fontSize: "13px", padding: "6px 16px", borderRadius: "6px", border: "none", backgroundColor: "#3b82f6", color: "#fff", cursor: "pointer", fontWeight: 600 }}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* イベント作成ボタン */}
      <div className="mb-3">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setCreateEventModalOpen(true)}
        >
          イベントを作成
        </button>
      </div>

      {/* イベント作成モーダル */}
      {createEventModalOpen && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998, animation: "fadeIn 0.2s ease" }}
          onClick={() => { setCreateEventModalOpen(false); setCreateModalErr(""); }}
        >
          <div
            style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "24px", minWidth: "420px", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,0.2)", animation: "slideUp 0.25s ease" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="fs-6 fw-bold mb-0">イベント作成</h3>
              <button type="button" className="btn-close" onClick={() => { setCreateEventModalOpen(false); setCreateModalErr(""); }} aria-label="閉じる" />
            </div>

            {/* Mode toggle */}
            <div className="btn-group btn-group-sm w-100 mb-4">
              <button
                type="button"
                className={`btn ${eventCreateMode === "single" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => { setEventCreateMode("single"); setCreateModalErr(""); }}
              >
                1件作成
              </button>
              <button
                type="button"
                className={`btn ${eventCreateMode === "bulk" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => { setEventCreateMode("bulk"); setCreateModalErr(""); }}
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
                    <select className="form-select form-select-sm" value={newClassType} onChange={(e) => setNewClassType(Number(e.target.value) || "")}>
                      <option value="">選択してください</option>
                      {classTypes.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                    </select>
                  </div>

                  {/* 日時 */}
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-medium">開始日時</label>
                      <input type="datetime-local" className="form-control form-control-sm" value={newStartsAt} onChange={(e) => setNewStartsAt(e.target.value)} />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-medium">終了日時</label>
                      <input type="datetime-local" className="form-control form-control-sm" value={newEndsAt} onChange={(e) => setNewEndsAt(e.target.value)} />
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
                      onChange={(e) => { const v = Number(e.target.value); setNewCapacity(v); setNewEventReserveList((prev) => (prev.length > v ? prev.slice(0, v) : prev)); }}
                      min={1}
                    />
                  </div>

                  {/* スタッフ */}
                  <div className="mb-3">
                    <label className="form-label small fw-medium">担当スタッフ</label>
                    {staff.length === 0 ? (
                      <p className="small text-body-secondary mb-0">スタッフがいません。スタッフ管理タブで登録してください。</p>
                    ) : (
                      <div className="d-flex flex-wrap gap-3">
                        {staff.map((s) => (
                          <label key={s.id} className="d-flex align-items-center gap-2 mb-0 small" style={{ cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              className="form-check-input mt-0"
                              checked={newEventStaffIds.includes(s.id)}
                              onChange={(e) => setNewEventStaffIds((prev) => e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id))}
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
                            newEventReserveList.map((r, i) => (i === idx ? null : r.userId)).filter((id): id is number => id !== "")
                          );
                          const isOpen = openReserveUserDropdown === idx;
                          const selectedUser = row.userId !== "" ? users.find((u) => u.id === row.userId) : null;
                          const displayText = isOpen ? reserveUserFilter : (selectedUser ? `${selectedUser.name}${selectedUser.phone ? ` (${selectedUser.phone})` : ""}` : "");
                          const filteredUsers = users.filter(
                            (u) =>
                              !reserveUserFilter.trim() ||
                              u.name.toLowerCase().includes(reserveUserFilter.toLowerCase()) ||
                              (u.phone ?? "").includes(reserveUserFilter)
                          );
                          return (
                            <div key={idx} className="d-flex gap-2 align-items-end mb-2 flex-wrap">
                              <div style={{ position: "relative", flex: "1 1 160px", minWidth: 0 }}>
                                <label className="form-label small mb-1">ユーザー</label>
                                <div className="d-flex align-items-center border rounded" style={{ backgroundColor: "#fff", minHeight: "31px" }}>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm border-0 shadow-none"
                                    style={{ flex: 1, minWidth: 0 }}
                                    value={displayText}
                                    placeholder="名前・電話で検索"
                                    onChange={(e) => { setReserveUserFilter(e.target.value); if (!isOpen) setOpenReserveUserDropdown(idx); }}
                                    onFocus={() => { setOpenReserveUserDropdown(idx); setReserveUserFilter(selectedUser ? `${selectedUser.name}${selectedUser.phone ? ` (${selectedUser.phone})` : ""}` : ""); }}
                                    onBlur={() => setTimeout(() => setOpenReserveUserDropdown(null), 150)}
                                  />
                                  <span className="px-2 text-body-secondary small" style={{ pointerEvents: "none" }}>▼</span>
                                </div>
                                {isOpen && (
                                  <ul className="list-unstyled mb-0 position-absolute w-100 border rounded shadow-sm" style={{ top: "100%", marginTop: "2px", maxHeight: "200px", overflowY: "auto", backgroundColor: "#fff", zIndex: 10, padding: "4px 0" }}>
                                    {selectedUser && (
                                      <li onMouseDown={(e) => { e.preventDefault(); setNewEventReserveList((prev) => prev.map((r, i) => (i === idx ? { ...r, userId: "" } : r))); setOpenReserveUserDropdown(null); setReserveUserFilter(""); }} className="px-3 py-2 small text-body-secondary" style={{ cursor: "pointer", borderBottom: "1px solid #eee" }}>
                                        選択を解除
                                      </li>
                                    )}
                                    {filteredUsers.length === 0 ? (
                                      <li className="px-3 py-2 small text-body-secondary">該当なし</li>
                                    ) : (
                                      filteredUsers.map((u) => {
                                        const disabled = otherSelectedIds.has(u.id);
                                        return (
                                          <li key={u.id} onMouseDown={(e) => { e.preventDefault(); if (disabled) return; setNewEventReserveList((prev) => prev.map((r, i) => (i === idx ? { ...r, userId: u.id } : r))); setOpenReserveUserDropdown(null); setReserveUserFilter(""); }} className="px-3 py-2 small" style={{ cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, backgroundColor: "transparent" }}>
                                            {u.name}{u.phone ? ` (${u.phone})` : ""}{disabled ? " — 選択済み" : ""}
                                          </li>
                                        );
                                      })
                                    )}
                                  </ul>
                                )}
                              </div>
                              <div style={{ flex: "0 0 100px" }}>
                                <label className="form-label small mb-1">種別</label>
                                <select className="form-select form-select-sm" value={row.type} onChange={(e) => setNewEventReserveList((prev) => prev.map((r, i) => (i === idx ? { ...r, type: e.target.value as "normal" | "makeup" } : r)))}>
                                  <option value="normal">通常</option>
                                  <option value="makeup">振替</option>
                                </select>
                              </div>
                              {row.type === "makeup" && (
                                <div style={{ flex: "0 0 90px" }}>
                                  <label className="form-label small mb-1">権利ID</label>
                                  <input type="number" className="form-control form-control-sm" value={row.creditId === "" ? "" : row.creditId} onChange={(e) => setNewEventReserveList((prev) => prev.map((r, i) => (i === idx ? { ...r, creditId: Number(e.target.value) || "" } : r)))} />
                                </div>
                              )}
                              {newEventReserveList.length > 1 && (
                                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setNewEventReserveList((prev) => prev.filter((_, i) => i !== idx))}>削除</button>
                              )}
                            </div>
                          );
                        })}
                        {newEventReserveList.length < newCapacity && (
                          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setNewEventReserveList((prev) => [...prev, { userId: "", type: "normal", creditId: "" }])}>
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
                    <select className="form-select form-select-sm" value={bulkClassType} onChange={(e) => setBulkClassType(Number(e.target.value) || "")}>
                      <option value="">選択してください</option>
                      {classTypes.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                    </select>
                  </div>

                  {/* 時刻・定員 */}
                  <div className="row g-3 mb-3">
                    <div className="col-4">
                      <label className="form-label small fw-medium">開始時刻</label>
                      <input type="time" className="form-control form-control-sm" value={bulkStartTime} onChange={(e) => setBulkStartTime(e.target.value)} />
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-medium">終了時刻</label>
                      <input type="time" className="form-control form-control-sm" value={bulkEndTime} onChange={(e) => setBulkEndTime(e.target.value)} />
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-medium">定員（人）</label>
                      <input type="number" className="form-control form-control-sm" value={bulkCapacity} onChange={(e) => { const v = Number(e.target.value); setBulkCapacity(v); setBulkReserveList((prev) => (prev.length > v ? prev.slice(0, v) : prev)); }} min={1} />
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
                          <input type="checkbox" checked={bulkWeekdays.includes(i)} onChange={() => toggleWeekday(i)} style={{ display: "none" }} />
                          {w}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* スタッフ */}
                  <div className="mb-3">
                    <label className="form-label small fw-medium">担当スタッフ<span className="text-body-secondary fw-normal ms-1">（全イベントに同じスタッフを割り当て）</span></label>
                    {staff.length === 0 ? (
                      <p className="small text-body-secondary mb-0">スタッフがいません。スタッフ管理タブで登録してください。</p>
                    ) : (
                      <div className="d-flex flex-wrap gap-3">
                        {staff.map((s) => (
                          <label key={s.id} className="d-flex align-items-center gap-2 mb-0 small" style={{ cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              className="form-check-input mt-0"
                              checked={bulkCreateStaffIds.includes(s.id)}
                              onChange={(e) => setBulkCreateStaffIds((prev) => e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id))}
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
                      <input type="date" className="form-control form-control-sm" value={bulkDateFrom} onChange={(e) => setBulkDateFrom(e.target.value)} />
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-medium">終了日</label>
                      <input type="date" className="form-control form-control-sm" value={bulkDateTo} onChange={(e) => setBulkDateTo(e.target.value)} />
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-medium">除外日</label>
                      <input type="text" className="form-control form-control-sm" value={bulkExclude} onChange={(e) => setBulkExclude(e.target.value)} placeholder="2026-03-21, 05-05" />
                    </div>
                  </div>

                  {/* 作成と同時に予約 */}
                  <div className="border-top pt-3 mb-3">
                    <label className="d-flex align-items-center gap-2 mb-0 small" style={{ cursor: "pointer" }}>
                      <input type="checkbox" className="form-check-input mt-0" checked={bulkAlsoReserve} onChange={(e) => setBulkAlsoReserve(e.target.checked)} />
                      <span className="fw-medium">作成と同時に予約する</span>
                    </label>
                    {bulkAlsoReserve && (
                      <div className="mt-3">
                        <p className="small text-body-secondary mb-2">予約するユーザー（定員 {bulkCapacity} 人まで）</p>
                        {bulkReserveList.map((row, idx) => {
                          const otherSelectedIds = new Set(
                            bulkReserveList.map((r, i) => (i === idx ? null : r.userId)).filter((id): id is number => id !== "")
                          );
                          const isOpen = bulkReserveDropdownOpen === idx;
                          const selectedUser = row.userId !== "" ? users.find((u) => u.id === row.userId) : null;
                          const displayText = isOpen ? bulkReserveFilter : (selectedUser ? `${selectedUser.name}${selectedUser.phone ? ` (${selectedUser.phone})` : ""}` : "");
                          const filteredUsers = users.filter(
                            (u) =>
                              !bulkReserveFilter.trim() ||
                              u.name.toLowerCase().includes(bulkReserveFilter.toLowerCase()) ||
                              (u.phone ?? "").includes(bulkReserveFilter)
                          );
                          return (
                            <div key={idx} className="d-flex gap-2 align-items-end mb-2 flex-wrap">
                              <div style={{ position: "relative", flex: "1 1 160px", minWidth: 0 }}>
                                <label className="form-label small mb-1">ユーザー</label>
                                <div className="d-flex align-items-center border rounded" style={{ backgroundColor: "#fff", minHeight: "31px" }}>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm border-0 shadow-none"
                                    style={{ flex: 1, minWidth: 0 }}
                                    value={displayText}
                                    placeholder="名前・電話で検索"
                                    onChange={(e) => { setBulkReserveFilter(e.target.value); if (!isOpen) setBulkReserveDropdownOpen(idx); }}
                                    onFocus={() => { setBulkReserveDropdownOpen(idx); setBulkReserveFilter(selectedUser ? `${selectedUser.name}${selectedUser.phone ? ` (${selectedUser.phone})` : ""}` : ""); }}
                                    onBlur={() => setTimeout(() => setBulkReserveDropdownOpen(null), 150)}
                                  />
                                  <span className="px-2 text-body-secondary small" style={{ pointerEvents: "none" }}>▼</span>
                                </div>
                                {isOpen && (
                                  <ul className="list-unstyled mb-0 position-absolute w-100 border rounded shadow-sm" style={{ top: "100%", marginTop: "2px", maxHeight: "200px", overflowY: "auto", backgroundColor: "#fff", zIndex: 10, padding: "4px 0" }}>
                                    {selectedUser && (
                                      <li onMouseDown={(e) => { e.preventDefault(); setBulkReserveList((prev) => prev.map((r, i) => (i === idx ? { ...r, userId: "" } : r))); setBulkReserveDropdownOpen(null); setBulkReserveFilter(""); }} className="px-3 py-2 small text-body-secondary" style={{ cursor: "pointer", borderBottom: "1px solid #eee" }}>
                                        選択を解除
                                      </li>
                                    )}
                                    {filteredUsers.length === 0 ? (
                                      <li className="px-3 py-2 small text-body-secondary">該当なし</li>
                                    ) : (
                                      filteredUsers.map((u) => {
                                        const disabled = otherSelectedIds.has(u.id);
                                        return (
                                          <li key={u.id} onMouseDown={(e) => { e.preventDefault(); if (disabled) return; setBulkReserveList((prev) => prev.map((r, i) => (i === idx ? { ...r, userId: u.id } : r))); setBulkReserveDropdownOpen(null); setBulkReserveFilter(""); }} className="px-3 py-2 small" style={{ cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
                                            {u.name}{u.phone ? ` (${u.phone})` : ""}{disabled ? " — 選択済み" : ""}
                                          </li>
                                        );
                                      })
                                    )}
                                  </ul>
                                )}
                              </div>
                              <div style={{ flex: "0 0 100px" }}>
                                <label className="form-label small mb-1">種別</label>
                                <select className="form-select form-select-sm" value={row.type} onChange={(e) => setBulkReserveList((prev) => prev.map((r, i) => (i === idx ? { ...r, type: e.target.value as "normal" | "makeup" } : r)))}>
                                  <option value="normal">通常</option>
                                  <option value="makeup">振替</option>
                                </select>
                              </div>
                              {row.type === "makeup" && (
                                <div style={{ flex: "0 0 90px" }}>
                                  <label className="form-label small mb-1">権利ID</label>
                                  <input type="number" className="form-control form-control-sm" value={row.creditId === "" ? "" : row.creditId} onChange={(e) => setBulkReserveList((prev) => prev.map((r, i) => (i === idx ? { ...r, creditId: Number(e.target.value) || "" } : r)))} />
                                </div>
                              )}
                              {bulkReserveList.length > 1 && (
                                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setBulkReserveList((prev) => prev.filter((_, i) => i !== idx))}>削除</button>
                              )}
                            </div>
                          );
                        })}
                        {bulkReserveList.length < bulkCapacity && (
                          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setBulkReserveList((prev) => [...prev, { userId: "", type: "normal", creditId: "" }])}>
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
      )}

      {/* 表示切替 + 期間フィルタ */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
        <button type="button" className={`btn btn-sm ${viewMode === "calendar" ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => setViewMode("calendar")}>カレンダー</button>
        <button type="button" className={`btn btn-sm ${viewMode === "table" ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => setViewMode("table")}>テーブル</button>
        <span style={{ borderLeft: "1px solid #d1d5db", height: "20px", margin: "0 4px" }} />
        <span style={{ fontSize: "13px" }}>期間:</span>
        <input type="date" className="form-control" style={{ width: "150px" }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <span>〜</span>
        <input type="date" className="form-control" style={{ width: "150px" }} value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" className="btn btn-primary" onClick={loadEvents}>検索</button>
      </div>

      {/* カレンダー時のモード切替 */}
      {viewMode === "calendar" && (
        <div style={{ marginBottom: "10px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280", marginRight: "8px" }}>モード:</span>
          <div style={{ display: "inline-flex", borderRadius: "8px", border: "1px solid #d1d5db", overflow: "hidden", backgroundColor: "#f9fafb" }}>
            <button
              type="button"
              onClick={() => { setCalClickMode("edit"); deselectAll(); }}
              style={{
                fontSize: "13px",
                padding: "6px 16px",
                border: "none",
                borderRadius: 0,
                backgroundColor: calClickMode === "edit" ? "#fff" : "transparent",
                color: calClickMode === "edit" ? "#1d4ed8" : "#6b7280",
                fontWeight: calClickMode === "edit" ? 600 : 400,
                cursor: "pointer",
                boxShadow: calClickMode === "edit" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              編集（クリックで1件ずつ）
            </button>
            <button
              type="button"
              onClick={() => { setCalClickMode("select"); }}
              style={{
                fontSize: "13px",
                padding: "6px 16px",
                border: "none",
                borderLeft: "1px solid #e5e7eb",
                backgroundColor: calClickMode === "select" ? "#fff" : "transparent",
                color: calClickMode === "select" ? "#1d4ed8" : "#6b7280",
                fontWeight: calClickMode === "select" ? 600 : 400,
                cursor: "pointer",
                boxShadow: calClickMode === "select" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              まとめて操作（複数選択）
            </button>
          </div>
          {calClickMode === "select" && (
            <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "10px" }}>カレンダーのイベントをクリックで選択</span>
          )}
        </div>
      )}

      {/* まとめ操作パネル（テーブル時は常時、カレンダー時は選択モードのみ） */}
      {(() => {
        const show = viewMode === "table" || calClickMode === "select";
        const hasSelection = selectedIds.size > 0;
        return (
      <div className="card mb-3" style={{
        padding: show ? "16px" : "0 16px",
        maxHeight: show ? "none" : "0",
        opacity: show ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 0.3s ease, opacity 0.25s ease, padding 0.25s ease, margin 0.25s ease",
        marginBottom: show ? "12px" : "0",
        border: show ? "1px solid #e5e7eb" : "1px solid transparent",
      }}>
        {show && (
          <>
            {/* 条件で選択（毎週の予定のように：曜日＋時間） */}
            <div style={{ marginBottom: "16px", padding: "14px 16px", backgroundColor: "#f0f9ff", borderRadius: "10px", border: "1px solid #bae6fd" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#0369a1", marginBottom: "10px" }}>条件で選択（毎週の予定のように）</div>
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
                        color: bulkFilterWeekdays.includes(i) ? "#0369a1" : i === 0 ? "#dc2626" : i === 6 ? "#2563eb" : "#64748b",
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
                  <input type="time" value={bulkFilterStartTime} onChange={(e) => setBulkFilterStartTime(e.target.value)} className="form-control form-control-sm" style={{ width: "90px" }} />
                  <span style={{ fontSize: "12px", color: "#64748b" }}>～</span>
                  <input type="time" value={bulkFilterEndTime} onChange={(e) => setBulkFilterEndTime(e.target.value)} className="form-control form-control-sm" style={{ width: "90px" }} />
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={selectByCondition}>
                  この条件で選択
                </button>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  （現在の表示範囲で {events.filter((ev) => {
                    const day = new Date(ev.starts_at).getDay();
                    const t = (ev.starts_at ?? "").slice(11, 16);
                    return bulkFilterWeekdays.includes(day) && t >= bulkFilterStartTime && t <= bulkFilterEndTime;
                  }).length} 件が該当）
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>まとめて操作</span>
              <span style={{ fontSize: "13px", color: "#6b7280" }}>{selectedIds.size} 件選択中</span>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={selectAll}>全選択</button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={deselectAll}>選択解除</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
              <div style={{ padding: "12px 14px", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.02em" }}>ステータス</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <button type="button" className="btn btn-success btn-sm" onClick={() => requestBulkStatus("scheduled")} disabled={!hasSelection}>開催に</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => requestBulkStatus("holiday")} disabled={!hasSelection}>通常休みに</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => requestBulkStatus("canceled_by_admin")} disabled={!hasSelection}>休講に</button>
                </div>
              </div>

              <div style={{ padding: "12px 14px", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.02em" }}>定員</div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                  <input type="number" min={0} value={bulkCapacityValue} onChange={(e) => setBulkCapacityValue(Number(e.target.value))} className="form-control form-control-sm" style={{ width: "64px" }} />
                  <button type="button" className="btn btn-primary btn-sm" onClick={requestBulkCapacity} disabled={!hasSelection}>定員変更</button>
                </div>
              </div>

              <div style={{ padding: "12px 14px", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.02em" }}>時間</div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                  <input type="time" value={bulkEditStartTime} onChange={(e) => setBulkEditStartTime(e.target.value)} className="form-control form-control-sm" style={{ width: "88px" }} />
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>～</span>
                  <input type="time" value={bulkEditEndTime} onChange={(e) => setBulkEditEndTime(e.target.value)} className="form-control form-control-sm" style={{ width: "88px" }} />
                  <button type="button" className="btn btn-primary btn-sm" onClick={requestBulkTime} disabled={!hasSelection}>時間変更</button>
                </div>
              </div>

              <div style={{ padding: "12px 14px", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.02em" }}>予約（メンバー）</div>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "10px" }}>選択したイベントの予約を追加・削除できます</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#059669", marginBottom: "4px", display: "block" }}>追加</span>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                      <select className="form-select form-select-sm" style={{ width: "140px" }} value={bulkReserveUserId === "" ? "" : bulkReserveUserId} onChange={(e) => setBulkReserveUserId(Number(e.target.value) || "")}>
                        <option value="">ユーザー選択</option>
                        {users.map((u) => <option key={u.id} value={u.id}>{u.name}{u.phone ? ` (${u.phone})` : ""}</option>)}
                      </select>
                      <select className="form-select form-select-sm" style={{ width: "72px" }} value={bulkReserveType} onChange={(e) => setBulkReserveType(e.target.value as "normal" | "makeup")}>
                        <option value="normal">通常</option>
                        <option value="makeup">振替</option>
                      </select>
                      {bulkReserveType === "makeup" && (
                        <input type="number" className="form-control form-control-sm" placeholder="振替ID" style={{ width: "70px" }} value={bulkReserveCreditId === "" ? "" : bulkReserveCreditId} onChange={(e) => setBulkReserveCreditId(Number(e.target.value) || "")} />
                      )}
                      <button type="button" className="btn btn-success btn-sm" onClick={requestBulkReserveAdd} disabled={!hasSelection || !bulkReserveUserId}>追加</button>
                    </div>
                  </div>
                  <div style={{ paddingTop: "8px", borderTop: "1px solid #e5e7eb" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#b45309", marginBottom: "4px", display: "block" }}>削除（キャンセル）</span>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                      <select className="form-select form-select-sm" style={{ width: "140px" }} value={bulkCancelUserId === "" ? "" : bulkCancelUserId} onChange={(e) => setBulkCancelUserId(Number(e.target.value) || "")}>
                        <option value="">ユーザー選択</option>
                        {users.map((u) => <option key={u.id} value={u.id}>{u.name}{u.phone ? ` (${u.phone})` : ""}</option>)}
                      </select>
                      <button type="button" className="btn btn-warning btn-sm" onClick={requestBulkReserveCancel} disabled={!hasSelection || !bulkCancelUserId}>予約を削除</button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: "12px 14px", backgroundColor: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#b91c1c", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.02em" }}>削除</div>
                <button type="button" className="btn btn-danger btn-sm" onClick={requestBulkDelete} disabled={!hasSelection}>選択をまとめて削除</button>
              </div>
            </div>
          </>
        )}
      </div>
        );
      })()}

      {/* カレンダー表示 */}
      {viewMode === "calendar" && (
        <div style={{ paddingBottom: "24px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCalMonth((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))}>◀ 前月</button>
            <span style={{ fontWeight: 600, fontSize: "14px" }}>{calMonth.getFullYear()}年 {calMonth.getMonth() + 1}月</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCalMonth((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))}>次月 ▶</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {["日", "月", "火", "水", "木", "金", "土"].map((w, i) => (
              <div key={w} style={{ textAlign: "center", fontSize: "12px", fontWeight: 600, color: i === 0 ? "#dc2626" : i === 6 ? "#2563eb" : "#6b7280", paddingBottom: "4px" }}>{w}</div>
            ))}
            {calGrid.map((date) => {
              const d = new Date(date);
              const dayOfWeek = d.getDay();
              const isCurrentMonth = d.getMonth() === calMonth.getMonth() && d.getFullYear() === calMonth.getFullYear();
              const list = eventsByDate.get(date) ?? [];
              const todayNow = new Date(); todayNow.setHours(0,0,0,0);
              const isToday = d.getFullYear() === todayNow.getFullYear() && d.getMonth() === todayNow.getMonth() && d.getDate() === todayNow.getDate();

              return (
                <div
                  key={date}
                  style={{
                    borderRadius: "6px",
                    border: isToday ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                    padding: "4px 6px",
                    minHeight: "120px",
                    backgroundColor: "#fff",
                    opacity: isCurrentMonth ? 1 : 0.4,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "13px", color: dayOfWeek === 0 ? "#dc2626" : dayOfWeek === 6 ? "#2563eb" : "#374151", marginBottom: "4px" }}>
                    {d.getDate()}
                  </div>
                  {list.length === 0 && (
                    <div style={{ fontSize: "10px", color: "#d1d5db" }}>—</div>
                  )}
                  {list.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        fontSize: "12px",
                        padding: "5px 7px",
                        borderRadius: "6px",
                        marginBottom: "4px",
                        backgroundColor: selectedIds.has(ev.id) ? "#dbeafe" : ev.status === "scheduled" ? "#ecfdf5" : ev.status === "holiday" ? "#f3f4f6" : "#fee2e2",
                        border: selectedIds.has(ev.id) ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                        cursor: "pointer",
                        overflow: "hidden",
                        transition: "all 0.2s ease",
                      }}
                      onClick={() => {
                        if (calClickMode === "select") toggleSelect(ev.id);
                        else openEditModal(ev);
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}>
                        {calClickMode === "select" && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(ev.id)}
                            onChange={() => toggleSelect(ev.id)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: "14px", height: "14px", flexShrink: 0 }}
                          />
                        )}
                        <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{(ev.starts_at ?? "").slice(11, 16)}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontWeight: 500 }}>{ev.class_type_name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingLeft: calClickMode === "select" ? "19px" : "0" }}>
                        <span style={{
                          padding: "1px 6px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: 700,
                          color: ev.status === "scheduled" ? "#065f46" : ev.status === "holiday" ? "#374151" : "#991b1b",
                          backgroundColor: ev.status === "scheduled" ? "#d1fae5" : ev.status === "holiday" ? "#e5e7eb" : "#fee2e2",
                        }}>
                          {ev.status === "scheduled" ? "開催" : ev.status === "holiday" ? "休み" : "休講"}
                        </span>
                        <span style={{ color: "#6b7280", fontSize: "11px" }}>{ev.reserved_count}/{ev.capacity}人</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* テーブル表示（共通 tableCard モジュール） */}
      {viewMode === "table" && (
        <div className="card mb-3">
          <table className="table table-striped table-hover mb-0">
            <thead>
              <tr>
                <th style={{ width: "36px" }}>
                  <input type="checkbox" checked={selectedIds.size === events.length && events.length > 0} onChange={() => selectedIds.size === events.length ? deselectAll() : selectAll()} />
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
                    <input type="checkbox" checked={selectedIds.has(ev.id)} onChange={() => toggleSelect(ev.id)} />
                  </td>
                  <td>{ev.id}</td>
                  <td>{ev.class_type_name}</td>
                  <td>
                  {editTimeId === ev.id ? (
                    <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
                      <input type="datetime-local" className="form-control" style={{ width: "170px", fontSize: "12px" }} value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                      <span>～</span>
                      <input type="datetime-local" className="form-control" style={{ width: "170px", fontSize: "12px" }} value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                      <button type="button" className="btn btn-success" onClick={saveTimeEdit}>保存</button>
                      <button type="button" className="btn btn-secondary" onClick={cancelTimeEdit}>取消</button>
                    </div>
                  ) : (
                    <span style={{ cursor: "pointer" }} onClick={() => startTimeEdit(ev)} title="クリックで時間を編集">
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
                    className="form-control" style={{ width: "50px" }}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== ev.capacity) handleCapacityChange(ev.id, v);
                    }}
                  />
                </td>
                <td>{ev.reserved_count}</td>
                <td>
                  <span style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: ev.status === "scheduled" ? "#065f46" : ev.status === "holiday" ? "#374151" : "#991b1b",
                    backgroundColor: ev.status === "scheduled" ? "#d1fae5" : ev.status === "holiday" ? "#e5e7eb" : "#fee2e2",
                    border: ev.status === "scheduled" ? "1px solid #6ee7b7" : ev.status === "holiday" ? "1px solid #d1d5db" : "1px solid #fca5a5",
                  }}>
                    {ev.status === "scheduled" ? "● 開催" : ev.status === "holiday" ? "■ 通常休み" : "▲ 休講"}
                  </span>
                </td>
                <td style={{ fontSize: "12px", color: "#4b5563" }}>
                  {Array.isArray(ev.staff) && ev.staff.length > 0 ? ev.staff.map((s) => s.name).join("、") : "—"}
                </td>
                <td>
                  <span className="btn-group btn-group-sm">
                    <button type="button" disabled={ev.status === "scheduled"} className="btn btn-success btn-sm" onClick={() => handleStatusChange(ev.id, "scheduled")}>
                      開催に戻す
                    </button>
                    <button type="button" disabled={ev.status === "holiday"} className="btn btn-secondary btn-sm" onClick={() => handleStatusChange(ev.id, "holiday")}>
                      通常休みに
                    </button>
                    <button type="button" disabled={ev.status === "canceled_by_admin"} className="btn btn-danger btn-sm" onClick={() => handleStatusChange(ev.id, "canceled_by_admin")}>
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
                <tr><td colSpan={9} className="text-center text-body-secondary py-4">イベントがありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
