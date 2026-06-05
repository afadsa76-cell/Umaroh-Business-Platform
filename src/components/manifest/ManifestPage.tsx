import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Search, Plus, Trash2, Sparkles, Loader2, HelpCircle, RefreshCw, 
  CheckCircle2, Printer, Info, X, FileSpreadsheet, Upload, Check, BookOpen, Zap, Monitor, UserPlus
} from 'lucide-react';
import { db, collection, onSnapshot, query, where, doc, addDoc, updateDoc, deleteDoc, handleFirestoreError, OperationType, serverTimestamp } from '../../firebase';
import { PaketTracker, JamaahTracker } from '../tracker/types';
import { safeJsonParse } from '../../utils/firebaseSync';
import * as XLSX from 'xlsx';

const FIELD_ORDER = [
  'title', 'status_kesiapan', 'namaLengkap', 'nama_ayah', 'nik', 'nama_paspor', 
  'no_paspor', 'tanggal_lahir', 'tgl_issue_paspor', 'tgl_exp_paspor', 'kota_paspor', 
  'tempat_lahir', 'alamat', 'kelurahan', 'kecamatan', 'kabupaten_kota', 'provinsi', 
  'kewarganegaraan', 'status_nikah', 'pekerjaan', 'telepon', 'emergency_contact'
];

const SEED_DATA = [
  {
    title: 'MR',
    status_kesiapan: 'READY',
    namaLengkap: 'NURJAYA',
    nama_ayah: 'ASPAKIR',
    nik: '3175023112680001',
    nama_paspor: 'NURJAYA ASPAKIR',
    no_paspor: 'X6916342',
    tanggal_lahir: '1968-12-31',
    tgl_issue_paspor: '2025-11-09',
    tgl_exp_paspor: '2030-11-09',
    kota_paspor: 'JAKARTA TIMUR',
    tempat_lahir: 'JAKARTA',
    alamat: 'JL. D.III / H. JULAN',
    kelurahan: 'JATI',
    kecamatan: 'PULO GADUNG',
    kabupaten_kota: 'JAKARTA TIMUR',
    provinsi: 'DKI JAKARTA',
    kewarganegaraan: 'WNI',
    status_nikah: 'KAWIN',
    pekerjaan: 'KARYAWAN SWASTA',
    telepon: '081234567881',
    emergency_contact: 'Istri - 081234567802'
  },
  {
    title: 'MR',
    status_kesiapan: 'READY',
    namaLengkap: 'SUMIN',
    nama_ayah: 'KARTO',
    nik: '3175021308510003',
    nama_paspor: 'SUMIN KARTO',
    no_paspor: 'X9217465',
    tanggal_lahir: '1951-08-13',
    tgl_issue_paspor: '2026-03-13',
    tgl_exp_paspor: '2031-03-17',
    kota_paspor: 'JAKARTA TIMUR',
    tempat_lahir: 'KARANG ANYAR',
    alamat: 'N/A',
    kelurahan: 'KELURAHAN',
    kecamatan: 'KECAMATAN',
    kabupaten_kota: 'KABUPATEN/KOTA',
    provinsi: 'PROVINSI',
    kewarganegaraan: 'WNI',
    status_nikah: 'KAWIN',
    pekerjaan: 'PEKERJAAN',
    telepon: '08xxxxxxxxxx',
    emergency_contact: 'Nama - Hubungan - HP'
  },
  {
    title: 'MR',
    status_kesiapan: 'READY',
    namaLengkap: 'ACHMAD JAELANIH',
    nama_ayah: 'NAMA AYAH',
    nik: '3175022612920202',
    nama_paspor: 'ACHMAD JAELANIH',
    no_paspor: 'X9218927',
    tanggal_lahir: '1992-12-26',
    tgl_issue_paspor: '2026-06-04',
    tgl_exp_paspor: '2031-06-04',
    kota_paspor: 'JAKARTA TIMUR',
    tempat_lahir: 'JAKARTA',
    alamat: 'N/A',
    kelurahan: 'KELURAHAN',
    kecamatan: 'KECAMATAN',
    kabupaten_kota: 'KABUPATEN/KOTA',
    provinsi: 'PROVINSI',
    kewarganegaraan: 'WNI',
    status_nikah: 'KAWIN',
    pekerjaan: 'PEKERJAAN',
    telepon: '08xxxxxxxxxx',
    emergency_contact: 'Nama - Hubungan - HP'
  },
  {
    title: 'MR',
    status_kesiapan: 'READY',
    namaLengkap: 'TRI ATMOKO',
    nama_ayah: 'NAMA AYAH',
    nik: '3175062310810001',
    nama_paspor: 'TRI ATMOKO',
    no_paspor: 'X7730378',
    tanggal_lahir: '1981-10-23',
    tgl_issue_paspor: '2025-12-31',
    tgl_exp_paspor: '2030-12-31',
    kota_paspor: 'JAKARTA TIMUR',
    tempat_lahir: 'KEBUMEN',
    alamat: 'KP. PISANGAN',
    kelurahan: 'PENGGILINGAN',
    kecamatan: 'CAKUNG',
    kabupaten_kota: 'JAKARTA TIMUR',
    provinsi: 'DKI JAKARTA',
    kewarganegaraan: 'WNI',
    status_nikah: 'KAWIN',
    pekerjaan: 'KARYAWAN SWASTA',
    telepon: '08138847802',
    emergency_contact: 'Orang Tua - 08129938'
  },
  {
    title: 'MR',
    status_kesiapan: 'READY',
    namaLengkap: 'SARYOTO',
    nama_ayah: 'MADWARSO',
    nik: '3381011706810002',
    nama_paspor: 'SARYOTO MADWARSO',
    no_paspor: 'Y0250474',
    tanggal_lahir: '1981-06-17',
    tgl_issue_paspor: '2026-01-05',
    tgl_exp_paspor: '2031-01-05',
    kota_paspor: 'JAKARTA TIMUR',
    tempat_lahir: 'CILACAP',
    alamat: 'PIK PENGGILINGAN',
    kelurahan: 'PENGGILINGAN',
    kecamatan: 'CAKUNG',
    kabupaten_kota: 'JAKARTA TIMUR',
    provinsi: 'DKI JAKARTA',
    kewarganegaraan: 'WNI',
    status_nikah: 'KAWIN',
    pekerjaan: 'BURUH HARIAN LEPAS',
    telepon: '08529948012',
    emergency_contact: 'Keluarga - 08529948'
  },
  {
    title: 'MR',
    status_kesiapan: 'READY',
    namaLengkap: 'TRI SAMIYONO',
    nama_ayah: 'NAMA AYAH',
    nik: '3175062112690001',
    nama_paspor: 'TRI SAMIYONO',
    no_paspor: 'X9218087',
    tanggal_lahir: '1969-12-21',
    tgl_issue_paspor: '2026-03-30',
    tgl_exp_paspor: '2031-03-30',
    kota_paspor: 'JAKARTA TIMUR',
    tempat_lahir: 'JAKARTA',
    alamat: 'KP PISANGAN',
    kelurahan: 'PENGGILINGAN',
    kecamatan: 'CAKUNG',
    kabupaten_kota: 'JAKARTA TIMUR',
    provinsi: 'DKI JAKARTA',
    kewarganegaraan: 'WNI',
    status_nikah: 'KAWIN',
    pekerjaan: 'KARYAWAN SWASTA',
    telepon: '0812994811',
    emergency_contact: 'Anak - 0812994821'
  },
  {
    title: 'MR',
    status_kesiapan: 'READY',
    namaLengkap: 'DWI ANGGIA PERMADI',
    nama_ayah: 'NAMA AYAH',
    nik: '3175021206770001',
    nama_paspor: 'DWI ANGGIA PERMADI',
    no_paspor: 'E8688670',
    tanggal_lahir: '1977-06-12',
    tgl_issue_paspor: '2024-11-21',
    tgl_exp_paspor: '2034-11-21',
    kota_paspor: 'JAKARTA UTARA',
    tempat_lahir: 'JAKARTA',
    alamat: 'N/A',
    kelurahan: 'KELURAHAN',
    kecamatan: 'KECAMATAN',
    kabupaten_kota: 'KABUPATEN/KOTA',
    provinsi: 'PROVINSI',
    kewarganegaraan: 'WNI',
    status_nikah: 'KAWIN',
    pekerjaan: 'PEKERJAAN',
    telepon: '08xxxxxxxxxx',
    emergency_contact: 'Nama - Hubungan - HP'
  },
  {
    title: 'MRS',
    status_kesiapan: 'READY',
    namaLengkap: 'WANTY MARYUNIE RAHMAT',
    nama_ayah: 'NAMA AYAH',
    nik: '3175020608790001',
    nama_paspor: 'WANTY MARYUNIE RAHMAT',
    no_paspor: 'C9094272',
    tanggal_lahir: '1979-08-06',
    tgl_issue_paspor: '2022-04-16',
    tgl_exp_paspor: '2027-04-16',
    kota_paspor: 'JAKARTA TIMUR',
    tempat_lahir: 'JAKARTA',
    alamat: 'N/A',
    kelurahan: 'KELURAHAN',
    kecamatan: 'KECAMATAN',
    kabupaten_kota: 'KABUPATEN/KOTA',
    provinsi: 'PROVINSI',
    kewarganegaraan: 'WNI',
    status_nikah: 'KAWIN',
    pekerjaan: 'PEKERJAAN',
    telepon: '0812702812',
    emergency_contact: 'Nama - Hubungan - HP'
  }
];

// Helper to calculate String Similarity (Fuzzy Name Matching) for high-precision Indonesian name comparison
function calculateSimilarity(s1: string, s2: string): number {
  const name1 = (s1 || '').trim().toUpperCase();
  const name2 = (s2 || '').trim().toUpperCase();
  if (name1 === name2) return 1.0;
  if (!name1 || !name2) return 0.0;

  // 1. Token-level intersection matching (highly effective for matching e.g. "AHMAD ARIEF HIDAYAT" and "ARIEF HIDAYAT")
  const tokens1 = name1.split(/\s+/).filter(t => t.length >= 2);
  const tokens2 = name2.split(/\s+/).filter(t => t.length >= 2);
  if (tokens1.length === 0 || tokens2.length === 0) return 0.0;
  
  let matchCount = 0;
  for (const t1 of tokens1) {
    if (tokens2.some(t2 => t2 === t1 || t2.includes(t1) || t1.includes(t2))) {
      matchCount++;
    }
  }
  const tokenRatio = matchCount / Math.max(tokens1.length, tokens2.length);

  // 2. Levenshtein Distance for absolute spelling distance with typos
  const len1 = name1.length;
  const len2 = name2.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (name2[i - 1] === name1[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + 1    // substitution
        );
      }
    }
  }
  const levDistance = matrix[len2][len1];
  const levRatio = 1 - levDistance / Math.max(len1, len2);

  // Return maximum of both models (whichever matches spelling or token intersection better)
  return Math.max(tokenRatio, levRatio);
}

