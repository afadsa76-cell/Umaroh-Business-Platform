import React, { useState, useEffect } from 'react';
import { 
  Search, Star, LayoutDashboard, Package, History, User,
  ShoppingCart, Tag, Compass, Sparkles, BookOpen,
  MessageCircle, CheckCircle, Info, Minus, Plus, Check,
  BadgePercent, Send, X, Bell, AlertTriangle, Printer, Upload, FileText, Menu, LogOut
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { auth, db, collection, addDoc, onSnapshot, query, where, serverTimestamp, handleFirestoreError, OperationType, doc, limit, updateDoc } from '../firebase';
import { KatalogPaketView } from './KatalogPaketView';
import { RiwayatPemesananView } from './RiwayatPemesananView';
import { ProfileView } from './ProfileView';
import { AppNotification, JamaahSession, BookingRecord } from '../types';
import { listenToUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService';
import { PortalHomeTab, PortalInfoTab, PortalKeuanganTab, PortalLainnyaTab } from './PortalSubTabs';
import { logoBase64 } from '../utils/logoBase64';
import { syncBookingToTracker } from '../utils/firebaseSync';

type JamaahTab = 'overview' | 'pendaftaran_mandiri' | 'katalog' | 'riwayat' | 'profile';

interface ShopProduct {
  id: string;
  name: string;
  price: number;
  weight: string;
  rating: number;
  sold: number;
  stock: number;
  image: string;
  desc: string;
}

interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

interface ShopOrder {
  id: string;
  jamaahId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  totalCost: number;
  paymentMethod: string;
  shippingVendor: string;
  shippingAddress: string;
  status: string;
  createdAt?: FirestoreTimestamp | null;
  noResi?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DashboardJamaahProps {
  jamaahCodeSession?: JamaahSession | BookingRecord | null;
  onLogout?: () => void;
}

export const DashboardJamaah: React.FC<DashboardJamaahProps> = ({ jamaahCodeSession, onLogout }) => {
  const [activeTab, setActiveTab] = useState<JamaahTab>(jamaahCodeSession ? 'pendaftaran_mandiri' : 'overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [bookingData, setBookingData] = useState<BookingRecord | null>((jamaahCodeSession as BookingRecord) || null);
  const [pilgrimBookings, setPilgrimBookings] = useState<BookingRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(!jamaahCodeSession);
  const [selectedBookingId, setSelectedBookingId] = useState<string>(jamaahCodeSession?.id || '');

  const [savingManifest, setSavingManifest] = useState(false);
  const [showPrintKwitansi, setShowPrintKwitansi] = useState(false);
  const [portalTab, setPortalTab] = useState<'beranda' | 'info' | 'keuangan' | 'dokumen' | 'lainnya'>('beranda');
  const [prepChecklist, setPrepChecklist] = useState<{[key: string]: boolean}>(() => {
    try {
      const cached = localStorage.getItem('umaroh_prep_checklist_' + (jamaahCodeSession?.id || 'default'));
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  const handleTogglePrepChecklist = (key: string) => {
    setPrepChecklist(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('umaroh_prep_checklist_' + (jamaahCodeSession?.id || 'default'), JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  const [manifestForm, setManifestForm] = useState({
    title: '',
    nama_paspor: '',
    no_paspor: '',
    tgl_issue_paspor: '',
    tgl_exp_paspor: '',
    kota_paspor: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    kewarganegaraan: 'Indonesia',
    nama_ayah: '',
    alamat: '',
    jenisKelamin: '',
    noHp: ''
  });

  const [suratType, setSuratType] = useState<'paspor' | 'cuti'>('paspor');
  const [kantorImigrasi, setKantorImigrasi] = useState('Kantor Imigrasi Kelas I TPI Jakarta Selatan');
  const [instansiNama, setInstansiNama] = useState('PT Solusi Sukses Digital');
  const [tglMulaiCuti, setTglMulaiCuti] = useState('');
  const [tglSelesaiCuti, setTglSelesaiCuti] = useState('');
  const [isGeneratingSurat, setIsGeneratingSurat] = useState(false);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [katalogSearch, setKatalogSearch] = useState<string>('');
  const [selectedMitraId, setSelectedMitraId] = useState<string | null>(null);
  const userId = auth.currentUser?.uid;
  const isMasterAdmin = auth.currentUser?.email ? (
    auth.currentUser.email.toLowerCase() === 'operationalumaroh@gmail.com' || 
    auth.currentUser.email.toLowerCase() === 'afadsa76@gmail.com'
  ) : false;

  // Real-time Notifications Listener for Jamaah
  useEffect(() => {
    if (!userId) return;
    const unsubscribeNotifications = listenToUserNotifications(userId, 'jamaah', (notifs) => {
      setNotifications(notifs);
    });
    return () => unsubscribeNotifications();
  }, [userId]);

  // Synchronous manifestation updates
  useEffect(() => {
    if (bookingData) {
      setManifestForm({
        title: bookingData.title || '',
        nama_paspor: bookingData.nama_paspor || bookingData.namaJamaah || '',
        no_paspor: bookingData.no_paspor || bookingData.nomorPassport || '',
        tgl_issue_paspor: bookingData.tgl_issue_paspor || '',
        tgl_exp_paspor: bookingData.tgl_exp_paspor || '',
        kota_paspor: bookingData.kota_paspor || '',
        tempat_lahir: bookingData.tempat_lahir || '',
        tanggal_lahir: bookingData.tanggal_lahir || '',
        kewarganegaraan: bookingData.kewarganegaraan || 'Indonesia',
        nama_ayah: bookingData.nama_ayah || '',
        alamat: bookingData.alamat || '',
        jenisKelamin: bookingData.jenisKelamin || '',
        noHp: bookingData.noHp || ''
      });
    }
  }, [bookingData]);

  // Real-time listener for code session document
  useEffect(() => {
    if (!jamaahCodeSession?.id) return;
    const unsubscribe = onSnapshot(doc(db, 'bookings', jamaahCodeSession.id), (docSnap) => {
      if (docSnap.exists()) {
        const item = docSnap.data();
        const hashCode = (str: string) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
          return hash;
        };
        const deterministicNum = Math.abs(hashCode(docSnap.id));
        const fallbackBooking = 'ORD-2026-UMR-' + (100000 + (deterministicNum % 900000));
        const fallbackUnique = 'UMR' + (1000 + (deterministicNum % 9000));

        const data = { 
          id: docSnap.id, 
          ...item,
          kodeBooking: (item.kodeBooking && item.kodeBooking !== 'undefined') ? item.kodeBooking : fallbackBooking,
          uniqueCode: (item.uniqueCode && item.uniqueCode !== 'undefined') ? item.uniqueCode : fallbackUnique
        };
        setBookingData(data);
      }
    });
    return () => unsubscribe();
  }, [jamaahCodeSession?.id]);

  // Real-time listener for standard logged-in user's bookings (or all system bookings for master admin)
  useEffect(() => {
    if (jamaahCodeSession) {
      setLoadingBookings(false);
      return;
    }
    if (!userId) {
      setLoadingBookings(false);
      return;
    }
    // Query either user's bookings or all bookings if Master Admin
    const q = isMasterAdmin 
      ? query(collection(db, 'bookings'), limit(250))
      : query(collection(db, 'bookings'), where('jamaahId', '==', userId));

    const unsubscribe = onSnapshot(q, (snap) => {
      const list: BookingRecord[] = [];
      snap.forEach(docSnap => {
        const item = docSnap.data();
        const hashCode = (str: string) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
          return hash;
        };
        const deterministicNum = Math.abs(hashCode(docSnap.id));
        const fallbackBooking = 'ORD-2026-UMR-' + (100000 + (deterministicNum % 900000));
        const fallbackUnique = 'UMR' + (1000 + (deterministicNum % 9000));

        list.push({ 
          id: docSnap.id, 
          ...item,
          kodeBooking: (item.kodeBooking && item.kodeBooking !== 'undefined') ? item.kodeBooking : fallbackBooking,
          uniqueCode: (item.uniqueCode && item.uniqueCode !== 'undefined') ? item.uniqueCode : fallbackUnique
        } as BookingRecord);
      });
      setPilgrimBookings(list);
      setLoadingBookings(false);
      
      // Auto-select first booking if none selected
      if (list.length > 0 && !selectedBookingId) {
        setSelectedBookingId(list[0].id);
        setBookingData(list[0]);
      }
    });
    return () => unsubscribe();
  }, [userId, jamaahCodeSession, selectedBookingId, isMasterAdmin]);

  // Update chosen bookingData when selectedBookingId changes for standard users
  useEffect(() => {
    if (jamaahCodeSession) return;
    if (!selectedBookingId || pilgrimBookings.length === 0) return;
    const found = pilgrimBookings.find(b => b.id === selectedBookingId);
    if (found) {
      setBookingData(found);
    }
  }, [selectedBookingId, pilgrimBookings, jamaahCodeSession]);

  // Real-time Database state
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([]);
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([
    {
      id: "prod-1",
      name: "Kain Ihram Katun Al-Mansuur Premium",
      price: 185000,
      weight: "1.2 kg",
      rating: 4.9,
      sold: 342,
      stock: 45,
      image: "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=300&auto=format&fit=crop",
      desc: "Kain Ihram katun premium dengan ketebalan terbaik, menyerap keringat optimal, tidak menerawang, sangat nyaman dipakai selama ritual ihram di cuaca panas jazirah Arab."
    },
    {
      id: "prod-2",
      name: "Mukena Silk Travel Ringan Anti-Kusut",
      price: 290000,
      weight: "0.4 kg",
      rating: 4.8,
      sold: 198,
      stock: 32,
      image: "https://images.unsplash.com/photo-1535252151047-35ad8970ac9e?q=80&w=300&auto=format&fit=crop",
      desc: "Mukena berbahan sutra satin berkualitas tinggi, adem, sangat fungsional dilengkapi pouch mini fungsional agar mudah dimasukkan ke tas saku selama perjalanan ziarah."
    },
    {
      id: "prod-3",
      name: "Sabuk Tawaf Thawaf Anti-Copot & Kantong Serbaguna",
      price: 75000,
      weight: "0.2 kg",
      rating: 4.7,
      sold: 520,
      stock: 80,
      image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=300&auto=format&fit=crop",
      desc: "Sabuk kain Ihram tanpa jahitan dengan sistem klip pengunci super kuat dilengkapi saku ritsleting aman tahan air untuk menaruh handphone, dompet kecil, dan paspor."
    },
    {
      id: "prod-4",
      name: "Sandal Masjid Ringan & Tas Kantong Serut",
      price: 35000,
      weight: "0.15 kg",
      rating: 4.9,
      sold: 812,
      stock: 120,
      image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?q=80&w=300&auto=format&fit=crop",
      desc: "Sandal masjid anti slip dari karet ultra ringan lengkap dengan pouch jaring agar sandal tidak hilang dan siap digantungkan di punggung tas saat sedang melakukan thawaf."
    },
    {
      id: "prod-5",
      name: "Buku Panduan Doa & Wirid Saku Lengkap",
      price: 20000,
      weight: "0.1 kg",
      rating: 4.9,
      sold: 1040,
      stock: 300,
      image: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=300&auto=format&fit=crop",
      desc: "Buku doa saku eksklusif cetakan jernih materi thariqah lengkap doa-doa mutholaah Miqat, Thawaf, Putaran Sa'i lengkap teks arab, transliterasi latin dan arti bahasa indonesia."
    },
    {
      id: "prod-6",
      name: "Koper Hardcase Fiber TSA 24 Inch",
      price: 420000,
      weight: "3.5 kg",
      rating: 4.8,
      sold: 95,
      stock: 15,
      image: "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?q=80&w=300&auto=format&fit=crop",
      desc: "Koper perlengkapan bagasi kuat anti retak fiber ABS bersertifikasi kunci TSA standar penerbangan internasional Arab Saudi. Roda ganda 360 derajat lincah."
    }
  ]);
  const [historyTab, setHistoryTab] = useState<'paket' | 'perlengkapan'>('paket');
  const [userMitraId, setUserMitraId] = useState<string | null>(null);

  // Shopee-style Vouchers
  const [claimedVouchers, setClaimedVouchers] = useState<string[]>([]);
  const [showVoucherToast, setShowVoucherToast] = useState<string | null>(null);

  // Shopee-style Banners Carousel
  const [currentBanner, setCurrentBanner] = useState<number>(0);
  const promoBanners = [
    {
      id: 1,
      title: "DISKON AMANAH 10%",
      sub: "Potongan Umroh VIP hingga Rp 2,5 Juta",
      voucher: "BERKAHVIP",
      bg: "from-amber-500 to-orange-600",
      img: "https://images.unsplash.com/photo-1565552643983-61629090f4fa?q=80&w=800&auto=format&fit=crop"
    },
    {
      id: 2,
      title: "CASHBACK KOMISI 1.5JT",
      sub: "Bagi Pendaftaran Umroh Keluarga & Rombongan",
      voucher: "UMROHROMBONGAN",
      bg: "from-emerald-600 to-teal-800",
      img: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=800&auto=format&fit=crop"
    },
    {
      id: 3,
      title: "DP RINGAN 1 JUTA",
      sub: "Amankan Seat Keberangkatan Umroh Syawal 1447H",
      voucher: "DPUMROHMURAH",
      bg: "from-indigo-600 to-blue-800",
      img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=800&auto=format&fit=crop"
    }
  ];

  // Flash Sale Timer
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 32, seconds: 15 });

  // Manasik Digital Interaction Saku
  const [currentManasikStep, setCurrentManasikStep] = useState<number>(0);
  const [tawafRounds, setTawafRounds] = useState<number>(0);
  const [saiRounds, setSaiRounds] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const manasikSteps = [
    {
      title: "Niat Ihram & Miqat",
      desc: "Memakai pakaian ihram dan mengucapkan niat umroh di tempat miqat yang ditentukan.",
      arabic: "لَبَّيْكَ اللَّهُمَّ عُمْرَةً",
      latin: "Labbaykallahumma 'umratan",
      arti: "Aku penuhi panggilan-Mu, ya Allah, untuk berumroh.",
      tips: "Pastikan mandi sunnah ihram dan potong kuku sebelum memakai kain ihram."
    },
    {
      title: "Thawaf (Mengkursi Ka'bah 7x)",
      desc: "Mengitari Ka'bah sebanyak 7 kali putaran dimulai dari Hajar Aswad berlawanan arah jarum jam.",
      arabic: "سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ",
      latin: "Subhanallah, walhamdulillah, wala ilaha illallah, wallahu akbar",
      arti: "Maha Suci Allah, segala puji bagi Allah, tiada Tuhan selain Allah, dan Allah Maha Besar.",
      tips: "Gunakan pencatat putaran di bawah untuk mempermudah ingatan Anda demi sahnya Thawaf."
    },
    {
      title: "Sa'i (Sofa ke Marwah 7x)",
      desc: "Berjalan/berlari-lari kecil antara bukit Shofa dan bukit Marwah sebanyak 7 kali perjalanan.",
      arabic: "إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ",
      latin: "Innas-Safa wal-Marwata min sya'a'irillah",
      arti: "Sesungguhnya Sofa dan Marwah merupakan sebagian dari syiar-syiar Allah.",
      tips: "Setiap lintasan dari Safa ke Marwah dihitung 1 putaran, dan sebaliknya dihitung 1 putaran."
    },
    {
      title: "Tahallul (Gunting Rambut)",
      desc: "Mencukur atau memotong sebagian rambut kepala (minimal 3 helai rambut) sebagai tanda selesainya ibadah Umroh.",
      arabic: "الحَمْدُ للهِ الَّذِي قَضَى عَنَّا مَنَاسِكَنَا",
      latin: "Alhamdulillahilladzi qadha 'anna manasikana",
      arti: "Segala puji bagi Allah yang telah menyelesaikan ibadah manasik kami.",
      tips: "Bagi laki-laki lebih utama mencukur habis (Gundul/Halq) demi mendapat pahala berlebih."
    }
  ];

  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [buyQty, setBuyQty] = useState<number>(1);
  const [shippingAddress, setShippingAddress] = useState<string>('');
  const [shippingVendor, setShippingVendor] = useState<string>('J&T Express');
  const [paymentMethod, setPaymentMethod] = useState<string>('Transfer Bank BSI');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);

  // Shopee-style Ask AI Customer Support widget
  const [showAiChat, setShowAiChat] = useState<boolean>(false);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [chatLog, setChatLog] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Halo Kak! Selamat datang di Pusat Chat Sahabat Umaroh. ✨ Ada yang bisa kami bantu seputar rencana perjalanan ibadah, rukun umroh, manasik, atau kelengkapan belanja baju ihram hari ini? 🙏🕌' }
  ]);
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);

  // Listen to physical items shop orders and master products from firestore
  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'shop_orders'), where('jamaahId', '==', userId));
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const list: ShopOrder[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ShopOrder);
      });
      // Sort newest
      list.sort((a,b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setShopOrders(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'shop_orders');
    });

    const unsubscribeMaster = onSnapshot(collection(db, 'perlengkapan_master'), (snap) => {
      if (!snap.empty) {
        const arr: ShopProduct[] = [];
        snap.forEach(docSnap => {
          const d = docSnap.data();
          if (d.status_barang === 'Nonaktif') return;
          arr.push({
            id: docSnap.id,
            name: d.nama_barang || '',
            price: Number(d.harga_jual || d.harga_modal || 0),
            weight: d.ukuran ? `Size: ${d.ukuran}` : '0.5 kg',
            rating: d.rating || 4.9,
            sold: d.sold || 120,
            stock: Number(d.stok || 0),
            image: d.thumbnail || d.image || "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=300&auto=format&fit=crop",
            desc: d.kategori_barang ? `Kategori: ${d.kategori_barang}. ` + (d.deskripsi || d.nama_barang) : (d.deskripsi || d.nama_barang || '')
          });
        });
        setShopProducts(arr);
      }
    });

    return () => {
      unsubscribeOrders();
      unsubscribeMaster();
    };
  }, [userId]);

  // Synchronize user settings/info and auto-populate delivery details with real data
  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        const u = docSnap.data();
        if (u.alamatLengkap || u.address) {
          setShippingAddress(u.alamatLengkap || u.address || '');
        }
        if (u.uplineId || u.mitraId) {
          setUserMitraId(u.uplineId || u.mitraId || null);
        }
      }
    }, (error) => {
      console.warn("Could not load user profile in background:", error);
    });
    return () => unsub();
  }, [userId]);

  // Flash Sale Timer Interval
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 23, minutes: 59, seconds: 59 }; // reset loop
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Claim voucher helper
  const handleClaimVoucher = (code: string) => {
    if (claimedVouchers.includes(code)) return;
    setClaimedVouchers(prev => [...prev, code]);
    navigator.clipboard.writeText(code);
    setShowVoucherToast(code);
    setTimeout(() => {
      setShowVoucherToast(null);
    }, 3500);
  };

  // Checkout merchandise function
  const handleCheckOutMerch = async () => {
    if (!selectedProduct || !userId) return;
    if (!shippingAddress.trim()) {
      alert("Mohon masukkan alamat lengkap pengiriman paket perlengkapan Kakak.");
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const totalCost = (selectedProduct.price * buyQty) + 20000; // Flat shipping cost Rp 20,000

      const orderPayload = {
        jamaahId: userId,
        jamaahName: auth.currentUser?.displayName || 'Jamaah Umaroh',
        mitraId: userMitraId || null,
        productName: selectedProduct.name,
        productPrice: selectedProduct.price,
        quantity: buyQty,
        totalCost: totalCost,
        paymentMethod: paymentMethod,
        shippingVendor: shippingVendor,
        shippingAddress: shippingAddress.trim(),
        status: 'Diproses Seller',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'shop_orders'), orderPayload);
      setOrderSuccess(true);
      setTimeout(() => {
        setOrderSuccess(false);
        setSelectedProduct(null);
        setBuyQty(1);
        setShippingAddress('');
        // Switch tab to riwayat so pilgrim can view their orders
        setActiveTab('riwayat');
        setHistoryTab('perlengkapan');
      }, 2500);
    } catch (e) {
      console.error("Error order checkout:", e);
      alert("Maaf, terjadi kendala saat memproses pesanan Kakak.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Submit AI Prompt helper
  const handleSendPrompt = async (txtToSend?: string) => {
    const inputTxt = txtToSend || aiMessage;
    if (!inputTxt.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: inputTxt };
    setChatLog(prev => [...prev, userMsg]);
    if (!txtToSend) setAiMessage('');
    setIsAiTyping(true);

    try {
      // Map chat log history
      const history = chatLog.map(c => ({ role: c.role === 'user' ? 'user' : 'model', content: c.content }));

      const res = await fetch('/api/ai/jamaah-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputTxt, history })
      });
      const data = await res.json();
      setChatLog(prev => [...prev, { role: 'assistant', content: data.reply || 'Maaf kak, sinyal kami terganggu. Silakan coba lagi.' }]);
    } catch {
      setChatLog(prev => [...prev, { role: 'assistant', content: 'Koneksi dengan asisten saku terputus. Silakan ajukan ulang pertanyaan Kakak.' }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // Shortcut Click Filter Helper
  const handleShortcutFilter = (filterText: string) => {
    setKatalogSearch(filterText);
    setActiveTab('katalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveManifest = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = bookingData?.id;
    if (!id) {
      alert("Pilih program keberangkatan terlebih dahulu.");
      return;
    }
    setSavingManifest(true);
    try {
      const updatedFields = {
        ...manifestForm,
        namaJamaah: manifestForm.nama_paspor || bookingData.namaJamaah,
        nama: manifestForm.nama_paspor || bookingData.namaJamaah,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'bookings', id), updatedFields);
      
      const fullUpdatedBooking = {
        ...(bookingData || {}),
        ...updatedFields
      };
      await syncBookingToTracker(id, fullUpdatedBooking);

      alert("Sukses menyimpan data manifest!");
    } catch (err) {
      console.error("Gagal menyimpan manifest:", err);
      alert("Error menyimpan data: " + err);
    } finally {
      setSavingManifest(false);
    }
  };

  const fileToBase64Value = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Failed reading file'));
      };
      reader.onerror = e => reject(e);
    });
  };

  const handleManifestFileChange = async (field: 'docPassport' | 'docKtp' | 'docVaccine' | 'docFoto' | 'filePassport' | 'fileKtp' | 'fileVaccine' | 'fileFoto', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1200000) { 
      alert('Ukuran berkas terlalu besar. Maksimal adalah 1.2 MB agar tersimpan optimal.');
      return;
    }
    
    try {
      const base64 = await fileToBase64Value(file);
      const targetDocId = bookingData?.id;
      if (!targetDocId) return;
      
      // Map correctly to make sure sync fields match both types of references in listings
      const isFileField = field.startsWith('file');
      const partnerField = isFileField ? field : ('file' + field.substring(3).charAt(0).toUpperCase() + field.substring(4));
      const docField = isFileField ? ('doc' + field.substring(4).charAt(0).toUpperCase() + field.substring(5)) : field;

      const updatedFields = {
        [partnerField]: base64,
        [docField]: base64,
        updatedAt: (new Date()).toISOString()
      };

      await updateDoc(doc(db, 'bookings', targetDocId), updatedFields);

      const fullUpdatedBooking = {
        ...(bookingData || {}),
        ...updatedFields
      };
      await syncBookingToTracker(targetDocId, fullUpdatedBooking);

      alert('Dokumen berhasil diunggah ke cloud database!');
    } catch (err) {
      console.error(err);
      alert('Gagal mengunggah berkas: ' + err);
    }
  };

  const handleGenerateSuratPDF = () => {
    if (!bookingData) {
      alert("Data pendaftaran Anda belum lengkap.");
      return;
    }
    setIsGeneratingSurat(true);
    try {
      const docPdf = new jsPDF();
      
      // Set fonts
      docPdf.setFont("helvetica", "bold");
      
      // 1. Draw Kop Surat (Letterhead)
      docPdf.setFontSize(16);
      docPdf.setTextColor(4, 120, 87); // emerald color
      docPdf.text("PT UMAROH WISATA INTERNASIONAL", 105, 20, { align: "center" });
      
      docPdf.setFont("helvetica", "normal");
      docPdf.setFontSize(8);
      docPdf.setTextColor(100, 116, 139);
      docPdf.text("Izin PPIU Kemenag RI No. 912/2024 | Biro Perjalanan Haji & Umroh Terpercaya", 105, 25, { align: "center" });
      docPdf.text("Gedung Umaroh Utama Lt. 5, Jl. HR Rasuna Said, Jakarta Selatan | Telp: (021) 835-2952 | www.umaroh.com", 105, 29, { align: "center" });
      
      // Draw double horizontal line
      docPdf.setLineWidth(1);
      docPdf.setDrawColor(4, 120, 87);
      docPdf.line(15, 33, 195, 33);
      docPdf.setLineWidth(0.2);
      docPdf.line(15, 34.5, 195, 34.5);
      
      // 2. Letter Meta Details
      docPdf.setFont("helvetica", "normal");
      docPdf.setFontSize(10);
      docPdf.setTextColor(30, 41, 59);
      
      const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      docPdf.text(`Jakarta, ${todayStr}`, 15, 45);
      
      docPdf.setFont("helvetica", "bold");
      docPdf.text("Nomor  : Ref/UMR-OPS/SR/VI/2026/00147", 15, 52);
      docPdf.text("Lampir : -", 15, 58);
      
      if (suratType === 'paspor') {
        docPdf.text("Perihal : Surat Rekomendasi Pembuatan Paspor Baru", 15, 64);
        
        // Recipient
        docPdf.text("Kepada Yang Terhormat,", 15, 75);
        docPdf.text("Kepala Kantor Imigrasi", 15, 81);
        docPdf.text(kantorImigrasi || "Kantor Imigrasi Kelas I TPI Terdekat", 15, 87);
        docPdf.text("Di Tempat", 15, 93);
        
        // Body
        docPdf.setFont("helvetica", "normal");
        docPdf.setFontSize(10.5);
        docPdf.text("Assalamu'alaikum Warahmatullahi Wabarakatuh,", 15, 105);
        
        const bodyText = `Dengan hormat, kami dari PT Umaroh Wisata Internasional (Penyelenggara Perjalanan Ibadah Umroh Resmi) menerangkan dengan sebenarnya bahwa calon Jamaah kami di bawah ini:`;
        const lines = docPdf.splitTextToSize(bodyText, 180);
        docPdf.text(lines, 15, 112);
        
        // Table Details
        docPdf.setFont("helvetica", "bold");
        docPdf.text("Nama Lengkap", 25, 130);
        docPdf.text("No. NIK / KTP", 25, 136);
        docPdf.text("Paket Umroh", 25, 142);
        docPdf.text("Tanggal Berangkat", 25, 148);
        
        docPdf.setFont("helvetica", "normal");
        docPdf.text(`:  ${bookingData.namaJamaah || manifestForm.nama_paspor || 'Nama Sesuai KTP'}`, 75, 130);
        docPdf.text(`:  ${bookingData.nik || '317xxxxxxxxxxxxx'}`, 75, 136);
        docPdf.text(`:  ${bookingData.paketNama || 'Paket Umroh Umaroh VIP'}`, 75, 142);
        docPdf.text(`:  ${bookingData.tglKeberangkatan || bookingData.tgl_keberangkatan || '2026-08-08'}`, 75, 148);
        
        docPdf.setFont("helvetica", "normal");
        const p2Text = `Adalah benar-benar terdaftar sebagai calon jemaah Umroh kami untuk keberangkatan tersebut di atas. Sehubungan dengan hal itu, kami memohon bantuan Bapak/Ibu Kepala Kantor Imigrasi kiranya dapat memberikan kemudahan layanan pembuatan/perpanjangan Paspor RI kepada yang bersangkutan.`;
        const linesP2 = docPdf.splitTextToSize(p2Text, 180);
        docPdf.text(linesP2, 15, 158);
        
        const p3Text = `Demikian surat rekomendasi formal ini kami sampaikan atas kerja sama dan bantuannya, kami ucapkan Jazakumullah Khairan Katsiran.\n\nWassalamu'alaikum Warahmatullahi Wabarakatuh.`;
        const linesP3 = docPdf.splitTextToSize(p3Text, 180);
        docPdf.text(linesP3, 15, 178);
        
      } else {
        // Cuti
        docPdf.text("Perihal : Permohonan Izin / Cuti Perjalanan Umroh", 15, 64);
        
        // Recipient
        docPdf.text("Kepada Yang Terhormat,", 15, 75);
        docPdf.text("Pimpinan / Kepala HRD", 15, 81);
        docPdf.text(instansiNama || "Pimpinan Instansi / Sekolah / Perusahaan", 15, 87);
        docPdf.text("Di Tempat", 15, 93);
        
        // Body
        docPdf.setFont("helvetica", "normal");
        docPdf.setFontSize(10.5);
        docPdf.text("Assalamu'alaikum Warahmatullahi Wabarakatuh,", 15, 105);
        
        const bodyText = `Dengan hormat, kami dari PT Umaroh Wisata Internasional menginformasikan bahwa staf / karyawan / siswa Bapak/Ibu di bawah ini:`;
        const lines = docPdf.splitTextToSize(bodyText, 180);
        docPdf.text(lines, 15, 112);
        
        // Table Details
        docPdf.setFont("helvetica", "bold");
        docPdf.text("Nama Lengkap", 25, 130);
        docPdf.text("No. NIK / KTP", 25, 136);
        docPdf.text("Paket Perjalanan", 25, 142);
        docPdf.text("Durasi Izin Cuti", 25, 148);
        
        const tglMulai = tglMulaiCuti || bookingData.tglKeberangkatan || bookingData.tgl_keberangkatan || '2026-08-08';
        const tglSelesai = tglSelesaiCuti || '2026-08-19';
        
        docPdf.setFont("helvetica", "normal");
        docPdf.text(`:  ${bookingData.namaJamaah || manifestForm.nama_paspor || 'Nama Sesuai KTP'}`, 75, 130);
        docPdf.text(`:  ${bookingData.nik || '317xxxxxxxxxxxxx'}`, 75, 136);
        docPdf.text(`:  ${bookingData.paketNama || 'Paket Umroh Umaroh VIP'}`, 75, 142);
        docPdf.text(`:  ${tglMulai} s.d. ${tglSelesai}`, 75, 148);
        
        docPdf.setFont("helvetica", "normal");
        const p2Text = `Telah terdaftar secara sah sebagai jemaah Umroh kami dan dijadwalkan melaksanakan ibadah suci di Makkah & Madinah pada tanggal tersebut. Sehubungan dengan hal tersebut, kami memohon kebijakan Bapak/Ibu pimpinan untuk memberikan dispensasi cuti/izin tidak masuk selama rentang waktu pengerjaan ibadah di atas.`;
        const linesP2 = docPdf.splitTextToSize(p2Text, 180);
        docPdf.text(linesP2, 15, 158);
        
        const p3Text = `Demikian permohonan ini kami sampaikan secara resmi, atas perhatian, kemudahan, dan kebaikan Bapak/Ibu pimpinan instansi kami ucapkan banyak terima kasih.\n\nWassalamu'alaikum Warahmatullahi Wabarakatuh.`;
        const linesP3 = docPdf.splitTextToSize(p3Text, 180);
        docPdf.text(linesP3, 15, 178);
      }
      
      // Signature Block
      docPdf.setFont("helvetica", "bold");
      docPdf.text("PT UMAROH WISATA INTERNASIONAL", 120, 215);
      docPdf.setFont("helvetica", "normal");
      docPdf.text("Direktur Operasional & Layanan Haji", 120, 221);
      
      // Simulated Stamp Circle & Signature Hand-line
      docPdf.setDrawColor(29, 78, 216); // Blue color stamp
      docPdf.setLineWidth(0.8);
      docPdf.ellipse(145, 238, 24, 11);
      
      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(7.5);
      docPdf.setTextColor(29, 78, 216);
      docPdf.text("UMAROH WISATA", 145, 237, { align: "center" });
      docPdf.text("★ VERIFIED STAMP ★", 145, 241, { align: "center" });
      
      // Signature text
      docPdf.setTextColor(17, 24, 39);
      docPdf.setFontSize(10.5);
      docPdf.setFont("helvetica", "bold");
      docPdf.text("H. Muhammad Afif, Lc., M.A.", 120, 255);
      docPdf.setLineWidth(0.3);
      docPdf.line(120, 256.5, 175, 256.5);
      
      // Save PDF
      const filename = suratType === 'paspor' ? 'Surat_Rekomendasi_Paspor_Umaroh.pdf' : 'Surat_Izin_Cuti_Umaroh.pdf';
      docPdf.save(filename);
      alert("Alhamdulillah! Surat rekomendasi berhasil diunduh secara instan pelunasan.");
    } catch (err) {
      console.error(err);
      alert("Gagal mengunduh dokumen: " + err);
    } finally {
      setIsGeneratingSurat(false);
    }
  };

  const renderPendaftaranMandiri = () => {
    if (loadingBookings) {
      return (
        <div className="p-12 text-center font-sans">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 font-bold">Memuat portal kemandirian Anda...</p>
        </div>
      );
    }

    const currentBooking = bookingData;

    if (!currentBooking) {
      return (
        <div className="p-6 max-w-md mx-auto text-center font-sans">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
            <h4 className="text-sm font-black text-gray-901">Program Keberangkatan Tidak Ditemukan</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">Mohon daftarkan paket Anda atau hubungi mitra agen Umaroh terdekat untuk konfirmasi data.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto w-full pb-24 animate-in fade-in duration-300 font-sans px-2 md:px-0">
        
        {/* TOP COMPRESS NAVIGATION ROW (Desktop Pills) */}
        <div className="hidden md:flex items-center justify-between bg-white border border-gray-150 p-2.5 rounded-2xl shadow-xs mb-6 font-sans">
          <div className="flex items-center gap-1">
            <span className="bg-emerald-900 text-white p-2 rounded-xl text-xs font-black">🕌</span>
            <div>
              <p className="text-xs font-black text-emerald-950 font-sans">Portal Jamaah Mandiri</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider font-mono">Umaroh.com Synergy System</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-100">
            {([
              { id: 'beranda', label: 'Beranda', icon: '🏠' },
              { id: 'info', label: 'Info Paket', icon: '📦' },
              { id: 'keuangan', label: 'Keuangan', icon: '💳' },
              { id: 'dokumen', label: 'Travel Dok', icon: '📝' },
              { id: 'lainnya', label: 'Lainnya', icon: '💬' }
            ] as const).map((tab) => {
              const isActive = portalTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPortalTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-emerald-800 text-white shadow-xs' 
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 transition-all cursor-pointer"
            >
              Keluar Portal
            </button>
          )}
        </div>

        {/* ACTIVE TAB RENDER ENGINE */}
        <div className="space-y-6">
          {portalTab === 'beranda' && (
            <PortalHomeTab
              bookingData={currentBooking}
              prepChecklist={prepChecklist}
              setPortalTab={setPortalTab}
              setShowPrintKwitansi={setShowPrintKwitansi}
            />
          )}

          {portalTab === 'info' && (
            <PortalInfoTab
              bookingData={currentBooking}
              setPortalTab={setPortalTab}
            />
          )}

          {portalTab === 'keuangan' && (
            <PortalKeuanganTab
              bookingData={currentBooking}
              setShowPrintKwitansi={setShowPrintKwitansi}
            />
          )}

          {portalTab === 'lainnya' && (
            <PortalLainnyaTab
              bookingData={currentBooking}
              prepChecklist={prepChecklist}
              handleTogglePrepChecklist={handleTogglePrepChecklist}
            />
          )}

          {portalTab === 'dokumen' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
              
              {/* Left Column: Manifest & Biodata Form */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-150 p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <span className="text-xl">📇</span>
                  <div>
                    <h3 className="text-sm font-black text-emerald-950">Manifest & Biodata Jamaah</h3>
                    <p className="text-[10px] text-gray-400 font-bold">Harap isi sesuai paspor/KTP asli untuk manifest penerbangan</p>
                  </div>
                </div>

                <form onSubmit={handleSaveManifest} className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Panggilan (Title)</label>
                      <select
                        value={manifestForm.title}
                        onChange={(e) => setManifestForm({ ...manifestForm, title: e.target.value })}
                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 font-bold"
                      >
                        <option value="">-- Pilih --</option>
                        <option value="Tuan (Mr)">Mr (Tuan)</option>
                        <option value="Nyonya (Mrs)">Mrs (Nyonya)</option>
                        <option value="Nona (Ms)">Ms (Nona)</option>
                        <option value="Anak (Child)">Child (Anak)</option>
                        <option value="Bayi (Infant)">Infant (Bayi)</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nama Sesuai Paspor / KTP</label>
                      <input
                        type="text"
                        value={manifestForm.nama_paspor}
                        onChange={(e) => setManifestForm({ ...manifestForm, nama_paspor: e.target.value })}
                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 font-bold"
                        placeholder="Nama Lengkap"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nomor Paspor</label>
                      <input
                        type="text"
                        value={manifestForm.no_paspor}
                        onChange={(e) => setManifestForm({ ...manifestForm, no_paspor: e.target.value })}
                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 font-bold"
                        placeholder="Contoh: C123456"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Kota Penerbit Paspor</label>
                      <input
                        type="text"
                        value={manifestForm.kota_paspor}
                        onChange={(e) => setManifestForm({ ...manifestForm, kota_paspor: e.target.value })}
                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 font-bold"
                        placeholder="Kantor Imigrasi"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tanggal Terbit Paspor</label>
                      <input
                        type="date"
                        value={manifestForm.tgl_issue_paspor}
                        onChange={(e) => setManifestForm({ ...manifestForm, tgl_issue_paspor: e.target.value })}
                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 font-mono text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tanggal Habis Berlaku</label>
                      <input
                        type="date"
                        value={manifestForm.tgl_exp_paspor}
                        onChange={(e) => setManifestForm({ ...manifestForm, tgl_exp_paspor: e.target.value })}
                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 font-mono text-gray-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tempat Lahir</label>
                      <input
                        type="text"
                        value={manifestForm.tempat_lahir}
                        onChange={(e) => setManifestForm({ ...manifestForm, tempat_lahir: e.target.value })}
                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 font-bold"
                        placeholder="Kota Tempat Lahir"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tanggal Lahir</label>
                      <input
                        type="date"
                        value={manifestForm.tanggal_lahir}
                        onChange={(e) => setManifestForm({ ...manifestForm, tanggal_lahir: e.target.value })}
                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 font-mono text-gray-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nama Ayah Kandung</label>
                      <input
                        type="text"
                        value={manifestForm.nama_ayah}
                        onChange={(e) => setManifestForm({ ...manifestForm, nama_ayah: e.target.value })}
                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 font-bold"
                        placeholder="Nama Ayah Kandung"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">No Handphone (WhatsApp)</label>
                      <input
                        type="text"
                        value={manifestForm.noHp}
                        onChange={(e) => setManifestForm({ ...manifestForm, noHp: e.target.value })}
                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 font-bold"
                        placeholder="No Handphone"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Alamat Tinggal / Pengiriman Koper</label>
                    <textarea
                      value={manifestForm.alamat}
                      onChange={(e) => setManifestForm({ ...manifestForm, alamat: e.target.value })}
                      rows={2}
                      className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 font-bold"
                      placeholder="Alamat Lengkap"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingManifest}
                    className="w-full bg-emerald-700 text-white font-black hover:bg-emerald-800 py-3 rounded-xl shadow-md text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {savingManifest ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <span>💾</span> Simpan Manifest Data
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Right Column: Digital Travel Docs Synergizer */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Visual Status File Summary */}
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs">
                  <h4 className="text-xs font-black text-emerald-950 uppercase mb-3 tracking-wider">Kelengkapan Berkas Dokumen</h4>
                  
                  {/* Progress Line */}
                  {(() => {
                    const hasPas = !!currentBooking.filePassport || !!currentBooking.docPassport;
                    const hasKtp = !!currentBooking.fileKtp || !!currentBooking.docKtp;
                    const hasVac = !!currentBooking.fileVaccine || !!currentBooking.docVaccine;
                    const hasPic = !!currentBooking.fileFoto || !!currentBooking.docFoto;
                    const count = (hasPas ? 1 : 0) + (hasKtp ? 1 : 0) + (hasVac ? 1 : 0) + (hasPic ? 1 : 0);
                    const pct = Math.round((count / 4) * 100);

                    return (
                      <div className="mb-4">
                        <div className="flex justify-between items-center text-[10px] font-black text-gray-400 mb-1">
                          <span>DOKUMEN TERUNGGAH</span>
                          <span className={`text-emerald-600`}>{count} / 4 ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 rounded-full ${pct === 100 ? 'bg-emerald-600' : 'bg-emerald-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-3.5 text-xs">
                    {[
                      { key: 'Passport', title: 'Paspor RI Asli', desc: 'Scan halaman depan nama lengkap tertera jelas', file: currentBooking.filePassport || currentBooking.docPassport, apiField: 'filePassport' },
                      { key: 'Ktp', title: 'KTP & Kartu Keluarga', desc: 'Scan berwarna KTP & KK format JPG/PNG', file: currentBooking.fileKtp || currentBooking.docKtp, apiField: 'fileKtp' },
                      { key: 'Vaccine', title: 'Sertifikat Vaksin', desc: 'Sertifikat Vaksin Covid dosis lengkap / Meningitis', file: currentBooking.fileVaccine || currentBooking.docVaccine, apiField: 'fileVaccine' },
                      { key: 'Foto', title: 'Pasfoto Background Putih', desc: 'Ukuran 4x6 zoom muka 80% tanpa kaca mata', file: currentBooking.fileFoto || currentBooking.docFoto, apiField: 'fileFoto' },
                    ].map((doc) => {
                      const isUploaded = !!doc.file;
                      return (
                        <div key={doc.key} className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 flex items-start gap-3 relative transition-all hover:bg-gray-100/50">
                          <div className={`p-2 rounded-xl text-xs flex-shrink-0 ${isUploaded ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600'}`}>
                            {isUploaded ? '✓' : '⚠'}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-emerald-950 truncate leading-snug">{doc.title}</p>
                            <p className="text-[10px] text-gray-400 font-bold leading-normal mt-0.5">{doc.desc}</p>
                            
                            {isUploaded ? (
                              <div className="mt-2.5 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                                  ✓ Sudah Ada
                                </span>
                                <a 
                                  href={doc.file} 
                                  download={`dokumen_${doc.key.toLowerCase()}.jpg`}
                                  className="text-[9px] font-bold text-gray-400 hover:text-emerald-700 underline truncate max-w-[120px]"
                                >
                                  Unduh File
                                </a>
                              </div>
                            ) : (
                              <div className="mt-2 text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md inline-block">
                                ⚠ Belum Unggah
                              </div>
                            )}
                          </div>

                          <label className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 transition-all cursor-pointer flex items-center justify-center self-center flex-shrink-0">
                            <Upload className="w-3.5 h-3.5 text-gray-400 hover:text-emerald-800" />
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => handleManifestFileChange(doc.apiField as 'filePassport' | 'fileKtp' | 'fileVaccine' | 'fileFoto', e)}
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-emerald-950 border border-emerald-900 rounded-2xl p-5 text-white shadow-sm font-sans relative overflow-hidden">
                  <div className="absolute right-[-10px] bottom-[-10px] text-white/5 font-black text-8xl pointer-events-none select-none">
                    🕋
                  </div>
                  <h4 className="text-xs font-black text-emerald-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>🛡</span> Garansi Dokumen Aman
                  </h4>
                  <p className="text-[10px] text-emerald-100 font-bold leading-relaxed">
                    Sistem kemitraan Umaroh.com dilengkapi enkripsi database modern. Berkas fisik dokumen Anda hanya digunakan untuk manifestasi tiket, pengurusan visa haji/umroh, dan asuransi perjalanan muasassah secara legal.
                  </p>
                </div>

                {/* Surat Rekomendasi & Izin Mandiri Card */}
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-4 font-sans">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-50 text-emerald-850 rounded-lg">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">Surat Menyurat Mandiri</h4>
                      <p className="text-[10px] text-gray-400 font-bold">Rekomendasi imigrasi & izin cuti diterbitkan otomatis</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    {/* Select Letter Type */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Pilih Jenis Surat</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSuratType('paspor')}
                          className={`py-2 px-3 text-xs font-bold rounded-lg border transition ${
                            suratType === 'paspor'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          🎫 Rekomendasi Paspor
                        </button>
                        <button
                          type="button"
                          onClick={() => setSuratType('cuti')}
                          className={`py-2 px-3 text-xs font-bold rounded-lg border transition ${
                            suratType === 'cuti'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          🏢 Izin Cuti Kerja
                        </button>
                      </div>
                    </div>

                    {/* Dynamic Inputs */}
                    {suratType === 'paspor' ? (
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Kantor Imigrasi Tujuan</label>
                        <input
                          type="text"
                          value={kantorImigrasi}
                          onChange={(e) => setKantorImigrasi(e.target.value)}
                          className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          placeholder="Misal: Kantor Imigrasi Jakarta Selatan"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nama Instansi / Perusahaan</label>
                          <input
                            type="text"
                            value={instansiNama}
                            onChange={(e) => setInstansiNama(e.target.value)}
                            className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            placeholder="Misal: PT Solusi Sukses Digital"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Mulai Cuti (Dep Date)</label>
                            <input
                              type="date"
                              value={tglMulaiCuti || currentBooking.tglKeberangkatan || currentBooking.tgl_keberangkatan || ''}
                              onChange={(e) => setTglMulaiCuti(e.target.value)}
                              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-750 font-mono focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Selesai Cuti</label>
                            <input
                              type="date"
                              value={tglSelesaiCuti}
                              onChange={(e) => setTglSelesaiCuti(e.target.value)}
                              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-750 font-mono focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pre-filled info helper */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-gray-500 font-medium space-y-1">
                      <p>✨ <strong className="text-gray-700">Sinkronisasi Keberangkatan:</strong></p>
                      <p>• Nama: <strong className="text-gray-700">{currentBooking.namaJamaah}</strong></p>
                      <p>• Paket: <strong className="text-gray-700">{currentBooking.paketNama || "VIP Al-Ibrah"}</strong></p>
                      <p>• Rencana Terbang: <strong className="text-gray-700">{currentBooking.tglKeberangkatan || currentBooking.tgl_keberangkatan || "2026-08-08"}</strong></p>
                    </div>

                    <button
                      type="button"
                      disabled={isGeneratingSurat}
                      onClick={handleGenerateSuratPDF}
                      className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black py-3 rounded-xl shadow-md text-xs tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-55"
                    >
                      {isGeneratingSurat ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                          Menghasilkan Surat...
                        </>
                      ) : (
                        <>
                          <span>📄</span> Cetak & Unduh Surat Formal PDF
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>

        {/* BOTTOM NAVIGATION FOR MOBILE (Floating Sticky Tab bar matching App screenshots) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-150 py-2.5 px-4 flex items-center justify-around shadow-lg z-50">
          {([
            { id: 'beranda', label: 'Beranda', icon: '🏠' },
            { id: 'info', label: 'Info Paket', icon: '📦' },
            { id: 'keuangan', label: 'Keuangan', icon: '💳' },
            { id: 'dokumen', label: 'Travel Dok', icon: '📝' },
            { id: 'lainnya', label: 'Lainnya', icon: '💬' }
          ] as const).map((tab) => {
            const isActive = portalTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPortalTab(tab.id)}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  isActive ? 'text-emerald-700 font-black scale-105' : 'text-gray-400 hover:text-gray-650'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-[10px] font-bold tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Dynamic Promotion Marquee */}
      <div className="bg-amber-50 border-y border-amber-200 py-2.5 px-4 overflow-hidden relative z-10">
        <div className="flex items-center gap-2 max-w-7xl mx-auto">
          <span className="bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex-shrink-0">INFO FLASH SALE</span>
          <div className="text-xs font-bold text-amber-900 overflow-x-auto whitespace-nowrap scrollbar-none animate-pulse">
            🚨 SISA 3 SEAT KUOTA PROMO HAJI FURODA VIP & UMROH SYAWAL 1447H SUDAH DIBUKA! SALIN VOUCHER & KLAIM DISKON SEKARANG JUGA!
          </div>
        </div>
      </div>

      {/* Shopee-style Banner Carousel Header */}
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="relative rounded-3xl overflow-hidden shadow-xl border border-gray-100 bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-600 p-8 text-white min-h-[220px] md:min-h-[280px] flex flex-col justify-between group">
          <div className="absolute inset-0 opacity-15 overflow-hidden">
            <img 
              src={promoBanners[currentBanner].img} 
              alt="Mekkah" 
              className="w-full h-full object-cover transform scale-105 group-hover:scale-110 transition-transform duration-1000" 
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
          
          <div className="relative z-10 flex flex-col justify-between h-full flex-grow">
            <div className="max-w-xl space-y-2">
              <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/20">
                PROMO EKSKLUSIF UMAROH
              </span>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight drop-shadow-sm leading-tight">
                {promoBanners[currentBanner].title}
              </h1>
              <p className="text-sm text-yellow-50 font-medium tracking-wide">
                {promoBanners[currentBanner].sub}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/20 flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-200" />
                <span className="text-xs font-mono font-bold tracking-widest">KODE: {promoBanners[currentBanner].voucher}</span>
              </div>
              <button
                onClick={() => handleClaimVoucher(promoBanners[currentBanner].voucher)}
                className={`text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg transform active:scale-95 ${
                  claimedVouchers.includes(promoBanners[currentBanner].voucher)
                    ? 'bg-emerald-500 text-white animate-pulse'
                    : 'bg-yellow-400 hover:bg-yellow-500 text-gray-900 hover:scale-[1.02]'
                }`}
              >
                {claimedVouchers.includes(promoBanners[currentBanner].voucher) ? '✓ KLAIM BERHASIL' : 'KLAIM VOUCHER ➔'}
              </button>
            </div>
          </div>

          {/* Dots Navigation */}
          <div className="absolute bottom-4 right-6 flex gap-1.5 z-20">
            {promoBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentBanner(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${currentBanner === idx ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Shopee-style Shortcut Category Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-600" /> CATEGORIES & PANDUAN PENGGERAK
        </h2>
        
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          
          <button 
            onClick={() => handleShortcutFilter('Umroh')}
            className="flex flex-col items-center p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              🕌
            </div>
            <span className="text-[10px] font-bold text-gray-700 text-center uppercase tracking-tight">Umroh VIP</span>
          </button>

          <button 
            onClick={() => handleShortcutFilter('Haji')}
            className="flex flex-col items-center p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform relative">
              🕋
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[7px] font-black px-1 py-0.5 rounded-full scale-90">HOT</span>
            </div>
            <span className="text-[10px] font-bold text-gray-700 text-center uppercase tracking-tight">Haji Furoda</span>
          </button>

          <button 
            onClick={() => {
              const el = document.getElementById('flash-sale-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex flex-col items-center p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform relative">
              ⚡
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full scale-90">PROMO</span>
            </div>
            <span className="text-[10px] font-bold text-gray-700 text-center uppercase tracking-tight">Flash Sale</span>
          </button>

          <button 
            onClick={() => {
              const el = document.getElementById('shop-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex flex-col items-center p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              🛍️
            </div>
            <span className="text-[10px] font-bold text-gray-700 text-center uppercase tracking-tight">Baju Ihram</span>
          </button>

          <button 
            onClick={() => {
              const el = document.getElementById('manasik-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex flex-col items-center p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform relative">
              📖
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[7px] font-black px-1 py-0.5 rounded-full scale-90">SAKU</span>
            </div>
            <span className="text-[10px] font-bold text-gray-700 text-center uppercase tracking-tight">Manasik Saku</span>
          </button>

          <button 
            onClick={() => setShowAiChat(true)}
            className="flex flex-col items-center p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              ✨
            </div>
            <span className="text-[10px] font-bold text-gray-700 text-center uppercase tracking-tight">Tanya AI</span>
          </button>

          <button 
            onClick={() => {
              const el = document.getElementById('vouchers-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex flex-col items-center p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              🎟️
            </div>
            <span className="text-[10px] font-bold text-gray-700 text-center uppercase tracking-tight">Voucher Belanja</span>
          </button>

          <button 
            onClick={() => handleShortcutFilter('Bintang 5')}
            className="flex flex-col items-center p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-yellow-50 text-yellow-650 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              🏨
            </div>
            <span className="text-[10px] font-bold text-gray-700 text-center uppercase tracking-tight">Mitra Hotel</span>
          </button>

        </div>
      </div>

      {/* Shopee-style Claimable Vouchers list */}
      <div id="vouchers-section" className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BadgePercent className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-black text-gray-800 uppercase tracking-tight">VOUCHER DISKON HARIAN SAKU</h2>
          </div>
          <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-1 rounded-lg">TERBATAS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4 flex items-center justify-between relative overflow-hidden group">
            <div className="absolute -left-2 top-0 bottom-0 w-3 bg-gradient-to-b from-orange-500 to-amber-500 rounded-r-md"></div>
            <div className="flex-1 pl-4">
              <h3 className="font-extrabold text-gray-900 text-sm leading-tight">POTONGAN LANGSUNG 1.5 JUTA</h3>
              <p className="text-[10px] text-gray-400 font-medium">Min. Pembelian Paket Umroh Quad</p>
              <div className="mt-2 text-[10px] font-mono text-orange-600 bg-orange-50 inline-block px-1.5 py-0.5 rounded font-black border border-orange-100">KODE: UMAROH15</div>
            </div>
            <button
              onClick={() => handleClaimVoucher('UMAROH15')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${
                claimedVouchers.includes('UMAROH15')
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer'
              }`}
            >
              {claimedVouchers.includes('UMAROH15') ? '✓ CLAIMED' : 'KLAIM'}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4 flex items-center justify-between relative overflow-hidden group">
            <div className="absolute -left-2 top-0 bottom-0 w-3 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-r-md"></div>
            <div className="flex-1 pl-4">
              <h3 className="font-extrabold text-gray-900 text-sm leading-tight">FREE ONGKIR PERLENGKAPAN</h3>
              <p className="text-[10px] text-gray-400 font-medium">Spesial Diskon Pembelian Perlengkapan</p>
              <div className="mt-2 text-[10px] font-mono text-indigo-600 bg-indigo-50 inline-block px-1.5 py-0.5 rounded font-black border border-indigo-100">KODE: GRATISONGKIR</div>
            </div>
            <button
              onClick={() => handleClaimVoucher('GRATISONGKIR')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${
                claimedVouchers.includes('GRATISONGKIR')
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
              }`}
            >
              {claimedVouchers.includes('GRATISONGKIR') ? '✓ CLAIMED' : 'KLAIM'}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 flex items-center justify-between relative overflow-hidden group">
            <div className="absolute -left-2 top-0 bottom-0 w-3 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-r-md"></div>
            <div className="flex-1 pl-4">
              <h3 className="font-extrabold text-gray-900 text-sm leading-tight">CASHBACK PANDUAN PENGINAPAN</h3>
              <p className="text-[10px] text-gray-400 font-medium">Bebas Pajak & Diskon Porter Bandara</p>
              <div className="mt-2 text-[10px] font-mono text-emerald-600 bg-emerald-50 inline-block px-1.5 py-0.5 rounded font-black border border-emerald-100">KODE: UMAROHPORTER</div>
            </div>
            <button
              onClick={() => handleClaimVoucher('UMAROHPORTER')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${
                claimedVouchers.includes('UMAROHPORTER')
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
              }`}
            >
              {claimedVouchers.includes('UMAROHPORTER') ? '✓ CLAIMED' : 'KLAIM'}
            </button>
          </div>

        </div>
      </div>

      {/* Shopee-style Flash Sale Section */}
      <div id="flash-sale-section" className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="bg-gradient-to-r from-rose-600 via-red-650 to-orange-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-xl md:text-2xl font-black italic tracking-wider flex items-center gap-1">
                ⚡ FLASH SALE UMAROH
              </span>
              <div className="flex items-center gap-1 text-xs font-mono font-black text-gray-900">
                <span className="bg-amber-400 px-2.5 py-1 rounded-lg shadow-sm">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-white">:</span>
                <span className="bg-amber-400 px-2.5 py-1 rounded-lg shadow-sm">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-white">:</span>
                <span className="bg-amber-400 px-2.5 py-1 rounded-lg shadow-sm">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>
            <button 
              onClick={() => handleShortcutFilter('')}
              className="text-xs font-extrabold bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl uppercase tracking-wider transition-all duration-200"
            >
              Lihat Semua Promo ➔
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Promo item 1 */}
            <div 
              onClick={() => handleShortcutFilter('Executive')}
              className="bg-white rounded-2xl overflow-hidden shadow-md text-gray-900 duration-200 transition-all hover:shadow-2xl cursor-pointer flex flex-col group"
            >
              <div className="h-40 bg-gray-100 relative">
                <img 
                  src="https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=400&auto=format&fit=crop" 
                  alt="Umroh Executive" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">DISKON Rp 2,5 JUTA</div>
              </div>
              <div className="p-4 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 line-clamp-1">Paket Umroh Hari Raya Executive Bintang 5</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-rose-600 font-extrabold text-base">Rp 29.500.000</span>
                    <span className="text-gray-400 text-xs line-through">Rp 32.000.000</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-100 rounded-full h-3.5 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-500 to-orange-500 w-[85%] rounded-full"></div>
                    <span className="relative z-10 text-[9px] font-black text-gray-900">SISA 3 SLOT LAGI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Promo item 2 */}
            <div 
              onClick={() => handleShortcutFilter('Haji')}
              className="bg-white rounded-2xl overflow-hidden shadow-md text-gray-900 duration-200 transition-all hover:shadow-2xl cursor-pointer flex flex-col group"
            >
              <div className="h-40 bg-gray-100 relative">
                <img 
                  src="https://images.unsplash.com/photo-1565552643983-61629090f4fa?q=80&w=400&auto=format&fit=crop" 
                  alt="Haji Furoda" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">LIMIT 3 SEAT</div>
              </div>
              <div className="p-4 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 line-clamp-1">Haji Furoda Makbul VIP Direct Flight</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-rose-600 font-extrabold text-base">Rp 235.000.000</span>
                    <span className="text-gray-400 text-xs line-through">Rp 245.000.000</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-100 rounded-full h-3.5 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-500 to-orange-500 w-[95%] rounded-full"></div>
                    <span className="relative z-10 text-[9px] font-black text-white">HAMPIR HABIS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Promo item 3 */}
            <div 
              onClick={() => handleShortcutFilter('Promo')}
              className="bg-white rounded-2xl overflow-hidden shadow-md text-gray-900 duration-200 transition-all hover:shadow-2xl cursor-pointer flex flex-col group"
            >
              <div className="h-40 bg-gray-100 relative">
                <img 
                  src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=400&auto=format&fit=crop" 
                  alt="Umroh Promo" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">HEMAT Rp 1,5 JUTA</div>
              </div>
              <div className="p-4 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 line-clamp-1">Paket Umroh Hemat Awal Musim Al-Ghazali</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-rose-600 font-extrabold text-base">Rp 24.500.000</span>
                    <span className="text-gray-400 text-xs line-through">Rp 26.000.000</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-100 rounded-full h-3.5 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-500 to-orange-500 w-[60%] rounded-full"></div>
                    <span className="relative z-10 text-[9px] font-black text-gray-900">TERSEDIA 5 SLOT</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Shopee-style Perlengkapan Shop Section */}
      <div id="shop-section" className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-black text-gray-800 uppercase tracking-tight">TOKO PERLENGKAPAN PERSIAPAN HAJI & UMROH</h2>
          </div>
          <span className="text-xs text-emerald-600 font-extrabold bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">UMAROH SHOP</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {shopProducts.map((p) => (
            <div 
              key={p.id}
              onClick={() => {
                setSelectedProduct(p);
                setBuyQty(1);
              }}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="h-32 bg-gray-100 relative overflow-hidden">
                <img 
                  src={p.image} 
                  alt={p.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[8px] font-mono font-bold px-1.5 py-0.5 rounded">
                  {p.weight}
                </div>
              </div>

              <div className="p-3 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-[11px] text-gray-800 line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">
                    {p.name}
                  </h3>
                  
                  <div className="mt-1.5 flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span className="text-[10px] font-bold text-gray-650">{p.rating}</span>
                    <span className="text-gray-300 text-[10px]">|</span>
                    <span className="text-[10px] text-gray-400">{p.sold} Terjual</span>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-black text-amber-600">Rp {p.price.toLocaleString('id-ID')}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Stok: {p.stock}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Pocket Guide - Buku Panduan Manasik Saku */}
      <div id="manasik-section" className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-black text-gray-850 uppercase tracking-tight">MANASIK SAKU DIGITAL & TRACKER RUKUN</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Step Selection Panel */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">URUTAN PROSEDUR RUKUN</p>
              {manasikSteps.map((step, idx) => {
                const isStepCompleted = completedSteps.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentManasikStep(idx)}
                    className={`w-full p-3.5 rounded-xl text-left transition-all border flex items-center justify-between ${
                      currentManasikStep === idx 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                        : isStepCompleted 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
                          : 'bg-gray-50 border-gray-150 text-gray-700 hover:bg-gray-105'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                        currentManasikStep === idx 
                          ? 'bg-white text-indigo-600' 
                          : isStepCompleted 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-gray-200 text-gray-700'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-extrabold text-xs">{step.title}</span>
                    </div>
                    {isStepCompleted && <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Active Step Reader Viewer */}
            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-150 flex flex-col justify-between md:col-span-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Langkah Ke-{currentManasikStep + 1}
                  </span>
                  
                  {/* Complete/Reset State trigger */}
                  <button
                    onClick={() => {
                      if (completedSteps.includes(currentManasikStep)) {
                        setCompletedSteps(prev => prev.filter(c => c !== currentManasikStep));
                        if (currentManasikStep === 1) setTawafRounds(0);
                        if (currentManasikStep === 2) setSaiRounds(0);
                      } else {
                        setCompletedSteps(prev => [...prev, currentManasikStep]);
                      }
                    }}
                    className={`text-xs font-black px-3.5 py-1.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                      completedSteps.includes(currentManasikStep)
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {completedSteps.includes(currentManasikStep) ? (
                      <>✔ SELESAI</>
                    ) : (
                      <>TANDAI SELESAI</>
                    )}
                  </button>
                </div>

                <div className="space-y-1">
                  <h3 className="font-black text-gray-900 text-base">{manasikSteps[currentManasikStep].title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{manasikSteps[currentManasikStep].desc}</p>
                </div>

                <div className="p-4 bg-indigo-50/75 rounded-xl border border-indigo-100/50 text-center space-y-2">
                  <p className="text-xl font-bold font-serif text-indigo-950 tracking-wide">{manasikSteps[currentManasikStep].arabic}</p>
                  <p className="text-xs italic font-semibold text-indigo-700 font-mono">"{manasikSteps[currentManasikStep].latin}"</p>
                  <hr className="border-indigo-100/70" />
                  <p className="text-[10px] text-gray-500 font-medium">Arti: {manasikSteps[currentManasikStep].arti}</p>
                </div>

                {/* Interactive Thawaf Round Counter widget */}
                {currentManasikStep === 1 && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mt-2 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-black text-amber-900">PENALAT PUTARAN TAWAF</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Catat hitungan thawaf Kakak saat sedang mengitari ka'bah agar sah.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setTawafRounds(r => Math.max(0, r - 1))}
                        className="bg-white p-1.5 rounded-lg border border-amber-250 cursor-pointer"
                      >
                        <Minus className="w-4 h-4 text-amber-900" />
                      </button>
                      <span className="text-xl font-black text-amber-900 font-mono w-6 text-center">{tawafRounds}/7</span>
                      <button
                        onClick={() => {
                          const nextVal = Math.min(7, tawafRounds + 1);
                          setTawafRounds(nextVal);
                          if (nextVal === 7 && !completedSteps.includes(1)) {
                            setCompletedSteps(prev => [...prev, 1]);
                          }
                        }}
                        className="bg-amber-500 text-white p-2 rounded-lg cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Interactive Sa'i Round Counter widget */}
                {currentManasikStep === 2 && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mt-2 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-black text-amber-900">PENCATAT LINTASAN SA'I</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Catat setiap lintasan Safa-Marwah (7x lintasan terpisah).</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSaiRounds(r => Math.max(0, r - 1))}
                        className="bg-white p-1.5 rounded-lg border border-amber-250 cursor-pointer"
                      >
                        <Minus className="w-4 h-4 text-amber-900" />
                      </button>
                      <span className="text-xl font-black text-amber-900 font-mono w-6 text-center">{saiRounds}/7</span>
                      <button
                        onClick={() => {
                          const nextVal = Math.min(7, saiRounds + 1);
                          setSaiRounds(nextVal);
                          if (nextVal === 7 && !completedSteps.includes(2)) {
                            setCompletedSteps(prev => [...prev, 2]);
                          }
                        }}
                        className="bg-amber-500 text-white p-2 rounded-lg cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

              </div>

              <div className="mt-6 flex items-start gap-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 text-[10px] text-gray-600 font-medium">
                <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                <p><strong>Tips Sahabat AI:</strong> {manasikSteps[currentManasikStep].tips}</p>
              </div>

            </div>

          </div>
        </div>
      </div>

    </div>
  );

  if (jamaahCodeSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col w-full relative">
        {/* Simple elegant sticky header for Portal Mandiri */}
        <header className="bg-emerald-900 border-b border-emerald-800 text-white py-3.5 px-6 sticky top-0 z-40 shadow-sm flex items-center justify-between font-sans print:hidden">
          <div className="flex items-center gap-3">
            <img src={logoBase64} alt="Umaroh Logo" className="h-6 md:h-7 object-contain" referrerPolicy="no-referrer" />
            <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
              🗝️ PORTAL KHUSUS JAMAAH
            </div>
            <span className="hidden sm:inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
            <span className="hidden sm:inline-block text-xs font-bold text-emerald-100">Informasi Keberangkatan & Isian Data Mandiri</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-xs font-black">{bookingData?.namaJamaah || 'Calon Tamu Allah'}</p>
              <p className="text-[10px] text-emerald-300 font-mono tracking-wider">Booking: {bookingData?.kodeBooking}</p>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="bg-red-500/95 hover:bg-red-650 text-white font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Keluar Portal
              </button>
            )}
          </div>
        </header>

        <main className="flex-grow pb-16">
          {renderPendaftaranMandiri()}
        </main>

        {/* PRINTABLE OFFICIAL OVERLAY MODAL */}
        {showPrintKwitansi && bookingData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:relative print:z-0 animate-in fade-in duration-200">
            <div className="bg-white p-8 max-w-3xl w-full rounded-3xl shadow-2xl relative border border-gray-150 flex flex-col gap-6 print:shadow-none print:border-none print:p-0 animate-in zoom-in-95 duration-200">
              
              {/* MODAL CONTROL STRIP */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 print:hidden">
                <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-sm">
                  <Printer className="w-5 h-5 text-emerald-600" />
                  Kwitansi Pelunasan & Faktur Tagihan Jamaah
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Print
                  </button>
                  <button
                    onClick={() => setShowPrintKwitansi(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              {/* INVOICE CONTENT (PAPER STYLE) */}
              <div id="printable-kwitansi-area" className="bg-white p-6 md:p-8 border border-gray-300 md:border-2 border-dashed rounded-2xl relative w-full font-sans text-gray-800 print:border-none print:p-0">
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    body * {
                      visibility: hidden !important;
                    }
                    #printable-kwitansi-area, #printable-kwitansi-area * {
                      visibility: visible !important;
                    }
                    #printable-kwitansi-area {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      border: none !important;
                    }
                  }
                `}} />

                <div className="flex flex-col md:flex-row justify-between gap-6 pb-6 border-b border-gray-200">
                  <div className="space-y-1">
                    <img 
                      src="https://umaroh.com/assets/logo-light-D4UzTX0_.png" 
                      alt="Logo" 
                      className="h-10 object-contain bg-[#055734] p-2 rounded-lg pointer-events-none select-none"
                      referrerPolicy="no-referrer"
                    />
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">PT Nawaitul Umrah Haji</p>
                  </div>
                  <div className="md:text-right font-sans text-xs">
                    <h3 className="text-sm font-black text-emerald-800">KWITANSI RESMI PELUNASAN</h3>
                    <p className="font-mono text-gray-500 mt-1">No: {bookingData.kodeBooking || 'BELUM DIATUR'}</p>
                    <p className="text-gray-400 mt-0.5 font-sans">Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-gray-150 text-xs text-gray-600 font-sans">
                  <div className="space-y-1.5">
                    <p className="uppercase text-[9px] font-black text-gray-400 tracking-wider">Dibayarkan Oleh (Jamaah)</p>
                    <p className="font-extrabold text-sm text-gray-901">{bookingData.nama_paspor || bookingData.namaJamaah}</p>
                    <p>No. HP: {bookingData.noHp || 'Tidak Tercantum'}</p>
                    <p className="line-clamp-2">Alamat: {bookingData.alamat || 'Tidak Tercantum'}</p>
                  </div>
                  <div className="md:text-right space-y-1.5">
                    <p className="uppercase text-[9px] font-black text-gray-400 tracking-wider">Rincian Paket Terpilih</p>
                    <p className="font-extrabold text-xs text-gray-901">{bookingData.paketNama}</p>
                    <p>Konfigurasi: {bookingData.roomType} Room</p>
                    <p>Status Seat: <span className="font-extrabold text-emerald-700 uppercase">{bookingData.statusKeberangkatan || 'TERDAFTAR'}</span></p>
                  </div>
                </div>

                <div className="py-6 space-y-4">
                  <div className="flex justify-between items-center text-xs font-sans">
                    <span className="font-bold text-gray-500">Harga Paket Dasar:</span>
                    <span className="font-mono font-bold text-gray-900">Rp {Number(bookingData.totalHarga || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-emerald-800 font-bold border-t border-gray-100 pt-3 font-sans">
                    <span>Jumlah yang Telah Dibayar:</span>
                    <span className="font-mono font-black text-base text-emerald-700">Rp {Number(bookingData.jumlahBayar || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-3 font-sans">
                    <span className="font-bold text-gray-500">Sisa Tagihan Pelunasan:</span>
                    <span className={`font-mono font-black ${(bookingData.totalHarga - bookingData.jumlahBayar) > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                      Rp {Number(bookingData.totalHarga - bookingData.jumlahBayar).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 text-[10px] text-gray-400 font-sans leading-relaxed mt-4">
                  <p className="font-bold text-gray-700 mb-1">Syarat & Ketentuan Penting:</p>
                  <p>1. Kwitansi ini diterbitkan secara elektronik oleh sistem Umaroh Nawaitul dan sah sebagai tanda bukti pembayaran pelunasan resmi.</p>
                  <p>2. Pembayaran yang sah wajib melalui transfer ke rekening penampungan resmi PT Nawaitul Umrah Haji atau Mitra berlisensi.</p>
                  <p>3. Harap simpan cetakan fisik kwitansi ini untuk persiapan saat melakukan proses check-in keberangkatan paspor bandara.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating CS Bot button on the corner */}
        <button
          onClick={() => setShowAiChat(true)}
          className="fixed bottom-6 right-6 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black p-4 rounded-full shadow-2xl z-40 flex items-center justify-center transition-all cursor-pointer border border-amber-400 animate-bounce"
          title="Sahabat AI Assistant"
        >
          <Sparkles className="w-6 h-6" />
        </button>

        {/* CS Bot Drawer */}
        {showAiChat && (
          <div className="fixed inset-0 bg-black/50 z-[110] flex justify-end animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
              
              {/* Header CS bot */}
              <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">
                    ✨
                  </div>
                  <div>
                    <h3 className="font-black text-xs font-sans">NAWAITUL UMRAH AI</h3>
                    <p className="text-[8px] text-emerald-25 tracking-wide flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE CS PINTAR
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAiChat(false)}
                  className="hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer text-white border-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 font-sans">
                {chatLog.map((log, idx) => (
                  <div 
                    key={idx} 
                    className={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs font-medium space-y-1 ${
                      log.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-white border border-gray-150 text-gray-800 rounded-tl-none shadow-sm leading-relaxed'
                    }`}>
                      {log.content}
                    </div>
                  </div>
                ))}

                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-150 text-gray-400 rounded-2xl rounded-tl-none p-3 text-xs shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input for AI chatbot */}
              <div className="p-4 border-t border-gray-150 bg-white flex items-center gap-2 font-sans">
                <input
                  type="text"
                  placeholder="Ketik pesan konsultasi paspor, vaksin, hotel..."
                  value={aiMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendPrompt();
                  }}
                  className="flex-grow bg-gray-55 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  onClick={() => handleSendPrompt()}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition font-sans cursor-pointer"
                >
                  Kirim
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col lg:flex-row relative w-full">
      
      {/* Desktop Sidebar (lg Screen) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:left-0 lg:bg-white lg:border-r lg:border-gray-200 lg:z-30 lg:overflow-y-auto print:hidden">
        {/* Sidebar Brand Header */}
        <div className="p-5 border-b border-gray-150 flex flex-col gap-3 items-center bg-white">
          <div className="bg-[#F5B800] py-3.5 px-6 w-full flex items-center justify-center rounded-2xl shadow-md border border-[#D9A300]/10">
            <img 
              src={logoBase64} 
              alt="Logo Umaroh" 
              className="h-8 object-contain max-w-full" 
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-[10px] font-bold tracking-widest text-[#856000] uppercase mt-1 text-center font-sans">
            PORTAL JAMAAH NAWAITUL
          </span>

          <div className="bg-[#FFFBEB]/60 p-3 rounded-xl border border-amber-200/40 w-full flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-[#B28200] flex items-center justify-center font-bold text-xs uppercase">
              {(bookingData?.nama_paspor || bookingData?.namaJamaah || auth.currentUser?.displayName || 'JU').substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <span className="block truncate text-[10px] font-black text-slate-850 uppercase tracking-tight">
                {bookingData?.nama_paspor || bookingData?.namaJamaah || auth.currentUser?.displayName || 'JAMAAH UMAROH'}
              </span>
              <span className="block text-[8px] text-[#B28200] font-black uppercase tracking-widest mt-0.5">
                JAMAAH MEMBER ACCESS
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 p-4 space-y-4">
          
          {/* Category: PORTAL UTAMA */}
          <div className="space-y-1">
            <span className="bg-[#FFFDF0] text-[#B28200] font-black uppercase text-[9px] tracking-wider px-3.5 py-1.5 rounded-lg block font-sans border border-amber-100/30">
              🕋 1. PORTAL UTAMA
            </span>

            {bookingData && (
              <button
                onClick={() => {
                  setActiveTab('pendaftaran_mandiri');
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'pendaftaran_mandiri' 
                    ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                    : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
                }`}
              >
                <span className="text-sm">🕌</span>
                Portal Mandiri
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab('overview');
                setKatalogSearch('');
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === 'overview' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : 'text-slate-655 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${activeTab === 'overview' ? 'text-slate-900' : 'text-gray-500'}`} />
              Rekomendasi
            </button>

            <button
              onClick={() => {
                setActiveTab('katalog');
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === 'katalog' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : 'text-slate-655 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <Package className={`w-4 h-4 ${activeTab === 'katalog' ? 'text-slate-900' : 'text-gray-500'}`} />
              Katalog Paket
            </button>
          </div>

          {/* Category: TRANSAKSI & AKUN */}
          <div className="space-y-1">
            <span className="bg-[#FFFDF0] text-[#B28200] font-black uppercase text-[9px] tracking-wider px-3.5 py-1.5 rounded-lg block font-sans border border-amber-100/30">
              📋 2. TRANSAKSI & AKUN
            </span>

            <button
              onClick={() => {
                setActiveTab('riwayat');
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer relative ${
                activeTab === 'riwayat' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : 'text-slate-655 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <History className={`w-4 h-4 ${activeTab === 'riwayat' ? 'text-slate-900' : 'text-gray-500'}`} />
              Pesanan Saya
              {shopOrders.length > 0 && (
                <span className="absolute right-4 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                  {shopOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('profile');
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === 'profile' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : 'text-slate-655 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <User className={`w-4 h-4 ${activeTab === 'profile' ? 'text-slate-900' : 'text-gray-500'}`} />
              ProfilKu
            </button>
          </div>
        </nav>

        {/* Sidebar Footer Ask AI */}
        <div className="p-4 border-t border-gray-150">
          <button 
            onClick={() => setShowAiChat(true)}
            className="w-full flex items-center justify-center gap-2 text-xs font-black bg-amber-500 hover:bg-amber-600 text-gray-950 py-3 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            TANYA SAHABAT AI
          </button>
        </div>
      </aside>

      {/* Right-side Main Content Pane */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen w-full">
        {/* Mobile Sidebar Full Menu Overlay for Pilgrims (Jamaah) */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
              onClick={() => setIsMobileMenuOpen(false)} 
            />
            {/* Drawer content */}
            <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-white text-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-left duration-250">
              {/* Header */}
              <div className="p-5 border-b border-gray-150 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-[#F5B800] p-1.5 rounded-lg">
                    <img src={logoBase64} alt="Umaroh Logo" className="h-6 w-auto" />
                  </div>
                  <div className="text-left">
                    <span className="font-black text-xs uppercase tracking-wider text-emerald-800 block">Portal Jamaah</span>
                    <span className="text-[9px] font-bold text-gray-400 block uppercase">Nawaitul Access</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-1.5 rounded-xl bg-gray-100 text-gray-500 hover:text-gray-700 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Category 1: Portal Utama */}
                <div className="space-y-1.5">
                  <span className="block text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-left">
                    🕋 1. PORTAL UTAMA
                  </span>
                  
                  {bookingData && (
                    <button
                      onClick={() => {
                        setActiveTab('pendaftaran_mandiri');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                        activeTab === 'pendaftaran_mandiri' 
                          ? 'bg-[#F5B800] text-slate-900 shadow-sm font-black' 
                          : 'text-slate-655 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm">🕌</span>
                      Portal Mandiri
                    </button>
                  )}

                  {[
                    { id: 'overview', label: 'Rekomendasi', icon: LayoutDashboard },
                    { id: 'katalog', label: 'Katalog Paket', icon: Package },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as JamaahTab);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                          isActive 
                            ? 'bg-[#F5B800] text-slate-900 shadow-sm font-black' 
                            : 'text-slate-655 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900' : 'text-gray-500'}`} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {/* Category 2: Transaksi & Akun */}
                <div className="space-y-1.5">
                  <span className="block text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-left">
                    📋 2. TRANSAKSI & AKUN
                  </span>
                  {[
                    { id: 'riwayat', label: 'Pesanan & Belanjaan', icon: History },
                    { id: 'profile', label: 'ProfilKu', icon: User },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as JamaahTab);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                          isActive 
                            ? 'bg-[#F5B800] text-slate-900 shadow-sm font-black' 
                            : 'text-slate-655 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900' : 'text-gray-500'}`} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer / Logout */}
              <div className="p-4 border-t border-gray-150 bg-gray-50/50">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-150 bg-red-50 text-red-700 border border-red-150 hover:bg-red-100 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar Akun (Logout)
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Master Admin Switcher Banner */}
        {isMasterAdmin && pilgrimBookings.length > 0 && (
          <div className="bg-amber-400 text-slate-950 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-amber-500 shadow-sm sticky top-0 z-45 shrink-0 font-sans">
            <div className="flex items-center gap-2">
              <span className="text-sm">🛠️</span>
              <div>
                <p className="text-xs font-black uppercase tracking-wider">MASTER ADMIN PREVIEW MODE</p>
                <p className="text-[10px] text-zinc-900 font-bold">Pilih booking jamaah di bawah ini untuk melihat portofolio portal jamaahnya.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-extrabold whitespace-nowrap">Pilih Jamaah:</span>
              <select
                value={selectedBookingId}
                onChange={(e) => {
                  setSelectedBookingId(e.target.value);
                  const found = pilgrimBookings.find(b => b.id === e.target.value);
                  if (found) {
                    setBookingData(found);
                  }
                }}
                className="text-xs font-black bg-white text-gray-900 border border-amber-500 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-amber-600 w-full sm:w-72 cursor-pointer shadow-xs"
              >
                {pilgrimBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.namaJamaah || b.nama_paspor || 'Tanpa Nama'} ({b.kodeBooking || b.id}) - {b.packageName || 'No Paket'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        
        {/* Search Header (Shopee Style) */}
      <div className="bg-emerald-800 text-white pt-4 pb-5 px-4 md:px-6 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                title="Buka Menu"
              >
                <Menu className="w-5 h-5 text-white" />
              </button>
              <span className="text-[11px] bg-amber-500 text-slate-950 font-black px-2 py-1 rounded">MARKET</span>
            </div>

            {/* Shopee Smart AI bubble indicator */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="relative">
                <button 
                  onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                  className="bg-white/20 p-2 rounded-full relative hover:bg-white/30 cursor-pointer flex items-center justify-center"
                >
                  <Bell className="w-4 h-4 text-white" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-emerald-850">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>

                {showNotificationDropdown && (
                  <div className="absolute right-0 mt-3.5 w-76 bg-white rounded-2xl border border-gray-100 shadow-2xl z-50 overflow-hidden text-gray-900 animate-in fade-in duration-200">
                    <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                      <span className="text-xs font-black uppercase tracking-wider text-gray-800">Notifikasi</span>
                      {notifications.filter(n => !n.read).length > 0 && (
                        <button 
                          onClick={async () => {
                            await markAllNotificationsAsRead(notifications);
                          }}
                          className="text-[10px] font-extrabold text-emerald-800 hover:underline uppercase tracking-wider"
                        >
                          Baca Semua
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-400">
                          <p className="text-[11px] font-bold">Belum ada notifikasi.</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id}
                            onClick={async () => {
                              if (!notif.read) await markNotificationAsRead(notif.id);
                            }}
                            className="p-3 text-left hover:bg-gray-50 cursor-pointer"
                          >
                            <p className="text-xs font-bold text-gray-900">{notif.title}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowAiChat(true)}
                className="bg-white/20 p-2 rounded-full relative hover:bg-white/30"
              >
                <MessageCircle className="w-4 h-4 text-amber-300" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-emerald-800"></span>
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="flex-1 flex gap-2 items-center bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20 w-full">
            <Search className="w-4 h-4 text-white/75" />
            <input 
              type="text"
              placeholder="Cari kebutuhan umroh, baju ihram, sabuk thawaf, hotel Mekkah..."
              value={katalogSearch}
              onChange={(e) => setKatalogSearch(e.target.value)}
              className="bg-transparent text-white placeholder-emerald-100/70 border-none outline-none text-xs w-full font-medium"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setActiveTab('katalog');
                }
              }}
            />
            {katalogSearch && (
              <button onClick={() => setKatalogSearch('')}>
                <X className="w-4 h-4 text-white/50 hover:text-white" />
              </button>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {/* Real-time Notifications Bell for Jamaah Desktop */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="bg-white/15 p-2 px-3 rounded-xl relative hover:bg-white/25 active:scale-95 transition-all text-white cursor-pointer flex items-center justify-center border border-white/10"
                title="Notifikasi Saya"
              >
                <Bell className="w-4 h-4 text-white" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-emerald-800 shadow-sm">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {showNotificationDropdown && (
                <div className="absolute right-0 mt-3.5 w-96 bg-white rounded-2xl border border-gray-100 shadow-2xl z-50 overflow-hidden text-gray-900 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-gray-800">Notifikasi</span>
                      {notifications.filter(n => !n.read).length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {notifications.filter(n => !n.read).length} Baru
                        </span>
                      )}
                    </div>
                    {notifications.filter(n => !n.read).length > 0 && (
                      <button 
                        onClick={async () => {
                          await markAllNotificationsAsRead(notifications);
                        }}
                        className="text-[10px] font-extrabold text-emerald-800 hover:underline uppercase tracking-wider cursor-pointer"
                      >
                        Baca Semua
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-gray-500" />
                        <p className="text-xs font-bold uppercase tracking-wider">Belum Ada Notifikasi</p>
                        <p className="text-[10px] text-gray-400 mt-1">Anda akan menerima info keberangkatan, rincian biaya, & info visa di sini.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        let badgeBg = 'bg-blue-50 text-blue-600 border-blue-100';
                        let Icon = Info;
                        
                        if (notif.type === 'success') {
                          badgeBg = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                          Icon = Check;
                        } else if (notif.type === 'warning') {
                          badgeBg = 'bg-amber-50 text-amber-600 border-amber-100';
                          Icon = AlertTriangle;
                        } else if (notif.type === 'error') {
                          badgeBg = 'bg-rose-50 text-rose-600 border-rose-100';
                          Icon = X;
                        } else if (notif.type === 'broadcast') {
                          badgeBg = 'bg-indigo-50 text-indigo-600 border-indigo-100';
                          Icon = Sparkles;
                        }
                        
                        return (
                          <div 
                            key={notif.id} 
                            onClick={async () => {
                              if (!notif.read) {
                                await markNotificationAsRead(notif.id);
                              }
                            }}
                            className={`p-4 flex gap-3 hover:bg-gray-50 transition-colors cursor-pointer text-left ${!notif.read ? 'bg-indigo-50/10' : ''}`}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${badgeBg}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-xs text-gray-950 leading-snug ${!notif.read ? 'font-extrabold' : 'font-medium'}`}>
                                  {notif.title}
                                </p>
                                {!notif.read && (
                                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-600 mt-1 leading-relaxed">
                                {notif.message}
                              </p>
                              <span className="text-[8px] font-mono font-bold text-gray-450 block mt-1 uppercase">
                                {new Date(notif.createdAt).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowAiChat(true)}
              className="flex items-center gap-1.5 text-xs font-black bg-amber-500 hover:bg-amber-600 text-gray-950 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer shadow border border-amber-400"
            >
              <Sparkles className="w-4 h-4" />
              TANYA SAHAT AI
            </button>
          </div>

        </div>
      </div>

      {/* Main Container Area */}
      <div className="flex-grow">
        {selectedMitraId ? (
          <div className="p-6 max-w-7xl mx-auto w-full">
            <ProfileView isDesktop={true} mitraId={selectedMitraId} onBack={() => setSelectedMitraId(null)} />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'pendaftaran_mandiri' && renderPendaftaranMandiri()}
            {activeTab === 'katalog' && (
              <div className="p-6 max-w-7xl mx-auto w-full">
                <KatalogPaketView initialSearch={katalogSearch} onViewMitra={(mitraId) => setSelectedMitraId(mitraId)} />
              </div>
            )}
            
            {/* Riwayat Tab (Enhanced with Shopee Physical Shop orders) */}
            {activeTab === 'riwayat' && (
              <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
                
                {/* Split Screen Tabs */}
                <div className="flex border-b border-gray-150 gap-2">
                  <button
                    onClick={() => setHistoryTab('paket')}
                    className={`pb-3 text-sm font-black px-4 relative ${
                      historyTab === 'paket' 
                        ? 'text-emerald-700' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Paket Umroh & Haji Saya
                    {historyTab === 'paket' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700 rounded"></div>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setHistoryTab('perlengkapan')}
                    className={`pb-3 text-sm font-black px-4 relative flex items-center gap-2 ${
                      historyTab === 'perlengkapan' 
                        ? 'text-emerald-700' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Belanjaan Perlengkapan Saya
                    {shopOrders.length > 0 && (
                      <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                        {shopOrders.length}
                      </span>
                    )}
                    {historyTab === 'perlengkapan' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-700 rounded"></div>
                    )}
                  </button>
                </div>

                {historyTab === 'paket' ? (
                  <RiwayatPemesananView />
                ) : (
                  <div className="space-y-4">
                    <h2 className="text-lg font-black text-gray-900">Riwayat Pembelian Perlengkapan</h2>
                    {shopOrders.length === 0 ? (
                      <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                        <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">Belum ada pemesanan perlengkapan saku Kak. Belanja kebutuhan Ihram sekarang di Beranda.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {shopOrders.map((order) => (
                          <div key={order.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                              <div className="flex items-center justify-between mb-3 text-[10px]">
                                <span className="text-gray-400 font-mono font-bold">ID: #{order.id.substring(0, 8)}</span>
                                <span className="bg-emerald-55 text-emerald-75 font-black px-2 py-0.5 rounded-full uppercase scale-95">
                                  {order.status}
                                </span>
                              </div>

                              <h3 className="font-extrabold text-xs text-gray-900">{order.productName}</h3>
                              <p className="text-[10px] text-gray-400 mt-0.5">Jumlah: {order.quantity} Pcs | Harga: Rp {order.productPrice.toLocaleString('id-ID')}</p>
                              
                              <div className="bg-gray-50 p-2.5 rounded-xl text-[10px] text-gray-500 mt-3 space-y-1">
                                <p><strong>Kurir:</strong> {order.shippingVendor}</p>
                                {order.noResi && <p className="text-emerald-700"><strong>No. Resi:</strong> {order.noResi} 📋</p>}
                                <p className="line-clamp-2"><strong>Alamat:</strong> {order.shippingAddress}</p>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                              <span className="text-[10px] text-gray-400">Total Pembayaran ({order.paymentMethod})</span>
                              <span className="font-black text-amber-600 text-sm">Rp {order.totalCost.toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {activeTab === 'profile' && (
              <div className="p-6 max-w-7xl mx-auto w-full">
                <ProfileView forceRole="jamaah" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast Notification for claiming voucher */}
      {showVoucherToast && (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 bg-gray-900 border border-gray-800 text-white px-5 py-4 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom duration-300 md:max-w-md">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-500 p-1 rounded-full text-white">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-400">✓ KLAIM VOUCHER BERHASIL!</p>
              <p className="text-[11px] text-gray-300 mt-1">Kode kupon <strong>{showVoucherToast}</strong> berhasil disalin ke clipboard Anda. Silakan isi form diskon saat pembelian paket.</p>
            </div>
          </div>
        </div>
      )}

      {/* Shopee-style Virtual CS AI chatbot Drawer */}
      {showAiChat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            
            {/* Header CS bot */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">
                  ✨
                </div>
                <div>
                  <h3 className="font-black text-xs">NAWAITUL UMRAH AI</h3>
                  <p className="text-[8px] text-emerald-25 tracking-wide flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE CS PINTAR
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAiChat(false)}
                className="hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat logs body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              
              {chatLog.map((log, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs font-medium space-y-1 ${
                    log.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-white border border-gray-150 text-gray-800 rounded-tl-none shadow-sm leading-relaxed'
                  }`}>
                    {log.content}
                  </div>
                </div>
              ))}

              {isAiTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-150 text-gray-400 rounded-2xl rounded-tl-none p-3 text-xs shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}

            </div>

            {/* AI Preset Quick reply buttons */}
            <div className="p-3 bg-white border-t border-gray-150">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-2">Tanya Cepat Saku</p>
              <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">
                <button
                  onClick={() => handleSendPrompt("Bolehkah memakai sandal biasa saat ihram?")}
                  className="bg-gray-100 hover:bg-gray-150 text-gray-700 text-[10px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-colors border border-gray-200"
                >
                  Sandal Saat Ihram? 🩴
                </button>
                <button
                  onClick={() => handleSendPrompt("Apa saja rukun umroh secara berurutan?")}
                  className="bg-gray-100 hover:bg-gray-150 text-gray-700 text-[10px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-colors border border-gray-200"
                >
                  Rukun Umroh? 🕌
                </button>
                <button
                  onClick={() => handleSendPrompt("Apakah koper kabin dapat tas jaring sandal gratis?")}
                  className="bg-gray-100 hover:bg-gray-150 text-gray-700 text-[10px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-colors border border-gray-200"
                >
                  Bonus Tas Umaroh? 🎁
                </button>
              </div>
            </div>

            {/* Input message footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-150 flex items-center gap-2">
              <input
                type="text"
                placeholder="Ketik pertanyaan untuk CS Sahabat Umaroh..."
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendPrompt();
                }}
                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-emerald-500 font-medium text-gray-800"
              />
              <button
                onClick={() => handleSendPrompt()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Shopee-style Product Detail Lightbox Modal (Checkout) */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col justify-between my-8 max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Detail Produk Persiapan</h2>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-colors"
                disabled={isSubmittingOrder}
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* Product Info Row */}
              <div className="flex gap-4 items-start">
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name} 
                  className="w-24 h-24 object-cover rounded-2xl border"
                />
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm text-gray-900 leading-snug">{selectedProduct.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                    <span className="font-bold text-gray-700">{selectedProduct.rating}</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500">{selectedProduct.sold} Terjual</span>
                  </div>
                  <p className="text-base font-black text-amber-600 mt-2">Rp {selectedProduct.price.toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Description body */}
              <div className="space-y-1">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deskripsi Perlengkapan</h4>
                <p className="text-xs text-gray-650 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-150">
                  {selectedProduct.desc}
                </p>
              </div>

              {orderSuccess ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 animate-bounce">
                  <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="font-black text-emerald-900 text-sm">PEMBELIAN PERLENGKAPAN BERHASIL!</h4>
                  <p className="text-xs text-gray-600">Pesanan barang Anda sedang diolah pihak seller. Poin komisi & detail belanjaan akan masuk ke menu riwayat Kakak!</p>
                </div>
              ) : (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Atur Pengiriman & Pembayaran</h4>
                  
                  {/* Qty Selector */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Jumlah Pembelian</span>
                    <div className="flex items-center gap-3.5 bg-gray-100 px-3.5 py-1.5 rounded-xl border">
                      <button
                        onClick={() => setBuyQty(q => Math.max(1, q - 1))}
                        className="text-gray-500 focus:outline-none"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-black font-mono w-5 text-center">{buyQty}</span>
                      <button
                        onClick={() => setBuyQty(q => Math.min(selectedProduct.stock, q + 1))}
                        className="text-gray-500 focus:outline-none"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Shipping Vendor Choice */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500">Pilih Jasa Pengiriman (Kurir Saku)</label>
                    <select
                      value={shippingVendor}
                      onChange={(e) => setShippingVendor(e.target.value)}
                      className="w-full text-xs font-medium bg-gray-55 border border-gray-200 outline-none p-2.5 rounded-xl"
                    >
                      <option value="J&T Express">J&T Express (Regular) - Rp 20.000</option>
                      <option value="Pos Indonesia">Pos Indonesia (Super Kilat) - Rp 20.000</option>
                      <option value="Grab Instant">Grab Instant Same-Day - Rp 20.000</option>
                    </select>
                  </div>

                  {/* Payment Method Choice */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500">Pilih Metode Pembayaran</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full text-xs font-medium bg-gray-55 border border-gray-200 outline-none p-2.5 rounded-xl"
                    >
                      <option value="Transfer Bank BSI">Transfer Virtual Account - Bank Syariah Indonesia (BSI)</option>
                      <option value="Transfer Bank BCA">BCA KlikPay / Transfer Virtual Account</option>
                      <option value="Deposit Saldo Marawa">Potong Saldo Dompet Komisi Umaroh</option>
                    </select>
                  </div>

                  {/* Shipping address input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500">Alamat Pengiriman Lengkap Kakak</label>
                    <textarea
                      placeholder="Masukkan alamat lengkap rumah / hotel atau korespondensi Kakak untuk pengiriman perlengkapan saku..."
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      rows={2}
                      className="w-full text-xs font-medium bg-gray-55 border border-gray-200 outline-none p-3 rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                </div>
              )}

            </div>

            {/* Action Footer Button checkout */}
            {!orderSuccess && (
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-gray-400">Total Harga (Inc. Ongkir):</span>
                  <p className="text-base font-black text-indigo-650">
                    Rp {((selectedProduct.price * buyQty) + 20000).toLocaleString('id-ID')}
                  </p>
                </div>
                <button
                  onClick={handleCheckOutMerch}
                  disabled={isSubmittingOrder}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-lg transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingOrder ? 'MEMPROSES...' : 'SELESAIKAN PEMBELIAN ➔'}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-2 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => {
              setActiveTab('overview');
              setKatalogSearch('');
            }}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'overview' ? 'text-[#C69200] font-black' : 'text-gray-400'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-bold">Rekomendasi</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('katalog');
            }}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'katalog' ? 'text-[#C69200] font-black' : 'text-gray-400'}`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-bold">Katalog</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('riwayat');
            }}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'riwayat' ? 'text-[#C69200] font-black' : 'text-gray-400'}`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] font-bold">Pesanan</span>
          </button>
          
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'profile' ? 'text-[#C69200] font-black' : 'text-gray-400'}`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold">Profil Ku</span>
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-1 w-full h-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-bold">Lainnya</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation (Desktop Only) - Hidden now that left sidebar is active */}
      <div className="hidden bg-white border-b border-gray-200 px-4 py-3 print:hidden shadow-sm sticky top-[72px] z-35">
        <div className="container mx-auto">
          <div className="flex overflow-x-auto md:overflow-x-visible md:flex-wrap no-scrollbar gap-2 pb-1 -mb-1 md:justify-center">
            
            <button
              onClick={() => {
                setActiveTab('overview');
                setKatalogSearch('');
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-extrabold transition-all duration-200 whitespace-nowrap flex-shrink-0 cursor-pointer ${
                activeTab === 'overview' 
                  ? 'bg-emerald-100 text-emerald-800 shadow-sm ring-1 ring-emerald-650/20' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-700" />
              Saku Utama Marketplace
            </button>
            
            <button
              onClick={() => setActiveTab('katalog')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-extrabold transition-all duration-200 whitespace-nowrap flex-shrink-0 cursor-pointer ${
                activeTab === 'katalog' 
                  ? 'bg-orange-100 text-orange-850 shadow-sm ring-1 ring-orange-600/20' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Package className="w-4 h-4 text-orange-700" />
              Katalog Umroh & Haji
            </button>
            
            <button
              onClick={() => {
                setActiveTab('riwayat');
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-extrabold transition-all duration-200 whitespace-nowrap flex-shrink-0 cursor-pointer relative ${
                activeTab === 'riwayat' 
                  ? 'bg-blue-100 text-blue-800 shadow-sm ring-1 ring-blue-600/20' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <History className="w-4 h-4 text-blue-700" />
              Pesanan & Belanjaan Saya
              {shopOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full">
                  {shopOrders.length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-extrabold transition-all duration-200 whitespace-nowrap flex-shrink-0 cursor-pointer ${
                activeTab === 'profile' 
                  ? 'bg-emerald-100 text-emerald-800 shadow-sm ring-1 ring-emerald-650/20' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <User className="w-4 h-4 text-emerald-700" />
              Profil Akun Saya
            </button>

          </div>
        </div>
      </div>

      </div>
    </div>
  );
};
