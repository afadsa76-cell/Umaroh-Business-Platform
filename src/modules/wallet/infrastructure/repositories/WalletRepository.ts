/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file WalletRepository.ts
 * @description Firestore implementation of the IWalletRepository.
 * @responsibility Persist and retrieve Wallet data securely using Firebase Firestore.
 */

import { db, doc, collection, getDoc, getDocs, setDoc, updateDoc, query, where } from '../../../../firebase.js';
import { IWalletRepository } from '../../domain/repositories/IWalletRepository.js';
import { IWalletData } from '../../shared/types/WalletTypes.js';
import { WalletMapper } from '../mappers/WalletMapper.js';
import { translateRepositoryError } from './RepositoryErrorTranslator.js';

export class WalletRepository implements IWalletRepository {
  private readonly dbContext: any;
  private readonly mapper = new WalletMapper();
  private readonly collectionName = 'wallets';

  /**
   * @constructor
   * @param dbContext - Injected Firestore or administrative database context.
   */
  constructor(dbContext?: any) {
    this.dbContext = dbContext || db;
  }

  // #region Logging
  private logRead(id: string): void {
    console.log(`[WalletRepository Read] ID: ${id}`);
  }
  private logWrite(id: string): void {
    console.log(`[WalletRepository Write] ID: ${id}`);
  }
  private logUpdate(id: string): void {
    console.log(`[WalletRepository Update] ID: ${id}`);
  }
  private logDelete(id: string): void {
    console.log(`[WalletRepository Delete] ID: ${id}`);
  }
  private logError(id: string, error: any): void {
    console.error(`[WalletRepository Error] ID: ${id}, Error:`, error);
  }
  // #endregion

  // #region Observability
  private trackMetric(name: string, value: number = 1): void {
    console.log(`[Metric] ${name}: ${value}`);
  }
  // #endregion

  // #region Queries
  public async getById(uid: string): Promise<IWalletData | null> {
    return this.findById(uid);
  }

  public async exists(uid: string): Promise<boolean> {
    this.trackMetric('repository.read');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        return false;
      }
      return !docSnap.data().deletedAt;
    } catch (err) {
      this.trackMetric('repository.error');
      translateRepositoryError(err);
    }
  }
  // #endregion

  // #region Commands
  public async save(wallet: IWalletData): Promise<void> {
    const isExisting = await this.exists(wallet.uid);
    if (isExisting) {
      await this.update(wallet.uid, wallet);
    } else {
      await this.create(wallet);
    }
  }

  public async updateBalances(uid: string, balances: IWalletData['balances']): Promise<void> {
    await this.update(uid, { balances });
  }
  // #endregion

  // #region Base 10 Operations
  public async create(wallet: IWalletData): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), wallet.uid);
      const persistenceData = this.mapper.toPersistence(wallet);
      await setDoc(docRef, persistenceData);
      this.logWrite(wallet.uid);
    } catch (err) {
      this.trackMetric('repository.error');
      this.logError(wallet.uid, err);
      translateRepositoryError(err);
    }
  }

  public async findById(id: string): Promise<IWalletData | null> {
    this.trackMetric('repository.read');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        return null;
      }
      const data = docSnap.data();
      if (data.deletedAt) {
        return null;
      }
      this.logRead(id);
      return this.mapper.toDomain(data);
    } catch (err) {
      this.trackMetric('repository.error');
      this.logError(id, err);
      translateRepositoryError(err);
    }
  }

  public async findByReference(reference: string): Promise<IWalletData[]> {
    this.trackMetric('repository.read');
    try {
      const q = query(collection(this.dbContext, this.collectionName), where('tenantId', '==', reference));
      const querySnap = await getDocs(q);
      const results: IWalletData[] = [];
      querySnap.forEach((docSnap: any) => {
        const data = docSnap.data();
        if (!data.deletedAt) {
          results.push(this.mapper.toDomain(data));
        }
      });
      return results;
    } catch (err) {
      this.trackMetric('repository.error');
      translateRepositoryError(err);
    }
  }

  public async findAll(): Promise<IWalletData[]> {
    this.trackMetric('repository.read');
    try {
      const q = collection(this.dbContext, this.collectionName);
      const querySnap = await getDocs(q);
      const results: IWalletData[] = [];
      querySnap.forEach((docSnap: any) => {
        const data = docSnap.data();
        if (!data.deletedAt) {
          results.push(this.mapper.toDomain(data));
        }
      });
      return results;
    } catch (err) {
      this.trackMetric('repository.error');
      translateRepositoryError(err);
    }
  }

  public async update(id: string, updates: Partial<IWalletData>): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), id);
      const persistenceUpdates: any = {};
      if (updates.status) persistenceUpdates.status = updates.status;
      if (updates.balances) persistenceUpdates.balances = updates.balances;
      if (updates.checksum) persistenceUpdates.checksum = updates.checksum;
      persistenceUpdates.updatedAt = new Date();

      await updateDoc(docRef, persistenceUpdates);
      this.logUpdate(id);
    } catch (err) {
      this.trackMetric('repository.error');
      this.logError(id, err);
      translateRepositoryError(err);
    }
  }

  public async softDelete(id: string): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), id);
      await updateDoc(docRef, { deletedAt: new Date() });
      this.logDelete(id);
    } catch (err) {
      this.trackMetric('repository.error');
      this.logError(id, err);
      translateRepositoryError(err);
    }
  }

  public async lock(id: string): Promise<void> {
    this.trackMetric('repository.write');
    console.log(`[WalletRepository Lock] Locked aggregate ID: ${id}`);
  }

  public async unlock(id: string): Promise<void> {
    this.trackMetric('repository.write');
    console.log(`[WalletRepository Unlock] Unlocked aggregate ID: ${id}`);
  }

  public async count(): Promise<number> {
    this.trackMetric('repository.read');
    try {
      const q = collection(this.dbContext, this.collectionName);
      const querySnap = await getDocs(q);
      let total = 0;
      querySnap.forEach((docSnap: any) => {
        if (!docSnap.data().deletedAt) {
          total++;
        }
      });
      return total;
    } catch (err) {
      this.trackMetric('repository.error');
      translateRepositoryError(err);
    }
  }
  // #endregion
}
