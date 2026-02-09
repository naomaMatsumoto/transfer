CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  grade INT NULL,
  course_type VARCHAR(50) NULL,
  status ENUM('active', 'paused', 'withdrawn') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class_types (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL
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


