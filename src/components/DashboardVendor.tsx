import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, where } from '../firebase';
import { Building2, Plane, Calendar, Sliders, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { TabType } from './Navbar';

interface DashboardVendorProps {
  vendorName: string;
  vendorType: string | null;
  onNavigate: (tab: TabType) => void;
  isMasterView?: boolean;
}

export const DashboardVendor: React.FC<DashboardVendorProps> = ({ vendorName, vendorType, onNavigate, isMasterView = false }) => {
  const [totalItems, setTotalItems] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeItems, setActiveItems] = useState(0);
  const [selectedType, setSelectedType] = useState<'vendor_maskapai' | 'vendor_hotel'>('vendor_maskapai');

  useEffect(() => {
    const currentType = isMasterView ? selectedType : vendorType;

    if (isMasterView) {
      if (currentType === 'vendor_maskapai') {
        const q = collection(db, 'maskapai');
        const unsubscribe = onSnapshot(q, (snapshot) => {
          setTotalItems(snapshot.size);
          
          let latest: Date | null = null;
          let activeCount = 0;
          const now = new Date();
          
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.updatedAt) {
              const d = new Date(data.updatedAt);
              if (!latest || d > latest) latest = d;
            }
            if (data.tanggalKeberangkatan) {
              const depDate = new Date(data.tanggalKeberangkatan);
              if (depDate >= now) activeCount++;
            } else {
              activeCount++;
            }
          });
          
          setActiveItems(activeCount);
          if (latest) {
            setLastUpdated((latest as Date).toLocaleString('id-ID'));
          } else {
            setLastUpdated(null);
          }
        });
        return unsubscribe;
      } else if (currentType === 'vendor_hotel') {
        const q = collection(db, 'master_hotels');
        const unsubscribe = onSnapshot(q, (snapshot) => {
          setTotalItems(snapshot.size);
          
          let latest: Date | null = null;
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.updatedAt) {
              const d = new Date(data.updatedAt);
              if (!latest || d > latest) latest = d;
            }
          });
          
          setActiveItems(snapshot.size);
          if (latest) {
            setLastUpdated((latest as Date).toLocaleString('id-ID'));
          } else {
            setLastUpdated(null);
          }
        });
        return unsubscribe;
      }
    } else {
      if (!vendorName) return;

      if (currentType === 'vendor_maskapai') {
        const q = query(collection(db, 'maskapai'), where('namaVendor', '==', vendorName));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          setTotalItems(snapshot.size);
          
          let latest: Date | null = null;
          let activeCount = 0;
          const now = new Date();
          
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.updatedAt) {
              const d = new Date(data.updatedAt);
              if (!latest || d > latest) latest = d;
            }
            if (data.tanggalKeberangkatan) {
              const depDate = new Date(data.tanggalKeberangkatan);
              if (depDate >= now) activeCount++;
            } else {
              activeCount++;
            }
          });
          
          setActiveItems(activeCount);
          if (latest) {
            setLastUpdated((latest as Date).toLocaleString('id-ID'));
          } else {
            setLastUpdated(null);
          }
        });
        return unsubscribe;
      } else if (currentType === 'vendor_hotel') {
        const q = query(collection(db, 'master_hotels'), where('vendor', '==', vendorName));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          setTotalItems(snapshot.size);
          
          let latest: Date | null = null;
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.updatedAt) {
              const d = new Date(data.updatedAt);
              if (!latest || d > latest) latest = d;
            }
          });
          
          setActiveItems(snapshot.size); // All registered hotels are considered active
          if (latest) {
            setLastUpdated((latest as Date).toLocaleString('id-ID'));
          } else {
            setLastUpdated(null);
          }
        });
        return unsubscribe;
      }
    }
  }, [vendorName, vendorType, isMasterView, selectedType]);

  const isMaskapai = (isMasterView ? selectedType : vendorType) === 'vendor_maskapai';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      {/* Selector toggle for Master Admin view */}
      {isMasterView && (
        <div className="flex bg-white p-1 rounded-2xl border border-gray-150 shadow-sm max-w-md mb-6">
          <button
            onClick={() => setSelectedType('vendor_maskapai')}
            className={`flex-1 py-2.5 text-center text-xs font-black rounded-xl transition-all duration-300 uppercase tracking-wider ${selectedType === 'vendor_maskapai' ? 'bg-indigo-600 text-gray-950 shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            ✈️ Vendor Airline
          </button>
          <button
            onClick={() => setSelectedType('vendor_hotel')}
            className={`flex-1 py-2.5 text-center text-xs font-black rounded-xl transition-all duration-300 uppercase tracking-wider ${selectedType === 'vendor_hotel' ? 'bg-indigo-600 text-gray-950 shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            🏨 Vendor Hotel
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden mb-8 border border-indigo-950">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center" />
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-white/5 blur-xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-44 h-44 rounded-full bg-white/5 blur-xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold mb-4 border border-white/5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Portal Kerjasama Vendor Resmi
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2 uppercase select-none">
            Selamat Datang, {isMasterView ? "Master Admin" : vendorName}!
          </h1>
          <p className="text-indigo-200 text-xs md:text-sm max-w-xl font-medium mb-0">
            {isMasterView 
              ? "Tinjau dan monitor seluruh data penawaran harga dari semua vendor maskapai dan akomodasi hotel secara real-time."
              : "Kelola data penawaran harga Anda secara mandiri untuk mendukung penyusunan paket oleh tim Umaroh secara akurat dan real-time."}
          </p>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-150 shadow-sm transition-transform duration-300 hover:scale-[1.02] flex items-center gap-4">
          <div className="p-4 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
            {isMaskapai ? <Plane className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total {isMaskapai ? 'Penerbangan' : 'Hotel'} Terdaftar</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{totalItems}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-150 shadow-sm transition-transform duration-300 hover:scale-[1.02] flex items-center gap-4">
          <div className="p-4 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Penawaran {isMaskapai ? 'Aktif' : 'Tersedia'}</p>
            <h3 className="text-2xl font-black text-emerald-700 mt-1">{activeItems}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-150 shadow-sm transition-transform duration-300 hover:scale-[1.02] flex items-center gap-4">
          <div className="p-4 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Terakhir Diperbarui</p>
            <h3 className="text-sm font-black text-gray-900 mt-2 truncate w-[200px]" title={lastUpdated || 'Belum ada update'}>
              {lastUpdated || 'Belum ada data'}
            </h3>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Panels */}
      <div className="bg-white rounded-2xl p-6 border border-gray-150 shadow-sm mb-8">
        <h2 className="text-base font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600" />
          Layanan Cepat Vendor
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-indigo-55/5 border border-indigo-100 hover:border-indigo-300 transition-all duration-300 flex flex-col justify-between h-44">
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 border border-indigo-200 tracking-wider">
                {isMaskapai ? 'MASKAPAI AIRLINE' : 'ACCOMMODATION HOTEL'}
              </span>
              <h3 className="text-base font-extrabold text-gray-900 mt-2.5">
                Update Harga {isMaskapai ? 'Tiket Pesawat' : 'Kamar Hotel'}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1 font-medium">
                Sesuaikan {isMaskapai ? 'harga beli tiket, nomor penerbangan, & sisa seat penerbangan' : 'harga seasonal room, tipe kamar, & ketersediaan hotel'} Anda.
              </p>
            </div>
            <button
              onClick={() => onNavigate(isMaskapai ? 'vendor-maskapai' : 'vendor-hotel')}
              className="mt-4 flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-750 transition-colors uppercase tracking-wider text-left focus:outline-none"
            >
              Menuju Halaman Pengisian <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-amber-55/5 border border-amber-100 hover:border-amber-300 transition-all duration-300 flex flex-col justify-between h-44">
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-700 border border-amber-200 tracking-wider">
                PROFIL VENDOR SAYA
              </span>
              <h3 className="text-base font-extrabold text-gray-900 mt-2.5">
                Kelola Profil Akun & Kontak
              </h3>
              <p className="text-[11px] text-gray-500 mt-1 font-medium">
                Perbarui detail kontak penanggung jawab, nama instansi, nomor hp, & alamat resmi vendor Anda.
              </p>
            </div>
            <button
              onClick={() => onNavigate('profile')}
              className="mt-4 flex items-center gap-1.5 text-xs font-black text-amber-700 hover:text-amber-800 transition-colors uppercase tracking-wider text-left focus:outline-none"
            >
              Lihat Detail Profil <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
