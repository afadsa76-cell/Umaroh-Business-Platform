/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file IdempotencyMapper.ts
 * @description Map database/infrastructure models to strict domain Idempotency entities.
 */

import { IIdempotencyRecord } from '../../domain/repositories/IIdempotencyRepository.js';

export class IdempotencyMapper {
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

  public toDomain(raw: any): IIdempotencyRecord {
    if (!raw) {
      throw new Error("Cannot map null/undefined idempotency document.");
    }
    return {
      key: raw.key || raw.id || '',
      status: raw.status || 'PENDING',
      responsePayload: raw.responsePayload || undefined,
      createdAt: this.convertDate(raw.createdAt),
      expiresAt: this.convertDate(raw.expiresAt),
      deletedAt: raw.deletedAt ? this.convertDate(raw.deletedAt) : undefined,
    };
  }

  public toPersistence(domain: IIdempotencyRecord): any {
    return {
      key: domain.key,
      id: domain.key, // Maps as both key and document ID for Firestore
      status: domain.status,
      responsePayload: domain.responsePayload || null,
      createdAt: domain.createdAt,
      expiresAt: domain.expiresAt,
      deletedAt: domain.deletedAt || null,
    };
  }

  public toDTO(domain: IIdempotencyRecord): any {
    return {
      key: domain.key,
      status: domain.status,
      responsePayload: domain.responsePayload,
      createdAt: domain.createdAt.toISOString(),
      expiresAt: domain.expiresAt.toISOString(),
    };
  }

  public dtoToDomain(dto: any): IIdempotencyRecord {
    return {
      key: dto.key || '',
      status: dto.status || 'PENDING',
      responsePayload: dto.responsePayload,
      createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : new Date(),
    };
  }
}
