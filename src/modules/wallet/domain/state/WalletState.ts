/**
 * @file WalletState.ts
 * @description Domain enum representing all 9 valid lifecycle states of a wallet.
 */

export enum WalletState {
  NEW = 'NEW',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  LOCKED = 'LOCKED',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
  REOPENED = 'REOPENED'
}
