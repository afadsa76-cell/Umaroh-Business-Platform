/**
 * @file WalletValidationException.ts
 * @description Exception thrown when validation fails on any Wallet operations.
 * @responsibility Halt execution and report data input schema or state validations.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class WalletValidationException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.VALIDATION_FAILED);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
