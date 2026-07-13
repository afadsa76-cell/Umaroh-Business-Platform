/**
 * @file CurrencyMismatchException.ts
 * @description Exception thrown when there is a currency mismatch between transacting wallets or requests.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class CurrencyMismatchException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.CURRENCY_MISMATCH);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
