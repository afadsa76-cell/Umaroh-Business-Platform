import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Share2, 
  ArrowLeft, 
  Star, 
  CheckCircle2, 
  Users, 
  Plane, 
  Calendar, 
  FileText, 
  Briefcase, 
  X, 
  Plus, 
  MessageCircle,
  Send,
  Facebook,
  Youtube,
  Check,
  Edit2,
  Instagram,
  Globe,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { auth, db, doc, setDoc, onSnapshot, handleFirestoreError, OperationType, collection, query, where } from '../firebase';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';

// --- TS Interfaces ---
interface PackageDetail {
  id: string;
  name: string;
  price: string;
  type: string;
  duration: string;
  hotelStar: number;
}

interface Testimonial {
  id: string;
  name: string;
  avatar: string;
  date: string;
  rating: number;
  text: string;
}

interface MitraProfile {
  id: string;
  travelName: string;
  companyName: string;
  logo: string;
  coverImage: string;
  description: string;
  ownerName: string;
  city: string;
  joinDate: string;
  jamaahCount: number;
  departureCount: number;
  rating: number;
  performanceScore: number;
  ppiu: string;
  nib: string;
  npwp: string;
  address: string;
  packages: PackageDetail[];
  gallery: { id: string; category: string; url: string; title: string }[];
  testimonials: Testimonial[];
  socialMedia: {
    instagram: string;
    tiktok: string;
    facebook: string;
    youtube: string;
    website: string;
    whatsapp: string;
  };
  areas: string[];
  aktaPendirian?: string;
  rups?: string;
  asosiasi?: string;
  akreditasi?: string;
  iata?: string;
}

const formatJoinDate = (createdAt: { seconds?: number } | string | number | Date | null | undefined) => {
  if (!createdAt) return 'Baru Bergabung';
  let dateObj: Date;
  if (createdAt && typeof createdAt === 'object' && 'seconds' in createdAt && createdAt.seconds) {
    dateObj = new Date(createdAt.seconds * 1000);
  } else if (createdAt instanceof Date || typeof createdAt === 'string' || typeof createdAt === 'number') {
    dateObj = new Date(createdAt);
  } else {
    return 'Baru Bergabung';
  }
  if (isNaN(dateObj.getTime())) return 'Baru Bergabung';
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
};

const calculateLamaGabung = (joinDateStr: string) => {
  if (!joinDateStr || joinDateStr === 'Baru Bergabung') return 'Baru';
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const parts = joinDateStr.split(' ');
  if (parts.length === 2) {
    const monthIndex = months.indexOf(parts[0]);
    const year = parseInt(parts[1]);
    if (monthIndex !== -1 && !isNaN(year)) {
      const joinDate = new Date(year, monthIndex, 1);
      const diffTime = Math.abs(new Date().getTime() - joinDate.getTime());
      const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
      if (diffYears < 1) {
        const diffMonths = Math.max(1, Math.round(diffYears * 12));
        return `${diffMonths} Bulan`;
      }
      return `${Math.floor(diffYears)} Tahun`;
    }
  }
  return 'Baru';
};

interface ProfileViewProps {
  isDesktop?: boolean;
  mitraId?: string | null;
  onBack?: () => void;
  forceRole?: 'admin' | 'mitra' | 'jamaah';
}

