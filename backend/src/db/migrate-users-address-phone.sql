-- 会員: 住所・電話番号を追加
-- 既存DBで実行: mysql -u user -p database < migrate-users-address-phone.sql

ALTER TABLE users ADD COLUMN address VARCHAR(500) NULL AFTER email;
ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL AFTER address;
