/**
 * フロントエンドのルート定義（SPA 用の一覧）
 * ナビ・リダイレクト・パス判定に利用する
 */
export const ROUTES = {
  /** 会員向けカレンダー（振替予約・欠席登録） */
  HOME: "/",
  /** 管理トップ（/admin/reservations へリダイレクト） */
  ADMIN: "/admin",
  /** 会員管理 */
  ADMIN_MEMBERS: "/admin/members",
  /** 予約システム（クラス種別 / イベント・休講 / 振替権利 / 予約・代理） */
  ADMIN_RESERVATIONS: "/admin/reservations",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/** メインナビに出す項目 */
export const MAIN_NAV: { path: RoutePath; label: string }[] = [
  { path: ROUTES.HOME, label: "カレンダー" },
  { path: ROUTES.ADMIN_RESERVATIONS, label: "管理" },
];
