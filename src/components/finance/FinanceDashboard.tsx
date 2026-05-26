import React, { useState, useEffect } from 'react';
import { Wallet, Users, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { db, collection, onSnapshot, query, where, doc, updateDoc, runTransaction } from '../../firebase';
import { VendorPaymentTracker } from './VendorPaymentTracker';

type FinanceTab = 'ap' | 'ar' | 'komisi' | 'tracker_vendor';

interface VendorService {
  id: string;
  vendor?: string;
  namaLayanan?: string;
  namaPaket?: string;
  estimasiBiaya?: number;
  statusPembayaran?: string;
  [key: string]: unknown;
}

interface Booking {
  id: string;
  jenisPaket?: string;
  jamaahId: string;
  totalHarga?: number;
  statusPembayaran?: string;
  [key: string]: unknown;
}

interface Transaction {
  id: string;
  createdAt?: string;
  userId: string;
  amount: number;
  status: string;
  [key: string]: unknown;
}

export const FinanceDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FinanceTab>('ap');
  const [vendorServices, setVendorServices] = useState<VendorService[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch Vendor Services (AP)
    const unsubAP = onSnapshot(collection(db, 'vendor_services'), (snapshot) => {
      setVendorServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VendorService)));
    });

    // Fetch Bookings (AR)
    const unsubAR = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    });

    // Fetch Transactions (Komisi/Withdrawals)
    const qTrans = query(collection(db, 'transactions'), where('type', '==', 'withdraw'));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });

    setLoading(false);

    return () => {
      unsubAP();
      unsubAR();
      unsubTrans();
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const updateVendorStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'vendor_services', id), { statusPembayaran: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const updateBookingStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'bookings', id), { statusPembayaran: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleWithdrawal = async (transactionId: string, userId: string, amount: number, isApprove: boolean) => {
    try {
      await runTransaction(db, async (transaction) => {
        const transRef = doc(db, 'transactions', transactionId);
        const walletRef = doc(db, 'wallets', userId);

        const transDoc = await transaction.get(transRef);
        if (!transDoc.exists()) throw new Error("Transaction not found");
        
        if (transDoc.data().status !== 'pending') {
          throw new Error("Transaction already processed");
        }

        if (isApprove) {
          // If approved, deduct from wallet
          const walletDoc = await transaction.get(walletRef);
          if (!walletDoc.exists()) throw new Error("Wallet not found");
          
          const currentBalance = walletDoc.data().balance || 0;
          if (currentBalance < amount) throw new Error("Insufficient balance");

          transaction.update(walletRef, { 
            balance: currentBalance - amount,
            updatedAt: new Date().toISOString()
          });
          transaction.update(transRef, { status: 'approved' });
        } else {
          // If rejected, just update transaction status
          transaction.update(transRef, { status: 'rejected' });
        }
      });
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      alert("Gagal memproses penarikan: " + (error as Error).message);
    }
  };

  const renderAP = () => {
    const totalHutang = vendorServices.filter(i => i.statusPembayaran !== 'Lunas').reduce((sum, i) => sum + (i.estimasiBiaya || 0), 0);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Total Hutang Berjalan (AP)</p>
            <p className="text-3xl font-black text-rose-600">
              {formatCurrency(totalHutang)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 font-medium mb-1">Total Tagihan</p>
            <p className="text-xl font-bold text-gray-900">{vendorServices.length} Invoice</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Vendor & Layanan</th>
                  <th className="p-4">Paket</th>
                  <th className="p-4 text-right">Estimasi Biaya</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vendorServices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-bold text-gray-900">{inv.vendor}</p>
                      <p className="text-xs text-gray-500">{inv.namaLayanan}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-medium text-gray-700">{inv.namaPaket}</p>
                    </td>
                    <td className="p-4 text-right font-black text-gray-900">
                      {formatCurrency(inv.estimasiBiaya)}
                    </td>
                    <td className="p-4 text-center">
                      <select 
                        value={inv.statusPembayaran}
                        onChange={(e) => updateVendorStatus(inv.id, e.target.value)}
                        className={`text-xs font-bold rounded-full px-3 py-1 border-0 cursor-pointer outline-none
                          ${inv.statusPembayaran === 'Lunas' ? 'bg-emerald-100 text-emerald-700' : 
                            inv.statusPembayaran === 'DP' ? 'bg-blue-100 text-blue-700' : 
                            'bg-rose-100 text-rose-700'}`}
                      >
                        <option value="Belum Bayar">Belum Bayar</option>
                        <option value="DP">DP</option>
                        <option value="Lunas">Lunas</option>
                      </select>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Detail</button>
                    </td>
                  </tr>
                ))}
                {vendorServices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">Belum ada data tagihan vendor.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderAR = () => {
    const totalPiutang = bookings.filter(i => i.statusPembayaran !== 'lunas').reduce((sum, i) => sum + (i.totalHarga || 0), 0);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Total Piutang Jamaah (AR)</p>
            <p className="text-3xl font-black text-emerald-600">
              {formatCurrency(totalPiutang)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 font-medium mb-1">Total Booking</p>
            <p className="text-xl font-bold text-gray-900">{bookings.length} Booking</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">ID Booking</th>
                  <th className="p-4">Jamaah ID</th>
                  <th className="p-4 text-right">Total Tagihan</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map(booking => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-bold text-gray-900">{booking.id.substring(0, 8)}</p>
                      <p className="text-xs text-gray-500">{booking.jenisPaket}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-medium text-gray-700">{booking.jamaahId.substring(0, 8)}...</p>
                    </td>
                    <td className="p-4 text-right font-black text-gray-900">
                      {formatCurrency(booking.totalHarga)}
                    </td>
                    <td className="p-4 text-center">
                      <select 
                        value={booking.statusPembayaran}
                        onChange={(e) => updateBookingStatus(booking.id, e.target.value)}
                        className={`text-xs font-bold rounded-full px-3 py-1 border-0 cursor-pointer outline-none
                          ${booking.statusPembayaran === 'lunas' ? 'bg-emerald-100 text-emerald-700' : 
                            booking.statusPembayaran === 'dp' ? 'bg-blue-100 text-blue-700' : 
                            'bg-amber-100 text-amber-700'}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="dp">DP</option>
                        <option value="lunas">Lunas</option>
                      </select>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Detail</button>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">Belum ada data booking jamaah.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderKomisi = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Permintaan Penarikan Komisi Mitra</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Tanggal</th>
                  <th className="p-4">Mitra ID</th>
                  <th className="p-4 text-right">Nominal</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map(trans => (
                  <tr key={trans.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <p className="text-sm font-medium text-gray-900">
                        {trans.createdAt && !isNaN(new Date(trans.createdAt).getTime()) ? new Date(trans.createdAt).toLocaleDateString('id-ID') : '-'}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-medium text-gray-700">{trans.userId.substring(0, 8)}...</p>
                    </td>
                    <td className="p-4 text-right font-black text-gray-900">
                      {formatCurrency(trans.amount)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold
                        ${trans.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                          trans.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 
                          'bg-amber-100 text-amber-700'}`}
                      >
                        {trans.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {trans.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleWithdrawal(trans.id, trans.userId, trans.amount, true)}
                            className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-200"
                          >
                            Setujui
                          </button>
                          <button 
                            onClick={() => handleWithdrawal(trans.id, trans.userId, trans.amount, false)}
                            className="bg-rose-100 text-rose-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-rose-200"
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">Belum ada permintaan penarikan komisi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Memuat data keuangan...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 rounded-xl shadow-sm">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finance & Keuangan</h1>
            <p className="text-gray-500">Kelola hutang vendor, piutang jamaah, dan komisi mitra</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-gray-200 pb-px overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('ap')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'ap' 
              ? 'border-rose-600 text-rose-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          Account Payables (Vendor)
        </button>
        <button
          onClick={() => setActiveTab('ar')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'ar' 
              ? 'border-emerald-600 text-emerald-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <ArrowDownRight className="w-4 h-4" />
          Account Receivables (Jamaah)
        </button>
        <button
          onClick={() => setActiveTab('komisi')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'komisi' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Users className="w-4 h-4" />
          Pencairan Komisi Mitra
        </button>
        <button
          onClick={() => setActiveTab('tracker_vendor')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'tracker_vendor' 
              ? 'border-teal-600 text-teal-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          Cost Component Tracker (ERP)
        </button>
      </div>

      {/* Content */}
      {activeTab === 'ap' && renderAP()}
      {activeTab === 'ar' && renderAR()}
      {activeTab === 'komisi' && renderKomisi()}
      {activeTab === 'tracker_vendor' && <VendorPaymentTracker />}
    </div>
  );
};
