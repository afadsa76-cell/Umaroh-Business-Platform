import React, { useState, useEffect } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';
import { db, auth, collection, onSnapshot, query, where, addDoc, serverTimestamp } from '../firebase';
import { PaketMaster } from '../types';

interface PaketMitra {
  id: string;
  paketMasterId: string;
  mitraId: string;
  namaPaketMitra: string;
  markup: number;
  hargaJual: number;
  status: string;
}

interface DisplayPaket {
  id: string;
  type: string;
  displayName: string;
  displayPrice: number;
  deskripsi: string;
  sisaKuota?: number;
  paketMasterId?: string;
  mitraId?: string;
  hargaDasar?: number;
  hargaJual?: number;
}

export const KatalogPaketView: React.FC = () => {
  const [paketMasters, setPaketMasters] = useState<PaketMaster[]>([]);
  const [paketMitras, setPaketMitras] = useState<PaketMitra[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaket, setSelectedPaket] = useState<DisplayPaket | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    // Fetch published Paket Master
    const qMaster = query(collection(db, 'paket_master'), where('status', '==', 'published'));
    const unsubMaster = onSnapshot(qMaster, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaketMaster));
      setPaketMasters(data);
    });

    // Fetch active Paket Mitra
    const qMitra = query(collection(db, 'paket_mitra'), where('status', '==', 'active'));
    const unsubMitra = onSnapshot(qMitra, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaketMitra));
      setPaketMitras(data);
    });

    return () => {
      unsubMaster();
      unsubMitra();
    };
  }, []);

  const handleBooking = async () => {
    if (!selectedPaket || !userId) return;

    try {
      const isMitraPaket = !!selectedPaket.paketMasterId;
      
      const bookingData = {
        jamaahId: userId,
        paketId: selectedPaket.id,
        jenisPaket: isMitraPaket ? 'mitra' : 'master',
        mitraId: isMitraPaket ? selectedPaket.mitraId : null,
        statusPembayaran: 'pending',
        statusKeberangkatan: 'menunggu',
        totalHarga: isMitraPaket ? selectedPaket.hargaJual : selectedPaket.hargaDasar,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'bookings'), bookingData);
      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setSelectedPaket(null);
      }, 3000);
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Gagal membuat pemesanan. Silakan coba lagi.");
    }
  };

  const formatCurrency = (amount: number | string | undefined | null) => {
    const val = typeof amount === 'number' ? amount : Number(amount || 0);
    if (isNaN(val)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Math.round(val));
  };

  // Combine and format packages for display
  const displayPackages = [
    ...paketMasters.map(p => ({ ...p, type: 'master', displayPrice: p.hargaJualQuad || p.hargaDasar, displayName: p.nama })),
    ...paketMitras.map(p => {
      const master = paketMasters.find(m => m.id === p.paketMasterId);
      const calculatedPrice = (master?.hargaJualQuad || master?.hargaDasar || 0) + (p.markup || 0);
      return { 
        ...p, 
        type: 'mitra', 
        displayPrice: calculatedPrice, 
        displayName: p.namaPaketMitra,
        deskripsi: master?.deskripsi || 'Paket Umroh Spesial',
        sisaKuota: master?.sisaKuota || 0
      };
    })
  ].filter(p => p.displayName?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="bg-white p-1.5 md:p-2 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-2 w-full relative z-20">
        <div className="flex-1 flex items-center px-3 md:px-4 py-2 md:py-3 bg-gray-50 rounded-lg md:rounded-xl border border-gray-100">
          <Search className="w-4 h-4 md:w-5 md:h-5 text-gray-400 mr-2 md:mr-3" />
          <input 
            type="text" 
            placeholder="Cari nama paket..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-xs md:text-sm text-gray-700" 
          />
        </div>
      </div>

      {/* Package Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {displayPackages.map((paket, index) => (
          <div key={paket.id + index} className="bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col">
            <div className="h-40 md:h-48 bg-gray-200 relative">
              <img src={`https://images.unsplash.com/photo-${index % 2 === 0 ? '1565552643983-61629090f4fa' : '1591604129939-f1efa4d9f7fa'}?q=80&w=800&auto=format&fit=crop`} alt="Makkah" className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-white/90 backdrop-blur-sm px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold text-emerald-700">
                Tersedia: {paket.sisaKuota} Seat
              </div>
              {paket.type === 'mitra' && (
                <div className="absolute top-3 right-3 md:top-4 md:right-4 bg-amber-500 text-white px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold shadow-sm">
                  Paket Spesial
                </div>
              )}
            </div>
            <div className="p-4 md:p-5 flex-grow flex flex-col">
              <h3 className="font-bold text-base md:text-lg text-gray-900 mb-1 md:mb-2">{paket.displayName}</h3>
              <p className="text-[10px] md:text-sm text-gray-500 mb-3 md:mb-4 line-clamp-2 flex-grow">{paket.deskripsi}</p>
              <div className="flex justify-between items-center pt-3 md:pt-4 border-t border-gray-100 mt-auto">
                <div>
                  <p className="text-[8px] md:text-xs text-gray-500">Harga</p>
                  <p className="font-bold text-amber-600 text-sm md:text-lg">{formatCurrency(paket.displayPrice)}</p>
                </div>
                <button 
                  onClick={() => setSelectedPaket(paket)}
                  className="bg-emerald-50 text-emerald-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[10px] md:text-sm font-bold hover:bg-emerald-100 transition-colors"
                >
                  Pesan
                </button>
              </div>
            </div>
          </div>
        ))}

        {displayPackages.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            Tidak ada paket yang ditemukan.
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {selectedPaket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 md:p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            {bookingSuccess ? (
              <div className="text-center py-6 md:py-8">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Pemesanan Berhasil!</h3>
                <p className="text-[10px] md:text-sm text-gray-500">Tim kami akan segera menghubungi Anda untuk proses selanjutnya.</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Konfirmasi Pemesanan</h3>
                <div className="bg-gray-50 p-3 md:p-4 rounded-xl mb-6 border border-gray-100">
                  <h4 className="font-bold text-sm md:text-base text-gray-900 mb-1">{selectedPaket.displayName}</h4>
                  <p className="text-[10px] md:text-sm text-gray-500 mb-4">{selectedPaket.deskripsi}</p>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-[10px] md:text-sm text-gray-600 font-medium">Total Harga</span>
                    <span className="font-black text-amber-600 text-base md:text-lg">{formatCurrency(selectedPaket.displayPrice)}</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setSelectedPaket(null)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleBooking}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Konfirmasi
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
