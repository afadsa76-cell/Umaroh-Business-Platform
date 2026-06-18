import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, Handshake, Layers, Hotel, 
  Plane, FileText, Info, ArrowRightLeft
} from 'lucide-react';
import { db, collection, onSnapshot, doc, updateDoc } from '../../firebase';
import { PaketTracker } from './types';

// Types for local mapping
interface MitraTrackerEntity {
  id: string;
  nama_mitra: string;
  nama_brand: string;
  pic: string;
  hp: string;
  kota: string;
  jumlah_seat: number;
  paket_umroh: string;
  tanggal_berangkat: string;
  total_tagihan: number;
  total_bayar: number;
  sisa_tagihan: number;
  status_pembayaran: string;
  status_keberangkatan: string;
}

interface CostComponentEntity {
  id: string;
  nama_komponen: string;
  kategori_komponen: string;
  package_id: string;
  qty: number;
  qty_used: number;
  harga_satuan: number;
  total_biaya: number;
  total_bayar: number;
  sisa_tagihan: number;
  status_pembayaran: string;
  status_operasional: string;
  status_risiko: string;
  tgl_keberangkatan?: string;
  
  // Specific fields
  airline_name?: string;
  flight_code?: string;
  route?: string;
  seat_block?: number;
  issued_ticket?: number;
  
  nama_hotel?: string;
  jumlah_room?: number;
  jenis_room?: string;
  
  jumlah_pengajuan?: number;
  jumlah_approved?: number;
  jumlah_pending?: number;
  provider_visa?: string;
}

interface DataSyncPanelProps {
  paket: PaketTracker;
}

