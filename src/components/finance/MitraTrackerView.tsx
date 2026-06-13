import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, TrendingUp, Users, Calendar, ShieldAlert, AlertTriangle, 
  MessageSquare, CircleDot, UserCheck, Plus, Search, ArrowUpDown, 
  Download, Printer, Trash2, FileText, Upload, RefreshCw, Landmark,
  AlertCircle, Pencil
} from 'lucide-react';
import { 
  db, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc,
  handleFirestoreError, OperationType
} from '../../firebase';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Type definitions matching blueprint
export interface MitraTracker {
  id: string;
  nama_mitra: string;
  nama_brand: string;
  pic: string;
  hp: string;
  kota: string;
  jumlah_seat: number;
  paket_umroh: string;
  tanggal_berangkat: string;
  total_tagihan: number;
  dp: number;
  term1: number;
  term2: number;
  pelunasan: number;
  total_bayar: number;
  sisa_tagihan: number;
  persentase_bayar: number;
  deadline_pelunasan: string;
  hari_menuju_berangkat: number;
  status_pembayaran: string;
  status_risiko: string;
  penyebab_masalah: string;
  last_follow_up: string;
  pic_finance: string;
  status_keberangkatan: string; // Aman, Pending, Risiko, Cancel
  created_at: string;
  updated_at: string;
}

export interface MitraFollowup {
  id: string;
  mitra_id: string;
  tanggal_followup: string;
  hasil_followup: string;
  janji_bayar: string;
  nominal_janji: number;
  status_followup: string;
  pic_finance: string;
  created_at: string;
}

export interface MitraPaymentHistory {
  id: string;
  mitra_id: string;
  tanggal_bayar: string;
  jenis_pembayaran: string; // DP, TERMIN 1, TERMIN 2, PELUNASAN
  nominal: number;
  metode: string;
  bank: string;
  bukti_transfer: string; // Base64 or string url
  catatan: string;
  created_by: string;
  created_at: string;
}

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
}

type MenuSubTab = 'dashboard' | 'pembayaran' | 'risiko' | 'followup' | 'seat' | 'history';

