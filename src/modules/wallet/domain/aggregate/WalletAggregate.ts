/**
 * @file WalletAggregate.ts
 * @description The core Aggregate Root managing all status changes and invariants.
 */

import { IWalletData, WalletStatus, IBalance } from '../../shared/types/WalletTypes.js';
import { WalletState } from '../state/WalletState.js';
import { AggregateVersion } from './AggregateVersion.js';
import { WalletStateMachine } from '../state/WalletStateMachine.js';
import { IDomainEvent } from '../events/IDomainEvent.js';
import { AggregateInvariantException } from '../exceptions/AggregateInvariantException.js';
import { LifecycleAuditEntry } from '../lifecycle/LifecycleAuditEntry.js';
import { WalletLifecycleHistory } from '../lifecycle/WalletLifecycleHistory.js';
import { WalletLifecycleResult } from '../lifecycle/WalletLifecycleResult.js';

export class WalletAggregate {
  private readonly walletId: string;
  private readonly tenantId: string;
  private readonly organizationId: string;
  private readonly currency: string;
  private version: AggregateVersion;
  private readonly balances: IBalance;
  private readonly checksum: string;
  private readonly createdAt: Date;
  private updatedAt: Date;

  private readonly stateMachine: WalletStateMachine;
  private readonly history: WalletLifecycleHistory;
  private readonly uncommittedEvents: IDomainEvent[] = [];

  constructor(
    data: IWalletData,
    version: AggregateVersion,
    history?: WalletLifecycleHistory
  ) {
    this.walletId = data.uid;
    this.tenantId = data.tenantId;
    this.organizationId = data.organizationId;
    this.currency = data.currency;
    this.version = version;
    this.balances = { ...data.balances };
    this.checksum = data.checksum;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;

    // Map database WalletStatus to domain WalletState
    const initialState = this.mapStatusToState(data.status);
    this.stateMachine = new WalletStateMachine(initialState);
    this.history = history || new WalletLifecycleHistory();

    // Validate initial invariants
    this.validateInvariants();
  }

  private mapStatusToState(status: WalletStatus): WalletState {
    switch (status) {
      case WalletStatus.ACTIVE: return WalletState.ACTIVE;
      case WalletStatus.PENDING: return WalletState.PENDING;
      case WalletStatus.FROZEN: return WalletState.FROZEN;
      case WalletStatus.LOCKED: return WalletState.LOCKED;
      case WalletStatus.SUSPENDED: return WalletState.SUSPENDED;
      case WalletStatus.CLOSED: return WalletState.CLOSED;
      case WalletStatus.ARCHIVED: return WalletState.ARCHIVED;
      default: return WalletState.ACTIVE;
    }
  }

  private mapStateToStatus(state: WalletState): WalletStatus {
    switch (state) {
      case WalletState.ACTIVE: return WalletStatus.ACTIVE;
      case WalletState.PENDING: return WalletStatus.PENDING;
      case WalletState.FROZEN: return WalletStatus.FROZEN;
      case WalletState.LOCKED: return WalletStatus.LOCKED;
      case WalletState.SUSPENDED: return WalletStatus.SUSPENDED;
      case WalletState.CLOSED: return WalletStatus.CLOSED;
      case WalletState.ARCHIVED: return WalletStatus.ARCHIVED;
      default: return WalletStatus.ACTIVE;
    }
  }

  public getWalletId(): string { return this.walletId; }
  public getTenantId(): string { return this.tenantId; }
  public getOrganizationId(): string { return this.organizationId; }
  public getCurrency(): string { return this.currency; }
  public getVersion(): AggregateVersion { return this.version; }
  public getBalances(): IBalance { return { ...this.balances }; }
  public getChecksum(): string { return this.checksum; }
  public getCreatedAt(): Date { return this.createdAt; }
  public getUpdatedAt(): Date { return this.updatedAt; }
  public getStatus(): WalletState { return this.stateMachine.getCurrentState(); }
  public getLifecycleHistory(): WalletLifecycleHistory { return this.history; }

