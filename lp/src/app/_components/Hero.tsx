import type { CSSProperties } from "react";
import { APP_URL } from "../_constants";
import { container } from "../_styles";

const s = {
  section: {
    padding: "96px 0 80px",
    textAlign: "center",
  } satisfies CSSProperties,

  eyebrow: {
    display: "inline-block",
    background: "#eef2ff",
    color: "var(--color-primary)",
    borderRadius: "99px",
    padding: "4px 16px",
    fontSize: "0.85rem",
    fontWeight: 600,
    marginBottom: "24px",
  } satisfies CSSProperties,

  title: {
    fontSize: "clamp(2rem, 5vw, 3.2rem)",
    fontWeight: 800,
    lineHeight: 1.25,
    letterSpacing: "-0.02em",
    marginBottom: "24px",
  } satisfies CSSProperties,

  titleAccent: {
    color: "var(--color-primary)",
  } satisfies CSSProperties,

  desc: {
    fontSize: "1.15rem",
    color: "var(--color-muted)",
    maxWidth: "600px",
    margin: "0 auto 40px",
  } satisfies CSSProperties,

  actions: {
    display: "flex",
    gap: "16px",
    justifyContent: "center",
    flexWrap: "wrap" as const,
  } satisfies CSSProperties,

  btnPrimary: {
    display: "inline-block",
    background: "var(--color-primary)",
    color: "#fff",
    padding: "16px 36px",
    borderRadius: "10px",
    fontWeight: 700,
    fontSize: "1.05rem",
    boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
  } satisfies CSSProperties,

  btnSecondary: {
    display: "inline-block",
    border: "2px solid var(--color-border)",
    color: "var(--color-text)",
    padding: "14px 32px",
    borderRadius: "10px",
    fontWeight: 600,
    fontSize: "1.05rem",
  } satisfies CSSProperties,
};

export function Hero() {
  return (
    <section style={s.section}>
      <div style={container}>
        <span style={s.eyebrow}>スタジオ・教室向けクラウドサービス</span>
        <h1 style={s.title}>
          振替の手間を、
          <br />
          <span style={s.titleAccent}>まるごとなくす。</span>
        </h1>
        <p style={s.desc}>
          欠席連絡から振替予約・クレジット管理まで。
          <br />
          生徒もスタッフも、もう電話もLINEも必要ありません。
        </p>
        <div style={s.actions}>
          <a href={`${APP_URL}/corporation/register`} style={s.btnPrimary}>
            無料で始める
          </a>
          <a href={`${APP_URL}/login`} style={s.btnSecondary}>
            ログイン
          </a>
        </div>
      </div>
    </section>
  );
}
