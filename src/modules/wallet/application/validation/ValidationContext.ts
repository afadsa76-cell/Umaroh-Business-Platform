/**
 * @file ValidationContext.ts
 * @description Dynamic validation context carrying request details, fetched wallets, metadata, and accumulated validation errors.
 */

import { IWalletData } from '../../shared/types/WalletTypes.js';

export enum ValidationStage {
  REQUEST_STRUCTURE = 'RequestStructure',
  AUTHENTICATION = 'Authentication',
  AUTHORIZATION = 'Authorization',
  PERMISSION = 'Permission',
  WALLET_EXISTS = 'WalletExists',
  WALLET_STATE = 'WalletState',
  CURRENCY = 'Currency',
  LIMIT = 'Limit',
  VERSION = 'Version',
  IDEMPOTENCY = 'Idempotency',
  RISK = 'Risk',
  BUSINESS_POLICY = 'BusinessPolicy',
  READY_FOR_TX = 'ReadyForTransactionManager'
}

export interface ValidationError {
  stage: ValidationStage;
  rule: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  timestamp: Date;
}

export interface IWalletTransactionRequest {
  uid?: string;
  sourceUid?: string;
  destinationUid?: string;
  amount: number;
  currency: string;
  referenceNumber: string;
  idempotencyKey: string;
  operationType: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'FREEZE' | 'RESERVE' | 'SETTLEMENT' | 'COMMISSION' | 'REFUND' | 'ADJUSTMENT';
  role?: string;
  permissions?: string[];
  jwt?: string;
  customClaims?: Record<string, string | number | boolean>;
  clientIp?: string;
  version?: number;
  riskScore?: number;
}

export class ValidationContext {
  public readonly requestId: string;
  public readonly request: IWalletTransactionRequest;
  public readonly startTime: Date;
  public readonly errors: ValidationError[] = [];
  public readonly stagesPassed: ValidationStage[] = [];
  public shortCircuit: boolean = false;
  
  // Cache of wallets fetched during validation to prevent multiple db reads
  private wallets: Map<string, IWalletData> = new Map();
  // General metadata store for validators to communicate with each other
  private metadata: Map<string, unknown> = new Map();

  constructor(request: IWalletTransactionRequest, requestId?: string) {
    this.requestId = requestId || `req_${Math.random().toString(36).substring(2, 11)}`;
    this.request = request;
    this.startTime = new Date();
  }

  public addError(
    stage: ValidationStage,
    rule: string,
    message: string,
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' = 'ERROR'
  ): void {
    this.errors.push({
      stage,
      rule,
      message,
      severity,
      timestamp: new Date()
    });
  }

  public hasErrors(severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'): boolean {
    if (!severity) {
      return this.errors.length > 0;
    }
    return this.errors.some(e => e.severity === severity);
  }

  public getWallets(): Map<string, IWalletData> {
    return this.wallets;
  }

  public setWallet(uid: string, wallet: IWalletData): void {
    this.wallets.set(uid, wallet);
  }

  public getWallet(uid: string): IWalletData | undefined {
    return this.wallets.get(uid);
  }

  public setMetadata(key: string, value: unknown): void {
    this.metadata.set(key, value);
  }

  public getMetadata<T>(key: string): T | undefined {
    return this.metadata.get(key) as T;
  }
}
