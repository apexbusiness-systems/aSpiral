/**
 * aSpiral Structured Logger
 * Enterprise-grade logging with PII sanitization
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  meta?: Record<string, unknown>;
}

const SENSITIVE_FIELDS = [
  "email",
  "password",
  "token",
  "apiKey",
  "api_key",
  "secret",
  "authorization",
];

export class Logger {
  constructor(private context: string) {}

  private sanitize(meta: unknown): unknown {
    if (!meta || typeof meta !== "object") return meta;

    if (Array.isArray(meta)) {
      return meta.map((item) => this.sanitize(item));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(meta as Record<string, unknown>)) {
      if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      meta: meta ? (this.sanitize(meta) as Record<string, unknown>) : undefined,
    };

    // Console output with styling
    const styles: Record<LogLevel, string> = {
      debug: "color: #888",
      info: "color: #4CAF50",
      warn: "color: #FF9800",
      error: "color: #f44336",
    };

    console[level](
      `%c[${logEntry.level.toUpperCase()}] ${logEntry.context}:`,
      styles[level],
      logEntry.message,
      logEntry.meta || ""
    );
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (import.meta.env.DEV) {
      this.log("debug", message, meta);
    }
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.log("warn", message, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>) {
    this.log("error", message, {
      ...meta,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: import.meta.env.DEV ? error.stack : undefined,
          }
        : undefined,
    });
  }
}

/**
 * Create a logger for a module
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}
