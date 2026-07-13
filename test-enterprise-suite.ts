import { Request, Response, NextFunction } from 'express';
import { 
  requestIdMiddleware, 
  structuredLoggingMiddleware, 
  authenticateMiddleware, 
  requireRole, 
  requirePermission, 
  createRateLimiter, 
  globalErrorHandler,
  EnterpriseRequest
} from './src/middleware/enterpriseMiddleware';
import { EnterpriseValidator, SchemaValidationError } from './src/utils/validator';

interface MockResponsePayload {
  code?: string;
  requestId?: string;
  message?: string;
}

interface MockResponse extends Response {
  jsonPayload: MockResponsePayload;
}

async function runEnterpriseTests() {
  console.log('====================================================================');
  console.log('🕋 UMAROH TRAVEL ERP - ENTERPRISE SECURITY & INFRASTRUCTURE TEST SUITE 🕋');
  console.log('====================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Helper Mock Express request/response builder
  function createMockContext(customReq: Partial<Request> = {}) {
    const req = {
      headers: {},
      ip: '192.168.1.100',
      method: 'POST',
      originalUrl: '/api/v1/auth/test-endpoint',
      socket: {},
      body: {},
      ...customReq
    } as unknown as Request;

    const resHeaders = new Map<string, string>();
    let statusCode = 200;
    let jsonPayload: MockResponsePayload = {};

    const res = {
      setHeader(name: string, value: string) {
        resHeaders.set(name.toLowerCase(), value);
        return res;
      },
      getHeader(name: string) {
        return resHeaders.get(name.toLowerCase());
      },
      status(code: number) {
        statusCode = code;
        return res;
      },
      json(data: unknown) {
        jsonPayload = data as MockResponsePayload;
        return res;
      },
      sendStatus(code: number) {
        statusCode = code;
        return res;
      },
      on(event: string, callback: () => void) {
        // immediate mock finish
        if (event === 'finish') {
          setTimeout(callback, 5);
        }
        return res;
      },
      get statusCode() {
        return statusCode;
      },
      get jsonPayload() {
        return jsonPayload;
      }
    } as unknown as Response;

    const next = (() => {}) as NextFunction;

    return { req, res: res as MockResponse, next };
  }

  try {
    // -----------------------------------------------------------------
    // TEST 1: Request & Correlation ID Generation
    // -----------------------------------------------------------------
    console.log('\n[TEST 1] Verifying Request Trace & Correlation ID Injection...');
    const t1 = createMockContext();
    requestIdMiddleware(t1.req, t1.res, t1.next);
    
    const entReq = t1.req as EnterpriseRequest;
    assert(!!entReq.id, 'Request ID was generated');
    assert(!!entReq.correlationId, 'Correlation ID was generated');
    assert(!!entReq.traceId, 'Trace ID was generated');
    assert(t1.res.getHeader('x-request-id') === entReq.id, 'x-request-id header matched');
    assert(t1.res.getHeader('x-correlation-id') === entReq.correlationId, 'x-correlation-id header matched');

    // -----------------------------------------------------------------
    // TEST 2: Structured Logging Middleware Uptime & Output Validation
    // -----------------------------------------------------------------
    console.log('\n[TEST 2] Verifying Structured Logging Metadata Injection...');
    const t2 = createMockContext();
    requestIdMiddleware(t2.req, t2.res, t2.next);
    structuredLoggingMiddleware(t2.req, t2.res, t2.next);
    const entReq2 = t2.req as EnterpriseRequest;
    assert(!!entReq2.startTime, 'Request start timestamp was initialized');

    // -----------------------------------------------------------------
    // TEST 3: Input Schema Validation (EnterpriseValidator)
    // -----------------------------------------------------------------
    console.log('\n[TEST 3] Verifying Input Validation Schema Criteria...');
    
    // Test Case A: Valid schema inputs
    try {
      EnterpriseValidator.validate({
        email: 'ahmad@umaroh.com',
        uid: 'user_firebase_uid_123',
        amount: 25000000,
        currency: 'IDR',
        role: 'mitra',
        status: 'aktif'
      }, {
        email: 'email',
        uid: 'uid',
        amount: 'amount',
        currency: 'currency',
        role: 'role',
        status: 'status'
      });
      assert(true, 'Valid enterprise payload parsed without throwing SchemaValidationError');
    } catch {
      assert(false, 'Valid enterprise payload incorrectly threw validation errors');
    }

    // Test Case B: Schema violation (Invalid Email, negative amount, unknown role)
    try {
      EnterpriseValidator.validate({
        email: 'invalid-email-format',
        uid: 'shrt', // too short
        amount: -500, // negative amount not allowed
        currency: 'EUR', // disallowed currency
        role: 'hacker', // invalid role
        status: ''
      }, {
        email: 'email',
        uid: 'uid',
        amount: 'amount',
        currency: 'currency',
        role: 'role',
        status: 'status'
      });
      assert(false, 'Validation failed to catch severe schema violations');
    } catch (err) {
      if (err instanceof SchemaValidationError) {
        assert(err.code === 'INVALID_INPUT_SCHEMA', 'Correctly caught schema violation with error code "INVALID_INPUT_SCHEMA"');
        assert(err.errors.length === 6, `Identified all 6 validation schema breaches (Detected: ${err.errors.length})`);
      } else {
        assert(false, 'Validation threw an unknown non-schema error instance');
      }
    }

    // -----------------------------------------------------------------
    // TEST 4: Authentication Guard & Fallback Token Verification
    // -----------------------------------------------------------------
    console.log('\n[TEST 4] Verifying Authentication Guard & Token Checks...');
    
    // Test Case A: Empty Authorization Header Reject
    const t4A = createMockContext();
    requestIdMiddleware(t4A.req, t4A.res, t4A.next);
    await authenticateMiddleware(t4A.req, t4A.res, t4A.next);
    assert(t4A.res.statusCode === 401, 'Request without Bearer Token rejected with 401 Unauthorized');
    assert(t4A.res.jsonPayload.code === 'UNAUTHORIZED', 'Response contains correct security code: UNAUTHORIZED');

    // Test Case B: Verify developer/mock enterprise token signature
    const t4B = createMockContext({
      headers: { authorization: 'Bearer mock-token-admin-super' }
    });
    requestIdMiddleware(t4B.req, t4B.res, t4B.next);
    await authenticateMiddleware(t4B.req, t4B.res, t4B.next);
    const entReq4B = t4B.req as EnterpriseRequest;
    assert(entReq4B.user?.email === 'admin@umaroh-mock.com', 'Mock token correctly authenticated user email');
    assert(entReq4B.user?.role === 'admin', 'Mock token mapped role to: admin');
    assert(entReq4B.user?.subRole === 'super', 'Mock token parsed subRole: super');

    // -----------------------------------------------------------------
    // TEST 5: Authorization Role Restriction
    // -----------------------------------------------------------------
    console.log('\n[TEST 5] Verifying Role-Based Access Control (RBAC)...');
    
    const adminRequiredGuard = requireRole(['admin', 'owner']);
    
    // Test Case A: User with Role: Mitra accessing Admin route -> Reject
    const t5A = createMockContext();
    requestIdMiddleware(t5A.req, t5A.res, t5A.next);
    (t5A.req as unknown as { user: Record<string, unknown> }).user = { uid: 'u1', email: 'm@mitra.com', role: 'mitra' };
    adminRequiredGuard(t5A.req, t5A.res, t5A.next);
    assert(t5A.res.statusCode === 403, 'User with role "mitra" rejected with 403 Forbidden on Admin route');
    assert(t5A.res.jsonPayload.code === 'ROLE_FORBIDDEN', 'Response matches security code: ROLE_FORBIDDEN');

    // Test Case B: User with Role: Owner accessing Admin route -> Pass
    let passedNext = false;
    const mockNext = () => { passedNext = true; };
    const t5B = createMockContext();
    requestIdMiddleware(t5B.req, t5B.res, t5B.next);
    (t5B.req as unknown as { user: Record<string, unknown> }).user = { uid: 'u2', email: 'o@owner.com', role: 'owner' };
    adminRequiredGuard(t5B.req, t5B.res, mockNext);
    assert(passedNext, 'User with role "owner" passed admin-restricted route successfully');

    // -----------------------------------------------------------------
    // TEST 6: Permission Matrix Checks
    // -----------------------------------------------------------------
    console.log('\n[TEST 6] Verifying Permission Matrix Access Restrictions...');
    
    const financePermissionGuard = requirePermission('finance:write');

    // Test Case A: Role Finance has permission "finance:write" -> Pass
    let financePassed = false;
    const t6A = createMockContext();
    (t6A.req as unknown as { user: Record<string, unknown> }).user = { uid: 'f1', email: 'f@finance.com', role: 'finance' };
    financePermissionGuard(t6A.req, t6A.res, () => { financePassed = true; });
    assert(financePassed, 'Role finance successfully verified permission "finance:write"');

    // Test Case B: Role Vendor lacks permission "finance:write" -> Reject
    const t6B = createMockContext();
    requestIdMiddleware(t6B.req, t6B.res, t6B.next);
    (t6B.req as unknown as { user: Record<string, unknown> }).user = { uid: 'v1', email: 'v@vendor.com', role: 'vendor' };
    financePermissionGuard(t6B.req, t6B.res, t6B.next);
    assert(t6B.res.statusCode === 403, 'Role vendor rejected with 403 Forbidden for "finance:write"');
    assert(t6B.res.jsonPayload.code === 'PERMISSION_DENIED', 'Response matches security code: PERMISSION_DENIED');

    // -----------------------------------------------------------------
    // TEST 7: Sliding Window Rate Limiter
    // -----------------------------------------------------------------
    console.log('\n[TEST 7] Verifying In-Memory Sliding Window Rate Limiter...');
    
    const testLimiter = createRateLimiter({
      windowMs: 500, // short half second window
      max: 2,
      message: 'Rate limit hit',
      code: 'LIMIT_HIT'
    });

    const t7A = createMockContext();
    requestIdMiddleware(t7A.req, t7A.res, t7A.next);
    
    // First request -> pass
    let req1Passed = false;
    testLimiter(t7A.req, t7A.res, () => { req1Passed = true; });
    
    // Second request -> pass
    let req2Passed = false;
    testLimiter(t7A.req, t7A.res, () => { req2Passed = true; });

    // Third request -> block
    testLimiter(t7A.req, t7A.res, t7A.next);

    assert(req1Passed && req2Passed, 'Allowed first two requests within sliding window');
    assert(t7A.res.statusCode === 429, 'Blocked third request with 429 Too Many Requests');
    assert(t7A.res.jsonPayload.code === 'LIMIT_HIT', 'Response matches rate limit code: LIMIT_HIT');

    // -----------------------------------------------------------------
    // TEST 8: Global Error Handler Standarization
    // -----------------------------------------------------------------
    console.log('\n[TEST 8] Verifying Global Error Mapping & Trace formatting...');
    
    const t8 = createMockContext();
    requestIdMiddleware(t8.req, t8.res, t8.next);
    const testError = new Error('database permission-denied occurred');
    globalErrorHandler(testError, t8.req, t8.res, t8.next);

    assert(t8.res.statusCode === 403, 'Correctly mapped database error string to 403 Forbidden status code');
    assert(t8.res.jsonPayload.code === 'DATABASE_PERMISSION_DENIED', 'Returned error code DATABASE_PERMISSION_DENIED');
    assert(!!t8.res.jsonPayload.requestId, 'Returned valid requestId tracing reference');

  } catch (error) {
    console.error('Critical test runtime crash:', error);
    failed++;
  }

  console.log('\n====================================================================');
  console.log('🏁 ENTERPRISE TEST SUITE EXECUTION SUMMARY 🏁');
  console.log(`  🎉 Passed Tests: ${passed}`);
  console.log(`  🚨 Failed Tests: ${failed}`);
  console.log('====================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runEnterpriseTests();
