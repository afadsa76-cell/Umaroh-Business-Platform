/**
 * @file WalletAggregateMapper.ts
 * @description Domain mapper for high-integrity transitions between IWalletData models, snapshots, and Aggregate Roots.
 */

import { WalletAggregate } from './WalletAggregate.js';
import { IWalletData } from '../../shared/types/WalletTypes.js';
import { WalletAggregateVersion } from './WalletAggregateVersion.js';
import { WalletAggregateSnapshot } from './WalletAggregateSnapshot.js';

export class WalletAggregateMapper {
  public static toAggregate(data: IWalletData, versionValue = 0): WalletAggregate {
    return new WalletAggregate(data, WalletAggregateVersion.from(versionValue));
  }

  public static toData(aggregate: WalletAggregate): IWalletData {
    return aggregate.toData();
  }

  public static toSnapshot(aggregate: WalletAggregate): WalletAggregateSnapshot {
    return {
      walletId: aggregate.getWalletId(),
      tenantId: aggregate.getTenantId(),
      organizationId: aggregate.getOrganizationId(),
      currency: aggregate.getCurrency(),
      status: aggregate.getStatus(),
      balances: aggregate.getBalances(),
      version: aggregate.getVersion().getRawValue(),
      checksum: aggregate.getChecksum(),
      updatedAt: aggregate.getUpdatedAt()
    };
  }
}
