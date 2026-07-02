import React, { useState, useEffect } from 'react';
import { Wallet, Users, ArrowUpRight, ArrowDownRight, Cloud, Printer, X, FileText, CheckSquare, Download } from 'lucide-react';
import { db, collection, onSnapshot, query, where, doc, updateDoc, runTransaction, auth } from '../../firebase';
import { syncBookingToTracker } from '../../utils/firebaseSync';
import { AccurateIntegrationView } from './AccurateIntegrationView';
import { ValidasiMitraView } from '../ValidasiMitraView';
import { Capacitor } from '@capacitor/core';
import html2pdf from 'html2pdf.js';
import { runWithOklchFix, downloadFile } from '../../utils/fileUtils';

type FinanceTab = 'ap' | 'ar' | 'komisi' | 'accurate' | 'pendaftaran_mitra';

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
  paketLabel?: string;
  createdAt?: {
    seconds?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface Transaction {
  id: string;
  createdAt?: string;
  userId: string;
  amount: number;
  status: string;
  description?: string;
  type?: string;
  [key: string]: unknown;
}

export const FinanceDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FinanceTab>('ap');
  const [vendorServices, setVendorServices] = useState<VendorService[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  interface CostComponent {
    id: string;
    nama_komponen?: string;
    vendor_id?: string;
    package_id?: string;
    total_biaya?: number;
    total_bayar?: number;
    status_pembayaran?: string;
    [key: string]: unknown;
  }

  interface MitraRecord {
    id: string;
    nama_mitra?: string;
    nama_brand?: string;
    pic?: string;
    paket_umroh?: string;
    jumlah_seat?: number;
    total_tagihan?: number;
    total_bayar?: number;
    status_pembayaran?: string;
    [key: string]: unknown;
  }

  const [costComponents, setCostComponents] = useState<CostComponent[]>([]);
  const [mitras, setMitras] = useState<MitraRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Invoice state variables inside FinanceDashboard.tsx
  interface FinancialJamaah {
    id: string;
    nama_paspor?: string;
    [key: string]: unknown;
  }

  interface FinanceUserData {
    logo?: string;
    brandName?: string;
    alamat?: string;
    noHp?: string;
    phone?: string;
    namaLengkap?: string;
    name?: string;
    customMitraProfile?: {
      logo?: string;
    };
  }

  const [jamaahs, setJamaahs] = useState<FinancialJamaah[]>([]);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<Booking | null>(null);
  const [invoiceTxs, setInvoiceTxs] = useState<Transaction[]>([]);
  const [currentUserData, setCurrentUserData] = useState<FinanceUserData | null>(null);
  const [invoiceNote, setInvoiceNote] = useState('Pembayaran sah dilakukan melalui Kasir Kantor Pusat atau via Transfer Bank Resmi Agent. Harap simpan invoice ini sebagai bukti administrasi resmi untuk pengurusan keberangkatan.');
  const [invoiceCustomNum, setInvoiceCustomNum] = useState('');
  const [showInvoiceStamp, setShowInvoiceStamp] = useState(true);
  const [cashierName, setCashierName] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    const element = document.querySelector('.invoice-print-area') as HTMLElement;
    if (!element) {
      alert('Elemen invoice tidak ditemukan!');
      return;
    }
    
    setIsGeneratingPDF(true);
    const invoiceNo = selectedInvoiceBooking?.id || 'finance';
    const opt = {
      margin:       [4, 4, 4, 4] as [number, number, number, number],
      filename:     `invoice_${invoiceNo}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        letterRendering: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    try {
      await runWithOklchFix(async () => {
        const h2p = html2pdf().from(element).set(opt);
        if (Capacitor.isNativePlatform()) {
          const pdfDataUri = await h2p.output('datauristring') as string;
          await downloadFile(pdfDataUri, `invoice_${invoiceNo}.pdf`);
        } else {
          await h2p.save();
        }
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Gagal mengunduh PDF. Silakan coba lagi.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Load current user profile for invoice branding
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) return;
      const userRef = doc(db, 'users', user.uid);
      const unsubscribeSnap = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const uData = docSnap.data();
          setCurrentUserData(uData);
          setCashierName(uData.namaLengkap || uData.name || 'Petugas Administrasi Pusat');
        }
      });
      return () => unsubscribeSnap();
    });
    return () => unsubscribeAuth();
  }, []);

  // Load transactions for the selected invoice booking
  useEffect(() => {
    if (!selectedInvoiceBooking) return;
    const q = query(collection(db, 'transactions'), where('bookingId', '==', selectedInvoiceBooking.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      txs.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
      setInvoiceTxs(txs);
    }, (error) => {
      console.error("Error loading transactions for booking invoice:", error);
    });
    return () => unsubscribe();
  }, [selectedInvoiceBooking]);

  useEffect(() => {
    // Fetch Vendor Services (AP)
    const unsubAP = onSnapshot(collection(db, 'vendor_services'), (snapshot) => {
      setVendorServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VendorService)));
    });

    // Fetch Bookings (AR)
    const unsubAR = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    });

    // Fetch Tracker Vendor (Cost Components)
    const unsubCostComp = onSnapshot(collection(db, 'package_cost_components'), (snapshot) => {
      setCostComponents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Tracker Mitra
    const unsubMitra = onSnapshot(collection(db, 'mitra_tracker'), (snapshot) => {
      setMitras(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Tracker Jamaah for human readable pilgrim names
    const unsubJamaah = onSnapshot(collection(db, 'tracker_jamaah'), (snapshot) => {
      setJamaahs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
      unsubCostComp();
      unsubMitra();
      unsubJamaah();
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
      const booking = bookings.find(b => b.id === id);
      if (booking) {
        await syncBookingToTracker(id, {
          ...booking,
          statusPembayaran: newStatus
        });
      }
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
    const totalHutangTracker = costComponents
      .filter(i => i.status_pembayaran !== 'Lunas')
      .reduce((sum, i) => sum + ((i.total_biaya || 0) - (i.total_bayar || 0)), 0);
    const totalHutangUmum = vendorServices
      .filter(i => i.statusPembayaran !== 'Lunas')
      .reduce((sum, i) => sum + (i.estimasiBiaya || 0), 0);
    const totalHutangCombined = totalHutangTracker + totalHutangUmum;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Total Hutang Berjalan (AP)</p>
            <p className="text-3xl font-black text-rose-600">
              {formatCurrency(totalHutangCombined)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              HPP Tracker Vendor: <span className="font-semibold text-gray-700">{formatCurrency(totalHutangTracker)}</span> | Umum: <span className="font-semibold text-gray-700">{formatCurrency(totalHutangUmum)}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 font-medium mb-1">Total Item Tagihan</p>
            <p className="text-xl font-extrabold text-gray-900">
              {costComponents.length + vendorServices.length} Invoice / Komponen
            </p>
          </div>
        </div>

        {/* Section A: Synced HPP Cost Components */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-rose-50/40 flex justify-between items-center text-xs">
            <h3 className="font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
              A. Hutang Komponen HPP Vendor (Synced Tracker Vendor)
            </h3>
            <span className="text-[10px] uppercase font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
              Real-time Tracker Sync
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Komponen & Vendor</th>
                  <th className="p-4">Paket Acuan</th>
                  <th className="p-4 text-right">Total Anggaran</th>
                  <th className="p-4 text-right">Telah Dibayar</th>
                  <th className="p-4 text-right">Sisa Tagihan</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-55 text-xs">
                {costComponents.map(comp => {
                  const sisa = (comp.total_biaya || 0) - (comp.total_bayar || 0);
                  return (
                    <tr key={comp.id} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <p className="font-bold text-gray-905 uppercase">{comp.nama_komponen}</p>
                        <p className="text-[10px] text-gray-500 font-mono">Vendor: {comp.vendor_id || '-'}</p>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-700">
                        {comp.package_id || 'Umum'}
                      </td>
                      <td className="p-4 text-right font-semibold text-gray-950">
                        {formatCurrency(comp.total_biaya || 0)}
                      </td>
                      <td className="p-4 text-right text-emerald-600 font-semibold">
                        {formatCurrency(comp.total_bayar || 0)}
                      </td>
                      <td className="p-4 text-right font-black text-rose-600">
                        {formatCurrency(sisa)}
                      </td>
                      <td className="p-4 text-center">
                        <select 
                          value={comp.status_pembayaran || 'Belum Bayar'}
                          onChange={async (e) => {
                            try {
                              const newStatus = e.target.value;
                              await updateDoc(doc(db, 'package_cost_components', comp.id), { 
                                status_pembayaran: newStatus,
                                updated_at: new Date().toISOString()
                              });
                            } catch (err) {
                              console.error("Error updating component status:", err);
                            }
                          }}
                          className={`text-[10px] font-bold rounded-lg px-2 py-1 border cursor-pointer outline-none font-sans
                            ${comp.status_pembayaran === 'Lunas' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 
                              comp.status_pembayaran === 'DP' || comp.status_pembayaran === 'Cicilan' ? 'bg-blue-50 text-blue-800 border-blue-100' : 
                              'bg-rose-50 text-rose-800 border-rose-100'}`}
                        >
                          <option value="Belum Bayar">Belum Bayar</option>
                          <option value="DP">DP</option>
                          <option value="Cicilan">Cicilan</option>
                          <option value="Lunas">Lunas</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
                {costComponents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 font-medium">Belum ada data komponen biaya tracker vendor.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section B: General Vendor Services */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center text-xs">
            <h3 className="font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              B. Tagihan Vendor Umum / Lainnya (Koleksi Internal)
            </h3>
            <span className="text-[10px] font-semibold text-gray-500 bg-slate-100 px-2 py-0.5 rounded">
              Standard Record
            </span>
          </div>
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
                    <td colSpan={5} className="p-8 text-center text-gray-500 font-medium">Belum ada data tagihan vendor.</td>
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
    const totalPiutangMitra = mitras
      .filter(i => i.status_pembayaran !== 'Lunas')
      .reduce((sum, i) => sum + ((i.total_tagihan || 0) - (i.total_bayar || 0)), 0);
    const totalPiutangDirect = bookings
      .filter(i => i.statusPembayaran !== 'lunas')
      .reduce((sum, i) => sum + (i.totalHarga || 0), 0);
    const totalPiutangCombined = totalPiutangMitra + totalPiutangDirect;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Total Piutang Berjalan (AR)</p>
            <p className="text-3xl font-black text-emerald-600">
              {formatCurrency(totalPiutangCombined)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Tracker Mitra: <span className="font-semibold text-gray-700">{formatCurrency(totalPiutangMitra)}</span> | Jamaah Mandiri: <span className="font-semibold text-gray-700">{formatCurrency(totalPiutangDirect)}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 font-medium mb-1">Total Entri Piutang</p>
            <p className="text-xl font-extrabold text-gray-900">
              {mitras.length + bookings.length} Rekor Pelanggan
            </p>
          </div>
        </div>

        {/* Section A: Synced Mitra Tracker AR */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-emerald-50/40 flex justify-between items-center text-xs">
            <h3 className="font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              A. Piutang & Setoran Keagenan Kemitraan (Synced Tracker Mitra)
            </h3>
            <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100 shadow-xs">
              Real-time Tracker Sync
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Nama Mitra & Brand</th>
                  <th className="p-4">Paket Acuan</th>
                  <th className="p-4 text-center">Seat Booking</th>
                  <th className="p-4 text-right">Total Tagihan</th>
                  <th className="p-4 text-right">Telah Disetor</th>
                  <th className="p-4 text-right">Sisa Piutang</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-55 text-xs text-gray-900">
                {mitras.map(mitra => {
                  const sisa = (mitra.total_tagihan || 0) - (mitra.total_bayar || 0);
                  return (
                    <tr key={mitra.id} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <p className="font-bold text-gray-900">{mitra.nama_mitra}</p>
                        <p className="text-[10px] text-gray-550">{mitra.nama_brand} (PIC: {mitra.pic || '-'})</p>
                      </td>
                      <td className="p-4 font-mono font-bold text-indigo-900">{mitra.paket_umroh}</td>
                      <td className="p-4 text-center font-bold text-indigo-700">{mitra.jumlah_seat || 0} Pax</td>
                      <td className="p-4 text-right font-semibold">{formatCurrency(mitra.total_tagihan || 0)}</td>
                      <td className="p-4 text-right font-semibold text-emerald-600">{formatCurrency(mitra.total_bayar || 0)}</td>
                      <td className="p-4 text-right font-black text-rose-600">{formatCurrency(sisa)}</td>
                      <td className="p-4 text-center">
                        <select 
                          value={mitra.status_pembayaran || 'Belum Bayar'}
                          onChange={async (e) => {
                            try {
                              const newStatus = e.target.value;
                              await updateDoc(doc(db, 'mitra_tracker', mitra.id), { 
                                status_pembayaran: newStatus,
                                updated_at: new Date().toISOString()
                              });
                            } catch (err) {
                              console.error("Error updating mitra status in Firestore:", err);
                            }
                          }}
                          className={`text-[10px] font-bold rounded-lg px-2.5 py-1 border cursor-pointer outline-none font-sans
                            ${mitra.status_pembayaran === 'Lunas' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 
                              mitra.status_pembayaran === 'DP' ? 'bg-blue-50 text-blue-800 border-blue-105' : 
                              'bg-rose-50 text-rose-800 border-rose-100'}`}
                        >
                          <option value="Belum Bayar">Belum Bayar</option>
                          <option value="DP">DP</option>
                          <option value="Lunas">Lunas</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
                {mitras.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 font-medium">Belum ada piutang keagenan mitra.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section B: Direct Pilgrim Bookings (AR) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center text-xs">
            <h3 className="font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              B. Piutang Jamaah Individu / Mandiri (Standard Bookings)
            </h3>
            <span className="text-[10px] font-semibold text-gray-500 bg-slate-100 px-2 py-0.5 rounded">
              Standard Booking Invoice
            </span>
          </div>
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
                      <p className="font-bold text-gray-900">{(booking.id || '').substring(0, 8)}</p>
                      <p className="text-xs text-gray-500">{booking.jenisPaket}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-gray-800">
                        {jamaahs.find(j => j.id === booking.id)?.nama_paspor || jamaahs.find(j => j.id === booking.jamaahId)?.nama_paspor || `Jamaah ${(booking.jamaahId || '').substring(0, 8)}`}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono">ID: {booking.jamaahId || '-'}</p>
                    </td>
                    <td className="p-4 text-right font-black text-slate-900 font-sans">
                      {formatCurrency(booking.totalHarga || 0)}
                    </td>
                    <td className="p-4 text-center">
                      <select 
                        value={booking.statusPembayaran}
                        onChange={(e) => updateBookingStatus(booking.id, e.target.value)}
                        className={`text-xs font-bold rounded-lg px-2.5 py-1 border border-slate-200 cursor-pointer outline-none
                          ${booking.statusPembayaran === 'lunas' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 
                            booking.statusPembayaran === 'dp' ? 'bg-blue-50 text-blue-800 border-blue-100' : 
                            'bg-amber-50 text-amber-800 border-amber-100'}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="dp">DP</option>
                        <option value="lunas">Lunas</option>
                      </select>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-end gap-2.5">
                        <button 
                          onClick={() => {
                            setSelectedInvoiceBooking(booking);
                            setInvoiceCustomNum(`INV/${new Date().getFullYear()}/UMR/${(booking.id || '').substring(0, 6).toUpperCase()}`);
                            setIsInvoiceOpen(true);
                          }}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm border border-indigo-100"
                          title="Cetak Faktur Administrasi Keuangan"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Invoice
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 font-medium">Belum ada data booking jamaah.</td>
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
          onClick={() => setActiveTab('accurate')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'accurate' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Cloud className="w-4 h-4" />
          Koneksi ERP Accurate
        </button>
        <button
          onClick={() => setActiveTab('pendaftaran_mitra')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'pendaftaran_mitra' 
              ? 'border-emerald-600 text-emerald-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Pendaftaran Mitra
        </button>
      </div>

      {/* Content */}
      {activeTab === 'ap' && renderAP()}
      {activeTab === 'ar' && renderAR()}
      {activeTab === 'komisi' && renderKomisi()}
      {activeTab === 'accurate' && <AccurateIntegrationView />}
      {activeTab === 'pendaftaran_mitra' && <ValidasiMitraView isFinanceMode={true} />}

      {/* ================= INVOICE GENERATOR & PRINTER MODAL (ACCURATE ERP INSPIRED) ================= */}
      {isInvoiceOpen && selectedInvoiceBooking && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 overflow-y-auto p-4 md:p-8 flex items-center justify-center font-sans no-print animate-in fadeIn duration-150">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col md:flex-row h-[90vh] max-h-[850px] animate-in zoom-in-95 duration-200">
            
            {/* Left Panel: Invoice Configurator Controls */}
            <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-100 p-5 flex flex-col justify-between overflow-y-auto select-none font-sans">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="flex items-center gap-1.5 text-indigo-700 font-extrabold text-xs tracking-wider uppercase">
                    <FileText className="w-4 h-4" />
                    Set Invoicing ERP
                  </span>
                  <button 
                    onClick={() => {
                      setIsInvoiceOpen(false);
                      setSelectedInvoiceBooking(null);
                    }}
                    className="p-1 rounded-lg hover:bg-slate-100 text-gray-400 hover:text-gray-900 transition"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="space-y-3.5 pt-1">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">No. Invoice Resmi</label>
                    <input 
                      type="text" 
                      value={invoiceCustomNum} 
                      onChange={(e) => setInvoiceCustomNum(e.target.value)}
                      placeholder="Contoh: INV/2026/UMR-001"
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Staf Kasir/Penerima</label>
                    <input 
                      type="text" 
                      value={cashierName} 
                      onChange={(e) => setCashierName(e.target.value)}
                      placeholder="Ketik nama pemeriksa"
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Catatan Syarat & Ketentuan</label>
                    <textarea 
                      value={invoiceNote} 
                      onChange={(e) => setInvoiceNote(e.target.value)}
                      rows={5}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none resize-none leading-relaxed"
                    />
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-600 font-bold">Tampilkan Stamp Lunas</span>
                      <button
                        onClick={() => setShowInvoiceStamp(!showInvoiceStamp)}
                        className={`text-[10px] px-2.5 py-1 rounded-md font-black transition-colors ${
                          showInvoiceStamp ? 'bg-emerald-105 text-emerald-800' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {showInvoiceStamp ? 'AKTIF' : 'NON-AKTIF'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-2">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                >
                  <Download className={`w-4 h-4 ${isGeneratingPDF ? 'animate-bounce' : ''}`} />
                  {isGeneratingPDF ? 'MENGUNDUH PDF...' : 'UNDUH / SIMPAN PDF'}
                </button>
                <button
                  onClick={() => {
                    setIsInvoiceOpen(false);
                    setSelectedInvoiceBooking(null);
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold text-xs py-2.5 rounded-xl transition"
                >
                  Selesai & Keluar
                </button>
              </div>
            </div>

            {/* Right Panel: Invoice A4 Preview Frame */}
            <div className="flex-1 bg-slate-100 p-4 md:p-6 overflow-y-auto flex justify-center items-start">
              {/* Printable Area Starts */}
              <div className="bg-white max-w-[760px] w-full border border-slate-200 rounded-2xl shadow-lg p-6 md:p-10 font-sans relative overflow-hidden invoice-print-area text-[11px] leading-relaxed text-gray-800">
                
                {/* Standard Invoice Watermark Stamp */}
                {showInvoiceStamp && (
                  <div className="absolute right-12 top-40 rotate-[12deg] pointer-events-none select-none z-10 font-sans">
                    <div className={`border-4 ${
                      selectedInvoiceBooking.statusPembayaran === 'lunas'
                        ? 'border-emerald-500 text-emerald-650 bg-emerald-50/70'
                        : 'border-amber-500 text-amber-655 bg-amber-50/70'
                    } font-black px-4 py-2 text-center rounded-2xl tracking-widest text-[16px] uppercase shadow-sm border-dashed`}>
                      {selectedInvoiceBooking.statusPembayaran === 'lunas' ? 'LUNAS • PAID' : 'DP RECEIVED'}
                      <div className="text-[8px] font-mono tracking-normal font-bold mt-0.5">
                        UMAROH ACCOUNTING DEPT.
                      </div>
                    </div>
                  </div>
                )}

                {/* Left Top Brand / Enterprise Information */}
                <div className="flex justify-between items-start border-b-2 border-slate-850 pb-5 mb-5 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 font-sans">
                      {currentUserData?.logo || currentUserData?.customMitraProfile?.logo ? (
                        <img 
                          src={currentUserData?.logo || currentUserData?.customMitraProfile?.logo} 
                          alt="Company Logo" 
                          className="w-12 h-12 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-emerald-700 leading-10 text-center rounded-xl text-white font-black text-sm shadow">
                          M
                        </div>
                      )}
                      <div>
                        <strong className="text-[14px] text-gray-900 font-extrabold uppercase tracking-wide">
                          {currentUserData?.brandName || 'UMAROH EXECUTIVE TRAVEL'}
                        </strong>
                        <p className="text-[9px] text-gray-500 font-bold block">
                          Sistem ERP Keagenan & Kemitraan Umrah Digital Terintegrasi
                        </p>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 leading-relaxed max-w-sm pt-1 font-sans">
                      {currentUserData?.alamat || 'Pusat Niaga Kav. 12, Area Bandara Internasional, Jakarta, Indonesia.'}
                      <span className="block mt-0.5">Mobile/WA: {currentUserData?.noHp || currentUserData?.phone || '+62 822-1234-5678'}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1 font-sans">
                    <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider border border-indigo-200">
                      FAKTUR PENJUALAN
                    </span>
                    <h3 className="text-lg font-black font-mono text-gray-900 pt-1">
                      {invoiceCustomNum}
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      Tanggal: <span className="font-bold text-gray-800">
                        {selectedInvoiceBooking.createdAt 
                          ? (selectedInvoiceBooking.createdAt.seconds 
                            ? new Date(selectedInvoiceBooking.createdAt.seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                            : 'Baru saja')
                          : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                        }
                      </span>
                    </p>
                    <p className="text-[10px] bg-slate-50 px-2 py-0.5 border border-slate-100 rounded inline-block text-gray-500 mt-1">
                      Termin: <strong className="text-gray-800">Full Payment / Tabungan</strong>
                    </p>
                  </div>
                </div>

                {/* Billing Info Grid Segment */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 p-4 rounded-xl border border-slate-205/60 grid grid-cols-2 gap-4 mb-5 font-sans">
                  <div>
                    <h4 className="text-[9px] text-gray-400 font-black uppercase tracking-wider mb-1">DITAGIHKAN KEPADA:</h4>
                    <strong className="text-sm text-indigo-900 block font-black">
                      {jamaahs.find(j => j.id === selectedInvoiceBooking.id)?.nama_paspor || jamaahs.find(j => j.id === selectedInvoiceBooking.jamaahId)?.nama_paspor || selectedInvoiceBooking.jamaahId?.substring(0, 8)}
                    </strong>
                    <p className="text-[10px] text-gray-500 mt-1">
                      ID Pelanggan: <span className="font-mono text-gray-700 font-semibold">{selectedInvoiceBooking.jamaahId || '-'}</span>
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Status Jamaah: <span className="font-bold text-emerald-700">Terdaftar Aktif (Sutera Web)</span>
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[9px] text-gray-400 font-black uppercase tracking-wider mb-1">PROGRAM DETAIL & HARGA:</h4>
                    <p className="text-[11px] text-gray-800 font-extrabold leading-normal">
                      📦 Paket: {selectedInvoiceBooking.paketLabel || 'Paket Pilihan Umrah Program'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="bg-amber-100 text-amber-850 px-2 py-0.5 border border-amber-200 rounded font-black text-[9px] uppercase">
                        {selectedInvoiceBooking.jenisPaket || 'Master'} Room
                      </span>
                      <strong className="text-slate-900 font-mono">
                        {formatCurrency(selectedInvoiceBooking.totalHarga || 0)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Ledger Items Table (Standard Invoice Accurate) */}
                <div className="mb-5 font-sans">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold uppercase tracking-wider text-[9px] border border-slate-800">
                        <th className="p-2.5">Deskripsi Layanan / Item Paket</th>
                        <th className="p-2.5 text-center w-16">Jumlah</th>
                        <th className="p-2.5 text-right w-28">Harga Satuan</th>
                        <th className="p-2.5 text-right w-32">Total Harga</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium border border-slate-200">
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-2.5">
                          <strong className="text-gray-900 block font-extrabold text-[12px]">
                            {selectedInvoiceBooking.paketLabel || 'Paket Pilihan Umrah Program'}
                          </strong>
                          <span className="text-[10px] text-gray-500">
                            Pendaftaran Seat Umroh Program Kamar {selectedInvoiceBooking.jenisPaket || 'QUAD ROOM'} (All In Standard Accurate)
                          </span>
                        </td>
                        <td className="p-2.5 text-center text-gray-900 font-extrabold">1 Pack</td>
                        <td className="p-2.5 text-right font-mono text-gray-800">
                          {formatCurrency(selectedInvoiceBooking.totalHarga || 0)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-gray-900 font-bold">
                          {formatCurrency(selectedInvoiceBooking.totalHarga || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Sub-Table Block: Real Payments Ledger (Integrated from Firestore Collection - No Dummy) */}
                <div className="mb-5 font-sans">
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider flex items-center justify-between">
                      <span>Rincian Pembayaran & Riwayat Ledger Akuntansi (Real-time Firestore)</span>
                      <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold text-[9px]">
                        {invoiceTxs.length} Transaksi Terverifikasi
                      </span>
                    </div>
                    <table className="w-full text-left text-[10px] leading-relaxed">
                      <thead>
                        <tr className="bg-slate-100/50 text-gray-500 font-bold uppercase tracking-wider text-[9px] border-b border-slate-200">
                          <th className="p-2">Kode Referensi</th>
                          <th className="p-2">Tanggal Terima</th>
                          <th className="p-2">Metode Penerimaan</th>
                          <th className="p-2 text-right">Nilai Nominal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 font-medium whitespace-nowrap">
                        {invoiceTxs.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/30">
                            <td className="p-2 font-mono text-gray-800">#{tx.id.substring(0, 8).toUpperCase()}</td>
                            <td className="p-2 text-gray-600">
                              {tx.createdAt 
                                ? new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                : 'Baru saja'
                              }
                            </td>
                            <td className="p-2 uppercase text-gray-650 max-w-[120px] overflow-hidden text-ellipsis">
                              {tx.description || `Kasir Penerimaan (${tx.type || 'Pendaftaran'})`}
                            </td>
                            <td className="p-2 text-right font-mono text-indigo-700 font-black">
                              {formatCurrency(tx.amount)}
                            </td>
                          </tr>
                        ))}
                        {invoiceTxs.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-3 text-center text-gray-400 italic">
                              Belum ada rincian transaksi pembayaran yang tercatat di sistem (Menunggu Verifikasi Deposit).
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sub-Totals Calculation Box Frame */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 items-start font-sans">
                  
                  {/* Financial Terms Guidelines Disclaimer */}
                  <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/50 text-[10px] text-amber-950 font-medium text-justify">
                    <span className="font-extrabold uppercase tracking-wide block text-amber-900 border-b border-amber-200/50 pb-1 mb-1 font-sans">
                      Catatan Legalitas Administrasi:
                    </span>
                    {invoiceNote}
                  </div>

                  {/* Pricing Arithmetic Block */}
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2 select-none font-sans">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-gray-500 font-semibold font-sans">Total Nilai Tagihan Paket:</span>
                      <strong className="font-mono text-gray-900">
                        {formatCurrency(selectedInvoiceBooking.totalHarga || 0)}
                      </strong>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-emerald-700 font-extrabold">Dana Terverifikasi Masuk:</span>
                      <strong className="font-mono text-emerald-800 font-black font-sans">
                        {formatCurrency(
                          invoiceTxs
                            .filter(tx => tx.status?.toLowerCase() === 'success' || tx.status?.toLowerCase() === 'lunas' || tx.status === undefined)
                            .reduce((sum, tx) => sum + (tx.amount || 0), 0)
                        )}
                      </strong>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-sans">
                      <span className="text-indigo-855 font-black uppercase tracking-wider font-sans">SISA TAGIHAN MANDIRI (AR):</span>
                      <strong className="font-mono text-indigo-900 font-black text-[13px] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {formatCurrency(
                          Math.max(0, (selectedInvoiceBooking.totalHarga || 0) - invoiceTxs
                            .filter(tx => tx.status?.toLowerCase() === 'success' || tx.status?.toLowerCase() === 'lunas' || tx.status === undefined)
                            .reduce((sum, tx) => sum + (tx.amount || 0), 0))
                        )}
                      </strong>
                    </div>

                    <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[9px] text-gray-500 dark:border-dashed font-sans">
                      <span>Progres Pelunasan Dana:</span>
                      <strong className="text-indigo-700 font-black">
                        {Math.min(100, Math.round((
                          invoiceTxs
                            .filter(tx => tx.status?.toLowerCase() === 'success' || tx.status?.toLowerCase() === 'lunas' || tx.status === undefined)
                            .reduce((sum, tx) => sum + (tx.amount || 0), 0) / (selectedInvoiceBooking.totalHarga || 1)
                        ) * 100))}% Lunas
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Official Indonesian Corporate Footer & Signatures Block */}
                <div className="pt-4 border-t border-slate-200 grid grid-cols-2 text-center text-[10px] tracking-wide text-gray-600 gap-4 mt-6">
                  <div>
                    <h5 className="font-black text-gray-400 mb-10 text-[9px] uppercase tracking-wider">Hormat Kami, Calon Jamaah</h5>
                    <div className="h-[1px] bg-gray-300 w-36 mx-auto mb-1"></div>
                    <span className="text-gray-800 font-bold block text-[11px]">
                      {jamaahs.find(j => j.id === selectedInvoiceBooking.id)?.nama_paspor || jamaahs.find(j => j.id === selectedInvoiceBooking.jamaahId)?.nama_paspor || 'Jamaah Pembeli'}
                    </span>
                    <span className="text-[9px] text-gray-400 font-bold block mt-0.5">Tandatangan & Nama Terang</span>
                  </div>

                  <div>
                     <h5 className="font-black text-gray-400 mb-10 text-[9px] uppercase tracking-wider">Pemeriksa Administrasi Keuangan</h5>
                    <div className="h-[1px] bg-gray-300 w-36 mx-auto mb-1"></div>
                    <span className="text-gray-800 font-bold block text-[11px]">
                      {cashierName}
                    </span>
                    <span className="text-[9px] text-gray-400 font-bold block mt-0.5">Kasir Keuangan Umaroh</span>
                  </div>
                </div>

                {/* Print Sheet stylesheet block overrides */}
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    @page {
                      size: A4;
                      margin: 15mm;
                    }
                    body * {
                      visibility: hidden;
                    }
                    .invoice-print-area, .invoice-print-area * {
                      visibility: visible;
                    }
                    .invoice-print-area {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 100%;
                      max-width: 100% !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      border: none !important;
                      box-shadow: none !important;
                      background: white !important;
                    }
                    .no-print {
                      display: none !important;
                    }
                  }
                `}} />

              </div>
              {/* Printable Area Ends */}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
