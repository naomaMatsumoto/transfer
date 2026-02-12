-- 法人・店舗・アカウント（ログイン用）
-- Phase 1: テーブル追加のみ。既存データへの store_id 付与は Phase 2 で行う。

CREATE TABLE IF NOT EXISTS corporations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stores (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  corporation_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stores_corporation FOREIGN KEY (corporation_id) REFERENCES corporations(id) ON DELETE CASCADE
);

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
);

-- 初回用: 1法人・1店舗を作成。アカウントはバックエンド起動時に bcrypt で作成される。
INSERT IGNORE INTO corporations (id, name) VALUES (1, 'デフォルト法人');
INSERT IGNORE INTO stores (id, corporation_id, name) VALUES (1, 1, 'デフォルト店舗');
