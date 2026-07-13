/**
 * @file WalletStateValidator.ts
 * @description Validator class checking if wallets exist and are in valid lifecycle states (active, frozen, closed, etc.).
 */

import { IValidationRule } from '../../application/validation/IValidationRule.js';
import { ValidationContext, ValidationStage } from '../../application/validation/ValidationContext.js';
import { IWalletStateValidator } from './IWalletStateValidator.js';
import { IWalletRepository } from '../repositories/IWalletRepository.js';
import { WalletRepository } from '../../infrastructure/repositories/WalletRepository.js';
import { WalletIsActiveSpecification } from '../specifications/WalletIsActiveSpecification.js';
import { WalletIsFrozenSpecification } from '../specifications/WalletIsFrozenSpecification.js';
import { WalletStatus } from '../../shared/types/WalletTypes.js';

export class WalletStateValidator implements IWalletStateValidator, IValidationRule {
  public readonly name = 'WalletStateValidator';
  public readonly stage = ValidationStage.WALLET_STATE;
  
  private readonly walletRepo: IWalletRepository;
  private readonly isActiveSpec = new WalletIsActiveSpecification();
  private readonly isFrozenSpec = new WalletIsFrozenSpecification();

  /**
   * @constructor
   * @param walletRepo - Injected WalletRepository (Constructor Dependency Injection).
   */
  constructor(walletRepo: IWalletRepository = new WalletRepository()) {
    this.walletRepo = walletRepo;
  }

  /**
   * Validates wallet existence and state permissions.
   */
  public async validate(context: ValidationContext): Promise<void> {
    const req = context.request;
    const uidsToFetch: string[] = [];

    if (req.operationType === 'TRANSFER') {
      if (req.sourceUid) uidsToFetch.push(req.sourceUid);
      if (req.destinationUid) uidsToFetch.push(req.destinationUid);
    } else {
      const targetUid = req.uid || req.sourceUid;
      if (targetUid) uidsToFetch.push(targetUid);
    }

    // 1. Fetch and Cache Wallets in context
    for (const uid of uidsToFetch) {
      let wallet = context.getWallet(uid);
      if (!wallet) {
        const fetched = await this.walletRepo.getById(uid);
        if (!fetched) {
          context.addError(
            ValidationStage.WALLET_EXISTS,
            this.name,
            `Wallet with UID ${uid} was not found in the database.`,
            'CRITICAL'
          );
          context.shortCircuit = true;
          return;
        }
        context.setWallet(uid, fetched);
        wallet = fetched;
      }

      // 2. Validate Wallet Status restrictions
      
      // Closed/Archived wallets cannot participate in ANY transactions
      if (wallet.status === WalletStatus.CLOSED || wallet.status === WalletStatus.ARCHIVED) {
        context.addError(
          this.stage,
          this.name,
          `Wallet ${uid} is CLOSED or ARCHIVED and cannot participate in any transactions.`,
          'ERROR'
        );
        return;
      }

      // Suspended wallets are locked out from transacting
      if (wallet.status === WalletStatus.SUSPENDED) {
        context.addError(
          this.stage,
          this.name,
          `Wallet ${uid} is SUSPENDED and cannot participate in transactions.`,
          'ERROR'
        );
        return;
      }

      // Frozen wallet logic
      const isFrozen = this.isFrozenSpec.isSatisfiedBy(wallet);
      if (isFrozen) {
        // "Frozen tidak dapat Deposit"
        if (req.operationType === 'DEPOSIT') {
          context.addError(
            this.stage,
            this.name,
            `Wallet ${uid} is FROZEN and cannot accept deposits.`,
            'ERROR'
          );
        }
        // Frozen wallets cannot transfer funds out or withdraw
        if (req.operationType === 'WITHDRAW' || (req.operationType === 'TRANSFER' && uid === req.sourceUid)) {
          context.addError(
            this.stage,
            this.name,
            `Wallet ${uid} is FROZEN and cannot execute outflows.`,
            'ERROR'
          );
        }
      }

      // Escrow wallet logic
      if (wallet.status === WalletStatus.ESCROW) {
        // "Escrow tidak dapat Transfer"
        if (req.operationType === 'TRANSFER') {
          context.addError(
            this.stage,
            this.name,
            `Wallet ${uid} is in ESCROW state and cannot initiate transfers.`,
            'ERROR'
          );
        }
      }
    }
  }
}
