/**
 * @file ValidationMetrics.ts
 * @description Telemetry recorder for validation, policies, and risk controls.
 */

export interface IValidationMetric {
  name: string;
  count: number;
  lastRecordedAt: Date;
}

export class ValidationMetrics {
  private static instance: ValidationMetrics | null = null;
  
  private metrics: Map<string, IValidationMetric> = new Map();
  private durations: number[] = [];

  private constructor() {
    this.initializeMetric('validation.count');
    this.initializeMetric('validation.failure');
    this.initializeMetric('validation.success');
    this.initializeMetric('validation.duration');
    this.initializeMetric('policy.violation');
    this.initializeMetric('risk.detected');
  }

  public static getInstance(): ValidationMetrics {
    if (!ValidationMetrics.instance) {
      ValidationMetrics.instance = new ValidationMetrics();
    }
    return ValidationMetrics.instance;
  }

  private initializeMetric(name: string): void {
    this.metrics.set(name, {
      name,
      count: 0,
      lastRecordedAt: new Date()
    });
  }

  public increment(name: string, value: number = 1): void {
    let metric = this.metrics.get(name);
    if (!metric) {
      metric = { name, count: 0, lastRecordedAt: new Date() };
      this.metrics.set(name, metric);
    }
    metric.count += value;
    metric.lastRecordedAt = new Date();
    
    console.log(`[ValidationMetric] ${name} incremented by ${value}. Current total: ${metric.count}`);
  }

  public recordDuration(durationMs: number): void {
    this.durations.push(durationMs);
    if (this.durations.length > 100) {
      this.durations.shift();
    }
    console.log(`[ValidationMetric] validation.duration: ${durationMs}ms`);
  }

  public getMetric(name: string): IValidationMetric | null {
    return this.metrics.get(name) || null;
  }

  public getAverageDuration(): number {
    if (this.durations.length === 0) return 0;
    const sum = this.durations.reduce((acc, val) => acc + val, 0);
    return sum / this.durations.length;
  }

  public resetAll(): void {
    this.metrics.clear();
    this.durations = [];
    this.initializeMetric('validation.count');
    this.initializeMetric('validation.failure');
    this.initializeMetric('validation.success');
    this.initializeMetric('validation.duration');
    this.initializeMetric('policy.violation');
    this.initializeMetric('risk.detected');
  }
}
