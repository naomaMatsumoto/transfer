"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const promise_1 = require("mysql2/promise");
dotenv_1.default.config();
exports.pool = (0, promise_1.createPool)({
    host: process.env.DB_HOST || "db",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "app",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "makeup_app",
    waitForConnections: true,
    connectionLimit: 10,
});
