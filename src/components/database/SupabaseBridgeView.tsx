import React, { useState, useEffect } from 'react';
import { db, getDocs, collection } from '../../firebase';
import { 
  getSupabaseClient, 
  isSupabaseConfigured, 
  getSupabaseUrl, 
  getSupabaseAnonKey, 
  saveSupabaseCredentials, 
  clearSupabaseCredentials, 
  testSupabaseConnection 
} from '../../supabase';
import { Database, CheckCircle, Code, Copy, AlertTriangle, RefreshCw, Layers, Key, Link as LinkIcon, Trash2, Check } from 'lucide-react';

export const SupabaseBridgeView: React.FC = () => {
  const [configured, setConfigured] = useState(isSupabaseConfigured());
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(getSupabaseUrl());
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(getSupabaseAnonKey());
  const [copied, setCopied] = useState('');
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string>('');
  const [testStatus, setTestStatus] = useState<{ loading: boolean; message: string; success?: boolean }>({ loading: false, message: '' });

  useEffect(() => {
    const handleConfigChange = () => {
      setConfigured(isSupabaseConfigured());
      setSupabaseUrlInput(getSupabaseUrl());
      setSupabaseKeyInput(getSupabaseAnonKey());
    };
    window.addEventListener('supabase-config-changed', handleConfigChange);
    return () => window.removeEventListener('supabase-config-changed', handleConfigChange);
  }, []);

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrlInput.trim() || !supabaseKeyInput.trim()) {
      alert('Harap isi URL dan Anon Key Supabase secara lengkap.');
      return;
    }
    const saved = saveSupabaseCredentials(supabaseUrlInput, supabaseKeyInput);
    if (saved) {
      setConfigured(true);
      alert('Kredensial Supabase berhasil disimpan!');
      handleTestConnection();
    } else {
      alert('Format URL tidak valid. Pastikan dimulai dengan https://');
    }
  };

  const handleClearCredentials = () => {
    if (confirm('Apakah Anda yakin ingin menghapus kredensial Supabase dari penyimpanan lokal browser?')) {
      clearSupabaseCredentials();
      setConfigured(false);
      setSupabaseUrlInput('');
      setSupabaseKeyInput('');
      setTestStatus({ loading: false, message: '' });
    }
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true, message: 'Menguji koneksi ke Supabase...' });
    const res = await testSupabaseConnection();
    setTestStatus({ loading: false, message: res.message, success: res.success });
  };

  const sqlSchema = `-- ====================================================================
-- SKEMA DATABASE LENGKAP UNTUK SUPABASE (UMAROH MARKETPLACE & ENTERPRISE)
-- ====================================================================
-- Petunjuk Penggunaan:
-- 1. Buka Dashboard Supabase Anda (https://app.supabase.com)
-- 2. Pilih Project Anda -> Buka menu "SQL Editor" di bilah navigasi kiri
-- 3. Klik "New Query", tempelkan seluruh kode SQL di bawah ini, lalu klik "Run"
-- ====================================================================

-- 1. TABEL USERS
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    uid TEXT,
    email TEXT,
    name TEXT,
    namaLengkap TEXT,
    role TEXT DEFAULT 'jamaah',
    subRole TEXT,
    phone TEXT,
    brandName TEXT,
    namaVendor TEXT,
    passwordAwal TEXT,
    status TEXT DEFAULT 'active',
    address TEXT,
    kota TEXT,
    jenisMitra TEXT,
    balance NUMERIC DEFAULT 0,
    uplineId TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL PENDAFTARAN MITRA
CREATE TABLE IF NOT EXISTS public.pendaftaran_mitra (
    id TEXT PRIMARY KEY,
    uid TEXT,
    email TEXT,
    nama TEXT,
    namaLengkap TEXT,
    phone TEXT,
    brandName TEXT,
    paketId TEXT,
    uplineId TEXT,
    provinsi TEXT,
    kota TEXT,
    kecamatan TEXT,
    desaKelurahan TEXT,
    alamatLengkap TEXT,
    status TEXT DEFAULT 'pending',
    targetMonthlyPackets INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL BOOKINGS
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    paketId TEXT,
    mitraId TEXT,
    jamaahId TEXT,
    customerName TEXT,
    namaJamaah TEXT,
    nama_paspor TEXT,
    customerPhone TEXT,
    noHp TEXT,
    emailJamaah TEXT,
    alamat TEXT,
    totalPax INT DEFAULT 1,
    totalPrice NUMERIC DEFAULT 0,
    dpPaid NUMERIC DEFAULT 0,
    passportStatus TEXT DEFAULT 'pending',
    ktpStatus TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'confirmed',
    namaPaket TEXT,
    documents JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL UMAROH MASTER DATA
CREATE TABLE IF NOT EXISTS public.umaroh_master_data (
    id TEXT PRIMARY KEY,
    data JSONB,
    updatedAt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL WALLETS
CREATE TABLE IF NOT EXISTS public.wallets (
    id TEXT PRIMARY KEY,
    uid TEXT,
    balance NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'IDR',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    walletId TEXT,
    userId TEXT,
    recipientId TEXT,
    amount NUMERIC DEFAULT 0,
    type TEXT,
    referenceId TEXT,
    description TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL PAKET MASTER
CREATE TABLE IF NOT EXISTS public.paket_master (
    id TEXT PRIMARY KEY,
    nama TEXT,
    title TEXT,
    lokasi TEXT,
    durasiHari INT DEFAULT 9,
    tanggalKeberangkatan DATE,
    status TEXT DEFAULT 'active',
    hargaStart NUMERIC DEFAULT 0,
    img TEXT,
    airline TEXT,
    hotelMekkah TEXT,
    hotelMadinah TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE RLS & PUBLIC POLICIES FOR API ACCESS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendaftaran_mitra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.umaroh_master_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paket_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to pendaftaran_mitra" ON public.pendaftaran_mitra FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to bookings" ON public.bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to umaroh_master_data" ON public.umaroh_master_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to wallets" ON public.wallets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to paket_master" ON public.paket_master FOR ALL USING (true) WITH CHECK (true);
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
    const client = getSupabaseClient();
    const isReady = isSupabaseConfigured() && client;

    if (!isReady) {
      alert('Harap masukkan Supabase URL & Anon Key terlebih dahulu dan klik "Simpan Kredensial".');
      return;
    }

    if (!confirm('Apakah Anda yakin ingin memulai migrasi data dari Firestore/Local Cache ke Supabase?')) {
      return;
    }

    setIsMigrating(true);
    setMigrationLogs([]);
    setMigrationStatus('Sedang Memproses...');
    addLog('Memulai migrasi data ke Supabase...');

    const collectionsToMigrate = [
      { firestore: 'users', supabase: 'users', label: 'Data Pengguna & Admin/Mitra' },
      { firestore: 'pendaftaran_mitra', supabase: 'pendaftaran_mitra', label: 'Status Pendaftaran Mitra' },
      { firestore: 'bookings', supabase: 'bookings', label: 'Daftar Booking / Pemesanan' },
      { firestore: 'umaroh_master_data', supabase: 'umaroh_master_data', label: 'Master Data Component & Master Prices' },
      { firestore: 'wallets', supabase: 'wallets', label: 'Dompet Digital' },
      { firestore: 'transactions', supabase: 'transactions', label: 'Mutasi Keuangan' },
      { firestore: 'paket_master', supabase: 'paket_master', label: 'Katalog Paket Master' }
    ];

    try {
      for (const item of collectionsToMigrate) {
        addLog(`Mengambil data untuk [${item.label}]...`);
        let docsToSync: Array<{ id: string; data: Record<string, unknown> }> = [];

        // Attempt 1: Fetch from Firestore
        try {
          const querySnapshot = await getDocs(collection(db, item.firestore));
          if (!querySnapshot.empty) {
            querySnapshot.docs.forEach((docSnap) => {
              docsToSync.push({ id: docSnap.id, data: docSnap.data() as Record<string, unknown> });
            });
            addLog(`Ditemukan ${docsToSync.length} dokumen di Firestore [${item.firestore}].`);
          }
        } catch {
          addLog(`⚠️ Firestore terkunci/quota habis [${item.firestore}]. Menggunakan fallback Local Storage Cache...`);
        }

        // Attempt 2: If Firestore failed or returned empty, check localStorage
        if (docsToSync.length === 0) {
          if (item.firestore === 'umaroh_master_data') {
            const keysToSync = [
              'umaroh_db_visa', 'umaroh_db_handling_saudi', 'umaroh_db_transport',
              'umaroh_db_ziarah', 'umaroh_db_handling_domestik', 'umaroh_db_kereta_cepat',
              'umaroh_db_mutawif', 'umaroh_db_hotels'
            ];
            keysToSync.forEach((k) => {
              const val = localStorage.getItem(k);
              if (val) {
                docsToSync.push({ id: k, data: { data: val, updatedAt: new Date().toISOString() } });
              }
            });
          } else {
            const rawLocal = localStorage.getItem(`local_db_${item.firestore}`);
            if (rawLocal) {
              try {
                const parsed = JSON.parse(rawLocal);
                if (Array.isArray(parsed)) {
                  docsToSync = parsed.map((row: Record<string, unknown>, idx: number) => ({
                    id: String(row.id || row.uid || `local-${idx}`),
                    data: row
                  }));
                }
              } catch {
                // ignore
              }
            }
          }

          if (docsToSync.length > 0) {
            addLog(`Ditemukan ${docsToSync.length} baris data lokal tersimpan di cache browser.`);
          }
        }

        if (docsToSync.length === 0) {
          addLog(`Koleksi [${item.label}] kosong. Melanjutkan ke koleksi berikutnya.`);
          continue;
        }

        let batchCount = 0;
        let failCount = 0;

        for (const itemDoc of docsToSync) {
          const rawData = itemDoc.data;
          const cleanData: Record<string, unknown> = {};

          Object.keys(rawData).forEach((key) => {
            if (typeof rawData[key] !== 'object' || rawData[key] === null) {
              cleanData[key] = rawData[key];
            } else if ((rawData[key] as { seconds?: number })?.seconds) {
              cleanData[key] = new Date((rawData[key] as { seconds: number }).seconds * 1000).toISOString();
            } else {
              cleanData[key] = JSON.stringify(rawData[key]);
            }
          });

          const recordId = itemDoc.id;

          if (client) {
            const { error } = await client
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

        addLog(`Selesai [${item.label}]: Berhasil sync ${batchCount} baris.${failCount > 0 ? ` Gagal atau di-skip ${failCount} baris (periksa schema SQL).` : ''}`);
      }

      setMigrationStatus('Selesai!');
      addLog('=== 🎉 PROSES MIGRASI KE SUPABASE BERHASIL SELESAI ===');
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
            <Layers className="w-4 h-4" /> Supabase Database Hub
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            Migrasi & Koneksi Supabase
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">
            Gunakan portal ini untuk menghubungkan project Supabase Anda sendiri dan memigrasikan seluruh data secara gratis tanpa batas billing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel: Credentials Form & Sync Action */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm">
            <h2 className="text-xs font-black tracking-wider uppercase mb-4 text-gray-800 flex items-center justify-between">
              <span>Pengaturan Kredensial Supabase</span>
              {configured && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  <CheckCircle className="w-3 h-3" /> Siap
                </span>
              )}
            </h2>

            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5 text-indigo-600" /> Supabase Project URL
                </label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrlInput}
                  onChange={(e) => setSupabaseUrlInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-indigo-600" /> Supabase Anon Public Key
                </label>
                <textarea
                  rows={3}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKeyInput}
                  onChange={(e) => setSupabaseKeyInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-sm text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Simpan Kredensial
                </button>
                {configured && (
                  <button
                    type="button"
                    onClick={handleClearCredentials}
                    className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-100 transition-all"
                    title="Hapus Kredensial"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-150">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus.loading || !configured}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testStatus.loading ? 'animate-spin' : ''}`} />
                Uji Koneksi Supabase
              </button>
              {testStatus.message && (
                <div className={`mt-2 p-2.5 rounded-xl text-[11px] border leading-relaxed ${testStatus.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                  {testStatus.message}
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-150">
              <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center justify-between">
                <span>Migrasi Semua Data</span>
              </h3>
              <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
                Proses ini akan membaca data pengguna, booking, dan master harga dari Firestore maupun Local Cache, lalu menyinkronkannya langsung ke project Supabase Anda.
              </p>
              <button
                type="button"
                onClick={runMigration}
                disabled={isMigrating || !configured}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all text-xs disabled:bg-emerald-300"
              >
                <RefreshCw className={`w-4 h-4 ${isMigrating ? 'animate-spin' : ''}`} />
                {isMigrating ? 'Sedang Memproses Migrasi...' : 'Jalankan Migrasi Data Ke Supabase'}
              </button>
              {migrationStatus && (
                <p className="text-center text-[10px] uppercase font-bold text-emerald-700 mt-2">
                  Status: {migrationStatus}
                </p>
              )}
            </div>
          </div>

          <div className="bg-amber-50 rounded-3xl p-6 border border-amber-200/60">
            <div className="flex gap-2 items-start text-amber-800">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider">Langkah Wajib Sebelum Migrasi</h3>
                <p className="text-[11px] leading-relaxed mt-2 text-amber-900/80">
                  Salin script SQL di sebelah kanan dan jalankan di menu <strong>SQL Editor</strong> dashboard Supabase Anda terlebih dahulu agar struktur tabel dan hak akses API siap menerima data.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: SQL Schema Template & Logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black tracking-tight text-gray-800 uppercase">
                  Supabase Table Creation DDL (SQL Schema)
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
              <div className="bg-gray-900 text-gray-100 p-4 rounded-2xl font-mono text-[10px] overflow-x-auto max-h-72 leading-relaxed">
                <pre>{sqlSchema}</pre>
              </div>
            </div>
          </div>

          {migrationLogs.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-150 p-5 shadow-sm">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-600" /> Monitor Log Proses Migrasi
              </h3>
              <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 max-h-60 overflow-y-auto font-mono text-[10px] leading-relaxed text-gray-600 flex flex-col gap-1.5">
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

