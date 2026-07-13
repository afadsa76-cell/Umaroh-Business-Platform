/**
 * @file DomainEventEnvelope.ts
 * @description Envelope interface wrapping domain events with tracing metadata.
 */

import { IDomainEvent } from './IDomainEvent.js';
import { DomainEventMetadata } from './DomainEventMetadata.js';

export interface DomainEventEnvelope<T extends IDomainEvent = IDomainEvent> {
  id: string;
  event: T;
  metadata: DomainEventMetadata;
}
