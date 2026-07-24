import React, { useState, useEffect } from 'react';
import { 
  getActiveFirebaseConfig, 
  isCustomFirebaseConfigured, 
  saveCustomFirebaseConfig, 
  clearCustomFirebaseConfig, 
  FirebaseAppConfig 
} from '../../core/firestore/FirestoreRuntime';
import { db, collection, getDocs, limit, query, addDoc, doc, setDoc } from '../../firebase';
import { 
  Flame, 
  CheckCircle, 
  Key, 
  Link as LinkIcon, 
  Trash2, 
  Check, 
  RefreshCw, 
  AlertTriangle, 
  Layers, 
  Copy, 
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const FirebaseSparkView: React.FC = () => {
  const [config, setConfig] = useState<FirebaseAppConfig>(getActiveFirebaseConfig());
  const [isCustom, setIsCustom] = useState(isCustomFirebaseConfigured());
  const [copied, setCopied] = useState('');
  
  // Form state
  const [projectId, setProjectId] = useState(config.projectId || '');
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [authDomain, setAuthDomain] = useState(config.authDomain || '');
  const [firestoreDbId, setFirestoreDbId] = useState(config.firestoreDatabaseId || '(default)');
  const [storageBucket, setStorageBucket] = useState(config.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(config.messagingSenderId || '');
  const [appId, setAppId] = useState(config.appId || '');

  const [testStatus, setTestStatus] = useState<{ loading: boolean; message: string; success?: boolean }>({ loading: false, message: '' });
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);

  useEffect(() => {
    const handleConfigChange = () => {
      const active = getActiveFirebaseConfig();
      setConfig(active);
      setIsCustom(isCustomFirebaseConfigured());
      setProjectId(active.projectId || '');
      setApiKey(active.apiKey || '');
      setAuthDomain(active.authDomain || '');
      setFirestoreDbId(active.firestoreDatabaseId || '(default)');
      setStorageBucket(active.storageBucket || '');
      setMessagingSenderId(active.messagingSenderId || '');
      setAppId(active.appId || '');
    };
    window.addEventListener('firebase-config-changed', handleConfigChange);
    return () => window.removeEventListener('firebase-config-changed', handleConfigChange);
  }, []);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId.trim() || !apiKey.trim()) {
      alert('Project ID dan API Key Wajib diisi.');
      return;
    }

    const newConfig: FirebaseAppConfig = {
      projectId: projectId.trim(),
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      firestoreDatabaseId: firestoreDbId.trim() || '(default)',
      storageBucket: storageBucket.trim() || `${projectId.trim()}.firebasestorage.app`,
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim()
    };

    saveCustomFirebaseConfig(newConfig);
    alert('Kredensial Firebase Spark Gratis Berhasil Disimpan!\nHalaman akan memuat ulang koneksi secara otomatis.');
    window.location.reload();
  };

  const handleClearConfig = () => {
    if (confirm('Apakah Anda yakin ingin menghapus kredensial Firebase kustom dan kembali ke konfigurasi bawaan?')) {
      clearCustomFirebaseConfig();
      alert('Kredensial kustom dihapus.');
      window.location.reload();
    }
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true, message: 'Menguji baca/tulis ke Firestore Database...' });
    try {
      const ref = collection(db, 'users');
      const snap = await getDocs(query(ref, limit(1)));
      setTestStatus({
        loading: false,
        success: true,
        message: `Koneksi ke Firestore (Project: ${config.projectId}) BERHASIL! Ditemukan ${snap.size} dokumen sampel.`
      });
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: `Gagal tersambung ke Firestore: ${err.message || String(err)}`
      });
    }
  };

  const addLog = (msg: string) => {
    setMigrationLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const seedAllCollections = async () => {
    setIsMigrating(true);
    setMigrationLogs([]);
    addLog('Memulai inisialisasi dan pembuatan 17 Collection Firestore...');

    const initialDataMap: Record<string, any[]> = {
      users: [
        {
          id: 'zM28E5ttlHS9zLIEMhYBYAPaAQ32',
          uid: 'zM28E5ttlHS9zLIEMhYBYAPaAQ32',
          email: 'avirawisata@gmail.com',
          namaLengkap: 'avirawisata',
          name: 'avirawisata',
          role: 'mitra',
          phone: '+6281234567890',
          address: 'Jakarta, Indonesia',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      pendaftaran_mitra: [
        {
          id: 'mitra-001',
          namaBrand: 'Avira Wisata Utama',
          namaPenanggungJawab: 'Ahmad Avira',
          email: 'avirawisata@gmail.com',
          telepon: '081234567890',
          kota: 'Jakarta',
          status: 'verified',
          tier: 'GOLD',
          createdAt: new Date().toISOString()
        }
      ],
      jamaah: [
        {
          id: 'jam-001',
          namaLengkap: 'Ahmad Avira',
          nik: '3171010101900001',
          nomorPaspor: 'A1234567',
          jenisKelamin: 'L',
          telepon: '081234567890',
          statusPendaftaran: 'LUNAS',
          paketWisataId: 'paket-umrah-reguler-01',
          createdAt: new Date().toISOString()
        }
      ],
      bookings: [
        {
          id: 'book-001',
          nomorBooking: 'BOOK-UMR-2026-001',
          jamaahNama: 'Ahmad Avira',
          paketNama: 'Umrah Reguler Ramadan 2026',
          totalBiaya: 32500000,
          statusPembayaran: 'LUNAS',
          createdAt: new Date().toISOString()
        }
      ],
      master_paket_wisata: [
        {
          id: 'paket-umrah-reguler-01',
          namaPaket: 'Umrah Reguler Bintang 5 Ramadan 2026',
          durasiHari: 12,
          hargaQuad: 32500000,
          hargaTriple: 34500000,
          hargaDouble: 37500000,
          hotelMakkah: 'Pullman Zamzam Makkah',
          hotelMadinah: 'Frontel Al Harithia',
          maskapai: 'Saudi Arabian Airlines',
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        }
      ],
      master_maskapai: [
        {
          id: 'maskapai-saudi',
          kodeMaskapai: 'SV',
          namaMaskapai: 'Saudi Arabian Airlines',
          logoUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05',
          status: 'ACTIVE'
        }
      ],
      master_bandara: [
        {
          id: 'bandara-cgk',
          kodeIata: 'CGK',
          namaBandara: 'Soekarno-Hatta International Airport',
          kota: 'Tangerang / Jakarta',
          negara: 'Indonesia'
        }
      ],
      master_hotel: [
        {
          id: 'hotel-pullman-makkah',
          namaHotel: 'Pullman Zamzam Makkah',
          bintang: 5,
          kota: 'Makkah',
          jarakKeMasjid: '0 Meter (Abraj Al Bait)'
        }
      ],
      master_bus: [
        {
          id: 'bus-sapco-01',
          providerName: 'SAPTCO VIP Bus',
          kapasitasSeat: 45,
          fasilitas: ['AC', 'Wifi', 'Toilet', 'Reclining Seat'],
          tahunArmada: 2025
        }
      ],
      master_kereta: [
        {
          id: 'kereta-haramain-vip',
          namaLayanan: 'Haramain High Speed Railway',
          rute: 'Makkah - Madinah',
          kelas: 'Business Class'
        }
      ],
      master_visa: [
        {
          id: 'visa-umrah-reguler',
          jenisVisa: 'Visa Umrah Electronic',
          provider: 'MoFA Saudi Arabia',
          estimasiProsesHari: 2,
          biayaUsd: 135
        }
      ],
      master_handling: [
        {
          id: 'handling-jeddah-01',
          lokasi: 'Bandara King Abdulaziz Jeddah',
          layanan: 'Meet & Greet + Handling Bagasi',
          picLokasi: 'Ust. Abdullah'
        }
      ],
      master_perlengkapan: [
        {
          id: 'item-koper-24',
          namaItem: 'Koper Hardcase 24 Inch Umaroh',
          kategori: 'BAGASI',
          stokTersedia: 250,
          satuan: 'Pcs'
        }
      ],
      transactions: [
        {
          id: 'trx-001',
          kodeTransaksi: 'TRX-20260724-001',
          tipe: 'INCOME',
          kategori: 'PEMBAYARAN_PAKET',
          nominal: 32500000,
          keterangan: 'Pelunasan Paket Umrah Ahmad Avira',
          createdAt: new Date().toISOString()
        }
      ],
      wallets: [
        {
          id: 'wallet-zM28E5ttlHS9zLIEMhYBYAPaAQ32',
          uid: 'zM28E5ttlHS9zLIEMhYBYAPaAQ32',
          saldoUtama: 15000000,
          poinReward: 1250,
          status: 'ACTIVE'
        }
      ],
      system_settings: [
        {
          id: 'general',
          appName: 'Umaroh Platform',
          defaultCurrency: 'IDR',
          activeFirestoreDatabase: config.firestoreDatabaseId || 'ai-studio-7b9baede-5431-4818-8e1a-6da0a21316f9',
          lastUpdated: new Date().toISOString()
        }
      ],
      audit_logs: [
        {
          id: 'log-init-001',
          action: 'INITIALIZE_COLLECTIONS',
          performedBy: 'avirawisata@gmail.com',
          details: 'Inisialisasi 17 collection Firestore',
          timestamp: new Date().toISOString()
        }
      ]
    };

    try {
      let totalCreated = 0;
      for (const [colName, docs] of Object.entries(initialDataMap)) {
        addLog(`Menghubungkan ke collection [${colName}]...`);
        for (const item of docs) {
          const docId = item.id || `doc-${Date.now()}`;
          await setDoc(doc(db, colName, docId), {
            ...item,
            _syncedAt: new Date().toISOString()
          }, { merge: true });
          totalCreated++;
        }
        addLog(`✅ Collection [${colName}] BERHASIL DIBUAT & DIISI!`);
      }
      addLog(`🎉 BERHASIL SANGAT SEMPURNA! Total ${totalCreated} dokumen dibuat di 17 Collection Firestore.`);
      addLog(`Database Target ID: ${config.firestoreDatabaseId || 'ai-studio-7b9baede-5431-4818-8e1a-6da0a21316f9'}`);
    } catch (err: any) {
      addLog(`❌ Terjadi kendala pembuatan collection: ${err.message || String(err)}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const runLocalCacheSync = async () => {
    setIsMigrating(true);
    setMigrationLogs([]);
    addLog('Memulai penyelarasan data cache lokal ke Firebase Firestore...');

    const collectionsToSync = [
      'users', 'pendaftaran_mitra', 'bookings', 'wallets', 'transactions', 'paket_master'
    ];

    try {
      for (const colName of collectionsToSync) {
        addLog(`Memeriksa data lokal untuk [${colName}]...`);
        const rawLocal = localStorage.getItem(`local_db_${colName}`);
        let docsCount = 0;

        if (rawLocal) {
          try {
            const parsed = JSON.parse(rawLocal);
            if (Array.isArray(parsed) && parsed.length > 0) {
              addLog(`Menemukan ${parsed.length} baris data lokal [${colName}]. Menulis ke Firestore...`);
              for (const row of parsed) {
                const docId = String(row.id || row.uid || `sync-${Date.now()}`);
                await setDoc(doc(db, colName, docId), {
                  ...row,
                  updatedAt: new Date().toISOString()
                }, { merge: true });
                docsCount++;
              }
              addLog(`✅ Berhasil menulis ${docsCount} dokumen ke [${colName}].`);
            }
          } catch (e) {
            addLog(`⚠️ Gagal memproses cache lokal [${colName}].`);
          }
        } else {
          addLog(`Informasi: Tidak ada cache lokal untuk [${colName}].`);
        }
      }
      addLog('🎉 Selesai! Seluruh data lokal telah tersinkron ke Firebase Firestore Anda.');
    } catch (err: any) {
      addLog(`❌ Terjadi kesalahan: ${err.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-gray-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-amber-600 font-black text-xs uppercase tracking-widest mb-1">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" /> Firebase Free Spark Plan Config
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            Koneksi Firebase Sendiri (100% Gratis Tanpa Billing)
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">
            Hubungkan aplikasi ini ke Project Firebase gratis milik akun Google Anda sendiri (<code>umarohumaroh.learningcentre@gmail.com</code>).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Panel: Form Kredensial */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black tracking-wider uppercase text-gray-800 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" /> Form Config Firebase
              </h2>
              {isCustom ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  <CheckCircle className="w-3 h-3" /> Project Kustom
                </span>
              ) : (
                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                  Default Platform
                </span>
              )}
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Project ID *</label>
                <input
                  type="text"
                  placeholder="umaroh-app-12345"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">API Key *</label>
                <input
                  type="text"
                  placeholder="AIzaSyA..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Auth Domain (Opsional)</label>
                <input
                  type="text"
                  placeholder="umaroh-app-12345.firebaseapp.com"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Firestore Database ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="(default) atau ai-studio-..."
                    value={firestoreDbId}
                    onChange={(e) => setFirestoreDbId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFirestoreDbId('ai-studio-7b9baede-5431-4818-8e1a-6da0a21316f9');
                      localStorage.setItem('override_firestore_db_id', 'ai-studio-7b9baede-5431-4818-8e1a-6da0a21316f9');
                    }}
                    className="shrink-0 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2.5 py-1 text-[10px] rounded-xl transition"
                    title="Gunakan DB ID ini"
                  >
                    Set DB 7b9b...
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Preset target: <code className="text-amber-700 font-bold">ai-studio-7b9baede-5431-4818-8e1a-6da0a21316f9</code></p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">App ID (Opsional)</label>
                <input
                  type="text"
                  placeholder="1:123456789:web:abcdef..."
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-sm text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Simpan & Hubungkan
                </button>
                {isCustom && (
                  <button
                    type="button"
                    onClick={handleClearConfig}
                    className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-100 transition-all"
                    title="Reset ke Default"
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
                disabled={testStatus.loading}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testStatus.loading ? 'animate-spin' : ''}`} />
                Uji Koneksi Firestore
              </button>
              {testStatus.message && (
                <div className={`mt-2 p-2.5 rounded-xl text-[11px] border leading-relaxed ${testStatus.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                  {testStatus.message}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-150 space-y-2">
              <button
                type="button"
                onClick={seedAllCollections}
                disabled={isMigrating}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                <Flame className={`w-4 h-4 text-amber-200 ${isMigrating ? 'animate-spin' : ''}`} />
                {isMigrating ? 'Menciptakan Collections...' : '🔥 Buat & Isi 17 Collection Firestore'}
              </button>

              <button
                type="button"
                onClick={runLocalCacheSync}
                disabled={isMigrating}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 ${isMigrating ? 'animate-spin' : ''}`} />
                {isMigrating ? 'Sedang Sync Data...' : 'Upload Cache Lokal ke Firebase Baru'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Step by Step Guide & Logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm">
            <h2 className="text-base font-black text-gray-900 tracking-tight mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Panduan 4 Langkah Membuat Firebase Gratis (Spark Plan)
            </h2>

            <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
              <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-100">
                <p className="font-bold text-amber-900 text-sm mb-1">1. Buka Console Firebase</p>
                <p>
                  Kunjungi{' '}
                  <a 
                    href="https://console.firebase.google.com" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-amber-700 font-bold underline inline-flex items-center gap-1"
                  >
                    console.firebase.google.com <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  dan login menggunakan akun email Anda (misal: <code>umarohumaroh.learningcentre@gmail.com</code>).
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100">
                <p className="font-bold text-blue-900 text-sm mb-1">2. Buat Project Baru (Plan Spark - Free)</p>
                <p>
                  Klik <strong>&quot;Add project&quot;</strong>, beri nama project Anda (contoh: <code>Umaroh App</code>). Pilih paket gratis bawaan (Spark Plan) yang <strong>tidak meminta kartu kredit atau billing</strong> sama sekali.
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                <p className="font-bold text-emerald-900 text-sm mb-1">3. Buat Firestore Database</p>
                <p>
                  Di menu navigasi kiri, pilih <strong>Build &gt; Firestore Database</strong> &rarr; klik <strong>Create database</strong> &rarr; Pilih mode <code>Test mode</code> atau izinkan akses baca/tulis agar aplikasi langsung tersambung.
                </p>
              </div>

              <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100">
                <p className="font-bold text-purple-900 text-sm mb-1">4. Salin Web App Config</p>
                <p>
                  Buka <strong>Project Settings (ikon roda gigi ⚙️) &gt; General &gt; Your apps</strong> &rarr; klik ikon <strong>Web (&lt;/&gt;)</strong> &rarr; Salin nilai <code>projectId</code>, <code>apiKey</code>, <code>appId</code>, lalu tempelkan ke form di sebelah kiri!
                </p>
              </div>
            </div>
          </div>

          {/* Logs */}
          {migrationLogs.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-150 p-5 shadow-sm">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-3">
                Log Sync Data ke Firebase Spark
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
