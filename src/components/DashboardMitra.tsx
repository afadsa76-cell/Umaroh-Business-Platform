import React, { useState, useEffect } from 'react';
import { Wallet, Users, Package, Copy, CheckCircle2, LayoutDashboard, Calendar, User, TrendingUp, Shield, Zap, Target, Sparkles, BarChart2, ArrowUpRight, ArrowDownRight, Send, RefreshCw, Download, Camera, LogOut, Plane, FileText, CheckSquare, MapPin, UserCheck, Search, MessageSquare, Bell, Check, Info, AlertTriangle, X } from 'lucide-react';
import { auth, db, doc, onSnapshot, addDoc, collection, query, where, getDocs, handleFirestoreError, OperationType, runTransaction, updateDoc, signOut } from '../firebase';
import { AppNotification } from '../types';
import { listenToUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, sendNotification } from '../services/notificationService';
import { PaketMitraView } from './PaketMitraView';
import { KatalogPaketView } from './KatalogPaketView';
import { JamaahMitraView } from './JamaahMitraView';
import { JaringanMitraView } from './JaringanMitraView';
import { ProfileView } from './ProfileView';
import { ValidasiPaketMitraView } from './ValidasiPaketMitraView';
import { PaketMasterWizard } from './PaketMasterWizard';
import { FeedKolaborasiView } from './FeedKolaborasiView';
import { AIMarketingView } from './AIMarketingView';
import { AISmartAnalyticsView } from './AISmartAnalyticsView';
import { FlightTrackerWidget } from './FlightTrackerWidget';

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

type MitraTab = 'overview' | 'feed' | 'katalog' | 'paket' | 'validasi' | 'jamaah' | 'jaringan' | 'profile' | 'marketing' | 'analytics' | 'wallet';

