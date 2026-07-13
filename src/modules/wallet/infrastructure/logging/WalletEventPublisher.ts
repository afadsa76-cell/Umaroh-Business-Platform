/**
 * @file WalletEventPublisher.ts
 * @description Google Cloud Pub/Sub implementation of the IWalletEventPublisher.
 * @responsibility Publish Wallet Domain Events to Gcp Pub/Sub channels.
 * 
 * TODO: Support dynamic dead-letter queuing on network partition events.
 */

import { IWalletEventPublisher, IDomainEvent } from '../../domain/events/IWalletEventPublisher.js';

export class WalletEventPublisher implements IWalletEventPublisher {
  private readonly pubSubClient: unknown;

  /**
   * @constructor
   * @param pubSubClient - Injected GCP PubSub client configuration context.
   */
  constructor(pubSubClient: unknown) {
    this.pubSubClient = pubSubClient;
  }

  // #region Methods
  public async publish(event: IDomainEvent): Promise<void> {
    console.log(this.pubSubClient, event);
    throw new Error("Not implemented.");
  }
  // #endregion
}
