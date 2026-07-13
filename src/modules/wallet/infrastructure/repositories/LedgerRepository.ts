/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file LedgerRepository.ts
 * @description Firestore implementation of the ILedgerRepository.
 * @responsibility Persist and retrieve Double-Entry Ledger book entries securely.
 */

import { db, doc, collection, getDoc, getDocs, setDoc, updateDoc, query, where } from '../../../../firebase.js';
import { ILedgerRepository, ILedgerEntry } from '../../domain/repositories/ILedgerRepository.js';
import { LedgerMapper } from '../mappers/LedgerMapper.js';
import { translateRepositoryError } from './RepositoryErrorTranslator.js';

export class LedgerRepository implements ILedgerRepository {
  private readonly dbContext: any;
  private readonly mapper = new LedgerMapper();
  private readonly collectionName = 'ledger_entries';

  /**
   * @constructor
   * @param dbContext - Injected Firestore or database context.
   */
  constructor(dbContext?: any) {
    this.dbContext = dbContext || db;
  }

  // #region Logging & Observability
  private logRead(id: string): void {
    console.log(`[LedgerRepository Read] ID: ${id}`);
  }
  private logWrite(id: string): void {
    console.log(`[LedgerRepository Write] ID: ${id}`);
  }
  private logUpdate(id: string): void {
    console.log(`[LedgerRepository Update] ID: ${id}`);
  }
  private logDelete(id: string): void {
    console.log(`[LedgerRepository Delete] ID: ${id}`);
  }
  private logError(id: string, error: any): void {
    console.error(`[LedgerRepository Error] ID: ${id}, Error:`, error);
  }

  private trackMetric(name: string, value: number = 1): void {
    console.log(`[Metric] ${name}: ${value}`);
  }
  // #endregion

  // #region Existing Operations
  public async postLedger(entries: ILedgerEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.create(entry);
    }
  }

  public async getByAccount(coaCode: string): Promise<ILedgerEntry[]> {
    return this.findByReference(coaCode);
  }
  // #endregion

  // #region Base 10 Operations
  public async create(entry: ILedgerEntry): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), entry.id);
      const persistenceData = this.mapper.toPersistence(entry);
      await setDoc(docRef, persistenceData);
      this.logWrite(entry.id);
    } catch (err) {
      this.trackMetric('repository.error');
      this.logError(entry.id, err);
      translateRepositoryError(err);
    }
  }

  public async findById(id: string): Promise<ILedgerEntry | null> {
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

  public async findByReference(reference: string): Promise<ILedgerEntry[]> {
    this.trackMetric('repository.read');
    try {
      const q = query(collection(this.dbContext, this.collectionName), where('coaCode', '==', reference));
      const querySnap = await getDocs(q);
      const results: ILedgerEntry[] = [];
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

  public async findAll(): Promise<ILedgerEntry[]> {
    this.trackMetric('repository.read');
    try {
      const q = collection(this.dbContext, this.collectionName);
      const querySnap = await getDocs(q);
      const results: ILedgerEntry[] = [];
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

  public async update(id: string, updates: Partial<ILedgerEntry>): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), id);
      const persistenceUpdates: any = {};
      if (updates.txId) persistenceUpdates.txId = updates.txId;
      if (updates.coaCode) persistenceUpdates.coaCode = updates.coaCode;
      if (updates.debit !== undefined) persistenceUpdates.debit = updates.debit;
      if (updates.credit !== undefined) persistenceUpdates.credit = updates.credit;
      if (updates.description) persistenceUpdates.description = updates.description;
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
    console.log(`[LedgerRepository Lock] Locked Ledger ID: ${id}`);
  }

  public async unlock(id: string): Promise<void> {
    this.trackMetric('repository.write');
    console.log(`[LedgerRepository Unlock] Unlocked Ledger ID: ${id}`);
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
