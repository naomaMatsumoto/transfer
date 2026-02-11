-- MySQL 8.0: ホスト 172.19.0.1（Docker 外の npm run dev）から接続できるユーザーを作成
-- 実行: docker exec -i makeup-mysql mysql -u root -prootpassword < backend/src/db/grant-remote-user.sql
-- または MySQL に入ってから: source で読み込み

-- 既存ユーザーが localhost のみの場合は、別ホスト用にユーザーを作成
CREATE USER IF NOT EXISTS 'dynamomonn8543'@'%' IDENTIFIED WITH mysql_native_password BY '127ddwetck';
GRANT ALL PRIVILEGES ON `dynamo-extension`.* TO 'dynamomonn8543'@'%';
FLUSH PRIVILEGES;
