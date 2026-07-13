/**
 * @file TransactionMetrics.ts
 * @description Standard transactional metrics recording and diagnostics.
 */

export interface ITransactionMetric {
  name: string;
  count: number;
  lastRecordedAt: Date;
}

export class TransactionMetrics {
  private static instance: TransactionMetrics | null = null;
  
  private metrics: Map<string, ITransactionMetric> = new Map();
  private durations: number[] = [];

  private constructor() {
    this.initializeMetric('transaction.count');
    this.initializeMetric('transaction.retry');
    this.initializeMetric('transaction.rollback');
    this.initializeMetric('transaction.timeout');
    this.initializeMetric('transaction.failure');
  }

  public static getInstance(): TransactionMetrics {
    if (!TransactionMetrics.instance) {
      TransactionMetrics.instance = new TransactionMetrics();
    }
    return TransactionMetrics.instance;
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
    
    // Standard console output for infrastructure monitoring
    console.log(`[Metric] ${name} incremented by ${value}. Current total: ${metric.count}`);
  }

  public recordDuration(durationMs: number): void {
    this.durations.push(durationMs);
    // Keep a sliding window of the last 100 durations
    if (this.durations.length > 100) {
      this.durations.shift();
    }
    console.log(`[Metric] transaction.duration: ${durationMs}ms`);
  }

  public getMetric(name: string): ITransactionMetric | null {
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
    this.initializeMetric('transaction.count');
    this.initializeMetric('transaction.retry');
    this.initializeMetric('transaction.rollback');
    this.initializeMetric('transaction.timeout');
    this.initializeMetric('transaction.failure');
  }
}
