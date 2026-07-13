/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file WalletMapper.ts
 * @description Map database/infrastructure models to strict domain entities/DTOs.
 */

import { IWalletData, WalletStatus } from '../../shared/types/WalletTypes.js';
import { WalletResponseDTO } from '../../application/dto/WalletDTO.js';

export class WalletMapper {
  private readonly timezone: string;

  /**
   * @constructor
   * @param timezone - Injected timezone configuration for date operations.
   */
  constructor(timezone: string = 'Asia/Jakarta') {
    this.timezone = timezone;
  }

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

  /**
   * Converts raw database document to strict domain format.
   */
  public toDomain(raw: any): IWalletData {
    if (!raw) {
      throw new Error("Cannot map null/undefined wallet document.");
    }
    return {
      uid: raw.uid || raw.id || '',
      tenantId: raw.tenantId || '',
      organizationId: raw.organizationId || '',
      currency: raw.currency || 'IDR',
      status: (raw.status as WalletStatus) || WalletStatus.ACTIVE,
      balances: {
        availableBalance: raw.balances?.availableBalance ?? 0,
        pendingBalance: raw.balances?.pendingBalance ?? 0,
        frozenBalance: raw.balances?.frozenBalance ?? 0,
        escrowBalance: raw.balances?.escrowBalance ?? 0,
        commissionBalance: raw.balances?.commissionBalance ?? 0,
        rewardBalance: raw.balances?.rewardBalance ?? 0,
        adjustmentBalance: raw.balances?.adjustmentBalance ?? 0,
        totalBalance: raw.balances?.totalBalance ?? 0,
      },
      checksum: raw.checksum || '',
      createdAt: this.convertDate(raw.createdAt),
      updatedAt: this.convertDate(raw.updatedAt),
    };
  }

  /**
   * Converts domain aggregate data to clean database persistence document.
   */
  public toPersistence(domain: IWalletData): any {
    return {
      uid: domain.uid,
      tenantId: domain.tenantId,
      organizationId: domain.organizationId,
      currency: domain.currency,
      status: domain.status,
      balances: {
        availableBalance: domain.balances.availableBalance,
        pendingBalance: domain.balances.pendingBalance,
        frozenBalance: domain.balances.frozenBalance,
        escrowBalance: domain.balances.escrowBalance,
        commissionBalance: domain.balances.commissionBalance,
        rewardBalance: domain.balances.rewardBalance,
        adjustmentBalance: domain.balances.adjustmentBalance,
        totalBalance: domain.balances.totalBalance,
      },
      checksum: domain.checksum,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }

  /**
   * Converts domain format to DTO format.
   */
  public toDTO(domain: IWalletData): WalletResponseDTO {
    return {
      uid: domain.uid,
      tenantId: domain.tenantId,
      currency: domain.currency,
      status: domain.status,
      availableBalance: domain.balances.availableBalance,
      pendingBalance: domain.balances.pendingBalance,
      frozenBalance: domain.balances.frozenBalance,
      totalBalance: domain.balances.totalBalance,
      updatedAt: domain.updatedAt.toISOString(),
    };
  }

  /**
   * Converts DTO format to domain format.
   */
  public dtoToDomain(dto: WalletResponseDTO): Partial<IWalletData> {
    return {
      uid: dto.uid,
      tenantId: dto.tenantId,
      currency: dto.currency,
      status: dto.status,
      balances: {
        availableBalance: dto.availableBalance,
        pendingBalance: dto.pendingBalance,
        frozenBalance: dto.frozenBalance,
        escrowBalance: 0,
        commissionBalance: 0,
        rewardBalance: 0,
        adjustmentBalance: 0,
        totalBalance: dto.totalBalance,
      },
      updatedAt: new Date(dto.updatedAt),
    };
  }
}
