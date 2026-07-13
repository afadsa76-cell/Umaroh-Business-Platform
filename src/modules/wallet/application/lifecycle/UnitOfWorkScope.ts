/**
 * @file UnitOfWorkScope.ts
 * @description Orchestrates automatic transaction boundaries with try-catch rollback guarantees.
 */

import { WalletUnitOfWork } from './WalletUnitOfWork.js';
import { UnitOfWorkResult } from './UnitOfWorkResult.js';

export class UnitOfWorkScope {
  public static async runWithin<T = unknown>(
    unitOfWork: WalletUnitOfWork,
    work: (uow: WalletUnitOfWork) => Promise<T>
  ): Promise<UnitOfWorkResult<T>> {
    await unitOfWork.begin();
    try {
      const resultData = await work(unitOfWork);
      const commitResult = await unitOfWork.commit();
      if (!commitResult.success) {
        throw commitResult.error || new Error('Commit failed');
      }
      return {
        success: true,
        transactionId: unitOfWork.getContext().transactionId,
        data: resultData
      };
    } catch (error) {
      await unitOfWork.rollback();
      return {
        success: false,
        transactionId: unitOfWork.getContext().transactionId,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
}
