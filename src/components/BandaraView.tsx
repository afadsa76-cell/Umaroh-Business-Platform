import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, MapPin, X } from 'lucide-react';
import { db, collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface Bandara {
  id: string;
  kode: string;
  nama: string;
  kota: string;
  negara: string;
}

export const BandaraView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<Bandara[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    kode: '',
    nama: '',
    kota: '',
    negara: ''
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'master_bandara'), (snapshot) => {
      const bandaraList: Bandara[] = [];
      snapshot.forEach((doc) => {
        bandaraList.push({ id: doc.id, ...doc.data() } as Bandara);
      });
      setData(bandaraList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching bandara:", error);
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, 'master_bandara');
    });

    return () => unsubscribe();
  }, []);

  const handleOpenForm = (item?: Bandara) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        kode: item.kode,
        nama: item.nama,
        kota: item.kota,
        negara: item.negara
      });
    } else {
      setEditingId(null);
      setFormData({ kode: '', nama: '', kota: '', negara: 'INDONESIA' });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({ kode: '', nama: '', kota: '', negara: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'master_bandara', editingId), formData);
      } else {
        await addDoc(collection(db, 'master_bandara'), formData);
      }
      handleCloseForm();
    } catch (error) {
      console.error("Error saving bandara:", error);
      alert('Gagal menyimpan data bandara.');
    }
  };

  const handleAddSeed = async () => {
    const seeds = [
      { kode: 'CGK', nama: 'Soekarno-Hatta International Airport', kota: 'JAKARTA', negara: 'INDONESIA' },
      { kode: 'SUB', nama: 'Juanda International Airport', kota: 'SURABAYA', negara: 'INDONESIA' },
      { kode: 'KNO', nama: 'Kualanamu International Airport', kota: 'MEDAN', negara: 'INDONESIA' },
      { kode: 'UPG', nama: 'Sultan Hasanuddin International Airport', kota: 'MAKASSAR', negara: 'INDONESIA' },
      { kode: 'JED', nama: 'King Abdulaziz International Airport', kota: 'JEDDAH', negara: 'ARAB SAUDI' },
      { kode: 'MED', nama: 'Prince Mohammad Bin Abdulaziz International Airport', kota: 'MADINAH', negara: 'ARAB SAUDI' },
    ];
    
    try {
      for (const seed of seeds) {
        await addDoc(collection(db, 'master_bandara'), seed);
      }
      alert('Data seed bandara berhasil ditambahkan!');
    } catch (e) {
      console.error(e);
      alert('Gagal menambah seed data');
    }
  };

  const filteredData = data.filter(item =>
    item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.kota.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-600" />
            Database Bandara / Kota
          </h2>
          <p className="text-gray-500 text-sm mt-1">Kelola data bandara untuk keberangkatan dan kedatangan</p>
        </div>
        <div className="flex gap-2">
          {data.length === 0 && !loading && (
            <button 
              onClick={handleAddSeed}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Inject Data Awal
            </button>
          )}
          <button onClick={() => handleOpenForm()} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Tambah Bandara
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari bandara atau kota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th className="px-4 py-3 font-semibold">Kode</th>
                  <th className="px-4 py-3 font-semibold">Nama Bandara</th>
                  <th className="px-4 py-3 font-semibold">Kota</th>
                  <th className="px-4 py-3 font-semibold">Negara</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">{item.kode}</td>
                    <td className="px-4 py-3 text-gray-800">{item.nama}</td>
                    <td className="px-4 py-3 text-gray-600">{item.kota}</td>
                    <td className="px-4 py-3 text-gray-600">{item.negara}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                         <button className="p-1 text-blue-600 hover:bg-blue-50 rounded" onClick={() => handleOpenForm(item)}>
                           <Edit2 className="w-4 h-4" />
                         </button>
                         <button className="p-1 text-red-600 hover:bg-red-50 rounded" onClick={async () => {
                           const confirmed = window.confirm ? window.confirm('Yakin ingin menghapus ini?') : true;
                           if(confirmed) {
                             await deleteDoc(doc(db, 'master_bandara', item.id));
                           }
                         }}>
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Tidak ada data bandara.
              </div>
            )}
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Bandara' : 'Tambah Bandara Baru'}
              </h3>
              <button 
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Kode IATA (3 Huruf)</label>
                <input 
                  type="text" 
                  required
                  maxLength={3}
                  value={formData.kode}
                  onChange={(e) => setFormData({...formData, kode: e.target.value.toUpperCase()})}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none uppercase font-bold"
                  placeholder="CGK"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Bandara</label>
                <input 
                  type="text" 
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value.toUpperCase()})}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Soekarno-Hatta International Airport"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kota</label>
                  <input 
                    type="text" 
                    required
                    value={formData.kota}
                    onChange={(e) => setFormData({...formData, kota: e.target.value.toUpperCase()})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="JAKARTA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Negara</label>
                  <input 
                    type="text" 
                    required
                    value={formData.negara}
                    onChange={(e) => setFormData({...formData, negara: e.target.value.toUpperCase()})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="INDONESIA"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 font-medium">
                <button 
                  type="button" 
                  onClick={handleCloseForm}
                  className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
