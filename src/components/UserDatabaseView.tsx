import React, { useState, useEffect } from 'react';
import { db, auth, collection, onSnapshot, doc, deleteDoc, handleFirestoreError, OperationType, setDoc, getDocs, query, where } from '../firebase';
import { Users, Shield, User, Search, Edit2, Trash2, Mail, Phone, MapPin, Plus, X, CheckCircle2, Building2, ChevronLeft, ChevronRight, RefreshCw, FileText } from 'lucide-react';

type UserRole = 'admin' | 'mitra' | 'jamaah' | 'vendor';

interface UserData {
  id: string;
  namaLengkap?: string;
  name?: string;
  email?: string;
  role: string;
  phone?: string;
  address?: string;
  mitraName?: string;
  photoURL?: string;
  createdAt?: {
    seconds: number;
    nanoseconds: number;
  } | string | Date;
  status?: string;
  brandName?: string;
  namaVendor?: string;
  passwordAwal?: string;
  updatedAt?: string;
  kota?: string;
  subRole?: string;
  jenisMitra?: string;
}

interface PreUserData extends UserData {
  activatedAt?: string;
  activatedByUid?: string;
}

interface SyncUserDetail {
  id: string;
  uid?: string;
  email?: string;
  nama?: string;
  namaLengkap?: string;
  phone?: string;
  brandName?: string;
  paketId?: string;
  uplineId?: string;
  provinsi?: string;
  kota?: string;
  kecamatan?: string;
  desaKelurahan?: string;
  alamatLengkap?: string;
  address?: string;
  createdAt?: string;
  jamaahId?: string;
  emailJamaah?: string;
  namaJamaah?: string;
  nama_paspor?: string;
  noHp?: string;
  alamat?: string;
}

interface AuthUser {
  uid: string;
  email?: string;
  displayName?: string;
  phoneNumber?: string;
  createdAt?: string;
}

