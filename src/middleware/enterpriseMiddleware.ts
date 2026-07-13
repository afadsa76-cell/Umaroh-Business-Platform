import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '../services/backendIdentityService';
import { EnterpriseLogger } from '../utils/logger';
import { SchemaValidationError } from '../utils/validator';
import { MetricsCollector, IdempotencyManager, IdempotentResult } from '../utils/observability';
import { RuntimeEnvironment } from '../utils/runtimeEnv';
import { RouteClassifier, RouteClass } from '../utils/routeClassifier';

// Standard Extended Request interface
export interface EnterpriseRequest extends Request {
  id: string;
  correlationId: string;
  traceId: string;
  user?: {
    uid: string;
    email: string;
    role: string;
    subRole?: string | null;
    [key: string]: unknown;
  };
  startTime?: [number, number];
}

/**
 * ==========================================
 * 6. REQUEST ID & CORRELATION ID MIDDLEWARE
 * ==========================================
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const entReq = req as EnterpriseRequest;
  
  // Set IDs from incoming headers or generate standard UUIDs
  entReq.id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  entReq.correlationId = (req.headers['x-correlation-id'] as string) || entReq.id;
  entReq.traceId = (req.headers['x-trace-id'] as string) || crypto.randomUUID();

  // Set outgoing headers so client can track transaction trace
  res.setHeader('x-request-id', entReq.id);
  res.setHeader('x-correlation-id', entReq.correlationId);
  res.setHeader('x-trace-id', entReq.traceId);

  next();
}

/**
 * ==========================================
 * 7. STRUCTURED LOGGING MIDDLEWARE
 * ==========================================
 */
export function structuredLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const entReq = req as EnterpriseRequest;
  
  const url = req.originalUrl || req.url || '';
  const routeClass = RouteClassifier.classify(url);

  if (routeClass === RouteClass.DEVELOPMENT || routeClass === RouteClass.STATIC) {
    return next();
  }

  entReq.startTime = process.hrtime();

  EnterpriseLogger.info(`Incoming Request: ${req.method} ${req.originalUrl}`, { req: entReq });

  res.on('finish', () => {
    let durationMs = 0;
    if (entReq.startTime) {
      const diff = process.hrtime(entReq.startTime);
      durationMs = Math.round((diff[0] * 1e9 + diff[1]) / 1e6);
    }

    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARNING' : 'INFO';
    EnterpriseLogger.log(level, `Completed Request: ${req.method} ${req.originalUrl} -> ${res.statusCode}`, {
      req: entReq,
      durationMs,
      details: {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
      },
    });

    // Record Metrics
    MetricsCollector.getInstance().recordRequest(req.method, req.originalUrl, res.statusCode, durationMs);

    // Slow API Query Logger
    if (durationMs > 2000) {
      EnterpriseLogger.warn(`[SLOW API LOGGER] ${req.method} ${req.originalUrl} took ${durationMs}ms which is above the 2000ms SLA!`, {
        req: entReq,
        durationMs,
        details: {
          url: req.originalUrl,
          requestId: entReq.id
        }
      });
    }
  });

  next();
}

/**
 * ==========================================
 * 1. AUTHENTICATION MIDDLEWARE
 * ==========================================
 * Verifies Firebase ID Token and falls back to mock validation for local preview/development testing.
 */
