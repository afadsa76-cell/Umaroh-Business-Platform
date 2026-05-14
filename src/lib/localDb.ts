export const db = {};

type Listener = (snapshot: any) => void;
const listeners: Record<string, Listener[]> = {};

function notifyListeners(collectionName: string) {
  const data = getCollectionData(collectionName);
  const snapshot = {
    empty: data.length === 0,
    docs: data.map((item: any) => ({
      id: item.id,
      data: () => item
    }))
  };
  if (listeners[collectionName]) {
    listeners[collectionName].forEach(listener => listener(snapshot));
  }
}

function getCollectionData(collectionName: string) {
  const data = localStorage.getItem(`db_${collectionName}`);
  return data ? JSON.parse(data) : [];
}

function saveCollectionData(collectionName: string, data: any[]) {
  localStorage.setItem(`db_${collectionName}`, JSON.stringify(data));
  notifyListeners(collectionName);
}

export function collection(db: any, path: string) {
  return { path };
}

export function doc(dbOrCollection: any, pathOrId: string, id?: string) {
  let path = dbOrCollection.path || pathOrId;
  let docId = id || (dbOrCollection.path ? pathOrId : undefined);
  
  if (!docId) {
    const parts = path.split('/');
    if (parts.length % 2 === 0) {
      return { path: parts.slice(0, -1).join('/'), id: parts[parts.length - 1] };
    }
    return { path, id: Math.random().toString(36).substring(2, 15) };
  }
  return { path, id: docId };
}

export function onSnapshot(ref: any, callback: Listener) {
  let collectionName = ref.path;
  if (ref.type === 'query') {
    collectionName = ref.collectionName;
  }
  
  if (!listeners[collectionName]) {
    listeners[collectionName] = [];
  }
  
  const wrappedCallback = (snapshot: any) => {
    let filteredData = snapshot.docs.map((doc: any) => doc.data());
    
    if (ref.type === 'query') {
      filteredData = filteredData.filter((item: any) => {
        for (const cond of ref.conditions) {
          if (cond.op === '==') {
            if (item[cond.field] !== cond.value) return false;
          }
        }
        return true;
      });
    }
    
    callback({
      empty: filteredData.length === 0,
      docs: filteredData.map((item: any) => ({
        id: item.id,
        data: () => item
      }))
    });
  };
  
  listeners[collectionName].push(wrappedCallback);
  
  // Initial call
  const data = getCollectionData(collectionName);
  wrappedCallback({
    empty: data.length === 0,
    docs: data.map((item: any) => ({
      id: item.id,
      data: () => item
    }))
  });
  
  return () => {
    listeners[collectionName] = listeners[collectionName].filter(l => l !== wrappedCallback);
  };
}

export async function getDocs(ref: any) {
  let collectionName = ref.path;
  if (ref.type === 'query') {
    collectionName = ref.collectionName;
  }
  
  const data = getCollectionData(collectionName);
  let filteredData = data;
  
  if (ref.type === 'query') {
    filteredData = data.filter((item: any) => {
      for (const cond of ref.conditions) {
        if (cond.op === '==') {
          if (item[cond.field] !== cond.value) return false;
        }
      }
      return true;
    });
  }
  
  return {
    empty: filteredData.length === 0,
    docs: filteredData.map((item: any) => ({
      id: item.id,
      data: () => item
    }))
  };
}

export async function setDoc(docRef: any, data: any) {
  const collectionName = docRef.path;
  const items = getCollectionData(collectionName);
  const index = items.findIndex((item: any) => item.id === docRef.id);
  
  const newItem = { ...data, id: docRef.id };
  
  if (index >= 0) {
    items[index] = newItem;
  } else {
    items.push(newItem);
  }
  
  saveCollectionData(collectionName, items);
}

export async function addDoc(collectionRef: any, data: any) {
  const collectionName = collectionRef.path;
  const items = getCollectionData(collectionName);
  const id = Math.random().toString(36).substring(2, 15);
  
  const newItem = { ...data, id };
  items.push(newItem);
  
  saveCollectionData(collectionName, items);
  return { id };
}

export async function updateDoc(docRef: any, data: any) {
  const collectionName = docRef.path;
  const items = getCollectionData(collectionName);
  const index = items.findIndex((item: any) => item.id === docRef.id);
  
  if (index >= 0) {
    items[index] = { ...items[index], ...data };
    saveCollectionData(collectionName, items);
  }
}

export async function deleteDoc(docRef: any) {
  const collectionName = docRef.path;
  const items = getCollectionData(collectionName);
  const newItems = items.filter((item: any) => item.id !== docRef.id);
  
  saveCollectionData(collectionName, newItems);
}

export function query(collectionRef: any, ...conditions: any[]) {
  return {
    type: 'query',
    collectionName: collectionRef.path,
    conditions
  };
}

export function where(field: string, op: string, value: any) {
  return { field, op, value };
}

export function writeBatch(db: any) {
  const operations: any[] = [];
  
  return {
    set: (docRef: any, data: any) => {
      operations.push({ type: 'set', docRef, data });
    },
    update: (docRef: any, data: any) => {
      operations.push({ type: 'update', docRef, data });
    },
    delete: (docRef: any) => {
      operations.push({ type: 'delete', docRef });
    },
    commit: async () => {
      // Group by collection
      const collections = new Set(operations.map(op => op.docRef.path));
      
      for (const collectionName of collections) {
        const items = getCollectionData(collectionName);
        
        operations.filter(op => op.docRef.path === collectionName).forEach(op => {
          const index = items.findIndex((item: any) => item.id === op.docRef.id);
          
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
