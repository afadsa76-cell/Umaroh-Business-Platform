/**
 * @file IDomainEvent.ts
 * @description Domain event interface.
 */

export interface IDomainEvent {
  eventId: string;
  eventType: string;
  timestamp: Date;
  tenantId: string;
  data: unknown;
}
