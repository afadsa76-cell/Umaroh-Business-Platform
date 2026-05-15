import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, updateDoc, doc, setDoc, handleFirestoreError, OperationType } from '../firebase';

type TLTab = 'jadwal' | 'jamaah' | 'info';

export const TourLeaderPortal: React.FC = () => {
  const [keberangkatans, setKeberangkatans] = useState<KeberangkatanTracker[]>([]);
  const [pakets, setPakets] = useState<PaketTracker[]>([]);
  const [jamaahs, setJamaahs] = useState<JamaahTracker[]>([]);
  const [selectedKeberangkatan, setSelectedKeberangkatan] = useState<KeberangkatanTracker | null>(null);
  const [activeTab, setActiveTab] = useState<TLTab>('jamaah');

  useEffect(() => {
    const unsubKeberangkatan = onSnapshot(collection(db, 'tracker_keberangkatan'), (snapshot) => {
      setKeberangkatans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KeberangkatanTracker)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tracker_keberangkatan');
    });
    const unsubPaket = onSnapshot(collection(db, 'tracker_paket'), (snapshot) => {
      setPakets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaketTracker)));
    });
    const unsubJamaah = onSnapshot(collection(db, 'tracker_jamaah'), (snapshot) => {
      setJamaahs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JamaahTracker)));
    });

    return () => { unsubKeberangkatan(); unsubPaket(); unsubJamaah(); };
  }, []);

  const getPaketName = (id: string) => pakets.find(p => p.id === id)?.namaPaket || 'Unknown Paket';

  const handleUpdateStatus = async (jamaahId: string, status: 'READY' | 'NOT_READY') => {
    try {
      await updateDoc(doc(db, 'tracker_jamaah', jamaahId), { status_kesiapan: status });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tracker_jamaah');
    }
  };

  const handleUpdateLocation = async () => {
    if (!selectedKeberangkatan) return;
    
    // Simulate getting location
    const lat = 21.4225 + (Math.random() - 0.5) * 0.01; // Near Mecca
    const lng = 39.8262 + (Math.random() - 0.5) * 0.01;

    try {
      const groupId = `group_${selectedKeberangkatan.paketId}`;
      
      await setDoc(doc(db, 'tracking_group', groupId), {
        paket_id: selectedKeberangkatan.paketId,
        nama_group: `Rombongan ${getPaketName(selectedKeberangkatan.paketId)}`,
        leader_id: selectedKeberangkatan.tourLeader || 'TL',
        status: 'di_mekkah',
        last_location: {
          lat,
          lng,
          updated_at: new Date().toISOString()
        }
      }, { merge: true });
      
      alert("Lokasi berhasil diupdate! (Simulasi)");
    } catch (error) {
      console.error(error);
      alert("Gagal update lokasi.");
    }
  };

  if (!selectedKeberangkatan) {
    return (
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-20">
        <div className="bg-emerald-700 text-white p-6 rounded-b-3xl shadow-lg mb-6">
          <h2 className="text-2xl font-bold mb-1">Portal Tour Leader</h2>
          <p className="text-emerald-100 text-sm">Pilih jadwal keberangkatan yang Anda pandu hari ini.</p>
        </div>
        
        <div className="px-4 space-y-4">
          <h3 className="font-bold text-gray-900 px-1">Tugas Saya</h3>
          {keberangkatans.map(k => (
            <div 
              key={k.id} 
              onClick={() => setSelectedKeberangkatan(k)}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                  {(k as any).status || 'Menunggu'}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
              </div>
              <div className="font-bold text-gray-900 text-lg leading-tight mb-1">{getPaketName(k.paketId)}</div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <Calendar className="w-4 h-4" />
                {(() => {
                  try {
                    const d = new Date(k.waktuBerangkat);
                    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                  } catch (e) {
                    return '-';
                  }
                })()}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                <Users className="w-4 h-4 text-blue-500" />
                <span>{jamaahs.filter(j => j.paketId === k.paketId).length} Jamaah</span>
              </div>
            </div>
          ))}
          {keberangkatans.length === 0 && (
            <div className="text-center text-gray-500 p-8 bg-white rounded-2xl border border-gray-100 border-dashed">
              Belum ada jadwal keberangkatan yang ditugaskan.
            </div>
          )}
        </div>
      </div>
    );
  }

  const paketJamaahs = jamaahs.filter(j => j.paketId === selectedKeberangkatan.paketId);
  const readyCount = paketJamaahs.filter(j => j.status_kesiapan === 'READY').length;

  const renderJadwal = () => (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Itinerary Hari Ini</h3>
        
        <div className="relative border-l-2 border-emerald-100 ml-3 space-y-6">
          <div className="relative pl-6">
            <div className="absolute w-4 h-4 bg-emerald-500 rounded-full -left-[9px] top-1 border-4 border-white shadow-sm"></div>
            <div className="text-xs font-bold text-emerald-600 mb-1">03:00 - 04:30</div>
            <div className="font-bold text-gray-900">Qiyamul Lail & Subuh Berjamaah</div>
            <div className="text-sm text-gray-500">Masjidil Haram</div>
          </div>
          
          <div className="relative pl-6">
            <div className="absolute w-4 h-4 bg-amber-500 rounded-full -left-[9px] top-1 border-4 border-white shadow-sm"></div>
            <div className="text-xs font-bold text-amber-600 mb-1">07:00 - 08:30</div>
            <div className="font-bold text-gray-900">Sarapan Pagi</div>
            <div className="text-sm text-gray-500">Restoran Hotel (Lantai M)</div>
          </div>
          
          <div className="relative pl-6">
            <div className="absolute w-4 h-4 bg-gray-300 rounded-full -left-[9px] top-1 border-4 border-white shadow-sm"></div>
            <div className="text-xs font-bold text-gray-500 mb-1">09:00 - 12:00</div>
            <div className="font-bold text-gray-900">City Tour Makkah (Ziarah)</div>
            <div className="text-sm text-gray-500">Kumpul di Lobby Hotel jam 08:45</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderJamaah = () => (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={handleUpdateLocation} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 text-blue-600 hover:bg-blue-50 transition-colors">
          <div className="bg-blue-100 p-2 rounded-full">
            <MapPin className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold">Share Lokasi</span>
        </button>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2">
          <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900">{readyCount} / {paketJamaahs.length}</div>
            <div className="text-xs text-gray-500">Jamaah Hadir</div>
          </div>
        </div>
      </div>

      {/* Jamaah List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <span className="font-bold text-gray-900">Absensi Jamaah</span>
          <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">
            {readyCount} Hadir
          </span>
        </div>
        <div className="divide-y divide-gray-100">
          {paketJamaahs.map(jamaah => (
            <div key={jamaah.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${jamaah.status_kesiapan === 'READY' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {jamaah.namaLengkap.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{jamaah.namaLengkap}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> Kamar: {jamaah.roomNumber || '-'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleUpdateStatus(jamaah.id, jamaah.status_kesiapan === 'READY' ? 'NOT_READY' : 'READY')}
                className={`p-2.5 rounded-full transition-all ${jamaah.status_kesiapan === 'READY' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
              >
                <CheckCircle2 className="w-6 h-6" />
              </button>
            </div>
          ))}
          {paketJamaahs.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">Belum ada data jamaah.</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderInfo = () => (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Kontak Penting</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">Muthawwif Lokal</div>
                <div className="text-xs text-gray-500">+966 50 123 4567</div>
              </div>
            </div>
            <button className="text-blue-600 font-bold text-sm px-3 py-1 bg-blue-50 rounded-lg">Hubungi</button>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-rose-100 p-2 rounded-lg text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">Tim Medis / Klinik</div>
                <div className="text-xs text-gray-500">+966 12 345 6789</div>
              </div>
            </div>
            <button className="text-rose-600 font-bold text-sm px-3 py-1 bg-rose-50 rounded-lg">Hubungi</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Broadcast Pesan</h3>
        <textarea 
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
          rows={4}
          placeholder="Tulis pesan untuk dikirim ke semua jamaah rombongan ini..."
        ></textarea>
        <button className="w-full mt-3 bg-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors">
          <MessageSquare className="w-5 h-5" />
          Kirim ke Semua Jamaah
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-emerald-700 text-white pt-6 pb-4 px-4 sticky top-0 z-20 shadow-md">
        <button onClick={() => setSelectedKeberangkatan(null)} className="text-emerald-100 text-sm mb-3 flex items-center gap-1 hover:text-white transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" /> Kembali
        </button>
        <h2 className="text-xl font-bold leading-tight mb-1">{getPaketName(selectedKeberangkatan.paketId)}</h2>
        <div className="text-sm text-emerald-100 flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          {(() => {
            try {
              const d = new Date(selectedKeberangkatan.waktuBerangkat);
              return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            } catch (e) {
              return '-';
            }
          })()}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow p-4 overflow-y-auto pb-24">
        {activeTab === 'jadwal' && renderJadwal()}
        {activeTab === 'jamaah' && renderJamaah()}
        {activeTab === 'info' && renderInfo()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-30">
        <div className="max-w-md mx-auto flex justify-around p-2">
          <button 
            onClick={() => setActiveTab('jadwal')}
            className={`flex flex-col items-center p-2 min-w-[80px] rounded-xl transition-colors ${activeTab === 'jadwal' ? 'text-emerald-600' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <Calendar className={`w-6 h-6 mb-1 ${activeTab === 'jadwal' ? 'fill-emerald-100' : ''}`} />
            <span className="text-[10px] font-bold">Jadwal</span>
          </button>
          <button 
            onClick={() => setActiveTab('jamaah')}
            className={`flex flex-col items-center p-2 min-w-[80px] rounded-xl transition-colors ${activeTab === 'jamaah' ? 'text-emerald-600' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <Users className={`w-6 h-6 mb-1 ${activeTab === 'jamaah' ? 'fill-emerald-100' : ''}`} />
            <span className="text-[10px] font-bold">Jamaah</span>
          </button>
          <button 
            onClick={() => setActiveTab('info')}
            className={`flex flex-col items-center p-2 min-w-[80px] rounded-xl transition-colors ${activeTab === 'info' ? 'text-emerald-600' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <AlertTriangle className={`w-6 h-6 mb-1 ${activeTab === 'info' ? 'fill-emerald-100' : ''}`} />
            <span className="text-[10px] font-bold">Info</span>
          </button>
        </div>
      </div>
    </div>
  );
};
