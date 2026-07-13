/**
 * @file InvalidStateTransitionException.ts
 * @description Exception thrown when a wallet attempts an illegal status transition.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class InvalidStateTransitionException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.BUSINESS_RULE_VIOLATION);
  }
}
