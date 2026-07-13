/**
 * @file WalletEvents.ts
 * @description All 12 specified domain events for the Wallet aggregate.
 */

import { IDomainEvent } from './IDomainEvent.js';
import { IWalletData } from '../../shared/types/WalletTypes.js';

export class WalletCreatedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly eventType = 'WalletCreatedEvent';
  public readonly timestamp: Date;
  public readonly tenantId: string;
  public readonly data: { wallet: IWalletData };

  constructor(eventId: string, tenantId: string, wallet: IWalletData) {
    this.eventId = eventId;
    this.timestamp = new Date();
    this.tenantId = tenantId;
    this.data = { wallet };
  }
}

export class WalletActivatedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly eventType = 'WalletActivatedEvent';
  public readonly timestamp: Date;
  public readonly tenantId: string;
  public readonly data: { walletId: string; previousStatus: string };

  constructor(eventId: string, tenantId: string, walletId: string, previousStatus: string) {
    this.eventId = eventId;
    this.timestamp = new Date();
    this.tenantId = tenantId;
    this.data = { walletId, previousStatus };
  }
}

export class WalletSuspendedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly eventType = 'WalletSuspendedEvent';
  public readonly timestamp: Date;
  public readonly tenantId: string;
  public readonly data: { walletId: string; previousStatus: string };

  constructor(eventId: string, tenantId: string, walletId: string, previousStatus: string) {
    this.eventId = eventId;
    this.timestamp = new Date();
    this.tenantId = tenantId;
    this.data = { walletId, previousStatus };
  }
}

export class WalletFrozenEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly eventType = 'WalletFrozenEvent';
  public readonly timestamp: Date;
  public readonly tenantId: string;
  public readonly data: { walletId: string; previousStatus: string };

  constructor(eventId: string, tenantId: string, walletId: string, previousStatus: string) {
    this.eventId = eventId;
    this.timestamp = new Date();
    this.tenantId = tenantId;
    this.data = { walletId, previousStatus };
  }
}

export class WalletUnfrozenEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly eventType = 'WalletUnfrozenEvent';
  public readonly timestamp: Date;
  public readonly tenantId: string;
  public readonly data: { walletId: string; previousStatus: string };

  constructor(eventId: string, tenantId: string, walletId: string, previousStatus: string) {
    this.eventId = eventId;
    this.timestamp = new Date();
    this.tenantId = tenantId;
    this.data = { walletId, previousStatus };
  }
}

export class WalletLockedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly eventType = 'WalletLockedEvent';
  public readonly timestamp: Date;
  public readonly tenantId: string;
  public readonly data: { walletId: string; previousStatus: string };

  constructor(eventId: string, tenantId: string, walletId: string, previousStatus: string) {
    this.eventId = eventId;
    this.timestamp = new Date();
    this.tenantId = tenantId;
    this.data = { walletId, previousStatus };
  }
}

export class WalletUnlockedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly eventType = 'WalletUnlockedEvent';
  public readonly timestamp: Date;
  public readonly tenantId: string;
  public readonly data: { walletId: string; previousStatus: string };

  constructor(eventId: string, tenantId: string, walletId: string, previousStatus: string) {
    this.eventId = eventId;
    this.timestamp = new Date();
    this.tenantId = tenantId;
    this.data = { walletId, previousStatus };
  }
}

export class WalletClosedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly eventType = 'WalletClosedEvent';
  public readonly timestamp: Date;
  public readonly tenantId: string;
  public readonly data: { walletId: string; previousStatus: string };

  constructor(eventId: string, tenantId: string, walletId: string, previousStatus: string) {
    this.eventId = eventId;
    this.timestamp = new Date();
    this.tenantId = tenantId;
    this.data = { walletId, previousStatus };
  }
}

export class WalletArchivedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly eventType = 'WalletArchivedEvent';
  public readonly timestamp: Date;
  public readonly tenantId: string;
  public readonly data: { walletId: string; previousStatus: string };

  constructor(eventId: string, tenantId: string, walletId: string, previousStatus: string) {
    this.eventId = eventId;
    this.timestamp = new Date();
    this.tenantId = tenantId;
    this.data = { walletId, previousStatus };
  }
}

export class WalletReopenedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly eventType = 'WalletReopenedEvent';
  public readonly timestamp: Date;
  public readonly tenantId: string;
  public readonly data: { walletId: string; previousStatus: string };

  constructor(eventId: string, tenantId: string, walletId: string, previousStatus: string) {
    this.eventId = eventId;
    this.timestamp = new Date();
    this.tenantId = tenantId;
    this.data = { walletId, previousStatus };
  }
}

export class WalletBalanceReservedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly eventType = 'WalletBalanceReservedEvent';
  public readonly timestamp: Date;
  public readonly tenantId: string;
  public readonly data: { walletId: string; amount: number };

  constructor(eventId: string, tenantId: string, walletId: string, amount: number) {
    this.eventId = eventId;
    this.timestamp = new Date();
    this.tenantId = tenantId;
    this.data = { walletId, amount };
  }
}

export class WalletBalanceReleasedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly eventType = 'WalletBalanceReleasedEvent';
  public readonly timestamp: Date;
  public readonly tenantId: string;
  public readonly data: { walletId: string; amount: number };

  constructor(eventId: string, tenantId: string, walletId: string, amount: number) {
    this.eventId = eventId;
    this.timestamp = new Date();
    this.tenantId = tenantId;
    this.data = { walletId, amount };
  }
}
