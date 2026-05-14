import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, db } from '../../firebase';
import { Plus, Edit2, Trash2, Save, X, ArrowLeft } from 'lucide-react';
import { PaketTracker, JamaahTracker, KeberangkatanTracker, Timeline } from './types';
import { generateTimelineEstimasi, getStatusColor } from './utils';
import { TrackerTimeline } from './TrackerTimeline';
import { ProgressSummary } from './ProgressSummary';
import { AlertBox } from './AlertBox';
import { MapTracking } from './MapTracking';
import { ChecklistOperasional } from './ChecklistOperasional';
import { RoomingList } from './RoomingList';
import { ManifestGenerator } from './ManifestGenerator';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';

export const TrackerPaket: React.FC = () => {
  const [pakets, setPakets] = useState<PaketTracker[]>([]);
  const [selectedPaket, setSelectedPaket] = useState<PaketTracker | null>(null);
  const [jamaahs, setJamaahs] = useState<JamaahTracker[]>([]);
  const [keberangkatans, setKeberangkatans] = useState<KeberangkatanTracker[]>([]);
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PaketTracker>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tracker_paket'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaketTracker));
      setPakets(data);
      if (selectedPaket) {
        const updated = data.find(p => p.id === selectedPaket.id);
        if (updated) setSelectedPaket(updated);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tracker_paket');
    });
    return () => unsubscribe();
  }, [selectedPaket]);

  useEffect(() => {
    if (!selectedPaket) return;
    const qJamaah = query(collection(db, 'tracker_jamaah'), where('paketId', '==', selectedPaket.id));
    const unsubJamaah = onSnapshot(qJamaah, (snapshot) => {
      setJamaahs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JamaahTracker)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tracker_jamaah');
    });

    const qKeberangkatan = query(collection(db, 'tracker_keberangkatan'), where('paketId', '==', selectedPaket.id));
    const unsubKeberangkatan = onSnapshot(qKeberangkatan, (snapshot) => {
      setKeberangkatans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KeberangkatanTracker)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tracker_keberangkatan');
    });

    return () => {
      unsubJamaah();
      unsubKeberangkatan();
    };
  }, [selectedPaket]);

  const handleSave = async () => {
    if (!formData.namaPaket || !formData.tanggalBerangkat) return;
    
    try {
      const dataToSave = { ...formData };
      delete (dataToSave as any).id;
      Object.keys(dataToSave).forEach(key => (dataToSave as any)[key] === undefined && delete (dataToSave as any)[key]);

      if (isEditing) {
        await updateDoc(doc(db, 'tracker_paket', isEditing), dataToSave);
        setIsEditing(null);
      } else {
        const timeline_estimasi = generateTimelineEstimasi(formData.tanggalBerangkat);
        await addDoc(collection(db, 'tracker_paket'), {
          ...dataToSave,
          status: formData.status || 'Persiapan',
          targetJamaah: formData.targetJamaah || 0,
          terdaftar: formData.terdaftar || 0,
          timeline_estimasi,
          timeline_actual: {}
        });
        setIsAdding(false);
      }
      setFormData({});
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tracker_paket');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tracker_paket', id));
      if (selectedPaket?.id === id) setSelectedPaket(null);
      setDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'tracker_paket');
    }
  };

  const startEdit = (paket: PaketTracker) => {
    setIsEditing(paket.id);
    setFormData(paket);
    setIsAdding(false);
  };

  const getComputedActual = (): Timeline => {
    if (!selectedPaket || !selectedPaket.timeline_estimasi) return {};
    const actual: Timeline = {};
    
    const totalJamaah = jamaahs.length;
    const hasJamaah = totalJamaah > 0;
    
    // DP: At least 1 jamaah has paid DP or Lunas
    const hasDP = hasJamaah && jamaahs.some(j => j.statusPembayaran === 'DP' || j.statusPembayaran === 'Lunas');
    if (hasDP) actual.dp = 'Selesai';
    
    // Pelunasan: ALL jamaah Lunas
    const allLunas = hasJamaah && jamaahs.every(j => j.statusPembayaran === 'Lunas');
    if (allLunas) actual.pelunasan = 'Selesai';
    
    // Dokumen: ALL jamaah have Paspor & Vaksin
    const allDokumen = hasJamaah && jamaahs.every(j => j.statusPaspor === 'Sudah Ada' && j.statusVaksin === 'Sudah');
    if (allDokumen) actual.dokumen = 'Selesai';
    
    // Visa: Keberangkatan statusVisa == 'Selesai'
    const visaSelesai = keberangkatans.length > 0 && keberangkatans.every(k => k.statusVisa === 'Selesai');
    if (visaSelesai) actual.visa = 'Selesai';
    
    // Tiket: Keberangkatan statusTiket == 'Issued'
    const tiketIssued = keberangkatans.length > 0 && keberangkatans.every(k => k.statusTiket === 'Issued');
    if (tiketIssued) actual.tiket = 'Selesai';
    
    // Berangkat: Today >= tanggalBerangkat
    const today = new Date();
    const tglBerangkat = new Date(selectedPaket.tanggalBerangkat);
    if (today >= tglBerangkat) actual.berangkat = 'Selesai';
    
    return actual;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Persiapan': return 'bg-gray-100 text-gray-800';
      case 'Booking Seat': return 'bg-blue-100 text-blue-800';
      case 'Proses Visa': return 'bg-amber-100 text-amber-800';
      case 'Siap Berangkat': return 'bg-emerald-100 text-emerald-800';
      case 'Selesai': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (selectedPaket) {
    const computedActual = getComputedActual();

    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedPaket(null)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Paket
        </button>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedPaket.namaPaket}</h2>
            <p className="text-gray-500">Tanggal Berangkat: {selectedPaket.tanggalBerangkat}</p>
          </div>
          <div className="text-left md:text-right">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 ${getStatusBadgeColor(selectedPaket.status)}`}>
              {selectedPaket.status}
            </span>
            <p className="text-sm text-gray-600">Target: {selectedPaket.targetJamaah} Jamaah</p>
          </div>
        </div>

        <AlertBox jamaahs={jamaahs} estimasi={selectedPaket.timeline_estimasi} actual={computedActual} tanggalBerangkat={selectedPaket.tanggalBerangkat} />

        <ChecklistOperasional paket={selectedPaket} />

        <RoomingList paketId={selectedPaket.id} jamaahs={jamaahs} />

        <ManifestGenerator 
          paket={selectedPaket} 
          jamaahs={jamaahs} 
          keberangkatan={keberangkatans.find(k => k.paketId === selectedPaket.id)} 
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <TrackerTimeline estimasi={selectedPaket.timeline_estimasi} actual={computedActual} />
          </div>
          
          <div className="space-y-6">
            <ProgressSummary jamaahs={jamaahs} targetJamaah={selectedPaket.targetJamaah} />
          </div>
        </div>

        <MapTracking paketId={selectedPaket.id} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">Data Tracker Paket</h2>
        <button 
          onClick={() => { setIsAdding(true); setIsEditing(null); setFormData({}); }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Tambah Paket
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="p-3 font-medium">Nama Paket</th>
              <th className="p-3 font-medium">Tanggal Berangkat</th>
              <th className="p-3 font-medium">Target / Terdaftar</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isAdding && (
              <tr className="bg-emerald-50/50">
                <td className="p-2"><input type="text" placeholder="Nama Paket" className="w-full p-1.5 border rounded" value={formData.namaPaket || ''} onChange={e => setFormData({...formData, namaPaket: e.target.value})} /></td>
                <td className="p-2"><input type="date" className="w-full p-1.5 border rounded" value={formData.tanggalBerangkat || ''} onChange={e => setFormData({...formData, tanggalBerangkat: e.target.value})} /></td>
                <td className="p-2 flex gap-2">
                  <input type="number" placeholder="Target" className="w-16 p-1.5 border rounded" value={formData.targetJamaah || ''} onChange={e => setFormData({...formData, targetJamaah: Number(e.target.value)})} />
                  <span className="self-center">/</span>
                  <input type="number" placeholder="Daftar" className="w-16 p-1.5 border rounded" value={formData.terdaftar || ''} onChange={e => setFormData({...formData, terdaftar: Number(e.target.value)})} />
                </td>
                <td className="p-2">
                  <select className="w-full p-1.5 border rounded" value={formData.status || 'Persiapan'} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                    <option value="Persiapan">Persiapan</option>
                    <option value="Booking Seat">Booking Seat</option>
                    <option value="Proses Visa">Proses Visa</option>
                    <option value="Siap Berangkat">Siap Berangkat</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </td>
                <td className="p-2 text-right">
                  <button onClick={handleSave} className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded mr-1"><Save className="w-4 h-4" /></button>
                  <button onClick={() => setIsAdding(false)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                </td>
              </tr>
            )}
            
            {pakets.map(paket => isEditing === paket.id ? (
              <tr key={paket.id} className="bg-blue-50/50">
                <td className="p-2"><input type="text" className="w-full p-1.5 border rounded" value={formData.namaPaket || ''} onChange={e => setFormData({...formData, namaPaket: e.target.value})} /></td>
                <td className="p-2"><input type="date" className="w-full p-1.5 border rounded" value={formData.tanggalBerangkat || ''} onChange={e => setFormData({...formData, tanggalBerangkat: e.target.value})} /></td>
                <td className="p-2 flex gap-2">
                  <input type="number" className="w-16 p-1.5 border rounded" value={formData.targetJamaah || ''} onChange={e => setFormData({...formData, targetJamaah: Number(e.target.value)})} />
                  <span className="self-center">/</span>
                  <input type="number" className="w-16 p-1.5 border rounded" value={formData.terdaftar || ''} onChange={e => setFormData({...formData, terdaftar: Number(e.target.value)})} />
                </td>
                <td className="p-2">
                  <select className="w-full p-1.5 border rounded" value={formData.status || 'Persiapan'} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                    <option value="Persiapan">Persiapan</option>
                    <option value="Booking Seat">Booking Seat</option>
                    <option value="Proses Visa">Proses Visa</option>
                    <option value="Siap Berangkat">Siap Berangkat</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </td>
                <td className="p-2 text-right">
                  <button onClick={handleSave} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded mr-1"><Save className="w-4 h-4" /></button>
                  <button onClick={() => setIsEditing(null)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                </td>
              </tr>
            ) : (
              <tr key={paket.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedPaket(paket)}>
                <td className="p-3 font-medium text-gray-900">{paket.namaPaket}</td>
                <td className="p-3 text-gray-600">{paket.tanggalBerangkat}</td>
                <td className="p-3 text-gray-600">{paket.targetJamaah} / {paket.terdaftar} Jamaah</td>
                <td className="p-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(paket.status)}`}>
                    {paket.status}
                  </span>
                </td>
                <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                  {deleteConfirm === paket.id ? (
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => handleDelete(paket.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Hapus</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded hover:bg-gray-300">Batal</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => startEdit(paket)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-1"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteConfirm(paket.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            
            {pakets.length === 0 && !isAdding && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">Belum ada data paket.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
