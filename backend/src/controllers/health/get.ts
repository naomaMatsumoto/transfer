import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../db";

const startedAt = Date.now();

export default async function getHealth(_req: Request, res: Response, _next: NextFunction): Promise<void> {
  const dbStart = Date.now();
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      db: { status: "ok", latencyMs: Date.now() - dbStart },
    });
  } catch {
    res.status(503).json({
      status: "error",
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      db: { status: "error", latencyMs: Date.now() - dbStart },
    });
  }
}
