/**
 * @file WalletValidator.ts
 * @description The unified gatekeeper orchestrating the entire Validation & Policy Pipeline, translating errors to domain-specific exception types.
 */

import { IWalletValidator } from './IWalletValidator.js';
import { ValidationContext, ValidationStage, IWalletTransactionRequest } from '../../application/validation/ValidationContext.js';
import { ValidationPipeline } from '../../application/validation/ValidationPipeline.js';
import { ValidationReport } from '../../application/validation/IValidationPipeline.js';

// Import All Pipeline Rules
import { WalletRequestValidator } from './WalletRequestValidator.js';
import { PermissionValidator } from './PermissionValidator.js';
import { WalletStateValidator } from './WalletStateValidator.js';
import { CurrencyValidator } from './CurrencyValidator.js';
import { BalanceValidator } from './BalanceValidator.js';
import { WalletLimitValidator } from './WalletLimitValidator.js';
import { VersionValidator } from './VersionValidator.js';
import { IdempotencyValidator } from './IdempotencyValidator.js';
import { RiskValidator } from './RiskValidator.js';
import { ReferenceValidator } from './ReferenceValidator.js';
import { DuplicateRequestValidator } from './DuplicateRequestValidator.js';
import { BusinessPolicyValidator } from './BusinessPolicyValidator.js';

// Import Domain Exceptions
import { ValidationException } from '../exceptions/ValidationException.js';
import { PolicyViolationException } from '../exceptions/PolicyViolationException.js';
import { CurrencyMismatchException } from '../exceptions/CurrencyMismatchException.js';
import { WalletStateException } from '../exceptions/WalletStateException.js';
import { PermissionDeniedException } from '../exceptions/PermissionDeniedException.js';
import { DuplicateRequestException } from '../exceptions/DuplicateRequestException.js';
import { RiskDetectedException } from '../exceptions/RiskDetectedException.js';
import { LimitExceededException } from '../exceptions/LimitExceededException.js';
import { BusinessRuleException } from '../exceptions/BusinessRuleException.js';

// Import Repositories
import { IWalletRepository } from '../repositories/IWalletRepository.js';
import { WalletRepository } from '../../infrastructure/repositories/WalletRepository.js';
import { IIdempotencyRepository } from '../repositories/IIdempotencyRepository.js';
import { IdempotencyRepository } from '../../infrastructure/repositories/IdempotencyRepository.js';

export class WalletValidator implements IWalletValidator {
  private readonly pipeline: ValidationPipeline;

  /**
   * @constructor
   * @param walletRepo - Injected WalletRepository (Constructor Dependency Injection).
   * @param idempotencyRepo - Injected IdempotencyRepository (Constructor Dependency Injection).
   */
  constructor(
    walletRepo: IWalletRepository = new WalletRepository(),
    idempotencyRepo: IIdempotencyRepository = new IdempotencyRepository()
  ) {
    this.pipeline = new ValidationPipeline();

    // Register all rules in the strict order required by SPRINT_2B.4
    this.pipeline.registerRule(new WalletRequestValidator());
    this.pipeline.registerRule(new ReferenceValidator());
    this.pipeline.registerRule(new PermissionValidator());
    this.pipeline.registerRule(new WalletStateValidator(walletRepo));
    this.pipeline.registerRule(new CurrencyValidator());
    this.pipeline.registerRule(new BalanceValidator());
    this.pipeline.registerRule(new WalletLimitValidator());
    this.pipeline.registerRule(new VersionValidator());
    this.pipeline.registerRule(new IdempotencyValidator(idempotencyRepo));
    this.pipeline.registerRule(new DuplicateRequestValidator());
    this.pipeline.registerRule(new RiskValidator());
    this.pipeline.registerRule(new BusinessPolicyValidator());
  }

  /**
   * Evaluates the full pipeline against the provided ValidationContext.
   * If there are validation failures, maps and throws the fine-grained domain exception.
   */
  public async validate(context: ValidationContext): Promise<void> {
    const result = await this.pipeline.execute(context);
    
    if (!result.success) {
      // Find the most severe error to determine the exact exception to throw
      const errors = context.errors;
      if (errors.length === 0) {
        throw new BusinessRuleException('Validation failed with unknown errors.');
      }

      // Prioritize CRITICAL/ERROR severities and map them based on stage
      const priorityError = errors.find(e => e.severity === 'CRITICAL' || e.severity === 'ERROR') || errors[0];

      switch (priorityError.stage) {
        case ValidationStage.REQUEST_STRUCTURE:
          throw new ValidationException(priorityError.message);

        case ValidationStage.AUTHENTICATION:
        case ValidationStage.AUTHORIZATION:
        case ValidationStage.PERMISSION:
          throw new PermissionDeniedException(priorityError.message);

        case ValidationStage.WALLET_EXISTS:
        case ValidationStage.WALLET_STATE:
          throw new WalletStateException(priorityError.message);

        case ValidationStage.CURRENCY:
          throw new CurrencyMismatchException(priorityError.message);

        case ValidationStage.LIMIT:
          if (priorityError.rule === 'BalanceValidator') {
            throw new LimitExceededException(priorityError.message);
          }
          throw new LimitExceededException(priorityError.message);

        case ValidationStage.VERSION:
          throw new WalletStateException(priorityError.message); // Concurrency state conflict

        case ValidationStage.IDEMPOTENCY:
          throw new DuplicateRequestException(priorityError.message);

        case ValidationStage.RISK:
          throw new RiskDetectedException(priorityError.message);

        case ValidationStage.BUSINESS_POLICY:
          throw new PolicyViolationException(priorityError.message);

        default:
          throw new BusinessRuleException(priorityError.message);
      }
    }
  }

  /**
   * Facade helper to validate an incoming request object directly, returning a detailed report.
   */
  public async validateRequest(
    request: IWalletTransactionRequest,
    metadataOverrides?: Record<string, unknown>
  ): Promise<ValidationReport> {
    const context = new ValidationContext(request);
    
    // Inject any overrides (e.g. mock rates, limits) into context metadata
    if (metadataOverrides) {
      for (const [key, value] of Object.entries(metadataOverrides)) {
        context.setMetadata(key, value);
      }
    }

    try {
      await this.validate(context);
    } catch (err) {
      console.warn(`[WalletValidator Facade] Validation exception was thrown:`, err);
    }

    return this.pipeline.generateReport(context);
  }
}
