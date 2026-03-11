import { type Request, type Response, type NextFunction } from "express";

type Entry = { count: number; resetAt: number };

/**
 * IP ベースのインメモリレートリミッター。
 * windowMs 内に maxAttempts を超えたら 429 を返す。
 */
export function rateLimit(opts: { windowMs: number; maxAttempts: number }) {
  const store = new Map<string, Entry>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, opts.windowMs);

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }

    entry.count += 1;
    if (entry.count > opts.maxAttempts) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      res.status(429).json({ error: "TOO_MANY_REQUESTS" });
      return;
    }

    next();
  };
}
