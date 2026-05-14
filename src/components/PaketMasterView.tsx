import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, X, Search, CheckCircle, XCircle, Clock, CheckCircle2, Layout, Activity } from 'lucide-react';
import { db, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, getDocs } from '../firebase';
import { Maskapai } from '../data/maskapai';

import { PaketMasterWizard } from './PaketMasterWizard';
import { ChecklistOperasional } from './tracker/ChecklistOperasional';
import { PaketTracker } from './tracker/types';

interface PaketMaster {
  id: string;
  nama: string;
  deskripsi: string;
  hargaDasar: number;
  hargaJualQuad?: number;
  maskapaiId: string;
  kuota: number;
  sisaKuota: number;
  status: 'draft' | 'published' | 'closed' | 'pending_validation';
  createdAt?: any;
}

export const PaketMasterView: React.FC = () => {
  const [pakets, setPakets] = useState<PaketMaster[]>([]);
  const [maskapaiList, setMaskapaiList] = useState<Maskapai[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PaketMaster>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);

  const [viewingTrackerPaket, setViewingTrackerPaket] = useState<PaketTracker | null>(null);
  const [allTrackers, setAllTrackers] = useState<any[]>([]);

  const showNotification = (type: 'success'|'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const unsubPaket = onSnapshot(collection(db, 'paket_master'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaketMaster));
      setPakets(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching paket_master:", error);
      setLoading(false);
    });

    const unsubMaskapai = onSnapshot(collection(db, 'maskapai'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Maskapai));
      setMaskapaiList(data);
    });

    const unsubTracker = onSnapshot(collection(db, 'tracker_paket'), (snapshot) => {
      const trackers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllTrackers(trackers);
      if (viewingTrackerPaket) {
        const updated = trackers.find(t => t.id === viewingTrackerPaket.id) as PaketTracker;
        if (updated) setViewingTrackerPaket(updated);
      }
    });

    return () => {
      unsubPaket();
      unsubMaskapai();
      unsubTracker();
    };
  }, [viewingTrackerPaket?.id]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'paket_master', id));
      setDeleteConfirm(null);
      showNotification('success', 'Paket berhasil dihapus');
    } catch (error) {
      console.error("Error deleting paket master:", error);
      showNotification('error', 'Gagal menghapus data paket master.');
    }
  };

  const startEdit = (paket: PaketMaster) => {
    setIsEditing(paket.id);
    setFormData(paket);
    setIsAdding(false);
  };

  const handleValidate = async (id: string, name: string, maskapaiId: string) => {
    try {
      // 1. Update status paket_master
      await updateDoc(doc(db, 'paket_master', id), {
        status: 'published',
        validationStatus: 'approved',
        updatedAt: serverTimestamp()
      });

      // 2. Ensure tracker_paket entry exists
      const trackerQuery = query(collection(db, 'tracker_paket'), where('namaPaket', '==', name));
      const trackerSnap = await getDocs(trackerQuery);
      
      if (trackerSnap.empty) {
        const maskapai = maskapaiList.find(m => m.id === maskapaiId);
        await addDoc(collection(db, 'tracker_paket'), {
          namaPaket: name,
          tanggalBerangkat: maskapai?.tanggalKeberangkatan || '',
          status: 'Persiapan',
          targetJamaah: 45,
          terdaftar: 0,
          createdAt: serverTimestamp()
        });
      }

      showNotification('success', 'Paket berhasil divalidasi dan tracker diaktifkan');
    } catch (error) {
      console.error("Error validating paket:", error);
      showNotification('error', 'Gagal memvalidasi paket');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateDoc(doc(db, 'paket_master', id), {
        status: 'draft',
        validationStatus: 'rejected',
        updatedAt: serverTimestamp()
      });
      showNotification('success', 'Paket ditolak dan dikembalikan ke draft');
    } catch (error) {
      console.error("Error rejecting paket:", error);
      showNotification('error', 'Gagal menolak paket');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredPakets = pakets.filter(p => 
    p.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.deskripsi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMaskapaiName = (id: string) => {
    const maskapai = maskapaiList.find(m => m.id === id);
    return maskapai ? `${maskapai.name} (${maskapai.tanggalKeberangkatan})` : 'Maskapai Tidak Ditemukan';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-emerald-100 text-emerald-800';
      case 'pending_validation': return 'bg-amber-100 text-amber-800';
      case 'closed': return 'bg-rose-100 text-rose-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openTracker = (paket: PaketMaster) => {
    const tracker = allTrackers.find(t => t.namaPaket === paket.nama || t.id === paket.id);
    if (tracker) {
      setViewingTrackerPaket(tracker as PaketTracker);
    } else {
      showNotification('error', 'Tracker belum dibuat untuk paket ini. Silakan validasi terlebih dahulu.');
    }
  };

  if (isAdding || isEditing) {
    return (
      <div className="p-0 sm:p-6 sm:max-w-7xl sm:mx-auto relative">
        <PaketMasterWizard 
          initialData={isEditing ? formData : undefined}
          onCancel={() => {
            setIsAdding(false);
            setIsEditing(null);
            setFormData({});
          }}
          onSuccess={() => {
            setIsAdding(false);
            setIsEditing(null);
            setFormData({});
            showNotification('success', 'Paket berhasil disimpan!');
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white font-medium transition-all ${
          notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Tracker Modal */}
      {viewingTrackerPaket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setViewingTrackerPaket(null)}
              className="absolute -top-12 right-0 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-emerald-600 rounded-t-3xl text-white">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tight leading-none mb-1">Tracker Operasional</h3>
                  <div className="text-xs font-bold text-emerald-100 uppercase tracking-widest">{viewingTrackerPaket.namaPaket}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-200 mb-1">Status Keberangkatan</div>
                <span className="bg-white text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {viewingTrackerPaket.status || 'Persiapan'}
                </span>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <ChecklistOperasional paket={viewingTrackerPaket} />
              
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" /> Jadwal Berangkat
                  </div>
                  <div className="text-lg font-black italic text-gray-900">{viewingTrackerPaket.tanggalBerangkat}</div>
                  <div className="mt-2 text-xs font-bold text-gray-500 uppercase">Input manual oleh operasional</div>
                </div>

                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Layout className="w-4 h-4 text-emerald-500" /> Kuota Terisi
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="text-2xl font-black italic text-indigo-600">{viewingTrackerPaket.terdaftar || 0}</div>
                    <div className="text-xs font-black text-gray-400 mb-1">/ {viewingTrackerPaket.targetJamaah || 45} JAMAHA</div>
                  </div>
                  <div className="mt-4 w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-1000" 
                      style={{ width: `${Math.min(((viewingTrackerPaket.terdaftar || 0) / (viewingTrackerPaket.targetJamaah || 45)) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col justify-center items-center text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Validasi Admin</div>
                  <div className="text-sm font-black text-emerald-600 uppercase italic">Valid & Aktif</div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-b-3xl text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aksi ini sinkron real-time dengan dashboard mitra dan operasional</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            Paket Master
          </h2>
          <p className="text-gray-500 text-sm mt-1">Kelola paket umroh utama (Master) yang akan dijual melalui website atau ke Mitra.</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setIsEditing(null); setFormData({ status: 'draft' }); }}
          className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          Buat Paket Program Baru
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari paket master..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-900 text-[#FDB913] text-[10px] uppercase tracking-widest font-black">
              <tr>
                <th className="px-6 py-4">Nama Paket & Deskripsi</th>
                <th className="px-6 py-4">Maskapai & Jadwal</th>
                <th className="px-6 py-4 text-right">Harga Jual (Quad)</th>
                <th className="px-6 py-4 text-center">Kuota (Sisa)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 italic font-medium">
              {filteredPakets.map(paket => (
                <tr key={paket.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => openTracker(paket)}
                      className="text-left group"
                    >
                      <div className="font-black italic text-gray-900 uppercase tracking-tighter text-sm group-hover:text-emerald-600 transition-colors">{paket.nama}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase mt-1 line-clamp-1">{paket.deskripsi}</div>
                    </button>
                    {allTrackers.some(t => t.namaPaket === paket.nama) && (
                      <div className="mt-2 flex gap-1">
                        {(() => {
                           const t = allTrackers.find(t => t.namaPaket === paket.nama);
                           return (
                             <>
                               <div className={`w-1.5 h-1.5 rounded-full ${t?.checklist?.statusVisa === 'Issued' ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                               <div className={`w-1.5 h-1.5 rounded-full ${t?.checklist?.statusTiket === 'Issued' ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                               <div className={`w-1.5 h-1.5 rounded-full ${t?.checklist?.statusHotelMakkah === 'Paid' ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                               <span className="text-[8px] font-black uppercase text-gray-400 ml-1">Tracker Active</span>
                             </>
                           )
                        })()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-gray-700 uppercase">{getMaskapaiName(paket.maskapaiId)}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-black italic text-emerald-600 text-sm">
                    {formatCurrency(paket.hargaJualQuad || paket.hargaDasar)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-black text-gray-900">{paket.kuota}</span>
                    <span className="text-gray-300 mx-1">/</span>
                    <span className={`font-black ${paket.sisaKuota < 5 ? 'text-rose-600' : 'text-blue-600'}`}>{paket.sisaKuota}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusColor(paket.status)}`}>
                      {paket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {deleteConfirm === paket.id ? (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => handleDelete(paket.id)} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-medium">Hapus</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-xs bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-300 font-medium">Batal</button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        {paket.status === 'pending_validation' && (
                          <>
                            <button 
                              onClick={() => handleValidate(paket.id, paket.nama, paket.maskapaiId)} 
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" 
                              title="Setujui & Publish"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleReject(paket.id)} 
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" 
                              title="Tolak"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => startEdit(paket)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(paket.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {pakets.length === 0 && !loading && !isAdding && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Belum ada data Paket Master. Silakan buat paket baru.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

