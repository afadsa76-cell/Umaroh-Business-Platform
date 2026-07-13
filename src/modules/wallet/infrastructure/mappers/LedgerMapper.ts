/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file LedgerMapper.ts
 * @description Map database/infrastructure models to strict domain Ledger entities.
 */

import { ILedgerEntry } from '../../domain/repositories/ILedgerRepository.js';

export class LedgerMapper {
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

  public toDomain(raw: any): ILedgerEntry {
    if (!raw) {
      throw new Error("Cannot map null/undefined ledger document.");
    }
    return {
      id: raw.id || '',
      txId: raw.txId || '',
      coaCode: raw.coaCode || '',
      debit: raw.debit ?? 0,
      credit: raw.credit ?? 0,
      description: raw.description || '',
      createdAt: this.convertDate(raw.createdAt),
      deletedAt: raw.deletedAt ? this.convertDate(raw.deletedAt) : undefined,
    };
  }

  public toPersistence(domain: ILedgerEntry): any {
    return {
      id: domain.id,
      txId: domain.txId,
      coaCode: domain.coaCode,
      debit: domain.debit,
      credit: domain.credit,
      description: domain.description,
      createdAt: domain.createdAt,
      deletedAt: domain.deletedAt || null,
    };
  }

  public toDTO(domain: ILedgerEntry): any {
    return {
      id: domain.id,
      txId: domain.txId,
      coaCode: domain.coaCode,
      debit: domain.debit,
      credit: domain.credit,
      description: domain.description,
      createdAt: domain.createdAt.toISOString(),
    };
  }

  public dtoToDomain(dto: any): ILedgerEntry {
    return {
      id: dto.id || '',
      txId: dto.txId || '',
      coaCode: dto.coaCode || '',
      debit: dto.debit ?? 0,
      credit: dto.credit ?? 0,
      description: dto.description || '',
      createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    };
  }
}