export const DashboardMitra = () => {
  const [activeTab, setActiveTab] = useState<MitraTab>('overview');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
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
      const q = query(collection(db, 'users'), where('email', '==', recipientEmail.trim().toLowerCase()));
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
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50/20">
      {/* Side Navigation Sidebar (Desktop Only) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:left-0 lg:bg-white lg:border-r lg:border-gray-200 lg:z-30 lg:overflow-y-auto">
        {/* Sidebar Brand Header */}
        <div className="p-6 border-b border-gray-150 flex flex-col gap-1 items-start bg-indigo-50/10">
          <div className="bg-white py-2 px-4 rounded-xl flex items-center justify-center border border-gray-200 shadow-sm w-full mb-1">
            <img 
              src="https://umaroh.com/assets/logo-light-D4UzTX0_.png" 
              alt="Logo Umaroh" 
              className="h-7 object-contain max-w-full" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="mt-3 relative group w-full">
            <input
              type="file"
              accept="image/*"
              id="sidebar-logo-upload"
              className="hidden"
              onChange={handleSidebarLogoUpload}
            />
            <label
              htmlFor="sidebar-logo-upload"
              className="flex items-center gap-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200/80 hover:border-indigo-400 hover:bg-indigo-50/20 active:scale-[0.98] transition-all p-2 rounded-xl border border-gray-200/60 max-w-full cursor-pointer duration-200"
              title="Klik untuk mengubah foto profil"
            >
              <div className="relative flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200/80 overflow-hidden flex items-center justify-center">
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
                <span className="truncate leading-tight text-[11px] font-black text-gray-800">
                  {currentUserData?.brandName || currentUserData?.namaLengkap || currentUserData?.name || 'Mitra Agen'}
                </span>
                <span className="text-[9px] text-gray-400 font-medium tracking-tight mt-0.5 group-hover:text-indigo-600 transition-colors">
                  Ubah Foto Profil
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'overview' 
                ? 'bg-blue-50 text-blue-800 shadow-sm ring-1 ring-blue-600/10' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 ${activeTab === 'overview' ? 'text-blue-700' : 'text-gray-500'}`} />
            Overview
          </button>

          <button
            onClick={() => setActiveTab('feed')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'feed' 
                ? 'bg-indigo-50 text-indigo-800 shadow-sm ring-1 ring-indigo-600/10' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Target className={`w-4 h-4 ${activeTab === 'feed' ? 'text-indigo-700' : 'text-gray-500'}`} />
            Feed Kolaborasi
          </button>

          <button
            onClick={() => setActiveTab('katalog')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'katalog' 
                ? 'bg-amber-50 text-amber-800 shadow-sm ring-1 ring-amber-600/10' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Calendar className={`w-4 h-4 ${activeTab === 'katalog' ? 'text-amber-700' : 'text-gray-500'}`} />
            Katalog Paket
          </button>

          <button
            onClick={() => setActiveTab('paket')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'paket' 
                ? 'bg-indigo-50 text-indigo-800 shadow-sm ring-1 ring-indigo-600/10' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Package className={`w-4 h-4 ${activeTab === 'paket' ? 'text-indigo-700' : 'text-gray-500'}`} />
            Kelola Paket
          </button>

          <button
            onClick={() => setActiveTab('validasi')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'validasi' 
                ? 'bg-blue-50 text-blue-800 shadow-sm ring-1 ring-blue-600/10' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Shield className={`w-4 h-4 ${activeTab === 'validasi' ? 'text-blue-700' : 'text-gray-500'}`} />
            Tracking Validasi
          </button>

          <button
            onClick={() => setActiveTab('jamaah')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'jamaah' 
                ? 'bg-purple-50 text-purple-800 shadow-sm ring-1 ring-purple-600/10' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'jamaah' ? 'text-purple-700' : 'text-gray-500'}`} />
            Jamaah Saya
          </button>

          <button
            onClick={() => setActiveTab('jaringan')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'jaringan' 
                ? 'bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-600/10' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'jaringan' ? 'text-emerald-700' : 'text-gray-500'}`} />
            Jaringan Saya
          </button>

          <button
            onClick={() => setActiveTab('marketing')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'marketing' 
                ? 'bg-indigo-50 text-indigo-850 shadow-sm ring-1 ring-indigo-600/10' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${activeTab === 'marketing' ? 'text-indigo-705' : 'text-gray-500'}`} />
            Marketing AI
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'analytics' 
                ? 'bg-emerald-50 text-emerald-850 shadow-sm ring-1 ring-emerald-600/10' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <BarChart2 className={`w-4 h-4 ${activeTab === 'analytics' ? 'text-emerald-705' : 'text-gray-500'}`} />
            AI Analytics
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'wallet' 
                ? 'bg-amber-50 text-amber-850 shadow-sm ring-1 ring-amber-600/10' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Wallet className={`w-4 h-4 ${activeTab === 'wallet' ? 'text-amber-705' : 'text-gray-500'}`} />
            Dompet & Komisi
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'profile' 
                ? 'bg-gray-100 text-gray-900 shadow-sm ring-1 ring-gray-600/20' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <User className={`w-4 h-4 ${activeTab === 'profile' ? 'text-gray-905' : 'text-gray-500'}`} />
            Profil
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
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            Keluar (Logout)
          </button>
        </nav>

        {/* Sync Status Frame */}
        <div className="p-4 border-t border-gray-150 bg-gray-50">
          <div className="flex items-center gap-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-550 animate-pulse inline-block"></span>
            CONNECTED TO API
          </div>
        </div>
      </aside>

      {/* Main Container including Responsive layouts */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-2 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          <div className="flex justify-around items-center h-16">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'overview' ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[10px] font-bold">Beranda</span>
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'feed' ? 'text-indigo-600' : 'text-gray-400'}`}
            >
              <Zap className="w-5 h-5 text-amber-500 fill-amber-300/20" />
              <span className="text-[10px] font-bold">Feed</span>
            </button>
            <button
              onClick={() => setActiveTab('katalog')}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'katalog' ? 'text-amber-600' : 'text-gray-400'}`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-[10px] font-bold">Katalog</span>
            </button>
            <button
              onClick={() => setActiveTab('paket')}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'paket' ? 'text-indigo-600' : 'text-gray-400'}`}
            >
              <Package className="w-5 h-5" />
              <span className="text-[10px] font-bold">Produk</span>
            </button>
            <button
              onClick={() => setActiveTab('validasi')}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'validasi' ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <Shield className="w-5 h-5" />
              <span className="text-[10px] font-bold">Validasi</span>
            </button>
            <button
              onClick={() => setActiveTab('jamaah')}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'jamaah' ? 'text-purple-600' : 'text-gray-400'}`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-bold">Jamaah</span>
            </button>
            <button
              onClick={() => setActiveTab('jaringan')}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'jaringan' ? 'text-emerald-600' : 'text-gray-400'}`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-bold">Jaringan</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${activeTab === 'profile' ? 'text-gray-900' : 'text-gray-400'}`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] font-bold">Profil</span>
            </button>
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 lg:pb-8 flex-grow">
          {/* Top Premium Header Bar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-row items-center justify-between gap-4 mb-6 shadow-sm">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <input 
                type="text" 
                placeholder="Cari paket, jamaah, Invoice, dll..." 
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-200/80 rounded-xl py-2 px-4 pr-10 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100/50 focus:border-indigo-500 transition-all font-medium"
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Quick Badges in Dark Green */}
            <div className="flex items-center gap-3 relative">
              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                  title="Pemberitahuan resmi" 
                  className="relative p-2 hover:bg-gray-50 active:scale-95 transition-all text-gray-500 rounded-xl cursor-pointer flex items-center justify-center"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#055734] text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm font-sans">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>

                {showNotificationDropdown && (
                  <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
                    {/* Popover Header */}
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-gray-800 tracking-wider">Notifikasi</span>
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
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-400">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-gray-500" />
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
                              className={`p-4 flex gap-3 hover:bg-gray-50 transition-colors cursor-pointer text-left ${!notif.read ? 'bg-indigo-50/10' : ''}`}
                            >
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${badgeBg}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`text-xs text-gray-900 leading-snug ${!notif.read ? 'font-extrabold' : 'font-medium'}`}>
                                    {notif.title}
                                  </p>
                                  {!notif.read && (
                                    <span className="w-2 h-2 rounded-full bg-[#055734] shrink-0"></span>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
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

              {/* Chat Messages */}
              <button 
                title="Diskusi / Chat Mitra & Admin" 
                className="relative p-2 hover:bg-gray-50 active:scale-95 transition-all text-gray-500 rounded-xl cursor-pointer"
              >
                <MessageSquare className="w-5 h-5 text-gray-600" />
                <span className="absolute -top-1 -right-1 bg-[#055734] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm font-sans">
                  2
                </span>
              </button>
            </div>
          </div>

          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'feed' && <FeedKolaborasiView onNavigateToCatalog={() => setActiveTab('katalog')} />}
          {activeTab === 'katalog' && <KatalogPaketView />}
          {activeTab === 'paket' && <PaketMitraView />}
          {activeTab === 'validasi' && <ValidasiPaketMitraView />}
          {activeTab === 'jamaah' && <JamaahMitraView />}
          {activeTab === 'jaringan' && <JaringanMitraView />}
          {activeTab === 'marketing' && <AIMarketingView />}
          {activeTab === 'analytics' && <AISmartAnalyticsView />}
          {activeTab === 'profile' && <ProfileView isDesktop={true} />}
          {activeTab === 'wallet' && renderWallet()}
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
