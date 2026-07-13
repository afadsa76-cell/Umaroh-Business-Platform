/**
 * @file ILogger.ts
 * @description General Logging interface for tracing, warnings, and error recordings.
 * @responsibility Port defining common diagnostic message recording.
 */

export interface ILogger {
  info(message: string, context?: unknown): void;
  warn(message: string, context?: unknown): void;
  error(message: string, context?: unknown): void;
  debug?(message: string, context?: unknown): void;
}
