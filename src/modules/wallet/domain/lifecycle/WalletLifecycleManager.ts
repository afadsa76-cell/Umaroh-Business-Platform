/**
 * @file WalletLifecycleManager.ts
 * @description Coordinate transition execution and event dispatching across state boundary changes.
 */

import { WalletAggregate } from '../aggregate/WalletAggregate.js';
import { WalletState } from '../state/WalletState.js';
import { WalletLifecycleResult } from './WalletLifecycleResult.js';
import { DomainEventPublisher } from '../events/DomainEventPublisher.js';
import { LifecycleException } from '../exceptions/LifecycleException.js';

export class WalletLifecycleManager {
  private readonly publisher = DomainEventPublisher.getInstance();

  /**
   * Executes a robust state transition on the aggregate root and dispatches events.
   */
  public async executeTransition(
    aggregate: WalletAggregate,
    targetState: WalletState,
    initiatorRole: string,
    initiator: string,
    reason: string,
    correlationId: string
  ): Promise<WalletLifecycleResult> {
    try {
      // Perform the transition on the aggregate
      const result = aggregate.transitionTo(targetState, initiatorRole, initiator, reason, correlationId);

      // Publish collected uncommitted events to internal dispatcher
      const uncommittedEvents = aggregate.getUncommittedEvents();
      for (const event of uncommittedEvents) {
        await this.publisher.publish(event, {
          correlationId,
          initiator,
          tenantId: aggregate.getTenantId(),
          timestamp: new Date()
        });
      }

      // Clear uncommitted events since they have been published
      aggregate.clearUncommittedEvents();

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new LifecycleException(`Lifecycle execution failed: ${String(error)}`);
    }
  }
}
