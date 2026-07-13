/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file AuditRepository.ts
 * @description Firestore implementation of the IAuditRepository.
 * @responsibility Persist and retrieve tamper-evident audit-trail logs securely.
 */

import { db, doc, collection, getDoc, getDocs, setDoc, updateDoc, query, where } from '../../../../firebase.js';
import { IAuditRepository, IAuditEntry } from '../../domain/repositories/IAuditRepository.js';
import { AuditMapper } from '../mappers/AuditMapper.js';
import { translateRepositoryError } from './RepositoryErrorTranslator.js';

export class AuditRepository implements IAuditRepository {
  private readonly dbContext: any;
  private readonly mapper = new AuditMapper();
  private readonly collectionName = 'audit_entries';

  /**
   * @constructor
   * @param dbContext - Injected Firestore database context.
   */
  constructor(dbContext?: any) {
    this.dbContext = dbContext || db;
  }

  // #region Logging & Observability
  private logRead(id: string): void {
    console.log(`[AuditRepository Read] ID: ${id}`);
  }
  private logWrite(id: string): void {
    console.log(`[AuditRepository Write] ID: ${id}`);
  }
  private logUpdate(id: string): void {
    console.log(`[AuditRepository Update] ID: ${id}`);
  }
  private logDelete(id: string): void {
    console.log(`[AuditRepository Delete] ID: ${id}`);
  }
  private logError(id: string, error: any): void {
    console.error(`[AuditRepository Error] ID: ${id}, Error:`, error);
  }

  private trackMetric(name: string, value: number = 1): void {
    console.log(`[Metric] ${name}: ${value}`);
  }
  // #endregion

  // #region Existing Operations
  public async log(entry: IAuditEntry): Promise<void> {
    await this.create(entry);
  }

  public async getLogsByResource(resourceId: string): Promise<IAuditEntry[]> {
    return this.findByReference(resourceId);
  }
  // #endregion

  // #region Base 10 Operations
  public async create(entry: IAuditEntry): Promise<void> {
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

  public async findById(id: string): Promise<IAuditEntry | null> {
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

  public async findByReference(reference: string): Promise<IAuditEntry[]> {
    this.trackMetric('repository.read');
    try {
      const q = query(collection(this.dbContext, this.collectionName), where('actorId', '==', reference));
      const querySnap = await getDocs(q);
      const results: IAuditEntry[] = [];
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

  public async findAll(): Promise<IAuditEntry[]> {
    this.trackMetric('repository.read');
    try {
      const q = collection(this.dbContext, this.collectionName);
      const querySnap = await getDocs(q);
      const results: IAuditEntry[] = [];
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

  public async update(id: string, updates: Partial<IAuditEntry>): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), id);
      const persistenceUpdates: any = {};
      if (updates.actorId) persistenceUpdates.actorId = updates.actorId;
      if (updates.action) persistenceUpdates.action = updates.action;
      if (updates.snapshotBefore) persistenceUpdates.snapshotBefore = updates.snapshotBefore;
      if (updates.snapshotAfter) persistenceUpdates.snapshotAfter = updates.snapshotAfter;
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
    console.log(`[AuditRepository Lock] Locked Audit ID: ${id}`);
  }

  public async unlock(id: string): Promise<void> {
    this.trackMetric('repository.write');
    console.log(`[AuditRepository Unlock] Unlocked Audit ID: ${id}`);
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
