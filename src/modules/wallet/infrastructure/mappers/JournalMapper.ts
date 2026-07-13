/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file JournalMapper.ts
 * @description Map database/infrastructure models to strict domain Journal entities.
 */

import { IJournalData } from '../../domain/repositories/IJournalRepository.js';

export class JournalMapper {
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

  public toDomain(raw: any): IJournalData {
    if (!raw) {
      throw new Error("Cannot map null/undefined journal document.");
    }
    return {
      id: raw.id || '',
      referenceNumber: raw.referenceNumber || '',
      sourceContext: raw.sourceContext || '',
      totalDebit: raw.totalDebit ?? 0,
      totalCredit: raw.totalCredit ?? 0,
      postedAt: this.convertDate(raw.postedAt),
      deletedAt: raw.deletedAt ? this.convertDate(raw.deletedAt) : undefined,
    };
  }

  public toPersistence(domain: IJournalData): any {
    return {
      id: domain.id,
      referenceNumber: domain.referenceNumber,
      sourceContext: domain.sourceContext,
      totalDebit: domain.totalDebit,
      totalCredit: domain.totalCredit,
      postedAt: domain.postedAt,
      deletedAt: domain.deletedAt || null,
    };
  }

  public toDTO(domain: IJournalData): any {
    return {
      id: domain.id,
      referenceNumber: domain.referenceNumber,
      sourceContext: domain.sourceContext,
      totalDebit: domain.totalDebit,
      totalCredit: domain.totalCredit,
      postedAt: domain.postedAt.toISOString(),
    };
  }

  public dtoToDomain(dto: any): IJournalData {
    return {
      id: dto.id || '',
      referenceNumber: dto.referenceNumber || '',
      sourceContext: dto.sourceContext || '',
      totalDebit: dto.totalDebit ?? 0,
      totalCredit: dto.totalCredit ?? 0,
      postedAt: dto.postedAt ? new Date(dto.postedAt) : new Date(),
    };
  }
}
