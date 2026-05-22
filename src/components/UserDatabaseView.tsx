import React, { useState, useEffect } from 'react';
import { db, auth, collection, onSnapshot, doc, deleteDoc, handleFirestoreError, OperationType, setDoc, getDocs, query, where } from '../firebase';
import { Users, Shield, User, Search, Edit2, Trash2, Mail, Phone, MapPin, Plus, X, CheckCircle2, Building2 } from 'lucide-react';

type UserRole = 'admin' | 'mitra' | 'jamaah';

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
  passwordAwal?: string;
  updatedAt?: string;
  kota?: string;
  subRole?: string;
  jenisMitra?: string;
}

export const UserDatabaseView: React.FC = () => {
  const currentUserEmail = auth.currentUser?.email || '';
  const isMasterAdmin = currentUserEmail === 'operationalumaroh@gmail.com' || currentUserEmail === 'afadsa76@gmail.com';

  const [users, setUsers] = useState<UserData[]>([]);
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

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
      setUsers(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
      setLoading(false);
    });

    return () => unsubscribe();
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
        brandName: roleOption === 'mitra' ? brandName.trim() : '',
        passwordAwal: passwordAwal.trim(),
        kota: roleOption === 'mitra' ? kota.trim() : '',
        subRole: roleOption === 'admin' ? subRole : '',
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
        // Find if user already exists
        const q = query(collection(db, 'users'), where('email', '==', trimmedEmail));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          alert(`Email ${trimmedEmail} sudah terdaftar di database!`);
          setIsSubmitting(false);
          return;
        }

        // Add brand new user
        const newDocRef = doc(collection(db, 'users'));
        await setDoc(newDocRef, {
          id: newDocRef.id,
          createdAt: new Date().toISOString(),
          ...payload
        });
        
        // If Role is Mitra, make sure they have a wallet too
        if (roleOption === 'mitra') {
          await setDoc(doc(db, 'wallets', newDocRef.id), {
            userId: newDocRef.id,
            balance: 0,
            updatedAt: new Date().toISOString()
          });
        }
        
        alert("User baru berhasil ditambahkan!");
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
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-rose-50 text-rose-700 ring-rose-600/20';
      case 'mitra': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'jamaah': return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
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
      <div className="flex bg-gray-100 p-1 rounded-2xl mb-8 w-full sm:w-fit overflow-x-auto no-scrollbar">
        {((isMasterAdmin ? ['admin', 'mitra', 'jamaah'] : ['mitra', 'jamaah']) as UserRole[]).map((role) => (
          <button
            key={role}
            onClick={() => setActiveRole(role)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeRole === role 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {getRoleIcon(role)}
            {role.charAt(0).toUpperCase() + role.slice(1)} ({users.filter(u => u.role === role).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mb-4"></div>
          <p className="text-gray-500 font-medium">Sedang memuat data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <div key={user.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.namaLengkap} className="w-12 h-12 rounded-xl object-cover ring-2 ring-gray-50" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300">
                        <User size={24} />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-gray-900 truncate max-w-[150px]" title={user.brandName || user.namaLengkap || user.mitraName || 'Tanpa Nama'}>
                        {user.role === 'mitra' && user.brandName ? user.brandName : (user.namaLengkap || user.mitraName || 'Tanpa Nama')}
                      </h3>
                      {user.role === 'mitra' && user.brandName && (
                        <p className="text-[10px] text-gray-500 font-semibold truncate max-w-[150px] mb-1">
                          Owner: {user.namaLengkap || user.mitraName || 'Tanpa Nama'}
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
                      {user.role === 'admin' && user.subRole && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-black uppercase tracking-wider">
                            {user.subRole === 'mitra_dev' ? 'MITRA DEV' : user.subRole}
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

          {filteredUsers.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-gray-200">
              <Users className="w-12 h-12 text-gray-200 mb-4" />
              <p className="text-gray-400 font-medium">Tidak ada data user yang ditemukan.</p>
            </div>
          )}
        </div>
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
                    onChange={(e) => setRoleOption(e.target.value as UserRole)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-gray-800"
                  >
                    {isMasterAdmin && <option value="admin">Admin</option>}
                    <option value="mitra">Mitra</option>
                    <option value="jamaah">Jamaah</option>
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
    </div>
  );
};
