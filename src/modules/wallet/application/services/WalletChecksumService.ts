/**
 * @file WalletChecksumService.ts
 * @description Secure service to generate and verify wallet record checksums.
 * @responsibility Safeguard the system against unauthorized manual db modifications or database tampering.
 * 
 * TODO: Integrate standard SHA-256 HMAC utilizing securely-stored environment keys.
 */

import { IWalletData } from '../../shared/types/WalletTypes.js';

export class WalletChecksumService {
  private readonly secretKey: string;

  /**
   * @constructor
   * @param secretKey - Injected cryptographic key/salt.
   */
  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  // #region Methods
  /**
   * Generates a tamper-evident HMAC checksum from segmented wallet balances.
   */
  public generateChecksum(wallet: IWalletData): string {
    console.log(this.secretKey, wallet);
    throw new Error("Not implemented.");
  }

  /**
   * Verifies if the wallet checksum matches its current balance data.
   */
  public verifyChecksum(wallet: IWalletData): boolean {
    console.log(wallet);
    throw new Error("Not implemented.");
  }
  // #endregion
}
