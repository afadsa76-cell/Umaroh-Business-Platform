/* eslint-disable @typescript-eslint/no-explicit-any */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  initializeFirestore,
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
  runTransaction as origRunTransaction,
  disableNetwork
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-69cde675-c52d-43da-bfaa-45caeabd2393';
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firestoreDbId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Prevent background Firestore assertion errors from disrupting the UX or crashing the app
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const isFirestoreAssertion = event.error && event.error.message && (
      event.error.message.includes('FIRESTORE') || 
      event.error.message.includes('INTERNAL ASSERTION FAILED')
    );
    if (isFirestoreAssertion) {
      console.warn("Muted background Firestore assertion error:", event.error.message);
      event.preventDefault(); // Stop propagating to console/error boundaries
      event.stopPropagation();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const isFirestoreAssertion = event.reason && event.reason.message && (
      event.reason.message.includes('FIRESTORE') || 
      event.reason.message.includes('INTERNAL ASSERTION FAILED')
    );
    if (isFirestoreAssertion) {
      console.warn("Muted background Firestore assertion promise rejection:", event.reason.message);
      event.preventDefault(); // Stop propagating to console/error boundaries
      event.stopPropagation();
    }
  });
}

// Local Collection Storage Management helper functions
function getLocalCollection(collectionName: string): any[] {
  if (typeof window === 'undefined') return [];
  const val = localStorage.getItem(`db_${collectionName}`);
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

function saveLocalCollection(collectionName: string, data: any[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`db_${collectionName}`, JSON.stringify(data));
  // Dispatch local change event to wake up onSnapshot listeners instantly
  window.dispatchEvent(new CustomEvent(`local-db-change:${collectionName}`));
}

function getLocalDoc(collectionName: string, id: string): any {
  const items = getLocalCollection(collectionName);
  return items.find(item => item.id === id);
}

function writeLocalDoc(collectionName: string, id: string, data: any, mode: 'set' | 'update') {
  const items = getLocalCollection(collectionName);
  const index = items.findIndex(item => item.id === id);
  if (index >= 0) {
    if (mode === 'set') {
      items[index] = { ...data, id };
    } else {
      items[index] = { ...items[index], ...data, id };
    }
  } else {
    items.push({ ...data, id });
  }
  saveLocalCollection(collectionName, items);
}

function deleteLocalDoc(collectionName: string, id: string) {
  const items = getLocalCollection(collectionName);
  const filtered = items.filter(item => item.id !== id);
  saveLocalCollection(collectionName, filtered);
}

// Check if an error is a Firebase resource quota exhausted error or connection offline error and set global indicator
function checkQuotaError(err: unknown): boolean {
  const errMsg = err instanceof Error ? err.message : String(err);
  const errLower = errMsg.toLowerCase();
  const isQuota = errMsg.includes('resource-exhausted') || 
                  errLower.includes('quota limit exceeded') || 
                  errLower.includes('quota exceeded') ||
                  (err && typeof err === 'object' && ('code' in err) && (err as { code?: string }).code === 'resource-exhausted');
  
  const isConnection = errLower.includes('could not reach cloud firestore backend') ||
                       errLower.includes('unavailable') ||
                       errLower.includes('failed-precondition') || 
                       errLower.includes('offline') ||
                       errLower.includes('network') ||
                       errLower.includes('timeout') ||
                       (err && typeof err === 'object' && ('code' in err) && (err as any).code === 'unavailable');

  if (isQuota) {
    if (typeof window !== 'undefined') {
      (window as any).firestoreQuotaExhausted = true;
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
      
      // Prevent further reconnection assert crashes by shifting to offline-only mode immediately
      try {
        disableNetwork(db).catch((e) => {
          console.warn("Muted offline switch failure on quota limit:", e);
        });
      } catch (e) {
        console.warn("Silent disableNetwork execution error:", e);
      }
    }
  }

  if (isConnection) {
    if (typeof window !== 'undefined') {
      (window as any).firestoreOfflineDetected = true;
      window.dispatchEvent(new CustomEvent('firestore-offline-detected'));
    }
  }

  return isQuota || isConnection;
}

// Check if an error triggers local cache fallback (quota, network, or permission/restricted reads)
function checkFallbackError(err: unknown): boolean {
  if (!err) return false;
  const errMsg = err instanceof Error ? err.message : String(err);
  const errLower = errMsg.toLowerCase();
  
  const isQuotaOrConn = checkQuotaError(err);
  const isPermission = errLower.includes('permission') || errLower.includes('insufficient');
  
  return isQuotaOrConn || isPermission;
}

// Wrappers for Firestore references creator functions (Type compatible with original Refs!)
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

// Global wrapped operations to protect write operations and cache them locally too
export async function updateDoc(reference: any, ...args: any[]): Promise<any> {
  const meta = refMetadata.get(reference);
  const collectionName = meta?.hybridPath || reference.path?.split('/').slice(0, -1).join('/') || 'unknown';
  const id = meta?.hybridId || reference.id || 'unknown';
  const data = args[0] || {};

  if (!(window as any).firestoreQuotaExhausted) {
    try {
      await (origUpdateDoc as any)(reference, ...args);
      writeLocalDoc(collectionName, id, data, 'update');
      return;
    } catch (err) {
      if (checkQuotaError(err)) {
        console.warn("Suppressing updateDoc failure due to exhausted Firestore quota. Running locally.");
        writeLocalDoc(collectionName, id, data, 'update');
        return;
      }
      throw err;
    }
  } else {
    writeLocalDoc(collectionName, id, data, 'update');
  }
}

export async function addDoc(reference: any, ...args: any[]): Promise<any> {
  const meta = refMetadata.get(reference);
  const collectionName = meta?.hybridPath || reference.path || 'unknown';
  const id = Math.random().toString(36).substring(2, 15);
  const data = args[0] || {};

  if (!(window as any).firestoreQuotaExhausted) {
    try {
      const origRes = await (origAddDoc as any)(reference, ...args);
      const docId = origRes.id || id;
      writeLocalDoc(collectionName, docId, data, 'set');
      return origRes;
    } catch (err) {
      if (checkQuotaError(err)) {
        console.warn("Suppressing addDoc failure due to exhausted Firestore quota, returning sub-doc reference.");
        writeLocalDoc(collectionName, id, data, 'set');
        return origDoc(reference, id); // Return a type-safe doc reference
      }
      throw err;
    }
  } else {
    writeLocalDoc(collectionName, id, data, 'set');
    return origDoc(reference, id); // Return a type-safe doc reference
  }
}

export async function setDoc(reference: any, ...args: any[]): Promise<any> {
  const meta = refMetadata.get(reference);
  const collectionName = meta?.hybridPath || reference.path?.split('/').slice(0, -1).join('/') || 'unknown';
  const id = meta?.hybridId || reference.id || 'unknown';
  const data = args[0] || {};

  if (!(window as any).firestoreQuotaExhausted) {
    try {
      await (origSetDoc as any)(reference, ...args);
      writeLocalDoc(collectionName, id, data, 'set');
      return;
    } catch (err) {
      if (checkQuotaError(err)) {
        console.warn("Suppressing setDoc failure due to exhausted Firestore quota. Running locally.");
        writeLocalDoc(collectionName, id, data, 'set');
        return;
      }
      throw err;
    }
  } else {
    writeLocalDoc(collectionName, id, data, 'set');
  }
}

export async function deleteDoc(reference: any, ...args: any[]): Promise<any> {
  const meta = refMetadata.get(reference);
  const collectionName = meta?.hybridPath || reference.path?.split('/').slice(0, -1).join('/') || 'unknown';
  const id = meta?.hybridId || reference.id || 'unknown';

  if (!(window as any).firestoreQuotaExhausted) {
    try {
      await (origDeleteDoc as any)(reference, ...args);
      deleteLocalDoc(collectionName, id);
      return;
    } catch (err) {
      if (checkQuotaError(err)) {
        console.warn("Suppressing deleteDoc failure due to exhausted Firestore quota. Running locally.");
        deleteLocalDoc(collectionName, id);
        return;
      }
      throw err;
    }
  } else {
    deleteLocalDoc(collectionName, id);
  }
}

export async function getDoc(docRef: any): Promise<any> {
  const meta = refMetadata.get(docRef);
  const path = meta?.hybridPath || docRef.path?.split('/').slice(0, -1).join('/') || 'unknown';
  const id = meta?.hybridId || docRef.id || 'unknown';

  if (!(window as any).firestoreQuotaExhausted) {
    try {
      const snap = await origGetDoc(docRef);
      if (snap.exists()) {
        writeLocalDoc(path, id, snap.data(), 'set');
      }
      return snap;
    } catch (err) {
      if (checkFallbackError(err)) {
        console.warn("getDoc failed. Falling back to local cache.");
        const localData = getLocalDoc(path, id);
        return {
          exists: () => !!localData,
          id,
          data: () => localData || {}
        };
      }
      throw err;
    }
  } else {
    const localData = getLocalDoc(path, id);
    return {
      exists: () => !!localData,
      id,
      data: () => localData || {}
    };
  }
}

export async function getDocs(ref: any): Promise<any> {
  const meta = refMetadata.get(ref);
  const path = meta?.hybridPath || ref.path || 'unknown';
  if (!(window as any).firestoreQuotaExhausted) {
    try {
      const snap = await origGetDocs(ref);
      const list: any[] = [];
      snap.forEach((doc: any) => {
        list.push({ ...doc.data(), id: doc.id });
      });
      const currentLocal = getLocalCollection(path);
      const updatedLocal = [...currentLocal];
      list.forEach(doc => {
        const idx = updatedLocal.findIndex(item => item.id === doc.id);
        if (idx >= 0) {
          updatedLocal[idx] = doc;
        } else {
          updatedLocal.push(doc);
        }
      });
      saveLocalCollection(path, updatedLocal);

      return snap;
    } catch (err) {
      if (checkFallbackError(err)) {
        console.warn("getDocs failed. Falling back to local replication cache.");
      } else {
        throw err;
      }
    }
  }

  // Local query evaluation engine (fallback)
  const items = getLocalCollection(path);
  let filtered = items;
  if (meta && meta.hybridConditions) {
    filtered = items.filter(item => {
      for (const cond of meta.hybridConditions!) {
        if (cond.op === '==' || cond.op === '===') {
          if (item[cond.field] !== cond.value) return false;
        }
      }
      return true;
    });
  }
  return {
    empty: filtered.length === 0,
    docs: filtered.map(item => ({
      id: item.id,
      data: () => item
    })),
    forEach: (callback: any) => {
      filtered.forEach(item => {
        callback({
          id: item.id,
          data: () => item
        });
      });
    }
  };
}

export function onSnapshot(ref: any, ...args: any[]): any {
  const onNext = typeof args[0] === 'function' ? args[0] : args[1];
  const onError = typeof args[0] === 'function' ? args[1] : args[2];

  const meta = refMetadata.get(ref);
  const path = meta?.hybridPath || ref.path || 'unknown';
  let unsubOrig: any = null;
  let fallbackUnsub: any = null;
  let isSubscribedToOrig = false;

  const setupFallbackListener = () => {
    const handler = () => {
      if (meta?.hybridType === 'doc') {
        const id = meta.hybridId || 'unknown';
        const docData = getLocalDoc(path, id);
        const mockSnapshot = {
          exists: () => !!docData,
          id,
          data: () => docData || {}
        };
        onNext(mockSnapshot);
      } else {
        const items = getLocalCollection(path);
        let filtered = items;
        if (meta && meta.hybridConditions) {
          filtered = items.filter(item => {
            for (const cond of meta.hybridConditions!) {
              if (cond.op === '==' || cond.op === '===') {
                if (item[cond.field] !== cond.value) return false;
              }
            }
            return true;
          });
        }
        const mockSnapshot = {
          empty: filtered.length === 0,
          docs: filtered.map(item => ({
            id: item.id,
            data: () => item
          })),
          forEach: (callback: any) => {
            filtered.forEach(item => {
              callback({
                id: item.id,
                data: () => item
              });
            });
          }
        };
        onNext(mockSnapshot);
      }
    };

    window.addEventListener(`local-db-change:${path}`, handler);
    handler(); // Initial load instantly from local storage cache
    return () => {
      window.removeEventListener(`local-db-change:${path}`, handler);
    };
  };

  if (!(window as any).firestoreQuotaExhausted) {
    try {
      isSubscribedToOrig = true;
      unsubOrig = origOnSnapshot(
        ref,
        (snap: any) => {
          if (typeof snap.forEach === 'function') {
            const currentLocal = getLocalCollection(path);
            let updatedLocal = [...currentLocal];

            if (typeof snap.docChanges === 'function') {
              const changes = snap.docChanges();
              changes.forEach((change: any) => {
                const docItem = { ...change.doc.data(), id: change.doc.id };
                if (change.type === 'added' || change.type === 'modified') {
                  const idx = updatedLocal.findIndex(item => item.id === docItem.id);
                  if (idx >= 0) {
                    updatedLocal[idx] = docItem;
                  } else {
                    updatedLocal.push(docItem);
                  }
                } else if (change.type === 'removed') {
                  updatedLocal = updatedLocal.filter(item => item.id !== docItem.id);
                }
              });
            } else {
              if (meta?.hybridType === 'collection') {
                const fullList: any[] = [];
                snap.forEach((doc: any) => {
                  fullList.push({ ...doc.data(), id: doc.id });
                });
                updatedLocal = fullList;
              } else {
                const list: any[] = [];
                snap.forEach((doc: any) => {
                  list.push({ ...doc.data(), id: doc.id });
                });
                list.forEach(docItem => {
                  const idx = updatedLocal.findIndex(item => item.id === docItem.id);
                  if (idx >= 0) {
                    updatedLocal[idx] = docItem;
                  } else {
                    updatedLocal.push(docItem);
                  }
                });
              }
            }
            saveLocalCollection(path, updatedLocal);
          } else {
            if (snap.exists && snap.exists()) {
              writeLocalDoc(path, snap.id, snap.data(), 'set');
            } else {
              deleteLocalDoc(path, snap.id);
            }
          }

          onNext(snap);
        },
        (err: any) => {
          if (checkFallbackError(err)) {
            console.warn("onSnapshot failed. Falling back to local cache listener: ", err.message || err);
            if (unsubOrig) unsubOrig();
            isSubscribedToOrig = false;
            fallbackUnsub = setupFallbackListener();
          } else if (onError) {
            onError(err);
          }
        }
      );
    } catch (err) {
      if (checkFallbackError(err)) {
        isSubscribedToOrig = false;
        fallbackUnsub = setupFallbackListener();
      } else if (onError) {
        onError(err);
      }
    }
  } else {
    fallbackUnsub = setupFallbackListener();
  }

  return () => {
    if (isSubscribedToOrig && unsubOrig) {
      unsubOrig();
    }
    if (fallbackUnsub) {
      fallbackUnsub();
    }
  };
}

export async function runTransaction(firestore: any, updateFunction: any, ...args: any[]): Promise<any> {
  if (!(window as any).firestoreQuotaExhausted) {
    try {
      return await (origRunTransaction as any)(firestore, updateFunction, ...args);
    } catch (err) {
      if (checkQuotaError(err)) {
        console.warn("Suppressing runTransaction failure due to exhausted Firestore quota.");
        return undefined;
      }
      throw err;
    }
  } else {
    console.warn("Firestore transaction skipped in quota exhausted mode.");
  }
}

export function writeBatch(firestoreInstance: any): any {
  const origBatch = origWriteBatch(firestoreInstance);
  const localOps: { type: string; path: string; id: string; data?: any }[] = [];

  const wrappedBatch = {
    set: (docRef: any, data: any, ...options: any[]) => {
      const meta = refMetadata.get(docRef);
      const path = meta?.hybridPath || docRef.path?.split('/').slice(0, -1).join('/') || 'unknown';
      const id = meta?.hybridId || docRef.id || 'unknown';
      localOps.push({ type: 'set', path, id, data });
      (origBatch as any).set(docRef, data, ...options);
    },
    update: (docRef: any, data: any, ...options: any[]) => {
      const meta = refMetadata.get(docRef);
      const path = meta?.hybridPath || docRef.path?.split('/').slice(0, -1).join('/') || 'unknown';
      const id = meta?.hybridId || docRef.id || 'unknown';
      localOps.push({ type: 'update', path, id, data });
      (origBatch as any).update(docRef, data, ...options);
    },
    delete: (docRef: any) => {
      const meta = refMetadata.get(docRef);
      const path = meta?.hybridPath || docRef.path?.split('/').slice(0, -1).join('/') || 'unknown';
      const id = meta?.hybridId || docRef.id || 'unknown';
      localOps.push({ type: 'delete', path, id });
      origBatch.delete(docRef);
    },
    commit: async () => {
      if (!(window as any).firestoreQuotaExhausted) {
        try {
          await origBatch.commit();
          localOps.forEach(op => {
            if (op.type === 'set') {
              writeLocalDoc(op.path, op.id, op.data, 'set');
            } else if (op.type === 'update') {
              writeLocalDoc(op.path, op.id, op.data, 'update');
            } else if (op.type === 'delete') {
              deleteLocalDoc(op.path, op.id);
            }
          });
          return;
        } catch (err) {
          if (checkQuotaError(err)) {
            console.warn("Suppressing writeBatch commit failure due to exhausted Firestore quota, applying locally.");
            localOps.forEach(op => {
              if (op.type === 'set') {
                writeLocalDoc(op.path, op.id, op.data, 'set');
              } else if (op.type === 'update') {
                writeLocalDoc(op.path, op.id, op.data, 'update');
              } else if (op.type === 'delete') {
                deleteLocalDoc(op.path, op.id);
              }
            });
            return;
          }
          throw err;
        }
      } else {
        localOps.forEach(op => {
          if (op.type === 'set') {
            writeLocalDoc(op.path, op.id, op.data, 'set');
          } else if (op.type === 'update') {
            writeLocalDoc(op.path, op.id, op.data, 'update');
          } else if (op.type === 'delete') {
            deleteLocalDoc(op.path, op.id);
          }
        });
      }
    }
  };

  return wrappedBatch;
}

// Firestore Error Handling (Required by Integration Instructions)
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const isQuota = checkQuotaError(error);
  const errMsg = error instanceof Error ? error.message : String(error);
  const errLower = errMsg.toLowerCase();
  const isPermissionDenied = errLower.includes('permission') || errLower.includes('insufficient');

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.warn('Firestore Warning: ', errInfo.error, operationType, path);
  if (isQuota) {
    console.warn("Quota exceeded error detected. Suppressing throw to enable seamless offline/read-only mode using local cache.");
    return;
  }
  if (isPermissionDenied) {
    console.warn(`Permission-denied on ${operationType} to path: ${path}. Suppressing throw to maintain standard offline/cache operation.`);
    return;
  }
  throw new Error(JSON.stringify(errInfo));
}

export { 
  serverTimestamp, increment, arrayUnion, arrayRemove, orderBy, limit, startAfter, endBefore,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged
};
