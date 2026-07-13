/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file IProjectionRepository.ts
 * @description Projection Repository interface defining port boundary with standard base operations.
 */

export interface IProjectionData {
  id: string; // projectionId
  data: Record<string, any>;
  updatedAt: Date;
  deletedAt?: Date; // For softDelete support
}

export interface IProjectionRepository {
  create(projection: IProjectionData): Promise<void>;
  findById(id: string): Promise<IProjectionData | null>;
  findByReference(reference: string): Promise<IProjectionData[]>;
  findAll(): Promise<IProjectionData[]>;
  update(id: string, updates: Partial<IProjectionData>): Promise<void>;
  softDelete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  lock(id: string): Promise<void>;
  unlock(id: string): Promise<void>;
  count(): Promise<number>;
}
