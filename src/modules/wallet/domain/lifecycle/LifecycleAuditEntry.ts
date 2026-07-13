/**
 * @file LifecycleAuditEntry.ts
 * @description Structure of immutable audit logs generated during transition completions.
 */

import { WalletState } from '../state/WalletState.js';

export interface LifecycleAuditEntry {
  id: string;
  walletId: string;
  tenantId: string;
  previousState: WalletState;
  currentState: WalletState;
  initiator: string;
  reason: string;
  correlationId: string;
  timestamp: Date;
}
