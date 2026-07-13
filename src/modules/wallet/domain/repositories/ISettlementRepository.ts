/**
 * @file ISettlementRepository.ts
 * @description Settlement Repository interface defining port boundary with standard base operations.
 */

export interface ISettlementData {
  id: string;
  txId: string;
  clearingHouse: string; // e.g. "MANDIRI_VA", "BCA"
  status: 'PENDING' | 'CLEARED' | 'REJECTED';
  reconciledAt?: Date;
  createdAt: Date;
  deletedAt?: Date; // For softDelete support
}

export interface ISettlementRepository {
  // Existing operations
  createSettlement(settlement: ISettlementData): Promise<void>;
  updateStatus(id: string, status: ISettlementData['status'], reconciledAt?: Date): Promise<void>;
  getByTxId(txId: string): Promise<ISettlementData | null>;

  // Standard 10 operations required by Sprint 2B.2
  create(settlement: ISettlementData): Promise<void>;
  findById(id: string): Promise<ISettlementData | null>;
  findByReference(reference: string): Promise<ISettlementData[]>; // Matches txId
  findAll(): Promise<ISettlementData[]>;
  update(id: string, updates: Partial<ISettlementData>): Promise<void>;
  softDelete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  lock(id: string): Promise<void>;
  unlock(id: string): Promise<void>;
  count(): Promise<number>;
}
