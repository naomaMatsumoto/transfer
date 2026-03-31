import Link from "next/link";
import { ROUTES } from "@/app/routes";
import s from "@/app/calendar.module.scss";

type Props = {
  storeId: string;
  storeIdNum: number;
  storeName: string | null;
  memberChecked: boolean;
  isLoggedIn: boolean;
};

export function StoreCalendarHeader({
  storeId,
  storeIdNum,
  storeName,
  memberChecked,
  isLoggedIn,
}: Props) {
  return (
    <>
      <div className={s.headerBack}>
        <Link href={ROUTES.HOME} className={s.headerBackLink}>
          ← 店舗を変更
        </Link>
      </div>
      <h1 className={s.title}>
        振替管理カレンダー
        {storeName ? ` — ${storeName}` : `（店舗ID: ${storeId}）`}
      </h1>
      {memberChecked && !isLoggedIn && (
        <p className={s.loginPrompt}>
          振替予約・欠席登録は
          <Link
            href={`${ROUTES.MEMBER_LOGIN}?returnTo=${encodeURIComponent(`/stores/${storeIdNum}`)}`}
            className={s.loginPromptLink}
          >
            会員ログイン
          </Link>
          後にご利用いただけます。（店舗で登録したアカウント）
        </p>
      )}
    </>
  );
}
