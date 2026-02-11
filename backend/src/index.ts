import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import logger from "./logger";
import router from "./router";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.path.startsWith("/admin")) logger.info(`${req.method} ${req.path}`);
  next();
});

app.use(router);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found", path: _req.method + " " + _req.path });
});

app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as { message?: string; sqlMessage?: string; code?: string; stack?: string };
    const msg = e?.sqlMessage ?? (err instanceof Error ? err.message : String(err));
    const code = e?.code ? ` [${e.code}]` : "";
    const stack = err instanceof Error ? (err as Error).stack : undefined;
    logger.error(stack ? `Unhandled error${code}: ${msg}\n${stack}` : `Unhandled error${code}: ${msg}`);
    res.status(500).json({ error: "Internal Server Error" });
  },
);

app.listen(port, () => {
  logger.info(`Backend API listening on port ${port}`);
});
