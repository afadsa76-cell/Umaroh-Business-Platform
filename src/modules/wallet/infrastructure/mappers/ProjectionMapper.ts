/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file ProjectionMapper.ts
 * @description Map database/infrastructure models to strict domain Projection entities.
 */

import { IProjectionData } from '../../domain/repositories/IProjectionRepository.js';

export class ProjectionMapper {
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

  public toDomain(raw: any): IProjectionData {
    if (!raw) {
      throw new Error("Cannot map null/undefined projection document.");
    }
    return {
      id: raw.id || '',
      data: raw.data || {},
      updatedAt: this.convertDate(raw.updatedAt),
      deletedAt: raw.deletedAt ? this.convertDate(raw.deletedAt) : undefined,
    };
  }

  public toPersistence(domain: IProjectionData): any {
    return {
      id: domain.id,
      data: domain.data,
      updatedAt: domain.updatedAt,
      deletedAt: domain.deletedAt || null,
    };
  }

  public toDTO(domain: IProjectionData): any {
    return {
      id: domain.id,
      data: domain.data,
      updatedAt: domain.updatedAt.toISOString(),
    };
  }

  public dtoToDomain(dto: any): IProjectionData {
    return {
      id: dto.id || '',
      data: dto.data || {},
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : new Date(),
    };
  }
}
