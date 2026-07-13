/**
 * @file WalletConstants.ts
 * @description Operational and system constants for the Wallet Domain.
 * @responsibility Maintain a single source of truth for fixed business logic constants.
 */

export const WalletConstants = {
  /**
   * Minimum transaction allowed in IDR
   */
  MIN_TRANSACTION_AMOUNT_IDR: 1000,

  /**
   * Maximum daily withdraw limit in IDR
   */
  MAX_DAILY_WITHDRAW_LIMIT_IDR: 100000000,

  /**
   * Maximum weekly withdraw limit in IDR
   */
  MAX_WEEKLY_WITHDRAW_LIMIT_IDR: 500000000,

  /**
   * Threshold for automatic maker-checker verification bypass (Auto-Approval)
   */
  AUTO_APPROVAL_THRESHOLD_IDR: 10000000,

  /**
   * Key used for local encryption salts
   */
  CHECKSUM_SALT_KEY: 'UMAROH_WALLET_SECURE_SALT_2026',

  /**
   * Collections names in Firestore
   */
  FIRESTORE_COLLECTIONS: {
    WALLETS: 'wallets',
    LEDGERS: 'ledgers',
    JOURNALS: 'journals',
    SETTLEMENTS: 'settlements',
    AUDIT_LOGS: 'financial_audit_logs',
    IDEMPOTENCY_KEYS: 'idempotency_keys'
  }
} as const;
