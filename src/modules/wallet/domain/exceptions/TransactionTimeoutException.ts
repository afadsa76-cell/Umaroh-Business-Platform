/**
 * @file TransactionTimeoutException.ts
 * @description Exception thrown when a transaction exceeds its allocated time limit.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class TransactionTimeoutException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.TRANSACTION_TIMEOUT);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
