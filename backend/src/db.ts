import dotenv from "dotenv";
import { createPool } from "mysql2/promise";

dotenv.config();

export const pool = createPool({
  host: process.env.DB_HOST || "db",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "app",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "makeup_app",
  waitForConnections: true,
  connectionLimit: 10,
});
