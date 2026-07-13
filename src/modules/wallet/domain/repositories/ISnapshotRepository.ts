/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file ISnapshotRepository.ts
 * @description Snapshot Repository interface defining port boundary with standard base operations.
 */

export interface ISnapshotData {
  id: string; // aggregateId
  aggregateType: string;
  version: number;
  state: Record<string, any>;
  createdAt: Date;
  deletedAt?: Date; // For softDelete support
}

export interface ISnapshotRepository {
  create(snapshot: ISnapshotData): Promise<void>;
  findById(id: string): Promise<ISnapshotData | null>;
  findByReference(reference: string): Promise<ISnapshotData[]>; // Matches aggregateType
  findAll(): Promise<ISnapshotData[]>;
  update(id: string, updates: Partial<ISnapshotData>): Promise<void>;
  softDelete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  lock(id: string): Promise<void>;
  unlock(id: string): Promise<void>;
  count(): Promise<number>;
}
