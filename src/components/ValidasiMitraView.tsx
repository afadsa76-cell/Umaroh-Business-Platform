import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, doc, updateDoc, setDoc, handleFirestoreError, OperationType } from '../firebase';
import { CheckCircle2, XCircle, Eye, Search, Filter, AlertCircle, Building2, User, Users } from 'lucide-react';
import { openWhatsApp } from '../utils/whatsapp';

interface PendaftaranMitra {
  id: string;
  nama: string;
  email: string;
  phone: string;
  brandName: string;
  nikKtp: string;
  provinsi: string;
  kota: string;
  kecamatan: string;
  desaKelurahan?: string;
  alamatLengkap: string;
  uplineId: string;
  uplineName: string;
  paketId: string;
  paketNama: string;
  paketHarga: number;
  metodePembayaran: string;
  buktiTransfer: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  password?: string; // Only available before approval
  uid?: string;
}

export const ValidasiMitraView: React.FC = () => {
  const [pendaftaranList, setPendaftaranList] = useState<PendaftaranMitra[]>([]);
  const [selectedPendaftaran, setSelectedPendaftaran] = useState<PendaftaranMitra | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'pendaftaran_mitra'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PendaftaranMitra[];
      
      // Sort by newest first
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPendaftaranList(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'pendaftaran_mitra');
    });

    return () => unsub();
  }, []);

  const filteredList = pendaftaranList.filter(p => {
    const matchesSearch = p.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async (pendaftaran: PendaftaranMitra) => {
    if (!window.confirm(`Apakah Anda yakin ingin menyetujui pendaftaran ${pendaftaran.nama}?`)) return;
    
    setIsProcessing(true);
    try {
      // 1. Create user in Firebase Auth (Note: This might require admin SDK in a real backend, 
      // but for this demo we'll try to create it if we have the password, or just mark as approved)
      // Since we are in the client, creating a user will log out the current admin.
      // A better approach for a client-only app is to just approve, and let the user know they need to reset password,
      // OR we store the password temporarily and use a cloud function.
      // For this prototype, we will just update the status and create a user document.
      // The actual auth creation should ideally happen via a Cloud Function.
      // Let's simulate the approval by updating the document and creating a user doc.

      // Update status
      await updateDoc(doc(db, 'pendaftaran_mitra', pendaftaran.id), {
        status: 'APPROVED',
        approvedAt: new Date().toISOString()
      });

      // Create user document (Auth creation skipped to prevent admin logout if simulated, but if they registered manually they are already created)
      // In a real app, use Firebase Admin SDK to create the auth user.
      const newUserId = pendaftaran.uid || `mitra_${Date.now()}`;
      await setDoc(doc(db, 'users', newUserId), {
        uid: newUserId,
        id: newUserId,
        name: pendaftaran.nama,
        namaLengkap: pendaftaran.nama,
        email: pendaftaran.email,
        role: 'mitra',
        phone: pendaftaran.phone,
        brandName: pendaftaran.brandName,
        paketId: pendaftaran.paketId,
        uplineId: pendaftaran.uplineId,
        provinsi: pendaftaran.provinsi || '',
        kota: pendaftaran.kota || '',
        kecamatan: pendaftaran.kecamatan || '',
        desaKelurahan: pendaftaran.desaKelurahan || '',
        address: pendaftaran.alamatLengkap || '',
        createdAt: new Date().toISOString()
      });

      alert('Pendaftaran berhasil disetujui. Akun mitra telah dibuat (Simulasi).');
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error approving registration:", error);
      handleFirestoreError(error, OperationType.WRITE, 'approval_process');
      alert('Gagal menyetujui pendaftaran.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (pendaftaran: PendaftaranMitra) => {
    if (!rejectReason) {
      alert('Mohon isi alasan penolakan.');
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'pendaftaran_mitra', pendaftaran.id), {
        status: 'REJECTED',
        rejectReason: rejectReason,
        rejectedAt: new Date().toISOString()
      });
      alert('Pendaftaran berhasil ditolak.');
      setIsModalOpen(false);
      setShowRejectInput(false);
      setRejectReason('');
    } catch (error) {
      console.error("Error rejecting registration:", error);
      handleFirestoreError(error, OperationType.UPDATE, `pendaftaran_mitra/${pendaftaran.id}`);
      alert('Gagal menolak pendaftaran.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openDetail = (pendaftaran: PendaftaranMitra) => {
    setSelectedPendaftaran(pendaftaran);
    setIsModalOpen(true);
    setShowRejectInput(false);
    setRejectReason('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString || isNaN(new Date(dateString).getTime())) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500 rounded-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Validasi Pendaftaran Mitra</h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari nama, brand, atau email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED')}
              className="border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white w-full sm:w-auto"
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">Menunggu Validasi</option>
              <option value="APPROVED">Disetujui</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Tanggal</th>
                <th className="p-4 font-bold">Calon Mitra</th>
                <th className="p-4 font-bold">Paket</th>
                <th className="p-4 font-bold">Pembayaran</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Tidak ada data pendaftaran yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredList.map((pendaftaran) => (
                  <tr key={pendaftaran.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-600">
                      {formatDate(pendaftaran.createdAt)}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-gray-900">{pendaftaran.nama}</p>
                      <p className="text-xs text-gray-500">{pendaftaran.brandName}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-medium text-gray-900">{pendaftaran.paketNama}</p>
                      <p className="text-xs text-amber-600 font-bold">{formatCurrency(pendaftaran.paketHarga)}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        pendaftaran.metodePembayaran === 'transfer' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                      }`}>
                        {pendaftaran.metodePembayaran === 'transfer' ? 'Transfer Manual' : 'Virtual Account'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${
                        pendaftaran.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                        pendaftaran.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {pendaftaran.status === 'PENDING' && <AlertCircle className="w-3 h-3" />}
                        {pendaftaran.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                        {pendaftaran.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                        {pendaftaran.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => openDetail(pendaftaran)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors inline-flex items-center gap-2 text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" /> Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {isModalOpen && selectedPendaftaran && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Detail Pendaftaran Mitra</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-grow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Data */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" /> Data Diri
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">Nama Lengkap</p>
                        <p className="font-medium text-gray-900">{selectedPendaftaran.nama}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-medium text-gray-900">{selectedPendaftaran.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">No. WhatsApp</p>
                        <p className="font-medium text-gray-900">{selectedPendaftaran.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">NIK KTP</p>
                        <p className="font-medium text-gray-900">{selectedPendaftaran.nikKtp}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Data Usaha & Lokasi
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">Nama Brand Travel</p>
                        <p className="font-bold text-amber-600">{selectedPendaftaran.brandName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Alamat Lengkap</p>
                        <p className="font-medium text-gray-900">{selectedPendaftaran.alamatLengkap}</p>
                        <p className="text-sm text-gray-600">
                          {selectedPendaftaran.desaKelurahan ? `${selectedPendaftaran.desaKelurahan}, ` : ''}{selectedPendaftaran.kecamatan}, {selectedPendaftaran.kota}, {selectedPendaftaran.provinsi}
                        </p>
                      </div>
                      {selectedPendaftaran.uplineName && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500">Upline / Referensi</p>
                          <p className="font-medium text-blue-600">{selectedPendaftaran.uplineName}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Paket & Pembayaran */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Paket Kemitraan</h3>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                      <p className="font-bold text-amber-900 text-lg">{selectedPendaftaran.paketNama}</p>
                      <p className="text-2xl font-black text-amber-600 mt-1">{formatCurrency(selectedPendaftaran.paketHarga)}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Pembayaran</h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                      <div>
                        <p className="text-xs text-gray-500">Metode</p>
                        <p className="font-medium text-gray-900 uppercase">{selectedPendaftaran.metodePembayaran}</p>
                      </div>
                      
                      {selectedPendaftaran.metodePembayaran === 'transfer' && selectedPendaftaran.buktiTransfer && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Bukti Transfer</p>
                          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                            <img 
                              src={selectedPendaftaran.buktiTransfer} 
                              alt="Bukti Transfer" 
                              className="w-full h-auto max-h-64 object-contain cursor-pointer"
                              onClick={() => openWhatsApp(selectedPendaftaran.buktiTransfer)}
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1 text-center">Klik gambar untuk memperbesar</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {selectedPendaftaran.status === 'PENDING' && (
              <div className="p-6 border-t border-gray-100 bg-white">
                {showRejectInput ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Penolakan</label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                        rows={3}
                        placeholder="Masukkan alasan penolakan pendaftaran..."
                      />
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setShowRejectInput(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleReject(selectedPendaftaran)}
                        disabled={isProcessing}
                        className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? 'Memproses...' : 'Konfirmasi Tolak'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4 justify-end">
                    <button
                      onClick={() => setShowRejectInput(true)}
                      className="px-6 py-3 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-colors flex items-center gap-2"
                    >
                      <XCircle className="w-5 h-5" /> Tolak Pendaftaran
                    </button>
                    <button
                      onClick={() => handleApprove(selectedPendaftaran)}
                      disabled={isProcessing}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-5 h-5" /> 
                      {isProcessing ? 'Memproses...' : 'Setujui & Buat Akun'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
