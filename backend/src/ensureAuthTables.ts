import crypto from "crypto";
import bcrypt from "bcrypt";
import { pool } from "./db";
import logger from "./logger";

async function ensureIndex(table: string, indexName: string, columns: string): Promise<void> {
  const [rows] = await pool.query(
    "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1",
    [table, indexName]
  );
  if ((rows as unknown[]).length === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${columns})`);
    logger.info(`Created index ${indexName} on ${table}`);
  }
}

export async function ensureAuthTables(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS corporations (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        organization_type ENUM('corporation', 'sole_proprietor') NOT NULL DEFAULT 'corporation',
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        corporation_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_stores_corporation FOREIGN KEY (corporation_id) REFERENCES corporations(id) ON DELETE CASCADE
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        corporation_id BIGINT UNSIGNED NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_accounts_email (email),
        CONSTRAINT fk_accounts_corporation FOREIGN KEY (corporation_id) REFERENCES corporations(id) ON DELETE CASCADE
      )
    `);

    const [orgTypeCol] = await pool.query(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'corporations' AND COLUMN_NAME = 'organization_type' LIMIT 1"
    );
    if ((orgTypeCol as unknown[]).length === 0) {
      await pool.query("ALTER TABLE corporations ADD COLUMN organization_type ENUM('corporation', 'sole_proprietor') NOT NULL DEFAULT 'corporation' AFTER id");
      logger.info("Added organization_type to corporations");
    }

    const [corpRows] = await pool.query("SELECT id FROM corporations LIMIT 1");
    if ((corpRows as unknown[]).length === 0) {
      await pool.query("INSERT INTO corporations (id, organization_type, name) VALUES (1, 'corporation', 'デフォルト法人')");
      await pool.query("INSERT INTO stores (id, corporation_id, name) VALUES (1, 1, 'デフォルト店舗')");
      logger.info("Created default corporation and store");
    }

    const [accountRows] = await pool.query("SELECT id FROM accounts LIMIT 1");
    if ((accountRows as unknown[]).length === 0) {
      const hash = await bcrypt.hash("password", 10);
      await pool.query(
        "INSERT INTO accounts (corporation_id, email, password_hash, display_name) VALUES (1, ?, ?, '管理者')",
        ["admin@example.com", hash]
      );
      logger.info("Created default account: admin@example.com (initial password in docs)");
    }

    // 既存DB: users に store_id がなければ追加
    const [colRows] = await pool.query(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'store_id' LIMIT 1"
    );
    if ((colRows as unknown[]).length === 0) {
      await pool.query("ALTER TABLE users ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id");
      await pool.query("ALTER TABLE users ADD CONSTRAINT fk_users_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL");
      logger.info("Added store_id to users");
    }

    // 既存DB: users に email_verified_at がなければ追加
    const [evCol] = await pool.query(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified_at' LIMIT 1"
    );
    if ((evCol as unknown[]).length === 0) {
      await pool.query("ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULL AFTER email");
      logger.info("Added email_verified_at to users");
    }

    // 既存DB: users に password_hash（店舗登録会員のログイン用）
    const [pwCol] = await pool.query(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash' LIMIT 1"
    );
    if ((pwCol as unknown[]).length === 0) {
      await pool.query("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER email_verified_at");
      logger.info("Added password_hash to users");
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        token VARCHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_verification_token (token),
        CONSTRAINT fk_verification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Phase 2: class_types に store_id を追加（法人・店舗ごとのデータ分離）
    const [ctCol] = await pool.query(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'class_types' AND COLUMN_NAME = 'store_id' LIMIT 1"
    );
    if ((ctCol as unknown[]).length === 0) {
      await pool.query("ALTER TABLE class_types ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id");
      await pool.query("ALTER TABLE class_types ADD CONSTRAINT fk_class_types_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE");
      await pool.query("UPDATE class_types SET store_id = 1 WHERE store_id IS NULL");
      logger.info("Added store_id to class_types");
    }

    // Phase 2: staff に store_id を追加
    const [staffCol] = await pool.query(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff' AND COLUMN_NAME = 'store_id' LIMIT 1"
    );
    if ((staffCol as unknown[]).length === 0) {
      await pool.query("ALTER TABLE staff ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id");
      await pool.query("ALTER TABLE staff ADD CONSTRAINT fk_staff_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE");
      await pool.query("UPDATE staff SET store_id = 1 WHERE store_id IS NULL");
      logger.info("Added store_id to staff");
    }

    // corporations.code (obfuscated URL identifier)
    const [codeCol] = await pool.query(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'corporations' AND COLUMN_NAME = 'code' LIMIT 1"
    );
    if ((codeCol as unknown[]).length === 0) {
      await pool.query("ALTER TABLE corporations ADD COLUMN code CHAR(12) NULL AFTER id");
      await pool.query("ALTER TABLE corporations ADD UNIQUE KEY uk_corporations_code (code)");
      const [existing] = await pool.query("SELECT id FROM corporations WHERE code IS NULL");
      for (const row of existing as { id: number }[]) {
        const code = crypto.randomBytes(9).toString("base64url").slice(0, 12);
        await pool.query("UPDATE corporations SET code = ? WHERE id = ?", [code, row.id]);
      }
      logger.info("Added code to corporations");
    }

    // corporations.status
    const [statusCol] = await pool.query(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'corporations' AND COLUMN_NAME = 'status' LIMIT 1"
    );
    if ((statusCol as unknown[]).length === 0) {
      await pool.query("ALTER TABLE corporations ADD COLUMN status ENUM('pending','email_sent','active','suspended') NOT NULL DEFAULT 'active' AFTER name");
      logger.info("Added status to corporations");
    } else {
      // Extend ENUM if it only has old values (MySQL: MODIFY to add new enum values)
      const [enumCol] = await pool.query(
        "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'corporations' AND COLUMN_NAME = 'status' LIMIT 1"
      );
      const enumType = (enumCol as { COLUMN_TYPE: string }[])[0]?.COLUMN_TYPE ?? "";
      if (enumType.includes("'pending'") === false || enumType.includes("'email_sent'") === false) {
        await pool.query("ALTER TABLE corporations MODIFY COLUMN status ENUM('pending','email_sent','active','suspended') NOT NULL DEFAULT 'active'");
        logger.info("Extended corporations.status ENUM with pending, email_sent");
      }
    }

    // stores.public_id (UUID for public URLs)
    const [pidCol] = await pool.query(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stores' AND COLUMN_NAME = 'public_id' LIMIT 1"
    );
    if ((pidCol as unknown[]).length === 0) {
      await pool.query("ALTER TABLE stores ADD COLUMN public_id CHAR(36) NULL AFTER id");
      await pool.query("ALTER TABLE stores ADD UNIQUE KEY uk_stores_public_id (public_id)");
      const [existing] = await pool.query("SELECT id FROM stores WHERE public_id IS NULL");
      for (const row of existing as { id: number }[]) {
        await pool.query("UPDATE stores SET public_id = ? WHERE id = ?", [crypto.randomUUID(), row.id]);
      }
      logger.info("Added public_id to stores");
    }

    // accounts.role
    const [roleCol] = await pool.query(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'role' LIMIT 1"
    );
    if ((roleCol as unknown[]).length === 0) {
      await pool.query("ALTER TABLE accounts ADD COLUMN role ENUM('admin','staff') NOT NULL DEFAULT 'admin' AFTER display_name");
      logger.info("Added role to accounts");
    }

    // 運営管理者（SaaS プラットフォーム側）
    await pool.query(`
      CREATE TABLE IF NOT EXISTS platform_admins (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    const [opsRows] = await pool.query("SELECT id FROM platform_admins LIMIT 1");
    if ((opsRows as unknown[]).length === 0) {
      const hash = await bcrypt.hash("ops-password", 10);
      await pool.query(
        "INSERT INTO platform_admins (email, password_hash, display_name) VALUES (?, ?, '運営管理者')",
        ["ops@example.com", hash]
      );
      logger.info("Created default platform admin: ops@example.com (initial password in docs)");
    }

    // 監査ログ
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        actor_type ENUM('admin','member','platform','system') NOT NULL,
        actor_id BIGINT UNSIGNED NULL,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50) NULL,
        target_id BIGINT UNSIGNED NULL,
        detail JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_created (created_at),
        INDEX idx_audit_action (action)
      )
    `);

    // corporations.deleted_at (soft delete)
    const [delCol] = await pool.query(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'corporations' AND COLUMN_NAME = 'deleted_at' LIMIT 1"
    );
    if ((delCol as unknown[]).length === 0) {
      await pool.query("ALTER TABLE corporations ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL");
      logger.info("Added deleted_at to corporations");
    }

    // staff テーブルと event_staff テーブル
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_staff (
        event_id BIGINT UNSIGNED NOT NULL,
        staff_id BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (event_id, staff_id),
        CONSTRAINT fk_event_staff_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        CONSTRAINT fk_event_staff_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
      )
    `);
    // 既存DBへのインデックス追加（新規インストールは init.sql で対応済み）
    await ensureIndex("stores", "idx_stores_corporation_id", "corporation_id");
    await ensureIndex("users", "idx_users_store_id", "store_id");
    await ensureIndex("events", "idx_events_starts_at", "starts_at");
    await ensureIndex("events", "idx_events_class_type_id", "class_type_id");
    await ensureIndex("events", "idx_events_status", "status");
    await ensureIndex("makeup_credits", "idx_makeup_credits_user_id", "user_id");
    await ensureIndex("makeup_credits", "idx_makeup_credits_status", "status");
    await ensureIndex("makeup_credits", "idx_makeup_credits_source_event_id", "source_event_id");
    await ensureIndex("reservations", "idx_reservations_event_status", "event_id, status");
    await ensureIndex("reservations", "idx_reservations_user_id", "user_id");
    await ensureIndex("event_staff", "idx_event_staff_staff_id", "staff_id");

    logger.info("Auth tables ready");
  } catch (e) {
    logger.error("Failed to ensure auth tables: " + (e instanceof Error ? e.message : String(e)));
  }
}
