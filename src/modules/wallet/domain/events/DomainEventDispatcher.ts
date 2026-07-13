/**
 * @file DomainEventDispatcher.ts
 * @description In-memory dispatcher matching registered handlers and executing them concurrently.
 */

import { IDomainEventDispatcher } from './IDomainEventDispatcher.js';
import { IDomainEvent } from './IDomainEvent.js';

export class DomainEventDispatcher implements IDomainEventDispatcher {
  private static instance: DomainEventDispatcher;
  private readonly handlers: Map<string, Array<(event: IDomainEvent) => void | Promise<void>>> = new Map();

  private constructor() {}

  public static getInstance(): DomainEventDispatcher {
    if (!DomainEventDispatcher.instance) {
      DomainEventDispatcher.instance = new DomainEventDispatcher();
    }
    return DomainEventDispatcher.instance;
  }

  public register<T extends IDomainEvent>(eventType: string, handler: (event: T) => void | Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    // Cast handler to (event: IDomainEvent) after runtime check/ascription
    this.handlers.get(eventType)!.push((event: IDomainEvent) => handler(event as T));
  }

  public async dispatch(event: IDomainEvent): Promise<void> {
    const list = this.handlers.get(event.eventType);
    if (list) {
      await Promise.all(list.map(h => h(event)));
    }
  }

  public clear(): void {
    this.handlers.clear();
  }
}
