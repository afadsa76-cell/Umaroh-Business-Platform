/**
 * @file IAuditRepository.ts
 * @description Audit Repository interface defining port boundary with standard base operations.
 */

export interface IAuditEntry {
  id: string;
  actorId: string;
  action: string;
  snapshotBefore?: string;
  snapshotAfter?: string;
  checksum: string;
  createdAt: Date;
  deletedAt?: Date; // For softDelete support
}

export interface IAuditRepository {
  // Existing operations
  log(entry: IAuditEntry): Promise<void>;
  getLogsByResource(resourceId: string): Promise<IAuditEntry[]>;

  // Standard 10 operations required by Sprint 2B.2
  create(entry: IAuditEntry): Promise<void>;
  findById(id: string): Promise<IAuditEntry | null>;
  findByReference(reference: string): Promise<IAuditEntry[]>; // Matches actorId or action
  findAll(): Promise<IAuditEntry[]>;
  update(id: string, updates: Partial<IAuditEntry>): Promise<void>;
  softDelete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  lock(id: string): Promise<void>;
  unlock(id: string): Promise<void>;
  count(): Promise<number>;
}
