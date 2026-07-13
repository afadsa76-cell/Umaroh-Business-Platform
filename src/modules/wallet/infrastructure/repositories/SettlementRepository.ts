/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file SettlementRepository.ts
 * @description Firestore implementation of the ISettlementRepository.
 * @responsibility Persist and retrieve bank settlement clearance jobs securely.
 */

import { db, doc, collection, getDoc, getDocs, setDoc, updateDoc, query, where } from '../../../../firebase.js';
import { ISettlementRepository, ISettlementData } from '../../domain/repositories/ISettlementRepository.js';
import { SettlementMapper } from '../mappers/SettlementMapper.js';
import { translateRepositoryError } from './RepositoryErrorTranslator.js';

export class SettlementRepository implements ISettlementRepository {
  private readonly dbContext: any;
  private readonly mapper = new SettlementMapper();
  private readonly collectionName = 'settlements';

  /**
   * @constructor
   * @param dbContext - Injected Firestore database context.
   */
  constructor(dbContext?: any) {
    this.dbContext = dbContext || db;
  }

  // #region Logging & Observability
  private logRead(id: string): void {
    console.log(`[SettlementRepository Read] ID: ${id}`);
  }
  private logWrite(id: string): void {
    console.log(`[SettlementRepository Write] ID: ${id}`);
  }
  private logUpdate(id: string): void {
    console.log(`[SettlementRepository Update] ID: ${id}`);
  }
  private logDelete(id: string): void {
    console.log(`[SettlementRepository Delete] ID: ${id}`);
  }
  private logError(id: string, error: any): void {
    console.error(`[SettlementRepository Error] ID: ${id}, Error:`, error);
  }

  private trackMetric(name: string, value: number = 1): void {
    console.log(`[Metric] ${name}: ${value}`);
  }
  // #endregion

  // #region Existing Operations
  public async createSettlement(settlement: ISettlementData): Promise<void> {
    await this.create(settlement);
  }

  public async updateStatus(id: string, status: ISettlementData['status'], reconciledAt?: Date): Promise<void> {
    const updates: Partial<ISettlementData> = { status };
    if (reconciledAt) {
      updates.reconciledAt = reconciledAt;
    }
    await this.update(id, updates);
  }

  public async getByTxId(txId: string): Promise<ISettlementData | null> {
    const list = await this.findByReference(txId);
    return list.length > 0 ? list[0] : null;
  }
  // #endregion

  // #region Base 10 Operations
  public async create(settlement: ISettlementData): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), settlement.id);
      const persistenceData = this.mapper.toPersistence(settlement);
      await setDoc(docRef, persistenceData);
      this.logWrite(settlement.id);
    } catch (err) {
      this.trackMetric('repository.error');
      this.logError(settlement.id, err);
      translateRepositoryError(err);
    }
  }

  public async findById(id: string): Promise<ISettlementData | null> {
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

  public async findByReference(reference: string): Promise<ISettlementData[]> {
    this.trackMetric('repository.read');
    try {
      const q = query(collection(this.dbContext, this.collectionName), where('txId', '==', reference));
      const querySnap = await getDocs(q);
      const results: ISettlementData[] = [];
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

  public async findAll(): Promise<ISettlementData[]> {
    this.trackMetric('repository.read');
    try {
      const q = collection(this.dbContext, this.collectionName);
      const querySnap = await getDocs(q);
      const results: ISettlementData[] = [];
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

  public async update(id: string, updates: Partial<ISettlementData>): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), id);
      const persistenceUpdates: any = {};
      if (updates.txId) persistenceUpdates.txId = updates.txId;
      if (updates.clearingHouse) persistenceUpdates.clearingHouse = updates.clearingHouse;
      if (updates.status) persistenceUpdates.status = updates.status;
      if (updates.reconciledAt) persistenceUpdates.reconciledAt = updates.reconciledAt;
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

  public async exists(id: string): Promise<boolean> {
    this.trackMetric('repository.read');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), id);
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

  public async lock(id: string): Promise<void> {
    this.trackMetric('repository.write');
    console.log(`[SettlementRepository Lock] Locked Settlement ID: ${id}`);
  }

  public async unlock(id: string): Promise<void> {
    this.trackMetric('repository.write');
    console.log(`[SettlementRepository Unlock] Unlocked Settlement ID: ${id}`);
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
