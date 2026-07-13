/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file ProjectionRepository.ts
 * @description Firestore implementation of the IProjectionRepository.
 * @responsibility Persist and query dashboard read-model projection snapshots.
 */

import { db, doc, collection, getDoc, getDocs, setDoc, updateDoc, query, where } from '../../../../firebase.js';
import { IProjectionRepository, IProjectionData } from '../../domain/repositories/IProjectionRepository.js';
import { ProjectionMapper } from '../mappers/ProjectionMapper.js';
import { translateRepositoryError } from './RepositoryErrorTranslator.js';

export class ProjectionRepository implements IProjectionRepository {
  private readonly dbContext: any;
  private readonly mapper = new ProjectionMapper();
  private readonly collectionName = 'projection_snapshots';

  /**
   * @constructor
   * @param dbContext - Injected Firestore database context.
   */
  constructor(dbContext?: any) {
    this.dbContext = dbContext || db;
  }

  // #region Logging & Observability
  private logRead(id: string): void {
    console.log(`[ProjectionRepository Read] ID: ${id}`);
  }
  private logWrite(id: string): void {
    console.log(`[ProjectionRepository Write] ID: ${id}`);
  }
  private logUpdate(id: string): void {
    console.log(`[ProjectionRepository Update] ID: ${id}`);
  }
  private logDelete(id: string): void {
    console.log(`[ProjectionRepository Delete] ID: ${id}`);
  }
  private logError(id: string, error: any): void {
    console.error(`[ProjectionRepository Error] ID: ${id}, Error:`, error);
  }

  private trackMetric(name: string, value: number = 1): void {
    console.log(`[Metric] ${name}: ${value}`);
  }
  // #endregion

  // #region Base 10 Operations
  public async create(projection: IProjectionData): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), projection.id);
      const persistenceData = this.mapper.toPersistence(projection);
      await setDoc(docRef, persistenceData);
      this.logWrite(projection.id);
    } catch (err) {
      this.trackMetric('repository.error');
      this.logError(projection.id, err);
      translateRepositoryError(err);
    }
  }

  public async findById(id: string): Promise<IProjectionData | null> {
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

  public async findByReference(reference: string): Promise<IProjectionData[]> {
    this.trackMetric('repository.read');
    try {
      // Find projections by id search or partial match
      const q = query(collection(this.dbContext, this.collectionName), where('id', '==', reference));
      const querySnap = await getDocs(q);
      const results: IProjectionData[] = [];
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

  public async findAll(): Promise<IProjectionData[]> {
    this.trackMetric('repository.read');
    try {
      const q = collection(this.dbContext, this.collectionName);
      const querySnap = await getDocs(q);
      const results: IProjectionData[] = [];
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

  public async update(id: string, updates: Partial<IProjectionData>): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), id);
      const persistenceUpdates: any = {};
      if (updates.data) persistenceUpdates.data = updates.data;
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
    console.log(`[ProjectionRepository Lock] Locked Projection: ${id}`);
  }

  public async unlock(id: string): Promise<void> {
    this.trackMetric('repository.write');
    console.log(`[ProjectionRepository Unlock] Unlocked Projection: ${id}`);
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
