/**
 * @file ILedgerRepository.ts
 * @description Ledger Repository interface defining port boundary with standard base operations.
 */

export interface ILedgerEntry {
  id: string;
  txId: string;
  coaCode: string; // Chart of Accounts Code
  debit: number;
  credit: number;
  description: string;
  createdAt: Date;
  deletedAt?: Date; // For softDelete support
}

export interface ILedgerRepository {
  // Existing operations
  postLedger(entries: ILedgerEntry[]): Promise<void>;
  getByAccount(coaCode: string): Promise<ILedgerEntry[]>;

  // Standard 10 operations required by Sprint 2B.2
  create(entry: ILedgerEntry): Promise<void>;
  findById(id: string): Promise<ILedgerEntry | null>;
  findByReference(reference: string): Promise<ILedgerEntry[]>; // Matches coaCode or txId
  findAll(): Promise<ILedgerEntry[]>;
  update(id: string, updates: Partial<ILedgerEntry>): Promise<void>;
  softDelete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  lock(id: string): Promise<void>;
  unlock(id: string): Promise<void>;
  count(): Promise<number>;
}
