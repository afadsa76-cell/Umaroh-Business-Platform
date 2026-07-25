import React, { useState, useEffect } from 'react';
import { Wallet, Users, Package, Copy, CheckCircle2, LayoutDashboard, Calendar, User, TrendingUp, Shield, Zap, Target, Sparkles, BarChart2, ArrowUpRight, ArrowDownRight, Send, RefreshCw, Download, Camera, LogOut, Plane, FileText, CheckSquare, MapPin, UserCheck, Search, MessageSquare, Bell, Check, Info, AlertTriangle, X, ShoppingCart, ShoppingBag, Star, Sun, Moon, Plus, Phone } from 'lucide-react';
import { auth, db, doc, onSnapshot, addDoc, collection, query, where, getDocs, handleFirestoreError, OperationType, runTransaction, updateDoc, signOut, serverTimestamp } from '../../firebase';
import { AppNotification } from '../../types';
import { listenToUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, sendNotification } from '../../services/notificationService';
import { PaketMitraView } from './PaketMitraView';
import { KatalogPaketView } from '../packages/KatalogPaketView';
import { JamaahMitraView } from './JamaahMitraView';
import { JaringanMitraView } from './JaringanMitraView';
import { ProfileView } from '../ProfileView';
import { normalizeEmail } from '../../utils/email';
import { ValidasiPaketMitraView } from './ValidasiPaketMitraView';
import { PaketMasterWizard } from '../packages/PaketMasterWizard';
import { FeedKolaborasiView } from '../marketing/FeedKolaborasiView';
import { AIMarketingView } from '../ai/AIMarketingView';
import { AISmartAnalyticsView } from '../ai/AISmartAnalyticsView';
import { FlightTrackerWidget } from '../flights/FlightTrackerWidget';
import { ELearningMitraView } from './ELearningMitraView';
import { AdBanner } from '../marketing/AdBanner';
import { BookOpen, BedDouble, Menu } from 'lucide-react';
import { logoBase64 } from '../../utils/logoBase64';
import { ManifestPage } from '../manifest/ManifestPage';
import { RoomingListMitraView } from './RoomingListMitraView';
import { TaskManagementView } from '../operations/TaskManagementView';

interface MitraBooking {
  id: string;
  namaJamaah?: string;
  nama?: string;
  mitraId?: string;
  paketId?: string;
  paketNama?: string;
  totalHarga?: number;
  harga?: number;
  jumlahBayar?: number;
  total_bayar?: number;
  totalPaid?: number;
  statusPembayaran?: string;
  status?: string;
  docPassport?: boolean;
  docKtp?: boolean;
  docVaccine?: boolean;
  docFoto?: boolean;
}

interface MitraPaketMaster {
  id: string;
  nama: string;
  tglBerangkat?: string;
  tglKepulangan?: string;
  durasiHari?: number;
  maskapaiId: string;
  hotelMakkahId: string;
  hotelMadinahId: string;
  hargaJualQuad?: number;
  hargaDasar?: number;
  kuota?: number;
  sisaKuota?: number;
  targetJamaah?: number;
  photoUtama?: string;
  alurPerjalanan?: string;
  kotaKeberangkatan?: string;
}

interface MitraHotel {
  id: string;
  name: string;
  city?: string;
}

interface MitraMaskapai {
  id: string;
  name: string;
}

interface RecipientUser {
  id: string;
  namaLengkap?: string;
  name?: string;
  email?: string;
}

interface CurrentUserData {
  brandName?: string;
  namaLengkap?: string;
  name?: string;
  logo?: string;
  customMitraProfile?: {
    logo?: string;
  };
}

interface WalletTransaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  status: string;
  description?: string;
  recipientId?: string;
  recipientEmail?: string;
  recipientName?: string;
  senderId?: string;
  senderEmail?: string;
  senderName?: string;
  createdAt?: string;
}

interface MitraShopOrder {
  id: string;
  mitraId?: string | null;
  mitraBrand?: string;
  jamaahId?: string | null;
  jamaahName?: string;
  productName: string;
  productPrice: number;
  quantity: number;
  totalCost: number;
  paymentMethod: string;
  shippingVendor: string;
  shippingAddress: string;
  status: string;
  createdAt?: { seconds: number; nanoseconds: number } | string | null;
  noResi?: string;
  orderType?: 'resmi' | 'custom';
  customBrandName?: string;
}