export async function authenticateMiddleware(req: Request, res: Response, next: NextFunction) {
  const entReq = req as EnterpriseRequest;

  // Immediately bypass auth for non-protected API requests (static, health, development)
  const url = req.originalUrl || req.url || '';
  const routeClass = RouteClassifier.classify(url);
  if (routeClass === RouteClass.STATIC || routeClass === RouteClass.DEVELOPMENT || routeClass === RouteClass.HEALTH_METRICS) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    EnterpriseLogger.warn('Unauthorized request: No authorization bearer token provided', { req: entReq });
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Akses ditolak. Token otorisasi tidak ditemukan.',
      requestId: entReq.id,
      timestamp: new Date().toISOString()
    });
  }

  const token = authHeader.split('Bearer ')[1];

  // Robust Developer/Mock token support for sandboxed preview environment testing
  if (token.startsWith('mock-token-')) {
    const parts = token.split('-');
    const role = parts[2] || 'jamaah';
    const subRole = parts[3] || null;
    entReq.user = {
      uid: `mock_uid_${role}`,
      email: `${role}@umaroh-mock.com`,
      role: role.toLowerCase(),
      subRole: subRole ? subRole.toLowerCase() : null
    };
    EnterpriseLogger.info(`Mock Authorized User: ${entReq.user.email} as ${role}`, { req: entReq });
    return next();
  }

  try {
    const app = getAdminApp();
    const auth = getAuth(app);

    // Verify Firebase ID Token, enforcing checks for revoked or expired tokens
    const decodedToken = await auth.verifyIdToken(token, true);

    // Fetch user record to check if disabled (Verify Disabled User)
    const userRecord = await auth.getUser(decodedToken.uid);
    if (userRecord.disabled) {
      EnterpriseLogger.warn(`Access Denied: User account is disabled. UID: ${decodedToken.uid}`, { req: entReq });
      return res.status(403).json({
        success: false,
        code: 'USER_DISABLED',
        message: 'Akun Anda telah dinonaktifkan oleh administrator.',
        requestId: entReq.id,
        timestamp: new Date().toISOString()
      });
    }

    entReq.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      role: (decodedToken.role as string) || 'jamaah',
      subRole: (decodedToken.subRole as string) || null,
    };

    next();
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    EnterpriseLogger.error(`Token authentication failed: ${err.message || String(error)}`, { req: entReq });
    
    let code = 'INVALID_TOKEN';
    let message = 'Token otorisasi tidak valid atau telah kedaluwarsa.';

    if (err.code === 'auth/id-token-revoked') {
      code = 'TOKEN_REVOKED';
      message = 'Sesi Anda telah dicabut. Silakan login kembali.';
    } else if (err.code === 'auth/argument-error') {
      code = 'MALFORMED_TOKEN';
      message = 'Format token otorisasi tidak valid.';
    }

    res.status(401).json({
      success: false,
      code,
      message,
      requestId: entReq.id,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * ==========================================
 * 2. AUTHORIZATION MIDDLEWARE (ROLE BUILDER)
 * ==========================================
 */
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const entReq = req as EnterpriseRequest;
    
    if (!entReq.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Akses ditolak. Token otorisasi wajib disertakan.',
        requestId: entReq.id,
        timestamp: new Date().toISOString()
      });
    }

    const userRole = entReq.user.role.toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    // Owner always has absolute super privileges over all administrative operations
    if (userRole === 'owner') {
      return next();
    }

    if (!normalizedAllowed.includes(userRole)) {
      EnterpriseLogger.warn(`Forbidden role access: User ${entReq.user.email} (Role: ${userRole}) tried to access route requiring: [${allowedRoles.join(', ')}]`, { req: entReq });
      return res.status(403).json({
        success: false,
        code: 'ROLE_FORBIDDEN',
        message: `Akses ditolak. Role Anda (${userRole}) tidak memiliki izin untuk fitur ini.`,
        requestId: entReq.id,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

// Helper authorization shortcuts
export const requireOwner = () => requireRole(['owner']);
export const requireAdmin = () => requireRole(['owner', 'admin']);
export const requireFinance = () => requireRole(['owner', 'finance']);
export const requireOperasional = () => requireRole(['owner', 'operasional']);
export const requireVendor = () => requireRole(['owner', 'vendor']);
export const requireMitra = () => requireRole(['owner', 'mitra']);
export const requireJamaah = () => requireRole(['owner', 'jamaah']);
export const requireMarketing = () => requireRole(['owner', 'marketing']);
export const requireMutawif = () => requireRole(['owner', 'mutawif']);


/**
 * ==========================================
 * 3. PERMISSION MATRIX MIDDLEWARE
 * ==========================================
 */
export type PermissionType = 
  | 'booking:create' | 'booking:read' | 'booking:update' | 'booking:delete' | 'booking:approve'
  | 'finance:read' | 'finance:write'
  | 'wallet:read' | 'wallet:withdraw' | 'wallet:credit'
  | 'vendor:read' | 'vendor:write'
  | 'hotel:read' | 'hotel:write'
  | 'visa:read' | 'visa:write'
  | 'ticket:read' | 'ticket:write'
  | 'notification:read' | 'notification:write'
  | 'audit:read'
  | 'reports:read';

const ROLE_PERMISSIONS: Record<string, PermissionType[]> = {
  owner: [
    'booking:create', 'booking:read', 'booking:update', 'booking:delete', 'booking:approve',
    'finance:read', 'finance:write',
    'wallet:read', 'wallet:withdraw', 'wallet:credit',
    'vendor:read', 'vendor:write',
    'hotel:read', 'hotel:write',
    'visa:read', 'visa:write',
    'ticket:read', 'ticket:write',
    'notification:read', 'notification:write',
    'audit:read',
    'reports:read'
  ],
  admin: [
    'booking:create', 'booking:read', 'booking:update', 'booking:approve',
    'finance:read',
    'wallet:read', 'wallet:credit',
    'vendor:read', 'vendor:write',
    'hotel:read', 'hotel:write',
    'visa:read', 'visa:write',
    'ticket:read', 'ticket:write',
    'notification:read', 'notification:write',
    'reports:read'
  ],
  finance: [
    'finance:read', 'finance:write',
    'wallet:read', 'wallet:withdraw', 'wallet:credit',
    'reports:read'
  ],
  operasional: [
    'booking:read', 'booking:update',
    'vendor:read',
    'hotel:read', 'hotel:write',
    'visa:read', 'visa:write',
    'ticket:read', 'ticket:write',
    'notification:read'
  ],
  vendor: [
    'vendor:read',
    'hotel:read',
    'ticket:read'
  ],
  mitra: [
    'booking:create', 'booking:read',
    'wallet:read',
    'reports:read'
  ],
  jamaah: [
    'booking:read',
    'wallet:read'
  ],
  marketing: [
    'notification:write',
    'reports:read'
  ],
  mutawif: [
    'booking:read',
    'notification:read'
  ]
};

export function requirePermission(permission: PermissionType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const entReq = req as EnterpriseRequest;

    if (!entReq.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Akses ditolak. Token otorisasi wajib disertakan.',
        requestId: entReq.id,
        timestamp: new Date().toISOString()
      });
    }

    const userRole = entReq.user.role.toLowerCase();
    const permissions = ROLE_PERMISSIONS[userRole] || [];

    if (!permissions.includes(permission)) {
      EnterpriseLogger.warn(`Forbidden permission access: User ${entReq.user.email} (Role: ${userRole}) tried to access resource requiring permission [${permission}]`, { req: entReq });
      return res.status(403).json({
        success: false,
        code: 'PERMISSION_DENIED',
        message: `Akses ditolak. Izin [${permission}] diperlukan untuk mengakses fitur ini.`,
        requestId: entReq.id,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}


/**
 * ==========================================
 * 5. SLIDING WINDOW RATE LIMITER MIDDLEWARE (HARDENED & ADAPTIVE)
 * ==========================================
 */
export const STATIC_PATHS = [
  '/favicon.ico',
  '/assets',
  '/src',
  '/icons',
  '/fonts',
  '/images',
  '/public',
  '/manifest',
  '/client',
  '/service-worker.js',
  '/umaroh_logo.mp4'
];

export const DEV_PATHS = [
  '/@',
  '/node_modules',
  '/vite',
  '/__vite_ping',
  '/@react-refresh'
];

export const SYSTEM_PATHS = [
  '/health',
  '/status',
  '/readiness',
  '/liveness',
  '/metrics',
  '/api/v1/metrics',
  '/api/v1/disaster-recovery/status',
  '/api/v1/security/exposure-audit',
  '/api/v1/security/circuit-breakers',
  '/api/v1/enterprise-dashboard'
];

export const API_PATHS = [
  '/api'
];

function shouldBypassRateLimit(req: Request, options?: RateLimitOptions): boolean {
  if (options?.bypassCallback && options.bypassCallback(req)) {
    return true;
  }

  if (RuntimeEnvironment.isDevelopment()) {
    return true;
  }

  const cleanUrl = req.originalUrl.split('?')[0];

  if (DEV_PATHS.some(p => cleanUrl.startsWith(p))) {
    return true;
  }
  if (STATIC_PATHS.some(p => cleanUrl.startsWith(p))) {
    return true;
  }
  if (SYSTEM_PATHS.some(p => cleanUrl.startsWith(p))) {
    return true;
  }

  const routeClass = RouteClassifier.classify(req.originalUrl);
  if (
    routeClass === RouteClass.DEVELOPMENT ||
    routeClass === RouteClass.STATIC ||
    routeClass === RouteClass.HEALTH_METRICS
  ) {
    return true;
  }

  const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const isSensitiveGet = req.method === 'GET' && (
    cleanUrl.includes('/api/auth/list-users') ||
    cleanUrl.includes('/api/v1/auth/list-users')
  );

  if (!isWriteMethod && !isSensitiveGet) {
    return true;
  }

  return false;
}

function getAdaptiveLimit(req: Request, options?: RateLimitOptions): { limit: number; matchedRule: string } {
  const cleanUrl = req.originalUrl.split('?')[0];
  const entReq = req as EnterpriseRequest;
  const userRole = entReq.user?.role?.toLowerCase() || '';

  if (RuntimeEnvironment.isDevelopment()) {
    return { limit: 999999, matchedRule: 'Development - Unlimited' };
  }

  const routeClass = RouteClassifier.classify(req.originalUrl);
  if (routeClass === RouteClass.HEALTH_METRICS) {
    return { limit: 999999, matchedRule: 'Metrics/Health - Unlimited' };
  }

  if (userRole === 'admin' || userRole === 'owner') {
    return { limit: 300, matchedRule: 'Admin/Owner Priority' };
  }

  if (
    cleanUrl.includes('/auth/') ||
    cleanUrl.includes('/login') ||
    cleanUrl.includes('/register') ||
    options?.code?.includes('LOGIN') ||
    options?.code?.includes('REGISTER')
  ) {
    return { limit: 20, matchedRule: 'Authentication Protection' };
  }

  if (options && typeof options.max === 'number') {
    return { limit: options.max, matchedRule: options.code || 'Custom Options Max' };
  }

  return { limit: 100, matchedRule: 'Production Default' };
}

function log429Violation(details: {
  reason: string;
  limiter: string;
  matchedRule: string;
  client: string;
  user: string;
  ip: string;
  path: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  remainingTokens: number;
  retryAfterSeconds: number;
  correlationId: string;
}) {
  const isProd = RuntimeEnvironment.isProduction();
  const isDebug = process.env.DEBUG === 'true';

  if (!isProd || isDebug) {
    console.error(`[HTTP 429 RATE LIMIT EXCEEDED]`, JSON.stringify(details, null, 2));
  }
}

interface RateLimiterRecord {
  timestamps: number[];
}

const rateLimitRegistry = new Map<string, RateLimiterRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitRegistry.entries()) {
    record.timestamps = record.timestamps.filter(t => now - t < 3600000);
    if (record.timestamps.length === 0) {
      rateLimitRegistry.delete(key);
    }
  }
}, 300000).unref();

export interface RateLimitOptions {
  windowMs: number;
  max?: number;
  message?: string;
  code?: string;
  bypassCallback?: (req: Request) => boolean;
}

export function createRateLimiter(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const entReq = req as EnterpriseRequest;
    
    if (shouldBypassRateLimit(req, options)) {
      return next();
    }

    const { limit, matchedRule } = getAdaptiveLimit(req, options);
    const windowMs = options.windowMs || 60000;

    const userId = entReq.user?.uid || '';
    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const identifier = userId ? `user:${userId}` : `ip:${ip}`;
    const registryKey = `${identifier}:${req.originalUrl}`;
    const now = Date.now();

    if (!rateLimitRegistry.has(registryKey)) {
      rateLimitRegistry.set(registryKey, { timestamps: [] });
    }

    const record = rateLimitRegistry.get(registryKey)!;
    
    record.timestamps = record.timestamps.filter(t => now - t < windowMs);

    if (record.timestamps.length >= limit) {
      const oldestTimestamp = record.timestamps[0];
      const resetTime = oldestTimestamp + windowMs;
      const retryAfterSeconds = Math.max(1, Math.round((resetTime - now) / 1000));
      
      const reason = `Request count ${record.timestamps.length + 1} exceeds limit of ${limit} in matched window`;
      const correlationId = entReq.correlationId || 'none';

      log429Violation({
        reason,
        limiter: options.code || 'DefaultLimiter',
        matchedRule,
        client: req.headers['user-agent'] || 'unknown',
        user: userId || 'anonymous',
        ip,
        path: req.originalUrl,
        method: req.method,
        headers: req.headers,
        remainingTokens: 0,
        retryAfterSeconds,
        correlationId
      });

      res.setHeader('Retry-After', String(retryAfterSeconds));

      return res.status(429).json({
        success: false,
        code: options.code || 'RATE_LIMIT_EXCEEDED',
        message: options.message || 'Terlalu banyak permintaan. Silakan tunggu beberapa saat lagi.',
        requestId: entReq.id,
        timestamp: new Date().toISOString()
      });
    }

    record.timestamps.push(now);
    next();
  };
}

