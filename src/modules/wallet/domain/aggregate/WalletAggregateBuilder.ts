/**
 * @file WalletAggregateBuilder.ts
 * @description Fluent builder to construct highly configured WalletAggregate instances in tests.
 */

import { WalletAggregate } from './WalletAggregate.js';
import { IWalletData, WalletStatus, IBalance } from '../../shared/types/WalletTypes.js';
import { WalletAggregateVersion } from './WalletAggregateVersion.js';
import { WalletLifecycleHistory } from '../lifecycle/WalletLifecycleHistory.js';

export class WalletAggregateBuilder {
  private uid = '';
  private tenantId = '';
  private organizationId = '';
  private currency = 'USD';
  private status = WalletStatus.PENDING;
  private balances: IBalance = {
    availableBalance: 0,
    pendingBalance: 0,
    frozenBalance: 0,
    escrowBalance: 0,
    commissionBalance: 0,
    rewardBalance: 0,
    adjustmentBalance: 0,
    totalBalance: 0
  };
  private checksum = '';
  private createdAt = new Date();
  private updatedAt = new Date();
  private version = WalletAggregateVersion.from(0);
  private history = new WalletLifecycleHistory();

  public withUid(uid: string): this {
    this.uid = uid;
    return this;
  }

  public withTenantId(tenantId: string): this {
    this.tenantId = tenantId;
    return this;
  }

  public withOrganizationId(organizationId: string): this {
    this.organizationId = organizationId;
    return this;
  }

  public withCurrency(currency: string): this {
    this.currency = currency;
    return this;
  }

  public withStatus(status: WalletStatus): this {
    this.status = status;
    return this;
  }

  public withBalances(balances: IBalance): this {
    this.balances = { ...balances };
    return this;
  }

  public withChecksum(checksum: string): this {
    this.checksum = checksum;
    return this;
  }

  public withCreatedAt(createdAt: Date): this {
    this.createdAt = createdAt;
    return this;
  }

  public withUpdatedAt(updatedAt: Date): this {
    this.updatedAt = updatedAt;
    return this;
  }

  public withVersion(version: WalletAggregateVersion): this {
    this.version = version;
    return this;
  }

  public withHistory(history: WalletLifecycleHistory): this {
    this.history = history;
    return this;
  }

  public build(): WalletAggregate {
    const data: IWalletData = {
      uid: this.uid,
      tenantId: this.tenantId,
      organizationId: this.organizationId,
      currency: this.currency,
      status: this.status,
      balances: this.balances,
      checksum: this.checksum,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
    return new WalletAggregate(data, this.version, this.history);
  }
}
