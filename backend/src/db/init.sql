CREATE TABLE IF NOT EXISTS corporations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_type ENUM('corporation', 'sole_proprietor') NOT NULL DEFAULT 'corporation' COMMENT '法人 / 個人事業主',
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

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  store_id BIGINT UNSIGNED NULL,
  name VARCHAR(255) NOT NULL,
  furigana VARCHAR(255) NULL,
  email VARCHAR(255) UNIQUE,
  email_verified_at TIMESTAMP NULL,
  address VARCHAR(500) NULL,
  phone VARCHAR(50) NULL,
  course_type VARCHAR(50) NULL,
  stage ENUM('preschool', 'elementary', 'junior_high', 'high_school', 'other') DEFAULT 'other' COMMENT '未就学児/小学生/中学生/高校生/その他',
  status ENUM('active', 'paused', 'withdrawn') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_verification_token (token),
  CONSTRAINT fk_verification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS class_types (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  store_id BIGINT UNSIGNED NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  UNIQUE KEY uk_class_types_code_store (code, store_id),
  CONSTRAINT fk_class_types_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  class_type_id BIGINT UNSIGNED NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  capacity INT NOT NULL DEFAULT 6,
  status ENUM('scheduled', 'canceled_by_admin', 'holiday') DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_class_type FOREIGN KEY (class_type_id) REFERENCES class_types(id)
);

CREATE TABLE IF NOT EXISTS makeup_credits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  class_type_id BIGINT UNSIGNED NULL,
  granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  status ENUM('granted', 'consumed', 'revoked') DEFAULT 'granted',
  source ENUM('absence', 'admin_holiday') NOT NULL,
  source_event_id BIGINT UNSIGNED NULL,
  note TEXT NULL,
  created_by VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_makeup_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_makeup_class_type FOREIGN KEY (class_type_id) REFERENCES class_types(id),
  CONSTRAINT fk_makeup_source_event FOREIGN KEY (source_event_id) REFERENCES events(id)
);

CREATE TABLE IF NOT EXISTS reservations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  reservation_type ENUM('normal', 'makeup') NOT NULL DEFAULT 'normal',
  makeup_credit_id BIGINT UNSIGNED NULL,
  status ENUM('booked', 'canceled_by_user', 'canceled_by_admin', 'attended', 'no_show') NOT NULL DEFAULT 'booked',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  canceled_at DATETIME NULL,
  CONSTRAINT fk_reservation_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_reservation_event FOREIGN KEY (event_id) REFERENCES events(id),
  CONSTRAINT fk_reservation_makeup_credit FOREIGN KEY (makeup_credit_id) REFERENCES makeup_credits(id)
);

CREATE TABLE IF NOT EXISTS staff (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  store_id BIGINT UNSIGNED NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_staff_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_staff (
  event_id BIGINT UNSIGNED NOT NULL,
  staff_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (event_id, staff_id),
  CONSTRAINT fk_event_staff_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_staff_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

