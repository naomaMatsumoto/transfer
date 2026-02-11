-- 会員: 学年(grade)を廃止し、ステータス(学齢段階)として stage を追加
-- 既存DBで実行する場合: mysql -u user -p database < migrate-users-stage.sql
-- （stage 追加と grade 削除を一度にやる場合。既に stage がある場合は先頭の ADD はスキップして DROP だけ実行）

ALTER TABLE users ADD COLUMN stage ENUM('preschool', 'elementary', 'junior_high', 'high_school', 'other') DEFAULT 'other' AFTER course_type;
ALTER TABLE users DROP COLUMN grade;
