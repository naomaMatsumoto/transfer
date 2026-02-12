"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("./logger"));
const router_1 = __importDefault(require("./router"));
const db_1 = require("./db");
const ensureAuthTables_1 = require("./ensureAuthTables");
dotenv_1.default.config();
async function ensureStaffTables() {
    try {
        await db_1.pool.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
        await db_1.pool.query(`
      CREATE TABLE IF NOT EXISTS event_staff (
        event_id BIGINT UNSIGNED NOT NULL,
        staff_id BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (event_id, staff_id),
        CONSTRAINT fk_event_staff_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        CONSTRAINT fk_event_staff_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
      )
    `);
        logger_1.default.info("Staff tables ready");
    }
    catch (e) {
        logger_1.default.error("Failed to ensure staff tables: " + (e instanceof Error ? e.message : String(e)));
    }
}
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
app.use((0, cors_1.default)({ origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true }));
app.use((0, cookie_parser_1.default)());
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || "change-me-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 7 * 24 * 60 * 60 * 1000 },
}));
app.use(express_1.default.json());
app.use((req, _res, next) => {
    if (req.path.startsWith("/admin"))
        logger_1.default.info(`${req.method} ${req.path}`);
    next();
});
app.use(router_1.default);
app.use((_req, res) => {
    res.status(404).json({ error: "Not Found", path: _req.method + " " + _req.path });
});
app.use((err, _req, res, _next) => {
    const e = err;
    const msg = e?.sqlMessage ?? (err instanceof Error ? err.message : String(err));
    const code = e?.code ? ` [${e.code}]` : "";
    const stack = err instanceof Error ? err.stack : undefined;
    logger_1.default.error(stack ? `Unhandled error${code}: ${msg}\n${stack}` : `Unhandled error${code}: ${msg}`);
    res.status(500).json({ error: "Internal Server Error" });
});
(async () => {
    await (0, ensureAuthTables_1.ensureAuthTables)();
    await ensureStaffTables();
    app.listen(port, () => {
        logger_1.default.info(`Backend API listening on port ${port}`);
    });
})();
