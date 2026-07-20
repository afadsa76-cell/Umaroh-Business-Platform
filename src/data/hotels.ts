export type RoomType = 'Single' | 'Double' | 'Triple' | 'Quad' | 'Quint' | 'Jr Suite (4pax)' | 'Jr Suite (2pax)' | 'Family Suite (4pax)' | '3 Bed Suite (6pax)' | 'Two Bedroom (10 Pax)' | 'Four Bedroom (15 Pax)';

export interface PriceEntry {
  roomType: RoomType | string;
  price: number;
}

export interface Season {
  range: string;
  prices: PriceEntry[];
}

export interface Hotel {
  id: string;
  name: string;
  city: 'Makkah' | 'Madinah';
  vendor: string;
  mealPlan: 'FB' | 'HB' | 'RO' | 'BB';
  stars?: number;
  bintang?: number;
  seasons: Season[];
}

// Fallback initial list to prevent empty renders and ensure tiny bundle footprint
export const defaultHotels: Hotel[] = [
  {
    "id": "rayhaan-al-marwa-rayhaan-rowa",
    "name": "Rayhaan Al Marwa Rayhaan",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 24/07/2026",
        "prices": [
          { "roomType": "Double", "price": 1150 },
          { "roomType": "Triple", "price": 1420 },
          { "roomType": "Quad", "price": 1690 }
        ]
      }
    ]
  },
  {
    "id": "movenpick-hotel-rowa",
    "name": "Mövenpick Hotel",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 24/07/2026",
        "prices": [
          { "roomType": "Double", "price": 1000 },
          { "roomType": "Triple", "price": 1220 },
          { "roomType": "Quad", "price": 1440 }
        ]
      }
    ]
  }
];

export const newRowaHotels: Hotel[] = defaultHotels;
export const newAlharmainHotels: Hotel[] = [];

export const getHotels = (): Hotel[] => {
  const stored = localStorage.getItem('hotels_db');
  if (stored) {
    try {
      return JSON.parse(stored) as Hotel[];
    } catch (e) {
      console.error('Failed to parse stored hotels', e);
    }
  }
  return defaultHotels;
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

// Asynchronously load the full datasets from public/data JSON files at runtime
export const loadHotelsAsync = async (): Promise<Hotel[]> => {
  try {
    console.log('[hotels] Fetching full hotel datasets from public assets...');
    
    // We fetch our four extracted JSON files (which are served statically from the public folder)
    const [rowaRes, alharmainRes, defaultRes, extraRes] = await Promise.all([
      fetch('./data/newRowaHotels.json').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('./data/newAlharmainHotels.json').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('./data/defaultHotels.json').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('./data/extraHotels.json').then(r => r.ok ? r.json() : []).catch(() => [])
    ]);

    const mergedMap = new Map<string, Hotel>();
    
    // Merge into map to eliminate duplicates elegantly
    if (Array.isArray(defaultRes)) defaultRes.forEach((h: Hotel) => mergedMap.set(h.id, h));
    if (Array.isArray(extraRes)) extraRes.forEach((h: Hotel) => mergedMap.set(h.id, h));
    if (Array.isArray(rowaRes)) rowaRes.forEach((h: Hotel) => mergedMap.set(h.id, h));
    if (Array.isArray(alharmainRes)) alharmainRes.forEach((h: Hotel) => mergedMap.set(h.id, h));

    const merged = Array.from(mergedMap.values());
    console.info(`[hotels] Loaded and merged ${merged.length} hotels into memory.`);
    
    if (merged.length > 0) {
      saveHotels(merged);
      return merged;
    }
  } catch (err) {
    console.error('[hotels] Error fetching/merging public hotel assets:', err);
  }
  return hotels;
};