export const DataSyncPanel: React.FC<DataSyncPanelProps> = ({ paket }) => {
  const [mitraTrackers, setMitraTrackers] = useState<MitraTrackerEntity[]>([]);
  const [costComponents, setCostComponents] = useState<CostComponentEntity[]>([]);
  const [isSyncingMitra, setIsSyncingMitra] = useState(false);
  const [isSyncingVendor, setIsSyncingVendor] = useState(false);
  const [activeSegment, setActiveSegment] = useState<'mitra' | 'vendor'>('mitra');
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'info' | 'error'; msg: string } | null>(null);

  // Load database collections in real-time
  useEffect(() => {
    const unsubMitra = onSnapshot(collection(db, 'mitra_tracker'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MitraTrackerEntity));
      setMitraTrackers(data);
    }, (error) => {
      console.warn("Mitra data subscription restricted or empty.", error);
    });

    const unsubVendor = onSnapshot(collection(db, 'package_cost_components'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CostComponentEntity));
      setCostComponents(data);
    }, (error) => {
      console.warn("Vendor component data subscription restricted or empty.", error);
    });

    return () => {
      unsubMitra();
      unsubVendor();
    };
  }, []);

  // Filter matched partners by date or packet name likeness
  const matchedMitras = mitraTrackers.filter(m => {
    const nameMatch = m.paket_umroh?.toLowerCase().includes(paket.namaPaket.toLowerCase()) || 
                      paket.namaPaket.toLowerCase().includes(m.paket_umroh?.toLowerCase() || '');
    const dateMatch = m.tanggal_berangkat === paket.tanggalBerangkat;
    return nameMatch || dateMatch;
  });

  // Filter matched vendor components (ERP allocations)
  const matchedComponents = costComponents.filter(c => {
    const packageIdMatch = c.package_id && paket.paketMasterId && c.package_id === paket.paketMasterId;
    const dateMatch = c.tgl_keberangkatan === paket.tanggalBerangkat;
    const nameMatch = c.nama_komponen?.toLowerCase().includes(paket.namaPaket.toLowerCase()) || 
                      c.nama_komponen?.toLowerCase().includes('all packages');
    return packageIdMatch || dateMatch || nameMatch;
  });

  const totalMitraSeats = matchedMitras.reduce((sum, m) => sum + (m.jumlah_seat || 0), 0);

  // Sync seats count with mitra tracker allocations
  const handleSyncMitraSeats = async () => {
    setIsSyncingMitra(true);
    setSyncMessage(null);
    try {
      // Update package's registered headcount with the total seat allocation of matched partners
      const currentHeadcount = totalMitraSeats;
      
      await updateDoc(doc(db, 'tracker_paket', paket.id), {
        terdaftar: currentHeadcount
      });

      setSyncMessage({
        type: 'success',
        msg: `SINKRONISASI BERHASIL! Jemaah terdaftar berhasil disinkronkan menjadi ${currentHeadcount} kursi sesuai alokasi booking dari ${matchedMitras.length} Mitra Travel partner.`
      });
    } catch (error) {
      console.error(error);
      setSyncMessage({
        type: 'error',
        msg: 'Gagal melakukan update sinkronisasi jumlah kursi mitra ke database.'
      });
    } finally {
      setIsSyncingMitra(false);
    }
  };

  // Sync checklist states based on vendor component fulfillment from ERP
  const handleSyncVendorChecklist = async () => {
    setIsSyncingVendor(true);
    setSyncMessage(null);
    try {
      // Prepare checklist structure
      const currentChecklist = { ...(paket.checklist || {}) };
      
      // 1. Airline components analyze
      const airlineComps = matchedComponents.filter(c => c.kategori_komponen === 'Airlines' || c.nama_komponen?.toLowerCase().includes('flight') || c.nama_komponen?.toLowerCase().includes('tiket'));
      if (airlineComps.length > 0) {
        const isIssued = airlineComps.every(c => c.status_operasional === 'Ready' || c.status_operasional === 'Confirmed' || c.status_pembayaran === 'Lunas');
        const isBooked = airlineComps.some(c => c.status_operasional === 'On Progress' || c.status_operasional === 'Confirmed');
        
        currentChecklist.statusTiket = isIssued ? 'Issued' : (isBooked ? 'Booked' : 'Pending');
      }

      // 2. Hotel components analyze
      const hotelMakkahComps = matchedComponents.filter(c => (c.kategori_komponen === 'Hotel' || c.nama_komponen?.toLowerCase().includes('hotel')) && c.nama_komponen?.toLowerCase().includes('makkah'));
      const hotelMadinahComps = matchedComponents.filter(c => (c.kategori_komponen === 'Hotel' || c.nama_komponen?.toLowerCase().includes('hotel')) && c.nama_komponen?.toLowerCase().includes('madinah'));
      
      if (hotelMakkahComps.length > 0) {
        const isPaid = hotelMakkahComps.every(c => c.status_pembayaran === 'Lunas');
        const isBooked = hotelMakkahComps.every(c => c.status_operasional === 'Ready' || c.status_operasional === 'Confirmed' || c.status_operasional === 'On Progress');
        currentChecklist.statusHotelMakkah = isPaid ? 'Paid' : (isBooked ? 'Booked' : 'Pending');
      }

      if (hotelMadinahComps.length > 0) {
        const isPaid = hotelMadinahComps.every(c => c.status_pembayaran === 'Lunas');
        const isBooked = hotelMadinahComps.every(c => c.status_operasional === 'Ready' || c.status_operasional === 'Confirmed' || c.status_operasional === 'On Progress');
        currentChecklist.statusHotelMadinah = isPaid ? 'Paid' : (isBooked ? 'Booked' : 'Pending');
      }

      // 3. Visa components analyze
      const visaComps = matchedComponents.filter(c => c.kategori_komponen === 'Visa' || c.nama_komponen?.toLowerCase().includes('visa'));
      if (visaComps.length > 0) {
        const isIssued = visaComps.every(c => {
          const qty = c.jumlah_pengajuan || c.qty || 0;
          const approved = c.jumlah_approved || c.qty_used || 0;
          return (approved >= qty && qty > 0) || c.status_operasional === 'Ready' || c.status_pembayaran === 'Lunas';
        });
        const isProcess = visaComps.some(c => c.status_operasional === 'On Progress' || (c.jumlah_pending || 0) > 0);
        currentChecklist.statusVisa = isIssued ? 'Issued' : (isProcess ? 'Proses Provider' : 'Pending');
      }

      // 4. Bus/Transport components analyze
      const transportComps = matchedComponents.filter(c => c.kategori_komponen === 'Transport' || c.kategori_komponen === 'Handling' || c.nama_komponen?.toLowerCase().includes('bus') || c.nama_komponen?.toLowerCase().includes('handling'));
      if (transportComps.length > 0) {
        const isPaid = transportComps.every(c => c.status_pembayaran === 'Lunas');
        const isBooked = transportComps.every(c => c.status_operasional === 'Ready' || c.status_operasional === 'Confirmed');
        currentChecklist.statusBus = isPaid ? 'Paid' : (isBooked ? 'Booked' : 'Pending');
      }

      await updateDoc(doc(db, 'tracker_paket', paket.id), {
        checklist: currentChecklist
      });

      setSyncMessage({
        type: 'success',
        msg: 'KLIRING & SINKRONISASI COV (Cost Component Tracker) BERHASIL! Status kelengkapan dokumen internal (Checklist Operasional) telah diselaraskan dengan realisasi pembelian & konfirmasi vendor ERP Anda!'
      });
    } catch (e) {
      console.error(e);
      setSyncMessage({
        type: 'error',
        msg: 'Gagal menyelaraskan checklist operasional dengan data vendor.'
      });
    } finally {
      setIsSyncingVendor(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-6">
      
      {/* Header Container */}
      <div className="bg-slate-900 text-white p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600/30 text-indigo-400 p-2.5 rounded-xl border border-indigo-500/20">
            <ArrowRightLeft className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-100">Live Integration Hub & Sinkronisasi</h3>
            <p className="text-xs text-slate-400 mt-1">Gunakan panel ini untuk mengkonsolidasi & menyelaraskan data operasional dengan tim keuangan (Mitra Booking) & vendor logistik (ERP/COV).</p>
          </div>
        </div>

        {/* Tab Controls Inside Header */}
        <div className="flex bg-slate-800 p-1 border border-slate-705/80 rounded-xl text-xs font-bold leading-none select-none">
          <button 
            type="button"
            onClick={() => { setActiveSegment('mitra'); setSyncMessage(null); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg cursor-pointer transition-all ${activeSegment === 'mitra' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Handshake className="w-3.5 h-3.5" /> Jaringan Mitra ({matchedMitras.length})
          </button>
          <button 
            type="button"
            onClick={() => { setActiveSegment('vendor'); setSyncMessage(null); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg cursor-pointer transition-all ${activeSegment === 'vendor' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Layers className="w-3.5 h-3.5" /> Vendor ERP Logistik ({matchedComponents.length})
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5">
        
        {/* Dynamic Alerts Feedback */}
        {syncMessage && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 mb-5 text-xs font-bold leading-relaxed animate-in fade-in zoom-in-95 duration-200 ${
            syncMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : syncMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-indigo-50 border-indigo-200 text-indigo-800'
          }`}>
            <span className="text-lg shrink-0 -mt-0.5">{syncMessage.type === 'success' ? '✓' : '⚠'}</span>
            <div className="flex-1">
              {syncMessage.msg}
            </div>
            <button 
              onClick={() => setSyncMessage(null)}
              className="text-slate-400 hover:text-slate-600 font-extrabold px-1 shrink-0"
              title="Tutup"
            >
              ×
            </button>
          </div>
        )}

        {/* SECTION 1: MITRA SYNCHRONIZATION */}
        {activeSegment === 'mitra' && (
          <div className="space-y-5 animate-in fade-in duration-350">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gray-50 border border-gray-200/80 p-4 rounded-xl">
              <div>
                <span className="text-[10px] bg-indigo-50 text-indigo-750 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-widest block mb-1">KOMPARASI KURSI</span>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 font-bold uppercase">Terdaftar Saat Ini:</span>
                    <p className="text-lg font-black text-slate-800 mt-0.5">{paket.terdaftar} Jemaah</p>
                  </div>
                  <div className="border-l border-gray-300 h-8 self-center" />
                  <div>
                    <span className="text-gray-400 font-bold uppercase">Booking Dari Mitra:</span>
                    <p className="text-lg font-black text-indigo-750 mt-0.5">{totalMitraSeats} Kursi</p>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-auto">
                <button
                  onClick={handleSyncMitraSeats}
                  disabled={isSyncingMitra || matchedMitras.length === 0}
                  className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm ${
                    isSyncingMitra 
                      ? 'bg-gray-100 text-gray-400 border border-gray-200' 
                      : matchedMitras.length === 0
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingMitra ? 'animate-spin' : ''}`} /> Sinkronisasikan Seat Terdaftar ({totalMitraSeats} Kursi)
                </button>
              </div>
            </div>

            {/* List Matched partner allocations details */}
            <div>
              <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider mb-2">DETAIL ALOKASI BOOKING MITRA TRAVEL ({matchedMitras.length} MITRA TERINTEGRASI)</h4>
              
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Nama Mitra / Brand</th>
                      <th className="p-3">Kontak PIC</th>
                      <th className="p-3 text-center">Seat Booking</th>
                      <th className="p-3">Pembayaran Finansial</th>
                      <th className="p-3 text-center">Tingkat Bayar</th>
                      <th className="p-3">Pembayaran Status</th>
                      <th className="p-3">Keberangkatan Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {matchedMitras.map((mit) => {
                      const totalBill = mit.total_tagihan || 0;
                      const paid = mit.total_bayar || 0;
                      const pct = totalBill > 0 ? Math.round((paid / totalBill) * 100) : 0;
                      
                      return (
                        <tr key={mit.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="p-3 font-bold text-slate-800">
                            <div>{mit.nama_brand}</div>
                            <div className="text-[10px] text-gray-400 font-medium font-mono">{mit.nama_mitra}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold">{mit.pic || 'Tidak dicatat'}</div>
                            <div className="text-gray-400 font-mono text-[10px]">{mit.hp || '--'}</div>
                          </td>
                          <td className="p-3 text-center font-black text-indigo-750 text-sm">
                            {mit.jumlah_seat} Seat
                          </td>
                          <td className="p-3">
                            <div className="font-mono text-slate-700">Bayar: Rp {paid.toLocaleString('id-ID')}</div>
                            <div className="font-mono text-gray-450 text-[10px]">Tagihan: Rp {totalBill.toLocaleString('id-ID')}</div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{pct}%</span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              mit.status_pembayaran === 'Lunas' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                                : mit.status_pembayaran === 'DP' 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-150' 
                                  : 'bg-red-50 text-red-700 border border-red-150'
                            }`}>
                              {mit.status_pembayaran}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              mit.status_keberangkatan === 'Aman' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-155' 
                                : 'bg-rose-50 text-rose-700 border border-rose-155'
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${mit.status_keberangkatan === 'Aman' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {mit.status_keberangkatan || 'Aman'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {matchedMitras.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-400 font-bold leading-relaxed">
                          Tidak ditemukan alokasi jemaah Mitra yang terdaftar atau mencocokkan nama paket "{paket.namaPaket}" atau keberangkatan tanggal {paket.tanggalBerangkat}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: VENDOR LOGISTICS SYNCHRONIZATION */}
        {activeSegment === 'vendor' && (
          <div className="space-y-5 animate-in fade-in duration-350">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gray-50 border border-gray-200/80 p-4 rounded-xl">
              <div className="flex items-start gap-2 text-xs">
                <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-black text-slate-800 uppercase tracking-wider">KLIRING INTEGRAL VENDOR & COV COMPONENTS</span>
                  <p className="text-gray-500 font-medium mt-1">Sistem menyisir detail realisasi penerbangan maskapai, kamar hotel, dan approval visa jemaah di tim logistik untuk mengupdate Checklist Operasional jemaah seketika.</p>
                </div>
              </div>

              <div className="w-full lg:w-auto">
                <button
                  onClick={handleSyncVendorChecklist}
                  disabled={isSyncingVendor || matchedComponents.length === 0}
                  className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm ${
                    isSyncingVendor 
                      ? 'bg-gray-100 text-gray-400 border border-gray-200' 
                      : matchedComponents.length === 0
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingVendor ? 'animate-spin' : ''}`} /> Sinkronisasikan Checklist Operasional Tim
                </button>
              </div>
            </div>

            {/* List and breakdown of cost component bookings from vendor */}
            <div>
              <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider mb-2">KOMPONEN BIAYA & ALOKASI VENDOR ERP ({matchedComponents.length} ITEM)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchedComponents.map((comp) => {
                  const percentPaid = comp.total_biaya > 0 ? Math.round((comp.total_bayar / comp.total_biaya) * 100) : 0;
                  
                  return (
                    <div key={comp.id} className="border border-gray-150 p-4 rounded-xl flex flex-col justify-between hover:border-indigo-300 transition-colors bg-white">
                      <div>
                        
                        {/* Component header */}
                        <div className="flex justify-between items-start border-b border-gray-100 pb-2 mb-3">
                          <div className="flex items-center gap-2">
                            {comp.kategori_komponen === 'Airlines' ? (
                              <Plane className="w-4 h-4 text-blue-600 shrink-0" />
                            ) : comp.kategori_komponen === 'Hotel' ? (
                              <Hotel className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                            )}
                            <span className="font-extrabold text-slate-800 uppercase text-xs leading-none">
                              {comp.kategori_komponen} - {comp.nama_komponen}
                            </span>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            comp.status_operasional === 'Ready' || comp.status_operasional === 'Confirmed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                              : 'bg-amber-50 text-amber-700 border border-amber-150'
                          }`}>
                            {comp.status_operasional || 'Ready'}
                          </span>
                        </div>

                        {/* Custom visual data depending on type */}
                        {comp.kategori_komponen === 'Airlines' && (
                          <div className="space-y-1 text-[11px] mb-3 bg-blue-50/30 p-2 rounded-lg border border-blue-100/60">
                            <p className="font-semibold text-slate-700">✈️ Maskapai: <span className="font-extrabold">{comp.airline_name || 'Tidak tercatat'}</span></p>
                            <p className="text-gray-500 font-medium">Braket Block: <span className="font-bold text-slate-800">{comp.seat_block || comp.qty} Seat</span> | Issued: <span className="font-bold text-emerald-600">{comp.issued_ticket || comp.qty_used || 0} Tiket</span></p>
                          </div>
                        )}

                        {comp.kategori_komponen === 'Hotel' && (
                          <div className="space-y-1 text-[11px] mb-3 bg-emerald-50/30 p-2 rounded-lg border border-emerald-100/60">
                            <p className="font-semibold text-slate-700">🏨 Hotel: <span className="font-extrabold">{comp.nama_hotel || 'Tidak tercatat'}</span></p>
                            <p className="text-gray-500 font-medium">Alokasi Kamar: <span className="font-bold text-slate-800">{comp.jumlah_room || comp.qty} Kamar {comp.jenis_room ? `(${comp.jenis_room})` : ''}</span></p>
                          </div>
                        )}

                        {comp.kategori_komponen === 'Visa' && (
                          <div className="space-y-1 text-[11px] mb-3 bg-purple-50/30 p-2 rounded-lg border border-purple-100/60">
                            <p className="font-semibold text-slate-700">🛂 Provider Visa: <span className="font-extrabold">{comp.provider_visa || 'Tidak tercatat'}</span></p>
                            <p className="text-gray-500 font-medium">Pengajuan: <span className="font-bold text-slate-800">{comp.jumlah_pengajuan || comp.qty}</span> | Approved: <span className="font-bold text-emerald-600">{comp.jumlah_approved || comp.qty_used || 0}</span></p>
                          </div>
                        )}

                        {/* financial row */}
                        <div className="flex justify-between text-[11px] text-gray-550 pt-2 font-mono border-t border-gray-100/60 mt-2">
                          <span>Biaya: Rp {comp.total_biaya?.toLocaleString('id-ID')}</span>
                          <span className="font-bold text-emerald-700">Lunas: {percentPaid}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {matchedComponents.length === 0 && (
                  <div className="md:col-span-2 p-8 text-center text-gray-400 font-bold leading-relaxed border border-dashed border-gray-250 rounded-xl bg-gray-50/50">
                    Tidak ditemukan pos biaya vendor yang dicatatkan di ERP / COV untuk Paket Master terkait ("{paket.namaPaket}"). Pastikan Vendor Tracker telah mengisi rincian maskapai/hotel untuk paket terkait.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
