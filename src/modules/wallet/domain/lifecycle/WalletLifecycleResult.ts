/**
 * @file WalletLifecycleResult.ts
 * @description The structured return output of a completed wallet transition attempt.
 */

import { WalletState } from '../state/WalletState.js';
import { IDomainEvent } from '../events/IDomainEvent.js';
import { LifecycleAuditEntry } from './LifecycleAuditEntry.js';

export interface WalletLifecycleResult {
  success: boolean;
  walletId: string;
  previousState: WalletState;
  currentState: WalletState;
  events: IDomainEvent[];
  auditEntry: LifecycleAuditEntry;
}
