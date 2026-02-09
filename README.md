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

### フロントエンドのルート設計

- **パスで機能領域を分ける**（会員管理・予約システム・将来の SaaS 拡張を見据えた設計）
  - `/` … 会員向けカレンダー（振替予約・欠席登録）
  - `/admin` … 管理トップ（`/admin/reservations` へリダイレクト）
  - `/admin/members` … **会員管理**（一覧・登録・編集は今後実装）
  - `/admin/reservations` … **予約システム**（クラス種別 / イベント・休講 / 振替権利 / 予約・代理のタブ）
- 予約システム内のタブはクエリで保持: `/admin/reservations?tab=events` など。リロードしても同じタブが開く。
- SaaS 化時は `/dashboard` やテナントごとのプレフィックスを追加しやすい構成。


