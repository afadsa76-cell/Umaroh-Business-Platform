import React, { useState, useMemo, useEffect } from 'react';
import { hotels, Hotel, newRowaHotels, newAlharmainHotels, defaultHotels } from '../../data/hotels';
import { HotelCard } from './HotelCard';
import { FilterBar } from '../common/FilterBar';
import { HotelDetailModal } from './HotelDetailModal';
import { Building2, Download, RefreshCw, Plus, Trash2, X } from 'lucide-react';
import { isDateInRange, parseDate, parseDateRange } from '../../utils/dateUtils';
import * as XLSX from 'xlsx';
import { db, doc, writeBatch, collection, getDocs, query, where, onSnapshot, setDoc, auth } from '../../firebase';
import { useKurs } from '../../hooks/useKurs';
import { getNormalizedHotelNameKey } from '../database/HotelMediaView';

const MASTER_PERIODS = [
  { name: 'LOW SEASON JUN–JUL 2026', start: '16 Jun 2026', end: '31 Jul 2026', hijri: '1 Muharram 1448 – 15 Safar 1448' },
  { name: 'PEAK SUMMER JUL–AUG 2026', start: '01 Jul 2026', end: '15 Aug 2026', hijri: '15 Muharram 1448 – 30 Safar 1448' },
  { name: 'HIGH SEASON AUG–SEP 2026', start: '01 Aug 2026', end: '30 Sep 2026', hijri: '16 Safar 1448 – 18 Rabiul Awal 1448' },
  { name: 'TRANSISI SEP–OCT 2026', start: '01 Sep 2026', end: '14 Oct 2026', hijri: '1 Rabiul Awal 1448 – 12 Rabiul Akhir 1448' },
  { name: 'PEAK MAULID OCT–DEC 2026', start: '01 Oct 2026', end: '16 Dec 2026', hijri: '18 Rabiul Awal 1448 – 5 Jumadil Akhir 1448' },
  { name: 'AKHIR TAHUN – AWAL TAHUN', start: '16 Dec 2026', end: '08 Feb 2027', hijri: '5 Jumadil Akhir 1448 – 1 Sya’ban 1448' },
  { name: 'LONG SEASON 2026', start: '01 Jun 2026', end: '15 Dec 2026', hijri: '15 Dzulhijjah 1447 – 5 Jumadil Akhir 1448' },
];

