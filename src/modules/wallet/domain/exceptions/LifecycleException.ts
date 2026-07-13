/**
 * @file LifecycleException.ts
 * @description Exception thrown when a wallet lifecycle management process fails.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class LifecycleException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.BUSINESS_RULE_VIOLATION);
  }
}
