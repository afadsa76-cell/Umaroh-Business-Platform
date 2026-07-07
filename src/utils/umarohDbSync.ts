import { db, doc, setDoc, onSnapshot, collection } from '../firebase';

let isSyncingFromFirestore = false;

interface MasterDataDoc {
  id: string;
  data: () => { data: string; updatedAt: string };
}

interface FirestoreSnapshot {
  docs: MasterDataDoc[];
}

export function startUmarohDbSync() {
  console.info('[Umaroh Sync] Initializing master database real-time cloud sync...');

  // 1. Set up the Firestore listener on 'umaroh_master_data' collection
  const unsubscribe = onSnapshot(
    collection(db, 'umaroh_master_data'),
    (snapshot: unknown) => {
      isSyncingFromFirestore = true;
      try {
        const castSnapshot = snapshot as FirestoreSnapshot;
        if (castSnapshot && Array.isArray(castSnapshot.docs)) {
          castSnapshot.docs.forEach((docSnap) => {
            const key = docSnap.id;
            const data = docSnap.data();
            if (data && data.data) {
              const firestoreUpdatedAt = data.updatedAt || '';
              const localUpdatedAt = localStorage.getItem(`${key}_updatedAt`) || '';

              // If firestore is newer, or local doesn't have it, update local
              if (!localUpdatedAt || firestoreUpdatedAt > localUpdatedAt) {
                console.info(`[Umaroh Sync] Syncing ${key} from cloud (Cloud: ${firestoreUpdatedAt} > Local: ${localUpdatedAt})`);
                localStorage.setItem(key, data.data);
                localStorage.setItem(`${key}_updatedAt`, firestoreUpdatedAt);

                // Notify any listening components
                try {
                  const parsed = JSON.parse(data.data) as unknown;
                  window.dispatchEvent(
                    new CustomEvent(`umaroh_db_sync:${key}`, { detail: parsed })
                  );
                } catch (parseErr) {
                  console.error(`[Umaroh Sync] Failed to parse and dispatch sync for ${key}`, parseErr);
                }
              }
            }
          });
        }
      } catch (err) {
        console.error('[Umaroh Sync] Error during Firestore incoming snapshot processing:', err);
      } finally {
        isSyncingFromFirestore = false;
      }
    },
    (error: unknown) => {
      console.warn('[Umaroh Sync] Firestore listener warning (likely offline or quota limit):', error);
    }
  );

  // 2. Override localStorage.setItem to capture local edits
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function (key: string, value: string) {
    originalSetItem.call(localStorage, key, value);

    const KEYS_TO_SYNC = [
      'umaroh_db_visa',
      'umaroh_db_handling_saudi',
      'umaroh_db_transport',
      'umaroh_db_ziarah',
      'umaroh_db_handling_domestik',
      'umaroh_db_kereta_cepat',
      'umaroh_db_mutawif',
      'umaroh_db_handling_saudi_deskripsi',
      'umaroh_db_equipment_deskripsi',
      'umaroh_db_hotels'
    ];

    if (KEYS_TO_SYNC.includes(key) && !isSyncingFromFirestore) {
      const nowStr = new Date().toISOString();
      originalSetItem.call(localStorage, `${key}_updatedAt`, nowStr);

      console.info(`[Umaroh Sync] Local edit detected for ${key}, uploading to cloud...`);
      // Async setDoc to Firestore
      setDoc(doc(db, 'umaroh_master_data', key), {
        data: value,
        updatedAt: nowStr
      }).catch((err: unknown) => {
        console.warn(`[Umaroh Sync] Failed to upload ${key} to cloud (offline fallback active):`, err);
      });

      // Dispatch custom event to notify other components in the same tab
      try {
        const parsed = JSON.parse(value) as unknown;
        window.dispatchEvent(
          new CustomEvent(`umaroh_db_sync:${key}`, { detail: parsed })
        );
      } catch {
        // ignore
      }
    }
  };

  // 3. One-time seeding: for any key that is in local storage but NOT yet in Firestore (or if Firestore has no document for it), push it.
  setTimeout(async () => {
    const KEYS_TO_SYNC = [
      'umaroh_db_visa',
      'umaroh_db_handling_saudi',
      'umaroh_db_transport',
      'umaroh_db_ziarah',
      'umaroh_db_handling_domestik',
      'umaroh_db_kereta_cepat',
      'umaroh_db_mutawif',
      'umaroh_db_handling_saudi_deskripsi',
      'umaroh_db_equipment_deskripsi',
      'umaroh_db_hotels'
    ];

    for (const key of KEYS_TO_SYNC) {
      const localVal = localStorage.getItem(key);
      const localUpdatedAt = localStorage.getItem(`${key}_updatedAt`);
      if (localVal && !localUpdatedAt) {
        // Seed the cloud with current local values
        const nowStr = new Date().toISOString();
        originalSetItem.call(localStorage, `${key}_updatedAt`, nowStr);
        console.info(`[Umaroh Sync] Seeding ${key} to cloud on startup...`);
        try {
          await setDoc(doc(db, 'umaroh_master_data', key), {
            data: localVal,
            updatedAt: nowStr
          });
        } catch (err) {
          console.warn(`[Umaroh Sync] Seeding failed for ${key}:`, err);
        }
      }
    }
  }, 3000);

  return unsubscribe;
}
