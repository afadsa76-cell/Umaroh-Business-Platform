/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file SnapshotMapper.ts
 * @description Map database/infrastructure models to strict domain Snapshot entities.
 */

import { ISnapshotData } from '../../domain/repositories/ISnapshotRepository.js';

export class SnapshotMapper {
  private convertDate(dateField: any): Date {
    if (!dateField) return new Date();
    if (typeof dateField.toDate === 'function') {
      return dateField.toDate();
    }
    if (dateField instanceof Date) {
      return dateField;
    }
    return new Date(dateField);
  }

  public toDomain(raw: any): ISnapshotData {
    if (!raw) {
      throw new Error("Cannot map null/undefined snapshot document.");
    }
    return {
      id: raw.id || '',
      aggregateType: raw.aggregateType || '',
      version: raw.version ?? 0,
      state: raw.state || {},
      createdAt: this.convertDate(raw.createdAt),
      deletedAt: raw.deletedAt ? this.convertDate(raw.deletedAt) : undefined,
    };
  }

  public toPersistence(domain: ISnapshotData): any {
    return {
      id: domain.id,
      aggregateType: domain.aggregateType,
      version: domain.version,
      state: domain.state,
      createdAt: domain.createdAt,
      deletedAt: domain.deletedAt || null,
    };
  }

  public toDTO(domain: ISnapshotData): any {
    return {
      id: domain.id,
      aggregateType: domain.aggregateType,
      version: domain.version,
      state: domain.state,
      createdAt: domain.createdAt.toISOString(),
    };
  }

  public dtoToDomain(dto: any): ISnapshotData {
    return {
      id: dto.id || '',
      aggregateType: dto.aggregateType || '',
      version: dto.version ?? 0,
      state: dto.state || {},
      createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    };
  }
}
