/**
 * @file IdempotencyValidator.ts
 * @description Validator class checking if the transaction idempotency key is fresh and has not been already completed or pending execution.
 */

import { IValidationRule } from '../../application/validation/IValidationRule.js';
import { ValidationContext, ValidationStage } from '../../application/validation/ValidationContext.js';
import { IIdempotencyValidator } from './IIdempotencyValidator.js';
import { IIdempotencyRepository } from '../repositories/IIdempotencyRepository.js';
import { IdempotencyRepository } from '../../infrastructure/repositories/IdempotencyRepository.js';
import { WalletIdempotencySpecification } from '../specifications/WalletIdempotencySpecification.js';

export class IdempotencyValidator implements IIdempotencyValidator, IValidationRule {
  public readonly name = 'IdempotencyValidator';
  public readonly stage = ValidationStage.IDEMPOTENCY;

  private readonly idempotencyRepo: IIdempotencyRepository;
  private readonly idempotencySpec = new WalletIdempotencySpecification();

  /**
   * @constructor
   * @param idempotencyRepo - Injected IdempotencyRepository (Constructor Dependency Injection).
   */
  constructor(idempotencyRepo: IIdempotencyRepository = new IdempotencyRepository()) {
    this.idempotencyRepo = idempotencyRepo;
  }

  /**
   * Validates if the idempotency key is fresh.
   */
  public async validate(context: ValidationContext): Promise<void> {
    const req = context.request;
    const key = req.idempotencyKey;

    if (!key) return;

    const record = await this.idempotencyRepo.getKey(key);
    if (record) {
      // Key exists in db
      const isFresh = this.idempotencySpec.isSatisfiedBy(key, [record.key]);
      
      // If the specification is NOT satisfied, or the existing key is COMPLETED or PENDING, fail
      if (!isFresh || record.status === 'COMPLETED' || record.status === 'PENDING') {
        context.addError(
          this.stage,
          this.name,
          `Idempotent Request Conflict: The idempotency key '${key}' has already been processed or is currently in progress (Status: ${record.status}).`,
          'CRITICAL'
        );
        context.shortCircuit = true;
      }
    }
  }
}
