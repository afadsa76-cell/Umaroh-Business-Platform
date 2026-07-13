/**
 * @file RepositoryConflictException.ts
 * @description Exception thrown on optimistic locking or data collision in low-level storage.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class RepositoryConflictException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.CONCURRENCY_CONFLICT);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
