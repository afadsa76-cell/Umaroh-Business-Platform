/**
 * @file RepositoryErrorTranslator.ts
 * @description Standardize database storage errors into strict domain-specific repository exceptions.
 */

import { WalletRepositoryException } from '../../domain/exceptions/WalletRepositoryException.js';
import { RepositoryTimeoutException } from '../../domain/exceptions/RepositoryTimeoutException.js';
import { RepositoryConflictException } from '../../domain/exceptions/RepositoryConflictException.js';
import { RepositoryUnavailableException } from '../../domain/exceptions/RepositoryUnavailableException.js';
import { RepositoryValidationException } from '../../domain/exceptions/RepositoryValidationException.js';

export function translateRepositoryError(error: unknown): never {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errLower = errMsg.toLowerCase();

  if (errLower.includes('timeout') || errLower.includes('deadline-exceeded')) {
    throw new RepositoryTimeoutException(`Storage operation timeout: ${errMsg}`);
  }
  if (
    errLower.includes('concurrency') || 
    errLower.includes('conflict') || 
    errLower.includes('aborted') || 
    errLower.includes('failed-precondition') ||
    errLower.includes('lock')
  ) {
    throw new RepositoryConflictException(`Storage conflict or locking failure: ${errMsg}`);
  }
  if (
    errLower.includes('unavailable') || 
    errLower.includes('offline') || 
    errLower.includes('network') || 
    errLower.includes('could not reach') ||
    errLower.includes('quota')
  ) {
    throw new RepositoryUnavailableException(`Storage currently offline or resource exhausted: ${errMsg}`);
  }
  if (
    errLower.includes('validation') || 
    errLower.includes('invalid') || 
    errLower.includes('schema') || 
    errLower.includes('required') ||
    errLower.includes('type')
  ) {
    throw new RepositoryValidationException(`Storage data format validation failed: ${errMsg}`);
  }

  throw new WalletRepositoryException(`Storage exception encountered: ${errMsg}`);
}
