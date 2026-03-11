export type OrganizationType = "corporation" | "sole_proprietor";
export type CorpStatus = "active" | "suspended" | "deleted";

export type StoreRow = {
  id: number;
  name: string;
  public_id?: string;
  created_at: string;
};

export type AccountRow = {
  id: number;
  email: string;
  display_name: string | null;
  role?: string;
  created_at: string;
};

export type CorporationRow = {
  id: number;
  code?: string;
  organization_type: OrganizationType;
  name: string;
  status?: CorpStatus;
  deleted_at?: string | null;
  created_at: string;
  store_count: number;
  account_count: number;
};

export type CorporationDetail = {
  id: number;
  code?: string;
  organization_type?: OrganizationType;
  name: string;
  status?: CorpStatus;
  deleted_at?: string | null;
  created_at: string;
  stores: StoreRow[];
  accounts: AccountRow[];
};

export const ORG_TYPE_LABEL: Record<OrganizationType, string> = {
  corporation: "法人",
  sole_proprietor: "個人事業主",
};

export const STATUS_CFG: Record<CorpStatus, { text: string; cls: string }> = {
  active: { text: "稼働中", cls: "bg-success" },
  suspended: { text: "停止中", cls: "bg-danger" },
  deleted: { text: "削除済み", cls: "bg-secondary" },
};

export type StatsSummary = {
  total_corporations: number;
  active_corporations: number;
  suspended_corporations: number;
  total_stores: number;
  total_accounts: number;
  total_members: number;
  total_reservations: number;
  active_reservations: number;
  total_events: number;
};

export type StatsPerCorp = {
  id: number;
  code?: string;
  name: string;
  status: CorpStatus;
  store_count: number;
  account_count: number;
  member_count: number;
  reservation_count: number;
};

export type StatsData = {
  summary: StatsSummary;
  perCorporation: StatsPerCorp[];
};

export type AuditLogRow = {
  id: number;
  actor_type: string;
  actor_id: number | null;
  action: string;
  target_type: string | null;
  target_id: number | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export type AuditLogsResponse = {
  rows: AuditLogRow[];
  total: number;
};
