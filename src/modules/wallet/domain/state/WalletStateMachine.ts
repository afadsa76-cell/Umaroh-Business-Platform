/**
 * @file WalletStateMachine.ts
 * @description Domain State Machine encapsulating transitions and raising domain events.
 */

import { WalletState } from './WalletState.js';
import { WalletStateTransitionValidator } from './WalletStateTransitionValidator.js';
import { IDomainEvent } from '../events/IDomainEvent.js';
import {
  WalletActivatedEvent,
  WalletSuspendedEvent,
  WalletFrozenEvent,
  WalletUnfrozenEvent,
  WalletLockedEvent,
  WalletUnlockedEvent,
  WalletClosedEvent,
  WalletArchivedEvent,
  WalletReopenedEvent
} from '../events/WalletEvents.js';

export class WalletStateMachine {
  private readonly validator = new WalletStateTransitionValidator();
  private currentState: WalletState;

  constructor(initialState: WalletState) {
    this.currentState = initialState;
  }

  public getCurrentState(): WalletState {
    return this.currentState;
  }

  public transition(to: WalletState, initiatorRole: string, walletId: string, tenantId: string): IDomainEvent[] {
    const from = this.currentState;
    if (from === to) {
      return [];
    }

    // Validate the transition
    this.validator.validateTransition(from, to, initiatorRole);

    // Update state
    this.currentState = to;

    // Generate corresponding domain events
    const eventId = `evt_${Math.random().toString(36).substring(2, 11)}`;
    const events: IDomainEvent[] = [];

    switch (to) {
      case WalletState.ACTIVE:
        if (from === WalletState.FROZEN) {
          events.push(new WalletUnfrozenEvent(eventId, tenantId, walletId, from));
        } else if (from === WalletState.LOCKED) {
          events.push(new WalletUnlockedEvent(eventId, tenantId, walletId, from));
        } else {
          events.push(new WalletActivatedEvent(eventId, tenantId, walletId, from));
        }
        break;

      case WalletState.FROZEN:
        events.push(new WalletFrozenEvent(eventId, tenantId, walletId, from));
        break;

      case WalletState.LOCKED:
        events.push(new WalletLockedEvent(eventId, tenantId, walletId, from));
        break;

      case WalletState.SUSPENDED:
        events.push(new WalletSuspendedEvent(eventId, tenantId, walletId, from));
        break;

      case WalletState.CLOSED:
        events.push(new WalletClosedEvent(eventId, tenantId, walletId, from));
        break;

      case WalletState.ARCHIVED:
        events.push(new WalletArchivedEvent(eventId, tenantId, walletId, from));
        break;

      case WalletState.REOPENED:
        events.push(new WalletReopenedEvent(eventId, tenantId, walletId, from));
        break;
    }

    return events;
  }
}
