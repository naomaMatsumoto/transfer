-- 会員: フリガナ列を追加
-- 既存DBで実行: mysql -u user -p database < migrate-users-furigana.sql

ALTER TABLE users ADD COLUMN furigana VARCHAR(255) NULL AFTER name;
