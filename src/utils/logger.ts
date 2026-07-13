import { Request } from 'express';

export type LogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'AUDIT';

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  correlationId: string;
  traceId: string;
  userId?: string;
  email?: string;
  ip: string;
  endpoint?: string;
  method?: string;
  durationMs?: number;
  message: string;
  details?: Record<string, unknown>;
}

export class EnterpriseLogger {
  private static formatLog(log: StructuredLog): string {
    // If we're in production, print strict JSON for Google Cloud Logging ingestion.
    // Otherwise, print nicely formatted, readable colorized lines.
    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(log);
    }

    const colorMap: Record<LogLevel, string> = {
      INFO: '\x1b[32m[INFO]\x1b[0m',       // Green
      WARNING: '\x1b[33m[WARN]\x1b[0m',   // Yellow
      ERROR: '\x1b[31m[ERROR]\x1b[0m',     // Red
      CRITICAL: '\x1b[41m\x1b[37m[CRIT]\x1b[0m', // Red BG White Text
      AUDIT: '\x1b[36m[AUDIT]\x1b[0m',     // Cyan
    };

    const levelStr = colorMap[log.level] || `[${log.level}]`;
    const userPart = log.email ? ` | ${log.email}` : '';
    const reqPart = log.requestId ? ` | req:${log.requestId.slice(0, 8)}` : '';
    const durationPart = log.durationMs !== undefined ? ` (${log.durationMs}ms)` : '';
    const detailsPart = log.details ? ` - ${JSON.stringify(log.details)}` : '';

    return `${log.timestamp} ${levelStr}${reqPart}${userPart} - ${log.message}${durationPart}${detailsPart}`;
  }

  public static log(
    level: LogLevel,
    message: string,
    context?: {
      req?: Request;
      userId?: string;
      email?: string;
      durationMs?: number;
      details?: Record<string, unknown>;
    }
  ) {
    const timestamp = new Date().toISOString();
    let requestId = 'system';
    let correlationId = 'system';
    let traceId = 'system';
    let ip = '127.0.0.1';
    let endpoint = undefined;
    let method = undefined;

    if (context?.req) {
      const req = context.req;
      requestId = (req.headers['x-request-id'] as string) || requestId;
      correlationId = (req.headers['x-correlation-id'] as string) || correlationId;
      traceId = (req.headers['x-trace-id'] as string) || traceId;
      ip = req.ip || (req.socket?.remoteAddress) || ip;
      endpoint = req.originalUrl;
      method = req.method;
    }

    const reqUser = context?.req ? (context.req as unknown as { user?: { uid: string; email: string } }).user : undefined;

    const structuredLog: StructuredLog = {
      timestamp,
      level,
      requestId,
      correlationId,
      traceId,
      userId: context?.userId || reqUser?.uid,
      email: context?.email || reqUser?.email,
      ip,
      endpoint,
      method,
      durationMs: context?.durationMs,
      message,
      details: context?.details,
    };

    const formattedLog = this.formatLog(structuredLog);
    if (level === 'ERROR' || level === 'CRITICAL') {
      console.error(formattedLog);
    } else if (level === 'WARNING') {
      console.warn(formattedLog);
    } else {
      console.log(formattedLog);
    }
  }

  public static info(message: string, context?: Parameters<typeof EnterpriseLogger.log>[2]) {
    this.log('INFO', message, context);
  }

  public static warn(message: string, context?: Parameters<typeof EnterpriseLogger.log>[2]) {
    this.log('WARNING', message, context);
  }

  public static error(message: string, context?: Parameters<typeof EnterpriseLogger.log>[2]) {
    this.log('ERROR', message, context);
  }

  public static critical(message: string, context?: Parameters<typeof EnterpriseLogger.log>[2]) {
    this.log('CRITICAL', message, context);
  }

  public static audit(message: string, context?: Parameters<typeof EnterpriseLogger.log>[2]) {
    this.log('AUDIT', message, context);
  }
}
