import React from 'react';
import { Search, CheckCircle2, Calendar, Plane, Clock, Star, Share2, Trash2, Edit2, ChevronRight } from 'lucide-react';
import { db, auth, collection, onSnapshot, query, where, addDoc, serverTimestamp, deleteDoc, doc } from '../firebase';
import { syncBookingToTracker } from '../utils/firebaseSync';
import { PaketMaster, Maskapai, Hotel } from '../types';
import { PaketDetailView } from './PaketDetailView';

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
  tglBerangkat?: string;
  durasiHari?: number;
  maskapaiId?: string;
  sisaKuota?: number;
  paketMasterId?: string;
  mitraId?: string;
  hargaDasar?: number;
  hargaJual?: number;
  hargaJualQuad?: number;
  hargaJualTriple?: number;
  hargaJualDouble?: number;
}

export const KatalogPaketView = () => {
  const [paketMasters, setPaketMasters] = React.useState<PaketMaster[]>([]);
  const [paketMitras, setPaketMitras] = React.useState<PaketMitra[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedPaket, setSelectedPaket] = React.useState<DisplayPaket | null>(null);
  const [bookingSuccess, setBookingSuccess] = React.useState(false);
  const [viewingDetail, setViewingDetail] = React.useState<PaketMaster | null>(null);
  const [hotels, setHotels] = React.useState<Hotel[]>([]);
  const [maskapai, setMaskapai] = React.useState<Maskapai[]>([]);

  const userId = auth.currentUser?.uid;

  React.useEffect(() => {
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

    // Fetch Hotels & Maskapai for detail view
    const unsubHotels = onSnapshot(collection(db, 'master_hotels'), (snapshot) => {
      setHotels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as Hotel));
    });

    const unsubMaskapai = onSnapshot(collection(db, 'maskapai'), (snapshot) => {
      setMaskapai(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as Maskapai));
    });

    return () => {
      unsubMaster();
      unsubMitra();
      unsubHotels();
      unsubMaskapai();
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

      const docRef = await addDoc(collection(db, 'bookings'), bookingData);
      await syncBookingToTracker(docRef.id, {
        ...bookingData,
        createdAt: new Date().toISOString()
      });
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

  const handleEdit = (e: React.MouseEvent, paket: DisplayPaket) => {
    e.stopPropagation();
    const master = paketMasters.find(m => m.id === paket.paketMasterId || m.id === paket.id);
    if (master) {
      setViewingDetail(master);
    }
  };

  const handleShare = (e: React.MouseEvent, paket: DisplayPaket) => {
    e.stopPropagation();
    const shareText = `*${paket.displayName}*\n\n📅 Berangkat: ${paket.tglBerangkat || '-'}\n💰 Harga mulai: ${formatCurrency(paket.displayPrice)}\n✈️ Maskapai: ${paket.maskapaiId || '-'}\n⏳ Durasi: ${paket.durasiHari || '-'} Hari\n\nInfo selengkapnya hubungi kami!`;
    navigator.clipboard.writeText(shareText);
    alert('Link & detail paket disalin!');
  };

  const handleDelete = async (e: React.MouseEvent, paket: DisplayPaket) => {
    e.stopPropagation();
    if (window.confirm(`Hapus paket "${paket.displayName}"?`)) {
      try {
        const collectionName = paket.type === 'master' ? 'paket_master' : 'paket_mitra';
        await deleteDoc(doc(db, collectionName, paket.id));
      } catch (error) {
        console.error("Error deleting:", error);
        alert('Gagal menghapus paket');
      }
    }
  };

  // Combine and format packages for display
  const displayPackages: DisplayPaket[] = [
    ...paketMasters.map(p => ({ 
      ...p, 
      type: 'master', 
      displayPrice: p.hargaJualQuad || p.hargaDasar || p.hargaEkonomi || 0, 
      displayName: p.nama,
      tglBerangkat: p.tglBerangkat,
      durasiHari: p.durasiHari,
      maskapaiId: p.maskapaiId,
      hargaJualQuad: p.hargaJualQuad || p.hargaDasar || p.hargaEkonomi || 0,
      hargaJualTriple: p.hargaJualTriple || (p.hargaDasar ? p.hargaDasar * 1.1 : 0),
      hargaJualDouble: p.hargaJualDouble || (p.hargaDasar ? p.hargaDasar * 1.2 : 0)
    })),
    ...paketMitras.map(p => {
      const master = paketMasters.find(m => m.id === p.paketMasterId);
      const markup = p.markup || 0;
      
      const priceQuad = (master?.hargaJualQuad || master?.hargaDasar || master?.hargaEkonomi || 0) + markup;
      const priceTriple = (master?.hargaJualTriple || 0) > 0 ? (master?.hargaJualTriple || 0) + markup : (master?.hargaDasar ? master.hargaDasar * 1.1 + markup : 0);
      const priceDouble = (master?.hargaJualDouble || 0) > 0 ? (master?.hargaJualDouble || 0) + markup : (master?.hargaDasar ? master.hargaDasar * 1.2 + markup : 0);

      return { 
        ...p, 
        type: 'mitra', 
        displayPrice: priceQuad, 
        displayName: p.namaPaketMitra,
        deskripsi: master?.deskripsi || 'Paket Umroh Spesial',
        tglBerangkat: master?.tglBerangkat,
        durasiHari: master?.durasiHari,
        maskapaiId: master?.maskapaiId,
        sisaKuota: master?.sisaKuota || 0,
        hargaJualQuad: priceQuad,
        hargaJualTriple: priceTriple,
        hargaJualDouble: priceDouble
      };
    })
  ].filter(p => p.displayName?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (viewingDetail) {
    return (
      <PaketDetailView 
        paket={viewingDetail}
        hotels={hotels}
        maskapai={maskapai}
        isMitraContext={false}
        onBack={() => setViewingDetail(null)}
        onBook={(p) => {
          // Convert PaketMaster to DisplayPaket structure for booking modal
          setSelectedPaket({
            id: p.id,
            type: 'master',
            displayName: p.nama,
            displayPrice: p.hargaJualQuad || p.hargaDasar || p.hargaEkonomi || 0,
            deskripsi: p.deskripsi || '',
            tglBerangkat: p.tglBerangkat,
            durasiHari: p.durasiHari,
            maskapaiId: p.maskapaiId,
            hargaJualQuad: p.hargaJualQuad || p.hargaDasar || p.hargaEkonomi || 0,
            hargaJualTriple: p.hargaJualTriple || (p.hargaDasar ? p.hargaDasar * 1.1 : 0),
            hargaJualDouble: p.hargaJualDouble || (p.hargaDasar ? p.hargaDasar * 1.2 : 0)
          });
        }}
      />
    );
  }

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
            <div 
              key={paket.id + index} 
              onClick={() => {
                const master = paketMasters.find(m => m.id === (paket as DisplayPaket).paketMasterId || m.id === paket.id);
                if (master) setViewingDetail(master);
              }}
              className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 group transition-all hover:shadow-xl flex flex-col cursor-pointer"
            >
              {/* Image Header with Badges & Overlays */}
            <div className="h-44 bg-gray-200 relative">
              <img 
                src={`https://images.unsplash.com/photo-${index % 3 === 0 ? '1565552643983-61629090f4fa' : index % 3 === 1 ? '1591604129939-f1efa4d9f7fa' : '1512453979798-5ea266f8880c'}?q=80&w=800&auto=format&fit=crop`} 
                alt={paket.displayName} 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
              
              {/* Top Badges */}
              <div className="absolute top-3 left-3 flex gap-2">
                <span className="bg-indigo-600/90 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">UMRAH</span>
                <span className="bg-emerald-500/90 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">AKTIF</span>
              </div>

              {/* Bottom Left Info */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white">
                <Calendar className="w-3 h-3" />
                <span className="text-[10px] font-black tracking-tight">{paket.tglBerangkat || '2026-05-15'}</span>
              </div>

              {/* Bottom Right Rating */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full">
                <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] font-black text-white">4.9</span>
              </div>
            </div>

            <div className="p-5 flex-grow flex flex-col">
              {/* Title */}
              <h3 className="text-gray-900 font-black text-sm md:text-base leading-tight uppercase italic tracking-tight mb-3">
                {paket.displayName}
              </h3>
              
              {/* Icon Info Row */}
              <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-50">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Plane className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">{paket.maskapaiId || 'SAUDI'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">{paket.durasiHari || '9'} HARI</span>
                </div>
              </div>

              {/* Price & Action Row */}
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">HARGA JUAL</p>
                  <p className="text-emerald-600 font-black text-lg md:text-xl leading-none italic tracking-tighter">
                    {formatCurrency(paket.displayPrice)}
                  </p>
                </div>
                
                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={(e) => handleEdit(e, paket)}
                    className="w-7 h-7 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={(e) => handleShare(e, paket)}
                    className="w-7 h-7 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                  >
                    <Share2 className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, paket)}
                    className="w-7 h-7 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              {/* Detail Link Footer */}
              <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">
                    {paket.sisaKuota || 12} JAMAAH TERDAFTAR
                  </span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const master = paketMasters.find(m => m.id === (paket as DisplayPaket).paketMasterId || m.id === paket.id);
                    if (master) setViewingDetail(master);
                  }}
                  className="text-indigo-600 font-black text-[9px] uppercase tracking-widest flex items-center gap-0.5 hover:gap-1.5 transition-all"
                >
                  DETAIL <ChevronRight className="w-3 h-3" />
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
                <div className="bg-gray-50 rounded-xl mb-6 border border-gray-100 overflow-hidden">
                  <div className="p-3 md:p-4 border-b border-gray-100">
                    <h4 className="font-bold text-sm md:text-base text-gray-900 mb-1">{selectedPaket.displayName}</h4>
                    <p className="text-[10px] md:text-sm text-gray-500">{selectedPaket.deskripsi}</p>
                  </div>
                  
                  <div className="p-3 md:p-4 space-y-3 bg-white">
                    <div className="flex justify-between items-center text-xs md:text-sm">
                      <span className="text-gray-600">QUAD (4 Bed)</span>
                      <span className="font-bold text-amber-600">{formatCurrency(selectedPaket.hargaJualQuad)}</span>
                    </div>
                    {selectedPaket.hargaJualTriple ? (
                      <div className="flex justify-between items-center text-xs md:text-sm">
                        <span className="text-gray-600">TRIPLE (3 Bed)</span>
                        <span className="font-bold text-amber-600">{formatCurrency(selectedPaket.hargaJualTriple)}</span>
                      </div>
                    ) : null}
                    {selectedPaket.hargaJualDouble ? (
                      <div className="flex justify-between items-center text-xs md:text-sm">
                        <span className="text-gray-600">DOUBLE (2 Bed)</span>
                        <span className="font-bold text-amber-600">{formatCurrency(selectedPaket.hargaJualDouble)}</span>
                      </div>
                    ) : null}
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
