/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PORTAL UMAROH ENTERPRISE - RUNTIME FEATURE FLAGS MANAGER
 * Role: Principal Firebase Architect & Security Auditor
 * 
 * Manages feature flags for zero-downtime cutover windows:
 * - MIGRATION_MODE
 * - READ_ONLY_MODE
 * - LOCK_NEW_REGISTRATION
 * - LOCK_FINANCIAL_TRANSACTION
 * - LOCK_BOOKING
 */

export interface SystemFeatureFlags {
  MIGRATION_MODE: boolean;
  READ_ONLY_MODE: boolean;
  LOCK_NEW_REGISTRATION: boolean;
  LOCK_FINANCIAL_TRANSACTION: boolean;
  LOCK_BOOKING: boolean;
}

export class FeatureFlagsManager {
  private static instance: FeatureFlagsManager;

  private flags: SystemFeatureFlags = {
    MIGRATION_MODE: false,
    READ_ONLY_MODE: false,
    LOCK_NEW_REGISTRATION: false,
    LOCK_FINANCIAL_TRANSACTION: false,
    LOCK_BOOKING: false,
  };

  private constructor() {
    this.loadFromEnvironment();
  }

  public static getInstance(): FeatureFlagsManager {
    const globalKey = '__feature_flags_manager_singleton__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FeatureFlagsManager();
    }
    return (globalThis as any)[globalKey];
  }

  private loadFromEnvironment(): void {
    // Read optional environment variables or fallback to defaults
    const env = typeof process !== 'undefined' ? process.env : {};
    this.flags.MIGRATION_MODE = env.MIGRATION_MODE === 'true';
    this.flags.READ_ONLY_MODE = env.READ_ONLY_MODE === 'true';
    this.flags.LOCK_NEW_REGISTRATION = env.LOCK_NEW_REGISTRATION === 'true';
    this.flags.LOCK_FINANCIAL_TRANSACTION = env.LOCK_FINANCIAL_TRANSACTION === 'true';
    this.flags.LOCK_BOOKING = env.LOCK_BOOKING === 'true';

    // Auto-cascade if migration or read-only is initiated
    if (this.flags.MIGRATION_MODE || this.flags.READ_ONLY_MODE) {
      this.initiateReadonlyMigrationLocks();
    }
  }

  /**
   * Automatically locks mutation operations during the migration window while retaining read permissions
   */
  public initiateReadonlyMigrationLocks(): void {
    this.flags.READ_ONLY_MODE = true;
    this.flags.LOCK_BOOKING = true;
    this.flags.LOCK_FINANCIAL_TRANSACTION = true;
    this.flags.LOCK_NEW_REGISTRATION = true;
    console.log('[FeatureFlagsManager] 🛡️ Zero-Downtime Read-Only Migration locks engaged successfully.');
  }

  /**
   * Reverts all lock states back to regular application operations
   */
  public releaseAllLocks(): void {
    this.flags.MIGRATION_MODE = false;
    this.flags.READ_ONLY_MODE = false;
    this.flags.LOCK_BOOKING = false;
    this.flags.LOCK_FINANCIAL_TRANSACTION = false;
    this.flags.LOCK_NEW_REGISTRATION = false;
    console.log('[FeatureFlagsManager] 🔓 All database operation locks disengaged. Full write mode restored.');
  }

  public getFlags(): SystemFeatureFlags {
    return { ...this.flags };
  }

  public setFlag(key: keyof SystemFeatureFlags, value: boolean): void {
    this.flags[key] = value;
    console.log(`[FeatureFlagsManager] Dynamic state mutation: ${key} -> ${value}`);

    // If migration mode or read-only mode is dynamically engaged, lock down mutations
    if (key === 'MIGRATION_MODE' && value) {
      this.initiateReadonlyMigrationLocks();
    } else if (key === 'READ_ONLY_MODE' && value) {
      this.initiateReadonlyMigrationLocks();
    }
  }

  /**
   * Asserts whether a specific document modification is allowed under current system-wide flags
   */
  public checkMutationAllowed(collectionName: string): { allowed: boolean; reason?: string } {
    if (this.flags.READ_ONLY_MODE) {
      return { 
        allowed: false, 
        reason: 'The system is in Read-Only Mode. All data mutations are temporarily locked during the active migration window.' 
      };
    }

    const cleanColl = collectionName.toLowerCase().trim();

    if (this.flags.LOCK_NEW_REGISTRATION && cleanColl === 'users') {
      return {
        allowed: false,
        reason: 'New registrations and profile modifications are temporarily locked due to active database cutover.'
      };
    }

    if (this.flags.LOCK_FINANCIAL_TRANSACTION && (cleanColl === 'wallets' || cleanColl === 'transactions')) {
      return {
        allowed: false,
        reason: 'Financial transactions, top-ups, and balance withdrawals are temporarily locked during the database cutover window.'
      };
    }

    if (this.flags.LOCK_BOOKING && cleanColl === 'bookings') {
      return {
        allowed: false,
        reason: 'Booking creation and itinerary reservations are temporarily locked during database cutover.'
      };
    }

    return { allowed: true };
  }
}

export const featureFlagsManager = FeatureFlagsManager.getInstance();
