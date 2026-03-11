"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAV, ROUTES } from "./routes";
import s from "./AppShell.module.scss";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const hideShell = pathname?.startsWith("/ops");

  if (hideShell) return <>{children}</>;

  const isActive = (path: string) => {
    if (path === ROUTES.HOME) return pathname === "/";
    return pathname?.startsWith(path) ?? false;
  };

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <Link href={ROUTES.HOME} className={s.logo}>
          振替管理
        </Link>
        <nav className={s.nav}>
          {MAIN_NAV.map(({ path, label }) => (
            <Link
              key={path}
              href={path}
              className={isActive(path) ? s.navLinkActive : s.navLink}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className={s.main}>{children}</main>
    </div>
  );
}
