/**
 * @file WalletDTO.ts
 * @description Inbound and outbound Data Transfer Objects for Wallet service interfaces.
 * @responsibility Decouple internal domain state models from external API structures.
 */

import { WalletStatus } from '../../shared/types/WalletTypes.js';

export interface WalletResponseDTO {
  uid: string;
  tenantId: string;
  currency: string;
  status: WalletStatus;
  availableBalance: number;
  pendingBalance: number;
  frozenBalance: number;
  totalBalance: number;
  updatedAt: string;
}

export interface DepositRequestDTO {
  uid: string;
  amount: number;
  currency: string;
  referenceNumber: string;
  clearingHouse: string;
  idempotencyKey: string;
}

export interface WithdrawRequestDTO {
  uid: string;
  amount: number;
  currency: string;
  referenceNumber: string;
  bankAccount: string;
  idempotencyKey: string;
}

export interface TransferRequestDTO {
  sourceUid: string;
  destinationUid: string;
  amount: number;
  currency: string;
  referenceNumber: string;
  idempotencyKey: string;
}
