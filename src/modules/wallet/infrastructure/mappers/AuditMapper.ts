/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file AuditMapper.ts
 * @description Map database/infrastructure models to strict domain Audit entities.
 */

import { IAuditEntry } from '../../domain/repositories/IAuditRepository.js';

export class AuditMapper {
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

  public toDomain(raw: any): IAuditEntry {
    if (!raw) {
      throw new Error("Cannot map null/undefined audit document.");
    }
    return {
      id: raw.id || '',
      actorId: raw.actorId || '',
      action: raw.action || '',
      snapshotBefore: raw.snapshotBefore || '',
      snapshotAfter: raw.snapshotAfter || '',
      checksum: raw.checksum || '',
      createdAt: this.convertDate(raw.createdAt),
      deletedAt: raw.deletedAt ? this.convertDate(raw.deletedAt) : undefined,
    };
  }

  public toPersistence(domain: IAuditEntry): any {
    return {
      id: domain.id,
      actorId: domain.actorId,
      action: domain.action,
      snapshotBefore: domain.snapshotBefore || null,
      snapshotAfter: domain.snapshotAfter || null,
      checksum: domain.checksum,
      createdAt: domain.createdAt,
      deletedAt: domain.deletedAt || null,
    };
  }

  public toDTO(domain: IAuditEntry): any {
    return {
      id: domain.id,
      actorId: domain.actorId,
      action: domain.action,
      snapshotBefore: domain.snapshotBefore,
      snapshotAfter: domain.snapshotAfter,
      checksum: domain.checksum,
      createdAt: domain.createdAt.toISOString(),
    };
  }

  public dtoToDomain(dto: any): IAuditEntry {
    return {
      id: dto.id || '',
      actorId: dto.actorId || '',
      action: dto.action || '',
      snapshotBefore: dto.snapshotBefore,
      snapshotAfter: dto.snapshotAfter,
      checksum: dto.checksum || '',
      createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    };
  }
}
