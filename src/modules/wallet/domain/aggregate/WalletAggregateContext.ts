/**
 * @file WalletAggregateContext.ts
 * @description Command context details carrying audit initiators and correlation trackers.
 */

export interface WalletAggregateContext {
  initiator: string;
  correlationId: string;
  reason?: string;
}
