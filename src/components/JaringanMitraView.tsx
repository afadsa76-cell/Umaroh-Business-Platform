import React, { useState, useEffect } from 'react';
import { db, auth, collection, query, where, onSnapshot } from '../firebase';
import { Users, Search, Network, CheckCircle2, Clock, XCircle, TrendingUp, Award } from 'lucide-react';

interface Downline {
  id: string;
  nama: string;
  email: string;
  brandName: string;
  paketNama: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export const JaringanMitraView: React.FC = () => {
  const [downlines, setDownlines] = useState<Downline[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    // Mengambil data pendaftaran mitra yang mendaftar menggunakan ID user ini sebagai upline
    const q = query(collection(db, 'pendaftaran_mitra'), where('uplineId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Downline[];
      
      // Mengurutkan berdasarkan tanggal terbaru
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setDownlines(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const filteredDownlines = downlines.filter(d => 
    d.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.brandName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDownline = downlines.length;
  const activeDownline = downlines.filter(d => d.status === 'APPROVED').length;
  const pendingDownline = downlines.filter(d => d.status === 'PENDING').length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Network className="w-5 h-5 text-emerald-600" />
            Jaringan Saya
          </h2>
          <p className="text-gray-500 text-sm mt-1">Pantau perkembangan downline dan jaringan mitra Anda.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Jaringan</p>
            <h3 className="text-2xl font-black text-gray-900">{totalDownline}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Mitra Aktif</p>
            <h3 className="text-2xl font-black text-gray-900">{activeDownline}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Menunggu Validasi</p>
            <h3 className="text-2xl font-black text-gray-900">{pendingDownline}</h3>
          </div>
        </div>
      </div>

      {/* Downline List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari nama mitra atau nama travel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 font-bold">Mitra / Brand</th>
                <th className="p-4 font-bold">Paket Bergabung</th>
                <th className="p-4 font-bold">Tanggal Daftar</th>
                <th className="p-4 font-bold text-center">Status</th>
                <th className="p-4 font-bold text-right">Potensi Komisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
                      Memuat data jaringan...
                    </div>
                  </td>
                </tr>
              ) : filteredDownlines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-gray-500">
                    <Network className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="font-bold text-gray-900 text-lg mb-1">Belum Ada Jaringan</p>
                    <p className="text-sm max-w-md mx-auto">
                      Anda belum memiliki mitra downline. Bagikan link referral Anda untuk mulai membangun jaringan bisnis Anda!
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDownlines.map((downline) => (
                  <tr key={downline.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                          {downline.nama.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{downline.brandName}</p>
                          <p className="text-xs text-gray-500">{downline.nama}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                        <Award className="w-3.5 h-3.5" />
                        {downline.paketNama}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {formatDate(downline.createdAt)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold w-fit ${
                        downline.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        downline.status === 'PENDING' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        'bg-rose-100 text-rose-700 border border-rose-200'
                      }`}>
                        {downline.status === 'APPROVED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {downline.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                        {downline.status === 'REJECTED' && <XCircle className="w-3.5 h-3.5" />}
                        {downline.status === 'APPROVED' ? 'Aktif' : downline.status === 'PENDING' ? 'Menunggu' : 'Ditolak'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {/* Place-holder for actual commission logic based on packages */}
                      <div className="flex items-center justify-end gap-1.5 text-emerald-600 font-bold">
                        <TrendingUp className="w-4 h-4" />
                        Rp {downline.status === 'APPROVED' ? '500.000' : '0'}
                      </div>
                      {downline.status === 'PENDING' && (
                        <p className="text-[10px] text-gray-400 mt-1">Cair jika aktif</p>
                      )}
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
