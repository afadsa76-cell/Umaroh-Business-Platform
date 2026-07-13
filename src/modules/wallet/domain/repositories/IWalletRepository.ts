/**
 * @file IWalletRepository.ts
 * @description Wallet Repository interface defining port boundary with standard base operations.
 */

import { IWalletData } from '../../shared/types/WalletTypes.js';

export interface IWalletRepository {
  // Existing operations
  getById(uid: string): Promise<IWalletData | null>;
  save(wallet: IWalletData): Promise<void>;
  updateBalances(uid: string, balances: IWalletData['balances']): Promise<void>;
  exists(uid: string): Promise<boolean>;

  // Standard 10 operations required by Sprint 2B.2
  create(wallet: IWalletData): Promise<void>;
  findById(id: string): Promise<IWalletData | null>;
  findByReference(reference: string): Promise<IWalletData[]>;
  findAll(): Promise<IWalletData[]>;
  update(id: string, updates: Partial<IWalletData>): Promise<void>;
  softDelete(id: string): Promise<void>;
  lock(id: string): Promise<void>;
  unlock(id: string): Promise<void>;
  count(): Promise<number>;
}
