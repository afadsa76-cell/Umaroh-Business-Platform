/**
 * @file UnitOfWorkResult.ts
 * @description Structure of commit/rollback outcomes emitted by the Unit of Work engine.
 */

export interface UnitOfWorkResult<T = unknown> {
  success: boolean;
  transactionId: string;
  data?: T;
  error?: Error;
}
