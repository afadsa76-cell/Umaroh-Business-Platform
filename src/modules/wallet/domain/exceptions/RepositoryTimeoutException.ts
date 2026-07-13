/**
 * @file RepositoryTimeoutException.ts
 * @description Exception thrown when low-level storage operations time out.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class RepositoryTimeoutException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.REPOSITORY_ERROR);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
