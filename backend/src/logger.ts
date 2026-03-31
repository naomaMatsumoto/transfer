import winston from "winston";

// http レベルを info と debug の間に追加（morgan アクセスログ用）
const HTTP_LEVEL = "http";
winston.addColors({ [HTTP_LEVEL]: "cyan" });

const logger = winston.createLogger({
  levels: { ...winston.config.npm.levels, [HTTP_LEVEL]: 4 },
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return stack
        ? `${timestamp} [${level.toUpperCase()}] ${message}\n${stack}`
        : `${timestamp} [${level.toUpperCase()}] ${message}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
