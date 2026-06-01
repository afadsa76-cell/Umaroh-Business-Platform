import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Clock, Plane, Users, Download, ArrowUpRight, Megaphone, Target, Zap, CheckCircle2, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { db, collection, query, where, onSnapshot, handleFirestoreError, OperationType } from '../firebase';
import { WizardFormData, Hotel as HotelType } from '../types';
import { hotels as staticHotels } from '../data/hotels';

interface CollaborationPackage extends WizardFormData {
  id: string;
  agencyName?: string;
  timeAgo?: string;
}

export const FeedKolaborasiView = ({ onNavigateToCatalog }: { onNavigateToCatalog: () => void }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [packages, setPackages] = useState<CollaborationPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [agencies, setAgencies] = useState<Record<string, string>>({});
  const [hotels, setHotels] = useState<HotelType[]>([]);
  
  const [selectedPackage, setSelectedPackage] = useState<CollaborationPackage | null>(null);
  const [isAgreed, setIsAgreed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Fetch all hotels
    const unsubHotels = onSnapshot(collection(db, 'master_hotels'), (snapshot) => {
      setHotels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as HotelType));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'master_hotels');
    });

    // Fetch all users with role 'mitra' to map brand names
    const qUsers = query(collection(db, 'users'), where('role', '==', 'mitra'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const agencyMap: Record<string, string> = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        agencyMap[doc.id] = data.brandName || data.nama || 'MITRA UMAROH';
      });
      setAgencies(agencyMap);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    // Fetch validated packages with "JUAL BERSAMA" type
    const qPackages = query(
      collection(db, 'paket_master'),
      where('tipePenjualan', '==', 'JUAL BERSAMA'),
      where('status', '==', 'published')
    );

    const unsubPackages = onSnapshot(qPackages, (snapshot) => {
      const pkgs = snapshot.docs.map(doc => {
        const data = doc.data() as WizardFormData;
        // Simple "time ago" logic
        const createdAt = data.createdAt ? (data.createdAt as { toDate?: () => Date }).toDate?.() || new Date(data.createdAt as string | number | Date) : new Date();
        const diffInHours = Math.floor((new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60));
        
        let timeAgoStr = 'BARU SAJA';
        if (diffInHours > 0 && diffInHours < 24) timeAgoStr = `${diffInHours} JAM YANG LALU`;
        else if (diffInHours >= 24) timeAgoStr = `${Math.floor(diffInHours/24)} HARI YANG LALU`;

        return {
          ...data,
          id: doc.id,
          timeAgo: timeAgoStr
        } as CollaborationPackage;
      });
      
      setPackages(pkgs);
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'paket_master');
      setIsLoading(false);
    });

    return () => {
      unsubHotels();
      unsubUsers();
      unsubPackages();
    };
  }, []);

  const getHotelObject = (id: string) => {
    if (!id) return undefined;
    const found = hotels?.find(item => item.id === id);
    if (found) return found;
    return (staticHotels as unknown as HotelType[])?.find(item => item.id === id);
  };

  const getHotelLabel = (id: string) => {
    const h = getHotelObject(id);
    if (!h) return 'Hotel Bintang 5';
    return h.name || (h as unknown as Record<string, unknown>).nama as string || 'Hotel Bintang 5';
  };

  const getHotelStars = (id: string) => {
    const h = getHotelObject(id);
    if (!h) return 5;
    return h.bintang || h.stars || 5;
  };

  const filteredPackages = packages.filter(pkg => 
    pkg.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agencies[pkg.mitraId || '']?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Zap className="w-12 h-12 text-indigo-200 mb-4 animate-bounce" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sinkronisasi Feed Jaringan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 italic uppercase tracking-tighter">
            FEED KOLABORASI
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Megaphone className="w-4 h-4 text-indigo-500" />
            <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
              PAKET TERBARU DARI JARINGAN YANG SIAP ANDA JUAL
            </p>
          </div>
        </div>
        
        <div className="bg-indigo-50 border border-indigo-100 rounded-full px-4 py-2 flex items-center gap-3 self-start md:self-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse-slow shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
          <span className="text-[10px] md:text-xs font-black text-indigo-700 uppercase tracking-[0.1em] whitespace-nowrap">
            {packages.length} PAKET TERSEDIA UNTUK DIJUAL
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-2">
        <div className="relative flex-grow group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="CARI PAKET KOLABORASI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-xl pl-11 pr-4 py-4 text-xs font-bold uppercase tracking-widest placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 shadow-sm transition-all"
          />
        </div>
        <button className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:bg-gray-50 transition-colors">
          <Filter className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        {filteredPackages.length > 0 ? filteredPackages.map((pkg) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col md:flex-row"
          >
            {/* Image Container */}
            <div className="relative w-full md:w-[350px] h-[250px] md:h-auto overflow-hidden shrink-0">
              <img 
                src={pkg.photoUtama || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=600&auto=format&fit=crop'} 
                alt={pkg.nama}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-4 left-4 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg shadow-lg">
                JUAL BERSAMA
              </div>
              {pkg.kuota && pkg.sisaKuota && pkg.sisaKuota < (pkg.kuota * 0.2) && (
                <div className="absolute bottom-4 left-4 bg-rose-500 text-white text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-current" /> HOT DEAL
                </div>
              )}
            </div>

            {/* Content Container */}
            <div className="flex-grow p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-[10px]">
                      {agencies[pkg.mitraId || '']?.charAt(0) || 'U'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                        {agencies[pkg.mitraId || ''] || 'MITRA UMAROH'}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        {pkg.timeAgo}
                      </span>
                    </div>
                  </div>
                  
                  {/* Profit Badge */}
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center min-w-[160px] md:self-start">
                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1 leading-none">
                      UJROH SHARING (PROFIT)
                    </p>
                    <p className="text-lg font-black text-emerald-700 tracking-tight">
                      Rp {(pkg.ujrohPartner || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                <h2 className="text-xl md:text-2xl font-black text-gray-900 italic uppercase tracking-tighter mb-4 decoration-amber-500/30 decoration-4 underline-offset-4 line-clamp-2">
                  {pkg.nama}
                </h2>

                {/* Hotel Accommodations */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-slate-50/50 p-4 rounded-2xl border border-gray-100/60">
                  {/* Makkah Hotel */}
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100/50">
                      <span className="text-xs font-black text-indigo-700">M</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Makkah Hotel</p>
                      <p className="text-xs font-extrabold text-gray-800 leading-tight truncate">{getHotelLabel(pkg.hotelMakkahId || '')}</p>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {Array.from({ length: getHotelStars(pkg.hotelMakkahId || '') }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Divider line for desktop */}
                  <div className="hidden sm:block w-px self-stretch bg-gray-200/50 my-1" />

                  {/* Madinah Hotel */}
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100/50">
                      <span className="text-xs font-black text-emerald-700">M</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">Madinah Hotel</p>
                      <p className="text-xs font-extrabold text-gray-800 leading-tight truncate">{getHotelLabel(pkg.hotelMadinahId || '')}</p>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {Array.from({ length: getHotelStars(pkg.hotelMadinahId || '') }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">BERANGKAT</p>
                      <p className="text-[10px] font-black text-gray-700">{pkg.tglBerangkat || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">DURASI</p>
                      <p className="text-[10px] font-black text-gray-700 uppercase">{pkg.durasiHari} HARI</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                      <Plane className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">KATEGORI</p>
                      <p className="text-[10px] font-black text-gray-700 uppercase">{pkg.kategori}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">SISA KUOTA</p>
                      <p className="text-[10px] font-black text-gray-700">{pkg.sisaKuota ?? pkg.kuota ?? '-'} PAX</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col gap-1 min-w-[120px]">
                      <div className="flex justify-between items-center text-[8px] border-b border-amber-200 pb-0.5">
                        <span className="text-amber-700 font-bold">QUAD</span>
                        <span className="text-gray-900 font-black italic">Rp {(pkg.hargaJualQuad || ((pkg.hargaEkonomi || 0) + (pkg.biayaHandling || 0))).toLocaleString('id-ID')}</span>
                      </div>
                      {(pkg.hargaJualTriple || (pkg.hargaEkonomi ? pkg.hargaEkonomi * 1.1 : 0)) > 0 && (
                        <div className="flex justify-between items-center text-[8px] border-b border-amber-200 pb-0.5">
                          <span className="text-amber-700 font-bold">TRIPLE</span>
                          <span className="text-gray-900 font-black italic">Rp {(pkg.hargaJualTriple || (pkg.hargaEkonomi ? pkg.hargaEkonomi * 1.1 : 0)).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      {(pkg.hargaJualDouble || (pkg.hargaEkonomi ? pkg.hargaEkonomi * 1.2 : 0)) > 0 && (
                        <div className="flex justify-between items-center text-[8px]">
                          <span className="text-amber-700 font-bold">DOUBLE</span>
                          <span className="text-gray-900 font-black italic">Rp {(pkg.hargaJualDouble || (pkg.hargaEkonomi ? pkg.hargaEkonomi * 1.2 : 0)).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => window.open(`https://wa.me/6281234567890?text=Halo, saya tertarik dengan paket kolaborasi: ${pkg.nama}`, '_blank')}
                  className="flex-1 bg-white border border-gray-200 hover:border-indigo-200 hover:bg-gray-50 text-gray-700 font-black text-xs uppercase tracking-widest px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-all group/btn"
                >
                  <Download className="w-4 h-4 group-hover/btn:-translate-y-0.5 transition-transform" /> 
                  MARKETING KIT
                </button>
                <button 
                  onClick={() => setSelectedPackage(pkg)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest px-6 py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ArrowUpRight className="w-4 h-4" /> 
                  AMBIL PAKET
                </button>
              </div>
            </div>
          </motion.div>
        )) : (
          <div className="bg-white rounded-[2rem] border-2 border-dashed border-gray-100 p-20 text-center">
            <Zap className="w-12 h-12 text-gray-100 mx-auto mb-4" />
            <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tight">Belum Ada Paket Kolaborasi</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
              Jadilah yang pertama untuk berbagi paket Anda ke jaringan Umaroh.
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedPackage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedPackage(null)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-8 pb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 italic uppercase tracking-tight">
                KONFIRMASI KOLABORASI
              </h2>
              <button onClick={() => setSelectedPackage(null)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors">
                <Filter className="w-4 h-4 rotate-90" />
              </button>
            </div>

            <div className="px-8 pb-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Package Summary Card */}
              <div className="bg-gray-50/80 rounded-3xl p-4 flex items-center gap-4 border border-gray-100">
                <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 shadow-sm">
                  <img src={selectedPackage.photoUtama || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=600&auto=format&fit=crop'} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">
                    {agencies[selectedPackage.mitraId || ''] || 'AL-BARAKAH TRAVEL'}
                  </p>
                  <h3 className="text-sm font-black text-gray-900 uppercase italic leading-tight mb-1">
                    {selectedPackage.nama}
                  </h3>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">QUAD</span>
                      <span className="text-emerald-600 font-black text-sm">
                        Rp {(selectedPackage.hargaJualQuad || ((selectedPackage.hargaEkonomi || 0) + (selectedPackage.biayaHandling || 0))).toLocaleString('id-ID')}
                      </span>
                    </div>
                    {(selectedPackage.hargaJualTriple || (selectedPackage.hargaEkonomi ? selectedPackage.hargaEkonomi * 1.1 : 0)) > 0 && (
                      <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">TRIPLE</span>
                        <span className="text-emerald-600 font-black text-sm">
                          Rp {(selectedPackage.hargaJualTriple || (selectedPackage.hargaEkonomi ? selectedPackage.hargaEkonomi * 1.1 : 0)).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                    {(selectedPackage.hargaJualDouble || (selectedPackage.hargaEkonomi ? selectedPackage.hargaEkonomi * 1.2 : 0)) > 0 && (
                      <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">DOUBLE</span>
                        <span className="text-emerald-600 font-black text-sm">
                          Rp {(selectedPackage.hargaJualDouble || (selectedPackage.hargaEkonomi ? selectedPackage.hargaEkonomi * 1.2 : 0)).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Profit Scheme */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">SKEMA BAGI HASIL (UJROH)</p>
                <div className="bg-[#0f172a] rounded-[2rem] p-8 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                  
                  <div className="flex justify-between items-center relative z-10 mb-6">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">UJROH ANDA (SELLER)</span>
                    <span className="text-2xl font-black text-emerald-400 tracking-tight">
                      Rp {(selectedPackage.ujrohPartner || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                  
                  <div className="h-px bg-white/10 mb-6 w-full" />
                  
                  <div className="flex justify-between items-center relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">ESTIMASI PENCAIRAN</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">H+7 Keberangkatan</span>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">SYARAT & KETENTUAN</p>
                <div className="space-y-3">
                  {[
                    'Saya setuju untuk menjual paket sesuai harga yang ditetapkan.',
                    'Saya bertanggung jawab atas pengumpulan dokumen jamaah.',
                    'Komisi akan dicairkan setelah status jamaah "Berangkat".',
                    'Pembatalan mengikuti kebijakan provider (owner) paket.'
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      </div>
                      <p className="text-[11px] font-bold text-gray-500 leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agreement Checkbox */}
              <label className="flex items-center gap-4 bg-indigo-50/50 rounded-2xl p-6 cursor-pointer group hover:bg-indigo-50 transition-all border border-indigo-100/50">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={isAgreed}
                    onChange={(e) => setIsAgreed(e.target.checked)}
                  />
                  <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${isAgreed ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white border-gray-300'}`}>
                    {isAgreed && <ArrowUpRight className="w-4 h-4 text-white rotate-45" />}
                  </div>
                </div>
                <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest select-none">
                  SAYA MEMAHAMI DAN MENYETUJUI KETENTUAN DI ATAS
                </span>
              </label>

              {/* Final Action Button */}
              <button 
                disabled={!isAgreed}
                onClick={async () => {
                  if (isAgreed) {
                    setShowSuccess(true);
                    // Wait for animation
                    setTimeout(() => {
                      onNavigateToCatalog();
                      setSelectedPackage(null);
                      setShowSuccess(false);
                      setIsAgreed(false);
                    }, 2000);
                  }
                }}
                className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 mb-2 shadow-xl ${
                  isAgreed 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] shadow-indigo-200' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                AMBIL & JUAL SEKARANG
              </button>
            </div>

            {/* Success Animation Overlay */}
            {showSuccess && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0.5, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 10 }}
                  className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-200"
                >
                  <CheckCircle2 className="w-12 h-12" />
                </motion.div>
                <h2 className="text-2xl font-black text-gray-900 italic uppercase tracking-tight mb-2">
                  BERHASIL DIAMBIL!
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] max-w-xs">
                  PAKET TELAH DITAMBAHKAN KE KATALOG ANDA. SILAKAN MULAI BERJUALAN SEKARANG!
                </p>
                <div className="mt-8 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="w-2 h-2 rounded-full bg-indigo-600"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}

      {/* Bottom Conversion Banner */}
      <div className="mt-12 bg-indigo-900 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px] -ml-24 -mb-24"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0 group-hover:scale-110 transition-transform duration-500">
            <Target className="w-10 h-10 md:w-12 md:h-12 text-white" />
          </div>
          
          <div className="text-center md:text-left flex-grow">
            <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tight mb-2">
              TINGKATKAN OMZET DENGAN KOLABORASI
            </h2>
            <p className="text-white/60 text-xs md:text-sm font-medium max-w-2xl leading-relaxed">
              Jual paket dari mitra terpercaya di jaringan Umaroh. Dapatkan kepastian komisi (ujroh) dan aset marketing siap pakai tanpa harus pusing mengurus logistik.
            </p>
          </div>
          
          <button className="bg-white text-indigo-900 px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-400 hover:text-black transition-all hover:scale-105 active:scale-95 shadow-2xl">
            PELAJARI CARANYA
          </button>
        </div>
      </div>
    </div>
  );
};
