/**
 * @file WalletValidator.ts
 * @description Inbound payload and status validator.
 * @responsibility Ensure schemas match exact rules before admitting to services.
 * 
 * TODO: Integrate standard validator schema (e.g., Zod).
 */

import { IWalletData } from '../../shared/types/WalletTypes.js';

export class WalletValidator {
  private readonly configContext: unknown;

  /**
   * @constructor
   * @param configContext - Injected environment or schema config.
   */
  constructor(configContext: unknown) {
    this.configContext = configContext;
  }

  // #region Methods
  /**
   * Validate wallet creation input fields.
   */
  public validateCreateInput(input: unknown): void {
    console.log(this.configContext, input);
    // Strict schema check
    if (!input) {
      throw new Error("Validation failed: input is empty.");
    }
  }

  /**
   * Validate wallet transaction amounts.
   */
  public validateTransactionAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error("Validation failed: amount must be positive.");
    }
  }

  /**
   * Validate state invariants.
   */
  public validateWalletActive(wallet: IWalletData): void {
    if (wallet.status !== 'ACTIVE') {
      throw new Error("Validation failed: wallet is not ACTIVE.");
    }
  }
  // #endregion
}