/**
 * ==========================================
 * 5.5 IDEMPOTENCY KEY MIDDLEWARE
 * ==========================================
 */
export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const entReq = req as EnterpriseRequest;

  const url = req.originalUrl || req.url || '';
  const routeClass = RouteClassifier.classify(url);
  
  // Idempotency applies strictly to protected API routes
  if (routeClass !== RouteClass.API_PROTECTED) {
    return next();
  }

  // Idempotency applies to non-GET requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const key = req.headers['idempotency-key'] as string;
    if (key) {
      const cached = IdempotencyManager.get(key);
      if (cached) {
        if (cached instanceof Promise) {
          return res.status(409).json({
            success: false,
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'Permintaan serupa sedang diproses oleh server. Silakan coba sesaat lagi.',
            requestId: entReq.id,
            timestamp: new Date().toISOString()
          });
        }
        res.status(cached.status);
        Object.entries(cached.headers).forEach(([k, v]) => {
          res.setHeader(k, v);
        });
        return res.send(cached.body);
      }

      let resolvePromise: (value: IdempotentResult) => void = () => {};
      const inProgressPromise = new Promise<IdempotentResult>((resolve) => {
        resolvePromise = resolve;
      });
      IdempotencyManager.set(key, inProgressPromise);

      const originalSend = res.send;
      res.send = function (body: unknown): Response {
        const result: IdempotentResult = {
          status: res.statusCode,
          headers: {
            'content-type': res.get('content-type') || 'application/json'
          },
          body: typeof body === 'string' ? body : JSON.stringify(body)
        };
        IdempotencyManager.set(key, result);
        resolvePromise(result);
        return originalSend.call(this, body);
      };
    }
  }
  next();
}

