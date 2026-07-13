/**
 * @file WalletIsActiveSpecification.ts
 * @description Domain specification verifying if a wallet is in the active status.
 */

import { ISpecification } from './ISpecification.js';
import { IWalletData, WalletStatus } from '../../shared/types/WalletTypes.js';

export class WalletIsActiveSpecification implements ISpecification<IWalletData> {
  public isSatisfiedBy(wallet: IWalletData): boolean {
    return wallet.status === WalletStatus.ACTIVE;
  }
}
