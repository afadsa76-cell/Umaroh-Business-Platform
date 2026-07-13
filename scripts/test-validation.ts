/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file test-validation.ts
 * @description Integration and unit tests for Sprint 2B.4 Validation & Policy Engine.
 */

import { WalletValidator } from '../src/modules/wallet/domain/validators/WalletValidator.js';
import { ValidationContext, IWalletTransactionRequest } from '../src/modules/wallet/application/validation/ValidationContext.js';
import { IWalletData, WalletStatus } from '../src/modules/wallet/shared/types/WalletTypes.js';
import { IIdempotencyRecord } from '../src/modules/wallet/domain/repositories/IIdempotencyRepository.js';

// Mock Repositories
class MockWalletRepository {
  private wallets: Map<string, IWalletData> = new Map();

  constructor() {
    // Register active wallet
    this.wallets.set('wallet_active_1', {
      uid: 'wallet_active_1',
      tenantId: 'tenant_1',
      organizationId: 'org_1',
      currency: 'USD',
      status: WalletStatus.ACTIVE,
      balances: {
        availableBalance: 100000,
        pendingBalance: 0,
        frozenBalance: 0,
        escrowBalance: 0,
        commissionBalance: 0,
        rewardBalance: 5000, // $50 reward limit
        adjustmentBalance: 0,
        totalBalance: 100000
      },
      checksum: 'chk_123',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Register active wallet 2
    this.wallets.set('wallet_active_2', {
      uid: 'wallet_active_2',
      tenantId: 'tenant_1',
      organizationId: 'org_1',
      currency: 'USD',
      status: WalletStatus.ACTIVE,
      balances: {
        availableBalance: 50000,
        pendingBalance: 0,
        frozenBalance: 0,
        escrowBalance: 0,
        commissionBalance: 0,
        rewardBalance: 0,
        adjustmentBalance: 0,
        totalBalance: 50000
      },
      checksum: 'chk_456',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Register frozen wallet
    this.wallets.set('wallet_frozen', {
      uid: 'wallet_frozen',
      tenantId: 'tenant_1',
      organizationId: 'org_1',
      currency: 'USD',
      status: WalletStatus.FROZEN,
      balances: {
        availableBalance: 10000,
        pendingBalance: 0,
        frozenBalance: 10000,
        escrowBalance: 0,
        commissionBalance: 0,
        rewardBalance: 0,
        adjustmentBalance: 0,
        totalBalance: 10000
      },
      checksum: 'chk_frozen',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Register escrow wallet
    this.wallets.set('wallet_escrow', {
      uid: 'wallet_escrow',
      tenantId: 'tenant_1',
      organizationId: 'org_1',
      currency: 'USD',
      status: WalletStatus.ESCROW,
      balances: {
        availableBalance: 5000,
        pendingBalance: 0,
        frozenBalance: 0,
        escrowBalance: 5000,
        commissionBalance: 0,
        rewardBalance: 0,
        adjustmentBalance: 0,
        totalBalance: 5000
      },
      checksum: 'chk_escrow',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Register closed wallet
    this.wallets.set('wallet_closed', {
      uid: 'wallet_closed',
      tenantId: 'tenant_1',
      organizationId: 'org_1',
      currency: 'USD',
      status: WalletStatus.CLOSED,
      balances: {
        availableBalance: 0,
        pendingBalance: 0,
        frozenBalance: 0,
        escrowBalance: 0,
        commissionBalance: 0,
        rewardBalance: 0,
        adjustmentBalance: 0,
        totalBalance: 0
      },
      checksum: 'chk_closed',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  public async getById(uid: string): Promise<IWalletData | null> {
    return this.wallets.get(uid) || null;
  }
  public async exists(uid: string): Promise<boolean> {
    return this.wallets.has(uid);
  }
  public async save(): Promise<void> {}
  public async updateBalances(): Promise<void> {}
  public async create(): Promise<void> {}
  public async findById(id: string): Promise<IWalletData | null> {
    return this.getById(id);
  }
  public async findByReference(): Promise<IWalletData[]> { return []; }
  public async findAll(): Promise<IWalletData[]> { return Array.from(this.wallets.values()); }
  public async update(): Promise<void> {}
  public async softDelete(): Promise<void> {}
  public async lock(): Promise<void> {}
  public async unlock(): Promise<void> {}
  public async count(): Promise<number> { return this.wallets.size; }
}

class MockIdempotencyRepository {
  private keys: Map<string, IIdempotencyRecord> = new Map();

  constructor() {
    this.keys.set('used_idempotency_key_999', {
      key: 'used_idempotency_key_999',
      status: 'COMPLETED',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000)
    });
  }

  public async getKey(key: string): Promise<IIdempotencyRecord | null> {
    return this.keys.get(key) || null;
  }
  public async acquireKey(key: string): Promise<boolean> {
    return !this.keys.has(key);
  }
  public async resolveKey(): Promise<void> {}
  public async failKey(): Promise<void> {}
  public async create(): Promise<void> {}
  public async findById(id: string): Promise<IIdempotencyRecord | null> {
    return this.getKey(id);
  }
  public async findByReference(): Promise<IIdempotencyRecord[]> { return []; }
  public async findAll(): Promise<IIdempotencyRecord[]> { return []; }
  public async update(): Promise<void> {}
  public async softDelete(): Promise<void> {}
  public async exists(id: string): Promise<boolean> { return this.keys.has(id); }
  public async lock(): Promise<void> {}
  public async unlock(): Promise<void> {}
  public async count(): Promise<number> { return this.keys.size; }
}

async function runTests() {
  console.log('======================================================================');
  console.log('         RUNNING SPRINT 2B.4 VALIDATION & POLICY ENGINE TESTS         ');
  console.log('======================================================================');

  const mockWalletRepo = new MockWalletRepository();
  const mockIdempotencyRepo = new MockIdempotencyRepository();
  const validator = new WalletValidator(mockWalletRepo as any, mockIdempotencyRepo as any);

  let passed = 0;
  let failed = 0;

  async function assertThrows(
    name: string,
    req: IWalletTransactionRequest,
    expectedErrorName: string,
    metadataOverrides?: Record<string, unknown>
  ) {
    try {
      const context = new ValidationContext(req);
      if (metadataOverrides) {
        for (const [k, v] of Object.entries(metadataOverrides)) {
          context.setMetadata(k, v);
        }
      }
      await validator.validate(context);
      console.log(`❌ Test FAILED: ${name} (Expected ${expectedErrorName} but no exception was thrown)`);
      failed++;
    } catch (err: unknown) {
      if (err instanceof Error && err.constructor.name === expectedErrorName) {
        console.log(`✅ Test PASSED: ${name} (Correctly threw ${expectedErrorName}: ${err.message})`);
        passed++;
      } else {
        const thrownName = err instanceof Error ? err.constructor.name : String(err);
        console.log(`❌ Test FAILED: ${name} (Expected ${expectedErrorName} but received ${thrownName})`);
        failed++;
      }
    }
  }

  // 1. Structural Checks
  await assertThrows(
    'Negative Amount Check',
    {
      uid: 'wallet_active_1',
      amount: -100,
      currency: 'USD',
      referenceNumber: 'REF_STRUCT_1',
      idempotencyKey: 'IDEM_1',
      operationType: 'DEPOSIT'
    },
    'ValidationException'
  );

  await assertThrows(
    'Decimal Precision Check',
    {
      uid: 'wallet_active_1',
      amount: 100.123456,
      currency: 'USD',
      referenceNumber: 'REF_STRUCT_2',
      idempotencyKey: 'IDEM_2',
      operationType: 'DEPOSIT'
    },
    'ValidationException'
  );

  // 2. Authentication / Permission Checks
  await assertThrows(
    'Permission Denied Check (Non-admin doing Freeze)',
    {
      uid: 'wallet_active_1',
      amount: 5000,
      currency: 'USD',
      referenceNumber: 'REF_PERM_1',
      idempotencyKey: 'IDEM_PERM_1',
      operationType: 'FREEZE',
      jwt: 'valid_jwt_token',
      role: 'USER',
      permissions: ['wallet.deposit']
    },
    'PermissionDeniedException'
  );

  // 3. Wallet State Constraints
  await assertThrows(
    'Closed Wallet Access Check',
    {
      uid: 'wallet_closed',
      amount: 5000,
      currency: 'USD',
      referenceNumber: 'REF_STATE_1',
      idempotencyKey: 'IDEM_STATE_1',
      operationType: 'DEPOSIT',
      jwt: 'valid_jwt_token',
      role: 'USER',
      permissions: ['wallet.deposit']
    },
    'WalletStateException'
  );

  await assertThrows(
    'Frozen Wallet Outflow Restriction',
    {
      uid: 'wallet_frozen',
      amount: 5000,
      currency: 'USD',
      referenceNumber: 'REF_STATE_2',
      idempotencyKey: 'IDEM_STATE_2',
      operationType: 'WITHDRAW',
      jwt: 'valid_jwt_token',
      role: 'USER',
      permissions: ['wallet.withdraw']
    },
    'WalletStateException'
  );

  // 4. Currency Matches
  await assertThrows(
    'Currency Mismatch Check',
    {
      uid: 'wallet_active_1',
      amount: 5000,
      currency: 'EUR', // Wallet is USD
      referenceNumber: 'REF_CURR_1',
      idempotencyKey: 'IDEM_CURR_1',
      operationType: 'DEPOSIT',
      jwt: 'valid_jwt_token',
      role: 'USER',
      permissions: ['wallet.deposit']
    },
    'CurrencyMismatchException'
  );

  // 5. Limits Bounds & Velocity
  await assertThrows(
    'Single Transaction Lower Bound Check',
    {
      uid: 'wallet_active_1',
      amount: 5, // Below minimum of 1000
      currency: 'USD',
      referenceNumber: 'REF_LIMIT_1',
      idempotencyKey: 'IDEM_LIMIT_1',
      operationType: 'DEPOSIT',
      jwt: 'valid_jwt_token',
      role: 'USER',
      permissions: ['wallet.deposit']
    },
    'LimitExceededException'
  );

  await assertThrows(
    'Daily Velocity Limit Check',
    {
      uid: 'wallet_active_1',
      amount: 60000000, // Limit is 50,000,000
      currency: 'USD',
      referenceNumber: 'REF_LIMIT_2',
      idempotencyKey: 'IDEM_LIMIT_2',
      operationType: 'DEPOSIT',
      jwt: 'valid_jwt_token',
      role: 'USER',
      permissions: ['wallet.deposit']
    },
    'LimitExceededException',
    {
      minTransactionLimit: 10,
      maxTransactionLimit: 100000000,
      dailyAccumulatedTotal: 0,
      dailyLimit: 50000000
    }
  );

  // 6. Optimistic Concurrency Check
  await assertThrows(
    'Optimistic Concurrency Control Check',
    {
      uid: 'wallet_active_1',
      amount: 5000,
      currency: 'USD',
      referenceNumber: 'REF_VERSION_1',
      idempotencyKey: 'IDEM_VERSION_1',
      operationType: 'DEPOSIT',
      jwt: 'valid_jwt_token',
      role: 'USER',
      permissions: ['wallet.deposit'],
      version: 999999 // Mismatched version checksum
    },
    'WalletStateException'
  );

  // 7. Idempotency Check
  await assertThrows(
    'Idempotency Key Collision Check',
    {
      uid: 'wallet_active_1',
      amount: 5000,
      currency: 'USD',
      referenceNumber: 'REF_IDEM_1',
      idempotencyKey: 'used_idempotency_key_999', // Collides
      operationType: 'DEPOSIT',
      jwt: 'valid_jwt_token',
      role: 'USER',
      permissions: ['wallet.deposit']
    },
    'DuplicateRequestException'
  );

  // 8. Fraud / Risk Scoring
  await assertThrows(
    'Fraud Risk Score Block Check',
    {
      uid: 'wallet_active_1',
      amount: 5000,
      currency: 'USD',
      referenceNumber: 'REF_RISK_1',
      idempotencyKey: 'IDEM_RISK_1',
      operationType: 'DEPOSIT',
      jwt: 'valid_jwt_token',
      role: 'USER',
      permissions: ['wallet.deposit'],
      riskScore: 95 // Above 80 threshold
    },
    'RiskDetectedException'
  );

  // 9. Core Business Policy Checks
  await assertThrows(
    'Unapproved MLM Commission Policy Check',
    {
      uid: 'wallet_active_1',
      amount: 5000,
      currency: 'USD',
      referenceNumber: 'REF_POLICY_1',
      idempotencyKey: 'IDEM_POLICY_1',
      operationType: 'COMMISSION',
      jwt: 'valid_jwt_token',
      role: 'USER',
      permissions: ['wallet.credit.commission']
    },
    'PolicyViolationException',
    {
      commissionApproved: false // Explicitly unapproved
    }
  );

  // 10. Success Path
  try {
    const successContext = new ValidationContext({
      uid: 'wallet_active_1',
      amount: 5000,
      currency: 'USD',
      referenceNumber: 'REF_SUCCESS_PATH',
      idempotencyKey: 'IDEM_SUCCESS_PATH_1',
      operationType: 'DEPOSIT',
      jwt: 'valid_jwt_token',
      role: 'USER',
      permissions: ['wallet.deposit']
    });
    successContext.setMetadata('minTransactionLimit', 10);
    successContext.setMetadata('maxTransactionLimit', 100000);
    successContext.setMetadata('dailyAccumulatedTotal', 0);
    successContext.setMetadata('dailyLimit', 50000);
    successContext.setMetadata('monthlyAccumulatedTotal', 0);
    successContext.setMetadata('monthlyLimit', 500000);

    await validator.validate(successContext);
    console.log('✅ Test PASSED: Full Validation Success Path executed cleanly with no exceptions!');
    passed++;
  } catch (err: unknown) {
    const thrownName = err instanceof Error ? err.constructor.name : String(err);
    const thrownMsg = err instanceof Error ? err.message : '';
    console.log(`❌ Test FAILED: Success Path threw unexpected exception ${thrownName}: ${thrownMsg}`);
    failed++;
  }

  console.log('======================================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
