/**
 * @file TransactionRollbackException.ts
 * @description Exception thrown when a transaction is explicitly rolled back.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class TransactionRollbackException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.TRANSACTION_ROLLBACK);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
