/**
 * @file WalletConcurrencyException.ts
 * @description Exception thrown when dynamic transaction write collisions occur.
 * @responsibility Handle and signal lock contention and version mismatch exceptions.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class WalletConcurrencyException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.CONCURRENCY_CONFLICT);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
