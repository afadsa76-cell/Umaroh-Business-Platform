/**
 * @file WalletUnitOfWork.ts
 * @description Unit of Work implementation for tracking dirty aggregates and committing transactions.
 */

import { IUnitOfWork } from './IUnitOfWork.js';
import { UnitOfWorkContext } from './UnitOfWorkContext.js';
import { UnitOfWorkResult } from './UnitOfWorkResult.js';
import { WalletAggregate } from '../../domain/aggregate/WalletAggregate.js';

export class WalletUnitOfWork implements IUnitOfWork {
  private readonly context: UnitOfWorkContext;
  private readonly dirtyAggregates: Map<string, WalletAggregate> = new Map();
  private isTransactionActive = false;

  constructor(context: UnitOfWorkContext) {
    this.context = context;
  }

  public getContext(): UnitOfWorkContext {
    return this.context;
  }

  public async begin(): Promise<void> {
    if (this.isTransactionActive) {
      throw new Error('Transaction is already active.');
    }
    this.isTransactionActive = true;
    this.dirtyAggregates.clear();
  }

  public registerDirty(aggregate: WalletAggregate): void {
    if (!this.isTransactionActive) {
      throw new Error('Cannot register dirty aggregate without an active transaction.');
    }
    this.dirtyAggregates.set(aggregate.getWalletId(), aggregate);
  }

  public async commit(): Promise<UnitOfWorkResult> {
    if (!this.isTransactionActive) {
      throw new Error('No active transaction to commit.');
    }

    try {
      this.isTransactionActive = false;
      const count = this.dirtyAggregates.size;
      this.dirtyAggregates.clear();

      return {
        success: true,
        transactionId: this.context.transactionId,
        data: { committedCount: count }
      };
    } catch (error) {
      this.isTransactionActive = false;
      this.dirtyAggregates.clear();
      return {
        success: false,
        transactionId: this.context.transactionId,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  public async rollback(): Promise<void> {
    this.isTransactionActive = false;
    this.dirtyAggregates.clear();
  }
}
