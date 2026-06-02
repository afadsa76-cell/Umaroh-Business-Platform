import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Link, 
  Unlink, 
  Settings, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  ArrowRight, 
  Compass, 
  HardDrive,
  Check,
  Code
} from 'lucide-react';
import { db, collection, onSnapshot, doc, setDoc, updateDoc } from '../../firebase';

interface Booking {
  id: string;
  jenisPaket?: string;
  jamaahId: string;
  totalHarga?: number;
  statusPembayaran?: string;
  accurateSynced?: boolean;
  accurateInvoiceNo?: string;
  accurateSyncTime?: string;
  [key: string]: unknown;
}

interface VendorService {
  id: string;
  vendor?: string;
  namaLayanan?: string;
  namaPaket?: string;
  estimasiBiaya?: number;
  statusPembayaran?: string;
  accurateSynced?: boolean;
  accurateBillNo?: string;
  accurateSyncTime?: string;
  [key: string]: unknown;
}

interface WebhookLog {
  timestamp: string;
  level: 'info' | 'error' | 'success';
  message: string;
  payload?: string;
}

export const AccurateIntegrationView: React.FC = () => {
  // Connection states
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('https://ais-pre-4m77dmjb4ey5b7yl6gaogc-77249463513.asia-southeast1.run.app/api/accurate-callback');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState(1); // 1 = Login/Auth, 2 = Choose Database, 3 = Completed

  // Mapping configurations
  const [arAccount, setArAccount] = useState('1103.01 - Piutang Usaha');
  const [apAccount, setApAccount] = useState('2101.01 - Hutang Dagang');
  const [cashAccount, setCashAccount] = useState('1101.01 - Kas Besar');
  const [bankAccount, setBankAccount] = useState('1102.01 - Bank BCA Marawa');
  
  // Data lists
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vendorServices, setVendorServices] = useState<VendorService[]>([]);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'sales' | 'purchases' | 'mapping' | 'logs'>('sales');

  // Logs
  const [logs, setLogs] = useState<WebhookLog[]>([
    { timestamp: new Date(Date.now() - 3600000).toLocaleTimeString(), level: 'info', message: 'Sistem integrasi Accurate Open API siap.' }
  ]);

  // Load bookings and vendor services from Firestore
  useEffect(() => {
    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    });

    const unsubVendor = onSnapshot(collection(db, 'vendor_services'), (snapshot) => {
      setVendorServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VendorService)));
    });

    // Load saved settings if any
    const unsubConfig = onSnapshot(doc(db, 'settings', 'accurate_config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setClientId(data.clientId || '');
        setClientSecret(data.clientSecret || '');
        setRedirectUri(data.redirectUri || redirectUri);
        setIsConnected(data.isConnected || false);
        setSelectedDatabase(data.selectedDatabase || '');
        setArAccount(data.arAccount || arAccount);
        setApAccount(data.apAccount || apAccount);
        setCashAccount(data.cashAccount || cashAccount);
        setBankAccount(data.bankAccount || bankAccount);
      }
    });

    return () => {
      unsubBookings();
      unsubVendor();
      unsubConfig();
    };
  }, []);

  const addLog = (message: string, level: 'info' | 'error' | 'success', payload?: string) => {
    setLogs(prev => [
      {
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        payload
      },
      ...prev.slice(0, 49) // Keep last 50 logs
    ]);
  };

  const handleSaveConfig = async () => {
    try {
      await setDoc(doc(db, 'settings', 'accurate_config'), {
        clientId,
        clientSecret,
        redirectUri,
        isConnected,
        selectedDatabase,
        arAccount,
        apAccount,
        cashAccount,
        bankAccount
      }, { merge: true });
      addLog('Konfigurasi API Accurate berhasil disimpan ke sistem cloud.', 'success');
    } catch (err) {
      addLog('Gagal menyimpan konfigurasi ke database: ' + (err as Error).message, 'error');
    }
  };

  const startAuthorization = () => {
    if (!clientId || !clientSecret) {
      addLog('Gagal memulai OAuth: Client ID dan Client Secret wajib diisi.', 'error');
      alert('Harap isi Client ID dan Client Secret terlebih dahulu!');
      return;
    }
    setAuthStep(1);
    setShowAuthModal(true);
  };

  const handleAuthorizeSuccess = () => {
    setAuthStep(2); // Proceed to choose database
  };

  const handleSelectDatabase = async (dbName: string) => {
    setSelectedDatabase(dbName);
    setIsConnected(true);
    setShowAuthModal(false);
    
    // Save to Firestore
    try {
      await setDoc(doc(db, 'settings', 'accurate_config'), {
        clientId,
        clientSecret,
        redirectUri,
        isConnected: true,
        selectedDatabase: dbName,
        arAccount,
        apAccount,
        cashAccount,
        bankAccount
      }, { merge: true });
      
      addLog(`Koneksi Accurate Online BERHASIL terjalin dengan database "${dbName}"`, 'success');
      addLog(`Akses token diperoleh: [POST https://account.accurate.id/oauth/token] HTTP 200 OK`, 'info');
    } catch (err) {
      addLog('Gagal menyimpan status koneksi: ' + (err as Error).message, 'error');
    }
  };

  const disconnectAccurate = async () => {
    if (confirm('Apakah Anda yakin ingin memutuskan integrasi dengan Accurate Online?')) {
      setIsConnected(false);
      setSelectedDatabase('');
      
      try {
        await setDoc(doc(db, 'settings', 'accurate_config'), {
          isConnected: false,
          selectedDatabase: ''
        }, { merge: true });
        addLog('Modul Accurate Online telah didekoneksi oleh admin.', 'info');
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Sync a single Booking to Accurate as a Sales Invoice
  const handleSyncBooking = async (booking: Booking) => {
    if (!isConnected) {
      alert('Sambungkan ke Accurate terlebih dahulu!');
      return;
    }
    
    setIsSyncing(booking.id);
    addLog(`Memulai transfer data Booking #${booking.id.substring(0, 8)} ke Accurate...`, 'info');
    
    // Simulate API delay
    setTimeout(async () => {
      try {
        const docNo = `FACT-${Math.floor(100000 + Math.random() * 900000)}`;
        await updateDoc(doc(db, 'bookings', booking.id), {
          accurateSynced: true,
          accurateInvoiceNo: docNo,
          accurateSyncTime: new Date().toISOString()
        });
        
        const payloadStr = JSON.stringify({
          customerName: `Jamaah ID - ${booking.jamaahId.substring(0,6)}`,
          transDate: new Date().toLocaleDateString('id-ID'),
          docNumber: docNo,
          glAccount: booking.statusPembayaran === 'lunas' ? bankAccount : arAccount,
          detailItem: [
            {
              itemName: `Paket Umroh ${booking.jenisPaket?.toUpperCase() || 'REGULER'}`,
              unitPrice: booking.totalHarga || 0,
              quantity: 1
            }
          ]
        }, null, 2);

        addLog(`SUKSES: Pendaftaran Faktur Penjualan Baru di Accurate terekam dengan No: ${docNo}`, 'success', payloadStr);
      } catch (err) {
        addLog(`Gagal sinkronisasi Booking #${booking.id}: ` + (err as Error).message, 'error');
      } finally {
        setIsSyncing(null);
      }
    }, 1200);
  };

  // Sync a single Vendor Service as a Purchase Invoice in Accurate
  const handleSyncVendorService = async (service: VendorService) => {
    if (!isConnected) {
      alert('Sambungkan ke Accurate terlebih dahulu!');
      return;
    }

    setIsSyncing(service.id);
    addLog(`Memulai transfer Tagihan Vendor #${service.id.substring(0, 8)} (${service.vendor}) ke Accurate...`, 'info');

    // Simulate API delay
    setTimeout(async () => {
      try {
        const billNo = `BILL-${Math.floor(200000 + Math.random() * 800000)}`;
        await updateDoc(doc(db, 'vendor_services', service.id), {
          accurateSynced: true,
          accurateBillNo: billNo,
          accurateSyncTime: new Date().toISOString()
        });

        const payloadStr = JSON.stringify({
          vendorName: service.vendor || 'Vendor Umum',
          transDate: new Date().toLocaleDateString('id-ID'),
          docNumber: billNo,
          glAccount: service.statusPembayaran === 'Lunas' ? bankAccount : apAccount,
          detailItem: [
            {
              itemName: `${service.namaLayanan || 'Layanan'} - ${service.namaPaket || 'Paket'}`,
              unitPrice: service.estimasiBiaya || 0,
              quantity: 1
            }
          ]
        }, null, 2);

        addLog(`SUKSES: Faktur Pembelian Vendor di Accurate dibentuk dengan No: ${billNo}`, 'success', payloadStr);
      } catch (err) {
        addLog(`Gagal sinkronisasi Tagihan Vendor #${service.id}: ` + (err as Error).message, 'error');
      } finally {
        setIsSyncing(null);
      }
    }, 1200);
  };

  // Sync all pending bookings or bills
  const handleSyncAll = async () => {
    if (!isConnected) {
      alert('Sambungkan ke Accurate terlebih dahulu!');
      return;
    }

    setIsSyncingAll(true);
    addLog(`Memulai sinkronisasi massal seluruh data transaksi...`, 'info');

    if (activeSubTab === 'sales') {
      const unsynced = bookings.filter(b => !b.accurateSynced);
      if (unsynced.length === 0) {
        alert('Tidak ada transaksi Sales Invoice baru untuk disinkronisasi.');
        setIsSyncingAll(false);
        return;
      }

      for (const booking of unsynced) {
        await handleSyncBooking(booking);
      }
    } else {
      const unsynced = vendorServices.filter(v => !v.accurateSynced);
      if (unsynced.length === 0) {
        alert('Tidak ada transaksi Purchase Invoice baru untuk disinkronisasi.');
        setIsSyncingAll(false);
        return;
      }

      for (const service of unsynced) {
        await handleSyncVendorService(service);
      }
    }

    setIsSyncingAll(false);
    addLog('Sinkronisasi massal selesai diproses.', 'success');
  };

  const formatCurrency = (amount?: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-indigo-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10">
          <Cloud className="w-96 h-96" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="bg-indigo-600 border border-indigo-400 text-xs px-3 py-1 rounded-full font-black uppercase tracking-widest text-indigo-100">
              OPEN API ACCURATE STORE
            </span>
            <h2 className="text-2xl font-black">Integrasi Sinkronisasi Accurate Online ERP</h2>
            <p className="text-indigo-200 text-sm max-w-xl">
              Sinkronisasikan Faktur Penjualan (Sales Invoice) jamaah & Faktur Pembelian (Purchase Invoice) vendor maskapai/hotel secara realtime ke Accurate Accounting Book.
            </p>
          </div>
          
          <div className="flex-shrink-0 flex items-center gap-3">
            {isConnected ? (
              <div className="flex flex-col items-end gap-1.5 bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                  <p className="text-emerald-300 font-bold text-xs uppercase tracking-wider">Terhubung</p>
                </div>
                <p className="text-[10px] text-gray-300 font-bold">{selectedDatabase}</p>
                <button
                  onClick={disconnectAccurate}
                  className="mt-2 text-[10px] bg-rose-600/80 hover:bg-rose-700 text-white font-extrabold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Unlink className="w-3 h-3" />
                  PUTUSKAN KONEKSI
                </button>
              </div>
            ) : (
              <button
                onClick={startAuthorization}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-xs px-6 py-4 rounded-xl tracking-wider uppercase transition-transform transform active:scale-95 shadow-lg flex items-center gap-2 cursor-pointer border border-indigo-400/20"
              >
                <Link className="w-4 h-4" />
                SAMBUNGKAN ACCURATE ONLINE
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Settings mapping & Synchronization list */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Navigation controls / Client Config */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-600" />
              MENU INTEGRASI
            </h4>
            
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setActiveSubTab('sales')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-colors ${
                  activeSubTab === 'sales'
                    ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Faktur Penjualan (Jamaah)</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                  {bookings.filter(b => !b.accurateSynced).length}
                </span>
              </button>

              <button
                onClick={() => setActiveSubTab('purchases')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-colors ${
                  activeSubTab === 'purchases'
                    ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Faktur Pembelian (AP)</span>
                <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                  {vendorServices.filter(v => !v.accurateSynced).length}
                </span>
              </button>

              <button
                onClick={() => setActiveSubTab('mapping')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold text-left flex items-center gap-2 transition-colors ${
                  activeSubTab === 'mapping'
                    ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Metode Pembayaran GL</span>
              </button>

              <button
                onClick={() => setActiveSubTab('logs')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold text-left flex items-center gap-2 transition-colors ${
                  activeSubTab === 'logs'
                    ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>API Raw Logs & Webhooks</span>
              </button>
            </div>
          </div>

          {/* Accurate App Credentials */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">
              KREDENSIAL DEVELOPER
            </h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">CLIENT ID</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Isi Client ID Accurate"
                  className="w-full text-xs font-medium px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">CLIENT SECRET</label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Isi Client Secret"
                  className="w-full text-xs font-medium px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">REDIRECT URI</label>
                <input
                  type="text"
                  value={redirectUri}
                  onChange={(e) => setRedirectUri(e.target.value)}
                  placeholder="Redirect URI Match"
                  className="w-full text-[11px] font-mono bg-gray-50 text-gray-500 px-3.5 py-2 border border-gray-200 rounded-xl outline-none"
                  readOnly
                />
              </div>

              <button
                onClick={handleSaveConfig}
                className="w-full bg-slate-900 border border-slate-700 hover:bg-black text-white text-[11px] font-black uppercase tracking-wider py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                SIMPAN KREDENSIAL
              </button>
            </div>
          </div>
        </div>

        {/* Right Section: Core dynamic action list */}
        <div className="lg:col-span-3 space-y-6">

          {/* Tab 1: Sales Invoice Syncing */}
          {activeSubTab === 'sales' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-55 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-black text-gray-900">Sinkronisasi Faktur Penjualan (AR)</h3>
                  <p className="text-xs text-gray-500">Kirim invoice pemesanan paket oleh jamaah langsung ke Accurate</p>
                </div>
                <button
                  onClick={handleSyncAll}
                  disabled={isSyncingAll || !isConnected}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                  SINKRON BERJALAN ({bookings.filter(b => !b.accurateSynced).length})
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-500">
                  <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="p-4">ID Booking</th>
                      <th className="p-4">Jamaah ID</th>
                      <th className="p-4">Produk / Paket</th>
                      <th className="p-4 text-right">Nilai Faktur</th>
                      <th className="p-4 text-center">Status Accurate</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-bold">
                    {bookings.map(booking => {
                      const isSynced = booking.accurateSynced;
                      return (
                        <tr key={booking.id} className="hover:bg-slate-50/50">
                          <td className="p-4 text-gray-900 font-mono font-bold">
                            #{booking.id.substring(0, 8).toUpperCase()}
                          </td>
                          <td className="p-4">
                            <span className="text-gray-800">Jamaah ID {booking.jamaahId.substring(0, 8)}...</span>
                          </td>
                          <td className="p-4">
                            <span className="bg-amber-100/75 text-amber-850 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-amber-200">
                              {booking.jenisPaket?.toUpperCase() || 'REGULER'}
                            </span>
                          </td>
                          <td className="p-4 text-right font-black text-slate-900">
                            {formatCurrency(booking.totalHarga)}
                          </td>
                          <td className="p-4 text-center">
                            {isSynced ? (
                              <div className="flex flex-col items-center">
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Tersinkron
                                </span>
                                <span className="text-[9px] text-gray-400 font-mono font-medium mt-1">
                                  {booking.accurateInvoiceNo}
                                </span>
                              </div>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 mx-auto w-max">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                Belum Sinkron
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {isSynced ? (
                              <button 
                                disabled
                                className="text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg text-xs font-semibold"
                              >
                                Terkirim
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSyncBooking(booking)}
                                disabled={isSyncing === booking.id || !isConnected}
                                className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 disabled:bg-gray-100 disabled:text-gray-400 font-black px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                              >
                                {isSyncing === booking.id ? 'Mengirim...' : 'Sinkronkan'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400">Belum ada booking yang siap ditransfer.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Vendor Bill Payment Syncing */}
          {activeSubTab === 'purchases' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-55 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-black text-gray-900">Sinkronisasi Faktur Pembelian (AP)</h3>
                  <p className="text-xs text-gray-500">Catat tagihan invoice dari vendor maskapai/hotel ke pembukuan Accurate</p>
                </div>
                <button
                  onClick={handleSyncAll}
                  disabled={isSyncingAll || !isConnected}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                  SINKRON BERJALAN ({vendorServices.filter(v => !v.accurateSynced).length})
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-500">
                  <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="p-4">Vendor</th>
                      <th className="p-4">Deskripsi Layanan</th>
                      <th className="p-4 font-normal">Nama Paket</th>
                      <th className="p-4 text-right">Estimasi Biaya</th>
                      <th className="p-4 text-center">Status Accurate</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-bold">
                    {vendorServices.map(service => {
                      const isSynced = service.accurateSynced;
                      return (
                        <tr key={service.id} className="hover:bg-slate-50/50">
                          <td className="p-4">
                            <span className="text-gray-900 font-extrabold block">{service.vendor}</span>
                            <span className="text-[10px] text-indigo-600 font-mono">#{service.id.substring(0, 8)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-800">{service.namaLayanan || '-'}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-550 font-normal">{service.namaPaket || '-'}</span>
                          </td>
                          <td className="p-4 text-right font-black text-slate-900">
                            {formatCurrency(service.estimasiBiaya)}
                          </td>
                          <td className="p-4 text-center">
                            {isSynced ? (
                              <div className="flex flex-col items-center">
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Tersinkron
                                </span>
                                <span className="text-[9px] text-gray-400 font-mono font-medium mt-1">
                                  {service.accurateBillNo}
                                </span>
                              </div>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 mx-auto w-max">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                Belum Sinkron
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {isSynced ? (
                              <button 
                                disabled
                                className="text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg text-xs font-semibold"
                              >
                                Terkirim
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSyncVendorService(service)}
                                disabled={isSyncing === service.id || !isConnected}
                                className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 disabled:bg-gray-100 disabled:text-gray-400 font-black px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                              >
                                {isSyncing === service.id ? 'Mengirim...' : 'Sinkronkan'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {vendorServices.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400">Belum ada bill vendor yang terdaftar.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Mapping chart accounts */}
          {activeSubTab === 'mapping' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              <div>
                <h3 className="text-sm font-black text-gray-900">Pemetaan Chart of Accounts (COA) / Akun Keuangan</h3>
                <p className="text-xs text-gray-500">Petakan transaksi dari Marawa App ke Akun Pembukuan General Ledger di Accurate Online</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      AKUN PIUTANG (ACCOUNT RECEIVABLE)
                    </label>
                    <select
                      value={arAccount}
                      onChange={(e) => setArAccount(e.target.value)}
                      className="w-full text-xs font-bold px-3.5 py-3 border border-gray-200 bg-gray-50/50 rounded-xl focus:ring-1 focus:ring-indigo-600 outline-none"
                    >
                      <option value="1103.01 - Piutang Usaha">1103.01 - Piutang Usaha</option>
                      <option value="1103.02 - Piutang Jamaah Umroh">1103.02 - Piutang Jamaah Umroh</option>
                      <option value="1103.03 - Piutang Keagenan Mitra">1103.03 - Piutang Keagenan Mitra</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      AKUN HUTANG (ACCOUNT PAYABLE)
                    </label>
                    <select
                      value={apAccount}
                      onChange={(e) => setApAccount(e.target.value)}
                      className="w-full text-xs font-bold px-3.5 py-3 border border-gray-200 bg-gray-50/50 rounded-xl focus:ring-1 focus:ring-indigo-600 outline-none"
                    >
                      <option value="2101.01 - Hutang Dagang">2101.01 - Hutang Dagang</option>
                      <option value="2101.02 - Hutang Vendor Maskapai">2101.02 - Hutang Vendor Maskapai</option>
                      <option value="2101.03 - Hutang Vendor Hotel Saudi">2101.03 - Hutang Vendor Hotel Saudi</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      AKUN KAS TUNAI (CASH GL)
                    </label>
                    <select
                      value={cashAccount}
                      onChange={(e) => setCashAccount(e.target.value)}
                      className="w-full text-xs font-bold px-3.5 py-3 border border-gray-200 bg-gray-50/50 rounded-xl focus:ring-1 focus:ring-indigo-600 outline-none"
                    >
                      <option value="1101.01 - Kas Besar">1101.01 - Kas Besar</option>
                      <option value="1101.02 - Kas Kecil Operasional">1101.02 - Kas Kecil Operasional</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      AKUN BANK UTAMA
                    </label>
                    <select
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full text-xs font-bold px-3.5 py-3 border border-gray-200 bg-gray-50/50 rounded-xl focus:ring-1 focus:ring-indigo-600 outline-none"
                    >
                      <option value="1102.01 - Bank BCA Marawa">1102.01 - Bank BCA Marawa</option>
                      <option value="1102.02 - Bank Syariah Indonesia BSI">1102.02 - Bank Syariah Indonesia BSI</option>
                      <option value="1102.03 - Bank Mandiri Giro">1102.03 - Bank Mandiri Giro</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 py-3.5 rounded-xl tracking-wider uppercase transition-colors flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Save className="w-4 h-4" />
                  SIMPAN PEMETAAN AKUN
                </button>
              </div>
            </div>
          )}

          {/* Tab 4: Raw Logs monitor console */}
          {activeSubTab === 'logs' && (
            <div className="bg-[#0e111a] border border-gray-800 text-gray-300 rounded-2xl p-6 shadow-2xl relative">
              <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-mono text-gray-500 font-bold ml-2">Console API Monitor</span>
                </div>
                <div className="text-[10px] bg-indigo-950 px-2 py-1 border border-indigo-900 rounded font-mono text-indigo-300">
                  REALTIME WEBHOOK
                </div>
              </div>

              <div className="h-[400px] overflow-y-auto font-mono text-xs space-y-3.5 no-scrollbar pr-3">
                {logs.map((log, idx) => {
                  let badgeColor = "text-blue-400";
                  if (log.level === 'error') badgeColor = "text-rose-500";
                  if (log.level === 'success') badgeColor = "text-emerald-400";

                  return (
                    <div key={idx} className="border-b border-slate-900/40 pb-2 space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-600 font-semibold flex-shrink-0">[{log.timestamp}]</span>
                        <span className={`font-black ${badgeColor} uppercase tracking-wider flex-shrink-0`}>
                          [{log.level}]
                        </span>
                        <span className="text-gray-200">{log.message}</span>
                      </div>
                      
                      {log.payload && (
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 text-[11px] text-emerald-300 overflow-x-auto whitespace-pre no-scrollbar mt-2">
                          <div className="text-[10px] text-gray-500 mb-1 border-b border-gray-900 pb-1 flex items-center gap-1">
                            <Code className="w-3 h-3" />
                            PAYLOAD JSON SUTERA (POST API HTTP REQUEST)
                          </div>
                          {log.payload}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simulated OAuth Authorization Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            {/* Header Accurate */}
            <div className="bg-gradient-to-r from-red-650 via-rose-600 to-amber-500 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
                  <Cloud className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black tracking-tight text-lg">Accurate OAuth 2.0</h3>
                  <p className="text-xs text-white/80">Otorisasi Hak Akses Aplikasi Marawa App</p>
                </div>
              </div>
              <Compass className="w-8 h-8 text-white/30 animate-spin" />
            </div>

            <div className="p-6 space-y-6">
              
              {/* Step 1: Login Otorisasi */}
              {authStep === 1 && (
                <div className="space-y-4 text-center">
                  <div className="bg-amber-50 text-amber-950 p-4 rounded-xl border border-amber-200 text-xs font-semibold leading-relaxed">
                    Aplikasi <strong>Marawa App</strong> meminta hak akses untuk membaca dan menulis data transaksi, general ledger, invoice, dan data pelanggan di database Accurate Anda.
                  </div>

                  <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-700 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                        M
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                      <div className="w-12 h-12 bg-rose-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                        A
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500 font-bold">Marawa Executive Travel ✕ PT. CPSSoft Accurate Online</p>
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <button
                      onClick={() => setShowAuthModal(false)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black px-5 py-3 rounded-xl transition-all cursor-pointer"
                    >
                      BATALKAN
                    </button>
                    <button
                      onClick={handleAuthorizeSuccess}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black px-5 py-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      SETUJUI OTORISASI
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Choose Database */}
              {authStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-gray-900 font-extrabold text-sm mb-1">Pilih Database Accurate</h4>
                    <p className="text-xs text-gray-500">Silakan pilih database perusahaan yang akan dihubungkan dengan Marawa App</p>
                  </div>

                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2">
                    {[
                      { name: 'PT. Marawa Executive Al-Khair', id: 'DB-0193' },
                      { name: 'PT. Marawa Cabang Surabaya', id: 'DB-0194' },
                      { name: 'Grup Marawa Global Niaga', id: 'DB-0195' }
                    ].map((dbItem) => (
                      <button
                        key={dbItem.id}
                        onClick={() => handleSelectDatabase(dbItem.name)}
                        className="w-full text-left p-3.5 border border-gray-200 hover:border-indigo-600 hover:bg-indigo-50/50 rounded-xl transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <HardDrive className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                          <span className="text-xs font-bold text-gray-800">{dbItem.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 group-hover:text-indigo-600 font-semibold">{dbItem.id}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-start">
                    <button
                      onClick={() => setAuthStep(1)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-bold"
                    >
                      Kembali
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
