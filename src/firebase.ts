/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection as origCollection, 
  onSnapshot as origOnSnapshot, 
  doc as origDoc, 
  getDoc as origGetDoc, 
  getDocs as origGetDocs, 
  updateDoc as origUpdateDoc, 
  addDoc as origAddDoc, 
  setDoc as origSetDoc, 
  deleteDoc as origDeleteDoc, 
  query as origQuery, 
  where as origWhere, 
  writeBatch as origWriteBatch, 
  serverTimestamp, 
  increment, 
  arrayUnion, 
  arrayRemove, 
  orderBy, 
  limit, 
  startAfter, 
  endBefore, 
  runTransaction as origRunTransaction
} from 'firebase/firestore';
import { runtime } from './core/firestore/FirestoreRuntime';
import { FirestoreListenerRegistry } from './core/firestore/FirestoreListenerRegistry';

// Centralized DB and Auth instances using Firestore Runtime Singleton
export const db = runtime.db;
export const auth = getAuth(runtime.app);
export const googleProvider = new GoogleAuthProvider();

// ============================================================================
// STEP 1 & 2: Error Categorization & Translation
// ============================================================================
export function translateError(err: any): Error {
  if (!err) return new Error('Unknown Firestore Error');
  
  // Extract Firebase error details safely
  const code = err.code || '';
  const msg = err.message || String(err);
  const lowerMsg = msg.toLowerCase();

  // Strict mapping conforming to Step 2
  if (code === 'permission-denied' || lowerMsg.includes('permission-denied') || lowerMsg.includes('insufficient permissions')) {
    return new Error(`Permission Error: Access denied. ${msg}`);
  }
  if (code === 'resource-exhausted' || lowerMsg.includes('resource-exhausted') || lowerMsg.includes('quota')) {
    return new Error(`Quota Error: Firestore resource quota exhausted. ${msg}`);
  }
  if (code === 'unavailable' || lowerMsg.includes('unavailable') || lowerMsg.includes('could not reach cloud firestore backend') || lowerMsg.includes('failed to connect')) {
    return new Error(`Offline: Cloud Firestore backend unavailable. ${msg}`);
  }
  if (code === 'deadline-exceeded' || lowerMsg.includes('deadline-exceeded') || lowerMsg.includes('timeout')) {
    return new Error(`Retry: Operation deadline exceeded. ${msg}`);
  }
  if (code === 'cancelled' || lowerMsg.includes('cancelled')) {
    return new Error(`Ignore: Operation cancelled. ${msg}`);
  }
  if (code === 'network-request-failed' || lowerMsg.includes('network-request-failed')) {
    return new Error(`Offline: Network request failed. ${msg}`);
  }

  return err instanceof Error ? err : new Error(msg);
}

// ============================================================================
// WeakMaps for Reference metadata tracking (O(1) Memory Usage)
// ============================================================================
const refMetadata = new WeakMap<any, {
  hybridType: 'collection' | 'doc' | 'query';
  hybridPath: string;
  hybridId: string | null;
  hybridConditions?: { field: string; op: string; value: any }[];
}>();

const constraintMetadata = new WeakMap<any, {
  field: string;
  op: string;
  value: any;
}>();

// ============================================================================
// Deterministic Query Key Generator for Deduplication
// ============================================================================
function getQueryKey(ref: any): string {
  const meta = refMetadata.get(ref);
  if (!meta) {
    return ref.path || 'unknown';
  }
  if (meta.hybridType === 'collection') {
    return `collection:${meta.hybridPath}`;
  }
  if (meta.hybridType === 'doc') {
    return `doc:${meta.hybridPath}/${meta.hybridId}`;
  }
  if (meta.hybridType === 'query') {
    const conditionsStr = (meta.hybridConditions || [])
      .map(c => `${c.field}:${c.op}:${JSON.stringify(c.value)}`)
      .join(',');
    return `query:${meta.hybridPath}?${conditionsStr}`;
  }
  return ref.path || 'unknown';
}

