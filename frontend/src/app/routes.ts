/**
 * フロントエンドのルート定義（SPA 用の一覧）
 * ナビ・リダイレクト・パス判定に利用する
 */
export const ROUTES = {
  /** ログイン画面 */
  LOGIN: "/login",
  /** トップ（店舗選択 → 法人・店舗ごとのカレンダーへ） */
  HOME: "/",
  /** 法人申し込み（新規法人・店舗・管理者アカウント登録） */
  CORPORATION_REGISTER: "/corporation/register",
  /** 会員登録（顧客が自分で登録） */
  MEMBER_REGISTER: "/register",
  /** 管理トップ（/admin/reservations へリダイレクト） */
  ADMIN: "/admin",
  /** 会員管理 */
  ADMIN_MEMBERS: "/admin/members",
  /** 予約システム（クラス種別 / イベント・休講 / 振替権利 / 予約・代理） */
  ADMIN_RESERVATIONS: "/admin/reservations",
  /** 管理画面：設定（メニュー） */
  ADMIN_SETTINGS: "/admin/settings",
  /** パスワードの変更 */
  ADMIN_SETTINGS_PASSWORD: "/admin/settings/password",
  /** 法人名の変更 */
  ADMIN_SETTINGS_CORPORATION: "/admin/settings/corporation",
  /** 運営管理ログイン */
  OPS_LOGIN: "/ops/login",
  /** 運営管理ダッシュボード（法人一覧） */
  OPS_DASHBOARD: "/ops",
} as const;

/** 店舗ごとのカレンダーURL（振替予約・欠席登録） */
export function getStoreCalendarPath(storeId: number): string {
  return `/stores/${storeId}`;
}

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/** メインナビに出す項目 */
export const MAIN_NAV: { path: RoutePath; label: string }[] = [
  { path: ROUTES.HOME, label: "カレンダー" },
  { path: ROUTES.MEMBER_REGISTER, label: "会員登録" },
  { path: ROUTES.ADMIN_RESERVATIONS, label: "管理" },
];

/** 予約システムのサブメニュー（サイドバー子要素） */
export const RESERVATION_TABS = [
  { key: "classTypes", label: "クラス種別管理" },
  { key: "events", label: "イベント・休講・予約" },
  { key: "staff", label: "スタッフ管理" },
  { key: "credits", label: "振替権利管理" },
] as const;
