-- 会員(users)を店舗に紐づける
ALTER TABLE users ADD COLUMN store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE users ADD CONSTRAINT fk_users_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;
