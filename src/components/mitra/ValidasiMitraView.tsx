import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, doc, updateDoc, setDoc, handleFirestoreError, OperationType } from '../../firebase';
import { CheckCircle2, XCircle, Eye, Search, Filter, AlertCircle, Building2, User, Users, FileText, Printer, CheckSquare, Download } from 'lucide-react';
import { openWhatsApp } from '../../utils/whatsapp';
import { logoBase64 } from '../../utils/logoBase64';
import { Capacitor } from '@capacitor/core';
import html2pdf from 'html2pdf.js';
import { runWithOklchFix, downloadFile } from '../../utils/fileUtils';

export interface PendaftaranMitra {
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
  status: 'PENDING' | 'MINTA_VALIDASI' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  password?: string; // Only available before approval
  uid?: string;
  catatan?: string;
  sisaPembayaran?: number;
  tglBatasPelunasan?: string;
}

export interface ValidasiMitraViewProps {
  isFinanceMode?: boolean;
}

export const ValidasiMitraView: React.FC<ValidasiMitraViewProps> = ({ isFinanceMode = false }) => {
  const [pendaftaranList, setPendaftaranList] = useState<PendaftaranMitra[]>([]);
  const [selectedPendaftaran, setSelectedPendaftaran] = useState<PendaftaranMitra | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'MINTA_VALIDASI' | 'APPROVED' | 'REJECTED'>(isFinanceMode ? 'MINTA_VALIDASI' : 'PENDING');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Manual inputs for Admin MD
  const [catatanInput, setCatatanInput] = useState('');
  const [sisaPembayaranInput, setSisaPembayaranInput] = useState<number>(0);
  const [tglBatasPelunasanInput, setTglBatasPelunasanInput] = useState('');

  // Invoice states
  const [selectedInvoice, setSelectedInvoice] = useState<PendaftaranMitra | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceNum, setInvoiceNum] = useState('');
  const [cashier, setCashier] = useState('Tim Keuangan Umaroh');
  const [invoiceNote, setInvoiceNote] = useState('Pembayaran sah setelah divalidasi oleh Tim Keuangan. Harap simpan bukti pembayaran ini sebagai bukti registrasi kemitraan resmi.');
  const [showInvoiceStamp, setShowInvoiceStamp] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    const element = document.getElementById('invoice-print-area');
    if (!element) {
      alert('Elemen invoice tidak ditemukan!');
      return;
    }
    
    setIsGeneratingPDF(true);
    const invoiceNo = selectedInvoice?.id || 'mitra';
    const opt = {
      margin:       0,
      filename:     `invoice_${invoiceNo}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        letterRendering: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    try {
      await runWithOklchFix(async () => {
        const h2p = html2pdf().from(element).set(opt);
        if (Capacitor.isNativePlatform()) {
          const pdfDataUri = await h2p.output('datauristring') as string;
          await downloadFile(pdfDataUri, `invoice_${invoiceNo}.pdf`);
        } else {
          await h2p.save();
        }
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Gagal mengunduh PDF. Silakan coba lagi.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

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
    const s = (searchTerm || '').toLowerCase();
    const rec = p as unknown as Record<string, unknown>;
    const nama = (p.nama || String(rec.namaLengkap || '') || String(rec.namaPenanggungJawab || '') || '').toLowerCase();
    const brand = (p.brandName || String(rec.namaBrand || '') || '').toLowerCase();
    const email = (p.email || '').toLowerCase();
    const phone = (p.phone || String(rec.telepon || '') || '').toLowerCase();

    const matchesSearch = nama.includes(s) || brand.includes(s) || email.includes(s) || phone.includes(s);
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async (pendaftaran: PendaftaranMitra) => {
    setIsProcessing(true);
    setMessage(null);
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

      setMessage({ text: 'Pendaftaran berhasil disetujui. Akun mitra telah dibuat.', type: 'success' });
      setTimeout(() => {
        setIsModalOpen(false);
        setShowApproveConfirm(false);
      }, 1500);
    } catch (error) {
      console.error("Error approving registration:", error);
      handleFirestoreError(error, OperationType.WRITE, 'approval_process');
      setMessage({ text: 'Gagal menyetujui pendaftaran. Silakan coba lagi.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (pendaftaran: PendaftaranMitra) => {
    if (!rejectReason) {
      setMessage({ text: 'Mohon isi alasan penolakan.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setMessage(null);
    try {
      await updateDoc(doc(db, 'pendaftaran_mitra', pendaftaran.id), {
        status: 'REJECTED',
        rejectReason: rejectReason,
        rejectedAt: new Date().toISOString()
      });
      setMessage({ text: 'Pendaftaran berhasil ditolak.', type: 'success' });
      setTimeout(() => {
        setIsModalOpen(false);
        setShowRejectInput(false);
        setRejectReason('');
      }, 1500);
    } catch (error) {
      console.error("Error rejecting registration:", error);
      handleFirestoreError(error, OperationType.UPDATE, `pendaftaran_mitra/${pendaftaran.id}`);
      setMessage({ text: 'Gagal menolak pendaftaran.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMintaValidasi = async (pendaftaran: PendaftaranMitra) => {
    if (sisaPembayaranInput < 0) {
      setMessage({ text: 'Sisa pembayaran tidak boleh negatif.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setMessage(null);
    try {
      await updateDoc(doc(db, 'pendaftaran_mitra', pendaftaran.id), {
        status: 'MINTA_VALIDASI',
        catatan: catatanInput,
        sisaPembayaran: Number(sisaPembayaranInput),
        tglBatasPelunasan: tglBatasPelunasanInput,
        submittedToFinanceAt: new Date().toISOString()
      });
      setMessage({ text: 'Berhasil mengirim permintaan validasi ke tim Finance.', type: 'success' });
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1500);
    } catch (error) {
      console.error("Error requesting finance validation:", error);
      handleFirestoreError(error, OperationType.UPDATE, `pendaftaran_mitra/${pendaftaran.id}`);
      setMessage({ text: 'Gagal mengirim permintaan validasi.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateAdministrasi = async (pendaftaran: PendaftaranMitra) => {
    if (sisaPembayaranInput < 0) {
      setMessage({ text: 'Sisa pembayaran tidak boleh negatif.', type: 'error' });
      return;
    }
    setIsProcessing(true);
    setMessage(null);
    try {
      await updateDoc(doc(db, 'pendaftaran_mitra', pendaftaran.id), {
        catatan: catatanInput,
        sisaPembayaran: Number(sisaPembayaranInput),
        tglBatasPelunasan: tglBatasPelunasanInput,
        updatedAt: new Date().toISOString()
      });
      setMessage({ text: 'Berhasil memperbarui data administrasi pelunasan.', type: 'success' });
      
      setSelectedPendaftaran(prev => prev ? {
        ...prev,
        catatan: catatanInput,
        sisaPembayaran: Number(sisaPembayaranInput),
        tglBatasPelunasan: tglBatasPelunasanInput
      } : null);
    } catch (error) {
      console.error("Error updating administration data:", error);
      handleFirestoreError(error, OperationType.UPDATE, `pendaftaran_mitra/${pendaftaran.id}`);
      setMessage({ text: 'Gagal memperbarui data administrasi.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const openInvoiceModal = (pendaftaran: PendaftaranMitra) => {
    setSelectedInvoice(pendaftaran);
    const dateObj = new Date(pendaftaran.createdAt);
    const year = isNaN(dateObj.getTime()) ? new Date().getFullYear() : dateObj.getFullYear();
    const cleanId = pendaftaran.id.substring(0, 6).toUpperCase();
    setInvoiceNum(`INV/KTR/${year}/${cleanId}`);
    setIsInvoiceOpen(true);
  };

  const openDetail = (pendaftaran: PendaftaranMitra) => {
    setSelectedPendaftaran(pendaftaran);
    setCatatanInput(pendaftaran.catatan || '');
    setSisaPembayaranInput(pendaftaran.sisaPembayaran !== undefined ? pendaftaran.sisaPembayaran : (pendaftaran.status === 'APPROVED' ? 0 : pendaftaran.paketHarga));
    setTglBatasPelunasanInput(pendaftaran.tglBatasPelunasan || '');
    setIsModalOpen(true);
    setShowRejectInput(false);
    setShowApproveConfirm(false);
    setRejectReason('');
    setMessage(null);
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
          <div className={`p-2 rounded-lg ${isFinanceMode ? 'bg-emerald-500' : 'bg-amber-500'}`}>
            <Users className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isFinanceMode ? 'Validasi Pembayaran & Aktivasi Mitra (Finance)' : 'Validasi Pendaftaran Mitra (Mitra Dev)'}
          </h1>
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
              onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'PENDING' | 'MINTA_VALIDASI' | 'APPROVED' | 'REJECTED')}
              className="border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white w-full sm:w-auto"
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">Menunggu Cek MD</option>
              <option value="MINTA_VALIDASI">Menunggu Validasi Finance</option>
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
                <th className="p-4 font-bold">Status Registrasi</th>
                {isFinanceMode && (
                  <>
                    <th className="p-4 font-bold">Status Pelunasan</th>
                    <th className="p-4 font-bold">Sisa Pelunasan</th>
                  </>
                )}
                <th className="p-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={isFinanceMode ? 8 : 6} className="p-8 text-center text-gray-500">
                    Tidak ada data pendaftaran yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredList.map((pendaftaran) => {
                  const sisa = pendaftaran.sisaPembayaran !== undefined ? pendaftaran.sisaPembayaran : (pendaftaran.status === 'APPROVED' ? 0 : pendaftaran.paketHarga);
                  const isLunas = sisa === 0;
                  return (
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
                          pendaftaran.status === 'MINTA_VALIDASI' ? 'bg-blue-100 text-blue-700' :
                          pendaftaran.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {pendaftaran.status === 'PENDING' && <AlertCircle className="w-3 h-3" />}
                          {pendaftaran.status === 'MINTA_VALIDASI' && <Users className="w-3 h-3" />}
                          {pendaftaran.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                          {pendaftaran.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                          {pendaftaran.status === 'MINTA_VALIDASI' ? 'MINTA VALIDASI' : pendaftaran.status}
                        </span>
                      </td>
                      {isFinanceMode && (
                        <>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 w-fit ${
                              isLunas ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isLunas ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                              {isLunas ? 'Lunas' : 'Belum Lunas'}
                            </span>
                          </td>
                          <td className="p-4 text-sm font-bold text-gray-900">
                            {formatCurrency(sisa)}
                          </td>
                        </>
                      )}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openDetail(pendaftaran)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors inline-flex items-center gap-1.5 text-xs font-bold"
                          >
                            <Eye className="w-3.5 h-3.5" /> Detail
                          </button>
                          {isFinanceMode && (
                            <button
                              onClick={() => openInvoiceModal(pendaftaran)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-150 text-indigo-700 rounded-lg transition-colors inline-flex items-center gap-1.5 text-xs font-bold border border-indigo-200"
                            >
                              <Printer className="w-3.5 h-3.5" /> Invoice
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900 font-sans">Detail Pendaftaran Mitra</h2>
                {isFinanceMode && (
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      openInvoiceModal(selectedPendaftaran);
                    }}
                    className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak Invoice
                  </button>
                )}
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-grow">
              {message && (
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 font-semibold text-sm border ${
                  message.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{message.text}</p>
                </div>
              )}
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

                {/* Right Column: Paket, Pembayaran & Pelunasan Administrasi */}
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

                  {/* Manual Input Fields for Catatan, Sisa Pembayaran, and Batas Pelunasan */}
                  <div className="bg-white border border-gray-150 rounded-xl p-5 space-y-4 shadow-sm">
                    <h4 className="text-sm font-bold text-gray-700 border-b pb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-500" /> Detail Administrasi Pelunasan
                    </h4>
                    
                    {isFinanceMode || (!isFinanceMode && selectedPendaftaran.status === 'PENDING') ? (
                      <div className="space-y-4 animate-in fade-in duration-150">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Catatan Mitra / Admin MD <span className="text-rose-500">*</span></label>
                          <textarea
                            value={catatanInput}
                            onChange={(e) => setCatatanInput(e.target.value)}
                            rows={3}
                            className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none animate-none italic-none"
                            placeholder="Contoh: Pembayaran pertama DP 5jt, sisa pelunasan di bawah..."
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Sisa Pembayaran (IDR) <span className="text-rose-500">*</span></label>
                            {isFinanceMode && (
                              <button
                                type="button"
                                onClick={() => setSisaPembayaranInput(0)}
                                className="text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                              >
                                Tandai Lunas (Rp 0)
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm font-bold font-sans">Rp</span>
                            <input
                              type="number"
                              value={sisaPembayaranInput}
                              onChange={(e) => setSisaPembayaranInput(Number(e.target.value))}
                              className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none font-bold"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Batas Waktu Pelunasan <span className="text-rose-500">*</span></label>
                          <input
                            type="date"
                            value={tglBatasPelunasanInput}
                            onChange={(e) => setTglBatasPelunasanInput(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none font-bold"
                          />
                        </div>

                        {isFinanceMode && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateAdministrasi(selectedPendaftaran)}
                              disabled={isProcessing}
                              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm hover:shadow-indigo-100 disabled:opacity-50 cursor-pointer"
                            >
                              <CheckSquare className="w-4 h-4" />
                              {isProcessing ? 'Menyimpan...' : 'Simpan Perubahan Administrasi'}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Read-only View for Finance Mode or approved/rejected/minta_validasi statuses
                      <div className="space-y-3 bg-gray-50/50 p-3 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Catatan Mitra / Admin MD</p>
                          <p className="text-sm font-medium text-gray-800 bg-white p-2 rounded-lg border border-gray-100 min-h-[50px] whitespace-pre-line mt-1">
                            {selectedPendaftaran.catatan || 'Tidak ada catatan.'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                          <div>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Sisa Pembayaran</p>
                            <p className="text-base font-black text-rose-600 mt-1">
                              {formatCurrency(selectedPendaftaran.sisaPembayaran !== undefined ? selectedPendaftaran.sisaPembayaran : (selectedPendaftaran.status === 'APPROVED' ? 0 : selectedPendaftaran.paketHarga))}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Batas Waktu Pelunasan</p>
                            <p className="text-sm font-bold text-gray-700 mt-1">
                              {selectedPendaftaran.tglBatasPelunasan ? new Date(selectedPendaftaran.tglBatasPelunasan).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {((!isFinanceMode && selectedPendaftaran.status === 'PENDING') || 
              (isFinanceMode && selectedPendaftaran.status === 'MINTA_VALIDASI')) && (
              <div className="p-6 border-t border-gray-100 bg-white">
                {showApproveConfirm ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <div>
                      <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-pulse" /> Konfirmasi Persetujuan Kemitraan
                      </p>
                      <p className="text-xs text-emerald-700 mt-1">
                        Apakah Anda yakin ingin menyetujui pendaftaran <strong>{selectedPendaftaran.nama}</strong> ({selectedPendaftaran.brandName})? Akun mitra akan segera aktif dan user document akan dibuat secara otomatis.
                      </p>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setShowApproveConfirm(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleApprove(selectedPendaftaran)}
                        disabled={isProcessing}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isProcessing ? 'Memproses...' : 'Ya, Setujui & Buat Akun'}
                      </button>
                    </div>
                  </div>
                ) : showRejectInput ? (
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
                    
                    {!isFinanceMode ? (
                      <button
                        onClick={() => handleMintaValidasi(selectedPendaftaran)}
                        disabled={isProcessing}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-5 h-5" /> 
                        {isProcessing ? 'Memproses...' : 'Minta Validasi Keuangan / Finance'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowApproveConfirm(true)}
                        disabled={isProcessing}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-5 h-5" /> 
                        {isProcessing ? 'Memproses...' : 'Setujui & Buat Akun'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {isInvoiceOpen && selectedInvoice && (() => {
        const dateObj = new Date(selectedInvoice.createdAt);
        const invoiceDateFormatted = isNaN(dateObj.getTime()) ? '-' : dateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        const sisa = selectedInvoice.sisaPembayaran !== undefined ? selectedInvoice.sisaPembayaran : (selectedInvoice.status === 'APPROVED' ? 0 : selectedInvoice.paketHarga);
        const paidAmount = selectedInvoice.paketHarga - sisa;
        const isLunas = sisa === 0;

        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 overflow-y-auto p-4 md:p-8 flex items-center justify-center font-sans no-print animate-in fadeIn duration-150">
            {/* Custom print styles injected dynamically when invoice modal is active */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #invoice-print-area, #invoice-print-area * {
                  visibility: visible !important;
                }
                #invoice-print-area {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 210mm !important;
                  height: 297mm !important;
                  background: white !important;
                  padding: 15mm !important;
                  margin: 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}} />

            <div className="bg-slate-50 border border-slate-200 rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col md:flex-row h-[90vh] max-h-[850px] animate-in zoom-in-95 duration-200">
              
              {/* Left Panel: Configuration */}
              <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-100 p-5 flex flex-col justify-between overflow-y-auto select-none font-sans no-print">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <span className="flex items-center gap-1.5 text-indigo-700 font-extrabold text-xs tracking-wider uppercase">
                      <FileText className="w-4 h-4" />
                      Set Invoicing ERP
                    </span>
                    <button 
                      onClick={() => {
                        setIsInvoiceOpen(false);
                        setSelectedInvoice(null);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 text-gray-400 hover:text-gray-900 transition cursor-pointer"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">No. Invoice Resmi</label>
                      <input 
                        type="text" 
                        value={invoiceNum} 
                        onChange={(e) => setInvoiceNum(e.target.value)}
                        placeholder="Contoh: INV/2026/KTR-001"
                        className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Staf Keuangan/Kasir</label>
                      <input 
                        type="text" 
                        value={cashier} 
                        onChange={(e) => setCashier(e.target.value)}
                        placeholder="Ketik nama pemeriksa"
                        className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Catatan Syarat & Ketentuan</label>
                      <textarea 
                        value={invoiceNote} 
                        onChange={(e) => setInvoiceNote(e.target.value)}
                        rows={5}
                        className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none resize-none leading-relaxed font-sans"
                      />
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-600 font-bold">Tampilkan Stamp Status</span>
                        <button
                          onClick={() => setShowInvoiceStamp(!showInvoiceStamp)}
                          className={`text-[10px] px-2.5 py-1 rounded-md font-black transition-colors cursor-pointer ${
                            showInvoiceStamp ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-gray-100 text-gray-400 border border-transparent'
                          }`}
                        >
                          {showInvoiceStamp ? 'AKTIF' : 'NON-AKTIF'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-2">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                  >
                    <Download className={`w-4 h-4 ${isGeneratingPDF ? 'animate-bounce' : ''}`} />
                    {isGeneratingPDF ? 'MENGUNDUH PDF...' : 'UNDUH / SIMPAN PDF'}
                  </button>
                  <button
                    onClick={() => {
                      setIsInvoiceOpen(false);
                      setSelectedInvoice(null);
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer font-sans"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              {/* Right Panel: Print Area (A4 Sheet Preview) */}
              <div className="flex-grow bg-slate-200/50 p-4 md:p-8 overflow-y-auto flex justify-center items-start">
                <div 
                  id="invoice-print-area" 
                  className="bg-white border border-slate-300 w-[210mm] h-[297mm] p-8 shadow-lg flex flex-col justify-between font-sans relative text-slate-800"
                >
                  <div>
                    {/* Header: Company & Invoice Info */}
                    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-5">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <img src={logoBase64} alt="Umaroh Logo" className="h-8 object-contain" />
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold leading-normal max-w-sm font-sans">
                          Umaroh Head Office (Bogor)<br />
                          Jl. Tangkuban Prahu No.7, RT.01/RW.03, Babakan,<br />
                          Kec. Bogor Tengah, Kota Bogor, Jawa Barat 16128<br />
                          Telp: +62 811-8880-6909 • Email: umarohtravel@gmail.com
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase mb-2 font-sans">INVOICE KEMITRAAN</h1>
                        <div className="text-[10px] font-bold text-slate-500 space-y-1">
                          <p>No. Invoice: <span className="text-slate-900 font-black">{invoiceNum}</span></p>
                          <p>Tanggal: <span className="text-slate-900">{invoiceDateFormatted}</span></p>
                          <p>Kode Registrasi: <span className="text-slate-900 uppercase font-bold">{selectedInvoice.id.substring(0, 10)}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Customer Information (Bill To) */}
                    <div className="grid grid-cols-2 gap-8 mb-6">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Ditagihkan Kepada (Bill To)</span>
                        <div className="text-xs space-y-1.5 font-bold text-slate-600">
                          <p className="text-sm font-black text-slate-900">{selectedInvoice.nama}</p>
                          <p className="text-amber-700 font-extrabold">{selectedInvoice.brandName}</p>
                          <p>{selectedInvoice.email}</p>
                          <p>WhatsApp: {selectedInvoice.phone || '-'}</p>
                          <p className="max-w-sm leading-relaxed text-[10px] text-slate-500 font-medium">{selectedInvoice.alamatLengkap}</p>
                        </div>
                      </div>

                      <div className="border-l border-slate-100 pl-8">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Metode Pembayaran</span>
                        <div className="text-xs space-y-1 text-slate-700">
                          <p className="font-extrabold text-slate-900 uppercase">
                            {selectedInvoice.metodePembayaran === 'transfer' ? 'Transfer Bank (Manual)' : 'Virtual Account'}
                          </p>
                          <p className="text-[10px] text-slate-500">Status Pembayaran: <span className={`font-black ${isLunas ? 'text-emerald-600' : 'text-rose-600'}`}>{isLunas ? 'LUNAS' : 'BELUM LUNAS'}</span></p>
                          {selectedInvoice.tglBatasPelunasan && (
                            <p className="text-[10px] text-slate-500">
                              Jatuh Tempo: <span className="text-rose-600 font-bold">
                                {new Date(selectedInvoice.tglBatasPelunasan).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Table: Invoice Items */}
                    <table className="w-full text-left border-collapse mb-6">
                      <thead>
                        <tr className="border-b border-slate-900 text-slate-900 text-[10px] font-black uppercase tracking-wider">
                          <th className="py-3 font-black">Deskripsi Layanan & Paket</th>
                          <th className="py-3 text-center font-black">Jumlah</th>
                          <th className="py-3 text-right font-black">Harga Satuan</th>
                          <th className="py-3 text-right font-black">Total Harga</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        <tr>
                          <td className="py-4">
                            <p className="font-black text-slate-900">Biaya Pendaftaran Kemitraan Agen Umaroh</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Paket Kemitraan Resmi: <span className="font-bold text-slate-600">{selectedInvoice.paketNama}</span></p>
                          </td>
                          <td className="py-4 text-center font-bold text-slate-700">1</td>
                          <td className="py-4 text-right font-bold text-slate-700">{formatCurrency(selectedInvoice.paketHarga)}</td>
                          <td className="py-4 text-right font-black text-slate-950">{formatCurrency(selectedInvoice.paketHarga)}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Summary & Calculations */}
                    <div className="flex justify-between items-start">
                      <div className="max-w-md">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Syarat & Ketentuan Pelunasan</span>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed max-w-sm whitespace-pre-line italic font-sans">
                          {invoiceNote}
                        </p>

                        {/* Informasi Rekening Pembayaran */}
                        <div className="mt-4 p-3 bg-amber-50/40 border border-amber-200/60 rounded-xl max-w-xs font-sans">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1.5 leading-tight">
                            REKENING RESMI PEMBAYARAN KEMITRAAN
                          </p>
                          <p className="text-[9px] text-slate-600 font-bold mb-2">
                            Segala bentuk pembayaran <strong className="font-extrabold text-slate-950">wajib</strong> dilakukan melalui rekening <strong className="font-extrabold text-slate-950">PT Nawaitul Umroh Haji</strong>:
                          </p>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded tracking-wide">BCA</span>
                            <span className="bg-slate-800 text-white font-black text-[11px] px-3 py-0.5 rounded tracking-wider font-mono">7380989918</span>
                          </div>
                          <p className="text-[8px] text-slate-400 leading-normal font-medium italic">
                            Segala bentuk pembayaran di luar nomor rekening di atas bukan tanggung jawab PT Nawaitul Umroh Haji.
                          </p>
                        </div>
                      </div>

                      <div className="w-72 space-y-1.5 border-t border-slate-200 pt-2">
                        <div className="flex justify-between text-[11px] text-slate-500 font-bold">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(selectedInvoice.paketHarga)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 font-bold">
                          <span>Uang Muka / Pembayaran Pertama:</span>
                          <span className="text-emerald-600 font-black">{formatCurrency(paidAmount)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm text-slate-900 font-black">
                          <span>Sisa Pembayaran (Tagihan):</span>
                          <span className={`${sisa > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatCurrency(sisa)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stamp & Corporate Footer Section */}
                  <div className="mt-4 pt-4 flex flex-col gap-4 relative">
                    {/* Stamp row */}
                    <div className="flex justify-between items-center h-14">
                      <div className="relative w-48 h-14 flex items-center">
                        {/* Stamp watermark */}
                        {showInvoiceStamp && (
                          <div className={`absolute top-0 left-0 transform -rotate-12 border-4 border-double px-5 py-2 rounded-xl font-sans tracking-widest select-none text-center ${
                            isLunas 
                              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20' 
                              : 'border-amber-600 text-amber-600 bg-amber-50/20'
                          }`}>
                            <p className="text-center text-[9px] font-extrabold tracking-widest leading-none mb-1 uppercase">UMAROH FINANCE</p>
                            <p className="text-center font-black text-xs tracking-wide leading-none">{isLunas ? 'PAID / LUNAS' : 'PARTIAL / DP'}</p>
                            <p className="text-[8px] text-center font-bold tracking-widest leading-none mt-1 uppercase">{invoiceDateFormatted}</p>
                          </div>
                        )}
                      </div>
                      <div className="w-56 text-right">
                        {/* Cashier signature block removed as requested */}
                      </div>
                    </div>

                    {/* Thank you Corporate Footer Section */}
                    <div className="border-t border-b border-slate-200 py-3 bg-slate-50/50 text-center font-sans">
                      <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                        Terima kasih atas kepercayaan Anda kepada <strong className="font-extrabold text-slate-900">PT Nawaitul Umroh Haji</strong>
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-1 flex items-center justify-center gap-1">
                        Semoga Allah SWT memudahkan perjalanan ibadah Anda <span className="text-xs">🤲</span>
                      </p>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};
