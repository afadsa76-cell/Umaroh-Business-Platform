/**
 * @file RepositoryValidationException.ts
 * @description Exception thrown when data schema validation fails at the repository boundary.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class RepositoryValidationException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.VALIDATION_FAILED);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
