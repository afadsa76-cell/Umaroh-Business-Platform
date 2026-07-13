/**
 * @file WalletSecurityException.ts
 * @description Exception thrown when any security breach or checksum mismatch is detected.
 * @responsibility Halt execution and immediately log security alert incidents.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class WalletSecurityException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.SECURITY_BREACH);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
