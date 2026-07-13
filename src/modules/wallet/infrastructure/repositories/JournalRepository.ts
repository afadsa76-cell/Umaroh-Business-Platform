/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file JournalRepository.ts
 * @description Firestore implementation of the IJournalRepository.
 * @responsibility Persist and retrieve Journal header transactions securely.
 */

import { db, doc, collection, getDoc, getDocs, setDoc, updateDoc, query, where } from '../../../../firebase.js';
import { IJournalRepository, IJournalData } from '../../domain/repositories/IJournalRepository.js';
import { JournalMapper } from '../mappers/JournalMapper.js';
import { translateRepositoryError } from './RepositoryErrorTranslator.js';

export class JournalRepository implements IJournalRepository {
  private readonly dbContext: any;
  private readonly mapper = new JournalMapper();
  private readonly collectionName = 'journals';

  /**
   * @constructor
   * @param dbContext - Injected Firestore database context.
   */
  constructor(dbContext?: any) {
    this.dbContext = dbContext || db;
  }

  // #region Logging & Observability
  private logRead(id: string): void {
    console.log(`[JournalRepository Read] ID: ${id}`);
  }
  private logWrite(id: string): void {
    console.log(`[JournalRepository Write] ID: ${id}`);
  }
  private logUpdate(id: string): void {
    console.log(`[JournalRepository Update] ID: ${id}`);
  }
  private logDelete(id: string): void {
    console.log(`[JournalRepository Delete] ID: ${id}`);
  }
  private logError(id: string, error: any): void {
    console.error(`[JournalRepository Error] ID: ${id}, Error:`, error);
  }

  private trackMetric(name: string, value: number = 1): void {
    console.log(`[Metric] ${name}: ${value}`);
  }
  // #endregion

  // #region Existing Operations
  public async createJournal(journal: IJournalData): Promise<void> {
    await this.create(journal);
  }

  public async getByRef(ref: string): Promise<IJournalData | null> {
    const list = await this.findByReference(ref);
    return list.length > 0 ? list[0] : null;
  }
  // #endregion

  // #region Base 10 Operations
  public async create(journal: IJournalData): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), journal.id);
      const persistenceData = this.mapper.toPersistence(journal);
      await setDoc(docRef, persistenceData);
      this.logWrite(journal.id);
    } catch (err) {
      this.trackMetric('repository.error');
      this.logError(journal.id, err);
      translateRepositoryError(err);
    }
  }

  public async findById(id: string): Promise<IJournalData | null> {
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

  public async findByReference(reference: string): Promise<IJournalData[]> {
    this.trackMetric('repository.read');
    try {
      const q = query(collection(this.dbContext, this.collectionName), where('referenceNumber', '==', reference));
      const querySnap = await getDocs(q);
      const results: IJournalData[] = [];
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

  public async findAll(): Promise<IJournalData[]> {
    this.trackMetric('repository.read');
    try {
      const q = collection(this.dbContext, this.collectionName);
      const querySnap = await getDocs(q);
      const results: IJournalData[] = [];
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

  public async update(id: string, updates: Partial<IJournalData>): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), id);
      const persistenceUpdates: any = {};
      if (updates.referenceNumber) persistenceUpdates.referenceNumber = updates.referenceNumber;
      if (updates.sourceContext) persistenceUpdates.sourceContext = updates.sourceContext;
      if (updates.totalDebit !== undefined) persistenceUpdates.totalDebit = updates.totalDebit;
      if (updates.totalCredit !== undefined) persistenceUpdates.totalCredit = updates.totalCredit;
      if (updates.postedAt) persistenceUpdates.postedAt = updates.postedAt;
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
    console.log(`[JournalRepository Lock] Locked Journal ID: ${id}`);
  }

  public async unlock(id: string): Promise<void> {
    this.trackMetric('repository.write');
    console.log(`[JournalRepository Unlock] Unlocked Journal ID: ${id}`);
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
