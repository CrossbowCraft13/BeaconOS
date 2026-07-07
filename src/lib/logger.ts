/**
 * BeaconOS logging system.
 *
 * Provides both a class-based Logger (for dependency injection) and
 * backward-compatible standalone functions for simple use cases.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  SUCCESS = 2,
  WARNING = 3,
  ERROR = 4,
}

const LEVEL_LABELS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.SUCCESS]: "SUCCESS",
  [LogLevel.WARNING]: "WARNING",
  [LogLevel.ERROR]: "ERROR",
};

const LEVEL_SYMBOLS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "·",
  [LogLevel.INFO]: "ℹ",
  [LogLevel.SUCCESS]: "✓",
  [LogLevel.WARNING]: "⚠",
  [LogLevel.ERROR]: "✗",
};

// ── Logger class (injectable) ──────────────────────────────────────

export class Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  debug(message: string): void {
    this.write(LogLevel.DEBUG, message);
  }

  info(message: string): void {
    this.write(LogLevel.INFO, message);
  }

  success(message: string): void {
    this.write(LogLevel.SUCCESS, message);
  }

  warning(message: string): void {
    this.write(LogLevel.WARNING, message);
  }

  error(message: string): void {
    this.write(LogLevel.ERROR, message);
  }

  private write(level: LogLevel, message: string): void {
    if (level < this.minLevel) return;

    const symbol = LEVEL_SYMBOLS[level];
    const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);

    console.log(`${timestamp} ${symbol} ${message}`);
  }
}

// ── Backward-compatible standalone functions ───────────────────────

const defaultLogger = new Logger();

export function info(message: string): void {
  defaultLogger.info(message);
}

export function success(message: string): void {
  defaultLogger.success(message);
}

export function warning(message: string): void {
  defaultLogger.warning(message);
}

export function error(message: string): void {
  defaultLogger.error(message);
}

export function debug(message: string): void {
  defaultLogger.debug(message);
}
