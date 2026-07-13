/**
 * @file WalletException.ts
 * @description Base domain exception class for the Wallet Domain.
 * @responsibility Serves as the base class for all domain-specific exception types.
 */

import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class WalletException extends Error {
  public readonly code: WalletErrorCodes;
  public readonly timestamp: Date;

  constructor(message: string, code: WalletErrorCodes = WalletErrorCodes.BUSINESS_RULE_VIOLATION) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
