import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, PlaneTakeoff, RefreshCw, X, Download } from 'lucide-react';
import { Maskapai, maskapaiData as initialData } from '../data/maskapai';
import * as XLSX from 'xlsx';
import { db, collection, onSnapshot, writeBatch, doc, addDoc, updateDoc, deleteDoc, handleFirestoreError, OperationType } from '../firebase';

export const MaskapaiView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<Maskapai[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'confirm' | 'migrating' | 'success' | 'error'>('idle');

  // Dynamic filter states
  const [filterKeberangkatan, setFilterKeberangkatan] = useState<'future' | 'past' | 'all'>('future');
  const [filterMinSeats, setFilterMinSeats] = useState<number>(10);
  const [isCleaning, setIsCleaning] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Maskapai>>({
    name: '',
    originCityName: '',
    destinationCityName: '',
    ruteLabel: '',
    tanggalKeberangkatan: '',
    tanggalKepulangan: '',
    hargaSetoran: 0,
    hargaJual: 0,
    availableSeats: 0,
    namaVendor: ''
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'maskapai'), (snapshot) => {
      const maskapaiList: Maskapai[] = [];
      
      snapshot.forEach((doc) => {
        const item = { id: doc.id, ...doc.data() } as Maskapai;
        maskapaiList.push(item);
      });
      
      setData(maskapaiList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching maskapai:", error);
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, 'maskapai');
    });

    return () => unsubscribe();
  }, []);

  const handleOpenForm = (item?: Maskapai) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        name: item.name,
        originCityName: item.originCityName,
        destinationCityName: item.destinationCityName,
        ruteLabel: item.ruteLabel,
        tanggalKeberangkatan: item.tanggalKeberangkatan,
        tanggalKepulangan: item.tanggalKepulangan,
        hargaSetoran: item.hargaSetoran,
        hargaJual: item.hargaJual,
        availableSeats: item.availableSeats,
        namaVendor: item.namaVendor
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        originCityName: '',
        destinationCityName: '',
        ruteLabel: '',
        tanggalKeberangkatan: '',
        tanggalKepulangan: '',
        hargaSetoran: 0,
        hargaJual: 0,
        availableSeats: 45,
        namaVendor: ''
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        updatedAt: new Date().toISOString()
      };
      if (editingId) {
        await updateDoc(doc(db, 'maskapai', editingId), payload);
      } else {
        await addDoc(collection(db, 'maskapai'), payload);
      }
      handleCloseForm();
    } catch (error) {
      console.error("Error saving maskapai:", error);
      handleFirestoreError(error, OperationType.WRITE, 'maskapai');
      alert('Gagal menyimpan data maskapai.');
    }
  };

  const handleSyncStaticData = async () => {
    if (migrationStatus === 'idle') {
      setMigrationStatus('confirm');
      return;
    }
    if (migrationStatus !== 'confirm') return;

    setMigrationStatus('migrating');
    try {
      const batch = writeBatch(db);
      initialData.forEach((item) => {
        const itemRef = doc(db, 'maskapai', item.id);
        const seedPayload = {
          ...item,
          updatedAt: new Date().toISOString()
        };
        batch.set(itemRef, seedPayload, { merge: true });
      });
      await batch.commit();
      setMigrationStatus('success');
      setTimeout(() => setMigrationStatus('idle'), 3000);
    } catch (error) {
      console.error('Error syncing data:', error);
      setMigrationStatus('error');
      setTimeout(() => setMigrationStatus('idle'), 3000);
      handleFirestoreError(error, OperationType.WRITE, 'maskapai');
    }
  };

  const handleExportExcel = () => {
    const excelData = data.map(item => {
      let kode = '';
      const nameUpper = item.name.toUpperCase();
      if (nameUpper.includes('GARUDA')) kode = 'GA';
      else if (nameUpper.includes('SAUDIA')) kode = 'SV';
      else if (nameUpper.includes('INDIGO')) kode = '6E';
      else if (nameUpper.includes('HAINAN')) kode = 'HU';
      else if (nameUpper.includes('LION')) kode = 'JT';
      else if (nameUpper.includes('QATAR')) kode = 'QR';
      else if (nameUpper.includes('EMIRATES')) kode = 'EK';
      else if (nameUpper.includes('ETIHAD')) kode = 'EY';
      else if (nameUpper.includes('BATIC') || nameUpper.includes('BATIK')) kode = 'ID';
      
      return {
        'nama_maskapai': `${item.name} (${item.programDays || 9} Hari) (${item.tanggalKeberangkatan}) - Sisa: ${item.availableSeats}`,
        'kode_maskapai': kode,
        'harga_maskapai': item.hargaJual || item.hargaBeli,
        'durasi_program_hari': item.programDays,
        'nama_periode': `${item.tanggalKeberangkatan} - ${item.tanggalKepulangan}`,
        'kota_berangkat': item.originCityName || 'Jakarta',
        'kota_tujuan_umrah': item.destinationCityName || 'Jeddah / Madinah',
        'umrah_la': 'false',
        'kota_wisata_lanjutan': '',
        'tipe_penerbangan': item.ruteLabel && item.ruteLabel.toLowerCase().includes('transit') ? 'transit' : 'direct',
        'kelas_penerbangan': 'economy',
        'logo_url': ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Maskapai');
    XLSX.writeFile(workbook, 'template_maskapai.xlsx');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredData = data.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tanggalKeberangkatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tanggalKepulangan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.namaVendor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.originCityName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.destinationCityName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // Departure Date Filter
    if (filterKeberangkatan === 'future') {
      if (item.tanggalKeberangkatan < todayStr) return false;
    } else if (filterKeberangkatan === 'past') {
      if (item.tanggalKeberangkatan >= todayStr) return false;
    }

    // Minimum Seats Filter
    if (item.availableSeats < filterMinSeats) return false;

    return true;
  });

  // Database maintenance counters
  const expiredCount = data.filter(item => item.tanggalKeberangkatan < todayStr).length;
  const zeroSeatCount = data.filter(item => item.availableSeats <= 0).length;
  const outdatedCount = data.filter(item => item.tanggalKeberangkatan < todayStr || item.availableSeats <= 0).length;

  const handleCleanupDatabase = async () => {
    const outdated = data.filter(item => item.tanggalKeberangkatan < todayStr || item.availableSeats <= 0);
    if (outdated.length === 0) {
      alert("Tidak ada jadwal kedaluwarsa atau habis bangku yang perlu dibersihkan saat ini.");
      return;
    }

    const confirmMsg = `⚠️ PEMBERSIHAN DATABASE MASTER\n\nSistem menemukan ${outdated.length} data maskapai tidak aktif:\n• ${expiredCount} Penerbangan masa lampau (sudah berangkat)\n• ${zeroSeatCount} Tiket dengan sisa 0 bangku\n\nApakah Anda yakin ingin MENGHAPUS PERMANEN dari Firestore? Tindakan ini tidak bisa dibatalkan.`;
    const confirmed = window.confirm ? window.confirm(confirmMsg) : true;
    if (!confirmed) return;

    setIsCleaning(true);
    try {
      const batchLength = 100;
      for (let i = 0; i < outdated.length; i += batchLength) {
        const batch = writeBatch(db);
        const chunk = outdated.slice(i, i + batchLength);
        chunk.forEach(item => {
          batch.delete(doc(db, 'maskapai', item.id));
        });
        await batch.commit();
      }
      alert(`Berhasil! ${outdated.length} data maskapai kedaluwarsa telah dihapus dari database.`);
    } catch (err) {
      console.error("Gagal melakukan pembersihan:", err);
      alert("Gagal melakukan pembersihan database.");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <PlaneTakeoff className="w-6 h-6 text-emerald-600" />
            Database Maskapai
          </h2>
          <p className="text-gray-500 text-sm mt-1">Kelola data harga tiket pesawat dan rute</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSyncStaticData}
            disabled={migrationStatus === 'migrating'}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 text-white ${
              migrationStatus === 'confirm' ? 'bg-orange-600 hover:bg-orange-700' :
              migrationStatus === 'success' ? 'bg-green-600' :
              migrationStatus === 'error' ? 'bg-red-600' :
              'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${migrationStatus === 'migrating' ? 'animate-spin' : ''}`} />
            {migrationStatus === 'idle' && 'Sync Data Baru'}
            {migrationStatus === 'confirm' && 'Yakin Sync?'}
            {migrationStatus === 'migrating' && 'Syncing...'}
            {migrationStatus === 'success' && 'Selesai!'}
            {migrationStatus === 'error' && 'Gagal!'}
          </button>
          <button 
            onClick={handleExportExcel}
            className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Excel
          </button>
          <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors" onClick={() => handleOpenForm()}>
            <Plus className="w-4 h-4" />
            Tambah Maskapai
          </button>
        </div>
      </div>

      {/* Info Panel & Advisory */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 mb-6 text-sm shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-bold text-amber-900 flex items-center gap-1.5 mb-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
              Asumsi Dasar Margin:
            </p>
            <ul className="list-disc list-inside text-amber-800 space-y-1 pl-1">
              <li>Indigo & Hainan: <span className="font-bold">2%</span></li>
              <li>Harga Tiket Pesawat &lt; Rp 15.000.000: <span className="font-bold">2%</span></li>
              <li>Harga Tiket Pesawat &ge; Rp 15.000.000: <span className="font-bold">1%</span></li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-amber-900 flex items-center gap-1.5 mb-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
              Catatan Operasional:
            </p>
            <ul className="list-disc list-inside text-amber-800 space-y-1 pl-1">
              <li>Keuntungan otomatis dikalkulasi berdasarkan persentase.</li>
              <li>Data diperbarui secara real-time berdasarkan laporan dari Wholesaler/Vendor tiket.</li>
              <li>Lakukan pembersihan berkala pada rute lama agar performa pencarian tetap optimal.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* SYSTEM MAINTENANCE CONSOLE */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 mb-6 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-md text-[10px] tracking-wider uppercase animate-pulse">OPTIMALISASI DB</span>
            <h3 className="text-sm font-black tracking-widest uppercase text-amber-400">Database Optimization Engine (Auto-Hapus)</h3>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed max-w-xl">
            Sistem otomatis menganalisis jadwal lampau dan kursi habis untuk memperkecil beban database.
            Terdeteksi <span className="font-extrabold text-amber-400 underline">{outdatedCount} rute kedaluwarsa / mati</span> dari total <span className="font-extrabold text-white">{data.length} item</span> yang tersimpan.
          </p>
          
          <div className="flex gap-4 mt-1 font-mono text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-rose-500 rounded-full"></span> 
              Berangkat Lampau: <strong className="text-rose-400 font-bold">{expiredCount}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span> 
              Sisa 0 Seats: <strong className="text-yellow-400 font-bold">{zeroSeatCount}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleCleanupDatabase}
            disabled={isCleaning || outdatedCount === 0}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              outdatedCount === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50' :
              isCleaning ? 'bg-orange-600 text-white animate-pulse' :
              'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white shadow-lg cursor-pointer hover:shadow-amber-500/10'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {isCleaning ? 'Sedang Menghapus...' : `Bersihkan ${outdatedCount} Jadwal Expired`}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Dynamic Filters Deck */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari maskapai, rute, atau periode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium bg-white"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
            {/* Keberangkatan Filter Tabs */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Rerata Jadwal:</span>
              <div className="flex bg-gray-200 p-1 rounded-xl border border-gray-300/40">
                <button
                  onClick={() => setFilterKeberangkatan('future')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    filterKeberangkatan === 'future' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Aktif / Mendatang
                </button>
                <button
                  onClick={() => setFilterKeberangkatan('past')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    filterKeberangkatan === 'past' ? 'bg-white text-rose-700 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Lampau / Expired
                </button>
                <button
                  onClick={() => setFilterKeberangkatan('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    filterKeberangkatan === 'all' ? 'bg-white text-gray-800 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Semua
                </button>
              </div>
            </div>

            {/* Seats Filter select drop down */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Batas Sisa Seat:</span>
              <select
                value={filterMinSeats}
                onChange={(e) => setFilterMinSeats(Number(e.target.value))}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value={0}>Tampilkan Semua Seats</option>
                <option value={1}>Sisa &ge; 1 Seat</option>
                <option value={5}>Sisa &ge; 5 Seats</option>
                <option value={10}>Sisa &ge; 10 Seats (Default)</option>
                <option value={20}>Sisa &ge; 20 Seats</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat data maskapai...</div>
        ) : (
          <>
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Maskapai & Rute</th>
                    <th className="px-4 py-3 font-semibold text-center">Seats</th>
                    <th className="px-4 py-3 font-semibold">Harga Jual</th>
                    <th className="px-4 py-3 font-semibold">Harga Beli</th>
                    <th className="px-4 py-3 font-semibold">Margin</th>
                    <th className="px-4 py-3 font-semibold">Persen</th>
                    <th className="px-4 py-3 font-semibold">Program Days</th>
                    <th className="px-4 py-3 font-semibold">Tgl Berangkat</th>
                    <th className="px-4 py-3 font-semibold">Tgl Pulang</th>
                    <th className="px-4 py-3 font-semibold">Vendor</th>
                    <th className="px-4 py-3 font-semibold">Origin City</th>
                    <th className="px-4 py-3 font-semibold">Destination City</th>
                    <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`border-b border-gray-100 transition-colors ${
                        item.tanggalKeberangkatan < todayStr 
                          ? 'bg-rose-50/25 hover:bg-rose-50/40 opacity-70' 
                          : item.availableSeats <= 0
                            ? 'bg-gray-50/40 hover:bg-gray-50/60 opacity-80'
                            : 'hover:bg-gray-55/50'
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-950">{item.name}</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.tanggalKeberangkatan < todayStr && (
                              <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide uppercase">
                                Kedaluwarsa
                              </span>
                            )}
                            {item.availableSeats <= 0 && (
                              <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide uppercase">
                                Habis Seat
                              </span>
                            )}
                            {item.availableSeats > 0 && item.availableSeats < 10 && (
                              <span className="bg-yellow-105 text-yellow-800 border border-yellow-250 text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide uppercase">
                                Sisa Menipis
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            item.availableSeats === 0 ? 'bg-red-100 text-red-700' :
                            item.availableSeats <= 5 ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {item.availableSeats} / {item.totalSeats}
                          </span>
                          <div className="w-16 h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                            <div 
                              className={`h-full ${
                                item.availableSeats === 0 ? 'bg-red-500' :
                                item.availableSeats <= 5 ? 'bg-orange-500' :
                                'bg-blue-500'
                              }`}
                              style={{ width: `${(item.availableSeats / item.totalSeats) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-emerald-600 font-semibold">{formatCurrency(item.hargaJual)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(item.hargaBeli)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(item.margin)}</td>
                      <td className="px-4 py-3">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-medium">
                          {item.persen}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{item.programDays}</td>
                      <td className="px-4 py-3 text-gray-600">{item.tanggalKeberangkatan}</td>
                      <td className="px-4 py-3 text-gray-600">{item.tanggalKepulangan}</td>
                      <td className="px-4 py-3 text-gray-600">{item.namaVendor}</td>
                      <td className="px-4 py-3 text-gray-600">{item.originCityName}</td>
                      <td className="px-4 py-3 text-gray-600">{item.destinationCityName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded" onClick={() => handleOpenForm(item)}>
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-red-600 hover:bg-red-50 rounded" onClick={async () => {
                            const confirmed = window.confirm ? window.confirm('Yakin ingin menghapus data ini?') : true;
                            if(confirmed) {
                              try {
                                await deleteDoc(doc(db, 'maskapai', item.id));
                              } catch (err) {
                                handleFirestoreError(err, OperationType.DELETE, `maskapai/${item.id}`);
                              }
                            }
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada data maskapai yang ditemukan.
                </div>
              )}
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="xl:hidden divide-y divide-gray-100">
              {filteredData.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-4 transition-colors ${
                    item.tanggalKeberangkatan < todayStr 
                      ? 'bg-rose-50/15 border-l-4 border-rose-500 opacity-75 animate-pulse-slow' 
                      : item.availableSeats <= 0
                        ? 'bg-gray-50/40 border-l-4 border-gray-400 opacity-80'
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-950 text-base">{item.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.tanggalKeberangkatan < todayStr && (
                          <span className="bg-rose-150 text-rose-800 border border-rose-200 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                            Kedaluwarsa
                          </span>
                        )}
                        {item.availableSeats <= 0 && (
                          <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                            Habis Seat
                          </span>
                        )}
                        {item.availableSeats > 0 && item.availableSeats < 10 && (
                          <span className="bg-yellow-105 text-yellow-800 border border-yellow-250 text-[9px] font-black px-1.5 py-0.5 rounded uppercase font-bold">
                            Sisa Menipis
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-2.5">
                        <span className="font-medium text-emerald-600">{item.originCityName}</span>
                        <span>→</span>
                        <span className="font-medium text-emerald-600">{item.destinationCityName}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        item.availableSeats === 0 ? 'bg-red-100 text-red-700' :
                        item.availableSeats <= 5 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {item.availableSeats} / {item.totalSeats} Seats
                      </span>
                      <div className="text-emerald-600 font-bold mt-1">
                        {formatCurrency(item.hargaJual)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-4">
                    <div>
                      <div className="text-gray-500 text-xs uppercase font-semibold">Tgl Berangkat</div>
                      <div className="text-gray-900">{item.tanggalKeberangkatan}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs uppercase font-semibold">Tgl Pulang</div>
                      <div className="text-gray-900">{item.tanggalKepulangan}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs uppercase font-semibold">Vendor</div>
                      <div className="text-gray-900">{item.namaVendor}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs uppercase font-semibold">Program</div>
                      <div className="text-gray-900">{item.programDays} Days</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs uppercase font-semibold">Harga Beli</div>
                      <div className="text-gray-700">{formatCurrency(item.hargaBeli)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs uppercase font-semibold">Margin</div>
                      <div className="text-emerald-700 font-medium">{formatCurrency(item.margin)} ({item.persen}%)</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-50">
                    <button className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" onClick={() => handleOpenForm(item)}>
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button className="flex items-center gap-1 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" onClick={async () => {
                      const confirmed = window.confirm ? window.confirm('Yakin ingin menghapus data ini?') : true;
                      if(confirmed) {
                        try {
                          await deleteDoc(doc(db, 'maskapai', item.id));
                        } catch (err) {
                          handleFirestoreError(err, OperationType.DELETE, `maskapai/${item.id}`);
                        }
                      }
                    }}>
                      <Trash2 className="w-4 h-4" />
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
              {filteredData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada data maskapai yang ditemukan.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 mt-10 mb-10">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Maskapai' : 'Tambah Maskapai Baru'}
              </h3>
              <button 
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Maskapai</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold uppercase"
                    placeholder="SAUDIA AIRLINES"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Vendor / Travel</label>
                  <input 
                    type="text" 
                    required
                    value={formData.namaVendor}
                    onChange={(e) => setFormData({...formData, namaVendor: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="PT MADINAH IMAN WISATA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Rute / Label</label>
                  <input 
                    type="text" 
                    required
                    value={formData.ruteLabel}
                    onChange={(e) => setFormData({...formData, ruteLabel: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="CGK - JED / MED - CGK"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kota Keberangkatan</label>
                  <input 
                    type="text" 
                    required
                    value={formData.originCityName}
                    onChange={(e) => setFormData({...formData, originCityName: e.target.value.toUpperCase()})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                    placeholder="JAKARTA (CGK)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kota Tujuan</label>
                  <input 
                    type="text" 
                    required
                    value={formData.destinationCityName}
                    onChange={(e) => setFormData({...formData, destinationCityName: e.target.value.toUpperCase()})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                    placeholder="JEDDAH (JED)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Available Seats / Total Seats</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={formData.availableSeats}
                    onChange={(e) => setFormData({...formData, availableSeats: parseInt(e.target.value) || 0, totalSeats: Math.max(parseInt(e.target.value) || 0, formData.totalSeats || 45)})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tgl Keberangkatan</label>
                  <input 
                    type="date" 
                    required
                    value={formData.tanggalKeberangkatan}
                    onChange={(e) => setFormData({...formData, tanggalKeberangkatan: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tgl Kepulangan</label>
                  <input 
                    type="date" 
                    required
                    value={formData.tanggalKepulangan}
                    onChange={(e) => setFormData({...formData, tanggalKepulangan: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Program Hari (Auto dari Tgl)</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={formData.tanggalKeberangkatan && formData.tanggalKepulangan ? Math.round((new Date(formData.tanggalKepulangan).getTime() - new Date(formData.tanggalKeberangkatan).getTime()) / (1000 * 3600 * 24)) + 1 : 9}
                    onChange={(e) => setFormData({...formData, programDays: parseInt(e.target.value) || 9})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Beli (Modal/Setoran)</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={formData.hargaBeli || formData.hargaSetoran}
                    onChange={(e) => {
                      const beli = parseFloat(e.target.value) || 0;
                      const jual = formData.hargaJual || 0;
                      const margin = jual - beli;
                      const persen = beli > 0 ? Number(((margin / beli) * 100).toFixed(1)) : 0;
                      setFormData({...formData, hargaBeli: beli, hargaSetoran: beli, margin, persen});
                    }}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Jual</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={formData.hargaJual}
                    onChange={(e) => {
                      const jual = parseFloat(e.target.value) || 0;
                      const beli = formData.hargaBeli || formData.hargaSetoran || 0;
                      const margin = jual - beli;
                      const persen = beli > 0 ? Number(((margin / beli) * 100).toFixed(1)) : 0;
                      setFormData({...formData, hargaJual: jual, margin, persen});
                    }}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Preview Margin</label>
                  <div className="w-full p-2.5 border border-gray-200 bg-gray-50 rounded-xl outline-none font-medium text-gray-500">
                    Rp {(formData.margin || 0).toLocaleString('id-ID')} ({formData.persen || 0}%)
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-4 font-medium border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={handleCloseForm}
                  className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
