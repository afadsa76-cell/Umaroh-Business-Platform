/**
 * @file AggregateVersionException.ts
 * @description Exception thrown when a version is invalid or non-monotonic.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class AggregateVersionException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.CONCURRENCY_CONFLICT);
  }
}
