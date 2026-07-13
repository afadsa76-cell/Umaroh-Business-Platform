/**
 * @file AggregateInvariantException.ts
 * @description Exception thrown when a wallet invariant is violated.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class AggregateInvariantException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.BUSINESS_RULE_VIOLATION);
  }
}
