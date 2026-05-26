import React, { useState, useEffect } from 'react';
import { 
  Layers, AlertTriangle, ArrowUpRight, Check, Clock, 
  Trash2, Edit, Plus, Download, Printer, Eye, X, Search, 
  Hotel, Plane, FileText, CheckCircle2, 
  Bell, ShieldAlert, Sparkles, DollarSign, Upload, Activity
} from 'lucide-react';
import { db, collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, handleFirestoreError, OperationType } from '../../firebase';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable?: (options: unknown) => void;
}

// Interfaces & Types
export interface CostComponent {
  id: string;
  nama_komponen: string;
  kategori_komponen: string;
  vendor_id: string;
  package_id: string;
  qty: number;
  qty_used: number;
  harga_satuan: number;
  total_biaya: number;
  dp: number;
  termin_1: number;
  termin_2: number;
  pelunasan: number;
  total_bayar: number;
  sisa_tagihan: number;
  persentase_bayar: number;
  tanggal_jatuh_tempo: string;
  tanggal_pembayaran: string;
  status_pembayaran: 'Belum Bayar' | 'DP' | 'Cicilan' | 'Hampir Lunas' | 'Lunas' | 'Overdue';
  status_risiko: 'Aman' | 'Waspada' | 'Risiko Tinggi' | 'Kritikal';
  status_operasional: 'Pending' | 'Confirmed' | 'On Progress' | 'Ready' | 'Cancel';
  invoice_file?: string;
  bukti_transfer?: string;
  approval_status: 'Pending Approval' | 'Approved' | 'Rejected';
  catatan?: string;
  created_by: string;
  created_at: string;
  updated_at: string;

  // Maskapai Specific
  airline_name?: string;
  flight_code?: string;
  route?: string;
  departure_time?: string;
  arrival_time?: string;
  seat_block?: number;
  issued_ticket?: number;
  avtur_cost?: number;
  airport_tax?: number;

  // Hotel Specific
  nama_hotel?: string;
  kota?: string;
  jumlah_room?: number;
  jenis_room?: string;
  checkin_date?: string;
  checkout_date?: string;
  meal_include?: boolean;
  status_booking?: string;

  // Visa Specific
  jumlah_pengajuan?: number;
  jumlah_approved?: number;
  jumlah_pending?: number;
  jumlah_reject?: number;
  provider_visa?: string;
  tanggal_pengajuan?: string;
  tanggal_approved?: string;

  // Handling Specific
  jumlah_pax?: number;
  airport_service?: string;
  transport_service?: string;
  porter_service?: string;
  handling_status?: string;

  // Avtur Specific
  harga_avtur?: number;
  qty_avtur?: number;
  biaya_total_avtur?: number;
  status_pembayaran_avtur?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  activity: string;
  details: string;
  user: string;
  componentId: string;
}

export interface RealtimeNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

// Helper Categories & Options
const KATEGORI_OPTIONS = [
  'Maskapai', 'Hotel Madinah', 'Hotel Makkah', 'Handling Saudi', 'Mutawif', 
  'Aksesoris', 'Visa', 'Asuransi', 'Handling Domestik', 'Administrasi', 
  'Avtur', 'Transportasi', 'Catering', 'Laundry', 'Perlengkapan', 'Custom Component'
];

