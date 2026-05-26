import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  Package, 
  ClipboardList, 
  Truck, 
  MapPin, 
  CheckSquare, 
  Database, 
  AlertTriangle, 
  ChevronRight, 
  Plus, 
  Search, 
  Download, 
  Printer, 
  Edit, 
  Trash2, 
  FileText, 
  X, 
  User, 
  Activity
} from 'lucide-react';
import { db, collection, onSnapshot, doc, setDoc, deleteDoc, handleFirestoreError, OperationType } from '../../firebase';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable?: (options: unknown) => void;
}

// Type definitions matching requested tables
interface MasterBarang {
  id: string;
  kode_barang: string;
  nama_barang: string;
  kategori_barang: string;
  ukuran: string;
  warna: string;
  satuan: string;
  stok: number;
  stok_minimum: number;
  harga_modal: number;
  harga_jual: number;
  lokasi_gudang: string;
  status_barang: 'Aktif' | 'Nonaktif' | 'Habis' | 'Pending Restock';
  thumbnail?: string;
  created_at?: string;
  updated_at?: string;
}

interface PackingList {
  id: string;
  package_id: string;
  nama_paket: string;
  mitra_id: string;
  nama_mitra: string;
  jumlah_pax: number;
  tanggal_packing: string;
  status_packing: 'Belum Packing' | 'Proses Packing' | 'Siap Kirim' | 'Selesai' | 'Pending';
  pic_gudang: string;
  catatan: string;
  items: PackingItemDetail[];
  created_at?: string;
  updated_at?: string;
}

interface PackingItemDetail {
  id: string;
  barang_id: string;
  nama_barang: string;
  qty: number;
  qty_packed: number;
  qty_kurang: number;
  status_item: 'Lengkap' | 'Kurang' | 'Pending';
  catatan?: string;
}

interface PengirimanTracker {
  id: string;
  packing_id: string;
  package_id: string;
  nama_paket: string;
  mitra_id: string;
  nama_mitra: string;
  ekspedisi: string;
  nomor_resi: string;
  tanggal_kirim: string;
  estimasi_tiba: string;
  tanggal_terima?: string;
  penerima?: string;
  alamat_pengiriman: string;
  kota_pengiriman: string;
  biaya_kirim: number;
  status_pengiriman: 'Draft' | 'Diproses' | 'Dikirim' | 'Dalam Perjalanan' | 'Sampai' | 'Diterima' | 'Pending' | 'Retur' | 'Hilang';
  status_penerimaan?: 'Baik' | 'Rusak' | 'Kurang' | 'Tidak Lengkap';
  bukti_pengiriman?: string; // base64 / text
  bukti_penerimaan?: string; // base64 / text
  catatan: string;
  tracking_history: { waktu: string; lokasi: string; info: string }[];
  created_at?: string;
  updated_at?: string;
}

interface PenerimaanBarang {
  id: string;
  pengiriman_id: string;
  tanggal_terima: string;
  nama_penerima: string;
  kondisi_barang: 'Baik' | 'Rusak' | 'Kurang' | 'Tidak Lengkap';
  barang_kurang: string; // Deskripsi items
  barang_rusak: string; // Deskripsi items rusak
  catatan?: string;
  bukti_foto?: string; // base64 data url
  created_at?: string;
}

interface KomplainRetur {
  id: string;
  pengiriman_id: string;
  nomor_resi: string;
  nama_mitra: string;
  jenis_komplain: 'Barang Kurang' | 'Barang Rusak' | 'Salah Ukuran' | 'Salah Barang' | 'Belum Diterima' | 'Barang Hilang';
  deskripsi: string;
  foto_bukti?: string; // base64
  status_komplain: 'Open' | 'Diproses' | 'Selesai' | 'Ditolak';
  solusi?: string;
  created_at?: string;
  updated_at?: string;
}

interface AuditLog {
  id: string;
  waktu: string;
  user: string;
  role: string;
  aktivitas: string;
  detail: string;
}

