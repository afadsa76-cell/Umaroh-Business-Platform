/**
 * @file WalletSnapshotService.ts
 * @description Coordinates historical event replay state rebuilding and snapshots.
 * @responsibility Rebuild wallet states at specified timestamps by querying and applying logs.
 * 
 * TODO: Configure automatic aggregate compaction thresholds.
 */

import { IWalletRepository } from '../../domain/repositories/IWalletRepository.js';

export class WalletSnapshotService {
  private readonly walletRepo: IWalletRepository;

  /**
   * @constructor
   * @param walletRepo - Injected wallet repository.
   */
  constructor(walletRepo: IWalletRepository) {
    this.walletRepo = walletRepo;
  }

  // #region Methods
  public async takeSnapshot(uid: string): Promise<void> {
    console.log(this.walletRepo, uid);
    throw new Error("Not implemented.");
  }

  public async restoreToTimestamp(uid: string, timestamp: Date): Promise<unknown> {
    console.log(timestamp);
    throw new Error("Not implemented.");
  }
  // #endregion
}
