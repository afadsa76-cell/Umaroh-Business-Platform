import { useState, useEffect } from 'react';

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
  const loading = false;
  const error: string | null = null;

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'umaroh_cached_kurs') {
        setKurs(getCachedKurs());
      }
    };

    const handleCustomChange = () => {
      setKurs(getCachedKurs());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('umaroh_kurs_updated', handleCustomChange);

    // Sync current value immediately on mount
    setKurs(getCachedKurs());

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('umaroh_kurs_updated', handleCustomChange);
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
      localStorage.setItem('umaroh_cached_kurs', JSON.stringify(payload));
      
      // Notify other hook instances in the same tab
      window.dispatchEvent(new Event('umaroh_kurs_updated'));
      return true;
    } catch (err) {
      console.error('Error updating local kurs:', err);
      throw err;
    }
  };

  return { kurs, loading, error, updateKurs };
};

