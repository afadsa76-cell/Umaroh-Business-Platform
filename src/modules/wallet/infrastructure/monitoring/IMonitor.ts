/**
 * @file IMonitor.ts
 * @description General operational metrics monitoring port.
 * @responsibility Port defining common performance tracking and alerts telemetry.
 */

export interface IMonitor {
  recordMetric(name: string, value: number, tags?: Record<string, string>): void;
  startTimer(name: string): () => void;
  recordEvent(name: string, description: string): void;
}
