/**
 * @file TransactionConflictException.ts
 * @description Exception thrown when a transaction conflict (e.g. optimistic concurrency error) is detected.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class TransactionConflictException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.TRANSACTION_CONFLICT);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
