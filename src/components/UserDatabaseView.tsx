import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, doc, deleteDoc } from '../firebase';
import { Users, Shield, User, Search, Edit2, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

type UserRole = 'admin' | 'mitra' | 'jamaah';

interface UserData {
  id: string;
  namaLengkap?: string;
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
}

export const UserDatabaseView: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [activeRole, setActiveRole] = useState<UserRole>('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

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
       user.phone?.includes(searchQuery));
    return roleMatch && searchMatch;
  });

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus user ini?')) {
      try {
        await deleteDoc(doc(db, 'users', id));
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("Gagal menghapus user.");
      }
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
            <p className="text-sm text-gray-500 font-medium">Manajemen data pengguna platform Umaroh.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-2xl mb-8 w-full sm:w-fit overflow-x-auto no-scrollbar">
        {(['admin', 'mitra', 'jamaah'] as UserRole[]).map((role) => (
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
                      <h3 className="font-bold text-gray-900 truncate max-w-[150px]">
                        {user.namaLengkap || user.mitraName || 'Tanpa Nama'}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ring-1 ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
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
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${user.status === 'inactive' ? 'bg-gray-400' : 'bg-emerald-500 animate-pulse'}`}></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    {user.status === 'inactive' ? 'Nonaktif' : 'Aktif'}
                  </span>
                </div>
                <button className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-widest">
                  Detail Profil
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
    </div>
  );
};
