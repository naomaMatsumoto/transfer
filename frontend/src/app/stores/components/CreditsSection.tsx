import type { MakeupCredit } from "../types";
import s from "@/app/calendar.module.scss";

type Props = {
  isLoggedIn: boolean;
  credits: MakeupCredit[];
};

export function CreditsSection({ isLoggedIn, credits }: Props) {
  return (
    <section className={s.creditsSection}>
      <h2 className={s.sectionTitle}>保有振替権利</h2>
      {!isLoggedIn ? (
        <p className={s.muted}>ログインすると振替予約・欠席登録がご利用いただけます。</p>
      ) : credits.length === 0 ? (
        <p className={s.muted}>現在、振替権利はありません。</p>
      ) : (
        <ul className={s.creditsList}>
          {credits.map((c) => (
            <li key={c.id} className={s.creditItem}>
              ID {c.id} / クラス種別ID: {c.class_type_id ?? "制限なし"} / 付与日:{" "}
              {c.granted_at.slice(0, 10)} / 期限:{" "}
              {c.expires_at ? c.expires_at.slice(0, 10) : "なし"} / 由来:{" "}
              {c.source === "absence" ? "欠席" : "休講"}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
