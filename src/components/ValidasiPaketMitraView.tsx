import React, { useState, useEffect } from 'react';
import { Search, Filter, Clock, CheckCircle2, XCircle, MessageSquare, Shield, Eye, Send, ArrowLeft, Download, Upload, Plane, Users, Building2, TrendingUp, Calendar, Package, Settings } from 'lucide-react';
import { auth, db, collection, query, where, onSnapshot, handleFirestoreError, OperationType, updateDoc, doc } from '../firebase';
import { WizardFormData, Maskapai, WizardHotel } from '../types';
import { PaketTracker } from './tracker/types';

interface ValidationRequest extends WizardFormData {
  id: string;
  // requestId is now inherited from WizardFormData
  validationComment?: string;
  validationDate?: string;
}

interface FirestoreData extends WizardFormData {
  // requestId is now inherited from WizardFormData
  validationComment?: string;
  validationDate?: string;
}

export const ValidasiPaketMitraView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState<ValidationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ValidationRequest | null>(null);
  
  const [maskapaiList, setMaskapaiList] = useState<Maskapai[]>([]);
  const [hotelsList, setHotelsList] = useState<WizardHotel[]>([]);
  const [viewMode, setViewMode] = useState<'Mitra' | 'Ops'>('Mitra');
  const [allTrackers, setAllTrackers] = useState<PaketTracker[]>([]);

  useEffect(() => {
    // Fetch trackers for real-time sync with admin updates
    const trackersPath = 'tracker_paket';
    const unsubTrackers = onSnapshot(collection(db, trackersPath), (s) => {
      setAllTrackers(s.docs.map(d => ({ id: d.id, ...d.data() } as PaketTracker)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, trackersPath));

    return () => unsubTrackers();
  }, []);

  useEffect(() => {
    // Fetch master data for labels
    const masterMaskapaiPath = "maskapai";
    const unsubM = onSnapshot(collection(db, masterMaskapaiPath), (s) => 
      setMaskapaiList(s.docs.map(d => ({ id: d.id, ...d.data() } as Maskapai))),
      (err) => handleFirestoreError(err, OperationType.LIST, masterMaskapaiPath)
    );
    
    const masterHotelsPath = "master_hotels";
    const unsubH = onSnapshot(collection(db, masterHotelsPath), (s) => 
      setHotelsList(s.docs.map(d => ({ id: d.id, ...d.data() } as WizardHotel))),
      (err) => handleFirestoreError(err, OperationType.LIST, masterHotelsPath)
    );

    return () => { unsubM(); unsubH(); };
  }, []);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    // Track validation for packages created by mitra in paket_master
    const paketMasterPath = 'paket_master';
    const q = query(
      collection(db, paketMasterPath),
      where('mitraId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => {
          const item = doc.data() as FirestoreData;
          if (item.status === 'draft') return null;
          return {
            ...item,
            id: doc.id,
            requestId: item.requestId || `REQ-${doc.id.slice(0, 4).toUpperCase()}`,
            validationStatus: item.validationStatus || 'Pending',
            validationComment: item.validationComment || "Sedang verifikasi oleh tim operasional.",
            validationDate: item.validationDate || "15 MEI 2024, 10:30"
          } as ValidationRequest;
        })
        .filter(Boolean) as ValidationRequest[];
      setRequests(data);
      setIsLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, paketMasterPath));

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedRequest) {
      const updated = requests.find(r => r.id === selectedRequest.id);
      if (updated && JSON.stringify(updated.checklist) !== JSON.stringify(selectedRequest.checklist)) {
        setSelectedRequest(updated);
      }
    }
  }, [requests]);

  const handleFollowUp = (request: ValidationRequest) => {
    const message = `Halo Admin, saya ingin menindaklanjuti status validasi untuk paket:
*${request.nama}*
ID: ${request.requestId}
Status Saat Ini: ${request.validationStatus?.toUpperCase()}

Mohon informasinya, terima kasih.`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/6281234567890?text=${encodedMessage}`, '_blank');
  };

  const getActiveTracker = (requestId: string, paketId: string) => {
    return allTrackers.find(t => t.paketMasterId === paketId || (requestId && t.requestId === requestId));
  };

  const handleFileUpload = async (field: string, file: File) => {
    if (!selectedRequest) return;
    if (file.size > 800000) { // Limit to ~800KB for Firestore document safety
      alert('File terlalu besar. Maksimal 800KB untuk efisiensi sistem.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const tracker = getActiveTracker(selectedRequest.requestId || '', selectedRequest.id);
      
      const currentChecklist = (tracker?.checklist || selectedRequest.checklist || {
        pasporTerkumpul: 0,
        meningitisTerkumpul: 0,
        biometrikSelesai: 0,
        ktpKpKkTerkumpul: 0,
        dpMasuk: 0,
        pelunasanMasuk: 0,
        statusTiket: 'Pending',
        statusHotelMakkah: 'Pending',
        statusHotelMadinah: 'Pending',
        statusVisa: 'Pending',
        statusBus: 'Pending',
        koperDibagikan: 0,
        statusManasik: 'Pending',
        statusSiskopatuh: 'Pending',
      }) as NonNullable<WizardFormData['checklist']>;

      const newFiles = { ...(currentChecklist.files || {}), [field]: base64 };
      const newChecklist = { ...currentChecklist, files: newFiles };

      try {
        await updateDoc(doc(db, 'paket_master', selectedRequest.id), { checklist: newChecklist });
        if (tracker) {
          await updateDoc(doc(db, 'tracker_paket', tracker.id), { checklist: newChecklist });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'paket_master');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleChecklistChange = async (field: keyof NonNullable<WizardFormData['checklist']>, value: string | number) => {
    if (!selectedRequest) return;
    
    const tracker = getActiveTracker(selectedRequest.requestId || '', selectedRequest.id);
    
    // Determine current checklist or default
    const currentChecklist = (tracker?.checklist || selectedRequest.checklist || {
      pasporTerkumpul: 0,
      meningitisTerkumpul: 0,
      biometrikSelesai: 0,
      ktpKkTerkumpul: 0,
      dpMasuk: 0,
      pelunasanMasuk: 0,
      statusTiket: 'Pending',
      statusHotelMakkah: 'Pending',
      statusHotelMadinah: 'Pending',
      statusVisa: 'Pending',
      statusBus: 'Pending',
      koperDibagikan: 0,
      statusManasik: 'Pending',
      statusSiskopatuh: 'Pending',
    }) as NonNullable<WizardFormData['checklist']>;

    const newChecklist = { ...currentChecklist, [field]: value };
    
    try {
      // 1. Update paket_master for legacy/fallback
      const updateData: Record<string, unknown> = { checklist: newChecklist };
      if (!selectedRequest.requestId) {
        updateData.requestId = `REQ-${selectedRequest.id.slice(0, 4).toUpperCase()}`;
      }
      await updateDoc(doc(db, 'paket_master', selectedRequest.id), updateData);

      // 2. IMPORTANT: Update tracker_paket if it exists (Source of Truth for Operasional)
      if (tracker) {
        await updateDoc(doc(db, 'tracker_paket', tracker.id), {
          checklist: newChecklist
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'paket_master');
    }
  };

  const renderTrackingItem = (label: string, field: keyof NonNullable<WizardFormData['checklist']>, options: string[], fileField?: string) => {
    if (!selectedRequest) return null;
    
    const tracker = getActiveTracker(selectedRequest.requestId || '', selectedRequest.id);
    const checklist = (tracker?.checklist || selectedRequest.checklist) as NonNullable<WizardFormData['checklist']>;
    const currentValue = (checklist?.[field] as string || 'Pending');
    const fileUrl = fileField ? (checklist?.files?.[fileField as keyof typeof checklist.files] as string) : null;
    
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
           <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
           {fileField && (
             <div className="flex items-center gap-2">
               {fileUrl ? (
                 <a 
                   href={fileUrl} 
                   download={`${label.replace(/\s+/g, '_').toLowerCase()}.pdf`}
                   className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black hover:bg-emerald-100 transition-colors border border-emerald-100"
                 >
                   <Download className="w-3 h-3" />
                   DOWNLOAD PDF
                 </a>
               ) : (
                 viewMode === 'Mitra' && <span className="text-[9px] text-gray-400 font-bold italic">Belum ada file</span>
               )}
               {viewMode === 'Ops' && (
                 <label className="cursor-pointer flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black hover:bg-blue-100 transition-colors border border-blue-100">
                   <Upload className="w-3 h-3" />
                   {fileUrl ? 'UPDATE PDF' : 'UPLOAD PDF'}
                   <input 
                     type="file" 
                     accept=".pdf" 
                     className="hidden" 
                     onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) handleFileUpload(fileField, file);
                     }}
                   />
                 </label>
               )}
             </div>
           )}
        </div>
        <div className="flex flex-wrap gap-2">
          {options.map(opt => {
            const isSelected = currentValue.toLowerCase() === opt.toLowerCase();
            return (
              <button
                key={opt}
                disabled={viewMode !== 'Ops'}
                onClick={() => handleChecklistChange(field, opt)}
                className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.1em] transition-all border ${
                  isSelected 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const filteredRequests = requests.filter(r => 
    r.nama?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.requestId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string, isLight = true) => {
    const upper = status?.toUpperCase();
    if (upper === 'APPROVED' || upper === 'DISETUJUI') {
      return (
        <div className={`flex items-center gap-1.5 px-3 py-1 ${isLight ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-emerald-500 text-white border-transparent'} rounded-full border`}>
          <CheckCircle2 className="w-3 h-3" />
          <span className="text-[10px] font-black uppercase tracking-widest">DISETUJUI</span>
        </div>
      );
    }
    if (upper === 'REJECTED' || upper === 'DITOLAK') {
      return (
        <div className={`flex items-center gap-1.5 px-3 py-1 ${isLight ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-rose-500 text-white border-transparent'} rounded-full border`}>
          <XCircle className="w-3 h-3" />
          <span className="text-[10px] font-black uppercase tracking-widest">DITOLAK</span>
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1 ${isLight ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-blue-500 text-white border-transparent'} rounded-full border`}>
        <Clock className="w-3 h-3" />
        <span className="text-[10px] font-black uppercase tracking-widest">SEDANG DICEK</span>
      </div>
    );
  };

  const renderDetailModal = () => {
    if (!selectedRequest) return null;

    const maskapai = maskapaiList.find(m => m.id === selectedRequest.maskapaiId);
    const hotelMakkah = hotelsList.find(h => h.id === selectedRequest.hotelMakkahId);
    const hotelMadinah = hotelsList.find(h => h.id === selectedRequest.hotelMadinahId);

    const statusStr = selectedRequest.validationStatus?.toLowerCase() || selectedRequest.status?.toLowerCase() || '';
    const isApproved = statusStr === 'approved' || statusStr === 'active' || statusStr === 'disetujui';
    const isRejected = statusStr === 'rejected' || statusStr === 'ditolak';
    const isReview = statusStr === 'pending_validation' || statusStr === 'pending' || statusStr === 'sedang dicek';

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in zoom-in duration-300">
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSelectedRequest(null)}></div>
        
        <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 md:p-8 border-b border-gray-100 uppercase italic">
             <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-all shadow-sm"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                     {selectedRequest.requestId}
                   </p>
                   <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase italic">DETAIL PENGAJUAN</h3>
                </div>
             </div>
             <button className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100 transition-all shadow-inner">
                <Download className="w-5 h-5" />
             </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar">
             {/* Title Section */}
             <div className="space-y-4">
                <div className="flex gap-3">
                   {getStatusBadge(statusStr)}
                   <div className="px-3 py-1 bg-gray-50 text-gray-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-100">
                      {selectedRequest.tipePublikasi || 'PRIVATE'}
                   </div>
                </div>
                <h2 className="text-4xl font-black text-gray-900 leading-tight uppercase italic tracking-tight">
                   {selectedRequest.nama}
                </h2>
                <div className="flex items-center gap-2">
                   <Calendar className="w-4 h-4 text-gray-300" />
                   <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                      DIAJUKAN: {selectedRequest.validationDate || "24 DES 2024, 10:30"}
                   </p>
                </div>
             </div>

             {/* Progress Status */}
             <div className="bg-gray-50/50 rounded-[2rem] p-8 border border-gray-100 relative">
                <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-12">STATUS VALIDASI OPERASIONAL</p>
                <div className="relative flex items-center justify-between px-10">
                   {/* Line */}
                   <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-1 bg-gray-200"></div>
                   <div 
                      className="absolute left-10 top-1/2 -translate-y-1/2 h-1 bg-blue-500 transition-all duration-1000"
                      style={{ width: isApproved ? '100%' : '50%' }}
                   ></div>

                   {/* Points */}
                   <div className="relative z-10 flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                         <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-bold text-gray-900 uppercase tracking-widest">SUBMIT</span>
                   </div>

                   <div className="relative z-10 flex flex-col items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${isRejected ? 'bg-rose-500 shadow-rose-500/30' : (isApproved || isReview ? 'bg-blue-500 shadow-blue-500/30' : 'bg-gray-200')} flex items-center justify-center text-white shadow-lg`}>
                         {isRejected ? <XCircle className="w-5 h-5" /> : (isApproved || isReview ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-white opacity-40"></div>)}
                      </div>
                      <span className="text-[9px] font-bold text-gray-900 uppercase tracking-widest">REVIEW</span>
                   </div>

                   <div className="relative z-10 flex flex-col items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${isApproved ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-gray-200'} flex items-center justify-center text-white shadow-lg`}>
                         {isApproved ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-white opacity-40"></div>}
                      </div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">SELESAI</span>
                   </div>
                </div>
             </div>

             {/* Admin Comment */}
             <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-500 shadow-sm">
                   <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1">
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">CATATAN DARI TIM ADMIN:</p>
                   <p className="text-sm font-bold text-blue-600 italic">
                      "{selectedRequest.validationComment || "Sedang verifikasi ketersediaan hotel Madinah."}"
                   </p>
                </div>
             </div>

             {/* Details Grid */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-6 flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                      <Plane className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">MASKAPAI</p>
                      <p className="text-sm font-black text-gray-900 uppercase italic">
                         {maskapai?.name || "SAUDI"}
                      </p>
                   </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-6 flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                      <Users className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">TARGET</p>
                      <p className="text-sm font-black text-gray-900 uppercase italic">
                         {selectedRequest.targetJamaah || 45} PAX
                      </p>
                   </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-6 flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                      <Building2 className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">HOTEL MKK</p>
                      <p className="text-sm font-black text-gray-900 uppercase italic">
                         {hotelMakkah?.nama || "PULLMAN ZAMZAM"}
                      </p>
                   </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-6 flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                      <Building2 className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">HOTEL MDN</p>
                      <p className="text-sm font-black text-gray-900 uppercase italic">
                         {hotelMadinah?.nama || "DALLAH TAIBAH"}
                      </p>
                   </div>
                </div>
             </div>

             {/* Operational Tracking Section (Matches Image 1) */}
             <div className="pt-6 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Fase Operasional */}
                   <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100 space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                         <Plane className="w-5 h-5 text-blue-500" />
                         <h4 className="text-sm font-black text-gray-900 uppercase italic tracking-tight">FASE OPERASIONAL</h4>
                      </div>
                      
                      <div className="space-y-6">
                         {renderTrackingItem('TIKET PESAWAT', 'statusTiket', ['PENDING', 'BOOKED', 'ISSUED'], 'tiketPesawat')}
                         {renderTrackingItem('HOTEL MAKKAH', 'statusHotelMakkah', ['PENDING', 'BOOKED', 'PAID'], 'hotelMakkah')}
                         {renderTrackingItem('HOTEL MADINAH', 'statusHotelMadinah', ['PENDING', 'BOOKED', 'PAID'], 'hotelMadinah')}
                         {renderTrackingItem('VISA', 'statusVisa', ['PENDING', 'PROSES PROVIDER', 'ISSUED'], 'visa')}
                         {renderTrackingItem('TRANSPORTASI (BUS)', 'statusBus', ['PENDING', 'BOOKED', 'PAID'], 'bus')}
                      </div>
                   </div>

                   {/* Fase Perlengkapan */}
                   <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100 space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                         <Package className="w-5 h-5 text-purple-500" />
                         <h4 className="text-sm font-black text-gray-900 uppercase italic tracking-tight">FASE PERLENGKAPAN</h4>
                      </div>

                      <div className="space-y-6">
                         <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                               <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">KOPER DIBAGIKAN</span>
                               <div className="flex items-center gap-2">
                                  <input 
                                     type="number"
                                     readOnly={viewMode !== 'Ops'}
                                     value={(() => {
                                        const tracker = getActiveTracker(selectedRequest.requestId || '', selectedRequest.id);
                                        return tracker?.checklist?.koperDibagikan ?? selectedRequest.checklist?.koperDibagikan ?? 0;
                                     })()}
                                     onChange={(e) => handleChecklistChange('koperDibagikan', Number(e.target.value))}
                                     className="w-16 h-8 bg-white border border-gray-200 rounded-lg text-center text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                  />
                                  <span className="text-[11px] font-bold text-gray-400">/ {selectedRequest.targetJamaah || 45}</span>
                                </div>
                             </div>
                          </div>

                         {renderTrackingItem('JADWAL MANASIK', 'statusManasik', ['PENDING', 'JADWAL DITETAPKAN', 'SELESAI'], 'manasik')}
                         {renderTrackingItem('SISKOPATUH', 'statusSiskopatuh', ['PENDING', 'PROSES', 'SELESAI'], 'siskopatuh')}
                      </div>
                   </div>
                </div>
             </div>

             {/* Profit Analysis Section */}
             <div className="bg-[#0F172A] rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                   <Shield className="w-64 h-64 text-white scale-150 rotate-12" />
                </div>
                <div className="relative z-10 space-y-6">
                   <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">ANALISIS KEUNTUNGAN</p>
                      <div className="bg-gray-100/10 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">DATA RESMI</div>
                   </div>
                   <div className="flex justify-between items-end">
                      <div>
                         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">HARGA JUAL (QUAD)</p>
                         <p className="text-3xl font-black italic tracking-tight">Rp {(selectedRequest.hargaJualQuad || 0).toLocaleString('id-ID')}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">PROFIT MITRA</p>
                         <div className="flex items-center gap-2 justify-end text-emerald-400">
                            <TrendingUp className="w-4 h-4" />
                            <p className="text-2xl font-black tracking-tight italic">
                               Rp {(selectedRequest.marginBersih || 0).toLocaleString('id-ID')}
                            </p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Footer Actions */}
          <div className="p-8 border-t border-gray-100 bg-white flex flex-col gap-6 relative">
             {/* View As Toggle (Image 1 style) */}
             <div className="absolute right-8 -top-14">
                <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-1.5 flex items-center gap-1 shadow-xl">
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3">VIEW AS</span>
                   <button 
                      onClick={() => setViewMode('Ops')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${viewMode === 'Ops' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-gray-400 hover:bg-gray-50'}`}
                   >
                      <Settings className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Ops</span>
                   </button>
                   <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
                   <button 
                      onClick={() => setViewMode('Mitra')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${viewMode === 'Mitra' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:bg-gray-50'}`}
                   >
                      <Users className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Mitra</span>
                   </button>
                </div>
             </div>

             <div className="flex flex-col items-center gap-1">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">
                   AKSI INI SINKRON REAL-TIME DENGAN DASHBOARD MITRA DAN OPERASIONAL
                </p>
             </div>

             <button 
                onClick={() => handleFollowUp(selectedRequest)}
                className="w-full py-5 rounded-[1.5rem] bg-emerald-500 text-white flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all active:scale-95 shadow-xl shadow-emerald-500/20 group"
             >
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-xs font-black uppercase tracking-[0.2em]">FOLLOW UP STATUS</span>
             </button>
             <p className="text-center mt-4 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">PESAN AKAN DIARAHKAN KE WHATSAPP ADMIN</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight italic uppercase italic">
            TRACKING VALIDASI
          </h2>
          <div className="flex items-center gap-2 mt-1">
             <Shield className="w-4 h-4 text-blue-500" />
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
               PANTAU ANTRIAN PAKET TIM OPERASIONAL
             </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
           <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
           <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
             {requests.length} PENGAJUAN AKTIF
           </span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="CARI PAKET..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
        <button className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-500 transition-all shadow-sm">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Requests List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Memuat data pengajuan...</p>
          </div>
        ) : filteredRequests.length > 0 ? (
          filteredRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-500 group overflow-hidden flex flex-col md:flex-row">
              {/* Left Side: Info */}
              <div className="flex-1 p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] px-3 py-1 bg-blue-50 rounded-lg border border-blue-100 italic">
                      {request.requestId}
                    </span>
                    {getStatusBadge(request.validationStatus || '')}
                  </div>

                 <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2 uppercase italic">
                      {request.nama}
                    </h3>
                    <div className="flex items-center gap-4">
                       <p className="text-sm font-black text-emerald-500">
                         Rp {(request.hargaJualQuad || 0).toLocaleString('id-ID')}
                       </p>
                       <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                         {request.validationDate || "15 DES 2024, 10:30"}
                       </p>
                    </div>
                 </div>

                 {/* Comment Box */}
                 <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400">
                       <MessageSquare className="w-4 h-4" />
                    </div>
                    <p className="text-[11px] font-medium text-gray-600 italic">
                      "{request.validationComment || "Sedang verifikasi ketersediaan hotel Madinah."}"
                    </p>
                 </div>
              </div>

              {/* Right Side: Actions */}
              <div className="md:w-48 bg-gray-50/30 border-l border-gray-100 p-8 flex flex-col justify-center gap-3">
                 <button 
                  onClick={() => setSelectedRequest(request)}
                  className="w-full py-3 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 group/btn"
                 >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">DETAIL</span>
                 </button>
                 <button 
                  onClick={() => handleFollowUp(request)}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 text-white flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                 >
                    <Send className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">FOLLOW UP</span>
                 </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-[2rem] border border-gray-100 p-20 text-center">
             <Shield className="w-16 h-16 text-gray-200 mx-auto mb-6" />
             <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">Tidak Ada Pengajuan</h3>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mulai buat paket baru untuk mengajukan validasi ke operasional.</p>
          </div>
        )}
      </div>

      {/* Footer Banner */}
      <div className="bg-blue-600 rounded-[2.5rem] p-12 text-center text-white relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-110"></div>
         <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full blur-3xl -ml-24 -mb-24"></div>
         
         <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-8 border border-white/20">
               <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tight mb-4">
              VALIDASI AMAN <br /> & TERPERCAYA
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100 max-w-sm mx-auto leading-relaxed opacity-80">
              TIM OPERASIONAL MEMVERIFIKASI MANUAL KETERSEDIAAN HOTEL & TIKET DEMI KUALITAS IBADAH TERBAIK.
            </p>
         </div>

         {/* Decorative elements */}
         <div className="absolute bottom-0 right-0 opacity-10 pointer-events-none p-8">
            <Shield className="w-32 h-32" />
         </div>
      </div>

      {renderDetailModal()}
    </div>
  );
};
