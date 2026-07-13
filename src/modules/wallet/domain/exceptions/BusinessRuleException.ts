/**
 * @file BusinessRuleException.ts
 * @description Exception thrown when core business policies or rules are breached.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class BusinessRuleException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.BUSINESS_RULE_VIOLATION);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
