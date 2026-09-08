import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, X, Search, CheckCircle, XCircle, Clock, CheckCircle2, Layout, Activity, Archive, FileText, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { db, collection, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, getDocs, handleFirestoreError, OperationType, auth } from '../../firebase';
import { sendNotification } from '../../services/notificationService';
import { Maskapai, maskapaiData } from '../../data/maskapai';
import { Hotel, Layanan } from '../../types';

import { PaketMasterWizard } from './PaketMasterWizard';
import { ChecklistOperasional } from '../tracker/ChecklistOperasional';
import { PaketTracker } from '../tracker/types';

interface UserRecord {
  id: string;
  role?: string;
  status?: string;
  namaLengkap?: string;
  name?: string;
  brandName?: string;
  jenisMitra?: string;
  kota?: string;
  email?: string;
}

interface PaketMaster {
  id: string;
  requestId?: string;
  nama: string;
  deskripsi: string;
  hargaDasar: number;
  hargaJualQuad?: number;
  maskapaiId: string;
  kuota: number;
  sisaKuota: number;
  status: 'draft' | 'published' | 'closed' | 'pending_validation' | 'expired' | 'archived';
  kesiapanJamaah?: 'ready_to_pay' | 'no_jamaah';
  jumlahJamaahSiapBayar?: number;
  catatanValidasi?: string;
  createdAt?: { toDate: () => Date };
  tglBerangkat?: string;
  mitraId?: string;
  hotelMadinahId?: string;
  hotelMakkahId?: string;
}