interface TokoProduct {
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

interface CrmLead {
  id: string;
  name: string;
  phone: string;
  package: string;
  stage: string;
  note: string;
  source: string;
}

type MitraTab = 'overview' | 'tasks' | 'feed' | 'elearning' | 'katalog' | 'paket' | 'validasi' | 'jamaah' | 'jaringan' | 'profile' | 'marketing' | 'analytics' | 'wallet' | 'toko' | 'manifest' | 'roomlist' | 'crm' | 'website';

export const DashboardMitra = () => {
  const [activeTab, setActiveTab] = useState<MitraTab>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('mitraTheme') === 'dark';
  });
  const [showChatDropdown, setShowChatDropdown] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'msg-1',
      sender: 'Admin Umaroh',
      text: "Assalamu'alaikum wr. wb. Mitra Umaroh, mohon segera melengkapi dokumen paspor untuk pendaftaran Jamaah atas nama Budi Santoso.",
      time: '09:30',
      avatar: 'A'
    },
    {
      id: 'msg-2',
      sender: 'Admin Umaroh',
      text: "Info rilis tiket penerbangan Saudia untuk keberangkatan Oktober sudah tersedia di tab Kelola Paket.",
      time: '10:15',
      avatar: 'A'
    }
  ]);
  const [newMsgText, setNewMsgText] = useState('');

  const toggleTheme = () => {
    const nextVal = !isDarkMode;
    setIsDarkMode(nextVal);
    localStorage.setItem('mitraTheme', nextVal ? 'dark' : 'light');
  };
  const [balance, setBalance] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [stats, setStats] = useState({
    totalOmzet: 0,
    paketAktif: 0,
    totalJaringan: 0,
    komisiTarik: 0 
  });

  // Wallet Modals & States
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [bankName, setBankName] = useState<string>('BCA');
  const [bankAccountNo, setBankAccountNo] = useState<string>('');
  const [bankAccountName, setBankAccountName] = useState<string>('');

  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferNote, setTransferNote] = useState<string>('');
  const [recipientUser, setRecipientUser] = useState<RecipientUser | null>(null);
  
  const [isSearchingRecipient, setIsSearchingRecipient] = useState<boolean>(false);
  const [recipientSearchError, setRecipientSearchError] = useState<string>('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState<boolean>(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState<boolean>(false);

  const [currentUserData, setCurrentUserData] = useState<CurrentUserData | null>(null);
  const [sentTransactions, setSentTransactions] = useState<WalletTransaction[]>([]);
  const [recvTransactions, setRecvTransactions] = useState<WalletTransaction[]>([]);
  
   // Toko Perlengkapan & Aksesoris States
  const [mitraShopOrders, setMitraShopOrders] = useState<MitraShopOrder[]>([]);
  const [shopProductsList, setShopProductsList] = useState<TokoProduct[]>([
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
      stock: 500,
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
      stock: 600,
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
      stock: 800,
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
  const [selectedProduct, setSelectedProduct] = useState<TokoProduct | null>(null);
  const [buyQty, setBuyQty] = useState<number>(1);
  const [shippingAddress, setShippingAddress] = useState<string>('');
  const [shippingVendor, setShippingVendor] = useState<string>('J&T Express');
  const [paymentMethod, setPaymentMethod] = useState<string>('Transfer Bank BSI');
  const [orderType, setOrderType] = useState<'resmi' | 'custom'>('resmi');
  const [customBrandName, setCustomBrandName] = useState<string>('');
  const [orderForJamaahId, setOrderForJamaahId] = useState<string>('mitra'); // 'mitra' or booking ID
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);
  const [isTokoHistoryOpen, setIsTokoHistoryOpen] = useState<boolean>(false);
  const [tokoSearch, setTokoSearch] = useState<string>('');

  // CRM Lead Pipeline States
  const [crmLeads, setCrmLeads] = useState<CrmLead[]>([
    { id: 'lead-1', name: 'H. Ahmad Subarjo', phone: '6281234567890', package: 'Umrah Regular Syawal 9 Hari', stage: 'new', note: 'Tertarik paket Quad Bed untuk 4 orang keluarga.', source: 'Instagram' },
    { id: 'lead-2', name: 'Ibu Hajjah Fatimah', phone: '6289876543210', package: 'Umrah VIP Ramadhan 12 Hari', stage: 'contacted', note: 'Sudah dihubungi, berminat bayar DP akhir bulan ini.', source: 'Referral' },
    { id: 'lead-3', name: 'Bpk. Ridwan Hakim', phone: '6285566778899', package: 'Umrah Plus Turki Libur Akhir Tahun', stage: 'follow_up', note: 'Menunggu info jadwal cuti anak sekolah.', source: 'Brosur Masjid' },
    { id: 'lead-4', name: 'Siti Aminah', phone: '6281122334455', package: 'Umrah Hemat Awal Musim Saudia', stage: 'booking', note: 'Sudah booking DP Rp 5jt/pax. Berkas sedang dikumpulkan.', source: 'Website' }
  ]);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadPackage, setNewLeadPackage] = useState('');
  const [newLeadNote, setNewLeadNote] = useState('');
  const [newLeadSource, setNewLeadSource] = useState('Instagram');

  // Website Builder States
  const [brandSlug, setBrandSlug] = useState('berkat-umrah');
  const [heroTitle, setHeroTitle] = useState('Wujudkan Perjalanan Ibadah Umrah yang Khusyu, Aman & Nyaman Bersama Kami');
  const [whatsappHotline, setWhatsappHotline] = useState('6281234567890');
  const [themeColor, setThemeColor] = useState('#055734'); // emerald green
  const [isSavedWebsite, setIsSavedWebsite] = useState(false);
  
  // Real-time collections for dynamic dashboard
  const [bookings, setBookings] = useState<MitraBooking[]>([]);
  const [paketMasters, setPaketMasters] = useState<MitraPaketMaster[]>([]);
  const [hotels, setHotels] = useState<MitraHotel[]>([]);
  const [maskapais, setMaskapais] = useState<MitraMaskapai[]>([]);
  
  const userId = auth.currentUser?.uid;
  const referralLink = `https://umaroh.com/register?ref=${userId}`;

  useEffect(() => {
    if (!userId) return;
    
    // User profile listener
    const userRef = doc(db, 'users', userId);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserData(docSnap.data());
      }
    });

    // Wallet listener
    const walletPath = `wallets/${userId}`;
    const unsubscribeWallet = onSnapshot(doc(db, 'wallets', userId), (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().balance || 0);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, walletPath));

    // Sent Transactions listener
    const qSent = query(collection(db, 'transactions'), where('userId', '==', userId));
    const unsubscribeSent = onSnapshot(qSent, (snapshot) => {
      setSentTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletTransaction)));
    });

    // Received Transactions listener
    const qRecv = query(collection(db, 'transactions'), where('recipientId', '==', userId));
    const unsubscribeRecv = onSnapshot(qRecv, (snapshot) => {
      setRecvTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletTransaction)));
    });

    // Real-time Paket Aktif (Markup)
    const qPaket = query(collection(db, 'paket_mitra'), where('mitraId', '==', userId));
    const unsubscribePaket = onSnapshot(qPaket, (snapshot) => {
      setStats(prev => ({ ...prev, paketAktif: snapshot.size }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'paket_mitra'));

    // Real-time Total Jamaah/Jaringan
    const qJaringan = query(collection(db, 'users'), where('uplineId', '==', userId));
    const unsubscribeJaringan = onSnapshot(qJaringan, (snapshot) => {
      setStats(prev => ({ ...prev, totalJaringan: snapshot.size }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    // Real-time Bookings/Total Omzet
    const qBookings = query(collection(db, 'bookings'), where('mitraId', '==', userId));
    const unsubscribeBookings = onSnapshot(qBookings, (snapshot) => {
      let sum = 0;
      const bks: MitraBooking[] = [];
      snapshot.docs.forEach(docSnap => {
        const d = docSnap.data();
        bks.push({ id: docSnap.id, ...d } as MitraBooking);
        const price = Number(d.totalHarga || d.harga || 0);
        sum += price;
      });
      setBookings(bks);
      setStats(prev => ({ ...prev, totalOmzet: sum }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'bookings'));

    // Real-time Paket Masters
    const unsubscribeMasters = onSnapshot(collection(db, 'paket_master'), (snapshot) => {
      setPaketMasters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MitraPaketMaster)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'paket_master'));

    // Real-time Master Hotels
    const unsubscribeHotels = onSnapshot(collection(db, 'master_hotels'), (snapshot) => {
      setHotels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MitraHotel)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'master_hotels'));

    // Real-time Maskapai
    const unsubscribeMaskapai = onSnapshot(collection(db, 'maskapai'), (snapshot) => {
      setMaskapais(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MitraMaskapai)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'maskapai'));

    // Real-time Notifications Setup
    const unsubscribeNotifications = listenToUserNotifications(userId, 'mitra', (notifs) => {
      setNotifications(notifs);
    });

    // Real-time shop_orders for current Mitra
    const qShopOrders = query(collection(db, 'shop_orders'), where('mitraId', '==', userId));
    const unsubscribeShopOrders = onSnapshot(qShopOrders, (snapshot) => {
      const arr: MitraShopOrder[] = [];
      snapshot.forEach(d => {
        arr.push({ id: d.id, ...d.data() } as MitraShopOrder);
      });
      arr.sort((a, b) => {
        const secondsA = a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt ? a.createdAt.seconds : 0;
        const secondsB = b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt ? b.createdAt.seconds : 0;
        
        const timeA = secondsA ? secondsA * 1000 : new Date((a.createdAt as string) || 0).getTime();
        const timeB = secondsB ? secondsB * 1000 : new Date((b.createdAt as string) || 0).getTime();
        return timeB - timeA;
      });
      setMitraShopOrders(arr);
    });

    // Real-time shop products list from perlengkapan_master
    const unsubscribeShopProducts = onSnapshot(collection(db, 'perlengkapan_master'), (snap) => {
      if (!snap.empty) {
        const arr: TokoProduct[] = [];
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
        setShopProductsList(arr);
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribeWallet();
      unsubscribeSent();
      unsubscribeRecv();
      unsubscribePaket();
      unsubscribeJaringan();
      unsubscribeBookings();
      unsubscribeMasters();
      unsubscribeHotels();
      unsubscribeMaskapai();
      unsubscribeNotifications();
      unsubscribeShopOrders();
      unsubscribeShopProducts();
    };
  }, [userId]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSidebarLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const userRef = doc(db, 'users', userId);
        
        const profileUpdate: {
          logo: string;
          customMitraProfile?: {
            logo?: string;
            [key: string]: unknown;
          };
        } = {
          logo: base64String,
        };
        
        if (currentUserData?.customMitraProfile) {
          profileUpdate.customMitraProfile = {
            ...currentUserData.customMitraProfile,
            logo: base64String,
          };
        } else {
          profileUpdate.customMitraProfile = {
            logo: base64String,
          };
        }
        
        await updateDoc(userRef, profileUpdate);
        console.log("Profile logo updated successfully to Firebase.");
      } catch (err) {
        console.error("Error updating sidebar logo:", err);
        alert("Gagal memperbarui foto profil mitra. Silakan coba lagi.");
      }
    };
    reader.readAsDataURL(file);
  };

  // E-Wallet actions
  const verifyRecipient = async () => {
    if (!recipientEmail) return;
    setIsSearchingRecipient(true);
    setRecipientSearchError('');
    setRecipientUser(null);
    try {
      const q = query(collection(db, 'users'), where('email', '==', normalizeEmail(recipientEmail)));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const uDoc = snap.docs[0];
        const data = uDoc.data();
        if (uDoc.id === userId) {
          setRecipientSearchError('Anda tidak dapat mentransfer saldo ke diri sendiri.');
        } else {
          setRecipientUser({ id: uDoc.id, ...data });
        }
      } else {
        setRecipientSearchError('Email agen tidak ditemukan di sistem.');
      }
    } catch (err) {
      console.error('Error finding user:', err);
      setRecipientSearchError('Gagal mencari akun.');
    } finally {
      setIsSearchingRecipient(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount <= 0) {
      alert('Nominal penarikan tidak valid.');
      return;
    }
    if (withdrawAmount > balance) {
      alert('Saldo Anda tidak mencukupi.');
      return;
    }
    if (!bankName || !bankAccountNo || !bankAccountName) {
      alert('Lengkapi seluruh detail bank Anda.');
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'withdraw',
        amount: withdrawAmount,
        status: 'pending',
        description: `Tarik komisi ke ${bankName} (${bankAccountNo}) a/n ${bankAccountName}`,
        bankName,
        bankAccountNo,
        bankAccountName,
        createdAt: new Date().toISOString()
      });

      // Send real-time notifications
      await sendNotification({
        title: 'Pencairan Komisi Diajukan',
        message: `Permintaan pencairan komisi sebesar Rp ${withdrawAmount.toLocaleString('id-ID')} ke rekening ${bankName} sedang kami proses.`,
        type: 'info',
        targetId: userId,
        targetRole: 'mitra'
      });

      await sendNotification({
        title: 'Permintaan Withdraw Baru',
        message: `Mitra ${currentUserData?.brandName || currentUserData?.namaLengkap || 'Mitra'} mengajukan pencairan komisi sebesar Rp ${withdrawAmount.toLocaleString('id-ID')}.`,
        type: 'warning',
        targetRole: 'admin'
      });

      alert('Permintaan penarikan berhasil dikirim.');
      setShowWithdrawModal(false);
      setWithdrawAmount(0);
      setBankAccountNo('');
      setBankAccountName('');
    } catch (err) {
      console.error('Error withdrawal:', err);
      alert('Gagal mengirim penarikan.');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientUser) {
      alert('Verifikasi akun penerima terlebih dahulu.');
      return;
    }
    if (transferAmount <= 0) {
      alert('Nominal transfer harus lebih besar dari Rp0.');
      return;
    }
    if (transferAmount > balance) {
      alert('Saldo Anda tidak mencukupi.');
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      await runTransaction(db, async (txn) => {
        const senderWalletRef = doc(db, 'wallets', userId!);
        const recipientWalletRef = doc(db, 'wallets', recipientUser.id);

        const senderSnap = await txn.get(senderWalletRef);
        if (!senderSnap.exists()) {
          throw new Error('Dompet Anda belum diinisialisasi.');
        }

        const senderBal = senderSnap.data().balance || 0;
        if (senderBal < transferAmount) {
          throw new Error('Saldo Anda tidak mencukupi.');
        }

        const recipientSnap = await txn.get(recipientWalletRef);
        const recipientBal = recipientSnap.exists() ? (recipientSnap.data().balance || 0) : 0;

        txn.update(senderWalletRef, {
          balance: senderBal - transferAmount,
          updatedAt: new Date().toISOString()
        });

        if (recipientSnap.exists()) {
          txn.update(recipientWalletRef, {
            balance: recipientBal + transferAmount,
            updatedAt: new Date().toISOString()
          });
        } else {
          txn.set(recipientWalletRef, {
            balance: transferAmount,
            userId: recipientUser.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }

        const transDocRef = doc(collection(db, 'transactions'));
        txn.set(transDocRef, {
          userId: userId!,
          type: 'transfer',
          amount: transferAmount,
          status: 'success',
          description: transferNote ? `Transfer: ${transferNote}` : `Kirim saldo ke ${recipientUser.namaLengkap || recipientUser.name || recipientUser.email}`,
          senderId: userId!,
          senderEmail: auth.currentUser?.email || '',
          senderName: currentUserData?.namaLengkap || currentUserData?.name || auth.currentUser?.email || 'Mitra Agen',
          recipientId: recipientUser.id,
          recipientEmail: recipientUser.email || '',
          recipientName: recipientUser.namaLengkap || recipientUser.name || 'Mitra Agen',
          createdAt: new Date().toISOString()
        });
      });

      // Real-time notifications
      await sendNotification({
        title: 'Transfer Saldo Berhasil',
        message: `Berhasil mentransfer saldo sebesar Rp ${transferAmount.toLocaleString('id-ID')} kepada ${recipientUser.namaLengkap || recipientUser.name || 'Mitra'}.`,
        type: 'success',
        targetId: userId!,
        targetRole: 'mitra'
      });

      await sendNotification({
        title: 'Saldo Masuk',
        message: `Anda menerima transfer saldo sebesar Rp ${transferAmount.toLocaleString('id-ID')} dari ${currentUserData?.namaLengkap || currentUserData?.name || 'Mitra'}.`,
        type: 'success',
        targetId: recipientUser.id,
        targetRole: 'mitra'
      });

      alert('Transfer saldo berhasil dilakukan.');
      setShowTransferModal(false);
      setRecipientEmail('');
      setRecipientUser(null);
      setTransferAmount(0);
      setTransferNote('');
    } catch (err: unknown) {
      console.error('Error transfer:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      alert('Transaksi gagal: ' + errMsg);
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const renderToko = () => {
    const filteredProducts = shopProductsList.filter(p => 
      p.name.toLowerCase().includes(tokoSearch.toLowerCase()) || 
      p.desc.toLowerCase().includes(tokoSearch.toLowerCase())
    );

    const handleCheckoutMitraOrder = async () => {
      if (!selectedProduct || !userId) return;
      
      const minQty = orderType === 'custom' ? 50 : 1;
      if (buyQty < minQty) {
        if (orderType === 'custom') {
          alert(`Minimal order untuk perlengkapan Custom Brand ${selectedProduct.name} adalah 50 pcs.`);
        } else {
          alert(`Minimal order untuk perlengkapan Resmi Umaroh adalah 1 pcs.`);
        }
        return;
      }

      if (orderType === 'custom' && !customBrandName.trim()) {
        alert("Mohon masukkan nama brand custom Anda.");
        return;
      }

      if (!shippingAddress.trim()) {
        alert("Mohon masukkan alamat lengkap pengiriman.");
        return;
      }

      setIsSubmittingOrder(true);
      try {
        // Parse weight in kg (e.g. "0.2 kg" -> 0.2)
        const parseWeight = (wStr: string): number => {
          const parsed = parseFloat(wStr.replace(/[^0-9.]/g, ''));
          return isNaN(parsed) ? 1 : parsed;
        };
        const weightEach = parseWeight(selectedProduct.weight);
        const totalWeight = weightEach * buyQty;
        const roundedWeight = Math.max(1, Math.ceil(totalWeight));
        
        // Rates per kg per courier
        const getCourierRate = (vendor: string): number => {
          switch (vendor) {
            case 'J&T Express (Regular)':
            case 'J&T Express':
              return 12000;
            case 'JNE Reguler':
              return 15000;
            case 'Sicepat Cargo':
              return 8000;
            case 'J&T Cargo':
              return 6000;
            case 'Umaroh Delivery Service':
              return 5000;
            default:
              return 10000;
          }
        };

        const ratePerKg = getCourierRate(shippingVendor);
        const shippingFee = roundedWeight * ratePerKg;
        const totalProductCost = selectedProduct.price * buyQty;
        const totalCost = totalProductCost + shippingFee;
        
        let targetJamaahName = "Stok Kemitraan (Mandiri)";
        let targetJamaahIdRef = null;

        if (orderForJamaahId !== 'mitra') {
          const matchedBooking = bookings.find(b => b.id === orderForJamaahId);
          if (matchedBooking) {
            targetJamaahName = matchedBooking.namaJamaah || matchedBooking.nama || "Jamaah Saya";
            targetJamaahIdRef = matchedBooking.id;
          }
        }

        const payload = {
          mitraId: userId,
          mitraBrand: currentUserData?.brandName || 'Mitra Agen',
          jamaahId: targetJamaahIdRef,
          jamaahName: targetJamaahName,
          productName: selectedProduct.name,
          productPrice: selectedProduct.price,
          quantity: buyQty,
          totalWeight: totalWeight,
          shippingFee: shippingFee,
          totalCost: totalCost,
          paymentMethod: paymentMethod,
          shippingVendor: shippingVendor,
          shippingAddress: shippingAddress.trim(),
          status: 'Diproses Seller',
          createdAt: serverTimestamp(),
          orderType: orderType,
          customBrandName: orderType === 'custom' ? customBrandName.trim() : ''
        };

        await addDoc(collection(db, 'shop_orders'), payload);
        
        await sendNotification({
          targetId: userId,
          targetRole: 'mitra',
          title: 'Pesanan Perlengkapan Berhasil',
          message: `Berhasil memesan ${buyQty}x ${selectedProduct.name} untuk ${targetJamaahName}. Pesanan diproses oleh admin Umaroh.`,
          type: 'info'
        });

        setOrderSuccess(true);
        setTimeout(() => {
          setOrderSuccess(false);
          setSelectedProduct(null);
          setBuyQty(1);
          setShippingAddress('');
          setOrderForJamaahId('mitra');
          setIsTokoHistoryOpen(true);
        }, 2000);

      } catch (err) {
        console.error("Order error:", err);
        alert("Gagal memproses pesanan. Silakan coba lagi.");
      } finally {
        setIsSubmittingOrder(false);
      }
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white rounded-3xl p-6 relative overflow-hidden shadow-md">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          <div className="max-w-3xl relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-2.5 py-1 rounded text-emerald-100">UMAROH EXCLUSIVE SHOP</span>
            <h2 className="text-xl md:text-2xl font-black mt-2 leading-tight">Belanja Aksesoris & Perlengkapan Umroh</h2>
            <p className="text-xs text-emerald-100/90 mt-2 leading-relaxed">
              Pesan dan salurkan perlengkapan umroh premium langsung dari gudang pusat Umaroh. Mitra dapat mendistribusikan langsung ke jemaah atau membeli untuk stok kantor dengan harga keagenan.
            </p>
            
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button 
                onClick={() => setIsTokoHistoryOpen(false)}
                className={`text-xs font-black px-4.5 py-2.5 rounded-xl transition-all uppercase tracking-wider ${
                  !isTokoHistoryOpen 
                    ? 'bg-amber-400 text-emerald-950 shadow-md scale-102 font-extrabold' 
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
                }`}
              >
                Katalog Produk & Iklan
              </button>
              <button 
                onClick={() => setIsTokoHistoryOpen(true)}
                className={`text-xs font-black px-4.5 py-2.5 rounded-xl transition-all uppercase tracking-wider ${
                  isTokoHistoryOpen 
                    ? 'bg-amber-400 text-emerald-950 shadow-md scale-102 font-extrabold' 
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
                }`}
              >
                Riwayat Pesanan Saya ({mitraShopOrders.length})
              </button>
            </div>
          </div>
        </div>

        {!isTokoHistoryOpen ? (
          <>
            {/* SPONSOR & PROMO ADS */}
            <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-2 right-2 bg-amber-500/10 text-amber-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-amber-300/20 uppercase tracking-widest font-mono">
                SPONSOR AD
              </div>
              <div className="flex flex-col md:flex-row items-center gap-5">
                <div className="w-full md:w-32 h-24 bg-amber-50 rounded-xl overflow-hidden flex-shrink-0 border border-amber-100 relative">
                  <img src="https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=200&auto=format&fit=crop" className="w-full h-full object-cover" alt="Ad ihram" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-[9px] font-extrabold text-amber-600 uppercase tracking-widest">PROMO BUNDLING MINGGU INI</p>
                  <h3 className="text-sm font-black text-gray-850 mt-1">Grosir Kain Ihram Katun Al-Mansuur Premium x Sabuk Thawaf</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-snug">
                    Dapatkan harga hemat paket komplit (Kain Ihram + Sabuk Tawaf) hemat Rp 20.000 untuk pengiriman massal ke alamat Kantor Mitra. Stok terbatas sebelum keberangkatan musim Syawal!
                  </p>
                  <div className="mt-3 flex items-center justify-center md:justify-start gap-3">
                    <span className="text-xs font-black text-amber-600">Diskon 10% Khusus Mitra</span>
                    <button 
                      onClick={() => {
                        const ihram = shopProductsList.find(p => p.id === 'prod-1');
                        if (ihram) {
                          setSelectedProduct(ihram);
                          setBuyQty(1);
                          setOrderType('resmi');
                          setCustomBrandName('');
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all uppercase tracking-wider"
                    >
                      Buka Pesanan Ad
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-150/80 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:max-w-md">
                <input 
                  type="text"
                  placeholder="Cari aksesoris (misal: Ihram, Mukena, Sabuk, Koper...)"
                  value={tokoSearch}
                  onChange={(e) => setTokoSearch(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-2 px-4 pr-10 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all font-medium"
                />
                <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-xs font-bold text-gray-450 uppercase tracking-wider">
                Menampilkan {filteredProducts.length} Produk Aksesoris
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredProducts.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => {
                    setSelectedProduct(p);
                    setBuyQty(1);
                    setOrderType('resmi');
                    setCustomBrandName('');
                  }}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-150/60 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="h-44 bg-gray-50 relative overflow-hidden border-b border-gray-150">
                    <img 
                      src={p.image} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-104 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 left-2 bg-emerald-600/95 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow">
                      STOK READY
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[8px] font-mono font-bold px-1.5 py-0.5 rounded">
                      {p.weight}
                    </div>
                  </div>

                  <div className="p-3.5 flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-xs text-gray-800 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
                        {p.name}
                      </h3>
                      
                      <div className="mt-1.5 flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-[10px] font-bold text-gray-650">{p.rating}</span>
                        <span className="text-gray-300 text-[10px]">|</span>
                        <span className="text-[10px] text-gray-400">{p.sold} Terjual</span>
                      </div>
                    </div>

                    <div className="mt-3.5 pt-2 border-t border-gray-50 flex items-end justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400 leading-none">Harga Mitra</p>
                        <p className="text-sm font-black text-amber-600 mt-1">Rp {p.price.toLocaleString('id-ID')}</p>
                      </div>
                      <span className="text-[9px] text-emerald-600 bg-emerald-50 font-bold px-2 py-0.5 rounded border border-emerald-100">
                        Pesan
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">Riwayat Pemesanan Perlengkapan Mitra</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Daftar pesanan Anda yang dikirim ke kantor atau langsung ke jamaah</p>
              </div>
              <button 
                onClick={() => {}} 
                className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-650 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {mitraShopOrders.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-bold uppercase tracking-wider">Belum Ada Riwayat Pesanan</p>
                <p className="text-[11px] mt-1 max-w-sm mx-auto">Silakan lihat Katalog Produk untuk melakukan pemesanan aksesoris & perlengkapan bagi jamaah Anda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-150 bg-gray-50/50">
                      <th className="p-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Tanggal</th>
                      <th className="p-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Produk</th>
                      <th className="p-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Penerima / Jamaah</th>
                      <th className="p-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-505 text-center">Qty</th>
                      <th className="p-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Total Biaya</th>
                      <th className="p-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Status</th>
                      <th className="p-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-500">No. Resi Pengiriman</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mitraShopOrders.map((ord) => {
                      const secondsVal = ord.createdAt && typeof ord.createdAt === 'object' && 'seconds' in ord.createdAt 
                        ? ord.createdAt.seconds 
                        : 0;
                      const dateObj = secondsVal 
                        ? new Date(secondsVal * 1000) 
                        : (typeof ord.createdAt === 'string' ? new Date(ord.createdAt) : new Date());
                      
                      const fmtDate = dateObj.toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      });

                      return (
                        <tr key={ord.id} className="hover:bg-gray-55/50 transition-colors text-xs">
                          <td className="p-3 font-medium text-gray-500 whitespace-nowrap">{fmtDate}</td>
                          <td className="p-3 font-extrabold text-gray-805">
                            {ord.productName}
                          </td>
                          <td className="p-3">
                            <div>
                              <p className="font-extrabold text-gray-700 leading-snug">{ord.jamaahName}</p>
                              <p className="text-[9px] text-gray-400 mt-0.5 line-clamp-1">{ord.shippingAddress}</p>
                            </div>
                          </td>
                          <td className="p-3 font-extrabold text-gray-800 text-center">{ord.quantity}x</td>
                          <td className="p-3 font-extrabold text-amber-600 whitespace-nowrap">
                            Rp {(ord.totalCost || (ord.productPrice * ord.quantity + 20000)).toLocaleString('id-ID')}
                          </td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap border ${
                              ord.status === 'Selesai' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : ord.status === 'Dikirim' 
                                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {ord.status || 'Diproses Seller'}
                            </span>
                          </td>
                          <td className="p-3">
                            {ord.noResi ? (
                              <div className="flex items-center gap-1.5 font-mono text-[10px] text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200 max-w-fit">
                                <span className="font-extrabold">{ord.noResi}</span>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(ord.noResi || '');
                                    alert('Nomor Resi disalin: ' + ord.noResi);
                                  }}
                                  className="text-[9px] text-indigo-600 hover:text-indigo-850 font-bold active:scale-90 transition-all cursor-pointer"
                                >
                                  Copy
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">Menunggu Resi</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-350">
            <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-gray-150 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
              
              <div className="p-5 border-b border-gray-150 flex items-center justify-between bg-emerald-50/15">
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-emerald-950 italic">Form Pemesanan Aksesoris</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">Dikirim langsung oleh Umaroh Admin</p>
                </div>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg active:scale-90 transition-all text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {orderSuccess ? (
                  <div className="py-12 text-center animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-250 animate-bounce">
                      <Check className="w-8 h-8" />
                    </div>
                    <h4 className="text-base font-black text-emerald-950">PESANAN BERHASIL KIRIM!</h4>
                    <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto">Pesanan Anda telah didaftarkan ke sistem Umaroh ERP. Admin kami akan segera mengepak barang dan memposting no resi kurir.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-4 p-4.5 bg-gray-50 rounded-2xl border border-gray-100">
                      <img 
                        src={selectedProduct.image} 
                        alt={selectedProduct.name} 
                        className="w-16 h-16 rounded-xl object-cover border border-gray-200"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="text-xs font-extrabold text-gray-800 leading-snug">{selectedProduct.name}</h4>
                        <p className="text-xs font-black text-amber-600 mt-1">Rp {selectedProduct.price.toLocaleString('id-ID')}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Berat: {selectedProduct.weight} | Stok: {selectedProduct.stock}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Tujuan Pembelian</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            type="button"
                            onClick={() => {
                              setOrderForJamaahId('mitra');
                              setShippingAddress(currentUserData?.namaLengkap || 'Kantor Cabang Agen Mitra');
                            }}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              orderForJamaahId === 'mitra'
                                ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <p className="text-[10px] font-black text-emerald-950 uppercase tracking-wider">Stok Kemitraan</p>
                            <p className="text-[9px] text-gray-400 mt-1 leading-normal">Kirim ke alamat Kantor Agen Mitra Anda</p>
                          </button>
                          
                          <button 
                            type="button"
                            onClick={() => {
                              if (bookings.length > 0) {
                                const b = bookings[0];
                                setOrderForJamaahId(b.id);
                                if (b.namaJamaah) {
                                  setShippingAddress(`Alamat ${b.namaJamaah}\n(Isi Alamat Lengkap Pengiriman)`);
                                }
                              } else {
                                setOrderForJamaahId('direct_input');
                                setShippingAddress('');
                              }
                            }}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              orderForJamaahId !== 'mitra'
                                ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <p className="text-[10px] font-black text-emerald-950 uppercase tracking-wider font-extrabold">Kirim ke Jamaah Saya</p>
                            <p className="text-[9px] text-gray-400 mt-1 leading-normal">Kirim langsung ke alamat rumah jamaah Anda</p>
                          </button>
                        </div>
                      </div>

                      {orderForJamaahId !== 'mitra' && bookings.length > 0 && (
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Pilih Jamaah Saya</label>
                          <select 
                            value={orderForJamaahId}
                            onChange={(e) => {
                              setOrderForJamaahId(e.target.value);
                              const b = bookings.find(item => item.id === e.target.value);
                              if (b) {
                                setShippingAddress(`Alamat ${b.namaJamaah || b.nama}\n(Tolong perbarui alamat lengkap disini Kakak)`);
                              }
                            }}
                            className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-100"
                          >
                            <option value="direct_input">-- Ketik Alamat/Kirim Langsung --</option>
                            {bookings.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.namaJamaah || b.nama} - (Paket ID: {b.paketId?.slice(0, 6) || 'Paket'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* OPSI JENIS PESANAN: Resmi vs Custom */}
                      <div className="space-y-2 text-left bg-slate-50/50 p-3 rounded-2xl border border-gray-150">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500">Pilih Jenis Pesanan</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setOrderType('resmi');
                              setBuyQty(Math.max(1, buyQty));
                            }}
                            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                              orderType === 'resmi'
                                ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Official Umaroh</span>
                            <span className="text-[9px] text-gray-500 mt-1 leading-tight">Grosir Resmi (Min. 1 Pcs)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOrderType('custom');
                              setBuyQty(Math.max(50, buyQty));
                            }}
                            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                              orderType === 'custom'
                                ? 'border-purple-600 bg-purple-50/40 ring-1 ring-purple-600'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-[10px] font-black text-purple-950 uppercase tracking-wider">Custom Brand</span>
                            <span className="text-[9px] text-gray-500 mt-1 leading-tight">Gunakan Logo Sendiri (Min. 50 Pcs)</span>
                          </button>
                        </div>

                        {orderType === 'custom' && (
                          <div className="mt-2.5 pt-2 border-t border-dashed border-purple-100">
                            <label className="block text-[9px] font-black uppercase tracking-wider text-purple-700 mb-1">Nama Brand Anda sendiri (Kustom Logo)</label>
                            <input
                              type="text"
                              value={customBrandName}
                              onChange={(e) => setCustomBrandName(e.target.value)}
                              placeholder="Masukkan nama brand travel/agen Anda..."
                              className="w-full bg-white border border-purple-200 rounded-xl py-2 px-3 text-xs text-purple-950 placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500 transition-all font-semibold"
                            />
                          </div>
                        )}
                      </div>

                      {(() => {
                        const minQty = orderType === 'custom' ? 50 : 1;
                        return (
                          <div className="space-y-2 text-left">
                            {orderType === 'custom' && (
                              <div className="p-2.5 bg-purple-50 border border-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider rounded-xl text-center">
                                📢 Pembelian Custom Brand mewajibkan minimal order 50 Pcs untuk cetak logo & packing khusus brand Anda sendiri.
                              </div>
                            )}
                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <span className="text-xs font-extrabold text-gray-700">Jumlah Pesanan (Qty)</span>
                              <div className="flex items-center gap-2.5">
                                <button 
                                  type="button"
                                  onClick={() => setBuyQty(Math.max(minQty, buyQty - 1))}
                                  className="w-7 h-7 bg-white rounded-lg border border-gray-250 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-50 active:scale-90 transition-all font-mono"
                                >
                                  -
                                </button>
                                <span className="text-xs font-black min-w-4 text-center">{buyQty}</span>
                                <button 
                                  type="button"
                                  onClick={() => setBuyQty(orderType === 'custom' ? buyQty + 1 : Math.min(selectedProduct.stock, buyQty + 1))}
                                  className="w-7 h-7 bg-white rounded-lg border border-gray-250 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-50 active:scale-90 transition-all font-mono"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Alamat Penerima Lengkap & No. HP</label>
                        <textarea 
                          rows={3}
                          value={shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                          placeholder="Masukkan Alamat Lengkap Pengiriman (Jalan, No Rumah, RT/RW, Kelurahan, Kecamatan, Kabupaten/Kota, Kode Pos) & No. Handphone aktif."
                          className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all"
                        ></textarea>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Kurir Pengiriman</label>
                          <select 
                            value={shippingVendor}
                            onChange={(e) => setShippingVendor(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-100"
                          >
                            <option value="J&T Express">J&T Express (Regular)</option>
                            <option value="J&T Cargo">J&T Cargo (Cargo Massal)</option>
                            <option value="JNE Reguler">JNE Reguler</option>
                            <option value="Sicepat Cargo">Sicepat Cargo</option>
                            <option value="Umaroh Delivery Service">Umaroh Delivery Service</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Metode Pembayaran</label>
                          <select 
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-100"
                          >
                            <option value="Transfer Bank BSI">Transfer Bank BSI</option>
                            <option value="Transfer Bank Mandiri">Transfer Bank Mandiri</option>
                            <option value="Transfer Bank BCA">Transfer Bank BCA</option>
                            <option value="Potong Saldo Komisi">Potong Saldo Komisi</option>
                          </select>

                          {/* Detail Rekening Bank PT Nawaitul Umrah Haji */}
                          {paymentMethod.startsWith('Transfer Bank') && (
                            <div className="mt-2 p-2.5 bg-emerald-50/40 border border-emerald-100 rounded-xl text-left">
                              <span className="block text-[8px] font-black text-slate-400 tracking-wider uppercase mb-1">Rekening Pembayaran Resmi:</span>
                              {paymentMethod === 'Transfer Bank BSI' && (
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <span className="block text-[9px] font-extrabold text-slate-800 leading-tight">BANK SYARIAH INDONESIA (BSI)</span>
                                    <span className="block text-[11px] font-black text-emerald-600 tracking-wider font-mono mt-0.5">5577775003</span>
                                    <span className="block text-[8px] font-bold text-slate-505 mt-0.5">a.n. PT. Nawaitul Umrah Haji</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText('5577775003');
                                      alert('Nomor rekening BSI berhasil disalin!');
                                    }}
                                    className="text-[8px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-100 transition-all uppercase cursor-pointer whitespace-nowrap active:scale-95"
                                  >
                                    Salin
                                  </button>
                                </div>
                              )}
                              {paymentMethod === 'Transfer Bank BCA' && (
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <span className="block text-[9px] font-extrabold text-slate-800 leading-tight">BANK CENTRAL ASIA (BCA)</span>
                                    <span className="block text-[11px] font-black text-blue-600 tracking-wider font-mono mt-0.5">7380989918</span>
                                    <span className="block text-[8px] font-bold text-slate-505 mt-0.5">a.n. PT. Nawaitul Umroh Haji</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText('7380989918');
                                      alert('Nomor rekening BCA berhasil disalin!');
                                    }}
                                    className="text-[8px] font-black text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-100 transition-all uppercase cursor-pointer whitespace-nowrap active:scale-95"
                                  >
                                    Salin
                                  </button>
                                </div>
                              )}
                              {paymentMethod === 'Transfer Bank Mandiri' && (
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <span className="block text-[9px] font-extrabold text-slate-800 leading-tight">BANK MANDIRI (REK / VA)</span>
                                    <span className="block text-[11px] font-black text-amber-600 tracking-wider font-mono mt-0.5">Hubungi Admin Kasir</span>
                                    <span className="block text-[8px] font-bold text-slate-505 mt-0.5">a.n. PT. Nawaitul Umrah Haji</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {(() => {
                        const parseWeight = (wStr: string): number => {
                          const parsed = parseFloat(wStr.replace(/[^0-9.]/g, ''));
                          return isNaN(parsed) ? 1 : parsed;
                        };
                        const weightEach = parseWeight(selectedProduct.weight);
                        const totalWeight = weightEach * buyQty;
                        const roundedWeight = Math.max(1, Math.ceil(totalWeight));
                        
                        const getCourierRate = (vendor: string): number => {
                          switch (vendor) {
                            case 'J&T Express (Regular)':
                            case 'J&T Express':
                              return 12000;
                            case 'JNE Reguler':
                              return 15000;
                            case 'Sicepat Cargo':
                              return 8000;
                            case 'J&T Cargo':
                              return 6000;
                            case 'Umaroh Delivery Service':
                              return 5000;
                            default:
                              return 10000;
                          }
                        };

                        const ratePerKg = getCourierRate(shippingVendor);
                        const shippingFee = roundedWeight * ratePerKg;
                        const subtotalProduct = selectedProduct.price * buyQty;
                        const totalPayment = subtotalProduct + shippingFee;

                        return (
                          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-xs text-amber-900 space-y-1.5 text-left">
                            <div className="flex justify-between">
                              <span>Subtotal Produk:</span>
                              <span className="font-extrabold text-slate-900">Rp {subtotalProduct.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-[11px] text-amber-800">
                              <span>Total Berat:</span>
                              <span className="font-bold">{totalWeight.toFixed(2)} kg ({roundedWeight} kg Pembulatan)</span>
                            </div>
                            <div className="flex justify-between text-[11px] text-amber-800">
                              <span>Kurir / Tarif per Kg:</span>
                              <span className="font-bold">{shippingVendor} (Rp {ratePerKg.toLocaleString('id-ID')}/kg)</span>
                            </div>
                            <div className="flex justify-between text-[11px] text-amber-800">
                              <span>Ongkos Kirim Real:</span>
                              <span className="font-bold">Rp {shippingFee.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between pt-1.5 border-t border-amber-250 font-black text-amber-950 text-sm">
                              <span>Total Pembayaran:</span>
                              <span className="text-emerald-700">Rp {totalPayment.toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>

              {!orderSuccess && (
                <div className="p-4 border-t border-gray-150 flex gap-3 bg-gray-50">
                  <button 
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="w-1/2 bg-white hover:bg-gray-100 text-gray-600 border border-gray-300 text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-all text-center"
                  >
                    Batal
                  </button>
                  <button 
                    type="button"
                    onClick={handleCheckoutMitraOrder}
                    disabled={isSubmittingOrder}
                    className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2.5 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow"
                  >
                    {isSubmittingOrder ? (
                      <span className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        Konfirmasi Order
                      </>
                    )}
                  </button>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCRM = () => {
    const handleMoveLead = (leadId: string, nextStage: string) => {
      setCrmLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: nextStage } : l));
    };

    const handleAddLead = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newLeadName || !newLeadPhone) {
        alert("Nama dan No Handphone wajib diisi!");
        return;
      }
      const newLead = {
        id: `lead-${Date.now()}`,
        name: newLeadName,
        phone: newLeadPhone.replace(/\D/g, ''),
        package: newLeadPackage || 'Belum Memilih Paket',
        note: newLeadNote,
        stage: 'new',
        source: newLeadSource
      };
      setCrmLeads([...crmLeads, newLead]);
      setNewLeadName('');
      setNewLeadPhone('');
      setNewLeadPackage('');
      setNewLeadNote('');
      setShowAddLeadModal(false);
      alert("Prospek Baru berhasil ditambahkan!");
    };

    const handleWhatsAppSend = (lead: CrmLead, templateType: string) => {
      let message: string;
      if (templateType === 'intro') {
        message = `Assalamu'alaikum wr. wb. Bapak/Ibu ${lead.name}, perkenalkan kami dari ${currentUserData?.brandName || 'Kemitraan Umaroh'}. Kami menerima informasi bahwa Bapak/Ibu tertarik dengan program "${lead.package}". Apakah ada yang bisa kami bantu mengenai jadwal keberangkatan, rincian hotel, atau pendaftaran dokumen?`;
      } else if (templateType === 'promo') {
        message = `Assalamu'alaikum wr. wb. Halo Bapak/Ibu ${lead.name}! Kami memiliki kabar gembira mengenai promo potongan khusus dan cashback untuk pendaftaran program "${lead.package}" minggu ini. Kursi terbatas! Mari konsultasikan rencana ibadah Bapak/Ibu sekarang juga.`;
      } else {
        message = `Assalamu'alaikum wr. wb. Bapak/Ibu ${lead.name}, mohon info apakah kami dapat membantu melengkapi berkas pendaftaran Umrah seperti scan KTP, Paspor, dan pasfoto? Kami siap memandu seluruh prosesnya sampai keberangkatan.`;
      }
      const encodedMsg = encodeURIComponent(message);
      window.open(`https://api.whatsapp.com/send?phone=${lead.phone}&text=${encodedMsg}`, '_blank');
    };

    // Calculate CRM KPI
    const totalLeadsCount = crmLeads.length;
    const bookingLeadsCount = crmLeads.filter(l => l.stage === 'booking').length;
    const conversionRate = totalLeadsCount > 0 ? Math.round((bookingLeadsCount / totalLeadsCount) * 100) : 0;
    const hotLeadsCount = crmLeads.filter(l => l.stage === 'follow_up').length;

    const stages = [
      { id: 'new', title: 'Prospek Baru (Leads)', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
      { id: 'contacted', title: 'Sudah Dihubungi', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
      { id: 'follow_up', title: 'Follow Up Intensif', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
      { id: 'booking', title: 'Sudah Booking DP', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* CRM Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-150'}`}>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Prospek</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-[#B28200]">{totalLeadsCount}</span>
              <span className="text-[10px] text-gray-500">Jiwa</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">Seluruh database prospek</p>
          </div>
          <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-150'}`}>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Follow Up Aktif</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-purple-650">{hotLeadsCount}</span>
              <span className="text-[10px] text-purple-500">Klien</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">Sedang ditawarkan program</p>
          </div>
          <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-150'}`}>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Berhasil Closing</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-650">{bookingLeadsCount}</span>
              <span className="text-[10px] text-emerald-500">Booked</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">Telah melakukan booking/DP</p>
          </div>
          <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-150'}`}>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Rasio Konversi</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-blue-650">{conversionRate}%</span>
              <span className="text-[10px] text-blue-500">Success</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">Leads menjadi jemaah tetap</p>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-black uppercase italic tracking-tight text-gray-950">CRM Pipeline Prospek Jemaah</h2>
            <p className="text-xs text-gray-500">Kelola calon jamaah Anda dari tahap prospek hingga menjadi jamaah resmi terdaftar</p>
          </div>
          <button
            onClick={() => setShowAddLeadModal(true)}
            className="px-4 py-2 bg-[#055734] hover:bg-[#044c2d] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Tambah Prospek Baru
          </button>
        </div>

        {/* CRM Kanban Board */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {stages.map(stage => {
            const stageLeads = crmLeads.filter(l => l.stage === stage.id);
            return (
              <div 
                key={stage.id} 
                className={`p-4 rounded-2xl border flex flex-col min-h-[450px] ${
                  isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-gray-50/50 border-gray-150'
                }`}
              >
                <div className={`p-2 rounded-xl border text-[10px] font-black uppercase tracking-wider text-center ${stage.color} mb-3`}>
                  {stage.title} ({stageLeads.length})
                </div>
                
                <div className="flex-1 space-y-3">
                  {stageLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="text-gray-300 text-3xl font-light">∅</div>
                      <p className="text-[10px] text-gray-400 mt-1">Belum ada data</p>
                    </div>
                  ) : (
                    stageLeads.map(lead => (
                      <div 
                        key={lead.id} 
                        className={`p-4 rounded-xl border shadow-sm transition-all hover:scale-101 ${
                          isDarkMode ? 'bg-slate-900 border-slate-700 hover:border-amber-500/50' : 'bg-white border-gray-200 hover:border-amber-400/50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-xs font-extrabold text-gray-900">{lead.name}</h4>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                            lead.source === 'Instagram' ? 'bg-pink-100 text-pink-700' : 
                            lead.source === 'Referral' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {lead.source}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1 mb-2">
                          <Phone className="w-2.5 h-2.5 text-gray-400" /> +{lead.phone}
                        </p>
                        
                        <div className={`p-2 rounded-lg text-[9px] font-bold ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-amber-50 text-[#8C6200]'} mb-2`}>
                          📦 {lead.package}
                        </div>
                        
                        {lead.note && (
                          <p className="text-[9px] text-gray-500 bg-gray-550/10 p-1.5 rounded border border-gray-100 dark:border-slate-850 mb-3 italic">
                            "{lead.note}"
                          </p>
                        )}

                        <div className="border-t border-gray-100 dark:border-slate-800 pt-3 flex flex-wrap gap-1.5 justify-between items-center">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleWhatsAppSend(lead, 'intro')}
                              title="Kirim Sapaan Awal"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors border border-emerald-100 cursor-pointer"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleWhatsAppSend(lead, 'promo')}
                              title="Kirim Promo"
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors border border-amber-100 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleWhatsAppSend(lead, 'doc')}
                              title="Kirim Checklist Dokumen"
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors border border-blue-100 cursor-pointer"
                            >
                              <FileText className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex gap-1">
                            {stage.id === 'new' && (
                              <button
                                onClick={() => handleMoveLead(lead.id, 'contacted')}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-900 text-[9px] font-black uppercase rounded transition-colors cursor-pointer"
                              >
                                Hubungi →
                              </button>
                            )}
                            {stage.id === 'contacted' && (
                              <button
                                onClick={() => handleMoveLead(lead.id, 'follow_up')}
                                className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[9px] font-black uppercase rounded transition-colors cursor-pointer"
                              >
                                Follow Up →
                              </button>
                            )}
                            {stage.id === 'follow_up' && (
                              <button
                                onClick={() => handleMoveLead(lead.id, 'booking')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase rounded transition-colors cursor-pointer"
                              >
                                Booking DP →
                              </button>
                            )}
                            {stage.id === 'booking' && (
                              <span className="flex items-center gap-1 text-[9px] text-emerald-600 font-black uppercase">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Close
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ADD LEAD MODAL */}
        {showAddLeadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'
            }`}>
              <div className="p-6 border-b border-gray-150 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-gray-900 italic">Tambah Prospek Baru</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Input database calon jamaah potensial</p>
                </div>
                <button 
                  onClick={() => setShowAddLeadModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleAddLead} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Nama Calon Jemaah</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: H. Bambang Wijaya"
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">No WhatsApp (Gunakan Kode Negara, e.g. 62812...)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: 628123456789"
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Program Paket yang Diminati</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Paket Umrah Ramadhan VIP"
                    value={newLeadPackage}
                    onChange={(e) => setNewLeadPackage(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Sumber Prospek (Leads Source)</label>
                  <select 
                    value={newLeadSource}
                    onChange={(e) => setNewLeadSource(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  >
                    <option value="Instagram">Instagram / Medsos</option>
                    <option value="Referral">Referral / Kerabat</option>
                    <option value="Brosur Masjid">Brosur / Pengajian Masjid</option>
                    <option value="Website">Website / Landing Page</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Catatan Konsultasi</label>
                  <textarea 
                    placeholder="Tambahkan detail minat, kamar, rombongan..."
                    value={newLeadNote}
                    onChange={(e) => setNewLeadNote(e.target.value)}
                    rows={2}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddLeadModal(false)}
                    className="w-1/2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-3 bg-[#055734] hover:bg-[#044c2d] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Simpan Prospek
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWebsite = () => {
    const miniWebLink = `https://umaroh.com/agen/${brandSlug}`;
    
    const handleSaveWebsiteSettings = (e: React.FormEvent) => {
      e.preventDefault();
      setIsSavedWebsite(true);
      setTimeout(() => setIsSavedWebsite(false), 3000);
      alert("Pengaturan website keagenan Anda berhasil disimpan!");
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-black uppercase italic tracking-tight text-gray-950">Website Agen & Personal Brand Customizer</h2>
            <p className="text-xs text-gray-500">Miliki website pemasaran profesional mandiri yang terhubung dengan paket travel pusat secara otomatis</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Customizer Panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-150'}`}>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#B28200] mb-4 flex items-center gap-2">
                ⚙️ Atur Identitas Digital Anda
              </h3>
              
              <form onSubmit={handleSaveWebsiteSettings} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                    Slug Website Agen (URL Unik)
                  </label>
                  <div className="flex rounded-xl overflow-hidden border border-gray-200">
                    <span className="bg-gray-100 text-gray-500 text-xs px-3 py-2.5 flex items-center border-r border-gray-200">
                      umaroh.com/agen/
                    </span>
                    <input 
                      type="text" 
                      required
                      value={brandSlug}
                      onChange={(e) => setBrandSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      className="flex-1 text-xs px-3 py-2.5 bg-white focus:outline-none"
                      placeholder="berkat-umrah"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                    Judul Banner Utama (Greeting Header)
                  </label>
                  <textarea 
                    rows={2}
                    required
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Kalimat penyambut calon jemaah..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                    No Hotline WhatsApp (Untuk Tombol Kontak)
                  </label>
                  <input 
                    type="text" 
                    required
                    value={whatsappHotline}
                    onChange={(e) => setWhatsappHotline(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none"
                    placeholder="Contoh: 628123456789"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                    Aksen Warna Tema Website
                  </label>
                  <div className="grid grid-cols-5 gap-2 pt-1">
                    {[
                      { hex: '#055734', name: 'Emerald' },
                      { hex: '#9E1A1A', name: 'Ruby' },
                      { hex: '#1C3D5A', name: 'Sapphire' },
                      { hex: '#B28200', name: 'Gold' },
                      { hex: '#111827', name: 'Obsidian' }
                    ].map(col => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => setThemeColor(col.hex)}
                        className={`p-2 rounded-xl text-[10px] font-bold text-white border transition-all ${
                          themeColor === col.hex ? 'ring-2 ring-offset-2 ring-emerald-500 scale-105' : 'opacity-85'
                        }`}
                        style={{ backgroundColor: col.hex }}
                      >
                        {col.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#055734] hover:bg-[#044c2d] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSavedWebsite ? "✓ Pengaturan Disimpan" : "Simpan & Publikasikan Website"}
                  </button>
                </div>
              </form>
            </div>

            {/* URL Sharing Card */}
            <div className={`p-6 rounded-2xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#FFFDF0] border-amber-100/50'}`}>
              <div>
                <h4 className="text-xs font-black uppercase text-[#B28200] flex items-center gap-2 mb-2">
                  🔗 Link Website Aktif Anda
                </h4>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Bagikan tautan berikut di bio Instagram, Facebook, pamflet digital, atau pesan WhatsApp broadcast Anda untuk menjaring jamaah secara langsung.
                </p>
                
                <div className="mt-4 p-3 rounded-xl border border-dashed border-amber-350 bg-white flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-gray-755 truncate">{miniWebLink}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(miniWebLink);
                      alert("Tautan website disalin ke clipboard!");
                    }}
                    className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-705 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-150/50 flex items-center gap-4">
                <div className="w-16 h-16 bg-white p-1 rounded-lg border border-gray-200 flex items-center justify-center font-mono text-[8px] font-black text-center text-gray-300">
                  QR CODE<br/>GENERATED
                </div>
                <div>
                  <h5 className="text-[10px] font-black uppercase text-gray-700">QR Code Promosi Otomatis</h5>
                  <p className="text-[9px] text-gray-505">Unduh gambar QR code untuk dipasang di brosur offline, poster masjid, atau rollup banner agen Anda.</p>
                  <button 
                    onClick={() => alert("Mengunduh QR Code brosur Anda...")}
                    className="mt-1 text-[9px] text-[#B28200] font-black uppercase hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Download className="w-2.5 h-2.5" /> Unduh QR Code
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Website Smartphone Mockup Panel */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-sm rounded-[36px] border-8 border-slate-900 shadow-2xl overflow-hidden relative bg-white flex flex-col min-h-[580px] select-none">
              {/* Speaker & Sensor bar */}
              <div className="h-6 bg-slate-900 w-full flex items-center justify-center relative">
                <div className="w-24 h-4 bg-slate-900 rounded-b-xl absolute top-0 z-10 flex items-center justify-center gap-1">
                  <span className="w-10 h-1 bg-gray-700 rounded-full"></span>
                  <span className="w-1.5 h-1.5 bg-gray-800 rounded-full"></span>
                </div>
                <div className="w-full px-5 flex justify-between items-center text-[9px] text-gray-400 font-bold font-mono">
                  <span>09:41</span>
                  <div className="flex items-center gap-1">
                    <span>5G</span>
                    <span className="w-4 h-2 bg-gray-500 rounded-sm"></span>
                  </div>
                </div>
              </div>

              {/* Live Website Content Mockup */}
              <div className="flex-1 overflow-y-auto bg-gray-50">
                {/* Navbar */}
                <div className="p-3 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm sticky top-0 z-15">
                  <div className="flex items-center gap-2">
                    <img src={logoBase64} alt="Umaroh Logo" className="h-4 w-auto" />
                    <span className="text-[10px] font-black uppercase tracking-tight text-gray-800">
                      {currentUserData?.brandName || 'Berkat Umrah Agency'}
                    </span>
                  </div>
                  <button 
                    className="px-2.5 py-1 text-[8px] font-black uppercase rounded text-white cursor-default"
                    style={{ backgroundColor: themeColor }}
                  >
                    Hubungi Kami
                  </button>
                </div>

                {/* Hero section */}
                <div className="p-6 text-white relative overflow-hidden flex flex-col justify-center items-center text-center" style={{ backgroundColor: themeColor }}>
                  <div className="absolute inset-0 opacity-15">
                    <div className="absolute inset-0 bg-gradient-to-br from-black to-transparent"></div>
                  </div>
                  <div className="relative z-10 space-y-2">
                    <span className="text-[8px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full tracking-widest text-yellow-300">
                      MITRA RESMI UMAROH ERP
                    </span>
                    <h3 className="text-xs font-black tracking-tight leading-tight uppercase">
                      {heroTitle}
                    </h3>
                    <p className="text-[8px] text-gray-100 font-medium">
                      Pelayanan Profesional, Ibadah Tenang, Fasilitas Nyaman, dan Pembimbing Syar'i Terpercaya.
                    </p>
                  </div>
                </div>

                {/* Feature highlights */}
                <div className="p-4 grid grid-cols-3 gap-2 bg-white border-b border-gray-100">
                  <div className="text-center p-2 rounded-xl bg-gray-50 space-y-1">
                    <span className="text-[12px]">✈️</span>
                    <p className="text-[7px] font-extrabold uppercase text-gray-800 leading-none">Pasti Berangkat</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-gray-50 space-y-1">
                    <span className="text-[12px]">🕋</span>
                    <p className="text-[7px] font-extrabold uppercase text-gray-800 leading-none">Hotel Nyaman</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-gray-50 space-y-1">
                    <span className="text-[12px]">🕌</span>
                    <p className="text-[7px] font-extrabold uppercase text-gray-800 leading-none">Syar'i & Sah</p>
                  </div>
                </div>

                {/* Packages list */}
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black uppercase text-gray-800">Paket Unggulan Kami</span>
                    <span className="text-[8px] text-gray-400 font-bold uppercase">Lihat Semua</span>
                  </div>

                  {/* Program Paket Mockup 1 */}
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
                    <div className="h-24 w-full bg-slate-200 relative overflow-hidden">
                      <img src="https://images.unsplash.com/photo-1591604021695-0c69b7c05981?q=80&w=400&auto=format&fit=crop" alt="Kaabah" className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-amber-500 text-slate-900 text-[7px] font-black uppercase">
                        Sisa 12 Seat
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <h4 className="text-[10px] font-black uppercase tracking-tight text-gray-900">
                        Umrah Regular Syawal 1447H
                      </h4>
                      <p className="text-[7px] text-gray-500 leading-none">
                        📅 Keberangkatan: 15 Oktober 2026 | ✈️ Saudia Airlines
                      </p>
                      
                      <div className="pt-2 border-t border-gray-50 flex justify-between items-center">
                        <div>
                          <span className="text-[7px] text-gray-400 font-bold uppercase block leading-none">Mulai Dari</span>
                          <span className="text-[11px] font-black text-[#B28200]">Rp 28.500.000</span>
                        </div>
                        <button 
                          className="px-2.5 py-1.5 rounded-lg text-[8px] font-black text-white uppercase flex items-center gap-1 cursor-default"
                          style={{ backgroundColor: themeColor }}
                        >
                          Tanya Detail
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Program Paket Mockup 2 */}
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
                    <div className="h-24 w-full bg-slate-200 relative overflow-hidden">
                      <img src="https://images.unsplash.com/photo-1542856391-010fb87dcfed?q=80&w=400&auto=format&fit=crop" alt="Medina" className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-600 text-white text-[7px] font-black uppercase">
                        Sisa 8 Seat
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <h4 className="text-[10px] font-black uppercase tracking-tight text-gray-900">
                        Umrah Akbar Akhir Tahun 1447H
                      </h4>
                      <p className="text-[7px] text-gray-500 leading-none">
                        📅 Keberangkatan: 24 Desember 2026 | ✈️ Qatar Airways
                      </p>
                      
                      <div className="pt-2 border-t border-gray-50 flex justify-between items-center">
                        <div>
                          <span className="text-[7px] text-gray-400 font-bold uppercase block leading-none">Mulai Dari</span>
                          <span className="text-[11px] font-black text-[#B28200]">Rp 31.900.000</span>
                        </div>
                        <button 
                          className="px-2.5 py-1.5 rounded-lg text-[8px] font-black text-white uppercase flex items-center gap-1 cursor-default"
                          style={{ backgroundColor: themeColor }}
                        >
                          Tanya Detail
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer of agent web */}
                <div className="p-5 bg-slate-900 text-white text-center space-y-1.5">
                  <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">
                    Hubungi Agen Resmi Kami
                  </p>
                  <p className="text-[9px] font-black uppercase text-yellow-400">
                    {currentUserData?.brandName || 'Berkat Umrah Agency'}
                  </p>
                  <p className="text-[7px] text-gray-550 font-medium">
                    Powered by Umaroh Enterprise ERP System
                  </p>
                </div>
              </div>

              {/* Floating WA button on Mockup */}
              <div className="absolute bottom-4 right-4 z-20">
                <div className="w-10 h-10 bg-emerald-500 rounded-full shadow-lg flex items-center justify-center text-white cursor-default">
                  <Phone className="w-4 h-4" />
                </div>
              </div>

              {/* Home bar element */}
              <div className="h-5 bg-slate-900 w-full flex items-center justify-center">
                <span className="w-32 h-1 bg-gray-600 rounded-full"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderWallet = () => {
    // Merge and sort transactions for local display
    const merged = [...sentTransactions, ...recvTransactions];
    const uniqueTrans = merged.filter((item, index, self) => 
      self.findIndex(t => t.id === item.id) === index
    ).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Banner Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Virtual Premium E-Wallet Card */}
          <div className="lg:col-span-1 bg-gradient-to-tr from-indigo-950 via-indigo-900 to-slate-900 text-white rounded-3xl p-8 border border-indigo-500/20 shadow-xl relative overflow-hidden flex flex-col justify-between h-72">
            {/* Background absolute visuals */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -ml-8 -mb-8"></div>
            
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">DOMPET DIGITAL MITRA</p>
                <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-tight">{currentUserData?.brandName || 'Umaroh Partner'}</p>
              </div>
              <div className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg flex items-center gap-1.5 backdrop-blur-md">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">Verifikasi</span>
              </div>
            </div>

            <div className="my-auto relative z-10">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 leading-none mb-1">TOTAL SALDO KOMISI</p>
              <h2 className="text-3xl lg:text-4xl font-black text-amber-300 tracking-tight">
                Rp {balance.toLocaleString('id-ID')}
              </h2>
            </div>

            <div className="flex justify-between items-end relative z-10 pt-4 border-t border-white/5">
              <div>
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">PEMEGANG DOMPET</p>
                <p className="text-xs font-black italic uppercase tracking-wider">{currentUserData?.namaLengkap || currentUserData?.name || 'Aksi Mitra'}</p>
              </div>
              <div className="flex flex-col items-end">
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">KODE REFF</p>
                <p className="text-xs font-mono font-bold text-indigo-200">{userId?.substring(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats & Actions Grid */}
          <div className="lg:col-span-2 flex flex-col justify-between gap-4">
            {/* Action cards row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
              {/* Tarik Saldo card */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <Download className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded">TRANSFER BANK</span>
                </div>
                <div className="mt-4">
                  <h4 className="text-base font-black uppercase tracking-tight text-gray-900 mb-1">Pencairan Saldo (Withdraw)</h4>
                  <p className="text-xs text-gray-500 font-medium">BCA, Mandiri, BNI, BRI, BSI, dll. Diproses aman oleh Divisi Keuangan.</p>
                </div>
                <button 
                  onClick={() => setShowWithdrawModal(true)}
                  className="mt-6 w-full bg-[#00B47A] hover:bg-[#009b66] text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-transform active:scale-95 shadow-lg shadow-emerald-500/15 cursor-pointer leading-tight"
                >
                  TARIK KOMISI SEKARANG
                </button>
              </div>

              {/* Kirim Saldo card */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <Send className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded">SESAMA MITRA</span>
                </div>
                <div className="mt-4">
                  <h4 className="text-base font-black uppercase tracking-tight text-gray-900 mb-1">Kirim / Transfer Saldo</h4>
                  <p className="text-xs text-gray-500 font-medium">Kirim saldo komisi instan langsung ke Email/ID akun agen terdaftar lainnya.</p>
                </div>
                <button 
                  onClick={() => setShowTransferModal(true)}
                  className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-transform active:scale-95 shadow-lg shadow-indigo-600/15 cursor-pointer leading-tight"
                >
                  KIRIM SALDO SEKARANG
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History Board */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-50 pb-5">
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 italic">Riwayat Transaksi Dompet</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Semua arus keluar & masuk saldo komisi agen</p>
            </div>
            <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-xl border border-gray-100 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">REALTIME</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-gray-50/50">
                  <th className="py-3 px-4">Tanggal & Waktu</th>
                  <th className="py-3 px-4">Tipe Transaksi</th>
                  <th className="py-3 px-4">Keterangan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Nominal (IDR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 italic">
                {uniqueTrans.map((tx: WalletTransaction) => {
                  const isOutflow = tx.userId === userId; // Tarik or Sent transfer
                  const isTransfer = tx.type === 'transfer';
                  
                  // Inflow transfer is received transfer
                  const isInflowTransfer = isTransfer && tx.recipientId === userId;
                  const isWithdrawal = tx.type === 'withdraw';
                  
                  const typeLabel = isWithdrawal 
                    ? 'PENARIKAN' 
                    : isInflowTransfer 
                      ? 'TRANSFER MASUK' 
                      : 'TRANSFER KELUAR';

                  const iconBg = isWithdrawal 
                    ? 'bg-rose-50 text-rose-600' 
                    : isInflowTransfer 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'bg-slate-100 text-slate-600';

                  const amountColor = isWithdrawal 
                    ? 'text-rose-600' 
                    : isInflowTransfer 
                      ? 'text-emerald-600' 
                      : 'text-slate-800';

                  const iconElement = isWithdrawal 
                    ? <ArrowUpRight className="w-4 h-4" /> 
                    : isInflowTransfer 
                      ? <ArrowDownRight className="w-4 h-4" /> 
                      : <ArrowUpRight className="w-4 h-4" />;

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/70 transition-colors text-xs font-medium text-gray-750">
                      <td className="py-4 px-4 font-bold text-gray-500 whitespace-nowrap">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) + ' ' + new Date(tx.createdAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                            {iconElement}
                          </div>
                          <span className="font-black uppercase tracking-wider text-[9px]">{typeLabel}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-normal">
                        <p className="font-extrabold text-gray-900 not-italic text-sm">{tx.description || '-'}</p>
                        {tx.senderEmail && isOutflow && (
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">KE: {tx.recipientEmail || tx.recipientName || '-'}</p>
                        )}
                        {tx.senderEmail && !isOutflow && (
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">DARI: {tx.senderEmail || tx.senderName || '-'}</p>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest
                          ${tx.status === 'approved' || tx.status === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                            tx.status === 'rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 
                            'bg-amber-100 text-amber-800 border border-amber-200'}`}
                        >
                          {tx.status === 'approved' ? 'SELESAI' : tx.status === 'pending' ? 'TUNDA' : tx.status === 'rejected' ? 'DITOLAK' : 'SUKSES'}
                        </span>
                      </td>
                      <td className={`py-4 px-4 text-right font-black italic text-sm ${amountColor}`}>
                        {isInflowTransfer ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })}

                {uniqueTrans.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      Belum ada mutasi saldo di dompet Anda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderOverview = () => {
    // 1. Calculations from Real Data
    const totalJamaah = bookings.length;
    const totalPaketMitra = stats.paketAktif;

    // Financial calculations
    const totalPaidAmount = bookings.reduce((sum, b) => sum + (Number(b.jumlahBayar || b.total_bayar || b.totalPaid || 0) || 0), 0);
    const totalReceivableAmount = bookings.reduce((sum, b) => sum + (Number(b.totalHarga || b.harga || 0) || 0), 0);
    const totalUnpaidAmount = Math.max(0, totalReceivableAmount - totalPaidAmount);
    const billingPercent = totalReceivableAmount > 0 ? Math.round((totalPaidAmount / totalReceivableAmount) * 100) : 0;

    // Document checklist counts
    const completedPassport = bookings.filter(b => b.docPassport).length;
    const completedKtp = bookings.filter(b => b.docKtp).length;
    const completedVaccine = bookings.filter(b => b.docVaccine).length;
    const completedFoto = bookings.filter(b => b.docFoto).length;

    const passportPct = totalJamaah > 0 ? Math.round((completedPassport / totalJamaah) * 100) : 0;
    const ktpPct = totalJamaah > 0 ? Math.round((completedKtp / totalJamaah) * 100) : 0;
    const vaccinePct = totalJamaah > 0 ? Math.round((completedVaccine / totalJamaah) * 100) : 0;
    const fotoPct = totalJamaah > 0 ? Math.round((completedFoto / totalJamaah) * 100) : 0;

    // Nearest departure calculation
    let nearestDepartureStr = "Belum Ada Jadwal";
    const sortedUpcomingBookings = [...bookings]
      .filter(b => b.paketId)
      .map(b => {
        const pMaster = paketMasters.find(pm => pm.id === b.paketId);
        return {
          ...b,
          tglBerangkat: pMaster?.tglBerangkat || null
        };
      })
      .filter(b => b.tglBerangkat)
      .sort((a, b) => new Date(a.tglBerangkat).getTime() - new Date(b.tglBerangkat).getTime());

    if (sortedUpcomingBookings.length > 0 && sortedUpcomingBookings[0].tglBerangkat) {
      nearestDepartureStr = new Date(sortedUpcomingBookings[0].tglBerangkat).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } else if (paketMasters.length > 0) {
      const activePms = [...paketMasters]
        .filter(p => p.tglBerangkat)
        .sort((a, b) => new Date(a.tglBerangkat).getTime() - new Date(b.tglBerangkat).getTime());
      if (activePms.length > 0 && activePms[0].tglBerangkat) {
        nearestDepartureStr = new Date(activePms[0].tglBerangkat).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
    }

    const formatCurrencyMilyar = (num: number) => {
      if (num >= 1000000000) {
        return `Rp ${(num / 1000000000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} M`;
      } else if (num >= 1000000) {
        return `Rp ${(num / 1000000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} Jt`;
      } else {
        return `Rp ${num.toLocaleString('id-ID')}`;
      }
    };

    // Helper to resolve airline & hotel names
    const getAirlineName = (id: string) => {
      const found = maskapais.find(m => m.id === id);
      return found ? found.name : id || "Saudia";
    };

    const getHotelName = (id: string) => {
      const found = hotels.find(h => h.id === id);
      return found ? found.name : id || "Anjum Makkah (⭐️5)";
    };

    // Select recommended/featured package for display
    const featuredPaket = paketMasters.length > 0 
      ? paketMasters[0] 
      : {
          id: 'default-featured',
          nama: 'Umrah Signature 9 Hari Al-Rayyan',
          hargaJualQuad: 32500000,
          hargaDasar: 32500000,
          tglBerangkat: '2026-10-15',
          durasiHari: 9,
          alurPerjalanan: 'Jakarta - Jeddah - Makkah - Madinah',
          kotaKeberangkatan: 'Jakarta',
          maskapaiId: 'Saudi Arabian Airlines',
          photoUtama: 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=800&q=80',
          kuota: 45,
          sisaKuota: 12
        };

    const upcomingSchedules = [...paketMasters]
      .filter(p => p.tglBerangkat)
      .sort((a, b) => new Date(a.tglBerangkat).getTime() - new Date(b.tglBerangkat).getTime())
      .slice(0, 4);

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Welcome Area */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Selamat datang, {currentUserData?.brandName || currentUserData?.namaLengkap || currentUserData?.name || 'Mitra Umaroh'} 👋
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Kelola perjalanan ibadah tamu Allah dengan amanah, transparan, dan profesional melalui Umaroh CRM.
            </p>
          </div>
          <button 
            onClick={() => setShowWizard(true)}
            className="bg-indigo-600 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer shrink-0"
          >
            + BUAT PAKET BARU
          </button>
        </div>

        {/* Dynamic Broadcast Banner */}
        <AdBanner adSlot="dashboard-embed" className="shadow-sm" />

        {/* 4 Core Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Dompet Komisi (Interactive card) */}
          <div className="bg-gradient-to-br from-[#004B87] via-[#0066A6] to-[#007AC2] p-6 rounded-2xl text-white shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl -mr-8 -mt-8"></div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                  <Wallet className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold tracking-wide text-white">Dompet Komisi</p>
              </div>
              <button 
                onClick={() => {
                  setActiveTab('wallet');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-[9px] font-bold bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-md uppercase tracking-wide transition-colors cursor-pointer"
              >
                DOMPET ➔
              </button>
            </div>
            <div className="mb-3">
              <p className="text-[10px] text-sky-100 font-medium uppercase tracking-wider leading-none mb-1">Saldo Aktif</p>
              <h3 className="text-2xl font-bold text-white tracking-tight">Rp {balance.toLocaleString('id-ID')}</h3>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowWithdrawModal(true)}
                className="flex-1 bg-white hover:bg-sky-50 text-indigo-700 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-transform active:scale-95 flex items-center justify-center gap-1 cursor-pointer shadow-sm"
              >
                <Download className="w-3 h-3" />
                TARIK
              </button>
              <button 
                onClick={() => setShowTransferModal(true)}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-transform active:scale-95 flex items-center justify-center gap-1 cursor-pointer border border-white/15"
              >
                <Send className="w-3 h-3" />
                TRANSFER
              </button>
            </div>
          </div>

          {/* Total Jamaah */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-gray-500 font-medium block">Total Jamaah</span>
              <h3 className="text-2xl font-black text-gray-900">{totalJamaah.toLocaleString('id-ID')}</h3>
              <span className="text-[10px] text-emerald-600 font-bold block">
                +{(totalJamaah > 0 ? Math.ceil(totalJamaah / 5) : 0)} Jamaah Aktif
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Paket Aktif */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-gray-500 font-medium block">Paket Aktif</span>
              <h3 className="text-2xl font-black text-gray-900">{totalPaketMitra}</h3>
              <span className="text-[10px] text-blue-600 font-semibold block">Paket Terdaftar</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
          </div>

          {/* Keberangkatan Terdekat */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-gray-500 font-medium block">Keberangkatan Terdekat</span>
              <h3 className="text-sm font-black text-gray-900 mt-2 truncate max-w-[140px]" title={nearestDepartureStr}>
                {nearestDepartureStr}
              </h3>
              <span className="text-[10px] text-indigo-600 font-semibold block">Rencana Terdekat</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Plane className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 2nd Row: Jadwal Keberangkatan Terdekat (Left) & Paket Pilihan & Quick Actions (Right) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Jadwal Keberangkatan Terdekat Table */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase text-gray-800 tracking-wider">
                  Jadwal Keberangkatan Terdekat
                </h3>
                <p className="text-[10px] text-gray-500">Daftar paket aktif dan status operasional terbaru.</p>
              </div>
              <button 
                onClick={() => setActiveTab('katalog')} 
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                Lihat Semua ➔
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                    <th className="py-2.5 px-3">NAMA PAKET</th>
                    <th className="py-2.5 px-3">TANGGAL</th>
                    <th className="py-2.5 px-3">MASKAPAI</th>
                    <th className="py-2.5 px-3">HOTEL</th>
                    <th className="py-2.5 px-3 text-center">KUOTA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {upcomingSchedules.map((paket) => {
                    const planeName = getAirlineName(paket.maskapaiId);
                    const hotMakkah = getHotelName(paket.hotelMakkahId);
                    const terdaftar = Number(paket.targetJamaah - (paket.sisaKuota ?? paket.kuota ?? 45));
                    const progress = Math.min(100, Math.round((terdaftar / (paket.targetJamaah || 45)) * 100));

                    return (
                      <tr key={paket.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-3 font-semibold text-gray-900 max-w-[200px] truncate">
                          {paket.nama}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {paket.tglBerangkat ? new Date(paket.tglBerangkat).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short'
                          }) : '-'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px]">
                            <Plane className="w-3 h-3" />
                            {planeName.split(' ')[0]}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px] max-w-[120px] truncate" title={hotMakkah}>
                          Makkah: {hotMakkah}
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-1 max-w-[70px] mx-auto">
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="text-[10px] text-gray-500 font-bold block text-center leading-none">
                              {terdaftar || 0} / {paket.targetJamaah || 45}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {upcomingSchedules.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        Belum ada jadwal keberangkatan paket master.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column Core: Quick Actions (Aksi Cepat) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black uppercase text-gray-800 tracking-wider">Aksi Cepat</h3>
                <p className="text-[10px] text-gray-500">Alerter pintasan menu operasional Anda.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setActiveTab('jamaah')}
                  className="p-3 text-left rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all flex flex-col gap-2 group cursor-pointer"
                >
                  <UserCheck className="w-5 h-5 text-emerald-500 group-hover:text-emerald-300" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Tambah Jamaah</span>
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('jamaah');
                    setTimeout(() => {
                      const el = document.getElementById('cetak-invoice-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 500);
                  }}
                  className="p-3 text-left rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all flex flex-col gap-2 group cursor-pointer"
                >
                  <FileText className="w-5 h-5 text-blue-500 group-hover:text-blue-200" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Cetak Invoice</span>
                </button>
                <button 
                  onClick={() => setActiveTab('jamaah')}
                  className="p-3 text-left rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all flex flex-col gap-2 group cursor-pointer"
                >
                  <CheckSquare className="w-5 h-5 text-indigo-500 group-hover:text-indigo-300" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Upload Dokumen</span>
                </button>
                <button 
                  onClick={() => setActiveTab('wallet')}
                  className="p-3 text-left rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all flex flex-col gap-2 group cursor-pointer"
                >
                  <TrendingUp className="w-5 h-5 text-amber-500 group-hover:text-amber-300" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Data Keuangan</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-[10px] font-mono text-gray-400 block font-bold uppercase tracking-wider leading-none mb-1">
                Link Pendaftaran Mandiri
              </span>
              <div className="flex items-center gap-1">
                <input 
                  type="text" 
                  readOnly 
                  value={referralLink}
                  className="bg-gray-50 font-mono text-[9px] font-bold border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none flex-grow"
                />
                <button 
                  onClick={copyToClipboard}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-lg shrink-0 transition-transform active:scale-95 cursor-pointer"
                  title="Salin Link"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3rd Row: Featured Package Poster (Left 2/3) & Payment Pizza Donut Chart (Right 1/3) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Featured Package Showcase Poster */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-5">
            <div className="md:col-span-2 h-48 md:h-full relative overflow-hidden bg-slate-900">
              <img 
                src={featuredPaket.photoUtama || 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=800&q=80'} 
                alt="Kaaba Mecca" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-white">
                <span className="inline-block px-2 py-0.5 rounded bg-amber-500 font-bold text-[9px] uppercase tracking-wider mb-1">
                  Katalog Unggulan
                </span>
                <p className="text-xs font-mono font-bold leading-none">Mulai {formatCurrencyMilyar(featuredPaket.hargaJualQuad ?? featuredPaket.hargaDasar ?? 32000000)}</p>
              </div>
            </div>

            <div className="md:col-span-3 p-5 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-indigo-600 block font-bold uppercase tracking-widest">
                  PRODUK PAKET REKOMENDASI
                </span>
                <h4 className="text-base font-black text-gray-900 leading-snug">
                  {featuredPaket.nama}
                </h4>
                <p className="text-xs text-gray-500 line-clamp-2">
                  Nikmati layanan premium, hotel setaraf bintang 5, dengan penerbangan langsung Jakarta - Jeddah bersama Umaroh.com.
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 py-1">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    Durasi: {featuredPaket.durasiHari || 9} Hari
                  </span>
                  <span className="flex items-center gap-1 font-medium truncate">
                    <Plane className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    Penerbangan Direct
                  </span>
                </div>
              </div>

              <div className="flex gap-2.5 mt-4 pt-3 border-t border-gray-100">
                <button 
                  onClick={() => setActiveTab('katalog')}
                  className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Lihat Detail
                </button>
                <button 
                  onClick={() => setActiveTab('katalog')}
                  className="flex-1 bg-indigo-600 hover:bg-slate-900 text-white py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm"
                >
                  Daftar Sekarang
                </button>
              </div>
            </div>
          </div>

          {/* Payment Donut Chart Widget (Ringkasan Pembayaran) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div className="border-b border-gray-100 pb-2">
              <h3 className="text-sm font-black uppercase text-gray-800 tracking-wider">
                Omzet & Pembayaran
              </h3>
              <p className="text-[10px] text-gray-500">Peta pelunasan piutang jamaah Anda.</p>
            </div>

            <div className="flex items-center justify-around py-2">
              {/* Circular SVG Donut */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  {/* Empty base circle */}
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="15.915" 
                    fill="none" 
                    stroke="#F1F5F9" 
                    strokeWidth="3.5" 
                  />
                  {/* Filled active circle */}
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="15.915" 
                    fill="none" 
                    stroke="#3B82F6" 
                    strokeWidth="3.5" 
                    strokeDasharray={`${billingPercent} ${100 - billingPercent}`} 
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                {/* Text inside */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-black text-gray-900 leading-none">{billingPercent}%</span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">TERBAYAR</span>
                </div>
              </div>

              {/* Legends labels */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 block uppercase">TOTAL OMZET</span>
                  <strong className="text-gray-900 text-sm">{formatCurrencyMilyar(totalReceivableAmount)}</strong>
                </div>
                <div>
                  <span className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
                    Lunas: <b className="text-gray-950">{formatCurrencyMilyar(totalPaidAmount)}</b>
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium mt-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200 shrink-0"></span>
                    Piutang: <b className="text-gray-950">{formatCurrencyMilyar(totalUnpaidAmount)}</b>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4th Row: Doc Checklist (1/3) & Flight Carrier info (1/3) & Bulletin Boards (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Checklist Status of Jamaah */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase text-gray-800 tracking-wider">
                  Checklist Dokumen Jamaah
                </h3>
                <p className="text-[10px] text-gray-500">Persentase kelengkapan berkas paspor & identitas.</p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
                REAL-TIME
              </span>
            </div>

            <div className="space-y-3 font-sans text-xs">
              {/* Paspor */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-[10px] text-gray-700 uppercase">
                  <span>Paspor Terkumpul</span>
                  <span>{passportPct}% ({completedPassport}/{totalJamaah})</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${passportPct}%` }}></div>
                </div>
              </div>

              {/* KTP */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-[10px] text-gray-700 uppercase">
                  <span>KTP & KK Tercatat</span>
                  <span>{ktpPct}% ({completedKtp}/{totalJamaah})</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${ktpPct}%` }}></div>
                </div>
              </div>

              {/* Buku Kuning / Meningitis */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-[10px] text-gray-700 uppercase">
                  <span>Buku Vaksin Meningitis</span>
                  <span>{vaccinePct}% ({completedVaccine}/{totalJamaah})</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#EAB308] h-1.5 rounded-full" style={{ width: `${vaccinePct}%` }}></div>
                </div>
              </div>

              {/* Foto Background Putih */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-[10px] text-gray-700 uppercase">
                  <span>Foto Background Putih</span>
                  <span>{fotoPct}% ({completedFoto}/{totalJamaah})</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${fotoPct}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Flight Carrier & Quality Standard Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div className="border-b border-gray-100 pb-2">
              <h3 className="text-sm font-black uppercase text-gray-800 tracking-wider">
                Informasi Hotel & Transportasi
              </h3>
              <p className="text-[10px] text-gray-500">Standar kualitas akomodasi Umaroh CRM.</p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2 p-2.5 rounded-xl border border-gray-100 bg-gray-50/50">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-gray-900 block text-[11px] font-bold">Makkah Hotel Standard</strong>
                  <p className="text-[10px] text-gray-500 leading-tight">Anjum Makkah / Dar Al Ghufran Setaraf (Bintang 5, Jarak Dekat Masjidil Haram)</p>
                </div>
              </div>

              <div className="flex gap-2 p-2.5 rounded-xl border border-gray-100 bg-gray-50/50">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-gray-900 block text-[11px] font-bold">Madinah Hotel Standard</strong>
                  <p className="text-[10px] text-gray-500 leading-tight">Taiba Front / Pullman Zamzam Setaraf (Bintang 250m dari Masjid Nabawi)</p>
                </div>
              </div>

              <div className="flex gap-2 p-2.5 rounded-xl border border-gray-100 bg-gray-50/50">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Plane className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-gray-900 block text-[11px] font-bold">Flight Carriers</strong>
                  <p className="text-[10px] text-gray-500 leading-tight">Saudi Arabian Airlines / Garuda Indonesia (Direct Route, No Transit)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bulletin Board Updates */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div className="border-b border-gray-100 pb-2">
              <h3 className="text-sm font-black uppercase text-gray-800 tracking-wider">
                Pengumuman Terbaru
              </h3>
              <p className="text-[10px] text-gray-500">Informasi internal dilingkungan Umaroh.</p>
            </div>

            <div className="divide-y divide-gray-100 overflow-y-auto max-h-[190px] pr-1 space-y-2.5">
              <div className="pt-2 first:pt-0">
                <span className="flex items-center gap-1.5 text-[8px] font-bold text-indigo-600 uppercase mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 block"></span>
                  OPERASIONAL
                </span>
                <strong className="text-gray-900 block text-[11px] font-bold leading-none">Manasik Umrah Akbar Regional Jakarta</strong>
                <p className="text-[10px] text-gray-500 mt-1 leading-snug">Jadwal manasik keberangkatan Syawal akan dilaksanakan pada Ahad di Hotel Sultan.</p>
              </div>

              <div className="pt-2">
                <span className="flex items-center gap-1.5 text-[8px] font-bold text-[#EAB308] uppercase mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308] block"></span>
                  KEBIJAKAN
                </span>
                <strong className="text-gray-900 block text-[11px] font-bold leading-none">Syarat Penguncian Visa Umrah Sesuai Aturan Terbaru</strong>
                <p className="text-[10px] text-gray-500 mt-1 leading-snug">Pastikan sisa masa aktif Paspor jamaah minimal 6 bulan per tanggal kepulangan.</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Smart Features Bento Grid Launcher */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
          {/* Card 1: AI Copywriter */}
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 rounded-3xl p-6 text-white flex flex-col justify-between border border-indigo-500/20 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform"></div>
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/20 flex items-center justify-center text-indigo-300 mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <h4 className="text-lg font-black uppercase tracking-tight mb-1 italic">Asisten Pemasaran AI</h4>
              <p className="text-[10px] text-indigo-200/80 font-bold uppercase tracking-wider mb-5 leading-relaxed">
                Tulis salinan promo WhatsApp Broadcast, Caption Instagram, & flyer dalam sekejap berdasarkan informasi paket kustom Anda.
              </p>
            </div>
            <div>
              <button 
                onClick={() => setActiveTab('marketing')}
                className="bg-indigo-600 hover:bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-md cursor-pointer"
              >
                Buka Copywriter AI
              </button>
            </div>
          </div>

          {/* Card 2: AI Smart Analytics */}
          <div className="bg-gradient-to-br from-slate-950 to-emerald-950 rounded-3xl p-6 text-white flex flex-col justify-between border border-emerald-500/20 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform"></div>
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center text-emerald-300 mb-4 group-hover:scale-110 transition-transform">
                <BarChart2 className="w-5 h-5 text-emerald-300" />
              </div>
              <h4 className="text-lg font-black uppercase tracking-tight mb-1 italic">Mesin Analitik Cerdas</h4>
              <p className="text-[10px] text-emerald-200/80 font-bold uppercase tracking-wider mb-5 leading-relaxed">
                Audit kepatuhan berkas paspor jamaah, pantau sisa pelunasan piutang, mitigasi anomali data, & forekasting omset.
              </p>
            </div>
            <div>
              <button 
                onClick={() => setActiveTab('analytics')}
                className="bg-emerald-600 hover:bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-md cursor-pointer"
              >
                Auditing Sistem AI
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Flight Tracker */}
        <div className="mt-2 mb-4">
          <FlightTrackerWidget />
        </div>

        {showWizard && (
          <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
            <PaketMasterWizard 
              initialData={{ mitraId: userId, status: 'draft' }}
              onCancel={() => setShowWizard(false)} 
              onSuccess={() => {
                setShowWizard(false);
              }}
              isMitraContext={true}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col lg:flex-row min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-gray-50/20 text-slate-900'}`}>
      {/* Side Navigation Sidebar (Desktop Only) */}
      <aside className={`hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:left-0 lg:border-r lg:z-30 lg:overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-slate-900'}`}>
        {/* Sidebar Brand Header */}
        <div className={`p-5 border-b flex flex-col gap-3 items-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-150'}`}>
          <div className="bg-[#F5B800] py-3.5 px-6 w-full flex items-center justify-center rounded-2xl shadow-md border border-[#D9A300]/10">
            <img 
              src={logoBase64} 
              alt="Logo Umaroh" 
              className="h-8 object-contain max-w-full" 
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-[10px] font-bold tracking-widest text-[#856000] uppercase mt-1 text-center font-sans">
            PORTAL MITRA UMAROH
          </span>

          <div className="relative group w-full">
            <input
              type="file"
              accept="image/*"
              id="sidebar-logo-upload"
              className="hidden"
              onChange={handleSidebarLogoUpload}
            />
            <label
              htmlFor="sidebar-logo-upload"
              className={`flex items-center gap-2.5 text-xs font-bold active:scale-[0.98] transition-all p-2 rounded-xl border max-w-full cursor-pointer duration-200 ${isDarkMode ? 'text-slate-100 bg-slate-800/40 hover:bg-slate-800 border-slate-700 hover:border-amber-400' : 'text-gray-700 bg-[#FFFBEB]/60 hover:bg-[#FFFBEB]/100 hover:border-amber-400 border-amber-200/40'}`}
              title="Klik untuk mengubah foto profil"
            >
              <div className="relative flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-[#B28200] border border-amber-200/80 overflow-hidden flex items-center justify-center">
                {currentUserData?.logo || currentUserData?.customMitraProfile?.logo ? (
                  <img
                    src={currentUserData.logo || currentUserData.customMitraProfile?.logo}
                    alt="Logo Mitra"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-base">👤</span>
                )}
                {/* Hover overlay with Camera Icon */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col text-left">
                <span className={`truncate leading-tight text-[10px] font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-850'}`}>
                  {currentUserData?.brandName || currentUserData?.namaLengkap || currentUserData?.name || 'MITRA ADMINISTRATOR'}
                </span>
                <span className="text-[8px] text-[#B28200] font-black uppercase tracking-widest mt-0.5">
                  SYSTEM LEVEL ACCESS
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 p-4 space-y-4">
          
          {/* Category: OPERASIONAL */}
          <div className="space-y-1">
            <span className={`font-black uppercase text-[9px] tracking-wider px-3.5 py-1.5 rounded-lg block font-sans border ${isDarkMode ? 'bg-amber-950/20 text-[#F5B800] border-amber-500/20' : 'bg-[#FFFDF0] text-[#B28200] border-amber-100/30'}`}>
              ⚙️ 1. OPERASIONAL
            </span>

            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'overview' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${activeTab === 'overview' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'tasks' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <CheckSquare className={`w-4 h-4 ${activeTab === 'tasks' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              Tugas & Pengingat
            </button>

            <button
              onClick={() => setActiveTab('katalog')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'katalog' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <Calendar className={`w-4 h-4 ${activeTab === 'katalog' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              Katalog Paket
            </button>

            <button
              onClick={() => setActiveTab('paket')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'paket' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <Package className={`w-4 h-4 ${activeTab === 'paket' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              Kelola Paket
            </button>

            <button
              onClick={() => setActiveTab('validasi')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'validasi' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <Shield className={`w-4 h-4 ${activeTab === 'validasi' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              Tracking Validasi
            </button>

            <button
              onClick={() => setActiveTab('jamaah')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'jamaah' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <Users className={`w-4 h-4 ${activeTab === 'jamaah' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              Jamaah Saya
            </button>

            <button
              onClick={() => setActiveTab('jaringan')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'jaringan' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <Users className={`w-4 h-4 ${activeTab === 'jaringan' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              Jaringan Saya
            </button>

            <button
              onClick={() => setActiveTab('manifest')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'manifest' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <FileText className={`w-4 h-4 ${activeTab === 'manifest' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              Buat Manifest
            </button>

            <button
              onClick={() => setActiveTab('roomlist')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'roomlist' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <BedDouble className={`w-4 h-4 ${activeTab === 'roomlist' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              Rooming List
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'analytics' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <BarChart2 className={`w-4 h-4 ${activeTab === 'analytics' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              AI Analytics
            </button>
          </div>

          {/* Category: FINANCE */}
          <div className="space-y-1">
            <span className={`font-black uppercase text-[9px] tracking-wider px-3.5 py-1.5 rounded-lg block font-sans border ${isDarkMode ? 'bg-amber-950/20 text-[#F5B800] border-amber-500/20' : 'bg-[#FFFDF0] text-[#B28200] border-amber-100/30'}`}>
              💳 2. FINANCE
            </span>

            <button
              onClick={() => setActiveTab('wallet')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'wallet' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <Wallet className={`w-4 h-4 ${activeTab === 'wallet' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              Dompet & Komisi
            </button>

            <button
              onClick={() => setActiveTab('toko')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'toko' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <ShoppingCart className={`w-4 h-4 ${activeTab === 'toko' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              Belanja Perlengkapan
            </button>
          </div>

          {/* Category: MARKETING */}
          <div className="space-y-1">
            <span className={`font-black uppercase text-[9px] tracking-wider px-3.5 py-1.5 rounded-lg block font-sans border ${isDarkMode ? 'bg-amber-950/20 text-[#F5B800] border-amber-500/20' : 'bg-[#FFFDF0] text-[#B28200] border-amber-100/30'}`}>
              📣 3. MARKETING & SALES GROWTH
            </span>

            <button
              onClick={() => setActiveTab('marketing')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'marketing' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${activeTab === 'marketing' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              Marketing AI
            </button>

            <button
              onClick={() => setActiveTab('crm')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'crm' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <Target className={`w-4 h-4 ${activeTab === 'crm' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              CRM Pipeline Prospek
            </button>

            <button
              onClick={() => setActiveTab('website')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'website' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${activeTab === 'website' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              Website Agen Saya
            </button>

            <button
              onClick={() => setActiveTab('feed')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'feed' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <Zap className={`w-4 h-4 ${activeTab === 'feed' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              Feed Kolaborasi
            </button>

            <button
              onClick={() => setActiveTab('elearning')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'elearning' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <BookOpen className={`w-4 h-4 ${activeTab === 'elearning' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              E-Learning Akademi
            </button>
          </div>

          {/* Category: ACCOUNT SETTINGS */}
          <div className="space-y-1">
            <span className={`font-black uppercase text-[9px] tracking-wider px-3.5 py-1.5 rounded-lg block font-sans border ${isDarkMode ? 'bg-amber-950/20 text-[#F5B800] border-amber-500/20' : 'bg-[#FFFDF0] text-[#B28200] border-amber-100/30'}`}>
              👤 4. AKUN & SETTING
            </span>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                activeTab === 'profile' 
                  ? 'bg-[#F5B800] text-slate-900 shadow-md ring-1 ring-amber-400 font-extrabold scale-102' 
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-650 hover:bg-[#FFFDF0] hover:text-[#B28200]'
              }`}
            >
              <User className={`w-4 h-4 ${activeTab === 'profile' ? 'text-slate-900' : isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              Profil Detail
            </button>

            <button
              onClick={async () => {
                if (confirm('Apakah Anda yakin ingin keluar dari akun Mitra?')) {
                  try {
                    await signOut(auth);
                  } catch (err) {
                    console.error('Error signing out:', err);
                  }
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${isDarkMode ? 'text-red-400 hover:bg-red-950/20 hover:text-red-300' : 'text-red-650 hover:bg-red-50 hover:text-red-700'}`}
            >
              <LogOut className="w-4 h-4 text-red-500" />
              Keluar (Logout)
            </button>
          </div>
        </nav>

        {/* Sync Status Frame */}
        <div className={`p-4 border-t ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-gray-50 border-gray-150 text-gray-500'}`}>
          <div className="flex items-center gap-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-550 animate-pulse inline-block"></span>
            CONNECTED TO API
          </div>
        </div>
      </aside>

      {/* Main Container including Responsive layouts */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        {/* Mobile Sidebar Full Menu Overlay for Partners (Mitra) */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
              onClick={() => setIsMobileMenuOpen(false)} 
            />
            {/* Drawer content */}
            <div className={`absolute left-0 top-0 bottom-0 w-[85%] max-w-sm shadow-2xl flex flex-col animate-in slide-in-from-left duration-250 ${
              isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'
            }`}>
              {/* Header */}
              <div className={`p-5 border-b flex items-center justify-between ${
                isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-gray-150 bg-gray-50/50'
              }`}>
                <div className="flex items-center gap-2">
                  <div className="bg-[#F5B800] p-1.5 rounded-lg">
                    <img src={logoBase64} alt="Umaroh Logo" className="h-6 w-auto" />
                  </div>
                  <div className="text-left">
                    <span className="font-black text-xs uppercase tracking-wider text-amber-500 block">Mitra Portal</span>
                    <span className="text-[9px] font-bold text-gray-400 block uppercase">Nawaitul Access</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className={`p-1.5 rounded-xl transition-all ${
                    isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Category 1: Bisnis & Penjualan */}
                <div className="space-y-1.5">
                  <span className={`block text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg text-left ${
                    isDarkMode ? 'bg-slate-800/60 text-slate-400' : 'bg-amber-550/10 text-[#C69200]'
                  }`}>
                    💼 Bisnis & Produk
                  </span>
                  {[
                    { id: 'overview', label: 'Beranda', icon: LayoutDashboard },
                    { id: 'feed', label: 'Feed Kolaborasi', icon: Zap },
                    { id: 'elearning', label: 'E-Learning', icon: BookOpen },
                    { id: 'katalog', label: 'Katalog Paket', icon: Calendar },
                    { id: 'paket', label: 'Produk Saya', icon: Package },
                    { id: 'validasi', label: 'Validasi Paket', icon: Shield },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as MitraTab);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                          isActive 
                            ? 'bg-[#F5B800] text-slate-900 shadow-sm font-black' 
                            : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-650 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900' : 'text-gray-500'}`} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {/* Category 2: Administrasi Jamaah */}
                <div className="space-y-1.5">
                  <span className={`block text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg text-left ${
                    isDarkMode ? 'bg-slate-800/60 text-slate-400' : 'bg-amber-550/10 text-[#C69200]'
                  }`}>
                    👥 Kelola Jamaah
                  </span>
                  {[
                    { id: 'jamaah', label: 'Data Jamaah', icon: Users },
                    { id: 'jaringan', label: 'Jaringan Mitra', icon: Users },
                    { id: 'manifest', label: 'Buat Manifest', icon: FileText },
                    { id: 'roomlist', label: 'Rooming List', icon: BedDouble },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as MitraTab);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                          isActive 
                            ? 'bg-[#F5B800] text-slate-900 shadow-sm font-black' 
                            : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-650 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900' : 'text-gray-500'}`} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {/* Category 3: Keuangan & Fitur Pintar */}
                <div className="space-y-1.5">
                  <span className={`block text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg text-left ${
                    isDarkMode ? 'bg-slate-800/60 text-slate-400' : 'bg-amber-550/10 text-[#C69200]'
                  }`}>
                    ⚙️ Fitur Tambahan & Akun
                  </span>
                  {[
                    { id: 'marketing', label: 'AI Marketing', icon: Sparkles },
                    { id: 'crm', label: 'CRM Pipeline Prospek', icon: Target },
                    { id: 'website', label: 'Website Agen Saya', icon: LayoutDashboard },
                    { id: 'analytics', label: 'Smart Analytics', icon: BarChart2 },
                    { id: 'wallet', label: 'U-Wallet / Dompet', icon: Wallet },
                    { id: 'toko', label: 'Toko Perlengkapan', icon: ShoppingCart },
                    { id: 'profile', label: 'Profil Saya', icon: User },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as MitraTab);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                          isActive 
                            ? 'bg-[#F5B800] text-slate-900 shadow-sm font-black' 
                            : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-650 hover:bg-gray-50'
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
              <div className={`p-4 border-t ${
                isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-gray-150 bg-gray-50/50'
              }`}>
                <button
                  onClick={async () => {
                    if (confirm('Apakah Anda yakin ingin keluar dari akun Mitra?')) {
                      try {
                        await signOut(auth);
                      } catch (err) {
                        console.error('Error signing out:', err);
                      }
                    }
                  }}
                  className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-150 ${
                    isDarkMode 
                      ? 'bg-red-950/30 text-red-400 border border-red-900/30 hover:bg-red-900/20' 
                      : 'bg-red-50 text-red-700 border border-red-150 hover:bg-red-100'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  Keluar Akun
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation */}
        <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 px-2 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)] border-t transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-slate-900'}`}>
          <div className="flex justify-around items-center h-16">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'overview' ? 'text-[#C69200] font-black' : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[10px] font-bold">Beranda</span>
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'feed' ? 'text-[#C69200] font-black' : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Zap className={`w-5 h-5 ${activeTab === 'feed' ? 'text-[#C69200]' : 'text-gray-400'}`} />
              <span className="text-[10px] font-bold">Feed</span>
            </button>
            <button
              onClick={() => setActiveTab('katalog')}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'katalog' ? 'text-[#C69200] font-black' : 'text-gray-400'}`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-[10px] font-bold">Katalog</span>
            </button>
            <button
              onClick={() => setActiveTab('paket')}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'paket' ? 'text-[#C69200] font-black' : 'text-gray-400'}`}
            >
              <Package className="w-5 h-5" />
              <span className="text-[10px] font-bold">Produk</span>
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${isMobileMenuOpen ? 'text-[#C69200] font-black' : 'text-gray-400'}`}
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px] font-bold">Lainnya</span>
            </button>
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 lg:pb-8 flex-grow">
          {/* Top Premium Header Bar */}
          <div className={`rounded-2xl border p-4 flex flex-row items-center justify-between gap-4 mb-6 shadow-sm transition-all duration-200 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/20' : 'bg-white border-gray-100 text-slate-900 shadow-sm'
          }`}>
            {/* Hamburger Menu Trigger for Mobile/Tablet */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`lg:hidden p-2 rounded-xl border flex items-center justify-center transition-all ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-100' 
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-slate-700'
              }`}
            >
              <Menu className="w-4.5 h-4.5" />
            </button>
            {/* Search Input Container */}
            <div className="relative flex-1 max-w-md z-40">
              <input 
                type="text" 
                placeholder="Cari paket, jamaah, Invoice, dll..." 
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className={`w-full border rounded-xl py-2 px-4 pr-10 text-xs focus:outline-none transition-all font-medium ${
                  isDarkMode 
                    ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-slate-700' 
                    : 'bg-gray-50/50 border border-gray-200/80 text-gray-700 placeholder-gray-400 focus:ring-indigo-100/50 focus:border-indigo-500'
                }`}
              />
              {globalSearch && (
                <button 
                  onClick={() => setGlobalSearch('')}
                  className="absolute right-9 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 font-bold text-xs"
                >
                  ✕
                </button>
              )}
              <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

              {/* Real-time Search Results Dropdown */}
              {globalSearch && (
                <div className={`absolute left-0 right-0 mt-2 rounded-2xl border shadow-xl max-h-[30rem] overflow-y-auto p-4 z-50 text-left transition-all ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-150 text-slate-900'
                }`}>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Hasil Pencarian</span>
                    <button 
                      onClick={() => setGlobalSearch('')}
                      className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                    >
                      Tutup
                    </button>
                  </div>
                  
                  {(() => {
                    const filteredSearchPaket = paketMasters.filter(p => p.nama.toLowerCase().includes(globalSearch.toLowerCase()));
                    const filteredSearchJamaah = bookings.filter(b => (b.namaJamaah || b.nama || '').toLowerCase().includes(globalSearch.toLowerCase()));
                    
                    if (filteredSearchPaket.length === 0 && filteredSearchJamaah.length === 0) {
                      return (
                        <div className="py-8 text-center text-gray-400">
                          <p className="text-xs font-bold uppercase tracking-wider">Tidak Ada Hasil</p>
                          <p className="text-[10px] text-gray-400 mt-1">Ganti kata kunci Anda atau periksa ejaan.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {/* Paket Masters */}
                        {filteredSearchPaket.length > 0 && (
                          <div>
                            <div className="text-[9px] font-black uppercase tracking-wider text-amber-500 mb-1">Paket Umroh ({filteredSearchPaket.length})</div>
                            <div className="space-y-2">
                              {filteredSearchPaket.map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => {
                                    setActiveTab('katalog');
                                    setGlobalSearch('');
                                  }}
                                  className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                                    isDarkMode ? 'border-slate-800 hover:bg-slate-800/50 bg-slate-850' : 'border-gray-100 hover:bg-gray-50 bg-gray-50/20'
                                  }`}
                                >
                                  <div>
                                    <div className="text-xs font-bold">{p.nama}</div>
                                    <div className="text-[9px] text-gray-400 font-mono mt-0.5 uppercase">
                                      Berangkat: {p.tglBerangkat || 'Draft'} • {p.durasiHari || 9} Hari
                                    </div>
                                  </div>
                                  <span className="text-xs font-black text-amber-500 shrink-0">
                                    Rp {p.hargaJualQuad?.toLocaleString('id-ID') || p.hargaDasar?.toLocaleString('id-ID')}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Jamaah & Bookings */}
                        {filteredSearchJamaah.length > 0 && (
                          <div>
                            <div className="text-[9px] font-black uppercase tracking-wider text-emerald-500 mb-1">Jamaah & Pendaftaran ({filteredSearchJamaah.length})</div>
                            <div className="space-y-2">
                              {filteredSearchJamaah.map(b => (
                                <button
                                  key={b.id}
                                  onClick={() => {
                                    setActiveTab('jamaah');
                                    setGlobalSearch('');
                                  }}
                                  className={`w-full text-left p-2.5 rounded-xl border flex flex-col transition-all ${
                                    isDarkMode ? 'border-slate-800 hover:bg-slate-800/50 bg-slate-850' : 'border-gray-100 hover:bg-gray-50 bg-gray-50/20'
                                  }`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-xs font-bold">{b.namaJamaah || b.nama}</span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                      b.statusPembayaran === 'Lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {b.statusPembayaran || b.status || 'Pending'}
                                    </span>
                                  </div>
                                  <div className="text-[9px] text-gray-400 font-mono mt-0.5 uppercase flex justify-between w-full">
                                    <span>Paket: {b.paketNama || 'Katalog Pilihan'}</span>
                                    <span>Bayar: Rp {(b.jumlahBayar || b.total_bayar || b.totalPaid || 0).toLocaleString('id-ID')}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Quick Badges and Controls */}
            <div className="flex items-center gap-3 relative">
              
              {/* Theme Toggle Button */}
              <button 
                onClick={toggleTheme}
                title={isDarkMode ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'} 
                className={`p-2 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                  isDarkMode ? 'hover:bg-slate-800 text-amber-400 bg-slate-800/30' : 'hover:bg-gray-50 text-gray-500 bg-gray-50/50 border border-gray-100'
                }`}
              >
                {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowNotificationDropdown(!showNotificationDropdown);
                    setShowChatDropdown(false);
                  }}
                  title="Pemberitahuan resmi" 
                  className={`relative p-2 active:scale-95 transition-all rounded-xl cursor-pointer flex items-center justify-center ${
                    isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-50 text-gray-500'
                  }`}
                >
                  <Bell className="w-5 h-5 text-gray-650 dark:text-slate-300" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#055734] text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm font-sans">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>

                {showNotificationDropdown && (
                  <div className={`absolute right-0 mt-2 w-80 md:w-96 rounded-2xl border shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-slate-900'
                  }`}>
                    {/* Popover Header */}
                    <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-gray-50/50 border-gray-100'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider">Notifikasi</span>
                        {notifications.filter(n => !n.read).length > 0 && (
                          <span className="bg-[#055734] text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                            {notifications.filter(n => !n.read).length} Baru
                          </span>
                        )}
                      </div>
                      {notifications.filter(n => !n.read).length > 0 && (
                        <button 
                          onClick={async () => {
                            await markAllNotificationsAsRead(notifications);
                          }}
                          className="text-[10px] font-extrabold text-[#055734] hover:underline uppercase tracking-wider cursor-pointer"
                        >
                          Tandai Semua Dibaca
                        </button>
                      )}
                    </div>

                    {/* Popover Content */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-400">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-xs font-bold uppercase tracking-wider">Belum Ada Notifikasi</p>
                          <p className="text-[10px] text-gray-400 mt-1">Anda akan mendapat pemberitahuan saat sistem memperbarui status Anda.</p>
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
                              className={`p-4 flex gap-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left ${!notif.read ? 'bg-indigo-50/10' : ''}`}
                            >
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${badgeBg}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`text-xs text-gray-900 dark:text-slate-100 leading-snug ${!notif.read ? 'font-extrabold' : 'font-medium'}`}>
                                    {notif.title}
                                  </p>
                                  {!notif.read && (
                                    <span className="w-2 h-2 rounded-full bg-[#055734] shrink-0"></span>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                                  {notif.message}
                                </p>
                                <span className="text-[8px] font-mono font-bold text-gray-400 block mt-1 uppercase">
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

              {/* Chat messages */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowChatDropdown(!showChatDropdown);
                    setShowNotificationDropdown(false);
                  }}
                  title="Diskusi / Chat Mitra & Admin" 
                  className={`relative p-2 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                    isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-50 text-gray-500'
                  }`}
                >
                  <MessageSquare className="w-5 h-5 text-gray-650 dark:text-slate-300" />
                  {chatMessages.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#055734] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm font-sans">
                      {chatMessages.length}
                    </span>
                  )}
                </button>

                {showChatDropdown && (
                  <div className={`absolute right-0 mt-2 w-80 md:w-96 rounded-2xl border shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-slate-900'
                  }`}>
                    {/* Popover Header */}
                    <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-gray-50/50 border-gray-100'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider">Diskusi & Chat Support</span>
                        <span className="bg-[#055734] text-white text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">Mitra-Admin</span>
                      </div>
                      <button 
                        onClick={() => {
                          setShowChatDropdown(false);
                          setActiveTab('feed');
                        }}
                        className="text-[10px] font-extrabold text-[#055734] hover:underline uppercase tracking-wider cursor-pointer"
                      >
                        Buka Feed ➔
                      </button>
                    </div>

                    {/* Chat Messages Stream */}
                    <div className="p-4 max-h-72 overflow-y-auto space-y-3 flex flex-col">
                      {chatMessages.map((msg) => {
                        const isAdmin = msg.sender.includes('Admin');
                        return (
                          <div key={msg.id} className={`flex gap-2.5 max-w-[85%] ${isAdmin ? 'self-start' : 'self-end flex-row-reverse'}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {msg.avatar}
                            </div>
                            <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                              isAdmin 
                                ? isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-800'
                                : 'bg-[#055734] text-white'
                            }`}>
                              <p className="font-extrabold text-[10px] mb-0.5 uppercase tracking-wide opacity-80">{msg.sender}</p>
                              <p className="font-medium whitespace-pre-line">{msg.text}</p>
                              <span className="text-[8px] font-mono block mt-1 text-right opacity-60">{msg.time}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chat Input Field */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newMsgText.trim()) return;
                        const newMsg = {
                          id: `msg-${Date.now()}`,
                          sender: currentUserData?.brandName || currentUserData?.namaLengkap || 'Mitra',
                          text: newMsgText.trim(),
                          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                          avatar: (currentUserData?.brandName || currentUserData?.namaLengkap || 'M')[0].toUpperCase()
                        };
                        setChatMessages([...chatMessages, newMsg]);
                        setNewMsgText('');
                        
                        // Fake auto-reply from Admin to simulate interactive chat!
                        setTimeout(() => {
                          setChatMessages(prev => [
                            ...prev,
                            {
                              id: `msg-reply-${Date.now()}`,
                              sender: 'Admin Umaroh',
                              text: "Terima kasih atas tanggapan Anda. Kami sedang memverifikasi laporan tersebut. Kami hubungi Anda segera.",
                              time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                              avatar: 'A'
                            }
                          ]);
                        }, 2500);
                      }}
                      className={`p-3 border-t flex gap-2 items-center ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-gray-50/50 border-gray-100'}`}
                    >
                      <input 
                        type="text" 
                        placeholder="Tulis pesan..."
                        value={newMsgText}
                        onChange={(e) => setNewMsgText(e.target.value)}
                        className={`flex-1 text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-gray-200 text-slate-800 placeholder-gray-400'
                        }`}
                      />
                      <button 
                        type="submit"
                        className="bg-[#055734] hover:bg-[#044c2d] text-white p-2 rounded-xl transition-transform active:scale-95 shrink-0 flex items-center justify-center cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>

          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'tasks' && (
            <TaskManagementView 
              isMitraMode={true} 
              mitraId={auth.currentUser?.uid || ''} 
              mitraBrandName={currentUserData?.brandName || currentUserData?.namaLengkap || currentUserData?.name || ''} 
            />
          )}
          {activeTab === 'feed' && <FeedKolaborasiView onNavigateToCatalog={() => setActiveTab('katalog')} />}
          {activeTab === 'elearning' && <ELearningMitraView />}
          {activeTab === 'katalog' && <KatalogPaketView />}
          {activeTab === 'paket' && <PaketMitraView />}
          {activeTab === 'validasi' && <ValidasiPaketMitraView />}
          {activeTab === 'jamaah' && <JamaahMitraView />}
          {activeTab === 'jaringan' && <JaringanMitraView />}
          {activeTab === 'manifest' && <ManifestPage />}
          {activeTab === 'roomlist' && <RoomingListMitraView isDarkMode={isDarkMode} />}
          {activeTab === 'marketing' && <AIMarketingView />}
          {activeTab === 'crm' && renderCRM()}
          {activeTab === 'website' && renderWebsite()}
          {activeTab === 'analytics' && <AISmartAnalyticsView />}
          {activeTab === 'profile' && <ProfileView isDesktop={true} />}
          {activeTab === 'wallet' && renderWallet()}
          {activeTab === 'toko' && renderToko()}
        </div>
      </div>

      {/* WALLET OPERATION MODALS */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-150 h-18 flex items-center justify-between bg-gray-550/5">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-gray-900 italic">Pencairan Komisi</h3>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">Tarik dana aman ke rekening Anda</p>
              </div>
              <button 
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawAmount(0);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer text-xl font-bold p-1 bg-white border border-gray-200 rounded-lg w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="p-6 space-y-4">
              {/* Balance display */}
              <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 flex justify-between items-center">
                <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider">SALDO DOMPET</span>
                <span className="text-sm font-black text-indigo-950">Rp {balance.toLocaleString('id-ID')}</span>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Nominal Penarikan (IDR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400 italic">Rp</span>
                  <input 
                    type="number"
                    required
                    placeholder="0"
                    min="10000"
                    max={balance}
                    value={withdrawAmount || ''}
                    onChange={(e) => setWithdrawAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00B47A]/30 focus:border-[#00B47A] focus:bg-white transition-all italic"
                  />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  <span>Min: Rp 10.000</span>
                  <button 
                    type="button" 
                    onClick={() => setWithdrawAmount(balance)} 
                    className="text-[#00B47A] font-black hover:underline cursor-pointer"
                  >
                    TARIK SEMUA
                  </button>
                </div>
              </div>

              {/* Bank Name Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Bank Tujuan</label>
                <select 
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-550 focus:bg-white transition-all uppercase cursor-pointer"
                >
                  <option value="BCA">CENTRAL ASIA (BCA)</option>
                  <option value="MANDIRI">MANDIRI</option>
                  <option value="BRI">RAKYAT INDONESIA (BRI)</option>
                  <option value="BNI">NEGARA INDONESIA (BNI)</option>
                  <option value="BSI">SYARIAH INDONESIA (BSI)</option>
                  <option value="DANAMON">DANAMON</option>
                  <option value="CIMB">CIMB NIAGA / SYARIAH</option>
                </select>
              </div>

              {/* Account Number */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Nomor Rekening</label>
                <input 
                  type="text"
                  required
                  placeholder="Contoh: 8012345678"
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-550 focus:bg-white transition-all"
                />
              </div>

              {/* Account Owner */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Nama Pemilik Rekening</label>
                <input 
                  type="text"
                  required
                  placeholder="Nama sesuai buku tabungan"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-550 focus:bg-white transition-all uppercase"
                />
              </div>

              {/* Submit Info */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingWithdraw || withdrawAmount <= 0 || withdrawAmount > balance}
                  className="w-full bg-[#00B47A] hover:bg-[#009b66] disabled:bg-gray-200 disabled:text-gray-400 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmittingWithdraw ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      MEMPROSES...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      KIRIM PERMINTAAN TARIK
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-150 h-18 flex items-center justify-between bg-gray-550/5">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-gray-900 italic">Transfer Saldo Komisi</h3>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">Kirim secara instan ke sesama agen</p>
              </div>
              <button 
                onClick={() => {
                  setShowTransferModal(false);
                  setRecipientEmail('');
                  setRecipientUser(null);
                  setTransferAmount(0);
                  setTransferNote('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer text-xl font-bold p-1 bg-white border border-gray-200 rounded-lg w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
              {/* Balance display */}
              <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100 flex justify-between items-center">
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">SALDO ANDA</span>
                <span className="text-sm font-black text-amber-950">Rp {balance.toLocaleString('id-ID')}</span>
              </div>

              {/* Recipient Email lookup */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Email Akun Penerima</label>
                <div className="flex gap-2">
                  <input 
                    type="email"
                    required
                    placeholder="nama@email.com"
                    value={recipientEmail}
                    onChange={(e) => {
                      setRecipientEmail(e.target.value);
                      setRecipientUser(null);
                      setRecipientSearchError('');
                    }}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-550 focus:bg-white transition-all lowercase"
                  />
                  <button
                    type="button"
                    onClick={verifyRecipient}
                    disabled={isSearchingRecipient || !recipientEmail}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-450 text-white font-black text-[10px] px-4 rounded-2xl uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {isSearchingRecipient ? 'Mencari...' : 'Verifikasi'}
                  </button>
                </div>

                {recipientSearchError && (
                  <p className="text-[9px] font-black uppercase text-rose-600 tracking-wide mt-1">{recipientSearchError}</p>
                )}

                {recipientUser && (
                  <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100 flex items-center gap-3 animate-in fade-in duration-200 mt-1">
                    <div className="w-7 h-7 rounded-full bg-emerald-550 flex items-center justify-center text-white shrink-0">
                      ✓
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-emerald-800 uppercase tracking-widest leading-none">AKUN VERIFIKASI SESUAI</p>
                      <p className="text-xs font-extrabold text-emerald-950 mt-0.5">{recipientUser.namaLengkap || recipientUser.name || 'Mitra Agen'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Nominal Transfer (IDR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400 italic">Rp</span>
                  <input 
                    type="number"
                    required
                    placeholder="0"
                    min="1"
                    max={balance}
                    value={transferAmount || ''}
                    onChange={(e) => setTransferAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 focus:bg-white transition-all italic"
                  />
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Catatan Tambahan (Opsional)</label>
                <input 
                  type="text"
                  placeholder="Misal: Bagi komisi pendaftaran paket"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-550 focus:bg-white transition-all"
                />
              </div>

              {/* Submit Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingTransfer || !recipientUser || transferAmount <= 0 || transferAmount > balance}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmittingTransfer ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      MEMPROSES LEDGER...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      KIRIM SALDO SEKARANG
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
