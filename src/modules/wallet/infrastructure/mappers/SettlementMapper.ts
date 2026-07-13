/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file SettlementMapper.ts
 * @description Map database/infrastructure models to strict domain Settlement entities.
 */

import { ISettlementData } from '../../domain/repositories/ISettlementRepository.js';

export class SettlementMapper {
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

  public toDomain(raw: any): ISettlementData {
    if (!raw) {
      throw new Error("Cannot map null/undefined settlement document.");
    }
    return {
      id: raw.id || '',
      txId: raw.txId || '',
      clearingHouse: raw.clearingHouse || '',
      status: raw.status || 'PENDING',
      reconciledAt: raw.reconciledAt ? this.convertDate(raw.reconciledAt) : undefined,
      createdAt: this.convertDate(raw.createdAt),
      deletedAt: raw.deletedAt ? this.convertDate(raw.deletedAt) : undefined,
    };
  }

  public toPersistence(domain: ISettlementData): any {
    return {
      id: domain.id,
      txId: domain.txId,
      clearingHouse: domain.clearingHouse,
      status: domain.status,
      reconciledAt: domain.reconciledAt || null,
      createdAt: domain.createdAt,
      deletedAt: domain.deletedAt || null,
    };
  }

  public toDTO(domain: ISettlementData): any {
    return {
      id: domain.id,
      txId: domain.txId,
      clearingHouse: domain.clearingHouse,
      status: domain.status,
      reconciledAt: domain.reconciledAt ? domain.reconciledAt.toISOString() : null,
      createdAt: domain.createdAt.toISOString(),
    };
  }

  public dtoToDomain(dto: any): ISettlementData {
    return {
      id: dto.id || '',
      txId: dto.txId || '',
      clearingHouse: dto.clearingHouse || '',
      status: dto.status || 'PENDING',
      reconciledAt: dto.reconciledAt ? new Date(dto.reconciledAt) : undefined,
      createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    };
  }
}