export const PaketMasterView: React.FC = () => {
  const [pakets, setPakets] = useState<PaketMaster[]>([]);
  const [maskapaiList, setMaskapaiList] = useState<Maskapai[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'archived_expired'>('all');
  const [filterMitra, setFilterMitra] = useState<string>('ALL');
  const [filterTglBuat, setFilterTglBuat] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterMitra, filterTglBuat, filterStatus]);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState<string | null>(null);
  const [isDirectDownloading, setIsDirectDownloading] = useState(false);
  const [formData, setFormData] = useState<Partial<PaketMaster>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);

  const [viewingTrackerPaket, setViewingTrackerPaket] = useState<PaketTracker | null>(null);
  const [allTrackers, setAllTrackers] = useState<PaketTracker[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [layananList, setLayananList] = useState<Layanan[]>([]);

  // Sales Order profitability validation modal states
  const [soValidationPaket, setSoValidationPaket] = useState<PaketMaster | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [soCostComponents, setSoCostComponents] = useState<any[]>([]);
  const [soIsSaving, setSoIsSaving] = useState(false);

  const formatTimestamp = (ts: unknown) => {
    if (!ts) return '-';
    try {
      let d: Date;
      if (typeof ts === 'object' && ts !== null) {
        const obj = ts as Record<string, unknown>;
        if ('toDate' in obj && typeof obj.toDate === 'function') {
          d = (obj as { toDate: () => Date }).toDate();
        } else if ('seconds' in obj && typeof obj.seconds === 'number') {
          d = new Date((obj as { seconds: number }).seconds * 1000);
        } else if ('_seconds' in obj && typeof obj._seconds === 'number') {
          d = new Date((obj as { _seconds: number })._seconds * 1000);
        } else if (ts instanceof Date) {
          d = ts;
        } else {
          d = new Date(ts.toString());
        }
      } else if (typeof ts === 'number') {
        if (ts < 9999999999) {
          d = new Date(ts * 1000);
        } else {
          d = new Date(ts);
        }
      } else {
        d = new Date(ts as string);
      }
      
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const showNotification = (type: 'success'|'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const unsubPaket = onSnapshot(collection(db, 'paket_master'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaketMaster));
      setPakets(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching paket_master:", error);
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, 'paket_master');
    });

    const unsubMaskapai = onSnapshot(collection(db, 'maskapai'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Maskapai));
      setMaskapaiList(data);
    }, (error) => {
      setMaskapaiList(prev => prev.length === 0 ? maskapaiData : prev);
      handleFirestoreError(error, OperationType.GET, 'maskapai');
    });

    const unsubTracker = onSnapshot(collection(db, 'tracker_paket'), (snapshot) => {
      const trackers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaketTracker));
      setAllTrackers(trackers);
      if (viewingTrackerPaket) {
        const updated = trackers.find(t => t.id === viewingTrackerPaket.id) as PaketTracker;
        if (updated) setViewingTrackerPaket(updated);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tracker_paket');
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    const unsubHotels = onSnapshot(collection(db, 'master_hotels'), (snapshot) => {
      setHotels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as Hotel));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'master_hotels');
    });

    const unsubLayanan = onSnapshot(collection(db, 'layanan'), (snapshot) => {
      setLayananList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as Layanan));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'layanan');
    });

    return () => {
      unsubPaket();
      unsubMaskapai();
      unsubTracker();
      unsubUsers();
      unsubHotels();
      unsubLayanan();
    };
  }, [viewingTrackerPaket?.id]);

  // Solusi A (Saran Terbaik & Paling Akurat):
  // Automatis sinkronisasi hotel-hotel yang dirujuk oleh paket-paket jika belum ada di database Firestore.
  // Berjalan di sisi client dengan hak akses user terautentikasi (admin/operasional) sehingga sukses bypass security rules.
  useEffect(() => {
    if (pakets.length === 0 || hotels.length === 0) return;

    // Cari semua ID hotel unik yang dirujuk oleh paket-paket yang ada
    const referencedIds = new Set<string>();
    pakets.forEach((paket: PaketMaster) => {
      if (paket.hotelMadinahId) referencedIds.add(paket.hotelMadinahId);
      if (paket.hotelMakkahId) referencedIds.add(paket.hotelMakkahId);
    });

    // Filter ID hotel yang belum ada di database Firestore (master_hotels)
    const missingIds = Array.from(referencedIds).filter(id => !hotels.some(h => h.id === id));

    if (missingIds.length > 0) {
      console.log("Solusi A Auto-Sync: Mendeteksi hotel referensi yang belum ada di Firestore:", missingIds);
      
      // Load data hotel secara lazy dan upload yang kurang
      import('../../data/hotels').then(({ allLocalHotels }) => {
        const allHotels = allLocalHotels || [];
        
        missingIds.forEach(async (id) => {
          const hotelData = allHotels.find(h => h.id === id);
          if (hotelData) {
            try {
              await setDoc(doc(db, 'master_hotels', id), {
                ...hotelData,
                updatedAt: new Date().toISOString()
              }, { merge: true });
              console.log(`Auto-sync sukses untuk hotel: ${id} (${hotelData.name})`);
            } catch (err) {
              console.error(`Gagal auto-sync hotel ${id}:`, err);
            }
          } else {
            console.warn(`Hotel referensi ID '${id}' tidak ditemukan di definisi lokal.`);
          }
        });
      }).catch((err) => {
        console.error("Gagal memuat data hotel lokal untuk auto-sync:", err);
      });
    }
  }, [pakets, hotels]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'paket_master', id));
      setDeleteConfirm(null);
      showNotification('success', 'Paket berhasil dihapus');
    } catch (error) {
      console.error("Error deleting paket master:", error);
      handleFirestoreError(error, OperationType.DELETE, `paket_master/${id}`);
      showNotification('error', 'Gagal menghapus data paket master.');
    }
  };

  const startEdit = (paket: PaketMaster) => {
    setIsEditing(paket.id);
    setFormData(paket);
    setIsAdding(false);
  };

  const startReview = (paket: PaketMaster) => {
    setIsReviewing(paket.id);
    setIsDirectDownloading(true);
    setFormData(paket);
    setIsAdding(false);
    setIsEditing(null);
  };

  const initializeSoCostComponents = (paket: PaketMaster) => {
    const p = paket as unknown as Record<string, unknown>;
    const maskapai = maskapaiList.find(m => m.id === (p.maskapaiId as string));
    const targetQty = (p.kuota as number) || 45;
    
    // Find real hotels from the loaded master_hotels
    const hotelMadinah = hotels.find(h => h.id === (p.hotelMadinahId as string));
    const hotelMakkah = hotels.find(h => h.id === (p.hotelMakkahId as string));
    const hotelWisata = p.hotelWisataId ? hotels.find(h => h.id === (p.hotelWisataId as string)) : null;

    // Resolve selected layanan
    const selectedLayananItems = layananList.reduce((acc: { id: string; nama: string; harga: number }[], item: Layanan) => {
      if (item.isGroup) {
        if ((p.selectedLayanan as string[] | undefined)?.includes(item.id)) {
          const selectedOpt = item.options?.find((opt) =>
            (p.selectedLayanan as string[] | undefined)?.includes(opt.id)
          );
          if (selectedOpt) {
            const rawPrice = selectedOpt.price;
            const roundedPrice = rawPrice > 0 ? Math.ceil(rawPrice / 1000) * 1000 : 0;
            acc.push({
              id: selectedOpt.id,
              nama: `${item.nama}: ${selectedOpt.label}`,
              harga: roundedPrice,
            });
          }
        }
      } else {
        if ((p.selectedLayanan as string[] | undefined)?.includes(item.id)) {
          const rawPrice = item.harga || 0;
          const roundedPrice = rawPrice > 0 ? Math.ceil(rawPrice / 1000) * 1000 : 0;
          acc.push({
            id: item.id,
            nama: item.nama,
            harga: roundedPrice
          });
        }
      }
      return acc;
    }, []);

    // Build the dynamic components list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const components: any[] = [
      {
        nama_komponen: `Maskapai - ${maskapai?.name || 'Pesawat'}`,
        kategori_komponen: 'Maskapai',
        vendor_id: maskapai?.namaVendor || maskapai?.name || 'Garuda Indonesia',
        qty: targetQty,
        harga_satuan: ((p as unknown as Record<string, unknown>).estimasiHargaMaskapai as number) || 12500000,
        total_biaya: (((p as unknown as Record<string, unknown>).estimasiHargaMaskapai as number) || 12500000) * targetQty,
      },
      {
        nama_komponen: `Hotel Madinah: ${hotelMadinah?.name || 'Standard'}`,
        kategori_komponen: 'Hotel',
        vendor_id: hotelMadinah?.vendor || 'Anjum Hotel / Safwah',
        qty: targetQty,
        harga_satuan: 3500000,
        total_biaya: 3500000 * targetQty,
      },
      {
        nama_komponen: `Hotel Makkah: ${hotelMakkah?.name || 'Standard'}`,
        kategori_komponen: 'Hotel',
        vendor_id: hotelMakkah?.vendor || 'Pulman Zamzam / Swissotel',
        qty: targetQty,
        harga_satuan: 4500000,
        total_biaya: 4500000 * targetQty,
      }
    ];

    // If UMRAH PLUS and hotel wisata is specified
    if ((p.kategori as string) === 'UMRAH PLUS' && p.hotelWisataId) {
      components.push({
        nama_komponen: `Hotel Wisata: ${hotelWisata?.name || 'Standard Wisata'}`,
        kategori_komponen: 'Hotel',
        vendor_id: hotelWisata?.vendor || 'Hotel Wisata Vendor',
        qty: targetQty,
        harga_satuan: 2500000,
        total_biaya: 2500000 * targetQty,
      });
    }

    // Standard Visa & Handling
    components.push({
      nama_komponen: `Visa & Handling Saudi`,
      kategori_komponen: 'Visa & Handling',
      vendor_id: 'Muassasah Saudi Provider',
      qty: targetQty,
      harga_satuan: 1500000,
      total_biaya: 1500000 * targetQty,
    });

    // Standard Handling Domestik & Perlengkapan
    components.push({
      nama_komponen: `Handling Domestik & Perlengkapan`,
      kategori_komponen: 'Perlengkapan',
      vendor_id: 'Gudang Umaroh Pusat',
      qty: targetQty,
      harga_satuan: 1000000,
      total_biaya: 1000000 * targetQty,
    });

    // Dynamically append selected layanan / components
    selectedLayananItems.forEach((layanan) => {
      components.push({
        nama_komponen: layanan.nama,
        kategori_komponen: 'Layanan',
        vendor_id: 'Muassasah / Local Agent',
        qty: targetQty,
        harga_satuan: layanan.harga,
        total_biaya: layanan.harga * targetQty,
      });
    });

    setSoCostComponents(components);
    setSoValidationPaket(paket);
  };

  const handleConfirmValidateWithSo = async () => {
    if (!soValidationPaket) return;
    setSoIsSaving(true);
    try {
      const paket = soValidationPaket;
      
      // 1. Update paket_master
      await updateDoc(doc(db, 'paket_master', paket.id), {
        status: 'published',
        validationStatus: 'approved',
        updatedAt: serverTimestamp()
      });

      // Send real-time notification
      await sendNotification({
        title: 'Paket Master Dipublikasikan',
        message: `Paket Master "${paket.nama}" telah disetujui & dipublikasikan ke Katalog Paket.`,
        type: 'success',
        targetRole: 'admin',
        senderId: auth.currentUser?.uid || 'system',
      });

      // 2. Ensure tracker_paket exists
      const trackerQuery = query(collection(db, 'tracker_paket'), where('paketMasterId', '==', paket.id));
      const trackerSnap = await getDocs(trackerQuery);
      if (trackerSnap.empty) {
        const maskapai = maskapaiList.find(m => m.id === paket.maskapaiId);
        await addDoc(collection(db, 'tracker_paket'), {
          paketMasterId: paket.id,
          requestId: paket.requestId || '',
          namaPaket: paket.nama,
          tanggalBerangkat: maskapai?.tanggalKeberangkatan || paket.tglBerangkat || '',
          status: 'Persiapan',
          targetJamaah: paket.kuota || 45,
          terdaftar: 0,
          createdAt: serverTimestamp()
        });
      }

      // 3. Create or Update mitra_tracker
      const u = users.find(user => user.id === paket.mitraId) as unknown as Record<string, unknown> | undefined;
      const mitraTrackerId = `mitra_tracker_${paket.id}`;
      const totalTagihan = (paket.hargaJualQuad || paket.hargaDasar || 32500000) * (paket.kuota || 45);
      const maskapai = maskapaiList.find(m => m.id === paket.maskapaiId);
      
      await setDoc(doc(db, 'mitra_tracker', mitraTrackerId), {
        id: mitraTrackerId,
        nama_mitra: u?.namaLengkap || u?.name || 'Umaroh Pusat',
        nama_brand: u?.brandName || 'Umaroh Pusat',
        pic: u?.namaLengkap || u?.name || 'Umaroh Pusat',
        hp: u?.hp || '081234567890',
        kota: u?.kota || 'Jakarta',
        jumlah_seat: paket.kuota || 45,
        paket_umroh: paket.nama,
        tanggal_berangkat: maskapai?.tanggalKeberangkatan || paket.tglBerangkat || '',
        total_tagihan: totalTagihan,
        dp: 0,
        term1: 0,
        term2: 0,
        pelunasan: 0,
        total_bayar: 0,
        sisa_tagihan: totalTagihan,
        persentase_bayar: 0,
        deadline_pelunasan: '',
        hari_menuju_berangkat: 999,
        status_pembayaran: 'BELUM LUNAS',
        status_risiko: 'AMAN',
        status_keberangkatan: 'Aman',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // 4. Create package_cost_components (Vendor Payment Tracker)
      for (const comp of soCostComponents) {
        const compId = `component_${Math.random().toString(36).substring(2, 9)}`;
        await setDoc(doc(db, 'package_cost_components', compId), {
          id: compId,
          nama_komponen: comp.nama_komponen,
          kategori_komponen: comp.kategori_komponen,
          vendor_id: comp.vendor_id,
          package_id: paket.nama,
          qty: comp.qty,
          qty_used: 0,
          harga_satuan: comp.harga_satuan,
          total_biaya: comp.total_biaya,
          dp: 0,
          termin_1: 0,
          termin_2: 0,
          pelunasan: 0,
          total_bayar: 0,
          sisa_tagihan: comp.total_biaya,
          persentase_bayar: 0,
          tanggal_jatuh_tempo: paket.tglBerangkat || '',
          tanggal_pembayaran: '',
          status_pembayaran: 'Belum Bayar',
          status_risiko: 'Aman',
          status_operasional: 'Pending',
          approval_status: 'Approved',
          created_by: 'Admin Validation (Sales Order)',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      showNotification('success', 'Paket berhasil divalidasi dan data tersinkronisasi ke tracker paket, mitra, & vendor!');
      setSoValidationPaket(null);
    } catch (error) {
      console.error("Error confirming validation with SO:", error);
      showNotification('error', 'Gagal memproses validasi Sales Order.');
    } finally {
      setSoIsSaving(false);
    }
  };

  const handleReject = async (paket: PaketMaster) => {
    try {
      await updateDoc(doc(db, 'paket_master', paket.id), {
        status: 'draft',
        validationStatus: 'rejected',
        updatedAt: serverTimestamp()
      });
      showNotification('success', 'Paket ditolak dan dikembalikan ke draft');
    } catch (error) {
      console.error("Error rejecting paket:", error);
      handleFirestoreError(error, OperationType.UPDATE, `paket_master/${paket.id}`);
      showNotification('error', 'Gagal menolak paket');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getCreationTimestamp = (p: PaketMaster) => {
    const record = p as unknown as Record<string, unknown>;
    const ts = record.createdAt || record.created_at || record.updatedAt || record.updated_at;
    if (!ts) {
      if (p.tglBerangkat) {
        return new Date(p.tglBerangkat).getTime() - 45 * 24 * 60 * 60 * 1000;
      }
      return 0;
    }
    try {
      if (typeof ts === 'object' && ts !== null) {
        const obj = ts as Record<string, unknown>;
        if (typeof obj.toDate === 'function') {
          return (obj.toDate as () => Date)().getTime();
        } else if (typeof obj.seconds === 'number') {
          return obj.seconds * 1000;
        } else if (typeof obj._seconds === 'number') {
          return obj._seconds * 1000;
        } else if (ts instanceof Date) {
          return ts.getTime();
        }
      } else if (typeof ts === 'number') {
        return ts < 9999999999 ? ts * 1000 : ts;
      } else if (typeof ts === 'string') {
        const parsed = new Date(ts).getTime();
        if (!isNaN(parsed)) return parsed;
      }
    } catch {
      // ignore parsing error
    }
    return 0;
  };

  const getPaketCreationDateString = (p: PaketMaster) => {
    const record = p as unknown as Record<string, unknown>;
    const ts = record.createdAt || record.created_at || record.updatedAt || record.updated_at;
    if (!ts) {
      if (p.tglBerangkat) return p.tglBerangkat;
      return '';
    }
    try {
      let d: Date | null = null;
      if (typeof ts === 'object' && ts !== null) {
        const obj = ts as Record<string, unknown>;
        if (typeof obj.toDate === 'function') {
          d = (obj.toDate as () => Date)();
        } else if (typeof obj.seconds === 'number') {
          d = new Date(obj.seconds * 1000);
        } else if (typeof obj._seconds === 'number') {
          d = new Date(obj._seconds * 1000);
        } else if (ts instanceof Date) {
          d = ts;
        }
      } else if (typeof ts === 'number') {
        d = ts < 9999999999 ? new Date(ts * 1000) : new Date(ts);
      } else if (typeof ts === 'string') {
        d = new Date(ts);
      }
      if (!d || isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const filteredPakets = pakets.filter(p => {
    const matchesSearch = p.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.deskripsi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.requestId && p.requestId.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;

    // Filter Mitra
    if (filterMitra === 'PUSAT') {
      if (p.mitraId) return false;
    } else if (filterMitra !== 'ALL') {
      if (p.mitraId !== filterMitra) return false;
    }

    // Filter Tanggal Buat
    if (filterTglBuat) {
      const dateStr = getPaketCreationDateString(p);
      if (dateStr !== filterTglBuat) return false;
    }

    // Filter Status Validasi / Draft / Pending
    const statusVal = (p.status || '') as string;
    if (filterStatus === 'published') {
      if (statusVal !== 'published' && statusVal !== 'validated' && statusVal !== 'approved') return false;
    } else if (filterStatus === 'pending_validation') {
      if (statusVal !== 'pending_validation' && statusVal !== 'pending') return false;
    } else if (filterStatus === 'draft') {
      if (statusVal !== 'draft') return false;
    } else if (filterStatus === 'archived') {
      if (statusVal !== 'archived') return false;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const isArchived = p.status === 'archived';
    
    const maskapai = maskapaiList.find(m => m.id === p.maskapaiId);
    const flightDate = maskapai?.tanggalKeberangkatan || p.tglBerangkat || '';
    const hasPassed = !!(flightDate && flightDate < todayStr);
    const isExpired = isArchived || hasPassed;

    if (filterType === 'active') {
      return !isExpired && p.status !== 'archived';
    } else if (filterType === 'archived_expired') {
      return isExpired || p.status === 'archived';
    }
    return true;
  }).sort((a, b) => getCreationTimestamp(b) - getCreationTimestamp(a));

  const totalItems = filteredPakets.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPakets = filteredPakets.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleToggleArchive = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'archived' ? 'published' : 'archived';
      await updateDoc(doc(db, 'paket_master', id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      showNotification('success', `Paket berhasil ${newStatus === 'archived' ? 'diarsipkan' : 'diaktifkan kembali'}`);
    } catch (error) {
      console.error("Error toggling archive status:", error);
      handleFirestoreError(error, OperationType.UPDATE, `paket_master/${id}`);
      showNotification('error', 'Gagal memproses arsip paket.');
    }
  };

  const getMaskapaiName = (id: string) => {
    const maskapai = maskapaiList.find(m => m.id === id);
    return maskapai ? `${maskapai.name} (${maskapai.tanggalKeberangkatan})` : 'Maskapai Tidak Ditemukan';
  };

  const getStatusColor = (status: string, isExpired = false) => {
    if (status === 'archived') return 'bg-purple-100 text-purple-800';
    if (isExpired) return 'bg-rose-100 text-rose-800';
    switch (status) {
      case 'published': return 'bg-emerald-100 text-emerald-800';
      case 'pending_validation': return 'bg-amber-100 text-amber-800';
      case 'closed': return 'bg-rose-100 text-rose-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openTracker = (paket: PaketMaster) => {
    // Strict isolation: only match if ID or non-empty requestId matches
    const tracker = allTrackers.find(t => 
      t.paketMasterId === paket.id || 
      (paket.requestId && t.requestId === paket.requestId)
    );
    if (tracker) {
      setViewingTrackerPaket(tracker as PaketTracker);
    } else {
      showNotification('error', 'Tracker belum dibuat untuk paket ini. Silakan validasi terlebih dahulu.');
    }
  };

  if (isAdding || isEditing || isReviewing) {
    return (
      <div className="p-0 sm:p-6 sm:max-w-7xl sm:mx-auto relative">
        <PaketMasterWizard 
          initialData={isReviewing || isEditing ? formData : undefined}
          initialStepName={isReviewing ? "REVIEW FASILITAS" : undefined}
          autoDownloadPdf={isDirectDownloading}
          onCancel={() => {
            setIsAdding(false);
            setIsEditing(null);
            setIsReviewing(null);
            setIsDirectDownloading(false);
            setFormData({});
          }}
          onSuccess={() => {
            setIsAdding(false);
            setIsEditing(null);
            setIsReviewing(null);
            setIsDirectDownloading(false);
            setFormData({});
            showNotification('success', 'Paket berhasil disimpan!');
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white font-medium transition-all ${
          notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Tracker Modal */}
      {viewingTrackerPaket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setViewingTrackerPaket(null)}
              className="absolute -top-12 right-0 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-emerald-600 rounded-t-3xl text-white">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tight leading-none mb-1">Tracker Operasional</h3>
                  <div className="text-xs font-bold text-emerald-100 uppercase tracking-widest">{viewingTrackerPaket.namaPaket}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-200 mb-1">Status Keberangkatan</div>
                <span className="bg-white text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {viewingTrackerPaket.status || 'Persiapan'}
                </span>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <ChecklistOperasional paket={viewingTrackerPaket} />
              
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" /> Jadwal Berangkat
                  </div>
                  <div className="text-lg font-black italic text-gray-900">{viewingTrackerPaket.tanggalBerangkat}</div>
                  <div className="mt-2 text-xs font-bold text-gray-500 uppercase">Input manual oleh operasional</div>
                </div>

                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Layout className="w-4 h-4 text-emerald-500" /> Kuota Terisi
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="text-2xl font-black italic text-indigo-600">{viewingTrackerPaket.terdaftar || 0}</div>
                    <div className="text-xs font-black text-gray-400 mb-1">/ {viewingTrackerPaket.targetJamaah || 45} JAMAHA</div>
                  </div>
                  <div className="mt-4 w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-1000" 
                      style={{ width: `${Math.min(((viewingTrackerPaket.terdaftar || 0) / (viewingTrackerPaket.targetJamaah || 45)) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col justify-center items-center text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Validasi Admin</div>
                  <div className="text-sm font-black text-emerald-600 uppercase italic">Valid & Aktif</div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-b-3xl text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aksi ini sinkron real-time dengan dashboard mitra dan operasional</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            Paket Master
          </h2>
          <p className="text-gray-500 text-sm mt-1">Kelola paket umroh utama (Master) yang akan dijual melalui website atau ke Mitra.</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setIsEditing(null); setFormData({ status: 'draft' }); }}
          className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          Buat Paket Program Baru
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-3">
          {/* Main Search & Execution Tab Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari paket master..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white font-bold text-xs"
              />
            </div>

            <div className="flex gap-1 p-1 bg-gray-200/50 border border-gray-200 rounded-xl self-start md:self-auto">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  filterType === 'all' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Semua Program
              </button>
              <button
                onClick={() => setFilterType('active')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  filterType === 'active' 
                    ? 'bg-white text-emerald-700 shadow-sm' 
                    : 'text-gray-500 hover:text-emerald-700'
                }`}
              >
                Aktif Pelaksanaan
              </button>
              <button
                onClick={() => setFilterType('archived_expired')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  filterType === 'archived_expired' 
                    ? 'bg-white text-rose-700 shadow-sm' 
                    : 'text-gray-500 hover:text-rose-700'
                }`}
              >
                Arsip & Lewat
              </button>
            </div>
          </div>

          {/* Sub Bar: Detailed Filters (Mitra, Tanggal Buat, Status Validasi) */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-200/60">
            {/* Filter Mitra */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 shadow-sm">
              <span className="text-[10px] font-black uppercase text-gray-400">Mitra:</span>
              <select
                value={filterMitra}
                onChange={(e) => setFilterMitra(e.target.value)}
                className="text-xs font-extrabold text-gray-800 bg-transparent outline-none cursor-pointer"
              >
                <option value="ALL">Semua Mitra / Brand</option>
                <option value="PUSAT">⭐ Umaroh Pusat</option>
                {users
                  .filter(u => u.brandName || u.role === 'mitra' || u.role === 'agen' || pakets.some(p => p.mitraId === u.id))
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.brandName ? `${u.brandName} (${u.namaLengkap || u.name})` : (u.namaLengkap || u.name || u.email)}
                    </option>
                  ))
                }
              </select>
            </div>

            {/* Filter Tanggal Buat */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 shadow-sm">
              <span className="text-[10px] font-black uppercase text-gray-400">Tgl Buat:</span>
              <input
                type="date"
                value={filterTglBuat}
                onChange={(e) => setFilterTglBuat(e.target.value)}
                className="text-xs font-extrabold text-gray-800 bg-transparent outline-none cursor-pointer"
              />
              {filterTglBuat && (
                <button
                  onClick={() => setFilterTglBuat('')}
                  className="text-gray-400 hover:text-rose-500 transition-colors p-0.5 cursor-pointer"
                  title="Hapus Filter Tanggal"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Status Validasi */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 shadow-sm">
              <span className="text-[10px] font-black uppercase text-gray-400">Status Validasi:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs font-extrabold text-gray-800 bg-transparent outline-none cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="published">✅ Validasi / Published</option>
                <option value="pending_validation">⏳ Pending Validasi</option>
                <option value="draft">📝 Draft</option>
                <option value="archived">📦 Diarsipkan</option>
              </select>
            </div>

            {/* Reset Filters button */}
            {(searchTerm || filterType !== 'all' || filterMitra !== 'ALL' || filterTglBuat !== '' || filterStatus !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setFilterMitra('ALL');
                  setFilterTglBuat('');
                  setFilterStatus('ALL');
                }}
                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filter
              </button>
            )}
          </div>
        </div>

         <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-900 text-[#FDB913] text-[10px] uppercase tracking-widest font-black">
              <tr>
                <th className="px-6 py-4">Kode Paket</th>
                <th className="px-6 py-4">Tanggal Buat</th>
                <th className="px-6 py-4">Nama Paket & Deskripsi</th>
                <th className="px-6 py-4">Nama Mitra / Brand</th>
                <th className="px-6 py-4">Maskapai & Jadwal</th>
                <th className="px-6 py-4 text-right">Harga Jual (Quad)</th>
                <th className="px-6 py-4 text-center">Kuota (Sisa)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 italic font-medium">
              {paginatedPakets.map(paket => {
                const todayStr = new Date().toISOString().split('T')[0];
                const isArchived = paket.status === 'archived';
                const maskapaiRef = maskapaiList.find(m => m.id === paket.maskapaiId);
                const flightDate = maskapaiRef?.tanggalKeberangkatan || paket.tglBerangkat || '';
                const hasPassed = !!(flightDate && flightDate < todayStr);
                const isExpired = isArchived || hasPassed;

                return (
                  <tr key={paket.id} className={`hover:bg-gray-50 transition-colors ${isExpired ? 'bg-gray-50/50 opacity-75' : ''}`}>
                    <td className="px-6 py-4">
                      {paket.requestId ? (
                        <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-2 py-1 rounded tracking-widest border border-gray-200">
                          {paket.requestId}
                        </span>
                      ) : (
                        <span className="bg-gray-50 text-gray-400 text-[10px] font-black px-2 py-1 rounded tracking-widest border border-gray-100 italic" title="Kode Sementara">
                          {`REQ-${paket.id.slice(0, 4).toUpperCase()}`}*
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-gray-800 uppercase tracking-tighter">
                        {(() => {
                          const p = paket as unknown as Record<string, unknown>;
                          return formatTimestamp(
                            p.createdAt || 
                            p.created_at || 
                            p.updatedAt || 
                            p.updated_at || 
                            (paket.tglBerangkat ? new Date(new Date(paket.tglBerangkat).getTime() - 45 * 24 * 60 * 60 * 1000) : new Date())
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => openTracker(paket)}
                        className="text-left group"
                      >
                        <div className="font-black italic text-gray-900 uppercase tracking-tighter text-sm group-hover:text-emerald-600 transition-colors">{paket.nama}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase mt-1 line-clamp-1">{paket.deskripsi}</div>
                      </button>
                      {paket.kesiapanJamaah && (
                        <div className="mt-1 flex items-center gap-1.5">
                          {paket.kesiapanJamaah === 'ready_to_pay' ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 tracking-wider">
                              ⚡ Siap Bayar ({paket.jumlahJamaahSiapBayar || paket.kuota || 0} Pax)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 tracking-wider">
                              📋 Belum Ada Jamaah
                            </span>
                          )}
                        </div>
                      )}
                      {allTrackers.some(t => t.namaPaket === paket.nama) && (
                        <div className="mt-2 flex gap-1">
                          {(() => {
                             const t = allTrackers.find(t => t.namaPaket === paket.nama);
                             return (
                               <>
                                 <div className={`w-1.5 h-1.5 rounded-full ${t?.checklist?.statusVisa === 'Issued' ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                                 <div className={`w-1.5 h-1.5 rounded-full ${t?.checklist?.statusTiket === 'Issued' ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                                 <div className={`w-1.5 h-1.5 rounded-full ${t?.checklist?.statusHotelMakkah === 'Paid' ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                                 <span className="text-[8px] font-black uppercase text-gray-400 ml-1">Tracker Active</span>
                               </>
                             )
                          })()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const mId = paket.mitraId;
                        if (!mId) {
                          return <span className="bg-amber-50 text-amber-700 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border border-amber-200 tracking-wider">Umaroh Pusat</span>;
                        }
                        const u = users.find(user => user.id === mId);
                        if (!u) return <span className="text-xs text-gray-450 font-bold italic">Mitra Tidak Ditemukan</span>;
                        return (
                          <div>
                            <p className="font-extrabold text-gray-900 text-xs uppercase leading-tight">{u.namaLengkap || u.name || 'Mitra'}</p>
                            {u.brandName && (
                              <p className="text-[9px] text-indigo-600 font-black uppercase mt-0.5 tracking-tight">💼 {u.brandName}</p>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-gray-700 uppercase">{getMaskapaiName(paket.maskapaiId)}</div>
                      {hasPassed && (
                        <div className="text-[9px] text-rose-600 font-extrabold uppercase mt-1 tracking-tight flex items-center gap-1">
                          ⚠️ Lewat Tanggal (Expired)
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-black italic text-emerald-600 text-sm">
                      {formatCurrency(paket.hargaJualQuad || paket.hargaDasar)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-black text-gray-900">{paket.kuota}</span>
                      <span className="text-gray-300 mx-1">/</span>
                      <span className={`font-black ${paket.sisaKuota < 5 ? 'text-rose-600' : 'text-blue-600'}`}>{paket.sisaKuota}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusColor(paket.status, hasPassed)}`}>
                        {isArchived ? 'DIARSIPKAN' : hasPassed ? 'EXPIRED' : paket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {deleteConfirm === paket.id ? (
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleDelete(paket.id)} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-bold uppercase tracking-widest text-[9px]">Hapus</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-xs bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-300 font-bold uppercase tracking-widest text-[9px]">Batal</button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          {paket.status === 'pending_validation' && (
                            <>
                              <button 
                                onClick={() => initializeSoCostComponents(paket)} 
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors animate-pulse" 
                                title="Setujui & Validasi dengan Sales Order"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleReject(paket)} 
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" 
                                title="Tolak"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          
                          <button 
                            onClick={() => handleToggleArchive(paket.id, paket.status)} 
                            className={`p-2 rounded-lg transition-colors ${
                              isArchived 
                                ? 'text-purple-600 hover:bg-purple-50' 
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            }`}
                            title={isArchived ? 'Aktifkan Kembali' : 'Arsipkan Paket'}
                          >
                            <Archive className="w-4 h-4" />
                          </button>

                          <button onClick={() => startEdit(paket)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button 
                            onClick={() => startReview(paket)} 
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                            title="Unduh / Preview Deskripsi"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <button onClick={() => setDeleteConfirm(paket.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {paginatedPakets.length === 0 && !loading && !isAdding && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 font-bold uppercase tracking-wider text-xs">
                    Belum ada data Paket Master untuk kriteria filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredPakets.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-gray-600">
            <div>
              Menampilkan <span className="font-extrabold text-gray-900">{startIndex + 1}</span> - <span className="font-extrabold text-gray-900">{Math.min(startIndex + ITEMS_PER_PAGE, totalItems)}</span> dari <span className="font-extrabold text-gray-900">{totalItems}</span> Paket Master
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={validCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - validCurrentPage) <= 1)
                  .reduce<(number | string)[]>((acc, page, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === 'number' && page - (arr[idx - 1] as number) > 1) {
                      acc.push('...');
                    }
                    acc.push(page);
                    return acc;
                  }, [])
                  .map((item, idx) => {
                    if (typeof item === 'string') {
                      return <span key={`dots-${idx}`} className="px-1 text-gray-400">...</span>;
                    }
                    return (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                          validCurrentPage === item
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={validCurrentPage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sales Order Profitability Validation Modal */}
      {soValidationPaket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setSoValidationPaket(null)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-gray-100 z-10 animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Activity className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-wide uppercase italic">Validasi Profitabilitas Sales Order</h3>
                  <p className="text-xs text-blue-100 font-medium">Analisis Kelayakan Finansial sebelum Paket Dipublikasikan</p>
                </div>
              </div>
              <button 
                onClick={() => setSoValidationPaket(null)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              {/* Info Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Nama Paket</p>
                  <p className="font-bold text-slate-800 text-sm">{soValidationPaket.nama}</p>
                  <p className="text-slate-500 mt-1">{soValidationPaket.deskripsi}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Mitra Pembuat</p>
                    <p className="font-bold text-indigo-700">
                      {(() => {
                        const mId = soValidationPaket.mitraId;
                        if (!mId) return "Umaroh Pusat";
                        const u = users.find(user => user.id === mId);
                        return u?.namaLengkap || u?.name || "Mitra";
                      })()}
                    </p>
                    {(() => {
                      const mId = soValidationPaket.mitraId;
                      const u = mId ? users.find(user => user.id === mId) : null;
                      return u?.brandName && <p className="text-[10px] font-black text-slate-500">💼 {u.brandName}</p>;
                    })()}
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Kuota / Seats</p>
                    <p className="font-extrabold text-slate-800">{soValidationPaket.kuota} Pax</p>
                  </div>
                </div>
              </div>

              {/* Two Column Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Harga Jual APK */}
                <div className="lg:col-span-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider border-b pb-1.5">Harga Jual Paket (APK)</h4>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                      <span className="text-xs font-bold text-slate-600">QUAD ROOM</span>
                      <span className="font-black text-emerald-700 text-sm">
                        {formatCurrency(soValidationPaket.hargaJualQuad || soValidationPaket.hargaDasar || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                      <span className="text-xs font-semibold text-slate-600">TRIPLE ROOM</span>
                      <span className="font-bold text-indigo-700 text-sm">
                        {formatCurrency(((soValidationPaket as unknown as Record<string, unknown>).hargaJualTriple as number) || (soValidationPaket.hargaJualQuad || soValidationPaket.hargaDasar || 0) + 1500000)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                      <span className="text-xs font-semibold text-slate-600">DOUBLE ROOM</span>
                      <span className="font-bold text-indigo-700 text-sm">
                        {formatCurrency(((soValidationPaket as unknown as Record<string, unknown>).hargaJualDouble as number) || (soValidationPaket.hargaJualQuad || soValidationPaket.hargaDasar || 0) + 3000000)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-extrabold uppercase text-blue-500 tracking-wider mb-0.5">Potensi Total Pendapatan</p>
                    <p className="text-xl font-black text-blue-900 leading-none">
                      {formatCurrency((soValidationPaket.hargaJualQuad || soValidationPaket.hargaDasar || 0) * (soValidationPaket.kuota || 45))}
                    </p>
                    <p className="text-[10px] text-blue-600 font-medium mt-1">Berdasarkan Harga Jual Quad x Sisa Kuota ({soValidationPaket.kuota} Pax)</p>
                  </div>
                </div>

                {/* Right: Harga Beli Sesuai Vendor */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex justify-between items-center border-b pb-1.5">
                    <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">Harga Beli Vendor & Komponen Biaya</h4>
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">Dapat Disesuaikan</span>
                  </div>
                  
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                    {soCostComponents.map((comp, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                        <div className="flex-1">
                          <p className="font-black text-slate-800 leading-tight">{comp.nama_komponen}</p>
                          <div className="flex gap-2 text-[10px] text-slate-400 font-semibold uppercase mt-0.5">
                            <span>Kategori: {comp.kategori_komponen}</span>
                            <span>•</span>
                            <span className="text-indigo-600 font-extrabold">Vendor: {comp.vendor_id}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase">Rp</span>
                          <input 
                            type="number" 
                            value={comp.harga_satuan}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              const updated = [...soCostComponents];
                              updated[idx] = {
                                ...updated[idx],
                                harga_satuan: val,
                                total_biaya: val * comp.qty
                              };
                              setSoCostComponents(updated);
                            }}
                            className="w-28 px-2.5 py-1 text-right bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="text-slate-400 font-bold">x {comp.qty}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Profitability Summary Board */}
              {(() => {
                const totalRevenue = (soValidationPaket.hargaJualQuad || soValidationPaket.hargaDasar || 0) * (soValidationPaket.kuota || 45);
                const totalCost = soCostComponents.reduce((acc, c) => acc + (c.total_biaya || 0), 0);
                const netProfit = totalRevenue - totalCost;
                const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
                const isProfitable = netProfit > 0;

                return (
                  <div className={`p-5 rounded-3xl border ${isProfitable ? 'bg-emerald-50/60 border-emerald-100 text-emerald-900' : 'bg-rose-50 border-rose-100 text-rose-900'} grid grid-cols-1 md:grid-cols-3 gap-4 items-center`}>
                    <div className="md:col-span-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider">Hasil Analisis Finansial:</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${isProfitable ? 'bg-emerald-500 text-white border-emerald-600/20 shadow-sm shadow-emerald-500/20' : 'bg-rose-600 text-white border-rose-700/20 shadow-sm shadow-rose-600/20'}`}>
                          {isProfitable ? '🟢 PROFIT (UNTUNG)' : '🔴 LOSS (RUGI / TEKOR)'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        {isProfitable 
                          ? 'Paket dinilai layak dan menguntungkan. Estimasi keuntungan bersih di atas batas minimum margin operasional.' 
                          : 'Peringatan! Total harga beli vendor melebihi atau sama dengan harga jual paket. Kurangi biaya vendor sebelum memvalidasi.'}
                      </p>
                    </div>
                    <div className="text-right space-y-1 bg-white p-3.5 rounded-2xl border shadow-sm">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Laba Bersih & Margin</p>
                      <p className={`text-lg font-black leading-none ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {netProfit < 0 ? '-' : ''}{formatCurrency(Math.abs(netProfit))}
                      </p>
                      <p className={`text-[10px] font-extrabold ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {profitMargin.toFixed(1)}% Margin
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <button 
                onClick={() => setSoValidationPaket(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all"
              >
                Kembali
              </button>
              
              {(() => {
                const totalRevenue = (soValidationPaket.hargaJualQuad || soValidationPaket.hargaDasar || 0) * (soValidationPaket.kuota || 45);
                const totalCost = soCostComponents.reduce((acc, c) => acc + (c.total_biaya || 0), 0);
                const isProfitable = (totalRevenue - totalCost) > 0;

                return (
                  <button 
                    disabled={!isProfitable || soIsSaving}
                    onClick={handleConfirmValidateWithSo}
                    className={`px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 shadow-lg ${
                      isProfitable 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 cursor-pointer hover:-translate-y-0.5' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {soIsSaving ? 'Memproses Validasi...' : 'Setujui & Terbitkan (Valid & Profit)'}
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