export const PerlengkapanView: React.FC = () => {
  // Current user mock roles mimicking structure
  const currentUserRole = 'SUPER ADMIN';
  
  // Inner Submenu Navigation
  type MenuTab = 'dashboard' | 'master' | 'packing' | 'pengiriman' | 'tracking' | 'penerimaan' | 'stok' | 'retur' | 'distribusi' | 'laporan' | 'audit';
  const [activeSubTab, setActiveSubTab] = useState<MenuTab>('dashboard');
  
  // Dynamic State synchronized with Firebase or LocalStorage fallback
  const [masterBarang, setMasterBarang] = useState<MasterBarang[]>([]);
  const [packingList, setPackingList] = useState<PackingList[]>([]);
  const [pengirimanList, setPengirimanList] = useState<PengirimanTracker[]>([]);
  const [penerimaanList, setPenerimaanList] = useState<PenerimaanBarang[]>([]);
  const [komplainList, setKomplainList] = useState<KomplainRetur[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals Controller
  const [showAddBarangModal, setShowAddBarangModal] = useState(false);
  const [showAddPackingModal, setShowAddPackingModal] = useState(false);
  const [showAddPengirimanModal, setShowAddPengirimanModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showAuditLogsModal, setShowAuditLogsModal] = useState(false);

  // Selected for edits / details view
  const [selectedPengiriman, setSelectedPengiriman] = useState<PengirimanTracker | null>(null);

  // Form states
  const [barangForm, setBarangForm] = useState<Partial<MasterBarang>>({});
  const [packingForm, setPackingForm] = useState<Partial<PackingList>>({});
  const [pengirimanForm, setPengirimanForm] = useState<Partial<PengirimanTracker>>({});
  const [receiveForm, setReceiveForm] = useState<Partial<PenerimaanBarang>>({});

  // Dropdown list mocks based on actual records
  const listKategoriBarang = [
    'Koper Besar', 'Koper Kabin', 'Tas Sandal', 'Seragam', 'Batik', 'Hijab', 
    'Mukena', 'Kain Ihram', 'Jaket', 'Syal', 'Sandal', 'ID Card', 
    'Buku Panduan', 'Name Tag', 'Sabuk', 'Custom Item'
  ];

  const activePackages = [
    { id: 'pkg-001', nama: 'Umrah Syawal Gold 2026', tgl_berangkat: '2026-06-15' },
    { id: 'pkg-002', nama: 'Regular Silver Hemat Juni', tgl_berangkat: '2026-06-24' },
    { id: 'pkg-003', nama: 'VIP Al-Aqsa Plus Turkey', tgl_berangkat: '2026-07-10' }
  ];

  const activeMitras = [
    { id: 'mit-001', nama: 'Mitra Al-Hikmah Bandung' },
    { id: 'mit-002', nama: 'KBIH An-Noor Jakarta Silang' },
    { id: 'mit-003', nama: 'Abu Dhabi Travel Surabaya' }
  ];

  // Audit event helper
  const logActivity = (aktivitas: string, detail: string) => {
    const newLog: AuditLog = {
      id: 'log-' + Date.now(),
      waktu: new Date().toLocaleString('id-ID'),
      user: 'Umaroh Logistics',
      role: currentUserRole,
      aktivitas,
      detail
    };
    const updated = [newLog, ...auditLogs];
    setAuditLogs(updated);
    localStorage.setItem('perlengkapan_audit', JSON.stringify(updated));
  };

  // Seed data default generator if empty
  const applySeedData = () => {
    const freshBarang: MasterBarang[] = [
      { id: 'b-001', kode_barang: 'KPR-ME-01', nama_barang: 'Koper Besar Premium 24"', kategori_barang: 'Koper Besar', ukuran: 'L', warna: 'Maron', satuan: 'Pcs', stok: 120, stok_minimum: 15, harga_modal: 250000, harga_jual: 350000, lokasi_gudang: 'Rak A-1', status_barang: 'Aktif' },
      { id: 'b-002', kode_barang: 'SRG-BT-02', nama_barang: 'Seragam Batik Umaroh', kategori_barang: 'Batik', ukuran: 'XL', warna: 'Ungu Gold', satuan: 'Pcs', stok: 80, stok_minimum: 10, harga_modal: 80000, harga_jual: 120000, lokasi_gudang: 'Rak B-3', status_barang: 'Aktif' },
      { id: 'b-003', kode_barang: 'IHR-PR-03', nama_barang: 'Kain Ihram Tenun Al-Haram', kategori_barang: 'Kain Ihram', ukuran: 'Free Size', warna: 'Putih', satuan: 'Set', stok: 8, stok_minimum: 15, harga_modal: 90000, harga_jual: 140000, lokasi_gudang: 'Rak C-2', status_barang: 'Aktif' },
      { id: 'b-004', kode_barang: 'TSS-MN-04', nama_barang: 'Tas Sandal Serut Fleksibel', kategori_barang: 'Tas Sandal', ukuran: 'Standar', warna: 'Hitam', satuan: 'Pcs', stok: 350, stok_minimum: 50, harga_modal: 150000, harga_jual: 250000, lokasi_gudang: 'Rak A-9', status_barang: 'Aktif' },
      { id: 'b-005', kode_barang: 'MKN-JM-05', nama_barang: 'Mukena Katun Bordir Umaroh', kategori_barang: 'Mukena', ukuran: 'All Size', warna: 'Putih Hijau', satuan: 'Set', stok: 60, stok_minimum: 12, harga_modal: 140000, harga_jual: 200000, lokasi_gudang: 'Rak D-1', status_barang: 'Aktif' }
    ];

    const freshPacking: PackingList[] = [
      {
        id: 'pack-101',
        package_id: 'pkg-001',
        nama_paket: 'Umrah Syawal Gold 2026',
        mitra_id: 'mit-001',
        nama_mitra: 'Mitra Al-Hikmah Bandung',
        jumlah_pax: 45,
        tanggal_packing: '2026-05-20',
        status_packing: 'Siap Kirim',
        pic_gudang: 'Ahmad Sofyan',
        catatan: 'Prioritas packing koper maron dengan name tag lengkap',
        items: [
          { id: 'pi-1', barang_id: 'b-001', nama_barang: 'Koper Besar Premium 24"', qty: 45, qty_packed: 45, qty_kurang: 0, status_item: 'Lengkap' },
          { id: 'pi-2', barang_id: 'b-002', nama_barang: 'Seragam Batik Umaroh', qty: 45, qty_packed: 45, qty_kurang: 0, status_item: 'Lengkap' },
          { id: 'pi-3', barang_id: 'b-003', nama_barang: 'Kain Ihram Tenun Al-Haram', qty: 25, qty_packed: 25, qty_kurang: 0, status_item: 'Lengkap' },
          { id: 'pi-4', barang_id: 'b-005', nama_barang: 'Mukena Katun Bordir Umaroh', qty: 20, qty_packed: 20, qty_kurang: 0, status_item: 'Lengkap' }
        ]
      }
    ];

    const freshPengiriman: PengirimanTracker[] = [
      {
        id: 'ship-201',
        packing_id: 'pack-101',
        package_id: 'pkg-001',
        nama_paket: 'Umrah Syawal Gold 2026',
        mitra_id: 'mit-001',
        nama_mitra: 'Mitra Al-Hikmah Bandung',
        ekspedisi: 'JNE Trucking',
        nomor_resi: 'JNE8876251421',
        tanggal_kirim: '2026-05-22',
        estimasi_tiba: '2026-05-26',
        alamat_pengiriman: 'Jl. Kiara Condong No. 125, Babakan Surabaya',
        kota_pengiriman: 'Bandung',
        biaya_kirim: 420000,
        status_pengiriman: 'Dalam Perjalanan',
        catatan: 'Supir meminta no hp penerima aktif',
        tracking_history: [
          { waktu: '2026-05-22 10:00', lokasi: 'Gudang Pusat Cengkareng', info: 'Barang di-checkout gudang & diserahkan ke JNE' },
          { waktu: '2026-05-23 03:15', lokasi: 'Sorting Center Bekasi', info: 'Paket transit di sorting hub Bekasi barat' },
          { waktu: '2026-05-24 14:00', lokasi: 'Gateway Bandung', info: 'Paket tiba di pool JNE Gedebage Bandung' }
        ]
      }
    ];

    const freshKomplain: KomplainRetur[] = [
      {
        id: 'comp-301',
        pengiriman_id: 'ship-201',
        nomor_resi: 'JNE8876251421',
        nama_mitra: 'Mitra Al-Hikmah Bandung',
        jenis_komplain: 'Salah Ukuran',
        deskripsi: 'Batik cadangan ukuran L dikirim M sebanyak 2 kain',
        status_komplain: 'Diproses',
        created_at: '2026-05-24'
      }
    ];

    setMasterBarang(freshBarang);
    setPackingList(freshPacking);
    setPengirimanList(freshPengiriman);
    setKomplainList(freshKomplain);

    localStorage.setItem('perlengkapan_master', JSON.stringify(freshBarang));
    localStorage.setItem('perlengkapan_packing', JSON.stringify(freshPacking));
    localStorage.setItem('perlengkapan_pengiriman', JSON.stringify(freshPengiriman));
    localStorage.setItem('perlengkapan_komplain', JSON.stringify(freshKomplain));
  };

  // Real-time synchronization
  useEffect(() => {
    // Bind fallback
    const lMaster = localStorage.getItem('perlengkapan_master');
    const lPacking = localStorage.getItem('perlengkapan_packing');
    const lPengiriman = localStorage.getItem('perlengkapan_pengiriman');
    const lPenerimaan = localStorage.getItem('perlengkapan_penerimaan');
    const lKomplain = localStorage.getItem('perlengkapan_komplain');
    const lAudit = localStorage.getItem('perlengkapan_audit');

    if (lMaster) setMasterBarang(JSON.parse(lMaster));
    if (lPacking) setPackingList(JSON.parse(lPacking));
    if (lPengiriman) setPengirimanList(JSON.parse(lPengiriman));
    if (lPenerimaan) setPenerimaanList(JSON.parse(lPenerimaan));
    if (lKomplain) setKomplainList(JSON.parse(lKomplain));
    if (lAudit) setAuditLogs(JSON.parse(lAudit));

    if (!lMaster && !lPacking && !lPengiriman) {
      applySeedData();
    }

    // Try listening to firestore for any updates to sync real-time if tables exist
    try {
      const unsubMaster = onSnapshot(collection(db, 'perlengkapan_master'), (snap) => {
        if (!snap.empty) {
          const arr: MasterBarang[] = [];
          snap.forEach(docSnap => arr.push({ id: docSnap.id, ...docSnap.data() } as MasterBarang));
          setMasterBarang(arr);
          localStorage.setItem('perlengkapan_master', JSON.stringify(arr));
        }
      }, (err) => {
        console.warn("Firestore sync error: 'perlengkapan_master'", err);
        handleFirestoreError(err, OperationType.GET, 'perlengkapan_master');
      });
      const unsubPacking = onSnapshot(collection(db, 'perlengkapan_packing'), (snap) => {
        if (!snap.empty) {
          const arr: PackingList[] = [];
          snap.forEach(docSnap => arr.push({ id: docSnap.id, ...docSnap.data() } as PackingList));
          setPackingList(arr);
          localStorage.setItem('perlengkapan_packing', JSON.stringify(arr));
        }
      }, (err) => {
        console.warn("Firestore sync error: 'perlengkapan_packing'", err);
        handleFirestoreError(err, OperationType.GET, 'perlengkapan_packing');
      });
      const unsubShip = onSnapshot(collection(db, 'perlengkapan_pengiriman'), (snap) => {
        if (!snap.empty) {
          const arr: PengirimanTracker[] = [];
          snap.forEach(docSnap => arr.push({ id: docSnap.id, ...docSnap.data() } as PengirimanTracker));
          setPengirimanList(arr);
          localStorage.setItem('perlengkapan_pengiriman', JSON.stringify(arr));
        }
      }, (err) => {
        console.warn("Firestore sync error: 'perlengkapan_pengiriman'", err);
        handleFirestoreError(err, OperationType.GET, 'perlengkapan_pengiriman');
      });

      return () => {
        unsubMaster();
        unsubPacking();
        unsubShip();
      };
    } catch (e) {
      console.warn("Firestore sync optional fallback: ", e);
    }
  }, []);

  // Update central list handler with option to update Firestore if online
  const updateCollectionState = async (
    type: 'master' | 'packing' | 'pengiriman' | 'komplain' | 'penerimaan',
    data: (MasterBarang | PackingList | PengirimanTracker | PenerimaanBarang | KomplainRetur)[]
  ) => {
    if (type === 'master') {
      const casted = data as MasterBarang[];
      setMasterBarang(casted);
      localStorage.setItem('perlengkapan_master', JSON.stringify(casted));
    } else if (type === 'packing') {
      const casted = data as PackingList[];
      setPackingList(casted);
      localStorage.setItem('perlengkapan_packing', JSON.stringify(casted));
    } else if (type === 'pengiriman') {
      const casted = data as PengirimanTracker[];
      setPengirimanList(casted);
      localStorage.setItem('perlengkapan_pengiriman', JSON.stringify(casted));
    } else if (type === 'komplain') {
      const casted = data as KomplainRetur[];
      setKomplainList(casted);
      localStorage.setItem('perlengkapan_komplain', JSON.stringify(casted));
    } else if (type === 'penerimaan') {
      const casted = data as PenerimaanBarang[];
      setPenerimaanList(casted);
      localStorage.setItem('perlengkapan_penerimaan', JSON.stringify(casted));
    }

    // Attempt online store for active sync
    try {
      // Loop over inputs to save to db
      for (const item of data) {
        if (item.id) {
          await setDoc(doc(db, `perlengkapan_${type}`, item.id), item);
        }
      }
    } catch (err) {
      console.warn("Firestore optional write failed: ", err);
      handleFirestoreError(err, OperationType.WRITE, `perlengkapan_${type}`);
    }
  };

  // 1. ADD / EDIT MASTER BARANG
  const handleSaveBarang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barangForm.nama_barang || !barangForm.kode_barang) return;

    let updatedList = [...masterBarang];
    const isEdit = !!barangForm.id;
    const finalItem: MasterBarang = {
      id: barangForm.id || 'b-' + Date.now(),
      kode_barang: barangForm.kode_barang,
      nama_barang: barangForm.nama_barang,
      kategori_barang: barangForm.kategori_barang || 'Custom Item',
      ukuran: barangForm.ukuran || 'Standar',
      warna: barangForm.warna || 'Default',
      satuan: barangForm.satuan || 'Pcs',
      stok: Number(barangForm.stok ?? 0),
      stok_minimum: Number(barangForm.stok_minimum ?? 10),
      harga_modal: Number(barangForm.harga_modal ?? 0),
      harga_jual: Number(barangForm.harga_jual ?? 0),
      lokasi_gudang: barangForm.lokasi_gudang || 'Rak Utama',
      status_barang: barangForm.status_barang || 'Aktif',
      thumbnail: barangForm.thumbnail || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=200',
      created_at: barangForm.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isEdit) {
      updatedList = updatedList.map(b => b.id === finalItem.id ? finalItem : b);
      logActivity('UPDATE BARANG', `Mengubah atribut barang: ${finalItem.nama_barang}`);
    } else {
      updatedList.push(finalItem);
      logActivity('CREATE BARANG', `Mendaftarkan barang baru: ${finalItem.nama_barang}`);
    }

    await updateCollectionState('master', updatedList);
    setShowAddBarangModal(false);
    setBarangForm({});
  };

  const handleDeleteBarang = async (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus barang ${name}?`)) {
      const updated = masterBarang.filter(b => b.id !== id);
      await updateCollectionState('master', updated);
      try {
        await deleteDoc(doc(db, 'perlengkapan_master', id));
      } catch (err) {
        console.warn("Delete Firestore doc failed: ", err);
        handleFirestoreError(err, OperationType.DELETE, `perlengkapan_master/${id}`);
      }
      logActivity('DELETE BARANG', `Menghapus master barang: ${name}`);
    }
  };

  // 2. PACKING COMPLETED & AUTO STOCK CALCULATION
  const handleSavePacking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packingForm.package_id || !packingForm.mitra_id) return;

    const matchedPkg = activePackages.find(p => p.id === packingForm.package_id);
    const matchedMitra = activeMitras.find(m => m.id === packingForm.mitra_id);

    const isEdit = !!packingForm.id;
    const packingId = packingForm.id || 'pack-' + Date.now();

    // Default item detail generation based on category selection
    const defaultPackingItems: PackingItemDetail[] = [
      { id: 'it-1', barang_id: 'b-001', nama_barang: 'Koper Besar Premium 24"', qty: Number(packingForm.jumlah_pax || 20), qty_packed: Number(packingForm.jumlah_pax || 20), qty_kurang: 0, status_item: 'Lengkap' },
      { id: 'it-2', barang_id: 'b-002', nama_barang: 'Seragam Batik Umaroh', qty: Number(packingForm.jumlah_pax || 20), qty_packed: Number(packingForm.jumlah_pax || 20), qty_kurang: 0, status_item: 'Lengkap' },
      { id: 'it-3', barang_id: 'b-003', nama_barang: 'Kain Ihram Tenun Al-Haram', qty: Number(packingForm.jumlah_pax || 20) / 2, qty_packed: Number(packingForm.jumlah_pax || 20) / 2, qty_kurang: 0, status_item: 'Lengkap' }
    ];

    const finalPacking: PackingList = {
      id: packingId,
      package_id: packingForm.package_id,
      nama_paket: matchedPkg?.nama || 'Paket Umroh Custom',
      mitra_id: packingForm.mitra_id,
      nama_mitra: matchedMitra?.nama || 'Mitra Agen',
      jumlah_pax: Number(packingForm.jumlah_pax || 1),
      tanggal_packing: packingForm.tanggal_packing || new Date().toISOString().split('T')[0],
      status_packing: packingForm.status_packing || 'Proses Packing',
      pic_gudang: packingForm.pic_gudang || 'Staff Gudang',
      catatan: packingForm.catatan || '',
      items: packingForm.items || defaultPackingItems,
      created_at: packingForm.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let updatedPacking = [...packingList];
    if (isEdit) {
      updatedPacking = updatedPacking.map(p => p.id === finalPacking.id ? finalPacking : p);
      logActivity('UPDATE PACKING', `Mengubah packing list ID: ${finalPacking.id}`);
    } else {
      updatedPacking.push(finalPacking);
      logActivity('CREATE PACKING', `Membuat job packing untuk: ${finalPacking.nama_mitra}`);
    }

    // AUTO STOCK CALCULATION: If marked "Selesai", subtract stock from Master
    if (finalPacking.status_packing === 'Selesai' && (!isEdit || packingList.find(p => p.id === finalPacking.id)?.status_packing !== 'Selesai')) {
      const currentMaster = [...masterBarang];
      finalPacking.items.forEach(item => {
        const product = currentMaster.find(p => p.id === item.barang_id);
        if (product) {
          product.stok = Math.max(0, product.stok - item.qty_packed);
          if (product.stok <= 0) product.status_barang = 'Habis';
        }
      });
      await updateCollectionState('master', currentMaster);
      logActivity('AUTO DISPATCH STOCK', `Mengurangi stok otomatis karena packing selesai untuk ${finalPacking.id}`);
    }

    await updateCollectionState('packing', updatedPacking);
    setShowAddPackingModal(false);
    setPackingForm({});
  };

  // 3. SHIPPING & TRACKING RESI UNIK VALIDATION
  const handleSavePengiriman = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pengirimanForm.packing_id || !pengirimanForm.nomor_resi) return;

    // Validation: Waybill (resi) unique checker
    const resiExists = pengirimanList.some(p => p.nomor_resi === pengirimanForm.nomor_resi && p.id !== pengirimanForm.id);
    if (resiExists) {
      alert('Gagal: Nomor Resi sudah digunakan pada pengiriman lain. Masukkan Resi unik!');
      return;
    }

    const matchedPacking = packingList.find(pack => pack.id === pengirimanForm.packing_id);
    const finalShip: PengirimanTracker = {
      id: pengirimanForm.id || 'ship-' + Date.now(),
      packing_id: pengirimanForm.packing_id,
      package_id: matchedPacking?.package_id || 'custom-pkg',
      nama_paket: matchedPacking?.nama_paket || 'Umroh Regular',
      mitra_id: matchedPacking?.mitra_id || 'custom-mitra',
      nama_mitra: matchedPacking?.nama_mitra || 'Mitra Utama',
      ekspedisi: pengirimanForm.ekspedisi || 'J&T Express',
      nomor_resi: pengirimanForm.nomor_resi,
      tanggal_kirim: pengirimanForm.tanggal_kirim || new Date().toISOString().split('T')[0],
      estimasi_tiba: pengirimanForm.estimasi_tiba || '',
      penerima: pengirimanForm.penerima || '',
      alamat_pengiriman: pengirimanForm.alamat_pengiriman || '',
      kota_pengiriman: pengirimanForm.kota_pengiriman || '',
      biaya_kirim: Number(pengirimanForm.biaya_kirim || 0),
      status_pengiriman: pengirimanForm.status_pengiriman || 'Diproses',
      catatan: pengirimanForm.catatan || '',
      tracking_history: pengirimanForm.tracking_history || [
        { waktu: new Date().toLocaleString('id-ID'), lokasi: 'Gudang Utama', info: 'Manifest pengiriman telah diproses' }
      ],
      created_at: pengirimanForm.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let updatedShip = [...pengirimanList];
    if (pengirimanForm.id) {
      updatedShip = updatedShip.map(s => s.id === finalShip.id ? finalShip : s);
      logActivity('UPDATE SHIPPING', `Mengubah status pengiriman resi: ${finalShip.nomor_resi}`);
    } else {
      updatedShip.push(finalShip);
      logActivity('CREATE SHIPPING', `Mengirim perlengkapan dengan resi: ${finalShip.nomor_resi}`);
    }

    await updateCollectionState('pengiriman', updatedShip);
    setShowAddPengirimanModal(false);
    setPengirimanForm({});
  };

  // Add Tracking Timeline event
  const handleAddTrackingTimeline = (eventId: string, lokasi: string, info: string) => {
    if (!lokasi || !info) return;
    const updated = pengirimanList.map(item => {
      if (item.id === eventId) {
        const history = [...item.tracking_history, { waktu: new Date().toLocaleString('id-ID'), lokasi, info }];
        return { ...item, tracking_history: history, updated_at: new Date().toISOString() };
      }
      return item;
    });
    updateCollectionState('pengiriman', updated);
    logActivity('UPDATE TIMELINE', `Menambahkan log lokasi baru untuk pengiriman ${eventId}`);
  };

  // 4. PENERIMAAN BARANG - KOMPLAIN - AUTO STOCK ADD ON RETURN
  const handleSavePenerimaan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveForm.pengiriman_id || !receiveForm.nama_penerima) return;

    const matchedShip = pengirimanList.find(s => s.id === receiveForm.pengiriman_id);
    const finalReceive: PenerimaanBarang = {
      id: 'rec-' + Date.now(),
      pengiriman_id: receiveForm.pengiriman_id,
      tanggal_terima: receiveForm.tanggal_terima || new Date().toISOString().split('T')[0],
      nama_penerima: receiveForm.nama_penerima,
      kondisi_barang: receiveForm.kondisi_barang || 'Baik',
      barang_kurang: receiveForm.barang_kurang || '',
      barang_rusak: receiveForm.barang_rusak || '',
      catatan: receiveForm.catatan || '',
      bukti_foto: receiveForm.bukti_foto || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=200',
      created_at: new Date().toISOString()
    };

    // Update matching delivery status
    const updatedShip = pengirimanList.map(s => {
      if (s.id === receiveForm.pengiriman_id) {
        return { 
          ...s, 
          status_pengiriman: 'Diterima' as const, 
          tanggal_terima: finalReceive.tanggal_terima,
          penerima: finalReceive.nama_penerima,
          status_penerimaan: finalReceive.kondisi_barang
        };
      }
      return s;
    });
    await updateCollectionState('pengiriman', updatedShip);

    const updatedRecs = [finalReceive, ...penerimaanList];
    await updateCollectionState('penerimaan', updatedRecs);

    // If receive statement reports broken/damaged, automatically create ticket and handle stock if applicable
    if (finalReceive.kondisi_barang === 'Rusak' || finalReceive.kondisi_barang === 'Tidak Lengkap') {
      const complaintTicket: KomplainRetur = {
        id: 'comp-' + Date.now(),
        pengiriman_id: finalReceive.pengiriman_id,
        nomor_resi: matchedShip?.nomor_resi || 'RESI-UNKNOWN',
        nama_mitra: matchedShip?.nama_mitra || 'Mitra Penerima',
        jenis_komplain: finalReceive.kondisi_barang === 'Rusak' ? 'Barang Rusak' : 'Barang Kurang',
        deskripsi: `Laporan saat penerimaan: ${finalReceive.catatan}. Item rusak: ${finalReceive.barang_rusak || 'Tidak didetilkan'}. Item kurang: ${finalReceive.barang_kurang || 'Tidak didetilkan'}`,
        status_komplain: 'Open',
        created_at: new Date().toISOString().split('T')[0]
      };
      await updateCollectionState('komplain', [complaintTicket, ...komplainList]);
    }

    logActivity('RECEIVE CARGO', `Mitra telah mengonfirmasi penerimaan pengiriman resi ${matchedShip?.nomor_resi}`);
    setShowReceiveModal(false);
    setReceiveForm({});
  };

  // Resolve complaint with auto return restock option
  const handleResolveKomplain = async (complaintId: string, status: 'Selesai' | 'Ditolak', solusi: string, isRestockReturn: boolean) => {
    const updated = komplainList.map(item => {
      if (item.id === complaintId) {
        return { ...item, status_komplain: status, solusi, updated_at: new Date().toISOString() };
      }
      return item;
    });
    await updateCollectionState('komplain', updated);

    // AUTO RESTOCK ON COMPLAINT COMPLETED RETURN
    if (status === 'Selesai' && isRestockReturn) {
      // Add a test stock increase to first item or standard koper
      const currentMaster = [...masterBarang];
      if (currentMaster.length > 0) {
        currentMaster[0].stok += 1; // Return item added back to inventory stock
        await updateCollectionState('master', currentMaster);
        logActivity('AUTO STOCK RETURN', `Restock otomatis barang ${currentMaster[0].nama_barang} ke Gudang dari retur diselesaikan`);
      }
    }

    logActivity('COMPLAINT ACTION', `Penyesuaian tiket komplain ${complaintId} menjadi ${status}`);
  };

  // 5. EXPORT SYSTEM (PDF & Excel simulation matching guidelines)
  const handleExportExcel = () => {
    // Transform master barang data
    const listToExport = masterBarang.map(b => ({
      'KODE BARANG': b.kode_barang,
      'NAMA BARANG': b.nama_barang,
      'KATEGORI': b.kategori_barang,
      'WARNA': b.warna,
      'STOK BERJALAN': b.stok,
      'MINIMUM STOK': b.stok_minimum,
      'LOKASI GUDANG': b.lokasi_gudang,
      'STATUS': b.status_barang,
      'HARGA JUAL': b.harga_jual
    }));

    const ws = XLSX.utils.json_to_sheet(listToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stok Perlengkapan");
    XLSX.writeFile(wb, "ERP_Laporan_Stok_Perlengkapan.xlsx");
    logActivity('EXPORT EXCEL', 'Mengekspor laporan stok master perlengkapan ke file Excel');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.setFont("helvetica", "bold");
    doc.text("LAPORAN DISTRIBUSI & STOK GUDANG PERLENGKAPAN", 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 27);
    
    const tableData = masterBarang.map(b => [
      b.kode_barang, 
      b.nama_barang, 
      b.kategori_barang, 
      b.stok.toString() + ' ' + b.satuan, 
      b.lokasi_gudang, 
      b.status_barang
    ]);

    doc.autoTable({
      startY: 34,
      head: [['Kode', 'Nama Perlengkapan', 'Kategori', 'Stok', 'Lokasi', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136] } // Teal background header
    });

    doc.save("ERP_Laporan_Perlengkapan_Umaroh.pdf");
    logActivity('EXPORT PDF', 'Mengekspor laporan perlengkapan format PDF');
  };

  const handlePrint = () => {
    window.print();
  };

  // WARNING ALERTS CALCULATIONS (For Warning system integration)
  const lowStockItems = masterBarang.filter(b => b.stok <= b.stok_minimum);
  const overduePackages = packingList.filter(p => {
    const pkg = activePackages.find(pack => pack.id === p.package_id);
    if (!pkg) return false;
    // Overdue packing if H-7 departure but status is not Completed
    const days = Math.floor((new Date(pkg.tgl_berangkat).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return days <= 7 && p.status_packing !== 'Selesai';
  });
  const activeComplaints = komplainList.filter(c => c.status_komplain === 'Open');

  // Search filter matching
  const filteredBarang = masterBarang.filter(b => {
    const matchesSearch = b.nama_barang.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.kode_barang.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterStatus ? b.kategori_barang === filterStatus : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-6 text-xs text-slate-800">
      
      {/* Module Navigation Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 mb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-600 rounded-2xl text-white shadow-md shadow-teal-600/10">
            <Truck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-black tracking-widest text-teal-600 uppercase">LOGISTIK & PACKING ERP</span>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Perlengkapan & Distribusi Jamaah</h1>
          </div>
        </div>

        {/* Role & Actions Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-teal-50 border border-teal-200 rounded-full p-1.5 px-3">
            <User className="w-3.5 h-3.5 text-teal-700 mr-1.5" />
            <span className="font-extrabold text-[10px] text-teal-800 uppercase tracking-widest">Akses Gudang: {currentUserRole}</span>
          </div>
          <button 
            onClick={() => setShowAuditLogsModal(true)} 
            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-extrabold p-2 px-3 rounded-xl transition-all"
          >
            <Activity className="w-4 h-4 text-slate-500" />
            <span>Audit Logs</span>
          </button>
        </div>
      </div>

      {/* Real-time sync alert */}
      {lowStockItems.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-250 p-3.5 rounded-2xl flex items-start gap-3 animate-in fade-in duration-300">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-extrabold text-amber-955 text-[11px] uppercase tracking-wide">Peringatan Stok Kebun & Gudang Menipis!</p>
            <p className="text-[11px] text-amber-700 font-medium mt-0.5">
              Terdapat sebanyak {lowStockItems.length} produk di bawah batas aman minimum. Segera koordinasikan dengan mitra vendor penyuplai untuk pengisian ulang demi kelancaran pemberangkatan paket bulan depan.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid Submodule Sidebar layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Navigation Sidebar Submenu */}
        <div className="lg:col-span-3 bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MENU INTEGRASI LOGISTIK</p>
          </div>
          <div className="p-2 space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard Perlengkapan', icon: BarChart2, color: 'text-teal-600' },
              { id: 'master', label: 'Master Perlengkapan', icon: Package, color: 'text-blue-600' },
              { id: 'packing', label: 'Packing List & Detail', icon: ClipboardList, color: 'text-violet-600' },
              { id: 'pengiriman', label: 'Ekspedisi Pengiriman', icon: Truck, color: 'text-amber-600' },
              { id: 'tracking', label: 'Tracking Realtime', icon: MapPin, color: 'text-rose-600' },
              { id: 'penerimaan', label: 'Penerimaan Barang', icon: CheckSquare, color: 'text-emerald-600' },
              { id: 'stok', label: 'Stok Gudang & Lokasi', icon: Database, color: 'text-indigo-600' },
              { id: 'retur', label: 'Retur & Komplain Mitra', icon: AlertTriangle, color: 'text-orange-600' },
              { id: 'distribusi', label: 'Monitoring Distribusi', icon: FileText, color: 'text-cyan-600' },
              { id: 'laporan', label: 'Laporan & Ekspor', icon: Printer, color: 'text-slate-600' }
            ].map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as MenuTab)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer text-left ${isActive ? 'bg-teal-50 text-teal-950 font-black border-l-4 border-teal-600' : 'bg-white hover:bg-slate-50 text-slate-600 font-bold'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <TabIcon className={`w-4 h-4 ${isActive ? 'text-teal-600' : tab.color}`} />
                    <span className="text-[11px] uppercase tracking-wide">{tab.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Section based on selected Sidebar */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* TAB 1: DASHBOARD PERLENGKAPAN */}
          {activeSubTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs text-left">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Barang</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">{masterBarang.length}</p>
                  <p className="text-[10px] text-teal-600 mt-0.5 font-bold">Tersebar di 3 lokasi rak</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs text-left">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Unit Item</span>
                  <p className="text-2xl font-black text-teal-600 mt-1">
                    {masterBarang.reduce((sum, item) => sum + item.stok, 0)} Pcs
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-bold">Stok aktif berjalan saat ini</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs text-left">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hampir Habis</span>
                  <p className={`text-2xl font-black mt-1 ${lowStockItems.length > 0 ? 'text-rose-600 animate-bounce' : 'text-slate-950'}`}>
                    {lowStockItems.length} Item
                  </p>
                  <p className="text-[10px] text-rose-500 mt-0.5 font-bold">Di bawah stok minimum</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs text-left">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Komplain Aktif</span>
                  <p className="text-2xl font-black text-orange-600 mt-1">{activeComplaints.length}</p>
                  <p className="text-[10px] text-orange-500 mt-0.5 font-bold">Butuh penanganan cepat</p>
                </div>
              </div>

              {/* Graphical Visualizer Component */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs text-left">
                  <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] mb-3">Distribusi Pengiriman Ekspedisi</h3>
                  <div className="space-y-2">
                    {[
                      { l: 'JNE Express', v: 40, c: 'bg-teal-500' },
                      { l: 'J&T Express', v: 30, c: 'bg-blue-500' },
                      { l: 'Kargo internal Mandiri', v: 20, c: 'bg-indigo-500' },
                      { l: 'Lainnya', v: 10, c: 'bg-slate-300' }
                    ].map((bar, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                          <span>{bar.l}</span>
                          <span>{bar.v}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className={`${bar.c} h-full`} style={{ width: `${bar.v}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs text-left flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] mb-1">Status Keberangkatan & Kelengkapan H-7</h3>
                    <p className="text-[10px] text-slate-450 mb-3">Sistem deteksi keterlambatan packing maskapai & koper</p>
                  </div>
                  {overduePackages.length === 0 ? (
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center space-y-1">
                      <p className="text-[15px]">🎉</p>
                      <p className="font-black text-emerald-800 uppercase tracking-wider text-[10px]">Aman & Sesuai Jadwal</p>
                      <p className="text-[10px] text-emerald-600">Tidak ada perlengkapan yang terlambat untuk keberangkatan terdekat H-7.</p>
                    </div>
                  ) : (
                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl space-y-2">
                      <p className="font-extrabold text-rose-800 uppercase text-[10px]">⚠️ Warning Overdue: {overduePackages.length} Paket</p>
                      {overduePackages.map((ov, i) => (
                        <p key={i} className="text-[10px] text-rose-700 font-medium bg-white/50 p-1.5 rounded-lg">
                          • {ov.nama_paket} (Mitra: {ov.nama_mitra}) - Status: {ov.status_packing}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MASTER PERLENGKAPAN */}
          {activeSubTab === 'master' && (
            <div className="bg-white border border-slate-100 shadow-xs rounded-2xl overflow-hidden text-left">
              <div className="p-4 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="relative flex-1 w-full">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Cari nama barang atau kode..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 p-2.5 w-full bg-slate-50 border border-slate-250 rounded-xl"
                  />
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                  >
                    <option value="">Semua Kategori</option>
                    {listKategoriBarang.map(kat => (
                      <option key={kat} value={kat}>{kat}</option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => {
                      setBarangForm({});
                      setShowAddBarangModal(true);
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-black p-2.5 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Barang</span>
                  </button>
                </div>
              </div>

              {/* Items Table container */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black tracking-widest uppercase text-slate-500 border-b border-slate-100">
                      <th className="p-4">Thumbnail</th>
                      <th className="p-4">Item & Kode</th>
                      <th className="p-4">Kategori</th>
                      <th className="p-4">Lokasi Gudang</th>
                      <th className="p-4 text-center">Stok Berjalan</th>
                      <th className="p-4 text-center">Batas Aman</th>
                      <th className="p-4 text-right">Harga Modal</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredBarang.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400 font-medium">
                          Tidak ada data barang terdaftar. Silakan tambah barang baru atau reset pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredBarang.map(bar => {
                        const isLow = bar.stok <= bar.stok_minimum;
                        return (
                          <tr key={bar.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4">
                              <img 
                                src={bar.thumbnail || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=200'} 
                                alt={bar.nama_barang} 
                                className="w-10 h-10 object-cover rounded-lg border border-slate-100"
                              />
                            </td>
                            <td className="p-4">
                              <p className="font-extrabold text-slate-900">{bar.nama_barang}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{bar.kode_barang}</p>
                            </td>
                            <td className="p-4 font-extrabold">
                              <span className="bg-slate-100 px-2.5 py-1 rounded-full text-slate-650">{bar.kategori_barang}</span>
                            </td>
                            <td className="p-4 font-bold text-slate-500">{bar.lokasi_gudang}</td>
                            <td className="p-4 text-center font-black">
                              <span className={isLow ? 'text-rose-600 bg-rose-50 px-2 py-1 rounded-md' : 'text-slate-900 bg-slate-50 px-2 py-1 rounded-md'}>
                                {bar.stok} {bar.satuan}
                              </span>
                            </td>
                            <td className="p-4 text-center text-slate-400 font-bold">{bar.stok_minimum}</td>
                            <td className="p-4 text-right font-extrabold text-teal-800">Rp {bar.harga_modal.toLocaleString('id-ID')}</td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setBarangForm(bar);
                                    setShowAddBarangModal(true);
                                  }}
                                  className="p-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-lg text-slate-500 transition-all cursor-pointer"
                                  title="Edit barang"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBarang(bar.id, bar.nama_barang)}
                                  className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 rounded-lg text-slate-500 transition-all cursor-pointer"
                                  title="Hapus barang"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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
          )}

          {/* TAB 3: PACKING LIST & DETAIL */}
          {activeSubTab === 'packing' && (
            <div className="bg-white border border-slate-100 shadow-xs rounded-2xl overflow-hidden text-left space-y-4">
              <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/55">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Pemberkasan Packing Koper & Atribut</h3>
                  <p className="text-[10px] text-slate-400">Pastikan kelengkapan jumlah pax tercatat akurat sebelum serah terima ekspedisi</p>
                </div>
                <button
                  onClick={() => {
                    setPackingForm({});
                    setShowAddPackingModal(true);
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-black p-2 px-3.5 rounded-xl flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Job Packing Baru</span>
                </button>
              </div>

              <div className="p-4 space-y-4">
                {packingList.map(pack => (
                  <div key={pack.id} className="border border-slate-150 rounded-2xl p-4 space-y-3 shadow-xs">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <span className="bg-teal-100 text-teal-850 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">{pack.status_packing}</span>
                        <h4 className="font-black text-slate-900 text-sm mt-1">{pack.nama_paket}</h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">PIC Gudang: {pack.pic_gudang} • Tanggal Packing: {pack.tanggal_packing}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ALOKASI MITRA</p>
                        <p className="font-extrabold text-slate-800">{pack.nama_mitra}</p>
                        <p className="text-[10px] text-teal-600 font-black tracking-wider mt-0.5">{pack.jumlah_pax} PAX (KOPER)</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-slate-705">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Detil Items Packed:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                        {pack.items.map((it, idx) => (
                          <div key={idx} className="bg-white p-2 rounded-lg border border-slate-100 flex justify-between">
                            <span className="font-bold truncate max-w-[120px]">{it.nama_barang}</span>
                            <span className="font-black text-teal-700">{it.qty_packed}/{it.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setPackingForm(pack);
                          setShowAddPackingModal(true);
                        }}
                        className="p-1 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-extrabold cursor-pointer text-[10px] uppercase tracking-wider"
                      >
                        Ubah Packing Status / Detail
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: EKSPEDISI PENGIRIMAN */}
          {activeSubTab === 'pengiriman' && (
            <div className="bg-white border border-slate-100 shadow-xs rounded-2xl overflow-hidden text-left space-y-4">
              <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Pemberangkatan & Ekspedisi Perlengkapan</h3>
                  <p className="text-[10px] text-slate-400">Log pengeluaran kargo untuk dikirim ke alamat agen atau bandara embarkasi</p>
                </div>
                <button
                  onClick={() => {
                    setPengirimanForm({});
                    setShowAddPengirimanModal(true);
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-black p-2 px-3.5 rounded-xl flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Kirim Cargo Baru</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black tracking-widest uppercase text-slate-500 border-b border-slate-100">
                      <th className="p-4">Waybill / Resi</th>
                      <th className="p-4">Mitra Penerima</th>
                      <th className="p-4">Kurir Ekspedisi</th>
                      <th className="p-4">Tanggal Kirim</th>
                      <th className="p-4 text-right">Ongkos Kirim</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Opsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {pengirimanList.map(ship => (
                      <tr key={ship.id} className="hover:bg-slate-50/50">
                        <td className="p-4">
                          <p className="font-black text-slate-900">{ship.nomor_resi}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{ship.nama_paket}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-extrabold text-slate-800">{ship.nama_mitra}</p>
                          <p className="text-[10px] text-slate-400 font-bold truncate max-w-[120px]">{ship.alamat_pengiriman}</p>
                        </td>
                        <td className="p-4 font-bold text-teal-900">{ship.ekspedisi}</td>
                        <td className="p-4 font-extrabold">{ship.tanggal_kirim}</td>
                        <td className="p-4 text-right font-black text-slate-900">Rp {ship.biaya_kirim.toLocaleString('id-ID')}</td>
                        <td className="p-4 text-center">
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                            {ship.status_pengiriman}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedPengiriman(ship);
                              setActiveSubTab('tracking');
                            }}
                            className="bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-700 font-extrabold px-2.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer"
                          >
                            Trace Resi
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: TRACKING REALTIME */}
          {activeSubTab === 'tracking' && (
            <div className="bg-white border border-slate-100 shadow-xs rounded-2xl p-6 text-left space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Visual Live Map & Histori Perjalanan</h3>
                <p className="text-[10px] text-slate-400">Pilih resi pengiriman aktif di bawah untuk memantau keberadaan logistik secara realtime</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  className="p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold flex-1"
                  onChange={e => {
                    const found = pengirimanList.find(s => s.id === e.target.value);
                    if (found) setSelectedPengiriman(found);
                  }}
                  value={selectedPengiriman?.id || ''}
                >
                  <option value="">Pilih Resi Kargo Perlengkapan...</option>
                  {pengirimanList.map(s => (
                    <option key={s.id} value={s.id}>{s.nomor_resi} - {s.ekspedisi} ({s.nama_mitra})</option>
                  ))}
                </select>
              </div>

              {selectedPengiriman ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {/* Left Side Info Cards */}
                  <div className="md:col-span-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3.5">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detail Resi</p>
                      <p className="font-black text-[13px] text-slate-900 mt-0.5">{selectedPengiriman.nomor_resi}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alamat Tujuan</p>
                      <p className="font-extrabold text-slate-700 mt-0.5">{selectedPengiriman.alamat_pengiriman}, {selectedPengiriman.kota_pengiriman}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estimasi Tiba</p>
                      <p className="font-extrabold text-teal-700 mt-0.5">{selectedPengiriman.estimasi_tiba}</p>
                    </div>

                    <div className="border-t border-slate-200 pt-3 space-y-2">
                      <p className="font-black text-[10px] uppercase tracking-wider text-slate-700">Tambah Update Timeline Manual</p>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const loc = formData.get('lok') as string;
                        const inf = formData.get('inf') as string;
                        if (loc && inf) {
                          handleAddTrackingTimeline(selectedPengiriman.id, loc, inf);
                          e.currentTarget.reset();
                        }
                      }} className="space-y-2 text-[10px]">
                        <input name="lok" placeholder="Lokasi (cth: Pool Bandung)" required className="w-full p-2 bg-white border border-slate-250 rounded-lg text-[10px]" />
                        <input name="inf" placeholder="Keterangan (cth: Sedang dibongkar)" required className="w-full p-2 bg-white border border-slate-250 rounded-lg text-[10px]" />
                        <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-2 rounded-lg text-center cursor-pointer">
                          Tambahkan Histori Lokasi
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Right Side Timeline */}
                  <div className="md:col-span-8 space-y-4">
                    <p className="font-black text-[10px] uppercase text-slate-450 tracking-wider">Histori Alur Pengiriman:</p>
                    <div className="relative border-l-2 border-teal-100 pl-6 ml-3 space-y-6 text-left">
                      {selectedPengiriman.tracking_history.map((hist, index) => (
                        <div key={index} className="relative">
                          {/* Circle dot on line */}
                          <span className="absolute -left-9 top-1 w-4.5 h-4.5 bg-teal-600 border-2 border-white rounded-full flex items-center justify-center text-[7px] text-white">
                            ✓
                          </span>
                          <div>
                            <span className="text-[10px] text-teal-600 font-black tracking-wider bg-teal-50 p-1 px-2 rounded-md">{hist.waktu}</span>
                            <h5 className="font-black text-slate-900 mt-1.5">{hist.lokasi}</h5>
                            <p className="text-[11px] text-slate-500 font-bold mt-0.5">{hist.info}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-300 rounded-2xl font-medium">
                  Belum ada resi yang dipilih. Silakan pilih salah satu resi di atas untuk memantau pergerakan visual.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: PENERIMAAN BARANG */}
          {activeSubTab === 'penerimaan' && (
            <div className="bg-white border border-slate-100 shadow-xs rounded-2xl overflow-hidden p-6 text-left space-y-4">
              <div className="flex justify-between items-center bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Konfirmasi Penerimaan Barang di Tujuan</h3>
                  <p className="text-[10px] text-slate-400">Verifikasi kargo yang telah sampai untuk penutupan tiket manifest</p>
                </div>
                <button
                  onClick={() => setShowReceiveModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black p-2.5 px-4 rounded-xl flex items-center gap-1 active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Penerimaan</span>
                </button>
              </div>

              {/* Grid of Receives */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {penerimaanList.map(rec => {
                  const correlated = pengirimanList.find(s => s.id === rec.pengiriman_id);
                  return (
                    <div key={rec.id} className="border border-slate-150 rounded-2xl p-4 space-y-3 bg-white hover:shadow-xs transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${rec.kondisi_barang === 'Baik' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            Kondisi: {rec.kondisi_barang}
                          </span>
                          <h4 className="font-black text-slate-950 mt-1">Resi: {correlated?.nomor_resi || 'RESI-UNKNOWN'}</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">{rec.tanggal_terima}</span>
                      </div>

                      <div className="text-[10px] space-y-1 font-medium text-slate-650 bg-slate-50 p-2.5 rounded-xl">
                        <p>👤 <strong>Penerima:</strong> {rec.nama_penerima}</p>
                        <p>📦 <strong>Mitra Agen:</strong> {correlated?.nama_mitra || 'Mitra Umaroh'}</p>
                        {rec.barang_rusak && <p className="text-rose-600">⚠️ <strong>Barang Rusak:</strong> {rec.barang_rusak}</p>}
                        {rec.barang_kurang && <p className="text-orange-600">⚠️ <strong>Barang Kurang:</strong> {rec.barang_kurang}</p>}
                        {rec.catatan && <p>📝 <strong>Catatan:</strong> {rec.catatan}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 7: STOK GUDANG */}
          {activeSubTab === 'stok' && (
            <div className="space-y-6 text-left">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 text-left">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Stok Tersedia</span>
                  <p className="text-xl font-black text-emerald-600 mt-1">
                    {masterBarang.reduce((sum, b) => sum + b.stok, 0)} Pcs
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 text-left">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Stok Minimum Alert</span>
                  <p className="text-xl font-black text-rose-600 mt-1">
                    {lowStockItems.length} Produk
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 text-left">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lokasi Rak Gudang</span>
                  <p className="text-xl font-black text-teal-700 mt-1">3 Zona Utama</p>
                </div>
              </div>

              <div className="bg-white border border-slate-100 shadow-xs rounded-2xl p-4">
                <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] mb-4">Daftar Stok Produk per Zona Rak</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['Rak A-1', 'Rak B-3', 'Rak C-2'].map(rak => {
                    const mathItems = masterBarang.filter(b => b.lokasi_gudang.includes(rak.split(' ')[1]));
                    return (
                      <div key={rak} className="border border-slate-150 p-4 rounded-2xl bg-slate-50/50 space-y-3">
                        <p className="font-black text-teal-800 text-[11px] uppercase tracking-wider">{rak}</p>
                        <div className="space-y-1.5 text-[10px]">
                          {mathItems.length === 0 ? (
                            <p className="text-slate-400 uppercase text-[9px] font-bold">Rak Kosong</p>
                          ) : (
                            mathItems.map(item => (
                              <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                                <span className="font-bold truncate max-w-[125px] text-slate-800">{item.nama_barang}</span>
                                <span className="font-black text-teal-600">{item.stok}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: RETUR & KOMPLAIN */}
          {activeSubTab === 'retur' && (
            <div className="bg-white border border-slate-100 shadow-xs rounded-2xl overflow-hidden p-6 text-left space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Laporan Komplain & Retur Suku Cadang</h3>
                <p className="text-[10px] text-slate-400 font-medium">Solusi masalah pengiriminan, salah ukuran/warna, dan barang terlanjur pecah</p>
              </div>

              <div className="space-y-4">
                {komplainList.map(comp => (
                  <div key={comp.id} className="border border-slate-150 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${comp.status_komplain === 'Open' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          Tiket: {comp.status_komplain}
                        </span>
                        <h4 className="font-black text-slate-905 text-sm mt-1">{comp.jenis_komplain} ({comp.nama_mitra})</h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Resi terkait: {comp.nomor_resi}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">{comp.created_at}</span>
                    </div>

                    <p className="text-[10px] text-slate-600 font-medium bg-slate-50 p-2 rounded-lg">
                      <strong>Masalah:</strong> {comp.deskripsi}
                    </p>

                    {comp.solusi && (
                      <p className="text-[10px] text-teal-800 bg-teal-50 p-2 rounded-lg font-bold">
                        ✔️ <strong>Solusi:</strong> {comp.solusi}
                      </p>
                    )}

                    {comp.status_komplain === 'Open' && (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            const sol = prompt('Masukkan solusi penyelesaian untuk Mitra ini:');
                            if (sol) {
                              const autoRestock = confirm('Apakah ingin restock kembali barang retur ini ke Gudang (+1 Stok)?');
                              handleResolveKomplain(comp.id, 'Selesai', sol, autoRestock);
                            }
                          }}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold p-2 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer"
                        >
                          Selesaikan Komplain & Rekonsiliasi
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: MONITORING DISTRIBUSI */}
          {activeSubTab === 'distribusi' && (
            <div className="bg-white border border-slate-100 shadow-xs rounded-2xl overflow-hidden p-6 text-left space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Monitoring Distribusi per Keberangkatan</h3>
                <p className="text-[10px] text-slate-400">Ikhtisar progres distribusi kelengkapan jamaah ke seluruh mitra lokal</p>
              </div>

              <div className="space-y-4">
                {activePackages.map(pkg => {
                  const correlatedPackings = packingList.filter(p => p.package_id === pkg.id);
                  const totalPax = correlatedPackings.reduce((sum, p) => sum + p.jumlah_pax, 0);
                  const completedPax = correlatedPackings.filter(p => p.status_packing === 'Selesai').reduce((sum, p) => sum + p.jumlah_pax, 0);
                  const percentage = totalPax > 0 ? (completedPax / totalPax) * 100 : 0;

                  return (
                    <div key={pkg.id} className="border border-slate-150 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                        <span>Pemberangkatan: {pkg.tgl_berangkat}</span>
                        <span className="text-teal-600">Progres Koper: {percentage.toFixed(0)}% Selesai</span>
                      </div>
                      <h4 className="font-black text-slate-950 text-sm">{pkg.nama}</h4>

                      {/* Distribution level visualizer progress bar */}
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div className="bg-teal-600 h-full transition-all duration-300" style={{ width: `${percentage || 10}%` }} />
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-500 font-bold mt-1">
                        <p>Total Alokasi Pax: <strong>{totalPax || 45} PAX</strong></p>
                        <p>Jumlah Terkemas (Siap/Selesai): <strong>{completedPax || 45} PAX</strong></p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 10: LAPORAN & EKSPOR */}
          {activeSubTab === 'laporan' && (
            <div className="bg-white border border-slate-100 shadow-xs rounded-2xl p-6 text-left space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Ekspor Dashboard & Dokumen Cetak</h3>
                <p className="text-[10px] text-slate-400">Cetak berita acara penyerahan koper secara resmi kargo logistik kepada eksekutif agen travel</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div onClick={handleExportExcel} className="p-4 border border-slate-200 rounded-2xl hover:border-teal-500 hover:bg-teal-50/20 cursor-pointer transition-all flex flex-col items-center text-center space-y-2 group">
                  <div className="p-3 bg-teal-100 rounded-full text-teal-600 group-hover:scale-115 transition-transform">
                    <Download className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-slate-900 text-[11px] uppercase tracking-wider">Ekspor ke MS Excel</h4>
                  <p className="text-[10px] text-slate-450 font-bold">Unduh semua data master dalam berkas XLS untuk revisi offline</p>
                </div>

                <div onClick={handleExportPDF} className="p-4 border border-slate-200 rounded-2xl hover:border-rose-500 hover:bg-rose-50/20 cursor-pointer transition-all flex flex-col items-center text-center space-y-2 group">
                  <div className="p-3 bg-rose-100 rounded-full text-rose-600 group-hover:scale-115 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-slate-900 text-[11px] uppercase tracking-wider">Ekspor ke Berkas PDF</h4>
                  <p className="text-[10px] text-slate-450 font-bold">Unduh lembaran PDF terstruktur dengan logo resmi platform</p>
                </div>

                <div onClick={handlePrint} className="p-4 border border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50/20 cursor-pointer transition-all flex flex-col items-center text-center space-y-2 group">
                  <div className="p-3 bg-blue-100 rounded-full text-blue-600 group-hover:scale-115 transition-transform">
                    <Printer className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-slate-900 text-[11px] uppercase tracking-wider">Cetak Langsung (Print)</h4>
                  <p className="text-[10px] text-slate-450 font-bold">Membuka jendela cetak sistem operasi browser secara instan</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 1. MODAL ADD/EDIT BARANG */}
      {showAddBarangModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-xs">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-950 text-sm uppercase tracking-wide">
                {barangForm.id ? 'Edit Atribut Barang' : 'Pendaftaran Barang Baru'}
              </h3>
              <X className="w-4 h-4 cursor-pointer text-slate-400" onClick={() => setShowAddBarangModal(false)} />
            </div>
            
            <form onSubmit={handleSaveBarang} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Kode Barang</label>
                  <input
                    type="text"
                    required
                    value={barangForm.kode_barang || ''}
                    onChange={e => setBarangForm({...barangForm, kode_barang: e.target.value})}
                    placeholder="KPI-REG-01"
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Kategori</label>
                  <select
                    value={barangForm.kategori_barang || ''}
                    onChange={e => setBarangForm({...barangForm, kategori_barang: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                  >
                    {listKategoriBarang.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-500 uppercase tracking-wider">Nama Barang</label>
                <input
                  type="text"
                  required
                  value={barangForm.nama_barang || ''}
                  onChange={e => setBarangForm({...barangForm, nama_barang: e.target.value})}
                  placeholder="Koper Kabin Umaroh Executive 20 Inch"
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Ukuran</label>
                  <input
                    type="text"
                    value={barangForm.ukuran || ''}
                    onChange={e => setBarangForm({...barangForm, ukuran: e.target.value})}
                    placeholder="L"
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Warna</label>
                  <input
                    type="text"
                    value={barangForm.warna || ''}
                    onChange={e => setBarangForm({...barangForm, warna: e.target.value})}
                    placeholder="Navy"
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Satuan</label>
                  <input
                    type="text"
                    value={barangForm.satuan || ''}
                    onChange={e => setBarangForm({...barangForm, satuan: e.target.value})}
                    placeholder="Pcs"
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Stok Gudang</label>
                  <input
                    type="number"
                    required
                    value={barangForm.stok ?? ''}
                    onChange={e => setBarangForm({...barangForm, stok: Number(e.target.value)})}
                    placeholder="100"
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Batas Minimum (Alert)</label>
                  <input
                    type="number"
                    required
                    value={barangForm.stok_minimum ?? ''}
                    onChange={e => setBarangForm({...barangForm, stok_minimum: Number(e.target.value)})}
                    placeholder="15"
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Harga Beli / Satuan</label>
                  <input
                    type="number"
                    value={barangForm.harga_modal ?? ''}
                    onChange={e => setBarangForm({...barangForm, harga_modal: Number(e.target.value)})}
                    placeholder="200000"
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold text-teal-750"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Lokasi Gudang</label>
                  <input
                    type="text"
                    value={barangForm.lokasi_gudang || ''}
                    onChange={e => setBarangForm({...barangForm, lokasi_gudang: e.target.value})}
                    placeholder="Rak A-1"
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold animate-pulse"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-3 rounded-xl uppercase tracking-wider transition-all cursor-pointer active:scale-95"
              >
                Simpan & Rekonsiliasi Atribut
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODAL ADD/EDIT PACKING LIST */}
      {showAddPackingModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-xs">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-950 text-sm uppercase tracking-wide">Pemberkasan Packing baru</h3>
              <X className="w-4 h-4 cursor-pointer text-slate-400" onClick={() => setShowAddPackingModal(false)} />
            </div>

            <form onSubmit={handleSavePacking} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-500 uppercase tracking-wider">Pemberangkatan Paket</label>
                <select
                  required
                  value={packingForm.package_id || ''}
                  onChange={e => setPackingForm({...packingForm, package_id: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                >
                  <option value="">Pilih Paket...</option>
                  {activePackages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>{pkg.nama} ({pkg.tgl_berangkat})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-500 uppercase tracking-wider">Alokasi Penerima Agen / Mitra</label>
                <select
                  required
                  value={packingForm.mitra_id || ''}
                  onChange={e => setPackingForm({...packingForm, mitra_id: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                >
                  <option value="">Pilih Agen / Mitra...</option>
                  {activeMitras.map(mit => (
                    <option key={mit.id} value={mit.id}>{mit.nama}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Beban Seat Pax (Qty)</label>
                  <input
                    type="number"
                    required
                    value={packingForm.jumlah_pax || ''}
                    onChange={e => setPackingForm({...packingForm, jumlah_pax: Number(e.target.value)})}
                    placeholder="45"
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Tanggal Di-pack</label>
                  <input
                    type="date"
                    required
                    value={packingForm.tanggal_packing || ''}
                    onChange={e => setPackingForm({...packingForm, tanggal_packing: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-500 uppercase tracking-wider">Status Packing</label>
                <select
                  value={packingForm.status_packing || ''}
                  onChange={e => setPackingForm({...packingForm, status_packing: e.target.value as 'Belum Packing' | 'Proses Packing' | 'Siap Kirim' | 'Selesai' | 'Pending'})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold text-teal-800"
                >
                  <option value="Belum Packing">Belum Packing</option>
                  <option value="Proses Packing">Proses Packing</option>
                  <option value="Siap Kirim">Siap Kirim</option>
                  <option value="Selesai">Selesai (Auto potong stok gudang)</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-3 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
              >
                Konfirmasi packing list
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. MODAL CARGO DELIVERY */}
      {showAddPengirimanModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-xs">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-950 text-sm uppercase tracking-wide">Pemberangkatan Cargo Kargo</h3>
              <X className="w-4 h-4 cursor-pointer text-slate-400" onClick={() => setShowAddPengirimanModal(false)} />
            </div>

            <form onSubmit={handleSavePengiriman} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-500 uppercase tracking-wider">Hubungkan dengan Packing ID</label>
                <select
                  required
                  value={pengirimanForm.packing_id || ''}
                  onChange={e => setPengirimanForm({...pengirimanForm, packing_id: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                >
                  <option value="">Pilih Packing List...</option>
                  {packingList.map(p => (
                    <option key={p.id} value={p.id}>{p.id} - {p.nama_mitra} ({p.jumlah_pax} Koper)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Kurir Ekspedisi</label>
                  <select
                    value={pengirimanForm.ekspedisi || ''}
                    onChange={e => setPengirimanForm({...pengirimanForm, ekspedisi: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                  >
                    <option value="JNE Trucking">JNE Trucking</option>
                    <option value="J&T Cargo">J&T Cargo</option>
                    <option value="Sicepat Kargo">Sicepat Kargo</option>
                    <option value="Kargo internal Mandiri">Kargo internal Mandiri</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Nomor Resi Unik</label>
                  <input
                    type="text"
                    required
                    value={pengirimanForm.nomor_resi || ''}
                    onChange={e => setPengirimanForm({...pengirimanForm, nomor_resi: e.target.value})}
                    placeholder="JNE-8871625"
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Alamat Pengiriman</label>
                  <input
                    type="text"
                    value={pengirimanForm.alamat_pengiriman || ''}
                    onChange={e => setPengirimanForm({...pengirimanForm, alamat_pengiriman: e.target.value})}
                    placeholder="Jl Gatsu No. 4"
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Kota Tujuan</label>
                  <input
                    type="text"
                    value={pengirimanForm.kota_pengiriman || ''}
                    onChange={e => setPengirimanForm({...pengirimanForm, kota_pengiriman: e.target.value})}
                    placeholder="Bandung"
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Biaya Kirim (Rp)</label>
                  <input
                    type="number"
                    value={pengirimanForm.biaya_kirim ?? ''}
                    onChange={e => setPengirimanForm({...pengirimanForm, biaya_kirim: Number(e.target.value)})}
                    placeholder="250000"
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold text-emerald-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Estimasi Tiba</label>
                  <input
                    type="date"
                    value={pengirimanForm.estimasi_tiba || ''}
                    onChange={e => setPengirimanForm({...pengirimanForm, estimasi_tiba: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-3 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
              >
                Kirim Perlengkapan Cargo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL CONFIRM RECEIVE IN DESTINATION */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-xs">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-950 text-sm uppercase tracking-wide">Log Konfirmasi Penerimaan</h3>
              <X className="w-4 h-4 cursor-pointer text-slate-400" onClick={() => setShowReceiveModal(false)} />
            </div>

            <form onSubmit={handleSavePenerimaan} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-500 uppercase tracking-wider">Pengiriman Terkait</label>
                <select
                  required
                  value={receiveForm.pengiriman_id || ''}
                  onChange={e => setReceiveForm({...receiveForm, pengiriman_id: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold animate-pulse"
                >
                  <option value="">Pilih Waybill Resi...</option>
                  {pengirimanList.map(s => (
                    <option key={s.id} value={s.id}>{s.nomor_resi} - {s.nama_mitra}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Nama Penerima</label>
                  <input
                    type="text"
                    required
                    value={receiveForm.nama_penerima || ''}
                    onChange={e => setReceiveForm({...receiveForm, nama_penerima: e.target.value})}
                    placeholder="Ujang Sanusi"
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-500 uppercase tracking-wider">Tanggal Tiba</label>
                  <input
                    type="date"
                    required
                    value={receiveForm.tanggal_terima || ''}
                    onChange={e => setReceiveForm({...receiveForm, tanggal_terima: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-500 uppercase tracking-wider">Kondisi Kargo saat Tiba</label>
                <select
                  value={receiveForm.kondisi_barang || ''}
                  onChange={e => setReceiveForm({...receiveForm, kondisi_barang: e.target.value as 'Baik' | 'Rusak' | 'Kurang' | 'Tidak Lengkap'})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold text-teal-850"
                >
                  <option value="Baik">Baik & Lengkap</option>
                  <option value="Rusak">Terdapat Kerusakan (Auto-ticket komplain)</option>
                  <option value="Kurang">Jumlah Kurang (Auto-ticket komplain)</option>
                  <option value="Tidak Lengkap">Tidak Lengkap (Lainnya)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-500 uppercase tracking-wider text-rose-600">Catatan Retur / Item Kurang</label>
                <textarea
                  value={receiveForm.catatan || ''}
                  onChange={e => setReceiveForm({...receiveForm, catatan: e.target.value})}
                  placeholder="Sejumlah koper lecet, dsb."
                  className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl font-bold h-20"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
              >
                Konfirmasi Seberangkan & Hub
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL SHOW AUDIT LOGS */}
      {showAuditLogsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-950 text-sm uppercase tracking-wide">Sistem Pelacak Log Aktivitas (Audit Trail)</h3>
              <X className="w-4 h-4 cursor-pointer text-slate-400" onClick={() => setShowAuditLogsModal(false)} />
            </div>

            <div className="p-5 max-h-[400px] overflow-y-auto space-y-2">
              {auditLogs.length === 0 ? (
                <p className="p-4 text-center text-slate-400 font-medium">Belum ada aktivitas tercatat hari ini.</p>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50 space-y-1">
                    <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-wider">
                      <span>{log.waktu}</span>
                      <span>{log.role}</span>
                    </div>
                    <p className="font-extrabold text-slate-900 text-[11px]">{log.aktivitas}</p>
                    <p className="text-[10px] text-slate-605 font-bold">{log.detail}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
