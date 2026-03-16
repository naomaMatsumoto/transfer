/**
 * API エラーコード → 日本語メッセージ（バックエンドはコードのみ返却し、フロントで文言を解決）
 */
const API_ERROR_MESSAGES: Record<string, string> = {
  // イベント・カレンダー
  EVENTS_FROM_TO_REQUIRED: "from と to は必須です（YYYY-MM-DD）",
  USER_ID_REQUIRED: "userId は必須です",
  USER_ID_EVENT_ID_REQUIRED: "userId と eventId は必須です",
  EVENT_NOT_FOUND: "イベントが存在しません",
  RESERVATION_PARAMS_REQUIRED: "userId, eventId, reservationType は必須です",
  EVENT_NOT_BOOKABLE: "この枠は予約できません",
  EVENT_CAPACITY_FULL: "定員に達しています",
  EVENT_CAPACITY_FULL_OVERRIDE: "定員に達しています（特例承認で+1可能）",
  RESERVATION_ALREADY_EXISTS: "すでにこの枠を予約済みです",
  MAKEUP_CREDIT_ID_REQUIRED: "振替予約の場合は makeupCreditId が必要です",
  MAKEUP_CREDIT_NOT_AVAILABLE: "利用可能な振替権利が見つかりません",

  // クラス種別
  CLASS_TYPE_NAME_REQUIRED: "名前は必須です",
  CLASS_TYPE_CODE_DUPLICATE: "このコードは既に使われています（コードを変えるか空欄で名前から自動生成）",
  CLASS_TYPE_NAME_EMPTY: "名前は空にできません",
  CLASS_TYPE_UPDATE_EMPTY: "更新する項目がありません",
  CLASS_TYPE_NOT_FOUND: "クラス種別が見つかりません",
  CLASS_TYPE_IN_USE: "このクラス種別はイベント等で使用中のため削除できません",

  // イベント管理
  EVENT_CREATE_PARAMS_REQUIRED: "classTypeId, startsAt, endsAt は必須です",
  EVENT_BULK_PARAMS_REQUIRED: "classTypeId, startTime, endTime, weekdays, dateFrom, dateTo は必須です",
  EVENT_DELETE_HAS_RESERVATIONS: "このイベントには有効な予約があるため削除できません。先に予約をキャンセルしてください",
  EVENT_IDS_REQUIRED: "ids は必須です",
  EVENT_BULK_DELETE_HAS_RESERVATIONS: "有効な予約があるイベントがあります。先に予約をキャンセルしてください",
  EVENT_BULK_STATUS_PARAMS_REQUIRED: "ids と status は必須です",
  EVENT_STATUS_INVALID: "status は scheduled / canceled_by_admin / holiday のいずれかです",
  EVENT_BULK_CAPACITY_PARAMS_REQUIRED: "ids と capacity は必須です",
  EVENT_BULK_TIME_PARAMS_REQUIRED: "ids, startTime, endTime は必須です",
  EVENT_TIME_PARAMS_REQUIRED: "startsAt と endsAt は必須です",
  EVENT_CAPACITY_INVALID: "capacity は 0 以上の数値です",

  // 振替権利
  CREDIT_USER_ID_REQUIRED: "userId は必須です",
  CREDIT_UPDATE_EMPTY: "更新する項目がありません",
  CREDIT_NOT_FOUND: "振替権利が見つかりません",

  // 予約（管理・会員キャンセル）
  RESERVATION_NOT_FOUND: "予約が見つかりません",
  RESERVATION_NOT_BOOKED: "この予約はキャンセルできません（すでにキャンセル済みまたは完了しています）",
  RESERVATION_CANCEL_NOT_BOOKED: "booked 状態の予約のみキャンセルできます",
  INVALID_ID: "予約IDが正しくありません",

  // 会員（admin/members でも使用）
  MEMBER_NAME_REQUIRED: "名前は必須です",
  MEMBER_NAME_EMPTY: "名前は空にできません",
  MEMBER_EMAIL_INVALID: "メールアドレスの形式が正しくありません",
  MEMBER_EMAIL_DUPLICATE: "このメールアドレスは既に登録されています",
  MEMBER_UPDATE_EMPTY: "更新する項目がありません",
  MEMBER_NOT_FOUND: "会員が見つかりません",
  MEMBER_DELETE_HAS_REFERENCES: "振替権利または予約が紐づいているため削除できません。先にそれらを解除してください。",

  // スタッフ
  STAFF_NAME_REQUIRED: "名前は必須です",
  STAFF_NAME_EMPTY: "名前は空にできません",
  STAFF_UPDATE_EMPTY: "更新する項目がありません",
  STAFF_NOT_FOUND: "スタッフが見つかりません",

  // 法人申し込み
  CORPORATION_NAME_REQUIRED: "法人名を入力してください",
  STORE_NAME_REQUIRED: "店舗名を入力してください",
  ADMIN_EMAIL_REQUIRED: "管理者のメールアドレスを入力してください",
  ADMIN_PASSWORD_REQUIRED: "パスワードは6文字以上で入力してください",
  ADMIN_EMAIL_ALREADY_USED: "このメールアドレスは既に利用されています",

  // 会員登録
  MEMBER_STORE_REQUIRED: "店舗を選択してください",
  MEMBER_EMAIL_REQUIRED: "メールアドレスを入力してください",
  STORE_NOT_FOUND: "店舗が見つかりません",
  VERIFICATION_TOKEN_INVALID: "認証リンクが無効です。再度会員登録をお願いします。",
  VERIFICATION_TOKEN_EXPIRED: "認証リンクの有効期限が切れています。再度会員登録をお願いします。",

  // 予約受付期限・キャンセル期限
  BOOKING_DEADLINE_PASSED: "予約受付期限を過ぎています",
  CANCEL_DEADLINE_PASSED: "キャンセル期限を過ぎています",
  MEMBER_NOT_ACTIVE: "停止中または退会済みの会員は予約できません",

  // キャンセル待ち
  EVENT_NOT_FULL: "空きがあります。直接予約できます。",
  ALREADY_ON_WAITLIST: "すでにキャンセル待ちに登録されています",
  NOT_ON_WAITLIST: "キャンセル待ちに登録されていません",

  // 会員ステータス
  MEMBER_PAUSED: "アカウントが一時停止中です。管理者にお問い合わせください。",
  MEMBER_WITHDRAWN: "退会済みのアカウントです。",

  // 権限
  FORBIDDEN: "この操作には管理者権限が必要です",
};

