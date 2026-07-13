/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * @file ProjectionCache.ts
 * @description Dedicated cache for read-model projection snapshots.
 * @responsibility Store highly-queried reports or dashboard models temporarily to relieve read IO.
 * 
 * TODO: Support automatic invalidation on transaction event publishes.
 */

import { WalletCacheProvider } from './WalletCacheProvider.js';

export class ProjectionCache {
  private readonly provider: WalletCacheProvider;

  /**
   * @constructor
   * @param provider - Injected low-level cache provider.
   */
  constructor(provider: WalletCacheProvider) {
    this.provider = provider;
  }

  // #region Methods
  public async getProjection<T>(projectionId: string): Promise<T | null> {
    console.log(this.provider);
    throw new Error("Not implemented.");
  }

  public async setProjection<T>(projectionId: string, value: T, ttl: number): Promise<void> {
    console.log(ttl, value);
    throw new Error("Not implemented.");
  }
  // #endregion
}
