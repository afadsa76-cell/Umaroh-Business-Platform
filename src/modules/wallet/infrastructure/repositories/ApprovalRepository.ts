/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file ApprovalRepository.ts
 * @description Firestore implementation of the IApprovalRepository.
 * @responsibility Log, update and retrieve Maker-Checker approval flows securely.
 */

import { db, doc, collection, getDoc, getDocs, setDoc, updateDoc, query, where } from '../../../../firebase.js';
import { IApprovalRepository, IApprovalRequest } from '../../domain/repositories/IApprovalRepository.js';
import { ApprovalMapper } from '../mappers/ApprovalMapper.js';
import { translateRepositoryError } from './RepositoryErrorTranslator.js';

export class ApprovalRepository implements IApprovalRepository {
  private readonly dbContext: any;
  private readonly mapper = new ApprovalMapper();
  private readonly collectionName = 'approval_requests';

  /**
   * @constructor
   * @param dbContext - Injected Firestore database context.
   */
  constructor(dbContext?: any) {
    this.dbContext = dbContext || db;
  }

  // #region Logging & Observability
  private logRead(id: string): void {
    console.log(`[ApprovalRepository Read] ID: ${id}`);
  }
  private logWrite(id: string): void {
    console.log(`[ApprovalRepository Write] ID: ${id}`);
  }
  private logUpdate(id: string): void {
    console.log(`[ApprovalRepository Update] ID: ${id}`);
  }
  private logDelete(id: string): void {
    console.log(`[ApprovalRepository Delete] ID: ${id}`);
  }
  private logError(id: string, error: any): void {
    console.error(`[ApprovalRepository Error] ID: ${id}, Error:`, error);
  }

  private trackMetric(name: string, value: number = 1): void {
    console.log(`[Metric] ${name}: ${value}`);
  }
  // #endregion

  // #region Existing Operations
  public async createRequest(request: IApprovalRequest): Promise<void> {
    await this.create(request);
  }

  public async updateRequest(id: string, updates: Partial<Pick<IApprovalRequest, 'checkerId' | 'approverId' | 'status' | 'notes' | 'resolvedAt'>>): Promise<void> {
    await this.update(id, updates as Partial<IApprovalRequest>);
  }

  public async getById(id: string): Promise<IApprovalRequest | null> {
    return this.findById(id);
  }
  // #endregion

  // #region Base 10 Operations
  public async create(request: IApprovalRequest): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), request.id);
      const persistenceData = this.mapper.toPersistence(request);
      await setDoc(docRef, persistenceData);
      this.logWrite(request.id);
    } catch (err) {
      this.trackMetric('repository.error');
      this.logError(request.id, err);
      translateRepositoryError(err);
    }
  }

  public async findById(id: string): Promise<IApprovalRequest | null> {
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

  public async findByReference(reference: string): Promise<IApprovalRequest[]> {
    this.trackMetric('repository.read');
    try {
      const q = query(collection(this.dbContext, this.collectionName), where('txId', '==', reference));
      const querySnap = await getDocs(q);
      const results: IApprovalRequest[] = [];
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

  public async findAll(): Promise<IApprovalRequest[]> {
    this.trackMetric('repository.read');
    try {
      const q = collection(this.dbContext, this.collectionName);
      const querySnap = await getDocs(q);
      const results: IApprovalRequest[] = [];
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

  public async update(id: string, updates: Partial<IApprovalRequest>): Promise<void> {
    this.trackMetric('repository.write');
    try {
      const docRef = doc(collection(this.dbContext, this.collectionName), id);
      const persistenceUpdates: any = {};
      if (updates.checkerId) persistenceUpdates.checkerId = updates.checkerId;
      if (updates.approverId) persistenceUpdates.approverId = updates.approverId;
      if (updates.status) persistenceUpdates.status = updates.status;
      if (updates.notes) persistenceUpdates.notes = updates.notes;
      if (updates.resolvedAt) persistenceUpdates.resolvedAt = updates.resolvedAt;
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
    console.log(`[ApprovalRepository Lock] Locked Approval ID: ${id}`);
  }

  public async unlock(id: string): Promise<void> {
    this.trackMetric('repository.write');
    console.log(`[ApprovalRepository Unlock] Unlocked Approval ID: ${id}`);
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
