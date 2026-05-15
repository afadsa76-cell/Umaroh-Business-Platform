import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, where, handleFirestoreError, OperationType } from '../../firebase';

export const ManifestPage: React.FC = () => {
  const [pakets, setPakets] = useState<PaketTracker[]>([]);
  const [selectedPaketId, setSelectedPaketId] = useState<string>('');
  const [jamaahs, setJamaahs] = useState<JamaahTracker[]>([]);

  useEffect(() => {
    const unsubPaket = onSnapshot(collection(db, 'tracker_paket'), (snapshot) => {
      setPakets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaketTracker)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tracker_paket');
    });
    return () => unsubPaket();
  }, []);

  useEffect(() => {
    if (!selectedPaketId) {
      setJamaahs([]);
      return;
    }
    const q = query(collection(db, 'tracker_jamaah'), where('paketId', '==', selectedPaketId));
    const unsubJamaah = onSnapshot(q, (snapshot) => {
      setJamaahs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JamaahTracker)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tracker_jamaah');
    });
    return () => unsubJamaah();
  }, [selectedPaketId]);

  // Filter and Validate
  const readyJamaahs = jamaahs.filter(j => j.status_kesiapan === 'READY');
  
  const validatedJamaahs = readyJamaahs.map(j => {
    const isPasporEmpty = !j.no_paspor || j.no_paspor.trim() === '';
    const isNamaPasporEmpty = !j.nama_paspor || j.nama_paspor.trim() === '';
    
    let isExpired = false;
    let isAlmostExpired = false;
    
    if (j.tgl_exp_paspor) {
      const expDate = new Date(j.tgl_exp_paspor);
      const today = new Date();
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(today.getMonth() + 6);
      
      if (expDate < today) {
        isExpired = true;
      } else if (expDate < sixMonthsFromNow) {
        isAlmostExpired = true;
      }
    }

    const isValid = !isPasporEmpty && !isNamaPasporEmpty && !isExpired;

    return {
      ...j,
      isValid,
      isExpired,
      isAlmostExpired,
      isPasporEmpty,
      isNamaPasporEmpty
    };
  }).sort((a, b) => (a.nama_paspor || '').localeCompare(b.nama_paspor || ''));

  const validCount = validatedJamaahs.filter(j => j.isValid).length;
  const invalidCount = validatedJamaahs.filter(j => !j.isValid).length;
  const almostExpiredCount = validatedJamaahs.filter(j => j.isAlmostExpired).length;

  const selectedPaket = pakets.find(p => p.id === selectedPaketId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generate Manifest</h1>
          <p className="text-gray-500">Buat dokumen manifest otomatis dari data jamaah yang siap berangkat.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Paket Keberangkatan</label>
        <select 
          className="w-full md:w-1/2 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
          value={selectedPaketId}
          onChange={(e) => setSelectedPaketId(e.target.value)}
        >
          <option value="">-- Pilih Paket --</option>
          {pakets.map(p => (
            <option key={p.id} value={p.id}>{p.namaPaket} ({p.tanggalBerangkat})</option>
          ))}
        </select>
      </div>

      {selectedPaketId && (
        <>
          <ValidationAlert 
            total={validatedJamaahs.length} 
            validCount={validCount} 
            invalidCount={invalidCount} 
            almostExpiredCount={almostExpiredCount} 
          />

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">Data Manifest</h2>
              <ExportButton data={validatedJamaahs.filter(j => j.isValid)} paketName={selectedPaket?.namaPaket || 'Manifest'} />
            </div>
            <ManifestTable data={validatedJamaahs} />
          </div>
        </>
      )}
    </div>
  );
};
