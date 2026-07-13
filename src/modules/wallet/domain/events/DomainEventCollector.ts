/**
 * @file DomainEventCollector.ts
 * @description Accumulator for tracking uncommitted domain events produced during business processing.
 */

import { IDomainEvent } from './IDomainEvent.js';

export class DomainEventCollector {
  private events: IDomainEvent[] = [];

  public collect(event: IDomainEvent): void {
    this.events.push(event);
  }

  public getCollectedEvents(): IDomainEvent[] {
    return [...this.events];
  }

  public clear(): void {
    this.events = [];
  }
}
