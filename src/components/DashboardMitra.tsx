import React, { useState, useEffect } from 'react';
import { Wallet, Users, Package, Link as LinkIcon, Copy, CheckCircle2, History, LayoutDashboard, Calendar, User, TrendingUp, PlusCircle, Shield, Zap, Target } from 'lucide-react';
import { auth, db, doc, onSnapshot, addDoc, collection, query, where, getDocs, handleFirestoreError, OperationType } from '../firebase';
import { PaketMitraView } from './PaketMitraView';
import { KatalogPaketView } from './KatalogPaketView';
import { JamaahMitraView } from './JamaahMitraView';
import { JaringanMitraView } from './JaringanMitraView';
import { ProfileView } from './ProfileView';
import { ValidasiPaketMitraView } from './ValidasiPaketMitraView';
import { PaketMasterWizard } from './PaketMasterWizard';
import { FeedKolaborasiView } from './FeedKolaborasiView';
import { FlightTrackerWidget } from './FlightTrackerWidget';

type MitraTab = 'overview' | 'feed' | 'katalog' | 'paket' | 'validasi' | 'jamaah' | 'jaringan' | 'profile';

export const DashboardMitra = () => {
  const [activeTab, setActiveTab] = useState<MitraTab>('overview');
  const [balance, setBalance] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [stats, setStats] = useState({
    totalOmzet: 0,
    paketAktif: 0,
    totalJaringan: 0,
    komisiTarik: 0 
  });
  
  const userId = auth.currentUser?.uid;
  const referralLink = `https://umaroh.com/register?ref=${userId}`;

  useEffect(() => {
    if (!userId) return;
    
    // Wallet listener
    const walletPath = `wallets/${userId}`;
    const unsubscribeWallet = onSnapshot(doc(db, 'wallets', userId), (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().balance || 0);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, walletPath));

    // Stats fetching
    const fetchStats = async () => {
      try {
        // Paket Aktif (Markup)
        const paketPath = 'paket_mitra';
        const paketQuery = query(collection(db, paketPath), where('mitraId', '==', userId));
        const paketSnap = await getDocs(paketQuery).catch(err => {
          handleFirestoreError(err, OperationType.LIST, paketPath);
          return null;
        });
        
        // Total Jamaah/Jaringan
        const usersPath = 'users';
        const jaringanQuery = query(collection(db, usersPath), where('uplineId', '==', userId));
        const jaringanSnap = await getDocs(jaringanQuery).catch(err => {
          handleFirestoreError(err, OperationType.LIST, usersPath);
          return null;
        });

        setStats(prev => ({
          ...prev,
          paketAktif: (paketSnap && 'size' in paketSnap) ? paketSnap.size : prev.paketAktif,
          totalJaringan: (jaringanSnap && 'size' in jaringanSnap) ? jaringanSnap.size : prev.totalJaringan
        }));
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchStats();

    return () => {
      unsubscribeWallet();
    };
  }, [userId]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdrawalRequest = async () => {
    if (balance <= 0) {
      alert('Saldo tidak mencukupi untuk ditarik.');
      return;
    }

    const amountStr = prompt(`Masukkan nominal yang ingin ditarik (Maksimal Rp ${balance.toLocaleString('id-ID')}):`);
    if (!amountStr) return;

    const amount = parseInt(amountStr.replace(/\D/g, ''));
    if (isNaN(amount) || amount <= 0 || amount > balance) {
      alert('Nominal tidak valid atau melebihi saldo.');
      return;
    }

    try {
      await addDoc(collection(db, 'transactions'), {
        userId: userId,
        type: 'withdraw',
        amount: amount,
        status: 'pending',
        description: 'Penarikan komisi',
        createdAt: new Date().toISOString()
      });
      alert('Permintaan penarikan berhasil dikirim. Menunggu persetujuan Finance.');
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      alert('Gagal mengirim permintaan penarikan.');
    }
  };

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stat Cards - Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Omzet */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TOTAL OMZET</p>
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">Rp0.0M</h3>
        </div>

        {/* Paket Aktif */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking_widest">PAKET AKTIF</p>
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">{stats.paketAktif}</h3>
        </div>

        {/* Komisi Agen */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md group relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">KOMISI AGEN</p>
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Rp {balance > 1000000 ? `${(balance / 1000000).toFixed(0)}jt` : balance.toLocaleString('id-ID')}</h3>
            <button 
              onClick={handleWithdrawalRequest}
              className="text-[10px] font-black text-blue-600 uppercase tracking-wider hover:underline"
            >
              TARIK
            </button>
          </div>
        </div>

        {/* Mitra/Agen */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">MITRA/AGEN</p>
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">{stats.totalJaringan}</h3>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Banner & Activities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Create Packet Banner */}
          <div className="bg-[#111827] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#00B47A] flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
                <PlusCircle className="w-8 h-8" strokeWidth={3} />
              </div>
              <div className="text-left">
                <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tight mb-1">
                  BUAT PAKET BARU
                </h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
                  PILIH KATEGORI YANG SESUAI BISNIS ANDA
                </p>
              </div>
            </div>

            <button 
              onClick={() => setShowWizard(true)}
              className="w-full md:w-auto bg-[#00B47A] hover:bg-[#009B66] text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/10 relative z-10 shrink-0"
            >
              MULAI WIZARD
            </button>
          </div>

          {/* Activities Section */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm min-h-[150px]">
             <div className="flex items-center justify-between mb-8">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">AKTIVITAS PAKET TERBARU</p>
                <div className="h-[2px] flex-grow mx-6 bg-gray-50"></div>
             </div>
             <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                  <History className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Belum ada aktivitas terbaru</p>
             </div>
          </div>

          {/* Real-Time Flight Tracker Section */}
          <FlightTrackerWidget />
        </div>

        {/* Right Column: Chart */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">GRAFIK PENJUALAN</h4>
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          </div>
          
          <div className="flex items-end justify-between gap-2 h-64 mb-8">
            {[
              { label: 'Jan', value: 40, active: false },
              { label: 'Feb', value: 30, active: false },
              { label: 'Mar', value: 65, active: false },
              { label: 'Apr', value: 45, active: false },
              { label: 'May', value: 90, active: true },
              { label: 'Jun', value: 55, active: false },
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                <div className="w-full relative bg-gray-50 rounded-lg overflow-hidden h-48">
                  <div 
                    className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out rounded-t-lg ${
                      bar.active 
                        ? 'bg-[#3B82F6] h-[90%] shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
                        : 'bg-[#F1F5F9] group-hover:bg-gray-200'
                    }`}
                    style={{ height: `${bar.value}%` }}
                  ></div>
                </div>
                <span className={`text-[10px] font-bold tracking-tight ${bar.active ? 'text-blue-500' : 'text-gray-400'}`}>
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
             <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">TOTAL SALES MEI</p>
                <p className="text-xl font-black text-gray-900 tracking-tight uppercase">Rp128.4M</p>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shadow-inner">
                <TrendingUp className="w-6 h-6" />
             </div>
          </div>
        </div>
      </div>

      {/* Referral Link - Moved to bottom or can be kept as per existing design but stylized */}
      <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row items-center gap-6">
           <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-indigo-500 shadow-sm">
              <LinkIcon className="w-5 h-5" />
           </div>
           <div className="flex-grow text-center md:text-left">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-1">Link Referral Anda</h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bagikan link ini untuk mencari jamaah.</p>
           </div>
           <div className="flex items-center gap-2 w-full md:w-auto">
              <input 
                type="text" 
                readOnly 
                value={referralLink}
                className="flex-1 md:w-64 bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-600 text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button 
                onClick={copyToClipboard}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-all active:scale-95"
              >
                {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
           </div>
        </div>
      </div>

      {showWizard && (
        <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
          <PaketMasterWizard 
            onCancel={() => setShowWizard(false)} 
            onSuccess={() => {
              setShowWizard(false);
              // Refresh logic if needed
            }}
            isMitraContext={true}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-2 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'overview' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-bold">Beranda</span>
          </button>
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'feed' ? 'text-indigo-600' : 'text-gray-400'}`}
          >
            <Zap className="w-5 h-5 text-amber-500 fill-amber-300/20" />
            <span className="text-[10px] font-bold">Feed</span>
          </button>
          <button
            onClick={() => setActiveTab('katalog')}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'katalog' ? 'text-amber-600' : 'text-gray-400'}`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] font-bold">Katalog</span>
          </button>
          <button
            onClick={() => setActiveTab('paket')}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'paket' ? 'text-indigo-600' : 'text-gray-400'}`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-bold">Produk</span>
          </button>
          <button
            onClick={() => setActiveTab('validasi')}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'validasi' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-bold">Validasi</span>
          </button>
          <button
            onClick={() => setActiveTab('jamaah')}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'jamaah' ? 'text-purple-600' : 'text-gray-400'}`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-bold">Jamaah</span>
          </button>
          <button
            onClick={() => setActiveTab('jaringan')}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'jaringan' ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-bold">Jaringan</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'profile' ? 'text-gray-900' : 'text-gray-400'}`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold">Profil</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation (Desktop Only) */}
      <div className="hidden lg:block bg-white border-b border-gray-200 px-4 py-3 print:hidden shadow-sm sticky top-0 z-10">
        <div className="container mx-auto">
          <div className="flex overflow-x-auto md:overflow-x-visible md:flex-wrap no-scrollbar gap-2 pb-1 -mb-1 md:justify-center">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                activeTab === 'overview' 
                  ? 'bg-blue-100 text-blue-800 shadow-sm ring-1 ring-blue-600/20' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <LayoutDashboard className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'overview' ? 'text-blue-700' : 'text-gray-500'}`} />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                activeTab === 'feed' 
                  ? 'bg-indigo-100 text-indigo-800 shadow-sm ring-1 ring-indigo-600/20' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <Target className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'feed' ? 'text-indigo-700' : 'text-gray-500'}`} />
              Feed Kolaborasi
            </button>
            <button
              onClick={() => setActiveTab('katalog')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                activeTab === 'katalog' 
                  ? 'bg-amber-100 text-amber-800 shadow-sm ring-1 ring-amber-600/20' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <Calendar className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'katalog' ? 'text-amber-700' : 'text-gray-500'}`} />
              Katalog Paket
            </button>
            <button
              onClick={() => setActiveTab('paket')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                activeTab === 'paket' 
                  ? 'bg-indigo-100 text-indigo-800 shadow-sm ring-1 ring-indigo-600/20' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <Package className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'paket' ? 'text-indigo-700' : 'text-gray-500'}`} />
              Kelola Paket (Markup)
            </button>
            <button
              onClick={() => setActiveTab('validasi')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                activeTab === 'validasi' 
                  ? 'bg-blue-100 text-blue-800 shadow-sm ring-1 ring-blue-600/20' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <Shield className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'validasi' ? 'text-blue-700' : 'text-gray-500'}`} />
              Tracking Validasi
            </button>
            <button
              onClick={() => setActiveTab('jamaah')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                activeTab === 'jamaah' 
                  ? 'bg-purple-100 text-purple-800 shadow-sm ring-1 ring-purple-600/20' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <Users className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'jamaah' ? 'text-purple-700' : 'text-gray-500'}`} />
              Jamaah Saya
            </button>
            <button
              onClick={() => setActiveTab('jaringan')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                activeTab === 'jaringan' 
                  ? 'bg-emerald-100 text-emerald-800 shadow-sm ring-1 ring-emerald-600/20' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <Users className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'jaringan' ? 'text-emerald-700' : 'text-gray-500'}`} />
              Jaringan Saya
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                activeTab === 'profile' 
                   ? 'bg-gray-100 text-gray-900 shadow-sm ring-1 ring-gray-600/20' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <User className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'profile' ? 'text-gray-900' : 'text-gray-500'}`} />
              Profil
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'feed' && <FeedKolaborasiView onNavigateToCatalog={() => setActiveTab('katalog')} />}
        {activeTab === 'katalog' && <KatalogPaketView />}
        {activeTab === 'paket' && <PaketMitraView />}
        {activeTab === 'validasi' && <ValidasiPaketMitraView />}
        {activeTab === 'jamaah' && <JamaahMitraView />}
        {activeTab === 'jaringan' && <JaringanMitraView />}
        {activeTab === 'profile' && <ProfileView />}
      </div>
    </div>
  );
};
