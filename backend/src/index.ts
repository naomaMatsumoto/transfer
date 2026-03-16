import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require("cookie-parser");
import session from "express-session";
import MySQLStore from "express-mysql-session";
import dotenv from "dotenv";
import logger from "./logger";
import router from "./router";
import { ensureAuthTables } from "./ensureAuthTables";

dotenv.config();

const SESSION_MAX_AGE_MS = (Number(process.env.SESSION_MAX_AGE_DAYS) || 7) * 24 * 60 * 60 * 1000;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MySQLSessionStore = MySQLStore(session as any);
const sessionStore = new MySQLSessionStore({
  host: process.env.DB_HOST || "db",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "app",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "makeup_app",
  createDatabaseTable: true,
  expiration: SESSION_MAX_AGE_MS,
  clearExpired: true,
  checkExpirationInterval: 60 * 60 * 1000,
});

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-me-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE_MS,
      sameSite: "lax",
    },
  }),
);
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith("/admin") || req.path.startsWith("/ops")) {
    logger.debug(`${req.method} ${req.path}`);
  }
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(router);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found", path: _req.method + " " + _req.path });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as { message?: string; sqlMessage?: string; code?: string; stack?: string };
  const msg = e?.sqlMessage ?? (err instanceof Error ? err.message : String(err));
  const codePart = e?.code ? ` [${e.code}]` : "";
  const stack = err instanceof Error ? (err as Error).stack : undefined;
  logger.error(stack ? `Unhandled error${codePart}: ${msg}\n${stack}` : `Unhandled error${codePart}: ${msg}`);
  res.status(500).json({ error: "Internal Server Error" });
});

(async () => {
  await ensureAuthTables();
  const store = sessionStore as { onReady?: () => Promise<void> };
  if (typeof store.onReady === "function") {
    await store.onReady();
    logger.info("Session store ready");
  }
  app.listen(port, () => {
    logger.info(`Backend API listening on port ${port}`);
  });
})();