export const UserDatabaseView: React.FC = () => {
  const currentUserEmail = auth.currentUser?.email || '';
  const isMasterAdmin = currentUserEmail === 'operationalumaroh@gmail.com' || currentUserEmail === 'afadsa76@gmail.com';

  const [users, setUsers] = useState<UserData[]>([]);
  const [preUsers, setPreUsers] = useState<PreUserData[]>([]);
  const [showAuditView, setShowAuditView] = useState(false);
  const [activeRole, setActiveRole] = useState<UserRole>('jamaah');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMasterAdmin) {
      setActiveRole('admin');
    } else {
      setActiveRole('mitra');
    }
  }, [isMasterAdmin]);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  
  // Form fields
  const [namaLengkap, setNamaLengkap] = useState('');
  const [email, setEmail] = useState('');
  const [roleOption, setRoleOption] = useState<UserRole>('jamaah');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('active');
  const [brandName, setBrandName] = useState('');
  const [passwordAwal, setPasswordAwal] = useState('');
  const [kota, setKota] = useState('');
  const [subRole, setSubRole] = useState('');
  const [jenisMitra, setJenisMitra] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; restoredMitra: number; restoredJamaah: number; error?: string; apiNotEnabled?: boolean } | null>(null);
  const [syncTab, setSyncTab] = useState<'auto' | 'manual'>('auto');
  const [pastedText, setPastedText] = useState('');
  const [defaultImportRole, setDefaultImportRole] = useState<UserRole>('jamaah');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleSyncDatabase = () => {
    setSyncTab('auto');
    setShowSyncConfirm(true);
  };

  const runActualSync = async () => {
    setShowSyncConfirm(false);
    setIsSyncing(true);
    let restoredMitraCount = 0;
    let restoredJamaahCount = 0;

    try {
      // 1. Ambil list user di Firestore saat ini
      const currentUsersSnap = await getDocs(collection(db, 'users'));
      const existingUserUids = new Set(currentUsersSnap.docs.map(doc => doc.id));

      // 2. Ambil pendaftaran_mitra dan bookings untuk pencarian cepat
      const mitraSnap = await getDocs(collection(db, 'pendaftaran_mitra'));
      const bookingsSnap = await getDocs(collection(db, 'bookings'));

      const mitraList = mitraSnap.docs.map(d => ({ id: d.id, ...d.data() } as SyncUserDetail));
      const bookingsList = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SyncUserDetail));

      // 3. Panggil backend API untuk mendapatkan semua user dari Firebase Auth
      let authUsers: AuthUser[] = [];
      let isApiDisabled = false;
      let apiErrorDetail = '';
      try {
        const response = await fetch('/api/auth/list-users');
        const resData = await response.json();
        if (response.ok && resData.success && Array.isArray(resData.users)) {
          authUsers = resData.users;
          console.info(`[Sync] Berhasil memuat ${authUsers.length} pengguna dari Firebase Auth.`);
        } else {
          isApiDisabled = resData.apiNotEnabled || false;
          apiErrorDetail = resData.error || 'Gagal memanggil API list-users.';
          throw new Error(apiErrorDetail);
        }
      } catch (apiErr) {
        console.warn('Gagal memanggil API list-users backend:', apiErr);
        const errStr = apiErr instanceof Error ? apiErr.message : String(apiErr);
        setSyncResult({
          success: false,
          restoredMitra: 0,
          restoredJamaah: 0,
          error: errStr,
          apiNotEnabled: isApiDisabled || errStr.includes('403') || errStr.includes('identitytoolkit')
        });
        setIsSyncing(false);
        return;
      }

      if (authUsers.length > 0) {
        // Jalankan sinkronisasi berbasis Firebase Auth (Komprehensif!)
        for (const authUser of authUsers) {
          const uid = authUser.uid;
          const emailLower = authUser.email?.toLowerCase().trim();

          // Jika user sudah ada di Firestore users, lewati
          if (existingUserUids.has(uid)) {
            continue;
          }

          // Cari kecocokan di pendaftaran_mitra berdasarkan uid atau email
          const matchedMitra = mitraList.find((m: SyncUserDetail) => 
            (m.uid === uid || m.id === uid) || 
            (m.email && m.email.toLowerCase().trim() === emailLower)
          );

          if (matchedMitra) {
            const restoredDoc = {
              uid: uid,
              id: uid,
              email: emailLower || matchedMitra.email?.toLowerCase().trim() || '',
              role: 'mitra',
              namaLengkap: matchedMitra.nama || matchedMitra.namaLengkap || authUser.displayName || 'Mitra',
              name: matchedMitra.nama || matchedMitra.namaLengkap || authUser.displayName || 'Mitra',
              phone: matchedMitra.phone || authUser.phoneNumber || '',
              brandName: matchedMitra.brandName || '',
              paketId: matchedMitra.paketId || '',
              uplineId: matchedMitra.uplineId || '',
              provinsi: matchedMitra.provinsi || '',
              kota: matchedMitra.kota || '',
              kecamatan: matchedMitra.kecamatan || '',
              desaKelurahan: matchedMitra.desaKelurahan || '',
              address: matchedMitra.alamatLengkap || matchedMitra.address || '',
              createdAt: matchedMitra.createdAt || authUser.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', uid), restoredDoc);
            existingUserUids.add(uid);
            restoredMitraCount++;
            continue;
          }

          // Cari kecocokan di bookings berdasarkan jamaahId atau email
          const matchedBooking = bookingsList.find((b: SyncUserDetail) => 
            (b.jamaahId === uid) || 
            (b.email && b.email.toLowerCase().trim() === emailLower) || 
            (b.emailJamaah && b.emailJamaah.toLowerCase().trim() === emailLower)
          );

          if (matchedBooking) {
            const restoredDoc = {
              uid: uid,
              id: uid,
              email: emailLower || matchedBooking.email?.toLowerCase().trim() || matchedBooking.emailJamaah?.toLowerCase().trim() || `${uid.substring(0, 8)}@umaroh.temp`,
              role: 'jamaah',
              namaLengkap: matchedBooking.namaJamaah || matchedBooking.nama_paspor || authUser.displayName || 'Jamaah',
              name: matchedBooking.namaJamaah || matchedBooking.nama_paspor || authUser.displayName || 'Jamaah',
              phone: matchedBooking.noHp || matchedBooking.phone || authUser.phoneNumber || '',
              address: matchedBooking.alamat || '',
              createdAt: matchedBooking.createdAt || authUser.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', uid), restoredDoc);
            existingUserUids.add(uid);
            restoredJamaahCount++;
            continue;
          }

          // Fallback jika tidak ada data di pendaftaran_mitra atau bookings
          // Tentukan role berdasarkan email
          let inferredRole = 'jamaah';
          if (emailLower && emailLower.includes('mitra')) {
            inferredRole = 'mitra';
          } else if (emailLower && emailLower.includes('vendor')) {
            inferredRole = 'vendor';
          }

          const defaultName = authUser.displayName || (authUser.email ? authUser.email.split('@')[0] : 'User');
          const restoredDoc = {
            uid: uid,
            id: uid,
            email: emailLower || `${uid.substring(0, 8)}@umaroh.temp`,
            role: inferredRole,
            namaLengkap: defaultName,
            name: defaultName,
            phone: authUser.phoneNumber || '',
            address: '',
            createdAt: authUser.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', uid), restoredDoc);
          existingUserUids.add(uid);
          
          if (inferredRole === 'mitra') {
            restoredMitraCount++;
          } else {
            restoredJamaahCount++;
          }
        }
      }

      setSyncResult({
        success: true,
        restoredMitra: restoredMitraCount,
        restoredJamaah: restoredJamaahCount
      });
    } catch (err) {
      console.error("Error during database synchronization:", err);
      setSyncResult({
        success: false,
        restoredMitra: 0,
        restoredJamaah: 0,
        error: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const runManualSync = async () => {
    if (!pastedText.trim()) {
      alert("Mohon tempel teks daftar pengguna dari konsol Firebase terlebih dahulu.");
      return;
    }

    setIsSyncing(true);
    setShowSyncConfirm(false);
    let restoredMitraCount = 0;
    let restoredJamaahCount = 0;

    try {
      // 1. Ambil list user di Firestore saat ini
      const currentUsersSnap = await getDocs(collection(db, 'users'));
      const existingUserUids = new Set(currentUsersSnap.docs.map(doc => doc.id));

      // 2. Ambil pendaftaran_mitra dan bookings untuk pencarian cepat
      const mitraSnap = await getDocs(collection(db, 'pendaftaran_mitra'));
      const bookingsSnap = await getDocs(collection(db, 'bookings'));

      const mitraList = mitraSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const bookingsList = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 3. Parse pasted text
      const parsedUsers: { email: string; uid: string }[] = [];
      const lines = pastedText.split('\n');
      
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const uidRegex = /\b[a-zA-Z0-9]{27,36}\b/;

      let currentEmail = '';
      let currentUid = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const emailMatch = trimmed.match(emailRegex);
        const uidMatch = trimmed.match(uidRegex);

        if (emailMatch) {
          currentEmail = emailMatch[0].toLowerCase().trim();
        }
        if (uidMatch && !uidMatch[0].includes('@') && !uidMatch[0].includes('.')) {
          currentUid = uidMatch[0].trim();
        }

        if (currentEmail && currentUid) {
          parsedUsers.push({ email: currentEmail, uid: currentUid });
          currentEmail = '';
          currentUid = '';
        }
      }

      // Fallback: If not interleaved, but we can match them globally
      if (parsedUsers.length === 0) {
        const allEmails = pastedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const allUids = (pastedText.match(/\b[a-zA-Z0-9_-]{27,36}\b/g) || ([] as string[])).filter(u => !u.includes('@') && !u.includes('.'));

        const minLen = Math.min(allEmails.length, allUids.length);
        for (let i = 0; i < minLen; i++) {
          parsedUsers.push({
            email: allEmails[i].toLowerCase().trim(),
            uid: allUids[i].trim()
          });
        }
      }

      if (parsedUsers.length === 0) {
        throw new Error("Format teks tidak dikenali. Pastikan teks yang ditempel mengandung email dan UID pengguna dari halaman Firebase Auth.");
      }

      // 4. Jalankan pemulihan data untuk setiap user hasil parsing
      for (const parsedUser of parsedUsers) {
        const uid = parsedUser.uid;
        const emailLower = parsedUser.email;

        if (existingUserUids.has(uid)) {
          continue;
        }

        // Cari di pendaftaran_mitra
        const matchedMitra = mitraList.find((m: SyncUserDetail) => 
          (m.uid === uid || m.id === uid) || 
          (m.email && m.email.toLowerCase().trim() === emailLower)
        );

        if (matchedMitra) {
          const restoredDoc = {
            uid: uid,
            id: uid,
            email: emailLower || matchedMitra.email?.toLowerCase().trim() || '',
            role: 'mitra',
            namaLengkap: matchedMitra.nama || matchedMitra.namaLengkap || 'Mitra',
            name: matchedMitra.nama || matchedMitra.namaLengkap || 'Mitra',
            phone: matchedMitra.phone || '',
            brandName: matchedMitra.brandName || '',
            paketId: matchedMitra.paketId || '',
            uplineId: matchedMitra.uplineId || '',
            provinsi: matchedMitra.provinsi || '',
            kota: matchedMitra.kota || '',
            kecamatan: matchedMitra.kecamatan || '',
            desaKelurahan: matchedMitra.desaKelurahan || '',
            address: matchedMitra.alamatLengkap || matchedMitra.address || '',
            createdAt: matchedMitra.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', uid), restoredDoc);
          existingUserUids.add(uid);
          restoredMitraCount++;
          continue;
        }

        // Cari di bookings
        const matchedBooking = bookingsList.find((b: SyncUserDetail) => 
          (b.jamaahId === uid) || 
          (b.email && b.email.toLowerCase().trim() === emailLower) || 
          (b.emailJamaah && b.emailJamaah.toLowerCase().trim() === emailLower)
        );

        if (matchedBooking) {
          const restoredDoc = {
            uid: uid,
            id: uid,
            email: emailLower || matchedBooking.email?.toLowerCase().trim() || matchedBooking.emailJamaah?.toLowerCase().trim() || `${uid.substring(0, 8)}@umaroh.temp`,
            role: 'jamaah',
            namaLengkap: matchedBooking.namaJamaah || matchedBooking.nama_paspor || 'Jamaah',
            name: matchedBooking.namaJamaah || matchedBooking.nama_paspor || 'Jamaah',
            phone: matchedBooking.noHp || matchedBooking.phone || '',
            address: matchedBooking.alamat || '',
            createdAt: matchedBooking.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', uid), restoredDoc);
          existingUserUids.add(uid);
          restoredJamaahCount++;
          continue;
        }

        // Fallback default
        let inferredRole = defaultImportRole;
        if (emailLower.includes('mitra')) {
          inferredRole = 'mitra';
        } else if (emailLower.includes('vendor')) {
          inferredRole = 'vendor';
        }

        const restoredDoc = {
          uid: uid,
          id: uid,
          email: emailLower,
          role: inferredRole,
          namaLengkap: emailLower.split('@')[0],
          name: emailLower.split('@')[0],
          phone: '',
          address: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', uid), restoredDoc);
        existingUserUids.add(uid);

        if (inferredRole === 'mitra') {
          restoredMitraCount++;
        } else {
          restoredJamaahCount++;
        }
      }

      setSyncResult({
        success: true,
        restoredMitra: restoredMitraCount,
        restoredJamaah: restoredJamaahCount
      });
      setPastedText(''); // reset
    } catch (err) {
      console.error("Error during manual synchronization:", err);
      setSyncResult({
        success: false,
        restoredMitra: 0,
        restoredJamaah: 0,
        error: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
    setSelectedUserIds([]);
  }, [activeRole, searchQuery, showAuditView]);

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
      setUsers(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
      setLoading(false);
    });

    const unsubscribePreUsers = onSnapshot(collection(db, 'pre_users'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPreUsers(data);
    }, (error) => {
      console.error("Error loading pre_users collection:", error);
    });

    return () => {
      unsubscribeUsers();
      unsubscribePreUsers();
    };
  }, []);

  const filteredUsers = users.filter(user => {
    const roleMatch = user.role === activeRole;
    const searchMatch = 
      (user.namaLengkap?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       user.phone?.includes(searchQuery) ||
       user.mitraName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       user.brandName?.toLowerCase().includes(searchQuery.toLowerCase()));
    return roleMatch && searchMatch;
  });

  const filteredPreUsers = preUsers.filter(user => {
    const searchMatch = 
      (user.namaLengkap?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       user.phone?.includes(searchQuery) ||
       user.brandName?.toLowerCase().includes(searchQuery.toLowerCase()));
    return searchMatch;
  });

  const getUserDisplayName = (u: UserData) => {
    if ((u.role === 'mitra' || u.role === 'vendor') && u.brandName) {
      return u.brandName;
    }
    return u.namaLengkap || u.mitraName || 'Tanpa Nama';
  };

  const formatUserDate = (dateVal: string | Date | { seconds: number; nanoseconds: number; } | null | undefined): string => {
    if (!dateVal) return '-';
    if (typeof dateVal === 'string') {
      return new Date(dateVal).toLocaleString('id-ID');
    }
    if (dateVal instanceof Date) {
      return dateVal.toLocaleString('id-ID');
    }
    if (typeof dateVal === 'object' && 'seconds' in dateVal) {
      return new Date((dateVal as { seconds: number }).seconds * 1000).toLocaleString('id-ID');
    }
    return String(dateVal);
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const nameA = getUserDisplayName(a).toLowerCase();
    const nameB = getUserDisplayName(b).toLowerCase();
    return nameA.localeCompare(nameB, 'id');
  });

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const paginatedUsers = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const paginatedPreUsers = filteredPreUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPrePages = Math.ceil(filteredPreUsers.length / itemsPerPage);

  // Delete confirm states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleInitiateDelete = (user: UserData) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    const id = userToDelete.id;
    try {
      await deleteDoc(doc(db, 'users', id));
      // Also delete wallet document if it exists to keep database clean
      try {
        await deleteDoc(doc(db, 'wallets', id));
      } catch (walletErr) {
        console.warn("Wallet document delete skipped:", walletErr);
      }
      try {
        alert("User berhasil dihapus.");
      } catch (e) {
        console.log("Alert blocked, user deleted successfully state:", e);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
      try {
        alert("Gagal menghapus user.");
      } catch (e) {
        console.log("Alert blocked:", e);
      }
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleInitiateBulkDelete = () => {
    setShowBulkDeleteConfirm(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    setIsBulkDeleting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const id of selectedUserIds) {
        try {
          await deleteDoc(doc(db, 'users', id));
          try {
            await deleteDoc(doc(db, 'wallets', id));
          } catch {
            // ignore wallet delete errors
          }
          successCount++;
        } catch (err) {
          console.error(`Gagal menghapus user ${id}:`, err);
          failCount++;
        }
      }
      alert(`Selesai menghapus user. Berhasil: ${successCount}, Gagal: ${failCount}`);
      setSelectedUserIds([]);
    } catch (error) {
      console.error("Error during bulk delete:", error);
      alert("Terjadi kesalahan saat menghapus beberapa user.");
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setNamaLengkap('');
    setEmail('');
    setRoleOption('jamaah');
    setPhone('');
    setAddress('');
    setStatus('active');
    setBrandName('');
    setPasswordAwal('');
    setKota('');
    setSubRole('');
    setJenisMitra('');
    setShowModal(true);
  };

  const handleOpenEditModal = (user: UserData) => {
    setEditingUser(user);
    setNamaLengkap(user.namaLengkap || user.mitraName || '');
    setEmail(user.email || '');
    setRoleOption((user.role as UserRole) || 'jamaah');
    setPhone(user.phone || '');
    setAddress(user.address || '');
    setStatus(user.status || 'active');
    setBrandName(user.brandName || '');
    setPasswordAwal(user.passwordAwal || '');
    setKota(user.kota || '');
    setSubRole(user.subRole || '');
    setJenisMitra(user.jenisMitra || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !namaLengkap) {
      alert("Nama Lengkap dan Email wajib diisi");
      return;
    }

    if (roleOption === 'admin' && !isMasterAdmin) {
      alert("Hanya Master Admin yang diperbolehkan membuat atau mengubah Admin.");
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const payload: Omit<UserData, 'id'> = {
        namaLengkap: namaLengkap.trim(),
        name: namaLengkap.trim(), // Dual support
        email: trimmedEmail,
        role: roleOption,
        phone: phone.trim(),
        address: address.trim(),
        status,
        brandName: (roleOption === 'mitra' || roleOption === 'vendor') ? brandName.trim() : '',
        namaVendor: roleOption === 'vendor' ? brandName.trim() : '',
        passwordAwal: passwordAwal.trim(),
        kota: roleOption === 'mitra' ? kota.trim() : '',
        subRole: (roleOption === 'admin' || roleOption === 'vendor') ? subRole : '',
        jenisMitra: roleOption === 'mitra' ? jenisMitra : '',
        updatedAt: new Date().toISOString()
      };

      if (editingUser) {
        // Edit existing user
        await setDoc(doc(db, 'users', editingUser.id), {
          ...editingUser,
          ...payload
        });
        alert("User berhasil diperbarui!");
      } else {
        // Find if user already exists in either users or pre_users
        const qUsers = query(collection(db, 'users'), where('email', '==', trimmedEmail));
        const usersSnap = await getDocs(qUsers);
        
        const qPre = query(collection(db, 'pre_users'), where('email', '==', trimmedEmail));
        const preSnap = await getDocs(qPre);
        
        if (!usersSnap.empty || !preSnap.empty) {
          alert(`Email ${trimmedEmail} sudah terdaftar di database!`);
          setIsSubmitting(false);
          return;
        }

        // Add brand new user to pre_users with status pending
        const newDocRef = doc(collection(db, 'pre_users'));
        await setDoc(newDocRef, {
          id: newDocRef.id,
          createdAt: new Date().toISOString(),
          ...payload,
          status: 'pending' // Force status to pending
        });
        
        alert("User baru berhasil ditambahkan ke antrean aktivasi!");
      }
      setShowModal(false);
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Terjadi kesalahan saat menyimpan user. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4 text-rose-600" />;
      case 'mitra': return <Users className="w-4 h-4 text-blue-600" />;
      case 'jamaah': return <User className="w-4 h-4 text-emerald-600" />;
      case 'vendor': return <Building2 className="w-4 h-4 text-amber-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-rose-50 text-rose-700 ring-rose-600/20';
      case 'mitra': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'jamaah': return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
      case 'vendor': return 'bg-amber-50 text-amber-700 ring-amber-600/20';
      default: return 'bg-gray-50 text-gray-700 ring-gray-600/20';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gray-900 rounded-2xl shadow-lg border border-gray-800">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Database User</h1>
            <p className="text-sm text-gray-500 font-medium font-sans">Manajemen data pengguna platform Umaroh.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all w-full sm:w-64"
            />
          </div>
          {isMasterAdmin && (
            <button
              onClick={handleSyncDatabase}
              disabled={isSyncing}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold active:scale-[0.98] transition-all whitespace-nowrap ${
                isSyncing 
                  ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' 
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Menyinkronkan...' : 'Sinkronisasi Akun'}
            </button>
          )}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-600/10 hover:shadow-lg hover:shadow-amber-600/20 active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Tambah User
          </button>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-2xl mb-8 w-full sm:w-fit overflow-x-auto no-scrollbar gap-1">
        {((isMasterAdmin ? ['admin', 'mitra', 'jamaah', 'vendor'] : ['mitra', 'jamaah', 'vendor']) as UserRole[]).map((role) => (
          <button
            key={role}
            onClick={() => {
              setShowAuditView(false);
              setActiveRole(role);
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              !showAuditView && activeRole === role 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {getRoleIcon(role)}
            {role.charAt(0).toUpperCase() + role.slice(1)} ({users.filter(u => u.role === role).length})
          </button>
        ))}
        <button
          onClick={() => setShowAuditView(true)}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            showAuditView 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-600" />
          Antrean & Audit ({preUsers.length})
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mb-4"></div>
          <p className="text-gray-500 font-medium">Sedang memuat data...</p>
        </div>
      ) : showAuditView ? (
        <>
          {/* Audit View for pre_users */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Daftar Antrean Aktivasi (pre_users)</h2>
              <p className="text-xs text-gray-500 mt-0.5">Semua akun yang didaftarkan admin sebelum login pertama kali</p>
            </div>
            <div className="text-xs font-bold text-gray-500">
              Total {filteredPreUsers.length} akun dalam antrean
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedPreUsers.map((pUser) => (
              <div key={pUser.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold shrink-0">
                        {pUser.namaLengkap?.charAt(0).toUpperCase() || 'P'}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 truncate max-w-[150px]" title={pUser.brandName || pUser.namaLengkap || 'Tanpa Nama'}>
                          {pUser.role === 'mitra' && pUser.brandName ? pUser.brandName : (pUser.namaLengkap || 'Tanpa Nama')}
                        </h3>
                        {pUser.role === 'mitra' && pUser.brandName && (
                          <p className="text-[10px] text-gray-500 font-semibold truncate max-w-[150px] mb-1">
                            PIC: pUser.namaLengkap
                          </p>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ring-1 ${getRoleBadgeColor(pUser.role)}`}>
                          {pUser.role}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[9px] font-bold uppercase ${
                        pUser.status === 'activated'
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300'
                          : 'bg-amber-50 text-amber-700 ring-1 ring-amber-300'
                      }`}>
                        {pUser.status === 'activated' ? 'Activated' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-3 text-gray-500">
                      <Mail size={13} className="shrink-0" />
                      <span className="text-xs font-medium truncate">{pUser.email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500">
                      <Phone size={13} className="shrink-0" />
                      <span className="text-xs font-medium">{pUser.phone || '-'}</span>
                    </div>
                    {pUser.passwordAwal && (
                      <div className="flex items-center gap-3 text-amber-700/80 bg-amber-50 px-2 py-1 rounded-lg w-fit">
                        <span className="text-[9px] bg-amber-600/10 text-amber-800 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Pass Awal</span>
                        <span className="text-xs font-mono font-bold tracking-wider">{pUser.passwordAwal}</span>
                      </div>
                    )}
                    
                    <div className="text-[11px] text-gray-400 font-medium space-y-1 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <div>Diinput: {formatUserDate(pUser.createdAt)}</div>
                      {pUser.status === 'activated' && (
                        <>
                          <div className="text-emerald-700 font-semibold">Aktif: {formatUserDate(pUser.activatedAt)}</div>
                          <div className="truncate">By UID: {pUser.activatedByUid || '-'}</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredPreUsers.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-gray-200">
                <FileText className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-gray-400 font-medium">Tidak ada data antrean yang ditemukan.</p>
              </div>
            )}
          </div>

          {/* Pagination Controls for pre_users */}
          {totalPrePages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 font-medium">
                Menampilkan <span className="font-bold text-gray-900">{Math.min(filteredPreUsers.length, (currentPage - 1) * itemsPerPage + 1)}</span> -{" "}
                <span className="font-bold text-gray-900">{Math.min(filteredPreUsers.length, currentPage * itemsPerPage)}</span> dari{" "}
                <span className="font-bold text-gray-900">{filteredPreUsers.length}</span> antrean
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:hover:bg-white border border-gray-200 rounded-xl transition-all duration-200"
                >
                  <ChevronLeft size={16} />
                </button>
                
                {Array.from({ length: totalPrePages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[36px] h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all duration-200 ${
                      currentPage === page
                        ? "bg-amber-600 text-white shadow-md shadow-amber-600/10"
                        : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPrePages, prev + 1))}
                  disabled={currentPage === totalPrePages}
                  className="p-2 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:hover:bg-white border border-gray-200 rounded-xl transition-all duration-200"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Bar Seleksi & Hapus Masal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={sortedUsers.length > 0 && selectedUserIds.length === sortedUsers.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedUserIds(sortedUsers.map(u => u.id));
                  } else {
                    setSelectedUserIds([]);
                  }
                }}
                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer"
                id="select-all-users"
              />
              <label htmlFor="select-all-users" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                Pilih Semua ({sortedUsers.length} user dalam tab ini)
              </label>
            </div>
            
            {selectedUserIds.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500">
                  {selectedUserIds.length} user terpilih
                </span>
                <button
                  type="button"
                  onClick={handleInitiateBulkDelete}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
                >
                  <Trash2 size={14} />
                  Hapus Semua Terpilih
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUserIds(prev => [...prev, user.id]);
                          } else {
                            setSelectedUserIds(prev => prev.filter(id => id !== user.id));
                          }
                        }}
                        className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer shrink-0"
                      />
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.namaLengkap} className="w-12 h-12 rounded-xl object-cover ring-2 ring-gray-50" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300">
                          <User size={24} />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-gray-900 truncate max-w-[150px]" title={user.brandName || user.namaLengkap || user.mitraName || 'Tanpa Nama'}>
                          {(user.role === 'mitra' || user.role === 'vendor') && user.brandName ? user.brandName : (user.namaLengkap || user.mitraName || 'Tanpa Nama')}
                        </h3>
                        {(user.role === 'mitra' || user.role === 'vendor') && user.brandName && (
                          <p className="text-[10px] text-gray-500 font-semibold truncate max-w-[150px] mb-1">
                            PIC: {user.namaLengkap || user.mitraName || 'Tanpa Nama'}
                          </p>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ring-1 ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                        {user.role === 'mitra' && user.jenisMitra && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-black uppercase tracking-wider">
                              {user.jenisMitra}
                            </span>
                          </div>
                        )}
                        {user.role === 'vendor' && user.subRole && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-black uppercase tracking-wider">
                              {user.subRole === 'vendor_maskapai' ? 'VENDOR MASKAPAI' : 'VENDOR HOTEL'}
                            </span>
                          </div>
                        )}
                        {user.role === 'admin' && user.subRole && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-black uppercase tracking-wider">
                              {user.subRole === 'mitra_dev' 
                                ? 'MITRA DEV' 
                                : user.subRole === 'tour_leader'
                                  ? 'TOUR LEADER (BAGASI)'
                                  : user.subRole === 'petugas_bandara'
                                    ? 'PETUGAS BANDARA (BAGASI)'
                                    : user.subRole}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <button 
                        onClick={() => handleOpenEditModal(user)}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 rounded-xl transition-all duration-200 flex items-center justify-center"
                        title="Edit Pengguna"
                        id={`edit-user-btn-${user.id}`}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button 
                        onClick={() => handleInitiateDelete(user)}
                        className="p-2 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all duration-200 border border-rose-100/50 flex items-center justify-center shadow-sm"
                        title="Hapus Pengguna"
                        id={`delete-user-btn-${user.id}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-3 text-gray-500">
                      <Mail size={14} className="shrink-0" />
                      <span className="text-xs font-medium truncate">{user.email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500">
                      <Phone size={14} className="shrink-0" />
                      <span className="text-xs font-medium">{user.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500">
                      <MapPin size={14} className="shrink-0" />
                      <span className="text-xs font-medium truncate">{user.address || '-'}</span>
                    </div>
                    {user.role === 'mitra' && user.kota && (
                      <div className="flex items-center gap-3 text-amber-700 font-semibold bg-amber-500/5 px-2 py-1 rounded-lg w-fit">
                        <Building2 size={13} className="shrink-0 text-amber-600" />
                        <span className="text-[10px] uppercase tracking-wider">{user.kota}</span>
                      </div>
                    )}
                    {user.passwordAwal && (
                      <div className="flex items-center gap-3 text-amber-700/80 bg-amber-50 px-2 py-1 rounded-lg w-fit">
                        <span className="text-[9px] bg-amber-600/10 text-amber-800 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Pass Awal</span>
                        <span className="text-xs font-mono font-bold tracking-wider">{user.passwordAwal}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${user.status === 'inactive' ? 'bg-gray-400' : 'bg-emerald-500 animate-pulse'}`}></div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      {user.status === 'inactive' ? 'Nonaktif' : 'Aktif'}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleOpenEditModal(user)}
                    className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-widest"
                  >
                    Edit Profil
                  </button>
                </div>
              </div>
            ))}

            {sortedUsers.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-gray-200">
                <Users className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-gray-400 font-medium">Tidak ada data user yang ditemukan.</p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 font-medium">
                Menampilkan <span className="font-bold text-gray-900">{Math.min(sortedUsers.length, (currentPage - 1) * itemsPerPage + 1)}</span> -{" "}
                <span className="font-bold text-gray-900">{Math.min(sortedUsers.length, currentPage * itemsPerPage)}</span> dari{" "}
                <span className="font-bold text-gray-900">{sortedUsers.length}</span> user
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:hover:bg-white border border-gray-200 rounded-xl transition-all duration-200"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  const isNear = Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;
                  const isEllipsis = Math.abs(page - currentPage) === 2 && page !== 1 && page !== totalPages;

                  if (isNear) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[36px] h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all duration-200 ${
                          currentPage === page
                            ? "bg-amber-600 text-white shadow-md shadow-amber-600/10"
                            : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (isEllipsis) {
                    return (
                      <span key={page} className="text-gray-400 text-xs font-bold px-1 select-none">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:hover:bg-white border border-gray-200 rounded-xl transition-all duration-200"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl relative w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {editingUser ? 'Perbarui data user yang telah terdaftar.' : 'Masukkan data email yang akan disinkronasikan.'}
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  placeholder="Nama lengkap sesuai identitas"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh@gmail.com"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-gray-800"
                />
                <p className="text-[10px] text-gray-400 mt-1 font-sans">
                  *Penting: Masukkan email yang benar agar akun tersinkronisasi otomatis saat login menggunakan Google atau pendaftaran baru.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Role / Hak Akses</label>
                  <select
                    value={roleOption}
                    onChange={(e) => {
                      const sel = e.target.value as UserRole;
                      setRoleOption(sel);
                      if (sel === 'vendor') setSubRole('vendor_maskapai');
                    }}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-gray-800"
                  >
                    {isMasterAdmin && <option value="admin">Admin</option>}
                    <option value="mitra">Mitra</option>
                    <option value="jamaah">Jamaah</option>
                    <option value="vendor">Vendor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Status Akun</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-gray-800"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>

              {roleOption === 'vendor' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-200/50 p-4 rounded-2xl transition-all duration-200">
                  <div>
                    <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1.5">Tipe Vendor</label>
                    <select
                      value={subRole}
                      onChange={(e) => setSubRole(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-gray-800"
                    >
                      <option value="vendor_maskapai">VENDOR MASKAPAI (AIRLINE)</option>
                      <option value="vendor_hotel">VENDOR HOTEL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1.5">Nama Vendor Resmi</label>
                    <input
                      type="text"
                      required
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Contoh: OMAN AIR / Alharmain"
                      className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-gray-850"
                    />
                  </div>
                  <p className="sm:col-span-2 text-[10px] text-amber-800/80 font-sans mt-1">
                    *Penting: Nama Vendor Resmi harus sesuai dengan isian nama vendor di maskapai/hotel agar datanya sinkron.
                  </p>
                </div>
              )}

              {roleOption === 'admin' && (
                <div className="animate-in slide-in-from-top-2 duration-200 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-200/50 p-4 rounded-2xl transition-all duration-200">
                  <label className="block text-xs font-black text-amber-900 uppercase tracking-wider mb-1.5">Sub-Role / Pembatasan Modul Menu</label>
                  <select
                    value={subRole}
                    onChange={(e) => setSubRole(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-black text-amber-900"
                  >
                    <option value="">FULL ACCESS (SEMUA MENU)</option>
                    <option value="mitra_dev">1. MITRA DEVELOPMENT ONLY</option>
                    <option value="operasional">2. OPERASIONAL ONLY</option>
                    <option value="finance">3. FINANCE ONLY</option>
                    <option value="marketing">4. DIGITAL MARKETING ONLY</option>
                    <option value="tour_leader">5. TOUR LEADER ONLY (BAGASI)</option>
                    <option value="petugas_bandara">6. PETUGAS BANDARA ONLY (BAGASI)</option>
                  </select>
                  <p className="text-[10px] text-amber-800/80 mt-1.5 font-semibold font-sans">
                    *Membatasi dashboard agar admin ini hanya dapat mengakses kategori menu yang ditentukan.
                  </p>
                </div>
              )}

              {roleOption === 'mitra' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                  <div>
                    <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5">Nama Brand Mitra / Travel</label>
                    <input
                      type="text"
                      required
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Contoh: Travel Umaroh Berkah"
                      className="w-full px-4 py-2.5 bg-amber-50/50 border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5">Kota Kantor Mitra</label>
                    <input
                      type="text"
                      required
                      value={kota}
                      onChange={(e) => setKota(e.target.value)}
                      placeholder="Contoh: Jakarta"
                      className="w-full px-4 py-2.5 bg-amber-50/50 border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-gray-800"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5">Jenis Mitra</label>
                    <select
                      value={jenisMitra}
                      onChange={(e) => setJenisMitra(e.target.value)}
                      className="w-full px-4 py-2.5 bg-amber-50/50 border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-gray-800"
                    >
                      <option value="">-- PILIH JENIS MITRA --</option>
                      <option value="MITRA UTAMA">MITRA UTAMA</option>
                      <option value="MITRA CABANG">MITRA CABANG</option>
                      <option value="MITRA MANDIRI">MITRA MANDIRI</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Password Awal</label>
                <input
                  type="text"
                  value={passwordAwal}
                  onChange={(e) => setPasswordAwal(e.target.value)}
                  placeholder="Atur password awal untuk login"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Nomor Telepon / WA</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Alamat Tinggal</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat lengkap..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-gray-800 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-white">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-600/10 hover:shadow-lg hover:shadow-amber-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Simpan User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Custom Delete Confirmation Modal to avoid sandbox iframe limitations */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          ></div>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full relative z-10 shadow-2xl border border-gray-100 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0 shadow-sm">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 mb-1">Hapus Pengguna</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Apakah Anda yakin ingin menghapus user <span className="font-bold text-gray-800">{userToDelete.namaLengkap || userToDelete.mitraName || 'Tanpa Nama'}</span> ({userToDelete.email})? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-50">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-rose-600/15"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Custom Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && selectedUserIds.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => !isBulkDeleting && setShowBulkDeleteConfirm(false)}
          ></div>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full relative z-10 shadow-2xl border border-gray-100 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0 shadow-sm">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 mb-1">Hapus Banyak Pengguna</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Apakah Anda yakin ingin menghapus <span className="font-bold text-rose-600">{selectedUserIds.length}</span> pengguna terpilih? Tindakan ini akan menghapus semua profil Firestore dan wallet terkait secara permanen dan tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-50">
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-rose-600/15"
              >
                {isBulkDeleting ? 'Menghapus...' : 'Ya, Hapus Semua'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Custom Sync Confirmation Modal */}
      {showSyncConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowSyncConfirm(false)}
          ></div>
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full relative z-10 shadow-2xl border border-gray-100 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 shadow-sm">
                <RefreshCw size={22} className={isSyncing ? "animate-spin" : ""} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-gray-900 mb-1">Sinkronisasi Akun Pengguna</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Pulihkan profil pengguna di Firestore agar muncul kembali di sistem dengan mencocokkannya ke database pendaftaran dan pemesanan.
                </p>
              </div>
            </div>

            {/* Tab Header */}
            <div className="flex border-b border-gray-100 bg-gray-50 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSyncTab('auto')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  syncTab === 'auto'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Otomatis (API Server)
              </button>
              <button
                type="button"
                onClick={() => setSyncTab('manual')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  syncTab === 'manual'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Salin-Tempel Manual (Tanpa API)
              </button>
            </div>

            {/* Tab Contents */}
            {syncTab === 'auto' ? (
              <div className="space-y-4 text-xs">
                <p className="text-gray-600 leading-relaxed">
                  Sistem akan otomatis menghubungi backend untuk mengunduh daftar pengguna terdaftar dari Firebase Authentication, lalu merekonstruksi profil Firestore mereka.
                </p>
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl text-blue-800 space-y-1">
                  <p className="font-bold">⚠️ Persyaratan API Google Cloud:</p>
                  <p className="leading-relaxed">
                    Fitur otomatis membutuhkan API <strong>Identity Toolkit</strong> diaktifkan di Google Cloud Console. Jika Anda melihat error 403, Anda hanya perlu mengaktifkannya sekali saja di konsol.
                  </p>
                </div>
                
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={() => setShowSyncConfirm(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={runActualSync}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-amber-600/15"
                  >
                    Mulai Sinkronisasi
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-2xl space-y-2">
                  <p className="font-bold text-amber-900">Cara Menggunakan Salin-Tempel Manual:</p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-gray-700">
                    <li>Buka halaman <strong>Firebase Console</strong> bagian <strong>Authentication &gt; Users</strong>.</li>
                    <li>Blok dan salin (Copy) tabel pengguna yang berisi kolom <strong>Email</strong> dan <strong>User UID</strong>.</li>
                    <li>Tempelkan (Paste) hasil salinan di kotak teks di bawah ini.</li>
                  </ol>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tempel Data Pengguna dari Firebase:</label>
                  <textarea
                    rows={5}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Contoh format:&#10;user@example.com&#10;O7916ujLBSNyVTFqiJQCFoqIhlq2&#10;...atau tempel tabel mentah langsung dari browser."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none bg-gray-50/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Role Default (Jika Tidak Dikenali):</label>
                    <select
                      value={defaultImportRole}
                      onChange={(e) => setDefaultImportRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                    >
                      <option value="jamaah">Jamaah (Default)</option>
                      <option value="mitra">Mitra</option>
                      <option value="vendor">Vendor</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <p className="text-[10px] text-gray-400 leading-tight">
                      Sistem akan otomatis menetapkan role <strong>Mitra</strong> jika email mengandung kata &apos;mitra&apos;, atau jika ditemukan data pendaftaran yang valid.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={() => setShowSyncConfirm(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={runManualSync}
                    disabled={!pastedText.trim()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-amber-600/15 disabled:opacity-40"
                  >
                    Proses Salin-Tempel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modern Custom Sync Result Modal */}
      {syncResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setSyncResult(null)}
          ></div>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full relative z-10 shadow-2xl border border-gray-100 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col items-center text-center gap-3">
              {syncResult.success ? (
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                  <CheckCircle2 size={36} />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-sm">
                  <X size={36} />
                </div>
              )}
              
              <div className="w-full">
                <h3 className="text-lg font-black text-gray-900">
                  {syncResult.success ? 'Sinkronisasi Selesai!' : 'API Google Cloud Belum Aktif'}
                </h3>
                {syncResult.success ? (
                  <div className="text-xs text-gray-500 mt-2 space-y-1.5 leading-relaxed w-full">
                    <p>Proses pemulihan akun berhasil dijalankan:</p>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-left space-y-1 font-semibold text-slate-700 mt-2 w-full">
                      <p className="flex justify-between gap-4"><span>Mitra Dipulihkan:</span> <span className="text-amber-600">{syncResult.restoredMitra}</span></p>
                      <p className="flex justify-between gap-4"><span>Jamaah Dipulihkan:</span> <span className="text-amber-600">{syncResult.restoredJamaah}</span></p>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 mt-2 text-left space-y-3 w-full">
                    {syncResult.apiNotEnabled ? (
                      <>
                        <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-2xl leading-relaxed space-y-1">
                          <p className="font-bold">Penyebab Error (Status 403):</p>
                          <p className="text-[11px]">
                            API <strong>Identity Toolkit</strong> belum diaktifkan pada project Google Cloud Console Anda (Project ID: <code>77249463513</code>). Hal ini menyebabkan server tidak dapat mengambil daftar email dari Firebase Authentication.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <p className="font-bold text-gray-800">Solusi 1: Aktifkan API (Direkomendasikan - Hanya 1 Klik!):</p>
                          <p className="text-[11px] text-gray-600 leading-relaxed">
                            Buka tautan di bawah ini di browser Anda, pastikan Anda menggunakan akun Google pemilik project ini, lalu klik tombol <strong>&quot;ENABLE&quot; / &quot;AKTIFKAN&quot;</strong>:
                          </p>
                          <a 
                            href="https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=77249463513"
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-600/10 text-center"
                          >
                            Buka Link Aktifkan API GCP
                          </a>
                        </div>

                        <div className="border-t border-gray-100 pt-3">
                          <p className="font-bold text-gray-800 mb-1.5">Solusi 2: Gunakan Salin-Tempel (Instan & Tanpa API):</p>
                          <p className="text-[11px] text-gray-600 mb-2 leading-relaxed">
                            Jika Anda tidak ingin mengaktifkan API, klik tombol di bawah ini untuk beralih ke tab <strong>Salin-Tempel Manual</strong>. Anda cukup menyalin daftar pengguna langsung dari Firebase Authentication console.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSyncResult(null);
                              setSyncTab('manual');
                              setShowSyncConfirm(true);
                            }}
                            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all border border-gray-200"
                          >
                            Beralih ke Salin-Tempel Manual
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-2xl leading-relaxed">
                        <p className="font-bold">Detail Kesalahan:</p>
                        <p className="font-mono text-[10px] mt-1 break-all bg-white/50 p-2 rounded-lg border border-rose-200/50">
                          {syncResult.error || 'Terjadi kesalahan tidak dikenal saat sinkronisasi.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-center pt-2 border-t border-gray-50 gap-2">
              <button
                type="button"
                onClick={() => setSyncResult(null)}
                className="w-full py-2.5 bg-gray-950 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-gray-950/10"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
