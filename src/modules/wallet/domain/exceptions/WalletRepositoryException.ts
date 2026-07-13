/**
 * @file WalletRepositoryException.ts
 * @description Exception thrown when low-level storage or database errors occur.
 * @responsibility Wrap infrastructure-specific exceptions into domain-digestible terms.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class WalletRepositoryException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.REPOSITORY_ERROR);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