  public getUncommittedEvents(): IDomainEvent[] {
    return [...this.uncommittedEvents];
  }

  public clearUncommittedEvents(): void {
    this.uncommittedEvents.length = 0;
  }

  /**
   * Safe status transition through aggregate root with full audit trail and invariant checks.
   */
  public transitionTo(
    toState: WalletState,
    initiatorRole: string,
    initiator: string,
    reason: string,
    correlationId: string
  ): WalletLifecycleResult {
    const previousState = this.getStatus();
    const timestamp = new Date();

    // Execute transition inside state machine (this validates transition boundaries)
    const events = this.stateMachine.transition(toState, initiatorRole, this.walletId, this.tenantId);

    // Increment version monotonically
    this.version = this.version.next();
    this.updatedAt = timestamp;

    // Validate in-memory invariants
    this.validateInvariants();

    // Collect generated events
    for (const event of events) {
      this.uncommittedEvents.push(event);
    }

    // Build Audit Entry
    const auditEntry: LifecycleAuditEntry = {
      id: `aud_${Math.random().toString(36).substring(2, 11)}`,
      walletId: this.walletId,
      tenantId: this.tenantId,
      previousState,
      currentState: toState,
      initiator,
      reason,
      correlationId,
      timestamp
    };

    this.history.addEntry(auditEntry);

    return {
      success: true,
      walletId: this.walletId,
      previousState,
      currentState: toState,
      events,
      auditEntry
    };
  }

  /**
   * Raise Balance Reserved Event (without mutating balance, as requested: Zero Business Logic Finansial)
   */
  public reserveBalance(amount: number, correlationId: string): void {
    if (amount <= 0) {
      throw new AggregateInvariantException('Reservation amount must be positive.');
    }
    const eventId = `evt_${Math.random().toString(36).substring(2, 11)}`;
    const event = {
      eventId,
      eventType: 'WalletBalanceReservedEvent',
      timestamp: new Date(),
      tenantId: this.tenantId,
      data: { walletId: this.walletId, amount, correlationId }
    };
    this.uncommittedEvents.push(event);
  }

  /**
   * Raise Balance Released Event (without mutating balance, as requested: Zero Business Logic Finansial)
   */
  public releaseBalance(amount: number, correlationId: string): void {
    if (amount <= 0) {
      throw new AggregateInvariantException('Release amount must be positive.');
    }
    const eventId = `evt_${Math.random().toString(36).substring(2, 11)}`;
    const event = {
      eventId,
      eventType: 'WalletBalanceReleasedEvent',
      timestamp: new Date(),
      tenantId: this.tenantId,
      data: { walletId: this.walletId, amount, correlationId }
    };
    this.uncommittedEvents.push(event);
  }

  /**
   * Assert aggregate boundaries and strict immutability invariants.
   */
  private validateInvariants(): void {
    if (!this.walletId || this.walletId.trim() === '') {
      throw new AggregateInvariantException('Invariant Violation: Wallet ID is empty or invalid.');
    }
    if (!this.currency || this.currency.length !== 3) {
      throw new AggregateInvariantException('Invariant Violation: Wallet Currency must be a 3-character ISO code.');
    }
    if (!this.tenantId || this.tenantId.trim() === '') {
      throw new AggregateInvariantException('Invariant Violation: Wallet Tenant ID must be defined.');
    }
    if (!this.version || this.version.getRawValue() < 0) {
      throw new AggregateInvariantException('Invariant Violation: Wallet version is negative or non-monotonic.');
    }
  }

  /**
   * Generate clean database representation from active aggregate root.
   */
  public toData(): IWalletData {
    return {
      uid: this.walletId,
      tenantId: this.tenantId,
      organizationId: this.organizationId,
      currency: this.currency,
      status: this.mapStateToStatus(this.getStatus()),
      balances: { ...this.balances },
      checksum: this.checksum,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
