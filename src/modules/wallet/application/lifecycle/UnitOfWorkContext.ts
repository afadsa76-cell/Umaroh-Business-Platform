/**
 * @file UnitOfWorkContext.ts
 * @description Context block containing transaction boundaries, trace logs, and correlation IDs.
 */

export interface UnitOfWorkContext {
  transactionId: string;
  correlationId: string;
  initiator: string;
}
