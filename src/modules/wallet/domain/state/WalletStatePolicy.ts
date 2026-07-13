/**
 * @file WalletStatePolicy.ts
 * @description Policy rules controlling advanced state transitions like reopening archived wallets.
 */

export class WalletStatePolicy {
  /**
   * Evaluates if a transition from ARCHIVED to REOPENED is allowed based on business rules and initiator roles.
   */
  public isArchivedToReopenedAllowed(initiatorRole: string): boolean {
    // Only administrators or compliance roles can reopen archived wallets
    const role = initiatorRole.toUpperCase();
    return role === 'ADMIN' || role === 'COMPLIANCE' || role === 'SYSTEM';
  }
}
