"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("./logger"));
const router_1 = __importDefault(require("./router"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
app.use((0, cors_1.default)());
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
app.listen(port, () => {
    logger_1.default.info(`Backend API listening on port ${port}`);
});
