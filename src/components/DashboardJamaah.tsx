import React, { useState, useEffect } from 'react';
import { 
  Search, Star, LayoutDashboard, Package, History, User,
  ShoppingCart, Tag, Compass, Sparkles, BookOpen,
  MessageCircle, CheckCircle, Info, Minus, Plus, Check,
  BadgePercent, Send, X
} from 'lucide-react';
import { auth, db, collection, addDoc, onSnapshot, query, where, serverTimestamp, handleFirestoreError, OperationType, doc } from '../firebase';
import { KatalogPaketView } from './KatalogPaketView';
import { RiwayatPemesananView } from './RiwayatPemesananView';
import { ProfileView } from './ProfileView';

type JamaahTab = 'overview' | 'katalog' | 'riwayat' | 'profile';

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

export const DashboardJamaah = () => {
  const [activeTab, setActiveTab] = useState<JamaahTab>('overview');
  const [katalogSearch, setKatalogSearch] = useState<string>('');
  const [selectedMitraId, setSelectedMitraId] = useState<string | null>(null);
  const userId = auth.currentUser?.uid;

  // Real-time Database state
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([]);
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

  // Shopee-style Perlengkapan Shop
  const shopProducts: ShopProduct[] = [
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
    { role: 'assistant', content: 'Halo Kak! Selamat datang di Pusat Chat Sahabat Marawa. ✨ Ada yang bisa kami bantu seputar rencana perjalanan ibadah, rukun umroh, manasik, atau kelengkapan belanja baju ihram hari ini? 🙏🕌' }
  ]);
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);

  // Listen to physical items shop orders from firestore
  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'shop_orders'), where('jamaahId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
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

    return () => unsubscribe();
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
        jamaahName: auth.currentUser?.displayName || 'Jamaah Marawa',
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
                PROMO EKSKLUSIF MARAWA
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
              <div className="mt-2 text-[10px] font-mono text-orange-600 bg-orange-50 inline-block px-1.5 py-0.5 rounded font-black border border-orange-100">KODE: MARAWA15</div>
            </div>
            <button
              onClick={() => handleClaimVoucher('MARAWA15')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${
                claimedVouchers.includes('MARAWA15')
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer'
              }`}
            >
              {claimedVouchers.includes('MARAWA15') ? '✓ CLAIMED' : 'KLAIM'}
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
              <div className="mt-2 text-[10px] font-mono text-emerald-600 bg-emerald-50 inline-block px-1.5 py-0.5 rounded font-black border border-emerald-100">KODE: MARAWAPORTER</div>
            </div>
            <button
              onClick={() => handleClaimVoucher('MARAWAPORTER')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${
                claimedVouchers.includes('MARAWAPORTER')
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
              }`}
            >
              {claimedVouchers.includes('MARAWAPORTER') ? '✓ CLAIMED' : 'KLAIM'}
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
                ⚡ FLASH SALE MARAWA
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
          <span className="text-xs text-emerald-600 font-extrabold bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">MARAWA SHOP</span>
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

  return (
    <div className="flex flex-col h-full relative">
      
      {/* Search Header (Shopee Style) */}
      <div className="bg-emerald-800 text-white pt-4 pb-5 px-4 md:px-6 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🕋</span>
              <div>
                <h1 className="text-base font-black tracking-tight flex items-center gap-1.5 leading-none">
                  MARAWA <span className="text-[9px] bg-red-600 px-1.5 py-0.5 rounded font-bold">MARKET</span>
                </h1>
                <p className="text-[7px] text-emerald-200 tracking-widest font-black uppercase">UMRAH & HAJJ CENTER</p>
              </div>
            </div>

            {/* Shopee Smart AI bubble indicator */}
            <button 
              onClick={() => setShowAiChat(true)}
              className="md:hidden bg-white/20 p-2 rounded-full relative hover:bg-white/30"
            >
              <MessageCircle className="w-5 h-5 text-amber-300" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-emerald-800"></span>
            </button>
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

          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => setShowAiChat(true)}
              className="flex items-center gap-1.5 text-xs font-black bg-amber-500 hover:bg-amber-600 text-gray-950 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow"
            >
              <Sparkles className="w-4 h-4" />
              TANYA SAHABAT AI
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
                  <h3 className="font-black text-xs">SAHABAT MARAWA AI</h3>
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
                  Bonus Tas Marawa? 🎁
                </button>
              </div>
            </div>

            {/* Input message footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-150 flex items-center gap-2">
              <input
                type="text"
                placeholder="Ketik pertanyaan untuk CS Sahabat Marawa..."
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
                      <option value="Deposit Saldo Marawa">Potong Saldo Dompet Komisi Marawa</option>
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
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'overview' ? 'text-emerald-700 font-extrabold' : 'text-gray-400'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-bold">Rekomendasi</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('katalog');
            }}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'katalog' ? 'text-orange-600 font-extrabold' : 'text-gray-400'}`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-bold">Katalog</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('riwayat');
            }}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'riwayat' ? 'text-blue-600 font-extrabold' : 'text-gray-400'}`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] font-bold">Pesanan</span>
          </button>
          
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'profile' ? 'text-emerald-700 font-extrabold' : 'text-gray-400'}`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold">Profil Ku</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation (Desktop Only) */}
      <div className="hidden lg:block bg-white border-b border-gray-200 px-4 py-3 print:hidden shadow-sm sticky top-[72px] z-35">
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
  );
};