// ============================================================================
// STEP 2.5: Global Firestore Query Cache
// ============================================================================
export class FirestoreQueryCache {
  private static instance: FirestoreQueryCache;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 8000; // 8 seconds default TTL

  // Telemetry Metrics
  public hits = 0;
  public misses = 0;
  public reads = 0;
  public writes = 0;
  public deletes = 0;

  public static getInstance(): FirestoreQueryCache {
    const globalKey = '__firestore_query_cache__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FirestoreQueryCache();
    }
    return (globalThis as any)[globalKey];
  }

  public get(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp < this.ttl)) {
      this.hits++;
      return cached.data;
    }
    this.misses++;
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  public set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  public invalidate(path: string): void {
    if (!path) return;
    const cleanPath = path.trim().replace(/^\/|\/$/g, '');
    const keysToInvalidate: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(cleanPath)) {
        keysToInvalidate.push(key);
      }
    });
    keysToInvalidate.forEach(k => {
      this.cache.delete(k);
      console.log(`[Query Cache] Invalidated cached key: ${k} due to write to: ${cleanPath}`);
    });
  }

  public clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// STEP 3: Highly Simplified and Ultra-Stable Enterprise Wrappers
// ============================================================================

export function collection(dbInstance: any, path: string): any {
  const orig = origCollection(dbInstance, path);
  refMetadata.set(orig, {
    hybridType: 'collection',
    hybridPath: path,
    hybridId: null
  });
  return orig;
}

export function doc(first: any, ...pathSegments: string[]): any {
  const orig = origDoc(first, ...pathSegments);
  const fullPath = orig.path;
  const parts = fullPath.split('/');
  const path = parts.slice(0, -1).join('/');
  const id = parts[parts.length - 1];
  refMetadata.set(orig, {
    hybridType: 'doc',
    hybridPath: path,
    hybridId: id
  });
  return orig;
}

export function where(field: string, op: string, value: any): any {
  const orig = origWhere(field, op as any, value);
  constraintMetadata.set(orig, {
    field,
    op,
    value
  });
  return orig;
}

export function query(collectionRef: any, ...constraints: any[]): any {
  const origRef = origQuery(collectionRef, ...constraints);
  const parentMeta = refMetadata.get(collectionRef);
  const path = parentMeta?.hybridPath || collectionRef.path || 'unknown';
  
  const conditions: { field: string; op: string; value: any }[] = [];
  for (const c of constraints) {
    const meta = constraintMetadata.get(c);
    if (meta) {
      conditions.push(meta);
    }
  }

  refMetadata.set(origRef, {
    hybridType: 'query',
    hybridPath: path,
    hybridId: null,
    hybridConditions: conditions
  });
  return origRef;
}

export async function getDoc(docRef: any): Promise<any> {
  const key = getQueryKey(docRef);
  const cached = FirestoreQueryCache.getInstance().get(key);
  if (cached) {
    console.log(`[Query Cache] Returning cached getDoc for: ${key}`);
    return cached;
  }
  try {
    FirestoreQueryCache.getInstance().reads++;
    const docSnap = await origGetDoc(docRef);
    FirestoreQueryCache.getInstance().set(key, docSnap);
    return docSnap;
  } catch (err) {
    throw translateError(err);
  }
}

export async function getDocs(ref: any): Promise<any> {
  const key = getQueryKey(ref);
  const cached = FirestoreQueryCache.getInstance().get(key);
  if (cached) {
    console.log(`[Query Cache] Returning cached getDocs for: ${key}`);
    return cached;
  }
  try {
    FirestoreQueryCache.getInstance().reads++;
    const querySnap = await origGetDocs(ref);
    FirestoreQueryCache.getInstance().set(key, querySnap);
    return querySnap;
  } catch (err) {
    throw translateError(err);
  }
}

export async function setDoc(reference: any, ...args: any[]): Promise<any> {
  try {
    FirestoreQueryCache.getInstance().writes++;
    const res = await (origSetDoc as any)(reference, ...args);
    if (reference && reference.path) {
      FirestoreQueryCache.getInstance().invalidate(reference.path);
    }
    return res;
  } catch (err) {
    throw translateError(err);
  }
}

