import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, X, Search, CheckCircle, XCircle, Clock, CheckCircle2, Layout, Activity, Archive, FileText } from 'lucide-react';
import { db, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, getDocs, handleFirestoreError, OperationType } from '../firebase';
import { Maskapai } from '../data/maskapai';

import { PaketMasterWizard } from './PaketMasterWizard';
import { ChecklistOperasional } from './tracker/ChecklistOperasional';
import { PaketTracker } from './tracker/types';

interface UserRecord {
  id: string;
  role?: string;
  status?: string;
  namaLengkap?: string;
  name?: string;
  brandName?: string;
  jenisMitra?: string;
  kota?: string;
}

interface PaketMaster {
  id: string;
  requestId?: string;
  nama: string;
  deskripsi: string;
  hargaDasar: number;
  hargaJualQuad?: number;
  maskapaiId: string;
  kuota: number;
  sisaKuota: number;
  status: 'draft' | 'published' | 'closed' | 'pending_validation' | 'expired' | 'archived';
  createdAt?: { toDate: () => Date };
  tglBerangkat?: string;
  mitraId?: string;
}

export const PaketMasterView: React.FC = () => {
  const [pakets, setPakets] = useState<PaketMaster[]>([]);
  const [maskapaiList, setMaskapaiList] = useState<Maskapai[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'archived_expired'>('all');
  
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PaketMaster>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);

  const [viewingTrackerPaket, setViewingTrackerPaket] = useState<PaketTracker | null>(null);
  const [allTrackers, setAllTrackers] = useState<PaketTracker[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);

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
      handleFirestoreError(error, OperationType.GET, 'paket_master');
    });

    const unsubMaskapai = onSnapshot(collection(db, 'maskapai'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Maskapai));
      setMaskapaiList(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'maskapai');
    });

    const unsubTracker = onSnapshot(collection(db, 'tracker_paket'), (snapshot) => {
      const trackers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaketTracker));
      setAllTrackers(trackers);
      if (viewingTrackerPaket) {
        const updated = trackers.find(t => t.id === viewingTrackerPaket.id) as PaketTracker;
        if (updated) setViewingTrackerPaket(updated);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tracker_paket');
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    return () => {
      unsubPaket();
      unsubMaskapai();
      unsubTracker();
      unsubUsers();
    };
  }, [viewingTrackerPaket?.id]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'paket_master', id));
      setDeleteConfirm(null);
      showNotification('success', 'Paket berhasil dihapus');
    } catch (error) {
      console.error("Error deleting paket master:", error);
      handleFirestoreError(error, OperationType.DELETE, `paket_master/${id}`);
      showNotification('error', 'Gagal menghapus data paket master.');
    }
  };

  const startEdit = (paket: PaketMaster) => {
    setIsEditing(paket.id);
    setFormData(paket);
    setIsAdding(false);
  };

  const startReview = (paket: PaketMaster) => {
    setIsReviewing(paket.id);
    setFormData(paket);
    setIsAdding(false);
    setIsEditing(null);
  };

  const handleValidate = async (paket: PaketMaster) => {
    try {
      // 1. Update status paket_master
      await updateDoc(doc(db, 'paket_master', paket.id), {
        status: 'published',
        validationStatus: 'approved',
        updatedAt: serverTimestamp()
      });

      // 2. Ensure tracker_paket entry exists using unique ID
      const trackerQuery = query(collection(db, 'tracker_paket'), where('paketMasterId', '==', paket.id));
      let trackerSnap;
      try {
        trackerSnap = await getDocs(trackerQuery);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'tracker_paket');
        throw err;
      }
      
      if (trackerSnap.empty) {
        const maskapai = maskapaiList.find(m => m.id === paket.maskapaiId);
        try {
          await addDoc(collection(db, 'tracker_paket'), {
            paketMasterId: paket.id,
            requestId: paket.requestId || '',
            namaPaket: paket.nama,
            tanggalBerangkat: maskapai?.tanggalKeberangkatan || '',
            status: 'Persiapan',
            targetJamaah: paket.kuota || 45,
            terdaftar: 0,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'tracker_paket');
          throw err;
        }
      }

      showNotification('success', 'Paket berhasil divalidasi dan tracker diaktifkan');
    } catch (error) {
      console.error("Error validating paket:", error);
      handleFirestoreError(error, OperationType.UPDATE, `paket_master/${paket.id}`);
      showNotification('error', 'Gagal memvalidasi paket');
    }
  };

  const handleReject = async (paket: PaketMaster) => {
    try {
      await updateDoc(doc(db, 'paket_master', paket.id), {
        status: 'draft',
        validationStatus: 'rejected',
        updatedAt: serverTimestamp()
      });
      showNotification('success', 'Paket ditolak dan dikembalikan ke draft');
    } catch (error) {
      console.error("Error rejecting paket:", error);
      handleFirestoreError(error, OperationType.UPDATE, `paket_master/${paket.id}`);
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

  const filteredPakets = pakets.filter(p => {
    const matchesSearch = p.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.deskripsi.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    const todayStr = new Date().toISOString().split('T')[0];
    const isArchived = p.status === 'archived';
    
    const maskapai = maskapaiList.find(m => m.id === p.maskapaiId);
    const flightDate = maskapai?.tanggalKeberangkatan || p.tglBerangkat || '';
    const hasPassed = !!(flightDate && flightDate < todayStr);
    const isExpired = isArchived || hasPassed;

    if (filterType === 'active') {
      return !isExpired && p.status !== 'archived';
    } else if (filterType === 'archived_expired') {
      return isExpired || p.status === 'archived';
    }
    return true;
  });

  const handleToggleArchive = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'archived' ? 'published' : 'archived';
      await updateDoc(doc(db, 'paket_master', id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      showNotification('success', `Paket berhasil ${newStatus === 'archived' ? 'diarsipkan' : 'diaktifkan kembali'}`);
    } catch (error) {
      console.error("Error toggling archive status:", error);
      handleFirestoreError(error, OperationType.UPDATE, `paket_master/${id}`);
      showNotification('error', 'Gagal memproses arsip paket.');
    }
  };

  const getMaskapaiName = (id: string) => {
    const maskapai = maskapaiList.find(m => m.id === id);
    return maskapai ? `${maskapai.name} (${maskapai.tanggalKeberangkatan})` : 'Maskapai Tidak Ditemukan';
  };

  const getStatusColor = (status: string, isExpired = false) => {
    if (status === 'archived') return 'bg-purple-100 text-purple-800';
    if (isExpired) return 'bg-rose-100 text-rose-800';
    switch (status) {
      case 'published': return 'bg-emerald-100 text-emerald-800';
      case 'pending_validation': return 'bg-amber-100 text-amber-800';
      case 'closed': return 'bg-rose-100 text-rose-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openTracker = (paket: PaketMaster) => {
    // Strict isolation: only match if ID or non-empty requestId matches
    const tracker = allTrackers.find(t => 
      t.paketMasterId === paket.id || 
      (paket.requestId && t.requestId === paket.requestId)
    );
    if (tracker) {
      setViewingTrackerPaket(tracker as PaketTracker);
    } else {
      showNotification('error', 'Tracker belum dibuat untuk paket ini. Silakan validasi terlebih dahulu.');
    }
  };

  if (isAdding || isEditing || isReviewing) {
    return (
      <div className="p-0 sm:p-6 sm:max-w-7xl sm:mx-auto relative">
        <PaketMasterWizard 
          initialData={isReviewing || isEditing ? formData : undefined}
          initialStepName={isReviewing ? "REVIEW FASILITAS" : undefined}
          onCancel={() => {
            setIsAdding(false);
            setIsEditing(null);
            setIsReviewing(null);
            setFormData({});
          }}
          onSuccess={() => {
            setIsAdding(false);
            setIsEditing(null);
            setIsReviewing(null);
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
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari paket master..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white font-bold"
            />
          </div>

          <div className="flex gap-1 p-1 bg-gray-150 rounded-xl bg-gray-200/50 border border-gray-200 self-start md:self-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                filterType === 'all' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterType('active')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                filterType === 'active' 
                  ? 'bg-white text-emerald-700 shadow-sm' 
                  : 'text-gray-500 hover:text-emerald-700'
              }`}
            >
              Aktif Pelaksanaan
            </button>
            <button
              onClick={() => setFilterType('archived_expired')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                filterType === 'archived_expired' 
                  ? 'bg-white text-rose-750 shadow-sm' 
                  : 'text-gray-500 hover:text-rose-750'
              }`}
            >
              Arsip & Lewat
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-900 text-[#FDB913] text-[10px] uppercase tracking-widest font-black">
              <tr>
                <th className="px-6 py-4">Kode Paket</th>
                <th className="px-6 py-4">Nama Paket & Deskripsi</th>
                <th className="px-6 py-4">Nama Mitra / Brand</th>
                <th className="px-6 py-4">Maskapai & Jadwal</th>
                <th className="px-6 py-4 text-right">Harga Jual (Quad)</th>
                <th className="px-6 py-4 text-center">Kuota (Sisa)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 italic font-medium">
              {filteredPakets.map(paket => {
                const todayStr = new Date().toISOString().split('T')[0];
                const isArchived = paket.status === 'archived';
                const maskapaiRef = maskapaiList.find(m => m.id === paket.maskapaiId);
                const flightDate = maskapaiRef?.tanggalKeberangkatan || paket.tglBerangkat || '';
                const hasPassed = !!(flightDate && flightDate < todayStr);
                const isExpired = isArchived || hasPassed;

                return (
                  <tr key={paket.id} className={`hover:bg-gray-50 transition-colors ${isExpired ? 'bg-gray-50/50 opacity-75' : ''}`}>
                    <td className="px-6 py-4">
                      {paket.requestId ? (
                        <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-2 py-1 rounded tracking-widest border border-gray-200">
                          {paket.requestId}
                        </span>
                      ) : (
                        <span className="bg-gray-50 text-gray-400 text-[10px] font-black px-2 py-1 rounded tracking-widest border border-gray-100 italic" title="Kode Sementara">
                          {`REQ-${paket.id.slice(0, 4).toUpperCase()}`}*
                        </span>
                      )}
                    </td>
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
                      {(() => {
                        const mId = paket.mitraId;
                        if (!mId) {
                          return <span className="bg-amber-50 text-amber-700 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border border-amber-200 tracking-wider">Umaroh Pusat</span>;
                        }
                        const u = users.find(user => user.id === mId);
                        if (!u) return <span className="text-xs text-gray-450 font-bold italic">Mitra Tidak Ditemukan</span>;
                        return (
                          <div>
                            <p className="font-extrabold text-gray-900 text-xs uppercase leading-tight">{u.namaLengkap || u.name || 'Mitra'}</p>
                            {u.brandName && (
                              <p className="text-[9px] text-indigo-600 font-black uppercase mt-0.5 tracking-tight">💼 {u.brandName}</p>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-gray-700 uppercase">{getMaskapaiName(paket.maskapaiId)}</div>
                      {hasPassed && (
                        <div className="text-[9px] text-rose-600 font-extrabold uppercase mt-1 tracking-tight flex items-center gap-1">
                          ⚠️ Lewat Tanggal (Expired)
                        </div>
                      )}
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
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusColor(paket.status, hasPassed)}`}>
                        {isArchived ? 'DIARSIPKAN' : hasPassed ? 'EXPIRED' : paket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {deleteConfirm === paket.id ? (
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleDelete(paket.id)} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-bold uppercase tracking-widest text-[9px]">Hapus</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-xs bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-300 font-bold uppercase tracking-widest text-[9px]">Batal</button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          {paket.status === 'pending_validation' && (
                            <>
                              <button 
                                onClick={() => handleValidate(paket)} 
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" 
                                title="Setujui & Publish"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleReject(paket)} 
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" 
                                title="Tolak"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          
                          <button 
                            onClick={() => handleToggleArchive(paket.id, paket.status)} 
                            className={`p-2 rounded-lg transition-colors ${
                              isArchived 
                                ? 'text-purple-600 hover:bg-purple-50' 
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            }`}
                            title={isArchived ? 'Aktifkan Kembali' : 'Arsipkan Paket'}
                          >
                            <Archive className="w-4 h-4" />
                          </button>

                          <button onClick={() => startEdit(paket)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button 
                            onClick={() => startReview(paket)} 
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                            title="Unduh / Preview Deskripsi"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <button onClick={() => setDeleteConfirm(paket.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredPakets.length === 0 && !loading && !isAdding && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 font-bold uppercase tracking-wider text-xs">
                    Belum ada data Paket Master untuk kriteria filter ini.
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

