/**
 * @file DomainEventMetadata.ts
 * @description Type definitions for tracking and audit metadata associated with domain events.
 */

export interface DomainEventMetadata {
  correlationId: string;
  causationId?: string;
  initiator: string;
  tenantId: string;
  timestamp: Date;
}
