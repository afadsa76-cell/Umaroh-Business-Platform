import React, { useState, useMemo } from 'react';
import { hotels, Hotel } from '../data/hotels';
import { HotelCard } from './HotelCard';
import { FilterBar } from './FilterBar';
import { HotelDetailModal } from './HotelDetailModal';
import { Building2, Download } from 'lucide-react';
import { isDateInRange, parseDate, parseDateRange } from '../utils/dateUtils';
import * as XLSX from 'xlsx';

const MASTER_PERIODS = [
  { name: 'LOW SEASON JUN–JUL 2026', start: '16 Jun 2026', end: '31 Jul 2026', hijri: '1 Muharram 1448 – 15 Safar 1448' },
  { name: 'PEAK SUMMER JUL–AUG 2026', start: '01 Jul 2026', end: '15 Aug 2026', hijri: '15 Muharram 1448 – 30 Safar 1448' },
  { name: 'HIGH SEASON AUG–SEP 2026', start: '01 Aug 2026', end: '30 Sep 2026', hijri: '16 Safar 1448 – 18 Rabiul Awal 1448' },
  { name: 'TRANSISI SEP–OCT 2026', start: '01 Sep 2026', end: '14 Oct 2026', hijri: '1 Rabiul Awal 1448 – 12 Rabiul Akhir 1448' },
  { name: 'PEAK MAULID OCT–DEC 2026', start: '01 Oct 2026', end: '16 Dec 2026', hijri: '18 Rabiul Awal 1448 – 5 Jumadil Akhir 1448' },
  { name: 'AKHIR TAHUN – AWAL TAHUN', start: '16 Dec 2026', end: '08 Feb 2027', hijri: '5 Jumadil Akhir 1448 – 1 Sya’ban 1448' },
  { name: 'LONG SEASON 2026', start: '01 Jun 2026', end: '15 Dec 2026', hijri: '15 Dzulhijjah 1447 – 5 Jumadil Akhir 1448' },
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

export const HotelView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [mealFilter, setMealFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);

  const vendors = useMemo(() => {
    const uniqueVendors = new Set(hotels.map(hotel => hotel.vendor));
    return Array.from(uniqueVendors).sort();
  }, []);

  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      const matchesSearch = hotel.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMeal = mealFilter === 'ALL' || hotel.mealPlan === mealFilter;
      const matchesVendor = vendorFilter === 'ALL' || hotel.vendor === vendorFilter;
      const matchesCity = cityFilter === 'ALL' || hotel.city === cityFilter;
      
      let matchesDate = true;
      if (dateFilter) {
        const checkDate = new Date(dateFilter);
        // Check if any season in the hotel covers the selected date
        matchesDate = hotel.seasons.some(season => isDateInRange(checkDate, season.range));
      }

      return matchesSearch && matchesMeal && matchesVendor && matchesCity && matchesDate;
    });
  }, [searchTerm, mealFilter, vendorFilter, cityFilter, dateFilter]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setMealFilter('ALL');
    setVendorFilter('ALL');
    setCityFilter('ALL');
    setDateFilter('');
  };

  const handleExportExcel = () => {
    // Collect all possible rows first
    const allRows: any[] = [];
    
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
            'kurs_ke_idr': 4700,
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
          'kurs_ke_idr': 4700,
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
    const filteredRowsMap: { [key: string]: any } = {};
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
      />

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-gray-500 text-sm">
          Showing {filteredHotels.length} hotels
        </div>
        <button 
          onClick={handleExportExcel}
          className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-200 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Excel Template
        </button>
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
