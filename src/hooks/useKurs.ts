/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { db, doc, onSnapshot, setDoc } from '../firebase';

export interface KursData {
  sarToIdr: number;
  usdToIdr: number;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_KURS: KursData = {
  sarToIdr: 4900,
  usdToIdr: 20000
};

// Helper to get initial cached kurs
const getCachedKurs = (): KursData => {
  try {
    const cached = localStorage.getItem('umaroh_cached_kurs');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed.sarToIdr === 'number' && typeof parsed.usdToIdr === 'number') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load cached kurs:', e);
  }
  return DEFAULT_KURS;
};

export const useKurs = () => {
  const [kurs, setKurs] = useState<KursData>(getCachedKurs);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reference to /settings/kurs document in Firestore
    const docRef = doc(db, 'settings', 'kurs');

    // Subscribe to real-time changes
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap: any) => {
        setLoading(false);
        if (docSnap.exists()) {
          const data = docSnap.data() as KursData;
          if (data && typeof data.sarToIdr === 'number' && typeof data.usdToIdr === 'number') {
            setKurs(data);
            localStorage.setItem('umaroh_cached_kurs', JSON.stringify(data));
          }
        } else {
          // Document does not exist yet. Let's initialize it with default values.
          setDoc(docRef, DEFAULT_KURS)
            .then(() => {
              setKurs(DEFAULT_KURS);
              localStorage.setItem('umaroh_cached_kurs', JSON.stringify(DEFAULT_KURS));
            })
            .catch((err: any) => {
              console.error('Failed to initialize default kurs in Firestore:', err);
            });
        }
      },
      (err: any) => {
        console.error('Real-time kurs listener error, falling back to cached value:', err);
        setError(err?.message || 'Gagal berlangganan data kurs real-time.');
        setLoading(false);
        // Fallback to cache immediately on failure
        setKurs(getCachedKurs());
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const updateKurs = async (sarToIdr: number, usdToIdr: number, userEmail?: string) => {
    try {
      const payload: KursData = {
        sarToIdr: Number(sarToIdr),
        usdToIdr: Number(usdToIdr),
        updatedAt: new Date().toISOString(),
        updatedBy: userEmail || 'system'
      };

      const docRef = doc(db, 'settings', 'kurs');
      await setDoc(docRef, payload);
      
      // Also update local cache for robust offline access
      localStorage.setItem('umaroh_cached_kurs', JSON.stringify(payload));
      setKurs(payload);
      return true;
    } catch (err) {
      console.error('Error updating kurs in Firestore:', err);
      throw err;
    }
  };

  return { kurs, loading, error, updateKurs };
};