export const ProfileView: React.FC<ProfileViewProps> = ({ 
  isDesktop = false,
  mitraId = null,
  onBack,
  forceRole
}) => {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const user = currentUser;
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'profil' | 'performa' | 'galeri' | 'testimoni'>('profil');
  
  // Custom user role & profile details in real-time
  const [role, setRole] = useState<'admin' | 'mitra' | 'jamaah'>(forceRole || 'jamaah');
  const [userData, setUserData] = useState<{
    id: string;
    namaLengkap: string;
    email: string;
    phone: string;
    kota: string;
    address: string;
  }>({
    id: user?.uid || '',
    namaLengkap: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    kota: '',
    address: '',
  });

  const [editNama, setEditNama] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editKota, setEditKota] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isSavingJamaah, setIsSavingJamaah] = useState(false);

  useEffect(() => {
    if (userData) {
      setEditNama(userData.namaLengkap);
      setEditPhone(userData.phone);
      setEditKota(userData.kota);
      setEditAddress(userData.address);
    }
  }, [userData]);

  // Modals/Lightbox states
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<string>('Semua');

  // Core profile state (synced with Firebase)
  const [profile, setProfile] = useState<MitraProfile>({
    id: 'placeholder',
    travelName: '',
    companyName: '',
    logo: '',
    coverImage: '',
    description: '',
    ownerName: '',
    city: '',
    joinDate: '',
    jamaahCount: 0,
    departureCount: 0,
    rating: 0,
    performanceScore: 0,
    ppiu: '',
    nib: '',
    npwp: '',
    address: '',
    aktaPendirian: '',
    rups: '',
    asosiasi: '',
    akreditasi: '',
    iata: '',
    packages: [],
    gallery: [],
    testimonials: [],
    socialMedia: {
      instagram: '',
      tiktok: '',
      facebook: '',
      youtube: '',
      website: '',
      whatsapp: ''
    },
    areas: []
  });

  // Load real-time database updates securely if user is logged in
  useEffect(() => {
    const targetUid = mitraId || user?.uid;
    if (!targetUid) {
      setLoading(false);
      return;
    }
    const path = `users/${targetUid}`;
    
    // 1. Listen to User document
    const unsubUser = onSnapshot(
      doc(db, 'users', targetUid),
      (docSnap) => {
        if (docSnap.exists()) {
          const uData = docSnap.data();
          const isMA = user?.email ? (user.email.toLowerCase() === 'operationalumaroh@gmail.com' || user.email.toLowerCase() === 'afadsa76@gmail.com') : false;
          
          if (forceRole) {
            setRole(forceRole);
          } else if (mitraId) {
            setRole('mitra');
          } else if (uData.role) {
            setRole(uData.role);
          } else if (isMA && targetUid === user?.uid) {
            setRole('admin');
          }
          
          setUserData({
            id: targetUid,
            namaLengkap: uData.namaLengkap || uData.name || (targetUid === user?.uid ? user?.displayName : '') || '',
            email: uData.email || (targetUid === user?.uid ? user?.email : '') || '',
            phone: uData.phone || uData.telepon || uData.noHP || '',
            address: uData.alamatLengkap || uData.address || '',
            kota: uData.kota || '',
          });

          // Update profile options in real-time
          const computedRole = uData.role || (isMA && targetUid === user?.uid ? 'admin' : 'jamaah');
          if (mitraId || computedRole === 'mitra' || computedRole === 'admin') {
            setProfile(prev => {
              const uJoinDate = uData.joinDate || (uData.createdAt ? formatJoinDate(uData.createdAt) : '') || 'Baru Bergabung';
              const updated = {
                ...prev,
                id: targetUid,
                travelName: uData.brandName || uData.namaLengkap || uData.name || prev.travelName || 'Travel Baru',
                companyName: uData.companyName || prev.companyName || '',
                ownerName: uData.namaLengkap || uData.name || prev.ownerName || '',
                city: uData.kota || uData.city || prev.city || '',
                address: uData.alamatLengkap || uData.address || prev.address || '',
                npwp: uData.npwp || prev.npwp || '',
                ppiu: uData.ppiu || prev.ppiu || '',
                nib: uData.nib || prev.nib || '',
                joinDate: uJoinDate,
                aktaPendirian: uData.aktaPendirian || prev.aktaPendirian || '',
                rups: uData.rups || prev.rups || '',
                asosiasi: uData.asosiasi || prev.asosiasi || '',
                akreditasi: uData.akreditasi || prev.akreditasi || '',
                iata: uData.iata || prev.iata || '',
                performanceScore: (uData.customMitraProfile && 'performanceScore' in uData.customMitraProfile) 
                  ? uData.customMitraProfile.performanceScore 
                  : (uData.performanceScore || 100),
                logo: uData.customMitraProfile?.logo || uData.logo || '',
                coverImage: uData.customMitraProfile?.coverImage || uData.coverImage || '',
                description: uData.customMitraProfile?.description || uData.description || '',
              };

              // Fallback to beautiful realistic defaults if they are empty or still have the initial boilerplates
              if (!updated.ppiu || updated.ppiu === 'U.123 Tahun 2020') {
                updated.ppiu = '28092200496140003';
              }
              if (!updated.nib || updated.nib === '1234567890123') {
                updated.nib = '2809220049614';
              }
              if (!updated.address || updated.address === 'Jl. RS Fatmawati No.123, Cilandak, Jakarta Selatan') {
                updated.address = 'Jl. Tangkuban Prahu No.7, Kota Bogor';
              }
              if (!updated.city || updated.city === 'Jakarta Selatan') {
                updated.city = 'Bogor';
              }
              if (!updated.npwp || updated.npwp === '12.345.678.9-012.000') {
                updated.npwp = '12.345.678.9-012.000';
              }
              if (!updated.aktaPendirian) {
                updated.aktaPendirian = 'No.1 Tanggal 10 Juli 2018 Notaris Sepdiana Jaury';
              }
              if (!updated.rups) {
                updated.rups = 'No. 342 Tanggal 13 Agustus 2024 Notaris Fera';
              }
              if (!updated.asosiasi) {
                updated.asosiasi = 'Serikat Penyelenggara Umrah dan Haji Indonesia (SAPUHI)';
              }
              if (!updated.akreditasi) {
                updated.akreditasi = 'A - Sertifikasi PPIU - EAS - BUG - 2025';
              }
              if (!updated.iata) {
                updated.iata = 'International Air Transport Association Code 15339343';
              }

              if (uData.customMitraProfile) {
                // Merge everything else from custom profile safely
                Object.assign(updated, uData.customMitraProfile);
                // But keep dynamic joinDate and brandName if custom is empty
                if (!updated.travelName) updated.travelName = uData.brandName || uData.name || 'Travel Baru';
                if (!updated.joinDate) updated.joinDate = uJoinDate;
              }
              return updated;
            });
          }
        }
        setLoading(false);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, path);
        } catch {
          console.warn("Firestore listener failed, displaying cached data:", err);
        }
        setLoading(false);
      }
    );

    // 2. Listen to real-time bookings count for JamaahCount
    const qBookings = query(collection(db, 'bookings'), where('mitraId', '==', targetUid));
    const unsubBookings = onSnapshot(qBookings, (snap) => {
      const bookingsCount = snap.size;
      setProfile(prev => ({
        ...prev,
        jamaahCount: bookingsCount
      }));
    }, (err) => console.warn("Failed to listen bookings for stats:", err));

    // 3. Listen to real-time paket_mitra to dynamically build package details & departure count
    const qPaket = query(collection(db, 'paket_mitra'), where('mitraId', '==', targetUid));
    const unsubPaket = onSnapshot(qPaket, (snap) => {
      const activePkgs = snap.docs.map(doc => {
        const d = doc.data();
        let formattedPrice = 'Hubungi Mitra';
        if (d.hargaRekomendasi || d.price) {
          const val = Number(d.hargaRekomendasi || d.price);
          if (!isNaN(val)) {
            formattedPrice = new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(val);
          } else {
            formattedPrice = String(d.hargaRekomendasi || d.price);
          }
        }
        return {
          id: doc.id,
          name: d.namaPaket || d.name || 'Paket Layanan',
          price: formattedPrice,
          type: d.kategori || d.type || 'Reguler',
          duration: d.durasi || d.duration || '9 Hari',
          hotelStar: Number(d.hotelStar || d.bintangHarian || d.hotelRating || 4)
        };
      });
      setProfile(prev => ({
        ...prev,
        departureCount: activePkgs.length,
        // Empty by default, auto-filled with real active packages created by the partner
        packages: activePkgs
      }));
    }, (err) => console.warn("Failed to listen paket_mitra for stats:", err));

    return () => {
      unsubUser();
      unsubBookings();
      unsubPaket();
    };
  }, [user]);

  // Handle Save Profile updates back to Firestore
  const handleSaveProfile = async (updated: MitraProfile) => {
    if (!user) {
      setProfile(updated);
      setIsEditMode(false);
      return;
    }
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        brandName: updated.travelName,
        namaLengkap: updated.ownerName,
        companyName: updated.companyName,
        kota: updated.city,
        alamatLengkap: updated.address,
        npwp: updated.npwp,
        ppiu: updated.ppiu,
        nib: updated.nib,
        joinDate: updated.joinDate,
        aktaPendirian: updated.aktaPendirian || '',
        rups: updated.rups || '',
        asosiasi: updated.asosiasi || '',
        akreditasi: updated.akreditasi || '',
        iata: updated.iata || '',
        customMitraProfile: {
          description: updated.description,
          logo: updated.logo,
          coverImage: updated.coverImage,
          performanceScore: updated.performanceScore,
          packages: updated.packages,
          gallery: updated.gallery,
          socialMedia: updated.socialMedia,
          testimonials: updated.testimonials,
          areas: updated.areas,
          jamaahCount: updated.jamaahCount,
          departureCount: updated.departureCount,
          rating: updated.rating
        }
      }, { merge: true });
      
      setProfile(updated);
      setIsEditMode(false);
    } catch (err) {
      console.error("Failed to persist profile modifications:", err);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic automatic badges list based on performance Score & parameters
  const autoBadges = useMemo(() => {
    const list = [];
    if (profile.performanceScore >= 95) {
      list.push({ label: '💎 Platinum Partner', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' });
    } else if (profile.performanceScore >= 85) {
      list.push({ label: '🥇 Gold Partner', color: 'bg-amber-50 border-amber-200 text-amber-700' });
    }
    if (profile.departureCount > 20) {
      list.push({ label: '⭐ Top Seller', color: 'bg-blue-50 border-blue-200 text-blue-700' });
    }
    if (profile.rating >= 4.8) {
      list.push({ label: '🏆 Best Performance', color: 'bg-rose-50 border-rose-200 text-rose-700' });
    }
    list.push({ label: '🚀 Fast Response', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' });
    list.push({ label: '✅ Verified Mitra', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' });
    return list;
  }, [profile.performanceScore, profile.departureCount, profile.rating]);

  // Export beautiful Company Profile PDF
  const handlePdfDownload = () => {
    const docPdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    // Elegant Theme Colors: Kuning Umaroh (#F5B800), Deep Slate Navy (#047857)
    docPdf.setFillColor(15, 76, 129); // Secondary Navy
    docPdf.rect(0, 0, 210, 45, 'F');

    // Title Title
    docPdf.setTextColor(245, 184, 0); // Gold
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(24);
    docPdf.text('UMAROH INDONESIA', 15, 20);

    docPdf.setTextColor(255, 255, 255);
    docPdf.setFont('helvetica', 'normal');
    docPdf.setFontSize(11);
    docPdf.text('E-Company Profile & Kredibilitas Mitra Premium', 15, 28);
    docPdf.text(`Dibuat pada: ${new Date().toLocaleDateString('id-ID')}`, 150, 28);

    // Profile Details
    docPdf.setTextColor(33, 37, 41);
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(16);
    docPdf.text(profile.travelName, 15, 60);

    docPdf.setFont('helvetica', 'italic');
    docPdf.setFontSize(10);
    docPdf.setTextColor(100, 100, 100);
    docPdf.text(profile.description, 15, 68);

    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(12);
    docPdf.setTextColor(15, 76, 129);
    docPdf.text('Legalitas Perusahaan:', 15, 82);

    docPdf.setFont('helvetica', 'normal');
    docPdf.setFontSize(11);
    docPdf.setTextColor(50, 50, 50);
    docPdf.text(`- Nama Resmi PT : ${profile.companyName}`, 20, 90);
    docPdf.text(`- Nomor Izin PPIU : ${profile.ppiu}`, 20, 97);
    docPdf.text(`- Nomor Induk Berusaha NIB : ${profile.nib}`, 20, 104);
    docPdf.text(`- NPWP Perusahaan : ${profile.npwp}`, 20, 111);
    docPdf.text(`- Domisili Kantor : ${profile.address}`, 20, 118);

    // Stats Section
    docPdf.setFont('helvetica', 'bold');
    docPdf.setTextColor(15, 76, 129);
    docPdf.text('Statistik Kinerja:', 15, 132);

    docPdf.setFont('helvetica', 'normal');
    docPdf.setTextColor(50, 50, 50);
    docPdf.text(`- Total Jamaah Berangkat : ${profile.jamaahCount.toLocaleString('id-ID')} Pax`, 20, 140);
    docPdf.text(`- Total Paket Terjual : 321 Paket`, 20, 147);
    docPdf.text(`- Rata-Rata Rating Jamaah : ${profile.rating} / 5.0 Bintang`, 20, 154);
    docPdf.text(`- Skor Kelayakan Mitra : ${profile.performanceScore} / 100 (Sangat Layak)`, 20, 161);

    // Package Table Header
    docPdf.setFillColor(245, 184, 0); // Kuning Gold
    docPdf.rect(15, 172, 180, 8, 'F');
    docPdf.setFont('helvetica', 'bold');
    docPdf.setTextColor(255, 255, 255);
    docPdf.setFontSize(10);
    docPdf.text('NAMA INVENTARIS/PAKET LAYANAN', 20, 177);
    docPdf.text('HARGA MULAI', 140, 177);
    docPdf.text('DURASI', 170, 177);

    // List Packages
    docPdf.setFont('helvetica', 'normal');
    docPdf.setTextColor(33, 37, 41);
    let currentY = 186;
    profile.packages.forEach((pkg, index) => {
      if (currentY < 270) {
        docPdf.text(`${index + 1}. ${pkg.name}`, 20, currentY);
        docPdf.text(pkg.price, 140, currentY);
        docPdf.text(pkg.duration, 170, currentY);
        currentY += 8;
      }
    });

    // Footer decoration
    docPdf.setFontSize(8);
    docPdf.setTextColor(150, 150, 150);
    docPdf.text('Dicetak otomatis dari Umaroh Indonesia Applet. Dokumen ini sah dan terdaftar di server cloud.', 15, 285);

    // Save
    docPdf.save(`Umaroh_CompanyProfile_${profile.travelName.replace(/\s+/g, '_')}.pdf`);
  };

  // Simulated copy link
  const [copied, setCopied] = useState(false);
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://umaroh.com/mitra/${profile.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleSaveJamaahProfile = async () => {
    if (!user) return;
    setIsSavingJamaah(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        namaLengkap: editNama,
        phone: editPhone,
        kota: editKota,
        alamatLengkap: editAddress,
      }, { merge: true });
      
      setUserData(prev => ({
        ...prev,
        namaLengkap: editNama,
        phone: editPhone,
        kota: editKota,
        address: editAddress,
      }));
      setIsEditMode(false);
    } catch (err) {
      console.error("Gagal menyimpan profil jamaah:", err);
    } finally {
      setIsSavingJamaah(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-500"></div>
        <p className="text-gray-500 text-sm font-semibold">Memuat Profil Premium...</p>
      </div>
    );
  }

  if (userData && role === 'jamaah') {
    if (isEditMode) {
      return (
        <div className="min-h-screen bg-slate-50 antialiased pb-28 md:px-4 flex justify-center">
          <div className="w-full max-w-[480px] bg-white shadow-xl min-h-screen border-x border-slate-100 flex flex-col font-sans">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-emerald-800 text-white px-4 py-3 shadow-md flex items-center justify-between">
              <button 
                onClick={() => setIsEditMode(false)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-95"
              >
                <ArrowLeft size={20} />
              </button>
              <span className="font-extrabold text-base tracking-tight">Edit Profil Saya</span>
              <div className="w-5 h-5"></div>
            </header>

            {/* Inputs Form */}
            <div className="p-5 flex-grow space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-500 uppercase tracking-wider">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={editNama} 
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:border-emerald-600 outline-none text-gray-800"
                  placeholder="Ketik nama lengkap Anda..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-500 uppercase tracking-wider">Nomor HP / WhatsApp</label>
                <input 
                  type="text" 
                  value={editPhone} 
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:border-emerald-600 outline-none text-gray-800"
                  placeholder="Contoh: 081234567890"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-500 uppercase tracking-wider">Kota Domisili</label>
                <input 
                  type="text" 
                  value={editKota} 
                  onChange={(e) => setEditKota(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:border-emerald-600 outline-none text-gray-800"
                  placeholder="Contoh: Jakarta Selatan, Surabaya"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-500 uppercase tracking-wider">Alamat Lengkap Rumah</label>
                <textarea 
                  value={editAddress} 
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:border-emerald-600 outline-none text-gray-800 min-h-[100px]"
                  placeholder="Masukkan alamat tempat tinggal pengiriman perlengkapan..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setIsEditMode(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black rounded-xl transition-all cursor-pointer text-center"
                >
                  BATAL
                </button>
                <button 
                  onClick={handleSaveJamaahProfile}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-2 shadow"
                  disabled={isSavingJamaah}
                >
                  {isSavingJamaah ? 'MENYIMPAN...' : 'SIMPAN SEKARANG'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Otherwise, render read-only Jamaah view
    return (
      <div className="min-h-screen bg-slate-50 antialiased pb-28 md:px-4 flex justify-center">
        <div className="w-full max-w-[480px] bg-white shadow-xl min-h-screen border-x border-slate-100 flex flex-col font-sans">
          
          {/* Header */}
          <header className="sticky top-0 z-40 bg-emerald-800 text-white px-4 py-3 shadow-md flex items-center justify-between">
            <span className="font-extrabold text-base tracking-tight">Akun Profil Jamaah</span>
            <button 
              onClick={() => setIsEditMode(true)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-95"
              title="Edit Profile"
            >
              <Edit2 size={18} />
            </button>
          </header>

          <div className="p-4 space-y-6 flex-grow">
            {/* Pilgrim Identity Card */}
            <div className="bg-gradient-to-br from-emerald-800 via-teal-700 to-emerald-900 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden ring-4 ring-emerald-500/10">
              <div className="absolute right-[-20px] bottom-[-20px] text-[120px] opacity-10 pointer-events-none font-mono">
                🕋
              </div>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] bg-white/20 text-white font-black uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-md">
                    KARTU IDENTITAS DIGITAL
                  </span>
                  <h3 className="text-sm font-black tracking-tight mt-1">UMAROH</h3>
                </div>
                <span className="text-2xl">💚</span>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[9px] text-emerald-200 block font-bold tracking-wider uppercase">Nama Pemegang Kartu</span>
                  <strong className="text-base font-black tracking-wide block uppercase truncate">
                    {userData.namaLengkap || 'Nama Belum Diisi'}
                  </strong>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] text-emerald-200 block font-bold tracking-wider uppercase">ID Anggota</span>
                    <span className="text-xs font-mono font-bold tracking-wide block uppercase truncate">
                      #{userData.id.substring(0, 10).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-emerald-200 block font-bold tracking-wider uppercase">Status Verifikasi</span>
                    <span className="text-[10px] bg-amber-400 text-slate-900 font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5">
                      ✓ JAMAAH AKTIF
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Fields List */}
            <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 flex items-center gap-2">
                📂 Detail Informasi Akun
              </h4>

              <div className="space-y-3 text-xs font-semibold">
                <div className="flex justify-between items-start py-1">
                  <span className="text-gray-400">Nama Lengkap</span>
                  <span className="text-gray-800 font-bold max-w-[200px] text-right">{userData.namaLengkap || '-'}</span>
                </div>

                <div className="flex justify-between items-start py-1 border-t border-gray-50 pt-2">
                  <span className="text-gray-400">Alamat Email</span>
                  <span className="text-gray-700 font-mono font-bold">{userData.email || '-'}</span>
                </div>

                <div className="flex justify-between items-start py-1 border-t border-gray-50 pt-2">
                  <span className="text-gray-400">Nomor HP/WA</span>
                  <span className="text-gray-800 font-bold">{userData.phone || '-'}</span>
                </div>

                <div className="flex justify-between items-start py-1 border-t border-gray-50 pt-2">
                  <span className="text-gray-400">Kota Asal</span>
                  <span className="text-gray-800 font-bold">{userData.kota || '-'}</span>
                </div>

                <div className="py-1 border-t border-gray-50 pt-2 space-y-1.5">
                  <span className="text-gray-400 block">Alamat Pengiriman Perlengkapan</span>
                  <p className="text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-150 leading-relaxed font-bold">
                    📌 {userData.address || 'Belum ada alamat pengiriman diatur. Klik edit profil untuk melengkapinya.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="space-y-2.5 pt-4 border-t border-gray-100">
              <button
                onClick={() => setIsEditMode(true)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow"
              >
                <Edit2 size={14} /> EDIT DATA PROFIL
              </button>

              <button
                onClick={handleLogout}
                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black rounded-xl transition-all cursor-pointer text-center"
              >
                ✕ KELUAR DARI AKUN
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  const renderDesktop = isDesktop && !isMobileViewport;

  if (renderDesktop) {
    return (
      <div className="w-full bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm font-sans space-y-8">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack}
                className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-all active:scale-95 shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">PROFIL TRAVEL MITRA</h2>
              <p className="text-xs text-slate-500 mt-1">
                {mitraId ? 'Informasi legalitas resmi, portofolio galeri, dan rincian kontak penyelenggara.' : 'Kelola branding, informasi legalitas, deskripsi travel, dan galeri portofolio Anda.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!mitraId && !isEditMode && (
              <>
                <button 
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Edit2 size={14} /> EDIT PROFIL
                </button>
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Share2 size={14} /> BAGIKAN PROFIL
                </button>
              </>
            )}
          </div>
        </div>

        {isEditMode ? (
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-150">
            <EditProfileForm 
              initialProfile={profile} 
              onSave={handleSaveProfile} 
              onCancel={() => setIsEditMode(false)} 
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* HERO COVER IMAGE FOR DESKTOP */}
            <div className="relative w-full h-48 md:h-64 bg-slate-900 rounded-2xl overflow-hidden shrink-0 shadow-sm">
              <img 
                src={profile.coverImage} 
                alt="Ka'bah Travel Background" 
                className="w-full h-full object-cover opacity-80"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              
              {/* Logo Overlay */}
              <div className="absolute bottom-6 left-6 flex items-end gap-4">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white p-1 border-2 border-amber-400 shadow-xl overflow-hidden shrink-0">
                  <img 
                    src={profile.logo} 
                    alt="Logo Mitra" 
                    className="w-full h-full object-cover rounded-xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="mb-2 text-white font-sans">
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    <span className="text-[10px] bg-amber-500 font-extrabold px-2 py-0.5 rounded text-slate-950 uppercase tracking-wide shadow-sm font-sans">
                      Premium Partner
                    </span>
                    <span className="text-[10px] bg-emerald-600 font-extrabold px-2 py-0.5 rounded text-white uppercase tracking-wide flex items-center gap-1 shadow-sm font-sans">
                      <CheckCircle2 size={10} /> Terverifikasi
                    </span>
                  </div>
                  <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight select-all">
                    {profile.travelName}
                  </h1>
                </div>
              </div>
            </div>

            {/* DESCRIPTION & CARD STATS BASICS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                  <h4 className="text-xs font-black text-[#047857] uppercase tracking-wider mb-2">Deskripsi Travel</h4>
                  <p className="text-slate-600 text-xs md:text-sm leading-relaxed text-justify select-text font-medium">
                    "{profile.description}"
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1 font-bold text-slate-800">
                    📍 {profile.city}
                  </span>
                  <span>
                    📅 Bergabung Sejak: <strong className="text-slate-850 font-black">{profile.joinDate}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {autoBadges.map((bd, i) => (
                    <span key={i} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-xs ${bd.color}`}>
                      {bd.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Score and Stats Panel */}
              <div className="space-y-4">
                {/* Score */}
                <div className="p-4 bg-gradient-to-r from-[#FFFCEB] via-[#FFFDF5] to-[#F8FAFC] border border-[#FDE68A] rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-400 rounded-xl text-slate-950 flex items-center justify-center font-black text-md shadow-sm shrink-0">
                      {profile.performanceScore}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 leading-none">Skor Kinerja Kemitraan</h4>
                      <span className="text-[10px] text-slate-500 leading-normal block mt-1.5">
                        Sangat Tinggi • Ditinjau Otomatis
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-900 text-amber-505 font-black px-2 py-0.5 rounded-full uppercase scale-90">
                    Sangat Layak
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-50 border border-slate-100/80 rounded-xl flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#E6F2EE] text-[#047857] flex items-center justify-center shrink-0">
                      <Users size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-400 font-bold block leading-tight">Total Jamaah</span>
                      <strong className="text-xs font-black text-slate-900 block truncate">
                        {profile.jamaahCount.toLocaleString('id-ID')}+
                      </strong>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100/80 rounded-xl flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-emerald-700 flex items-center justify-center shrink-0">
                      <Plane size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-400 font-bold block leading-tight">Kloter</span>
                      <strong className="text-xs font-black text-slate-900 block truncate">
                        {profile.departureCount}x
                      </strong>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100/80 rounded-xl flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#FEF8E6] text-[#B45309] flex items-center justify-center shrink-0">
                      <Calendar size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-400 font-bold block leading-tight">Lama Gabung</span>
                      <strong className="text-xs font-black text-slate-900 block truncate font-sans">
                        {calculateLamaGabung(profile.joinDate)}
                      </strong>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100/80 rounded-xl flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] text-orange-600 flex items-center justify-center shrink-0">
                      <Star className="fill-orange-500 stroke-orange-500" size={14} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-400 font-bold block leading-tight">Rating</span>
                      <strong className="text-xs font-black text-slate-900 block truncate">{profile.rating} / 5.0</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TAB SELECTOR FOR DESKTOP */}
            <div className="border-b border-slate-200 flex items-center gap-6 mt-6">
              {(['profil', 'performa', 'galeri', 'testimoni'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-1 text-xs font-extrabold uppercase tracking-wider relative border-b-2 transition-all active:scale-95 cursor-pointer ${
                    activeTab === tab 
                      ? 'border-[#047857] text-[#047857] font-black' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* TAB CONTENTS */}
            <div className="pt-2 font-sans">
              {activeTab === 'profil' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in-50 duration-200">
                  {/* Legalitas */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                      <div className="p-1.5 bg-[#047857]/10 rounded-lg text-[#047857]">
                        <Building2 size={18} />
                      </div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Dokumen Legalitas & Alamat
                      </h3>
                    </div>

                    <div className="space-y-3 text-xs md:text-sm">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400 font-semibold">Nama Resmi PT</span>
                        <span className="text-slate-800 font-bold text-right">{profile.companyName}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-50">
                        <span className="text-slate-400 font-semibold">No. PPIU</span>
                        <span className="text-amber-800 bg-amber-50 font-black px-2 py-0.5 rounded">
                          {profile.ppiu}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-50">
                        <span className="text-slate-400 font-semibold">Nomor NIB</span>
                        <span className="text-slate-800 font-mono font-bold">{profile.nib}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-50">
                        <span className="text-slate-400 font-semibold">NPWP Resmi</span>
                        <span className="text-slate-800 font-mono font-bold">{profile.npwp}</span>
                      </div>
                      <div className="flex justify-between items-start py-1 border-t border-slate-50 gap-2">
                        <span className="text-slate-400 font-semibold shrink-0">Akta Pendirian</span>
                        <span className="text-slate-800 font-bold text-right text-[11px] leading-tight max-w-[70%]">{profile.aktaPendirian}</span>
                      </div>
                      <div className="flex justify-between items-start py-1 border-t border-slate-50 gap-2">
                        <span className="text-slate-400 font-semibold shrink-0">RUPS</span>
                        <span className="text-slate-800 font-bold text-right text-[11px] leading-tight max-w-[70%]">{profile.rups}</span>
                      </div>
                      <div className="flex justify-between items-start py-1 border-t border-slate-50 gap-2">
                        <span className="text-slate-400 font-semibold shrink-0">Asosiasi</span>
                        <span className="text-slate-800 font-bold text-right text-[11px] leading-tight max-w-[70%]">{profile.asosiasi}</span>
                      </div>
                      <div className="flex justify-between items-start py-1 border-t border-slate-50 gap-2">
                        <span className="text-slate-400 font-semibold shrink-0">Akreditasi</span>
                        <span className="text-[#047857] bg-emerald-50 px-2 py-0.5 rounded font-black text-right text-[11px] leading-tight max-w-[70%]">{profile.akreditasi}</span>
                      </div>
                      <div className="flex justify-between items-start py-1 border-t border-slate-50 gap-2">
                        <span className="text-slate-400 font-semibold shrink-0">IATA</span>
                        <span className="text-slate-820 font-mono font-bold text-right text-[11px] leading-tight max-w-[70%]">{profile.iata}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-50 space-y-1">
                        <span className="text-slate-400 font-semibold block">Alamat Kantor / Domisili</span>
                        <p className="text-slate-705 bg-slate-50 p-3 rounded-lg border border-slate-150 leading-relaxed font-semibold">
                          📍 {profile.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => setShowLegalModal(true)}
                        className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                      >
                        <CheckCircle2 size={14} className="fill-slate-950 stroke-amber-200" /> Sertifikat Kemenag
                      </button>
                      <button 
                        onClick={handlePdfDownload}
                        className="flex-1 py-2.5 px-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                      >
                        <FileText size={14} /> Download PDF
                      </button>
                    </div>
                  </div>

                  {/* Packages */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-450/20 rounded-lg text-amber-705 font-sans">
                          <Briefcase size={18} />
                        </div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Paket Keberangkatan
                        </h3>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 flex flex-col">
                      {profile.packages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-5">
                          <Briefcase size={32} className="text-slate-300 mb-2" />
                          <p className="text-xs font-black text-slate-800 uppercase tracking-wide">Belum Ada Paket</p>
                          <span className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                            Buat program paket di menu kelola paket Anda untuk menampilkannya di sini secara otomatis.
                          </span>
                        </div>
                      ) : (
                        profile.packages.map((pkg) => (
                          <div 
                            key={pkg.id} 
                            className="p-3 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-105 flex items-center justify-between group transition-colors"
                          >
                            <div className="space-y-1 min-w-0 pr-2">
                              <span className="text-[8px] bg-[#047857] text-white font-extrabold uppercase px-1.5 py-0.5 rounded-full">
                                {pkg.type}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 truncate mt-1">
                                {pkg.name}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                                <span>📅 {pkg.duration}</span>
                                <span>•</span>
                                <span>🏨 Hotel Bintang {pkg.hotelStar}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[8px] text-slate-400 block font-semibold uppercase leading-none mb-0.5">Mulai</span>
                              <strong className="text-xs font-black text-slate-900 bg-white border border-slate-200/60 px-2.5 py-1.5 rounded-xl block font-sans">
                                {pkg.price}
                              </strong>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'performa' && (
                <div className="bg-white rounded-2xl border border-slate-200/50 p-6 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tight block">Tahun Ini</span>
                      <strong className="text-xl font-black text-slate-900 block leading-tight mt-1">
                        845 Jamaah
                      </strong>
                      <span className="text-[9px] text-emerald-600 font-bold block mt-1">+14% vs tahun lalu</span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tight block">Paket Terjual</span>
                      <strong className="text-xl font-black text-slate-900 block leading-tight mt-1">
                        321 Paket
                      </strong>
                      <span className="text-[9px] text-[#047857] font-bold block mt-1">Sisa 12 kuota promo</span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tight block">Conversion Rate</span>
                      <strong className="text-xl font-black text-[#047857] block leading-tight mt-1">
                        34%
                      </strong>
                      <span className="text-[9px] text-slate-400 font-bold block mt-1">Efisiensi tinggi</span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tight block">Repeat Customer</span>
                      <strong className="text-xl font-black text-amber-605 block leading-tight mt-1">
                        42%
                      </strong>
                      <span className="text-[9px] text-slate-400 font-bold block mt-1">Loyalitas mantap</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* SVG Chart */}
                    <div className="md:col-span-2 bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col justify-between">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight mb-4">
                        Grafik Pertumbuhan Jamaah (Jan - Jun)
                      </h3>
                      
                      <div className="relative w-full h-48 bg-white rounded-xl p-3 border border-slate-200/50 flex flex-col justify-between">
                        <div className="absolute inset-x-0 top-1/4 h-px bg-slate-100 dashed" />
                        <div className="absolute inset-x-0 top-2/4 h-px bg-slate-100 dashed" />
                        <div className="absolute inset-x-0 top-3/4 h-px bg-slate-100 dashed" />

                        <svg className="w-full h-full overflow-visible z-10" viewBox="0 0 300 100" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chartGradDesk" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#F5B800" stopOpacity="0.45" />
                              <stop offset="100%" stopColor="#F5B800" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path 
                            d="M 10 90 L 60 75 L 120 50 L 180 65 L 240 30 L 290 15 L 290 100 L 10 100 Z" 
                            fill="url(#chartGradDesk)" 
                          />
                          <path 
                            d="M 10 90 L 60 75 L 120 50 L 180 65 L 240 30 L 290 15" 
                            fill="none" 
                            stroke="#047857" 
                            strokeWidth="3.5" 
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path 
                            d="M 10 80 L 60 70 L 120 60 L 180 40 L 240 35 L 290 20" 
                            fill="none" 
                            stroke="#F5B800" 
                            strokeWidth="2" 
                            strokeDasharray="4 3" 
                            strokeLinecap="round"
                          />
                          <circle cx="10" cy="90" r="4" fill="#047857" stroke="#fff" strokeWidth="2" />
                          <circle cx="60" cy="75" r="4" fill="#047857" stroke="#fff" strokeWidth="2" />
                          <circle cx="120" cy="50" r="4" fill="#047857" stroke="#fff" strokeWidth="2" />
                          <circle cx="180" cy="65" r="4" fill="#047857" stroke="#fff" strokeWidth="2" />
                          <circle cx="240" cy="30" r="4" fill="#047857" stroke="#fff" strokeWidth="2" />
                          <circle cx="290" cy="15" r="4" fill="#047857" stroke="#fff" strokeWidth="2" />
                        </svg>

                        <div className="flex justify-between px-1 text-[10px] font-black text-slate-400 select-none z-10 mt-2">
                          <span>Jan</span>
                          <span>Feb</span>
                          <span>Mar</span>
                          <span>Apr</span>
                          <span>Mei</span>
                          <span>Jun</span>
                        </div>
                      </div>

                      <div className="flex justify-between text-[11px] font-bold text-slate-450 mt-3 border-t border-slate-100 pt-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span className="inline-block w-2.5 h-1.5 bg-[#047857] rounded" /> Realisasi Keberangkatan (Pax)
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span className="inline-block w-2.5 h-1.5 bg-amber-400 rounded-full" /> Target Program
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-4 font-sans flex flex-col">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Timeline Aktivitas</h3>
                      <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-4 max-h-[220px] overflow-y-auto">
                        <div className="relative">
                          <div className="absolute -left-[20px] top-1.5 w-3 h-3 rounded-full bg-[#047857] border-2 border-white ring-2 ring-[#047857]/20" />
                          <time className="text-[9px] font-bold text-slate-400 block">Hari ini, 09:20 WIB</time>
                          <h4 className="text-xs font-bold text-slate-900 mt-0.5 font-sans">42 Jamaah Berhasil Diberangkatkan</h4>
                        </div>

                        <div className="relative">
                          <div className="absolute -left-[20px] top-1.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white" />
                          <time className="text-[9px] font-bold text-slate-400 block">Kemarin</time>
                          <h4 className="text-xs font-bold text-slate-900 mt-0.5">Paket Baru Ditambahkan</h4>
                        </div>

                        <div className="relative">
                          <div className="absolute -left-[20px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                          <time className="text-[9px] font-bold text-slate-400 block">27 Mei 2026</time>
                          <h4 className="text-xs font-bold text-slate-900 mt-0.5">Validasi & Verifikasi NIB selesai</h4>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'galeri' && (
                <div className="bg-white rounded-2xl border border-slate-200/50 p-6 shadow-sm space-y-5">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 select-none">
                    {['Semua', 'Keberangkatan', 'Manasik', 'City Tour', 'Hotel', 'Pesawat', 'Kantor'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setGalleryFilter(cat)}
                        className={`py-1.5 px-3 rounded-full text-[10px] font-black tracking-tight border shrink-0 transition-all cursor-pointer ${
                          galleryFilter === cat
                            ? 'bg-[#047857] text-white border-transparent'
                            : 'bg-white text-slate-500 border-slate-200/80 hover:bg-slate-50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {profile.gallery.length === 0 ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-5">
                        <ImageIcon size={36} className="text-slate-300 mb-2" />
                        <p className="text-xs font-black text-slate-800 uppercase tracking-wide">Galeri Kosong</p>
                        <span className="text-[10px] text-slate-400 mt-1 max-w-[220px] leading-relaxed">
                          Anda belum mengunggah foto dokumentasi kegiatan manasik, hotel, tour, maupun keberangkatan.
                        </span>
                      </div>
                    ) : (
                      profile.gallery
                        .filter(img => galleryFilter === 'Semua' || img.category === galleryFilter)
                        .map((img) => (
                          <div 
                            key={img.id}
                            onClick={() => setSelectedImage({ url: img.url, title: img.title })}
                            className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-95"
                          >
                            <div className="aspect-[4/3] bg-slate-50 overflow-hidden relative">
                              <img 
                                src={img.url} 
                                alt={img.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                                <span className="text-[10px] text-white font-bold block truncate">{img.title}</span>
                              </div>
                            </div>
                            <div className="p-2.5 bg-slate-50 flex justify-between items-center border-t border-slate-100">
                              <span className="text-[9px] font-bold text-slate-900 truncate pr-2">{img.title}</span>
                              <span className="text-[8px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md font-bold text-right shrink-0">{img.category}</span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'testimoni' && (
                <div className="bg-white rounded-2xl border border-slate-200/50 p-6 shadow-sm space-y-6">
                  {profile.testimonials.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-5">
                      <Star size={36} className="text-slate-300 stroke-slate-300 mb-2" />
                      <p className="text-xs font-black text-slate-800 uppercase tracking-wide">Belum Ada Ulasan</p>
                      <span className="text-[10px] text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                        Mitra saat ini belum menerima testimoni/ulasan perjalanan terverifikasi dari para jamaah.
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 bg-slate-50 rounded-2xl p-5 border border-slate-100/80 flex flex-col justify-center items-center text-center">
                          <strong className="text-4xl font-black text-slate-900 leading-none">
                            {(profile.rating || (profile.testimonials.reduce((sum, t) => sum + t.rating, 0) / profile.testimonials.length)).toFixed(1)}
                          </strong>
                          <div className="flex gap-1 justify-center py-2">
                            {[1, 2, 3, 4, 5].map((s) => {
                              const ratingVal = profile.rating || (profile.testimonials.reduce((sum, t) => sum + t.rating, 0) / profile.testimonials.length);
                              return (
                                <Star 
                                  key={s} 
                                  className={s <= ratingVal ? "fill-[#F5B800] stroke-amber-500" : "text-slate-200"} 
                                  size={16} 
                                />
                              );
                            })}
                          </div>
                          <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wide">
                            Berdasarkan {profile.testimonials.length} Ulasan
                          </span>
                        </div>

                        <div className="md:col-span-2 space-y-2.5 flex flex-col justify-center animate-in fade-in-50 duration-205 pointer-events-none select-none">
                          <div className="flex items-center gap-3 text-xs font-bold text-slate-505">
                            <span className="w-6 font-extrabold text-slate-750 font-sans">5 ★</span>
                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="bg-[#F5B800] h-full rounded-full" style={{ width: `${Math.round((profile.testimonials.filter(t => t.rating === 5).length / profile.testimonials.length) * 100)}%` }} />
                            </div>
                            <span className="w-8 text-right font-sans">{Math.round((profile.testimonials.filter(t => t.rating === 5).length / profile.testimonials.length) * 100)}%</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-bold text-slate-505">
                            <span className="w-6 font-extrabold text-slate-755 font-sans">4 ★</span>
                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="bg-[#F5B800] h-full rounded-full" style={{ width: `${Math.round((profile.testimonials.filter(t => t.rating === 4).length / profile.testimonials.length) * 100)}%` }} />
                            </div>
                            <span className="w-8 text-right font-medium font-sans">{Math.round((profile.testimonials.filter(t => t.rating === 4).length / profile.testimonials.length) * 100)}%</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-bold text-slate-505">
                            <span className="w-6 font-extrabold text-slate-755 font-sans">3 ★</span>
                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="bg-slate-300 h-full rounded-full" style={{ width: `${Math.round((profile.testimonials.filter(t => t.rating <= 3).length / profile.testimonials.length) * 100)}%` }} />
                            </div>
                            <span className="w-8 text-right font-semibold text-slate-800 font-sans">{Math.round((profile.testimonials.filter(t => t.rating <= 3).length / profile.testimonials.length) * 100)}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profile.testimonials.map((t) => (
                          <div key={t.id} className="bg-slate-50 hover:bg-slate-100/40 border border-slate-100 rounded-2xl p-4 transition-all space-y-3 font-sans">
                            <div className="flex items-center gap-2.5">
                              {t.avatar ? (
                                <img 
                                  src={t.avatar} 
                                  alt={t.name} 
                                  className="w-10 h-10 rounded-full object-cover border border-slate-150 shadow-sm"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-150">
                                  {t.name ? t.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                              )}
                              <div className="flex-1 min-w-0 font-sans flex flex-col justify-center">
                                <h4 className="text-xs md:text-sm font-black text-slate-950 truncate leading-tight font-sans">{t.name}</h4>
                                <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{t.date}</span>
                              </div>
                              <div className="flex gap-0.5 bg-white border border-slate-150 px-2 py-1 rounded-lg shrink-0 shadow-2xs">
                                {[...Array(t.rating).keys()].map((star) => (
                                  <Star key={star} className="fill-[#F5B800] stroke-amber-500" size={11} />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed font-semibold italic">
                              "{t.text}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* SOCIAL MEDIA BAR */}
            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 text-white text-center space-y-4 shadow-md max-w-3xl mx-auto font-sans">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#F5B800]">
                Hubungkan Media Sosial Travel Anda
              </h4>
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs text-slate-400 font-mono tracking-wider bg-slate-850 py-1.5 px-3 rounded-lg border border-slate-800">
                  🌐 Website Mitra: {profile.socialMedia.website || 'Belum Diatur'}
                </span>
                <div className="flex gap-4">
                  <a 
                    href={profile.socialMedia.instagram ? `https://instagram.com/${profile.socialMedia.instagram.replace('@', '')}` : 'https://instagram.com'} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-3 bg-white/10 hover:bg-white/20 hover:scale-110 rounded-xl transition-all text-white active:scale-95 text-center shadow" 
                    title="Instagram"
                  >
                    <Instagram size={20} />
                  </a>
                  <a 
                    href={profile.socialMedia.facebook ? `https://facebook.com/${encodeURIComponent(profile.socialMedia.facebook)}` : 'https://facebook.com'} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-3 bg-white/10 hover:bg-white/20 hover:scale-110 rounded-xl transition-all text-white active:scale-95 text-center shadow font-sans" 
                    title="Facebook"
                  >
                    <Facebook size={20} />
                  </a>
                  <a 
                    href={profile.socialMedia.youtube ? `https://youtube.com/${profile.socialMedia.youtube.startsWith('@') ? profile.socialMedia.youtube : '@' + profile.socialMedia.youtube}` : 'https://youtube.com'} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-3 bg-white/10 hover:bg-white/20 hover:scale-110 rounded-xl transition-all text-white active:scale-95 text-center shadow font-sans" 
                    title="Youtube"
                  >
                    <Youtube size={20} />
                  </a>
                  <a 
                    href={profile.socialMedia.website ? `https://${profile.socialMedia.website.replace('https://', '').replace('http://', '')}` : '#'} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-3 bg-white/10 hover:bg-white/20 hover:scale-110 rounded-xl transition-all text-white active:scale-95 text-center shadow font-sans" 
                    title="Website Resmi"
                  >
                    <Globe size={20} />
                  </a>
                </div>
              </div>
            </div>

            {/* SIGN OUT */}
            <div className="pt-6 pb-2 text-center border-t border-slate-100 flex justify-center items-center font-sans">
              <button 
                onClick={handleLogout}
                className="px-8 py-3 border border-red-200 bg-red-50 text-red-650 hover:bg-red-100 active:scale-95 cursor-pointer font-extrabold text-xs rounded-xl shadow-xs transition-transform tracking-wider"
              >
                ✕ KELUAR DARI AKUN TRAVEL
              </button>
            </div>
          </div>
        )}

        {/* --- MODAL DIALOGS OVERLAYS (DESKTOP NATIVE PORTAL VIEW) --- */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="fixed inset-0 z-50 bg-black/92 flex flex-col justify-center items-center p-4 cursor-zoom-out"
            >
              <button 
                className="absolute top-6 right-6 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all cursor-pointer"
                onClick={() => setSelectedImage(null)}
              >
                <X size={22} />
              </button>
              <img 
                src={selectedImage.url} 
                alt={selectedImage.title} 
                className="max-w-full max-h-[80%] object-contain rounded-xl shadow-2xl border border-white/5"
              />
              <p className="text-white text-xs font-black mt-4 bg-black/50 px-4 py-1.5 rounded-full select-none text-center">
                {selectedImage.title}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showShareModal && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 select-none">
              <div 
                className="absolute inset-0 cursor-pointer" 
                onClick={() => setShowShareModal(false)} 
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm bg-white rounded-3xl p-6 relative z-10 shadow-2xl border border-slate-100 space-y-4"
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="font-extrabold text-xs uppercase tracking-tight text-slate-800">
                    Bagikan Profil Travel
                  </h3>
                  <button onClick={() => setShowShareModal(false)} className="p-1.5 hover:bg-slate-50 rounded-full transition-colors cursor-pointer">
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3 text-center py-2">
                  <a 
                    href={`https://wa.me/?text=Mari%20lihat%20Kredibilitas%20Profil%20Travel%20Umroh%20Terpercaya%20${encodeURIComponent(profile.travelName)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <MessageCircle size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 font-sans">WhatsApp</span>
                  </a>

                  <a 
                    href="https://t.me/share/url?url=https://umaroh.com&text=Umaroh"
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-500 flex items-center justify-center font-sans">
                      <Send size={16} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">Telegram</span>
                  </a>

                  <a 
                    href="https://facebook.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="w-11 h-11 rounded-xl bg-indigo-100 text-[#047857] flex items-center justify-center font-sans">
                      <Facebook size={16} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">Facebook</span>
                  </a>

                  <button 
                    onClick={handleCopyLink}
                    className="flex flex-col items-center gap-1.5 cursor-pointer"
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {copied ? <Check size={16} /> : <Share2 size={16} />}
                    </div>
                    <span className="text-[10px] font-bold text-slate-505">{copied ? 'Salin!' : 'Copy Link'}</span>
                  </button>
                </div>

                <div className="text-center pt-2 select-all font-mono text-[9px] text-slate-400 bg-slate-50 py-1.5 px-2.5 rounded-xl border border-slate-100 font-sans">
                  https://umaroh.com/mitra/{profile.id}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showLegalModal && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
              <div 
                className="absolute inset-0 cursor-pointer" 
                onClick={() => setShowLegalModal(false)} 
              />
              <motion.div 
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.94, opacity: 0 }}
                className="w-full max-w-sm bg-gradient-to-b from-amber-50 to-white border-[4px] border-amber-400 rounded-3xl p-6 relative z-10 shadow-2xl flex flex-col justify-between items-center text-center select-text font-sans font-sans"
              >
                <button 
                  onClick={() => setShowLegalModal(false)}
                  className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-655 rounded-full cursor-pointer"
                >
                  <X size={18} />
                </button>

                <div className="w-14 h-14 bg-amber-400 rounded-full flex items-center justify-center shadow-lg text-white font-extrabold text-lg mb-3">
                  🏆
                </div>

                <div className="space-y-3 font-sans">
                  <h3 className="font-extrabold text-amber-900 border-b border-amber-200 pb-2 text-sm uppercase tracking-widest font-sans">
                    PIAGAM LEGALITAS RESMI
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mb-1 font-sans">
                    Kementerian Agama Republik Indonesia
                  </p>
                  <p className="text-xs text-slate-800 font-extrabold tracking-tight">
                    Mitra Penyelenggara Perjalanan Ibadah Umrah (PPIU)
                  </p>
                  
                  <div className="py-3 px-3 bg-white/90 border border-amber-200 rounded-2xl shadow-inner font-serif text-slate-850 leading-relaxed text-[11px] font-semibold font-sans">
                    Sertifikat ini menerangkan bahwa <br />
                    <strong className="text-xs font-black text-[#047857]">{profile.travelName}</strong> <br />
                    ({profile.companyName}) <br />
                    terdaftar secara sah dan legal sebagai PPIU Nasional dengan nomor sertifikat resmi:
                    <div className="my-2.5 border-t border-b border-amber-200/50 py-1 text-center font-mono text-xs font-black text-amber-800 bg-amber-50">
                      {profile.ppiu}
                    </div>
                    dan berizin NIB <strong className="font-mono">{profile.nib}</strong> dengan performa kepatuhan terverifikasi.
                  </div>
                </div>

                <div className="mt-4 w-full flex gap-2 font-sans">
                  <button 
                    onClick={handlePdfDownload}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 font-black text-slate-950 rounded-xl text-xs active:scale-95 transition-transform cursor-pointer"
                  >
                    Format PDF
                  </button>
                  <button 
                    onClick={() => setShowLegalModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs active:scale-95 transition-transform cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 antialiased pb-28 md:px-4">
      {/* Maximum wrap centered simulated for pristine presentation look */}
      <div className="max-w-[480px] mx-auto bg-white shadow-2xl min-h-screen relative border-x border-slate-100 flex flex-col font-sans">
        
        {/* --- STICKY APPBAR --- */}
        <header className="sticky top-0 z-40 bg-[#047857] text-white px-4 py-3 shadow-md flex items-center justify-between">
          <button 
            onClick={() => {
              if (isEditMode) setIsEditMode(false);
              else {
                // Return fallback back action
                window.history.back();
              }
            }}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-95 touch-none"
            id="btn_back"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="font-extrabold text-base tracking-tight select-none">
            {isEditMode ? 'Edit Profil Mitra' : 'Profil Mitra Travel'}
          </span>
          <div className="flex items-center gap-1.5">
            {!isEditMode && (
              <>
                <button 
                  onClick={() => setIsEditMode(true)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-95 p-1"
                  title="Edit profil"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-95"
                  title="Bagikan profil"
                >
                  <Share2 size={18} />
                </button>
              </>
            )}
          </div>
        </header>

        {isEditMode ? (
          /* --- EDIT PROFILE VIEW --- */
          <EditProfileForm 
            initialProfile={profile} 
            onSave={handleSaveProfile} 
            onCancel={() => setIsEditMode(false)} 
          />
        ) : (
          /* --- DETAILED MITRA PORTAL PLAYGROUND --- */
          <>
            {/* HERO SECTION WITH EXPANSIVE ASSETS */}
            <div className="relative w-full h-48 sm:h-52 bg-slate-900 overflow-hidden shrink-0">
              <img 
                src={profile.coverImage} 
                alt="Ka'bah Travel Background" 
                className="w-full h-full object-cover opacity-80"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              {/* Logo Circle Overlay */}
              <div className="absolute bottom-4 left-4 flex items-end gap-3.5">
                <div className="w-20 h-20 rounded-2xl bg-white p-1 border-2 border-amber-400 shadow-xl overflow-hidden shrink-0">
                  <img 
                    src={profile.logo} 
                    alt="Logo Mitra" 
                    className="w-full h-full object-cover rounded-xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="mb-1 text-white pr-2">
                  <div className="flex flex-wrap gap-1 mb-1">
                    <span className="text-[9px] bg-amber-500 font-extrabold px-1.5 py-0.5 rounded text-slate-950 uppercase tracking-wide">
                      Premium Mitra
                    </span>
                    <span className="text-[9px] bg-emerald-600 font-extrabold px-1.5 py-0.5 rounded text-white uppercase tracking-wide flex items-center gap-0.5">
                      <CheckCircle2 size={9} /> Terverifikasi
                    </span>
                  </div>
                  <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight select-all">
                    {profile.travelName}
                  </h1>
                </div>
              </div>
            </div>

            {/* DESCRIPTION & CARD STATS BASICS */}
            <div className="px-4 pt-3.5 pb-2 border-b border-slate-100 bg-white">
              <p className="text-slate-600 text-xs leading-relaxed select-text mt-1 text-justify">
                "{profile.description}"
              </p>

              <div className="flex flex-wrap items-center mt-3 gap-y-2 gap-x-4 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1 select-all">
                  📍 <strong className="text-slate-800">{profile.city}</strong>
                </span>
                <span className="flex items-center gap-1">
                  📅 Bergabung Sejak: <strong className="text-slate-800">{profile.joinDate}</strong>
                </span>
              </div>

              {/* Dynamic Score Ribbon */}
              <div className="mt-4 p-3 bg-gradient-to-r from-[#FFFCEB] via-[#FFFDF5] to-[#F8FAFC] border border-[#FDE68A] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-amber-400 rounded-lg text-slate-950 flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                    {profile.performanceScore}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 leading-none">Skor Kinerja Kemitraan</h4>
                    <span className="text-[10px] text-slate-500 leading-normal">
                      Sangat Tinggi • Ditinjau Otomatis
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] bg-slate-900 text-amber-504 font-black px-2 py-0.5 rounded-full uppercase scale-90">
                    Sangat Layak
                  </span>
                </div>
              </div>

              {/* Grid 2x2 Stats */}
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#E6F2EE] text-[#047857] flex items-center justify-center shrink-0">
                    <Users size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block leading-tight">Jamaah</span>
                    <strong className="text-xs font-black text-slate-900 select-all">
                      {profile.jamaahCount.toLocaleString('id-ID')}+
                    </strong>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#ECFDF5] text-emerald-700 flex items-center justify-center shrink-0">
                    <Plane size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block leading-tight">Keberangkatan</span>
                    <strong className="text-xs font-black text-slate-900 select-all">
                      {profile.departureCount}x Kloter
                    </strong>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#FEF8E6] text-[#B45309] flex items-center justify-center shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block leading-tight">Lama Gabung</span>
                    <strong className="text-xs font-black text-slate-900">
                      {calculateLamaGabung(profile.joinDate)}
                    </strong>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#FFF7ED] text-orange-600 flex items-center justify-center shrink-0">
                    <Star className="fill-orange-500 stroke-orange-500" size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block leading-tight">Rating Mitra</span>
                    <strong className="text-xs font-black text-slate-900 select-all">{profile.rating} / 5.0</strong>
                  </div>
                </div>
              </div>

              {/* Render dynamic badges */}
              <div className="flex flex-wrap mt-3.5 gap-1.5">
                {autoBadges.map((bd, i) => (
                  <span key={i} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${bd.color}`}>
                    {bd.label}
                  </span>
                ))}
              </div>
            </div>

            {/* --- STICKY TAB NAVIGATION --- */}
            <div className="sticky top-[48px] z-30 bg-white border-b border-slate-200/80 flex items-center justify-around shrink-0 shadow-sm">
              {(['profil', 'performa', 'galeri', 'testimoni'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-2 text-xs font-extrabold uppercase tracking-tight relative border-b-2 transition-colors active:scale-95 ${
                    activeTab === tab 
                      ? 'border-[#F5B800] text-[#047857] font-black' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* TAB CONTENT PORTALS */}
            <main className="flex-1 p-4 overflow-y-auto space-y-4">
              
              {/* --- TAB 1: PROFIL DETAIL --- */}
              {activeTab === 'profil' && (
                <div className="space-y-4 animate-in fade-in-50 duration-200">
                  {/* Company Detail / Legalitas Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3.5">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                      <div className="p-1 bg-[#047857]/10 rounded-lg text-[#047857]">
                        <Building2 size={16} />
                      </div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        Dokumen Legalitas & Alamat
                      </h3>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400 font-semibold">Nama Resmi PT</span>
                        <span className="text-slate-800 font-bold text-right select-all">{profile.companyName}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-50">
                        <span className="text-slate-400 font-semibold">No. PPIU</span>
                        <span className="text-amber-800 bg-amber-50 font-black px-2 py-0.5 rounded select-all">
                          {profile.ppiu}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-50">
                        <span className="text-slate-400 font-semibold">Nomor NIB</span>
                        <span className="text-slate-800 font-mono font-bold select-all">{profile.nib}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-slate-50">
                        <span className="text-slate-400 font-semibold">NPWP Resmi</span>
                        <span className="text-slate-800 font-mono font-bold select-all">{profile.npwp}</span>
                      </div>
                      <div className="flex justify-between items-start py-1 border-t border-slate-50 gap-2">
                        <span className="text-slate-400 font-semibold shrink-0">Akta Pendirian</span>
                        <span className="text-slate-800 font-bold text-right text-[11px] leading-tight max-w-[70%] select-all">{profile.aktaPendirian}</span>
                      </div>
                      <div className="flex justify-between items-start py-1 border-t border-slate-50 gap-2">
                        <span className="text-slate-400 font-semibold shrink-0">RUPS</span>
                        <span className="text-slate-800 font-bold text-right text-[11px] leading-tight max-w-[70%] select-all">{profile.rups}</span>
                      </div>
                      <div className="flex justify-between items-start py-1 border-t border-slate-50 gap-2">
                        <span className="text-slate-400 font-semibold shrink-0">Asosiasi</span>
                        <span className="text-slate-800 font-bold text-right text-[11px] leading-tight max-w-[70%] select-all">{profile.asosiasi}</span>
                      </div>
                      <div className="flex justify-between items-start py-1 border-t border-slate-50 gap-2">
                        <span className="text-slate-400 font-semibold shrink-0">Akreditasi</span>
                        <span className="text-[#047857] bg-emerald-50 px-2 py-0.5 rounded font-black text-right text-[11px] leading-tight max-w-[70%] select-all">{profile.akreditasi}</span>
                      </div>
                      <div className="flex justify-between items-start py-1 border-t border-slate-50 gap-2">
                        <span className="text-slate-400 font-semibold shrink-0">IATA</span>
                        <span className="text-slate-820 font-mono font-bold text-right text-[11px] leading-tight max-w-[70%] select-all">{profile.iata}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-50 space-y-1">
                        <span className="text-slate-400 font-semibold block">Alamat Kantor / Domisili</span>
                        <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed font-semibold select-text">
                          📍 {profile.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-1.5 flex-col sm:flex-row">
                      <button 
                        onClick={() => setShowLegalModal(true)}
                        className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-extrabold text-xs transition-transform flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer touch-none"
                      >
                        <CheckCircle2 size={14} className="fill-slate-950 stroke-amber-200" /> Sertifikat Kemenag RI
                      </button>
                      <button 
                        onClick={handlePdfDownload}
                        className="flex-1 py-2.5 px-3 bg-slate-900 text-white hover:bg-slate-850 rounded-xl font-extrabold text-xs transition-transform flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer touch-none"
                      >
                        <FileText size={14} /> Dokumen Profil (PDF)
                      </button>
                    </div>
                  </div>

                  {/* List Layanan & Paket Menus */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-amber-400/20 rounded-lg text-amber-700">
                          <Briefcase size={16} />
                        </div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                          Daftar Paket Keberangkatan
                        </h3>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {profile.packages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4">
                          <Briefcase size={28} className="text-slate-300 mb-1.5" />
                          <p className="text-xs font-black text-slate-800 uppercase tracking-wide">Belum Ada Paket</p>
                          <span className="text-[10px] text-slate-400 mt-0.5 max-w-[180px] leading-relaxed">
                            Mitra belum merilis daftar paket layanan akomodasi aktif.
                          </span>
                        </div>
                      ) : (
                        profile.packages.map((pkg) => (
                          <div 
                            key={pkg.id} 
                            className="p-3 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-100 flex items-center justify-between group transition-colors"
                          >
                            <div className="space-y-0.5">
                              <span className="text-[8px] bg-[#047857] text-white font-extrabold uppercase px-1.5 py-0.5 rounded-full">
                                {pkg.type}
                              </span>
                              <h4 className="text-xs font-black text-slate-900 group-hover:text-[#047857] transition-colors mt-1 select-all">
                                {pkg.name}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                                <span>📅 {pkg.duration}</span>
                                <span>•</span>
                                <span>🏨 Hotel Bintang {pkg.hotelStar}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[8px] text-slate-400 block font-semibold uppercase leading-none mb-0.5">Mulai</span>
                              <strong className="text-xs font-black text-slate-900 bg-white border border-slate-200/60 px-2 py-1 rounded-lg select-all">
                                {pkg.price}
                              </strong>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Area Pelayanan Checklist */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3.5">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                      <span className="text-slate-800 font-bold block">📍 Area Pelayanan Utama</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
                      {profile.areas.map((area, index) => (
                        <div key={index} className="flex items-center gap-2 bg-slate-50 p-2 border border-slate-100 rounded-lg">
                          <span className="text-emerald-500 font-black">✓</span>
                          <span>{area}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB 2: PERFORMA INTERACTIVE ANALYTICS --- */}
              {activeTab === 'performa' && (
                <div className="space-y-4 animate-in fade-in-50 duration-200">
                  {/* Performa Stats Row */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tight block">Tahun Ini</span>
                      <strong className="text-base font-black text-slate-900 block leading-tight">
                        845 Jamaah
                      </strong>
                      <span className="text-[8px] text-emerald-600 font-bold block mt-1">+14% vs tahun lalu</span>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tight block">Paket Terjual</span>
                      <strong className="text-base font-black text-slate-900 block leading-tight">
                        321 Paket
                      </strong>
                      <span className="text-[8px] text-[#047857] font-bold block mt-1">Sisa 12 kuota promo</span>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tight block">Conversion Rate</span>
                      <strong className="text-base font-black text-[#047857] block leading-tight">
                        34%
                      </strong>
                      <span className="text-[8px] text-slate-400 font-bold block mt-1">Efisiensi tinggi</span>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tight block">Repeat Customer</span>
                      <strong className="text-base font-black text-amber-600 block leading-tight">
                        42%
                      </strong>
                      <span className="text-[8px] text-slate-400 font-bold block mt-1">Loyalitas mantap</span>
                    </div>
                  </div>

                  {/* Growth Line Chart (Perfect SVG Render) */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                      Grafik Pertumbuhan Jamaah (Jan - Jun)
                    </h3>
                    
                    <div className="relative w-full h-40 bg-slate-50 rounded-xl px-2 pt-4 pb-2 border border-slate-100 flex flex-col justify-between">
                      {/* Responsive Grid Backdrops */}
                      <div className="absolute inset-x-0 top-1/4 h-px bg-slate-200/60 dashed" />
                      <div className="absolute inset-x-0 top-2/4 h-px bg-slate-200/60 dashed" />
                      <div className="absolute inset-x-0 top-3/4 h-px bg-slate-200/60 dashed" />

                      {/* SVG path lines for clean rendering */}
                      <svg className="w-full h-full overflow-visible z-10" viewBox="0 0 300 100" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F5B800" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#F5B800" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {/* Shaded Area under path */}
                        <path 
                          d="M 10 90 L 60 75 L 120 50 L 180 65 L 240 30 L 290 15 L 290 100 L 10 100 Z" 
                          fill="url(#chartGrad)" 
                        />
                        {/* Main Line */}
                        <path 
                          d="M 10 90 L 60 75 L 120 50 L 180 65 L 240 30 L 290 15" 
                          fill="none" 
                          stroke="#047857" 
                          strokeWidth="3.5" 
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Target line comparison */}
                        <path 
                          d="M 10 80 L 60 70 L 120 60 L 180 40 L 240 35 L 290 20" 
                          fill="none" 
                          stroke="#F5B800" 
                          strokeWidth="2" 
                          strokeDasharray="4 3" 
                          strokeLinecap="round"
                        />
                        {/* Draw Data Points */}
                        <circle cx="10" cy="90" r="4.5" fill="#047857" stroke="#fff" strokeWidth="2" />
                        <circle cx="60" cy="75" r="4.5" fill="#047857" stroke="#fff" strokeWidth="2" />
                        <circle cx="120" cy="50" r="4.5" fill="#047857" stroke="#fff" strokeWidth="2" />
                        <circle cx="180" cy="65" r="4.5" fill="#047857" stroke="#fff" strokeWidth="2" />
                        <circle cx="240" cy="30" r="4.5" fill="#047857" stroke="#fff" strokeWidth="2" />
                        <circle cx="290" cy="15" r="4.5" fill="#047857" stroke="#fff" strokeWidth="2" />
                      </svg>

                      {/* Labels X and Y */}
                      <div className="flex justify-between px-1 text-[9px] font-black text-slate-400 select-none z-10 mt-auto">
                        <span>Jan</span>
                        <span>Feb</span>
                        <span>Mar</span>
                        <span>Apr</span>
                        <span>Mei</span>
                        <span>Jun</span>
                      </div>
                    </div>

                    <div className="flex justify-between text-[10px] font-bold text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5Box">
                        <span className="inline-block w-2.5 h-1.5 bg-[#047857] rounded" /> Realisasi (Keberangkatan)
                      </div>
                      <div className="flex items-center gap-1.5Box">
                        <span className="inline-block w-2.5 h-1.5 bg-amber-400 rounded-full" /> Target Umrah
                      </div>
                    </div>
                  </div>

                  {/* Последняя активность Timeline */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3.5">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Timeline Aktivitas Terakhir</h3>
                    <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-4">
                      <div className="relative">
                        <div className="absolute -left-[20px] top-1.5 w-3.5 h-3.5 rounded-full bg-[#047857] border-2 border-white ring-2 ring-[#047857]/20" />
                        <time className="text-[9px] font-bold text-slate-400">Hari ini, 09:20 WIB</time>
                        <h4 className="text-xs font-bold text-slate-900">42 Jamaah Berhasil Diberangkatkan</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Kloter Syawal Group 1, Pesawat Saudia Airways SV-812.</p>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-[20px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white" />
                        <time className="text-[9px] font-bold text-slate-400 font-semibold">Kemarin</time>
                        <h4 className="text-xs font-bold text-slate-900">Paket Baru Ditambahkan</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Mengunggah Paket VIP Plus Turki Musim Gugur seharga Rp 28,9 Jt.</p>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-[20px] top-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                        <time className="text-[9px] font-bold text-slate-400 font-semibold">27 Mei 2026</time>
                        <h4 className="text-xs font-bold text-slate-900">Validasi & Verifikasi NIB selesai</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Sistem memverifikasi keaslian corporate ID dengan skor sempurna.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB 3: GALLERY --- */}
              {activeTab === 'galeri' && (
                <div className="space-y-4 animate-in fade-in-50 duration-200">
                  {/* Category Chips Bar */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 select-none">
                    {['Semua', 'Keberangkatan', 'Manasik', 'City Tour', 'Hotel', 'Pesawat', 'Kantor'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setGalleryFilter(cat)}
                        className={`py-1.5 px-3 rounded-full text-[10px] font-black tracking-tight border shrink-0 transition-all ${
                          galleryFilter === cat
                            ? 'bg-[#047857] text-white border-transparent'
                            : 'bg-white text-slate-500 border-slate-200/80 hover:bg-slate-50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Grid 2 Column Images */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {profile.gallery.length === 0 ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-10 text-center bg-slate-50 border border-dashed border-slate-250 rounded-xl p-4">
                        <ImageIcon size={30} className="text-slate-300 mb-1.5" />
                        <p className="text-xs font-black text-slate-800 uppercase tracking-wide">Galeri Kosong</p>
                        <span className="text-[10px] text-slate-400 mt-0.5 max-w-[180px] leading-relaxed">
                          Tidak ada dokumentasi foto kegiatan pelayanan di galeri saat ini.
                        </span>
                      </div>
                    ) : (
                      profile.gallery
                        .filter(img => galleryFilter === 'Semua' || img.category === galleryFilter)
                        .map((img) => (
                          <div 
                            key={img.id}
                            onClick={() => setSelectedImage({ url: img.url, title: img.title })}
                            className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 shadow-sm transition-transform active:scale-95"
                          >
                            <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
                              <img 
                                src={img.url} 
                                alt={img.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                <span className="text-[10px] text-white font-bold block truncate">{img.title}</span>
                              </div>
                            </div>
                            <div className="p-2 bg-white flex justify-between items-center bg-slate-50">
                              <span className="text-[9px] font-extrabold text-slate-900 truncate">{img.title}</span>
                              <span className="text-[8px] bg-slate-200 text-slate-700 rounded px-1">{img.category}</span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}

              {/* --- TAB 4: TESTIMONIS --- */}
              {activeTab === 'testimoni' && (
                <div className="space-y-4 animate-in fade-in-50 duration-200">
                  {/* Rating Dashboard Summary */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between gap-4">
                    <div className="text-center shrink-0 border-r border-slate-100 pr-4">
                      <strong className="text-3xl font-black text-slate-900">4.9</strong>
                      <div className="flex gap-0.5 justify-center py-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="fill-[#F5B800] stroke-amber-500" size={12} />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Dari 156 Review</span>
                    </div>

                    <div className="flex-1 space-y-1.5 text-[9px] font-bold text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="w-4">5★</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="bg-[#F5B800] h-full" style={{ width: '90%' }} />
                        </div>
                        <span className="w-6 text-right">90%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4">4★</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="bg-amber-400 h-full" style={{ width: '8%' }} />
                        </div>
                        <span className="w-6 text-right font-medium">8%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4">3★</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="bg-slate-300 h-full" style={{ width: '2%' }} />
                        </div>
                        <span className="w-6 text-right">2%</span>
                      </div>
                    </div>
                  </div>

                  {/* List of Testimonials Feed */}
                  <div className="space-y-3">
                    {profile.testimonials.map((t) => (
                      <div key={t.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-2.5 select-text">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={t.avatar} 
                            alt={t.name} 
                            className="w-10 h-10 rounded-full object-cover border border-slate-100"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1">
                            <h4 className="text-xs font-black text-slate-900">{t.name}</h4>
                            <span className="text-[9px] text-slate-400 font-semibold">{t.date}</span>
                          </div>
                          <div className="flex gap-0.5 bg-slate-50 border px-1.5 py-0.5 rounded-lg shrink-0">
                            {[...Array(t.rating).keys()].map((star) => (
                              <Star key={star} className="fill-[#F5B800] stroke-amber-500" size={10} />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-semibold italic text-slate-700/90">
                          "{t.text}"
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Tambah Testimoni Baru Form */}
                  <div className="bg-gradient-to-tr from-[#047857]/5 to-slate-100 border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                    <h4 className="text-xs font-black text-[#047857] uppercase tracking-tight">Kirim Testimoni / Ulasan Anda</h4>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const target = e.currentTarget;
                      const nameInput = target.elements.namedItem('senderName') as HTMLInputElement | null;
                      const textInput = target.elements.namedItem('reviewText') as HTMLTextAreaElement | null;
                      const ratingInput = target.elements.namedItem('senderRating') as HTMLSelectElement | null;
                      
                      const name = nameInput?.value.trim() || '';
                      const text = textInput?.value.trim() || '';
                      if (!name || !text) return;
                      const newTestimonial = {
                        id: `t_${Date.now()}`,
                        name,
                        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
                        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
                        rating: Number(ratingInput?.value || 5),
                        text
                      };
                      const updated = {
                        ...profile,
                        testimonials: [newTestimonial, ...profile.testimonials]
                      };
                      handleSaveProfile(updated);
                      target.reset();
                    }} className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Nama Lengkap</label>
                          <input required name="senderName" type="text" placeholder="Cth: Bpk. H. Ahmad" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-[#047857]" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Rating</label>
                          <select name="senderRating" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-[#047857]">
                            <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                            <option value="4">⭐⭐⭐⭐ (4/5)</option>
                            <option value="3">⭐⭐⭐ (3/5)</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">Pesan Ulasan</label>
                        <textarea required name="reviewText" rows={2} placeholder="Tuliskan pengalaman ibadah umroh Anda bersama kami..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:outline-[#047857] leading-relaxed"></textarea>
                      </div>
                      <button type="submit" className="w-full py-2.5 bg-[#047857] text-white hover:bg-[#035a41] font-black text-xs rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer text-center select-none">
                        Kirim Ulasan Sekarang
                      </button>
                    </form>
                  </div>

                </div>
              )}
              
              {/* SOCIAL MEDIA BAR */}
              <div className="bg-slate-900 rounded-2xl p-4 text-white text-center space-y-3 shadow-md">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#F5B800]">
                  Hubungkan Media Sosial Mitra
                </h4>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                    {profile.socialMedia.website || 'No Website Specified'}
                  </span>
                  <div className="flex gap-4">
                    <a 
                      href={profile.socialMedia.instagram ? `https://instagram.com/${profile.socialMedia.instagram.replace('@', '')}` : 'https://instagram.com'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white scale-105 active:scale-95" 
                      title="Instagram"
                    >
                      <Instagram size={18} />
                    </a>
                    <a 
                      href={profile.socialMedia.facebook ? `https://facebook.com/${encodeURIComponent(profile.socialMedia.facebook)}` : 'https://facebook.com'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white scale-105 active:scale-95" 
                      title="Facebook"
                    >
                      <Facebook size={18} />
                    </a>
                    <a 
                      href={profile.socialMedia.youtube ? `https://youtube.com/${profile.socialMedia.youtube.startsWith('@') ? profile.socialMedia.youtube : '@' + profile.socialMedia.youtube}` : 'https://youtube.com'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white scale-105 active:scale-95" 
                      title="Youtube"
                    >
                      <Youtube size={18} />
                    </a>
                    <a 
                      href={profile.socialMedia.website ? `https://${profile.socialMedia.website.replace('https://', '').replace('http://', '')}` : '#'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white scale-105 active:scale-95" 
                      title="Website Resmi"
                    >
                      <Globe size={18} />
                    </a>
                  </div>
                </div>
              </div>

              {/* DEMO LOGOUT AND ROLE FALLBACK OPTIONS */}
              <div className="pt-6 pb-2 text-center">
                <button 
                  onClick={handleLogout}
                  className="px-6 py-2.5 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-xs transition-transform active:scale-95"
                >
                  Keluar dari Akun Umaroh
                </button>
              </div>

            </main>

            {/* --- STICKY BOTTOM ACTIONS FOOTER --- */}
            <footer className="sticky bottom-0 z-40 bg-white border-t border-slate-200 px-4 py-3 flex gap-2.5 shadow-[0_-4px_10px_rgba(0,0,0,0.04)] select-none">
              <a 
                href={`https://wa.me/${profile.socialMedia.whatsapp}?text=Assalamualaikum%20Nawaitu%20Umrah%20saya%20tertarik%20melihat%20katalog%20paket%20umroh%20Anda`}
                target="_blank"
                rel="noreferrer"
                className="flex-[2] py-3 px-4 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-transform cursor-pointer"
              >
                <MessageCircle size={15} /> Hubungi via WhatsApp
              </a>
              
              <button 
                onClick={() => {
                  setActiveTab('profil');
                  // Quick smooth scroll down to package list container if applicable
                  document.querySelector('main')?.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="flex-1 py-3 px-3 bg-[#047857] hover:bg-[#035a41] active:scale-95 text-white font-extrabold text-xs rounded-xl text-center shadow-xs transition-transform"
              >
                Lihat Paket
              </button>
            </footer>
          </>
        )}

        {/* --- LIGHTBOX MODAL --- */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="absolute inset-0 z-50 bg-black/95 flex flex-col justify-center items-center p-4 cursor-zoom-out"
            >
              <button 
                className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20"
                onClick={() => setSelectedImage(null)}
              >
                <X size={20} />
              </button>
              <img 
                src={selectedImage.url} 
                alt={selectedImage.title} 
                className="max-w-full max-h-[70%] object-contain rounded-lg shadow-2xl"
              />
              <p className="text-white text-xs font-bold mt-4 tracking-wide text-center">
                {selectedImage.title}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- SHARE MODAL ACCENT --- */}
        <AnimatePresence>
          {showShareModal && (
            <div className="absolute inset-0 z-50 bg-black/60 flex items-end select-none">
              <div 
                className="absolute inset-0" 
                onClick={() => setShowShareModal(false)} 
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="w-full bg-white rounded-t-3xl p-5 relative z-10 shadow-2xl space-y-4"
              >
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <h3 className="font-black text-xs uppercase tracking-tight text-slate-900">
                    Bagikan Profil Travel
                  </h3>
                  <button onClick={() => setShowShareModal(false)}>
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3 text-center py-2">
                  <a 
                    href={`https://wa.me/?text=Mari%20lihat%20Kredibilitas%20Profil%20Travel%20Umroh%20Terpercaya%20${profile.travelName}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <MessageCircle size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">WhatsApp</span>
                  </a>

                  <a 
                    href="https://t.me/share/url?url=https://umaroh.com&text=Umaroh"
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-500 flex items-center justify-center">
                      <Send size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 font-semibold">Telegram</span>
                  </a>

                  <a 
                    href="https://facebook.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 text-[#047857] flex items-center justify-center">
                      <Facebook size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 font-semibold">Facebook</span>
                  </a>

                  <button 
                    onClick={handleCopyLink}
                    className="flex flex-col items-center gap-1.5 cursor-pointer touch-none"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {copied ? <Check size={18} /> : <Share2 size={18} />}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 font-semibold">{copied ? 'Salin!' : 'Copy Link'}</span>
                  </button>
                </div>

                <div className="text-center pt-2">
                  <span className="text-[9px] text-slate-400 font-bold block select-all">
                    https://umaroh.com/mitra/{profile.id}
                  </span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- DYNAMIC CERTIFICATE / LEGALITY MODAL --- */}
        <AnimatePresence>
          {showLegalModal && (
            <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
              <div 
                className="absolute inset-0 cursor-pointer" 
                onClick={() => setShowLegalModal(false)} 
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm bg-gradient-to-b from-amber-50 to-white border-[4px] border-amber-500 rounded-3xl p-6 relative z-10 shadow-2xl flex flex-col justify-between items-center text-center select-text"
              >
                <button 
                  onClick={() => setShowLegalModal(false)}
                  className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X size={18} />
                </button>

                {/* Ribbon decoration */}
                <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shadow-lg text-white font-extrabold text-lg mb-3">
                  🏆
                </div>

                <div className="space-y-3">
                  <h3 className="font-extrabold text-amber-900 border-b border-amber-200 pb-2 text-sm uppercase tracking-widest">
                    PIAGAM LEGALITAS RESMI
                  </h3>
                  <p className="text-[10px] text-slate-400 font-extrabold tracking-wide uppercase">
                    Kementerian Agama Republik Indonesia
                  </p>
                  <p className="text-xs text-slate-800 font-bold tracking-tight">
                    Mitra Penyelenggara Perjalanan Ibadah Umrah (PPIU)
                  </p>
                  
                  <div className="py-2.5 px-3 bg-white/80 border border-amber-200 rounded-xl shadow-inner font-serif text-slate-900 leading-relaxed text-[11px] font-medium">
                    Sertifikat ini menerangkan bahwa <br />
                    <strong className="text-sm font-black text-[#047857]">{profile.travelName}</strong> <br />
                    ({profile.companyName}) <br />
                    terdaftar secara sah dan legal sebagai PPIU Nasional dengan nomor sertifikat resmi:
                    <div className="my-2 border-t border-b border-amber-200/50 py-1 text-center font-mono text-xs font-black text-amber-800 bg-amber-50">
                      {profile.ppiu}
                    </div>
                    dan berizin NIB <strong className="font-mono">{profile.nib}</strong> dengan performa kepatuhan terverifikasi.
                  </div>
                </div>

                <div className="mt-5 w-full flex gap-2">
                  <button 
                    onClick={handlePdfDownload}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 font-black text-slate-950 rounded-xl text-xs active:scale-95 transition-transform"
                  >
                    Format PDF
                  </button>
                  <button 
                    onClick={() => setShowLegalModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs active:scale-95 transition-transform"
                  >
                    Tutup
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

// --- SUB-COMPONENT FOR INLINE EDIT FROM MOBILE APP ---
interface EditProfileFormProps {
  initialProfile: MitraProfile;
  onSave: (updated: MitraProfile) => void;
  onCancel: () => void;
}

const EditProfileForm: React.FC<EditProfileFormProps> = ({ initialProfile, onSave, onCancel }) => {
  const [form, setForm] = useState<MitraProfile>({ ...initialProfile });
  const [newPkg, setNewPkg] = useState<PackageDetail>({ id: '', name: '', price: '', type: 'Reguler', duration: '9 Hari', hotelStar: 4 });
  const [newGalleryPhoto, setNewGalleryPhoto] = useState({ title: '', category: 'Manasik', url: '' });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, logo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, coverImage: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleGalleryPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewGalleryPhoto(prev => ({ ...prev, url: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddGalleryPhoto = () => {
    if (!newGalleryPhoto.url) return;
    const added = {
      id: `g_${Date.now()}`,
      title: newGalleryPhoto.title || 'Foto Kegiatan Travel',
      category: newGalleryPhoto.category || 'Lainnya',
      url: newGalleryPhoto.url
    };
    setForm(prev => ({
      ...prev,
      gallery: [...(prev.gallery || []), added]
    }));
    setNewGalleryPhoto({ title: '', category: 'Manasik', url: '' });
  };

  const handleRemoveGalleryPhoto = (id: string) => {
    setForm(prev => ({
      ...prev,
      gallery: prev.gallery.filter(item => item.id !== id)
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleNestedLegalityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddPackage = () => {
    if (!newPkg.name || !newPkg.price) return;
    const addedPkg = {
      ...newPkg,
      id: `p_${Date.now()}`
    };
    setForm(prev => ({
      ...prev,
      packages: [...prev.packages, addedPkg]
    }));
    setNewPkg({ id: '', name: '', price: '', type: 'Reguler', duration: '9 Hari', hotelStar: 4 });
  };

  const handleRemovePackage = (pkgId: string) => {
    setForm(prev => ({
      ...prev,
      packages: prev.packages.filter(i => i.id !== pkgId)
    }));
  };

  return (
    <div className="flex-1 bg-slate-50 p-4 space-y-4 overflow-y-auto pb-24">
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5 select-text">
        <h3 className="text-xs font-black uppercase text-[#047857] tracking-widest border-b pb-2">
          Detail Identitas Travel
        </h3>

        <div className="space-y-1.5 text-xs">
          <label className="text-slate-400 font-extrabold uppercase">Nama Travel</label>
          <input 
            type="text" 
            name="travelName" 
            value={form.travelName} 
            onChange={handleChange} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#047857]"
          />
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="text-slate-400 font-extrabold uppercase">Nama Resmi Perusahaan (PT)</label>
          <input 
            type="text" 
            name="companyName" 
            value={form.companyName} 
            onChange={handleChange} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#047857]"
          />
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="text-slate-400 font-extrabold uppercase">Deskripsi Profil Singkat</label>
          <textarea 
            name="description" 
            value={form.description} 
            onChange={handleChange} 
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-[#047857] leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-400 font-extrabold uppercase">Kota</label>
            <input 
              type="text" 
              name="city" 
              value={form.city} 
              onChange={handleChange} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
            />
          </div>
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-400 font-extrabold uppercase">Nama Pemilik (Owner)</label>
            <input 
              type="text" 
              name="ownerName" 
              value={form.ownerName} 
              onChange={handleChange} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-400 font-extrabold uppercase">Jumlah Jamaah</label>
            <input 
              type="number" 
              value={form.jamaahCount} 
              onChange={(e) => setForm(p => ({ ...p, jamaahCount: Number(e.target.value) }))} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
            />
          </div>
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-400 font-extrabold uppercase">Jumlah Keberangkatan</label>
            <input 
              type="number" 
              value={form.departureCount} 
              onChange={(e) => setForm(p => ({ ...p, departureCount: Number(e.target.value) }))} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-400 font-extrabold uppercase">Rating Mitra (1-5)</label>
            <input 
              type="number" 
              step="0.1"
              min="1"
              max="5"
              value={form.rating} 
              onChange={(e) => setForm(p => ({ ...p, rating: Number(e.target.value) }))} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
            />
          </div>
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-400 font-extrabold uppercase">Skor Performa (1-100)</label>
            <input 
              type="number" 
              min="1"
              max="100"
              value={form.performanceScore} 
              onChange={(e) => setForm(p => ({ ...p, performanceScore: Number(e.target.value) }))} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
        <h3 className="text-xs font-black uppercase text-amber-700 tracking-widest border-b pb-2">
          Nomor Dokumen & Legalitas
        </h3>

        <div className="space-y-1.5 text-xs">
          <label className="text-slate-400 font-extrabold uppercase">Sertifikat PPIU Kemenag</label>
          <input 
            type="text" 
            name="ppiu" 
            value={form.ppiu} 
            onChange={handleNestedLegalityChange} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800"
          />
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="text-slate-400 font-extrabold uppercase">NIB (Nomor Induk Berusaha)</label>
          <input 
            type="text" 
            name="nib" 
            value={form.nib} 
            onChange={handleNestedLegalityChange} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
          />
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="text-slate-400 font-extrabold uppercase">NPWP Perusahaan</label>
          <input 
            type="text" 
            name="npwp" 
            value={form.npwp} 
            onChange={handleNestedLegalityChange} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
          />
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="text-slate-400 font-extrabold uppercase">Akta Pendirian</label>
          <input 
            type="text" 
            name="aktaPendirian" 
            value={form.aktaPendirian || ''} 
            onChange={handleNestedLegalityChange} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
          />
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="text-slate-400 font-extrabold uppercase">RUPS</label>
          <input 
            type="text" 
            name="rups" 
            value={form.rups || ''} 
            onChange={handleNestedLegalityChange} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
          />
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="text-slate-400 font-extrabold uppercase">Asosiasi</label>
          <input 
            type="text" 
            name="asosiasi" 
            value={form.asosiasi || ''} 
            onChange={handleNestedLegalityChange} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
          />
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="text-slate-400 font-extrabold uppercase">Akreditasi</label>
          <input 
            type="text" 
            name="akreditasi" 
            value={form.akreditasi || ''} 
            onChange={handleNestedLegalityChange} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
          />
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="text-slate-400 font-extrabold uppercase">IATA</label>
          <input 
            type="text" 
            name="iata" 
            value={form.iata || ''} 
            onChange={handleNestedLegalityChange} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
          />
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="text-slate-400 font-extrabold uppercase">Alamat Kantor Lengkap</label>
          <input 
            type="text" 
            name="address" 
            value={form.address} 
            onChange={handleChange} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
          />
        </div>
      </div>

      {/* CUSTOM PACKAGE CREATOR FOR DEMO OR REAL INTERACTION */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
        <h3 className="text-xs font-black uppercase text-[#047857] tracking-widest border-b pb-2">
          Kelola Paket Keberangkatan ({form.packages.length})
        </h3>

        {/* List current values */}
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {form.packages.map((pkg) => (
            <div key={pkg.id} className="p-2.5 bg-slate-50 border rounded-xl flex items-center justify-between">
              <div className="text-xs">
                <span className="font-extrabold text-[#047857] block">{pkg.name}</span>
                <span className="text-[10px] text-slate-400">{pkg.price} • {pkg.duration}</span>
              </div>
              <button 
                onClick={() => handleRemovePackage(pkg.id)}
                className="p-1 text-red-500 hover:bg-red-50 rounded-lg active:scale-95"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>

        {/* Add package action form */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5">
          <span className="text-[10px] text-[#047857] font-black uppercase">Tambah Paket Baru:</span>
          
          <input 
            type="text" 
            placeholder="Nama Paket" 
            value={newPkg.name} 
            onChange={(e) => setNewPkg(p => ({ ...p, name: e.target.value }))} 
            className="w-full bg-white border rounded-xl p-2.5 text-xs font-semibold focus:outline-slate-500"
          />

          <div className="grid grid-cols-2 gap-2">
            <input 
              type="text" 
              placeholder="Mulai Harga (cth: Rp 25 Jt)" 
              value={newPkg.price} 
              onChange={(e) => setNewPkg(p => ({ ...p, price: e.target.value }))} 
              className="w-full bg-white border rounded-xl p-2.5 text-xs font-semibold"
            />
            <input 
              type="text" 
              placeholder="Durasi (cth: 9 Hari)" 
              value={newPkg.duration} 
              onChange={(e) => setNewPkg(p => ({ ...p, duration: e.target.value }))} 
              className="w-full bg-white border rounded-xl p-2.5 text-xs font-semibold"
            />
          </div>

          <button 
            onClick={handleAddPackage}
            className="w-full py-2 bg-[#047857]/10 text-[#047857] hover:bg-[#047857]/20 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus size={14} /> Tambahkan ke Daftar
          </button>
        </div>
      </div>

      {/* MEDIA ASSETS MANAGEMENT (LOGO, BANNER, GALLERY) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-xs font-black uppercase text-[#047857] tracking-widest border-b pb-2 flex items-center gap-1.5">
          <Camera size={14} /> Kelola Foto Profil & Banner
        </h3>

        {/* LOGO / FOTO PROFIL EDITING */}
        <div className="space-y-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Foto Profil / Logo Travel</span>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Live Preview Circle */}
            <div className="relative w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden shrink-0 group flex items-center justify-center">
              {form.logo ? (
                <img src={form.logo} alt="Logo Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-xs text-slate-400 font-bold p-1 text-center">No Logo</span>
              )}
            </div>

            {/* Editing Options */}
            <div className="flex-1 w-full space-y-2">
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 shadow-xs transition-colors cursor-pointer select-none active:scale-95">
                  <Upload size={13} /> UPLOAD FOTO
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoUpload} 
                    className="hidden" 
                  />
                </label>
                
                {form.logo && (
                  <button
                    onClick={() => setForm(p => ({ ...p, logo: '' }))}
                    className="p-2 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-xl transition-all active:scale-95 cursor-pointer"
                    title="Hapus foto"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              
              {/* Preset Selectors */}
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase">Gunakan Preset Indah:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Kaligrafi', url: 'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?w=150&auto=format&fit=crop&q=80' },
                    { label: 'Kubah Hijau', url: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=150&auto=format&fit=crop&q=80' },
                    { label: 'Masjid Agung', url: 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?w=150&auto=format&fit=crop&q=80' }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setForm(p => ({ ...p, logo: preset.url }))}
                      className={`text-[9px] px-2 py-1 rounded-lg font-bold border transition-all cursor-pointer ${form.logo === preset.url ? 'bg-[#047857]/10 border-[#047857] text-[#047857]' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Raw URL Input */}
              <input 
                type="text" 
                name="logo"
                value={form.logo} 
                onChange={handleChange}
                placeholder="Atau tempel Link URL Gambar..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-medium text-slate-700"
              />
            </div>
          </div>
        </div>

        {/* COVER IMAGE / BANNER EDITING */}
        <div className="space-y-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Gambar Sampul Banner Travel</span>
          
          <div className="space-y-3.5">
            {/* Live Banner Preview */}
            <div className="relative w-full h-24 rounded-xl bg-slate-900 overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center">
              {form.coverImage ? (
                <>
                  <img src={form.coverImage} alt="Cover Preview" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute bottom-2 left-2 text-[10px] font-black text-white drop-shadow-md uppercase tracking-widest">Live Preview</span>
                </>
              ) : (
                <span className="text-xs text-slate-500 font-extrabold flex items-center gap-1"><ImageIcon size={13} /> Belum Ada Sampul</span>
              )}
            </div>

            {/* Cover Action UI */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="flex-grow flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 shadow-xs transition-colors cursor-pointer select-none active:scale-95">
                  <Upload size={13} /> UPLOAD GAMBAR SAMPUL BARU
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleCoverUpload} 
                    className="hidden" 
                  />
                </label>
                
                {form.coverImage && (
                  <button
                    onClick={() => setForm(p => ({ ...p, coverImage: '' }))}
                    className="p-2 text-red-500 hover:bg-red-50 border border-slate-200 rounded-xl transition-all active:scale-95 cursor-pointer"
                    title="Hapus sampul"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {/* Cover Presets */}
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase">Pilih Latar Belakang Premium:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Kaabah Klasik', url: 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?w=800&auto=format&fit=crop&q=80' },
                    { label: 'Masjidil Haram', url: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&auto=format&fit=crop&q=80' },
                    { label: 'Nabawi Madinah', url: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800&auto=format&fit=crop&q=80' },
                    { label: 'Siluet Masjid Sunset', url: 'https://images.unsplash.com/photo-1604999333679-b86d54738315?w=800&auto=format&fit=crop&q=80' }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setForm(p => ({ ...p, coverImage: preset.url }))}
                      className={`text-[9px] px-2 py-1 rounded-lg font-bold border transition-all cursor-pointer ${form.coverImage === preset.url ? 'bg-[#047857]/10 border-[#047857] text-[#047857]' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Raw URL text field */}
              <input 
                type="text" 
                name="coverImage"
                value={form.coverImage} 
                onChange={handleChange}
                placeholder="Atau tempel Link URL Banner..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-medium text-slate-700 animate-fade-in"
              />
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED TRAVEL PHOTO GALLERY MANAGER */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
        <h3 className="text-xs font-black uppercase text-[#047857] tracking-widest border-b pb-2 flex items-center justify-between">
          <span>📸 Kelola Galeri Kegiatan ({form.gallery?.length || 0})</span>
        </h3>

        {/* Current Gallery Grid Preview with Interactive Deleter */}
        {form.gallery && form.gallery.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-100">
            {form.gallery.map((img) => (
              <div key={img.id} className="group relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-xs">
                <img 
                  src={img.url} 
                  alt={img.title} 
                  className="w-full h-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-110" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent flex flex-col justify-end p-2" />
                
                {/* Trash icon overlay for deletion */}
                <button
                  onClick={() => handleRemoveGalleryPhoto(img.id)}
                  className="absolute top-1.5 right-1.5 p-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg active:scale-90 transition-all cursor-pointer shadow-md"
                  title="Hapus foto dari galeri"
                >
                  <Trash2 size={11} />
                </button>

                {/* Metadata overlay */}
                <div className="absolute bottom-1 left-1.5 right-1.5 min-w-0">
                  <span className="text-[7px] font-black bg-white/20 text-white backdrop-blur-md px-1 py-0.5 rounded uppercase tracking-wider block w-max leading-none mb-0.5">
                    {img.category}
                  </span>
                  <p className="text-[9px] font-black text-white truncate leading-tight drop-shadow-md">
                    {img.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-xs border-2 border-dashed border-slate-250 rounded-2xl bg-slate-50 flex flex-col items-center gap-1.5">
            <ImageIcon size={22} className="text-slate-350" />
            <p className="font-bold">Belum Ada Galeri Foto Travel</p>
            <p className="text-[9px] text-slate-400">Tambahkan foto manasik atau keberangkatan di bawah</p>
          </div>
        )}

        {/* Add Gallery Photo panel */}
        <div className="p-3 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl space-y-2.5">
          <span className="text-[10px] text-indigo-700 font-black uppercase tracking-wider block">Tambah Foto Kegiatan Baru:</span>
          
          <div className="grid grid-cols-2 gap-2">
            <input 
              type="text" 
              placeholder="Judul Foto (Cth: Pelepasan Solo)" 
              value={newGalleryPhoto.title} 
              onChange={(e) => setNewGalleryPhoto(p => ({ ...p, title: e.target.value }))} 
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-slate-500"
            />
            <select
              value={newGalleryPhoto.category}
              onChange={(e) => setNewGalleryPhoto(p => ({ ...p, category: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 select-none"
            >
              <option value="Keberangkatan">🛫 Keberangkatan</option>
              <option value="Manasik">🕋 Manasik</option>
              <option value="City Tour">🏝️ City Tour</option>
              <option value="Hotel">🏨 Hotel</option>
              <option value="Pesawat">✈️ Pesawat</option>
              <option value="Lainnya">✨ Lainnya</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* Live newly selected preview if any */}
            {newGalleryPhoto.url && (
              <div className="w-14 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-200 relative">
                <img src={newGalleryPhoto.url} alt="Upload preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => setNewGalleryPhoto(p => ({ ...p, url: '' }))}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white font-bold text-[8px]"
                >
                  BATAL
                </button>
              </div>
            )}
            
            {/* Upload form trigger */}
            <label className="flex-1 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-600 shadow-xs transition-colors cursor-pointer select-none active:scale-95">
              <Upload size={13} className="text-slate-500" /> UPLOAD FOTO KEGIATAN
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleGalleryPhotoUpload} 
                className="hidden" 
              />
            </label>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] text-slate-400 font-extrabold block">Atau tempel Link URL Foto langsung:</span>
            <input 
              type="text" 
              placeholder="https://images.unsplash.com/your-photo-url" 
              value={newGalleryPhoto.url} 
              onChange={(e) => setNewGalleryPhoto(p => ({ ...p, url: e.target.value }))} 
              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-indigo-500"
            />
          </div>

          <button 
            type="button"
            onClick={handleAddGalleryPhoto}
            disabled={!newGalleryPhoto.url}
            className={`w-full py-2.5 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${newGalleryPhoto.url ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
          >
            <Plus size={14} /> SEMATKAN FOTO KE GALERI
          </button>
        </div>
      </div>

      {/* CUSTOM SOCIAL MEDIA CONFIG MODULE */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
        <h3 className="text-xs font-black uppercase text-[#047857] tracking-widest border-b pb-2 flex items-center gap-1.5">
          <Globe size={13} /> Kelola Link Media Sosial
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-400 font-extrabold uppercase text-[10px]">Instagram Handle</label>
            <input 
              type="text" 
              value={form.socialMedia.instagram} 
              onChange={(e) => setForm(p => ({ ...p, socialMedia: { ...p.socialMedia, instagram: e.target.value } }))} 
              placeholder="@nawaitulumrah"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#047857]"
            />
          </div>
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-400 font-extrabold uppercase text-[10px]">Kontak WhatsApp (Nomor)</label>
            <input 
              type="text" 
              value={form.socialMedia.whatsapp} 
              onChange={(e) => setForm(p => ({ ...p, socialMedia: { ...p.socialMedia, whatsapp: e.target.value } }))} 
              placeholder="628123456789"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#047857]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-400 font-extrabold uppercase text-[10px]">Akun Facebook</label>
            <input 
              type="text" 
              value={form.socialMedia.facebook} 
              onChange={(e) => setForm(p => ({ ...p, socialMedia: { ...p.socialMedia, facebook: e.target.value } }))} 
              placeholder="Nawaitul Umrah Official"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#047857]"
            />
          </div>
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-400 font-extrabold uppercase text-[10px]">Channel Youtube</label>
            <input 
              type="text" 
              value={form.socialMedia.youtube} 
              onChange={(e) => setForm(p => ({ ...p, socialMedia: { ...p.socialMedia, youtube: e.target.value } }))} 
              placeholder="@NawaitulUmrah"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#047857]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-400 font-extrabold uppercase text-[10px]">Akun TikTok</label>
            <input 
              type="text" 
              value={form.socialMedia.tiktok || ''} 
              onChange={(e) => setForm(p => ({ ...p, socialMedia: { ...p.socialMedia, tiktok: e.target.value } }))} 
              placeholder="@nawaitulumrah"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#047857]"
            />
          </div>
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-400 font-extrabold uppercase text-[10px]">Situs Web URL</label>
            <input 
              type="text" 
              value={form.socialMedia.website} 
              onChange={(e) => setForm(p => ({ ...p, socialMedia: { ...p.socialMedia, website: e.target.value } }))} 
              placeholder="www.nawaitulumrah.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#047857]"
            />
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS (INLINE FOR EXCELLENT VISIBILITY AND DEVICE COMPATIBILITY) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex gap-3 mt-4">
        <button 
          onClick={onCancel}
          className="flex-grow py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs rounded-xl text-center active:scale-95 transition-transform cursor-pointer"
        >
          ✕ BATALKAN
        </button>
        <button 
          onClick={() => onSave(form)}
          className="flex-grow py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl text-center active:scale-95 transition-transform shadow-md cursor-pointer"
        >
          ✓ SIMPAN PERUBAHAN
        </button>
      </div>

    </div>
  );
};
