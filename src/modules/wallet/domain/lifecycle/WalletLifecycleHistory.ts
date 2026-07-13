/**
 * @file WalletLifecycleHistory.ts
 * @description Domain tracker maintaining historical audit rows for individual wallet lifecycles.
 */

import { LifecycleAuditEntry } from './LifecycleAuditEntry.js';

export class WalletLifecycleHistory {
  private readonly entries: LifecycleAuditEntry[] = [];

  public addEntry(entry: LifecycleAuditEntry): void {
    this.entries.push(entry);
  }

  public getEntries(): LifecycleAuditEntry[] {
    return [...this.entries];
  }
}
