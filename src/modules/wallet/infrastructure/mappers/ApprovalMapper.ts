/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file ApprovalMapper.ts
 * @description Map database/infrastructure models to strict domain Approval entities.
 */

import { IApprovalRequest } from '../../domain/repositories/IApprovalRepository.js';

export class ApprovalMapper {
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

  public toDomain(raw: any): IApprovalRequest {
    if (!raw) {
      throw new Error("Cannot map null/undefined approval document.");
    }
    return {
      id: raw.id || '',
      txId: raw.txId || '',
      makerId: raw.makerId || '',
      checkerId: raw.checkerId || undefined,
      approverId: raw.approverId || undefined,
      status: raw.status || 'PENDING',
      notes: raw.notes || '',
      createdAt: this.convertDate(raw.createdAt),
      resolvedAt: raw.resolvedAt ? this.convertDate(raw.resolvedAt) : undefined,
      deletedAt: raw.deletedAt ? this.convertDate(raw.deletedAt) : undefined,
    };
  }

  public toPersistence(domain: IApprovalRequest): any {
    return {
      id: domain.id,
      txId: domain.txId,
      makerId: domain.makerId,
      checkerId: domain.checkerId || null,
      approverId: domain.approverId || null,
      status: domain.status,
      notes: domain.notes || null,
      createdAt: domain.createdAt,
      resolvedAt: domain.resolvedAt || null,
      deletedAt: domain.deletedAt || null,
    };
  }

  public toDTO(domain: IApprovalRequest): any {
    return {
      id: domain.id,
      txId: domain.txId,
      makerId: domain.makerId,
      checkerId: domain.checkerId,
      approverId: domain.approverId,
      status: domain.status,
      notes: domain.notes,
      createdAt: domain.createdAt.toISOString(),
      resolvedAt: domain.resolvedAt ? domain.resolvedAt.toISOString() : null,
    };
  }

  public dtoToDomain(dto: any): IApprovalRequest {
    return {
      id: dto.id || '',
      txId: dto.txId || '',
      makerId: dto.makerId || '',
      checkerId: dto.checkerId,
      approverId: dto.approverId,
      status: dto.status || 'PENDING',
      notes: dto.notes,
      createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
      resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : undefined,
    };
  }
}
