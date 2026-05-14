import React, { useState } from 'react';
import { Search, Calendar, Star, ShieldCheck, LayoutDashboard, Package, History, User } from 'lucide-react';
import { KatalogPaketView } from './KatalogPaketView';
import { RiwayatPemesananView } from './RiwayatPemesananView';
import { ProfileView } from './ProfileView';

type JamaahTab = 'overview' | 'katalog' | 'riwayat' | 'profile';

export const DashboardJamaah = () => {
  const [activeTab, setActiveTab] = useState<JamaahTab>('overview');

  const renderOverview = () => (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Search Section */}
      <div className="bg-emerald-700 text-white py-10 md:py-16 px-4 md:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1565552643983-61629090f4fa?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center" />
        <div className="max-w-5xl mx-auto relative z-10 text-center px-2">
          <h1 className="text-2xl md:text-5xl font-bold mb-4 md:mb-6">Temukan Perjalanan Spiritual Anda</h1>
          <p className="text-emerald-100 text-sm md:text-lg mb-8 md:mb-10 max-w-2xl mx-auto hidden md:block">
            Pilih paket umroh terbaik dari berbagai pilihan terpercaya dengan harga transparan dan fasilitas terjamin.
          </p>
          
          <button 
            onClick={() => setActiveTab('katalog')}
            className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 md:px-8 md:py-3 rounded-xl font-bold text-sm md:text-base transition-colors inline-flex items-center justify-center gap-2 shadow-lg"
          >
            <Search className="w-4 h-4 md:w-5 md:h-5" />
            Lihat Katalog Paket
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-12">
        
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-3 md:gap-4">
            <div className="bg-emerald-100 p-2 md:p-3 rounded-xl text-emerald-600">
              <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1 text-sm md:text-base">Pasti Berangkat</h3>
              <p className="text-[10px] md:text-sm text-gray-500 hidden md:block">Jadwal dan maskapai terjamin sesuai dengan itinerary.</p>
            </div>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-3 md:gap-4">
            <div className="bg-blue-100 p-2 md:p-3 rounded-xl text-blue-600">
              <Star className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1 text-sm md:text-base">Fasilitas Terbaik</h3>
              <p className="text-[10px] md:text-sm text-gray-500 hidden md:block">Hotel dekat masjid dan pelayanan muthawwif berpengalaman.</p>
            </div>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-3 md:gap-4">
            <div className="bg-amber-100 p-2 md:p-3 rounded-xl text-amber-600">
              <Calendar className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1 text-sm md:text-base">Pembayaran Fleksibel</h3>
              <p className="text-[10px] md:text-sm text-gray-500 hidden md:block">Tersedia berbagai metode pembayaran dan cicilan.</p>
            </div>
          </div>
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
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'overview' ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-bold">Beranda</span>
          </button>
          <button
            onClick={() => setActiveTab('katalog')}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'katalog' ? 'text-amber-600' : 'text-gray-400'}`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-bold">Katalog</span>
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'riwayat' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] font-bold">Riwayat</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'profile' ? 'text-emerald-600' : 'text-gray-400'}`}
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
                  ? 'bg-emerald-100 text-emerald-800 shadow-sm ring-1 ring-emerald-600/20' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <LayoutDashboard className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'overview' ? 'text-emerald-700' : 'text-gray-500'}`} />
              Beranda
            </button>
            <button
              onClick={() => setActiveTab('katalog')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                activeTab === 'katalog' 
                  ? 'bg-amber-100 text-amber-800 shadow-sm ring-1 ring-amber-600/20' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <Package className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'katalog' ? 'text-amber-700' : 'text-gray-500'}`} />
              Katalog Paket
            </button>
            <button
              onClick={() => setActiveTab('riwayat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                activeTab === 'riwayat' 
                  ? 'bg-blue-100 text-blue-800 shadow-sm ring-1 ring-blue-600/20' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <History className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'riwayat' ? 'text-blue-700' : 'text-gray-500'}`} />
              Riwayat Pemesanan
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                activeTab === 'profile' 
                  ? 'bg-emerald-100 text-emerald-800 shadow-sm ring-1 ring-emerald-600/20' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <User className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === 'profile' ? 'text-emerald-700' : 'text-gray-500'}`} />
              Profil
            </button>
          </div>
        </div>
      </div>

      <div className="flex-grow">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'katalog' && (
          <div className="p-6 max-w-7xl mx-auto w-full">
            <KatalogPaketView />
          </div>
        )}
        {activeTab === 'riwayat' && (
          <div className="p-6 max-w-7xl mx-auto w-full">
            <RiwayatPemesananView />
          </div>
        )}
        {activeTab === 'profile' && (
          <div className="p-6 max-w-7xl mx-auto w-full">
            <ProfileView />
          </div>
        )}
      </div>
    </div>
  );
};
