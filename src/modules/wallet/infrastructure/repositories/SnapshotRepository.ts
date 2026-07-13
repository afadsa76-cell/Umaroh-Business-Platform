/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file SnapshotRepository.ts
 * @description Firestore implementation of the ISnapshotRepository.
 * @responsibility Persist and retrieve historical aggregate reconstruction snapshots.
 */

import { db, doc, collection, getDoc, getDocs, setDoc, updateDoc, query, where } from '../../../../firebase.js';
import { ISnapshotRepository, ISnapshotData } from '../../domain/repositories/ISnapshotRepository.js';
import { SnapshotMapper } from '../mappers/SnapshotMapper.js';
import { translateRepositoryError } from './RepositoryErrorTranslator.js';

export class SnapshotRepository implements ISnapshotRepository {
  private readonly dbContext: any;
  private readonly mapper = new SnapshotMapper();
  private readonly collectionName = 'aggregate_snapshots';

  /**
   * @constructor
   * @param dbContext - Injected Firestore database context.
   */
  constructor(dbContext?: any) {
    this.dbContext = dbContext || db;
  }

  // #region Logging & Observability
  private logRead(id: string): void {
    console.log(`[SnapshotRepository Read] ID: ${id}`);
  }
  private logWrite(id: string): void {
    console.log(`[SnapshotRepository Write] ID: ${id}`);
  }
  private logUpdate(id: string): void {
    console.log(`[SnapshotRepository Update] ID: ${id}`);
  }
  private logDelete(id: string): void {
    console.log(`[SnapshotRepository Delete] ID: ${id}`);
  }
  private logError(id: string, error: any): void {
    console.error(`[SnapshotRepository Error] ID: ${id}, Error:`, error);
  }

  private trackMetric(name: string, value: number = 1): void {
    console.log(`[Metric] ${name}: ${value}`);
  }
  // #endregion

  // #region Base 10 Operations
  public async create(snapshot: ISnapshotData): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), snapshot.id);
      const persistenceData = this.mapper.toPersistence(snapshot);
      await setDoc(docRef, persistenceData);
      this.logWrite(snapshot.id);
    } catch (err) {
      this.trackMetric('repository.error');
      this.logError(snapshot.id, err);
      translateRepositoryError(err);
    }
  }

  public async findById(id: string): Promise<ISnapshotData | null> {
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

  public async findByReference(reference: string): Promise<ISnapshotData[]> {
    this.trackMetric('repository.read');
    try {
      const q = query(collection(this.dbContext, this.collectionName), where('aggregateType', '==', reference));
      const querySnap = await getDocs(q);
      const results: ISnapshotData[] = [];
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

  public async findAll(): Promise<ISnapshotData[]> {
    this.trackMetric('repository.read');
    try {
      const q = collection(this.dbContext, this.collectionName);
      const querySnap = await getDocs(q);
      const results: ISnapshotData[] = [];
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

  public async update(id: string, updates: Partial<ISnapshotData>): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), id);
      const persistenceUpdates: any = {};
      if (updates.aggregateType) persistenceUpdates.aggregateType = updates.aggregateType;
      if (updates.version !== undefined) persistenceUpdates.version = updates.version;
      if (updates.state) persistenceUpdates.state = updates.state;
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
    console.log(`[SnapshotRepository Lock] Locked Snapshot ID: ${id}`);
  }

  public async unlock(id: string): Promise<void> {
    this.trackMetric('repository.write');
    console.log(`[SnapshotRepository Unlock] Unlocked Snapshot ID: ${id}`);
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
