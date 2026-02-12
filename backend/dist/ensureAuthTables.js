"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAuthTables = ensureAuthTables;
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("./db");
const logger_1 = __importDefault(require("./logger"));
async function ensureAuthTables() {
    try {
        await db_1.pool.query(`
      CREATE TABLE IF NOT EXISTS corporations (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
        await db_1.pool.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        corporation_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_stores_corporation FOREIGN KEY (corporation_id) REFERENCES corporations(id) ON DELETE CASCADE
      )
    `);
        await db_1.pool.query(`
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
        const [corpRows] = await db_1.pool.query("SELECT id FROM corporations LIMIT 1");
        if (corpRows.length === 0) {
            await db_1.pool.query("INSERT INTO corporations (id, name) VALUES (1, 'デフォルト法人')");
            await db_1.pool.query("INSERT INTO stores (id, corporation_id, name) VALUES (1, 1, 'デフォルト店舗')");
            logger_1.default.info("Created default corporation and store");
        }
        const [accountRows] = await db_1.pool.query("SELECT id FROM accounts LIMIT 1");
        if (accountRows.length === 0) {
            const hash = await bcrypt_1.default.hash("password", 10);
            await db_1.pool.query("INSERT INTO accounts (corporation_id, email, password_hash, display_name) VALUES (1, ?, ?, '管理者')", ["admin@example.com", hash]);
            logger_1.default.info("Created default account: admin@example.com / password");
        }
        // 既存DB: users に store_id がなければ追加
        const [colRows] = await db_1.pool.query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'store_id' LIMIT 1");
        if (colRows.length === 0) {
            await db_1.pool.query("ALTER TABLE users ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id");
            await db_1.pool.query("ALTER TABLE users ADD CONSTRAINT fk_users_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL");
            logger_1.default.info("Added store_id to users");
        }
        // 既存DB: users に email_verified_at がなければ追加
        const [evCol] = await db_1.pool.query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified_at' LIMIT 1");
        if (evCol.length === 0) {
            await db_1.pool.query("ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULL AFTER email");
            logger_1.default.info("Added email_verified_at to users");
        }
        await db_1.pool.query(`
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
        const [ctCol] = await db_1.pool.query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'class_types' AND COLUMN_NAME = 'store_id' LIMIT 1");
        if (ctCol.length === 0) {
            await db_1.pool.query("ALTER TABLE class_types ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id");
            await db_1.pool.query("ALTER TABLE class_types ADD CONSTRAINT fk_class_types_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE");
            await db_1.pool.query("UPDATE class_types SET store_id = 1 WHERE store_id IS NULL");
            logger_1.default.info("Added store_id to class_types");
        }
        // Phase 2: staff に store_id を追加
        const [staffCol] = await db_1.pool.query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff' AND COLUMN_NAME = 'store_id' LIMIT 1");
        if (staffCol.length === 0) {
            await db_1.pool.query("ALTER TABLE staff ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id");
            await db_1.pool.query("ALTER TABLE staff ADD CONSTRAINT fk_staff_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE");
            await db_1.pool.query("UPDATE staff SET store_id = 1 WHERE store_id IS NULL");
            logger_1.default.info("Added store_id to staff");
        }
        logger_1.default.info("Auth tables ready");
    }
    catch (e) {
        logger_1.default.error("Failed to ensure auth tables: " + (e instanceof Error ? e.message : String(e)));
    }
}
