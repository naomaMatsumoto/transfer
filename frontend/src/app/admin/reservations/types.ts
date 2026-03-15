export type ClassType = { id: number; code: string; name: string; description?: string | null };
export type User = { id: number; name: string; email?: string | null; phone?: string | null; course_type?: string | null; stage?: string; status?: string };
export type Staff = { id: number; name: string };
export type AdminEvent = {
  id: number;
  class_type_id: number;
  class_type_name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  status: string;
  reserved_count: number;
  staff?: { id: number; name: string }[];
};
export type AdminCredit = {
  id: number;
  user_id: number;
  user_name: string;
  class_type_id: number | null;
  class_type_name: string | null;
  granted_at: string;
  expires_at: string | null;
  status: string;
  source: string;
  note: string | null;
  created_by: string | null;
};
export type AdminReservation = {
  id: number;
  user_id: number;
  user_name: string;
  event_id: number;
  starts_at: string;
  class_type_name: string;
  reservation_type: string;
  makeup_credit_id: number | null;
  status: string;
  created_at: string;
  canceled_at: string | null;
};

export type Tab = "classTypes" | "events" | "staff" | "credits";

export const TAB_KEYS: Tab[] = ["classTypes", "events", "staff", "credits"];

export function parseTab(value: string | null): Tab {
  if (!value) return "classTypes";
  // 旧URL tab=reservations はイベントタブへ
  if (value === "reservations") return "events";
  if (TAB_KEYS.includes(value as Tab)) return value as Tab;
  return "classTypes";
}