// Configurable endpoint-specific rate limiters
export const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Batas pendaftaran akun terlampaui. Silakan tunggu 1 menit.',
  code: 'REGISTER_RATE_LIMIT_EXCEEDED'
});

export const loginRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: 'Batas percobaan login terlampaui. Silakan tunggu 1 menit.',
  code: 'LOGIN_RATE_LIMIT_EXCEEDED'
});

export const paymentRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Terlalu banyak transaksi pembayaran diproses. Silakan tunggu.',
  code: 'PAYMENT_RATE_LIMIT_EXCEEDED'
});


/**
 * ==========================================
 * 8. GLOBAL ERROR HANDLER
 * ==========================================
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function globalErrorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const entReq = req as EnterpriseRequest;
  const requestId = entReq.id || 'system';

  // Record Error Metric
  MetricsCollector.getInstance().recordError(err, requestId);

  EnterpriseLogger.error(`Global Error Caught: ${err.message}`, {
    req: entReq,
    details: {
      stack: err.stack,
      name: err.name
    }
  });

  // Handle Schema Validations
  if (err instanceof SchemaValidationError) {
    return res.status(400).json({
      success: false,
      code: err.code,
      message: err.message,
      errors: err.errors,
      requestId,
      timestamp: new Date().toISOString()
    });
  }

  // Handle Default Node/Firebase Database Permission Denied
  if (err.message?.includes('permission-denied') || err.message?.includes('Permission denied')) {
    return res.status(403).json({
      success: false,
      code: 'DATABASE_PERMISSION_DENIED',
      message: 'Akses ditolak. Anda tidak memiliki hak akses data yang sah.',
      requestId,
      timestamp: new Date().toISOString()
    });
  }

  // Fallback to 500 Enterprise response
  res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Terjadi kesalahan sistem internal pada layanan Umaroh ERP. Tim engineering kami telah menerima log kejadian ini.',
    requestId,
    timestamp: new Date().toISOString()
  });
}
