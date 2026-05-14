import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, LogOut, Camera, Globe, MapPin } from 'lucide-react';
import { auth, db, doc, getDoc } from '../firebase';
import { signOut } from 'firebase/auth';

interface UserData {
  namaLengkap?: string;
  email?: string;
  role?: string;
  photoURL?: string;
  phone?: string;
  address?: string;
  mitraName?: string;
}

export const ProfileView = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        } else {
          setUserData({
            email: user.email || '',
            namaLengkap: user.displayName || 'User',
            role: 'User'
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const roleDisplay = userData?.role === 'mitra' ? 'Mitra Travel' : userData?.role === 'jamaah' ? 'Jamaah' : 'User';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="h-32 bg-gradient-to-r from-emerald-600 to-blue-600 relative">
          <div className="absolute -bottom-12 left-8 p-1 bg-white rounded-2xl shadow-lg border border-gray-100">
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt="Profile" className="w-24 h-24 rounded-xl object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300">
                <User size={48} />
              </div>
            )}
            <button className="absolute bottom-1 right-1 p-1.5 bg-white rounded-lg shadow-md border border-gray-100 text-gray-500 hover:text-emerald-600 transition-colors">
              <Camera size={16} />
            </button>
          </div>
        </div>
        
        <div className="pt-16 pb-8 px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-1">
                {userData?.namaLengkap || userData?.mitraName || 'User'}
              </h1>
              <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                <Shield className="w-4 h-4 text-emerald-500" />
                {roleDisplay}
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="px-6 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
            >
              <LogOut size={16} />
              Keluar Akun
            </button>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
              Informasi Pribadi
            </h2>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</p>
                  <p className="text-gray-900 font-medium">{userData?.email || user?.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                  <Globe size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No. Telepon</p>
                  <p className="text-gray-900 font-medium">{userData?.phone || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Alamat</p>
                  <p className="text-gray-900 font-medium">{userData?.address || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-lg font-black text-gray-900 mb-4 ">Status Akun</h2>
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-emerald-800 font-bold text-sm">Aktif</p>
              </div>
              <p className="text-emerald-600/70 text-xs leading-relaxed">
                Akun Anda telah terverifikasi dan aktif digunakan untuk semua fitur platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
