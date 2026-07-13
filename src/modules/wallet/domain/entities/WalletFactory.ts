/**
 * @file WalletFactory.ts
 * @description Domain Factory to assemble complete Wallet aggregate root states.
 * @responsibility Correctly construct and configure clean Wallet instances.
 * 
 * TODO: Implement automated cryptographic verification salt generation on startup.
 */

import { IWalletData, WalletStatus } from '../../shared/types/WalletTypes.js';

export class WalletFactory {
  private readonly saltProvider: unknown;

  /**
   * @constructor
   * @param saltProvider - Injected service to fetch secrets or salts.
   */
  constructor(saltProvider: unknown) {
    this.saltProvider = saltProvider;
  }

  // #region Methods
  /**
   * Creates a brand new, empty active Wallet aggregate.
   */
  public createNewWallet(uid: string, tenantId: string, organizationId: string, currency: string = 'IDR'): IWalletData {
    console.log(this.saltProvider);
    return {
      uid,
      tenantId,
      organizationId,
      currency,
      status: WalletStatus.ACTIVE,
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
      checksum: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  // #endregion
}
