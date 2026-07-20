import React, { useState, useEffect } from 'react';
import { db, auth, collection, query, where, onSnapshot, addDoc } from '../firebase';
import { Users, Search, Network, CheckCircle2, Clock, XCircle, TrendingUp, Award, UserPlus, X, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface Downline {
  id: string;
  nama: string;
  email: string;
  brandName: string;
  paketNama: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  whatsapp?: string;
}

export const JaringanMitraView: React.FC = () => {
  const [downlines, setDownlines] = useState<Downline[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const userId = auth.currentUser?.uid;

  // Registration Modal States
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    brandName: '',
    whatsapp: '',
    paketNama: 'Partner Silver'
  });

  const getCommissionAmount = (paket: string, status: string) => {
    if (status !== 'APPROVED') return '0';
    const cleanPaket = (paket || '').toUpperCase();
    if (cleanPaket.includes('PLATINUM')) return '1.500.000';
    if (cleanPaket.includes('GOLD')) return '1.000.000';
    return '500.000'; // Default / Silver
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (!formData.nama || !formData.email || !formData.brandName || !formData.whatsapp) {
      setErrorMsg('Semua kolom wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await addDoc(collection(db, 'pendaftaran_mitra'), {
        nama: formData.nama,
        email: formData.email,
        brandName: formData.brandName,
        whatsapp: formData.whatsapp,
        paketNama: formData.paketNama,
        uplineId: userId,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });

      setSuccessMsg('Pendaftaran mitra baru berhasil diajukan! Menunggu validasi admin.');
      setFormData({
        nama: '',
        email: '',
        brandName: '',
        whatsapp: '',
        paketNama: 'Partner Silver'
      });
      
      // Auto close after 3 seconds
      setTimeout(() => {
        setIsRegisterModalOpen(false);
        setSuccessMsg('');
      }, 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mendaftarkan mitra baru.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRegisterModal = () => {
    if (!isRegisterModalOpen) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            if (!isSubmitting) setIsRegisterModalOpen(false);
          }}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-50"
        >
          {/* Header */}
          <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-50 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 italic uppercase tracking-tight leading-none">
                  DAFTARKAN MITRA BARU
                </h2>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  Membangun Ekosistem Berkah Bersama
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsRegisterModalOpen(false)}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 hover:text-gray-900 hover:shadow-sm transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleRegisterSubmit} className="p-8 space-y-5">
            {successMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold leading-relaxed">
                  {successMsg}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold leading-relaxed">
                  {errorMsg}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Nama Lengkap */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NAMA LENGKAP MITRA</label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  placeholder="Contoh: Haji Ahmad Fauzi"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ALAMAT EMAIL</label>
                <input
                  type="email"
                  required
                  disabled={isSubmitting}
                  placeholder="Contoh: ahmad.fauzi@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold lowercase tracking-wider focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* No WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NOMOR WHATSAPP</label>
                <input
                  type="tel"
                  required
                  disabled={isSubmitting}
                  placeholder="Contoh: 081234567890"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold tracking-wider focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Nama Brand */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NAMA TRAVEL / BRAND</label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  placeholder="Contoh: Al-Mubarak Tour & Travel"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Pilihan Paket */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PILIHAN PAKET KEMITRAAN</label>
                <select
                  disabled={isSubmitting}
                  value={formData.paketNama}
                  onChange={(e) => setFormData({ ...formData, paketNama: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wider focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="Partner Silver">Partner Silver (Potensi: Rp 500rb)</option>
                  <option value="Partner Gold">Partner Gold (Potensi: Rp 1jt)</option>
                  <option value="Partner Platinum">Partner Platinum (Potensi: Rp 1.5jt)</option>
                </select>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsRegisterModalOpen(false)}
                className="px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                BATAL
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-8 py-3.5 rounded-xl shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 transition-all hover:scale-105"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    MEMPROSES...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    DAFTARKAN SEKARANG
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  };

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
        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest px-5 py-3.5 rounded-xl shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 self-start sm:self-auto transition-all hover:scale-105 active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Daftar Jaringan Baru
        </button>
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
                      <div className="flex items-center justify-end gap-1.5 text-emerald-600 font-bold">
                        <TrendingUp className="w-4 h-4" />
                        Rp {getCommissionAmount(downline.paketNama, downline.status)}
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
      {renderRegisterModal()}
    </div>
  );
};
