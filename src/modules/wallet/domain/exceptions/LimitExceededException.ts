/**
 * @file LimitExceededException.ts
 * @description Exception thrown when a transaction exceeds defined single, daily, or monthly limits.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class LimitExceededException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.LIMIT_EXCEEDED);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
