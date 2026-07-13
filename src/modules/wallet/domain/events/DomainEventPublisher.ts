/**
 * @file DomainEventPublisher.ts
 * @description Facade managing matching, wrapping, persisting, and dispatching raised domain events.
 */

import { IDomainEvent } from './IDomainEvent.js';
import { DomainEventDispatcher } from './DomainEventDispatcher.js';
import { DomainEventStore } from './DomainEventStore.js';
import { DomainEventEnvelope } from './DomainEventEnvelope.js';
import { DomainEventMetadata } from './DomainEventMetadata.js';

export class DomainEventPublisher {
  private static instance: DomainEventPublisher;
  private readonly dispatcher: DomainEventDispatcher;
  private readonly store: DomainEventStore;

  private constructor() {
    this.dispatcher = DomainEventDispatcher.getInstance();
    this.store = DomainEventStore.getInstance();
  }

  public static getInstance(): DomainEventPublisher {
    if (!DomainEventPublisher.instance) {
      DomainEventPublisher.instance = new DomainEventPublisher();
    }
    return DomainEventPublisher.instance;
  }

  public async publish(event: IDomainEvent, metadata?: DomainEventMetadata): Promise<void> {
    const meta: DomainEventMetadata = metadata || {
      correlationId: `corr_${Math.random().toString(36).substring(2, 11)}`,
      initiator: 'system',
      tenantId: event.tenantId,
      timestamp: new Date()
    };

    const envelope: DomainEventEnvelope = {
      id: `env_${Math.random().toString(36).substring(2, 11)}`,
      event,
      metadata: meta
    };

    // Store in internal event store
    this.store.append(envelope);

    // Dispatch to internal handlers
    await this.dispatcher.dispatch(event);
  }
}
