import React, { useState, useEffect } from 'react';
import { Package, Clock, ArrowRight } from 'lucide-react';
import { db, auth, collection, onSnapshot, query, where, doc, handleFirestoreError, OperationType } from '../firebase';

interface Booking {
  id: string;
  paketId: string;
  jenisPaket: string;
  statusPembayaran: string;
  statusKeberangkatan: string;
  totalHarga: number;
  jumlahBayar?: number;
  namaJamaah?: string;
  noHp?: string;
  tglKeberangkatan?: string;
  tgl_keberangkatan?: string;
  createdAt?: unknown;
}

interface PaketInfo {
  id: string;
  nama: string;
  tanggalBerangkat?: string;
  durasi?: string;
  maskapai?: string;
  hotelMakkah?: string;
  hotelMadinah?: string;
}

export const RiwayatPemesananView: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [paketInfo, setPaketInfo] = useState<Record<string, PaketInfo>>({});
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    const unsubs: (() => void)[] = [];

    const q = query(collection(db, 'bookings'), where('jamaahId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data);
      setLoading(false);
      
      // Clean up previous sub-listeners
      while (unsubs.length > 0) {
        const unsub = unsubs.pop();
        if (unsub) unsub();
      }

      // Fetch related package info using direct document listeners for efficiency
      data.forEach(booking => {
        if (!booking.paketId) return;
        const collectionName = booking.jenisPaket === 'mitra' ? 'paket_mitra' : 'paket_master';
        const docRef = doc(db, collectionName, booking.paketId);
        
        const unsubDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const paketData = docSnap.data();
            setPaketInfo(prev => ({
              ...prev,
              [booking.paketId]: {
                id: booking.paketId,
                nama: booking.jenisPaket === 'mitra' ? (paketData.namaPaketMitra || paketData.nama || '') : (paketData.nama || ''),
              }
            }));
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `${collectionName}/${booking.paketId}`);
        });
        unsubs.push(unsubDoc);
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    return () => {
      unsubscribe();
      unsubs.forEach(unsub => unsub());
    };
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
                    <button 
                      onClick={() => setSelectedBooking(booking)}
                      className="text-emerald-600 font-bold text-sm hover:text-emerald-700 flex items-center gap-1 md:justify-end w-full cursor-pointer"
                    >
                      Lihat Detail <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAIL BOOKING MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full relative shadow-2xl p-6 overflow-y-auto max-h-[90vh] font-sans">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm z-10 transition cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <span className="text-2xl">🕋</span>
                <div>
                  <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wider">
                    Detail Transaksi Pemesanan
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono font-bold">
                    ID: {selectedBooking.id}
                  </p>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase">Nama Paket Program</p>
                <p className="text-base font-extrabold text-emerald-900">
                  {paketInfo[selectedBooking.paketId]?.nama || 'Paket Umroh Reguler'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${getStatusColor(selectedBooking.statusPembayaran)}`}>
                    Status: {getStatusText(selectedBooking.statusPembayaran)}
                  </span>
                  <span className="text-xs text-gray-500">• Keberangkatan: {getStatusText(selectedBooking.statusKeberangkatan)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-medium text-gray-700">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Nama Jamaah</span>
                  <strong className="text-gray-900">{selectedBooking.namaJamaah || auth.currentUser?.displayName || 'Jamaah Umaroh'}</strong>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Tanggal Keberangkatan</span>
                  <strong className="text-gray-900">{selectedBooking.tglKeberangkatan || selectedBooking.tgl_keberangkatan || 'Sesuai Jadwal'}</strong>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Harga Paket</span>
                  <strong className="text-emerald-700 font-mono font-extrabold">{formatCurrency(selectedBooking.totalHarga || 0)}</strong>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Jumlah Terbayar</span>
                  <strong className="text-amber-600 font-mono font-extrabold">{formatCurrency(selectedBooking.jumlahBayar || 0)}</strong>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl text-xs space-y-1.5 text-gray-600">
                <p className="font-bold text-gray-800 text-[11px] uppercase tracking-wider mb-1">ℹ️ Catatan Sistem Umaroh Synergy</p>
                <p>• Seluruh kwitansi dan pembayaran disinkronkan secara otomatis ke tim keuangan cabang & admin pusat.</p>
                <p>• Bila ada perubahan paspor atau tanggal lahir, harap perbarui di tab <strong>Travel Dok</strong> pada portal jamaah mandiri.</p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Tutup Detail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
