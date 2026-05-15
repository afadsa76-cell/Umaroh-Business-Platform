import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Search, ArrowRight, Star, Building2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { db, auth, collection, onSnapshot, doc, deleteDoc, query, where, updateDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { PaketMasterWizard } from './PaketMasterWizard';

interface PaketMaster {
  id: string;
  nama: string;
  deskripsi: string;
  hargaDasar: number;
  hargaJualQuad?: number;
  maskapaiId: string;
  hotelMakkahId?: string;
  hotelMadinahId?: string;
  kuota: number;
  sisaKuota: number;
  status: 'draft' | 'published' | 'closed';
  hMakkah?: any;
  hMadinah?: any;
  durasiMakkah?: number;
  durasiMadinah?: number;
  mitraId?: string;
}

interface PaketMitra {
  id: string;
  paketMasterId: string;
  mitraId: string;
  namaPaketMitra: string;
  markup: number;
  hargaJual: number;
  status: 'active' | 'inactive';
  createdAt?: any;
}

export const PaketMitraView: React.FC = () => {
  const [paketMasters, setPaketMasters] = useState<PaketMaster[]>([]);
  const [paketMitras, setPaketMitras] = useState<PaketMitra[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showOnlyMyPaket, setShowOnlyMyPaket] = useState(false);
  
  // States for Wizard
  const [isAddingNewMaster, setIsAddingNewMaster] = useState(false);
  const [editingMaster, setEditingMaster] = useState<any | null>(null);
  const [isMarkingUp, setIsMarkingUp] = useState(false);
  const [markupInitialData, setMarkupInitialData] = useState<any | null>(null);

  const userId = auth.currentUser?.uid || 'mitra-dummy-id';

  const showNotification = (type: 'success'|'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const [hotels, setHotels] = useState<any[]>([]);
  const [maskapai, setMaskapai] = useState<any[]>([]);

  const [trackerPakets, setTrackerPakets] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Check user role
    const unsubUser = onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists()) {
        setUserRole(doc.data().role);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    });

    // Fetch published Paket Master (Admin ones + Mine)
    const qMaster = query(collection(db, 'paket_master'));
    const unsubMaster = onSnapshot(qMaster, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaketMaster));
      // Show only published ones OR drafts/packages created by the current mitra OR if user is admin
      const filtered = data.filter(m => m.status === 'published' || m.mitraId === userId || userRole === 'admin' || userRole === 'operasional');
      setPaketMasters(filtered);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'paket_master');
    });

    // Fetch Hotels
    const unsubHotels = onSnapshot(collection(db, 'master_hotels'), (snapshot) => {
      setHotels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'master_hotels');
    });

    // Fetch Maskapai
    const unsubMaskapai = onSnapshot(collection(db, 'maskapai'), (snapshot) => {
      setMaskapai(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'maskapai');
    });

    // Fetch Tracker Paket
    const unsubTracker = onSnapshot(collection(db, 'tracker_paket'), (snapshot) => {
      setTrackerPakets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tracker_paket');
    });

    // Fetch Paket Mitra for this user
    const qMitra = query(collection(db, 'paket_mitra'), where('mitraId', '==', userId));
    const unsubMitra = onSnapshot(qMitra, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaketMitra));
      setPaketMitras(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'paket_mitra');
    });

    return () => {
      unsubUser();
      unsubMaster();
      unsubHotels();
      unsubMaskapai();
      unsubTracker();
      unsubMitra();
    };
  }, [userId, userRole]);

  const handleValidateMaster = async (id: string) => {
    try {
      await updateDoc(doc(db, 'paket_master', id), {
        status: 'published',
        validationStatus: 'approved',
        updatedAt: serverTimestamp()
      });
      showNotification('success', 'Paket berhasil divalidasi!');
    } catch (error) {
      console.error("Error validating paket:", error);
      handleFirestoreError(error, OperationType.UPDATE, `paket_master/${id}`);
      showNotification('error', 'Gagal memvalidasi paket');
    }
  };

  const getHotelStars = (hotelId: string) => {
    const hotel = hotels.find(h => h.id === hotelId);
    return hotel?.bintang || 5;
  };

  const getMaskapaiInfo = (maskapaiId: string) => {
    const m = maskapai.find(item => item.id === maskapaiId);
    return m ? m.name : 'Maskapai';
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'paket_mitra', id));
      setDeleteConfirm(null);
      showNotification('success', 'Paket Mitra berhasil dihapus');
    } catch (error) {
      console.error("Error deleting paket mitra:", error);
      handleFirestoreError(error, OperationType.DELETE, `paket_mitra/${id}`);
      showNotification('error', 'Gagal menghapus data paket mitra.');
    }
  };

  const startEdit = (paket: PaketMitra) => {
    const master = paketMasters.find(m => m.id === paket.paketMasterId);
    if (!master) return;

    // Use wizard instead of markup modal
    setMarkupInitialData({
      ...master,
      ...paket,
      id: paket.id, // Keep the paket_mitra ID
      paketMasterId: paket.paketMasterId,
      nama: paket.namaPaketMitra,
      markup: paket.markup,
      isMarkupOnly: true
    });
    setIsMarkingUp(true);
  };

  const handleOpenMarkup = (master: PaketMaster) => {
    // Use wizard instead of markup modal
    setMarkupInitialData({
      ...master,
      paketMasterId: master.id,
      nama: master.nama,
      markup: 1000000,
      isMarkupOnly: true,
      mitraId: userId
    });
    setIsMarkingUp(true);
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

  const filteredPaketMasters = paketMasters.filter(m => 
    m.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // When Mitra creates a master package via Wizard, we auto-assign their userId
  const handleCreateNewMaster = () => {
    setIsAddingNewMaster(true);
    setEditingMaster(null);
  };

  if (isAddingNewMaster || editingMaster || isMarkingUp) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <PaketMasterWizard 
          initialData={isMarkingUp ? markupInitialData : (editingMaster ? { ...editingMaster, mitraId: userId } : { mitraId: userId, status: 'draft' })}
          isMitraContext={true}
          onCancel={() => {
            setIsAddingNewMaster(false);
            setEditingMaster(null);
            setIsMarkingUp(false);
            setMarkupInitialData(null);
          }}
          onSuccess={() => {
            setIsAddingNewMaster(false);
            setEditingMaster(null);
            setIsMarkingUp(false);
            setMarkupInitialData(null);
            showNotification('success', 'Paket berhasil diperbarui!');
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white font-medium transition-all ${
          notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Kelola Paket Jualan
          </h2>
          <p className="text-gray-500 text-sm mt-1">Pilih Paket Master dari database, buat markup (komisi), atau buat paket baru dari nol.</p>
        </div>
        
        <button 
          onClick={handleCreateNewMaster}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black italic uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-xl shadow-indigo-600/20 group"
        >
          <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
          Buat Paket Baru
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari nama paket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setShowOnlyMyPaket(false)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${!showOnlyMyPaket ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Tersedia di Database
          </button>
          <button 
            onClick={() => setShowOnlyMyPaket(true)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${showOnlyMyPaket ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Paket Saya ({paketMitras.length})
          </button>
        </div>
      </div>

      {!showOnlyMyPaket ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPaketMasters.map((paket) => (
            <div key={paket.id} className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 relative group transition-all hover:scale-[1.02]">
              <div className="h-48 bg-gray-900 relative">
                <img 
                  src={`https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=800&auto=format&fit=crop`} 
                  alt="Makkah" 
                  className="w-full h-full object-cover opacity-60" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                <div className="absolute top-4 left-4 flex gap-2">
                  <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white border border-white/30 uppercase tracking-widest">
                    {paket.kuota} SEAT TOTAL
                  </div>
                  {paket.mitraId === userId && (
                    <div className={`${paket.status === 'pending_validation' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-amber-500 text-white'} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border`}>
                      {paket.status === 'pending_validation' ? 'Menunggu Validasi' : 'Custom Master'}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-4 left-6 right-6">
                  <h3 className="text-white font-black text-xl leading-tight uppercase italic tracking-tighter">{paket.nama}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Program Master Premium</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest border-b border-gray-50 pb-2">
                    <span>Harga Dasar Master</span>
                    <span className="text-gray-900 font-bold">Rp {Math.round(paket.hargaDasar).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                      {getMaskapaiInfo(paket.maskapaiId)} • Bintang {getHotelStars(paket.hotelMakkahId || '')}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {(userRole === 'admin' || userRole === 'operasional') && paket.status === 'pending_validation' ? (
                    <button 
                      onClick={() => handleValidateMaster(paket.id)}
                      className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 py-3 rounded-2xl font-black italic uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 group shadow-lg shadow-emerald-600/20"
                    >
                      Validasi Sekarang
                      <CheckCircle2 className="w-3 h-3" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleOpenMarkup(paket)}
                      disabled={paket.status === 'pending_validation'}
                      className={`flex-1 ${paket.status === 'pending_validation' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'} py-3 rounded-2xl font-black italic uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 group`}
                    >
                      {paket.status === 'pending_validation' ? 'Sedang Divalidasi' : 'Markup & Publish'}
                      {paket.status !== 'pending_validation' && <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />}
                    </button>
                  )}
                  {paket.mitraId === userId && (
                    <button 
                      onClick={() => setEditingMaster(paket)}
                      className="p-3 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-all"
                      title="Edit Master"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Tracker Section - Admin operational status */}
                {(() => {
                  const tracker = trackerPakets.find(t => t.namaPaket === paket.nama || t.id === paket.id);
                  if (!tracker) return null;
                  return (
                    <div className="mt-4 pt-4 border-t border-gray-50 animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Tracker Operasional
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[7px] font-black ${
                          tracker.status === 'Siap Berangkat' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {tracker.status || 'Persiapan'}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { label: 'Visa', done: tracker.checklist?.statusVisa === 'Issued' },
                          { label: 'Tiket', done: tracker.checklist?.statusTiket === 'Issued' },
                          { label: 'Hotel', done: tracker.checklist?.statusHotelMakkah === 'Paid' },
                          { label: 'Bus', done: tracker.checklist?.statusBus === 'Paid' }
                        ].map((item, idx) => (
                          <div key={idx} className={`p-1.5 rounded-lg text-center transition-all ${item.done ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-50 text-gray-400 border border-transparent'}`}>
                            <div className="text-[7px] font-black uppercase mb-0.5 leading-none">{item.label}</div>
                            {item.done ? <CheckCircle2 className="w-2.5 h-2.5 mx-auto" /> : <Clock className="w-2.5 h-2.5 mx-auto" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}

          {filteredPaketMasters.length === 0 && (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium tracking-widest text-xs uppercase">Tidak ada paket master yang tersedia</p>
              <button 
                onClick={handleCreateNewMaster}
                className="mt-4 text-indigo-600 font-bold text-sm uppercase tracking-widest hover:underline"
              >
                Buat Paket Master Pertama Anda
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-900 text-[#FDB913] text-[10px] uppercase tracking-widest font-black">
                <tr>
                  <th className="px-6 py-4">Nama Paket Anda</th>
                  <th className="px-6 py-4">Sumber Master</th>
                  <th className="px-6 py-4">Status Operasional</th>
                  <th className="px-6 py-4 text-right">Harga Jual</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paketMitras.map((paket) => {
                  const master = paketMasters.find(m => m.id === paket.paketMasterId);
                  const tracker = trackerPakets.find(t => t.namaPaket === master?.nama || t.id === master?.id);

                  return (
                    <tr key={paket.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-black italic text-gray-900 uppercase tracking-tighter text-sm">{paket.namaPaketMitra}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                          Dibuat: {paket.createdAt?.toDate ? (
                            (() => {
                              try {
                                const d = paket.createdAt.toDate();
                                return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID');
                              } catch {
                                return '-';
                              }
                            })()
                          ) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{master?.nama || 'N/A'}</td>
                      <td className="px-6 py-4">
                        {tracker ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex gap-1 items-center">
                              <div className={`w-1.5 h-1.5 rounded-full ${tracker.checklist?.statusVisa === 'Issued' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-gray-200'}`} title="Visa" />
                              <div className={`w-1.5 h-1.5 rounded-full ${tracker.checklist?.statusTiket === 'Issued' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-gray-200'}`} title="Tiket" />
                              <div className={`w-1.5 h-1.5 rounded-full ${tracker.checklist?.statusHotelMakkah === 'Paid' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-gray-200'}`} title="Hotel" />
                              <span className="text-[9px] font-black text-gray-700 uppercase ml-1 italic">{tracker.status || 'Persiapan'}</span>
                            </div>
                            <div className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">Progres: {
                              [tracker.checklist?.statusVisa === 'Issued', tracker.checklist?.statusTiket === 'Issued', tracker.checklist?.statusHotelMakkah === 'Paid', tracker.checklist?.statusBus === 'Paid'].filter(Boolean).length
                            }/4 Selesai</div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-300 italic font-bold">MENUNGGU TRACKER</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-black italic text-indigo-700">
                          {formatCurrency((master?.hargaJualQuad || master?.hargaDasar || 0) + (paket.markup || 0))}
                        </div>
                        <div className="text-[9px] text-emerald-600 font-black uppercase tracking-tighter">Profit: +{formatCurrency(paket.markup)}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${paket.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {paket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-2">
                           <button onClick={() => startEdit(paket)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit2 className="w-4 h-4" /></button>
                           <button onClick={() => setDeleteConfirm(paket.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                         </div>
                         {deleteConfirm === paket.id && (
                           <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                             <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full text-center">
                               <p className="font-bold text-gray-900 mb-4">Hapus paket ini?</p>
                               <div className="flex gap-3">
                                 <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-gray-100 rounded-xl font-bold text-sm">Batal</button>
                                 <button onClick={() => handleDelete(paket.id)} className="flex-1 py-2 bg-rose-600 text-white rounded-xl font-bold text-sm">Hapus</button>
                               </div>
                             </div>
                           </div>
                         )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
