import React, { useState, useEffect } from 'react';
import { Wallet, Users, Package, Link as LinkIcon, ArrowUpRight, Copy, CheckCircle2, History, LayoutDashboard, Calendar, User } from 'lucide-react';
import { auth, db, doc, onSnapshot, addDoc, collection } from '../firebase';
import { PaketMitraView } from './PaketMitraView';
import { KatalogPaketView } from './KatalogPaketView';
import { JamaahMitraView } from './JamaahMitraView';
import { JaringanMitraView } from './JaringanMitraView';
import { ProfileView } from './ProfileView';

type MitraTab = 'overview' | 'katalog' | 'paket' | 'jamaah' | 'jaringan' | 'profile';

export const DashboardMitra = () => {
  const [activeTab, setActiveTab] = useState<MitraTab>('overview');
  const [balance, setBalance] = useState(0);
  const [copied, setCopied] = useState(false);
  const userId = auth.currentUser?.uid;
  const referralLink = `https://umaroh.com/register?ref=${userId}`;

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onSnapshot(doc(db, 'wallets', userId), (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().balance || 0);
      }
    });
    return () => unsubscribe();
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Saldo Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-4 md:p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4 hidden sm:block">
            <Wallet className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <p className="text-blue-100 font-medium mb-1 text-xs md:text-base">Saldo Komisi</p>
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Rp {balance.toLocaleString('id-ID')}
            </h2>
            <div className="flex gap-2 md:gap-3">
              <button 
                onClick={handleWithdrawalRequest}
                className="bg-white text-blue-700 px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-[10px] md:text-sm flex items-center gap-1 md:gap-2 hover:bg-blue-50 transition-colors"
              >
                <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" />
                Tarik
              </button>
              <button className="bg-blue-700 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-[10px] md:text-sm flex items-center gap-1 md:gap-2 hover:bg-blue-600 transition-colors">
                <History className="w-3 h-3 md:w-4 md:h-4" />
                Riwayat
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
            <div className="bg-emerald-100 p-2 md:p-3 rounded-xl text-emerald-600">
              <Users className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-[10px] md:text-sm font-medium">Total Jamaah</p>
              <h3 className="text-lg md:text-2xl font-bold text-gray-900">0</h3>
            </div>
          </div>
          <button onClick={() => setActiveTab('jaringan')} className="text-emerald-600 text-[10px] md:text-sm font-bold flex items-center gap-1 hover:text-emerald-700">
            Lihat Jaringan <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" />
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
            <div className="bg-amber-100 p-2 md:p-3 rounded-xl text-amber-600">
              <Package className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-[10px] md:text-sm font-medium">Paket Aktif</p>
              <h3 className="text-lg md:text-2xl font-bold text-gray-900">0</h3>
            </div>
          </div>
          <button onClick={() => setActiveTab('paket')} className="text-amber-600 text-[10px] md:text-sm font-bold flex items-center gap-1 hover:text-amber-700">
            Kelola Paket <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" />
          </button>
        </div>
      </div>

      {/* Referral Section */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-3 md:mb-4">
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
            <LinkIcon className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <h3 className="text-sm md:text-lg font-bold text-gray-900">Link Referral Anda</h3>
        </div>
        <p className="text-gray-500 text-[10px] md:text-sm mb-4 hidden md:block">
          Bagikan link ini untuk merekrut jamaah atau mitra baru ke dalam jaringan Anda. Anda akan mendapatkan komisi dari setiap transaksi mereka.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <input 
            type="text" 
            readOnly 
            value={referralLink}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 md:px-4 md:py-2 text-gray-600 text-[10px] md:text-sm focus:outline-none"
          />
          <button 
            onClick={copyToClipboard}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] md:text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            {copied ? <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" /> : <Copy className="w-3 h-3 md:w-4 md:h-4" />}
            {copied ? 'Tersalin!' : 'Salin Link'}
          </button>
        </div>
      </div>
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
        {activeTab === 'katalog' && <KatalogPaketView />}
        {activeTab === 'paket' && <PaketMitraView />}
        {activeTab === 'jamaah' && <JamaahMitraView />}
        {activeTab === 'jaringan' && <JaringanMitraView />}
        {activeTab === 'profile' && <ProfileView />}
      </div>
    </div>
  );
};
