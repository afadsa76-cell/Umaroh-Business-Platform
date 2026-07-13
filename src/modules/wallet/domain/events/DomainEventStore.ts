/**
 * @file DomainEventStore.ts
 * @description In-memory store keeping historical records of all event envelopes for auditing.
 */

import { DomainEventEnvelope } from './DomainEventEnvelope.js';

export class DomainEventStore {
  private static instance: DomainEventStore;
  private readonly store: DomainEventEnvelope[] = [];

  private constructor() {}

  public static getInstance(): DomainEventStore {
    if (!DomainEventStore.instance) {
      DomainEventStore.instance = new DomainEventStore();
    }
    return DomainEventStore.instance;
  }

  public append(envelope: DomainEventEnvelope): void {
    this.store.push(envelope);
  }

  public getAll(): DomainEventEnvelope[] {
    return [...this.store];
  }

  public clear(): void {
    this.store.length = 0;
  }
}
