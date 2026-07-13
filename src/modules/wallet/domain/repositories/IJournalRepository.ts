/**
 * @file IJournalRepository.ts
 * @description Journal Repository interface defining port boundary with standard base operations.
 */

export interface IJournalData {
  id: string;
  referenceNumber: string;
  sourceContext: string; // e.g. "BOOKING", "MLM_COMMISSION"
  totalDebit: number;
  totalCredit: number;
  postedAt: Date;
  deletedAt?: Date; // For softDelete support
}

export interface IJournalRepository {
  // Existing operations
  createJournal(journal: IJournalData): Promise<void>;
  getByRef(ref: string): Promise<IJournalData | null>;

  // Standard 10 operations required by Sprint 2B.2
  create(journal: IJournalData): Promise<void>;
  findById(id: string): Promise<IJournalData | null>;
  findByReference(reference: string): Promise<IJournalData[]>; // Matches referenceNumber
  findAll(): Promise<IJournalData[]>;
  update(id: string, updates: Partial<IJournalData>): Promise<void>;
  softDelete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  lock(id: string): Promise<void>;
  unlock(id: string): Promise<void>;
  count(): Promise<number>;
}
