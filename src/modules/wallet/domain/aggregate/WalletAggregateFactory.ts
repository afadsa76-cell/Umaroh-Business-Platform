/**
 * @file WalletAggregateFactory.ts
 * @description Factory class simplifying initial wallet aggregate registration and data-mapping loads.
 */

import { WalletAggregate } from './WalletAggregate.js';
import { IWalletData, WalletStatus } from '../../shared/types/WalletTypes.js';
import { WalletAggregateVersion } from './WalletAggregateVersion.js';

export class WalletAggregateFactory {
  public static createNew(
    uid: string,
    tenantId: string,
    organizationId: string,
    currency: string
  ): WalletAggregate {
    const data: IWalletData = {
      uid,
      tenantId,
      organizationId,
      currency,
      status: WalletStatus.PENDING,
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
      checksum: `chk_${Math.random().toString(36).substring(2, 11)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return new WalletAggregate(data, WalletAggregateVersion.from(0));
  }

  public static fromData(data: IWalletData, versionValue = 0): WalletAggregate {
    return new WalletAggregate(data, WalletAggregateVersion.from(versionValue));
  }
}
