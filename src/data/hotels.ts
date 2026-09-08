import defaultHotelsJson from './defaultHotels.json';
import extraHotelsJson from './extraHotels.json';
import newRowaHotelsJson from './newRowaHotels.json';
import newAlharmainHotelsJson from './newAlharmainHotels.json';
import newDiarAlManasikHotelsJson from './newDiarAlManasikHotels.json';
import newMaysanIntGroupHotelsJson from './newMaysanIntGroupHotels.json';
import newEmaarAlDiyafaHotelsJson from './newEmaarAlDiyafaHotels.json';
import newWahatInternationalHotelsJson from './newWahatInternationalHotels.json';

export type RoomType = 'Single' | 'Double' | 'Triple' | 'Quad' | 'Quint' | 'Jr Suite (4pax)' | 'Jr Suite (2pax)' | 'Family Suite (4pax)' | '3 Bed Suite (6pax)' | 'Two Bedroom (10 Pax)' | 'Four Bedroom (15 Pax)';

export interface PriceEntry {
  roomType: RoomType | string;
  price: number;
}

export interface Season {
  range: string;
  prices: PriceEntry[];
  pricingType?: 'PER_NIGHT' | 'FLAT_PACKAGE';
  packageNights?: number;
  isPackageBlock?: boolean;
  programType?: 'AWAL_RAMADHAN' | 'TENGAH_RAMADHAN' | 'ITIKAF_RAMADHAN' | 'FULL_RAMADHAN' | 'REGULER' | string;
  hijriInfo?: string;
  notes?: string;
}

export interface Hotel {
  id: string;
  name: string;
  city: 'Makkah' | 'Madinah' | string;
  vendor: string;
  mealPlan: 'FB' | 'HB' | 'RO' | 'BB' | string;
  stars?: number;
  bintang?: number;
  seasons: Season[];
  isRamadhanPackage?: boolean;
}

export const defaultHotels: Hotel[] = defaultHotelsJson as Hotel[];
export const extraHotels: Hotel[] = extraHotelsJson as Hotel[];
export const newRowaHotels: Hotel[] = newRowaHotelsJson as Hotel[];
export const newAlharmainHotels: Hotel[] = newAlharmainHotelsJson as Hotel[];
export const newDiarAlManasikHotels: Hotel[] = newDiarAlManasikHotelsJson as Hotel[];
export const newMaysanIntGroupHotels: Hotel[] = newMaysanIntGroupHotelsJson as Hotel[];
export const newEmaarAlDiyafaHotels: Hotel[] = newEmaarAlDiyafaHotelsJson as Hotel[];
export const newWahatInternationalHotels: Hotel[] = newWahatInternationalHotelsJson as Hotel[];

const mergedLocalHotelsMap = new Map<string, Hotel>();
defaultHotels.forEach(h => mergedLocalHotelsMap.set(h.id, h));
extraHotels.forEach(h => mergedLocalHotelsMap.set(h.id, h));
newRowaHotels.forEach(h => mergedLocalHotelsMap.set(h.id, h));
newAlharmainHotels.forEach(h => mergedLocalHotelsMap.set(h.id, h));
newDiarAlManasikHotels.forEach(h => mergedLocalHotelsMap.set(h.id, h));
newMaysanIntGroupHotels.forEach(h => mergedLocalHotelsMap.set(h.id, h));
newEmaarAlDiyafaHotels.forEach(h => mergedLocalHotelsMap.set(h.id, h));
newWahatInternationalHotels.forEach(h => mergedLocalHotelsMap.set(h.id, h));

export const allLocalHotels: Hotel[] = Array.from(mergedLocalHotelsMap.values());

export const getHotels = (): Hotel[] => {
  const stored = localStorage.getItem('hotels_db');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Hotel[];
      if (parsed.length > 0) {
        // Ensure updated package seasons (e.g. Diar Ramadhan packages) are always accessible
        const parsedMap = new Map<string, Hotel>();
        parsed.forEach(h => parsedMap.set(h.id, h));
        allLocalHotels.forEach(localH => {
          const existing = parsedMap.get(localH.id);
          if (existing) {
            const hasLocalRamadhan = localH.seasons?.some(s => s.isPackageBlock || s.pricingType === 'FLAT_PACKAGE');
            const hasCachedRamadhan = existing.seasons?.some(s => s.isPackageBlock || s.pricingType === 'FLAT_PACKAGE');
            if (hasLocalRamadhan && !hasCachedRamadhan) {
              existing.seasons = [...localH.seasons];
            }
          } else {
            parsedMap.set(localH.id, localH);
          }
        });
        return Array.from(parsedMap.values());
      }
    } catch (e) {
      console.error('Failed to parse stored hotels', e);
    }
  }
  return allLocalHotels;
};

// Global in-place mutable reference of loaded hotels
export const hotels: Hotel[] = [];

// Initialize array with what we currently have in storage (or default fallbacks)
hotels.push(...getHotels());

export const saveHotels = (newHotels: Hotel[]) => {
  try {
    localStorage.setItem('hotels_db', JSON.stringify(newHotels));
    
    // Update the in-place reference so imported instances of `hotels` automatically update
    hotels.length = 0;
    hotels.push(...newHotels);
    
    // Dispatch custom event to notify listening modules or App root
    window.dispatchEvent(new Event('hotels-updated'));
  } catch (err) {
    console.info('[hotels_db cache] Failed to save hotels_db cache:', err);
  }
};

export const loadHotelsAsync = async (): Promise<Hotel[]> => {
  if (hotels.length < allLocalHotels.length) {
    saveHotels(allLocalHotels);
  }
  return hotels;
};
