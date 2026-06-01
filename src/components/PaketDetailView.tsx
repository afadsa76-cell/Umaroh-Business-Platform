import React from 'react';
import { 
  ArrowLeft, Edit2, Trash2, Calendar, Clock, Plane, 
  TrendingUp, DollarSign, Hotel, 
  Sparkles, FileText, Loader2, CheckCircle2, X, Star, MapPin, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PaketMaster, Hotel as HotelType, Maskapai } from '../types';
import { generateMarketingCopy } from '../services/aiService';
import { db, collection, onSnapshot, query, where, doc } from '../firebase';
import { JamaahTracker } from './tracker/types';
import { hotels as staticHotels } from '../data/hotels';

interface PaketDetailViewProps {
  paket: PaketMaster;
  hotels?: HotelType[];
  maskapai?: Maskapai[];
  isMitraContext?: boolean;
  onBack: () => void;
  onEdit?: (paket: PaketMaster) => void;
  onDelete?: (id: string) => void;
  onBook?: (paket: PaketMaster) => void;
  onViewMitra?: (mitraId: string) => void;
}

interface HotelMetaItem {
  id: string;
  hotelId: string;
  hotelName: string;
  city: string;
  photoUrl: string;
  distance: string;
}

export const PaketDetailView: React.FC<PaketDetailViewProps> = ({ 
  paket, 
  hotels,
  maskapai,
  isMitraContext = true,
  onBack, 
  onEdit, 
  onDelete,
  onBook,
  onViewMitra
}) => {
  const [aiLoading, setAiLoading] = React.useState(false);
  const [marketingCopy, setMarketingCopy] = React.useState(paket.deskripsi || "Paket umroh reguler dengan fasilitas hotel bintang 5 di Makkah and Madinah. Jarak sangat dekat dengan Masjidil Haram.");
  const [isBlasting, setIsBlasting] = React.useState(false);
  const [isUsingMarketplace, setIsUsingMarketplace] = React.useState(false);
  const [showManifest, setShowManifest] = React.useState(false);
  const [jamaahs, setJamaahs] = React.useState<JamaahTracker[]>([]);
  const [notification, setNotification] = React.useState<{type: 'success' | 'error', message: string} | null>(null);
  const [hotelMetas, setHotelMetas] = React.useState<HotelMetaItem[]>([]);
  const [mitraDetails, setMitraDetails] = React.useState<{ brandName: string; name: string } | null>(null);

  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);
  const isExpired = React.useMemo(() => {
    return paket.status === 'archived' || (paket.tglBerangkat && paket.tglBerangkat < todayStr);
  }, [paket.status, paket.tglBerangkat, todayStr]);

  React.useEffect(() => {
    // Fetch jamaah for this package to show real stats
    const q = query(collection(db, 'tracker_jamaah'), where('paketId', '==', paket.id));
    const unsub = onSnapshot(q, (snapshot) => {
      setJamaahs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as JamaahTracker));
    });
    return () => unsub();
  }, [paket.id]);

  React.useEffect(() => {
    const unsubMetas = onSnapshot(collection(db, 'hotel_metadata'), (snapshot) => {
      setHotelMetas(snapshot.docs.map(doc => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          hotelId: data.hotelId || '',
          hotelName: data.hotelName || '',
          city: data.city || '',
          photoUrl: data.photoUrl || '',
          distance: data.distance || ''
        };
      }));
    });

    let unsubMitra = () => {};
    if (paket.mitraId) {
      unsubMitra = onSnapshot(doc(db, 'users', paket.mitraId), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setMitraDetails({
            brandName: data.brandName || data.namaLengkap || data.nama || 'Umaroh',
            name: data.namaLengkap || data.nama || 'Umaroh'
          });
        }
      });
    } else {
      setMitraDetails({
        brandName: 'Umaroh Pusat',
        name: 'Umaroh Pusat'
      });
    }

    return () => {
      unsubMetas();
      unsubMitra();
    };
  }, [paket.mitraId]);

  const showMsg = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRegenerateAI = async () => {
    setAiLoading(true);
    try {
      const hotelMakkah = hotels?.find(h => h.id === paket.hotelMakkahId);
      const hotelMadinah = hotels?.find(h => h.id === paket.hotelMadinahId);
      const maskapaiData = maskapai?.find(m => m.id === paket.maskapaiId);

      const copy = await generateMarketingCopy({
        ...paket,
        hotelMakkahNama: hotelMakkah?.name || (hotelMakkah as unknown as Record<string, unknown>)?.nama as string || 'Hotel Makkah',
        hotelMadinahNama: hotelMadinah?.name || (hotelMadinah as unknown as Record<string, unknown>)?.nama as string || 'Hotel Madinah',
        hotelMakkahStars: hotelMakkah?.bintang || hotelMakkah?.stars || 5,
        hotelMadinahStars: hotelMadinah?.bintang || hotelMadinah?.stars || 5,
        maskapaiNama: maskapaiData?.name || 'Saudi Airlines',
        priceDouble: paket.hargaJualDouble || 0,
        priceTriple: paket.hargaJualTriple || 0,
        priceQuad: paket.hargaJualQuad || 0
      });
      setMarketingCopy(copy);
      showMsg('success', 'Marketing copy berhasil diperbarui!');
    } catch (error) {
      console.error(error);
      showMsg('error', 'Gagal menghasilkan copy AI');
    } finally {
      setAiLoading(false);
    }
  };

  const handleBlastJaringan = () => {
    setIsBlasting(true);
    setTimeout(() => {
      setIsBlasting(false);
      showMsg('success', 'Paket berhasil diblast ke 128 agen!');
    }, 2000);
  };

  const handleGunakanMarketplace = () => {
    setIsUsingMarketplace(true);
    setTimeout(() => {
      setIsUsingMarketplace(false);
      showMsg('success', 'Paket telah didaftarkan di Marketplace!');
    }, 1500);
  };
  const formatCurrency = (amount: number | undefined) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Math.round(amount || 0));
  };

  // Helper to get labels from ID
  const getMaskapaiLabel = (id: string) => {
    const m = maskapai?.find(item => item.id === id);
    return m ? m.name : 'Maskapai';
  };

  const getHotelObject = (id: string) => {
    if (!id) return undefined;
    const found = hotels?.find(item => item.id === id);
    if (found) return found;
    return (staticHotels as unknown as HotelType[])?.find(item => item.id === id);
  };

  const getHotelLabel = (id: string) => {
    const h = getHotelObject(id);
    return h ? (h.name || (h as unknown as Record<string, unknown>).nama as string || 'Hotel Bintang 5') : 'Hotel Bintang 5';
  };

  const getHotelPhoto = (id: string) => {
    const h = getHotelObject(id);
    return h?.photo || (h as unknown as Record<string, unknown>)?.photoUrl as string || (h as unknown as Record<string, unknown>)?.foto as string || "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=150&auto=format&fit=crop";
  };

  // Stats
  const Stats = {
    terdaftar: jamaahs.length,
    kuota: paket.kuota || paket.targetJamaah || 45,
    sisa: Math.max(0, (paket.kuota || paket.targetJamaah || 45) - jamaahs.length),
    okupansi: Math.round((jamaahs.length / (paket.kuota || paket.targetJamaah || 45)) * 100) || 0
  };

  // Financial calculations
  const hppDasar = paket.hargaDasar || 24225000;
  const markup = paket.markup || 1000000;
  const ujrohTravel = paket.marginBersih || Math.round(markup * 0.7); 
  const ujrohPartnerVal = paket.ujrohPartner || Math.round(markup * 0.3);
  const estimasiProfit = (paket.marginBersih || markup) * (paket.kuota || paket.targetJamaah || 45);

  const itinerary = [
    { day: 1, activity: 'KEBERANGKATAN ' + (paket.kotaKeberangkatan || 'CGK') },
    { day: 2, activity: 'TIBA DI ' + (paket.urutanKunjungan === 'Madinah' ? 'MADINAH' : 'MAKKAH') },
    { day: 5, activity: 'MENUJU ' + (paket.urutanKunjungan === 'Madinah' ? 'MAKKAH' : 'MADINAH') },
    { day: paket.durasiHari || 9, activity: 'KEPULANGAN' }
  ];

  const hotelMakkahObj = getHotelObject(paket.hotelMakkahId);
  const makkahMetaObj = hotelMetas?.find(m => m.hotelId === paket.hotelMakkahId || m.hotelName === (hotelMakkahObj?.name || (hotelMakkahObj as unknown as Record<string, unknown>)?.nama as string));
  const makkahDistanceStr = makkahMetaObj?.distance || 'Sangat dekat dengan pelataran';
  const makkahStarsNum = hotelMakkahObj?.stars || hotelMakkahObj?.bintang || 5;

  const hotelMadinahObj = getHotelObject(paket.hotelMadinahId);
  const madinahMetaObj = hotelMetas?.find(m => m.hotelId === paket.hotelMadinahId || m.hotelName === (hotelMadinahObj?.name || (hotelMadinahObj as unknown as Record<string, unknown>)?.nama as string));
  const madinahDistanceStr = madinahMetaObj?.distance || 'Sangat dekat dengan pelataran';
  const madinahStarsNum = hotelMadinahObj?.stars || hotelMadinahObj?.bintang || 5;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Detail Header */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-all active:scale-90"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest leading-none">DETAIL PRODUK</h2>
            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">ID: {paket.id.substring(0, 8)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-black text-[10px] tracking-widest uppercase ${
                notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}
            >
              {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
              {notification.message}
            </motion.div>
          )}
          {isMitraContext && onEdit && (
            <button 
              onClick={() => onEdit(paket)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 hover:text-indigo-600 transition-all"
            >
              <Edit2 className="w-3 h-3" />
              EDIT
            </button>
          )}
          {isMitraContext && onDelete && (
            <button 
              onClick={() => onDelete(paket.id)}
              className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-all active:scale-90 shadow-sm shadow-rose-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (Left) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Card */}
          <div className="bg-white rounded-[40px] overflow-hidden shadow-sm border border-gray-100 relative group">
              <div className="h-96 relative">
                <img 
                  src={paket.photoUtama || "https://images.unsplash.com/photo-1565552643983-61629090f4fa?q=80&w=1200&auto=format&fit=crop"} 
                  alt="Product" 
                  className="w-full h-full object-cover" 
                />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100" />
              
              <div className="absolute top-4 left-8 flex gap-2">
                <span className="bg-white/90 backdrop-blur-md text-indigo-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">UMRAH</span>
                <span className="bg-emerald-500/90 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">AKTIF</span>
              </div>

              {paket.mitraId && onViewMitra && (
                <button 
                  onClick={() => onViewMitra(paket.mitraId!)}
                  className="absolute top-4 right-8 bg-white/90 backdrop-blur-md text-[#047857] hover:text-emerald-700 font-extrabold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-md cursor-pointer border border-emerald-50/50 z-20"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {mitraDetails?.brandName || 'Mitra Travel'}
                </button>
              )}
              
              <h1 className="absolute bottom-16 left-8 right-8 text-white text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-tight drop-shadow-2xl">
                {paket.nama}
              </h1>

              {/* Quick Details Bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-white p-6 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">HARGA JUAL</p>
                    <p className="text-[10px] font-black text-emerald-600 italic leading-none">
                      {formatCurrency(paket.hargaJualQuad || paket.hargaDasar || paket.hargaEkonomi)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">KEBERANGKATAN</p>
                    <p className="text-[10px] font-black text-indigo-700 italic leading-none">{paket.tglBerangkat || '2026-05-15'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">DURASI</p>
                    <p className="text-[10px] font-black text-amber-600 italic leading-none">{paket.durasiHari || 9} HARI</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                    <Plane className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">MASKAPAI</p>
                    <p className="text-[10px] font-black text-gray-900 italic leading-none">{getMaskapaiLabel(paket.maskapaiId)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Akomodasi Hotel Card */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-5">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Hotel className="w-4 h-4 text-[#047857]" />
                AKOMODASI HOTEL
              </h3>
              
              <div className="space-y-4">
                {/* Makkah Hotel */}
                <div className="flex items-start gap-3.5 p-3.5 bg-gray-50 rounded-2xl group hover:bg-slate-100/70 transition-colors">
                  <div className="w-16 h-16 rounded-xl border-4 border-white overflow-hidden shadow-md shrink-0">
                    <img 
                      src={makkahMetaObj?.photoUrl || getHotelPhoto(paket.hotelMakkahId)} 
                      alt="Hotel Makkah" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest truncate">HOTEL MEKKAH</p>
                      <span className="text-[8px] font-extrabold uppercase bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded shrink-0">
                        {paket.durasiMakkah || 5} Malam / {(Number(paket.durasiMakkah) || 5) + 1} Hari
                      </span>
                    </div>
                    <p className="text-[11px] font-black text-gray-900 leading-tight">{getHotelLabel(paket.hotelMakkahId)}</p>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: Number(makkahStarsNum) || 5 }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-yellow-450 fill-yellow-400" />
                      ))}
                      <span className="text-[9px] font-bold text-gray-400 ml-1">Bintang {makkahStarsNum || 5}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 text-[10px] mt-0.5">
                      <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                      <span className="font-semibold text-gray-600 truncate">Jarak ke Pelataran: {makkahDistanceStr}</span>
                    </div>
                  </div>
                </div>

                {/* Madinah Hotel */}
                <div className="flex items-start gap-3.5 p-3.5 bg-gray-50 rounded-2xl group hover:bg-slate-100/70 transition-colors">
                  <div className="w-16 h-16 rounded-xl border-4 border-white overflow-hidden shadow-md shrink-0">
                    <img 
                      src={madinahMetaObj?.photoUrl || getHotelPhoto(paket.hotelMadinahId)} 
                      alt="Hotel Madinah" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest truncate">HOTEL MADINAH</p>
                      <span className="text-[8px] font-extrabold uppercase bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded shrink-0">
                        {paket.durasiMadinah || 3} Malam / {(Number(paket.durasiMadinah) || 3) + 1} Hari
                      </span>
                    </div>
                    <p className="text-[11px] font-black text-gray-900 leading-tight">{getHotelLabel(paket.hotelMadinahId)}</p>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: Number(madinahStarsNum) || 5 }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-yellow-450 fill-yellow-400" />
                      ))}
                      <span className="text-[9px] font-bold text-gray-400 ml-1">Bintang {madinahStarsNum || 5}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 text-[10px] mt-0.5">
                      <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                      <span className="font-semibold text-gray-600 truncate">Jarak ke Pelataran: {madinahDistanceStr}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Itinerary Ringkas Card */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-5">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                ITINERARY RINGKAS
              </h3>
              
              <div className="space-y-3 border-l-2 border-gray-100 ml-2 pl-4">
                {itinerary.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[1.35rem] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border-2 border-indigo-600" />
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-indigo-600 w-4">{item.day}</span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{item.activity}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline pt-2">
                LIHAT FULL ITINERARY
              </button>
            </div>
          </div>

          {/* AI Marketing Copy Card */}
          {isMitraContext && (
            <div className="bg-gray-900 p-8 rounded-[40px] border border-gray-800 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[80px] rounded-full -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/10 blur-[80px] rounded-full -ml-20 -mb-20" />
              
              <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[12px] font-black text-white uppercase tracking-widest">AI MARKETING COPY</h3>
                    <p className="text-[8px] font-bold text-gray-500 uppercase">DIHASILKAN OLEH GEMINI AI</p>
                  </div>
                </div>
                <button 
                  onClick={handleRegenerateAI}
                  disabled={aiLoading}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-gray-400 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                >
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'REGENERATE'}
                </button>
              </div>

              <div className="relative bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 mb-8 max-h-48 overflow-y-auto">
                <p className="text-gray-300 font-medium italic text-xs leading-relaxed whitespace-pre-wrap">
                  {marketingCopy}
                </p>
              </div>

              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(marketingCopy);
                    showMsg('success', 'Deskripsi disalin!');
                  }}
                  className="w-full bg-indigo-600 text-white hover:bg-indigo-700 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  SALIN DESKRIPSI
                </button>
                <button 
                  onClick={handleGunakanMarketplace}
                  disabled={isUsingMarketplace}
                  className="w-full bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 disabled:opacity-50"
                >
                  {isUsingMarketplace ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'GUNAKAN DI MARKETPLACE'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info (Right) */}
        <div className="space-y-6">
          {/* Mitra Penyelenggara Card */}
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none">MITRA PENYELENGGARA</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 text-[#047857] flex items-center justify-center font-black text-lg shadow-inner border border-gray-150 shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-gray-900 uppercase tracking-tight truncate">
                  {mitraDetails?.brandName || 'Umaroh Pusat'}
                </p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mt-0.5">
                  PPIU Berizin Resmi
                </p>
              </div>
            </div>
            {paket.mitraId && onViewMitra && (
              <button
                onClick={() => onViewMitra(paket.mitraId!)}
                className="w-full py-2.5 bg-slate-50 hover:bg-[#047857]/5 hover:text-[#047857] text-gray-650 font-extrabold text-[10px] tracking-widest uppercase rounded-xl border border-gray-200 transition-all active:scale-95 text-center cursor-pointer"
              >
                Kunjungi Profil Travel ➔
              </button>
            )}
          </div>

          {/* Statistik Pendaftaran Card */}
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-8">
            <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">STATISTIK PENDAFTARAN</h3>
            
            <div className="grid grid-cols-3 gap-4 pb-8 border-b border-gray-50">
              <div className="text-center">
                <p className="text-2xl font-black text-indigo-700 italic leading-none">{Stats.terdaftar}</p>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-2">TERDAFTAR</p>
              </div>
              <div className="text-center border-x border-gray-50">
                <p className="text-2xl font-black text-gray-900 italic leading-none">{Stats.kuota}</p>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-2">KUOTA</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-emerald-600 italic leading-none">{Stats.sisa}</p>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-2">SISA</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">OKUPANSI</span>
                <span className="text-[10px] font-black text-indigo-700">{Stats.okupansi}%</span>
              </div>
              <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                <div 
                  className="h-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)] transition-all duration-1000" 
                  style={{ width: `${Stats.okupansi}%` }}
                />
              </div>
            </div>

            {isExpired && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center text-xs font-black uppercase text-rose-700 tracking-tight mb-2">
                ⚠️ {paket.status === 'archived' ? 'Paket Ini Telah Diarsipkan' : 'Pendaftaran Ditutup (Batas Tanggal Lewat)'}
              </div>
            )}

            <button 
              disabled={isExpired && !isMitraContext}
              onClick={() => isMitraContext ? setShowManifest(true) : (onBook ? onBook(paket) : showMsg('success', 'Silakan hubungi agen terdekat untuk pemesanan.'))}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl active:scale-95 ${
                isExpired && !isMitraContext
                ? 'bg-gray-100 text-gray-400 border border-gray-200 shadow-none cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'
              }`}
            >
              {isMitraContext ? 'LIHAT MANIFEST JAMAAH' : (isExpired ? 'Pendaftaran Ditutup' : 'PESAN SEKARANG')}
            </button>
          </div>

          {isMitraContext && (
            <>
              {/* Ringkasan Finansial Card */}
              <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-8">
                <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">RINGKASAN FINANSIAL</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-400 font-bold uppercase tracking-tight">HPP DASAR</span>
                    <span className="text-gray-900 font-black italic">{formatCurrency(hppDasar)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-indigo-600 font-bold uppercase tracking-tight">UJROH TRAVEL</span>
                    <span className="text-indigo-700 font-black italic">{formatCurrency(ujrohTravel)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] pb-4 border-b border-gray-50">
                    <span className="text-amber-500 font-bold uppercase tracking-tight">UJROH PARTNER / KOMISI</span>
                    <span className="text-amber-600 font-black italic">{formatCurrency(ujrohPartnerVal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">ESTIMASI PROFIT</span>
                    <span className="text-base font-black text-emerald-600 italic tracking-tighter">
                      {formatCurrency(estimasiProfit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Promosikan Paket Card */}
              <div className="bg-indigo-600 p-8 rounded-[40px] border border-indigo-500 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-10 -mt-10" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -ml-10 -mb-10" />
                
                <div className="relative space-y-4 mb-6">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    PROMOSIKAN PAKET
                  </h3>
                  <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-tight leading-relaxed">
                    BAGIKAN KE JARINGAN 128 AGEN UMAROH UNTUK MEMPERCEPAT PENGISIAN KUOTA.
                  </p>
                </div>

                <button 
                  onClick={handleBlastJaringan}
                  disabled={isBlasting}
                  className="relative w-full bg-white text-indigo-600 hover:bg-gray-50 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-white/20 active:scale-95 disabled:opacity-50"
                >
                  {isBlasting ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'BLAST KE JARINGAN'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Manifest Modal */}
      <AnimatePresence>
        {showManifest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManifest(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-5xl h-[80vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">MANIFEST JAMAAH</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mt-1">{paket.nama}</p>
                </div>
                <button 
                  onClick={() => setShowManifest(false)}
                  className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-8">
                {jamaahs.length > 0 ? (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">NAMA JAMAAH</th>
                        <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">NO. PASPOR</th>
                        <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">GENDER</th>
                        <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {jamaahs.map((j) => (
                        <tr key={j.id} className="group hover:bg-gray-50 transition-colors">
                          <td className="py-4 pr-4">
                            <p className="text-[11px] font-black text-gray-900 uppercase italic">{j.nama_paspor || j.namaLengkap || 'BELUM DIISI'}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">{j.nik || 'NO NIK'}</p>
                          </td>
                          <td className="py-4 pr-4 font-mono text-[10px] text-gray-500">{j.no_paspor || '-'}</td>
                          <td className="py-4 pr-4 text-[10px] font-bold text-gray-600 uppercase">{j.jenisKelamin || '-'}</td>
                          <td className="py-4">
                            <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                              j.status_kesiapan === 'READY' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                            }`}>
                              {j.status_kesiapan || 'PENDING'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-20 h-20 rounded-[30px] bg-gray-50 flex items-center justify-center text-gray-200">
                      <FileText className="w-10 h-10" />
                    </div>
                    <div>
                      <p className="text-[12px] font-black text-gray-900 uppercase tracking-widest">BELUM ADA JAMAAH</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mt-1">Belum ada jamaah yang terdaftar di paket ini.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
