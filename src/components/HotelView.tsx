import React, { useState, useMemo, useEffect } from 'react';
import { hotels, Hotel, newRowaHotels, newAlharmainHotels, defaultHotels } from '../data/hotels';
import { HotelCard } from './HotelCard';
import { FilterBar } from './FilterBar';
import { HotelDetailModal } from './HotelDetailModal';
import { Building2, Download, RefreshCw } from 'lucide-react';
import { isDateInRange, parseDate, parseDateRange } from '../utils/dateUtils';
import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { doc, writeBatch, collection, getDocs, query, where } from 'firebase/firestore';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [mealFilter, setMealFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'confirm' | 'synced' | 'loading' | 'error'>('idle');

  // Automated silent sync check on component load
  useEffect(() => {
    const silentCheckAndSync = async () => {
      try {
        const q = query(collection(db, 'master_hotels'), where('vendor', '==', 'Maysan Int. Group'));
        const snapshot = await getDocs(q);
        // If Firestore master_hotels has outdated count or missing hotels, auto-sync them seamlessly
        if (snapshot.size < 25) {
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
        if (rowaSnapshot.size < 25) {
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
        if (alharmainSnapshot.size < 25) {
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
    const uniqueVendors = new Set(hotels.map(hotel => hotel.vendor));
    return Array.from(uniqueVendors).sort();
  }, []);

  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel) => {
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
  }, [searchTerm, mealFilter, vendorFilter, cityFilter, dateFilter, isVendorMode, vendorName]);

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
    
    hotels.forEach(hotel => {
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
      ['nama_hotel', 'Wajib diisi. Nama hotel untuk tampil di listing dan paket.'],
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

  return (
    <div className="container mx-auto px-4 py-8 flex-grow">
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

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-gray-500 text-sm">
          Showing {filteredHotels.length} hotels
        </div>
        <div className="flex flex-wrap gap-2">
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
          {filteredHotels.map((hotel) => (
            <HotelCard 
              key={hotel.id} 
              hotel={hotel} 
              onClick={setSelectedHotel}
            />
          ))}
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
    </div>
  );
};
