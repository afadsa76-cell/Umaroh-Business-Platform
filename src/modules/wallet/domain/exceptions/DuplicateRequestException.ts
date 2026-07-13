/**
 * @file DuplicateRequestException.ts
 * @description Exception thrown when a duplicate reference or idempotent request is detected.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class DuplicateRequestException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.DUPLICATE_REQUEST);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