const newMaysanHotels: Hotel[] = defaultHotels.filter(h => h.vendor === 'Maysan Int. Group');
const newEmaarHotels: Hotel[] = defaultHotels.filter(h => h.vendor === 'Emaar Al Diyafa');
const newKonozHotels: Hotel[] = defaultHotels.filter(h => h.vendor === 'Konoz');
const newAreejTabahHotels: Hotel[] = defaultHotels.filter(h => h.vendor === 'Areej Tabah');
const newDiarAlManasikHotels: Hotel[] = defaultHotels.filter(h => h.vendor === 'Diar Al Manasik');
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
const oldMaysanHotelsUnused: any[] = [
  {
    "id": "al-harithia-madinah",
    "name": "The Venue Al Harithia",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "23/06/2026 TO 20/09/2026",
        "prices": [
          { "roomType": "Double", "price": 750 },
          { "roomType": "Triple", "price": 900 },
          { "roomType": "Quad", "price": 1050 },
          { "roomType": "Junior suite (2 Pax)", "price": 900 },
          { "roomType": "Executive Suite (2 Rooms 4 Pax)", "price": 1550 },
          { "roomType": "Royal Suite (2 Rooms 4 Pax)", "price": 2150 }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          { "roomType": "Double", "price": 800 },
          { "roomType": "Triple", "price": 950 },
          { "roomType": "Quad", "price": 1100 },
          { "roomType": "Junior suite (2 Pax)", "price": 950 },
          { "roomType": "Executive Suite (2 Rooms 4 Pax)", "price": 1600 },
          { "roomType": "Royal Suite (2 Rooms 4 Pax)", "price": 2200 }
        ]
      }
    ]
  },
  {
    "id": "grand-plaza-badr-almaqam-madinah",
    "name": "Grand Plaza Badr Almaqam",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "26/06/2026 TO 20/09/2026",
        "prices": [
          { "roomType": "Double", "price": 520 },
          { "roomType": "Triple", "price": 600 },
          { "roomType": "Quad", "price": 680 }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          { "roomType": "Double", "price": 550 },
          { "roomType": "Triple", "price": 630 },
          { "roomType": "Quad", "price": 710 }
        ]
      }
    ]
  },
  {
    "id": "shaza-regency-plaza-madinah",
    "name": "Shaza Regency Plaza",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "27/06/2026 TO 20/09/2026",
        "prices": [
          { "roomType": "Double", "price": 500 },
          { "roomType": "Triple", "price": 580 },
          { "roomType": "Quad", "price": 660 }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          { "roomType": "Double", "price": 530 },
          { "roomType": "Triple", "price": 610 },
          { "roomType": "Quad", "price": 690 }
        ]
      }
    ]
  },
  {
    "id": "grand-plaza-almadina-madinah",
    "name": "Grand Plaza Almadina",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "26/06/2026 TO 20/09/2026",
        "prices": [
          { "roomType": "Double", "price": 480 },
          { "roomType": "Triple", "price": 550 },
          { "roomType": "Quad", "price": 620 }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          { "roomType": "Double", "price": 500 },
          { "roomType": "Triple", "price": 570 },
          { "roomType": "Quad", "price": 640 }
        ]
      }
    ]
  },
  {
    "id": "maysan-rehab-elmysk-madinah",
    "name": "Maysan Rehab Elmysk",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          { "roomType": "Double", "price": 430 },
          { "roomType": "Triple", "price": 490 },
          { "roomType": "Quad", "price": 550 }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          { "roomType": "Double", "price": 455 },
          { "roomType": "Triple", "price": 515 },
          { "roomType": "Quad", "price": 575 }
        ]
      }
    ]
  },
  {
    "id": "maysan-rotana-elmysk-madinah",
    "name": "Maysan Rotana Elmysk",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "15/07/2026 TO 20/09/2026",
        "prices": [
          { "roomType": "Double", "price": 430 },
          { "roomType": "Triple", "price": 490 },
          { "roomType": "Quad", "price": 550 }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          { "roomType": "Double", "price": 455 },
          { "roomType": "Triple", "price": 515 },
          { "roomType": "Quad", "price": 575 }
        ]
      }
    ]
  },
  {
    "id": "arkan-almanar-madinah",
    "name": "Arkan Almanar",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          { "roomType": "Double", "price": 430 },
          { "roomType": "Triple", "price": 490 },
          { "roomType": "Quad", "price": 550 }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          { "roomType": "Double", "price": 455 },
          { "roomType": "Triple", "price": 515 },
          { "roomType": "Quad", "price": 575 }
        ]
      }
    ]
  },
  {
    "id": "maysan-altaqwa-madinah",
    "name": "Maysan Altaqwa",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "23/06/2026 TO 20/09/2026",
        "prices": [
          { "roomType": "Double", "price": 360 },
          { "roomType": "Triple", "price": 410 },
          { "roomType": "Quad", "price": 460 }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          { "roomType": "Double", "price": 390 },
          { "roomType": "Triple", "price": 440 },
          { "roomType": "Quad", "price": 490 }
        ]
      }
    ]
  },
  {
    "id": "plaza-inn-ohud-madinah",
    "name": "Plaza Inn Ohud",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "26/06/2026 TO 20/09/2026",
        "prices": [
          { "roomType": "Double", "price": 335 },
          { "roomType": "Triple", "price": 385 },
          { "roomType": "Quad", "price": 435 }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          { "roomType": "Double", "price": 355 },
          { "roomType": "Triple", "price": 405 },
          { "roomType": "Quad", "price": 455 }
        ]
      }
    ]
  },
  {
    "id": "dar-al-taqwa-maysan-madinah",
    "name": "Dar Al Taqwa",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "BB",
    "stars": 5,
    "seasons": [
      {
        "range": "05/06/2026 TO 30/08/2026",
        "prices": [
          { "roomType": "Double (City View - Weekdays)", "price": 945 },
          { "roomType": "Double (City View - Weekend)", "price": 1010 },
          { "roomType": "Standard Double (Haram View - Weekdays)", "price": 1075 },
          { "roomType": "Standard Double (Haram View - Weekend)", "price": 1135 },
          { "roomType": "Business Suite (Weekdays)", "price": 1640 },
          { "roomType": "Business Suite (Weekend)", "price": 1765 },
          { "roomType": "Business Junior Suite (Weekdays)", "price": 1890 },
          { "roomType": "Business Junior Suite (Weekend)", "price": 2015 }
        ]
      },
      {
        "range": "30/08/2026 TO 23/09/2026",
        "prices": [
          { "roomType": "Double (City View - Weekdays)", "price": 1390 },
          { "roomType": "Double (City View - Weekend)", "price": 1450 },
          { "roomType": "Standard Double (Haram View - Weekdays)", "price": 1515 },
          { "roomType": "Standard Double (Haram View - Weekend)", "price": 1575 },
          { "roomType": "Business Suite (Weekdays)", "price": 1955 },
          { "roomType": "Business Suite (Weekend)", "price": 2080 },
          { "roomType": "Business Junior Suite (Weekdays)", "price": 2205 },
          { "roomType": "Business Junior Suite (Weekend)", "price": 2330 }
        ]
      },
      {
        "range": "23/09/2026 TO 27/09/2026",
        "prices": [
          { "roomType": "Double (City View - Weekdays)", "price": 1515 },
          { "roomType": "Double (City View - Weekend)", "price": 1700 },
          { "roomType": "Standard Double (Haram View - Weekdays)", "price": 1700 },
          { "roomType": "Standard Double (Haram View - Weekend)", "price": 1890 },
          { "roomType": "Business Suite (Weekdays)", "price": 2520 },
          { "roomType": "Business Suite (Weekend)", "price": 2740 },
          { "roomType": "Business Junior Suite (Weekdays)", "price": 2835 },
          { "roomType": "Business Junior Suite (Weekend)", "price": 3055 }
        ]
      },
      {
        "range": "27/09/2026 TO 22/10/2026",
        "prices": [
          { "roomType": "Double (City View - Weekdays)", "price": 1390 },
          { "roomType": "Double (City View - Weekend)", "price": 1450 },
          { "roomType": "Standard Double (Haram View - Weekdays)", "price": 1515 },
          { "roomType": "Standard Double (Haram View - Weekend)", "price": 1575 },
          { "roomType": "Business Suite (Weekdays)", "price": 1955 },
          { "roomType": "Business Suite (Weekend)", "price": 2080 },
          { "roomType": "Business Junior Suite (Weekdays)", "price": 2205 },
          { "roomType": "Business Junior Suite (Weekend)", "price": 2330 }
        ]
      }
    ]
  },
  {
    "id": "dar-al-iman-intercontinental-maysan-madinah",
    "name": "Dar Al Iman Intercontinental",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "BB",
    "stars": 5,
    "seasons": [
      {
        "range": "11/06/2026 TO 01/08/2026",
        "prices": [
          { "roomType": "Double (City View - Weekdays)", "price": 860 },
          { "roomType": "Double (City View - Weekend)", "price": 910 },
          { "roomType": "Double (Haram View - Weekdays)", "price": 1035 },
          { "roomType": "Double (Haram View - Weekend)", "price": 1080 }
        ]
      },
      {
        "range": "01/08/2026 TO 01/09/2026",
        "prices": [
          { "roomType": "Double (City View - Weekdays)", "price": 1050 },
          { "roomType": "Double (City View - Weekend)", "price": 1165 },
          { "roomType": "Double (Haram View - Weekdays)", "price": 1225 },
          { "roomType": "Double (Haram View - Weekend)", "price": 1340 }
        ]
      },
      {
        "range": "01/09/2026 TO 01/10/2026",
        "prices": [
          { "roomType": "Double (City View - Weekdays)", "price": 1155 },
          { "roomType": "Double (City View - Weekend)", "price": 1355 },
          { "roomType": "Double (Haram View - Weekdays)", "price": 1330 },
          { "roomType": "Double (Haram View - Weekend)", "price": 1530 }
        ]
      },
      {
        "range": "01/10/2026 TO 31/10/2026",
        "prices": [
          { "roomType": "Double (City View - Weekdays)", "price": 1175 },
          { "roomType": "Double (City View - Weekend)", "price": 1360 },
          { "roomType": "Double (Haram View - Weekdays)", "price": 1410 },
          { "roomType": "Double (Haram View - Weekend)", "price": 1600 }
        ]
      }
    ]
  }
];

