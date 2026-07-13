/**
 * @file WalletCurrencyMatchSpecification.ts
 * @description Domain specification verifying if a wallet's currency matches the expected currency.
 */

import { ISpecification } from './ISpecification.js';
import { IWalletData } from '../../shared/types/WalletTypes.js';

export class WalletCurrencyMatchSpecification implements ISpecification<IWalletData, string> {
  public isSatisfiedBy(wallet: IWalletData, expectedCurrency?: string): boolean {
    if (!expectedCurrency) return true;
    return wallet.currency.toUpperCase() === expectedCurrency.toUpperCase();
  }
}
