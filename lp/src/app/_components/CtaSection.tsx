import type { CSSProperties } from "react";
import { APP_URL } from "../_constants";
import { container } from "../_styles";

const s = {
  section: {
    padding: "96px 0",
    textAlign: "center",
  } satisfies CSSProperties,

  box: {
    background: "linear-gradient(135deg, var(--color-primary) 0%, #7c3aed 100%)",
    borderRadius: "20px",
    padding: "64px 40px",
    color: "#fff",
  } satisfies CSSProperties,

  title: {
    fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
    fontWeight: 800,
    marginBottom: "16px",
    letterSpacing: "-0.01em",
  } satisfies CSSProperties,

  desc: {
    fontSize: "1.05rem",
    opacity: 0.85,
    marginBottom: "36px",
  } satisfies CSSProperties,

  btn: {
    display: "inline-block",
    background: "#fff",
    color: "var(--color-primary)",
    padding: "16px 40px",
    borderRadius: "10px",
    fontWeight: 700,
    fontSize: "1.05rem",
    boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
  } satisfies CSSProperties,
};

export function CtaSection() {
  return (
    <section style={s.section}>
      <div style={container}>
        <div style={s.box}>
          <h2 style={s.title}>今すぐ無料で始めましょう</h2>
          <p style={s.desc}>初期費用ゼロ・クレジットカード不要。法人登録から5分でご利用いただけます。</p>
          <a href={`${APP_URL}/corporation/register`} style={s.btn}>
            無料でアカウントを作成 →
          </a>
        </div>
      </div>
    </section>
  );
}