const getMatchedPeriodName = (rangeStr: string): string => {
  const { start: seasonStart, end: seasonEnd } = parseDateRange(rangeStr);
  if (!seasonStart || !seasonEnd) return rangeStr;

  const matches = MASTER_PERIODS.filter(p => {
    const pStart = parseDate(p.start);
    const pEnd = parseDate(p.end);
    if (!pStart || !pEnd) return false;
    return seasonStart >= pStart && seasonStart <= pEnd;
  });

  if (matches.length === 0) return rangeStr;
  
  const match = matches.length > 1 
    ? (matches.find(m => m.name !== 'LONG SEASON 2026') || matches[0])
    : matches[0];

  return match.hijri;
};

interface HotelViewProps {
  isVendorMode?: boolean;
  vendorName?: string;
}

export const HotelView: React.FC<HotelViewProps> = ({ isVendorMode = false, vendorName = '' }) => {
  const { kurs: masterKurs, updateKurs } = useKurs();
  const [localKurs, setLocalKurs] = useState<number>(4900);

  interface HotelMetaItem {
    id: string;
    hotelId: string;
    hotelName: string;
    city: string;
    photoUrl: string;
    distance: string;
    stars?: number;
  }
  const [hotelMetas, setHotelMetas] = useState<HotelMetaItem[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const cached = localStorage.getItem(`umaroh_cached_role_${user.uid}`);
        if (cached) {
          setCurrentUserRole(cached);
        }
        // Get user role from firestore
        const unsubUser = onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
          if (userDoc.exists()) {
            const r = userDoc.data().role;
            setCurrentUserRole(r);
            localStorage.setItem(`umaroh_cached_role_${user.uid}`, r);
          }
        });
        return () => unsubUser();
      } else {
        setCurrentUserRole(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleSaveHotelMeta = async (hotelId: string, hotelName: string, city: string, photoUrl: string, distance: string) => {
    try {
      // Find existing meta to get its actual Firestore document ID (if exists)
      const existingMeta = getMetaForHotelInternal(hotelId, hotelName, city);
      const docId = existingMeta?.id || `${hotelName}-${city}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const docRef = doc(db, 'hotel_metadata', docId);
      
      const starsToSave = existingMeta?.stars || 5;

      await setDoc(docRef, {
        hotelId,
        hotelName,
        city,
        photoUrl,
        distance,
        stars: starsToSave,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Error saving hotel metadata inline:", error);
      alert(`Gagal menyimpan foto/jarak hotel: ${errorMsg}`);
      throw error;
    }
  };

  useEffect(() => {
    const unsubHotelMetas = onSnapshot(
      collection(db, "hotel_metadata"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as HotelMetaItem));
        setHotelMetas(data);
      },
      (error) => {
        console.error("Failed to load hotel_metadata in HotelView:", error);
      }
    );
    return () => unsubHotelMetas();
  }, []);

  const getMetaForHotelInternal = (hotelId: string, hotelName: string, hotelCity?: string) => {
    if (!hotelMetas || hotelMetas.length === 0) return undefined;
    
    const targetNorm = getNormalizedHotelNameKey(hotelName);
    const targetCityNorm = hotelCity 
      ? hotelCity.toLowerCase()
          .replace(/mecca/g, "makkah")
          .replace(/mekkah/g, "makkah")
          .replace(/medina/g, "madinah")
          .replace(/medinah/g, "madinah")
          .replace(/[^a-z]/g, "") 
      : "";
    
    return hotelMetas.find(m => {
      if (m.hotelId === hotelId) return true;
      if (m.hotelName && hotelName && m.hotelName.toLowerCase() === hotelName.toLowerCase()) return true;
      
      const mNorm = getNormalizedHotelNameKey(m.hotelName);
      const mCityNorm = m.city 
        ? m.city.toLowerCase()
            .replace(/mecca/g, "makkah")
            .replace(/mekkah/g, "makkah")
            .replace(/medina/g, "madinah")
            .replace(/medinah/g, "madinah")
            .replace(/[^a-z]/g, "") 
        : "";
      
      if (targetNorm && mNorm === targetNorm) {
        if (targetCityNorm && mCityNorm) {
          return targetCityNorm === mCityNorm;
        }
        return true;
      }
      return false;
    });
  };

  useEffect(() => {
    if (masterKurs) {
      setLocalKurs(masterKurs.sarToIdr);
    }
  }, [masterKurs]);

  const [localHotels, setLocalHotels] = useState<Hotel[]>(() => {
    const cached = localStorage.getItem('umaroh_db_hotels');
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Hotel[];
        // Replace existing Maysan, ROWA, Alharmain, Emaar, Konoz, and Areej Tabah hotels in stored parsed data with updated ones from defaultHotels
        const parsedUpdated = parsed.map(ph => {
          const matchingDefault = defaultHotels.find(dh => dh.id === ph.id);
          if (matchingDefault && (
            matchingDefault.vendor === 'Maysan Int. Group' || 
            matchingDefault.vendor === 'ROWA' || 
            matchingDefault.vendor === 'Alharmain Hotels Management' || 
            matchingDefault.vendor === 'Emaar Al Diyafa' ||
            matchingDefault.vendor === 'Konoz' ||
            matchingDefault.vendor === 'Areej Tabah' ||
            matchingDefault.vendor === 'Diar Al Manasik'
          )) {
            return matchingDefault;
          }
          return ph;
        });
        // Merge missing hotels from defaultHotels
        const parsedIds = new Set(parsedUpdated.map(h => h.id));
        const missingHotels = defaultHotels.filter(h => !parsedIds.has(h.id));
        if (missingHotels.length > 0) {
          const merged = [...parsedUpdated, ...missingHotels];
          try {
            localStorage.setItem('umaroh_db_hotels', JSON.stringify(merged));
          } catch (err) {
            console.info('[umaroh_db_hotels cache] Bypassed local caching (quota reached):', err);
          }
          return merged;
        }
        return parsedUpdated;
      } catch (e) {
        console.error('Failed to parse cached hotels:', e);
      }
    }
    return hotels;
  });

  const saveHotels = (updated: Hotel[]) => {
    setLocalHotels(updated);
    try {
      localStorage.setItem('umaroh_db_hotels', JSON.stringify(updated));
    } catch (err) {
      console.info('[umaroh_db_hotels cache] Failed to save umaroh_db_hotels:', err);
    }
  };

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<Hotel[]>;
      if (customEvent.detail) {
        setLocalHotels(customEvent.detail);
      }
    };
    window.addEventListener('umaroh_db_sync:umaroh_db_hotels', handleSync);
    return () => window.removeEventListener('umaroh_db_sync:umaroh_db_hotels', handleSync);
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [mealFilter, setMealFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'confirm' | 'synced' | 'loading' | 'error'>('idle');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Add & Edit modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);

  // Form states for manual hotel
  const [formName, setFormName] = useState('');
  const [formCity, setFormCity] = useState<'Madinah' | 'Makkah'>('Madinah');
  const [formVendor, setFormVendor] = useState('');
  const [formMealPlan, setFormMealPlan] = useState<'FB' | 'RO' | 'HB' | 'BB'>('FB');
  const [formStars, setFormStars] = useState<number>(4);
  const [formSeasons, setFormSeasons] = useState<{ range: string; quad: number; triple: number; double: number }[]>([
    { range: '23/06/2026 TO 20/09/2026', quad: 0, triple: 0, double: 0 }
  ]);

  const openAddModal = () => {
    setFormName('');
    setFormCity('Madinah');
    setFormVendor('');
    setFormMealPlan('FB');
    setFormStars(4);
    setFormSeasons([{ range: '23/06/2026 TO 20/09/2026', quad: 0, triple: 0, double: 0 }]);
    setIsAddOpen(true);
  };

  const openEditModal = (hotel: Hotel) => {
    setEditingHotel(hotel);
    setFormName(hotel.name);
    setFormCity(hotel.city as 'Madinah' | 'Makkah');
    setFormVendor(hotel.vendor);
    setFormMealPlan(hotel.mealPlan);
    setFormStars(hotel.stars || 4);
    
    const mappedSeasons = hotel.seasons.map(s => {
      const quadPrice = s.prices.find(p => p.roomType === 'Quad')?.price || 0;
      const triplePrice = s.prices.find(p => p.roomType === 'Triple')?.price || 0;
      const doublePrice = s.prices.find(p => p.roomType === 'Double')?.price || 0;
      return {
        range: s.range,
        quad: quadPrice,
        triple: triplePrice,
        double: doublePrice
      };
    });
    setFormSeasons(mappedSeasons.length > 0 ? mappedSeasons : [{ range: '23/06/2026 TO 20/09/2026', quad: 0, triple: 0, double: 0 }]);
    setIsEditOpen(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formVendor.trim()) {
      alert('Nama Hotel dan Vendor wajib diisi!');
      return;
    }

    const newHotel: Hotel = {
      id: 'hotel_manual_' + Date.now(),
      name: formName,
      city: formCity,
      vendor: formVendor,
      mealPlan: formMealPlan,
      stars: formStars,
      seasons: formSeasons.map(s => ({
        range: s.range,
        prices: [
          { roomType: 'Quad', price: Number(s.quad) },
          { roomType: 'Triple', price: Number(s.triple) },
          { roomType: 'Double', price: Number(s.double) }
        ]
      }))
    };

    saveHotels([newHotel, ...localHotels]);
    setIsAddOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHotel) return;
    if (!formName.trim() || !formVendor.trim()) {
      alert('Nama Hotel dan Vendor wajib diisi!');
      return;
    }

    const updated = localHotels.map(h => {
      if (h.id === editingHotel.id) {
        return {
          ...h,
          name: formName,
          city: formCity,
          vendor: formVendor,
          mealPlan: formMealPlan,
          stars: formStars,
          seasons: formSeasons.map(s => ({
            range: s.range,
            prices: [
              { roomType: 'Quad', price: Number(s.quad) },
              { roomType: 'Triple', price: Number(s.triple) },
              { roomType: 'Double', price: Number(s.double) }
            ]
          }))
        } as Hotel;
      }
      return h;
    });

    saveHotels(updated);
    setIsEditOpen(false);
    setEditingHotel(null);
  };

  const handleSingleDelete = (hotel: Hotel) => {
    if (confirm(`Apakah Anda yakin ingin menghapus hotel "${hotel.name}"?`)) {
      const updated = localHotels.filter(h => h.id !== hotel.id);
      saveHotels(updated);
      setSelectedIds(selectedIds.filter(id => id !== hotel.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} hotel terpilih?`)) {
      const updated = localHotels.filter(h => !selectedIds.includes(h.id));
      saveHotels(updated);
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(item => item !== id));
    }
  };

  const handleSelectAll = (checked: boolean, visibleIds: string[]) => {
    if (checked) {
      const union = Array.from(new Set([...selectedIds, ...visibleIds]));
      setSelectedIds(union);
    } else {
      setSelectedIds(selectedIds.filter(id => !visibleIds.includes(id)));
    }
  };

  const handleSaveKurs = async () => {
    try {
      await updateKurs(localKurs, masterKurs?.usdToIdr || 20000);
      alert('Kurs Hotel (SAR) berhasil diperbarui!');
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui kurs');
    }
  };

  // Automated silent sync check on component load
  useEffect(() => {
    const silentCheckAndSync = async () => {
      try {
        const q = query(collection(db, 'master_hotels'), where('vendor', '==', 'Maysan Int. Group'));
        const snapshot = await getDocs(q);
        // If Firestore master_hotels has outdated count or missing hotels, auto-sync them seamlessly
        if (snapshot.size < newMaysanHotels.length) {
          console.log('Automated silent sync: Maysan Int. Group hotels missing in Firestore database. Populating...');
          const batch = writeBatch(db);
          newMaysanHotels.forEach((hotel) => {
            const itemRef = doc(db, 'master_hotels', hotel.id);
            const payload = {
              ...hotel,
              updatedAt: new Date().toISOString()
            };
            batch.set(itemRef, payload, { merge: true });
          });
          await batch.commit();
          console.log('Automated silent sync for Maysan completed!');
        }

        const qRowa = query(collection(db, 'master_hotels'), where('vendor', '==', 'ROWA'));
        const rowaSnapshot = await getDocs(qRowa);
        if (rowaSnapshot.size < newRowaHotels.length) {
          console.log('Automated silent sync: ROWA hotels missing in Firestore database. Populating...');
          const batch = writeBatch(db);
          newRowaHotels.forEach((hotel) => {
            const itemRef = doc(db, 'master_hotels', hotel.id);
            const payload = {
              ...hotel,
              updatedAt: new Date().toISOString()
            };
            batch.set(itemRef, payload, { merge: true });
          });
          await batch.commit();
          console.log('Automated silent sync for ROWA completed!');
        }

        const qAlharmain = query(collection(db, 'master_hotels'), where('vendor', '==', 'Alharmain Hotels Management'));
        const alharmainSnapshot = await getDocs(qAlharmain);
        if (alharmainSnapshot.size < newAlharmainHotels.length) {
          console.log('Automated silent sync: Alharmain Hotels Management hotels missing in Firestore database. Populating...');
          const batch = writeBatch(db);
          newAlharmainHotels.forEach((hotel) => {
            const itemRef = doc(db, 'master_hotels', hotel.id);
            const payload = {
              ...hotel,
              updatedAt: new Date().toISOString()
            };
            batch.set(itemRef, payload, { merge: true });
          });
          await batch.commit();
          console.log('Automated silent sync for Alharmain completed!');
        }

        const qEmaar = query(collection(db, 'master_hotels'), where('vendor', '==', 'Emaar Al Diyafa'));
        const emaarSnapshot = await getDocs(qEmaar);
        if (emaarSnapshot.size < newEmaarHotels.length) {
          console.log('Automated silent sync: Emaar Al Diyafa hotels missing in Firestore database. Populating...');
          const batch = writeBatch(db);
          newEmaarHotels.forEach((hotel) => {
            const itemRef = doc(db, 'master_hotels', hotel.id);
            const payload = {
              ...hotel,
              updatedAt: new Date().toISOString()
            };
            batch.set(itemRef, payload, { merge: true });
          });
          await batch.commit();
          console.log('Automated silent sync for Emaar completed!');
        }

        const qKonoz = query(collection(db, 'master_hotels'), where('vendor', '==', 'Konoz'));
        const konozSnapshot = await getDocs(qKonoz);
        if (konozSnapshot.size < newKonozHotels.length) {
          console.log('Automated silent sync: Konoz hotels missing in Firestore database. Populating...');
          const batch = writeBatch(db);
          newKonozHotels.forEach((hotel) => {
            const itemRef = doc(db, 'master_hotels', hotel.id);
            const payload = {
              ...hotel,
              updatedAt: new Date().toISOString()
            };
            batch.set(itemRef, payload, { merge: true });
          });
          await batch.commit();
          console.log('Automated silent sync for Konoz completed!');
        }

        const qAreej = query(collection(db, 'master_hotels'), where('vendor', '==', 'Areej Tabah'));
        const areejSnapshot = await getDocs(qAreej);
        if (areejSnapshot.size < newAreejTabahHotels.length) {
          console.log('Automated silent sync: Areej Tabah hotels missing in Firestore database. Populating...');
          const batch = writeBatch(db);
          newAreejTabahHotels.forEach((hotel) => {
            const itemRef = doc(db, 'master_hotels', hotel.id);
            const payload = {
              ...hotel,
              updatedAt: new Date().toISOString()
            };
            batch.set(itemRef, payload, { merge: true });
          });
          await batch.commit();
          console.log('Automated silent sync for Areej Tabah completed!');
        }

        const qDiar = query(collection(db, 'master_hotels'), where('vendor', '==', 'Diar Al Manasik'));
        const diarSnapshot = await getDocs(qDiar);
        if (diarSnapshot.size < newDiarAlManasikHotels.length) {
          console.log('Automated silent sync: Diar Al Manasik hotels missing in Firestore database. Populating...');
          const batch = writeBatch(db);
          newDiarAlManasikHotels.forEach((hotel) => {
            const itemRef = doc(db, 'master_hotels', hotel.id);
            const payload = {
              ...hotel,
              updatedAt: new Date().toISOString()
            };
            batch.set(itemRef, payload, { merge: true });
          });
          await batch.commit();
          console.log('Automated silent sync for Diar Al Manasik completed!');
        }
      } catch (e) {
        console.warn('Silent sync checks failed. This is expected if the current user is signed out or non-operational user:', e);
      }
    };
    silentCheckAndSync();
  }, []);

  const handleSyncToFirestore = async () => {
    if (syncStatus === 'idle') {
      setSyncStatus('confirm');
      return;
    }
    if (syncStatus !== 'confirm') return;

    setSyncStatus('loading');
    try {
      const batch = writeBatch(db);
      newMaysanHotels.forEach((hotel) => {
        const itemRef = doc(db, 'master_hotels', hotel.id);
        const payload = {
          ...hotel,
          updatedAt: new Date().toISOString()
        };
        batch.set(itemRef, payload, { merge: true });
      });
      newRowaHotels.forEach((hotel) => {
        const itemRef = doc(db, 'master_hotels', hotel.id);
        const payload = {
          ...hotel,
          updatedAt: new Date().toISOString()
        };
        batch.set(itemRef, payload, { merge: true });
      });
      newAlharmainHotels.forEach((hotel) => {
        const itemRef = doc(db, 'master_hotels', hotel.id);
        const payload = {
          ...hotel,
          updatedAt: new Date().toISOString()
        };
        batch.set(itemRef, payload, { merge: true });
      });
      newEmaarHotels.forEach((hotel) => {
        const itemRef = doc(db, 'master_hotels', hotel.id);
        const payload = {
          ...hotel,
          updatedAt: new Date().toISOString()
        };
        batch.set(itemRef, payload, { merge: true });
      });
      newKonozHotels.forEach((hotel) => {
        const itemRef = doc(db, 'master_hotels', hotel.id);
        const payload = {
          ...hotel,
          updatedAt: new Date().toISOString()
        };
        batch.set(itemRef, payload, { merge: true });
      });
      newAreejTabahHotels.forEach((hotel) => {
        const itemRef = doc(db, 'master_hotels', hotel.id);
        const payload = {
          ...hotel,
          updatedAt: new Date().toISOString()
        };
        batch.set(itemRef, payload, { merge: true });
      });
      newDiarAlManasikHotels.forEach((hotel) => {
        const itemRef = doc(db, 'master_hotels', hotel.id);
        const payload = {
          ...hotel,
          updatedAt: new Date().toISOString()
        };
        batch.set(itemRef, payload, { merge: true });
      });
      await batch.commit();
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      console.error('Error manual syncing hotels to Firestore:', err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const vendors = useMemo(() => {
    const uniqueVendors = new Set(localHotels.map(hotel => hotel.vendor));
    return Array.from(uniqueVendors).sort();
  }, [localHotels]);

  const filteredHotels = useMemo(() => {
    return localHotels.filter((hotel) => {
      const matchesSearch = hotel.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMeal = mealFilter === 'ALL' || hotel.mealPlan === mealFilter;
      const matchesVendor = isVendorMode 
        ? hotel.vendor.toLowerCase() === vendorName.toLowerCase()
        : (vendorFilter === 'ALL' || hotel.vendor === vendorFilter);
      const matchesCity = cityFilter === 'ALL' || hotel.city === cityFilter;
      
      let matchesDate = true;
      if (dateFilter) {
        const checkDate = new Date(dateFilter);
        // Check if any season in the hotel covers the selected date
        matchesDate = hotel.seasons.some(season => isDateInRange(checkDate, season.range));
      }

      return matchesSearch && matchesMeal && matchesVendor && matchesCity && matchesDate;
    });
  }, [localHotels, searchTerm, mealFilter, vendorFilter, cityFilter, dateFilter, isVendorMode, vendorName]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setMealFilter('ALL');
    setVendorFilter('ALL');
    setCityFilter('ALL');
    setDateFilter('');
  };

  const handleExportExcel = () => {
    interface HotelExportRow {
      nama_hotel: string;
      nama_vendor: string;
      nama_periode: string;
      kota_hotel: string;
      bintang: number;
      mata_uang: string;
      kurs_ke_idr: number;
      harga_quad_fx: number;
      harga_single_fx: number;
      komisi_persen: number;
      jarak_meter: number;
      link_maps: string;
      deskripsi: string;
    }

    // Collect all possible rows first
    const allRows: HotelExportRow[] = [];
    
    localHotels.forEach(hotel => {
      if (hotel.seasons && hotel.seasons.length > 0) {
        hotel.seasons.forEach(season => {
          const quadPrice = season.prices.find(p => p.roomType === 'Quad')?.price || 0;
          const singlePrice = season.prices.find(p => p.roomType === 'Single' || p.roomType === 'Full Room')?.price || 0;
          const mappedPeriod = season.range ? getMatchedPeriodName(season.range) : 'FULL YEAR';

          allRows.push({
            'nama_hotel': hotel.name,
            'nama_vendor': hotel.vendor,
            'nama_periode': mappedPeriod,
            'kota_hotel': hotel.city,
            'bintang': hotel.stars || 0,
            'mata_uang': 'SAR',
            'kurs_ke_idr': 4900,
            'harga_quad_fx': quadPrice,
            'harga_single_fx': singlePrice,
            'komisi_persen': 0,
            'jarak_meter': 0,
            'link_maps': '',
            'deskripsi': `${hotel.mealPlan || ''}`
          });
        });
      } else {
        allRows.push({
          'nama_hotel': hotel.name,
          'nama_vendor': hotel.vendor,
          'nama_periode': 'FULL YEAR',
          'kota_hotel': hotel.city,
          'bintang': hotel.stars || 0,
          'mata_uang': 'SAR',
          'kurs_ke_idr': 4900,
          'harga_quad_fx': 0,
          'harga_single_fx': 0,
          'komisi_persen': 0,
          'jarak_meter': 0,
          'link_maps': '',
          'deskripsi': `${hotel.mealPlan || ''}`
        });
      }
    });

    // Deduplicate: group by (hotel name + period) and pick highest quad price
    const filteredRowsMap: { [key: string]: HotelExportRow } = {};
    allRows.forEach(row => {
      const key = `${row.nama_hotel}|${row.nama_periode}`;
      if (!filteredRowsMap[key] || row.harga_quad_fx > filteredRowsMap[key].harga_quad_fx) {
        filteredRowsMap[key] = row;
      }
    });

    const excelData = Object.values(filteredRowsMap);

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Create '00_Petunjuk' worksheet
    const guideData = [
      ['Langkah', 'Penjelasan'],
      ['1', 'Isi data hanya di sheet 01_Data_Hotel. Jangan isi sheet 00_Petunjuk atau 99_Referensi.'],
      ['2', 'Header pada baris pertama jangan diubah urutannya agar sistem bisa membaca file dengan aman.'],
      ['3', 'Nama vendor, periode, dan kota harus sama seperti daftar di sheet 99_Referensi.'],
      ['4', 'Foto hotel tidak perlu dimasukkan ke Excel. Foto akan dipilih saat modal review import muncul.'],
      ['5', 'Setelah selesai mengisi, simpan tetap dalam format XLSX atau CSV lalu import kembali dari aplikasi.'],
      ['6', 'Kalau memakai file lama yang masih menggunakan Sheet1, sistem tetap akan mencoba membacanya selama header kolom hotel masih sesuai.'],
      ['nama_hotel', 'Wajib diisi. Nama hotel untuk tampil di listing and paket.'],
      ['nama_vendor', 'Wajib diisi and harus sama persis dengan nama vendor pada master vendor.'],
      ['nama_periode', 'Wajib diisi (Hijriah).'],
      ['kota_hotel', 'Wajib diisi dan harus sama dengan master tujuan umrah atau kota wisata.'],
      ['bintang', 'Isi angka 1 sampai 5.'],
      ['mata_uang', 'Wajib diisi. (contoh: SAR, IDR, USD)'],
      ['kurs_ke_idr', 'Wajib diisi. Untuk mata uang IDR cukup isi 1.'],
      ['harga_quad_fx', 'Wajib diisi. Triple dan Double akan dihitung otomatis dari harga Quad.'],
      ['harga_single_fx', 'Opsional. Isi jika hotel menyediakan harga Single.'],
      ['komisi_persen', 'Opsional. Default 0.'],
      ['jarak_meter', 'Opsional. Isi dengan angka (meter).'],
      ['link_maps', 'Opsional. URL Google Maps.'],
      ['deskripsi', 'Opsional. Deskripsi singkat hotel.']
    ];
    const wsGuide = XLSX.utils.aoa_to_sheet(guideData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsGuide, '00_Petunjuk');
    XLSX.utils.book_append_sheet(workbook, worksheet, '01_Data_Hotel');
    
    XLSX.writeFile(workbook, 'template_hotel.xlsx');
  };

  const visibleHotelIds = filteredHotels.map(h => h.id);
  const isAllVisibleSelected = visibleHotelIds.length > 0 && visibleHotelIds.every(id => selectedIds.includes(id));

  return (
    <div className="container mx-auto px-4 py-8 flex-grow">
      {/* Kurs & Add Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="font-bold text-gray-700 text-sm whitespace-nowrap">Kurs SAR ke IDR:</span>
          <div className="relative rounded-lg shadow-sm max-w-[150px]">
            <input
              type="number"
              value={localKurs}
              onChange={(e) => setLocalKurs(Number(e.target.value))}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold text-gray-800"
            />
          </div>
          <button
            onClick={handleSaveKurs}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex items-center gap-1 shrink-0"
          >
            Update Kurs
          </button>
        </div>

        <button
          onClick={openAddModal}
          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Hotel Manual
        </button>
      </div>

      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        mealFilter={mealFilter}
        onMealFilterChange={setMealFilter}
        vendorFilter={vendorFilter}
        onVendorFilterChange={setVendorFilter}
        cityFilter={cityFilter}
        onCityFilterChange={setCityFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        onResetFilters={handleResetFilters}
        vendors={vendors}
        isVendorMode={isVendorMode}
      />

      {/* Multi selection and list header */}
      <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isAllVisibleSelected}
              onChange={(e) => handleSelectAll(e.target.checked, visibleHotelIds)}
              className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <span>Pilih Semua ({filteredHotels.length} Hotel)</span>
          </label>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded">
                {selectedIds.length} Terpilih
              </span>
              <button
                onClick={handleBulkDelete}
                className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-700 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Terpilih
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleSyncToFirestore}
            disabled={syncStatus === 'loading'}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 border shadow-sm ${
              syncStatus === 'confirm' ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 animate-pulse' :
              syncStatus === 'synced' ? 'bg-green-100 text-green-800 border-green-300' :
              syncStatus === 'error' ? 'bg-red-100 text-red-800 border-red-300' :
              'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${syncStatus === 'loading' ? 'animate-spin' : ''}`} />
            {syncStatus === 'idle' && 'Sinkronisasi Database'}
            {syncStatus === 'confirm' && 'Yakin Sinkronisasi?'}
            {syncStatus === 'loading' && 'Menyingkronkan...'}
            {syncStatus === 'synced' && 'Database Selesai Disinkronkan!'}
            {syncStatus === 'error' && 'Gagal Sinkronisasi!'}
          </button>
          
          <button 
            onClick={handleExportExcel}
            className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-200 transition-colors border border-emerald-200 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download Excel Template
          </button>
        </div>
      </div>

      {filteredHotels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHotels.map((hotel) => {
            const meta = getMetaForHotelInternal(hotel.id, hotel.name, hotel.city);
            return (
              <HotelCard 
                key={hotel.id} 
                hotel={hotel} 
                onClick={setSelectedHotel}
                onEdit={openEditModal}
                onDelete={handleSingleDelete}
                isSelected={selectedIds.includes(hotel.id)}
                onSelect={handleSelectOne}
                photoUrl={meta?.photoUrl}
                distance={meta?.distance}
                stars={meta?.stars}
                canEditInline={currentUserRole === 'admin' || currentUserRole === 'operasional'}
                onSaveMeta={(photoUrl, distance) => handleSaveHotelMeta(hotel.id, hotel.name, hotel.city, photoUrl, distance)}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No hotels found</h3>
          <p className="text-gray-500">Try adjusting your search or filters.</p>
        </div>
      )}

      {selectedHotel && (
        <HotelDetailModal 
          hotel={selectedHotel} 
          onClose={() => setSelectedHotel(null)} 
        />
      )}

      {/* Manual Add / Edit Modals */}
      {(isAddOpen || isEditOpen) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col my-8 max-h-[90vh]">
            <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg">
                {isAddOpen ? 'Tambah Hotel Manual' : 'Edit Hotel Master'}
              </h3>
              <button 
                onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
                className="hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={isAddOpen ? handleSaveAdd : handleSaveEdit} className="p-6 overflow-y-auto flex-grow space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Hotel</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: Safwah Royal Orchid"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kota</label>
                  <select
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value as 'Madinah' | 'Makkah')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="Madinah">Madinah</option>
                    <option value="Makkah">Makkah</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor</label>
                  <input
                    type="text"
                    value={formVendor}
                    onChange={(e) => setFormVendor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: TFA, ROWA, Maysan"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Meal Plan</label>
                  <input
                    type="text"
                    value={formMealPlan}
                    onChange={(e) => setFormMealPlan(e.target.value as 'FB' | 'RO' | 'HB' | 'BB')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: FB, BB, HB"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Bintang</label>
                  <select
                    value={formStars}
                    onChange={(e) => setFormStars(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="3">3 Bintang</option>
                    <option value="4">4 Bintang</option>
                    <option value="5">5 Bintang</option>
                  </select>
                </div>
              </div>

              {/* Seasons Section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-gray-800 text-sm">Musim & Tarif Room (SAR)</h4>
                  <button
                    type="button"
                    onClick={() => setFormSeasons([...formSeasons, { range: '01/10/2026 TO 31/10/2026', quad: 0, triple: 0, double: 0 }])}
                    className="text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Tambah Musim
                  </button>
                </div>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {formSeasons.map((season, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3 relative">
                      <button
                        type="button"
                        onClick={() => setFormSeasons(formSeasons.filter((_, sIdx) => sIdx !== idx))}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                        disabled={formSeasons.length === 1}
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Periode Tanggal (Range)</label>
                        <input
                          type="text"
                          value={season.range}
                          onChange={(e) => {
                            const updated = [...formSeasons];
                            updated[idx].range = e.target.value;
                            setFormSeasons(updated);
                          }}
                          placeholder="DD/MM/YYYY TO DD/MM/YYYY"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Quad Price (SAR)</label>
                          <input
                            type="number"
                            value={season.quad || ''}
                            onChange={(e) => {
                              const updated = [...formSeasons];
                              updated[idx].quad = Number(e.target.value);
                              setFormSeasons(updated);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            placeholder="Quad Price"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Triple Price (SAR)</label>
                          <input
                            type="number"
                            value={season.triple || ''}
                            onChange={(e) => {
                              const updated = [...formSeasons];
                              updated[idx].triple = Number(e.target.value);
                              setFormSeasons(updated);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            placeholder="Triple Price"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Double Price (SAR)</label>
                          <input
                            type="number"
                            value={season.double || ''}
                            onChange={(e) => {
                              const updated = [...formSeasons];
                              updated[idx].double = Number(e.target.value);
                              setFormSeasons(updated);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            placeholder="Double Price"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
                >
                  {isAddOpen ? 'Simpan Hotel Baru' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