export type ApiErrorExtra = {
  count?: number;
  details?: { eventId: number; count: number }[];
};

/**
 * ApiResult.data から直接エラーメッセージを取得するユーティリティ。
 * `getApiErrorMessage((r.data as { error?: string })?.error)` の代替として使用。
 */
export function extractApiError(data: unknown): string {
  const res = data as ({ error?: string } & ApiErrorExtra) | undefined;
  return getApiErrorMessage(res?.error, res);
}

/**
 * バックエンドが返す error コード（とオプションの count/details）から表示用日本語を返す
 */
export function getApiErrorMessage(code: string | undefined, extra?: ApiErrorExtra): string {
  if (!code) return "処理に失敗しました";
  const base = API_ERROR_MESSAGES[code];
  if (!base) return "処理に失敗しました";

  if (code === "EVENT_DELETE_HAS_RESERVATIONS" && extra?.count != null) {
    return `このイベントには有効な予約が ${extra.count} 件あります。先に予約をキャンセルしてください`;
  }
  if (code === "EVENT_BULK_DELETE_HAS_RESERVATIONS" && extra?.details?.length) {
    const parts = extra.details.map((d) => `#${d.eventId}(${d.count}件)`).join(", ");
    return `有効な予約があるイベントがあります: ${parts}。先に予約をキャンセルしてください`;
  }
  return base;
}
