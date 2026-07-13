/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * @file SnapshotCache.ts
 * @description Dedicated cache for historical state reconstruction snapshots.
 * @responsibility Persist intermediate aggregate versions to speed up event-sourced load speeds.
 * 
 * TODO: Configure automated snapshot frequency parameters.
 */

import { WalletCacheProvider } from './WalletCacheProvider.js';

export class SnapshotCache {
  private readonly provider: WalletCacheProvider;

  /**
   * @constructor
   * @param provider - Injected cache provider.
   */
  constructor(provider: WalletCacheProvider) {
    this.provider = provider;
  }

  // #region Methods
  public async getSnapshot<T>(aggregateId: string): Promise<T | null> {
    console.log(this.provider);
    throw new Error("Not implemented.");
  }

  public async setSnapshot<T>(aggregateId: string, snapshot: T): Promise<void> {
    console.log(snapshot);
    throw new Error("Not implemented.");
  }
  // #endregion
}
