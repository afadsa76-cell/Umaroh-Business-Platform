/**
 * @file WalletProjectionService.ts
 * @description Coordinate projection read models updates on event streams.
 * @responsibility Update cashflow, commission pipelines and accounting views dynamically.
 * 
 * TODO: Support bulk historical projection rebuild scripts.
 */

import { ILedgerRepository } from '../../domain/repositories/ILedgerRepository.js';

export class WalletProjectionService {
  private readonly ledgerRepo: ILedgerRepository;

  /**
   * @constructor
   * @param ledgerRepo - Injected ledger database adapter.
   */
  constructor(ledgerRepo: ILedgerRepository) {
    this.ledgerRepo = ledgerRepo;
  }

  // #region Methods
  public async computeActiveProjections(organizationId: string): Promise<unknown> {
    console.log(this.ledgerRepo, organizationId);
    throw new Error("Not implemented.");
  }

  public async rebuildProjection(projectionName: string): Promise<void> {
    console.log(projectionName);
    throw new Error("Not implemented.");
  }
  // #endregion
}
