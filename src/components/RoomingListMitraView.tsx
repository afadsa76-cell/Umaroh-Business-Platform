import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, db, handleFirestoreError, OperationType } from '../firebase';
import { RoomingList } from './tracker/RoomingList';
import { PaketTracker, JamaahTracker } from './tracker/types';
import { BedDouble, Calendar, Users, Loader2 } from 'lucide-react';

interface Props {
  isDarkMode: boolean;
}

export const RoomingListMitraView: React.FC<Props> = ({ isDarkMode }) => {
  const [pakets, setPakets] = useState<PaketTracker[]>([]);
  const [selectedPaketId, setSelectedPaketId] = useState<string>('');
  const [jamaahs, setJamaahs] = useState<JamaahTracker[]>([]);
  const [loadingPakets, setLoadingPakets] = useState(true);
  const [loadingJamaahs, setLoadingJamaahs] = useState(false);

  // Subscribe to all packages
  useEffect(() => {
    setLoadingPakets(true);
    const unsub = onSnapshot(
      collection(db, 'tracker_paket'),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PaketTracker));
        setPakets(data);
        if (data.length > 0 && !selectedPaketId) {
          setSelectedPaketId(data[0].id);
        }
        setLoadingPakets(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'tracker_paket');
        setLoadingPakets(false);
      }
    );
    return () => unsub();
  }, []);

  // Subscribe to pilgrims for selected package
  useEffect(() => {
    if (!selectedPaketId) {
      setJamaahs([]);
      return;
    }
    setLoadingJamaahs(true);
    const q = query(collection(db, 'tracker_jamaah'), where('paketId', '==', selectedPaketId));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as JamaahTracker));
        setJamaahs(data);
        setLoadingJamaahs(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'tracker_jamaah');
        setLoadingJamaahs(false);
      }
    );
    return () => unsub();
  }, [selectedPaketId]);

  const selectedPaket = pakets.find((p) => p.id === selectedPaketId);

  return (
    <div className="space-y-6">
      {/* Title Banner */}
      <div className={`p-6 rounded-2xl border shadow-sm transition-all duration-200 ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/20' : 'bg-white border-gray-100 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-2xl flex items-center justify-center transition-all duration-200 border ${
              isDarkMode ? 'bg-amber-950/20 border-amber-500/20 text-[#FFC107]' : 'bg-[#FFFDF0] border-amber-100/30 text-[#C69200]'
            }`}>
              <BedDouble className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider font-sans">
                Kelola Rooming List
              </h1>
              <p className={`text-xs mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Atur pembagian kamar jamaah berdasarkan paket keberangkatan
              </p>
            </div>
          </div>

          <div className="w-full md:w-80">
            <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
              Pilih Paket Keberangkatan
            </label>
            {loadingPakets ? (
              <div className="flex items-center gap-2 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span className="text-xs">Memuat paket...</span>
              </div>
            ) : (
              <select
                value={selectedPaketId}
                onChange={(e) => setSelectedPaketId(e.target.value)}
                className={`w-full p-2.5 text-sm font-bold rounded-xl border outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                  isDarkMode 
                    ? 'bg-slate-800 border-slate-700 text-slate-100' 
                    : 'bg-white border-gray-250 text-gray-800'
                }`}
              >
                {pakets.length === 0 && <option value="">Belum ada paket</option>}
                {pakets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.namaPaket} ({p.tanggalBerangkat})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Package Meta Info & Rooming List Render */}
      {selectedPaketId ? (
        <div className="space-y-6">
          {selectedPaket && (
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
            }`}>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-amber-500">{selectedPaket.namaPaket}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className={`flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    <Calendar className="w-3.5 h-3.5" /> Berangkat: {selectedPaket.tanggalBerangkat}
                  </span>
                  <span className={`flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    <Users className="w-3.5 h-3.5" /> Terdaftar: {jamaahs.length} / {selectedPaket.targetJamaah} Jamaah
                  </span>
                </div>
              </div>
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedPaket.status === 'Selesai' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {selectedPaket.status}
                </span>
              </div>
            </div>
          )}

          {loadingJamaahs ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm">Memuat data jamaah & pembagian kamar...</p>
            </div>
          ) : (
            <div className={`rounded-xl overflow-hidden shadow-sm border ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-slate-900'
            }`}>
              <RoomingList jamaahs={jamaahs} />
            </div>
          )}
        </div>
      ) : (
        <div className={`p-12 text-center rounded-2xl border ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-150'
        }`}>
          <div className="max-w-md mx-auto space-y-3">
            <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-500">
              <BedDouble className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold">Pilih Paket Terlebih Dahulu</h3>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Silakan pilih salah satu paket keberangkatan di atas untuk mulai melihat dan membagi kamar jamaah.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
