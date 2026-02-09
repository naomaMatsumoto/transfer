## Makeup (振替) 管理アプリ プロジェクト構成

- Frontend: Next.js (TypeScript) `frontend/`
- Backend: Express (TypeScript) `backend/`
- DB: MySQL (Docker) `docker-compose.yml`

### セットアップ（ローカル Docker）

1. Docker Desktop を起動
2. このディレクトリで:

```bash
docker-compose build
docker-compose up
```

- フロントエンド: `http://localhost:3000`
- バックエンド API: `http://localhost:4000`
- MySQL: `localhost:3306`（DB: `makeup_app`, USER: `app`, PASS: `password`）

### DB 初期化

MySQL コンテナに入って `backend/src/db/init.sql` を流し込むことで、振替権利・予約などのテーブルが作成されます。


