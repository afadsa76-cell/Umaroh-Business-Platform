/**
 * @file TransactionCancelledException.ts
 * @description Exception thrown when a transaction is explicitly cancelled before commitment.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class TransactionCancelledException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.TRANSACTION_CANCELLED);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
