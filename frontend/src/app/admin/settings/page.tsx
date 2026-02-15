"use client";

import Link from "next/link";
import { ROUTES } from "@/app/routes";
import styles from "../admin.module.scss";

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className={styles.settingsPageTitle}>設定</h1>
      <div className={styles.settingsMenuList}>
        <Link href={ROUTES.ADMIN_SETTINGS_PASSWORD} className={styles.settingsMenuItem}>
          <span>パスワードの変更</span>
          <span className={styles.settingsMenuItemArrow}>→</span>
        </Link>
        <Link href={ROUTES.ADMIN_SETTINGS_CORPORATION} className={styles.settingsMenuItem}>
          <span>法人名の変更</span>
          <span className={styles.settingsMenuItemArrow}>→</span>
        </Link>
      </div>
    </div>
  );
}
