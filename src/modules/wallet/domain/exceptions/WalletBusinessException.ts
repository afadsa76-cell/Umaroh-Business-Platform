/**
 * @file WalletBusinessException.ts
 * @description Exception thrown when core wallet logic business invariants are breached.
 * @responsibility Handle business rules violation such as insufficient available balance.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class WalletBusinessException extends WalletException {
  constructor(message: string, code: WalletErrorCodes = WalletErrorCodes.BUSINESS_RULE_VIOLATION) {
    super(message, code);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
