export type EventRow = {
  id: number;
  class_type_id: number;
  class_type_name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  event_status: "scheduled" | "canceled_by_admin" | "holiday";
  reserved_count: number;
  is_reserved_by_user: 0 | 1;
};

export type MakeupCredit = {
  id: number;
  class_type_id: number | null;
  granted_at: string;
  expires_at: string | null;
  status: "granted" | "consumed" | "revoked";
  source: "absence" | "admin_holiday";
  source_event_id: number | null;
  note: string | null;
};

export type StoreRow = { id: number; name: string };

export type MemberMe = { id?: number };