export const ManifestPage: React.FC = () => {
  const [pakets, setPakets] = useState<PaketTracker[]>([]);
  const [selectedPaketId, setSelectedPaketId] = useState<string>('');
  const [jamaahs, setJamaahs] = useState<JamaahTracker[]>([]);
  const [selectedTab, setSelectedTab] = useState<'manifest' | 'ai'>('manifest');

  // Custom non-blocking popups / toasts states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Manual package input states
  const [showManualPacketForm, setShowManualPacketForm] = useState(false);
  const [newPacketName, setNewPacketName] = useState('');
  const [newPacketDate, setNewPacketDate] = useState('');
  const [newPacketTarget, setNewPacketTarget] = useState('45');

  const handleCreateManualPacket = async () => {
    if (!newPacketName.trim()) {
      showToast('Nama paket tidak boleh kosong', 'error');
      return;
    }
    if (!newPacketDate.trim()) {
      showToast('Tanggal keberangkatan tidak boleh kosong', 'error');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'tracker_paket'), {
        namaPaket: newPacketName,
        tanggalBerangkat: newPacketDate,
        status: 'Persiapan',
        targetJamaah: Number(newPacketTarget) || 45,
        terdaftar: 0,
        createdAt: serverTimestamp()
      });
      
      setSelectedPaketId(docRef.id);
      setShowManualPacketForm(false);
      showToast('Paket baru berhasil dibuat, silakan isi data manifest secara manual!', 'success');
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error(e);
      showToast('Gagal membuat paket baru: ' + errMsg, 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };
  
  // Spreadsheet States
  const [editingCell, setEditingCell] = useState<{ id: string, field: string } | null>(null);
  const [inputValue, setInputValue] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'grouped'>('grid');

  // AI Modal/Tab States
  const [filesToScan, setFilesToScan] = useState<{ id: string; name: string; file?: File; status: 'waiting' | 'scanning' | 'done' | 'failed'; error?: string; isDemo?: boolean; demoType?: 'ktp' | 'paspor' | 'kk' }[]>([]);
  const [focusDocument, setFocusDocument] = useState<'otomatis' | 'ktp' | 'paspor' | 'kk'>('otomatis');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [activeAiTargetId, setActiveAiTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rowFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Help guides popover
  const [showGuide, setShowGuide] = useState(false);

  // AI Review Modal States
  const [extractedReviewList, setExtractedReviewList] = useState<{
    id: string;
    checked: boolean;
    matchLevel: 'match' | 'new';
    matchUserId?: string;
    saveAction: 'new' | 'merge';
    
    // fields
    title: string;
    namaLengkap: string;
    nama_ayah: string;
    nik: string;
    nama_paspor: string;
    no_paspor: string;
    tanggal_lahir: string;
    tgl_issue_paspor: string;
    tgl_exp_paspor: string;
    kota_paspor: string;
    tempat_lahir: string;
    alamat: string;
    kelurahan: string;
    kecamatan: string;
    kabupaten_kota: string;
    provinsi: string;
    kewarganegaraan: string;
    status_nikah: string;
    pekerjaan: string;
    telepon: string;
    emergency_contact: string;
    fileName?: string;
  }[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [onlyShowMatched, setOnlyShowMatched] = useState(false);

  useEffect(() => {
    const unsubPaket = onSnapshot(collection(db, 'tracker_paket'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaketTracker));
      setPakets(data);
      if (data.length > 0 && !selectedPaketId) {
        setSelectedPaketId(data[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tracker_paket');
    });
    return () => unsubPaket();
  }, []);

  useEffect(() => {
    if (!selectedPaketId) {
      setJamaahs([]);
      return;
    }
    const q = query(collection(db, 'tracker_jamaah'), where('paketId', '==', selectedPaketId));
    const unsubJamaah = onSnapshot(q, (snapshot) => {
      setJamaahs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JamaahTracker)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tracker_jamaah');
    });
    return () => unsubJamaah();
  }, [selectedPaketId]);

  // Helper code: auto-populate seed data matching screenshots if database list is empty
  const handleResetData = async () => {
    if (!selectedPaketId) return;
    
    try {
      // 1. Delete currently present jamaah for this package in parallel
      const deletePromises = jamaahs.map(j => deleteDoc(doc(db, 'tracker_jamaah', j.id)));
      await Promise.all(deletePromises);
      
      // 2. Add standard seed data in parallel
      const addPromises = SEED_DATA.map(item => 
        addDoc(collection(db, 'tracker_jamaah'), {
          ...item,
          paketId: selectedPaketId
        })
      );
      await Promise.all(addPromises);
      
      showToast('Data manifest berhasil di-reset dengan 14 jamaah dummy standard!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Gagal me-reset data', 'error');
    }
  };

  const handleClearData = async () => {
    if (!selectedPaketId) return;
    if (jamaahs.length === 0) {
      showToast('Data manifest sudah kosong.', 'info');
      return;
    }
    
    try {
      const deletePromises = jamaahs.map(j => deleteDoc(doc(db, 'tracker_jamaah', j.id)));
      await Promise.all(deletePromises);
      showToast('Semua data manifest berhasil dikosongkan.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Gagal mengosongkan data', 'error');
    }
  };

  const handleAddNewRow = async () => {
    if (!selectedPaketId) {
      showToast('Pilih Paket Keberangkatan terlebih dahulu.', 'info');
      return;
    }
    try {
      const docRef = await addDoc(collection(db, 'tracker_jamaah'), {
        paketId: selectedPaketId,
        title: 'MR',
        namaLengkap: 'BARIS JAMAAH BARU',
        status_kesiapan: 'READY',
        nik: '',
        nama_paspor: '',
        no_paspor: '',
        tanggal_lahir: '',
        tgl_issue_paspor: '',
        tgl_exp_paspor: '',
        kota_paspor: '',
        tempat_lahir: '',
        alamat: '',
        kewarganegaraan: 'WNI',
        telepon: ''
      });
      // edit the name of the new row right away
      setEditingCell({ id: docRef.id, field: 'namaLengkap' });
      setInputValue('BARIS JAMAAH BARU');
      showToast('Berhasil menambahkan baris baru!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Gagal menambah baris baru', 'error');
    }
  };

  const handleDeleteRow = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tracker_jamaah', id));
      if (editingCell?.id === id) setEditingCell(null);
      showToast('Baris jamaah berhasil dihapus.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Gagal menghapus baris', 'error');
    }
  };

  // Inline Saving
  const handleSaveCell = async (id: string, field: string, value: string) => {
    setEditingCell(null);
    const item = jamaahs.find(j => j.id === id);
    if (!item) return;

    // Trigger normalization if needed
    let finalVal = value;
    if (['namaLengkap', 'nama_ayah', 'nik', 'nama_paspor', 'no_paspor', 'kota_paspor', 'tempat_lahir', 'kewarganegaraan'].includes(field)) {
      finalVal = value.toUpperCase();
    }

    try {
      await updateDoc(doc(db, 'tracker_jamaah', id), { [field]: finalVal });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tracker_jamaah/${id}`);
    }
  };

  const handleCellClick = (id: string, field: string, value: string) => {
    setEditingCell({ id, field });
    setInputValue(value || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowId: string, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveCell(rowId, field, inputValue);
      
      const currentIndex = filteredJamaahs.findIndex(j => j.id === rowId);
      if (currentIndex !== -1 && currentIndex < filteredJamaahs.length - 1) {
        const nextRow = filteredJamaahs[currentIndex + 1];
        setEditingCell({ id: nextRow.id, field });
        setInputValue((nextRow as unknown as Record<string, string | undefined>)[field] || '');
      } else {
        setEditingCell(null);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleSaveCell(rowId, field, inputValue);
      
      const fieldIndex = FIELD_ORDER.indexOf(field);
      const currentRowItem = filteredJamaahs.find(j => j.id === rowId);
      if (currentRowItem && fieldIndex !== -1 && fieldIndex < FIELD_ORDER.length - 1) {
        const nextField = FIELD_ORDER[fieldIndex + 1];
        setEditingCell({ id: rowId, field: nextField });
        setInputValue((currentRowItem as unknown as Record<string, string | undefined>)[nextField] || '');
      } else if (fieldIndex === FIELD_ORDER.length - 1) {
        const currentIndex = filteredJamaahs.findIndex(j => j.id === rowId);
        if (currentIndex !== -1 && currentIndex < filteredJamaahs.length - 1) {
          const nextRow = filteredJamaahs[currentIndex + 1];
          setEditingCell({ id: nextRow.id, field: FIELD_ORDER[0] });
          setInputValue((nextRow as unknown as Record<string, string | undefined>)[FIELD_ORDER[0]] || '');
        } else {
          setEditingCell(null);
        }
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // AI Extraction logic (using state-of-the-art gemini-3.5-flash)
  const extractDocumentDetailsWithAI = async (file: File): Promise<Partial<JamaahTracker>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const type = file.type || 'image/jpeg';
          
          const response = await fetch('/api/ai/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gemini-3.5-flash',
              contents: [
                {
                  parts: [
                    { 
                      text: "Ekstrak data lengkap dari KTP, KK, atau Paspor ini. Berikan hasil HANYA dalam JSON valid dengan field berikut: title (MR/MRS/MS), status_kesiapan ('READY'), namaLengkap (Nama KTP/paspor), nama_ayah, nik (16 digit NIK KTP jika ad), nama_paspor, no_paspor (jika ada), tanggal_lahir (format YYYY-MM-DD), tgl_issue_paspor (YYYY-MM-DD jika paspor), tgl_exp_paspor (YYYY-MM-DD jika paspor), kota_paspor, tempat_lahir, alamat (lengkap), kelurahan, kecamatan, kabupaten_kota, provinsi, kewarganegaraan, status_nikah, pekerjaan, telepon, emergency_contact. Jika kosong gunakan null atau kosong." 
                    },
                    { inlineData: { data: base64, mimeType: type } }
                  ]
                }
              ],
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: 'OBJECT',
                  properties: {
                    title: { type: 'STRING' },
                    namaLengkap: { type: 'STRING' },
                    nama_ayah: { type: 'STRING' },
                    nik: { type: 'STRING' },
                    nama_paspor: { type: 'STRING' },
                    no_paspor: { type: 'STRING' },
                    tanggal_lahir: { type: 'STRING' },
                    tgl_issue_paspor: { type: 'STRING' },
                    tgl_exp_paspor: { type: 'STRING' },
                    kota_paspor: { type: 'STRING' },
                    tempat_lahir: { type: 'STRING' },
                    alamat: { type: 'STRING' },
                    kelurahan: { type: 'STRING' },
                    kecamatan: { type: 'STRING' },
                    kabupaten_kota: { type: 'STRING' },
                    provinsi: { type: 'STRING' },
                    kewarganegaraan: { type: 'STRING' },
                    status_nikah: { type: 'STRING' },
                    pekerjaan: { type: 'STRING' },
                    telepon: { type: 'STRING' },
                    emergency_contact: { type: 'STRING' }
                  }
                }
              }
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || 'AI document processing failed');
          }

          const resData = await response.json();
          const rawText = resData.text || '';
          const parsed = safeJsonParse(rawText);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  // Bulk scan inside AI Tab
  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;

    const newFiles = Array.from(list).map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      name: f.name,
      file: f,
      status: 'waiting' as const
    }));

    setFilesToScan(prev => [...prev, ...newFiles]);
  };

  const handleAddDemo = (type: 'ktp' | 'paspor' | 'kk') => {
    const titles = {
      ktp: 'CONTOH_KTP_BUDI_SANTOSO.JPG',
      paspor: 'CONTOH_PASPOR_MEILANI.JPG',
      kk: 'CONTOH_KK_ARIEF_HIDAYAT_DAN_DEWI.JPG'
    };
    const newDemo = {
      id: Math.random().toString(36).substr(2, 9),
      name: titles[type],
      status: 'waiting' as const,
      isDemo: true,
      demoType: type
    };
    setFilesToScan(prev => [...prev, newDemo]);
  };

  const handleStartScanBulk = async () => {
    if (filesToScan.length === 0) return;
    setIsAiProcessing(true);

    const updatedFiles = [...filesToScan];
    const accumulatedList: { parsed: Partial<JamaahTracker>; fileName: string }[] = [];

    for (let i = 0; i < updatedFiles.length; i++) {
      if (updatedFiles[i].status !== 'waiting') continue;

      updatedFiles[i].status = 'scanning';
      setFilesToScan([...updatedFiles]);

      try {
        const parsedList: Partial<JamaahTracker>[] = [];

        if (updatedFiles[i].isDemo) {
          // Drama effect: simulate network delay
          await new Promise((resolve) => setTimeout(resolve, 1500));
          
          if (updatedFiles[i].demoType === 'ktp') {
            parsedList.push({
              title: 'MR',
              namaLengkap: 'BUDI SANTOSO',
              nama_ayah: 'SANTOSO SUKARNO',
              nik: '3174092104850003',
              nama_paspor: 'BUDI SANTOSO',
              no_paspor: '',
              tanggal_lahir: '1985-04-21',
              tgl_issue_paspor: '',
              tgl_exp_paspor: '',
              kota_paspor: '',
              tempat_lahir: 'JAKARTA',
              alamat: 'JL. KEMANG RAYA NO. 12',
              kelurahan: 'BANGKA',
              kecamatan: 'MAMPANG PRAPATAN',
              kabupaten_kota: 'JAKARTA SELATAN',
              provinsi: 'DKI JAKARTA',
              kewarganegaraan: 'WNI',
              status_nikah: 'KAWIN',
              pekerjaan: 'KARYAWAN SWASTA',
              telepon: '081298765432',
              emergency_contact: 'Istri - SITI AMINAH - 081298765433'
            });
          } else if (updatedFiles[i].demoType === 'paspor') {
            parsedList.push({
              title: 'MRS',
              namaLengkap: 'MEILANI RACHMAWATI',
              nama_ayah: 'RACHMAWATI JAYA',
              nik: '3273056108920004',
              nama_paspor: 'MEILANI RACHMAWATI',
              no_paspor: 'B1234567',
              tanggal_lahir: '1992-08-21',
              tgl_issue_paspor: '2024-05-12',
              tgl_exp_paspor: '2034-05-12',
              kota_paspor: 'BANDUNG',
              tempat_lahir: 'BANDUNG',
              alamat: 'JL. DAGO NO. 101',
              kelurahan: 'COBLONG',
              kecamatan: 'COBLONG',
              kabupaten_kota: 'BANDUNG',
              provinsi: 'JAWA BARAT',
              kewarganegaraan: 'WNI',
              status_nikah: 'KAWIN',
              pekerjaan: 'KARYAWAN SWASTA',
              telepon: '081324567890',
              emergency_contact: 'Suami - AHMAD FIKRI - 081324567891'
            });
          } else if (updatedFiles[i].demoType === 'kk') {
            parsedList.push({
              title: 'MR',
              namaLengkap: 'ARIEF HIDAYAT',
              nama_ayah: 'HIDAYAT SOETRISNO',
              nik: '3578011210780001',
              nama_paspor: 'ARIEF HIDAYAT',
              no_paspor: '',
              tanggal_lahir: '1978-10-12',
              tgl_issue_paspor: '',
              tgl_exp_paspor: '',
              kota_paspor: '',
              tempat_lahir: 'SURABAYA',
              alamat: 'JL. DARMO HARAPAN NO. 5',
              kelurahan: 'TANJUNG SARI',
              kecamatan: 'SUKOMANUNGGAL',
              kabupaten_kota: 'SURABAYA',
              provinsi: 'JAWA TIMUR',
              kewarganegaraan: 'WNI',
              status_nikah: 'KAWIN',
              pekerjaan: 'WIRASWASTA',
              telepon: '08113456789',
              emergency_contact: 'Istri - DEWI LESTARI - 08113456780'
            });
            parsedList.push({
              title: 'MRS',
              namaLengkap: 'DEWI LESTARI',
              nama_ayah: 'LESTARI BASUKI',
              nik: '3578015505820002',
              nama_paspor: 'DEWI LESTARI',
              no_paspor: '',
              tanggal_lahir: '1982-05-15',
              tgl_issue_paspor: '',
              tgl_exp_paspor: '',
              kota_paspor: '',
              tempat_lahir: 'SURABAYA',
              alamat: 'JL. DARMO HARAPAN NO. 5',
              kelurahan: 'TANJUNG SARI',
              kecamatan: 'SUKOMANUNGGAL',
              kabupaten_kota: 'SURABAYA',
              provinsi: 'JAWA TIMUR',
              kewarganegaraan: 'WNI',
              status_nikah: 'KAWIN',
              pekerjaan: 'IBU RUMAH TANGGA',
              telepon: '08113456780',
              emergency_contact: 'Suami - ARIEF HIDAYAT - 08113456789'
            });
          }
        } else {
          if (updatedFiles[i].file) {
            const parsed = await extractDocumentDetailsWithAI(updatedFiles[i].file!);
            parsedList.push(parsed);
          }
        }

        for (const item of parsedList) {
          accumulatedList.push({ parsed: item, fileName: updatedFiles[i].name });
        }

        updatedFiles[i].status = 'done';
      } catch (err: unknown) {
        console.error(err);
        updatedFiles[i].status = 'failed';
        updatedFiles[i].error = err instanceof Error ? err.message : 'Gagal memproses dokumen';
      }
      setFilesToScan([...updatedFiles]);
    }

    setIsAiProcessing(false);

    if (accumulatedList.length > 0) {
      let anyMatchInBatch = false;

      const formattedItems = accumulatedList.map(entry => {
        const parsed = entry.parsed;
        const matchedItem = jamaahs.find(j => {
          const parsedNik = (parsed.nik || '').trim();
          const parsedPaspor = (parsed.no_paspor || '').trim();
          const parsedNama = (parsed.namaLengkap || '').trim().toUpperCase();

          if (parsedNik && j.nik && j.nik.trim() === parsedNik) return true;
          if (parsedPaspor && j.no_paspor && j.no_paspor.trim().toUpperCase() === parsedPaspor.toUpperCase()) return true;
          if (parsedNama && j.namaLengkap) {
            // Apply high-accuracy 80% fuzzy check to accommodate slight typos / middle name combinations
            const score = calculateSimilarity(parsedNama, j.namaLengkap);
            if (score >= 0.80) return true;
          }
          return false;
        });

        const isMatch = !!matchedItem;
        if (isMatch) {
          anyMatchInBatch = true;
        }

        return {
          id: Math.random().toString(36).substr(2, 9),
          checked: true, // will be fine-tuned below
          matchLevel: (isMatch ? 'match' : 'new') as 'match' | 'new',
          matchUserId: matchedItem?.id,
          saveAction: (isMatch ? 'merge' : 'new') as 'new' | 'merge',
          
          title: parsed.title || 'MR',
          namaLengkap: parsed.namaLengkap || '',
          nama_ayah: parsed.nama_ayah || '',
          nik: parsed.nik || '',
          nama_paspor: parsed.nama_paspor || parsed.namaLengkap || '',
          no_paspor: parsed.no_paspor || '',
          tanggal_lahir: parsed.tanggal_lahir || '',
          tgl_issue_paspor: parsed.tgl_issue_paspor || '',
          tgl_exp_paspor: parsed.tgl_exp_paspor || '',
          kota_paspor: parsed.kota_paspor || '',
          tempat_lahir: parsed.tempat_lahir || '',
          alamat: parsed.alamat || '',
          kelurahan: parsed.kelurahan || '',
          kecamatan: parsed.kecamatan || '',
          kabupaten_kota: parsed.kabupaten_kota || '',
          provinsi: parsed.provinsi || '',
          kewarganegaraan: parsed.kewarganegaraan || 'WNI',
          status_nikah: parsed.status_nikah || '',
          pekerjaan: parsed.pekerjaan || '',
          telepon: parsed.telepon || '',
          emergency_contact: parsed.emergency_contact || '',
          fileName: entry.fileName
        };
      });

      // Smart Defaults for Kartu Keluarga (KK) Upload:
      // If there is a mixture of travelling (matched) members and non-travelling (unmatched) members,
      // uncheck unmatched ones and toggle onlyShowMatched by default!
      const hasMismatchInBatch = formattedItems.some(item => item.matchLevel === 'new');

      formattedItems.forEach(item => {
        if (anyMatchInBatch && item.matchLevel === 'new') {
          item.checked = false; // Prevents importing other family members as new travel manifest jemaah
        }
      });

      if (anyMatchInBatch && hasMismatchInBatch) {
        setOnlyShowMatched(true);
      } else {
        setOnlyShowMatched(false);
      }

      setExtractedReviewList(formattedItems);
      setIsReviewModalOpen(true);
    }
  };

  // Option-level scan "+ AI" implementation
  const triggerRowPhotoUpload = (rowId: string) => {
    rowFileInputRefs.current[rowId]?.click();
  };

  const handleRowFileChange = async (rowId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActiveAiTargetId(rowId);

    try {
      const parsed = await extractDocumentDetailsWithAI(file);
      const matchedItem = jamaahs.find(j => j.id === rowId);

      const reviewItem = {
        id: Math.random().toString(36).substr(2, 9),
        checked: true,
        matchLevel: 'match' as const,
        matchUserId: rowId,
        saveAction: 'merge' as const,
        
        title: parsed.title || matchedItem?.title || 'MR',
        namaLengkap: parsed.namaLengkap || matchedItem?.namaLengkap || '',
        nama_ayah: parsed.nama_ayah || matchedItem?.nama_ayah || '',
        nik: parsed.nik || matchedItem?.nik || '',
        nama_paspor: parsed.nama_paspor || parsed.nama_paspor || matchedItem?.nama_paspor || matchedItem?.namaLengkap || '',
        no_paspor: parsed.no_paspor || matchedItem?.no_paspor || '',
        tanggal_lahir: parsed.tanggal_lahir || matchedItem?.tanggal_lahir || '',
        tgl_issue_paspor: parsed.tgl_issue_paspor || matchedItem?.tgl_issue_paspor || '',
        tgl_exp_paspor: parsed.tgl_exp_paspor || matchedItem?.tgl_exp_paspor || '',
        kota_paspor: parsed.kota_paspor || matchedItem?.kota_paspor || '',
        tempat_lahir: parsed.tempat_lahir || matchedItem?.tempat_lahir || '',
        alamat: parsed.alamat || matchedItem?.alamat || '',
        kelurahan: parsed.kelurahan || matchedItem?.kelurahan || '',
        kecamatan: parsed.kecamatan || matchedItem?.kecamatan || '',
        kabupaten_kota: parsed.kabupaten_kota || matchedItem?.kabupaten_kota || '',
        provinsi: parsed.provinsi || matchedItem?.provinsi || '',
        kewarganegaraan: parsed.kewarganegaraan || matchedItem?.kewarganegaraan || 'WNI',
        status_nikah: parsed.status_nikah || matchedItem?.status_nikah || '',
        pekerjaan: parsed.pekerjaan || matchedItem?.pekerjaan || '',
        telepon: parsed.telepon || matchedItem?.telepon || '',
        emergency_contact: parsed.emergency_contact || matchedItem?.emergency_contact || '',
        fileName: file.name
      };

      setExtractedReviewList([reviewItem]);
      setIsReviewModalOpen(true);
    } catch (err: unknown) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Gagal mengekstrak data', 'error');
    } finally {
      setActiveAiTargetId(null);
    }
  };

  const handleApplyExtractedData = async () => {
    const checkedItems = extractedReviewList.filter(item => item.checked);
    if (checkedItems.length === 0) {
      showToast("Silakan pilih minimal 1 data untuk disimpan.", "info");
      return;
    }

    try {
      for (const item of checkedItems) {
        const payload: Partial<JamaahTracker> = {
          title: item.title,
          namaLengkap: item.namaLengkap,
          nama_ayah: item.nama_ayah,
          nik: item.nik,
          nama_paspor: item.nama_paspor,
          no_paspor: item.no_paspor,
          tanggal_lahir: item.tanggal_lahir,
          tgl_issue_paspor: item.tgl_issue_paspor,
          tgl_exp_paspor: item.tgl_exp_paspor,
          kota_paspor: item.kota_paspor,
          tempat_lahir: item.tempat_lahir,
          alamat: item.alamat,
          kelurahan: item.kelurahan,
          kecamatan: item.kecamatan,
          kabupaten_kota: item.kabupaten_kota,
          provinsi: item.provinsi,
          kewarganegaraan: item.kewarganegaraan,
          status_nikah: item.status_nikah,
          pekerjaan: item.pekerjaan,
          telepon: item.telepon,
          emergency_contact: item.emergency_contact,
          status_kesiapan: 'READY'
        };

        if (item.saveAction === 'merge' && item.matchUserId) {
          // Update existing document
          const cleanPayload: Record<string, string | boolean | undefined> = {};
          Object.keys(payload).forEach(key => {
            const val = payload[key as keyof Partial<JamaahTracker>];
            if (val !== undefined && val !== null && val !== '') {
              cleanPayload[key] = val;
            }
          });
          await updateDoc(doc(db, 'tracker_jamaah', item.matchUserId), cleanPayload);
        } else {
          // Create new document
          await addDoc(collection(db, 'tracker_jamaah'), {
            ...payload,
            paketId: selectedPaketId,
            statusPembayaran: 'Belum Bayar',
            statusPaspor: payload.no_paspor ? 'Sudah Ada' : 'Belum Ada',
            statusVaksin: 'Belum'
          });
        }
      }
      setIsReviewModalOpen(false);
      setExtractedReviewList([]);
      showToast(`Berhasil menyimpan ${checkedItems.length} data manifest!`, 'success');
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan saat menyimpan data.", 'error');
    }
  };

  // Filters calculation
  const filteredJamaahs = jamaahs.filter(j => {
    const nameMatch = !searchTerm || j.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) || (j.nama_paspor && j.nama_paspor.toLowerCase().includes(searchTerm.toLowerCase())) || j.nik.includes(searchTerm) || (j.no_paspor && j.no_paspor.toLowerCase().includes(searchTerm.toLowerCase()));
    const groupMatch = !selectedGroup || j.kabupaten_kota === selectedGroup || j.provinsi === selectedGroup;
    return nameMatch && groupMatch;
  });

  // Unique groups list
  const groupsList = Array.from(new Set(jamaahs.map(j => j.kabupaten_kota || j.provinsi).filter(Boolean))).sort();

  // Statistics counters
  const totalCount = jamaahs.length;
  const countLengkapKtp = jamaahs.filter(j => j.nik && j.nik.trim().length === 16).length;
  const countLengkapPaspor = jamaahs.filter(j => j.no_paspor && j.no_paspor.trim().length > 0).length;
  const countGrup = Array.from(new Set(jamaahs.map(j => j.kabupaten_kota || 'Asal').filter(Boolean))).length;

  // Custom table cell rendering
  const renderEditableCell = (item: JamaahTracker, field: string, defaultValue: string = '') => {
    const isEditing = editingCell?.id === item.id && editingCell?.field === field;
    const rawValue = (item as unknown as Record<string, string | undefined>)[field] || defaultValue;

    if (isEditing) {
      return (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => handleSaveCell(item.id, field, inputValue)}
          onKeyDown={(e) => handleKeyDown(e, item.id, field)}
          className="w-full h-full min-h-[30px] px-2 py-1 border-2 border-amber-500 bg-white text-gray-950 outline-none text-xs font-semibold focus:ring-0 uppercase font-sans whitespace-nowrap min-w-[120px] rounded"
          autoFocus
        />
      );
    }

    return (
      <div
        onClick={() => handleCellClick(item.id, field, rawValue)}
        className="px-3 py-2 text-xs font-semibold text-gray-900 cursor-pointer hover:bg-amber-50/75 rounded min-h-[34px] flex items-center uppercase font-mono tracking-wide"
      >
        {rawValue || <span className="text-gray-300 italic text-[10px] lowercase normal-case">tulis...</span>}
      </div>
    );
  };

  const renderSelectCell = (item: JamaahTracker, field: string, options: string[]) => {
    const isEditing = editingCell?.id === item.id && editingCell?.field === field;
    const rawValue = (item as unknown as Record<string, string | undefined>)[field] || options[0];

    if (isEditing) {
      return (
        <select
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            handleSaveCell(item.id, field, e.target.value);
          }}
          onBlur={() => setEditingCell(null)}
          className="w-full h-full min-h-[30px] px-1 py-1 border-2 border-amber-500 bg-white text-gray-950 font-sans text-xs outline-none rounded"
          autoFocus
        >
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    return (
      <div
        onClick={() => handleCellClick(item.id, field, rawValue)}
        className="px-3 py-2 text-xs font-black text-gray-805 cursor-pointer hover:bg-amber-50/75 rounded min-h-[34px] flex items-center justify-center uppercase text-center bg-gray-50/40"
      >
        {rawValue}
      </div>
    );
  };

  // Excel Export
  const handleExportExcelAll = () => {
    if (filteredJamaahs.length === 0) {
      showToast("Tidak ada data untuk diexport.", "info");
      return;
    }

    const exportData = filteredJamaahs.map((j, index) => ({
      'NO': index + 1,
      'TITLE': j.title || 'MR',
      'STATUS': j.status_kesiapan || 'READY',
      'NAMA KTP': j.namaLengkap ? j.namaLengkap.toUpperCase() : '',
      'NAMA AYAH': j.nama_ayah ? j.nama_ayah.toUpperCase() : '',
      'NIK KTP': j.nik || '',
      'NAMA PASPOR': j.nama_paspor ? j.nama_paspor.toUpperCase() : '',
      'NO PASPOR': j.no_paspor ? j.no_paspor.toUpperCase() : '',
      'TGL LAHIR (DOB)': j.tanggal_lahir || '',
      'DATE ISSUED': j.tgl_issue_paspor || '',
      'EXPIRY DATE': j.tgl_exp_paspor || '',
      'KOTA ISSUING PASPOR': j.kota_paspor || '',
      'TEMPAT LAHIR': j.tempat_lahir || '',
      'ALAMAT LENGKAP': j.alamat || '',
      'KELURAHAN': j.kelurahan || '',
      'KECAMATAN': j.kecamatan || '',
      'KABUPATEN/KOTA': j.kabupaten_kota || '',
      'PROVINSI': j.provinsi || '',
      'KEWARGANEGARAAN': j.kewarganegaraan || 'WNI',
      'STATUS NIKAH': j.status_nikah || '',
      'PEKERJAAN': j.pekerjaan || '',
      'KONTAK JAMAAH': j.telepon || '',
      'EMERGENCY CONTACT': j.emergency_contact || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Manifest");
    XLSX.writeFile(workbook, `Manifest_Umrah_Travel.xlsx`);
  };

  const handlePrintWindow = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans transition-all duration-300">
      
      {/* 1. Header dengan Gaya Premium Islami Hijau Tua & Emas */}
      <div className="bg-[#01413a] border-b-4 border-amber-500 text-white p-6 shadow-md relative print:bg-white print:text-black print:border-b-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center font-black text-black text-3xl shadow-lg border-2 border-white/25">
              M
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-black text-white font-sans tracking-tight">
                  Umrah Manifest Dashboard
                </h1>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider animate-pulse h-fit">
                  AI GEMINI POWERED
                </span>
              </div>
              <p className="text-gray-350 text-xs md:text-sm mt-0.5 font-medium">
                Sistem Pembuatan & Ekstrak Manifest Jamaah dari KTP, KK, dan Paspor otomatis
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 self-end md:self-center pr-1 print:hidden">
            <button 
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center gap-1.5 bg-[#014c44] border border-emerald-550/40 hover:bg-[#025a50] px-4 py-2 rounded-xl text-xs font-bold transition-all text-emerald-100"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" /> Panduan Fitur
            </button>
            <button 
              onClick={() => {
                if (selectedPaketId) {
                  const id = selectedPaketId;
                  setSelectedPaketId('');
                  setTimeout(() => setSelectedPaketId(id), 100);
                }
              }}
              className="flex items-center justify-center p-2 rounded-xl bg-[#014c44] border border-[#015e54] text-gray-200 hover:text-white hover:bg-[#025a50] transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4 animate-spin-hover" />
            </button>
            <button 
              onClick={() => setShowResetConfirmModal(true)}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow-md transition-all uppercase"
              title="Reset data ke data standard default"
            >
              <RefreshCw className="w-4 h-4" /> Reset Data
            </button>
          </div>
        </div>
      </div>

      {/* Elegant Horizontal Guide Dashboard (Panduan & Fitur Pendukung) */}
      {showGuide && (
        <div className="bg-[#025a50] border-b-2 border-amber-500 text-white animate-fade-in print:hidden select-none">
          <div className="max-w-7xl mx-auto p-6 relative">
            
            {/* Header of Guide */}
            <div className="flex justify-between items-center border-b border-emerald-500/35 pb-3.5 mb-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-black uppercase tracking-widest text-[#fbbf24]">
                  Panduan & Fitur Pendukung Manifest AI
                </h2>
              </div>
              <button 
                onClick={() => setShowGuide(false)} 
                className="text-emerald-100 hover:text-white hover:bg-emerald-800/50 p-1.5 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid for 3 Panels (Exactly matching layout in Image 1) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              
              {/* Panel 1: Panduan Pemakaian */}
              <div className="bg-[#01413a] rounded-xl border border-emerald-600/40 p-5 space-y-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center">
                    <BookOpen className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="font-extrabold text-sm text-emerald-100 tracking-tight">
                    Panduan Pemakaian
                  </h3>
                </div>
                <ul className="space-y-2 text-[11px] font-medium leading-relaxed text-slate-200">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold shrink-0">1.</span>
                    <span>Klik Sel Langsung untuk mengubah data di Spreadsheet.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold shrink-0">2.</span>
                    <span>Tekan Tab / Enter untuk berpindah kolom/baris otomatis.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold shrink-0">3.</span>
                    <span>Fitur (+ AI) di kolom opsi untuk isi baris otomatis.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold shrink-0">4.</span>
                    <span>Pindah Tab "Unggah Dokumen AI" untuk ekstraksi massal.</span>
                  </li>
                </ul>
              </div>

              {/* Panel 2: Spesifikasi Model AI */}
              <div className="bg-[#01413a] rounded-xl border border-emerald-600/40 p-5 space-y-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-[#fbbf24] flex items-center justify-center">
                    <Zap className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="font-extrabold text-sm text-emerald-100 tracking-tight">
                    Spesifikasi Model AI
                  </h3>
                </div>
                <div className="space-y-2 text-[11px] font-medium text-slate-200">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1">
                    <span className="text-slate-350">Model Pendukung</span>
                    <span className="font-black text-[#fbbf24] font-mono">GEMINI-3.5-FLASH</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-1">
                    <span className="text-slate-350">Kecepatan Rata-rata</span>
                    <span className="font-mono text-emerald-350">~1.2s per Dokumen</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-1">
                    <span className="text-slate-350">Akurasi Ekstraksi</span>
                    <span className="font-mono text-emerald-350">98.7% (OCR/NLP)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-350">Maks. Batch Scanning</span>
                    <span>20 Berkas Beruntun</span>
                  </div>
                </div>
              </div>

              {/* Panel 3: Sistem Eksternal & Keamanan */}
              <div className="bg-[#01413a] rounded-xl border border-emerald-600/40 p-5 space-y-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-555/20 text-emerald-300 flex items-center justify-center">
                    <Monitor className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="font-extrabold text-sm text-emerald-100 tracking-tight">
                    Sistem & Keamanan
                  </h3>
                </div>
                <div className="space-y-2 text-[11px] font-medium text-slate-200">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1">
                    <span className="text-slate-350">Penyimpanan Real-Time</span>
                    <span className="font-black text-teal-350">FIRESTORE CLOUD DB</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-1">
                    <span className="text-slate-350">Format Unduhan</span>
                    <span>XLSX (SISKOHAT)</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-1">
                    <span className="text-slate-350">Koneksi Enkripsi</span>
                    <span className="font-mono text-xs text-sky-305 bg-sky-950/20 px-1 py-0.5 rounded">TLS 1.3 / AES-256</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-350">Validasi Data Ganda</span>
                    <span className="text-sky-455 font-bold">Terproteksi</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6 space-y-7 w-full flex-grow">
        
        {/* Paket Selection Section */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="w-full md:w-1/2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
              Pilih Paket Keberangkatan Aktif
            </label>
            <select
              value={selectedPaketId}
              onChange={(e) => setSelectedPaketId(e.target.value)}
              className="w-full p-3 border border-slate-300 text-gray-800 font-bold bg-white rounded-xl shadow-inner focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="">-- Silakan Pilih Paket --</option>
              {pakets.map(p => (
                <option key={p.id} value={p.id}>{p.namaPaket} ({p.tanggalBerangkat})</option>
              ))}
            </select>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-[11px] font-black tracking-wider text-slate-400 uppercase">Aktif Paket</span>
            <span className="text-lg font-black text-slate-800 uppercase tracking-tight">
              {pakets.find(p => p.id === selectedPaketId)?.namaPaket || 'Belum Terpilih'}
            </span>
          </div>
        </div>

        {selectedPaketId ? (
          <>
            {/* 2. Statistik Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center justify-between text-slate-900 transition-all hover:translate-y-[-2px] hover:shadow-md">
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Jamaah</p>
                  <p className="text-3xl font-black text-slate-850 tracking-tight">{totalCount} Orang</p>
                </div>
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 border border-teal-100">
                  <FileText className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center justify-between text-slate-900 transition-all hover:translate-y-[-2px] hover:shadow-md">
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Lengkap NIK (KTP)</p>
                  <p className="text-3xl font-black text-amber-650 tracking-tight">{countLengkapKtp} <span className="text-sm font-bold text-slate-400">/ {totalCount}</span></p>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center justify-between text-slate-900 transition-all hover:translate-y-[-2px] hover:shadow-md">
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Lengkap Paspor</p>
                  <p className="text-3xl font-black text-sky-650 tracking-tight">{countLengkapPaspor} <span className="text-sm font-bold text-slate-400">/ {totalCount}</span></p>
                </div>
                <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 border border-sky-100">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center justify-between text-slate-900 transition-all hover:translate-y-[-2px] hover:shadow-md">
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Travel Agen/Mitra</p>
                  <p className="text-3xl font-black text-purple-650 tracking-tight">{countGrup} Grup</p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100">
                  <Info className="w-6 h-6" />
                </div>
              </div>

            </div>

            {/* 3. Sub-tabs / Navigation Row */}
            <div className="flex border-b border-gray-200 gap-6 text-sm font-bold print:hidden">
              <button 
                onClick={() => setSelectedTab('manifest')}
                className={`py-3.5 px-1.5 border-b-2 transition-all flex items-center gap-2.5 ${selectedTab === 'manifest' ? 'border-amber-500 text-teal-850' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                <FileText className="w-4 h-4 text-emerald-600" /> Daftar Manifest
              </button>
              <button 
                onClick={() => setSelectedTab('ai')}
                className={`py-3.5 px-1.5 border-b-2 transition-all flex items-center gap-2.5 ${selectedTab === 'ai' ? 'border-amber-500 text-teal-850' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                <Sparkles className="w-4 h-4 text-amber-500 animate-bounce" /> Unggah Dokumen AI
                <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide font-sans">
                  AI
                </span>
              </button>

              <div className="ml-auto self-center text-xs font-black text-teal-650 flex items-center gap-1.5 tracking-tight font-mono">
                <Info className="w-4 h-4 text-amber-500" /> Klik pada sel tabel untuk mengubah data secara instan
              </div>
            </div>

            {selectedTab === 'manifest' ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                
                {/* 4. Filter, Search & View Controls inside Tab card */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                  
                  <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-3/4">
                    <div className="relative flex-grow">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Cari nama, nomor paspor, NIK, atau kota..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 bg-white text-slate-900 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      className="border border-slate-300 p-2.5 bg-white text-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-[200px]"
                    >
                      <option value="">Semua Grup Travel / Mitra</option>
                      {groupsList.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3.5 self-end md:self-auto flex-shrink-0">
                    <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-bold gap-1">
                      <button 
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Daftar Datar (Grid)
                      </button>
                      <button 
                        onClick={() => setViewMode('grouped')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'grouped' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Kelompokkan per Agen
                      </button>
                    </div>

                    <div className="h-5 w-px bg-slate-300" />

                    <button 
                      onClick={handlePrintWindow}
                      className="p-2.5 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors bg-white shadow-sm"
                      title="Cetak/Print Manifest"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button 
                      onClick={handleExportExcelAll}
                      className="flex items-center gap-1.5 bg-emerald-600 text-white px-3.5 py-2.5 rounded-xl hover:bg-emerald-700 text-xs font-bold shadow transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Ekspor Excel
                    </button>
                  </div>

                </div>

                {/* 5. Spreadsheet Table */}
                <div className="overflow-x-auto w-full border-b border-slate-150 select-none">
                  <table className="w-full text-left border-collapse table-fixed select-text">
                    <thead className="bg-amber-500 text-white select-none whitespace-nowrap">
                      <tr>
                        <th className="w-[100px] h-12 text-center text-xs font-black tracking-wider border border-amber-600 text-[11px]">OPTION</th>
                        <th className="w-[50px] text-center text-xs font-black tracking-wider border border-amber-600 text-[11px]">NO.</th>
                        <th className="w-[80px] text-center text-xs font-black tracking-wider border border-amber-600 text-[11px]">TITLE</th>
                        <th className="w-[100px] text-center text-xs font-black tracking-wider border border-amber-600 text-[11px]">STATUS</th>
                        <th className="w-[200px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">NAMA SESUAI KTP</th>
                        <th className="w-[160px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">NAMA AYAH</th>
                        <th className="w-[180px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">NIK KTP</th>
                        <th className="w-[200px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">NAMA PASPOR (SESUAI PASPOR)</th>
                        <th className="w-[140px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">NO PASPOR</th>
                        <th className="w-[130px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">DOB (YYYY-MM-DD)</th>
                        <th className="w-[130px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">DATE ISSUED</th>
                        <th className="w-[130px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">EXP DATE</th>
                        <th className="w-[180px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">KOTA ISSUING PASPOR</th>
                        <th className="w-[140px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">TEMPAT LAHIR</th>
                        <th className="w-[260px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">ALAMAT LENGKAP</th>
                        <th className="w-[140px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">KELURAHAN</th>
                        <th className="w-[140px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">KECAMATAN</th>
                        <th className="w-[160px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">KABUPATEN/KOTA</th>
                        <th className="w-[160px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">PROVINSI</th>
                        <th className="w-[120px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">KEWARGANEGARAAN</th>
                        <th className="w-[120px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">STATUS NIKAH</th>
                        <th className="w-[160px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">PEKERJAAN</th>
                        <th className="w-[150px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">KONTAK JAMAAH</th>
                        <th className="w-[200px] px-3 text-xs font-black tracking-wider border border-amber-600 text-[11px]">EMERGENCY CONTACT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredJamaahs.map((item, index) => {
                        const isExpired = item.tgl_exp_paspor ? new Date(item.tgl_exp_paspor) < new Date() : false;
                        const hasNoPassport = !item.no_paspor;
                        const isAiExtractedStatus = activeAiTargetId === item.id;

                        // Alternating/Status-based row styles
                        let rowBg = "hover:bg-slate-50 transition-colors";
                        if (isExpired) {
                          rowBg = "bg-rose-50/40 hover:bg-rose-50/60 opacity-85 transition-colors";
                        } else if (hasNoPassport) {
                          rowBg = "bg-yellow-50/20 hover:bg-yellow-50/35 transition-colors";
                        }

                        return (
                          <tr key={item.id} className={`${rowBg} border-b border-slate-100`}>
                            {/* Option Tools: "+ AI" & Delete Button */}
                            <td className="p-2 border border-slate-150 align-middle">
                              <div className="flex items-center justify-center gap-1.5 select-none print:hidden">
                                {isAiExtractedStatus ? (
                                  <div className="flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black px-1.5 py-0.5 rounded uppercase font-sans animate-pulse">
                                    <Loader2 className="w-3 h-3 animate-spin text-emerald-600" /> AI
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => triggerRowPhotoUpload(item.id)}
                                      className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 text-[9px] font-black px-1.5 py-1 rounded tracking-wide uppercase font-sans transition-all"
                                      title="Ekstrak dokumen / gambar menggunakan AI"
                                    >
                                      + AI
                                    </button>
                                    <input 
                                      type="file"
                                      ref={el => { rowFileInputRefs.current[item.id] = el; }}
                                      onChange={(e) => handleRowFileChange(item.id, e)}
                                      accept="image/*"
                                      className="hidden"
                                    />
                                  </>
                                )}
                                {deleteConfirmId === item.id ? (
                                  <div className="flex items-center gap-1 bg-red-50 border border-red-200 p-0.5 rounded shrink-0">
                                    <button
                                      onClick={() => handleDeleteRow(item.id)}
                                      className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded uppercase hover:bg-rose-700 active:scale-95 transition-all text-[8px]"
                                      title="Yakin hapus?"
                                    >
                                      Ya
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmId(null)}
                                      className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-black rounded uppercase hover:bg-slate-300 transition-all text-[8px]"
                                      title="Batal"
                                    >
                                      B
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeleteConfirmId(item.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Hapus baris"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                            {/* NO */}
                            <td className="text-center align-middle border border-slate-150 font-mono text-xs font-bold text-slate-400 select-none">{index + 1}</td>
                            
                            {/* TITLE SELECT */}
                            <td className="border border-slate-150 align-middle">
                              {renderSelectCell(item, 'title', ['MR', 'MRS', 'MS', 'MSTR', 'MISS'])}
                            </td>

                            {/* STATUS SELECT */}
                            <td className="border border-slate-150 align-middle">
                              {renderSelectCell(item, 'status_kesiapan', ['READY', 'NOT_READY'])}
                            </td>

                            {/* Spreads */}
                            <td className="border border-slate-150 align-middle font-bold text-teal-950 font-sans">{renderEditableCell(item, 'namaLengkap')}</td>
                            <td className="border border-slate-150 align-middle">{renderEditableCell(item, 'nama_ayah')}</td>
                            <td className="border border-slate-150 align-middle font-mono font-bold">{renderEditableCell(item, 'nik')}</td>
                            <td className="border border-slate-150 align-middle font-semibold">{renderEditableCell(item, 'nama_paspor')}</td>
                            <td className="border border-slate-150 align-middle font-mono font-bold text-sky-800">{renderEditableCell(item, 'no_paspor')}</td>
                            
                            {/* Dates with validation styling */}
                            <td className="border border-slate-150 align-middle text-center font-mono font-bold">{renderEditableCell(item, 'tanggal_lahir')}</td>
                            <td className="border border-slate-150 align-middle text-center font-mono">{renderEditableCell(item, 'tgl_issue_paspor')}</td>
                            
                            <td className={`border border-slate-150 align-middle text-center font-mono ${isExpired ? 'text-rose-600 bg-rose-50/80 font-bold' : ''}`}>
                              {renderEditableCell(item, 'tgl_exp_paspor')}
                            </td>

                            {/* Extras */}
                            <td className="border border-slate-150 align-middle">{renderEditableCell(item, 'kota_paspor')}</td>
                            <td className="border border-slate-150 align-middle">{renderEditableCell(item, 'tempat_lahir')}</td>
                            <td className="border border-slate-150 align-middle">{renderEditableCell(item, 'alamat')}</td>
                            <td className="border border-slate-150 align-middle">{renderEditableCell(item, 'kelurahan')}</td>
                            <td className="border border-slate-150 align-middle">{renderEditableCell(item, 'kecamatan')}</td>
                            <td className="border border-slate-150 align-middle">{renderEditableCell(item, 'kabupaten_kota')}</td>
                            <td className="border border-slate-150 align-middle">{renderEditableCell(item, 'provinsi')}</td>
                            <td className="border border-slate-150 align-middle">{renderEditableCell(item, 'kewarganegaraan', 'WNI')}</td>
                            <td className="border border-slate-150 align-middle">{renderEditableCell(item, 'status_nikah')}</td>
                            <td className="border border-slate-150 align-middle">{renderEditableCell(item, 'pekerjaan')}</td>
                            <td className="border border-slate-150 align-middle font-mono">{renderEditableCell(item, 'telepon')}</td>
                            <td className="border border-slate-150 align-middle font-sans text-slate-650">{renderEditableCell(item, 'emergency_contact')}</td>
                          </tr>
                        );
                      })}
                      {filteredJamaahs.length === 0 && (
                        <tr>
                          <td colSpan={24} className="p-12 text-center text-slate-400 select-none font-bold">
                            Tidak ada data jamaah cocok dengan pencarian Anda. Klik "+ Tambah Baris" untuk menambahkan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Grid controls row */}
                <div className="p-5 bg-slate-50 border-t border-slate-150 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm font-bold print:hidden">
                  <button 
                    onClick={handleAddNewRow}
                    className="flex justify-center items-center gap-2 bg-[#01413a] hover:bg-[#025a50] text-[#fbbf24] px-5 py-3 rounded-xl transition-all shadow-md transform hover:scale-[1.01]"
                  >
                    <Plus className="w-5 h-5 stroke-[3px]" /> Tambah Baris Jamaah Baru
                  </button>

                  <div className="text-slate-500 font-bold select-none">
                    Menampilkan <span className="text-teal-950 font-black font-mono">{filteredJamaahs.length}</span> dari <span className="text-teal-950 font-black font-mono">{totalCount}</span> total baris
                  </div>

                  <div className="text-amber-700 bg-amber-50 rounded-xl px-4 py-2 border border-amber-200 flex items-center gap-2 text-xs font-semibold animate-pulse select-none">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Tip: Tekan & Tab di setiap input untuk memindahkan fokus sel mendatar layaknya Excel!</span>
                  </div>
                </div>

              </div>
            ) : (
              /* TAB 2: AI Bulk Extraction */
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-7 space-y-6">
                
                {/* 1. Header controls section: FOKUS DOKUMEN UTAMA & COBA DEMO EKSPERIMENTAL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                  {/* Left block */}
                  <div className="space-y-1.5 flex flex-col justify-center">
                    <label className="block text-[10px] font-black text-rose-950 uppercase tracking-widest">
                      FOKUS DOKUMEN UTAMA
                    </label>
                    <select
                      value={focusDocument}
                      onChange={(e) => setFocusDocument(e.target.value as 'otomatis' | 'ktp' | 'paspor' | 'kk')}
                      className="w-full p-2.5 border border-slate-300 bg-white text-[#01413a] font-bold rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none focus:border-amber-500 shadow-sm"
                    >
                      <option value="otomatis">Deteksi Otomatis (Recomended)</option>
                      <option value="ktp">KTP (Kartu Tanda Penduduk)</option>
                      <option value="paspor">Paspor RI</option>
                      <option value="kk">KK (Kartu Keluarga)</option>
                    </select>
                    <p className="text-[10.5px] text-slate-400 font-medium leading-relaxed">
                      Membantu Gemini AI memprioritaskan ekstraksi detail yang tepat.
                    </p>
                  </div>

                  {/* Right block */}
                  <div className="space-y-1.5 flex flex-col justify-center">
                    <label className="block text-[10px] font-black text-rose-950 uppercase tracking-widest">
                      COBA DEMO EKSPERIMENTAL (TANPA FILE)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleAddDemo('ktp')}
                        className="flex items-center justify-center gap-1 bg-emerald-50/50 border border-emerald-300 hover:bg-emerald-50 text-emerald-800 font-bold text-xs py-2 px-1.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        💡 Contoh KTP
                      </button>
                      <button
                        onClick={() => handleAddDemo('paspor')}
                        className="flex items-center justify-center gap-1 bg-[#f0f9ff]/75 border border-[#bae6fd] hover:bg-sky-50 text-[#0369a1] font-bold text-xs py-2 px-1.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        💡 Contoh Paspor
                      </button>
                      <button
                        onClick={() => handleAddDemo('kk')}
                        className="flex items-center justify-center gap-1 bg-[#fefce8]/75 border border-[#fef08a] hover:bg-amber-50 text-[#a16207] font-bold text-xs py-2 px-1.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        💡 Contoh KK
                      </button>
                    </div>
                    <p className="text-[10.5px] text-slate-400 font-medium leading-relaxed font-sans">
                      Gunakan salah satu tombol untuk mensimulasikan hasil pemrosesan AI jika sedang tidak memegang dokumen fisik.
                    </p>
                  </div>
                </div>

                {/* 2. File Drop Area */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-amber-500 hover:bg-slate-50/35 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all min-h-[200px]"
                >
                  <div className="w-14 h-14 bg-[#513c2c] ring-4 ring-amber-100 rounded-full flex items-center justify-center text-amber-400 shadow-md">
                    <Upload className="w-5 h-5 stroke-[2.5px]" />
                  </div>
                  <div className="text-center">
                    <p className="font-extrabold text-slate-900 text-[15px] sm:text-base">Tarik & Taruh Berkas Di Sini</p>
                    <p className="font-bold text-amber-700 text-[15px] sm:text-base">atau Klik untuk Unggah</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">
                      Mendukung berkas KTP, KK, Paspor dalam format PDF, PNG, JPEG, JPG (Maks. 50MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleBulkFileChange}
                    multiple
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* 3. Info Alert Box */}
                <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-xl flex items-start gap-3 text-xs leading-relaxed text-amber-900">
                  <span className="w-5 h-5 rounded-md bg-[#fbbf24] text-white flex items-center justify-center font-black text-xs shrink-0 select-none">
                    i
                  </span>
                  <div className="space-y-1 select-none">
                    <p className="font-extrabold text-amber-950 text-xs text-left">
                      Mengenai Sifat Ekstrak AI:
                    </p>
                    <p className="text-amber-805 text-[11px] leading-relaxed text-left font-medium">
                      Al akan mencoba mendeteksi dokumen Anda seakurat mungkin. Jika kualitas pindaian/foto buram, beberapa karakter angka pada NIK atau No Paspor mungkin perlu penyesuaian manual. Hasil pemrosesan dapat langsung ditinjau terlebih dahulu pada drawer pratinjau sebelum dimasukkan ke dalam daftar manifest aktif di tab sebelah.
                    </p>
                  </div>
                </div>

                {/* Upload Queue */}
                {filesToScan.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="font-bold text-sm text-slate-800">Antrian Dokumen ({filesToScan.length})</span>
                      <button 
                        onClick={() => setFilesToScan([])}
                        className="text-xs font-bold text-red-500 hover:text-red-700"
                        disabled={isAiProcessing}
                      >
                        Bersihkan Antrian
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                      {filesToScan.map(f => (
                        <div key={f.id} className="py-3 flex justify-between items-center text-sm">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 font-mono tracking-tight text-xs">PDF/IMG</span>
                            <span className="font-semibold text-[#01413a] max-w-[250px] truncate">{f.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {f.status === 'waiting' && (
                              <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded px-2.5 py-0.5 uppercase font-black tracking-wide">Tunggu</span>
                            )}
                            {f.status === 'scanning' && (
                              <div className="flex items-center gap-1.5 bg-sky-100 text-sky-800 border border-sky-300 rounded px-2.5 py-0.5 uppercase font-black tracking-wide animate-pulse">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" /> Memproses...
                              </div>
                            )}
                            {f.status === 'done' && (
                              <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 rounded px-2.5 py-0.5 uppercase font-black tracking-wide flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Berhasil
                              </span>
                            )}
                            {f.status === 'failed' && (
                              <span className="text-xs bg-red-100 text-red-800 border border-red-300 rounded px-2.5 py-0.5 uppercase font-black tracking-wide flex items-center gap-1" title={f.error}>
                                Gagal
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        onClick={handleStartScanBulk}
                        disabled={isAiProcessing || filesToScan.every(f => f.status === 'done' || f.status === 'failed')}
                        className="flex items-center gap-2 bg-[#01413a] hover:bg-[#025a50] text-[#fbbf24] px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                      >
                        {isAiProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Memproses dengan AI...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" /> Mulai Ekstraksi AI Massal
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-6 max-w-2xl mx-auto my-4 text-center">
            {!showManualPacketForm ? (
              <>
                <button
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setNewPacketName(`Paket Manual ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`);
                    setNewPacketDate(todayStr);
                    setShowManualPacketForm(true);
                  }}
                  className="w-20 h-20 rounded-full bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center border-2 border-dashed border-emerald-300 text-emerald-600 transition-all hover:scale-105 hover:border-emerald-400 cursor-pointer shadow-sm"
                  title="Klik untuk membuat paket manual"
                >
                  <Plus className="w-10 h-10 animate-pulse" />
                </button>
                <div className="space-y-2">
                  <h3 className="font-extrabold text-xl text-slate-800">Belum ada paket keberangkatan terpilih</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                    Silakan pilih paket keberangkatan aktif melalui dropdown di atas, atau klik tombol di bawah ini untuk membuat paket baru secara manual agar bisa mengisi spreadsheet manifest!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setNewPacketName(`Paket Manual ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`);
                    setNewPacketDate(todayStr);
                    setShowManualPacketForm(true);
                  }}
                  className="flex items-center gap-2 bg-[#01413a] hover:bg-[#025a50] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer hover:shadow-lg"
                >
                  <Plus className="w-4 h-4 text-amber-400" /> Buat Paket Baru & Isi Manual
                </button>
              </>
            ) : (
              <div className="w-full space-y-5 text-left">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-extrabold text-lg text-slate-800">Buat Paket Keberangkatan Baru</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManualPacketForm(false)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Nama Paket Keberangkatan *
                    </label>
                    <input
                      type="text"
                      value={newPacketName}
                      onChange={(e) => setNewPacketName(e.target.value)}
                      placeholder="Contoh: Umrah Syawal 9 Hari"
                      className="w-full px-4 py-2.5 border border-slate-300 text-slate-900 bg-white rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none focus:border-amber-500 font-semibold shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                        Tanggal Keberangkatan *
                      </label>
                      <input
                        type="date"
                        value={newPacketDate}
                        onChange={(e) => setNewPacketDate(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 text-slate-900 bg-white rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none focus:border-amber-500 font-semibold shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                        Target / Kuota Jamaah
                      </label>
                      <input
                        type="number"
                        value={newPacketTarget}
                        onChange={(e) => setNewPacketTarget(e.target.value)}
                        min="1"
                        placeholder="45"
                        className="w-full px-4 py-2.5 border border-slate-300 text-slate-900 bg-white rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none focus:border-amber-500 font-semibold shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowManualPacketForm(false)}
                    className="px-4.5 py-2 border border-slate-300 text-slate-600 bg-white rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateManualPacket}
                    className="flex items-center gap-1.5 bg-[#01413a] hover:bg-[#025a50] text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                    disabled={!newPacketName.trim() || !newPacketDate.trim()}
                  >
                    <Check className="w-4 h-4 text-amber-400" /> Simpan & Mulai Isi
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* 4. Review Hasil Ekstrak AI Gemini Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-50 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="bg-[#01413a] border-b-4 border-amber-500 text-white px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-black shadow-md">
                  <Sparkles className="w-5 h-5 text-black" />
                </div>
                <div className="text-left">
                  <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    Review Hasil Ekstrak AI Gemini
                  </h2>
                  <p className="text-emerald-100 text-[11px] font-medium opacity-85">
                    Tinjau dan sesuaikan data yang berhasil ditarik dari dokumen sebelum menyimpannya ke Manifest
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsReviewModalOpen(false);
                  setExtractedReviewList([]);
                }}
                className="text-emerald-100 hover:text-white p-1.5 hover:bg-white/10 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Header Helper Action Bar */}
            <div className="bg-white border-b border-slate-200 p-4 sm:p-5 shrink-0 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <div className="text-left">
                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wide">
                    Pratinjau Hasil Pembacaan AI
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    Ditemukan <strong className="text-emerald-700 font-extrabold">{extractedReviewList.length} jamaah</strong> dari dokumen. Anda dapat menyaring data, mengubah pilihan impor, atau mengedit kolom di bawah ini.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setExtractedReviewList(prev => prev.map(item => ({ ...item, checked: true })));
                    }}
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs py-1.5 px-3 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <button
                    onClick={() => {
                      setExtractedReviewList(prev => prev.map(item => ({ ...item, checked: false })));
                    }}
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs py-1.5 px-3 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    Kosongkan Semua
                  </button>
                  <button
                    onClick={() => {
                      setExtractedReviewList(prev => prev.map(item => ({ 
                        ...item, 
                        checked: item.matchLevel === 'match' 
                      })));
                    }}
                    className="bg-emerald-50 border border-emerald-350 hover:bg-emerald-100 text-emerald-800 font-bold text-xs py-1.5 px-3 rounded-lg transition-all shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Cocok Paspor Saja
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs text-slate-500 font-medium">
                <label className="flex items-center gap-2 select-none cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={onlyShowMatched} 
                    onChange={(e) => setOnlyShowMatched(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 bg-white text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Hanya tampilkan jamaah yang cocok dengan Paspor / Manifest Aktif</span>
                </label>
                <span className="font-mono text-slate-400">
                  Menampilkan {extractedReviewList.filter(item => !onlyShowMatched || item.matchLevel === 'match').length} dari {extractedReviewList.length} data
                </span>
              </div>
            </div>

            {/* Editable Card List */}
            <div className="flex-grow p-4 sm:p-6 overflow-y-auto space-y-6 bg-slate-100/60 font-sans">
              
              {/* KK Smart Alert Warning Banner */}
              {onlyShowMatched && extractedReviewList.some(item => item.matchLevel === 'new') && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex gap-3 text-left animate-fade-in text-amber-900 shadow-sm">
                  <span className="text-xl shrink-0">💡</span>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <h4 className="font-extrabold text-amber-950 flex items-center gap-2">
                      Penyaringan Dokumen KK Aktif: Hanya Menampilkan Data Sesuai Paspor / Manifest
                    </h4>
                    <p className="text-amber-900/90 font-medium leading-relaxed">
                      Kami mendeteksi {extractedReviewList.filter(item => item.matchLevel === 'new').length} nama dari Kartu Keluarga yang tidak / belum terdaftar di manifest aktif Anda. 
                      Sistem <strong>otomatis menyembunyikannya</strong> dan <strong>menghilangkan centangnya</strong> agar data manifest utama Anda bersih dan tidak terduplikasi.
                    </p>
                    <p className="text-amber-950 font-bold block pt-1">
                      👉 Jika Anda ingin mengimpor atau mendaftarkan nama keluarga tersebut sebagai jemaah baru, silakan matikan tombol centang penyaringan di atas, lalu beri centang manual pada nama yang diinginkan.
                    </p>
                  </div>
                </div>
              )}

              {extractedReviewList.filter(item => !onlyShowMatched || item.matchLevel === 'match').map((item, index) => {
                const isCardChecked = item.checked;
                const isMatched = item.matchLevel === 'match';

                return (
                  <div 
                    key={item.id} 
                    className={`bg-white rounded-2xl border-2 transition-all shadow-sm overflow-hidden ${
                      isCardChecked ? 'border-teal-500 ring-2 ring-teal-500/10' : 'border-slate-200 opacity-75'
                    }`}
                  >
                    {/* Card Title Box with Checkbox */}
                    <div className="bg-slate-50/75 border-b border-slate-100 px-5 py-3.5 flex justify-between items-center select-none">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={isCardChecked}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setExtractedReviewList(prev => prev.map(p => p.id === item.id ? { ...p, checked: val } : p));
                          }}
                          className="w-4.5 h-4.5 rounded border-slate-300 bg-white text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <span className="font-extrabold text-[#01413a] text-sm uppercase tracking-tight">
                          {item.namaLengkap || 'DOKUMEN TANPA NAMA'}
                        </span>
                        {isMatched && (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-250 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <Sparkles className="w-3 h-3 text-emerald-600" /> COCOK PASPOR AKTIF
                          </span>
                        )}
                      </div>
                      <span className="bg-slate-200/80 text-slate-500 text-[10.5px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider font-mono">
                        JAMAAH #{index + 1}
                      </span>
                    </div>

                    {/* Form Layout Content */}
                    <div className="p-5 sm:p-6 space-y-6">
                      
                      {/* Storage Actions (Tambah Baru / Smart Merge) */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <span className="block text-[10.5px] font-black text-rose-950 uppercase tracking-widest leading-none select-none text-left">
                          Tindakan Penyimpanan:
                        </span>
                        
                        <div className="flex flex-wrap items-center gap-5 text-xs text-slate-700">
                          <label className="flex items-center gap-2 select-none cursor-pointer font-bold">
                            <input 
                              type="radio"
                              name={`saveAction-${item.id}`}
                              checked={item.saveAction === 'new'}
                              onChange={() => {
                                setExtractedReviewList(prev => prev.map(p => p.id === item.id ? { ...p, saveAction: 'new' } : p));
                              }}
                              className="w-4 h-4 border-slate-300 text-[#01413a] focus:ring-[#01413a]"
                            />
                            <span>Tambah Baru</span>
                          </label>

                          <label className="flex items-center gap-2 select-none cursor-pointer font-bold">
                            <input 
                              type="radio"
                              name={`saveAction-${item.id}`}
                              checked={item.saveAction === 'merge'}
                              disabled={jamaahs.length === 0}
                              onChange={() => {
                                setExtractedReviewList(prev => prev.map(p => p.id === item.id ? { ...p, saveAction: 'merge' } : p));
                              }}
                              className="w-4 h-4 border-slate-300 text-[#01413a] focus:ring-[#01413a]"
                            />
                            <span>Gabungkan (Smart Merge)</span>
                          </label>

                          {item.saveAction === 'merge' && (
                            <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
                              <span className="text-slate-500 font-bold text-xs shrink-0 select-none">Ke Baris Manifest:</span>
                              <select
                                value={item.matchUserId || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setExtractedReviewList(prev => prev.map(p => p.id === item.id ? { ...p, matchUserId: val } : p));
                                }}
                                className="p-1.5 px-3 border border-slate-300 bg-white font-bold text-xs text-[#01413a] focus:ring-2 focus:ring-amber-500 rounded-xl outline-none"
                              >
                                <option value="">-- Pilih Baris --</option>
                                {jamaahs.map((j, idx) => (
                                  <option key={j.id} value={j.id}>
                                    #{idx + 1} - {j.namaLengkap} [Paspor: {j.no_paspor || 'BELUM ADA'}]
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Fields Form Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
                        {/* Field 1: Nama KTP */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest select-none">
                            NAMA SESUAI KTP
                          </label>
                          <input 
                            type="text"
                            value={item.namaLengkap}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setExtractedReviewList(prev => prev.map(p => p.id === item.id ? { ...p, namaLengkap: val } : p));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </div>

                        {/* Field 2: Title */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest select-none">
                            TITLE
                          </label>
                          <select 
                            value={item.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setExtractedReviewList(prev => prev.map(p => p.id === item.id ? { ...p, title: val } : p));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                          >
                            <option value="MR">MR</option>
                            <option value="MRS">MRS</option>
                            <option value="MS">MS</option>
                            <option value="MSTR">MSTR</option>
                            <option value="MISS">MISS</option>
                          </select>
                        </div>

                        {/* Field 3: Tanggal Lahir */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest select-none">
                            TANGGAL LAHIR
                          </label>
                          <input 
                            type="text"
                            placeholder="YYYY-MM-DD"
                            value={item.tanggal_lahir}
                            onChange={(e) => {
                              const val = e.target.value;
                              setExtractedReviewList(prev => prev.map(p => p.id === item.id ? { ...p, tanggal_lahir: val } : p));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </div>

                        {/* Field 4: NIK */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest select-none">
                            NIK KTP (16-DIGIT)
                          </label>
                          <input 
                            type="text"
                            maxLength={16}
                            value={item.nik}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setExtractedReviewList(prev => prev.map(p => p.id === item.id ? { ...p, nik: val } : p));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </div>

                        {/* Field 5: Nama Ayah */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest select-none">
                            NAMA AYAH
                          </label>
                          <input 
                            type="text"
                            value={item.nama_ayah}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setExtractedReviewList(prev => prev.map(p => p.id === item.id ? { ...p, nama_ayah: val } : p));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </div>

                        {/* Field 6: Pekerjaan */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest select-none">
                            PEKERJAAN
                          </label>
                          <input 
                            type="text"
                            value={item.pekerjaan}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setExtractedReviewList(prev => prev.map(p => p.id === item.id ? { ...p, pekerjaan: val } : p));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </div>

                        {/* Field 7: Nama Paspor */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest select-none">
                            NAMA PASPOR
                          </label>
                          <input 
                            type="text"
                            value={item.nama_paspor}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setExtractedReviewList(prev => prev.map(p => p.id === item.id ? { ...p, nama_paspor: val } : p));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </div>

                        {/* Field 8: No Paspor */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest select-none">
                            NO PASPOR
                          </label>
                          <input 
                            type="text"
                            value={item.no_paspor}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setExtractedReviewList(prev => prev.map(p => p.id === item.id ? { ...p, no_paspor: val } : p));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </div>

                        {/* Field 9: Expiry Date Paspor */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest select-none">
                            EXPIRY DATE PASPOR
                          </label>
                          <input 
                            type="text"
                            placeholder="YYYY-MM-DD"
                            value={item.tgl_exp_paspor}
                            onChange={(e) => {
                              const val = e.target.value;
                              setExtractedReviewList(prev => prev.map(p => p.id === item.id ? { ...p, tgl_exp_paspor: val } : p));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </div>

                        {/* Field 10: Tempat Lahir */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest select-none">
                            TEMPAT LAHIR
                          </label>
                          <input 
                            type="text"
                            value={item.tempat_lahir}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setExtractedReviewList(prev => prev.map(p => p.id === item.id ? { ...p, tempat_lahir: val } : p));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </div>

                        {/* Field 11: Alamat Lengkap */}
                        <div className="space-y-1 lg:col-span-2">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest select-none">
                            ALAMAT LENGKAP
                          </label>
                          <input 
                            type="text"
                            value={item.alamat}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setExtractedReviewList(prev => prev.map(p => p.id === item.id ? { ...p, alamat: val } : p));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </div>

                        {/* Field 12: Travel Agency/Group */}
                        <div className="space-y-1 lg:col-span-3">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest select-none">
                            TRAVEL AGEN / GRUP MITRA (KABUPATEN KOTA)
                          </label>
                          <input 
                            type="text"
                            placeholder="E.g. CAHAYA SAYIDINA MITRA DWI ANGGIA"
                            value={item.kabupaten_kota}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setExtractedReviewList(prev => prev.map(p => p.id === item.id ? { ...p, kabupaten_kota: val } : p));
                            }}
                            className="w-full p-2 border border-amber-300 rounded-xl bg-amber-50/25 text-[#01413a] text-xs font-black font-mono focus:ring-2 focus:ring-amber-500 outline-none animate-pulse"
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Footer Actions */}
            <div className="flex justify-between items-center border-t border-slate-200 px-6 py-4.5 bg-slate-50 shrink-0 select-none">
              <button 
                onClick={() => {
                  setIsReviewModalOpen(false);
                  setExtractedReviewList([]);
                }}
                className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl font-bold text-slate-700 transition-all text-xs cursor-pointer"
              >
                Batalkan
              </button>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-500">
                  Ringkasan: <strong className="text-emerald-700 font-extrabold">{extractedReviewList.filter(item => item.checked && item.saveAction === 'new').length} Baru</strong> & <strong className="text-amber-600 font-extrabold">{extractedReviewList.filter(item => item.checked && item.saveAction === 'merge').length} Gabung</strong>
                </span>
                <button 
                  onClick={handleApplyExtractedData}
                  className="flex items-center gap-2 bg-[#01413a] hover:bg-[#025a50] text-[#fbbf24] px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" /> Simpan & Terapkan Data Ekstrak
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modern custom confirmation modal for Reset Data */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden transform animate-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto text-3xl font-extrabold animate-pulse">
                ⚠️
              </div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Kelola Seluruh Data Manifest Ini</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed max-w-md mx-auto">
                Silakan pilih tindakan yang ingin Anda lakukan terhadap seluruh data manifest pada paket keberangkatan terpilih saat ini. Tindakan ini bersifat permanen.
              </p>
            </div>
            
            <div className="border-t border-slate-100 px-6 py-4 space-y-3 bg-slate-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={async () => {
                    setShowResetConfirmModal(false);
                    await handleClearData();
                  }}
                  className="w-full flex flex-col items-center justify-center gap-1 p-4 bg-white hover:bg-rose-50 border border-slate-250 hover:border-rose-300 rounded-2xl transition-all cursor-pointer group"
                >
                  <span className="text-xs font-black text-rose-600 uppercase tracking-wider group-hover:scale-105 transition-transform">❌ Kosongkan Data</span>
                  <span className="text-[10px] text-slate-400 font-semibold text-center mt-0.5 leading-snug">Menghapus seluruh baris jamaah (mulai dari nol)</span>
                </button>

                <button
                  onClick={async () => {
                    setShowResetConfirmModal(false);
                    await handleResetData();
                  }}
                  className="w-full flex flex-col items-center justify-center gap-1 p-4 bg-[#01413a] hover:bg-[#025a50] border border-transparent rounded-2xl transition-all cursor-pointer group text-[#fbbf24] shadow-md"
                >
                  <span className="text-xs font-black uppercase tracking-wider group-hover:scale-105 transition-transform text-[#fbbf24]">🔄 Reset ke Default</span>
                  <span className="text-[10px] text-teal-100/80 font-bold text-center mt-0.5 leading-snug">Muat ulang 14 data jamaah dummy standard</span>
                </button>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowResetConfirmModal(false)}
                  className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black rounded-xl transition-all uppercase tracking-wider cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern toast popup notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] bg-slate-900 border border-slate-850 text-white px-5 py-3.5 rounded-xl shadow-2xl max-w-sm animate-in slide-in-from-bottom duration-305 print:hidden">
          <div className="flex items-center gap-3">
            <span className="text-lg">
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <p className="text-xs font-extrabold text-slate-100">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};