export const VendorPaymentTracker: React.FC = () => {
  // Simulated Roles for Evaluation View
  const [currentUserRole, setCurrentUserRole] = useState<'SUPER ADMIN' | 'FINANCE' | 'OPERASIONAL' | 'OWNER'>('SUPER ADMIN');

  // Core States
  const [costComponents, setCostComponents] = useState<CostComponent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Searches State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPackage, setFilterPackage] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterPembayaran, setFilterPembayaran] = useState('');
  const [filterRisiko, setFilterRisiko] = useState('');
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);

  // Modals & UI Controls
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CostComponent | null>(null);
  const [detailModalItem, setDetailModalItem] = useState<CostComponent | null>(null);
  
  // Custom Warnings and Diagnostics
  const [warningsList, setWarningsList] = useState<string[]>([]);

  // Pemasukan & Estimasi (Cashflow)
  const [totalPemasukanMitra, setTotalPemasukanMitra] = useState(1250000000); // Decoupled static/mock start

  // Form Field State
  const [formData, setFormData] = useState<Partial<CostComponent>>({});

  // Realtime logging helper
  const addLog = async (activity: string, details: string, componentId: string = 'system') => {
    const newLog: AuditLog = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      activity,
      details,
      user: currentUserRole,
      componentId
    };
    try {
      await setDoc(doc(db, 'package_cost_audit_logs', newLog.id), newLog);
    } catch {
      console.warn("Log tracking fallback offline");
      const current = JSON.parse(localStorage.getItem('perlengkapan_audit_logs') || '[]');
      localStorage.setItem('perlengkapan_audit_logs', JSON.stringify([newLog, ...current]));
    }
  };

  // Realtime notification helper
  const triggerNotification = (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => {
    const notify: RealtimeNotification = {
      id: 'notify_' + Math.random().toString(36).substring(2, 9),
      type,
      title,
      message,
      timestamp: new Date().toLocaleTimeString('id-ID')
    };
    setNotifications(prev => [notify, ...prev].slice(0, 15));
  };

  // Date formulas & risk engine
  const calculateAutoRisiko = (item: Partial<CostComponent>): 'Aman' | 'Waspada' | 'Risiko Tinggi' | 'Kritikal' => {
    if (!item.tanggal_jatuh_tempo) return 'Aman';
    const deadline = new Date(item.tanggal_jatuh_tempo);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dpVal = Number(item.dp) || 0;
    const totalBayar = (Number(item.dp) || 0) + (Number(item.termin_1) || 0) + (Number(item.termin_2) || 0) + (Number(item.pelunasan) || 0);
    const totalBiaya = Number(item.total_biaya) || 0;
    const pct = totalBiaya > 0 ? (totalBayar / totalBiaya) * 100 : 0;

    if (diffDays <= 14 && pct < 100) return 'Kritikal';
    if (diffDays <= 30 && pct < 50) return 'Risiko Tinggi';
    if (diffDays <= 45 && dpVal === 0) return 'Waspada';
    return 'Aman';
  };

  // Load default components requested
  const loadDefaultDataIfNeeded = async () => {
    const DEFAULTS: Omit<CostComponent, 'id' | 'created_by' | 'created_at' | 'updated_at'>[] = [
      {
        nama_komponen: "MASKAPAI HAINAN START CGK",
        kategori_komponen: "Maskapai",
        vendor_id: "Hainan Airlines Ltd",
        package_id: "UMROH-VIP-AGUSTUS",
        qty: 45,
        qty_used: 45,
        harga_satuan: 12500000,
        total_biaya: 562500000,
        dp: 200000000,
        termin_1: 150000000,
        termin_2: 100000000,
        pelunasan: 112500000,
        total_bayar: 562500000,
        sisa_tagihan: 0,
        persentase_bayar: 100,
        tanggal_jatuh_tempo: "2026-07-10",
        tanggal_pembayaran: "2026-05-20",
        status_pembayaran: "Lunas",
        status_risiko: "Aman",
        status_operasional: "Confirmed",
        approval_status: "Approved",
        airline_name: "Hainan Airlines",
        flight_code: "HU7996",
        route: "CGK-HAK-MED",
        departure_time: "10:30",
        arrival_time: "17:45",
        seat_block: 45,
        issued_ticket: 42,
        avtur_cost: 35000000,
        airport_tax: 1500000
      },
      {
        nama_komponen: "HOTEL MADINAH PLAZA IN OHUD / SETARAF 4D3N",
        kategori_komponen: "Hotel Madinah",
        vendor_id: "Plaza Inn Hotels Saudi",
        package_id: "UMROH-VIP-AGUSTUS",
        qty: 20,
        qty_used: 20,
        harga_satuan: 1500000,
        total_biaya: 30000000,
        dp: 10000000,
        termin_1: 5000000,
        termin_2: 0,
        pelunasan: 0,
        total_bayar: 15000000,
        sisa_tagihan: 15000000,
        persentase_bayar: 50,
        tanggal_jatuh_tempo: "2026-06-15",
        tanggal_pembayaran: "2026-05-18",
        status_pembayaran: "Cicilan",
        status_risiko: "Waspada",
        status_operasional: "On Progress",
        approval_status: "Approved",
        nama_hotel: "Plaza Inn Ohud",
        kota: "Madinah",
        jumlah_room: 20,
        jenis_room: "Quad Room",
        checkin_date: "2026-08-12",
        checkout_date: "2026-08-16",
        meal_include: true,
        status_booking: "Confirmed"
      },
      {
        nama_komponen: "HOTEL MAKKAH WAHA AJYAD 5D4N / SETARAF",
        kategori_komponen: "Hotel Makkah",
        vendor_id: "Waha Ajyad Corporation",
        package_id: "UMROH-VIP-AGUSTUS",
        qty: 20,
        qty_used: 18,
        harga_satuan: 1800000,
        total_biaya: 36000000,
        dp: 12000000,
        termin_1: 5000000,
        termin_2: 0,
        pelunasan: 0,
        total_bayar: 17000000,
        sisa_tagihan: 19000000,
        persentase_bayar: 47.2,
        tanggal_jatuh_tempo: "2026-06-10",
        tanggal_pembayaran: "2026-05-19",
        status_pembayaran: "Cicilan",
        status_risiko: "Risiko Tinggi",
        status_operasional: "Pending",
        approval_status: "Approved",
        nama_hotel: "Waha Ajyad",
        kota: "Makkah",
        jumlah_room: 20,
        jenis_room: "Quad Room",
        checkin_date: "2026-08-16",
        checkout_date: "2026-08-21",
        meal_include: true,
        status_booking: "Booked"
      },
      {
        nama_komponen: "HANDLING SAUDI FULL",
        kategori_komponen: "Handling Saudi",
        vendor_id: "Saudi Sela Logistik",
        package_id: "UMROH-VIP-AGUSTUS",
        qty: 45,
        qty_used: 45,
        harga_satuan: 1100000,
        total_biaya: 49500000,
        dp: 10000000,
        termin_1: 0,
        termin_2: 0,
        pelunasan: 0,
        total_bayar: 10000000,
        sisa_tagihan: 39500000,
        persentase_bayar: 20.2,
        tanggal_jatuh_tempo: "2025-06-25", // Overdue target dates
        tanggal_pembayaran: "2026-05-15",
        status_pembayaran: "Overdue",
        status_risiko: "Kritikal",
        status_operasional: "Pending",
        approval_status: "Approved",
        jumlah_pax: 45,
        airport_service: "VVIP Meet & Greet",
        transport_service: "Haramain High Speed Train & Saptco Coach",
        porter_service: "Include",
        handling_status: "Pending"
      },
      {
        nama_komponen: "MUTAWIF + AKOMODASI 8 HARI",
        kategori_komponen: "Mutawif",
        vendor_id: "Asosiasi Mutawif Makkah",
        package_id: "UMROH-VIP-AGUSTUS",
        qty: 2,
        qty_used: 2,
        harga_satuan: 5000000,
        total_biaya: 10000000,
        dp: 10000000,
        termin_1: 0,
        termin_2: 0,
        pelunasan: 0,
        total_bayar: 10000000,
        sisa_tagihan: 0,
        persentase_bayar: 100,
        tanggal_jatuh_tempo: "2026-07-28",
        tanggal_pembayaran: "2026-05-12",
        status_pembayaran: "Lunas",
        status_risiko: "Aman",
        status_operasional: "Ready",
        approval_status: "Approved"
      },
      {
        nama_komponen: "AKSESORIS",
        kategori_komponen: "Aksesoris",
        vendor_id: "UD Tas & Perlengkapan Indonesia",
        package_id: "UMROH-VIP-AGUSTUS",
        qty: 45,
        qty_used: 45,
        harga_satuan: 300000,
        total_biaya: 13500000,
        dp: 5000000,
        termin_1: 8500000,
        termin_2: 0,
        pelunasan: 0,
        total_bayar: 13500000,
        sisa_tagihan: 0,
        persentase_bayar: 100,
        tanggal_jatuh_tempo: "2026-06-05",
        tanggal_pembayaran: "2026-05-22",
        status_pembayaran: "Lunas",
        status_risiko: "Aman",
        status_operasional: "Ready",
        approval_status: "Approved"
      },
      {
        nama_komponen: "VISA UMROH",
        kategori_komponen: "Visa",
        vendor_id: "PT Visa Nuansa Global",
        package_id: "UMROH-VIP-AGUSTUS",
        qty: 45,
        qty_used: 45,
        harga_satuan: 2200000,
        total_biaya: 99000000,
        dp: 40000000,
        termin_1: 40000000,
        termin_2: 0,
        pelunasan: 19000000,
        total_bayar: 99000000,
        sisa_tagihan: 0,
        persentase_bayar: 100,
        tanggal_jatuh_tempo: "2026-07-02",
        tanggal_pembayaran: "2026-05-14",
        status_pembayaran: "Lunas",
        status_risiko: "Aman",
        status_operasional: "Ready",
        approval_status: "Approved",
        jumlah_pengajuan: 45,
        jumlah_approved: 45,
        jumlah_pending: 0,
        jumlah_reject: 0,
        provider_visa: "PT Visa Nuansa Global",
        tanggal_pengajuan: "2026-05-10",
        tanggal_approved: "2026-05-14"
      },
      {
        nama_komponen: "ASURANSI",
        kategori_komponen: "Asuransi",
        vendor_id: "Syariah Amanah Insurtech",
        package_id: "UMROH-VIP-AGUSTUS",
        qty: 45,
        qty_used: 45,
        harga_satuan: 150000,
        total_biaya: 6750000,
        dp: 6750000,
        termin_1: 0,
        termin_2: 0,
        pelunasan: 0,
        total_bayar: 6750000,
        sisa_tagihan: 0,
        persentase_bayar: 100,
        tanggal_jatuh_tempo: "2026-06-30",
        tanggal_pembayaran: "2026-05-08",
        status_pembayaran: "Lunas",
        status_risiko: "Aman",
        status_operasional: "Ready",
        approval_status: "Approved"
      },
      {
        nama_komponen: "HANDLING DOMESTIK",
        kategori_komponen: "Handling Domestik",
        vendor_id: "PT Sinergi Handling Bandara",
        package_id: "UMROH-VIP-AGUSTUS",
        qty: 45,
        qty_used: 45,
        harga_satuan: 250000,
        total_biaya: 11250000,
        dp: 5000000,
        termin_1: 5000000,
        termin_2: 0,
        pelunasan: 0,
        total_bayar: 10000000,
        sisa_tagihan: 1250000,
        persentase_bayar: 88.8,
        tanggal_jatuh_tempo: "2026-06-28",
        tanggal_pembayaran: "2026-05-20",
        status_pembayaran: "Cicilan",
        status_risiko: "Aman",
        status_operasional: "On Progress",
        approval_status: "Approved"
      },
      {
        nama_komponen: "ADMINISTRASI",
        kategori_komponen: "Administrasi",
        vendor_id: "Koperasi Internal Travel",
        package_id: "UMROH-VIP-AGUSTUS",
        qty: 1,
        qty_used: 1,
        harga_satuan: 5000000,
        total_biaya: 5000000,
        dp: 5000000,
        termin_1: 0,
        termin_2: 0,
        pelunasan: 0,
        total_bayar: 5000000,
        sisa_tagihan: 0,
        persentase_bayar: 100,
        tanggal_jatuh_tempo: "2026-06-01",
        tanggal_pembayaran: "2026-05-01",
        status_pembayaran: "Lunas",
        status_risiko: "Aman",
        status_operasional: "Ready",
        approval_status: "Approved"
      },
      {
        nama_komponen: "PENAMBAHAN AVTUR PESAWAT",
        kategori_komponen: "Avtur",
        vendor_id: "Pertamina Aviation CGK",
        package_id: "UMROH-VIP-AGUSTUS",
        qty: 1,
        qty_used: 1,
        harga_satuan: 35000000,
        total_biaya: 35000000,
        dp: 15000000,
        termin_1: 20000000,
        termin_2: 0,
        pelunasan: 0,
        total_bayar: 35000000,
        sisa_tagihan: 0,
        persentase_bayar: 100,
        tanggal_jatuh_tempo: "2026-07-08",
        tanggal_pembayaran: "2026-05-25",
        status_pembayaran: "Lunas",
        status_risiko: "Aman",
        status_operasional: "Ready",
        approval_status: "Approved",
        harga_avtur: 15000,
        qty_avtur: 2333,
        biaya_total_avtur: 35000000,
        status_pembayaran_avtur: "Lunas"
      }
    ];

    try {
      for (const item of DEFAULTS) {
        const id = 'component_' + Math.random().toString(36).substring(2, 9);
        await setDoc(doc(db, 'package_cost_components', id), {
          id,
          ...item,
          created_by: "System Initializer",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      addLog("INITIALIZATION", "Membuat 11 cost components bawaan ERP keberangkatan.");
    } catch (e) {
      console.warn("Failed to inject default components:", e);
    }
  };

  // Real-time synchronization
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, 'package_cost_components'), (snap) => {
      if (snap.empty) {
        loadDefaultDataIfNeeded();
      } else {
        const arr: CostComponent[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data() as CostComponent;
          // Dynamically compute auto risks & overdues on retrieve
          const autoRisk = calculateAutoRisiko(data);
          let evaluatedPaymentStatus = data.status_pembayaran;
          
          const deadline = new Date(data.tanggal_jatuh_tempo);
          const today = new Date();
          if (data.total_bayar < data.total_biaya && deadline < today) {
            evaluatedPaymentStatus = 'Overdue';
          }

          arr.push({ 
            ...data, 
            status_risiko: autoRisk,
            status_pembayaran: evaluatedPaymentStatus
          });
        });
        setCostComponents(arr);
      }
      setLoading(false);
    }, (err) => {
      console.error("Firestore error loading CostComponents: ", err);
      handleFirestoreError(err, OperationType.GET, 'package_cost_components');
      setLoading(false);
    });

    // Sub to Audit logs
    const unsubLogs = onSnapshot(collection(db, 'package_cost_audit_logs'), (snap) => {
      const arr: AuditLog[] = [];
      snap.forEach(d => arr.push(d.data() as AuditLog));
      arr.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAuditLogs(arr.slice(0, 50));
    }, (err) => {
      console.error("Firestore error loading AuditLogs: ", err);
      handleFirestoreError(err, OperationType.GET, 'package_cost_audit_logs');
    });

    return () => {
      unsub();
      unsubLogs();
    };
  }, []);

  // Recalculability warnings on data shifts
  useEffect(() => {
    const list: string[] = [];
    const today = new Date();

    costComponents.forEach(comp => {
      const totalBayar = comp.dp + comp.termin_1 + comp.termin_2 + comp.pelunasan;
      const sisa = comp.total_biaya - totalBayar;
      
      // 1. Overdue Vendor
      if (comp.tanggal_jatuh_tempo) {
        const dDate = new Date(comp.tanggal_jatuh_tempo);
        if (dDate < today && sisa > 0) {
          list.push(`⚠️ Vendor ${comp.vendor_id} terlambat bayar (Overdue) pada komponen: ${comp.nama_komponen}`);
        }
      }
      // 2. Hotel belum lunas
      if (comp.kategori_komponen.startsWith('Hotel') && comp.status_pembayaran !== 'Lunas') {
        list.push(`🏨 Reservasi Hotel belum lunas: ${comp.nama_komponen} (Sisa tagihan: ${formatCurrency(sisa)})`);
      }
      // 3. Maskapai belum dibayar
      if (comp.kategori_komponen === 'Maskapai' && comp.status_pembayaran === 'Belum Bayar') {
        list.push(`✈️ Tiket Blok Maskapai BELUM DIBAYAR: ${comp.nama_komponen}!`);
      }
      // 4. Visa belum approved
      if (comp.kategori_komponen === 'Visa' && comp.jumlah_approved !== undefined && comp.jumlah_pending !== undefined && comp.jumlah_pending > 0) {
        list.push(`🛂 Dokumen Visa bermasalah: sebanyak ${comp.jumlah_pending} visa masih tertunda (Pending Approval).`);
      }
      // 5. Handling belum confirmed
      if (comp.kategori_komponen.includes('Handling') && comp.status_operasional !== 'Confirmed' && comp.status_operasional !== 'Ready') {
        list.push(`🧳 Layanan Handling bandara/kargo belum dikonfirmasi (Status: ${comp.status_operasional}).`);
      }
      // 6. Avtur belum dibayar
      if (comp.kategori_komponen === 'Avtur' && comp.status_pembayaran !== 'Lunas') {
        list.push(`⛽ Tagihan bahan bakar Avtur Pesawat belum selesai dilunasi.`);
      }
      // 7. Komponen kritikal
      if (comp.status_risiko === 'Kritikal') {
        list.push(`🚨 RISIKO KRITIKAL: Komponen ${comp.nama_komponen} jatuh tempo dalam kurang dari 14 hari dengan sisa pembayaran besar!`);
      }
    });

    // Cashflow check
    const totalPengeluaran = costComponents.reduce((sum, item) => sum + item.total_bayar, 0);
    const cashflow = totalPemasukanMitra - totalPengeluaran;
    if (cashflow < 0) {
      list.push(`📈 Cashflow Terancam Defisit: Total pengeluaran vendor melebihi dana terkumpul!`);
    }

    setWarningsList(list);
  }, [costComponents, totalPemasukanMitra]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val || 0);
  };

  // Math metrics
  const totalCost = costComponents.reduce((s, c) => s + c.total_biaya, 0);
  const totalPaid = costComponents.reduce((s, c) => s + c.total_bayar, 0);
  const totalDebt = costComponents.reduce((s, c) => s + c.sisa_tagihan, 0);
  const totalKritikalCount = costComponents.filter(c => c.status_risiko === 'Kritikal').length;
  const overdueCount = costComponents.filter(c => c.status_pembayaran === 'Overdue').length;
  const highRiskVendorsCount = costComponents.filter(c => c.status_risiko === 'Risiko Tinggi').length;

  const estimatedProfit = totalPemasukanMitra - totalCost;
  const deficitAssessment = totalCost - totalPaid;

  // Add / Edit submission
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_komponen || !formData.kategori_komponen || !formData.vendor_id) {
      alert("Harap lengkapi isi nama komponen, kategori, dan vendor!");
      return;
    }

    const qtyVal = Number(formData.qty) || 0;
    const priceVal = Number(formData.harga_satuan) || 0;
    const computedCost = qtyVal * priceVal;

    const dpVal = Number(formData.dp) || 0;
    const t1 = Number(formData.termin_1) || 0;
    const t2 = Number(formData.termin_2) || 0;
    const pel = Number(formData.pelunasan) || 0;
    const computedPaid = dpVal + t1 + t2 + pel;

    const computedSisa = computedCost - computedPaid;
    const percent = computedCost > 0 ? (computedPaid / computedCost) * 100 : 0;

    let payStatus: CostComponent['status_pembayaran'] = 'Belum Bayar';
    if (computedPaid >= computedCost) {
      payStatus = 'Lunas';
    } else if (computedPaid >= computedCost * 0.9) {
      payStatus = 'Hampir Lunas';
    } else if (computedPaid > dpVal) {
      payStatus = 'Cicilan';
    } else if (computedPaid > 0) {
      payStatus = 'DP';
    }

    const itemToSave: Partial<CostComponent> = {
      ...formData,
      qty: qtyVal,
      harga_satuan: priceVal,
      total_biaya: computedCost,
      dp: dpVal,
      termin_1: t1,
      termin_2: t2,
      pelunasan: pel,
      total_bayar: computedPaid,
      sisa_tagihan: computedSisa,
      persentase_bayar: Number(percent.toFixed(2)),
      status_pembayaran: payStatus,
      approval_status: formData.approval_status || 'Approved',
      updated_at: new Date().toISOString()
    };

    // Auto Risks update
    itemToSave.status_risiko = calculateAutoRisiko(itemToSave);

    const isEdit = !!selectedItem;
    const targetId = selectedItem ? selectedItem.id : 'component_' + Math.random().toString(36).substring(2, 9);
    
    if (!isEdit) {
      itemToSave.id = targetId;
      itemToSave.created_at = new Date().toISOString();
      itemToSave.created_by = currentUserRole;
    }

    try {
      await setDoc(doc(db, 'package_cost_components', targetId), itemToSave, { merge: true });
      addLog(
        isEdit ? "UPDATE COMPONENT" : "CREATE COMPONENT",
        `Mengubah/menambah komponen biaya ${itemToSave.nama_komponen} senilai ${formatCurrency(computedCost)} oleh ${currentUserRole}`,
        targetId
      );
      triggerNotification('success', 'Tersimpan', `Komponen ${itemToSave.nama_komponen} berhasil disimpan.`);
      setShowFormModal(false);
      setSelectedItem(null);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan ke database");
    }
  };

  // Delete cost component
  const handleDelete = async (item: CostComponent) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus komponen ${item.nama_komponen}?`)) return;
    try {
      await deleteDoc(doc(db, 'package_cost_components', item.id));
      addLog("DELETE COMPONENT", `Menghapus komponen: ${item.nama_komponen}`, item.id);
      triggerNotification('warning', 'Terhapus', `Komponen ${item.nama_komponen} telah dihapus.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Role permissions helpers
  const canWrite = currentUserRole === 'SUPER ADMIN' || currentUserRole === 'FINANCE';
  const canUpload = currentUserRole === 'SUPER ADMIN' || currentUserRole === 'FINANCE';
  const canApprove = currentUserRole === 'SUPER ADMIN' || currentUserRole === 'FINANCE' || currentUserRole === 'OWNER';

  // Toggle approval flow
  const handleApprovalChange = async (item: CostComponent, nextStatus: 'Approved' | 'Rejected') => {
    if (!canApprove) {
      alert("Akses ditolak: Hanya SUPER ADMIN, FINANCE, atau OWNER yang bisa menyetujui anggaran.");
      return;
    }
    try {
      await updateDoc(doc(db, 'package_cost_components', item.id), { approval_status: nextStatus });
      addLog("APPROVAL STATUS UPDATE", `Status persetujuan komponen ${item.nama_komponen} diubah ke ${nextStatus}`, item.id);
      triggerNotification(nextStatus === 'Approved' ? 'success' : 'error', 'Pembaruan Approval', `Komponen ${item.nama_komponen} sekarang ${nextStatus}.`);
      if (detailModalItem?.id === item.id) {
        setDetailModalItem(prev => prev ? { ...prev, approval_status: nextStatus } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle simulated file uploading
  const triggerSimulatedUpload = (field: 'invoice_file' | 'bukti_transfer', item: CostComponent) => {
    const fileName = `${field === 'invoice_file' ? 'Invoice' : 'Bukti_Transfer'}_${item.nama_komponen.replace(/\s+/g, '_')}.pdf`;
    try {
      updateDoc(doc(db, 'package_cost_components', item.id), { [field]: fileName });
      addLog("UPLOAD ATTACHMENT", `Mengunggah file ${fileName} ke komponen ${item.nama_komponen}`, item.id);
      triggerNotification('info', 'File Diunggah', `File ${fileName} sukses dilampirkan.`);
      // Update active viewing logs
      if (detailModalItem?.id === item.id) {
        setDetailModalItem(prev => prev ? { ...prev, [field]: fileName } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtering list dynamically
  const filteredList = costComponents.filter(item => {
    const matchSearch = 
      item.nama_komponen.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vendor_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kategori_komponen.toLowerCase().includes(searchQuery.toLowerCase());

    const matchPkg = filterPackage ? item.package_id === filterPackage : true;
    const matchVendor = filterVendor ? item.vendor_id === filterVendor : true;
    const matchKategori = filterKategori ? item.kategori_komponen === filterKategori : true;
    const matchPembayaran = filterPembayaran ? item.status_pembayaran === filterPembayaran : true;
    const matchRisiko = filterRisiko ? item.status_risiko === filterRisiko : true;
    const matchOverdue = filterOverdueOnly ? item.status_pembayaran === 'Overdue' : true;

    return matchSearch && matchPkg && matchVendor && matchKategori && matchPembayaran && matchRisiko && matchOverdue;
  });

  // REPORTS EXPORT SUPPORT
  const handleExportExcel = () => {
    const dataFormatted = filteredList.map(item => ({
      'Nama Komponen': item.nama_komponen,
      'Kategori': item.kategori_komponen,
      'Vendor': item.vendor_id,
      'Paket': item.package_id,
      'Volume (Qty)': item.qty,
      'Qty Terpakai': item.qty_used,
      'Harga Satuan': item.harga_satuan,
      'Total Biaya': item.total_biaya,
      'DP': item.dp,
      'Termin 1': item.termin_1,
      'Termin 2': item.termin_2,
      'Pelunasan': item.pelunasan,
      'Total Bayar': item.total_bayar,
      'Sisa Tagihan': item.sisa_tagihan,
      'Persen': `${item.persentase_bayar}%`,
      'Deadline': item.tanggal_jatuh_tempo,
      'Status Pembayaran': item.status_pembayaran,
      'Status Risiko': item.status_risiko,
      'Status Operasional': item.status_operasional,
      'Status Approval': item.approval_status
    }));

    const ws = XLSX.utils.json_to_sheet(dataFormatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendor Payment Cost ERP');
    XLSX.writeFile(wb, 'Laporan_Pembayaran_Vendor_Umroh.xlsx');
    addLog("EXPORT EXCEL", "Mengekspor laporan tracker pembayaran vendor ke file Excel");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.setFont("helvetica", "bold");
    doc.text("LAPORAN TRACKER BIAYA VENDOR & COST COMPONENT ERP", 14, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Waktu Cetak: ${new Date().toLocaleString('id-ID')} | Operator: ${currentUserRole}`, 14, 26);

    const headers = [["Komponen", "Vendor", "Kategori", "Total Biaya", "Sisa", "Status", "Risiko"]];
    const data = filteredList.map(item => [
      item.nama_komponen,
      item.vendor_id,
      item.kategori_komponen,
      formatCurrency(item.total_biaya),
      formatCurrency(item.sisa_tagihan),
      item.status_pembayaran,
      item.status_risiko
    ]);

    if (doc.autoTable) {
      doc.autoTable({
        startY: 32,
        head: headers,
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136] }
      });
      doc.save('Laporan_Biaya_Vendor_ERP.pdf');
      addLog("EXPORT PDF", "Mengekspor laporan tracker pembayaran vendor ke file PDF");
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Role Simulation Header Panel */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-teal-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="bg-teal-500/20 text-teal-300 font-extrabold text-xs px-3.5 py-1.5 rounded-full uppercase tracking-wider border border-teal-500/30 flex items-center gap-1.5 w-fit">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> SIMULATED ERP CONTEXT ACTIVE
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Layers className="text-teal-400 w-7 h-7" /> Vendor & Cost Component Tracker
            </h1>
            <p className="text-slate-400 font-medium">
              Sistem pengawasan pembayaran vendor terperinci berdasarkan biaya operasional keberangkatan umroh secara real-time.
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Simulasikan Hak Akses Anda:</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {(['SUPER ADMIN', 'FINANCE', 'OPERASIONAL', 'OWNER'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => {
                    setCurrentUserRole(role);
                    triggerNotification('info', 'Hak Akses Berubah', `Sekarang melihat data sebagai role ${role}`);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                    currentUserRole === role 
                      ? 'bg-teal-500 text-slate-950 shadow' 
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* WARNING REAL-TIME SYSTEM OVERLAY */}
      {warningsList.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm space-y-3">
          <h4 className="font-extrabold text-amber-800 flex items-center gap-2 text-sm uppercase tracking-wider">
            <AlertTriangle className="w-5 h-5 text-amber-600 animate-bounce" /> Warning System & Risiko Keberangkatan ({warningsList.length} Isu Terdeteksi)
          </h4>
          <div className="max-h-32 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
            {warningsList.map((warn, index) => (
              <div key={index} className="text-xs font-bold text-slate-700 flex items-start gap-1">
                <span className="text-amber-600">•</span>
                <span>{warn}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DASHBOARD SUMMARY COST COMPONENTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total cost and spending progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">TOTAL KOST VENDOR (RP)</span>
            <div className="p-2.5 bg-slate-50 text-slate-700 rounded-xl"><DollarSign className="w-5 h-5" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(totalCost)}</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Estimasi total seluruh komponen keberangkatan</p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
            <span className="text-teal-600">Realisasi Bayar:</span>
            <span className="text-slate-900">{((totalPaid / (totalCost || 1)) * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* Total Pengeluaran */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">TOTAL PENGELUARAN (AP)</span>
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl"><ArrowUpRight className="w-5 h-5" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-teal-600">{formatCurrency(totalPaid)}</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Biaya yang sudah dibayarkan (DP / Lunas)</p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100/80">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-teal-500 h-full transition-all" 
                style={{ width: `${Math.min(100, (totalPaid / (totalCost || 1)) * 100)}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Total Hutang Vendor */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">HUTANG VENDOR BERJALAN</span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><Clock className="w-5 h-5" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-rose-600">{formatCurrency(totalDebt)}</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Sisa kekurangan tagihan belum lunas</p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-rose-600 uppercase">
            <span>Overdue Vendor</span>
            <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md text-[10px]">{overdueCount}</span>
          </div>
        </div>

        {/* Risiko & Warning */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">RISIKO KEBERANGKATAN</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><ShieldAlert className="w-5 h-5" /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900">{totalKritikalCount} <span className="text-sm font-bold text-amber-600">Kritikal</span></h3>
            <p className="text-xs font-medium text-slate-500 mt-1">{highRiskVendorsCount} komponen berisiko tinggi</p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
            <span className="text-amber-600">H-14 Belum Lunas:</span>
            <span className="text-slate-900 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{totalKritikalCount}</span>
          </div>
        </div>
      </div>

      {/* CASHFLOW MONITORING (MONITORING CASHFLOW & ESTIMATED PROPORTIONS) */}
      <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
        <div>
          <h4 className="font-extrabold text-slate-800 text-sm tracking-wide uppercase">CASHFLOW MONITORING</h4>
          <p className="text-xs text-slate-500 mt-1 font-medium">Berdasarkan data umroh keberangkatan aktif.</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-600">Total Setoran Jemaah:</span>
            <input 
              type="number"
              value={totalPemasukanMitra}
              onChange={e => setTotalPemasukanMitra(Number(e.target.value) || 0)}
              className="px-2 py-1 border border-slate-300 rounded font-bold text-slate-900 text-xs w-28 bg-white focus:outline-none"
              title="Edit total pemasukan untuk menyesuaikan kalkulator profit"
            />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] text-slate-500 uppercase font-extrabold tracking-wide">TOTAL SETORAN JEMAAH</p>
          <p className="text-lg font-black text-slate-900">{formatCurrency(totalPemasukanMitra)}</p>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] text-slate-500 uppercase font-extrabold tracking-wide">ESTIMASI PROFIT / PROFIT MARGIN</p>
          <p className={`text-lg font-black ${estimatedProfit >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>
            {formatCurrency(estimatedProfit)} ({totalPemasukanMitra > 0 ? ((estimatedProfit / totalPemasukanMitra) * 100).toFixed(1) : 0}%)
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] text-slate-500 uppercase font-extrabold tracking-wide">ESTIMASI KEKURANGAN REKONSILIASI</p>
          <p className="text-lg font-black text-slate-900">{formatCurrency(deficitAssessment)}</p>
        </div>
      </div>

      {/* NOTIFICATION HUD & INTERACTIVE ANALYTIC METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dynamic Analytics Visual Charts (SVG Based) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-800 text-base uppercase tracking-wider flex items-center gap-2">
              <Activity className="text-teal-600 w-5 h-5 animate-pulse" /> Analisa Alokasi Biaya & Progress Pembayaran Vendor
            </h3>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{filteredList.length} Komponen Terhitung</span>
          </div>

          {/* Inline Graphic Comparison */}
          <div className="space-y-4">
            {filteredList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-bold text-sm">Tidak ada data untuk grafik analisis. Saring ulang filter Anda.</div>
            ) : (
              filteredList.slice(0, 5).map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 truncate max-w-xs">{item.nama_komponen}</span>
                    <span className="text-slate-900 font-black">{formatCurrency(item.total_biaya)} ({item.persentase_bayar}% Paid)</span>
                  </div>
                  <div className="h-6 w-full bg-slate-100 rounded-lg overflow-hidden flex relative">
                    {/* Paid portion */}
                    <div 
                      className="bg-teal-500 h-full transition-all flex items-center justify-end pr-2 text-[10px] font-black text-white"
                      style={{ width: `${item.persentase_bayar}%` }}
                    >
                      {item.persentase_bayar > 10 ? `${item.persentase_bayar}%` : ''}
                    </div>
                    {/* Debt portion */}
                    <div 
                      className="bg-rose-100 h-full transition-all" 
                      style={{ width: `${100 - item.persentase_bayar}%` }}
                    />
                  </div>
                </div>
              ))
            )}
            {filteredList.length > 5 && (
              <p className="text-[11px] text-slate-500 font-bold italic text-right">+ {filteredList.length - 5} komponen lainnya di bawah</p>
            )}
          </div>
        </div>

        {/* Real-time Notifications/Recent activities log */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between max-h-[350px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="text-amber-500 w-4 h-4" /> Live ERP Feed
            </h3>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full">REALTIME</span>
          </div>

          <div className="flex-1 mt-3 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {notifications.length === 0 && auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium text-center py-6">Belum ada aktivitas baru dari server.</p>
            ) : (
              [
                ...notifications.map(n => ({ ...n, source: 'notify' })),
                ...auditLogs.slice(0, 10).map(l => ({
                  id: l.id,
                  type: 'info',
                  title: l.activity,
                  message: l.details,
                  timestamp: new Date(l.timestamp).toLocaleTimeString('id-ID'),
                  source: 'audit'
                }))
              ].slice(0, 12).map((item, id) => (
                <div key={id} className="p-2 w-full text-slate-800 font-bold rounded-xl bg-slate-50 text-[11px] border border-slate-100/60 leading-relaxed">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-1">
                    <span className="uppercase text-teal-600">{item.title}</span>
                    <span>{item.timestamp}</span>
                  </div>
                  <p className="font-medium text-slate-700">{item.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* FILTER & REAL-TIME SEARCH SECTION */}
      <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari nama komponen, vendor, atau kategori secara realtime..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none font-bold text-sm text-slate-800"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 transition-all font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> EXCEL REPORT
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60 transition-all font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> PDF REPORT
            </button>
            <button
              onClick={() => window.print()}
              className="bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> PRINT VIEW
            </button>
            
            {canWrite && (
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setFormData({
                    nama_komponen: '',
                    kategori_komponen: 'Maskapai',
                    vendor_id: '',
                    package_id: 'UMROH-VIP-AGUSTUS',
                    qty: 1,
                    qty_used: 1,
                    harga_satuan: 0,
                    dp: 0,
                    termin_1: 0,
                    termin_2: 0,
                    pelunasan: 0,
                    status_operasional: 'Pending',
                    approval_status: 'Approved',
                    catatan: ''
                  });
                  setShowFormModal(true);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 ml-auto lg:ml-0"
              >
                <Plus className="w-4 h-4" /> TAMBAH BIAYA VENDOR
              </button>
            )}
          </div>
        </div>

        {/* Extended drop-down filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
          {/* Paket filter */}
          <div>
            <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-1">Filter Paket</label>
            <select
              value={filterPackage}
              onChange={e => setFilterPackage(e.target.value)}
              className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 cursor-pointer focus:outline-none"
            >
              <option value="">-- Semua Paket --</option>
              {Array.from(new Set(costComponents.map(e => e.package_id).filter(Boolean))).map(pkg => (
                <option key={pkg} value={pkg}>{pkg}</option>
              ))}
            </select>
          </div>

          {/* Vendor filter */}
          <div>
            <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-1">Filter Vendor</label>
            <select
              value={filterVendor}
              onChange={e => setFilterVendor(e.target.value)}
              className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 cursor-pointer focus:outline-none"
            >
              <option value="">-- Semua Vendor --</option>
              {Array.from(new Set(costComponents.map(e => e.vendor_id).filter(Boolean))).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Kategori filter */}
          <div>
            <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-1">Filter Kategori</label>
            <select
              value={filterKategori}
              onChange={e => setFilterKategori(e.target.value)}
              className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 cursor-pointer focus:outline-none"
            >
              <option value="">-- Semua Kategori --</option>
              {KATEGORI_OPTIONS.map(kat => (
                <option key={kat} value={kat}>{kat}</option>
              ))}
            </select>
          </div>

          {/* Status Pembayaran filter */}
          <div>
            <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-1">Status Bayar</label>
            <select
              value={filterPembayaran}
              onChange={e => setFilterPembayaran(e.target.value)}
              className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 cursor-pointer focus:outline-none"
            >
              <option value="">-- Semua Status --</option>
              <option value="Belum Bayar">Belum Bayar</option>
              <option value="DP">DP</option>
              <option value="Cicilan">Cicilan</option>
              <option value="Hampir Lunas">Hampir Lunas</option>
              <option value="Lunas">Lunas</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          {/* Status Risiko filter */}
          <div>
            <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-1">Tingkat Risiko</label>
            <select
              value={filterRisiko}
              onChange={e => setFilterRisiko(e.target.value)}
              className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 cursor-pointer focus:outline-none"
            >
              <option value="">-- Semua Risiko --</option>
              <option value="Aman">Aman</option>
              <option value="Waspada">Waspada</option>
              <option value="Risiko Tinggi">Risiko Tinggi</option>
              <option value="Kritikal">Kritikal</option>
            </select>
          </div>

          {/* Switch toggle overdue */}
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="overdueToggle"
              checked={filterOverdueOnly}
              onChange={e => setFilterOverdueOnly(e.target.checked)}
              className="w-4 h-4 cursor-pointer text-teal-600 focus:ring-teal-500 rounded"
            />
            <label htmlFor="overdueToggle" className="text-xs font-bold text-rose-600 uppercase cursor-pointer">JATUH TEMPO ONLY</label>
          </div>
        </div>
      </div>

      {/* CORE FINANCE TABLE (MONITORING TABLE & RECORD MATRIX) */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10 select-none">
                <th className="p-4">Komponen & Kategori</th>
                <th className="p-4">Vendor & Paket</th>
                <th className="p-4 text-center">Volume (Qty)</th>
                <th className="p-4 text-right">Total Anggaran</th>
                <th className="p-4 text-right">Sudah Dibayar</th>
                <th className="p-4 text-right">Sisa Tagihan</th>
                <th className="p-4 text-center">Progress</th>
                <th className="p-4 text-center">Risiko / Ops</th>
                <th className="p-4 text-center text-slate-300">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 divide-dashed">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 font-bold">
                    <Activity className="w-8 h-8 mx-auto animate-spin text-teal-600 mb-2" />
                    Menyinkronkan data biaya ERP dengan cloud server...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 font-bold">
                    Tidak ditemukan records yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredList.map(item => {
                  const sisa = item.total_biaya - item.total_bayar;
                  return (
                    <tr key={item.id} className="hover:bg-teal-50/20 transition-all">
                      {/* Name and Category */}
                      <td className="p-4 max-w-[200px]">
                        <p className="font-extrabold text-slate-900 text-xs tracking-tight line-clamp-2">{item.nama_komponen}</p>
                        <span className="inline-block mt-1 bg-slate-100 text-slate-600 font-bold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider md:max-w-fit truncate">
                          {item.kategori_komponen}
                        </span>
                      </td>

                      {/* Vendor & Target departure */}
                      <td className="p-4">
                        <p className="font-bold text-slate-700 text-xs truncate max-w-[140px]">{item.vendor_id}</p>
                        <p className="text-[10px] text-slate-400 font-bold italic truncate max-w-[140px]">{item.package_id}</p>
                      </td>

                      {/* Qty and Allocation */}
                      <td className="p-4 text-center">
                        <p className="font-black text-slate-800 text-xs">{item.qty_used} / {item.qty}</p>
                        <p className="text-[9px] text-slate-400 font-medium">Vol Unit</p>
                      </td>

                      {/* Total expected cost */}
                      <td className="p-4 text-right font-black text-slate-900 text-xs">
                        {formatCurrency(item.total_biaya)}
                      </td>

                      {/* Term sum paid */}
                      <td className="p-4 text-right font-bold text-teal-600 text-xs">
                        {formatCurrency(item.total_bayar)}
                      </td>

                      {/* Remaining AP dues */}
                      <td className="p-4 text-right">
                        <p className={`font-black text-xs ${sisa > 0 ? 'text-rose-600' : 'text-slate-500'}`}>{formatCurrency(sisa)}</p>
                        {item.tanggal_jatuh_tempo && (
                          <p className="text-[9px] text-slate-400 font-bold whitespace-nowrap">Deadline: {item.tanggal_jatuh_tempo}</p>
                        )}
                      </td>

                      {/* Payments completion indicator */}
                      <td className="p-4">
                        <div className="flex flex-col items-center justify-center min-w-[70px]">
                          <span className={`text-[10px] font-extrabold ${item.persentase_bayar >= 100 ? 'text-teal-600' : 'text-amber-600'}`}>
                            {item.persentase_bayar}%
                          </span>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                            <div 
                              className={`h-full transition-all ${item.persentase_bayar >= 100 ? 'bg-teal-500' : item.persentase_bayar >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                              style={{ width: `${Math.min(100, item.persentase_bayar)}%` }}
                            />
                          </div>
                          <span className="text-[9px] uppercase font-extrabold text-slate-400 mt-1">{item.status_pembayaran}</span>
                        </div>
                      </td>

                      {/* Risk rating and operations status */}
                      <td className="p-4 text-center">
                        <div className="flex flex-col gap-1 items-center justify-center">
                          {/* Risk Badge */}
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider leading-none text-center
                            ${item.status_risiko === 'Kritikal' ? 'bg-rose-100 text-rose-700 animate-pulse border border-rose-300' : 
                              item.status_risiko === 'Risiko Tinggi' ? 'bg-orange-100 text-orange-700' : 
                              item.status_risiko === 'Waspada' ? 'bg-amber-100 text-amber-700' : 
                              'bg-emerald-100 text-emerald-700'}`}
                          >
                            {item.status_risiko}
                          </span>
                          {/* Operational Status */}
                          <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Ops: {item.status_operasional}</span>
                        </div>
                      </td>

                      {/* Detailed Actions buttons */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setDetailModalItem(item)}
                            className="bg-slate-100 text-slate-700 hover:bg-slate-200 p-1.5 rounded-lg transition"
                            title="Lihat Rincian Teknis & Approval File"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          
                          {canWrite && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedItem(item);
                                  setFormData({ ...item });
                                  setShowFormModal(true);
                                }}
                                className="bg-teal-50 text-teal-700 hover:bg-teal-100 p-1.5 rounded-lg transition"
                                title="Edit Anggaran Vendor"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
                                className="bg-rose-50 text-rose-700 hover:bg-rose-100 p-1.5 rounded-lg transition"
                                title="Hapus Biaya"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
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

      {/* MODAL 1: ADD OR EDIT COST COMPONENT BUDGETS */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-white text-base">
                  {selectedItem ? 'Ubah Rincian Komponen Biaya' : 'Tambah Biaya Vendor Baru'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Menggunakan standard perhitungan kas ERP Umroh utama</p>
              </div>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* General details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nama Komponen *</label>
                  <input
                    type="text"
                    required
                    value={formData.nama_komponen || ''}
                    onChange={e => setFormData({ ...formData, nama_komponen: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="Contoh: HOTEL MADINAH PLAZA"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Kategori Komponen *</label>
                  <select
                    value={formData.kategori_komponen || 'Maskapai'}
                    onChange={e => setFormData({ ...formData, kategori_komponen: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 cursor-pointer"
                  >
                    {KATEGORI_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nama Vendor / Penyedia *</label>
                  <input
                    type="text"
                    required
                    value={formData.vendor_id || ''}
                    onChange={e => setFormData({ ...formData, vendor_id: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none-2"
                    placeholder="Contoh: PT Garuda Indonesia"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Kode Paket Keberangkatan</label>
                  <input
                    type="text"
                    value={formData.package_id || 'UMROH-VIP-AGUSTUS'}
                    onChange={e => setFormData({ ...formData, package_id: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Volume (Qty)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.qty || 1}
                    onChange={e => setFormData({ ...formData, qty: Number(e.target.value) || 0 })}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    value={formData.harga_satuan || 0}
                    onChange={e => setFormData({ ...formData, harga_satuan: Number(e.target.value) || 0 })}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Qty Terpakai (Realisasi)</label>
                  <input
                    type="number"
                    value={formData.qty_used || 0}
                    onChange={e => setFormData({ ...formData, qty_used: Number(e.target.value) || 0 })}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tanggal Jatuh Tempo (Deadline)</label>
                  <input
                    type="date"
                    value={formData.tanggal_jatuh_tempo || ''}
                    onChange={e => setFormData({ ...formData, tanggal_jatuh_tempo: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none-2"
                  />
                </div>
              </div>

              {/* PAYMENT TERMS */}
              <div className="bg-slate-55 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Perincian Angsuran Pembayaran (Settle Terms)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">DP (Uang Muka)</label>
                    <input
                      type="number"
                      value={formData.dp || 0}
                      onChange={e => setFormData({ ...formData, dp: Number(e.target.value) || 0 })}
                      className="w-full text-xs font-bold p-2 bg-white border border-slate-250 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Termin ke-1</label>
                    <input
                      type="number"
                      value={formData.termin_1 || 0}
                      onChange={e => setFormData({ ...formData, termin_1: Number(e.target.value) || 0 })}
                      className="w-full text-xs font-bold p-2 bg-white border border-slate-250 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Termin ke-2</label>
                    <input
                      type="number"
                      value={formData.termin_2 || 0}
                      onChange={e => setFormData({ ...formData, termin_2: Number(e.target.value) || 0 })}
                      className="w-full text-xs font-bold p-2 bg-white border border-slate-250 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Tagihan Pelunasan</label>
                    <input
                      type="number"
                      value={formData.pelunasan || 0}
                      onChange={e => setFormData({ ...formData, pelunasan: Number(e.target.value) || 0 })}
                      className="w-full text-xs font-bold p-2 bg-white border border-slate-250 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* CATEGORY SPECIFIC INPUT TRIGGERS */}
              {formData.kategori_komponen === 'Maskapai' && (
                <div className="bg-sky-50 p-4 rounded-xl border border-sky-200 space-y-3">
                  <h4 className="text-xs font-extrabold text-sky-800 uppercase tracking-tight flex items-center gap-1"><Plane className="w-4 h-4" /> MONITORING MASKAPAI DETAILS</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-sky-700 font-bold mb-0.5">Airline Name</label>
                      <input type="text" value={formData.airline_name || ''} onChange={e => setFormData({ ...formData, airline_name: e.target.value })} className="w-full text-xs p-2 bg-white border rounded" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-sky-700 font-bold mb-0.5">Flight Code</label>
                      <input type="text" value={formData.flight_code || ''} onChange={e => setFormData({ ...formData, flight_code: e.target.value })} className="w-full text-xs p-2 bg-white border rounded" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-sky-700 font-bold mb-0.5">Route</label>
                      <input type="text" value={formData.route || ''} onChange={e => setFormData({ ...formData, route: e.target.value })} className="w-full text-xs p-2 bg-white border rounded" />
                    </div>
                  </div>
                </div>
              )}

              {(formData.kategori_komponen === 'Hotel Madinah' || formData.kategori_komponen === 'Hotel Makkah') && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3">
                  <h4 className="text-xs font-extrabold text-amber-800 uppercase tracking-tight flex items-center gap-1"><Hotel className="w-4 h-4" /> MONITORING HOTEL RESERVATIONS</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-amber-700 font-bold mb-0.5">Nama Hotel</label>
                      <input type="text" value={formData.nama_hotel || ''} onChange={e => setFormData({ ...formData, nama_hotel: e.target.value })} className="w-full text-xs p-2 bg-white border rounded" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-amber-700 font-bold mb-0.5">Kota</label>
                      <input type="text" value={formData.kota || ''} onChange={e => setFormData({ ...formData, kota: e.target.value })} className="w-full text-xs p-2 bg-white border rounded" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-amber-700 font-bold mb-0.5">Jumlah Kamar</label>
                      <input type="number" value={formData.jumlah_room || 0} onChange={e => setFormData({ ...formData, jumlah_room: Number(e.target.value) || 0 })} className="w-full text-xs p-2 bg-white border rounded" />
                    </div>
                  </div>
                </div>
              )}

              {/* Avtur input section */}
              {formData.kategori_komponen === 'Avtur' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">⛽ MONITORING AVTUR PESAWAT</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold mb-0.5">Harga per Liter</label>
                      <input type="number" value={formData.harga_avtur || 0} onChange={e => setFormData({ ...formData, harga_avtur: Number(e.target.value) })} className="w-full text-xs p-2 bg-white border rounded" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-0.5">Volume Avtur (Ltr)</label>
                      <input type="number" value={formData.qty_avtur || 0} onChange={e => setFormData({ ...formData, qty_avtur: Number(e.target.value) })} className="w-full text-xs p-2 bg-white border rounded" />
                    </div>
                  </div>
                </div>
              )}

              {/* Operasional details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Status Operasional</label>
                  <select
                    value={formData.status_operasional || 'Pending'}
                    onChange={e => setFormData({ ...formData, status_operasional: e.target.value as CostComponent['status_operasional'] })}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer focus:outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="On Progress">On Progress</option>
                    <option value="Ready">Ready</option>
                    <option value="Cancel">Cancel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Catatan Tambahan</label>
                  <input
                    type="text"
                    value={formData.catatan || ''}
                    onChange={e => setFormData({ ...formData, catatan: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow"
                >
                  Simpan Biaya
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DETAIL METRIC / APPROVAL PANEL / FILES PREVIEW */}
      {detailModalItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">{detailModalItem.kategori_komponen}</span>
                <h3 className="font-extrabold text-white text-base mt-2">{detailModalItem.nama_komponen}</h3>
              </div>
              <button onClick={() => setDetailModalItem(null)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 text-slate-800 text-xs">
              {/* Top info and status indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl">
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Sisa Tagihan</span>
                  <p className="text-sm font-black text-rose-600">{formatCurrency(detailModalItem.total_biaya - detailModalItem.total_bayar)}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Total Bayar</span>
                  <p className="text-sm font-black text-teal-600">{formatCurrency(detailModalItem.total_bayar)}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Status Bayar</span>
                  <p className="text-xs font-black text-slate-800 uppercase mt-0.5">{detailModalItem.status_pembayaran}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Approval Anggaran</span>
                  <p className="text-xs font-black uppercase mt-0.5 select-none text-slate-900 tracking-tight flex items-center gap-1">
                    {detailModalItem.approval_status === 'Approved' ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> : <Clock className="w-3.5 h-3.5 text-amber-500" />} {detailModalItem.approval_status}
                  </p>
                </div>
              </div>

              {/* TECHNICAL MODULE METRIC REVIEWS */}
              {detailModalItem.kategori_komponen === 'Maskapai' && (
                <div className="border border-sky-100 rounded-xl p-4 bg-sky-50/40 space-y-2.5">
                  <h4 className="font-extrabold text-sky-900 tracking-wider text-[11px] uppercase flex items-center gap-1.5"><Plane className="w-4 h-4" /> Informasi Tambahan Maskapai</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-500 font-medium">Airline Name:</span>
                      <p className="font-bold text-slate-800">{detailModalItem.airline_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Flight Code:</span>
                      <p className="font-bold text-slate-800">{detailModalItem.flight_code || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Rute Penerbangan:</span>
                      <p className="font-bold text-slate-800">{detailModalItem.route || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Seat Block / Issued:</span>
                      <p className="font-bold text-slate-800">{detailModalItem.seat_block || 0} / {detailModalItem.issued_ticket || 0}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium font-bold">Biaya Avtur:</span>
                      <p className="font-bold text-slate-800">{formatCurrency(detailModalItem.avtur_cost || 0)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Airport Tax:</span>
                      <p className="font-bold text-slate-800">{formatCurrency(detailModalItem.airport_tax || 0)}</p>
                    </div>
                  </div>
                </div>
              )}

              {(detailModalItem.kategori_komponen === 'Hotel Madinah' || detailModalItem.kategori_komponen === 'Hotel Makkah') && (
                <div className="border border-amber-100 rounded-xl p-4 bg-amber-50/40 space-y-2.5">
                  <h4 className="font-extrabold text-amber-900 tracking-wider text-[11px] uppercase flex items-center gap-1.5"><Hotel className="w-4 h-4" /> Informasi Reservasi Kamar Hotel</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <span className="text-slate-500 font-medium">Nama Hotel:</span>
                      <p className="font-bold text-slate-800">{detailModalItem.nama_hotel || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Kota:</span>
                      <p className="font-bold text-slate-800">{detailModalItem.kota || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Rooms:</span>
                      <p className="font-bold text-slate-800">{detailModalItem.jumlah_room || 0} ({detailModalItem.jenis_room})</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Meals Included:</span>
                      <p className="font-bold text-slate-800">{detailModalItem.meal_include ? 'Ya & Fullboard' : 'Tidak'}</p>
                    </div>
                  </div>
                </div>
              )}

              {detailModalItem.kategori_komponen === 'Visa' && (
                <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/40 space-y-2.5">
                  <h4 className="font-extrabold text-indigo-900 tracking-wider text-[11px] uppercase">🛂 Progress Pengajuan Dokumen Visa</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <span className="text-slate-500 font-medium font-bold">Total Pengajuan:</span>
                      <p className="font-bold text-slate-800">{detailModalItem.jumlah_pengajuan || 0} pax</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium text-emerald-600">Approved:</span>
                      <p className="font-bold text-emerald-700">{detailModalItem.jumlah_approved || 0}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium text-amber-600">Pending:</span>
                      <p className="font-bold text-amber-700">{detailModalItem.jumlah_pending || 0}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium text-rose-600">Provider Visa:</span>
                      <p className="font-bold text-slate-800">{detailModalItem.provider_visa || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTRACT / INVOICE ATTACHMENTS SECTION */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-800 tracking-wider text-[11px] uppercase flex items-center gap-1">
                  <FileText className="w-4 h-4 text-teal-600" /> Dokumen Lampiran Kontrak & Bukti Transfer
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Invoice simulation box */}
                  <div className="p-3 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-slate-700 block">Dokumen Tagihan Vendor / Kontrak</span>
                      <p className="text-[10px] text-slate-500 mt-1 truncate">
                        {detailModalItem.invoice_file ? `📄 ${detailModalItem.invoice_file}` : 'Belum mengunggah file invoice.'}
                      </p>
                    </div>
                    {canUpload && (
                      <button
                        onClick={() => triggerSimulatedUpload('invoice_file', detailModalItem)}
                        className="bg-slate-100 mt-3 hover:bg-slate-200 text-slate-800 py-1 px-3 text-[10px] font-black uppercase rounded transition flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload File Invoice
                      </button>
                    )}
                  </div>

                  {/* Payment settlement simulation box */}
                  <div className="p-3 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-slate-700 block">Bukti Setoran Transfer (PDF)</span>
                      <p className="text-[10px] text-slate-500 mt-1 truncate">
                        {detailModalItem.bukti_transfer ? `📄 ${detailModalItem.bukti_transfer}` : 'Belum menyertakan slip pembayaran.'}
                      </p>
                    </div>
                    {canUpload && (
                      <button
                        onClick={() => triggerSimulatedUpload('bukti_transfer', detailModalItem)}
                        className="bg-indigo-50 mt-3 hover:bg-indigo-100 text-indigo-700 py-1 px-3 text-[10px] font-black uppercase rounded transition flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" /> Lampirkan Bukti
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* APPROVAL DECISION SYSTEM */}
              {canApprove && (
                <div className="bg-slate-50 hover:bg-slate-100 transition p-4 rounded-xl border border-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h5 className="font-extrabold text-slate-800 text-xs uppercase">Sistem Persetujuan Anggaran</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">Berikan persetujuan untuk pengeluaran anggaran vendor ini.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprovalChange(detailModalItem, 'Approved')}
                      className={`px-4 py-2 font-black text-[10px] uppercase rounded-lg transition border flex items-center gap-1
                        ${detailModalItem.approval_status === 'Approved' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white hover:bg-slate-50 text-emerald-700 border-slate-200'}`}
                    >
                      <Check className="w-3.5 h-3.5" /> Setuju
                    </button>
                    <button
                      onClick={() => handleApprovalChange(detailModalItem, 'Rejected')}
                      className={`px-4 py-2 font-black text-[10px] uppercase rounded-lg transition border flex items-center gap-1
                        ${detailModalItem.approval_status === 'Rejected' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white hover:bg-slate-50 text-rose-700 border-slate-200'}`}
                    >
                      <X className="w-3.5 h-3.5" /> Tolak Anggaran
                    </button>
                  </div>
                </div>
              )}

              {/* TIMELINE / MINI AUDIT REGISTER LOGS FOR COMPONENT */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800 tracking-wider text-[11px] uppercase">Timeline Audit & Aktivitas Komponen</h4>
                <div className="bg-slate-50 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 border border-slate-200/50 custom-scrollbar text-[10px] font-bold text-slate-700">
                  {auditLogs.filter(l => l.componentId === detailModalItem.id).length === 0 ? (
                    <p className="text-slate-400 font-medium text-center py-2">Belum ada aktivitas terekam untuk komponen ini.</p>
                  ) : (
                    auditLogs.filter(l => l.componentId === detailModalItem.id).map(log => (
                      <div key={log.id} className="border-l-2 border-teal-500 pl-2.5 space-y-0.5 leading-relaxed">
                        <div className="flex justify-between items-center text-[9px] text-slate-500">
                          <span>{log.activity}</span>
                          <span>{new Date(log.timestamp).toLocaleString('id-ID')}</span>
                        </div>
                        <p className="font-medium text-slate-800">{log.details}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase italic">Operator: {log.user}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setDetailModalItem(null)}
                className="bg-slate-900 border font-extrabold text-white hover:bg-slate-800 text-xs py-2 px-5 rounded-lg"
              >
                Selesai / Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
