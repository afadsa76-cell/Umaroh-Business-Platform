/**
 * @file IUnitOfWork.ts
 * @description Interface contract for registration, commitment, and tracking of business transactions.
 */

import { UnitOfWorkContext } from './UnitOfWorkContext.js';
import { UnitOfWorkResult } from './UnitOfWorkResult.js';
import { WalletAggregate } from '../../domain/aggregate/WalletAggregate.js';

export interface IUnitOfWork {
  getContext(): UnitOfWorkContext;
  begin(): Promise<void>;
  commit(): Promise<UnitOfWorkResult>;
  rollback(): Promise<void>;
  registerDirty(aggregate: WalletAggregate): void;
}