// Helper to calculate H-30 (30 days before departure) for local date inputs
export const calculateDeadlineH30 = (departureDateStr: string): string => {
  if (!departureDateStr) return '';
  const date = new Date(departureDateStr);
  if (isNaN(date.getTime())) return '';
  date.setDate(date.getDate() - 30);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Helper to calculate H-45 (45 days before departure) for local date inputs based on PT NAWAITUL UMRAH HAJI rules
export const calculateDeadlineH45 = (departureDateStr: string): string => {
  if (!departureDateStr) return '';
  const date = new Date(departureDateStr);
  if (isNaN(date.getTime())) return '';
  date.setDate(date.getDate() - 45); // Subtract 45 days
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Helper to calculate H-90 (90 days before departure)
export const calculateDeadlineH90 = (departureDateStr: string): string => {
  if (!departureDateStr) return '';
  const date = new Date(departureDateStr);
  if (isNaN(date.getTime())) return '';
  date.setDate(date.getDate() - 90);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Helper to calculate H-60 (60 days before departure)
export const calculateDeadlineH60 = (departureDateStr: string): string => {
  if (!departureDateStr) return '';
  const date = new Date(departureDateStr);
  if (isNaN(date.getTime())) return '';
  date.setDate(date.getDate() - 60);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Helper to calculate H-50 (50 days before departure)
export const calculateDeadlineH50 = (departureDateStr: string): string => {
  if (!departureDateStr) return '';
  const date = new Date(departureDateStr);
  if (isNaN(date.getTime())) return '';
  date.setDate(date.getDate() - 50);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const MitraTrackerView: React.FC = () => {
  // Navigation & Role Configuration
  const [activeSubTab, setActiveSubTab] = useState<MenuSubTab>('dashboard');
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'finance' | 'owner'>('admin');
  
  // Expanded Mitra Rows Trigger
  const [expandedMitraIds, setExpandedMitraIds] = useState<Record<string, boolean>>({});

  // Core States
  const [trackers, setTrackers] = useState<MitraTracker[]>([]);
  const [realMitras, setRealMitras] = useState<PendaftaranMitra[]>([]);
  const [selectedRealMitraId, setSelectedRealMitraId] = useState<string>('');
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [followups, setFollowups] = useState<MitraFollowup[]>([]);
  const [payments, setPayments] = useState<MitraPaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Pagination & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaket, setFilterPaket] = useState('ALL');
  const [filterRisiko, setFilterRisiko] = useState('ALL');
  const [filterPembayaran, setFilterPembayaran] = useState('ALL');
  const [filterPic, setFilterPic] = useState('ALL');
  
  // Sort State
  const [sortField, setSortField] = useState<keyof MitraTracker>('nama_mitra');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Input Modals Fields
  const [isNewMitraModalOpen, setIsNewMitraModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTrackerId, setEditingTrackerId] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [selectedMitraId, setSelectedMitraId] = useState<string>('');

  // Form Fields - Edit Mitra
  const [formDataEditMitra, setFormDataEditMitra] = useState({
    nama_mitra: '',
    nama_brand: '',
    pic: '',
    hp: '',
    kota: '',
    jumlah_seat: 45,
    paket_umroh: 'Paket Umroh Reguler 2026',
    tanggal_berangkat: '',
    total_tagihan: 0,
    deadline_pelunasan: '',
    pic_finance: 'Andika Finance',
    status_keberangkatan: 'Aman',
    total_bayar: 0
  });

  // Form Fields - New Mitra
  const [formDataMitra, setFormDataMitra] = useState({
    nama_mitra: '',
    nama_brand: '',
    pic: '',
    hp: '',
    kota: '',
    jumlah_seat: 45,
    paket_umroh: 'Paket Umroh Reguler 2026',
    tanggal_berangkat: '',
    total_tagihan: 0,
    deadline_pelunasan: '',
    pic_finance: 'Andika Finance',
    status_keberangkatan: 'Aman'
  });

  // Form Fields - Payment Record
  const [formDataPay, setFormDataPay] = useState({
    jenis_pembayaran: 'DP',
    nominal: 0,
    metode: 'Transfer Bank',
    bank: 'BCA',
    bukti_transfer: '',
    catatan: ''
  });

  // Form Fields - Followup Record
  const [formDataFollow, setFormDataFollow] = useState({
    hasil_followup: '',
    janji_bayar: '',
    nominal_janji: 0,
    status_followup: 'Ongoing',
    pic_finance: 'Andika Finance'
  });

  // File drag state
  const [dragActive, setDragActive] = useState(false);

  // 1. Listen real-time to Firestore
  useEffect(() => {
    setLoading(true);
    const unsubTrackers = onSnapshot(collection(db, 'mitra_tracker'), (snapshot) => {
      const data: MitraTracker[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MitraTracker));

      setTrackers(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'mitra_tracker'));

    const unsubRealMitras = onSnapshot(collection(db, 'pendaftaran_mitra'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PendaftaranMitra[];
      
      const approved = data.filter(item => item.status === 'APPROVED');
      setRealMitras(approved);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'pendaftaran_mitra'));

    const unsubFollowups = onSnapshot(collection(db, 'mitra_followup'), (snapshot) => {
      const data: MitraFollowup[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MitraFollowup));
      setFollowups(data.sort((a,b) => b.tanggal_followup.localeCompare(a.tanggal_followup)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'mitra_followup'));

    const unsubPayments = onSnapshot(collection(db, 'mitra_payment_history'), (snapshot) => {
      const data: MitraPaymentHistory[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MitraPaymentHistory));
      setPayments(data.sort((a,b) => b.tanggal_bayar.localeCompare(a.tanggal_bayar)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'mitra_payment_history'));

    return () => {
      unsubTrackers();
      unsubRealMitras();
      unsubFollowups();
      unsubPayments();
    };
  }, []);

  // Automatic Risk and Day Calculations on Mount or Data Change
  const calculatedTrackers = useMemo(() => {
    const today = new Date();
    return trackers.map(tr => {
      // Days to Departure
      let days = 999;
      if (tr.tanggal_berangkat) {
        const depDate = new Date(tr.tanggal_berangkat);
        const diffTime = depDate.getTime() - today.getTime();
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Re-evaluate risk state based on specifications (sisa piutang progress):
      // - <= 20% = AMAN (equivalent to paid >= 80%)
      // - <= 50% = WASPADA (equivalent to paid >= 50%)
      // - > 50% = RISIKO TINGGI (equivalent to paid < 50%)
      const risk = tr.persentase_bayar <= 20 
        ? 'AMAN' 
        : tr.persentase_bayar <= 50 
          ? 'WASPADA' 
          : 'RISIKO TINGGI';

      return {
        ...tr,
        hari_menuju_berangkat: days,
        status_risiko: risk
      };
    });
  }, [trackers]);

  // Seeding high-quality initial Indonesian Umroh partners for showcase
  const seedInitialData = async () => {
    const initialMitras = [
      {
        id: 'mitra_1',
        nama_mitra: 'H. Abdul Rasyid (Ad-Dua Travel)',
        nama_brand: 'Ad-Dua Wisata Mulia',
        pic: 'Haji Rasyid',
        hp: '081234567890',
        kota: 'Jakarta Selatan',
        jumlah_seat: 45,
        paket_umroh: 'Umroh Syawal Gold 2026',
        tanggal_berangkat: '2026-07-10',
        total_tagihan: 1350000000,
        dp: 200000000,
        term1: 300000000,
        term2: 400000000,
        pelunasan: 200000000,
        total_bayar: 1100000000,
        sisa_tagihan: 250000000,
        persentase_bayar: 18.52, // 18.52% Sisa Piutang (<= 20% = AMAN)
        deadline_pelunasan: '2026-06-10',
        pic_finance: 'Andika Finance',
        status_pembayaran: 'DP',
        status_risiko: 'AMAN',
        penyebab_masalah: '',
        last_follow_up: '2026-05-20',
        status_keberangkatan: 'Aman',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mitra_2',
        nama_mitra: 'Siti Rahma (Rabbaniah Tour)',
        nama_brand: 'Rabbaniah Umroh Berkah',
        pic: 'Ibu Rahma',
        hp: '087788991122',
        kota: 'Surabaya',
        jumlah_seat: 90,
        paket_umroh: 'Umroh Premium Millennial',
        tanggal_berangkat: '2026-06-25', // H-31 from May 25, 2026
        total_tagihan: 2880000000,
        dp: 400000000,
        term1: 1000000000,
        term2: 300000000,
        pelunasan: 0,
        total_bayar: 1700000000,
        sisa_tagihan: 1180000000,
        persentase_bayar: 40.97, // 40.97% Sisa Piutang (21%-50% = WASPADA)
        deadline_pelunasan: '2026-05-26',
        pic_finance: 'Sonia Finance',
        status_pembayaran: 'DP',
        status_risiko: 'WASPADA',
        penyebab_masalah: 'Menunggu pencairan korporat di Surabaya',
        last_follow_up: '2026-05-24',
        status_keberangkatan: 'Pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mitra_3',
        nama_mitra: 'Drs. Ahmad Mansur (Mitra Madina)',
        nama_brand: 'Madina Prima Wisata',
        pic: 'Pak Mansur',
        hp: '085244556633',
        kota: 'Bandung',
        jumlah_seat: 35,
        paket_umroh: 'Umroh Lailatul Qadr Promo',
        tanggal_berangkat: '2026-06-08', // H-14 from May 25, 2026
        total_tagihan: 1050000000,
        dp: 150000000,
        term1: 150000000,
        term2: 120000000,
        pelunasan: 0,
        total_bayar: 420000000,
        sisa_tagihan: 630000000,
        persentase_bayar: 60.00, // 60.0% Sisa Piutang (> 50% = RISIKO TINGGI)
        deadline_pelunasan: '2026-05-25',
        pic_finance: 'Andika Finance',
        status_pembayaran: 'DP',
        status_risiko: 'RISIKO TINGGI',
        penyebab_masalah: 'Masalah visa jamaah luar kota yang tertunda logistiknya',
        last_follow_up: '2026-05-25',
        status_keberangkatan: 'Risiko',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const item of initialMitras) {
      await setDoc(doc(db, 'mitra_tracker', item.id), item);
    }
  };

  // 2. Add New Mitra Tracker Action
  const handleCreateMitra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formDataMitra.total_tagihan < 0 || formDataMitra.jumlah_seat <= 0) {
      alert("Nilai tidak boleh negatif / jumlah seat harus di atas 0.");
      return;
    }

    const nId = 'mitra_' + Math.random().toString(36).substring(2, 9);
    const newRecord: MitraTracker = {
      id: nId,
      nama_mitra: formDataMitra.nama_mitra,
      nama_brand: formDataMitra.nama_brand,
      pic: formDataMitra.pic,
      hp: formDataMitra.hp,
      kota: formDataMitra.kota,
      jumlah_seat: Number(formDataMitra.jumlah_seat),
      paket_umroh: formDataMitra.paket_umroh,
      tanggal_berangkat: formDataMitra.tanggal_berangkat,
      total_tagihan: Number(formDataMitra.total_tagihan),
      dp: 0,
      term1: 0,
      term2: 0,
      pelunasan: 0,
      total_bayar: 0,
      sisa_tagihan: Number(formDataMitra.total_tagihan),
      persentase_bayar: 0,
      deadline_pelunasan: formDataMitra.deadline_pelunasan,
      hari_menuju_berangkat: 999,
      status_pembayaran: 'BELUM LUNAS',
      status_risiko: 'RISIKO TINGGI',
      penyebab_masalah: '',
      last_follow_up: '',
      pic_finance: formDataMitra.pic_finance,
      status_keberangkatan: formDataMitra.status_keberangkatan,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'mitra_tracker', nId), newRecord);
      setIsNewMitraModalOpen(false);
      setFormDataMitra({
        nama_mitra: '',
        nama_brand: '',
        pic: '',
        hp: '',
        kota: '',
        jumlah_seat: 45,
        paket_umroh: 'Paket Umroh Reguler 2026',
        tanggal_berangkat: '',
        total_tagihan: 0,
        deadline_pelunasan: '',
        pic_finance: 'Andika Finance',
        status_keberangkatan: 'Aman'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `mitra_tracker/${nId}`);
    }
  };

  // 2b. Auto Sync & Import Real approved Mitras
  const handleImportFromRealMitras = async () => {
    if (realMitras.length === 0) {
      alert("Tidak ada data Mitra Terdaftar dengan status APPROVED/DISETUJUI di dalam database saat ini. Silakan daftarkan dan validasi mitra di menu Validasi Mitra terlebih dahulu.");
      return;
    }

    let createdCount = 0;
    try {
      for (const m of realMitras) {
        // Double check if already tracked
        const exist = trackers.some(t => t.hp === m.phone || t.nama_brand === m.brandName);
        if (!exist) {
          const nId = 'mitra_' + Math.random().toString(36).substring(2, 9);
          const newRecord: MitraTracker = {
            id: nId,
            nama_mitra: m.nama,
            nama_brand: m.brandName || m.nama,
            pic: m.nama,
            hp: m.phone || '',
            kota: m.kota || '',
            jumlah_seat: 45, // Default estimate
            paket_umroh: m.paketNama || 'Paket Umroh Reguler 2026',
            tanggal_berangkat: '2026-08-08', // Default forward-looking projection
            total_tagihan: Number(m.paketHarga) || 0,
            dp: 0,
            term1: 0,
            term2: 0,
            pelunasan: 0,
            total_bayar: 0,
            sisa_tagihan: Number(m.paketHarga) || 0,
            persentase_bayar: 0,
            deadline_pelunasan: calculateDeadlineH45('2026-08-08'), // Default is H-45 of departures forward-looking projection
            hari_menuju_berangkat: 999,
            status_pembayaran: 'BELUM LUNAS',
            status_risiko: 'RISIKO TINGGI',
            penyebab_masalah: '',
            last_follow_up: '',
            pic_finance: 'Andika Finance',
            status_keberangkatan: 'Aman',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          await setDoc(doc(db, 'mitra_tracker', nId), newRecord);
          createdCount++;
        }
      }
      alert(`Sinkronisasi Selesai! Berhasil mengimpor ${createdCount} mitra real ke Tracker Pembayaran.`);
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mengimpor mitra real.");
    }
  };

  // 2c. Clear All Trackers
  const handleClearAllTrackers = async () => {
    let confirmed = false;
    try {
      if (typeof window !== 'undefined' && window.confirm) {
        confirmed = window.confirm("Apakah Anda yakin ingin mengosongkan seluruh data tracker? Tindakan ini berguna jika Anda ingin menghapus semua data dummy bawaan sistem.");
      }
    } catch {
      confirmed = true;
    }
    if (!confirmed) return;

    try {
      for (const t of trackers) {
        await deleteDoc(doc(db, 'mitra_tracker', t.id));
      }
      alert("Seluruh data tracker dibersihkan. Anda sekarang dapat mengisi data real penuh.");
    } catch (err) {
      console.error(err);
      alert("Gagal membersihkan data.");
    }
  };

  // 3. Register Payment (Cicilan)
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formDataPay.nominal <= 0) {
      alert("Nominal pembayaran harus di atas Rp 0.");
      return;
    }

    const mTracker = trackers.find(t => t.id === selectedMitraId);
    if (!mTracker) return;

    // Type of cycle values
    let nextDp = mTracker.dp || 0;
    let nextT1 = mTracker.term1 || 0;
    let nextT2 = mTracker.term2 || 0;
    let nextPel = mTracker.pelunasan || 0;

    if (formDataPay.jenis_pembayaran === 'DP') nextDp += Number(formDataPay.nominal);
    if (formDataPay.jenis_pembayaran === 'TERMIN 1') nextT1 += Number(formDataPay.nominal);
    if (formDataPay.jenis_pembayaran === 'TERMIN 2') nextT2 += Number(formDataPay.nominal);
    if (formDataPay.jenis_pembayaran === 'PELUNASAN') nextPel += Number(formDataPay.nominal);

    const nextTotalBayar = nextDp + nextT1 + nextT2 + nextPel;
    const nextSisa = mTracker.total_tagihan - nextTotalBayar;
    const nextPct = mTracker.total_tagihan > 0 ? (nextSisa / mTracker.total_tagihan) * 100 : 0;
    const nextStatusPembayaran = nextSisa <= 0 ? 'LUNAS' : (nextTotalBayar > 0 ? 'DP' : 'BELUM LUNAS');

    try {
      // 1. Save historical payment ledger entry
      const pId = 'pay_' + Math.random().toString(36).substring(2, 9);
      const payRecord: MitraPaymentHistory = {
        id: pId,
        mitra_id: selectedMitraId,
        tanggal_bayar: new Date().toISOString().split('T')[0],
        jenis_pembayaran: formDataPay.jenis_pembayaran,
        nominal: Number(formDataPay.nominal),
        metode: formDataPay.metode,
        bank: formDataPay.bank,
        bukti_transfer: formDataPay.bukti_transfer,
        catatan: formDataPay.catatan,
        created_by: mTracker.pic_finance,
        created_at: new Date().toISOString()
      };
      await setDoc(doc(db, 'mitra_payment_history', pId), payRecord);

      // 2. Update parent tracker with recalculated values
      await updateDoc(doc(db, 'mitra_tracker', selectedMitraId), {
        dp: nextDp,
        term1: nextT1,
        term2: nextT2,
        pelunasan: nextPel,
        total_bayar: nextTotalBayar,
        sisa_tagihan: nextSisa,
        persentase_bayar: nextPct,
        status_pembayaran: nextStatusPembayaran,
        updated_at: new Date().toISOString()
      });

      setIsPaymentModalOpen(false);
      setFormDataPay({
        jenis_pembayaran: 'DP',
        nominal: 0,
        metode: 'Transfer Bank',
        bank: 'BCA',
        bukti_transfer: '',
        catatan: ''
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `mitra_payment_history`);
    }
  };

  // 4. Save Follow-up Update Interaction Log
  const handleRegisterFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    const mTracker = trackers.find(t => t.id === selectedMitraId);
    if (!mTracker) return;

    try {
      const fId = 'fup_' + Math.random().toString(36).substring(2, 9);
      const followupRecord: MitraFollowup = {
        id: fId,
        mitra_id: selectedMitraId,
        tanggal_followup: new Date().toISOString().split('T')[0],
        hasil_followup: formDataFollow.hasil_followup,
        janji_bayar: formDataFollow.janji_bayar,
        nominal_janji: Number(formDataFollow.nominal_janji),
        status_followup: formDataFollow.status_followup,
        pic_finance: formDataFollow.pic_finance,
        created_at: new Date().toISOString()
      };
      await setDoc(doc(db, 'mitra_followup', fId), followupRecord);

      // Overwrite tracker's last follow_up date
      await updateDoc(doc(db, 'mitra_tracker', selectedMitraId), {
        last_follow_up: new Date().toISOString().split('T')[0]
      });

      setIsFollowupModalOpen(false);
      setFormDataFollow({
        hasil_followup: '',
        janji_bayar: '',
        nominal_janji: 0,
        status_followup: 'Ongoing',
        pic_finance: 'Andika Finance'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'mitra_followup');
    }
  };

  // 4b. Open WhatsApp with highly-detailed pre-filled billing detail message
  const handleOpenWhatsApp = (tr: MitraTracker) => {
    if (!tr.hp) {
      alert("Hubungi WA Gagal: Nomor HP Mitra tidak terdaftar.");
      return;
    }

    const cleanedNumber = tr.hp.replace(/[^0-9]/g, '');
    const waNumber = cleanedNumber.startsWith('0') ? '62' + cleanedNumber.slice(1) : cleanedNumber;
    
    const hariLagiText = tr.hari_menuju_berangkat != null && tr.hari_menuju_berangkat !== 999 
      ? `(${tr.hari_menuju_berangkat} Hari Lagi)` 
      : '';

    const dpRequired = (tr.jumlah_seat || 0) * 5000000;
    const remainingSisa = Math.max(0, tr.total_tagihan - dpRequired);
    const termin2Required = remainingSisa * 0.30;
    const termin3Required = remainingSisa * 0.30;
    const pelunasanRequired = tr.total_tagihan - dpRequired - termin2Required - termin3Required;

    const deadlineH90 = calculateDeadlineH90(tr.tanggal_berangkat);
    const deadlineH60 = calculateDeadlineH60(tr.tanggal_berangkat);
    const deadlineH50 = calculateDeadlineH50(tr.tanggal_berangkat);
    const deadlineH45 = calculateDeadlineH45(tr.tanggal_berangkat);

    // Merge Termin 1 (Pembayaran Ke-2) and Termin 2 (Pembayaran Ke-3) if H-60 is passed and unpaid
    const isTermin1PassedAndUnpaid = (tr.hari_menuju_berangkat != null && tr.hari_menuju_berangkat <= 60) && (tr.total_bayar < dpRequired + termin2Required);

    const rekapTahapanSection = isTermin1PassedAndUnpaid
      ? `*a. Uang Muka (DP)* (Jatuh Tempo: ${deadlineH90 || '-'})
📌 *Rp 5.000.000 / Jamaah*
📌 Target DP (${tr.jumlah_seat || 0} pax): *${formatCurrency(dpRequired)}*

*b & c. Pembayaran Ke-2 & Ke-3 (DIGABUNG)* (Jatuh Tempo Ke-2 Terlewati: ${deadlineH60 || '-'})
📌 Sebesar *60% dari sisa total tagihan*
📌 Target Termin 2 & 3: *${formatCurrency(termin2Required + termin3Required)}*

*d. Pelunasan Akhir (H-45)* (Jatuh Tempo: ${deadlineH45 || '-'})
📌 Target Pelunasan Akhir: *${formatCurrency(pelunasanRequired)}*`
      : `*a. Uang Muka (DP)* (Jatuh Tempo: ${deadlineH90 || '-'})
📌 *Rp 5.000.000 / Jamaah*
📌 Target DP (${tr.jumlah_seat || 0} pax): *${formatCurrency(dpRequired)}*

*b. Pembayaran Ke-2* (Jatuh Tempo: ${deadlineH60 || '-'})
📌 Sebesar *30% dari sisa total tagihan*
📌 Target Termin 2: *${formatCurrency(termin2Required)}*

*c. Pembayaran Ke-3* (Jatuh Tempo: ${deadlineH50 || '-'})
📌 Sebesar *30% dari sisa total tagihan*
📌 Target Termin 3: *${formatCurrency(termin3Required)}*

*d. Pelunasan Akhir (H-45)* (Jatuh Tempo: ${deadlineH45 || '-'})
📌 Target Pelunasan Akhir: *${formatCurrency(pelunasanRequired)}*`;

    const message = `*Konfirmasi Pembayaran Mitra - Umaroh Platform* 📑

Yth. Bapak/Ibu ${tr.pic || tr.nama_mitra}
dari *${tr.nama_brand || tr.nama_mitra}*

Berikut rincian status pembayaran saat ini:

• *Paket Umroh:* ${tr.paket_umroh || '-'}
• *Rencana Keberangkatan:* ${tr.tanggal_berangkat || '-'} ${hariLagiText}
• *Jumlah Seat:* ${tr.jumlah_seat || 0} pax

*Rincian Finansial:*
• Total Tagihan Kontrak: *${formatCurrency(tr.total_tagihan)}*
• Total Terbayar: *${formatCurrency(tr.total_bayar)}* (${tr.persentase_bayar?.toFixed(1)}%)
• *Sisa Piutang Berjalan: ${formatCurrency(tr.sisa_tagihan)}*

• *Batas Pelunasan (Deadline H-45):* ${tr.deadline_pelunasan || '-'}

*KETENTUAN & REKAP TAHAPAN PEMBAYARAN:*
-------------------------------------------
${rekapTahapanSection}
-------------------------------------------

Mohon perwakilan mitra dapat segera mengoordinasikan pelunasan tagihan sisa piutang di atas sesuai tanggal deadline demi kelancaran penerbitan dokumen dan ticketing jamaah.

Jika ada pertanyaan atau konfirmasi pembayaran cicilan baru, silakan hubungi kami dengan melampirkan bukti transfer.

Terima kasih. 🙏
*Finance - Umaroh Platform*`;

    const encodedText = encodeURIComponent(message);
    const waUrl = `https://api.whatsapp.com/send?phone=${waNumber}&text=${encodedText}`;
    window.open(waUrl, '_blank');
  };

  // 5. Delete Mitra Tracker Guard
  const handleDeleteTracker = (id: string) => {
    setDeleteConfirmationId(id);
  };

  // 5b. Edit Mitra Tracker Actions
  const handleOpenEditModal = (tr: MitraTracker) => {
    setEditingTrackerId(tr.id);
    setFormDataEditMitra({
      nama_mitra: tr.nama_mitra || '',
      nama_brand: tr.nama_brand || '',
      pic: tr.pic || '',
      hp: tr.hp || '',
      kota: tr.kota || '',
      jumlah_seat: tr.jumlah_seat || 45,
      paket_umroh: tr.paket_umroh || 'Paket Umroh Reguler 2026',
      tanggal_berangkat: tr.tanggal_berangkat || '',
      total_tagihan: tr.total_tagihan || 0,
      deadline_pelunasan: tr.deadline_pelunasan || '',
      pic_finance: tr.pic_finance || 'Andika Finance',
      status_keberangkatan: tr.status_keberangkatan || 'Aman',
      total_bayar: tr.total_bayar || 0
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateMitra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrackerId) return;

    if (formDataEditMitra.total_tagihan < 0 || formDataEditMitra.jumlah_seat <= 0 || formDataEditMitra.total_bayar < 0) {
      alert("Nilai tidak boleh negatif / jumlah seat harus di atas 0.");
      return;
    }

    try {
      const current = trackers.find(t => t.id === editingTrackerId);
      if (!current) return;

      const total_bayar = Number(formDataEditMitra.total_bayar);
      const sisa_tagihan = Number(formDataEditMitra.total_tagihan) - total_bayar;
      const persentase_bayar = Number(formDataEditMitra.total_tagihan) > 0 
        ? (sisa_tagihan / Number(formDataEditMitra.total_tagihan)) * 100 
        : 0;

      // Re-evaluate risk state based on specifications:
      // - <= 20% sisa piutang = AMAN
      // - <= 50% sisa piutang = WASPADA
      // - > 50% sisa piutang = RISIKO TINGGI
      const risk = persentase_bayar <= 20 
        ? 'AMAN' 
        : (persentase_bayar <= 50 ? 'WASPADA' : 'RISIKO TINGGI');

      // Re-evaluate payment status
      const nextStatusPembayaran = sisa_tagihan <= 0 ? 'LUNAS' : (total_bayar > 0 ? 'DP' : 'BELUM LUNAS');

      const updatedRecord = {
        nama_mitra: formDataEditMitra.nama_mitra,
        nama_brand: formDataEditMitra.nama_brand,
        pic: formDataEditMitra.pic,
        hp: formDataEditMitra.hp,
        kota: formDataEditMitra.kota,
        jumlah_seat: Number(formDataEditMitra.jumlah_seat),
        paket_umroh: formDataEditMitra.paket_umroh,
        tanggal_berangkat: formDataEditMitra.tanggal_berangkat,
        total_tagihan: Number(formDataEditMitra.total_tagihan),
        dp: total_bayar, // Resetting payment components to the edited sum
        term1: 0,
        term2: 0,
        pelunasan: 0,
        total_bayar: total_bayar,
        sisa_tagihan: sisa_tagihan,
        persentase_bayar: persentase_bayar,
        status_pembayaran: nextStatusPembayaran,
        deadline_pelunasan: formDataEditMitra.deadline_pelunasan,
        pic_finance: formDataEditMitra.pic_finance,
        status_keberangkatan: formDataEditMitra.status_keberangkatan,
        status_risiko: risk,
        updated_at: new Date().toISOString()
      };

      await updateDoc(doc(db, 'mitra_tracker', editingTrackerId), updatedRecord);
      setIsEditModalOpen(false);
      setEditingTrackerId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `mitra_tracker/${editingTrackerId}`);
    }
  };

  // Base64 file conversions for Proof Uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Batas maksimal ukuran bukti transfer adalah 2MB!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormDataPay(prev => ({ ...prev, bukti_transfer: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Batas maksimal ukuran bukti transfer adalah 2MB!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormDataPay(prev => ({ ...prev, bukti_transfer: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Automated warnings evaluator based on PT NAWAITUL UMRAH HAJI H-45 criteria standard
  const getWarningState = (daysStr: number, sisaPct: number, sisaTagihan: number) => {
    if (sisaTagihan <= 0) return null;
    
    // H-45 belum lunas: CRITICAL (Melewati Batas Ketentuan Pelunasan Akhir)
    if (daysStr <= 45) {
      return { level: 'CRITICAL', text: 'Melewati batas pelunasan akhir H-45! Wajib segera dilunasi.', color: 'red' };
    }
    // H-60 dan sisa piutang > 40%: Red Warning
    if (daysStr <= 60 && sisaPct > 40) {
      return { level: 'RISIKO', text: 'H-60 Pembayaran di bawah 60% (Sisa Pembayaran ke-3 belum tuntas).', color: 'orange' };
    }
    // H-90 dan sisa piutang > 75%: Yellow Warning
    if (daysStr <= 90 && sisaPct > 75) {
      return { level: 'WARNING', text: 'H-90 Pembayaran di bawah 25% (Uang Muka/DP belum lunas penuh).', color: 'yellow' };
    }
    return null;
  };

  // Calculated Metrics Summaries
  const metrics = useMemo(() => {
    const totalMitra = calculatedTrackers.length;
    const totalSeat = calculatedTrackers.reduce((acc, curr) => acc + (curr.jumlah_seat || 0), 0);
    const totalTagihan = calculatedTrackers.reduce((acc, curr) => acc + (curr.total_tagihan || 0), 0);
    const totalBayar = calculatedTrackers.reduce((acc, curr) => acc + (curr.total_bayar || 0), 0);
    const totalPiutang = totalTagihan - totalBayar;
    
    const amanCount = calculatedTrackers.filter(t => t.status_risiko === 'AMAN').length;
    const waspadaCount = calculatedTrackers.filter(t => t.status_risiko === 'WASPADA').length;
    const risikoCount = calculatedTrackers.filter(t => t.status_risiko === 'RISIKO TINGGI').length;

    // Warning logs compiled
    const warningBanners: { id: string; name: string; info: string; color: string }[] = [];
    calculatedTrackers.forEach(t => {
      const warn = getWarningState(t.hari_menuju_berangkat, t.persentase_bayar, t.sisa_tagihan);
      if (warn) {
        warningBanners.push({
          id: t.id,
          name: t.nama_mitra,
          info: warn.text,
          color: warn.color
        });
      }
    });

    return {
      totalMitra,
      totalSeat,
      totalTagihan,
      totalBayar,
      totalPiutang,
      amanCount,
      waspadaCount,
      risikoCount,
      warningBanners
    };
  }, [calculatedTrackers]);

  // Unique dynamic list filters values
  const uniquePakets = useMemo(() => ['ALL', ...Array.from(new Set(trackers.map(t => t.paket_umroh).filter(Boolean)))], [trackers]);
  const uniquePics = useMemo(() => ['ALL', ...Array.from(new Set(trackers.map(t => t.pic_finance).filter(Boolean)))], [trackers]);

  // Handle Tables Sorting
  const requestSort = (field: keyof MitraTracker) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortField === field && sortDirection === 'asc') {
      direction = 'desc';
    }
    setSortField(field);
    setSortDirection(direction);
  };

  // Filter & Search Matcher
  const filteredAndSortedTrackers = useMemo(() => {
    let result = [...calculatedTrackers];

    // Search query matched
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      result = result.filter(t => 
        (t.nama_mitra || '').toLowerCase().includes(s) ||
        (t.nama_brand || '').toLowerCase().includes(s) ||
        (t.pic || '').toLowerCase().includes(s) ||
        (t.kota || '').toLowerCase().includes(s)
      );
    }

    // Filter Paket values
    if (filterPaket !== 'ALL') {
      result = result.filter(t => t.paket_umroh === filterPaket);
    }

    // Filter Risk levels
    if (filterRisiko !== 'ALL') {
      result = result.filter(t => t.status_risiko === filterRisiko);
    }

    // Filter Payment states
    if (filterPembayaran !== 'ALL') {
      result = result.filter(t => t.status_pembayaran === filterPembayaran);
    }

    // Filter PIC
    if (filterPic !== 'ALL') {
      result = result.filter(t => t.pic_finance === filterPic);
    }

    // Sort order execution
    result.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();
      if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [calculatedTrackers, searchTerm, filterPaket, filterRisiko, filterPembayaran, filterPic, sortField, sortDirection]);

  // Group trackers by package name for partitioned table view
  const groupedTrackers = useMemo(() => {
    const groups: { [key: string]: MitraTracker[] } = {};
    for (const tr of filteredAndSortedTrackers) {
      const pkg = tr.paket_umroh || 'Paket Lainnya';
      if (!groups[pkg]) {
        groups[pkg] = [];
      }
      groups[pkg].push(tr);
    }
    return groups;
  }, [filteredAndSortedTrackers]);

  // Ambil list paket yang unik dari data yang sudah di-input
  const existingPackagesInfo = useMemo(() => {
    const pkgs: { name: string; tanggal_berangkat: string; deadline_pelunasan: string }[] = [];
    const uniqueKeys = new Set<string>();
    for (const tr of trackers) {
      const pName = tr.paket_umroh?.trim();
      if (pName) {
        const key = pName.toLowerCase();
        if (!uniqueKeys.has(key)) {
          uniqueKeys.add(key);
          pkgs.push({
            name: pName,
            tanggal_berangkat: tr.tanggal_berangkat || '',
            deadline_pelunasan: tr.deadline_pelunasan || ''
          });
        }
      }
    }
    return pkgs;
  }, [trackers]);

  // Grouped package summary specifically for Dashboard Overview
  const dashboardGroupedTrackers = useMemo(() => {
    const groups: {
      [key: string]: {
        paketName: string;
        tanggalBerangkat: string;
        hariMenujuBerangkat: number;
        mitraCount: number;
        totalSeat: number;
        totalTagihan: number;
        totalBayar: number;
        totalPiutang: number;
        averagePercent: number;
      }
    } = {};

    for (const tr of calculatedTrackers) {
      const pName = tr.paket_umroh?.trim() || 'Paket Lainnya';
      if (!groups[pName]) {
        groups[pName] = {
          paketName: pName,
          tanggalBerangkat: tr.tanggal_berangkat || '-',
          hariMenujuBerangkat: tr.hari_menuju_berangkat ?? 999,
          mitraCount: 0,
          totalSeat: 0,
          totalTagihan: 0,
          totalBayar: 0,
          totalPiutang: 0,
          averagePercent: 0
        };
      }
      
      const g = groups[pName];
      g.mitraCount += 1;
      g.totalSeat += (tr.jumlah_seat || 0);
      g.totalTagihan += (tr.total_tagihan || 0);
      g.totalBayar += (tr.total_bayar || 0);
      g.totalPiutang += (tr.sisa_tagihan || 0);
    }

    // Hitung rata-rata persentase sisa piutang per paket
    const list = Object.values(groups);
    for (const g of list) {
      g.averagePercent = g.totalTagihan > 0 ? (g.totalPiutang / g.totalTagihan) * 100 : 0;
    }

    return list;
  }, [calculatedTrackers]);

  // Currency formater
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Export tables to pure Excel XLSX format using xlsx
  const handleExportExcel = () => {
    const dataToExport = filteredAndSortedTrackers.map(t => ({
      'Nama Mitra': t.nama_mitra,
      'Nama Brand/Travel': t.nama_brand,
      'PIC': t.pic,
      'No. HP': t.hp,
      'Kota': t.kota,
      'Jumlah Seat': t.jumlah_seat,
      'Paket Umroh': t.paket_umroh,
      'Keberangkatan': t.tanggal_berangkat,
      'Total Tagihan': t.total_tagihan,
      'DP': t.dp,
      'Termin 1': t.term1,
      'Termin 2': t.term2,
      'Pelunasan': t.pelunasan,
      'Total Terbayar': t.total_bayar,
      'Sisa Piutang': t.sisa_tagihan,
      '% Sisa Piutang': `${t.persentase_bayar?.toFixed(1)}%`,
      'Deadline': t.deadline_pelunasan,
      'H-Minus Keberangkatan': t.hari_menuju_berangkat,
      'Status Bayar': t.status_pembayaran,
      'Status Risiko': t.status_risiko,
      'PIC Finance': t.pic_finance,
      'Kesiapan Keberangkatan': t.status_keberangkatan
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan_Mitra_Tracker");
    XLSX.writeFile(wb, `Umaroh_Mitra_Tracker_Laporan_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to professional printed elements or clean PDF with jsPDF AutoTable
  const handleExportPdf = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    interface jsPDFWithAutoTable extends jsPDF {
      lastAutoTable?: {
        finalY: number;
      };
    }
    
    // Header Laporan
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text('UMAROH PLATFORM - LAPORAN TRACKER PEMBAYARAN MITRA (PER PAKET)', 14, 15);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total Paket: ${Object.keys(groupedTrackers).length} Paket`, 14, 20);
    
    let currentY = 24;

    Object.keys(groupedTrackers)
      .sort((a, b) => {
        const itemA = groupedTrackers[a][0];
        const itemB = groupedTrackers[b][0];
        const daysA = itemA?.hari_menuju_berangkat ?? 9999;
        const daysB = itemB?.hari_menuju_berangkat ?? 9999;
        if (daysA >= 0 && daysB >= 0) {
          return daysA - daysB;
        }
        if (daysA < 0 && daysB < 0) {
          return daysB - daysA;
        }
        return daysA >= 0 ? -1 : 1;
      })
      .forEach((paketName) => {
      const items = groupedTrackers[paketName];
      if (items.length === 0) return;
      const firstItem = items[0];
      const tglBerangkat = firstItem?.tanggal_berangkat || '-';
      const hariLagi = firstItem?.hari_menuju_berangkat != null ? `(${firstItem.hari_menuju_berangkat} Hari Lagi)` : '';

      // Tentukan apakah butuh halaman baru (jika posisinya terlalu rendah)
      if (currentY > 170) {
        doc.addPage();
        currentY = 15;
      }

      // Judul Blok Paket
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(5, 150, 105); // emerald-600
      doc.text(`🟢 PAKET: ${paketName.toUpperCase()}  |  KEBERANGKATAN: ${tglBerangkat} ${hariLagi}`, 14, currentY);
      currentY += 4;

      const headers = [['Mitra / Brand', 'Seat', 'PIC & No. HP', 'Total Tagihan', 'Total Terbayar', 'Sisa Piutang', '% Sisa', 'Batas Pelunasan', 'Risiko']];
      
      // Map data baris
      const data = items.map(t => [
        t.nama_brand || t.nama_mitra,
        t.jumlah_seat.toString(),
        `${t.pic || '-'} (${t.hp || '-'})`,
        formatCurrency(t.total_tagihan),
        formatCurrency(t.total_bayar),
        formatCurrency(t.sisa_tagihan),
        `${t.persentase_bayar?.toFixed(1)}%`,
        t.deadline_pelunasan || '-',
        t.status_risiko
      ]);

      // Hitung sub total untuk paket ini
      const totalSeats = items.reduce((sum, item) => sum + (item.jumlah_seat || 0), 0);
      const totalTagihan = items.reduce((sum, item) => sum + (item.total_tagihan || 0), 0);
      const totalBayar = items.reduce((sum, item) => sum + (item.total_bayar || 0), 0);
      const totalSisa = items.reduce((sum, item) => sum + (item.sisa_tagihan || 0), 0);
      const avgPercent = totalTagihan > 0 ? (totalSisa / totalTagihan) * 100 : 0;

      // Sisipkan baris subtotal di akhir data tabel ini
      data.push([
        `TOTAL ${paketName.toUpperCase()}`,
        totalSeats.toString(),
        `${items.length} Mitra Terdaftar`,
        formatCurrency(totalTagihan),
        formatCurrency(totalBayar),
        formatCurrency(totalSisa),
        `${avgPercent.toFixed(1)}%`,
        '',
        ''
      ]);

      autoTable(doc, {
        head: headers,
        body: data,
        startY: currentY,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [5, 150, 105] }, // Hijau emerald
        didParseCell: (hookData) => {
          // Highlight baris total (baris terakhir)
          if (hookData.row.index === data.length - 1) {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fillColor = [240, 253, 250]; // emerald-50 bg
            hookData.cell.styles.textColor = [15, 23, 42]; // slate-900
          }
        }
      });

      // Update currentY setelah tabel selesai dibuat
      const docWithTable = doc as jsPDFWithAutoTable;
      currentY = (docWithTable.lastAutoTable?.finalY ?? currentY + 30) + 8;
    });

    doc.save(`Laporan_Umroh_Mitra_Per_Paket_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-gray-400 gap-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <span className="text-xs font-black uppercase tracking-widest text-gray-500">Mempersiapkan Data Sync Realtime...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto font-sans bg-gray-50/50">
      
      {/* ⚠️ Critical Realtime Warning Banners Top Dock */}
      {metrics.warningBanners.length > 0 && (
        <div className="space-y-2 border border-rose-200 bg-rose-50/60 p-4 rounded-xl shadow-xs">
          <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm uppercase tracking-wider">
            <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
            Notifikasi Risiko Jatuh Tempo Keberangkatan (Realtime)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
            {metrics.warningBanners.slice(0, 4).map((warn, index) => (
              <div 
                key={warn.id + '-' + index} 
                className="flex items-start gap-2 text-xs bg-white rounded-lg p-2.5 border border-rose-100 shadow-3xs"
              >
                <div className="bg-rose-100 text-rose-700 font-black rounded px-1.5 py-0.5 scale-90">MITRA RISIKO</div>
                <div>
                  <span className="font-black text-gray-800">{warn.name}</span>: <span className="text-rose-700 font-medium">{warn.info}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Header and Tab Switcher */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500 rounded-xl text-white">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Tracker Pembayaran Mitra</h1>
              <p className="text-xs sm:text-sm text-gray-400 font-medium">Monitoring piutang, pelunasan termin, limitasi kursi, dan risiko keberangkatan agen & mitra</p>
            </div>
          </div>
        </div>

        {/* Dynamic Mode Preview for testing roles easily */}
        <div className="flex items-center gap-2 bg-gray-150 p-1.5 rounded-xl border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-2">Role Mode:</span>
          {['admin', 'finance', 'owner'].map(role => (
            <button
              key={role}
              onClick={() => setCurrentUserRole(role as 'admin' | 'finance' | 'owner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black capitalize transition-all ${currentUserRole === role ? 'bg-amber-600 text-white shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Sub Menu tabs */}
      <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-xs overflow-x-auto gap-0.5">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
          { id: 'pembayaran', label: 'Manajemen Pembayaran', icon: CircleDot },
          { id: 'risiko', label: 'Analisis Risiko', icon: AlertTriangle },
          { id: 'followup', label: 'Follow Up Finance', icon: MessageSquare },
          { id: 'seat', label: 'Monitoring Kursi (Seat)', icon: Users },
          { id: 'history', label: 'Riwayat & Audit Log', icon: FileText }
        ].map(tab => {
          const TabIcon = tab.icon;
          const isSelected = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as MenuSubTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-black text-xs sm:text-sm transition-all whitespace-nowrap uppercase tracking-wider ${isSelected ? 'bg-amber-50 text-amber-900 border-b-2 border-amber-600' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              <TabIcon className={`w-4 h-4 ${isSelected ? 'text-amber-600' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Render Dynamic Sub-Tabs views */}
      
      {/* 1. DASHBOARD OVERVIEW SUBTAB */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Card Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-3xs hover:shadow-2xs transition-all col-span-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-gray-400">Total Tagihan Mitra</span>
              <p className="text-lg sm:text-xl font-extrabold text-blue-900 mt-1">{formatCurrency(metrics.totalTagihan)}</p>
              <div className="w-full bg-blue-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${(metrics.totalBayar / (metrics.totalTagihan || 1)) * 100}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-3xs hover:shadow-2xs transition-all col-span-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-green-500">Pembayaran Masuk</span>
              <p className="text-lg sm:text-xl font-extrabold text-green-700 mt-1">{formatCurrency(metrics.totalBayar)}</p>
              <p className="text-[10px] text-green-500 mt-2 font-black">{((metrics.totalBayar / (metrics.totalTagihan || 1)) * 100).toFixed(1)}% Terkumpul</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-3xs hover:shadow-2xs transition-all col-span-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-rose-500">Total Piutang Berjalan</span>
              <p className="text-lg sm:text-xl font-extrabold text-rose-600 mt-1">{formatCurrency(metrics.totalPiutang)}</p>
              <p className="text-[10px] text-rose-400 mt-2 font-black">Harus Dilunasi Secepatnya</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-3xs hover:shadow-2xs transition-all">
              <span className="text-[10px] uppercase font-black tracking-wider text-gray-400">Total Seat</span>
              <p className="text-lg sm:text-2xl font-extrabold text-gray-900 mt-1">{metrics.totalSeat}</p>
              <p className="text-[10px] text-gray-500 mt-2 font-black">{metrics.totalMitra} Kontrak Mitra</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-3xs hover:shadow-2xs transition-all">
              <span className="text-[10px] uppercase font-black tracking-wider text-gray-400">Mitra Aman</span>
              <p className="text-lg sm:text-2xl font-extrabold text-green-600 mt-1">{metrics.amanCount}</p>
              <p className="text-[10px] text-green-500/80 mt-2 font-black">&gt;= 80% Terbayar</p>
            </div>

          </div>

          {/* Graphics, rankings & analytic progress section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Visual HTML Progress Chart */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs lg:col-span-2 space-y-4">
              <h3 className="font-extrabold text-gray-800 text-sm uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Visualisasi Persentase Pembayaran Mitra & Sisa Piutang
              </h3>
              
              <div className="space-y-4 pt-2">
                {calculatedTrackers.map(t => (
                  <div key={t.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-black text-gray-700">
                      <span>{t.nama_brand} - {t.pic}</span>
                      <span>{t.persentase_bayar?.toFixed(1)}% ({formatCurrency(t.sisa_tagihan)} Sisa)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden flex">
                      <div 
                        className="bg-emerald-500 h-3.5 transition-all duration-500" 
                        style={{ width: `${Math.min(100, t.persentase_bayar)}%` }}
                      ></div>
                      <div 
                        className="bg-rose-500 h-3.5 opacity-80" 
                        style={{ width: `${100 - Math.min(100, t.persentase_bayar)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 text-xs font-bold pt-4 text-gray-500 justify-end border-t border-gray-50">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Pembayaran Masuk</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500"></span> Piutang (Dues)</span>
              </div>
            </div>

            {/* Ranking Best Mitra and Largest Piutang */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6">
              
              {/* Ranking 1: Best Payment */}
              <div>
                <h4 className="font-black text-xs text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <UserCheck className="w-4 h-4 text-emerald-500" /> Ranking Mitra Terbaik (% Bayar)
                </h4>
                <div className="divide-y divide-gray-50 mt-2 space-y-2">
                  {[...calculatedTrackers].sort((a,b) => b.persentase_bayar - a.persentase_bayar).slice(0, 3).map((t, idx) => (
                    <div key={t.id} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{idx + 1}</span>
                        <div>
                          <p className="font-black text-gray-800">{t.nama_brand}</p>
                          <p className="text-[10px] text-gray-400">{t.pic}</p>
                        </div>
                      </div>
                      <span className="font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{t.persentase_bayar?.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ranking 2: Major Balance Piutang */}
              <div>
                <h4 className="font-black text-xs text-rose-500 uppercase tracking-widest flex items-center gap-1 pt-4 border-t border-gray-50">
                  <AlertTriangle className="w-4 h-4 text-rose-500" /> Piutang Terbesar
                </h4>
                <div className="divide-y divide-gray-50 mt-2 space-y-2">
                  {[...calculatedTrackers].sort((a,b) => b.sisa_tagihan - a.sisa_tagihan).slice(0, 3).map((t, idx) => (
                    <div key={t.id} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">{idx + 1}</span>
                        <div>
                          <p className="font-black text-gray-800">{t.nama_brand}</p>
                          <p className="text-[10px] text-gray-400">{t.pic}</p>
                        </div>
                      </div>
                      <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{formatCurrency(t.sisa_tagihan)}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

          {/* Section Rekapan Per Paket Umroh */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-600" />
                  Rekapitulasi Finansial & Seat Per Paket Umroh
                </h3>
                <p className="text-[11px] text-gray-500 font-medium">Informasi akumulasi tagihan, pembayaran, sisa piutang, dan seat terkumpul untuk setiap paket keberangkatan.</p>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-3 py-1 rounded-full uppercase tracking-widest">
                {dashboardGroupedTrackers.length} Paket Terdeteksi
              </span>
            </div>

            {dashboardGroupedTrackers.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs font-black text-gray-500 uppercase">Belum ada data paket yang terdaftar</p>
                <p className="text-[10px] text-gray-400 font-medium mt-1">Silakan tambahkan data mitra dengan memilih paket keberangkatan terlebih dahulu.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboardGroupedTrackers.map((pkg) => {
                  const isUrgent = pkg.hariMenujuBerangkat >= 0 && pkg.hariMenujuBerangkat <= 30;
                  
                  return (
                    <div key={pkg.paketName} className="bg-gray-50/50 hover:bg-white rounded-xl border border-gray-200 hover:border-emerald-300 transition-all shadow-3xs duration-200 overflow-hidden flex flex-col justify-between">
                      {/* Header bar */}
                      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-3 text-white flex justify-between items-center">
                        <p className="font-extrabold text-[13px] tracking-wide uppercase truncate max-w-[70%]" title={pkg.paketName}>
                          🟢 {pkg.paketName}
                        </p>
                        <span className="bg-emerald-950/40 text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap uppercase">
                          {pkg.mitraCount} Mitra
                        </span>
                      </div>

                      {/* Content Details */}
                      <div className="p-4 space-y-3.5 flex-1">
                        {/* Sub row: Departure & seat count */}
                        <div className="grid grid-cols-2 gap-2 border-b border-gray-105 pb-3 text-[11px]">
                          <div>
                            <p className="text-gray-400 font-bold uppercase text-[9px]">Keberangkatan</p>
                            <p className="font-black text-gray-800 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              {pkg.tanggalBerangkat}
                            </p>
                            {pkg.hariMenujuBerangkat !== 999 && (
                              <span className={`inline-block text-[9px] font-black mt-1 px-1.5 py-0.5 rounded ${isUrgent ? 'bg-rose-150 text-rose-800 animate-pulse' : 'bg-gray-200 text-gray-750'}`}>
                                {pkg.hariMenujuBerangkat >= 0 ? `${pkg.hariMenujuBerangkat} Hari Lagi` : 'Sudah Berangkat'}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-400 font-bold uppercase text-[9px] text-right">Seat Terisi</p>
                            <p className="font-black text-gray-900 text-base flex items-center justify-end gap-1 mt-0.5">
                              <Users className="w-4 h-4 text-emerald-600" />
                              {pkg.totalSeat} <span className="text-[10px] text-gray-400 font-bold">SEAT</span>
                            </p>
                          </div>
                        </div>

                        {/* Main balances rows */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-500 font-extrabold uppercase text-[9px]">Total Tagihan Kontrak</span>
                            <span className="font-black text-gray-950">{formatCurrency(pkg.totalTagihan)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-emerald-600 font-extrabold uppercase text-[9px] flex items-center gap-1">
                              ● Total Terbayar
                            </span>
                            <span className="font-black text-emerald-700">{formatCurrency(pkg.totalBayar)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] pt-1 border-t border-dashed border-gray-200">
                            <span className="text-rose-600 font-extrabold uppercase text-[9px] flex items-center gap-1">
                              ● Sisa Piutang Berjalan
                            </span>
                            <span className="font-black text-rose-700">{formatCurrency(pkg.totalPiutang)}</span>
                          </div>
                        </div>

                        {/* Payment progress bar */}
                        <div className="space-y-1.5 pt-1.5">
                          <div className="flex justify-between items-center text-[10px] font-black">
                            <span className="text-gray-400 uppercase text-[9px]">Progres Pembayaran</span>
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-black text-xs">
                              {pkg.averagePercent.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, pkg.averagePercent)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* 2. TRACKER PEMBAYARAN TABLE SUBTAB */}
      {activeSubTab === 'pembayaran' && (
        <div className="space-y-6 animate-in fade-in duration-300 font-sans">
          
          {/* PT NAWAITUL UMRAH HAJI Payment Guidelines Block */}
          <div className="bg-gradient-to-r from-teal-955 to-slate-900 bg-teal-950 text-white p-5 rounded-2xl shadow-md border border-teal-800 space-y-3.5 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-start gap-2.5 pb-2 border-b border-white/10">
              <span className="text-xl">📌</span>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-teal-300">
                  KETENTUAN & TAHAPAN JADWAL PEMBAYARAN JAMAAH - PT NAWAITUL UMRAH HAJI
                </h3>
                <p className="text-[10px] text-teal-100/70 font-medium leading-relaxed">
                  Semua transaksi pendaftaran agen & mitra wajib mematuhi skema termin standar perlindungan kuota keberangkatan berikut:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium text-teal-100">
              <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5 text-left">
                <p className="font-black text-teal-300 text-xs uppercase">a. Uang Muka (DP)</p>
                <p className="text-[11px] leading-relaxed text-teal-100/90">
                  <strong className="text-white">Rp 5.000.000 / Jamaah</strong> dibayarkan langsung saat pendaftaran awal untuk mengamankan block seat kuota.
                </p>
              </div>
              <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5 text-left">
                <p className="font-black text-teal-300 text-xs uppercase">b. Pembayaran Ke-2</p>
                <p className="text-[11px] leading-relaxed text-teal-100/90">
                  Sebesar <strong className="text-white">30% dari sisa total tagihan</strong> setelah dikurangi alokasi DP awal (Menyesuaikan fluktuasi rilis tiket).
                </p>
              </div>
              <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5 text-left">
                <p className="font-black text-teal-300 text-xs uppercase">c. Pembayaran Ke-3</p>
                <p className="text-[11px] leading-relaxed text-teal-100/90">
                  Sebesar <strong className="text-white">30% dari sisa total tagihan</strong> setelah dikurangi alokasi DP awal (Melengkapi verifikasi logistik).
                </p>
              </div>
              <div className="space-y-1 bg-teal-900/40 p-3 rounded-xl border border-emerald-500/20 text-left">
                <p className="font-black text-amber-300 text-xs uppercase flex items-center gap-1">
                  d. Pelunasan Akhir (H-45)
                </p>
                <p className="text-[11px] leading-relaxed text-teal-50 font-bold">
                  Seluruh sisa biaya wajib dilunasi sepenuhnya paling lambat <strong className="text-white bg-amber-600 px-1 py-0.5 rounded">H-45 (45 hari sebelum terbang)</strong>.
                </p>
              </div>
            </div>
          </div>
          
          {/* Filters, search and actions headers */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex items-center gap-2 w-full md:max-w-md">
                <Search className="w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Cari Agen Mitra, Brand, Kota, PIC..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-amber-550"
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {currentUserRole !== 'owner' && (
                  <>
                    <button
                      onClick={() => setIsNewMitraModalOpen(true)}
                      className="bg-amber-600 text-white font-black text-xs px-4 py-2.5 rounded-xl hover:bg-amber-700 transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                      <Plus className="w-4 h-4" /> Tambah Mitra Baru
                    </button>
                    <button
                      type="button"
                      onClick={handleImportFromRealMitras}
                      className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                      title="Impor mitra terdaftar (APPROVED) dari database ke Tracker"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                      Sync Mitra Real ({realMitras.length})
                    </button>
                    {trackers.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleClearAllTrackers}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                        title="Kosongkan seluruh data tracker saat ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Bersihkan Tracker
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={seedInitialData}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5 animate-pulse"
                        title="Isi database dengan data contoh untuk keperluan demo"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Load Data Demo (Contoh)
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={handleExportExcel}
                  className="bg-emerald-600 text-white font-black text-xs px-3 py-2.5 rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2"
                  title="Export to Excel Spreadsheet"
                >
                  <Download className="w-4 h-4" /> Export Excel
                </button>
                <button
                  onClick={handleExportPdf}
                  className="bg-rose-600 text-white font-black text-xs px-3 py-2.5 rounded-xl hover:bg-rose-700 transition-all flex items-center gap-1"
                  title="Export to PDF Format"
                >
                  <Printer className="w-4 h-4" /> PDF
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-50">
              
              <div className="space-y-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pilih Paket</span>
                <select 
                  className="w-full bg-gray-50 border border-gray-200 p-2 text-xs font-black rounded"
                  value={filterPaket}
                  onChange={(e) => setFilterPaket(e.target.value)}
                >
                  {uniquePakets.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Risiko</span>
                <select 
                  className="w-full bg-gray-50 border border-gray-200 p-2 text-xs font-black rounded"
                  value={filterRisiko}
                  onChange={(e) => setFilterRisiko(e.target.value)}
                >
                  <option value="ALL">ALL RISKS</option>
                  <option value="AMAN">AMAN</option>
                  <option value="WASPADA">WASPADA</option>
                  <option value="RISIKO TINGGI">RISIKO TINGGI</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Pembayaran</span>
                <select 
                  className="w-full bg-gray-50 border border-gray-200 p-2 text-xs font-black rounded"
                  value={filterPembayaran}
                  onChange={(e) => setFilterPembayaran(e.target.value)}
                >
                  <option value="ALL">ALL STATUS</option>
                  <option value="LUNAS">LUNAS</option>
                  <option value="DP">DP</option>
                  <option value="BELUM LUNAS">BELUM LUNAS</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PIC Finance</span>
                <select 
                  className="w-full bg-gray-50 border border-gray-200 p-2 text-xs font-black rounded"
                  value={filterPic}
                  onChange={(e) => setFilterPic(e.target.value)}
                >
                  {uniquePics.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

            </div>
          </div>

          {/* Clean Interactive Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 font-black text-gray-400 uppercase tracking-wider text-[10px]">
                    <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('nama_mitra')}>
                      <div className="flex items-center gap-1">NAMA PEMILIK MITRA <ArrowUpDown className="w-3.5 h-3.5" /></div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => requestSort('nama_brand')}>
                      <div className="flex items-center gap-1">MITRA WIBAWA <ArrowUpDown className="w-3.5 h-3.5" /></div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100 text-center" onClick={() => requestSort('jumlah_seat')}>
                      <div className="flex items-center justify-center gap-1">SEAT <ArrowUpDown className="w-3.5 h-3.5" /></div>
                    </th>
                    <th className="p-4">PAKET & TANGGAL</th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100 text-right" onClick={() => requestSort('total_tagihan')}>
                      <div className="flex items-center justify-end gap-1">TOTAL TAGIHAN <ArrowUpDown className="w-3.5 h-3.5" /></div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100 text-right" onClick={() => requestSort('total_bayar')}>
                      <div className="flex items-center justify-end gap-1">TOTAL TERBAYAR <ArrowUpDown className="w-3.5 h-3.5" /></div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100 text-right" onClick={() => requestSort('sisa_tagihan')}>
                      <div className="flex items-center justify-end gap-1">SISA PIUTANG <ArrowUpDown className="w-3.5 h-3.5" /></div>
                    </th>
                    <th className="p-4 text-center">% PIUTANG</th>
                    <th className="p-4">DEADLINE</th>
                    <th className="p-4 text-center">RISIKO</th>
                    {currentUserRole !== 'owner' && <th className="p-4 text-right">AKSI</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {Object.keys(groupedTrackers)
                    .sort((a, b) => {
                      const itemA = groupedTrackers[a][0];
                      const itemB = groupedTrackers[b][0];
                      const daysA = itemA?.hari_menuju_berangkat ?? 9999;
                      const daysB = itemB?.hari_menuju_berangkat ?? 9999;
                      if (daysA >= 0 && daysB >= 0) {
                        return daysA - daysB;
                      }
                      if (daysA < 0 && daysB < 0) {
                        return daysB - daysA;
                      }
                      return daysA >= 0 ? -1 : 1;
                    })
                    .map(paketName => {
                      const groupItems = groupedTrackers[paketName];
                    const firstItem = groupItems[0];

                    // Calculate sub-totals for this package group
                    const sumSeat = groupItems.reduce((acc, curr) => acc + (curr.jumlah_seat || 0), 0);
                    const sumTagihan = groupItems.reduce((acc, curr) => acc + (curr.total_tagihan || 0), 0);
                    const sumTerbayar = groupItems.reduce((acc, curr) => acc + (curr.total_bayar || 0), 0);
                    const sumSisa = groupItems.reduce((acc, curr) => acc + (curr.sisa_tagihan || 0), 0);
                    const calculatedPercent = sumTagihan > 0 ? (sumSisa / sumTagihan) * 100 : 0;

                    return (
                      <React.Fragment key={paketName}>
                        {/* Package Group Divider Row */}
                        <tr className="bg-emerald-600 text-white font-black text-xs border-y border-emerald-700 select-none">
                          <td colSpan={currentUserRole !== 'owner' ? 11 : 10} className="p-3 bg-emerald-600 text-center uppercase tracking-widest font-black text-xs shadow-inner">
                            🟢 {paketName} • KEBERANGKATAN: {firstItem?.tanggal_berangkat || '-'} ({firstItem?.hari_menuju_berangkat != null ? `${firstItem.hari_menuju_berangkat} Hari Lagi` : ''})
                          </td>
                        </tr>

                        {/* Grouped Records */}
                        {groupItems.map(tr => {
                          const warn = getWarningState(tr.hari_menuju_berangkat, tr.persentase_bayar, tr.sisa_tagihan);
                          return (
                            <React.Fragment key={tr.id}>
                              <tr className={`hover:bg-gray-50/80 transition-all ${warn?.level === 'CRITICAL' ? 'bg-rose-50/10' : ''} ${expandedMitraIds[tr.id] ? 'bg-slate-50/90 font-medium' : ''}`}>
                                <td className="p-4 font-bold text-gray-900">
                                  <div className="leading-tight text-gray-900">{tr.nama_mitra || '-'}</div>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedMitraIds(prev => ({ ...prev, [tr.id]: !prev[tr.id] }))}
                                    className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all shadow-2xs hover:scale-105 active:scale-95 ${
                                      expandedMitraIds[tr.id]
                                        ? "bg-amber-600 text-white hover:bg-amber-700" 
                                        : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
                                    }`}
                                  >
                                    {expandedMitraIds[tr.id] ? "▲ Tutup Milestones" : "▼ Cek Milestones a-d"}
                                  </button>
                                </td>
                                <td className="p-4">
                                  <p className="font-extrabold text-indigo-700 text-xs sm:text-sm">{tr.nama_brand || tr.nama_mitra}</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">{tr.pic} • {tr.hp} • {tr.kota}</p>
                                </td>
                                <td className="p-4 text-center text-sm font-black text-gray-900 bg-gray-50/30">
                                  {tr.jumlah_seat}
                                </td>
                                <td className="p-4">
                                  <p className="font-bold text-gray-800">{tr.paket_umroh}</p>
                                  <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-0.5">
                                    <Calendar className="w-3 h-3" />
                                    {tr.tanggal_berangkat} ({tr.hari_menuju_berangkat} Hari Lagi)
                                  </p>
                                </td>
                                <td className="p-4 text-right font-black text-gray-800">
                                  {formatCurrency(tr.total_tagihan)}
                                </td>
                                <td className="p-4 text-right">
                                  <p className="font-black text-emerald-600">{formatCurrency(tr.total_bayar)}</p>
                                  <p className="text-[10px] text-gray-400 font-semibold">DP: {formatCurrency(tr.dp)}</p>
                                </td>
                                <td className="p-4 text-right">
                                  <p className="font-black text-rose-600">{formatCurrency(tr.sisa_tagihan)}</p>
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-black ${tr.persentase_bayar <= 20 ? 'bg-emerald-100 text-emerald-800' : (tr.persentase_bayar <= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-rose-100 text-rose-800')}`}>
                                    {tr.persentase_bayar?.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="p-4">
                                  <p className="font-bold text-gray-700">{tr.deadline_pelunasan}</p>
                                  {warn && <p className="text-[9px] font-black text-rose-600 bg-rose-50/60 p-1 rounded mt-1">{warn.level} ALERT</p>}
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`px-3 py-1 font-black text-[10px] rounded-full text-white inline-block w-28 uppercase ${tr.status_risiko === 'AMAN' ? 'bg-emerald-500' : (tr.status_risiko === 'WASPADA' ? 'bg-yellow-500' : 'bg-red-500')}`}>
                                    {tr.status_risiko}
                                  </span>
                                </td>
                                {currentUserRole !== 'owner' && (
                                  <td className="p-4 text-right">
                                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => { setSelectedMitraId(tr.id); setIsPaymentModalOpen(true); }}
                                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition-all"
                                      >
                                        + Cicilan
                                      </button>
                                      <button
                                        onClick={() => { setSelectedMitraId(tr.id); setIsFollowupModalOpen(true); }}
                                        className="bg-amber-100 hover:bg-amber-200 text-amber-700 font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition-all"
                                      >
                                        Follow Up
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenWhatsApp(tr)}
                                        className="bg-green-600 hover:bg-green-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 active:scale-95"
                                        title="Kirim status rincian tagihan via WhatsApp ke Mitra"
                                      >
                                        💬 WA Share
                                      </button>
                                      {(currentUserRole === 'admin' || currentUserRole === 'finance') && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditModal(tr)}
                                            className="text-gray-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 transition-all duration-200 active:scale-90"
                                            title="Edit Data Mitra"
                                          >
                                            <Pencil className="w-4 h-4 cursor-pointer" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteTracker(tr.id)}
                                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all duration-200 active:scale-90"
                                            title="Hapus Tracker"
                                          >
                                            <Trash2 className="w-4 h-4 cursor-pointer" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                )}
                              </tr>

                              {/* Collapsible PT NAWAITUL UMRAH HAJI Payment Milestone Check Details */}
                              {expandedMitraIds[tr.id] && (
                                <tr className="bg-slate-50 border-l-4 border-amber-500 animate-in fade-in duration-200 select-none">
                                  <td colSpan={currentUserRole !== 'owner' ? 11 : 10} className="p-4">
                                    <div className="bg-white rounded-2xl p-5 border border-slate-205 shadow-xs space-y-4 font-sans text-xs">
                                      
                                      {/* Banner Ketentuan */}
                                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gray-100">
                                        <div className="text-left font-sans">
                                          <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-tight">
                                            📋 KEPATUHAN TAHAPAN MILISTONE PEMBAYARAN - PT NAWAITUL UMRAH HAJI
                                          </h4>
                                          <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider">
                                            Skema Evaluasi Seat: {tr.jumlah_seat} pax • Nilai Jual Kontrak: {formatCurrency(tr.total_tagihan)}
                                          </p>
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                          {tr.nama_brand}
                                        </span>
                                      </div>

                                      {/* 4 Steps Grid */}
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        
                                        {/* STEP A */}
                                        {(() => {
                                          const dpReq = tr.jumlah_seat * 5000000;
                                          const dpPaid = Math.min(tr.total_bayar, dpReq);
                                          const dpPct = dpReq > 0 ? (dpPaid / dpReq) * 100 : 0;
                                          const dpMet = tr.total_bayar >= dpReq;
                                          
                                          return (
                                            <div className={`p-4 rounded-xl border transition-all text-left ${dpMet ? 'bg-emerald-50/40 border-emerald-200 shadow-xs' : 'bg-amber-50/30 border-amber-205'}`}>
                                              <div className="flex justify-between items-start gap-1 pb-2">
                                                <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">a. Uang Muka (DP)</span>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${dpMet ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                  {dpMet ? "✓ TERPENUHI" : "DIALOKASIKAN"}
                                                </span>
                                              </div>
                                              <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                                                Rp 5.000.000 / Jamaah wajib disetor saat pendataan awal.
                                              </p>
                                              <div className="pt-2 mt-2 border-t border-dashed border-gray-200/50 space-y-1">
                                                <div className="flex justify-between text-[10px] font-black">
                                                  <span className="text-gray-400 font-bold">Target DP:</span>
                                                  <span className="text-slate-900">{formatCurrency(dpReq)}</span>
                                                </div>
                                                <div className="flex justify-between text-[10px] font-black">
                                                  <span className="text-gray-400 font-bold">Terbayar:</span>
                                                  <span className={dpMet ? "text-emerald-700 font-extrabold" : "text-amber-700 font-extrabold"}>{formatCurrency(dpPaid)}</span>
                                                </div>
                                                {/* Progress Bar */}
                                                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden mt-1.5">
                                                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${dpPct}%` }}></div>
                                                </div>
                                                <div className="flex justify-between text-[9px] font-bold pt-1 border-t border-gray-100 mt-1">
                                                  <span className="text-slate-500 font-bold">Jatuh Tempo H-90:</span>
                                                  <span className="text-amber-800 bg-amber-50 px-1 rounded font-black">{calculateDeadlineH90(tr.tanggal_berangkat) || '-'}</span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })()}

                                        {/* STEP B & C (AUTO-MERGED IF H-60 PASSED & UNPAID) */}
                                        {(() => {
                                          const dpReq = tr.jumlah_seat * 5000000;
                                          const remainingSisa = Math.max(0, tr.total_tagihan - dpReq);
                                          const t2Req = remainingSisa * 0.30;
                                          const t3Req = remainingSisa * 0.30;

                                          const isTermin1PassedAndUnpaid = (tr.hari_menuju_berangkat != null && tr.hari_menuju_berangkat <= 60) && (tr.total_bayar < dpReq + t2Req);

                                          if (isTermin1PassedAndUnpaid) {
                                            const mergedReq = t2Req + t3Req;
                                            const mergedPaid = Math.min(Math.max(0, tr.total_bayar - dpReq), mergedReq);
                                            const mergedPct = mergedReq > 0 ? (mergedPaid / mergedReq) * 100 : 0;
                                            const mergedMet = tr.total_bayar >= dpReq + mergedReq;

                                            return (
                                              <div className="col-span-1 md:col-span-2 p-4 rounded-xl border transition-all text-left bg-rose-50/25 border-rose-300 shadow-sm">
                                                <div className="flex justify-between items-start gap-1 pb-2">
                                                  <span className="text-[11px] font-black text-rose-800 uppercase tracking-wider">b & c. Angsuran 2 & 3 (DIGABUNG)</span>
                                                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 animate-pulse">
                                                    MELEWATI JATUH TEMPO
                                                  </span>
                                                </div>
                                                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                                                  Angsuran Ke-2 & Ke-3 otomatis digabungkan karena batas waktu Pembayaran Ke-2 (Termin 1) terlewati tanpa pembayaran memadai.
                                                </p>
                                                <div className="pt-2 mt-2 border-t border-dashed border-gray-200/50 space-y-1">
                                                  <div className="flex justify-between text-[10px] font-black">
                                                    <span className="text-gray-400 font-bold">Target Gabungan (60%):</span>
                                                    <span className="text-slate-900">{formatCurrency(mergedReq)}</span>
                                                  </div>
                                                  <div className="flex justify-between text-[10px] font-black">
                                                    <span className="text-gray-400 font-bold">Terbayar:</span>
                                                    <span className={mergedMet ? "text-emerald-700 font-extrabold" : "text-rose-700 font-extrabold"}>{formatCurrency(mergedPaid)}</span>
                                                  </div>
                                                  {/* Progress Bar */}
                                                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden mt-1.5">
                                                    <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${mergedPct}%` }}></div>
                                                  </div>
                                                  <div className="flex justify-between text-[9px] font-bold pt-1 border-t border-gray-100 mt-1">
                                                    <span className="text-rose-600 font-black">Batas Jatuh Tempo Ke-2:</span>
                                                    <span className="text-rose-800 bg-rose-50 px-1 rounded font-black">{calculateDeadlineH60(tr.tanggal_berangkat) || '-'}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }

                                          // Render separated otherwise
                                          const t2Paid = Math.min(Math.max(0, tr.total_bayar - dpReq), t2Req);
                                          const t2Pct = t2Req > 0 ? (t2Paid / t2Req) * 100 : 0;
                                          const t2Met = tr.total_bayar >= dpReq + t2Req;

                                          const t3Paid = Math.min(Math.max(0, tr.total_bayar - dpReq - t2Req), t3Req);
                                          const t3Pct = t3Req > 0 ? (t3Paid / t3Req) * 100 : 0;
                                          const t3Met = tr.total_bayar >= dpReq + t2Req + t3Req;

                                          return (
                                            <>
                                              {/* STEP B */}
                                              <div className={`p-4 rounded-xl border transition-all text-left ${t2Met ? 'bg-emerald-50/40 border-emerald-200 shadow-xs' : 'bg-slate-50 border-gray-200'}`}>
                                                <div className="flex justify-between items-start gap-1 pb-2">
                                                  <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">b. Angsuran Ke-2</span>
                                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${t2Met ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}>
                                                    {t2Met ? "✓ TERPENUHI" : `${Math.round(t2Pct)}%`}
                                                  </span>
                                                </div>
                                                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                                                  Angsuran 30% dari sisa tagihan kontrak sesudah dikurangi DP.
                                                </p>
                                                <div className="pt-2 mt-2 border-t border-dashed border-gray-200/50 space-y-1">
                                                  <div className="flex justify-between text-[10px] font-black">
                                                    <span className="text-gray-400 font-bold">Target 30%:</span>
                                                    <span className="text-slate-900">{formatCurrency(t2Req)}</span>
                                                  </div>
                                                  <div className="flex justify-between text-[10px] font-black">
                                                    <span className="text-gray-400 font-bold">Terbayar:</span>
                                                    <span className={t2Met ? "text-emerald-700 font-extrabold" : "text-slate-700 font-extrabold"}>{formatCurrency(t2Paid)}</span>
                                                  </div>
                                                  {/* Progress Bar */}
                                                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden mt-1.5">
                                                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${t2Pct}%` }}></div>
                                                  </div>
                                                  <div className="flex justify-between text-[9px] font-bold pt-1 border-t border-gray-100 mt-1">
                                                    <span className="text-slate-500 font-black">Batas Jatuh Tempo:</span>
                                                    <span className="text-amber-800 bg-amber-50 px-1 rounded font-black">{calculateDeadlineH60(tr.tanggal_berangkat) || '-'}</span>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* STEP C */}
                                              <div className={`p-4 rounded-xl border transition-all text-left ${t3Met ? 'bg-emerald-50/40 border-emerald-200 shadow-xs' : 'bg-slate-50 border-gray-200'}`}>
                                                <div className="flex justify-between items-start gap-1 pb-2">
                                                  <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">c. Angsuran Ke-3</span>
                                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${t3Met ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}>
                                                    {t3Met ? "✓ TERPENUHI" : `${Math.round(t3Pct)}%`}
                                                  </span>
                                                </div>
                                                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                                                  Angsuran ke-3 sebesar 30% dari sisa tagihan sisa kontrak.
                                                </p>
                                                <div className="pt-2 mt-2 border-t border-dashed border-gray-200/50 space-y-1">
                                                  <div className="flex justify-between text-[10px] font-black">
                                                    <span className="text-gray-400 font-bold">Target 30%:</span>
                                                    <span className="text-slate-900">{formatCurrency(t3Req)}</span>
                                                  </div>
                                                  <div className="flex justify-between text-[10px] font-black">
                                                    <span className="text-gray-400 font-bold">Terbayar:</span>
                                                    <span className={t3Met ? "text-emerald-700 font-extrabold" : "text-slate-700 font-extrabold"}>{formatCurrency(t3Paid)}</span>
                                                  </div>
                                                  {/* Progress Bar */}
                                                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden mt-1.5">
                                                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${t3Pct}%` }}></div>
                                                  </div>
                                                  <div className="flex justify-between text-[9px] font-bold pt-1 border-t border-gray-100 mt-1">
                                                    <span className="text-slate-500 font-black">Batas Jatuh Tempo:</span>
                                                    <span className="text-amber-800 bg-amber-50 px-1 rounded font-black">{calculateDeadlineH50(tr.tanggal_berangkat) || '-'}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            </>
                                          );
                                        })()}

                                        {/* STEP D (PELUNASAN AKHIR H-45) */}
                                        {(() => {
                                          const dpReq = tr.jumlah_seat * 5000000;
                                          const remainingSisa = Math.max(0, tr.total_tagihan - dpReq);
                                          const t2Req = remainingSisa * 0.30;
                                          const t3Req = remainingSisa * 0.30;
                                          const pelReq = tr.total_tagihan - dpReq - t2Req - t3Req;
                                          const pelPaid = Math.max(0, tr.total_bayar - dpReq - t2Req - t3Req);
                                          const pelMet = tr.total_bayar >= tr.total_tagihan;

                                          const dLimit = calculateDeadlineH45(tr.tanggal_berangkat);
                                          const dToD = tr.hari_menuju_berangkat - 45;

                                          let badgeBg = "bg-gray-100 text-gray-700";
                                          if (pelMet) {
                                            badgeBg = "bg-emerald-100 text-emerald-800 font-black";
                                          } else if (dToD <= 0) {
                                            badgeBg = "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse font-black";
                                          } else if (dToD <= 15) {
                                            badgeBg = "bg-amber-100 text-amber-800 border border-amber-250 font-black";
                                          }

                                          return (
                                            <div className={`p-4 rounded-xl border transition-all text-left ${pelMet ? 'bg-emerald-50/40 border-emerald-200 shadow-xs' : (dToD <= 0 ? 'bg-rose-50/40 border-rose-200' : 'bg-gray-50 border-gray-200')}`}>
                                              <div className="flex justify-between items-start gap-1 pb-2">
                                                <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">d. Pelunasan H-45</span>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${badgeBg}`}>
                                                  {pelMet ? "✓ LUNAS" : (dToD <= 0 ? "❗️ MELEWATI H-45" : "TENOR H-45")}
                                                </span>
                                              </div>
                                              <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                                                Wajib lunas 100% paling lambat <span className="text-slate-900 font-black">H-45 keberangkatan</span>.
                                              </p>
                                              <div className="pt-2 mt-2 border-t border-dashed border-gray-200/50 space-y-1">
                                                <div className="flex justify-between text-[10px] font-black">
                                                  <span className="text-gray-400 font-bold">Target Akhir:</span>
                                                  <span className="text-slate-900">{formatCurrency(pelReq)}</span>
                                                </div>
                                                <div className="flex justify-between text-[10px] font-black">
                                                  <span className="text-gray-400 font-bold">Terbayar:</span>
                                                  <span className={pelMet ? "text-emerald-700 font-extrabold" : (dToD <= 0 ? "text-rose-700 font-extrabold" : "text-slate-700 font-extrabold")}>{formatCurrency(pelPaid)}</span>
                                                </div>
                                                <div className="flex justify-between text-[9px] font-bold pt-1 border-t border-gray-100 mt-1">
                                                  <span className="text-slate-500 font-black">Batas H-45:</span>
                                                  <span className="text-amber-800 bg-amber-50 px-1 rounded font-black">{dLimit || '-'}</span>
                                                </div>
                                                {!pelMet && (
                                                  <div className="text-[9px] text-right font-black mt-1">
                                                    {dToD > 0 ? (
                                                      <span className="text-amber-600">Sisa {dToD} Hari lagi Menuju H-45</span>
                                                    ) : (
                                                      <span className="text-rose-600 font-bold animate-pulse">LATE H-45 (Lewat {Math.abs(dToD)} hari)</span>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })()}

                                      </div>

                                      {/* Dynamic Compliance Summary */}
                                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-205 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black uppercase">STATUS AUDIT</span>
                                          {(() => {
                                            const dpReq = tr.jumlah_seat * 5000000;
                                            const remainingSisa = Math.max(0, tr.total_tagihan - dpReq);
                                            const t2Req = remainingSisa * 0.30;
                                            const t3Req = remainingSisa * 0.30;
                                            const pelMet = tr.total_bayar >= tr.total_tagihan;
                                            const dToD = tr.hari_menuju_berangkat - 45;

                                            if (pelMet) {
                                              return (
                                                <span className="text-emerald-700 font-black">
                                                  🟢 Keuangan Aman. Seluruh tahapan pembayaran telah diselesaikan (100% Lunas).
                                                </span>
                                              );
                                            }
                                            if (tr.total_bayar < dpReq) {
                                              return (
                                                <span className="text-amber-700 font-black">
                                                  ⚠️ Defisit Uang Muka. Dana masuk belum menutup minimal Rp 5.000.000 / seat. Hubungi PIC {tr.pic}.
                                                </span>
                                              );
                                            }
                                            if (dToD <= 0) {
                                              return (
                                                <span className="text-rose-700 font-black flex items-center gap-1 animate-pulse">
                                                  🔴 KRITIS! Melewati batas waktu pelunasan akhir H-45. Tiket dan akomodasi terancam freeze otomatis.
                                                </span>
                                              );
                                            }
                                            if (tr.total_bayar >= dpReq + t2Req + t3Req) {
                                              return (
                                                <span className="text-emerald-700 font-black">
                                                  🔵 Memasuki Tahap Pelunasan Akhir (H-45). Tersisa {dToD} hari lagi untuk merampungkan pelunasan.
                                                </span>
                                              );
                                            }
                                            return (
                                              <span className="text-slate-700 font-black">
                                                🟡 Berjalan sesuai jadwal. Sedang menyelesaikan sisa pembayaran angsuran.
                                              </span>
                                            );
                                          })()}
                                        </div>

                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenWhatsApp(tr)}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg transition-all"
                                          >
                                            Kirim Tagihan Rinci via WhatsApp
                                          </button>
                                        </div>
                                      </div>

                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}

                        {/* Sub-total summary row for this package group */}
                        <tr className="bg-emerald-50/70 border-b-2 border-emerald-200 text-xs font-bold text-gray-900 select-none">
                          <td colSpan={2} className="p-4 font-black text-emerald-950 uppercase tracking-wide">
                            TOTAL {paketName}
                          </td>
                          <td className="p-4 text-center font-black text-sm bg-emerald-100/30 text-emerald-950">
                            {sumSeat}
                          </td>
                          <td className="p-4 text-gray-500 text-[10px] font-extrabold">
                            {groupItems.length} Mitra Terdaftar
                          </td>
                          <td className="p-4 text-right font-black text-gray-900">
                            {formatCurrency(sumTagihan)}
                          </td>
                          <td className="p-4 text-right font-black text-emerald-700 bg-emerald-100/10">
                            {formatCurrency(sumTerbayar)}
                          </td>
                          <td className="p-4 text-right font-black text-rose-700">
                            {formatCurrency(sumSisa)}
                          </td>
                          <td className="p-4 text-center font-black text-xs">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${calculatedPercent <= 20 ? 'bg-emerald-100 text-emerald-800' : (calculatedPercent <= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-rose-100 text-rose-800')}`}>
                              {calculatedPercent.toFixed(1)}%
                            </span>
                          </td>
                          <td colSpan={currentUserRole !== 'owner' ? 3 : 2} className="p-4 text-gray-400 text-[10px] font-black uppercase text-center bg-gray-50/20">
                            REKAP HARGA JUAL & DANA JAMAAH
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                  {filteredAndSortedTrackers.length === 0 && (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-gray-400">Tidak ada data mitra ditemukan.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 3. EXPERT ANALISIS RISIKO SUBTAB */}
      {activeSubTab === 'risiko' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-amber-900 text-sm uppercase">Pemberitahuan & Aturan Risiko Otomatis</h4>
              <p className="text-xs text-amber-800 leading-relaxed mt-1">
                Sistem menghitung status risiko secara cerdas. <strong>Kuning (WASPADA)</strong> ditrigger untuk rentang pembayaran 50% - 79% dan 
                <strong> Merah (RISIKO TINGGI)</strong> jika pembayaran di bawah 50%. Evaluasi H-Minus keberangkatan juga memicu Critical Warning untuk menekan risiko kerugian tiket.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {calculatedTrackers.map(t => {
              const warn = getWarningState(t.hari_menuju_berangkat, t.persentase_bayar, t.sisa_tagihan);
              return (
                <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase text-white ${t.status_risiko === 'AMAN' ? 'bg-emerald-500' : (t.status_risiko === 'WASPADA' ? 'bg-yellow-500' : 'bg-red-500')}`}>
                        {t.status_risiko}
                      </span>
                      <span className="text-xs font-bold text-gray-400">Seat: {t.jumlah_seat}</span>
                    </div>

                    <h3 className="font-black text-gray-900 text-sm sm:text-base mt-4">{t.nama_brand}</h3>
                    <p className="text-xs text-gray-400">{t.nama_mitra}</p>

                    <div className="space-y-2 mt-4 pt-4 border-t border-gray-50 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Lunas (%)</span>
                        <span className="font-extrabold text-gray-800">{t.persentase_bayar?.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Uang Diterima</span>
                        <span className="font-extrabold text-gray-800">{formatCurrency(t.total_bayar)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Kekurangan (Sisa)</span>
                        <span className="font-black text-rose-600">{formatCurrency(t.sisa_tagihan)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Pemberangkatan</span>
                        <span className="font-bold text-amber-600">{t.tanggal_berangkat} ({t.hari_menuju_berangkat} H-Minus)</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-50">
                    {warn ? (
                      <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-[11px] text-rose-700 flex gap-2">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <div>
                          <strong className="block uppercase text-rose-900">WARNING ALERT:</strong>
                          {warn.text}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg text-xs font-bold text-center">
                        ✔ Pembayaran Aman & Sesuai Progress
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. TRACKER TIMELINE FOLLOW UP FINANCE SUBTAB */}
      {activeSubTab === 'followup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
          
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-600" /> Registrasi Follow Up Finance
            </h3>
            <p className="text-xs text-gray-400 font-medium">Rekam janji bayar dan hasil log penagihan finance kepada perwakilan kantor mitra cabang</p>

            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-black tracking-wider text-gray-400 block uppercase">Pilih Mitra</span>
              <select 
                className="w-full bg-gray-50 border border-gray-200 p-3 text-xs font-black rounded-lg"
                value={selectedMitraId}
                onChange={(e) => setSelectedMitraId(e.target.value)}
              >
                <option value="">-- Pilih Mitra --</option>
                {trackers.map(t => <option key={t.id} value={t.id}>{t.nama_brand} ({t.pic})</option>)}
              </select>
            </div>

            <button
              disabled={!selectedMitraId}
              onClick={() => setIsFollowupModalOpen(true)}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-150 text-white font-black text-xs py-3 rounded-xl transition-all"
            >
              Terbitkan Log Follow Up
            </button>
          </div>

          {/* Chronological Vertical Timeline Log Section */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-500" />
              Timeline Audit & Korespondensi Finance
            </h3>

            <div className="relative border-l border-gray-200 ml-4 py-2 space-y-6">
              {followups.map(item => {
                const partner = trackers.find(t => t.id === item.mitra_id);
                return (
                  <div key={item.id} className="relative pl-6 animate-fade-in">
                    {/* Ring timeline indicator node */}
                    <div className="absolute -left-[6px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-white"></div>
                    
                    <div className="bg-gray-50/75 rounded-xl p-4 border border-gray-200/50 space-y-2">
                      <div className="flex justify-between items-start text-xs text-gray-500">
                        <span className="font-black text-gray-900">{partner?.nama_brand || 'Mitra'}</span>
                        <span>{item.tanggal_followup}</span>
                      </div>
                      
                      <p className="text-xs sm:text-sm font-semibold text-gray-700 leading-relaxed bg-white p-2.5 rounded border border-gray-100 shadow-3xs">
                        {item.hasil_followup}
                      </p>

                      {item.nominal_janji > 0 && (
                        <div className="flex gap-2 text-[10px] bg-amber-50 p-2 rounded">
                          <span className="font-extrabold text-amber-900 uppercase">Janji Bayar:</span>
                          <span className="font-black text-amber-950">{formatCurrency(item.nominal_janji)} ({item.janji_bayar})</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold pt-1 border-t border-gray-50">
                        <span>PIC Finance: {item.pic_finance}</span>
                        <span className="bg-gray-150 rounded px-2 py-0.5">{item.status_followup}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {followups.length === 0 && (
                <div className="p-12 text-center text-gray-400 font-medium">Belum ada timeline logs tersimpan.</div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* 5. MONITORING SEAT SUBTAB */}
      {activeSubTab === 'seat' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md space-y-8 animate-in fade-in duration-300">
          <div>
            <h3 className="font-black text-gray-900 text-lg uppercase flex items-center gap-2">
              <Users className="w-6 h-6 text-amber-500" /> Cockpit Monitoring Kapasitas Kursi (Seat)
            </h3>
            <p className="text-xs text-gray-400">Pastikan kapasitas manifest bersih dan monitor potensi pembatalan dikarenakan krisis piutang</p>
          </div>

          {/* Seat Progress visual meters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {calculatedTrackers.map(t => {
              const countNew = t.status_risiko === 'RISIKO TINGGI';
              return (
                <div key={t.id} className="border border-gray-100 rounded-xl p-5 space-y-4 shadow-3xs hover:shadow-2xs transition-all">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <div>
                      <h4 className="font-black text-gray-900 text-sm tracking-tight">{t.nama_brand}</h4>
                      <p className="text-[10px] text-gray-400">{t.pic}</p>
                    </div>
                    <span className={`text-[10px] font-black rounded px-2 py-1 ${countNew ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {countNew ? 'RISIKO SEAT' : 'SEAT AMAN'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wide font-black text-gray-400">Total Seat Yang Diblocking:</span>
                    <div className="flex items-center gap-3">
                      <div className="flex-grow bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div className="bg-amber-500 h-4 rounded-full" style={{ width: `${(t.jumlah_seat / 100) * 100}%` }}></div>
                      </div>
                      <span className="text-sm font-black text-gray-800">{t.jumlah_seat} Seat</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-[11px] pt-1">
                    <div className="bg-amber-50 p-2 rounded">
                      <span className="text-gray-400 block font-bold">Terisi (Confirmed)</span>
                      <strong className="text-xs text-amber-950 font-black">{Math.floor(t.jumlah_seat * (t.persentase_bayar / 100))} Seat</strong>
                    </div>
                    <div className="bg-rose-50 p-2 rounded">
                      <span className="text-gray-400 block font-bold">Risiko Gagal (Unpaid)</span>
                      <strong className="text-xs text-rose-800 font-black">{t.jumlah_seat - Math.floor(t.jumlah_seat * (t.persentase_bayar / 100))} Seat</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. PAYMENTS LEDGER AUDIT HISTORY */}
      {activeSubTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md space-y-6 animate-in fade-in duration-300">
          <div>
            <h3 className="font-black text-gray-900 text-lg uppercase flex items-center gap-2">
              <FileText className="w-6 h-6 text-amber-500" />
              Audit Trail & Riwayat Pembayaran Finansial
            </h3>
            <p className="text-xs text-gray-400">Informasi log penerimaan tagihan cicilan, DP, maupun pelunasan final mitra travel cabang secara berjenjang</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-left text-xs text-gray-700">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase text-gray-400">
                  <th className="p-4">Tanggal Pembayaran</th>
                  <th className="p-4">Nama Mitra</th>
                  <th className="p-4">Jenis Alokasi</th>
                  <th className="p-4 text-right">Nominal Angsuran</th>
                  <th className="p-4">Grup Bank / Metode</th>
                  <th className="p-4">Bukti Transaksi</th>
                  <th className="p-4">Catatan Operasional</th>
                  <th className="p-4">PIC Finance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {payments.map(log => {
                  const mitra = trackers.find(t => t.id === log.mitra_id);
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/80 transition-all">
                      <td className="p-4 font-bold text-gray-900">{log.tanggal_bayar}</td>
                      <td className="p-4">
                        <p className="font-extrabold text-gray-900">{mitra?.nama_brand || 'Mitra'}</p>
                        <p className="text-[10px] text-gray-400">{mitra?.pic}</p>
                      </td>
                      <td className="p-4">
                        <span className="bg-blue-100 text-blue-900 font-black text-[10px] rounded px-2 py-0.5">
                          {log.jenis_pembayaran}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-gray-900">{formatCurrency(log.nominal)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Landmark className="w-3.5 h-3.5 text-gray-400" />
                          <span>{log.bank} ({log.metode})</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {log.bukti_transfer ? (
                          <a 
                            href={log.bukti_transfer} 
                            target="_blank" 
                            rel="referrer noopener"
                            className="text-amber-600 hover:text-amber-850 underline text-[11px] font-black"
                          >
                            Buka Bukti Transfer
                          </a>
                        ) : (
                          <span className="text-gray-400 font-bold italic">Tidak Ada Upload</span>
                        )}
                      </td>
                      <td className="p-4 max-w-xs truncate text-gray-500" title={log.catatan}>{log.catatan || '-'}</td>
                      <td className="p-4 font-extrabold text-gray-700">{log.created_by}</td>
                    </tr>
                  );
                })}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-gray-400">Belum ada riwayat pembayaran terekam.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ==============================================
          MODALS & RECORD ENTRY DIALOGS 
          ============================================== */}

      {/* 1. Modal: Register New Mitra */}
      {isNewMitraModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h2 className="text-base sm:text-lg font-black text-gray-900 uppercase">Input Registrasi Mitra Baru</h2>
              <button 
                onClick={() => setIsNewMitraModalOpen(false)}
                className="p-1.5 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full"
              >
                ✖
              </button>
            </div>

            <form onSubmit={handleCreateMitra} className="space-y-3 block text-xs">
              
              {/* Dropdown: Pilih dari Database Mitra Valid APPROVED */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 space-y-1.5 mb-2">
                <label className="font-extrabold text-amber-900 flex justify-between items-center text-[10px] tracking-wider uppercase">
                  <span>Pilih dari Database Mitra Terdaftar (Real)</span>
                  <span className="text-amber-700 bg-amber-100 font-black rounded-full px-2 py-0.5 text-[9px]">
                    {realMitras.length} TERDAFTAR
                  </span>
                </label>
                <select
                  value={selectedRealMitraId || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedRealMitraId(val);
                    if (val) {
                      const selected = realMitras.find(m => m.id === val);
                      if (selected) {
                        setFormDataMitra(prev => ({
                          ...prev,
                          nama_mitra: selected.nama || '',
                          nama_brand: selected.brandName || '',
                          pic: selected.nama || '',
                          hp: selected.phone || '',
                          kota: selected.kota || '',
                          paket_umroh: selected.paketNama || 'Paket Umroh Reguler 2026',
                          total_tagihan: selected.paketHarga || 0,
                        }));
                      }
                    } else {
                      // Reset for manual typing
                      setFormDataMitra({
                        nama_mitra: '',
                        nama_brand: '',
                        pic: '',
                        hp: '',
                        kota: '',
                        jumlah_seat: 45,
                        paket_umroh: 'Paket Umroh Reguler 2026',
                        tanggal_berangkat: '',
                        total_tagihan: 0,
                        deadline_pelunasan: '',
                        pic_finance: 'Andika Finance',
                        status_keberangkatan: 'Aman'
                      });
                    }
                  }}
                  className="w-full bg-white border border-amber-300 p-2 rounded-lg font-black text-xs text-amber-950 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                >
                  <option value="">-- Buat Baru / Ketik Manual --</option>
                  {realMitras.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.brandName || m.nama} ({m.nama}) — IDR {new Intl.NumberFormat('id-ID').format(m.paketHarga || 0)}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 font-medium italic">
                  * Memilih mitra real akan otomatis mengisi nama perwakilan, brand travel, HP, kota, paket, dan total nominal tagihan kontrak sesuai database registrasi.
                </p>
              </div>

              {/* Dropdown: Auto-fill Date & Deadline based on Existing Packages */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 space-y-1.5 mb-2 text-left">
                <label className="font-extrabold text-sky-900 flex justify-between items-center text-[10px] tracking-wider uppercase">
                  <span>Pilih Paket yang Sudah Ada (Auto-Fill Tanggal & Deadline)</span>
                  <span className="text-sky-700 bg-sky-100 font-black rounded-full px-2 py-0.5 text-[9px]">
                    {existingPackagesInfo.length} TEMPLATE PAKET
                  </span>
                </label>
                <select
                  value={existingPackagesInfo.some(p => p.name === formDataMitra.paket_umroh) ? formDataMitra.paket_umroh : ""}
                  onChange={(e) => {
                    const selectedPkgName = e.target.value;
                    if (selectedPkgName) {
                      const matched = existingPackagesInfo.find(p => p.name === selectedPkgName);
                      if (matched) {
                        setFormDataMitra(prev => ({
                          ...prev,
                          paket_umroh: matched.name,
                          tanggal_berangkat: matched.tanggal_berangkat,
                          deadline_pelunasan: matched.deadline_pelunasan
                        }));
                      }
                    }
                  }}
                  className="w-full bg-white border border-sky-300 p-2 rounded-lg font-black text-xs text-sky-950 focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                >
                  <option value="">-- Pilih Preset Paket Untuk Auto-Fill Tanggal & Batas Pelunasan --</option>
                  {existingPackagesInfo.map(pkg => (
                    <option key={pkg.name} value={pkg.name}>
                      {pkg.name} (Berangkat: {pkg.tanggal_berangkat || '-'})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-sky-600 font-medium italic block">
                  * Memilih paket yang sudah ada akan otomatis mengisi <strong>Alokasi Paket</strong>, <strong>Tanggal Keberangkatan</strong>, dan <strong>Batas Pelunasan (Deadline) H-30</strong>.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Nama Perwakilan Mitra</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: H. Abdul"
                    value={formDataMitra.nama_mitra}
                    onChange={(e) => setFormDataMitra(prev => ({ ...prev, nama_mitra: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Nama Brand / Biro Travel</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Ad-Dua Tour"
                    value={formDataMitra.nama_brand}
                    onChange={(e) => setFormDataMitra(prev => ({ ...prev, nama_brand: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">PIC Handphone (WA)</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: 0812..."
                    value={formDataMitra.hp}
                    onChange={(e) => setFormDataMitra(prev => ({ ...prev, hp: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Kota Domisili</label>
                  <input 
                    type="text" 
                    placeholder="Bandung/Jakarta"
                    value={formDataMitra.kota}
                    onChange={(e) => setFormDataMitra(prev => ({ ...prev, kota: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Maksimal Seat Dipesan</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={formDataMitra.jumlah_seat}
                    onChange={(e) => setFormDataMitra(prev => ({ ...prev, jumlah_seat: Number(e.target.value) }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Alokasi Paket Umroh</label>
                  <input 
                    type="text" 
                    required
                    value={formDataMitra.paket_umroh}
                    onChange={(e) => setFormDataMitra(prev => ({ ...prev, paket_umroh: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Tanggal Keberangkatan</label>
                  <input 
                    type="date" 
                    required
                    value={formDataMitra.tanggal_berangkat}
                    onChange={(e) => {
                      const tgl = e.target.value;
                      const computedDeadline = calculateDeadlineH45(tgl);
                      setFormDataMitra(prev => ({ 
                        ...prev, 
                        tanggal_berangkat: tgl,
                        deadline_pelunasan: computedDeadline
                      }));
                    }}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Batas Pelunasan Tagihan (Deadline)</label>
                  <input 
                    type="date" 
                    required
                    value={formDataMitra.deadline_pelunasan}
                    onChange={(e) => setFormDataMitra(prev => ({ ...prev, deadline_pelunasan: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-gray-500">Total Nominal Tagihan Kontrak Pembayaran (IDR)</label>
                <input 
                  type="number" 
                  required
                  min={0}
                  placeholder="IDR Rupiah"
                  value={formDataMitra.total_tagihan}
                  onChange={(e) => setFormDataMitra(prev => ({ ...prev, total_tagihan: Number(e.target.value) }))}
                  className="w-full bg-gray-50 border border-gray-205 p-3 rounded-xl font-bold text-sm text-amber-900-500 border-amber-300"
                />
              </div>

              <div className="pt-4 flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsNewMitraModalOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 font-extrabold px-4 py-2 text-xs rounded-lg text-gray-500"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="bg-amber-600 hover:bg-amber-700 font-black px-5 py-2 text-xs rounded-lg text-white"
                >
                  Daftarkan Mitra
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 1b. Modal: Edit Existing Mitra */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h2 className="text-base sm:text-lg font-black text-gray-900 uppercase">Edit Data Tracker Mitra</h2>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full"
              >
                ✖
              </button>
            </div>

             <form onSubmit={handleUpdateMitra} className="space-y-3 block text-xs">
              
              {/* Dropdown: Auto-fill Date & Deadline based on Existing Packages */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 space-y-1.5 mb-2 text-left">
                <label className="font-extrabold text-sky-900 flex justify-between items-center text-[10px] tracking-wider uppercase">
                  <span>Pilih Sesuai Paket yang Sudah Ada (Auto-Fill Tanggal & Deadline)</span>
                  <span className="text-sky-700 bg-sky-100 font-black rounded-full px-2 py-0.5 text-[9px]">
                    {existingPackagesInfo.length} TEMPLATE PAKET
                  </span>
                </label>
                <select
                  value={existingPackagesInfo.some(p => p.name === formDataEditMitra.paket_umroh) ? formDataEditMitra.paket_umroh : ""}
                  onChange={(e) => {
                    const selectedPkgName = e.target.value;
                    if (selectedPkgName) {
                      const matched = existingPackagesInfo.find(p => p.name === selectedPkgName);
                      if (matched) {
                        setFormDataEditMitra(prev => ({
                          ...prev,
                          paket_umroh: matched.name,
                          tanggal_berangkat: matched.tanggal_berangkat,
                          deadline_pelunasan: matched.deadline_pelunasan
                        }));
                      }
                    }
                  }}
                  className="w-full bg-white border border-sky-300 p-2 rounded-lg font-black text-xs text-sky-950 focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                >
                  <option value="">-- Pilih Preset Paket Untuk Auto-Fill Tanggal & Batas Pelunasan --</option>
                  {existingPackagesInfo.map(pkg => (
                    <option key={pkg.name} value={pkg.name}>
                      {pkg.name} (Berangkat: {pkg.tanggal_berangkat || '-'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Nama Perwakilan Mitra</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: H. Abdul"
                    value={formDataEditMitra.nama_mitra}
                    onChange={(e) => setFormDataEditMitra(prev => ({ ...prev, nama_mitra: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Nama Brand / Biro Travel</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Ad-Dua Tour"
                    value={formDataEditMitra.nama_brand}
                    onChange={(e) => setFormDataEditMitra(prev => ({ ...prev, nama_brand: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">PIC Handphone (WA)</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: 0812..."
                    value={formDataEditMitra.hp}
                    onChange={(e) => setFormDataEditMitra(prev => ({ ...prev, hp: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Kota Domisili</label>
                  <input 
                    type="text" 
                    placeholder="Bandung/Jakarta"
                    value={formDataEditMitra.kota}
                    onChange={(e) => setFormDataEditMitra(prev => ({ ...prev, kota: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Maksimal Seat Dipesan</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={formDataEditMitra.jumlah_seat}
                    onChange={(e) => setFormDataEditMitra(prev => ({ ...prev, jumlah_seat: Number(e.target.value) }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Alokasi Paket Umroh</label>
                  <input 
                    type="text" 
                    required
                    value={formDataEditMitra.paket_umroh}
                    onChange={(e) => setFormDataEditMitra(prev => ({ ...prev, paket_umroh: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Tanggal Keberangkatan</label>
                  <input 
                    type="date" 
                    required
                    value={formDataEditMitra.tanggal_berangkat}
                    onChange={(e) => {
                      const tgl = e.target.value;
                      const computedDeadline = calculateDeadlineH45(tgl);
                      setFormDataEditMitra(prev => ({ 
                        ...prev, 
                        tanggal_berangkat: tgl,
                        deadline_pelunasan: computedDeadline
                      }));
                    }}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Batas Pelunasan Tagihan (Deadline)</label>
                  <input 
                    type="date" 
                    required
                    value={formDataEditMitra.deadline_pelunasan}
                    onChange={(e) => setFormDataEditMitra(prev => ({ ...prev, deadline_pelunasan: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">PIC Finance</label>
                  <input 
                    type="text" 
                    required
                    value={formDataEditMitra.pic_finance}
                    onChange={(e) => setFormDataEditMitra(prev => ({ ...prev, pic_finance: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Status Keberangkatan</label>
                  <select 
                    value={formDataEditMitra.status_keberangkatan}
                    onChange={(e) => setFormDataEditMitra(prev => ({ ...prev, status_keberangkatan: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold text-xs"
                  >
                    <option value="Aman">Aman</option>
                    <option value="Pending">Pending</option>
                    <option value="Risiko">Risiko</option>
                    <option value="Cancel">Cancel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Total Nominal Tagihan Kontrak (IDR)</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    placeholder="IDR Rupiah"
                    value={formDataEditMitra.total_tagihan}
                    onChange={(e) => setFormDataEditMitra(prev => ({ ...prev, total_tagihan: Number(e.target.value) }))}
                    className="w-full bg-gray-50 border border-amber-300 p-2.5 rounded-xl font-bold text-xs text-amber-900 focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Total Terbayar (IDR)</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    placeholder="Total Terbayar"
                    value={formDataEditMitra.total_bayar}
                    onChange={(e) => setFormDataEditMitra(prev => ({ ...prev, total_bayar: Number(e.target.value) }))}
                    className="w-full bg-gray-50 border border-emerald-300 p-2.5 rounded-xl font-bold text-xs text-emerald-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 font-extrabold px-4 py-2 text-xs rounded-lg text-gray-500"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="bg-amber-600 hover:bg-amber-700 font-black px-5 py-2 text-xs rounded-lg text-white"
                >
                  Simpan Perubahan
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Register Payment (Cicilan) */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h2 className="text-base sm:text-lg font-black text-gray-900 uppercase">Input Suku Bunga / Log Pembayaran</h2>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full"
              >
                ✖
              </button>
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-4 block text-xs">
              
              <div className="space-y-1">
                <label className="font-extrabold text-gray-500">Pilih Tahap Angsuran Cicilan</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg font-bold"
                  value={formDataPay.jenis_pembayaran}
                  onChange={(e) => setFormDataPay(prev => ({ ...prev, jenis_pembayaran: e.target.value }))}
                >
                  <option value="DP">a. UANG MUKA (DP - Rp 5.000.000 / JAMAAH)</option>
                  <option value="TERMIN 1">b. TERMIN 1 (PEMBAYARAN KE-2 - 30% SISA TAGIHAN)</option>
                  <option value="TERMIN 2">c. TERMIN 2 (PEMBAYARAN KE-3 - 30% SISA TAGIHAN)</option>
                  <option value="PELUNASAN">d. PELUNASAN FINAL (WAJIB LUNAS H-45 BERANGKAT)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-gray-500">Nominal Transfer Pembayaran (IDR)</label>
                <input 
                  type="number" 
                  required
                  min={1}
                  value={formDataPay.nominal}
                  onChange={(e) => setFormDataPay(prev => ({ ...prev, nominal: Number(e.target.value) }))}
                  className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg text-sm font-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Metode</label>
                  <input 
                    type="text" 
                    value={formDataPay.metode}
                    onChange={(e) => setFormDataPay(prev => ({ ...prev, metode: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Bank Pengirim</label>
                  <input 
                    type="text" 
                    value={formDataPay.bank}
                    onChange={(e) => setFormDataPay(prev => ({ ...prev, bank: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-gray-500">Catatan Tambahan</label>
                <textarea 
                  rows={2}
                  value={formDataPay.catatan}
                  onChange={(e) => setFormDataPay(prev => ({ ...prev, catatan: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg"
                  placeholder="Keterangan setoran..."
                />
              </div>

              {/* Drag and Drop File Upload Zone */}
              <div className="space-y-1">
                <label className="font-extrabold text-gray-500">Upload Bukti Transfer</label>
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1
                    ${dragActive ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
                  onClick={() => document.getElementById('buktiFile')?.click()}
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-[10px] text-gray-500">Sumbu File Klik atau Seret bukti transfer di sini</span>
                  <span className="text-[9px] text-gray-400">Maks 2MB (Image/PDF)</span>
                  {formDataPay.bukti_transfer && (
                    <span className="text-[10px] text-emerald-600 font-extrabold block mt-2">✔ Bukti transfer berhasil diload!</span>
                  )}
                  <input 
                    type="file" 
                    id="buktiFile" 
                    className="hidden" 
                    accept="image/*,application/pdf"
                    onChange={handleFileChange} 
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 font-extrabold px-4 py-2 text-xs rounded-lg text-gray-500"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="bg-emerald-650 hover:bg-emerald-700 bg-emerald-600 font-black px-5 py-2 text-xs rounded-lg text-white text-center cursor-pointer"
                >
                  Konfirmasi Bayar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Register Follow up */}
      {isFollowupModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h2 className="text-base sm:text-lg font-black text-gray-900 uppercase">Input Log Follow Up Finance</h2>
              <button 
                onClick={() => setIsFollowupModalOpen(false)}
                className="p-1.5 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full"
              >
                ✖
              </button>
            </div>

            <form onSubmit={handleRegisterFollowup} className="space-y-3 block text-xs">
              
              {/* WhatsApp Quick Communication Banner */}
              {trackers.find(t => t.id === selectedMitraId) && (() => {
                const tr = trackers.find(t => t.id === selectedMitraId)!;
                return (
                  <div className="bg-emerald-50 border border-emerald-250 rounded-2xl p-3.5 space-y-2 text-left animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Integrasi WhatsApp
                      </span>
                      <span className="text-[10px] text-gray-400 font-extrabold">{tr.nama_brand || tr.nama_mitra}</span>
                    </div>
                    
                    <div className="text-[11px] font-medium text-gray-700 space-y-0.5">
                      <p>👤 <strong>PIC:</strong> {tr.pic || '-'} ({tr.hp || 'No HP Kosong'})</p>
                      <p>💰 <strong>Sisa Tagihan:</strong> <span className="text-rose-600 font-black">{formatCurrency(tr.sisa_tagihan)}</span> / {formatCurrency(tr.total_tagihan)}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp(tr)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black py-2 rounded-xl text-center text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>💬</span> Kirim Rincian Tagihan ke WA
                    </button>
                  </div>
                );
              })()}

              <div className="space-y-1">
                <label className="font-extrabold text-gray-500">Hasil Korespondensi Penagihan</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Ketik detail pembicaraan dengan PIC Mitra"
                  value={formDataFollow.hasil_followup}
                  onChange={(e) => setFormDataFollow(prev => ({ ...prev, hasil_followup: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Komitmen Janji Bayar</label>
                  <input 
                    type="date" 
                    value={formDataFollow.janji_bayar}
                    onChange={(e) => setFormDataFollow(prev => ({ ...prev, janji_bayar: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Nominal Janji (IDR)</label>
                  <input 
                    type="number" 
                    value={formDataFollow.nominal_janji}
                    onChange={(e) => setFormDataFollow(prev => ({ ...prev, nominal_janji: Number(e.target.value) }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">Status Komunikasi</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg"
                    value={formDataFollow.status_followup}
                    onChange={(e) => setFormDataFollow(prev => ({ ...prev, status_followup: e.target.value }))}
                  >
                    <option value="Completed">Selesai (Completed)</option>
                    <option value="Ongoing">Sedang Diproses (Ongoing)</option>
                    <option value="Postponed">Tertunda (Postponed)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-gray-500">PIC Pembicara Finance</label>
                  <input 
                    type="text" 
                    value={formDataFollow.pic_finance}
                    onChange={(e) => setFormDataFollow(prev => ({ ...prev, pic_finance: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsFollowupModalOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 font-extrabold px-4 py-2 text-xs rounded-lg text-gray-500"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="bg-amber-600 hover:bg-amber-700 font-black px-5 py-2 text-xs rounded-lg text-white"
                >
                  Simpan Log Follow Up
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Delete Confirmation Dialog */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-red-100 rounded-full text-red-600">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-gray-950 uppercase">Hapus Data Tracker?</h2>
              <p className="text-xs text-gray-500 font-medium">
                Apakah Anda benar-benar yakin ingin menghapus data tracker pembayaran mitra ini? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            
            <div className="flex gap-2 justify-center pt-2">
              <button 
                type="button" 
                onClick={() => setDeleteConfirmationId(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={async () => {
                  if (deleteConfirmationId) {
                    try {
                      await deleteDoc(doc(db, 'mitra_tracker', deleteConfirmationId));
                    } catch (err) {
                      handleFirestoreError(err, OperationType.DELETE, `mitra_tracker/${deleteConfirmationId}`);
                    } finally {
                      setDeleteConfirmationId(null);
                    }
                  }
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all font-black"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
