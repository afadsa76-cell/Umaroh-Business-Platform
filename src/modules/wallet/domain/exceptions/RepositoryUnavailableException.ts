/**
 * @file RepositoryUnavailableException.ts
 * @description Exception thrown when low-level storage is offline or unreachable.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class RepositoryUnavailableException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.REPOSITORY_ERROR);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
