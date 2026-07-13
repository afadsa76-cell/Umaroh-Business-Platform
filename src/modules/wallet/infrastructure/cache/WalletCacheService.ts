/**
 * @file WalletCacheService.ts
 * @description Operational facade coordinating across dedicated and generic cache providers.
 * @responsibility Clear keys upon state mutations or reconcile events.
 * 
 * TODO: Support bulk pattern clearing operations.
 */

import { WalletCacheProvider } from './WalletCacheProvider.js';

export class WalletCacheService {
  private readonly genericProvider: WalletCacheProvider;

  /**
   * @constructor
   * @param genericProvider - Injected generic caching engine.
   */
  constructor(genericProvider: WalletCacheProvider) {
    this.genericProvider = genericProvider;
  }

  // #region Methods
  public async clearWalletRelatedCaches(uid: string): Promise<void> {
    console.log(this.genericProvider);
    await this.genericProvider.del(`wallet:state:${uid}`);
    await this.genericProvider.del(`wallet:balances:${uid}`);
  }
  // #endregion
}
