/**
 * @file IDomainEventDispatcher.ts
 * @description Interface defining the contract for registering and dispatching domain events.
 */

import { IDomainEvent } from './IDomainEvent.js';

export interface IDomainEventDispatcher {
  register<T extends IDomainEvent>(eventType: string, handler: (event: T) => void | Promise<void>): void;
  dispatch(event: IDomainEvent): Promise<void>;
}
