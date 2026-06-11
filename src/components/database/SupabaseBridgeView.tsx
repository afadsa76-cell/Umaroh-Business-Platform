import React, { useState } from 'react';
import { db, getDocs, collection } from '../../firebase';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { Database, CheckCircle, XCircle, Code, Copy, AlertTriangle, RefreshCw, Layers } from 'lucide-react';

export const SupabaseBridgeView: React.FC = () => {
  const [isConfigured] = useState(isSupabaseConfigured());
  const [copied, setCopied] = useState('');
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string>('');

  const sqlSchema = `-- SQL SCHEMA UNTUK SUPABASE SQL EDITOR
-- Salin dan jalankan script ini di menu SQL Editor Supabase Anda.

-- 1. Tabel Users
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    role TEXT,
    subRole TEXT,
    uplineId TEXT,
    balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Master Paket Wisata (PDF Latitude)
CREATE TABLE IF NOT EXISTS public.master_paket_wisata (
    id TEXT PRIMARY KEY,
    nama TEXT,
    deskripsi TEXT,
    durasiHari INT,
    lokasi TEXT,
    img TEXT,
    hargaStart NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Master Hotels
CREATE TABLE IF NOT EXISTS public.master_hotels (
    id TEXT PRIMARY KEY,
    name TEXT,
    rating INT,
    city TEXT,
    vendor TEXT,
    pricePerNightDouble NUMERIC,
    pricePerNightTriple NUMERIC,
    pricePerNightQuad NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Pendaftaran Mitra
CREATE TABLE IF NOT EXISTS public.pendaftaran_mitra (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    city TEXT,
    brandName TEXT,
    targetMonthlyPackets INT,
    uplineId TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Paket Master (Operasional)
CREATE TABLE IF NOT EXISTS public.paket_master (
    id TEXT PRIMARY KEY,
    nama TEXT,
    lokasi TEXT,
    durasiHari INT,
    tanggalKeberangkatan DATE,
    status TEXT,
    hargaStart NUMERIC,
    img TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel Bookings & Pelanggan
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    paketId TEXT,
    mitraId TEXT,
    customerName TEXT,
    customerPhone TEXT,
    totalPax INT,
    totalPrice NUMERIC,
    status TEXT,
    namaPaket TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabel Transaksi Keuangan
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    userId TEXT,
    recipientId TEXT,
    amount NUMERIC,
    type TEXT,
    referenceId TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  };

  const addLog = (msg: string) => {
    setMigrationLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const runMigration = async () => {
    const isReady = isSupabaseConfigured() && supabase;
    const isDemo = !isReady;

    if (isDemo) {
      if (!confirm('Kredensial Supabase asli belum terpasang di Environment Variables. Apakah Anda ingin menjalankan sinkronisasi dalam "Mode Simulasi (Demo)" untuk menguji pembacaan data Firestore asli Anda?')) {
        return;
      }
    } else {
      if (!confirm('Apakah Anda yakin ingin memulai migrasi asli dari Firestore ke Supabase?')) {
        return;
      }
    }

    setIsMigrating(true);
    setMigrationLogs([]);
    setMigrationStatus('Sedang Memproses...');
    addLog(isDemo ? 'PROSES INDIKASI [DEMO]: Memulai simulasi transfer dari Firestore...' : 'Memulai migrasi nyata dari Firestore ke Supabase...');

    const collectionsToMigrate = [
      { firestore: 'users', supabase: 'users', label: 'Data Pengguna & Admin/Mitra' },
      { firestore: 'master_paket_wisata', supabase: 'master_paket_wisata', label: 'Master Paket Wisata' },
      { firestore: 'master_hotels', supabase: 'master_hotels', label: 'Hotel & Akomodasi' },
      { firestore: 'pendaftaran_mitra', supabase: 'pendaftaran_mitra', label: 'Status Pendaftaran Mitra' },
      { firestore: 'paket_master', supabase: 'paket_master', label: 'Paket Master' },
      { firestore: 'bookings', supabase: 'bookings', label: 'Daftar Booking / Pemesanan' },
      { firestore: 'transactions', supabase: 'transactions', label: 'Mutasi Keuangan' },
    ];

    try {
      for (const item of collectionsToMigrate) {
        addLog(isDemo ? `[SIMULASI] Membaca data Firestore [${item.firestore}]...` : `Mengambil data dari Firestore [${item.firestore}]...`);
        const querySnapshot = await getDocs(collection(db, item.firestore));
        
        if (querySnapshot.empty) {
          addLog(isDemo ? `[SIMULASI] Koleksi [${item.firestore}] kosong atau tidak ada. Lewati.` : `Koleksi [${item.firestore}] kosong di Firestore. Skip.`);
          continue;
        }

        addLog(isDemo 
          ? `[SIMULASI] Terdeteksi ${querySnapshot.size} baris data nyata di Firestore. Mensimulasikan bulk insert ke Supabase [public.${item.supabase}]...`
          : `Ditemukan ${querySnapshot.size} baris data. Memulai penyelarasan ke Supabase [${item.supabase}]...`
        );
        
        let batchCount = 0;
        let failCount = 0;

        for (const doc of querySnapshot.docs) {
          const rawData = doc.data();
          const cleanData: Record<string, unknown> = {};
          
          Object.keys(rawData).forEach((key) => {
            if (typeof rawData[key] !== 'object' || rawData[key] === null) {
              cleanData[key] = rawData[key];
            } else if (rawData[key]?.seconds) {
              cleanData[key] = new Date(rawData[key].seconds * 1000).toISOString();
            } else {
              cleanData[key] = JSON.stringify(rawData[key]);
            }
          });

          const recordId = doc.id;
          
          if (isDemo) {
            // Simulated minimal network jitter
            await new Promise((resolve) => setTimeout(resolve, 5));
            batchCount++;
          } else if (supabase) {
            const { error } = await supabase
              .from(item.supabase)
              .upsert({ id: recordId, ...cleanData });

            if (error) {
              failCount++;
              console.error(`Supabase Upsert Error key ${recordId}:`, error);
            } else {
              batchCount++;
            }
          }
        }

        if (isDemo) {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }

        addLog(isDemo
          ? `🎉 [SIMULASI SELESAI] Tabel [public.${item.supabase}] terpeta mulus: Berhasil menyimulasikan transfer ${batchCount} baris.`
          : `Selesai [${item.label}]: Berhasil sync ${batchCount} baris.${failCount > 0 ? ` Gagal atau di-skip ${failCount} baris (periksa kecocokan schema SQL).` : ''}`
        );
      }

      setMigrationStatus(isDemo ? 'Selesai (Demo)' : 'Selesai!');
      addLog(isDemo 
        ? '=== 🎉 SIMULASI PENYELARASAN DENGAN DATA NYATA BERHASIL! Jika environment keys dipasang, proses asli akan berjalan persis seperti di atas. ===' 
        : '=== 🎉 PROSES MIGRASI TAHAP AWAL BERHASIL SELESAI ==='
      );
    } catch (error) {
      console.error(error);
      setMigrationStatus('Gagal');
      const errMsg = error instanceof Error ? error.message : String(error);
      addLog(`❌ Terjadi Kesalahan: ${errMsg}`);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest mb-1">
            <Layers className="w-4 h-4" /> Dual-Database Bridge Config
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            Supabase Migration Hub
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">
            Gunakan portal ini untuk menyelaraskan data secara bertahap dari Firestore ke database relational Supabase.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status Card & Action */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm">
            <h2 className="text-base font-black tracking-tight mb-4 text-gray-800 uppercase text-xs">
              Status Koneksi Supabase
            </h2>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-150">
              {isConfigured ? (
                <>
                  <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-100">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-800">Tersambung</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Env credentials siap digunakan.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-rose-50 p-2 rounded-xl text-rose-600 border border-rose-100">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-rose-800">Menunggu Kredensial</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Harap isi &apos;VITE_SUPABASE_URL&apos; dan &apos;VITE_SUPABASE_ANON_KEY&apos;.</p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-150">
              <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center justify-between">
                <span>Sync Tahap Awal</span>
                {!isConfigured && (
                  <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                    Simulasi Aktif
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
                {isConfigured 
                  ? "Membaca data master, user, dan booking dari Firestore, lalu meng-upsert semuanya ke Supabase secara otomatis."
                  : "Uji proses transfer data Firestore Anda. Mode simulasi akan mendeteksi baris nyata dan mensimulasikan integrasi database relational secara live."}
              </p>
              <button
                type="button"
                onClick={runMigration}
                disabled={isMigrating}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all text-xs disabled:bg-indigo-300"
              >
                <RefreshCw className={`w-4 h-4 ${isMigrating ? 'animate-spin' : ''}`} />
                {isMigrating 
                  ? 'Sedang Memproses...' 
                  : isConfigured 
                    ? 'Singkronisasi Data Ke Supabase' 
                    : 'Jalankan Simulasi Sinkronisasi'}
              </button>
              {migrationStatus && (
                <p className="text-center text-[10px] uppercase font-bold text-indigo-700 mt-2">
                  Status: {migrationStatus}
                </p>
              )}
            </div>
          </div>

          <div className="bg-amber-50 rounded-3xl p-6 border border-amber-200/60">
            <div className="flex gap-2 items-start text-amber-800">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider">Perhatian</h3>
                <p className="text-[11px] leading-relaxed mt-2 text-amber-900/80">
                  Sebelum melakukan sinkronisasi data pertama kali, pastikan Anda telah membuat tabel-tabel di Supabase menggunakan template SQL di sebelah kanan (Copy Paste ke tab <strong>SQL Editor</strong> di dashboard Supabase Anda).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SQL Schema Template & Migration Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* SQL Editor Tool */}
          <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-gray-500" />
                <h3 className="text-xs font-black tracking-tight text-gray-800 uppercase">
                  Supabase Table Creation DDL
                </h3>
              </div>
              <button
                onClick={() => copyToClipboard(sqlSchema, 'sql')}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors uppercase tracking-widest"
              >
                <Copy className="w-3 h-3" />
                {copied === 'sql' ? 'Tersalin!' : 'Salin SQL Schema'}
              </button>
            </div>
            <div className="p-5">
              <div className="bg-gray-900 text-gray-100 p-4 rounded-2xl font-mono text-[10px] overflow-x-auto max-h-64 leading-relaxed">
                <pre>{sqlSchema}</pre>
              </div>
            </div>
          </div>

          {/* Real-time Logs Dashboard */}
          {migrationLogs.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-150 p-5 shadow-sm">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-600" /> Monitor Log Proses Migrasi
              </h3>
              <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 max-h-56 overflow-y-auto font-mono text-[10px] leading-relaxed text-gray-600 flex flex-col gap-1.5">
                {migrationLogs.map((log, idx) => (
                  <div key={idx} className="border-b border-gray-100 pb-1 last:border-0">{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
