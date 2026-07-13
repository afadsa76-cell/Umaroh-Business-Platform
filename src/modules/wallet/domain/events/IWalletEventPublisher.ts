/**
 * @file IWalletEventPublisher.ts
 * @description Event Publisher interface for publishing Domain Events.
 * @responsibility Port defining outbox publish operations for decoupled subscriber alerting.
 */

import { IDomainEvent } from './IDomainEvent.js';

export type { IDomainEvent };

export interface IWalletEventPublisher {
  /**
   * Publish a wallet domain event outbox.
   */
  publish(event: IDomainEvent): Promise<void>;
}
