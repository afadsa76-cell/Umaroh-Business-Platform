/**
 * @file UnitOfWorkFactory.ts
 * @description Factory class to instantiate new transaction contexts.
 */

import { UnitOfWorkContext } from './UnitOfWorkContext.js';
import { WalletUnitOfWork } from './WalletUnitOfWork.js';

export class UnitOfWorkFactory {
  public static create(correlationId: string, initiator: string): WalletUnitOfWork {
    const context: UnitOfWorkContext = {
      transactionId: `tx_${Math.random().toString(36).substring(2, 11)}`,
      correlationId,
      initiator
    };
    return new WalletUnitOfWork(context);
  }
}
