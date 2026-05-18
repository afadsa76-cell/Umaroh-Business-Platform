import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, handleFirestoreError, OperationType } from '../firebase';
import { Search, Plus, Edit2, Trash2, Map, X } from 'lucide-react';

interface PaketWisata {
  id: string;
  nama: string;
  deskripsi: string;
  durasiHari: number;
  lokasi: string;
  img: string;
  hargaStart: number;
}

export const PaketWisataView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<PaketWisata[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    deskripsi: '',
    durasiHari: 1,
    lokasi: '',
    img: '',
    hargaStart: 0
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'master_paket_wisata'), (snapshot) => {
      const paketList: PaketWisata[] = [];
      snapshot.forEach((doc) => {
        paketList.push({ id: doc.id, ...doc.data() } as PaketWisata);
      });
      setData(paketList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching paket wisata:", error);
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, 'master_paket_wisata');
    });

    return () => unsubscribe();
  }, []);

  const handleOpenForm = (item?: PaketWisata) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        nama: item.nama,
        deskripsi: item.deskripsi,
        durasiHari: item.durasiHari,
        lokasi: item.lokasi,
        img: item.img,
        hargaStart: item.hargaStart
      });
    } else {
      setEditingId(null);
      setFormData({
        nama: '',
        deskripsi: '',
        durasiHari: 3,
        lokasi: '',
        img: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        hargaStart: 0
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'master_paket_wisata', editingId), formData);
      } else {
        await addDoc(collection(db, 'master_paket_wisata'), formData);
      }
      handleCloseForm();
    } catch (error) {
      console.error("Error saving paket wisata:", error);
      handleFirestoreError(error, OperationType.WRITE, 'master_paket_wisata');
      alert('Gagal menyimpan data paket wisata.');
    }
  };

  const handleAddSeed = async () => {
    const seeds = [
      { nama: 'TURKEY 10D9N', deskripsi: 'ISTANBUL - BURSA - CAPPADOCIA', durasiHari: 10, lokasi: 'TURKEY', img: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', hargaStart: 840 },
      { nama: 'TURKEY 12D11N', deskripsi: 'ISTANBUL - BURSA - CAPPADOCIA', durasiHari: 12, lokasi: 'TURKEY', img: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', hargaStart: 920 },
      { nama: 'TURKEY 8D7N', deskripsi: 'ISTANBUL - BURSA - ANKARA', durasiHari: 8, lokasi: 'TURKEY', img: 'https://images.unsplash.com/photo-1506459312158-1c469f697dbb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', hargaStart: 750 },
      { nama: 'HONSHU EXPLORER 8D7N', deskripsi: 'TOKYO - KYOTO - OSAKA', durasiHari: 8, lokasi: 'JAPAN', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', hargaStart: 1250 },
      { nama: 'HOKKAIDO WINTER 9D8N', deskripsi: 'SAPPORO - OTARU - HAKODATE', durasiHari: 9, lokasi: 'JAPAN', img: 'https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', hargaStart: 1400 },
      { nama: 'WEST EUROPE 12D11N', deskripsi: 'PARIS - BRUSSELS - AMSTERDAM', durasiHari: 12, lokasi: 'EUROPE', img: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', hargaStart: 1650 },
    ];
    
    try {
      for (const seed of seeds) {
        await addDoc(collection(db, 'master_paket_wisata'), seed);
      }
      alert('Data seed paket wisata berhasil ditambahkan!');
    } catch (e) {
      console.error(e);
      handleFirestoreError(e, OperationType.WRITE, 'master_paket_wisata');
      alert('Gagal menambah seed data');
    }
  };

  const filteredData = data.filter(item =>
    item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.lokasi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Map className="w-6 h-6 text-emerald-600" />
            Database Paket Wisata
          </h2>
          <p className="text-gray-500 text-sm mt-1">Kelola data program tour tambahan untuk opsi wisata halal</p>
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
          <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors" onClick={() => handleOpenForm()}>
            <Plus className="w-4 h-4" />
            Tambah Master Paket
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari nama paket atau lokasi..."
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
                  <th className="px-4 py-3 font-semibold">Nama Paket</th>
                  <th className="px-4 py-3 font-semibold">Lokasi (Negara)</th>
                  <th className="px-4 py-3 font-semibold">Durasi</th>
                  <th className="px-4 py-3 font-semibold">Harga Start</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">
                       <div className="flex items-center gap-3">
                         {item.img && (
                           <img src={item.img} alt={item.nama} className="w-10 h-10 object-cover rounded-md" referrerPolicy="no-referrer" />
                         )}
                         {!item.img && (
                           <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                             <Map className="w-5 h-5" />
                           </div>
                         )}
                         <div>
                           <div>{item.nama}</div>
                           <div className="text-gray-500 text-xs font-normal">{item.deskripsi}</div>
                         </div>
                       </div>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{item.lokasi}</td>
                    <td className="px-4 py-3 text-gray-600">{item.durasiHari} Hari</td>
                    <td className="px-4 py-3 text-emerald-600 font-bold">${item.hargaStart}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                         <button className="p-1 text-blue-600 hover:bg-blue-50 rounded" onClick={() => handleOpenForm(item)}>
                           <Edit2 className="w-4 h-4" />
                         </button>
                         <button className="p-1 text-red-600 hover:bg-red-50 rounded" onClick={async () => {
                           const confirmed = window.confirm ? window.confirm('Yakin ingin menghapus ini?') : true;
                           if(confirmed) {
                             try {
                               await deleteDoc(doc(db, 'master_paket_wisata', item.id));
                             } catch (err) {
                               handleFirestoreError(err, OperationType.DELETE, `master_paket_wisata/${item.id}`);
                             }
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
                Tidak ada data paket wisata.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 mt-10 mb-10">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Paket Wisata' : 'Tambah Paket Wisata Baru'}
              </h3>
              <button 
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Paket</label>
                  <input 
                    type="text" 
                    required
                    value={formData.nama}
                    onChange={(e) => setFormData({...formData, nama: e.target.value.toUpperCase()})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none uppercase font-bold"
                    placeholder="TURKEY 10D9N"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Deskripsi Singkat (Rute Utama)</label>
                  <input 
                    type="text" 
                    required
                    value={formData.deskripsi}
                    onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="ISTANBUL - BURSA - CAPPADOCIA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Durasi (Hari)</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={formData.durasiHari}
                    onChange={(e) => setFormData({...formData, durasiHari: parseInt(e.target.value) || 0})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Lokasi (Negara)</label>
                  <input 
                    type="text" 
                    required
                    value={formData.lokasi}
                    onChange={(e) => setFormData({...formData, lokasi: e.target.value.toUpperCase()})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                    placeholder="TURKEY"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estimasi Harga Start (USD)</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={formData.hargaStart}
                    onChange={(e) => setFormData({...formData, hargaStart: parseFloat(e.target.value) || 0})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="840"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">URL Gambar Khusus</label>
                  <input 
                    type="url" 
                    required
                    value={formData.img}
                    onChange={(e) => setFormData({...formData, img: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="https://images.unsplash.com/..."
                  />
                  {formData.img ? (
                    <div className="mt-3">
                       <p className="text-xs text-gray-500 mb-1">Preview:</p>
                       <img src={formData.img} alt="Preview" className="h-32 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 font-medium border-t border-gray-100">
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
