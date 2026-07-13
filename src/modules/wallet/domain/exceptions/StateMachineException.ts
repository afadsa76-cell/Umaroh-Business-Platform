/**
 * @file StateMachineException.ts
 * @description Exception thrown when a state machine transition or initialization error occurs.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class StateMachineException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.BUSINESS_RULE_VIOLATION);
  }
}
