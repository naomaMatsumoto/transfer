import bcrypt from "bcrypt";
import { pool } from "./db";
import logger from "./logger";

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
      logger.info("Created default account: admin@example.com / password");
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
      logger.info("Created default platform admin: ops@example.com / ops-password");
    }

    logger.info("Auth tables ready");
  } catch (e) {
    logger.error("Failed to ensure auth tables: " + (e instanceof Error ? e.message : String(e)));
  }
}
