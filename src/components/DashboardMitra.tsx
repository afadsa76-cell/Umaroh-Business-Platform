import React, { useState, useEffect } from 'react';
import { ShopOrder } from '../types';
import { Wallet, Users, Package, Link as LinkIcon, Copy, CheckCircle2, LayoutDashboard, Calendar, User, TrendingUp, Shield, Zap, Target, Sparkles, BarChart2, ArrowUpRight, ArrowDownRight, Send, RefreshCw, Download, PlusCircle, History } from 'lucide-react';
import { auth, db, doc, onSnapshot, addDoc, collection, query, where, getDocs, handleFirestoreError, OperationType, runTransaction } from '../firebase';
import { PaketMitraView } from './PaketMitraView';
import { KatalogPaketView } from './KatalogPaketView';
import { JamaahMitraView } from './JamaahMitraView';
import { JaringanMitraView } from './JaringanMitraView';
import { ProfileView } from './ProfileView';
import { ValidasiPaketMitraView } from './ValidasiPaketMitraView';
import { PaketMasterWizard } from './PaketMasterWizard';
import { FeedKolaborasiView } from './FeedKolaborasiView';
import { FlightTrackerWidget } from './FlightTrackerWidget';
import { AIMarketingView } from './AIMarketingView';
import { AISmartAnalyticsView } from './AISmartAnalyticsView';

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
  const [mitraShopOrders, setMitraShopOrders] = useState<ShopOrder[]>([]);
  
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
      snapshot.docs.forEach(docSnap => {
        const d = docSnap.data();
        const price = Number(d.totalHarga || d.harga || 0);
        sum += price;
      });
      setStats(prev => ({ ...prev, totalOmzet: sum }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'bookings'));

    // Real-time Mitra Network Shop Orders
    const qShop = query(collection(db, 'shop_orders'), where('mitraId', '==', userId));
    const unsubscribeShop = onSnapshot(qShop, (snapshot) => {
      setMitraShopOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShopOrder)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'shop_orders'));

    return () => {
      unsubscribeUser();
      unsubscribeWallet();
      unsubscribeSent();
      unsubscribeRecv();
      unsubscribePaket();
      unsubscribeJaringan();
      unsubscribeBookings();
      unsubscribeShop();
    };
  }, [userId]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stat Cards - Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Komisi Agen (Dompet Komisi) - Moved to top */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-[#0f172a] p-6 rounded-2xl text-white shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl -mr-8 -mt-8"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-amber-400">
                <Wallet className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black tracking-widest text-indigo-100 uppercase">DOMPET KOMISI</p>
            </div>
            <button 
              onClick={() => {
                setActiveTab('wallet');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-[9px] font-black bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
            >
              BUKA DOMPET ➔
            </button>
          </div>
          <div className="mb-4">
            <p className="text-[9px] text-indigo-300 font-black uppercase tracking-widest leading-none mb-1">SALDO AKTIF</p>
            <h3 className="text-2xl font-black text-amber-300 tracking-tight">Rp {balance.toLocaleString('id-ID')}</h3>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowWithdrawModal(true)}
              className="flex-1 bg-[#00B47A] hover:bg-[#009b66] text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              TARIK
            </button>
            <button 
              onClick={() => setShowTransferModal(true)}
              className="flex-1 bg-white/15 hover:bg-white/25 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
            >
              <Send className="w-3.5 h-3.5" />
              KIRIM
            </button>
          </div>
        </div>

        {/* Total Omzet */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TOTAL OMZET</p>
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">
            Rp {stats.totalOmzet >= 1000000000 
              ? `${(stats.totalOmzet / 1000000000).toFixed(1)}M` 
              : stats.totalOmzet >= 1000000 
                ? `${(stats.totalOmzet / 1000000).toFixed(1)}Jt` 
                : stats.totalOmzet.toLocaleString('id-ID')}
          </h3>
        </div>

        {/* Paket Aktif */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking_widest">PAKET AKTIF</p>
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">{stats.paketAktif}</h3>
        </div>

        {/* Mitra/Agen */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">MITRA/AGEN</p>
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">{stats.totalJaringan}</h3>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Banner & Activities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Create Packet Banner */}
          <div className="bg-[#111827] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#00B47A] flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
                <PlusCircle className="w-8 h-8" strokeWidth={3} />
              </div>
              <div className="text-left">
                <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tight mb-1">
                  BUAT PAKET BARU
                </h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
                  PILIH KATEGORI YANG SESUAI BISNIS ANDA
                </p>
              </div>
            </div>

            <button 
              onClick={() => setShowWizard(true)}
              className="w-full md:w-auto bg-[#00B47A] hover:bg-[#009B66] text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/10 relative z-10 shrink-0"
            >
              MULAI WIZARD
            </button>
          </div>

          {/* Activities Section */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm min-h-[150px]">
             <div className="flex items-center justify-between mb-8">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">AKTIVITAS PAKET TERBARU</p>
                <div className="h-[2px] flex-grow mx-6 bg-gray-50"></div>
             </div>
             <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                  <History className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Belum ada aktivitas terbaru</p>
             </div>
          </div>

          {/* NEW: Network Shop Orders section */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
             <div className="flex items-center justify-between mb-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Belanja Perlengkapan Jamaah Anda ({mitraShopOrders.length})</p>
                <div className="h-[2px] flex-grow mx-6 bg-gray-50"></div>
             </div>
             {mitraShopOrders.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                 <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                   <History className="w-6 h-6 opacity-20" strokeWidth={2} />
                 </div>
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Belum ada pesanan belanja perlengkapan</p>
               </div>
             ) : (
               <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                 {mitraShopOrders.map((order) => (
                   <div key={order.id} className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 flex items-center justify-between text-xs font-sans hover:shadow-sm transition-shadow">
                     <div className="space-y-1">
                       <span className="font-mono text-[9px] text-gray-400 font-bold block">ID: #{order.id.substring(0, 8).toUpperCase()}</span>
                       <strong className="text-gray-900 block text-[11px]">{order.productName || 'Perlengkapan'}</strong>
                       <p className="text-[10px] text-gray-500">
                         Kuantitas: <span className="font-bold text-gray-800">{order.quantity || 1} Pcs</span> | Pembeli: <span className="font-bold text-gray-800">{order.jamaahName || 'Jamaah Anda'}</span>
                       </p>
                       <p className="text-[9px] text-gray-400 line-clamp-1">Kirim: {order.shippingAddress}</p>
                     </div>
                     <div className="text-right shrink-0 ml-4 font-sans">
                       <span className="font-black text-emerald-600 block text-xs">Rp {(order.totalCost || 0).toLocaleString('id-ID')}</span>
                       <span className={`inline-block px-2 py-0.5 mt-1 rounded-full text-[8px] font-black uppercase tracking-wider ${
                         order.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' :
                         order.status === 'Dibatalkan' ? 'bg-red-100 text-red-800' :
                         order.status?.startsWith('Dikirim') ? 'bg-indigo-100 text-indigo-800' :
                         'bg-amber-100 text-amber-800'
                       }`}>
                         {order.status || 'Diproses'}
                       </span>
                       {order.noResi && (
                         <span className="text-[8px] font-mono text-indigo-600 block font-bold mt-1">Resi: {order.noResi}</span>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>

          {/* Real-Time Flight Tracker Section */}
          <FlightTrackerWidget />
        </div>

        {/* Right Column: Chart */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">GRAFIK PENJUALAN</h4>
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          </div>
          
          <div className="flex items-end justify-between gap-2 h-64 mb-8">
            {[
              { label: 'Jan', value: 40, active: false },
              { label: 'Feb', value: 30, active: false },
              { label: 'Mar', value: 65, active: false },
              { label: 'Apr', value: 45, active: false },
              { label: 'May', value: 90, active: true },
              { label: 'Jun', value: 55, active: false },
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                <div className="w-full relative bg-gray-50 rounded-lg overflow-hidden h-48">
                  <div 
                    className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out rounded-t-lg ${
                      bar.active 
                        ? 'bg-[#3B82F6] h-[90%] shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
                        : 'bg-[#F1F5F9] group-hover:bg-gray-200'
                    }`}
                    style={{ height: `${bar.value}%` }}
                  ></div>
                </div>
                <span className={`text-[10px] font-bold tracking-tight ${bar.active ? 'text-blue-500' : 'text-gray-400'}`}>
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
             <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">TOTAL SALES MEI</p>
                <p className="text-xl font-black text-gray-900 tracking-tight uppercase">Rp128.4M</p>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shadow-inner">
                <TrendingUp className="w-6 h-6" />
             </div>
          </div>
        </div>
      </div>

      {/* AI Smart Features Bento Grid Launcher */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-md cursor-pointer"
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-md cursor-pointer"
            >
              Auditing Sistem AI
            </button>
          </div>
        </div>
      </div>

      {/* Referral Link - Moved to bottom or can be kept as per existing design but stylized */}
      <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row items-center gap-6">
           <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-indigo-500 shadow-sm">
              <LinkIcon className="w-5 h-5" />
           </div>
           <div className="flex-grow text-center md:text-left">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-1">Link Referral Anda</h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bagikan link ini untuk mencari jamaah.</p>
           </div>
           <div className="flex items-center gap-2 w-full md:w-auto">
              <input 
                type="text" 
                readOnly 
                value={referralLink}
                className="flex-1 md:w-64 bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-600 text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button 
                onClick={copyToClipboard}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-all active:scale-95"
              >
                {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
           </div>
        </div>
      </div>

      {showWizard && (
        <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
          <PaketMasterWizard 
            onCancel={() => setShowWizard(false)} 
            onSuccess={() => {
              setShowWizard(false);
              // Refresh logic if needed
            }}
            isMitraContext={true}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50/20">
      {/* Side Navigation Sidebar (Desktop Only) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:left-0 lg:bg-white lg:border-r lg:border-gray-200 lg:z-30 lg:overflow-y-auto">
        {/* Sidebar Brand Header */}
        <div className="p-6 border-b border-gray-150 flex flex-col gap-1 items-start bg-indigo-50/10">
          <span className="text-[9px] font-black tracking-widest text-indigo-600 uppercase">PORTAL MITRA AGEN</span>
          <h2 className="text-base font-black text-gray-900 tracking-tight italic flex items-center gap-1.5 leading-none">
            UMAROH <span className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white font-black not-italic px-1.5 py-0.5 rounded text-[10px]">CRM</span>
          </h2>
          <div className="mt-3 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200/80 transition-all px-3 py-1.5 rounded-xl border border-gray-200/60 max-w-full truncate">
            👤 {currentUserData?.brandName || currentUserData?.namaLengkap || currentUserData?.name || 'Mitra Agen'}
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
