/**
 * @file PermissionDeniedException.ts
 * @description Exception thrown when a user lacks authorization or permissions to execute a transaction.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class PermissionDeniedException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.PERMISSION_DENIED);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
