/**
 * @file WalletLifecycleContext.ts
 * @description Input context defining transition variables including initiator and tracking metrics.
 */

import { WalletState } from '../state/WalletState.js';

export interface WalletLifecycleContext {
  walletId: string;
  tenantId: string;
  previousState: WalletState;
  targetState: WalletState;
  initiator: string;
  reason: string;
  correlationId: string;
  timestamp: Date;
}
