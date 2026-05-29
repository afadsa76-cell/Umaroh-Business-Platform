import React, { useState, useEffect } from 'react';
import { db, auth, collection, query, where, onSnapshot } from '../firebase';
import { 
  TrendingUp, BarChart2, ShieldAlert, Sparkles, CheckCircle2, 
  HelpCircle, RefreshCw, Layers, DollarSign, Users, AlertTriangle, 
  Lightbulb, Briefcase, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Booking {
  id: string;
  namaJamaah: string;
  paketNama: string;
  statusPembayaran: string;
  statusKeberangkatan: string;
  totalHarga: number;
  jumlahBayar: number;
  docPassport: boolean;
  docKtp: boolean;
  docVaccine: boolean;
  docFoto: boolean;
}

interface Package {
  id: string;
  nama: string;
  isActive: boolean;
}

interface AnalyticsResult {
  marketInsights: string[];
  fraudAlerts: { level: 'high' | 'warning' | 'info'; message: string }[];
  recommendations: string[];
  forecasting: string;
}

export const AISmartAnalyticsView: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packagesCount, setPackagesCount] = useState(0);
  const [rawPackagesList, setRawPackagesList] = useState<Package[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isEngineAnalyzing, setIsEngineAnalyzing] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const userId = auth.currentUser?.uid;

  // Real-time bookings loader
  useEffect(() => {
    if (!userId) return;

    const bookingQuery = query(collection(db, 'bookings'), where('mitraId', '==', userId));
    const unsubscribeBookings = onSnapshot(bookingQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const item = doc.data();
        return {
          id: doc.id,
          namaJamaah: item.namaJamaah || item.nama || 'Jamaah Baru',
          paketNama: item.paketNama || item.paketLabel || 'Paket Pilihan',
          statusPembayaran: item.statusPembayaran || 'pending',
          statusKeberangkatan: item.statusKeberangkatan || 'menunggu',
          totalHarga: Number(item.totalHarga) || 0,
          jumlahBayar: Number(item.jumlahBayar || item.total_bayar || 0) || 0,
          docPassport: !!item.docPassport,
          docKtp: !!item.docKtp,
          docVaccine: !!item.docVaccine,
          docFoto: !!item.docFoto,
        };
      });
      setBookings(data);
      setIsLoading(false);
    }, (err) => {
      console.error("Error loading bookings for smart analytics:", err);
      setIsLoading(false);
    });

    return () => unsubscribeBookings();
  }, [userId]);

  // Real-time packages loader
  useEffect(() => {
    if (!userId) return;

    const qMitra = query(collection(db, 'paket_mitra'), where('mitraId', '==', userId));
    const unsubscribeMitra = onSnapshot(qMitra, (mitraSnap) => {
      const dbPkgs = mitraSnap.docs.map(d => ({
        id: d.id,
        nama: d.data().namaPaketMitra || d.data().nama || 'Paket',
        isActive: d.data().status !== 'draft'
      }));
      setRawPackagesList(dbPkgs);
      setPackagesCount(dbPkgs.length);
    }, (err) => {
      console.error("Error loading packages count:", err);
    });

    return () => unsubscribeMitra();
  }, [userId]);

  // Execute engine analysis automatically when bookings load for the first time
  useEffect(() => {
    if (bookings.length > 0 && !analytics && !isEngineAnalyzing) {
      triggerEngineAnalysis();
    }
  }, [bookings]);

  const triggerEngineAnalysis = async () => {
    setIsEngineAnalyzing(true);
    setErrorMsg('');

    try {
      // Package booking data summary to reduce token payloads
      const sanitizedBookings = bookings.map(b => ({
        nama: b.namaJamaah,
        paket: b.paketNama,
        total: b.totalHarga,
        terbayar: b.jumlahBayar,
        sisaSebab: b.totalHarga - b.jumlahBayar,
        pembayaran: b.statusPembayaran,
        keberangkatan: b.statusKeberangkatan,
        pasporReady: b.docPassport,
        ktpReady: b.docKtp,
        vaksinReady: b.docVaccine,
        fotoReady: b.docFoto,
      })).slice(0, 30); // limit to protect tokens

      const sanitizedPackages = rawPackagesList.map(p => ({
        nama: p.nama,
        status: p.isActive ? 'Active' : 'Draft'
      }));

      const res = await fetch('/api/ai/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingsData: sanitizedBookings,
          packagesData: sanitizedPackages
        })
      });

      if (!res.ok) {
        throw new Error('Gagal menghubungi motor analitik AI server.');
      }

      const body = await res.json();
      setAnalytics(body);
    } catch (err) {
      const error = err as Error;
      console.error(error);
      setErrorMsg(error.message || 'Komponen analitik mengalami gangguan.');
    } finally {
      setIsEngineAnalyzing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Basic math calculations
  const totalJamaah = bookings.length;
  const rawRevenue = bookings.reduce((sum, b) => sum + b.totalHarga, 0);
  const realizedRevenue = bookings.reduce((sum, b) => sum + b.jumlahBayar, 0);
  const totalReceivables = rawRevenue - realizedRevenue;
  
  // Document compliance checker
  const incompleteDocsCount = bookings.filter(b => !b.docPassport || !b.docKtp || !b.docVaccine || !b.docFoto).length;

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center gap-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-800">Menghubungkan Basis Data ERP...</p>
        <p className="text-[10px] text-gray-500 font-bold max-w-xs">Mengkoneksikan sensor audit dengan Cloud Firestore untuk sinkronisasi manifest perjalanan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Banner Component */}
      <div className="bg-[#0f172a] rounded-3xl p-6 text-white md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 shrink-0">
            <BarChart2 className="w-8 h-8 text-emerald-300" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tight">
                SMART ENGINE ANALYTICS
              </h2>
              <span className="bg-emerald-500/20 text-emerald-300 font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-full border border-emerald-500/30">AI AUDITED</span>
            </div>
            <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-[0.2em]">
              Melacak integritas dokumen, visualisasi piutang, dan anomali mitigasi risiko.
            </p>
          </div>
        </div>
        
        <button 
          onClick={triggerEngineAnalysis}
          disabled={isEngineAnalyzing || bookings.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 text-white font-extrabold text-xs uppercase tracking-widest px-6 py-4 rounded-2xl transition shadow-lg shrink-0 flex items-center gap-2 active:scale-95 cursor-pointer z-10"
        >
          {isEngineAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Menganalisis...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" /> Audit Integritas Data
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-center gap-3 text-xs font-bold leading-normal">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance Card */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3 text-emerald-600">
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <Layers className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kepatuhan Berkas</p>
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">
            {totalJamaah > 0 ? Math.round(((totalJamaah - incompleteDocsCount) / totalJamaah) * 100) : 100}%
          </h3>
          <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-wide">
            {incompleteDocsCount} Pax kekurangan dokumen fisik
          </p>
        </div>

        {/* Total Receivables */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3 text-amber-500">
            <div className="p-3 bg-amber-50 rounded-2xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-bold">Residu Piutang</p>
          </div>
          <h4 className="text-xl font-black text-amber-600 tracking-tight">
            {formatCurrency(totalReceivables)}
          </h4>
          <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">
            Rasio Pelunasan: {rawRevenue > 0 ? Math.round((realizedRevenue / rawRevenue) * 100) : 0}%
          </p>
        </div>

        {/* Active Packages */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3 text-indigo-500">
            <div className="p-3 bg-indigo-50 rounded-2xl">
              <Briefcase className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-bold font-bold">Produk Saya</p>
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">
            {packagesCount} <span className="text-xs font-bold text-gray-400">paket</span>
          </h3>
          <p className="text-[9px] font-bold text-emerald-500 mt-1 uppercase">
            Bahan promosi aktif
          </p>
        </div>

        {/* Total Bookings */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3 text-purple-600">
            <div className="p-3 bg-purple-50 rounded-2xl">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-bold">Jumlah Porter</p>
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">
            {totalJamaah} <span className="text-xs font-bold text-gray-400">Pax</span>
          </h3>
          <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">
            Binaan agen mitra terdaftar
          </p>
        </div>
      </div>

      {/* CORE REASONING GRID OUTPUT */}
      <AnimatePresence mode="wait">
        {isEngineAnalyzing ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white p-20 rounded-3xl border border-gray-100 shadow-sm text-center flex flex-col items-center justify-center gap-4"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-emerald-500 animate-spin" />
              <Sparkles className="w-6 h-6 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">
                Kecerdasan Buatan Sedang Melakukan Rekapitulasi...
              </h4>
              <p className="text-[11px] text-gray-500 max-w-sm mx-auto mt-1 font-bold leading-normal">
                Memproses database registrasi jamaah secara aman, melakukan cross-validation dokumen fisik, mencocokkan ambang batas piutang berjalan, dan merumuskan prediksi taktis 3 bulan ke depan.
              </p>
            </div>
          </motion.div>
        ) : analytics ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Risk Warnings & Document Anomalies */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3 text-rose-600">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h4 className="font-black uppercase tracking-wider text-xs text-gray-950">
                  Audit Risiko & Anomali Dokumen
                </h4>
              </div>

              <div className="space-y-3">
                {analytics.fraudAlerts.length === 0 ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-[11px] font-bold text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Luar Biasa! Tidak ada anomali piutang krusial atau kelalaian berkas pendaftaran terdeteksi pada database pipelining Anda saat ini.</span>
                  </div>
                ) : (
                  analytics.fraudAlerts.map((alert, i) => (
                    <div 
                      key={i} 
                      className={`p-4 rounded-2xl border flex items-start gap-3.5 text-xs font-bold leading-normal ${
                        alert.level === 'high' 
                          ? 'bg-rose-50/50 text-rose-800 border-rose-100' 
                          : alert.level === 'warning'
                          ? 'bg-amber-50/50 text-amber-800 border-amber-100'
                          : 'bg-blue-50/50 text-blue-800 border-blue-100'
                      }`}
                    >
                      <ShieldAlert className={`w-5 h-5 shrink-0 ${
                        alert.level === 'high' ? 'text-rose-500' : alert.level === 'warning' ? 'text-amber-500' : 'text-blue-500'
                      }`} />
                      <div className="space-y-0.5">
                        <span className="block text-[8px] uppercase font-black tracking-widest opacity-60">
                          Resiko: {alert.level.toUpperCase()}
                        </span>
                        <p className="font-semibold text-[11px]">{alert.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recommendations Advisors */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3 text-emerald-600">
                <Lightbulb className="w-5 h-5 text-emerald-500 animate-pulse" />
                <h4 className="font-black uppercase tracking-wider text-xs text-gray-950">
                  Rekomendasi Strategis & Taktis
                </h4>
              </div>

              <ul className="space-y-3.5 text-xs text-gray-700 leading-relaxed font-bold font-sans">
                {analytics.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-3 items-start bg-slate-50/40 p-3 rounded-xl border border-slate-100">
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-black shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-[11px] font-medium text-gray-650 pt-0.5">{rec}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Market Insights */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3 text-indigo-600">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                <h4 className="font-black uppercase tracking-wider text-xs text-gray-950">
                  Wawasan Pasar (Market Insights)
                </h4>
              </div>

              <ul className="space-y-3 text-xs text-gray-700 leading-relaxed font-bold font-sans">
                {analytics.marketInsights.map((ins, i) => (
                  <li key={i} className="flex gap-3 items-start bg-indigo-50/20 p-3.5 rounded-xl border border-indigo-50/60">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 mt-2 shrink-0" />
                    <p className="text-[11px] font-semibold text-gray-700 leading-snug">{ins}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Business Forecasting */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3 text-purple-600">
                <Calendar className="w-5 h-5 text-purple-500" />
                <h4 className="font-black uppercase tracking-wider text-xs text-gray-950">
                  Proyeksi & Forekasting Bisnis (3 Bulan)
                </h4>
              </div>

              <div className="bg-purple-50/30 p-5 rounded-2xl border border-purple-100 text-[11.5px] font-medium leading-relaxed text-gray-750 font-sans border-dashed select-all">
                {analytics.forecasting}
              </div>
            </div>

          </motion.div>
        ) : (
          <div className="bg-white p-20 rounded-3xl border border-gray-100 shadow-sm text-center flex flex-col items-center justify-center gap-2 text-gray-400">
            <HelpCircle className="w-12 h-12 text-gray-300 mb-2" />
            <p className="text-xs font-black uppercase tracking-widest text-gray-500">
              Analisis cerdas siap dijalankan
            </p>
            <p className="text-[10px] font-bold max-w-sm mx-auto leading-normal">
              Kami mendeteksi terdapat {bookings.length} data pendaftaran aktif berjalan. Tekan tombol <strong className="text-emerald-600 uppercase font-bold">Audit Integritas Data</strong> di atas untuk memantik evaluasi kualitatif instan.
            </p>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
