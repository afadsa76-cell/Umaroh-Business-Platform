/**
 * @file WalletTypes.ts
 * @description Core TypeScript types, interfaces, and enums for the Wallet Domain.
 * @responsibility Define type boundaries and domain-wide type contracts.
 */

/**
 * Wallet Status Enum
 * Represents the lifecycle states of a financial wallet.
 */
export enum WalletStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  FROZEN = 'FROZEN',
  LOCKED = 'LOCKED',
  ESCROW = 'ESCROW',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Transaction Type Enum
 * Represents the double-entry transactional classification.
 */
export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  TRANSFER = 'TRANSFER',
  FREEZE = 'FREEZE',
  UNFREEZE = 'UNFREEZE',
  RESERVE = 'RESERVE',
  RELEASE = 'RELEASE',
  COMMISSION_CREDIT = 'COMMISSION_CREDIT',
  REWARD_CREDIT = 'REWARD_CREDIT',
  ADJUSTMENT = 'ADJUSTMENT',
  REFUND = 'REFUND',
  SETTLEMENT = 'SETTLEMENT',
  ROLLBACK = 'ROLLBACK',
  REVERSE = 'REVERSE',
  MANUAL_CORRECTION = 'MANUAL_CORRECTION'
}

/**
 * Balance interface holding segmented balances
 */
export interface IBalance {
  availableBalance: number;
  pendingBalance: number;
  frozenBalance: number;
  escrowBalance: number;
  commissionBalance: number;
  rewardBalance: number;
  adjustmentBalance: number;
  totalBalance: number;
}

/**
 * Wallet Data interface representing the wallet document database model
 */
export interface IWalletData {
  uid: string;
  tenantId: string;
  organizationId: string;
  currency: string;
  status: WalletStatus;
  balances: IBalance;
  checksum: string;
  createdAt: Date;
  updatedAt: Date;
}
