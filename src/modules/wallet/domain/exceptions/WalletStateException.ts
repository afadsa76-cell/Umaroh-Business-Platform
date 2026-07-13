/**
 * @file WalletStateException.ts
 * @description Exception thrown when a wallet is in an invalid state for the requested transaction.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class WalletStateException extends WalletException {
  constructor(message: string, code: WalletErrorCodes = WalletErrorCodes.WALLET_CLOSED) {
    super(message, code);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
