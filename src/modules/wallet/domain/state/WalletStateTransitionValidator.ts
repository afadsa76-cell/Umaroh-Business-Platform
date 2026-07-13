/**
 * @file WalletStateTransitionValidator.ts
 * @description State transition rules and exception triggers verifying status flow invariants.
 */

import { WalletState } from './WalletState.js';
import { InvalidStateTransitionException } from '../exceptions/InvalidStateTransitionException.js';
import { WalletStatePolicy } from './WalletStatePolicy.js';

export class WalletStateTransitionValidator {
  private readonly policy = new WalletStatePolicy();

  // Map of valid source state to target states
  private readonly validTransitions: Record<WalletState, WalletState[]> = {
    [WalletState.NEW]: [WalletState.PENDING],
    [WalletState.PENDING]: [WalletState.ACTIVE],
    [WalletState.ACTIVE]: [WalletState.FROZEN, WalletState.LOCKED, WalletState.SUSPENDED, WalletState.CLOSED],
    [WalletState.FROZEN]: [WalletState.ACTIVE],
    [WalletState.LOCKED]: [WalletState.ACTIVE],
    [WalletState.SUSPENDED]: [WalletState.ACTIVE],
    [WalletState.CLOSED]: [WalletState.ARCHIVED],
    [WalletState.ARCHIVED]: [WalletState.REOPENED],
    [WalletState.REOPENED]: [WalletState.ACTIVE, WalletState.CLOSED]
  };

  public validateTransition(from: WalletState, to: WalletState, initiatorRole: string): void {
    if (from === to) {
      return;
    }

    const allowedTargets = this.validTransitions[from];

    // Check custom semantic invariant failures for custom exception reporting
    if (from === WalletState.CLOSED && to === WalletState.ACTIVE) {
      throw new InvalidStateTransitionException('Forbidden state transition: Cannot transition directly from CLOSED to ACTIVE.');
    }
    if (from === WalletState.ARCHIVED && to === WalletState.ACTIVE) {
      throw new InvalidStateTransitionException('Forbidden state transition: Cannot transition directly from ARCHIVED to ACTIVE without policy.');
    }
    if (from === WalletState.FROZEN && to === WalletState.CLOSED) {
      throw new InvalidStateTransitionException('Forbidden state transition: Cannot transition directly from FROZEN to CLOSED without Unfreezing first.');
    }
    if (from === WalletState.LOCKED && to === WalletState.ARCHIVED) {
      throw new InvalidStateTransitionException('Forbidden state transition: Cannot transition directly from LOCKED to ARCHIVED.');
    }

    if (!allowedTargets || !allowedTargets.includes(to)) {
      throw new InvalidStateTransitionException(
        `Invalid state transition: Cannot transition from state ${from} to state ${to}.`
      );
    }

    // Policy check for Archived to Reopened
    if (from === WalletState.ARCHIVED && to === WalletState.REOPENED) {
      if (!this.policy.isArchivedToReopenedAllowed(initiatorRole)) {
        throw new InvalidStateTransitionException(
          `Policy violation: Role ${initiatorRole} is unauthorized to reopen an archived wallet.`
        );
      }
    }
  }
}