export async function updateDoc(reference: any, ...args: any[]): Promise<any> {
  try {
    FirestoreQueryCache.getInstance().writes++;
    const res = await (origUpdateDoc as any)(reference, ...args);
    if (reference && reference.path) {
      FirestoreQueryCache.getInstance().invalidate(reference.path);
    }
    return res;
  } catch (err) {
    throw translateError(err);
  }
}

export async function deleteDoc(reference: any, ...args: any[]): Promise<any> {
  try {
    FirestoreQueryCache.getInstance().deletes++;
    const res = await (origDeleteDoc as any)(reference, ...args);
    if (reference && reference.path) {
      FirestoreQueryCache.getInstance().invalidate(reference.path);
    }
    return res;
  } catch (err) {
    throw translateError(err);
  }
}

export async function addDoc(reference: any, ...args: any[]): Promise<any> {
  try {
    FirestoreQueryCache.getInstance().writes++;
    const res = await (origAddDoc as any)(reference, ...args);
    if (reference && reference.path) {
      FirestoreQueryCache.getInstance().invalidate(reference.path);
    }
    return res;
  } catch (err) {
    throw translateError(err);
  }
}

export async function runTransaction(firestore: any, updateFunction: any, ...args: any[]): Promise<any> {
  try {
    const res = await (origRunTransaction as any)(firestore, updateFunction, ...args);
    // Since transaction can write to any document, clear the entire query cache to be absolutely consistent.
    FirestoreQueryCache.getInstance().clear();
    return res;
  } catch (err) {
    throw translateError(err);
  }
}

export function writeBatch(firestoreInstance: any): any {
  const origBatch = origWriteBatch(firestoreInstance);
  const affectedPaths: string[] = [];
  return {
    set: (docRef: any, data: any, ...options: any[]) => {
      if (docRef && docRef.path) affectedPaths.push(docRef.path);
      (origBatch as any).set(docRef, data, ...options);
    },
    update: (docRef: any, data: any, ...options: any[]) => {
      if (docRef && docRef.path) affectedPaths.push(docRef.path);
      (origBatch as any).update(docRef, data, ...options);
    },
    delete: (docRef: any) => {
      if (docRef && docRef.path) affectedPaths.push(docRef.path);
      origBatch.delete(docRef);
    },
    commit: async () => {
      try {
        await origBatch.commit();
        affectedPaths.forEach(path => {
          FirestoreQueryCache.getInstance().invalidate(path);
        });
      } catch (err) {
        throw translateError(err);
      }
    }
  };
}

// ============================================================================
// STEP 5: Deduplicated and Leak-Free Subscriber Management via ListenerRegistry
// ============================================================================
export function onSnapshot(ref: any, ...args: any[]): any {
  const onNext = typeof args[0] === 'function' ? args[0] : args[1];
  const onError = typeof args[0] === 'function' ? args[1] : args[2];

  const queryKey = getQueryKey(ref);
  const meta = refMetadata.get(ref);
  const path = meta?.hybridPath || ref.path || 'unknown';

  const registry = FirestoreListenerRegistry.getInstance();

  return registry.subscribe(
    queryKey,
    path,
    (distributeNext) => {
      // Set up the real listener
      return origOnSnapshot(
        ref,
        (snap: any) => {
          distributeNext(snap);
        },
        (err: any) => {
          const categorized = translateError(err);
          if (categorized.message.startsWith('Ignore:')) {
            // Ignore cancelled operations silently
            return;
          }
          if (onError) {
            onError(categorized);
          } else {
            console.error('[onSnapshot error]', categorized);
          }
        }
      );
    },
    (snap) => {
      onNext(snap);
    }
  );
}

// ============================================================================
// Legacy compatibility support (to keep other files building perfectly)
// ============================================================================
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const categorized = translateError(error);
  console.error(`[Firestore Error] Operation: ${operationType}, Path: ${path}`, categorized);
  throw categorized;
}

export { 
  serverTimestamp, increment, arrayUnion, arrayRemove, orderBy, limit, startAfter, endBefore,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged
};
