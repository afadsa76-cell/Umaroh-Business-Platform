import React, { useState, useEffect } from 'react';
import { db, auth, collection, query, where, onSnapshot, doc, addDoc, updateDoc, deleteDoc, handleFirestoreError, OperationType } from '../firebase';
import { syncBookingToTracker, deleteBookingFromTracker } from '../utils/firebaseSync';
import { 
  Search, User, CheckCircle2, Clock, 
  Plus, Edit2, Trash2, X, DollarSign, 
  Calendar, AlertCircle, CheckSquare, RefreshCw, Eye, Upload,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InvoiceTransaction {
  id: string;
  userId?: string;
  bookingId?: string;
  namaJamaah?: string;
  type?: string;
  amount: number;
  status?: string;
  description?: string;
  createdAt?: string;
}

interface CurrentUserInvoiceData {
  id?: string;
  name?: string;
  namaLengkap?: string;
  brandName?: string;
  logo?: string;
  customMitraProfile?: {
    logo?: string;
  };
  alamat?: string;
  noHp?: string;
  phone?: string;
}

interface Jamaah {
  id: string;
  namaJamaah: string;
  nama: string; // fallback
  nomorPassport?: string;
  noHp?: string;
  paketId: string;
  paketNama?: string;
  jenisPaket: 'master' | 'mitra';
  statusPembayaran: 'Lunas' | 'DP' | 'Belum Bayar' | 'pending';
  statusKeberangkatan: 'menunggu' | 'proses visa' | 'siap berangkat' | 'berangkat' | 'selesai';
  totalHarga: number;
  jumlahBayar: number;
  roomType: 'Double' | 'Triple' | 'Quad';
  docPassport?: boolean;
  docKtp?: boolean;
  docVaccine?: boolean;
  docFoto?: boolean;
  mitraId: string;
  createdAt?: unknown;

  // New Manifest Fields
  title?: string;
  nama_paspor?: string;
  no_paspor?: string;
  tgl_issue_paspor?: string;
  tgl_exp_paspor?: string;
  kota_paspor?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  kewarganegaraan?: string;
  nama_ayah?: string;
  alamat?: string;
  jenisKelamin?: 'L' | 'P';
  filePassport?: string;
  fileKtp?: string;
  fileVaccine?: string;
  fileFoto?: string;
  kodeBooking?: string;
  uniqueCode?: string;
}

interface PackageItem {
  id: string;
  nama: string;
  type: 'master' | 'mitra';
  hargaDouble: number;
  hargaTriple: number;
  hargaQuad: number;
}

export const JamaahMitraView: React.FC = () => {
  const [jamaahs, setJamaahs] = useState<Jamaah[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [departureFilter, setDepartureFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isQuickFormOpen, setIsQuickFormOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  
  // Selected items for editing or view
  const [selectedJamaah, setSelectedJamaah] = useState<Jamaah | null>(null);
  const [jamaahToDelete, setJamaahToDelete] = useState<Jamaah | null>(null);

  // Quick Form Fields
  const [quickFormFields, setQuickFormFields] = useState({
    namaJamaah: '',
    noHp: '',
    alamat: '', // Domisili
    paketId: '',
    roomType: 'Quad' as 'Double' | 'Triple' | 'Quad',
  });

  // Form Fields
  const [formFields, setFormFields] = useState({
    namaJamaah: '',
    noHp: '',
    nomorPassport: '',
    paketId: '',
    roomType: 'Quad' as 'Double' | 'Triple' | 'Quad',
    jumlahBayar: 0,
    statusKeberangkatan: 'menunggu' as 'menunggu' | 'proses visa' | 'siap berangkat' | 'berangkat' | 'selesai',
    docPassport: false,
    docKtp: false,
    docVaccine: false,
    docFoto: false,
    
    // New Manifest state
    title: 'MR',
    nama_paspor: '',
    no_paspor: '',
    tgl_issue_paspor: '',
    tgl_exp_paspor: '',
    kota_paspor: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    kewarganegaraan: 'INDONESIA',
    nama_ayah: '',
    alamat: '',
    jenisKelamin: 'L' as 'L' | 'P',
    filePassport: '',
    fileKtp: '',
    fileVaccine: '',
    fileFoto: '',
  });

  // Fast Payment dialog fields
  const [quickPayAmount, setQuickPayAmount] = useState<number>(0);

  // Invoice state variables
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [selectedInvoiceJamaah, setSelectedInvoiceJamaah] = useState<Jamaah | null>(null);
  const [invoiceTxs, setInvoiceTxs] = useState<InvoiceTransaction[]>([]);
  const [currentUserData, setCurrentUserData] = useState<CurrentUserInvoiceData | null>(null);
  const [invoiceNote, setInvoiceNote] = useState('Pembayaran sah dilakukan melalui transfer Bank resmi Mitra atau Kantor Agen pusat. Harap simpan invoice dan kwitansi ini sebagai syarat pengambilan kelengkapan koper, seragam dan keberangkatan.');
  const [invoiceCustomNum, setInvoiceCustomNum] = useState('');
  const [showInvoiceStamp, setShowInvoiceStamp] = useState(true);
  const [cashierName, setCashierName] = useState('');

  const userId = auth.currentUser?.uid;

  // Load current user profile for invoice branding
  useEffect(() => {
    if (!userId) return;
    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const uData = docSnap.data() as CurrentUserInvoiceData;
        setCurrentUserData(uData);
        setCashierName(uData.namaLengkap || uData.name || 'Petugas Administrasi');
      }
    });
    return () => unsubscribe();
  }, [userId]);

  // Load transactions for the selected invoice jamaah
  useEffect(() => {
    if (!selectedInvoiceJamaah) return;
    const q = query(collection(db, 'transactions'), where('bookingId', '==', selectedInvoiceJamaah.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvoiceTransaction));
      txs.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
      setInvoiceTxs(txs);
    });
    return () => unsubscribe();
  }, [selectedInvoiceJamaah]);

  // Real-Time snapshot for bookings under this Mitra
  useEffect(() => {
    if (!userId) return;
    
    setIsLoading(true);
    const bookingQuery = query(collection(db, 'bookings'), where('mitraId', '==', userId));
    const unsubscribeBookings = onSnapshot(bookingQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const item = doc.data();
        
        // Deterministic string hashing for stable fallback values
        const hashCode = (str: string) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
          }
          return hash;
        };
        const deterministicNum = Math.abs(hashCode(doc.id));
        const fallbackBooking = 'ORD-2026-UMR-' + (100000 + (deterministicNum % 900000));
        const fallbackUnique = 'UMR' + (1000 + (deterministicNum % 9000));

        return {
          id: doc.id,
          nama: item.namaJamaah || item.nama || 'Jamaah Baru',
          namaJamaah: item.namaJamaah || item.nama || '',
          nomorPassport: item.nomorPassport || item.no_paspor || '',
          noHp: item.noHp || item.phone || '',
          paketId: item.paketId || '',
          paketNama: item.paketNama || item.paketLabel || 'Paket Pilihan',
          jenisPaket: item.jenisPaket || 'master',
          statusPembayaran: item.statusPembayaran || 'pending',
          statusKeberangkatan: item.statusKeberangkatan || 'menunggu',
          totalHarga: Number(item.totalHarga) || 0,
          jumlahBayar: Number(item.jumlahBayar || item.total_bayar || 0) || 0,
          roomType: item.roomType || 'Quad',
          docPassport: !!item.docPassport,
          docKtp: !!item.docKtp,
          docVaccine: !!item.docVaccine,
          docFoto: !!item.docFoto,
          mitraId: item.mitraId || userId,
          
          // Retrieve new fields
          title: item.title || 'MR',
          nama_paspor: item.nama_paspor || '',
          no_paspor: item.no_paspor || item.nomorPassport || '',
          tgl_issue_paspor: item.tgl_issue_paspor || '',
          tgl_exp_paspor: item.tgl_exp_paspor || '',
          kota_paspor: item.kota_paspor || '',
          tempat_lahir: item.tempat_lahir || '',
          tanggal_lahir: item.tanggal_lahir || '',
          kewarganegaraan: item.kewarganegaraan || 'INDONESIA',
          nama_ayah: item.nama_ayah || '',
          alamat: item.alamat || '',
          jenisKelamin: item.jenisKelamin || 'L',
          filePassport: item.filePassport || '',
          fileKtp: item.fileKtp || '',
          fileVaccine: item.fileVaccine || '',
          fileFoto: item.fileFoto || '',
          kodeBooking: (item.kodeBooking && item.kodeBooking !== 'undefined') ? item.kodeBooking : fallbackBooking,
          uniqueCode: (item.uniqueCode && item.uniqueCode !== 'undefined') ? item.uniqueCode : fallbackUnique,
        };
      }) as Jamaah[];
      
      setJamaahs(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error reading real-time bookings:", error);
      handleFirestoreError(error, OperationType.LIST, 'bookings');
      setIsLoading(false);
    });

    return () => unsubscribeBookings();
  }, [userId]);

  // Real-Time snapshot of master & user packages
  useEffect(() => {
    if (!userId) return;

    // Fetch master packages
    const qMaster = query(collection(db, 'paket_master'), where('status', '==', 'published'));
    const unsubscribeMaster = onSnapshot(qMaster, (snapshot) => {
      const masterItems = snapshot.docs.map(d => {
        const item = d.data();
        return {
          id: d.id,
          nama: item.nama || 'Paket Pusat',
          type: 'master' as const,
          hargaDouble: Number(item.hargaJualDouble || item.hargaDouble || (item.hargaDasar ? item.hargaDasar * 1.2 : 45000000)) || 45000000,
          hargaTriple: Number(item.hargaJualTriple || item.hargaTriple || (item.hargaDasar ? item.hargaDasar * 1.1 : 41000000)) || 41000000,
          hargaQuad: Number(item.hargaJualQuad || item.hargaQuad || item.hargaDasar || 38000000) || 38000000,
        };
      });

      // Fetch user's custom partner packages
      const qMitra = query(collection(db, 'paket_mitra'), where('mitraId', '==', userId));
      const unsubscribeMitra = onSnapshot(qMitra, (mitraSnap) => {
        const mitraItems = mitraSnap.docs.map(d => {
          const item = d.data();
          return {
            id: d.id,
            nama: item.namaPaketMitra || item.nama || 'Paket Kustom Mitra',
            type: 'mitra' as const,
            hargaDouble: Number(item.hargaJualDouble || item.hargaDouble || 45000000),
            hargaTriple: Number(item.hargaJualTriple || item.hargaTriple || 41000000),
            hargaQuad: Number(item.hargaJualQuad || item.hargaQuad || 38000000),
          };
        });

        // Combine both
        setPackages([...masterItems, ...mitraItems]);
      });

      return () => unsubscribeMitra();
    }, (error) => {
      console.error("Error fetching packages:", error);
    });

    return () => unsubscribeMaster();
  }, [userId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Calculations for Stats Section
  const totalCount = jamaahs.length;
  const rawRevenue = jamaahs.reduce((sum, j) => sum + j.totalHarga, 0);
  const realizedRevenue = jamaahs.reduce((sum, j) => sum + j.jumlahBayar, 0);
  const outstandingRevenue = rawRevenue - realizedRevenue;
  const readyDepartureCount = jamaahs.filter(j => j.statusKeberangkatan === 'siap berangkat').length;
  const progressVisaCount = jamaahs.filter(j => j.statusKeberangkatan === 'proses visa').length;
  const activeQuickPackage = packages.find(p => p.id === quickFormFields.paketId);

  const handleOpenQuickRegister = () => {
    setQuickFormFields({
      namaJamaah: '',
      noHp: '',
      alamat: '',
      paketId: packages[0]?.id || '',
      roomType: 'Quad',
    });
    setIsQuickFormOpen(true);
  };

  const handleSaveQuickJamaah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (!quickFormFields.namaJamaah.trim()) {
      alert('Nama Jamaah wajib diisi.');
      return;
    }
    if (!quickFormFields.noHp.trim()) {
      alert('Nomor WhatsApp wajib diisi.');
      return;
    }
    if (!quickFormFields.alamat.trim()) {
      alert('Domisili wajib diisi.');
      return;
    }

    try {
      const targetPackage = packages.find(p => p.id === quickFormFields.paketId);
      const pkgNama = targetPackage ? targetPackage.nama : 'Paket Pilihan';
      const pkgType = targetPackage ? targetPackage.type : 'master';
      
      let price = 38000000;
      if (targetPackage) {
        if (quickFormFields.roomType === 'Double') {
          price = targetPackage.hargaDouble;
        } else if (quickFormFields.roomType === 'Triple') {
          price = targetPackage.hargaTriple;
        } else {
          price = targetPackage.hargaQuad;
        }
      }

      const bookingPayload = {
        kodeBooking: 'ORD-2026-UMR-' + Math.floor(100000 + Math.random() * 900000),
        uniqueCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        namaJamaah: quickFormFields.namaJamaah,
        nama: quickFormFields.namaJamaah,
        noHp: quickFormFields.noHp,
        phone: quickFormFields.noHp,
        nomorPassport: '',
        paketId: quickFormFields.paketId,
        paketNama: pkgNama,
        paketLabel: pkgNama,
        jenisPaket: pkgType,
        roomType: quickFormFields.roomType,
        totalHarga: price,
        jumlahBayar: 0,
        statusPembayaran: 'Belum Bayar' as const,
        statusKeberangkatan: 'menunggu' as const,
        docPassport: false,
        docKtp: false,
        docVaccine: false,
        docFoto: false,
        mitraId: userId,
        updatedAt: new Date().toISOString(),
        
        title: 'MR',
        nama_paspor: quickFormFields.namaJamaah,
        no_paspor: '',
        tgl_issue_paspor: '',
        tgl_exp_paspor: '',
        kota_paspor: '',
        tempat_lahir: '',
        tanggal_lahir: '',
        kewarganegaraan: 'INDONESIA',
        nama_ayah: '',
        alamat: quickFormFields.alamat, // Domisili
        jenisKelamin: 'L',
        filePassport: '',
        fileKtp: '',
        fileVaccine: '',
        fileFoto: '',
      };

      // Close modal and reset fields immediately to provide pristine, fast UI feedback (no-await flow)
      setIsQuickFormOpen(false);
      const submittedName = quickFormFields.namaJamaah;
      setQuickFormFields({
        namaJamaah: '',
        noHp: '',
        alamat: '',
        paketId: packages[0]?.id || '',
        roomType: 'Quad',
      });

      alert(`Registrasi Kilat Berhasil!\nJamaah "${submittedName}" telah ditambahkan.`);

      // Fire the asynchronous cloud store writes in background
      addDoc(collection(db, 'bookings'), {
        ...bookingPayload,
        createdAt: new Date().toISOString()
      }).then((docRef) => {
        syncBookingToTracker(docRef.id, {
          ...bookingPayload,
          createdAt: new Date().toISOString()
        }).catch(syncErr => {
          console.error("Background sync failed:", syncErr);
        });
      }).catch(err => {
        console.error("Background addDoc failed:", err);
        handleFirestoreError(err, OperationType.WRITE, 'bookings');
      });

    } catch (err) {
      console.error("Error setting up quick booking:", err);
      alert("Gagal memproses registrasi kilat: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleOpenRegister = () => {
    setSelectedJamaah(null);
    setFormFields({
      namaJamaah: '',
      noHp: '',
      nomorPassport: '',
      paketId: packages[0]?.id || '',
      roomType: 'Quad',
      jumlahBayar: 0,
      statusKeberangkatan: 'menunggu',
      docPassport: false,
      docKtp: false,
      docVaccine: false,
      docFoto: false,
      
      // Defaults
      title: 'MR',
      nama_paspor: '',
      no_paspor: '',
      tgl_issue_paspor: '',
      tgl_exp_paspor: '',
      kota_paspor: '',
      tempat_lahir: '',
      tanggal_lahir: '',
      kewarganegaraan: 'INDONESIA',
      nama_ayah: '',
      alamat: '',
      jenisKelamin: 'L',
      filePassport: '',
      fileKtp: '',
      fileVaccine: '',
      fileFoto: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (jamaah: Jamaah) => {
    setSelectedJamaah(jamaah);
    setFormFields({
      namaJamaah: jamaah.namaJamaah,
      noHp: jamaah.noHp || '',
      nomorPassport: jamaah.nomorPassport || jamaah.no_paspor || '',
      paketId: jamaah.paketId,
      roomType: jamaah.roomType || 'Quad',
      jumlahBayar: jamaah.jumlahBayar,
      statusKeberangkatan: jamaah.statusKeberangkatan,
      docPassport: jamaah.docPassport || false,
      docKtp: jamaah.docKtp || false,
      docVaccine: jamaah.docVaccine || false,
      docFoto: jamaah.docFoto || false,
      
      // Manifest states
      title: jamaah.title || 'MR',
      nama_paspor: jamaah.nama_paspor || '',
      no_paspor: jamaah.no_paspor || jamaah.nomorPassport || '',
      tgl_issue_paspor: jamaah.tgl_issue_paspor || '',
      tgl_exp_paspor: jamaah.tgl_exp_paspor || '',
      kota_paspor: jamaah.kota_paspor || '',
      tempat_lahir: jamaah.tempat_lahir || '',
      tanggal_lahir: jamaah.tanggal_lahir || '',
      kewarganegaraan: jamaah.kewarganegaraan || 'INDONESIA',
      nama_ayah: jamaah.nama_ayah || '',
      alamat: jamaah.alamat || '',
      jenisKelamin: jamaah.jenisKelamin || 'L',
      filePassport: jamaah.filePassport || '',
      fileKtp: jamaah.fileKtp || '',
      fileVaccine: jamaah.fileVaccine || '',
      fileFoto: jamaah.fileFoto || '',
    });
    setIsFormOpen(true);
  };

  const handleOpenPayment = (jamaah: Jamaah) => {
    setSelectedJamaah(jamaah);
    setQuickPayAmount(0);
    setIsPaymentOpen(true);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSaveJamaah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (!formFields.namaJamaah.trim()) {
      alert('Nama Jamaah wajib diisi.');
      return;
    }

    try {
      // Find selected package to dynamically associate pricing
      const targetPackage = packages.find(p => p.id === formFields.paketId);
      const pkgNama = targetPackage ? targetPackage.nama : 'Paket Pilihan';
      const pkgType = targetPackage ? targetPackage.type : 'master';
      
      // Compute targeted total price depending on the room configuration
      let price = 38000000;
      if (targetPackage) {
        if (formFields.roomType === 'Double') price = targetPackage.hargaDouble;
        else if (formFields.roomType === 'Triple') price = targetPackage.hargaTriple;
        else price = targetPackage.hargaQuad;
      }

      // Automatically evaluate state of payments
      const paid = Number(formFields.jumlahBayar) || 0;
      let statusPemb: 'Lunas' | 'DP' | 'Belum Bayar' = 'Belum Bayar';
      if (paid >= price) statusPemb = 'Lunas';
      else if (paid > 0) statusPemb = 'DP';

      const cleanKode = (selectedJamaah?.kodeBooking && selectedJamaah?.kodeBooking !== 'undefined') ? selectedJamaah.kodeBooking : null;
      const cleanUniq = (selectedJamaah?.uniqueCode && selectedJamaah?.uniqueCode !== 'undefined') ? selectedJamaah.uniqueCode : null;

      const bookingPayload = {
        kodeBooking: cleanKode || ('ORD-2026-UMR-' + Math.floor(100000 + Math.random() * 900000)),
        uniqueCode: cleanUniq || Math.random().toString(36).substring(2, 8).toUpperCase(),
        namaJamaah: formFields.namaJamaah,
        nama: formFields.namaJamaah,
        noHp: formFields.noHp,
        phone: formFields.noHp,
        nomorPassport: formFields.nomorPassport || formFields.no_paspor,
        paketId: formFields.paketId,
        paketNama: pkgNama,
        paketLabel: pkgNama,
        jenisPaket: pkgType,
        roomType: formFields.roomType,
        totalHarga: price,
        jumlahBayar: paid,
        statusPembayaran: statusPemb,
        statusKeberangkatan: formFields.statusKeberangkatan,
        docPassport: formFields.docPassport,
        docKtp: formFields.docKtp,
        docVaccine: formFields.docVaccine,
        docFoto: formFields.docFoto,
        mitraId: userId,
        updatedAt: new Date().toISOString(),
        
        // Save new manifest fields
        title: formFields.title,
        nama_paspor: formFields.nama_paspor || formFields.namaJamaah,
        no_paspor: formFields.no_paspor || formFields.nomorPassport,
        tgl_issue_paspor: formFields.tgl_issue_paspor,
        tgl_exp_paspor: formFields.tgl_exp_paspor,
        kota_paspor: formFields.kota_paspor,
        tempat_lahir: formFields.tempat_lahir,
        tanggal_lahir: formFields.tanggal_lahir,
        kewarganegaraan: formFields.kewarganegaraan,
        nama_ayah: formFields.nama_ayah,
        alamat: formFields.alamat,
        jenisKelamin: formFields.jenisKelamin,
        filePassport: formFields.filePassport,
        fileKtp: formFields.fileKtp,
        fileVaccine: formFields.fileVaccine,
        fileFoto: formFields.fileFoto,
      };

      // Close modal and clear state immediately to ensure absolute visual responsiveness
      setIsFormOpen(false);
      const isEditing = !!selectedJamaah;
      const editingId = selectedJamaah?.id;
      const currentJamaahCopy = selectedJamaah ? { ...selectedJamaah } : null;
      setSelectedJamaah(null);

      alert(isEditing ? `Perubahan data jamaah sedang diperbarui...` : `Jamaah baru "${bookingPayload.namaJamaah}" berhasil didaftarkan.`);

      // Perform the database writes in the background asynchronously
      if (isEditing && editingId) {
        // Edit Mode write in background
        updateDoc(doc(db, 'bookings', editingId), bookingPayload).then(() => {
          syncBookingToTracker(editingId, {
            ...currentJamaahCopy,
            ...bookingPayload
          }).catch(syncErr => console.error("Background sync failed:", syncErr));
        }).catch(err => {
          console.error("Background updateDoc failed:", err);
          handleFirestoreError(err, OperationType.WRITE, 'bookings');
        });
      } else {
        // Create Mode write in background
        addDoc(collection(db, 'bookings'), {
          ...bookingPayload,
          createdAt: new Date().toISOString()
        }).then((docRef) => {
          syncBookingToTracker(docRef.id, {
            ...bookingPayload,
            createdAt: new Date().toISOString()
          }).catch(syncErr => console.error("Background sync failed:", syncErr));
        }).catch(err => {
          console.error("Background addDoc failed:", err);
          handleFirestoreError(err, OperationType.WRITE, 'bookings');
        });
      }

    } catch (err) {
      console.error("Error setting up booking:", err);
      alert("Gagal memproses data jamaah: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const confirmDeleteJamaah = async () => {
    if (!jamaahToDelete) return;
    try {
      await deleteDoc(doc(db, 'bookings', jamaahToDelete.id));
      await deleteBookingFromTracker(jamaahToDelete.id);
      setJamaahToDelete(null);
    } catch (err) {
      console.error("Error deleting booking:", err);
      handleFirestoreError(err, OperationType.DELETE, `bookings/${jamaahToDelete.id}`);
    }
  };

  const handlePostQuickPayment = async () => {
    if (!selectedJamaah) return;
    try {
      const addedPay = Number(quickPayAmount) || 0;
      if (addedPay <= 0) {
        alert('Masukkan nominal pembayaran yang valid.');
        return;
      }

      // Read current total and existing amount
      const targetTotal = selectedJamaah.totalHarga;
      const newPaid = selectedJamaah.jumlahBayar + addedPay;
      
      let statusPemb: 'Lunas' | 'DP' | 'Belum Bayar' = 'Belum Bayar';
      if (newPaid >= targetTotal) statusPemb = 'Lunas';
      else if (newPaid > 0) statusPemb = 'DP';

      await updateDoc(doc(db, 'bookings', selectedJamaah.id), {
        jumlahBayar: newPaid,
        statusPembayaran: statusPemb,
        updatedAt: new Date().toISOString()
      });

      await syncBookingToTracker(selectedJamaah.id, {
        ...selectedJamaah,
        jumlahBayar: newPaid,
        statusPembayaran: statusPemb,
        updatedAt: new Date().toISOString()
      });

      // Simulated transaction write for history audit trail
      await addDoc(collection(db, 'transactions'), {
        userId: auth.currentUser?.uid,
        bookingId: selectedJamaah.id,
        namaJamaah: selectedJamaah.namaJamaah,
        type: 'deposit',
        amount: addedPay,
        status: 'approved',
        description: `Setoran pembayaran ke paket "${selectedJamaah.paketNama}"`,
        createdAt: new Date().toISOString()
      });

      setIsPaymentOpen(false);
      setSelectedJamaah(null);
    } catch (err) {
      console.error("Error writing quick payment transaction:", err);
      handleFirestoreError(err, OperationType.WRITE, 'bookings');
    }
  };

  // Toggle checklist for individual documents quickly inline
  const handleToggleDocInline = async (jamaah: Jamaah, field: 'docPassport' | 'docKtp' | 'docVaccine' | 'docFoto') => {
    try {
      const currentVal = !!jamaah[field];
      await updateDoc(doc(db, 'bookings', jamaah.id), {
        [field]: !currentVal,
        updatedAt: new Date().toISOString()
      });
      await syncBookingToTracker(jamaah.id, {
        ...jamaah,
        [field]: !currentVal,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error updating doc checklist inline:", err);
    }
  };

  const renderCompletionBadge = (jamaah: Jamaah) => {
    const fields = [
      { label: 'Nama Lengkap', val: jamaah.namaJamaah || jamaah.nama },
      { label: 'No. HP', val: jamaah.noHp },
      { label: 'Domisili', val: jamaah.alamat },
      { label: 'Tipe Kamar', val: jamaah.roomType },
      { label: 'Tempat Lahir', val: jamaah.tempat_lahir },
      { label: 'Tanggal Lahir', val: jamaah.tanggal_lahir },
      { label: 'Jenis Kelamin', val: jamaah.jenisKelamin },
      { label: 'Nama Ayah', val: jamaah.nama_ayah },
      { label: 'No. Paspor', val: jamaah.nomorPassport || jamaah.no_paspor },
      { label: 'Tgl Issue Paspor', val: jamaah.tgl_issue_paspor },
      { label: 'Tgl Exp Paspor', val: jamaah.tgl_exp_paspor },
      { label: 'Kota Paspor', val: jamaah.kota_paspor },
      { label: 'Berkas Paspor', val: jamaah.filePassport || jamaah.docPassport },
      { label: 'Berkas KTP', val: jamaah.fileKtp || jamaah.docKtp },
      { label: 'Berkas Vaksin', val: jamaah.fileVaccine || jamaah.docVaccine },
      { label: 'Pas Foto', val: jamaah.fileFoto || jamaah.docFoto },
    ];

    const total = fields.length;
    const filled = fields.filter(f => {
      if (typeof f.val === 'string') return f.val.trim().length > 0;
      if (typeof f.val === 'boolean') return f.val === true;
      return !!f.val;
    }).length;

    const pct = Math.round((filled / total) * 100);

    let barColor = 'bg-rose-500';
    let textColor = 'text-rose-600 bg-rose-50 border-rose-100';
    if (pct >= 80) {
      barColor = 'bg-emerald-500';
      textColor = 'text-emerald-700 bg-emerald-50 border-emerald-100';
    } else if (pct >= 40) {
      barColor = 'bg-amber-500';
      textColor = 'text-amber-700 bg-amber-50 border-amber-100';
    }

    const unfilledLabels = fields.filter(f => {
      if (typeof f.val === 'string') return f.val.trim().length === 0;
      if (typeof f.val === 'boolean') return f.val !== true;
      return !f.val;
    }).map(f => f.label);

    const tooltipText = unfilledLabels.length > 0 
      ? `Belum diisi: ${unfilledLabels.slice(0, 3).join(', ')}${unfilledLabels.length > 3 ? '...' : ''}`
      : 'Semua data lengkap!';

    return (
      <div className="flex flex-col items-center justify-center gap-1 min-w-[120px]" title={tooltipText}>
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${textColor} tracking-wider`}>
          {pct}% Lengkap
        </span>
        <div className="w-20 bg-gray-100 h-1.5 rounded-full overflow-hidden border border-gray-200/50">
          <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">
          {filled}/{total} Kolom
        </span>
      </div>
    );
  };

  // Process search and filters
  const filteredJamaahs = jamaahs.filter(j => {
    const matchesSearch = j.namaJamaah.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          j.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (j.paketNama || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPayment = paymentFilter === 'all' || 
                            (paymentFilter === 'Lunas' && j.statusPembayaran === 'Lunas') ||
                            (paymentFilter === 'DP' && (j.statusPembayaran === 'DP' || j.statusPembayaran === 'pending')) ||
                            (paymentFilter === 'Belum Bayar' && j.statusPembayaran === 'Belum Bayar');

    const matchesDeparture = departureFilter === 'all' || j.statusKeberangkatan === departureFilter;

    return matchesSearch && matchesPayment && matchesDeparture;
  });

  return (
    <div className="space-y-6">
      
      {/* Header and Action Banner */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-purple-50 text-purple-700">
              <User className="w-5 h-5 text-purple-700" />
            </span>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              Pilgrim Control Hub <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-black uppercase">LIVE DIRECTORY</span>
            </h1>
          </div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-1">
            Sistem integrasi real-time status pendaftaran, dokumen kliring, dan tagihan keuangan jamaah.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleOpenQuickRegister}
            className="bg-amber-600 hover:bg-amber-750 text-white font-extrabold text-xs uppercase px-5 py-4 rounded-2xl transition shadow-lg shadow-amber-600/10 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> ⚡ Registrasi Kilat
          </button>
          <button 
            onClick={handleOpenRegister}
            className="bg-purple-600 hover:bg-purple-750 text-white font-extrabold text-xs uppercase px-5 py-4 rounded-2xl transition shadow-lg shadow-purple-600/10 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Daftarkan Jamaah Baru (Lengkap)
          </button>
        </div>
      </div>

      {/* METRICS & FINANCES BOARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registered */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
          <div className="flex items-center gap-3.5 mb-3">
            <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
              <User className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">TOTAL JAMAAH</p>
          </div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none">{totalCount} <span className="text-xs font-bold text-gray-400">pax</span></h3>
          <p className="text-[10px] font-bold text-emerald-500 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Active in database pipelines
          </p>
        </div>

        {/* Realized Cash Vs Expected */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
          <div className="flex items-center gap-3.5 mb-3">
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-500">
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">REALISASI SETORAN</p>
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">{formatCurrency(realizedRevenue)}</h3>
          {/* Progress bar showing portion paid vs total */}
          <div className="w-full bg-gray-105 h-1.5 rounded-full overflow-hidden mt-3 mb-1">
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-1000" 
              style={{ width: `${rawRevenue > 0 ? (realizedRevenue / rawRevenue) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[9px] font-black uppercase text-gray-400">
            <span>Progress: {rawRevenue > 0 ? Math.round((realizedRevenue / rawRevenue) * 100) : 0}%</span>
            <span>Total: {formatCurrency(rawRevenue)}</span>
          </div>
        </div>

        {/* Piutang / Outstanding */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
          <div className="flex items-center gap-3.5 mb-3">
            <div className="p-3 bg-rose-50 rounded-2xl text-rose-500">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">OUTSTANDING PIUTANG</p>
          </div>
          <h3 className="text-2xl font-black text-rose-600 tracking-tight">{formatCurrency(outstandingRevenue)}</h3>
          <p className="text-[10px] font-bold text-rose-400 mt-2 flex items-center gap-1 uppercase tracking-wider">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Sisa Tagihan Berjalan
          </p>
        </div>

        {/* Departure Readiness */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
          <div className="flex items-center gap-3.5 mb-3">
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-500">
              <Calendar className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">STATUS KEBERANGKATAN</p>
          </div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none">
            {readyDepartureCount} <span className="text-xs font-bold text-gray-400">Siap</span>
          </h3>
          <p className="text-[10px] font-medium text-gray-400 mt-2">
            <strong>{progressVisaCount}</strong> Jamaah sedang proses Visa & Dokumen
          </p>
        </div>
      </div>

      {/* FILTER BAR & REAL SEARCH CONTROLS */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-center gap-4">
          
          <div className="relative w-full lg:flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari nama jamaah, ID booking, atau nama paket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-purple-500 rounded-2xl text-xs font-semibold outline-none transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Status Pembayaran filter */}
            <div className="flex-1 min-w-[140px] lg:flex-none">
              <select
                value={paymentFilter}
                onChange={e => setPaymentFilter(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl text-xs font-black px-4 py-3.5 text-gray-700 outline-none hover:border-gray-300 transition"
              >
                <option value="all">💳 SEMUA PEMBAYARAN</option>
                <option value="Lunas">Lunas</option>
                <option value="DP">DP (Setor Uangmuka)</option>
                <option value="Belum Bayar">Belum Bayar</option>
              </select>
            </div>

            {/* Departure Status filter */}
            <div className="flex-1 min-w-[140px] lg:flex-none">
              <select
                value={departureFilter}
                onChange={e => setDepartureFilter(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl text-xs font-black px-4 py-3.5 text-gray-700 outline-none hover:border-gray-300 transition"
              >
                <option value="all">✈️ SEMUA KEBERANGKATAN</option>
                <option value="menunggu">Menunggu</option>
                <option value="proses visa">Proses Visa</option>
                <option value="siap berangkat">Siap Berangkat</option>
                <option value="berangkat">Berangkat</option>
                <option value="selesai">Selesai</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* JAMAAH DIRECTORY TABLE */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden pb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/70 text-gray-400 text-[10px] font-black uppercase tracking-[0.1em] border-b border-gray-100">
                <th className="p-5">PROFIL JAMAAH</th>
                <th className="p-5">PAKET & RUANGAN</th>
                <th className="p-5 text-center">KELENGKAPAN DATA</th>
                <th className="p-5 text-center">CHECKLIST REAL DOKUMEN (FAST TOGGLE)</th>
                <th className="p-5 text-center">FINANSIAL LAPORAN</th>
                <th className="p-5 text-center">KEBERANGKATAN</th>
                <th className="p-5 text-right w-36">AKSI PIPELINE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="animate-spin text-purple-600 w-8 h-8" />
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-2">Membaca Database Real...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredJamaahs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-24 text-center">
                    <div className="max-w-md mx-auto py-8">
                      <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4 text-purple-400">
                        <User className="w-8 h-8" />
                      </div>
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-1">
                        Belum ada data jamaah cocok
                      </h4>
                      <p className="text-xs text-gray-500 font-medium">
                        Daftarkan jamaah baru Anda sekarang atau sesuaikan parameter pencarian dan filter di atas.
                      </p>
                      <button 
                        onClick={handleOpenRegister}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-5 py-2.5 rounded-xl transition shadow mt-4 active:scale-95"
                      >
                        Register Baru
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJamaahs.map((jamaah) => {
                  const sisa = jamaah.totalHarga - jamaah.jumlahBayar;
                  return (
                    <tr key={jamaah.id} className="hover:bg-gray-50/40 transition group">
                      {/* Name & Contact */}
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-extrabold group-hover:scale-110 transition-transform">
                            {jamaah.namaJamaah.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-sm">{jamaah.namaJamaah}</p>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5 flex flex-wrap items-center gap-1 font-bold">
                              <span>HP: {jamaah.noHp || '-'}</span>
                              {jamaah.nomorPassport && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <span className="bg-gray-100 text-gray-600 px-1 py-0.2 rounded text-[9px]">Passport: {jamaah.nomorPassport}</span>
                                </>
                              )}
                            </p>
                            
                            {/* Pilgrim Portal access credentials */}
                            <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[9px] font-sans">
                              <span className="bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-200">
                                <span className="text-amber-600 font-black">🔑PORTAL</span>
                                <span>{jamaah.kodeBooking}</span>
                                <span className="opacity-40">|</span>
                                <span className="text-gray-500 font-medium font-mono">Sandi:</span>
                                <span className="font-mono text-emerald-800 font-black">{jamaah.uniqueCode}</span>
                              </span>
                              
                              {jamaah.noHp && (
                                <a
                                  href={`https://api.whatsapp.com/send?phone=${(() => {
                                    const cleaned = jamaah.noHp.replace(/\D/g, '');
                                    return cleaned.startsWith('0') ? '62' + cleaned.substring(1) : cleaned;
                                  })()}&text=${encodeURIComponent(
                                    `Assalamu'alaikum Wr. Wb. Yth. Bpk/Ibu *${jamaah.namaJamaah}*,\n\nBerikut adalah akses resmi ke *Portal Mandiri Jamaah Umaroh*:\n\n🌐 *Buka Link:* https://jamaah.umaroh.com\n🔑 *Kode Booking:* \`${jamaah.kodeBooking || '-'}\`\n🔒 *Sandi/Kode Unik:* \`${jamaah.uniqueCode || '-'}\`\n\n_Silakan masuk ke Portal tersebut untuk melengkapi data manifest, upload berkas dokumen pendukung (Passport, KTP, Pas Foto) serta cetak invoice / Kwitansi Pembayaran secara mandiri._ Terima kasih.`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-black px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5 transition"
                                >
                                  💬 Kirim WA
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Package & Seat info */}
                      <td className="p-5">
                        <div>
                          <p className="text-xs font-black text-gray-800 leading-normal line-clamp-1">{jamaah.paketNama}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              jamaah.jenisPaket === 'mitra' 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {jamaah.jenisPaket === 'mitra' ? 'Paket Markup Saya' : 'Paket Pusat'}
                            </span>
                            <span className="text-[9px] font-black text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">
                              🛏️ {jamaah.roomType} Room
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Completion Badge */}
                      <td className="p-5 text-center">
                        {renderCompletionBadge(jamaah)}
                      </td>

                      {/* Fast Checklist Docs */}
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center gap-4">
                          <div className="relative inline-block">
                            <button
                              onClick={() => handleToggleDocInline(jamaah, 'docPassport')}
                              className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all ${
                                jamaah.docPassport 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                  : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-300'
                              }`}
                              title="Klik untuk ubah status Paspor"
                            >
                              <CheckSquare className="w-4 h-4" />
                              <span className="text-[8px] font-extrabold uppercase">PASPOR</span>
                            </button>
                            {jamaah.filePassport && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const win = window.open();
                                  if (win) {
                                    win.document.title = `Paspor - ${jamaah.namaJamaah}`;
                                    win.document.write(`<iframe src="${jamaah.filePassport}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                  }
                                }}
                                className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white rounded-full p-0.5 hover:bg-purple-700 transition shadow-xs"
                                title="Lihat/Download Berkas Paspor"
                              >
                                <Eye className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>

                          <div className="relative inline-block">
                            <button
                              onClick={() => handleToggleDocInline(jamaah, 'docKtp')}
                              className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all ${
                                jamaah.docKtp 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                  : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-300'
                              }`}
                              title="Klik untuk ubah status KTP"
                            >
                              <CheckSquare className="w-4 h-4" />
                              <span className="text-[8px] font-extrabold uppercase">KTP</span>
                            </button>
                            {jamaah.fileKtp && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const win = window.open();
                                  if (win) {
                                    win.document.title = `KTP - ${jamaah.namaJamaah}`;
                                    win.document.write(`<iframe src="${jamaah.fileKtp}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                  }
                                }}
                                className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white rounded-full p-0.5 hover:bg-purple-700 transition shadow-xs"
                                title="Lihat/Download Berkas KTP"
                              >
                                <Eye className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>

                          <div className="relative inline-block">
                            <button
                              onClick={() => handleToggleDocInline(jamaah, 'docVaccine')}
                              className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all ${
                                jamaah.docVaccine 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                  : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-300'
                              }`}
                              title="Klik untuk ubah status Vaksin"
                            >
                              <CheckSquare className="w-4 h-4" />
                              <span className="text-[8px] font-extrabold uppercase">VAKSIN</span>
                            </button>
                            {jamaah.fileVaccine && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const win = window.open();
                                  if (win) {
                                    win.document.title = `Vaksin - ${jamaah.namaJamaah}`;
                                    win.document.write(`<iframe src="${jamaah.fileVaccine}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                  }
                                }}
                                className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white rounded-full p-0.5 hover:bg-purple-700 transition shadow-xs"
                                title="Lihat/Download Berkas Vaksin"
                              >
                                <Eye className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>

                          <div className="relative inline-block">
                            <button
                              onClick={() => handleToggleDocInline(jamaah, 'docFoto')}
                              className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all ${
                                jamaah.docFoto 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                  : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-300'
                              }`}
                              title="Klik untuk ubah status Pas Foto"
                            >
                              <CheckSquare className="w-4 h-4" />
                              <span className="text-[8px] font-extrabold uppercase">FOTO</span>
                            </button>
                            {jamaah.fileFoto && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const win = window.open();
                                  if (win) {
                                    win.document.title = `Pas Foto - ${jamaah.namaJamaah}`;
                                    win.document.write(`<iframe src="${jamaah.fileFoto}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                  }
                                }}
                                className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white rounded-full p-0.5 hover:bg-purple-700 transition shadow-xs"
                                title="Lihat/Download Pas Foto"
                              >
                                <Eye className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Billing reports */}
                      <td className="p-5 text-center">
                        <div className="inline-block text-left">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-black text-gray-900 leading-tight">{formatCurrency(jamaah.totalHarga)}</p>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5 whitespace-nowrap">
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.1 rounded-full uppercase ${
                              jamaah.statusPembayaran === 'Lunas' ? 'bg-emerald-100 text-emerald-700 text-[8px]' :
                              jamaah.statusPembayaran === 'DP' ? 'bg-amber-100 text-amber-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {jamaah.statusPembayaran === 'Lunas' ? 'LUNAS' : jamaah.statusPembayaran === 'DP' ? 'DP SETOR' : 'BELUM SETOR'}
                            </span>
                            <span className="text-[9px] font-bold text-gray-500">
                              Terbayar: {formatCurrency(jamaah.jumlahBayar)}
                            </span>
                          </div>
                          {sisa > 0 && (
                            <p className="text-[9px] text-rose-600 font-extrabold mt-0.5">Sisa: -{formatCurrency(sisa)}</p>
                          )}
                        </div>
                      </td>

                      {/* Departure and flight tracker status */}
                      <td className="p-5 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                          jamaah.statusKeberangkatan === 'siap berangkat' ? 'bg-emerald-100 text-emerald-700' :
                          jamaah.statusKeberangkatan === 'proses visa' ? 'bg-blue-100 text-blue-700' :
                          jamaah.statusKeberangkatan === 'berangkat' ? 'bg-violet-100 text-violet-700' :
                          jamaah.statusKeberangkatan === 'selesai' ? 'bg-gray-100 text-gray-600' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {jamaah.statusKeberangkatan === 'siap berangkat' && '✅ SIAP JALAN'}
                          {jamaah.statusKeberangkatan === 'proses visa' && '📂 PROSES VISA'}
                          {jamaah.statusKeberangkatan === 'berangkat' && '✈️ DI HARAMAIN'}
                          {jamaah.statusKeberangkatan === 'selesai' && '🏁 SELESAI'}
                          {jamaah.statusKeberangkatan === 'menunggu' && '⏳ MENUNGGU'}
                        </span>
                      </td>

                      {/* Row Actions Menu */}
                      <td className="p-5 text-right relative">
                        <div className="flex items-center justify-end gap-1.5 font-sans">
                          <button
                            onClick={() => {
                              setSelectedInvoiceJamaah(jamaah);
                              setInvoiceCustomNum(`INV/${new Date().getFullYear()}/UMR/${jamaah.id.substring(0, 6).toUpperCase()}`);
                              setIsInvoiceOpen(true);
                            }}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-2 rounded-xl transition cursor-pointer"
                            title="Cetak Invoice & Administrasi Kwitansi"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenPayment(jamaah)}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 p-2 rounded-xl transition"
                            title="Entri Pembayaran Setoran"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(jamaah)}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-700 p-2 rounded-xl transition"
                            title="Edit Dokumen & Data"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setJamaahToDelete(jamaah)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded-xl transition cursor-pointer"
                            title="Batalkan Booking"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* REGISTRATION & EDIT FORM MODAL */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <User className="text-purple-600 w-5 h-5" />
                  {selectedJamaah ? 'Modifikasi Dokumen & Profil' : 'Form Registrasi Jamaah Baru'}
                </h3>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-500 p-2 rounded-full transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveJamaah} className="space-y-5">
                
                {/* PART 1: CHIEF CONTACT */}
                <div className="bg-purple-50/40 p-4 rounded-2xl border border-purple-100/50 space-y-3">
                  <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">Langkah 1: Profil Kontak Utama</span>
                  
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Muhammad Akhyar"
                      value={formFields.namaJamaah}
                      onChange={e => {
                        const val = e.target.value;
                        setFormFields(prev => ({ 
                          ...prev, 
                          namaJamaah: val,
                          nama_paspor: prev.nama_paspor ? prev.nama_paspor : val // Auto-fill passport name
                        }));
                      }}
                      className="w-full px-4 py-3 border border-gray-200 focus:border-purple-500 bg-white rounded-xl text-xs font-semibold outline-none transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Nomor Passport</label>
                      <input
                        type="text"
                        placeholder="Contoh: B1234567"
                        value={formFields.nomorPassport}
                        onChange={e => {
                          const val = e.target.value.toUpperCase();
                          setFormFields(prev => ({ 
                            ...prev, 
                            nomorPassport: val,
                            no_paspor: val 
                          }));
                        }}
                        className="w-full px-4 py-3 border border-gray-200 focus:border-purple-500 bg-white rounded-xl text-xs font-semibold outline-none transition uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">No WhatsApp Aktif</label>
                      <input
                        type="text"
                        placeholder="Contoh: 08123456789"
                        value={formFields.noHp}
                        onChange={e => setFormFields(prev => ({ ...prev, noHp: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 focus:border-purple-500 bg-white rounded-xl text-xs font-semibold outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                {/* PART 2: MANIFEST & PASSPORT DETAILED FIELDS */}
                <div className="p-4 bg-gray-50/55 rounded-2xl border border-gray-200/50 space-y-4">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Langkah 2: Data Manifest Sesuai Paspor & KTP (Opsional)</span>
                  
                  {/* Title & Gender */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Sapaan (Title)</label>
                      <select
                        value={formFields.title}
                        onChange={e => setFormFields(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 focus:border-purple-500 bg-white rounded-xl text-xs font-black outline-none transition"
                      >
                        <option value="MR">MR.</option>
                        <option value="MRS">MRS.</option>
                        <option value="MS">MS.</option>
                        <option value="MSTR">MSTR. (Anak Laki)</option>
                        <option value="MISS">MISS. (Anak Perempuan)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Jenis Kelamin</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormFields(prev => ({ ...prev, jenisKelamin: 'L' }))}
                          className={`py-2 px-1 border rounded-xl flex items-center justify-center gap-1 transition text-xs ${
                            formFields.jenisKelamin === 'L'
                              ? 'bg-purple-100 text-purple-700 border-purple-500 font-extrabold'
                              : 'bg-white hover:bg-gray-50 text-gray-500 border-gray-200 font-bold'
                          }`}
                        >
                          🚹 Laki
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormFields(prev => ({ ...prev, jenisKelamin: 'P' }))}
                          className={`py-2 px-1 border rounded-xl flex items-center justify-center gap-1 transition text-xs ${
                            formFields.jenisKelamin === 'P'
                              ? 'bg-purple-100 text-purple-700 border-purple-500 font-extrabold'
                              : 'bg-white hover:bg-gray-50 text-gray-500 border-gray-200 font-bold'
                          }`}
                        >
                          🚺 Peremp
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Passport Name (Alternate) */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Nama Sesuai Paspor (Ejaan Penuh)</label>
                    <input
                      type="text"
                      placeholder="CONTOH: MUHAMMAD AKHYAR BIN SUBROTO"
                      value={formFields.nama_paspor}
                      onChange={e => setFormFields(prev => ({ ...prev, nama_paspor: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-3 border border-gray-200 focus:border-purple-500 bg-white rounded-xl text-xs font-semibold outline-none transition uppercase"
                    />
                  </div>

                  {/* Place & Date of Birth */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Tempat Lahir</label>
                      <input
                        type="text"
                        placeholder="Contoh: JAKARTA"
                        value={formFields.tempat_lahir}
                        onChange={e => setFormFields(prev => ({ ...prev, tempat_lahir: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-3 border border-gray-200 focus:border-purple-500 bg-white rounded-xl text-xs font-semibold outline-none transition uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Tanggal Lahir</label>
                      <input
                        type="date"
                        value={formFields.tanggal_lahir}
                        onChange={e => setFormFields(prev => ({ ...prev, tanggal_lahir: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 focus:border-purple-500 bg-white rounded-xl text-xs font-semibold outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Passport Issue & Expiry Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Paspor Dikeluarkan</label>
                      <input
                        type="date"
                        value={formFields.tgl_issue_paspor}
                        onChange={e => setFormFields(prev => ({ ...prev, tgl_issue_paspor: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 focus:border-purple-500 bg-white rounded-xl text-xs font-semibold outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Paspor Kadaluarsa</label>
                      <input
                        type="date"
                        value={formFields.tgl_exp_paspor}
                        onChange={e => setFormFields(prev => ({ ...prev, tgl_exp_paspor: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 focus:border-purple-500 bg-white rounded-xl text-xs font-semibold outline-none transition"
                      />
                    </div>
                  </div>

                  {/* City Issued & Nationality */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Kantor Imigrasi (Kota)</label>
                      <input
                        type="text"
                        placeholder="Contoh: JAKARTA SELATAN"
                        value={formFields.kota_paspor}
                        onChange={e => setFormFields(prev => ({ ...prev, kota_paspor: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-3 border border-gray-200 focus:border-purple-500 bg-white rounded-xl text-xs font-semibold outline-none transition uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Kewarganegaraan</label>
                      <input
                        type="text"
                        placeholder="INDONESIA"
                        value={formFields.kewarganegaraan}
                        onChange={e => setFormFields(prev => ({ ...prev, kewarganegaraan: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-3 border border-gray-200 focus:border-purple-500 bg-white rounded-xl text-xs font-semibold outline-none transition uppercase"
                      />
                    </div>
                  </div>

                  {/* Father Name & Alamat */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Nama Ayah Kandung</label>
                      <input
                        type="text"
                        placeholder="Contoh: Ahmad Subagyo"
                        value={formFields.nama_ayah}
                        onChange={e => setFormFields(prev => ({ ...prev, nama_ayah: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-3 border border-gray-200 focus:border-purple-500 bg-white rounded-xl text-xs font-semibold outline-none transition uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Alamat Tempat Tinggal</label>
                      <input
                        type="text"
                        placeholder="Contoh: Perum Indah Block C"
                        value={formFields.alamat}
                        onChange={e => setFormFields(prev => ({ ...prev, alamat: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-3 border border-gray-200 focus:border-purple-500 bg-white rounded-xl text-xs font-semibold outline-none transition uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* PART 3: PACKAGING & DEPOSITS */}
                <div className="p-4 bg-gray-50/55 rounded-2xl border border-gray-200/50 space-y-4">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Langkah 3: Tiket Paket & Ruang Penginapan</span>

                  {/* Package select */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Hubungkan Ke Paket Perjalanan</label>
                    <select
                      value={formFields.paketId}
                      onChange={e => setFormFields(prev => ({ ...prev, paketId: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 focus:border-purple-500 bg-white rounded-xl text-xs font-black outline-none transition"
                    >
                      {packages.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.type === 'mitra' ? '[Markup Saya]' : '[Pusat]'} {p.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Room configurations */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Konfigurasi Penginapan (Room Type)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Double', 'Triple', 'Quad'] as const).map(type => {
                        const activePkg = packages.find(p => p.id === formFields.paketId);
                        let priceForThis = 38000000;
                        if (activePkg) {
                          if (type === 'Double') priceForThis = activePkg.hargaDouble;
                          else if (type === 'Triple') priceForThis = activePkg.hargaTriple;
                          else priceForThis = activePkg.hargaQuad;
                        }

                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setFormFields(prev => ({ ...prev, roomType: type }))}
                            className={`py-3 px-2 border rounded-xl flex flex-col items-center justify-center gap-0.5 transition ${
                              formFields.roomType === type 
                                ? 'bg-purple-50 text-purple-700 border-purple-500 font-extrabold' 
                                : 'bg-white hover:bg-gray-50 text-gray-500 border-gray-200 font-bold'
                            }`}
                          >
                            <span className="text-[10px] sm:text-xs">🛏️ {type}</span>
                            <span className="text-[8px] sm:text-[9px] opacity-70 font-mono">{formatCurrency(priceForThis)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Departure Status */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Status Persiapan Berangkat</label>
                    <select
                      value={formFields.statusKeberangkatan}
                      onChange={e => setFormFields(prev => ({ ...prev, statusKeberangkatan: e.target.value as 'menunggu' | 'proses visa' | 'siap berangkat' | 'berangkat' | 'selesai' }))}
                      className="w-full px-4 py-3 border border-gray-200 focus:border-purple-500 bg-white rounded-xl text-xs font-black outline-none transition"
                    >
                      <option value="menunggu">⏳ Menunggu Berkas / Pusat</option>
                      <option value="proses visa">📂 Proses Visa & Siskopatuh</option>
                      <option value="siap berangkat">✅ Siap Berangkat (Koper Siap)</option>
                      <option value="berangkat">✈️ Sedang Di Arab Saudi</option>
                      <option value="selesai">🏁 Selesai Umroh / Pulang</option>
                    </select>
                  </div>

                  {/* Amount Paid Setup */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Jumlah Setor Deposit Pertama (DP / Uangmuka)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold font-mono">Rp</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={formFields.jumlahBayar || ''}
                        onChange={e => setFormFields(prev => ({ ...prev, jumlahBayar: Number(e.target.value) }))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 focus:border-purple-500 bg-white rounded-xl text-xs font-semibold outline-none transition"
                      />
                    </div>
                    <p className="text-[9px] text-gray-400 mt-1 font-bold">
                      Masukkan nominal deposit awal. Jika setoran lunas, harga kustom akan otomatis tersetel sebagai Lunas.
                    </p>
                  </div>
                </div>

                {/* PART 4: UPLOAD DIGITAL FILES AND PHYSICAL DOCK CLEARINGS */}
                <div className="p-4 bg-gray-50/55 rounded-2xl border border-gray-200/50 space-y-4">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Langkah 4: Unggah Berkas Digital (JPEG / PNG / PDF)</span>
                  
                  {/* File Uploads Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Passport File */}
                    <div className="p-3 bg-white rounded-2xl border border-dashed border-gray-250 flex flex-col items-center justify-center text-center relative hover:bg-gray-100/50 transition h-28">
                      <span className="text-[8px] font-extrabold uppercase text-gray-400 mb-1.5">Paspor Digital</span>
                      {formFields.filePassport ? (
                        <div className="space-y-1">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                          <p className="text-[8px] text-emerald-600 font-extrabold uppercase">TERUNGGAH</p>
                          <div className="flex justify-center gap-1 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const win = window.open();
                                if (win) {
                                  win.document.title = `Paspor - ${formFields.namaJamaah}`;
                                  win.document.write(`<iframe src="${formFields.filePassport}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                }
                              }}
                              className="text-[8px] font-black text-purple-650 bg-purple-50 px-1.5 py-0.5 rounded uppercase hover:bg-purple-100"
                            >
                              LIHAT
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormFields(prev => ({ ...prev, filePassport: '', docPassport: false }))}
                              className="text-[8px] font-black text-rose-650 bg-rose-50 px-1.5 py-0.5 rounded uppercase hover:bg-rose-100"
                            >
                              HAPUS
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center">
                          <Upload className="w-5 h-5 text-gray-400 mb-1" />
                          <span className="text-[8px] font-black text-purple-600 uppercase hover:underline">Pilih Paspor</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const base64 = await fileToBase64(e.target.files[0]);
                                setFormFields(prev => ({ ...prev, filePassport: base64, docPassport: true }));
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {/* KTP File */}
                    <div className="p-3 bg-white rounded-2xl border border-dashed border-gray-250 flex flex-col items-center justify-center text-center relative hover:bg-gray-100/50 transition h-28">
                      <span className="text-[8px] font-extrabold uppercase text-gray-400 mb-1.5">KTP Digital</span>
                      {formFields.fileKtp ? (
                        <div className="space-y-1">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                          <p className="text-[8px] text-emerald-600 font-extrabold uppercase">TERUNGGAH</p>
                          <div className="flex justify-center gap-1 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const win = window.open();
                                if (win) {
                                  win.document.title = `KTP - ${formFields.namaJamaah}`;
                                  win.document.write(`<iframe src="${formFields.fileKtp}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                }
                              }}
                              className="text-[8px] font-black text-purple-650 bg-purple-50 px-1.5 py-0.5 rounded uppercase hover:bg-purple-100"
                            >
                              LIHAT
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormFields(prev => ({ ...prev, fileKtp: '', docKtp: false }))}
                              className="text-[8px] font-black text-rose-650 bg-rose-50 px-1.5 py-0.5 rounded uppercase hover:bg-rose-100"
                            >
                              HAPUS
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center">
                          <Upload className="w-5 h-5 text-gray-400 mb-1" />
                          <span className="text-[8px] font-black text-purple-600 uppercase hover:underline">Pilih KTP</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const base64 = await fileToBase64(e.target.files[0]);
                                setFormFields(prev => ({ ...prev, fileKtp: base64, docKtp: true }));
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {/* Vaccine File */}
                    <div className="p-3 bg-white rounded-2xl border border-dashed border-gray-250 flex flex-col items-center justify-center text-center relative hover:bg-gray-100/50 transition h-28">
                      <span className="text-[8px] font-extrabold uppercase text-gray-400 mb-1.5">Sertifikat Vaksin</span>
                      {formFields.fileVaccine ? (
                        <div className="space-y-1">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                          <p className="text-[8px] text-emerald-600 font-extrabold uppercase">TERUNGGAH</p>
                          <div className="flex justify-center gap-1 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const win = window.open();
                                if (win) {
                                  win.document.title = `Vaksin - ${formFields.namaJamaah}`;
                                  win.document.write(`<iframe src="${formFields.fileVaccine}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                }
                              }}
                              className="text-[8px] font-black text-purple-650 bg-purple-50 px-1.5 py-0.5 rounded uppercase hover:bg-purple-100"
                            >
                              LIHAT
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormFields(prev => ({ ...prev, fileVaccine: '', docVaccine: false }))}
                              className="text-[8px] font-black text-rose-650 bg-rose-50 px-1.5 py-0.5 rounded uppercase hover:bg-rose-100"
                            >
                              HAPUS
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center">
                          <Upload className="w-5 h-5 text-gray-400 mb-1" />
                          <span className="text-[8px] font-black text-purple-600 uppercase hover:underline">Pilih Vaksin</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const base64 = await fileToBase64(e.target.files[0]);
                                setFormFields(prev => ({ ...prev, fileVaccine: base64, docVaccine: true }));
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {/* Pas Foto File */}
                    <div className="p-3 bg-white rounded-2xl border border-dashed border-gray-250 flex flex-col items-center justify-center text-center relative hover:bg-gray-100/50 transition h-28">
                      <span className="text-[8px] font-extrabold uppercase text-gray-400 mb-1.5">Pas Foto Background Putih</span>
                      {formFields.fileFoto ? (
                        <div className="space-y-1">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                          <p className="text-[8px] text-emerald-600 font-extrabold uppercase">TERUNGGAH</p>
                          <div className="flex justify-center gap-1 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const win = window.open();
                                if (win) {
                                  win.document.title = `Pas Foto - ${formFields.namaJamaah}`;
                                  win.document.write(`<iframe src="${formFields.fileFoto}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                }
                              }}
                              className="text-[8px] font-black text-purple-650 bg-purple-50 px-1.5 py-0.5 rounded uppercase hover:bg-purple-100"
                            >
                              LIHAT
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormFields(prev => ({ ...prev, fileFoto: '', docFoto: false }))}
                              className="text-[8px] font-black text-rose-650 bg-rose-50 px-1.5 py-0.5 rounded uppercase hover:bg-rose-100"
                            >
                              HAPUS
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center">
                          <Upload className="w-5 h-5 text-gray-400 mb-1" />
                          <span className="text-[8px] font-black text-purple-600 uppercase hover:underline">Pilih Pas Foto</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const base64 = await fileToBase64(e.target.files[0]);
                                setFormFields(prev => ({ ...prev, fileFoto: base64, docFoto: true }));
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Checklist physical doc status */}
                  <div className="pt-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Kelengkapan Fisik Di Kantor</label>
                    <div className="flex items-center gap-4 py-1">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formFields.docPassport}
                          onChange={e => setFormFields(prev => ({ ...prev, docPassport: e.target.checked }))}
                          className="rounded accent-purple-600 w-4 h-4"
                        />
                        <span className="text-[11px] font-bold text-gray-600">Paspor Fisik</span>
                      </label>

                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formFields.docKtp}
                          onChange={e => setFormFields(prev => ({ ...prev, docKtp: e.target.checked }))}
                          className="rounded accent-purple-600 w-4 h-4"
                        />
                        <span className="text-[11px] font-bold text-gray-600">KTP Fisik</span>
                      </label>

                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formFields.docVaccine}
                          onChange={e => setFormFields(prev => ({ ...prev, docVaccine: e.target.checked }))}
                          className="rounded accent-purple-600 w-4 h-4"
                        />
                        <span className="text-[11px] font-bold text-gray-600">Vaksin Fisik</span>
                      </label>

                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formFields.docFoto}
                          onChange={e => setFormFields(prev => ({ ...prev, docFoto: e.target.checked }))}
                          className="rounded accent-purple-600 w-4 h-4"
                        />
                        <span className="text-[11px] font-bold text-gray-600">Pas Foto Fisik</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Controls */}
                <div className="flex gap-3 pt-4 border-t border-gray-150 sticky bottom-0 bg-white z-10">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-3.5 rounded-xl text-xs font-bold uppercase transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3.5 rounded-xl text-xs font-black uppercase transition shadow-lg shadow-purple-600/10"
                  >
                    {selectedJamaah ? 'Simpan Perubahan' : 'Daftarkan Jamaah'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK REGISTRATION MODAL */}
      <AnimatePresence>
        {isQuickFormOpen && (
          <div className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700 font-extrabold text-sm leading-none flex items-center justify-center">⚡</span>
                  Registrasi Kilat Jamaah
                </h3>
                <button 
                  onClick={() => setIsQuickFormOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-500 p-2 rounded-full transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveQuickJamaah} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ahmad Fauzi"
                    value={quickFormFields.namaJamaah}
                    onChange={e => setQuickFormFields(prev => ({ ...prev, namaJamaah: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 focus:border-amber-500 bg-white rounded-xl text-xs font-semibold outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">No WhatsApp (WA) Aktif</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 08123456789"
                    value={quickFormFields.noHp}
                    onChange={e => setQuickFormFields(prev => ({ ...prev, noHp: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 focus:border-amber-500 bg-white rounded-xl text-xs font-semibold outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Kota Domisili</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Jakarta Timur, Bandung, Surabaya"
                    value={quickFormFields.alamat}
                    onChange={e => setQuickFormFields(prev => ({ ...prev, alamat: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 focus:border-amber-500 bg-white rounded-xl text-xs font-semibold outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Pilih Paket Terkait</label>
                  <select
                    value={quickFormFields.paketId}
                    onChange={e => setQuickFormFields(prev => ({ ...prev, paketId: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 focus:border-amber-500 bg-white rounded-xl text-xs font-semibold outline-none transition cursor-pointer"
                  >
                    {packages.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nama} ({p.type === 'master' ? 'Pusat' : 'Kustom Mitra'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Pilihan Tipe Kamar & Harga</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'Quad' as const, price: activeQuickPackage?.hargaQuad || 38000000 },
                      { key: 'Triple' as const, price: activeQuickPackage?.hargaTriple || 41000000 },
                      { key: 'Double' as const, price: activeQuickPackage?.hargaDouble || 45000000 },
                    ].map(roomItem => {
                      const isSelected = quickFormFields.roomType === roomItem.key;
                      return (
                        <button
                          key={roomItem.key}
                          type="button"
                          onClick={() => setQuickFormFields(prev => ({ ...prev, roomType: roomItem.key }))}
                          className={`flex flex-col items-center justify-between p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500/20' 
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <span className={`text-[10px] font-black tracking-tight ${isSelected ? 'text-amber-800' : 'text-gray-500'}`}>
                            {roomItem.key}
                          </span>
                          <span className="text-[9px] text-gray-400 font-bold mt-0.5 leading-tight">
                            {roomItem.key === 'Quad' ? 'Sekamar Ber-4' : roomItem.key === 'Triple' ? 'Sekamar Ber-3' : 'Sekamar Ber-2'}
                          </span>
                          <span className={`text-[10px] font-extrabold mt-1.5 ${isSelected ? 'text-amber-900' : 'text-gray-800'}`}>
                            {formatCurrency(roomItem.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-150">
                  <button
                    type="button"
                    onClick={() => setIsQuickFormOpen(false)}
                    className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-3.5 rounded-xl text-xs font-bold uppercase transition cursor-pointer"
                  >
                     Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3.5 rounded-xl text-xs font-black uppercase transition shadow-lg shadow-amber-600/10 cursor-pointer"
                  >
                    Simpan Registrasi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK DEPOSIT PAYMENT REGISTER MODAL */}
      <AnimatePresence>
        {isPaymentOpen && selectedJamaah && (
          <div className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-1.5">
                  <DollarSign className="text-amber-500 w-5 h-5" /> Entri Setoran Keuangan
                </h3>
                <button 
                  onClick={() => setIsPaymentOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-500 p-1.5 rounded-full transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-1.5 text-xs text-amber-905">
                  <p className="font-bold">Nama Jamaah: <strong className="text-gray-900">{selectedJamaah.namaJamaah}</strong></p>
                  <p>Estimasi Harga Paket: <strong className="font-mono text-gray-950">{formatCurrency(selectedJamaah.totalHarga)}</strong></p>
                  <p>Total Deposit Terbayar: <strong className="font-mono text-emerald-600">{formatCurrency(selectedJamaah.jumlahBayar)}</strong></p>
                  <p className="border-t border-amber-200/50 pt-1 font-black">Sisa Kurang Bayar: <strong className="text-rose-600 font-mono">{formatCurrency(selectedJamaah.totalHarga - selectedJamaah.jumlahBayar)}</strong></p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Jumlah Tambah Bayar Setoran Baru</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold font-mono">Rp</span>
                    <input
                      type="number"
                      required
                      placeholder="Masukkan nominal setoran..."
                      value={quickPayAmount || ''}
                      onChange={e => setQuickPayAmount(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-3.5 border border-gray-200 focus:border-amber-500 rounded-xl text-xs font-semibold outline-none transition"
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1 font-bold">
                    Pencatatan langsung tertransmisi real-time ke log sirkulasi keuangan ERP.
                  </p>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    onClick={() => setIsPaymentOpen(false)}
                    className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-3 rounded-xl text-xs font-bold uppercase transition"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handlePostQuickPayment}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 py-3 rounded-xl text-xs font-black uppercase transition shadow-md shadow-amber-500/10"
                  >
                    Terapkan & Cetak Kwitansi
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRINT INVOICE & ADMINISTRATIVE HUB MODAL */}
      <AnimatePresence>
        {isInvoiceOpen && selectedInvoiceJamaah && (
          <div className="fixed inset-0 bg-[#0f172a]/70 backdrop-blur-md flex items-center justify-center p-4 lg:p-8 z-50 overflow-y-auto print:bg-white print:p-0 print:static print:overflow-visible">
            {/* INJECT PRINT SPECIFIC STYLES DYNAMICALLY */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                /* Hide everything by default */
                body * {
                  visibility: hidden !important;
                }
                /* Only show the invoice container and its contents */
                #print-invoice-area, #print-invoice-area * {
                  visibility: visible !important;
                }
                #print-invoice-area {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 210mm !important;
                  height: 297mm !important;
                  padding: 20mm !important;
                  margin: 0 !important;
                  background-color: white !important;
                  color: black !important;
                  box-shadow: none !important;
                  border: none !important;
                  font-size: 11pt !important;
                  line-height: 1.5 !important;
                }
                /* Override absolute layout positioning on print */
                .print-fixed-layout {
                  display: block !important;
                  width: 100% !important;
                }
                /* Hide screen-only interactive states */
                .screen-only {
                  display: none !important;
                }
              }
            ` }} />

            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-gray-100 rounded-3xl w-full max-w-6xl h-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-gray-150 screen-only print:hidden print:static print:h-auto print:max-h-none print:shadow-none print:border-none print:bg-white"
            >
              {/* Dynamic Header */}
              <div className="bg-white p-6 border-b border-gray-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <Printer className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black tracking-widest text-indigo-600 uppercase">ADMINISTRASI KEUANGAN & INVOICING</span>
                    <h3 className="text-base font-black text-gray-900 leading-tight flex items-center gap-2">
                      Faktur Tagihan & Kwitansi Resmi: <span className="text-gray-500 font-mono text-sm">{selectedInvoiceJamaah.namaJamaah}</span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:shadow-lg hover:shadow-indigo-600/20 active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak Sekarang / Save PDF
                  </button>

                  <button 
                    onClick={() => {
                      setIsInvoiceOpen(false);
                      setSelectedInvoiceJamaah(null);
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2.5 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Workspace Body */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gray-50/50">
                {/* Left Panel: Configuration Parameters */}
                <div className="w-full md:w-80 border-r border-gray-200/60 p-6 space-y-5 overflow-y-auto shrink-0 bg-white">
                  <h4 className="text-[10px] font-black tracking-wider uppercase text-gray-400">Parameter Administrasi</h4>
                  
                  {/* Invoice custom numbering */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Nomor Invoice</label>
                    <input 
                      type="text"
                      placeholder="e.g. INV/2026/UMR/12"
                      value={invoiceCustomNum}
                      onChange={(e) => setInvoiceCustomNum(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-505 focus:bg-white transition"
                    />
                  </div>

                  {/* Cashier name customized */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Nama Petugas Kasir</label>
                    <input 
                      type="text"
                      placeholder="Petugas Administrasi"
                      value={cashierName}
                      onChange={(e) => setCashierName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-505 focus:bg-white transition"
                    />
                  </div>

                  {/* Stamp toggle */}
                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-150 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-gray-800 uppercase tracking-wider">Stempel Lunas Resmi</p>
                      <p className="text-[9px] text-gray-400 font-bold leading-normal">Tampilkan cap cap "PAID APPROVED" berwarna</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={showInvoiceStamp}
                        onChange={(e) => setShowInvoiceStamp(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-305 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-550"></div>
                    </label>
                  </div>

                  {/* Invoice Terms / Note text box */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Catatan Tambahan Ketentuan</label>
                    <textarea 
                      rows={4}
                      value={invoiceNote}
                      onChange={(e) => setInvoiceNote(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs leading-normal text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-505 focus:bg-white transition resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        window.print();
                      }}
                      className="w-full bg-emerald-550 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      CETAK / SIMPAN PDF
                    </button>
                    <p className="text-[8.5px] text-gray-400 font-semibold leading-normal text-center mt-2">
                      Gunakan browser print untuk menyimpan file PDF atau mencetak langsung ke Printer kertas thermal/A4.
                    </p>
                  </div>
                </div>

                {/* Right Panel: High-fidelity Live A4 Preview */}
                <div className="flex-1 p-6 md:p-10 overflow-y-auto flex items-start justify-center">
                  <div 
                    id="print-invoice-area"
                    className="bg-white w-[210mm] min-h-[297mm] p-12 border border-gray-200 shadow-xl relative text-black print:shadow-none print:border-none print:p-0 flex flex-col justify-between"
                  >
                    {/* TOP SECTION: Letterhead & Invoice Metadata */}
                    <div className="space-y-8 flex-grow">
                      <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6">
                        {/* Partner Logo & Brand */}
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-indigo-550/10 border border-indigo-400 flex items-center justify-center overflow-hidden shrink-0">
                            {currentUserData?.logo || currentUserData?.customMitraProfile?.logo ? (
                              <img 
                                src={currentUserData.logo || currentUserData.customMitraProfile?.logo} 
                                alt="Mitra" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-2xl font-black italic text-indigo-700">U</span>
                            )}
                          </div>
                          <div>
                            <h2 className="text-lg font-black tracking-tight text-gray-900 uppercase">
                              {currentUserData?.brandName || currentUserData?.namaLengkap || currentUserData?.name || 'UMAROH CRM PARTNER'}
                            </h2>
                            <p className="text-[9px] font-black text-indigo-700 uppercase tracking-widest leading-none mt-0.5">REKANAN RESMI AGEN PERJALANAN UMAROH ERP</p>
                            <p className="text-[10px] text-gray-500 font-bold leading-normal mt-1 max-w-[280px]">
                              📍 {currentUserData?.alamat || 'Partner Wilayah Resmi Indonesia'}
                              <br />
                              📞 {currentUserData?.noHp || currentUserData?.phone || '-'}
                            </p>
                          </div>
                        </div>

                        {/* Document Meta */}
                        <div className="text-right">
                          <span className="bg-gray-900 text-white px-2.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase">
                            FAKTUR KWITANSI RESMI
                          </span>
                          <h1 className="text-xl font-black text-gray-900 tracking-tight italic mt-2">INVOICE PEMBAYARAN</h1>
                          <p className="text-xs font-bold text-gray-500 font-mono mt-1">
                            No: <span className="text-gray-900 font-black">{invoiceCustomNum}</span>
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold mt-1">
                            Tanggal Terbit: <span className="text-gray-700">{new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </p>
                        </div>
                      </div>

                      {/* CLIENT BILL TO INFO AREA */}
                      <div className="grid grid-cols-2 gap-8 bg-gray-50/70 p-5 rounded-2xl border border-gray-150">
                        <div>
                          <p className="text-[8px] font-black tracking-wider text-gray-400 uppercase">DITAGIHKAN KEPADA JAMAAH:</p>
                          <p className="text-sm font-black text-gray-900 mt-1">{selectedInvoiceJamaah.namaJamaah}</p>
                          <p className="text-[10px] text-gray-600 font-semibold mt-1">
                            HP/Whatsapp: <span className="font-bold text-gray-900 font-mono">{selectedInvoiceJamaah.noHp || '-'}</span>
                          </p>
                          {selectedInvoiceJamaah.nomorPassport && (
                            <p className="text-[10px] text-gray-600 font-semibold mt-0.5">
                              Nomor Paspor: <span className="font-bold text-gray-900 font-mono">{selectedInvoiceJamaah.nomorPassport}</span>
                            </p>
                          )}
                          <p className="text-[10px] text-gray-600 font-semibold mt-0.5">
                            Kewarganegaraan: <span className="font-bold text-gray-900">{selectedInvoiceJamaah.kewarganegaraan || 'INDONESIA'}</span>
                          </p>
                        </div>

                        <div className="border-l border-gray-200/70 pl-8">
                          <p className="text-[8px] font-black tracking-wider text-gray-400 uppercase">DETAIL PAKET PERJALANAN:</p>
                          <p className="text-[11px] font-black text-gray-800 mt-1 uppercase line-clamp-2 leading-tight">{selectedInvoiceJamaah.paketNama}</p>
                          <p className="text-[10px] text-gray-600 font-bold mt-1.5 flex items-center gap-1">
                            <span>Tipe Pilihan Room:</span>
                            <span className="font-black text-indigo-750 bg-indigo-50 border border-indigo-100/50 px-1 py-0.1 rounded text-[9.5px]">
                              🛏️ {selectedInvoiceJamaah.roomType} Room
                            </span>
                          </p>
                          <p className="text-[10px] text-gray-600 font-bold mt-1 flex items-center gap-1">
                            <span>Status Persiapan:</span>
                            <span className="text-gray-900 uppercase font-black">{selectedInvoiceJamaah.statusKeberangkatan}</span>
                          </p>
                        </div>
                      </div>

                      {/* MAIN BREAKDOWN TABLE */}
                      <div className="space-y-4">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b-2 border-gray-800 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              <th className="py-2.5">RINCIAN ADMINISTRASI KEAGENAN</th>
                              <th className="py-2.5 text-center w-28">TIPE RUANG</th>
                              <th className="py-2.5 text-right w-40">HARGA SATUAN (IDR)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-150">
                            {/* Line item 1: Package cost */}
                            <tr>
                              <td className="py-3.5">
                                <p className="text-xs font-black text-gray-900">Pendaftaran Seat & Perlengkapan Travel Paket Umroh</p>
                                <p className="text-[10px] text-gray-400 font-semibold leading-normal mt-0.5">
                                  Menjamin slot seat jamaah, siskopatuh visa, tiket PP, hotel madinah mekkah, muthawif, dan koper kustom exclusive.
                                </p>
                              </td>
                              <td className="py-3.5 text-center text-xs font-mono font-black text-gray-700">
                                {selectedInvoiceJamaah.roomType}
                              </td>
                              <td className="py-3.5 text-right text-xs font-bold font-mono text-gray-900">
                                {formatCurrency(selectedInvoiceJamaah.totalHarga)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* SUB LEDGER PROGRESS TRANSACTIONS (ADMINISTRASI NEAT) */}
                      {invoiceTxs.length > 0 && (
                        <div className="space-y-2 mt-2">
                          <h4 className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Histori Alur Setoran Masuk Real-Time</h4>
                          <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse text-[10px]">
                              <thead>
                                <tr className="bg-gray-550/5 text-gray-500 font-extrabold border-b border-gray-200">
                                  <th className="p-2.5 uppercase text-[8.5px]">No Referensi Log</th>
                                  <th className="p-2.5 uppercase text-[8.5px]">Waktu Setoran</th>
                                  <th className="p-2.5 uppercase text-[8.5px]">Keterangan Deposit</th>
                                  <th className="p-2.5 text-right uppercase text-[8.5px] w-36">Jumlah Dana (IDR)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-150 bg-white">
                                {invoiceTxs.map((tx, idx) => (
                                  <tr key={tx.id} className="hover:bg-gray-50/50">
                                    <td className="p-2.5 font-mono text-gray-400 font-bold shrink-0">{tx.id.substring(0, 10).toUpperCase()}</td>
                                    <td className="p-2.5 text-gray-550 font-bold">
                                      {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                                    </td>
                                    <td className="p-2.5 text-gray-700 truncate max-w-[200px]" title={tx.description || `Deposit Ke-${idx+1}`}>
                                      {tx.description || `Deposit Setoran Ke-${idx+1}`}
                                    </td>
                                    <td className="p-2.5 text-right font-bold text-emerald-600 font-mono">
                                      +{formatCurrency(tx.amount)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* SUMMARY BILLING CONTROLS */}
                      <div className="flex justify-end pt-2 border-t border-gray-200">
                        <div className="w-80 space-y-2 text-xs">
                          <div className="flex justify-between items-center text-gray-450">
                            <span className="font-bold">Total Nilai Tagihan Paket:</span>
                            <span className="font-mono text-gray-900 font-black">{formatCurrency(selectedInvoiceJamaah.totalHarga)}</span>
                          </div>

                          <div className="flex justify-between items-center bg-emerald-50/55 p-2 rounded-xl text-emerald-700 border border-emerald-100">
                            <span className="font-black uppercase tracking-wider text-[9.5px]">Total Setor Deposit Masuk:</span>
                            <span className="font-mono text-emerald-800 font-extrabold">{formatCurrency(selectedInvoiceJamaah.jumlahBayar)}</span>
                          </div>

                          <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl border border-gray-150">
                            <span className="font-black text-gray-400 uppercase tracking-wider text-[9.5px]">Sisa Kurang Selesai Bagian:</span>
                            <span className={`font-mono font-black ${selectedInvoiceJamaah.totalHarga - selectedInvoiceJamaah.jumlahBayar <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {selectedInvoiceJamaah.totalHarga - selectedInvoiceJamaah.jumlahBayar <= 0 ? 'LUNAS' : formatCurrency(selectedInvoiceJamaah.totalHarga - selectedInvoiceJamaah.jumlahBayar)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM SECTION: Footer, Stamp & Signature controls */}
                    <div className="space-y-12">
                      <div className="border-t border-gray-200 pt-6 grid grid-cols-12 gap-8 items-end">
                        {/* Note area */}
                        <div className="col-span-7 space-y-1.5 text-left">
                          <span className="text-[8px] font-black tracking-wider text-gray-400 uppercase">CATATAN & KETENTUAN HUKUM:</span>
                          <p className="text-[9.5px] text-gray-500 leading-relaxed font-medium">
                            {invoiceNote}
                          </p>
                        </div>

                        {/* Signatures & Stamp area */}
                        <div className="col-span-5 relative flex items-center justify-between pl-8 border-l border-gray-200/60 min-h-[90px]">
                          {/* PAID Stamp overlay */}
                          {showInvoiceStamp && selectedInvoiceJamaah.statusPembayaran === 'Lunas' && (
                            <div className="absolute -left-2 top-0 border-4 border-dashed border-emerald-500 text-emerald-500 font-black tracking-widest text-[14px] uppercase p-2 rounded-2xl rotate-[-12deg] select-none bg-white/90 z-10 shadow-md">
                              PAID AT APPROVED
                              <br />
                              <span className="text-[9px] font-mono tracking-tight block text-center mt-1 leading-none">{new Date().toLocaleDateString('id-ID')}</span>
                            </div>
                          )}

                          {showInvoiceStamp && selectedInvoiceJamaah.statusPembayaran === 'DP' && (
                            <div className="absolute -left-2 top-0 border-4 border-dashed border-amber-500 text-amber-500 font-black tracking-widest text-[14px] uppercase p-2 rounded-2xl rotate-[-12deg] select-none bg-white/90 z-10 shadow-md">
                              DP RECEIVED
                              <br />
                              <span className="text-[9px] font-mono tracking-tight block text-center mt-1 leading-none">AKTIF PROSES</span>
                            </div>
                          )}

                          {/* Cashier signature section */}
                          <div className="text-center ml-auto">
                            <span className="text-[8px] font-black tracking-wider text-gray-400 uppercase block mb-12">Penerima Administrasi Kasir</span>
                            <div className="border-t border-gray-900 pt-1.5 w-36 mx-auto">
                              <p className="text-[10px] font-black text-gray-900 leading-none">{cashierName}</p>
                              <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">{currentUserData?.brandName || 'Official Partner'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tiny corporate copyright */}
                      <div className="text-center text-[7.5px] font-extrabold uppercase text-gray-400 tracking-widest">
                        DIKELUARKAN SECARA RESMI MELALUI PLATFORM ERP INTEGRASI - UMAROH CRM COOPERATIVE SYSTEM
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {jamaahToDelete && (
          <div className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <h3 className="text-sm font-black text-rose-600 uppercase tracking-tight flex items-center gap-1.5">
                  <AlertCircle className="text-rose-500 w-5 h-5" /> Batalkan & Hapus Jamaah
                </h3>
                <button 
                  onClick={() => setJamaahToDelete(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-500 p-1.5 rounded-full transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 space-y-1.5 text-xs text-rose-900">
                  <p className="font-bold">Apakah Anda yakin ingin membatalkan & menghapus pendaftaran jamaah?</p>
                  <p className="border-t border-rose-200/50 pt-2 font-black text-sm">
                    👤 {jamaahToDelete.namaJamaah}
                  </p>
                  {jamaahToDelete.paketNama && (
                    <p className="text-gray-600 mt-1">
                      📦 Paket: <span className="font-bold">{jamaahToDelete.paketNama}</span>
                    </p>
                  )}
                </div>

                <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                  Tindakan ini tidak dapat dibatalkan. Seluruh data booking, status keberangkatan, dan laporan terkait jamaah ini akan dihapus secara permanen dari sistem.
                </p>

                <div className="flex gap-2 pt-3">
                  <button
                    onClick={() => setJamaahToDelete(null)}
                    className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-3 rounded-xl text-xs font-bold uppercase transition"
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmDeleteJamaah}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl text-xs font-black uppercase transition shadow-md shadow-rose-650/10 cursor-pointer"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
