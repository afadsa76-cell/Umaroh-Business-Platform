/**
 * @file TransactionRetryExceededException.ts
 * @description Exception thrown when a transaction has exceeded the maximum retry count.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class TransactionRetryExceededException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.TRANSACTION_RETRY_EXCEEDED);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
