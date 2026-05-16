import React, { useState, useEffect } from 'react';
import { Package, Clock, ArrowRight } from 'lucide-react';
import { db, auth, collection, onSnapshot, query, where } from '../firebase';

interface Booking {
  id: string;
  paketId: string;
  jenisPaket: string;
  statusPembayaran: string;
  statusKeberangkatan: string;
  totalHarga: number;
}

interface PaketInfo {
  id: string;
  nama: string;
  tanggalBerangkat?: string;
}

export const RiwayatPemesananView: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [paketInfo, setPaketInfo] = useState<Record<string, PaketInfo>>({});
  const [loading, setLoading] = useState(true);

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    const q = query(collection(db, 'bookings'), where('jamaahId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data);
      setLoading(false);
      
      // Fetch related package info
      data.forEach(booking => {
        const collectionName = booking.jenisPaket === 'mitra' ? 'paket_mitra' : 'paket_master';
        onSnapshot(collection(db, collectionName), (paketSnap) => {
          const paketData = paketSnap.docs.find(d => d.id === booking.paketId)?.data();
          if (paketData) {
            setPaketInfo(prev => ({
              ...prev,
              [booking.paketId]: {
                id: booking.paketId,
                nama: booking.jenisPaket === 'mitra' ? paketData.namaPaketMitra : paketData.nama,
              }
            }));
          }
        });
      });
    });

    return () => unsubscribe();
  }, [userId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'lunas': return 'bg-emerald-100 text-emerald-800';
      case 'dp': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'selesai': return 'bg-purple-100 text-purple-800';
      case 'siap_berangkat': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'lunas': return 'Lunas';
      case 'dp': return 'DP Dibayar';
      case 'pending': return 'Menunggu Pembayaran';
      case 'selesai': return 'Selesai';
      case 'siap_berangkat': return 'Siap Berangkat';
      case 'proses_visa': return 'Proses Visa';
      case 'menunggu': return 'Menunggu Jadwal';
      default: return status;
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Memuat data pemesanan...</div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Pemesanan</h3>
        <p className="text-gray-500">Anda belum melakukan pemesanan paket umroh. Silakan lihat Katalog Paket untuk mulai merencanakan ibadah Anda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Riwayat Pemesanan Saya</h2>
      
      <div className="grid grid-cols-1 gap-6">
        {bookings.map(booking => {
          const info = paketInfo[booking.paketId];
          
          return (
            <div key={booking.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">ID: {booking.id.substring(0, 8)}</span>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(booking.statusPembayaran)}`}>
                      {getStatusText(booking.statusPembayaran)}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {info ? info.nama : 'Memuat nama paket...'}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Status: {getStatusText(booking.statusKeberangkatan)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="md:text-right flex flex-col justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Pembayaran</p>
                    <p className="text-2xl font-black text-amber-600">{formatCurrency(booking.totalHarga)}</p>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <button className="text-emerald-600 font-bold text-sm hover:text-emerald-700 flex items-center gap-1 md:justify-end w-full">
                      Lihat Detail <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
