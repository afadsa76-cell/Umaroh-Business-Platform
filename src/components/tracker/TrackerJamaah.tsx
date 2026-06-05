import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, db, handleFirestoreError, OperationType } from '../../firebase';
import { generateWALink, getWATemplate, openWhatsApp } from '../../utils/whatsapp';
import { JamaahTracker, PaketTracker } from './types';
import { safeJsonParse } from '../../utils/firebaseSync';

import { Camera, RefreshCw, Plus, MessageCircle, Package, FolderOpen, FileText, Edit2, Trash2, Save, X } from 'lucide-react';

import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Toast } from '@capacitor/toast';

export const TrackerJamaah: React.FC = () => {
  const [jamaahs, setJamaahs] = useState<JamaahTracker[]>([]);
  const [pakets, setPakets] = useState<PaketTracker[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<JamaahTracker>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [viewMode, setViewMode] = useState<'tracker' | 'manifest'>('tracker');
  const [isScanning, setIsScanning] = useState<string | null>(null);

  const scanDocument = async (id: string, fileOrBase64: File | string, mimeType?: string) => {
    try {
      setIsScanning(id);
      
      let base64Data = '';
      let type = '';

      if (typeof fileOrBase64 === 'string') {
        base64Data = fileOrBase64;
        type = mimeType || 'image/jpeg';
      } else {
        const reader = new FileReader();
        base64Data = await new Promise<string>((resolve) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(fileOrBase64);
        });
        type = fileOrBase64.type;
      }

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gemini-3.5-flash",
          contents: [
            {
              parts: [
                { text: "Ekstrak data dari gambar Paspor atau KTP ini. Berikan hasil dalam format JSON dengan field: title (LAKI-LAKI/PEREMPUAN/MR/MRS/MS), nik (hanya untuk KTP), no_paspor (hanya untuk Paspor), nama_paspor, tgl_issue_paspor (YYYY-MM-DD), tgl_exp_paspor (YYYY-MM-DD), kota_paspor, tempat_lahir, tanggal_lahir (YYYY-MM-DD), kewarganegaraan. Jika field tidak ditemukan gunakan null." },
                { inlineData: { data: base64Data, mimeType: type } }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                nik: { type: "STRING" },
                no_paspor: { type: "STRING" },
                nama_paspor: { type: "STRING" },
                tgl_issue_paspor: { type: "STRING" },
                tgl_exp_paspor: { type: "STRING" },
                kota_paspor: { type: "STRING" },
                tempat_lahir: { type: "STRING" },
                tanggal_lahir: { type: "STRING" },
                kewarganegaraan: { type: "STRING" },
              }
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Gagal memproses gambar melalui server.");
      }

      const resData = await response.json();
      const rawText = resData.text || '';
      const result = safeJsonParse(rawText);
      
      const updateData: Partial<JamaahTracker> = {};
      Object.keys(result).forEach(key => {
        if (result[key] !== null && result[key] !== undefined && result[key] !== "") {
          const val = result[key];
          if (key.includes('tgl') || key.includes('tanggal')) {
            (updateData as Record<string, string>)[key] = String(val);
          } else {
            (updateData as Record<string, string>)[key] = String(val).toUpperCase();
          }
        }
      });

      // Map special fields
      if (result.nama_paspor && !updateData.namaLengkap) {
        updateData.namaLengkap = result.nama_paspor.toUpperCase();
      }
      
      if (result.title) {
        const title = result.title.toUpperCase();
        if (['LAKI-LAKI', 'MR', 'MSTR'].includes(title)) {
          updateData.jenisKelamin = 'L';
        } else if (['PEREMPUAN', 'MRS', 'MS', 'MISS'].includes(title)) {
          updateData.jenisKelamin = 'P';
        }
      }

      if (Object.keys(updateData).length > 0) {
        try {
          await updateDoc(doc(db, 'tracker_jamaah', id), updateData);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `tracker_jamaah/${id}`);
        }
      }
      
      setIsScanning(null);
    } catch (error) {
      console.error("Scanning error:", error);
      setIsScanning(null);
      alert("Gagal melakukan scan dokumen. Pastikan gambar jelas dan merupakan KTP atau Paspor.");
    }
  };

  const handlePhotoAction = async (id: string, e?: React.ChangeEvent<HTMLInputElement>) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Toast.show({
          text: 'Membuka Kamera/Galeri...',
          duration: 'short'
        });

        const image = await CapCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Prompt,
          promptLabelHeader: 'Scan Dokumen',
          promptLabelPhoto: 'Ambil dari Galeri',
          promptLabelPicture: 'Ambil Foto Baru'
        });
        
        if (image.base64String) {
          await Toast.show({
            text: 'Memproses Gambar AI...',
            duration: 'short'
          });
          scanDocument(id, image.base64String, image.format === 'png' ? 'image/png' : 'image/jpeg');
        }
      } catch (err) {
        console.error('Camera error:', err);
        // Error when user cancels is expected
        if (err instanceof Error && !err.message.includes('User cancelled')) {
          await Toast.show({
            text: 'Gagal membuka kamera: ' + (err.message || 'Unknown error'),
            duration: 'long'
          });
        }
      }
    } else if (e) {
      const file = e.target.files?.[0];
      if (file) scanDocument(id, file);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Manifest Modal State
  const [isManifestModalOpen, setIsManifestModalOpen] = useState(false);
  const [manifestData, setManifestData] = useState<Partial<JamaahTracker>>({});
  const [manifestJamaahId, setManifestJamaahId] = useState<string | null>(null);

  // Dokumen Modal State
  const [isDokumenModalOpen, setIsDokumenModalOpen] = useState(false);
  const [dokumenData, setDokumenData] = useState<Partial<JamaahTracker>>({});
  const [dokumenJamaahId, setDokumenJamaahId] = useState<string | null>(null);

  const [isPerlengkapanModalOpen, setIsPerlengkapanModalOpen] = useState(false);
  const [perlengkapanData, setPerlengkapanData] = useState<Partial<JamaahTracker>>({});
  const [perlengkapanJamaahId, setPerlengkapanJamaahId] = useState<string | null>(null);

  useEffect(() => {
    const unsubJamaah = onSnapshot(collection(db, 'tracker_jamaah'), (snapshot) => {
      setJamaahs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JamaahTracker)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tracker_jamaah');
    });
    const unsubPaket = onSnapshot(collection(db, 'tracker_paket'), (snapshot) => {
      setPakets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaketTracker)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tracker_paket');
    });
    return () => { unsubJamaah(); unsubPaket(); };
  }, []);

  const handleInlineUpdate = async (id: string, field: keyof JamaahTracker, value: string | number | boolean | undefined) => {
    try {
      const updateData: Partial<JamaahTracker> = { [field]: value };
      
      // If updating nama_paspor and namaLengkap is empty or same as old nama_paspor, sync it
      if (field === 'nama_paspor') {
        const jamaah = jamaahs.find(j => j.id === id);
        if (jamaah && (!jamaah.namaLengkap || jamaah.namaLengkap === jamaah.nama_paspor)) {
          updateData.namaLengkap = value as string;
        }
      }

      await updateDoc(doc(db, 'tracker_jamaah', id), updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tracker_jamaah');
    }
  };

  const handleSave = async () => {
    if (!formData.namaLengkap) {
      alert('Nama Lengkap harus diisi!');
      return;
    }
    if (!formData.paketId) {
      alert('Silakan pilih Paket!');
      return;
    }
    
    try {
      const dataToSave = { ...formData };
      delete dataToSave.id;
      Object.keys(dataToSave).forEach(key => (dataToSave as Record<string, unknown>)[key] === undefined && delete (dataToSave as Record<string, unknown>)[key]);

      if (isEditing) {
        await updateDoc(doc(db, 'tracker_jamaah', isEditing), dataToSave);
        setIsEditing(null);
        alert('Data berhasil diperbarui!');
      } else {
        await addDoc(collection(db, 'tracker_jamaah'), {
          ...dataToSave,
          statusPembayaran: formData.statusPembayaran || 'Belum Bayar',
          statusPaspor: formData.statusPaspor || 'Belum Ada',
          statusVaksin: formData.statusVaksin || 'Belum',
          status_kesiapan: 'NOT_READY'
        });
        setIsAdding(false);
        alert('Data berhasil ditambahkan!');
      }
      setFormData({
        statusPembayaran: 'Belum Bayar',
        statusPaspor: 'Belum Ada',
        statusVaksin: 'Belum',
        status_kesiapan: 'NOT_READY'
      });
    } catch (error) {
      console.error("Save error:", error);
      alert('Gagal menyimpan data.');
      handleFirestoreError(error, OperationType.WRITE, 'tracker_jamaah');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tracker_jamaah', id));
      setDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'tracker_jamaah');
    }
  };

  const startEdit = (jamaah: JamaahTracker) => {
    setIsEditing(jamaah.id);
    setFormData(jamaah);
    setIsAdding(false);
  };

  const openManifestModal = (jamaah: JamaahTracker) => {
    setManifestJamaahId(jamaah.id);
    setManifestData(jamaah);
    setIsManifestModalOpen(true);
  };

  const saveManifestData = async () => {
    if (!manifestJamaahId) return;
    try {
      const dataToSave = { ...manifestData };
      delete dataToSave.id;
      Object.keys(dataToSave).forEach(key => (dataToSave as Record<string, unknown>)[key] === undefined && delete (dataToSave as Record<string, unknown>)[key]);
      
      await updateDoc(doc(db, 'tracker_jamaah', manifestJamaahId), dataToSave);
      setIsManifestModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tracker_jamaah');
    }
  };

  const openDokumenModal = (jamaah: JamaahTracker) => {
    setDokumenJamaahId(jamaah.id);
    setDokumenData(jamaah);
    setIsDokumenModalOpen(true);
  };

  const saveDokumenData = async () => {
    if (!dokumenJamaahId) return;
    try {
      const dataToSave = { ...dokumenData };
      delete dataToSave.id;
      Object.keys(dataToSave).forEach(key => (dataToSave as Record<string, unknown>)[key] === undefined && delete (dataToSave as Record<string, unknown>)[key]);
      
      await updateDoc(doc(db, 'tracker_jamaah', dokumenJamaahId), dataToSave);
      setIsDokumenModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tracker_jamaah');
    }
  };

  const openPerlengkapanModal = (jamaah: JamaahTracker) => {
    setPerlengkapanJamaahId(jamaah.id);
    setPerlengkapanData(jamaah);
    setIsPerlengkapanModalOpen(true);
  };

  const savePerlengkapanData = async () => {
    if (!perlengkapanJamaahId) return;
    try {
      const dataToSave = { ...perlengkapanData };
      delete dataToSave.id;
      Object.keys(dataToSave).forEach(key => (dataToSave as Record<string, unknown>)[key] === undefined && delete (dataToSave as Record<string, unknown>)[key]);
      
      await updateDoc(doc(db, 'tracker_jamaah', perlengkapanJamaahId), dataToSave);
      setIsPerlengkapanModalOpen(false);
      
      // Update inventory (simplified: we should ideally check diff, but for now we just trust the state)
      // In a real app, we'd need a backend transaction to ensure inventory consistency.
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tracker_jamaah');
    }
  };

  const getPaketName = (id: string) => pakets.find(p => p.id === id)?.namaPaket || 'Unknown Paket';

  const getBadgeColor = (status: string) => {
    if (['Lunas', 'Sudah Ada', 'Sudah', 'READY'].includes(status)) return 'bg-emerald-100 text-emerald-800';
    if (['DP', 'Dalam Proses'].includes(status)) return 'bg-amber-100 text-amber-800';
    return 'bg-rose-100 text-rose-800';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800">Data Tracker Jamaah</h2>
          <div className="flex border rounded-lg overflow-hidden bg-white">
            <button 
              onClick={() => setViewMode('tracker')}
              className={`px-3 py-1 text-xs font-medium ${viewMode === 'tracker' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Tracker View
            </button>
            <button 
              onClick={() => setViewMode('manifest')}
              className={`px-3 py-1 text-xs font-medium ${viewMode === 'manifest' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Manifest Entry
            </button>
          </div>
        </div>
        <button 
          onClick={() => { setViewMode('tracker'); setIsAdding(true); setIsEditing(null); setFormData({}); }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Tambah Jamaah
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            {viewMode === 'tracker' ? (
              <tr>
                <th className="p-3 font-medium">Nama Lengkap / NIK</th>
                <th className="p-3 font-medium text-center">Scan AI</th>
                <th className="p-3 font-medium">Gender</th>
                <th className="p-3 font-medium">Paket Keberangkatan</th>
                <th className="p-3 font-medium">Status Kesiapan</th>
                <th className="p-3 font-medium">Pembayaran</th>
                <th className="p-3 font-medium">Paspor</th>
                <th className="p-3 font-medium">Vaksin</th>
                <th className="p-3 font-medium text-right">Aksi</th>
              </tr>
            ) : (
              <tr>
                <th className="p-2 border border-gray-200 font-medium whitespace-nowrap text-center">No</th>
                <th className="p-2 border border-gray-200 font-medium whitespace-nowrap text-center">Scan</th>
                <th className="p-2 border border-gray-200 font-medium whitespace-nowrap">Title</th>
                <th className="p-2 border border-gray-200 font-medium whitespace-nowrap">No Identitas</th>
                <th className="p-2 border border-gray-200 font-medium whitespace-nowrap min-w-[200px]">Nama Paspor</th>
                <th className="p-2 border border-gray-200 font-medium whitespace-nowrap">No Paspor</th>
                <th className="p-2 border border-gray-200 font-medium whitespace-nowrap">Tgl Issue</th>
                <th className="p-2 border border-gray-200 font-medium whitespace-nowrap">Tgl Exp</th>
                <th className="p-2 border border-gray-200 font-medium whitespace-nowrap">Kota Paspor</th>
                <th className="p-2 border border-gray-200 font-medium whitespace-nowrap">Tempat Lahir</th>
                <th className="p-2 border border-gray-200 font-medium whitespace-nowrap">Tgl Lahir</th>
                <th className="p-2 border border-gray-200 font-medium whitespace-nowrap">WN</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isAdding && viewMode === 'tracker' && (
              <tr className="bg-emerald-50/50">
                <td className="p-2 space-y-1">
                  <input type="text" placeholder="Nama Lengkap" className="w-full p-1.5 border rounded text-xs" value={formData.namaLengkap || ''} onChange={e => setFormData({...formData, namaLengkap: e.target.value})} />
                  <input type="text" placeholder="NIK" className="w-full p-1.5 border rounded text-xs" value={formData.nik || ''} onChange={e => setFormData({...formData, nik: e.target.value})} />
                </td>
                <td className="p-2 text-center">
                  <div className="flex justify-center">
                    <label 
                      title="Scan Paspor/KTP"
                      className={`cursor-pointer p-1.5 rounded-full transition-colors ${isScanning === 'new' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-600'}`}
                    >
                      {isScanning === 'new' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        capture="environment"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              setIsScanning('new');
                              const reader = new FileReader();
                              const base64Data = await new Promise<string>((resolve) => {
                                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                                reader.readAsDataURL(file);
                              });

                              const response = await fetch('/api/ai/generate', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  model: "gemini-3.5-flash",
                                  contents: [{
                                    parts: [
                                      { text: "Extract passport or ID card data. Return JSON with title (LAKI-LAKI/PEREMPUAN/MR/MRS/MS), nik, no_paspor, nama_paspor, tgl_issue_paspor, tgl_exp_paspor, kota_paspor, tempat_lahir, tanggal_lahir, kewarganegaraan." },
                                      { inlineData: { data: base64Data, mimeType: file.type } }
                                    ]
                                  }],
                                  config: {
                                    responseMimeType: "application/json",
                                    responseSchema: {
                                      type: "OBJECT",
                                      properties: {
                                        title: { type: "STRING" },
                                        nik: { type: "STRING" },
                                        no_paspor: { type: "STRING" },
                                        nama_paspor: { type: "STRING" },
                                        tgl_issue_paspor: { type: "STRING" },
                                        tgl_exp_paspor: { type: "STRING" },
                                        kota_paspor: { type: "STRING" },
                                        tempat_lahir: { type: "STRING" },
                                        tanggal_lahir: { type: "STRING" },
                                        kewarganegaraan: { type: "STRING" },
                                      }
                                    }
                                  }
                                })
                              });

                              if (!response.ok) {
                                const errorText = await response.text();
                                throw new Error(errorText || "Gagal memproses gambar melalui server.");
                              }

                              const resData = await response.json();
                              const rawText = resData.text || '';
                              const result = safeJsonParse(rawText);

                              setFormData(prev => {
                                const newData: Partial<JamaahTracker> = { ...prev };
                                Object.keys(result).forEach(key => {
                                  if (result[key] !== null && result[key] !== undefined && result[key] !== "") {
                                    const val = result[key];
                                    if (key.includes('tgl') || key.includes('tanggal')) {
                                      (newData as Record<string, string>)[key] = String(val);
                                    } else {
                                      (newData as Record<string, string>)[key] = String(val).toUpperCase();
                                    }
                                  }
                                });

                                // Map special fields
                                if (result.nama_paspor && !newData.namaLengkap) {
                                  newData.namaLengkap = result.nama_paspor.toUpperCase();
                                }
                                
                                if (result.title) {
                                  const title = result.title.toUpperCase();
                                  if (['LAKI-LAKI', 'MR', 'MSTR'].includes(title)) {
                                    newData.jenisKelamin = 'L';
                                  } else if (['PEREMPUAN', 'MRS', 'MS', 'MISS'].includes(title)) {
                                    newData.jenisKelamin = 'P';
                                  }
                                }

                                return newData;
                              });

                              setIsScanning(null);
                              alert("Scan berhasil! Silakan pilih Paket dan klik Simpan.");
                            } catch (err) {
                              console.error("Scan error:", err);
                              setIsScanning(null);
                              alert("Gagal memindai dokumen. Pastikan gambar jelas.");
                            }
                          }
                        }}
                        disabled={isScanning !== null}
                      />
                    </label>
                  </div>
                </td>
                <td className="p-2">
                  <select className="w-full p-1.5 border rounded text-xs" value={formData.jenisKelamin || ''} onChange={e => setFormData({...formData, jenisKelamin: e.target.value as 'L' | 'P'})}>
                    <option value="">Pilih...</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </td>
                <td className="p-2">
                  <select className="w-full p-1.5 border rounded text-xs" value={formData.paketId || ''} onChange={e => setFormData({...formData, paketId: e.target.value})}>
                    <option value="">Pilih Paket...</option>
                    {pakets.map(p => <option key={p.id} value={p.id}>{p.namaPaket}</option>)}
                  </select>
                </td>
                <td className="p-2 text-gray-400 text-xs italic">NOT_READY</td>
                <td className="p-2">
                  <select className="w-full p-1.5 border rounded text-xs" value={formData.statusPembayaran || 'Belum Bayar'} onChange={e => setFormData({...formData, statusPembayaran: e.target.value as JamaahTracker['statusPembayaran']})}>
                    <option value="Belum Bayar">Belum Bayar</option>
                    <option value="DP">DP</option>
                    <option value="Lunas">Lunas</option>
                  </select>
                </td>
                <td className="p-2">
                  <select className="w-full p-1.5 border rounded text-xs" value={formData.statusPaspor || 'Belum Ada'} onChange={e => setFormData({...formData, statusPaspor: e.target.value as JamaahTracker['statusPaspor']})}>
                    <option value="Belum Ada">Belum Ada</option>
                    <option value="Dalam Proses">Dalam Proses</option>
                    <option value="Sudah Ada">Sudah Ada</option>
                  </select>
                </td>
                <td className="p-2">
                  <select className="w-full p-1.5 border rounded text-xs" value={formData.statusVaksin || 'Belum'} onChange={e => setFormData({...formData, statusVaksin: e.target.value as JamaahTracker['statusVaksin']})}>
                    <option value="Belum">Belum</option>
                    <option value="Sudah">Sudah</option>
                  </select>
                </td>
                <td className="p-2 text-right">
                  <button onClick={handleSave} className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded mr-1"><Save className="w-4 h-4" /></button>
                  <button onClick={() => setIsAdding(false)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                </td>
              </tr>
            )}
            
            {jamaahs.map((jamaah, index) => {
              if (viewMode === 'manifest') {
                return (
                  <tr key={jamaah.id} className="hover:bg-gray-50">
                    <td className="p-2 border border-gray-100 text-center text-xs text-gray-500">{index + 1}</td>
                    <td className="p-1 border border-gray-100 text-center">
                      <div className="flex justify-center">
                        <label 
                          onClick={(e) => {
                            if (Capacitor.isNativePlatform()) {
                              e.preventDefault();
                              handlePhotoAction(jamaah.id);
                            }
                          }}
                          className={`cursor-pointer p-1.5 rounded-full transition-colors ${isScanning === jamaah.id ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-600'}`}>
                          {isScanning === jamaah.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Camera className="w-4 h-4" />
                          )}
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handlePhotoAction(jamaah.id, e)}
                            disabled={isScanning !== null}
                          />
                        </label>
                      </div>
                    </td>
                    <td className="p-1 border border-gray-100">
                      <select 
                        className="w-full bg-transparent p-1 text-xs border-none focus:ring-1 focus:ring-emerald-500 rounded"
                        value={jamaah.title || ''}
                        onChange={e => handleInlineUpdate(jamaah.id, 'title', e.target.value)}
                      >
                        <option value="">-</option>
                        <option value="LAKI-LAKI">LAKI-LAKI</option>
                        <option value="PEREMPUAN">PEREMPUAN</option>
                        <option value="MR">MR</option>
                        <option value="MRS">MRS</option>
                        <option value="MS">MS</option>
                        <option value="MSTR">MSTR</option>
                        <option value="MISS">MISS</option>
                      </select>
                    </td>
                    <td className="p-1 border border-gray-100">
                      <input 
                        type="text"
                        className="w-full bg-transparent p-1 text-xs border-none focus:ring-1 focus:ring-emerald-500 rounded"
                        value={jamaah.nik || ''}
                        onChange={e => handleInlineUpdate(jamaah.id, 'nik', e.target.value)}
                      />
                    </td>
                    <td className="p-1 border border-gray-100">
                      <input 
                        type="text"
                        className="w-full bg-transparent p-1 text-xs border-none focus:ring-1 focus:ring-emerald-500 rounded uppercase"
                        value={jamaah.nama_paspor || ''}
                        onChange={e => handleInlineUpdate(jamaah.id, 'nama_paspor', e.target.value.toUpperCase())}
                      />
                    </td>
                    <td className="p-1 border border-gray-100">
                      <input 
                        type="text"
                        className="w-full bg-transparent p-1 text-xs border-none focus:ring-1 focus:ring-emerald-500 rounded uppercase"
                        value={jamaah.no_paspor || ''}
                        onChange={e => handleInlineUpdate(jamaah.id, 'no_paspor', e.target.value.toUpperCase())}
                      />
                    </td>
                    <td className="p-1 border border-gray-100">
                      <input 
                        type="date"
                        className="w-full bg-transparent p-1 text-xs border-none focus:ring-1 focus:ring-emerald-500 rounded"
                        value={jamaah.tgl_issue_paspor || ''}
                        onChange={e => handleInlineUpdate(jamaah.id, 'tgl_issue_paspor', e.target.value)}
                      />
                    </td>
                    <td className="p-1 border border-gray-100">
                      <input 
                        type="date"
                        className="w-full bg-transparent p-1 text-xs border-none focus:ring-1 focus:ring-emerald-500 rounded"
                        value={jamaah.tgl_exp_paspor || ''}
                        onChange={e => handleInlineUpdate(jamaah.id, 'tgl_exp_paspor', e.target.value)}
                      />
                    </td>
                    <td className="p-1 border border-gray-100">
                      <input 
                        type="text"
                        className="w-full bg-transparent p-1 text-xs border-none focus:ring-1 focus:ring-emerald-500 rounded uppercase"
                        value={jamaah.kota_paspor || ''}
                        onChange={e => handleInlineUpdate(jamaah.id, 'kota_paspor', e.target.value.toUpperCase())}
                      />
                    </td>
                    <td className="p-1 border border-gray-100">
                      <input 
                        type="text"
                        className="w-full bg-transparent p-1 text-xs border-none focus:ring-1 focus:ring-emerald-500 rounded uppercase"
                        value={jamaah.tempat_lahir || ''}
                        onChange={e => handleInlineUpdate(jamaah.id, 'tempat_lahir', e.target.value.toUpperCase())}
                      />
                    </td>
                    <td className="p-1 border border-gray-100">
                      <input 
                        type="date"
                        className="w-full bg-transparent p-1 text-xs border-none focus:ring-1 focus:ring-emerald-500 rounded"
                        value={jamaah.tanggal_lahir || ''}
                        onChange={e => handleInlineUpdate(jamaah.id, 'tanggal_lahir', e.target.value)}
                      />
                    </td>
                    <td className="p-1 border border-gray-100">
                      <input 
                        type="text"
                        className="w-full bg-transparent p-1 text-xs border-none focus:ring-1 focus:ring-emerald-500 rounded uppercase"
                        value={jamaah.kewarganegaraan || ''}
                        onChange={e => handleInlineUpdate(jamaah.id, 'kewarganegaraan', e.target.value.toUpperCase())}
                      />
                    </td>
                  </tr>
                );
              }

              return isEditing === jamaah.id ? (
                <tr key={jamaah.id} className="bg-blue-50/50">
                  <td className="p-2 space-y-1">
                    <input type="text" className="w-full p-1.5 border rounded text-xs" value={formData.namaLengkap || ''} onChange={e => setFormData({...formData, namaLengkap: e.target.value})} />
                    <input type="text" className="w-full p-1.5 border rounded text-xs" value={formData.nik || ''} onChange={e => setFormData({...formData, nik: e.target.value})} />
                  </td>
                  <td className="p-2 text-center">
                    <div className="flex justify-center">
                      <label 
                        onClick={(e) => {
                          if (Capacitor.isNativePlatform()) {
                            e.preventDefault();
                            handlePhotoAction(jamaah.id);
                          }
                        }}
                        title="Scan Paspor/KTP"
                        className={`cursor-pointer p-1.5 rounded-full transition-colors ${isScanning === jamaah.id ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-600'}`}
                      >
                        {isScanning === jamaah.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handlePhotoAction(jamaah.id, e)}
                          disabled={isScanning !== null}
                        />
                      </label>
                    </div>
                  </td>
                  <td className="p-2">
                    <select className="w-full p-1.5 border rounded text-xs" value={formData.jenisKelamin || ''} onChange={e => setFormData({...formData, jenisKelamin: e.target.value as JamaahTracker['jenisKelamin']})}>
                      <option value="">Pilih...</option>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="w-full p-1.5 border rounded text-xs" value={formData.paketId || ''} onChange={e => setFormData({...formData, paketId: e.target.value})}>
                      <option value="">Pilih Paket...</option>
                      {pakets.map(p => <option key={p.id} value={p.id}>{p.namaPaket}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="w-full p-1.5 border rounded text-xs" value={formData.status_kesiapan || 'NOT_READY'} onChange={e => setFormData({...formData, status_kesiapan: e.target.value as JamaahTracker['status_kesiapan']})}>
                      <option value="NOT_READY">NOT_READY</option>
                      <option value="READY">READY</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="w-full p-1.5 border rounded text-xs" value={formData.statusPembayaran || 'Belum Bayar'} onChange={e => setFormData({...formData, statusPembayaran: e.target.value as JamaahTracker['statusPembayaran']})}>
                      <option value="Belum Bayar">Belum Bayar</option>
                      <option value="DP">DP</option>
                      <option value="Lunas">Lunas</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="w-full p-1.5 border rounded text-xs" value={formData.statusPaspor || 'Belum Ada'} onChange={e => setFormData({...formData, statusPaspor: e.target.value as JamaahTracker['statusPaspor']})}>
                      <option value="Belum Ada">Belum Ada</option>
                      <option value="Dalam Proses">Dalam Proses</option>
                      <option value="Sudah Ada">Sudah Ada</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="w-full p-1.5 border rounded text-xs" value={formData.statusVaksin || 'Belum'} onChange={e => setFormData({...formData, statusVaksin: e.target.value as JamaahTracker['statusVaksin']})}>
                      <option value="Belum">Belum</option>
                      <option value="Sudah">Sudah</option>
                    </select>
                  </td>
                  <td className="p-2 text-right">
                    <button onClick={handleSave} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded mr-1"><Save className="w-4 h-4" /></button>
                    <button onClick={() => setIsEditing(null)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                  </td>
                </tr>
              ) : (
                <tr key={jamaah.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-medium text-gray-900">{jamaah.namaLengkap}</div>
                    <div className="text-xs text-gray-500">{jamaah.nik}</div>
                  </td>
                  <td className="p-3 border-gray-100 text-center">
                    <div className="flex justify-center">
                      <label 
                        onClick={(e) => {
                          if (Capacitor.isNativePlatform()) {
                            e.preventDefault();
                            handlePhotoAction(jamaah.id);
                          }
                        }}
                        title="Scan Paspor/KTP"
                        className={`cursor-pointer p-1.5 rounded-full transition-colors ${isScanning === jamaah.id ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-600'}`}
                      >
                        {isScanning === jamaah.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handlePhotoAction(jamaah.id, e)}
                          disabled={isScanning !== null}
                        />
                      </label>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${jamaah.jenisKelamin === 'L' ? 'bg-blue-100 text-blue-700' : jamaah.jenisKelamin === 'P' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-700'}`}>
                      {jamaah.jenisKelamin === 'L' ? 'L' : jamaah.jenisKelamin === 'P' ? 'P' : '-'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600">{getPaketName(jamaah.paketId)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(jamaah.status_kesiapan || 'NOT_READY')}`}>{jamaah.status_kesiapan || 'NOT_READY'}</span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(jamaah.statusPembayaran)}`}>{jamaah.statusPembayaran}</span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(jamaah.statusPaspor)}`}>{jamaah.statusPaspor}</span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(jamaah.statusVaksin)}`}>{jamaah.statusVaksin}</span>
                  </td>
                  <td className="p-3 text-right">
                    {deleteConfirm === jamaah.id ? (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handleDelete(jamaah.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Hapus</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded hover:bg-gray-300">Batal</button>
                      </div>
                    ) : (
                      <div className="flex justify-end items-center">
                        <button 
                          onClick={() => {
                            const msg = getWATemplate('GENERAL_INFO', { nama: jamaah.namaLengkap });
                            openWhatsApp(generateWALink('08123456789', msg)); // Dummy phone for now
                          }} 
                          title="Kirim Pesan WA" 
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded mr-1"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => openPerlengkapanModal(jamaah)} title="Manajemen Perlengkapan" className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded mr-1"><Package className="w-4 h-4" /></button>
                        <button onClick={() => openDokumenModal(jamaah)} title="Manajemen Dokumen" className="p-1.5 text-amber-600 hover:bg-amber-50 rounded mr-1"><FolderOpen className="w-4 h-4" /></button>
                        <button onClick={() => openManifestModal(jamaah)} title="Data Manifest" className="p-1.5 text-purple-600 hover:bg-purple-50 rounded mr-1"><FileText className="w-4 h-4" /></button>
                        <button onClick={() => startEdit(jamaah)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-1"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteConfirm(jamaah.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            
            {jamaahs.length === 0 && !isAdding && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500">Belum ada data jamaah.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dokumen Modal */}
      {isDokumenModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">Manajemen Dokumen</h3>
              <button onClick={() => setIsDokumenModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-4">Centang dokumen yang sudah diterima dari jamaah.</p>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    checked={dokumenData.dokumenKtp || false}
                    onChange={e => setDokumenData({...dokumenData, dokumenKtp: e.target.checked})}
                  />
                  <span className="font-medium text-gray-700">KTP</span>
                </label>
                
                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    checked={dokumenData.dokumenKk || false}
                    onChange={e => setDokumenData({...dokumenData, dokumenKk: e.target.checked})}
                  />
                  <span className="font-medium text-gray-700">Kartu Keluarga (KK)</span>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    checked={dokumenData.dokumenPaspor || false}
                    onChange={e => setDokumenData({...dokumenData, dokumenPaspor: e.target.checked})}
                  />
                  <span className="font-medium text-gray-700">Paspor Asli</span>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    checked={dokumenData.dokumenBukuKuning || false}
                    onChange={e => setDokumenData({...dokumenData, dokumenBukuKuning: e.target.checked})}
                  />
                  <span className="font-medium text-gray-700">Buku Kuning (Meningitis)</span>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    checked={dokumenData.dokumenFoto || false}
                    onChange={e => setDokumenData({...dokumenData, dokumenFoto: e.target.checked})}
                  />
                  <span className="font-medium text-gray-700">Pas Foto 4x6</span>
                </label>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button 
                onClick={() => setIsDokumenModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Batal
              </button>
              <button 
                onClick={saveDokumenData}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Simpan Dokumen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Perlengkapan Modal */}
      {isPerlengkapanModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">Manajemen Perlengkapan</h3>
              <button onClick={() => setIsPerlengkapanModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-4">Centang perlengkapan yang sudah diserahkan ke jamaah.</p>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    checked={perlengkapanData.perlengkapanKoper || false}
                    onChange={e => setPerlengkapanData({...perlengkapanData, perlengkapanKoper: e.target.checked})}
                  />
                  <span className="font-medium text-gray-700">Koper (Bagasi & Kabin)</span>
                </label>
                
                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    checked={perlengkapanData.perlengkapanIhramMukena || false}
                    onChange={e => setPerlengkapanData({...perlengkapanData, perlengkapanIhramMukena: e.target.checked})}
                  />
                  <span className="font-medium text-gray-700">Kain Ihram / Mukena</span>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    checked={perlengkapanData.perlengkapanBuku || false}
                    onChange={e => setPerlengkapanData({...perlengkapanData, perlengkapanBuku: e.target.checked})}
                  />
                  <span className="font-medium text-gray-700">Buku Panduan & ID Card</span>
                </label>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button 
                onClick={() => setIsPerlengkapanModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Batal
              </button>
              <button 
                onClick={savePerlengkapanData}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Simpan Perlengkapan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manifest Data Modal */}
      {isManifestModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">Data Manifest Jamaah</h3>
              <button onClick={() => setIsManifestModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <select 
                    className="w-full p-2 border rounded-lg text-sm"
                    value={manifestData.title || ''}
                    onChange={e => {
                      const title = e.target.value;
                      setManifestData({
                        ...manifestData, 
                        title,
                        jenisKelamin: (title === 'LAKI-LAKI' || title === 'MR' || title === 'MSTR') ? 'L' : 'P'
                      });
                    }}
                  >
                    <option value="">Pilih Title...</option>
                    <option value="LAKI-LAKI">LAKI-LAKI</option>
                    <option value="PEREMPUAN">PEREMPUAN</option>
                    <option value="MR">MR</option>
                    <option value="MRS">MRS</option>
                    <option value="MS">MS</option>
                    <option value="MSTR">MSTR</option>
                    <option value="MISS">MISS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No Identitas (NIK)</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded-lg text-sm"
                    value={manifestData.nik || ''}
                    onChange={e => setManifestData({...manifestData, nik: e.target.value})}
                    placeholder="737..."
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Paspor (Sesuai Nama di Paspor)</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded-lg text-sm uppercase"
                    value={manifestData.nama_paspor || ''}
                    onChange={e => setManifestData({...manifestData, nama_paspor: e.target.value.toUpperCase()})}
                    placeholder="ANWAR AMBO SAKKA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No Paspor</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded-lg text-sm uppercase"
                    value={manifestData.no_paspor || ''}
                    onChange={e => setManifestData({...manifestData, no_paspor: e.target.value.toUpperCase()})}
                    placeholder="E1234567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kota Paspor</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded-lg text-sm uppercase"
                    value={manifestData.kota_paspor || ''}
                    onChange={e => setManifestData({...manifestData, kota_paspor: e.target.value.toUpperCase()})}
                    placeholder="MAKASSAR"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Dikeluarkan Paspor</label>
                  <input 
                    type="date" 
                    className="w-full p-2 border rounded-lg text-sm"
                    value={manifestData.tgl_issue_paspor || ''}
                    onChange={e => setManifestData({...manifestData, tgl_issue_paspor: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kadaluarsa Paspor</label>
                  <input 
                    type="date" 
                    className="w-full p-2 border rounded-lg text-sm"
                    value={manifestData.tgl_exp_paspor || ''}
                    onChange={e => setManifestData({...manifestData, tgl_exp_paspor: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tempat Lahir</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded-lg text-sm uppercase"
                    value={manifestData.tempat_lahir || ''}
                    onChange={e => setManifestData({...manifestData, tempat_lahir: e.target.value.toUpperCase()})}
                    placeholder="PANGKEP"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
                  <input 
                    type="date" 
                    className="w-full p-2 border rounded-lg text-sm"
                    value={manifestData.tanggal_lahir || ''}
                    onChange={e => setManifestData({...manifestData, tanggal_lahir: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kewarganegaraan</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded-lg text-sm uppercase"
                    value={manifestData.kewarganegaraan || 'WNI'}
                    onChange={e => setManifestData({...manifestData, kewarganegaraan: e.target.value.toUpperCase()})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Kesiapan</label>
                  <select 
                    className="w-full p-2 border rounded-lg text-sm font-medium"
                    value={manifestData.status_kesiapan || 'NOT_READY'}
                    onChange={e => setManifestData({...manifestData, status_kesiapan: e.target.value as 'READY' | 'NOT_READY'})}
                  >
                    <option value="NOT_READY">NOT_READY</option>
                    <option value="READY">READY</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button 
                onClick={() => setIsManifestModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Batal
              </button>
              <button 
                onClick={saveManifestData}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Simpan Data Manifest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
