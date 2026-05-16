import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, doc, updateDoc, setDoc } from '../../firebase';
import { Edit2, CheckCircle, XCircle, Users, Package, Save, X } from 'lucide-react';

type AdminTab = 'paket' | 'pendaftaran';

interface PaketKemitraan {
  id: string;
  nama: string;
  harga: number;
  level: number;
  deskripsi: string;
}

interface PendaftaranMitra {
  id: string;
  paketId: string;
  paketNama: string;
  namaLengkap: string;
  noWA: string;
  email: string;
  namaBrand: string;
  nikKtp: string;
  lokasi: string;
  uplineId: string;
  uplineNama: string;
  metodePembayaran: string;
  buktiTransferUrl: string;
  status: 'pending_validation' | 'approved' | 'rejected';
  createdAt: string;
}

export const KemitraanAdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('paket');
  const [paketList, setPaketList] = useState<PaketKemitraan[]>([]);
  const [pendaftaranList, setPendaftaranList] = useState<PendaftaranMitra[]>([]);
  
  const [editingPaketId, setEditingPaketId] = useState<string | null>(null);
  const [editHarga, setEditHarga] = useState<number>(0);
  const [editDeskripsi, setEditDeskripsi] = useState<string>('');

  useEffect(() => {
    // Fetch Paket Kemitraan
    const unsubPaket = onSnapshot(collection(db, 'paket_kemitraan'), async (snapshot) => {
      if (snapshot.empty) {
        // Bootstrap default packages if empty
        const defaultPackages: PaketKemitraan[] = [
          { id: 'utama', nama: 'Mitra Utama', harga: 50000000, level: 1, deskripsi: 'Fasilitas lengkap, komisi tertinggi.' },
          { id: 'cabang', nama: 'Mitra Cabang', harga: 25000000, level: 2, deskripsi: 'Hak eksklusif tingkat kota/kabupaten.' },
          { id: 'mandiri', nama: 'Mitra Mandiri', harga: 10000000, level: 3, deskripsi: 'Cocok untuk pengusaha travel pemula.' },
          { id: 'agen', nama: 'Mitra Agen', harga: 2500000, level: 4, deskripsi: 'Langkah awal menjadi bagian dari Umaroh.' }
        ];
        for (const pkg of defaultPackages) {
          await setDoc(doc(db, 'paket_kemitraan', pkg.id), pkg);
        }
      } else {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaketKemitraan));
        setPaketList(data.sort((a, b) => a.level - b.level));
      }
    });

    // Fetch Pendaftaran Mitra
    const unsubPendaftaran = onSnapshot(collection(db, 'pendaftaran_mitra'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PendaftaranMitra));
      // Sort by newest first
      setPendaftaranList(data.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
      }));
    });

    return () => {
      unsubPaket();
      unsubPendaftaran();
    };
  }, []);

  const handleEditClick = (paket: PaketKemitraan) => {
    setEditingPaketId(paket.id);
    setEditHarga(paket.harga);
    setEditDeskripsi(paket.deskripsi);
  };

  const handleSavePaket = async (id: string) => {
    try {
      await updateDoc(doc(db, 'paket_kemitraan', id), { 
        harga: editHarga,
        deskripsi: editDeskripsi
      });
      setEditingPaketId(null);
    } catch (error) {
      console.error("Error updating paket:", error);
      alert("Gagal menyimpan perubahan.");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const renderPaket = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">Pengaturan Harga Paket Kemitraan</h2>
        <p className="text-sm text-gray-500">Atur harga untuk masing-masing level kemitraan.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
              <th className="p-4">Level</th>
              <th className="p-4">Nama Paket</th>
              <th className="p-4">Deskripsi</th>
              <th className="p-4 text-right">Harga (Rp)</th>
              <th className="p-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paketList.map((paket) => (
              <tr key={paket.id} className="hover:bg-gray-50">
                <td className="p-4 text-center">
                  <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm mx-auto">
                    {paket.level}
                  </span>
                </td>
                <td className="p-4 font-bold text-gray-900">{paket.nama}</td>
                <td className="p-4 text-sm text-gray-500">
                  {editingPaketId === paket.id ? (
                    <textarea
                      value={editDeskripsi}
                      onChange={(e) => setEditDeskripsi(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                      rows={2}
                    />
                  ) : (
                    paket.deskripsi
                  )}
                </td>
                <td className="p-4 text-right">
                  {editingPaketId === paket.id ? (
                    <input
                      type="number"
                      value={editHarga}
                      onChange={(e) => setEditHarga(Number(e.target.value))}
                      className="w-32 text-right border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  ) : (
                    <span className="font-black text-gray-900">{formatCurrency(paket.harga)}</span>
                  )}
                </td>
                <td className="p-4 text-center">
                  {editingPaketId === paket.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleSavePaket(paket.id)} className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingPaketId(null)} className="p-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleEditClick(paket)} className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 inline-flex">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPendaftaran = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">Validasi Pendaftaran Mitra</h2>
        <p className="text-sm text-gray-500">Daftar calon mitra yang menunggu validasi pembayaran dan aktivasi akun.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
              <th className="p-4">Tanggal</th>
              <th className="p-4">Data Calon Mitra</th>
              <th className="p-4">Paket & Jaringan</th>
              <th className="p-4">Pembayaran</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pendaftaranList.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="p-4 text-sm text-gray-500">
                  {(() => {
                    try {
                      const d = new Date(p.createdAt);
                      return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID');
                    } catch {
                      return '-';
                    }
                  })()}
                </td>
                <td className="p-4">
                  <p className="font-bold text-gray-900">{p.namaLengkap}</p>
                  <p className="text-xs text-gray-500">{p.namaBrand} - {p.lokasi}</p>
                  <p className="text-xs text-gray-400">{p.noWA} | {p.email}</p>
                </td>
                <td className="p-4">
                  <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold mb-1">
                    {p.paketNama}
                  </span>
                  <p className="text-xs text-gray-500">Upline: {p.uplineNama || '-'}</p>
                </td>
                <td className="p-4">
                  <p className="text-sm font-medium text-gray-900">{p.metodePembayaran}</p>
                  {p.buktiTransferUrl && (
                    <a href={p.buktiTransferUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                      Lihat Bukti
                    </a>
                  )}
                </td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    p.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    p.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {p.status === 'pending_validation' ? 'PENDING' : p.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 text-center">
                  {p.status === 'pending_validation' ? (
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200" title="Validasi & Aktifkan">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200" title="Tolak">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
              </tr>
            ))}
            {pendaftaranList.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">Belum ada data pendaftaran mitra.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-amber-500 rounded-xl shadow-sm">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Kemitraan</h1>
          <p className="text-gray-500">Atur paket kemitraan dan validasi pendaftaran mitra baru.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-px">
        <button
          onClick={() => setActiveTab('paket')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'paket' 
              ? 'border-amber-600 text-amber-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Package className="w-4 h-4" />
          Paket Kemitraan
        </button>
        <button
          onClick={() => setActiveTab('pendaftaran')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'pendaftaran' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Users className="w-4 h-4" />
          Pendaftaran Mitra
        </button>
      </div>

      {activeTab === 'paket' && renderPaket()}
      {activeTab === 'pendaftaran' && renderPendaftaran()}
    </div>
  );
};
