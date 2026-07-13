/**
 * @file ValidationException.ts
 * @description Exception thrown when requests fail structural or business validation.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class ValidationException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.VALIDATION_FAILED);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
