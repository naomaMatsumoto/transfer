/**
 * ファイルベースのマイグレーションランナー
 *
 * src/db/migrations/ 以下の *.sql ファイルをファイル名の昇順に適用する。
 * schema_migrations テーブルで適用済みを管理するため、再起動しても二重適用しない。
 *
 * 使い方:
 *   node dist/db/migrate.js          # 単体実行
 *   アプリ起動時に runMigrations() を呼び出す（index.ts）
 */

import fs from "fs";
import path from "path";
import { pool } from "../db";
import logger from "../logger";

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function appliedMigrations(): Promise<Set<string>> {
  const [rows] = await pool.query("SELECT filename FROM schema_migrations ORDER BY filename");
  return new Set((rows as { filename: string }[]).map((r) => r.filename));
}

export async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, "migrations");
  if (!fs.existsSync(migrationsDir)) {
    logger.info("No migrations directory found, skipping file-based migrations");
    return;
  }

  await ensureMigrationsTable();
  const applied = await appliedMigrations();

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const stmt of statements) {
        await conn.query(stmt);
      }
      await conn.query("INSERT INTO schema_migrations (filename) VALUES (?)", [file]);
      await conn.commit();
      logger.info(`Migration applied: ${file}`);
    } catch (err) {
      await conn.rollback();
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Migration failed: ${file} — ${msg}`);
      throw err;
    } finally {
      conn.release();
    }
  }
}

// 単体実行サポート
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info("All migrations applied");
      process.exit(0);
    })
    .catch((err) => {
      logger.error("Migration error: " + (err instanceof Error ? err.message : String(err)));
      process.exit(1);
    });
}
