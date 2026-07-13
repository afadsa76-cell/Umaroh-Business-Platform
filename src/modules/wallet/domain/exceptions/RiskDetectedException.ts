/**
 * @file RiskDetectedException.ts
 * @description Exception thrown when velocity checks or fraud indicators trigger risk detection.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class RiskDetectedException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.RISK_DETECTED);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
