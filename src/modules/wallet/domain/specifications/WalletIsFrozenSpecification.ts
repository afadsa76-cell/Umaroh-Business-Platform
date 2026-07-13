/**
 * @file WalletIsFrozenSpecification.ts
 * @description Domain specification verifying if a wallet is frozen.
 */

import { ISpecification } from './ISpecification.js';
import { IWalletData, WalletStatus } from '../../shared/types/WalletTypes.js';

export class WalletIsFrozenSpecification implements ISpecification<IWalletData> {
  public isSatisfiedBy(wallet: IWalletData): boolean {
    return wallet.status === WalletStatus.FROZEN;
  }
}
