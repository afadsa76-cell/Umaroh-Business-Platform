/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file TransactionContext.ts
 * @description State carrier and action proxy for standard active transactions.
 */

import { TransactionOptions } from './TransactionOptions.js';
import { TransactionLockManager } from './TransactionLockManager.js';
import { TransactionMetrics } from './TransactionMetrics.js';
import { getDoc, getDocs, setDoc, updateDoc, deleteDoc } from '../../../../firebase.js';

export class TransactionContext {
  public readonly id: string;
  public status: 'ACTIVE' | 'COMMITTED' | 'ROLLED_BACK' | 'FAILED' | 'CANCELLED';
  public readonly options: TransactionOptions;
  public attempt: number = 0;
  public readonly startTime: Date;
  public endTime?: Date;
  
  // The raw Firestore transaction object passed inside Firestore's runTransaction
  private firestoreTransaction: any = null;
  private readonly lockManager = TransactionLockManager.getInstance();
  private readonly metrics = TransactionMetrics.getInstance();

  constructor(id: string, options: TransactionOptions = {}) {
    this.id = id;
    this.status = 'ACTIVE';
    this.options = options;
    this.startTime = new Date();
  }

  /**
   * Sets the active Firestore Transaction instance for this context.
   */
  public setFirestoreTransaction(tx: any): void {
    this.firestoreTransaction = tx;
  }

  /**
   * Gets the active Firestore Transaction instance.
   */
  public getFirestoreTransaction(): any {
    return this.firestoreTransaction;
  }

  /**
   * Increments the retry attempt counter.
   */
  public incrementAttempt(): void {
    this.attempt++;
    this.metrics.increment('transaction.retry');
  }

  /**
   * Acquires the configured resources locks.
   */
  public async acquireLocks(): Promise<void> {
    if (this.options.lockIds && this.options.lockIds.length > 0) {
      await this.lockManager.acquireLocks(this.id, this.options.lockIds, this.options.timeoutMs ?? 5000);
    }
  }

  /**
   * Releases all held resource locks.
   */
  public releaseLocks(): void {
    if (this.options.lockIds && this.options.lockIds.length > 0) {
      this.lockManager.releaseLocks(this.id, this.options.lockIds);
    }
  }

  /**
   * Transition state with verification.
   */
  public transitionTo(newStatus: typeof this.status): void {
    console.log(`[TransactionContext] ${this.id} transitioning state: ${this.status} -> ${newStatus}`);
    
    if (this.status === 'COMMITTED' || this.status === 'ROLLED_BACK' || this.status === 'CANCELLED') {
      console.warn(`[TransactionContext] Already in terminal state: ${this.status}. Ignoring transition to ${newStatus}`);
      return;
    }

    this.status = newStatus;
    if (newStatus === 'COMMITTED' || newStatus === 'ROLLED_BACK' || newStatus === 'CANCELLED' || newStatus === 'FAILED') {
      this.endTime = new Date();
      const duration = this.endTime.getTime() - this.startTime.getTime();
      this.metrics.recordDuration(duration);
    }
  }

  // #region Transaction-Aware Data Access Operations
  
  /**
   * Reads a document inside the transaction context.
   * If inside Firestore transaction, uses transaction.get(). Otherwise, falls back to getDoc().
   */
  public async get(docRef: any): Promise<any> {
    if (this.firestoreTransaction) {
      console.log(`[TransactionContext ${this.id}] Executing transactional GET on ${docRef.path || docRef.id}`);
      return await this.firestoreTransaction.get(docRef);
    } else {
      console.log(`[TransactionContext ${this.id}] Executing fallback GET on ${docRef.path || docRef.id}`);
      return await getDoc(docRef);
    }
  }

  /**
   * Sets a document inside the transaction context.
   * If inside Firestore transaction, uses transaction.set(). Otherwise, falls back to setDoc().
   */
  public async set(docRef: any, data: any): Promise<void> {
    if (this.firestoreTransaction) {
      console.log(`[TransactionContext ${this.id}] Executing transactional SET on ${docRef.path || docRef.id}`);
      this.firestoreTransaction.set(docRef, data);
    } else {
      console.log(`[TransactionContext ${this.id}] Executing fallback SET on ${docRef.path || docRef.id}`);
      await setDoc(docRef, data);
    }
  }

  /**
   * Updates a document inside the transaction context.
   * If inside Firestore transaction, uses transaction.update(). Otherwise, falls back to updateDoc().
   */
  public async update(docRef: any, data: any): Promise<void> {
    if (this.firestoreTransaction) {
      console.log(`[TransactionContext ${this.id}] Executing transactional UPDATE on ${docRef.path || docRef.id}`);
      this.firestoreTransaction.update(docRef, data);
    } else {
      console.log(`[TransactionContext ${this.id}] Executing fallback UPDATE on ${docRef.path || docRef.id}`);
      await updateDoc(docRef, data);
    }
  }

  /**
   * Deletes a document inside the transaction context.
   * If inside Firestore transaction, uses transaction.delete(). Otherwise, falls back to deleteDoc().
   */
  public async delete(docRef: any): Promise<void> {
    if (this.firestoreTransaction) {
      console.log(`[TransactionContext ${this.id}] Executing transactional DELETE on ${docRef.path || docRef.id}`);
      this.firestoreTransaction.delete(docRef);
    } else {
      console.log(`[TransactionContext ${this.id}] Executing fallback DELETE on ${docRef.path || docRef.id}`);
      await deleteDoc(docRef);
    }
  }

  /**
   * Helper to fetch a collection query inside the transaction context.
   */
  public async getQuery(queryRef: any): Promise<any> {
    // Note: Firestore transactions do not natively support runQuery inside the transaction callback 
    // unless done via regular query and filtering or reading individual documents, so we perform fallback.
    console.log(`[TransactionContext ${this.id}] Executing GET query fallback`);
    return await getDocs(queryRef);
  }

  // #endregion
}
