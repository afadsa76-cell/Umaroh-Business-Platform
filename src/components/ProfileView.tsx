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
  Globe
} from 'lucide-react';
import { auth, db, doc, setDoc, onSnapshot, handleFirestoreError, OperationType } from '../firebase';
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
}

export const ProfileView: React.FC = () => {
  const user = auth.currentUser;
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'profil' | 'performa' | 'galeri' | 'testimoni'>('profil');
  
  // Modals/Lightbox states
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<string>('Semua');

  // Core profile state (synced with Firebase)
  const [profile, setProfile] = useState<MitraProfile>({
    id: 'placeholder',
    travelName: 'Sahabat Umroh Tour & Travel',
    companyName: 'PT. Sahabat Umroh Indonesia',
    logo: 'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?w=150&auto=format&fit=crop&q=80', // Beautiful Islamic calligraphy art icon
    coverImage: 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?w=800&auto=format&fit=crop&q=80', // Kaaba landscape
    description: 'Melayani perjalanan ibadah umroh dengan pelayanan profesional, amanah, dan berpengalaman sejak 2021.',
    ownerName: 'H. Abdul Rasyid, M.A.',
    city: 'Jakarta Selatan',
    joinDate: 'Januari 2021',
    jamaahCount: 3520,
    departureCount: 28,
    rating: 4.9,
    performanceScore: 94,
    ppiu: 'U.123 Tahun 2020',
    nib: '1234567890123',
    npwp: '12.345.678.9-012.000',
    address: 'Jl. RS Fatmawati No.123, Cilandak, Jakarta Selatan',
    packages: [
      { id: '1', name: 'Paket Umroh Syawal Reguler', price: 'Rp 24.900.000', type: 'Reguler', duration: '9 Hari', hotelStar: 4 },
      { id: '2', name: 'Paket Umroh VIP Plus Turki', price: 'Rp 28.900.000', type: 'Plus', duration: '12 Hari', hotelStar: 5 },
      { id: '3', name: 'Al-Aqsha & Jordan Private Umroh', price: 'Rp 38.900.000', type: 'Private', duration: '14 Hari', hotelStar: 5 },
      { id: '4', name: 'Muslim Tour Halal Japan Autumn', price: 'Rp 19.900.000', type: 'Muslim Tour', duration: '7 Hari', hotelStar: 4 },
      { id: '5', name: 'Haji Furoda Khusus Royal Class', price: 'Hubungi Mitra', type: 'Haji Khusus', duration: '25 Hari', hotelStar: 5 }
    ],
    gallery: [
      { id: 'g1', category: 'Keberangkatan', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=80', title: 'Pelepasan Jamaah Bandara Soetta' },
      { id: 'g2', category: 'Manasik', url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=500&auto=format&fit=crop&q=80', title: 'Manasik Umroh Hotel Jakarta' },
      { id: 'g3', category: 'City Tour', url: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=500&auto=format&fit=crop&q=80', title: 'City Tour Kebun Kurma Madinah' },
      { id: 'g4', category: 'Hotel', url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=500&auto=format&fit=crop&q=80', title: 'Hotel View Masjidil Haram' },
      { id: 'g5', category: 'Pesawat', url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500&auto=format&fit=crop&q=80', title: 'Penerbangan Charter Saudia' },
      { id: 'g6', category: 'Kantor', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&auto=format&fit=crop&q=80', title: 'Kantor Operasional Jakarta' }
    ],
    testimonials: [
      { id: 't1', name: 'Hj. Siti Rahmawati', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80', date: '21 Maret 2026', rating: 5, text: 'Pelayanan sangat baik dan ustad pembimbing sabar sekali membimbing kami yang lansia selama di Mekkah.' },
      { id: 't2', name: 'Bpk. Bambang Heri', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', date: '10 Februari 2026', rating: 5, text: 'Hotel sangat dekat dengan pelataran Masjidil Nabawi. Konsumsi selera masakan nusantara mantap tiap hari.' },
      { id: 't3', name: 'Dr. Ahmad Fauzi', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', date: '05 Januari 2026', rating: 4, text: 'Pelepasan & penanganan bagasi profesional. Terasa amanah sejak mulai pendaftaran manasik.' }
    ],
    socialMedia: {
      instagram: '@sahabatumrohofficial',
      tiktok: '@sahabatumroh.travel',
      facebook: 'Sahabat Umroh Tour',
      youtube: 'Sahabat Umroh Channel',
      website: 'www.sahabatumroh.co.id',
      whatsapp: '6281234567890'
    },
    areas: ['Jabodetabek', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Seluruh Indonesia']
  });

  // Load real-time database updates securely if user is logged in
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const path = `users/${user.uid}`;
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const uData = docSnap.data();
          // Update profile options in real-time
          if (uData.role === 'mitra' || uData.role === 'admin') {
            setProfile(prev => {
              const updated = {
                ...prev,
                id: user.uid,
                travelName: uData.brandName || uData.namaLengkap || uData.name || prev.travelName,
                ownerName: uData.namaLengkap || uData.name || prev.ownerName,
                city: uData.kota || uData.city || prev.city,
                address: uData.alamatLengkap || uData.address || prev.address,
                npwp: uData.npwp || prev.npwp,
                ppiu: uData.ppiu || prev.ppiu,
                nib: uData.nib || prev.nib,
              };
              if (uData.customMitraProfile) {
                Object.assign(updated, uData.customMitraProfile);
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
    return () => unsub();
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
        kota: updated.city,
        alamatLengkap: updated.address,
        npwp: updated.npwp,
        ppiu: updated.ppiu,
        nib: updated.nib,
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

    // Elegant Theme Colors: Kuning Umaroh (#F5B800), Deep Slate Navy (#0F4C81)
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

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-yellow-500"></div>
        <p className="text-gray-500 text-sm font-semibold">Memuat Profil Premium...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 antialiased pb-28 md:px-4">
      {/* Maximum wrap centered simulated for pristine presentation look */}
      <div className="max-w-[480px] mx-auto bg-white shadow-2xl min-h-screen relative border-x border-slate-100 flex flex-col font-sans">
        
        {/* --- STICKY APPBAR --- */}
        <header className="sticky top-0 z-40 bg-[#0F4C81] text-white px-4 py-3 shadow-md flex items-center justify-between">
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
              <div className="mt-4 p-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-50 border border-amber-200/60 rounded-xl flex items-center justify-between">
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
                  <span className="text-[10px] bg-slate-900 text-amber-400 font-black px-2 py-0.5 rounded-full uppercase scale-90">
                    Sangat Layak
                  </span>
                </div>
              </div>

              {/* Grid 2x2 Stats */}
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center shrink-0">
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
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
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
                  <div className="w-9 h-9 rounded-lg bg-[#F5B800]/10 text-amber-700 flex items-center justify-center shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block leading-tight">Lama Gabung</span>
                    <strong className="text-xs font-black text-slate-900">4 Tahun</strong>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
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
                      ? 'border-[#F5B800] text-[#0F4C81] font-black' 
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
                      <div className="p-1 bg-[#0F4C81]/10 rounded-lg text-[#0F4C81]">
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
                      <div className="pt-2 border-t border-slate-50 space-y-1">
                        <span className="text-slate-400 font-semibold block">Alamat Kantor Pusat</span>
                        <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed font-medium select-text">
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
                      {profile.packages.map((pkg) => (
                        <div 
                          key={pkg.id} 
                          className="p-3 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-100 flex items-center justify-between group transition-colors"
                        >
                          <div className="space-y-0.5">
                            <span className="text-[8px] bg-[#0F4C81] text-white font-extrabold uppercase px-1.5 py-0.5 rounded-full">
                              {pkg.type}
                            </span>
                            <h4 className="text-xs font-black text-slate-900 group-hover:text-[#0F4C81] transition-colors mt-1 select-all">
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
                      ))}
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
                      <span className="text-[8px] text-[#0F4C81] font-bold block mt-1">Sisa 12 kuota promo</span>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tight block">Conversion Rate</span>
                      <strong className="text-base font-black text-[#0F4C81] block leading-tight">
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
                          stroke="#0F4C81" 
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
                        <circle cx="10" cy="90" r="4.5" fill="#0F4C81" stroke="#fff" strokeWidth="2" />
                        <circle cx="60" cy="75" r="4.5" fill="#0F4C81" stroke="#fff" strokeWidth="2" />
                        <circle cx="120" cy="50" r="4.5" fill="#0F4C81" stroke="#fff" strokeWidth="2" />
                        <circle cx="180" cy="65" r="4.5" fill="#0F4C81" stroke="#fff" strokeWidth="2" />
                        <circle cx="240" cy="30" r="4.5" fill="#0F4C81" stroke="#fff" strokeWidth="2" />
                        <circle cx="290" cy="15" r="4.5" fill="#0F4C81" stroke="#fff" strokeWidth="2" />
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
                        <span className="inline-block w-2.5 h-1.5 bg-[#0F4C81] rounded" /> Realisasi (Keberangkatan)
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
                        <div className="absolute -left-[20px] top-1.5 w-3.5 h-3.5 rounded-full bg-[#0F4C81] border-2 border-white ring-2 ring-[#0F4C81]/20" />
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
                            ? 'bg-[#0F4C81] text-white border-transparent'
                            : 'bg-white text-slate-500 border-slate-200/80 hover:bg-slate-50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Grid 2 Column Images */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {profile.gallery
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
                      ))}
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
                  <div className="bg-gradient-to-tr from-[#0F4C81]/5 to-slate-100 border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                    <h4 className="text-xs font-black text-[#0F4C81] uppercase tracking-tight">Kirim Testimoni / Ulasan Anda</h4>
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
                          <input required name="senderName" type="text" placeholder="Cth: Bpk. H. Ahmad" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-[#0F4C81]" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Rating</label>
                          <select name="senderRating" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-[#0F4C81]">
                            <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                            <option value="4">⭐⭐⭐⭐ (4/5)</option>
                            <option value="3">⭐⭐⭐ (3/5)</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">Pesan Ulasan</label>
                        <textarea required name="reviewText" rows={2} placeholder="Tuliskan pengalaman ibadah umroh Anda bersama kami..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:outline-[#0F4C81] leading-relaxed"></textarea>
                      </div>
                      <button type="submit" className="w-full py-2.5 bg-[#0F4C81] text-white hover:bg-[#0c3e6a] font-black text-xs rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer text-center select-none">
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
                href={`https://wa.me/${profile.socialMedia.whatsapp}?text=Assalamualaikum%20Sahabat%20Umroh%20saya%20tertarik%20melihat%20katalog%20paket%20umroh%20Anda`}
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
                className="flex-1 py-3 px-3 bg-[#0F4C81] hover:bg-[#0c3e6a] active:scale-95 text-white font-extrabold text-xs rounded-xl text-center shadow-xs transition-transform"
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
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 text-[#0F4C81] flex items-center justify-center">
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
                    <strong className="text-sm font-black text-[#0F4C81]">{profile.travelName}</strong> <br />
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
        <h3 className="text-xs font-black uppercase text-[#0F4C81] tracking-widest border-b pb-2">
          Detail Identitas Travel
        </h3>

        <div className="space-y-1.5 text-xs">
          <label className="text-slate-400 font-extrabold uppercase">Nama Travel</label>
          <input 
            type="text" 
            name="travelName" 
            value={form.travelName} 
            onChange={handleChange} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#0F4C81]"
          />
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="text-slate-400 font-extrabold uppercase">Nama Resmi Perusahaan (PT)</label>
          <input 
            type="text" 
            name="companyName" 
            value={form.companyName} 
            onChange={handleChange} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#0F4C81]"
          />
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="text-slate-400 font-extrabold uppercase">Deskripsi Profil Singkat</label>
          <textarea 
            name="description" 
            value={form.description} 
            onChange={handleChange} 
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-[#0F4C81] leading-relaxed"
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
        <h3 className="text-xs font-black uppercase text-[#0F4C81] tracking-widest border-b pb-2">
          Kelola Paket Keberangkatan ({form.packages.length})
        </h3>

        {/* List current values */}
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {form.packages.map((pkg) => (
            <div key={pkg.id} className="p-2.5 bg-slate-50 border rounded-xl flex items-center justify-between">
              <div className="text-xs">
                <span className="font-extrabold text-[#0F4C81] block">{pkg.name}</span>
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
          <span className="text-[10px] text-[#0F4C81] font-black uppercase">Tambah Paket Baru:</span>
          
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
            className="w-full py-2 bg-[#0F4C81]/10 text-[#0F4C81] hover:bg-[#0F4C81]/20 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus size={14} /> Tambahkan ke Daftar
          </button>
        </div>
      </div>

      {/* SOCIAL MEDIA & MEDIA ASSETS SETUP */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
        <h3 className="text-xs font-black uppercase text-[#0F4C81] tracking-widest border-b pb-2">
          Aset Desain & Media Sosial
        </h3>

        <div className="space-y-1.5 text-xs">
          <label className="text-slate-400 font-extrabold uppercase text-[10px]">Gambar Sampul Banner (URL)</label>
          <input 
            type="text" 
            name="coverImage" 
            value={form.coverImage} 
            onChange={handleChange} 
            placeholder="https://images.unsplash.com/..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#0F4C81]"
          />
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="text-slate-400 font-extrabold uppercase text-[10px]">Logo Utama Mitra (URL)</label>
          <input 
            type="text" 
            name="logo" 
            value={form.logo} 
            onChange={handleChange} 
            placeholder="https://images.unsplash.com/..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#0F4C81]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-400 font-extrabold uppercase text-[10px]">Instagram Handle</label>
            <input 
              type="text" 
              value={form.socialMedia.instagram} 
              onChange={(e) => setForm(p => ({ ...p, socialMedia: { ...p.socialMedia, instagram: e.target.value } }))} 
              placeholder="@sahabatumroh"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#0F4C81]"
            />
          </div>
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-400 font-extrabold uppercase text-[10px]">Kontak WhatsApp (Nomor)</label>
            <input 
              type="text" 
              value={form.socialMedia.whatsapp} 
              onChange={(e) => setForm(p => ({ ...p, socialMedia: { ...p.socialMedia, whatsapp: e.target.value } }))} 
              placeholder="628123456789"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#0F4C81]"
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
              placeholder="Sahabat Umroh Official"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#0F4C81]"
            />
          </div>
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-400 font-extrabold uppercase text-[10px]">Channel Youtube</label>
            <input 
              type="text" 
              value={form.socialMedia.youtube} 
              onChange={(e) => setForm(p => ({ ...p, socialMedia: { ...p.socialMedia, youtube: e.target.value } }))} 
              placeholder="@SahabatUmroh"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#0F4C81]"
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
              placeholder="@sahabatumroh"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#0F4C81]"
            />
          </div>
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-400 font-extrabold uppercase text-[10px]">Situs Web URL</label>
            <input 
              type="text" 
              value={form.socialMedia.website} 
              onChange={(e) => setForm(p => ({ ...p, socialMedia: { ...p.socialMedia, website: e.target.value } }))} 
              placeholder="www.sahabatumroh.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-[#0F4C81]"
            />
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM FORM FOOTER */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-3 flex gap-2.5 max-w-[480px] mx-auto z-40 select-none">
        <button 
          onClick={onCancel}
          className="flex-1 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 font-extrabold text-xs rounded-xl text-center active:scale-95 transition-transform"
        >
          Batalkan
        </button>
        <button 
          onClick={() => onSave(form)}
          className="flex-1 py-3 bg-[#F5B800] text-slate-950 hover:bg-amber-500 font-extrabold text-xs rounded-xl text-center active:scale-95 transition-transform shadow-sm"
        >
          Simpan Perubahan
        </button>
      </div>

    </div>
  );
};
