/**
 * @file AggregateConflictException.ts
 * @description Exception thrown when there is a conflict in the aggregate state or concurrency.
 */

import { WalletException } from './WalletException.js';
import { WalletErrorCodes } from '../../shared/constants/WalletErrorCodes.js';

export class AggregateConflictException extends WalletException {
  constructor(message: string) {
    super(message, WalletErrorCodes.CONCURRENCY_CONFLICT);
  }
}
