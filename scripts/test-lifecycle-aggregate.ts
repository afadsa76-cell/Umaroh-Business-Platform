/**
 * @file test-lifecycle-aggregate.ts
 * @description Thorough suite of tests validating WalletAggregate invariants, versions, and UoW patterns.
 */

import { WalletAggregateFactory } from '../src/modules/wallet/domain/aggregate/WalletAggregateFactory.js';
import { WalletAggregateVersion } from '../src/modules/wallet/domain/aggregate/WalletAggregateVersion.js';
import { WalletState } from '../src/modules/wallet/domain/state/WalletState.js';
import { InvalidStateTransitionException } from '../src/modules/wallet/domain/exceptions/InvalidStateTransitionException.js';
import { DomainEventDispatcher } from '../src/modules/wallet/domain/events/DomainEventDispatcher.js';
import { DomainEventStore } from '../src/modules/wallet/domain/events/DomainEventStore.js';
import { WalletLifecycleManager } from '../src/modules/wallet/domain/lifecycle/WalletLifecycleManager.js';
import { UnitOfWorkFactory } from '../src/modules/wallet/application/lifecycle/UnitOfWorkFactory.js';
import { UnitOfWorkScope } from '../src/modules/wallet/application/lifecycle/UnitOfWorkScope.js';
import { OptimisticVersionCheck } from '../src/modules/wallet/domain/aggregate/OptimisticVersionCheck.js';

