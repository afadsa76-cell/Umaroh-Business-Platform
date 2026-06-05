export const db = {};

// Use generic Record for document data
type DocumentData = Record<string, unknown>;

interface SnapshotDoc {
  id: string;
  data: () => DocumentData;
}

interface Snapshot {
  empty: boolean;
  docs: SnapshotDoc[];
}

type Listener = (snapshot: Snapshot) => void;
const listeners: Record<string, Listener[]> = {};

function notifyListeners(collectionName: string) {
  const data = getCollectionData(collectionName);
  const snapshot: Snapshot = {
    empty: data.length === 0,
    docs: data.map((item: DocumentData) => ({
      id: item.id as string,
      data: () => item
    }))
  };
  if (listeners[collectionName]) {
    listeners[collectionName].forEach(listener => listener(snapshot));
  }
}

function getCollectionData(collectionName: string): DocumentData[] {
  const data = localStorage.getItem(`db_${collectionName}`);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (err) {
    console.warn(`Failed parsing JSON for local database collection '${collectionName}', clearing corrupted key:`, err);
    localStorage.removeItem(`db_${collectionName}`);
    return [];
  }
}

function saveCollectionData(collectionName: string, data: DocumentData[]) {
  localStorage.setItem(`db_${collectionName}`, JSON.stringify(data));
  notifyListeners(collectionName);
}

export function collection(_db: unknown, path: string) {
  return { path };
}

export function doc(dbOrCollection: { path?: string }, pathOrId: string, id?: string) {
  const path = dbOrCollection.path || pathOrId;
  const docId = id || (dbOrCollection.path ? pathOrId : undefined);
  
  if (!docId) {
    const parts = path.split('/');
    if (parts.length % 2 === 0) {
      return { path: parts.slice(0, -1).join('/'), id: parts[parts.length - 1] };
    }
    return { path, id: Math.random().toString(36).substring(2, 15) };
  }
  return { path, id: docId };
}

export function onSnapshot(ref: { path: string; type?: string; collectionName?: string; conditions?: { field: string; op: string; value: unknown }[] }, callback: Listener) {
  let collectionName = ref.path;
  if (ref.type === 'query' && ref.collectionName) {
    collectionName = ref.collectionName;
  }
  
  if (!listeners[collectionName]) {
    listeners[collectionName] = [];
  }
  
  const wrappedCallback = (snapshot: Snapshot) => {
    let filteredData = snapshot.docs.map((d: SnapshotDoc) => d.data());
    
    if (ref.type === 'query' && ref.conditions) {
      filteredData = filteredData.filter((item: DocumentData) => {
        for (const cond of ref.conditions!) {
          if (cond.op === '==') {
            if (item[cond.field] !== cond.value) return false;
          }
        }
        return true;
      });
    }
    
    callback({
      empty: filteredData.length === 0,
      docs: filteredData.map((item: DocumentData) => ({
        id: item.id as string,
        data: () => item
      }))
    });
  };
  
  listeners[collectionName].push(wrappedCallback);
  
  // Initial call
  const data = getCollectionData(collectionName);
  wrappedCallback({
    empty: data.length === 0,
    docs: data.map((item: DocumentData) => ({
      id: item.id as string,
      data: () => item
    }))
  });
  
  return () => {
    listeners[collectionName] = listeners[collectionName].filter(l => l !== wrappedCallback);
  };
}

export async function getDocs(ref: { path: string; type?: string; collectionName?: string; conditions?: { field: string; op: string; value: unknown }[] }) {
  let collectionName = ref.path;
  if (ref.type === 'query' && ref.collectionName) {
    collectionName = ref.collectionName;
  }
  
  const data = getCollectionData(collectionName);
  let filteredData = data;
  
  if (ref.type === 'query' && ref.conditions) {
    filteredData = data.filter((item: DocumentData) => {
      for (const cond of ref.conditions!) {
        if (cond.op === '==') {
          if (item[cond.field] !== cond.value) return false;
        }
      }
      return true;
    });
  }
  
  return {
    empty: filteredData.length === 0,
    docs: filteredData.map((item: DocumentData) => ({
      id: item.id as string,
      data: () => item
    }))
  };
}

export async function setDoc(docRef: { path: string; id: string }, data: DocumentData) {
  const collectionName = docRef.path;
  const items = getCollectionData(collectionName);
  const index = items.findIndex((item: DocumentData) => item.id === docRef.id);
  
  const newItem = { ...data, id: docRef.id };
  
  if (index >= 0) {
    items[index] = newItem;
  } else {
    items.push(newItem);
  }
  
  saveCollectionData(collectionName, items);
}

export async function addDoc(collectionRef: { path: string }, data: DocumentData) {
  const collectionName = collectionRef.path;
  const items = getCollectionData(collectionName);
  const id = Math.random().toString(36).substring(2, 15);
  
  const newItem = { ...data, id };
  items.push(newItem);
  
  saveCollectionData(collectionName, items);
  return { id };
}

export async function updateDoc(docRef: { path: string; id: string }, data: DocumentData) {
  const collectionName = docRef.path;
  const items = getCollectionData(collectionName);
  const index = items.findIndex((item: DocumentData) => item.id === docRef.id);
  
  if (index >= 0) {
    items[index] = { ...items[index], ...data };
    saveCollectionData(collectionName, items);
  }
}

export async function deleteDoc(docRef: { path: string; id: string }) {
  const collectionName = docRef.path;
  const items = getCollectionData(collectionName);
  const newItems = items.filter((item: DocumentData) => item.id !== docRef.id);
  
  saveCollectionData(collectionName, newItems);
}

export function query(collectionRef: { path: string }, ...conditions: { field: string; op: string; value: unknown }[]) {
  return {
    type: 'query',
    collectionName: collectionRef.path,
    conditions
  };
}

export function where(field: string, op: string, value: unknown) {
  return { field, op, value };
}

export function writeBatch() {
  const operations: { type: string; docRef: { path: string; id: string }; data?: DocumentData }[] = [];
  
  return {
    set: (docRef: { path: string; id: string }, data: DocumentData) => {
      operations.push({ type: 'set', docRef, data });
    },
    update: (docRef: { path: string; id: string }, data: DocumentData) => {
      operations.push({ type: 'update', docRef, data });
    },
    delete: (docRef: { path: string; id: string }) => {
      operations.push({ type: 'delete', docRef });
    },
    commit: async () => {
      // Group by collection
      const collections = Array.from(new Set(operations.map(op => op.docRef.path as string)));
      
      for (const collectionName of collections) {
        const items = getCollectionData(collectionName);
        
        operations.filter(op => op.docRef.path === collectionName).forEach(op => {
          const index = items.findIndex((item: DocumentData) => item.id === op.docRef.id);
          
          if (op.type === 'set') {
            const newItem = { ...op.data, id: op.docRef.id };
            if (index >= 0) items[index] = newItem;
            else items.push(newItem);
          } else if (op.type === 'update') {
            if (index >= 0) items[index] = { ...items[index], ...op.data };
          } else if (op.type === 'delete') {
            if (index >= 0) items.splice(index, 1);
          }
        });
        
        saveCollectionData(collectionName, items);
      }
    }
  };
}
