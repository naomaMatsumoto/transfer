import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "振替管理 | スタジオ・教室向け振替予約システム",
  description:
    "欠席連絡から振替予約まで、生徒・スタッフ双方の手間をゼロに。スタジオ・音楽教室・ヨガ教室向けクラウド振替管理システム。",
  openGraph: {
    title: "振替管理 | スタジオ・教室向け振替予約システム",
    description: "欠席連絡から振替予約まで、生徒・スタッフ双方の手間をゼロに。",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