async function runTests() {
  console.log('====================================================================');
  console.log('🏦 SPRINT 2B.5 - WALLET LIFECYCLE & AGGREGATE ENGINE TEST SUITE 🏦');
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

  try {
    // ------------------------------------------------------------------
    // TEST 1: AGGREGATE CREATION & INVARIANTS
    // ------------------------------------------------------------------
    console.log('\n--- Test Group 1: Aggregate Creation & Invariants ---');
    const wallet = WalletAggregateFactory.createNew('wallet_test_1', 'tenant_1', 'org_1', 'IDR');
    
    assert(wallet.getWalletId() === 'wallet_test_1', 'Wallet ID matches');
    assert(wallet.getTenantId() === 'tenant_1', 'Tenant ID matches');
    assert(wallet.getCurrency() === 'IDR', 'Currency matches');
    assert(wallet.getStatus() === WalletState.PENDING, 'Initial status is PENDING');
    assert(wallet.getVersion().getRawValue() === 0, 'Initial version is 0');

    // ------------------------------------------------------------------
    // TEST 2: VERSIONING & MONOTONICITY
    // ------------------------------------------------------------------
    console.log('\n--- Test Group 2: Versioning & Monotonicity ---');
    const currentVersion = wallet.getVersion();
    const nextVersion = currentVersion.next();
    assert(nextVersion.getRawValue() === 1, 'Monotonic increment to 1 succeeds');
    
    // Optimistic Concurrency check
    let versionErrorThrown = false;
    try {
      OptimisticVersionCheck.check(currentVersion, WalletAggregateVersion.from(5));
    } catch {
      versionErrorThrown = true;
    }
    assert(versionErrorThrown, 'OptimisticVersionCheck correctly throws error on mismatch');

    // ------------------------------------------------------------------
    // TEST 3: STATE TRANSITIONS & INVARIANT VALIDATION
    // ------------------------------------------------------------------
    console.log('\n--- Test Group 3: State Transitions & Invariant Validation ---');
    
    // PENDING -> ACTIVE is valid
    const manager = new WalletLifecycleManager();
    const res1 = await manager.executeTransition(
      wallet,
      WalletState.ACTIVE,
      'ADMIN',
      'user_admin',
      'Activating new wallet',
      'corr_1'
    );
    assert(res1.success, 'Transition PENDING -> ACTIVE succeeds');
    assert(wallet.getStatus() === WalletState.ACTIVE, 'Wallet is now ACTIVE');
    assert(wallet.getVersion().getRawValue() === 1, 'Version incremented to 1');

    // ACTIVE -> FROZEN is valid
    const res2 = await manager.executeTransition(
      wallet,
      WalletState.FROZEN,
      'ADMIN',
      'user_admin',
      'Freezing wallet for review',
      'corr_2'
    );
    assert(res2.success, 'Transition ACTIVE -> FROZEN succeeds');
    assert(wallet.getStatus() === WalletState.FROZEN, 'Wallet is now FROZEN');

    // FROZEN -> CLOSED is invalid (Frozen -> Closed without Unfreeze)
    let transitionError = false;
    try {
      await manager.executeTransition(
        wallet,
        WalletState.CLOSED,
        'ADMIN',
        'user_admin',
        'Closing frozen wallet directly',
        'corr_3'
      );
    } catch (e) {
      if (e instanceof InvalidStateTransitionException) {
        transitionError = true;
        console.log(`  Expected Exception Caught: ${e.message}`);
      }
    }
    assert(transitionError, 'FROZEN -> CLOSED without Unfreeze is successfully blocked');

    // FROZEN -> ACTIVE is valid
    const res3 = await manager.executeTransition(
      wallet,
      WalletState.ACTIVE,
      'ADMIN',
      'user_admin',
      'Unfreezing wallet',
      'corr_4'
    );
    assert(res3.success, 'Transition FROZEN -> ACTIVE succeeds');

    // ACTIVE -> CLOSED is valid
    const res4 = await manager.executeTransition(
      wallet,
      WalletState.CLOSED,
      'ADMIN',
      'user_admin',
      'Closing wallet',
      'corr_5'
    );
    assert(res4.success, 'Transition ACTIVE -> CLOSED succeeds');

    // CLOSED -> ACTIVE directly is invalid
    let closedToActiveError = false;
    try {
      await manager.executeTransition(
        wallet,
        WalletState.ACTIVE,
        'ADMIN',
        'user_admin',
        'Reopening closed directly',
        'corr_6'
      );
    } catch (e) {
      if (e instanceof InvalidStateTransitionException) {
        closedToActiveError = true;
        console.log(`  Expected Exception Caught: ${e.message}`);
      }
    }
    assert(closedToActiveError, 'CLOSED -> ACTIVE directly is successfully blocked');

    // CLOSED -> ARCHIVED is valid
    const res5 = await manager.executeTransition(
      wallet,
      WalletState.ARCHIVED,
      'ADMIN',
      'user_admin',
      'Archiving wallet',
      'corr_7'
    );
    assert(res5.success, 'Transition CLOSED -> ARCHIVED succeeds');

    // ARCHIVED -> REOPENED with low privilege role is blocked
    let policyError = false;
    try {
      await manager.executeTransition(
        wallet,
        WalletState.REOPENED,
        'USER',
        'user_regular',
        'Attempting reopening',
        'corr_8'
      );
    } catch (e) {
      if (e instanceof InvalidStateTransitionException) {
        policyError = true;
        console.log(`  Expected Exception Caught: ${e.message}`);
      }
    }
    assert(policyError, 'ARCHIVED -> REOPENED is blocked for regular USER role');

    // ARCHIVED -> REOPENED with COMPLIANCE role is allowed
    const res6 = await manager.executeTransition(
      wallet,
      WalletState.REOPENED,
      'COMPLIANCE',
      'compliance_officer',
      'Reopening under policy',
      'corr_9'
    );
    assert(res6.success, 'ARCHIVED -> REOPENED succeeds under compliance policy');
    assert(wallet.getStatus() === WalletState.REOPENED, 'Wallet is now REOPENED');

    // ------------------------------------------------------------------
    // TEST 4: DOMAIN EVENTS & DISPATCHER
    // ------------------------------------------------------------------
    console.log('\n--- Test Group 4: Domain Events & Dispatcher ---');
    const dispatcher = DomainEventDispatcher.getInstance();
    const store = DomainEventStore.getInstance();

    let eventHandled = false;
    dispatcher.register('WalletActivatedEvent', (event) => {
      eventHandled = true;
      console.log(`  Event Handler triggered for type: ${event.eventType}`);
    });

    const mockWallet = WalletAggregateFactory.createNew('wallet_test_events', 'tenant_1', 'org_1', 'USD');
    await manager.executeTransition(
      mockWallet,
      WalletState.ACTIVE,
      'ADMIN',
      'user_admin',
      'Activate',
      'corr_events'
    );

    assert(eventHandled, 'Event Handler registered and fired for WalletActivatedEvent');
    assert(store.getAll().length > 0, 'Events successfully stored in DomainEventStore');

    // ------------------------------------------------------------------
    // TEST 5: UNIT OF WORK
    // ------------------------------------------------------------------
    console.log('\n--- Test Group 5: Unit of Work ---');
    const uow = UnitOfWorkFactory.create('corr_uow', 'user_admin');
    
    const uowResult = await UnitOfWorkScope.runWithin(uow, async (txUow) => {
      const activeWallet = WalletAggregateFactory.createNew('wallet_uow_1', 'tenant_1', 'org_1', 'USD');
      txUow.registerDirty(activeWallet);
      return { walletId: activeWallet.getWalletId() };
    });

    assert(uowResult.success, 'UnitOfWork scope executes and commits successfully');
    assert(uowResult.data?.walletId === 'wallet_uow_1', 'UoW returned committed entity details');

    // ------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------
    console.log('\n====================================================================');
    console.log(`TEST SUITE RESULTS: Passed: ${passed}, Failed: ${failed}`);
    console.log('====================================================================');
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Error running tests:', err);
    process.exit(1);
  }
}

runTests();
