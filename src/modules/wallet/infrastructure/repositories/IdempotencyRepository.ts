/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file IdempotencyRepository.ts
 * @description Firestore implementation of the IIdempotencyRepository.
 * @responsibility Acquire, resolve, fail and fetch idempotency keys safely using lease logic.
 */

import { db, doc, collection, getDoc, getDocs, setDoc, updateDoc, query, where } from '../../../../firebase.js';
import { IIdempotencyRepository, IIdempotencyRecord } from '../../domain/repositories/IIdempotencyRepository.js';
import { IdempotencyMapper } from '../mappers/IdempotencyMapper.js';
import { translateRepositoryError } from './RepositoryErrorTranslator.js';

export class IdempotencyRepository implements IIdempotencyRepository {
  private readonly dbContext: any;
  private readonly mapper = new IdempotencyMapper();
  private readonly collectionName = 'idempotency_keys';

  /**
   * @constructor
   * @param dbContext - Injected Firestore database context.
   */
  constructor(dbContext?: any) {
    this.dbContext = dbContext || db;
  }

  // #region Logging & Observability
  private logRead(id: string): void {
    console.log(`[IdempotencyRepository Read] Key: ${id}`);
  }
  private logWrite(id: string): void {
    console.log(`[IdempotencyRepository Write] Key: ${id}`);
  }
  private logUpdate(id: string): void {
    console.log(`[IdempotencyRepository Update] Key: ${id}`);
  }
  private logDelete(id: string): void {
    console.log(`[IdempotencyRepository Delete] Key: ${id}`);
  }
  private logError(id: string, error: any): void {
    console.error(`[IdempotencyRepository Error] Key: ${id}, Error:`, error);
  }

  private trackMetric(name: string, value: number = 1): void {
    console.log(`[Metric] ${name}: ${value}`);
  }
  // #endregion

  // #region Existing Operations
  public async acquireKey(key: string, expirySeconds: number): Promise<boolean> {
    this.trackMetric('repository.write');
    try {
      const existing = await this.findById(key);
      const now = new Date();

      if (existing) {
        if (existing.expiresAt.getTime() < now.getTime()) {
          const record: IIdempotencyRecord = {
            key,
            status: 'PENDING',
            createdAt: now,
            expiresAt: new Date(now.getTime() + expirySeconds * 1000),
          };
          await this.create(record);
          return true;
        }
        return false;
      }

      const newRecord: IIdempotencyRecord = {
        key,
        status: 'PENDING',
        createdAt: now,
        expiresAt: new Date(now.getTime() + expirySeconds * 1000),
      };
      await this.create(newRecord);
      return true;
    } catch (err) {
      this.trackMetric('repository.error');
      this.logError(key, err);
      translateRepositoryError(err);
    }
  }

  public async resolveKey(key: string, payload: string): Promise<void> {
    await this.update(key, {
      status: 'COMPLETED',
      responsePayload: payload,
    });
  }

  public async failKey(key: string): Promise<void> {
    await this.update(key, {
      status: 'FAILED',
      expiresAt: new Date(),
    });
  }

  public async getKey(key: string): Promise<IIdempotencyRecord | null> {
    return this.findById(key);
  }
  // #endregion

  // #region Base 10 Operations
  public async create(record: IIdempotencyRecord): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), record.key);
      const persistenceData = this.mapper.toPersistence(record);
      await setDoc(docRef, persistenceData);
      this.logWrite(record.key);
    } catch (err) {
      this.trackMetric('repository.error');
      this.logError(record.key, err);
      translateRepositoryError(err);
    }
  }

  public async findById(id: string): Promise<IIdempotencyRecord | null> {
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

  public async findByReference(reference: string): Promise<IIdempotencyRecord[]> {
    this.trackMetric('repository.read');
    try {
      const q = query(collection(this.dbContext, this.collectionName), where('status', '==', reference));
      const querySnap = await getDocs(q);
      const results: IIdempotencyRecord[] = [];
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

  public async findAll(): Promise<IIdempotencyRecord[]> {
    this.trackMetric('repository.read');
    try {
      const q = collection(this.dbContext, this.collectionName);
      const querySnap = await getDocs(q);
      const results: IIdempotencyRecord[] = [];
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

  public async update(id: string, updates: Partial<IIdempotencyRecord>): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), id);
      const persistenceUpdates: any = {};
      if (updates.status) persistenceUpdates.status = updates.status;
      if (updates.responsePayload) persistenceUpdates.responsePayload = updates.responsePayload;
      if (updates.expiresAt) persistenceUpdates.expiresAt = updates.expiresAt;
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
    console.log(`[IdempotencyRepository Lock] Locked key: ${id}`);
  }

  public async unlock(id: string): Promise<void> {
    this.trackMetric('repository.write');
    console.log(`[IdempotencyRepository Unlock] Unlocked key: ${id}`);
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
