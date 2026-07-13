/**
 * @file PolicyViolationException.ts
 * @description Exception thrown when a wallet transaction violates core domain policies.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class PolicyViolationException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.POLICY_VIOLATION);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
