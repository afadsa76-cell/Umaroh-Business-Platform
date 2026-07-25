import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Search, Star, Building2, CheckCircle2, Clock, Calendar, Plane, Share2, ChevronRight, Activity, X, GitMerge, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import { db, auth, collection, onSnapshot, doc, deleteDoc, query, where, updateDoc, serverTimestamp, handleFirestoreError, OperationType, addDoc, setDoc, getDocs, getDoc, writeBatch } from '../../firebase';
import { PaketMasterWizard } from '../packages/PaketMasterWizard';
import { PaketDetailView } from '../packages/PaketDetailView';
import { PaketMaster, Maskapai, Layanan } from '../../types';
import { Hotel } from '../../data/hotels';
import { PaketTracker } from '../tracker/types';

interface PaketMitra {
  id: string;
  paketMasterId: string;
  mitraId: string;
  namaPaketMitra: string;
  markup: number;
  hargaJual: number;
  status: 'active' | 'inactive';
  createdAt?: { toDate: () => Date };
}

export const PaketMitraView: React.FC = () => {
  const [paketMasters, setPaketMasters] = useState<PaketMaster[]>([]);
  const [paketMitras, setPaketMitras] = useState<PaketMitra[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'draft' | 'publish' | 'merge'>('publish');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [bookings, setBookings] = useState<any[]>([]);
  const [mergeSourceId, setMergeSourceId] = useState<string>('');
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [isMerging, setIsMerging] = useState<boolean>(false);

  // States for Wizard
  const [isAddingNewMaster, setIsAddingNewMaster] = useState(false);
  const [editingMaster, setEditingMaster] = useState<PaketMaster | null>(null);
  const [isMarkingUp, setIsMarkingUp] = useState(false);
  const [markupInitialData, setMarkupInitialData] = useState<Record<string, unknown> | null>(null);
  const [viewingPaketDetail, setViewingPaketDetail] = useState<PaketMaster | null>(null);

  const userId = auth.currentUser?.uid || 'mitra-dummy-id';

  const showNotification = (type: 'success'|'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleMergeGroups = async () => {
    if (!mergeSourceId || !mergeTargetId) {
      showNotification('error', 'Harap pilih kedua grup yang akan digabungkan.');
      return;
    }
    if (mergeSourceId === mergeTargetId) {
      showNotification('error', 'Grup asal dan tujuan tidak boleh sama.');
      return;
    }

    setIsMerging(true);
    try {
      const sourcePaket = paketMitras.find(p => p.id === mergeSourceId);
      const targetPaket = paketMitras.find(p => p.id === mergeTargetId);
      
      if (!sourcePaket || !targetPaket) {
        showNotification('error', 'Data paket tidak ditemukan.');
        setIsMerging(false);
        return;
      }

      const targetMaster = paketMasters.find(m => m.id === targetPaket.paketMasterId);

      // Find bookings belonging to source package (Group B - which will be moved)
      const sourceBookings = bookings.filter(b => b.paketId === sourcePaket.id || b.paketId === sourcePaket.paketMasterId);

      if (sourceBookings.length === 0) {
        showNotification('error', 'Grup asal tidak memiliki jemaah terdaftar untuk dipindahkan.');
        setIsMerging(false);
        return;
      }

      // Update all bookings in Source Group to the Target Group
      const batch = writeBatch(db);
      sourceBookings.forEach((booking) => {
        const bRef = doc(db, 'bookings', booking.id);
        batch.update(bRef, {
          paketId: targetPaket.id,
          paketNama: targetPaket.namaPaketMitra,
          updatedAt: serverTimestamp()
        });
      });

      // Update source package status to inactive/merged
      const sourceRef = doc(db, 'paket_mitra', sourcePaket.id);
      batch.update(sourceRef, {
        status: 'inactive',
        mergedIntoId: targetPaket.id,
        updatedAt: serverTimestamp()
      });

      // Optionally, let's adjust the Target Package targetJamaah or kuota
      const targetBookings = bookings.filter(b => b.paketId === targetPaket.id || b.paketId === targetPaket.paketMasterId);
      const totalNewRegistrants = targetBookings.length + sourceBookings.length;

      // Update the tracker_paket of target package if exists
      const targetTracker = trackerPakets.find(t => t.paketMasterId === targetPaket.paketMasterId || t.namaPaket === targetMaster?.nama);
      if (targetTracker) {
        const trackerRef = doc(db, 'tracker_paket', targetTracker.id);
        batch.update(trackerRef, {
          terdaftar: totalNewRegistrants,
          // If actual registration exceeds target, we expand it
          targetJamaah: Math.max(targetTracker.targetJamaah || 35, totalNewRegistrants)
        });
      }

      await batch.commit();

      showNotification('success', `Berhasil menggabungkan grup! ${sourceBookings.length} jemaah dari "${sourcePaket.namaPaketMitra}" berhasil dipindahkan ke "${targetPaket.namaPaketMitra}".`);
      
      // Clear selections
      setMergeSourceId('');
      setMergeTargetId('');
      setActiveTab('publish');
    } catch (error) {
      console.error("Error during merge:", error);
      showNotification('error', 'Terjadi kesalahan saat menggabungkan grup.');
    } finally {
      setIsMerging(false);
    }
  };

  const renderMergeGroupTab = () => {
    // We only show published packages of the current partner that are active
    const activeMitraPakets = paketMitras.filter(p => p.status === 'active');
    
    const sourcePaket = activeMitraPakets.find(p => p.id === mergeSourceId);
    const targetPaket = activeMitraPakets.find(p => p.id === mergeTargetId);

    const sourceMaster = sourcePaket ? paketMasters.find(m => m.id === sourcePaket.paketMasterId) : null;
    const targetMaster = targetPaket ? paketMasters.find(m => m.id === targetPaket.paketMasterId) : null;

    // Filter bookings belonging to these packages
    const sourceBookings = sourcePaket 
      ? bookings.filter(b => b.paketId === sourcePaket.id || b.paketId === sourcePaket.paketMasterId) 
      : [];
    const targetBookings = targetPaket 
      ? bookings.filter(b => b.paketId === targetPaket.id || b.paketId === targetPaket.paketMasterId) 
      : [];

    // Calculate compatibility
    let compatibilityScore = 0;
    const compatibilityChecks: { label: string; passed: boolean; detail: string }[] = [];

    if (sourcePaket && targetPaket && sourceMaster && targetMaster) {
      // 1. Check Maskapai
      const sameAirline = sourceMaster.maskapaiId === targetMaster.maskapaiId;
      if (sameAirline) compatibilityScore += 35;
      compatibilityChecks.push({
        label: 'Maskapai Penerbangan',
        passed: sameAirline,
        detail: sameAirline ? 'Sama (' + getMaskapaiInfo(sourceMaster.maskapaiId) + ')' : 'Berbeda'
      });

      // 2. Check Departure Dates
      let dateDiffDays = 999;
      if (sourceMaster.tglBerangkat && targetMaster.tglBerangkat) {
        try {
          const d1 = new Date(sourceMaster.tglBerangkat);
          const d2 = new Date(targetMaster.tglBerangkat);
          dateDiffDays = Math.abs(Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
        } catch (err) {
          console.debug("Date parsing error ignored:", err);
        }
      }
      const closeDates = dateDiffDays <= 7;
      if (closeDates) compatibilityScore += 35;
      else if (dateDiffDays <= 15) compatibilityScore += 15;
      
      compatibilityChecks.push({
        label: 'Tanggal Keberangkatan',
        passed: closeDates,
        detail: dateDiffDays === 0 ? 'Sama persis' : dateDiffDays < 999 ? `Selisih ${dateDiffDays} hari` : 'Berbeda jauh'
      });

      // 3. Check Hotels
      const sameMakkahHotel = sourceMaster.hotelMakkahId === targetMaster.hotelMakkahId;
      const sameMadinahHotel = sourceMaster.hotelMadinahId === targetMaster.hotelMadinahId;
      const hotelsCompatible = sameMakkahHotel && sameMadinahHotel;
      
      if (sameMakkahHotel) compatibilityScore += 15;
      if (sameMadinahHotel) compatibilityScore += 15;
      
      compatibilityChecks.push({
        label: 'Hotel Makkah & Madinah',
        passed: hotelsCompatible,
        detail: hotelsCompatible ? 'Sama persis' : (sameMakkahHotel ? 'Hanya Hotel Makkah sama' : sameMadinahHotel ? 'Hanya Hotel Madinah sama' : 'Hotel berbeda')
      });
    }

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Intro banner */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white border border-indigo-500/10 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                <GitMerge className="w-4 h-4" />
                Mitra Group Merger Portal
              </div>
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">
                Solusi Penggabungan Grup untuk Cegah Kerugian
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                Menghadapi pendaftaran di bawah kuota operasional? Fitur ini memungkinkan Anda memindahkan jemaah terdaftar dari satu grup kecil ke grup aktif lainnya yang memiliki spesifikasi mirip. Setelah digabungkan, biaya komponen operasional akan direkalkulasi secara otomatis untuk meningkatkan profitabilitas!
              </p>
            </div>
            <Sparkles className="w-16 h-16 text-indigo-400 opacity-20 hidden md:block" />
          </div>
        </div>

        {/* Selection Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Group Source Selection */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center">1</span>
                <h4 className="font-black text-gray-900 uppercase text-xs tracking-wider">Pilih Grup Asal (Pindahkan Jemaah Dari)</h4>
              </div>
              <select
                value={mergeSourceId}
                onChange={(e) => setMergeSourceId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-xs font-bold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="">-- PILIH GRUP ASAL --</option>
                {activeMitraPakets.map(p => {
                  const pBookings = bookings.filter(b => b.paketId === p.id || b.paketId === p.paketMasterId);
                  return (
                    <option key={p.id} value={p.id} disabled={p.id === mergeTargetId}>
                      {p.namaPaketMitra} ({pBookings.length} Jemaah Terdaftar)
                    </option>
                  );
                })}
              </select>

              {sourcePaket && sourceMaster ? (
                <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100/60 space-y-3 mt-4 animate-in fade-in">
                  <h5 className="font-black text-rose-800 text-xs uppercase italic">{sourcePaket.namaPaketMitra}</h5>
                  <div className="space-y-1.5 text-[11px] text-gray-600">
                    <div className="flex justify-between"><span className="font-bold">Maskapai:</span> <span>{getMaskapaiInfo(sourceMaster.maskapaiId)}</span></div>
                    <div className="flex justify-between"><span className="font-bold">Tgl Berangkat:</span> <span>{sourceMaster.tglBerangkat || '-'}</span></div>
                    <div className="flex justify-between"><span className="font-bold">Durasi:</span> <span>{sourceMaster.durasiHari || 9} Hari</span></div>
                    <div className="flex justify-between"><span className="font-bold">Kuota Awal:</span> <span>{sourceMaster.kuota} Pax</span></div>
                    <div className="flex justify-between text-rose-700 font-bold border-t border-rose-100/60 pt-1.5">
                      <span>Jemaah Aktif Saat Ini:</span> <span>{sourceBookings.length} PAX</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400 border border-dashed border-gray-100 rounded-2xl text-xs font-medium">
                  Silakan pilih grup yang pendaftarnya di bawah kuota
                </div>
              )}
            </div>
          </div>

          {/* Transfer Icon in Middle */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-md">
              <ArrowRight className="w-6 h-6 rotate-90 lg:rotate-0 animate-pulse" />
            </div>
            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full">
              Dipindahkan
            </span>
          </div>

          {/* Group Target Selection */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 font-bold text-xs flex items-center justify-center">2</span>
                <h4 className="font-black text-gray-900 uppercase text-xs tracking-wider">Pilih Grup Tujuan (Pindahkan Jemaah Ke)</h4>
              </div>
              <select
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-xs font-bold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- PILIH GRUP TUJUAN --</option>
                {activeMitraPakets.map(p => {
                  const pBookings = bookings.filter(b => b.paketId === p.id || b.paketId === p.paketMasterId);
                  return (
                    <option key={p.id} value={p.id} disabled={p.id === mergeSourceId}>
                      {p.namaPaketMitra} ({pBookings.length} Jemaah Terdaftar)
                    </option>
                  );
                })}
              </select>

              {targetPaket && targetMaster ? (
                <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/60 space-y-3 mt-4 animate-in fade-in">
                  <h5 className="font-black text-emerald-800 text-xs uppercase italic">{targetPaket.namaPaketMitra}</h5>
                  <div className="space-y-1.5 text-[11px] text-gray-600">
                    <div className="flex justify-between"><span className="font-bold">Maskapai:</span> <span>{getMaskapaiInfo(targetMaster.maskapaiId)}</span></div>
                    <div className="flex justify-between"><span className="font-bold">Tgl Berangkat:</span> <span>{targetMaster.tglBerangkat || '-'}</span></div>
                    <div className="flex justify-between"><span className="font-bold">Durasi:</span> <span>{targetMaster.durasiHari || 9} Hari</span></div>
                    <div className="flex justify-between"><span className="font-bold">Kuota Awal:</span> <span>{targetMaster.kuota} Pax</span></div>
                    <div className="flex justify-between text-emerald-700 font-bold border-t border-emerald-100/60 pt-1.5">
                      <span>Jemaah Aktif Saat Ini:</span> <span>{targetBookings.length} PAX</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400 border border-dashed border-gray-100 rounded-2xl text-xs font-medium">
                  Silakan pilih grup tujuan penampung jemaah
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Compatibility & Impact Report */}
        {sourcePaket && targetPaket && sourceMaster && targetMaster && (
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              Laporan Analisis Kompatibilitas & Dampak Merger
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Compatibility score radial indicator */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tingkat Kompatibilitas</span>
                <div className="relative flex items-center justify-center">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                    <circle 
                      cx="48" 
                      cy="48" 
                      r="40" 
                      stroke={compatibilityScore >= 70 ? '#10b981' : compatibilityScore >= 40 ? '#f59e0b' : '#ef4444'} 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * compatibilityScore) / 100}
                    />
                  </svg>
                  <span className="absolute text-xl font-black text-slate-800">{compatibilityScore}%</span>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider mt-3 px-2.5 py-1 rounded-full ${
                  compatibilityScore >= 70 ? 'bg-emerald-100 text-emerald-800' : compatibilityScore >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {compatibilityScore >= 70 ? 'Sangat Direkomendasikan' : compatibilityScore >= 40 ? 'Kompatibilitas Sedang' : 'Risiko Kompatibilitas'}
                </span>
              </div>

              {/* Compatibility Checklists */}
              <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-gray-100 space-y-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block border-b pb-1.5">Parameter Kesesuaian</span>
                <div className="space-y-3">
                  {compatibilityChecks.map((check, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-500">{check.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-800 font-black">{check.detail}</span>
                        <span className={`w-2 h-2 rounded-full ${check.passed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Combined impact */}
            <div className="bg-indigo-50 border border-indigo-100/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-indigo-800 font-black text-sm uppercase">Simulasi Gabungan Grup Sukses!</p>
                <p className="text-xs text-indigo-900/85 font-medium leading-relaxed max-w-2xl">
                  Jumlah jemaah akan bertambah dari <span className="font-bold text-indigo-700 underline">{targetBookings.length} Pax</span> menjadi <span className="font-bold text-emerald-700 underline">{targetBookings.length + sourceBookings.length} Pax</span>. Total ini akan memperkecil beban biaya handling per pax karena sharing bus, mutawif, dan tour leader dialokasikan secara efisien ke grup penampung.
                </p>
              </div>
              <div className="bg-indigo-600 text-white font-black text-center px-6 py-3 rounded-xl shadow-lg shrink-0 w-full md:w-auto">
                <div className="text-[9px] uppercase tracking-wider text-indigo-100">Gabungan Jemaah</div>
                <div className="text-2xl">{targetBookings.length + sourceBookings.length} PAX</div>
              </div>
            </div>

            {/* List of pilgrims to be transferred */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Daftar {sourceBookings.length} Jemaah yang akan Dipindahkan</span>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[9px]">
                    <tr>
                      <th className="px-4 py-2">Nama Jemaah</th>
                      <th className="px-4 py-2">Status Pembayaran</th>
                      <th className="px-4 py-2 text-right">Nilai Tagihan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-[11px]">
                    {sourceBookings.map((b, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2 font-black text-gray-800 uppercase italic">{b.nama || b.namaJamaah || 'Tanpa Nama'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            b.statusPembayaran === 'Lunas' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {b.statusPembayaran || 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-black italic">Rp {Number(b.harga || b.totalHarga || 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Big confirmation action */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setMergeSourceId('');
                  setMergeTargetId('');
                }}
                className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Reset Pilihan
              </button>
              <button
                type="button"
                disabled={isMerging}
                onClick={handleMergeGroups}
                className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/35 transition-all flex items-center gap-2"
              >
                {isMerging ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Memproses Penggabungan...
                  </>
                ) : (
                  <>
                    <GitMerge className="w-4 h-4" />
                    Proses Gabungkan Grup & Rekalkulasi
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [maskapai, setMaskapai] = useState<Maskapai[]>([]);
  const [layananList, setLayananList] = useState<Layanan[]>([]);

  const [trackerPakets, setTrackerPakets] = useState<PaketTracker[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Sales Order profitability validation modal states
  const [soValidationPaket, setSoValidationPaket] = useState<PaketMaster | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [soCostComponents, setSoCostComponents] = useState<any[]>([]);
  const [soIsSaving, setSoIsSaving] = useState(false);

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
      setHotels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as Hotel));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'master_hotels');
    });

    // Fetch Maskapai
    const unsubMaskapai = onSnapshot(collection(db, 'maskapai'), (snapshot) => {
      setMaskapai(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as Maskapai));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'maskapai');
    });

    // Fetch Tracker Paket
    const unsubTracker = onSnapshot(collection(db, 'tracker_paket'), (snapshot) => {
      setTrackerPakets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as PaketTracker));
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

    const unsubLayanan = onSnapshot(collection(db, 'layanan'), (snapshot) => {
      setLayananList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as Layanan));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'layanan');
    });

    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'bookings');
    });

    return () => {
      unsubUser();
      unsubMaster();
      unsubHotels();
      unsubMaskapai();
      unsubTracker();
      unsubMitra();
      unsubLayanan();
      unsubBookings();
    };
  }, [userId, userRole]);

  const initializeSoCostComponents = (paket: PaketMaster) => {
    const maskapaiItem = maskapai.find(m => m.id === paket.maskapaiId);
    const targetQty = paket.kuota || 45;
    
    // Find real hotels from the loaded master_hotels
    const hotelMadinah = hotels.find(h => h.id === paket.hotelMadinahId);
    const hotelMakkah = hotels.find(h => h.id === paket.hotelMakkahId);
    const hotelWisata = paket.hotelWisataId ? hotels.find(h => h.id === paket.hotelWisataId) : null;

    // Resolve selected layanan
    const selectedLayananItems = layananList.reduce((acc: { id: string; nama: string; harga: number }[], item: Layanan) => {
      if (item.isGroup) {
        if (paket.selectedLayanan?.includes(item.id)) {
          const selectedOpt = item.options?.find((opt) =>
            paket.selectedLayanan?.includes(opt.id)
          );
          if (selectedOpt) {
            const rawPrice = selectedOpt.price;
            const roundedPrice = rawPrice > 0 ? Math.ceil(rawPrice / 1000) * 1000 : 0;
            acc.push({
              id: selectedOpt.id,
              nama: `${item.nama}: ${selectedOpt.label}`,
              harga: roundedPrice,
            });
          }
        }
      } else {
        if (paket.selectedLayanan?.includes(item.id)) {
          const rawPrice = item.harga || 0;
          const roundedPrice = rawPrice > 0 ? Math.ceil(rawPrice / 1000) * 1000 : 0;
          acc.push({
            id: item.id,
            nama: item.nama,
            harga: roundedPrice
          });
        }
      }
      return acc;
    }, []);

    // Build the dynamic components list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const components: any[] = [
      {
        nama_komponen: `Maskapai - ${maskapaiItem?.name || 'Pesawat'}`,
        kategori_komponen: 'Maskapai',
        vendor_id: maskapaiItem?.namaVendor || maskapaiItem?.name || 'Garuda Indonesia',
        qty: targetQty,
        harga_satuan: ((paket as unknown as Record<string, unknown>).estimasiHargaMaskapai as number) || 12500000,
        total_biaya: (((paket as unknown as Record<string, unknown>).estimasiHargaMaskapai as number) || 12500000) * targetQty,
      },
      {
        nama_komponen: `Hotel Madinah: ${hotelMadinah?.name || 'Standard'}`,
        kategori_komponen: 'Hotel',
        vendor_id: hotelMadinah?.vendor || 'Anjum Hotel / Safwah',
        qty: targetQty,
        harga_satuan: 3500000,
        total_biaya: 3500000 * targetQty,
      },
      {
        nama_komponen: `Hotel Makkah: ${hotelMakkah?.name || 'Standard'}`,
        kategori_komponen: 'Hotel',
        vendor_id: hotelMakkah?.vendor || 'Pulman Zamzam / Swissotel',
        qty: targetQty,
        harga_satuan: 4500000,
        total_biaya: 4500000 * targetQty,
      }
    ];

    // If UMRAH PLUS and hotel wisata is specified
    if (paket.kategori === 'UMRAH PLUS' && paket.hotelWisataId) {
      components.push({
        nama_komponen: `Hotel Wisata: ${hotelWisata?.name || 'Standard Wisata'}`,
        kategori_komponen: 'Hotel',
        vendor_id: hotelWisata?.vendor || 'Hotel Wisata Vendor',
        qty: targetQty,
        harga_satuan: 2500000,
        total_biaya: 2500000 * targetQty,
      });
    }

    // Standard Visa & Handling
    components.push({
      nama_komponen: `Visa & Handling Saudi`,
      kategori_komponen: 'Visa & Handling',
      vendor_id: 'Muassasah Saudi Provider',
      qty: targetQty,
      harga_satuan: 1500000,
      total_biaya: 1500000 * targetQty,
    });

    // Standard Handling Domestik & Perlengkapan
    components.push({
      nama_komponen: `Handling Domestik & Perlengkapan`,
      kategori_komponen: 'Perlengkapan',
      vendor_id: 'Gudang Umaroh Pusat',
      qty: targetQty,
      harga_satuan: 1000000,
      total_biaya: 1000000 * targetQty,
    });

    // Dynamically append selected layanan / components
    selectedLayananItems.forEach((layanan) => {
      components.push({
        nama_komponen: layanan.nama,
        kategori_komponen: 'Layanan',
        vendor_id: 'Muassasah / Local Agent',
        qty: targetQty,
        harga_satuan: layanan.harga,
        total_biaya: layanan.harga * targetQty,
      });
    });

    setSoCostComponents(components);
    setSoValidationPaket(paket);
  };

  const handleConfirmValidateWithSo = async () => {
    if (!soValidationPaket) return;
    setSoIsSaving(true);
    try {
      const paket = soValidationPaket;
      
      // Fetch partner user record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let uData: any = null;
      if (paket.mitraId) {
        try {
          const userSnap = await getDoc(doc(db, 'users', paket.mitraId));
          if (userSnap.exists()) {
            uData = userSnap.data();
          }
        } catch (err) {
          console.error("Error fetching partner user:", err);
        }
      }

      // 1. Update paket_master
      await updateDoc(doc(db, 'paket_master', paket.id), {
        status: 'published',
        validationStatus: 'approved',
        updatedAt: serverTimestamp()
      });

      // 2. Ensure tracker_paket exists
      const trackerQuery = query(collection(db, 'tracker_paket'), where('paketMasterId', '==', paket.id));
      const trackerSnap = await getDocs(trackerQuery);
      if (trackerSnap.empty) {
        const maskapaiItem = maskapai.find(m => m.id === paket.maskapaiId);
        await addDoc(collection(db, 'tracker_paket'), {
          paketMasterId: paket.id,
          requestId: paket.requestId || '',
          namaPaket: paket.nama,
          tanggalBerangkat: maskapaiItem?.tanggalKeberangkatan || paket.tglBerangkat || '',
          status: 'Persiapan',
          targetJamaah: paket.kuota || 45,
          terdaftar: 0,
          createdAt: serverTimestamp()
        });
      }

      // 3. Create or Update mitra_tracker
      const mitraTrackerId = `mitra_tracker_${paket.id}`;
      const totalTagihan = (paket.hargaJualQuad || paket.hargaDasar || 32500000) * (paket.kuota || 45);
      const maskapaiItem = maskapai.find(m => m.id === paket.maskapaiId);
      
      await setDoc(doc(db, 'mitra_tracker', mitraTrackerId), {
        id: mitraTrackerId,
        nama_mitra: uData?.namaLengkap || uData?.name || 'Umaroh Pusat',
        nama_brand: uData?.brandName || 'Umaroh Pusat',
        pic: uData?.namaLengkap || uData?.name || 'Umaroh Pusat',
        hp: uData?.hp || '081234567890',
        kota: uData?.kota || 'Jakarta',
        jumlah_seat: paket.kuota || 45,
        paket_umroh: paket.nama,
        tanggal_berangkat: maskapaiItem?.tanggalKeberangkatan || paket.tglBerangkat || '',
        total_tagihan: totalTagihan,
        dp: 0,
        term1: 0,
        term2: 0,
        pelunasan: 0,
        total_bayar: 0,
        sisa_tagihan: totalTagihan,
        persentase_bayar: 0,
        deadline_pelunasan: '',
        hari_menuju_berangkat: 999,
        status_pembayaran: 'BELUM LUNAS',
        status_risiko: 'AMAN',
        status_keberangkatan: 'Aman',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // 4. Create package_cost_components (Vendor Payment Tracker)
      for (const comp of soCostComponents) {
        const compId = `component_${Math.random().toString(36).substring(2, 9)}`;
        await setDoc(doc(db, 'package_cost_components', compId), {
          id: compId,
          nama_komponen: comp.nama_komponen,
          kategori_komponen: comp.kategori_komponen,
          vendor_id: comp.vendor_id,
          package_id: paket.nama,
          qty: comp.qty,
          qty_used: 0,
          harga_satuan: comp.harga_satuan,
          total_biaya: comp.total_biaya,
          dp: 0,
          termin_1: 0,
          termin_2: 0,
          pelunasan: 0,
          total_bayar: 0,
          sisa_tagihan: comp.total_biaya,
          persentase_bayar: 0,
          tanggal_jatuh_tempo: paket.tglBerangkat || '',
          tanggal_pembayaran: '',
          status_pembayaran: 'Belum Bayar',
          status_risiko: 'Aman',
          status_operasional: 'Pending',
          approval_status: 'Approved',
          created_by: 'Admin Validation (Sales Order)',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      showNotification('success', 'Paket berhasil divalidasi dan data tersinkronisasi ke tracker paket, mitra, & vendor!');
      setSoValidationPaket(null);
    } catch (error) {
      console.error("Error confirming validation with SO:", error);
      showNotification('error', 'Gagal memproses validasi Sales Order.');
    } finally {
      setSoIsSaving(false);
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
    const { id, ...masterWithoutId } = master;
    setMarkupInitialData({
      ...masterWithoutId,
      paketMasterId: id,
      nama: master.nama,
      markup: 1000000,
      isMarkupOnly: true,
      mitraId: userId,
      isNewMarkup: true
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

  const filteredDraftMasters = paketMasters.filter(m => 
    (m.status === 'draft' || m.status === 'pending_validation') &&
    (m.mitraId === userId || userRole === 'admin' || userRole === 'operasional') &&
    m.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPublishedMasters = paketMasters.filter(m => 
    m.status === 'published' &&
    (userRole === 'admin' || userRole === 'operasional' || m.mitraId === userId) &&
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
            setViewingPaketDetail(null);
            showNotification('success', 'Paket berhasil diperbarui!');
          }}
        />
      </div>
    );
  }

  if (viewingPaketDetail) {
    return (
      <PaketDetailView 
        paket={viewingPaketDetail}
        hotels={hotels}
        maskapai={maskapai}
        onBack={() => setViewingPaketDetail(null)}
        onEdit={(paket) => {
          if (paket.mitraId === userId || userRole === 'admin' || userRole === 'operasional') {
            setEditingMaster(paket);
          } else {
            handleOpenMarkup(paket);
          }
        }}
        onDelete={(userId === viewingPaketDetail.mitraId || userRole === 'admin') ? (id) => setDeleteConfirm(id) : undefined}
      />
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
            onClick={() => setActiveTab('draft')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'draft' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Draf & Validasi ({filteredDraftMasters.length})
          </button>
          <button 
            onClick={() => setActiveTab('publish')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'publish' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Publish ({paketMitras.length + filteredPublishedMasters.length})
          </button>
          <button 
            onClick={() => setActiveTab('merge')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${activeTab === 'merge' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <GitMerge className="w-4 h-4" />
            Merge Group
          </button>
        </div>
      </div>

      {activeTab === 'draft' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDraftMasters.map((paket) => (
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
                  <div className={`${paket.status === 'pending_validation' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-500 text-white'} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border`}>
                    {paket.status === 'pending_validation' ? 'Menunggu Validasi' : 'Draf'}
                  </div>
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
                <div className="space-y-4 mb-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">HARGA DASAR ESTIMASI</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 font-medium tracking-tight">QUAD (4 Bed)</span>
                      <span className="text-gray-900 font-black italic">Rp {Math.round(paket.hargaJualQuad || paket.hargaDasar || paket.hargaEkonomi || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 font-medium tracking-tight">TRIPLE (3 Bed)</span>
                      <span className="text-gray-900 font-black italic">Rp {Math.round(paket.hargaJualTriple || (paket.hargaDasar ? paket.hargaDasar * 1.1 : 0)).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 font-medium tracking-tight">DOUBLE (2 Bed)</span>
                      <span className="text-gray-900 font-black italic">Rp {Math.round(paket.hargaJualDouble || (paket.hargaDasar ? paket.hargaDasar * 1.2 : 0)).toLocaleString('id-ID')}</span>
                    </div>
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
                      onClick={() => initializeSoCostComponents(paket)}
                      className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 py-3 rounded-2xl font-black italic uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 group shadow-lg shadow-emerald-600/20"
                    >
                      Validasi Sekarang
                      <CheckCircle2 className="w-3 h-3 animate-pulse" />
                    </button>
                  ) : (
                    <button 
                      disabled={true}
                      className="flex-1 bg-gray-100 text-gray-400 cursor-not-allowed py-3 rounded-2xl font-black italic uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
                    >
                      {paket.status === 'pending_validation' ? 'Sedang Divalidasi' : 'Draf'}
                    </button>
                  )}
                  {(paket.mitraId === userId || userRole === 'admin' || userRole === 'operasional') && (
                    <button 
                      onClick={() => setEditingMaster(paket)}
                      className="p-3 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-all"
                      title="Edit Master"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredDraftMasters.length === 0 && (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium tracking-widest text-xs uppercase">Tidak ada draf atau paket yang sedang divalidasi</p>
            </div>
          )}
        </div>
      ) : activeTab === 'publish' ? (
        <div className="space-y-8">
          {/* Katalog Master Section */}
          <div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Katalog Master Tersedia
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPublishedMasters.map((paket, idx) => (
                <div 
                  key={paket.id} 
                  onClick={() => setViewingPaketDetail(paket)}
                  className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 group transition-all hover:shadow-xl cursor-pointer"
                >
                  {/* Image Header with Badges & Overlays */}
                  <div className="h-44 bg-gray-200 relative">
                    <img 
                      src={`https://images.unsplash.com/photo-${idx % 3 === 0 ? '1565552643983-61629090f4fa' : idx % 3 === 1 ? '1591604129939-f1efa4d9f7fa' : '1512453979798-5ea266f8880c'}?q=80&w=800&auto=format&fit=crop`} 
                      alt={paket.nama} 
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
                      <Calendar className="w-3.0 h-3.0" />
                      <span className="text-[10px] font-black tracking-tight">{paket.tglBerangkat || '2026-05-15'}</span>
                    </div>

                    {/* Bottom Right Rating */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full">
                      <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-[10px] font-black text-white">4.9</span>
                    </div>
                  </div>

                  <div className="p-5">
                    {/* Title */}
                    <h3 className="text-gray-900 font-black text-sm md:text-base leading-tight uppercase italic tracking-tight mb-3">
                      {paket.nama}
                    </h3>
                    
                    {/* Icon Info Row */}
                    <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-50">
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Plane className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase tracking-tighter">{getMaskapaiInfo(paket.maskapaiId)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase tracking-tighter">{paket.durasiHari || '9'} HARI</span>
                      </div>
                    </div>

                    {/* Price & Action Row */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">HARGA DASAR MASTER</p>
                        <p className="text-emerald-600 font-black text-lg md:text-xl leading-none italic tracking-tighter">
                          Rp {Math.round(paket.hargaJualQuad || paket.hargaDasar || paket.hargaEkonomi || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="flex gap-1.5">
                          <button className="w-7 h-7 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100 transition-colors">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button className="w-7 h-7 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100 transition-colors">
                            <Share2 className="w-3 h-3" />
                          </button>
                          <button className="w-7 h-7 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100 transition-colors text-rose-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Detail Link Footer */}
                    <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">
                          {paket.kuota || 45} JAMAAH TERDAFTAR
                        </span>
                      </div>
                      <button 
                        onClick={() => setViewingPaketDetail(paket)}
                        className="text-indigo-600 font-black text-[9px] uppercase tracking-widest flex items-center gap-0.5 hover:gap-1.5 transition-all"
                      >
                        DETAIL <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paket Jualan Saya Section */}
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-50">
               <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Daftar Paket Publish Saya
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest font-black">
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
                        <div className="space-y-1">
                          <div className="text-[10px] flex justify-between gap-4">
                            <span className="text-gray-400 font-bold uppercase tracking-tighter">Q</span>
                            <span className="font-black italic text-indigo-700">
                              {formatCurrency((master?.hargaJualQuad || master?.hargaDasar || master?.hargaEkonomi || 0) + (paket.markup || 0))}
                            </span>
                          </div>
                          <div className="text-[10px] flex justify-between gap-4 border-t border-gray-50 pt-1">
                            <span className="text-gray-400 font-bold uppercase tracking-tighter">T</span>
                            <span className="font-black italic text-indigo-700">
                              {formatCurrency((master?.hargaJualTriple || (master?.hargaDasar ? master.hargaDasar * 1.1 : 0) || 0) + (paket.markup || 0))}
                            </span>
                          </div>
                          <div className="text-[10px] flex justify-between gap-4 border-t border-gray-50 pt-1">
                            <span className="text-gray-400 font-bold uppercase tracking-tighter">D</span>
                            <span className="font-black italic text-indigo-700">
                              {formatCurrency((master?.hargaJualDouble || (master?.hargaDasar ? master.hargaDasar * 1.2 : 0) || 0) + (paket.markup || 0))}
                            </span>
                          </div>
                        </div>
                        <div className="text-[9px] text-emerald-600 font-black uppercase tracking-tighter mt-1">Profit: +{formatCurrency(paket.markup)}</div>
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
      </div>
      ) : (
        renderMergeGroupTab()
      )}
      {/* Sales Order Profitability Validation Modal */}
      {soValidationPaket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setSoValidationPaket(null)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-gray-100 z-10 animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Activity className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-wide uppercase italic">Validasi Profitabilitas Sales Order</h3>
                  <p className="text-xs text-blue-100 font-medium">Analisis Kelayakan Finansial sebelum Paket Dipublikasikan</p>
                </div>
              </div>
              <button 
                onClick={() => setSoValidationPaket(null)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              {/* Info Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Nama Paket</p>
                  <p className="font-bold text-slate-800 text-sm">{soValidationPaket.nama}</p>
                  <p className="text-slate-500 mt-1">{soValidationPaket.deskripsi}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Mitra Pembuat</p>
                    <p className="font-bold text-indigo-700">
                      {(() => {
                        return "Mitra";
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Kuota / Seats</p>
                    <p className="font-extrabold text-slate-800">{soValidationPaket.kuota} Pax</p>
                  </div>
                </div>
              </div>

              {/* Two Column Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Harga Jual APK */}
                <div className="lg:col-span-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider border-b pb-1.5">Harga Jual Paket (APK)</h4>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                      <span className="text-xs font-bold text-slate-600">QUAD ROOM</span>
                      <span className="font-black text-emerald-700 text-sm">
                        Rp {Math.round(soValidationPaket.hargaJualQuad || soValidationPaket.hargaDasar || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                      <span className="text-xs font-semibold text-slate-600">TRIPLE ROOM</span>
                      <span className="font-bold text-indigo-700 text-sm">
                        Rp {Math.round(((soValidationPaket as unknown as Record<string, unknown>).hargaJualTriple as number) || (soValidationPaket.hargaJualQuad || soValidationPaket.hargaDasar || 0) + 1500000).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                      <span className="text-xs font-semibold text-slate-600">DOUBLE ROOM</span>
                      <span className="font-bold text-indigo-700 text-sm">
                        Rp {Math.round(((soValidationPaket as unknown as Record<string, unknown>).hargaJualDouble as number) || (soValidationPaket.hargaJualQuad || soValidationPaket.hargaDasar || 0) + 3000000).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-extrabold uppercase text-blue-500 tracking-wider mb-0.5">Potensi Total Pendapatan</p>
                    <p className="text-xl font-black text-blue-900 leading-none">
                      Rp {Math.round((soValidationPaket.hargaJualQuad || soValidationPaket.hargaDasar || 0) * (soValidationPaket.kuota || 45)).toLocaleString('id-ID')}
                    </p>
                    <p className="text-[10px] text-blue-600 font-medium mt-1">Berdasarkan Harga Jual Quad x Sisa Kuota ({soValidationPaket.kuota} Pax)</p>
                  </div>
                </div>

                {/* Right: Harga Beli Sesuai Vendor */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex justify-between items-center border-b pb-1.5">
                    <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">Harga Beli Vendor & Komponen Biaya</h4>
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">Dapat Disesuaikan</span>
                  </div>
                  
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                    {soCostComponents.map((comp, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                        <div className="flex-1">
                          <p className="font-black text-slate-800 leading-tight">{comp.nama_komponen}</p>
                          <div className="flex gap-2 text-[10px] text-slate-400 font-semibold uppercase mt-0.5">
                            <span>Kategori: {comp.kategori_komponen}</span>
                            <span>•</span>
                            <span className="text-indigo-600 font-extrabold">Vendor: {comp.vendor_id}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase">Rp</span>
                          <input 
                            type="number" 
                            value={comp.harga_satuan}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              const updated = [...soCostComponents];
                              updated[idx] = {
                                ...updated[idx],
                                harga_satuan: val,
                                total_biaya: val * comp.qty
                              };
                              setSoCostComponents(updated);
                            }}
                            className="w-28 px-2.5 py-1 text-right bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="text-slate-400 font-bold">x {comp.qty}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Profitability Summary Board */}
              {(() => {
                const totalRevenue = (soValidationPaket.hargaJualQuad || soValidationPaket.hargaDasar || 0) * (soValidationPaket.kuota || 45);
                const totalCost = soCostComponents.reduce((acc, c) => acc + (c.total_biaya || 0), 0);
                const netProfit = totalRevenue - totalCost;
                const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
                const isProfitable = netProfit > 0;

                return (
                  <div className={`p-5 rounded-3xl border ${isProfitable ? 'bg-emerald-50/60 border-emerald-100 text-emerald-900' : 'bg-rose-50 border-rose-100 text-rose-900'} grid grid-cols-1 md:grid-cols-3 gap-4 items-center`}>
                    <div className="md:col-span-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider">Hasil Analisis Finansial:</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${isProfitable ? 'bg-emerald-500 text-white border-emerald-600/20 shadow-sm shadow-emerald-500/20' : 'bg-rose-600 text-white border-rose-700/20 shadow-sm shadow-rose-600/20'}`}>
                          {isProfitable ? '🟢 PROFIT (UNTUNG)' : '🔴 LOSS (RUGI / TEKOR)'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        {isProfitable 
                          ? 'Paket dinilai layak dan menguntungkan. Estimasi keuntungan bersih di atas batas minimum margin operasional.' 
                          : 'Peringatan! Total harga beli vendor melebihi atau sama dengan harga jual paket. Kurangi biaya vendor sebelum memvalidasi.'}
                      </p>
                    </div>
                    <div className="text-right space-y-1 bg-white p-3.5 rounded-2xl border shadow-sm">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Laba Bersih & Margin</p>
                      <p className={`text-lg font-black leading-none ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {netProfit < 0 ? '-' : ''}Rp {Math.abs(Math.round(netProfit)).toLocaleString('id-ID')}
                      </p>
                      <p className={`text-[10px] font-extrabold ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {profitMargin.toFixed(1)}% Margin
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <button 
                onClick={() => setSoValidationPaket(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all"
              >
                Kembali
              </button>
              
              {(() => {
                const totalRevenue = (soValidationPaket.hargaJualQuad || soValidationPaket.hargaDasar || 0) * (soValidationPaket.kuota || 45);
                const totalCost = soCostComponents.reduce((acc, c) => acc + (c.total_biaya || 0), 0);
                const isProfitable = (totalRevenue - totalCost) > 0;

                return (
                  <button 
                    disabled={!isProfitable || soIsSaving}
                    onClick={handleConfirmValidateWithSo}
                    className={`px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 shadow-lg ${
                      isProfitable 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 cursor-pointer hover:-translate-y-0.5' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {soIsSaving ? 'Memproses Validasi...' : 'Setujui & Terbitkan (Valid & Profit)'}
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
