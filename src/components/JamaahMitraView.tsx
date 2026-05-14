import React, { useState, useEffect } from 'react';
import { db, auth, collection, query, where, onSnapshot } from '../firebase';
import { Search, User, Filter, AlertCircle, CheckCircle2, MoreVertical, CreditCard, Clock } from 'lucide-react';

interface Jamaah {
  id: string;
  nama: string;
  paketId: string;
  jenisPaket: 'master' | 'mitra';
  statusPembayaran: 'Lunas' | 'DP' | 'Belum Bayar' | 'pending';
  statusKeberangkatan: string;
  totalHarga: number;
  createdAt: any;
}

export const JamaahMitraView: React.FC = () => {
  const [jamaahs, setJamaahs] = useState<Jamaah[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;
    
    // We fetch bookings/jamaahs created under this mitra's ID.
    // In our simplified database schema, 'bookings' collection tracks this usually.
    // Ensure the 'mappings' match what CatalogPaketView creates. CatalogPaketView creates documents in 'bookings' collection.
    
    const q = query(collection(db, 'bookings'), where('mitraId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        nama: doc.data().namaJamaah || 'Jamaah Baru (Belum Lengkap)', // Often jamaah completes their own data
        ...doc.data()
      })) as Jamaah[];
      
      // Filter out bookings that don't have this mitraId
      setJamaahs(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const filteredJamaahs = jamaahs.filter(j => 
    j.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    j.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" />
            Jamaah Saya
          </h2>
          <p className="text-gray-500 text-sm mt-1">Pantau status pendaftaran dan pembayaran jamaah Anda.</p>
        </div>
        <button className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition-colors">
          Daftarkan Jamaah Baru
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 bg-gray-50/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari nama jamaah atau ID booking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 text-gray-700 outline-none">
              <option value="all">Semua Status</option>
              <option value="Lunas">Lunas</option>
              <option value="DP">DP</option>
              <option value="pending">Menunggu</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 font-bold">Data Jamaah</th>
                <th className="p-4 font-bold">Paket & Harga</th>
                <th className="p-4 font-bold text-center">Status Pembayaran</th>
                <th className="p-4 font-bold text-center">Pemberangkatan</th>
                <th className="p-4 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : filteredJamaahs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium text-gray-900 mb-1">Tidak ada jamaah ditemukan</p>
                    <p className="text-sm">Anda belum memiliki jamaah atau pencarian tidak cocok.</p>
                  </td>
                </tr>
              ) : (
                filteredJamaahs.map((jamaah) => (
                  <tr key={jamaah.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-gray-900 whitespace-nowrap">{jamaah.nama}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1">ID: {jamaah.id.slice(0, 8).toUpperCase()}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                          jamaah.jenisPaket === 'mitra' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {jamaah.jenisPaket === 'mitra' ? 'Paket Saya' : 'Paket Pusat'}
                        </span>
                      </div>
                      <p className="text-sm font-black text-amber-600">{formatCurrency(jamaah.totalHarga)}</p>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold w-fit ${
                        jamaah.statusPembayaran === 'Lunas' ? 'bg-emerald-100 text-emerald-700' :
                        jamaah.statusPembayaran === 'DP' ? 'bg-blue-100 text-blue-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {jamaah.statusPembayaran === 'Lunas' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {jamaah.statusPembayaran === 'DP' && <CreditCard className="w-3.5 h-3.5" />}
                        {(jamaah.statusPembayaran !== 'Lunas' && jamaah.statusPembayaran !== 'DP') && <Clock className="w-3.5 h-3.5" />}
                        {jamaah.statusPembayaran || 'Pending'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                       <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold capitalize">
                        {jamaah.statusKeberangkatan || 'Menunggu'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors inline-block">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
