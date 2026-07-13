/**
 * @file IIdempotencyRepository.ts
 * @description Idempotency Repository interface defining port boundary with standard base operations.
 */

export interface IIdempotencyRecord {
  key: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  responsePayload?: string;
  createdAt: Date;
  expiresAt: Date;
  deletedAt?: Date; // For softDelete support
}

export interface IIdempotencyRepository {
  // Existing operations
  acquireKey(key: string, expirySeconds: number): Promise<boolean>;
  resolveKey(key: string, payload: string): Promise<void>;
  failKey(key: string): Promise<void>;
  getKey(key: string): Promise<IIdempotencyRecord | null>;

  // Standard 10 operations required by Sprint 2B.2
  create(record: IIdempotencyRecord): Promise<void>;
  findById(id: string): Promise<IIdempotencyRecord | null>; // id maps to key
  findByReference(reference: string): Promise<IIdempotencyRecord[]>; // reference maps to status or key search
  findAll(): Promise<IIdempotencyRecord[]>;
  update(id: string, updates: Partial<IIdempotencyRecord>): Promise<void>;
  softDelete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  lock(id: string): Promise<void>;
  unlock(id: string): Promise<void>;
  count(): Promise<number>;
}
