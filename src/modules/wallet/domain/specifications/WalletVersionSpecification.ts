/**
 * @file WalletVersionSpecification.ts
 * @description Domain specification verifying if a wallet's version or checksum matches the expected transaction version.
 */

import { ISpecification } from './ISpecification.js';
import { IWalletData } from '../../shared/types/WalletTypes.js';

export class WalletVersionSpecification implements ISpecification<IWalletData, string | number> {
  public isSatisfiedBy(wallet: IWalletData, expectedVersion?: string | number): boolean {
    if (expectedVersion === undefined || expectedVersion === null) return true;
    
    // We check if the expected version matches the actual wallet checksum or its updatedAt timestamp
    const actualChecksum = wallet.checksum;
    const actualTime = wallet.updatedAt ? new Date(wallet.updatedAt).getTime() : 0;
    
    return String(expectedVersion) === actualChecksum || Number(expectedVersion) === actualTime;
  }
}
