/**
 * @file CurrencyValidator.ts
 * @description Validator class checking if transaction currencies comply with ISO-4217 and match the target wallet currencies.
 */

import { IValidationRule } from '../../application/validation/IValidationRule.js';
import { ValidationContext, ValidationStage } from '../../application/validation/ValidationContext.js';
import { ICurrencyValidator } from './ICurrencyValidator.js';
import { WalletCurrencyMatchSpecification } from '../specifications/WalletCurrencyMatchSpecification.js';

export class CurrencyValidator implements ICurrencyValidator, IValidationRule {
  public readonly name = 'CurrencyValidator';
  public readonly stage = ValidationStage.CURRENCY;
  
  private readonly currencyMatchSpec = new WalletCurrencyMatchSpecification();

  /**
   * Validates currency constraints across the request and cached wallets.
   */
  public validate(context: ValidationContext): void {
    const req = context.request;
    const requestCurrency = req.currency.toUpperCase();

    // 1. Basic ISO-4217 list of some standard supported currencies
    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'IDR', 'SGD', 'MYR', 'JPY', 'CNY', 'AUD', 'CAD'];
    if (!supportedCurrencies.includes(requestCurrency)) {
      context.addError(
        this.stage,
        this.name,
        `Unsupported or invalid ISO-4217 currency code: ${requestCurrency}`,
        'ERROR'
      );
      return;
    }

    // 2. Cross-check against cached wallets
    const wallets = context.getWallets();
    if (wallets.size === 0) {
      console.warn('[CurrencyValidator] No wallets found in context to perform currency matching.');
      return;
    }

    if (req.operationType === 'TRANSFER') {
      const sourceWallet = req.sourceUid ? context.getWallet(req.sourceUid) : undefined;
      const destWallet = req.destinationUid ? context.getWallet(req.destinationUid) : undefined;

      if (sourceWallet) {
        if (!this.currencyMatchSpec.isSatisfiedBy(sourceWallet, requestCurrency)) {
          context.addError(
            this.stage,
            this.name,
            `Currency mismatch: Source wallet currency ${sourceWallet.currency} does not match request currency ${requestCurrency}.`,
            'ERROR'
          );
        }
      }

      if (destWallet) {
        if (!this.currencyMatchSpec.isSatisfiedBy(destWallet, requestCurrency)) {
          context.addError(
            this.stage,
            this.name,
            `Currency mismatch: Destination wallet currency ${destWallet.currency} does not match request currency ${requestCurrency}.`,
            'ERROR'
          );
        }
      }

      if (sourceWallet && destWallet) {
        if (sourceWallet.currency.toUpperCase() !== destWallet.currency.toUpperCase()) {
          context.addError(
            this.stage,
            this.name,
            `Cross-currency transfer is not permitted: Source (${sourceWallet.currency}) and Destination (${destWallet.currency}) must match.`,
            'ERROR'
          );
        }
      }
    } else {
      // Deposit, withdraw, freeze, etc.
      const targetUid = req.uid || req.sourceUid;
      if (targetUid) {
        const targetWallet = context.getWallet(targetUid);
        if (targetWallet && !this.currencyMatchSpec.isSatisfiedBy(targetWallet, requestCurrency)) {
          context.addError(
            this.stage,
            this.name,
            `Currency mismatch: Target wallet currency ${targetWallet.currency} does not match request currency ${requestCurrency}.`,
            'ERROR'
          );
        }
      }
    }
  }
}
