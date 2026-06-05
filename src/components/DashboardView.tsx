import React, { useState, useEffect } from 'react';
import { LayoutDashboard, TrendingUp, Users, Package, AlertCircle, ArrowRight, MessageCircle, Clock, Plane, Calendar, Users2 } from 'lucide-react';
import { TabType } from './Navbar';
import { format, differenceInDays, parseISO, startOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { db, collection, onSnapshot, handleFirestoreError, OperationType, doc, updateDoc } from '../firebase';
import { getTransactions } from '../data/transactions';
import { PaketTracker, JamaahTracker } from './tracker/types';
import { openWhatsApp } from '../utils/whatsapp';
import { syncBookingToTracker } from '../utils/firebaseSync';
import { ShopOrder } from '../types';

interface PilgrimBooking {
  id: string;
  jamaahId?: string;
  jenisPaket?: string;
  paketLabel?: string;
  totalHarga?: number;
  statusPembayaran?: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
}

interface DashboardViewProps {
  onNavigate?: (tab: TabType) => void;
}

interface DisplayFlight {
  id: string;
  airline: string;
  departure: string;
  return: string;
  availableSeats: number;
  totalSeats: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [pakets, setPakets] = useState<PaketTracker[]>([]);
  const [jamaahs, setJamaahs] = useState<JamaahTracker[]>([]);
  const [totalOmzet, setTotalOmzet] = useState(0);
  const [airlineInfo, setAirlineInfo] = useState<DisplayFlight[]>([]);
  
  // Real-time Pilgrim bookings & Merchandise shop orders
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([]);
  const [rawBookings, setRawBookings] = useState<PilgrimBooking[]>([]);
  const [resiInputs, setResiInputs] = useState<Record<string, string>>({});
  const [internalTab, setInternalTab] = useState<'bookings' | 'shop'>('bookings');

  useEffect(() => {
    const unsubPaket = onSnapshot(collection(db, 'tracker_paket'), (snapshot) => {
      setPakets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaketTracker)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tracker_paket');
    });
    
    const unsubJamaah = onSnapshot(collection(db, 'tracker_jamaah'), (snapshot) => {
      setJamaahs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JamaahTracker)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tracker_jamaah');
    });

    const unsubShopOrders = onSnapshot(collection(db, 'shop_orders'), (snapshot) => {
      setShopOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShopOrder)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'shop_orders');
    });

    const unsubRawBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      setRawBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PilgrimBooking)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'bookings');
    });

    const unsubAirlines = onSnapshot(collection(db, 'maskapai'), (snapshot) => {
      interface TempFlight {
        id: string;
        airline: string;
        rawDept: string;
        rawReturn: string;
        availableSeats: number;
        totalSeats: number;
      }
      const list: TempFlight[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          airline: d.name || 'Maskapai',
          rawDept: d.tanggalKeberangkatan || '',
          rawReturn: d.tanggalKepulangan || '',
          availableSeats: Number(d.availableSeats || 0),
          totalSeats: Number(d.totalSeats || 0),
        });
      });
      // Sort and take top 4
      const todayStr = new Date().toISOString().split('T')[0];
      const active = list
        .filter(f => f.rawDept >= todayStr)
        .sort((a,b) => a.rawDept.localeCompare(b.rawDept))
        .slice(0, 4);

      const targetList = active.length === 0 ? list.slice(0, 4) : active;

      const formatted = targetList.map(f => {
        let deptText = f.rawDept;
        let retText = f.rawReturn;
        try {
          if (f.rawDept) {
            const parsed = parseISO(f.rawDept);
            if (!isNaN(parsed.getTime())) {
              deptText = format(parsed, 'dd MMM yyyy', { locale: idLocale });
            }
          }
        } catch {
          // Keep raw date text if parsing fails
        }
        try {
          if (f.rawReturn) {
            const parsed = parseISO(f.rawReturn);
            if (!isNaN(parsed.getTime())) {
              retText = format(parsed, 'dd MMM yyyy', { locale: idLocale });
            }
          }
        } catch {
          // Keep raw date text if parsing fails
        }

        return {
          id: f.id,
          airline: f.airline,
          departure: deptText,
          return: retText,
          availableSeats: f.availableSeats,
          totalSeats: f.totalSeats,
        };
      });

      setAirlineInfo(formatted);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'maskapai');
    });

    const transactions = getTransactions();
    const omzet = transactions.reduce((sum, t) => sum + t.totalOmzet, 0);
    setTotalOmzet(omzet);

    return () => { 
      unsubPaket(); 
      unsubJamaah(); 
      unsubAirlines();
      unsubShopOrders();
      unsubRawBookings();
    };
  }, []);

  const activePakets = pakets.filter(p => p.status !== 'Selesai').length;
  const totalJamaah = jamaahs.length;
  const pendingJamaahPayments = jamaahs.filter(j => j.statusPembayaran !== 'Lunas').length;

  const stats = [
    { label: 'Total Omzet (Sales)', value: `Rp ${totalOmzet.toLocaleString('id-ID')}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', tab: 'revenue' as TabType },
    { label: 'Paket Umroh Aktif', value: activePakets.toString(), icon: Package, color: 'text-amber-600', bg: 'bg-amber-50', tab: 'tracker' as TabType },
    { label: 'Total Jamaah', value: totalJamaah.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', tab: 'tracker' as TabType },
    { label: 'Pending Payments', value: `${pendingJamaahPayments} Jamaah`, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', tab: 'tracker' as TabType },
  ];

  interface VendorInvoice {
    id: string;
    paketName: string;
    serviceType: string;
    notes: string;
    vendorName: string;
    amount: number;
    dueDate: string;
    status: string;
  }

  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>([]);

  useEffect(() => {
    const savedInvoices = localStorage.getItem('vendor_invoices');
    if (savedInvoices) {
      try {
        setVendorInvoices(JSON.parse(savedInvoices));
      } catch (err) {
        console.warn('Failed to parse vendor invoices from storage, resetting key:', err);
        localStorage.removeItem('vendor_invoices');
      }
    }
  }, []);

  const today = startOfDay(new Date());

  const pendingPayments = vendorInvoices
    .filter(s => s.status !== 'Lunas')
    .map(s => {
      const dueDateStr = s.dueDate || new Date().toISOString();
      const dueDate = startOfDay(parseISO(dueDateStr));
      let formattedDate = '-';
      try {
        if (!isNaN(dueDate.getTime())) {
          formattedDate = format(dueDate, 'dd MMM yyyy', { locale: idLocale });
        }
      } catch (e) {
        console.error("Error formatting date:", e);
      }
      
      const daysRemaining = !isNaN(dueDate.getTime()) ? differenceInDays(dueDate, today) : 0;
      
      return {
        id: s.id,
        package: s.paketName,
        type: s.serviceType,
        item: s.notes,
        vendor: s.vendorName,
        amount: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(s.amount),
        dueDate: formattedDate,
        daysRemaining,
        paymentType: s.status,
        pic: 'Admin'
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const sendWhatsAppReminder = (payment: { pic: string, package: string, type: string, vendor: string, paymentType: string, amount: string, dueDate: string }) => {
    const message = `Halo ${payment.pic}, pengingat pembayaran untuk:\n\nPaket: ${payment.package}\nLayanan: ${payment.type}\nVendor: ${payment.vendor}\nTagihan: ${payment.paymentType}\nEstimasi Biaya: ${payment.amount}\nJatuh Tempo: ${payment.dueDate}\n\nMohon segera diproses. Terima kasih.`;
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
    openWhatsApp(waUrl);
  };

  // Update Shop Order Status/Resi
  const handleUpdateShopOrderStatus = async (orderId: string, newStatus: string, customResi?: string) => {
    try {
      const payload: { status: string; noResi?: string } = { status: newStatus };
      if (customResi !== undefined) {
        payload.noResi = customResi;
      }
      await updateDoc(doc(db, 'shop_orders', orderId), payload);
      alert(`Status pesanan berhasil diperbarui ke: ${newStatus}`);
    } catch (err) {
      console.error("Gagal update status pesanan belanja:", err);
    }
  };

  // Confirm Pilgrim Package Booking payment
  const handleConfirmBookingPayment = async (bookingId: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        statusPembayaran: 'lunas'
      });
      // Retrieve booking to re-sync
      const targetBooking = rawBookings.find(b => b.id === bookingId);
      if (targetBooking) {
        await syncBookingToTracker(bookingId, {
          ...targetBooking,
          statusPembayaran: 'lunas'
        });
      }
      alert("Pembayaran pendaftaran umroh berhasil dikonfirmasi LUNAS!");
    } catch (err) {
      console.error("Gagal konfirmasi pembayaran:", err);
    }
  };

  const getStatusColor = (days: number) => {
    if (days < 0) return 'bg-rose-100 text-rose-700 border-rose-200';
    if (days <= 7) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-amber-500 rounded-lg">
          <LayoutDashboard className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
      </div>

      {/* Promo Banner */}
      <div className="mb-8 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-4 md:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 hidden sm:block">
          <Plane className="w-32 h-32 rotate-12" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/20 backdrop-blur-md px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[10px] font-bold uppercase tracking-widest">Special Offer</span>
            <span className="animate-pulse flex h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-white"></span>
          </div>
          <h2 className="text-lg md:text-2xl font-black mb-2">🌙✨ BIG PROMO TICKET 2026 🌙✨</h2>
          <p className="text-amber-50 text-xs md:text-sm font-medium mb-4 max-w-xl">
            FRESHNEL, NQH, AZZAHRA & ABM READY PNR - GARUDA, SAUDIA, INDIGO, OMAN & QATAR (JUN-DEC 2026). Harga Mulai 11Jtan, DP Hanya 2Jt.
          </p>
          <div className="flex flex-wrap gap-2 md:gap-4 mb-4">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 md:p-3 border border-white/20 flex-grow sm:flex-grow-0">
              <p className="text-[8px] md:text-[10px] uppercase tracking-wider opacity-80 mb-1 font-bold">FRESHNEL</p>
              <p className="font-bold text-[10px] md:text-sm">RIDHO: 082228939996</p>
              <p className="font-bold text-[10px] md:text-sm">UMAR: 082333344936</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 md:p-3 border border-white/20 flex-grow sm:flex-grow-0">
              <p className="text-[8px] md:text-[10px] uppercase tracking-wider opacity-80 mb-1 font-bold">ABM</p>
              <p className="font-bold text-[10px] md:text-sm">SELVI: 081320002218</p>
              <p className="font-bold text-[10px] md:text-sm">NINA: 081320002219</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 md:p-3 border border-white/20 flex-grow sm:flex-grow-0">
              <p className="text-[8px] md:text-[10px] uppercase tracking-wider opacity-80 mb-1 font-bold">AZZAHRA</p>
              <p className="font-bold text-[10px] md:text-sm">ASTRIE: 089531820777</p>
              <p className="font-bold text-[10px] md:text-sm">ALI: 08971799215</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button 
              onClick={() => openWhatsApp("https://chat.whatsapp.com/FbBKB7rAM1BL6k4GFp5GiH")}
              className="bg-white text-amber-600 px-3 py-2 md:px-4 md:py-3 rounded-lg md:rounded-xl font-bold text-[10px] md:text-sm hover:bg-amber-50 transition-colors shadow-md flex items-center gap-2"
            >
              <MessageCircle className="w-3 h-3 md:w-4 md:h-4" /> FRESHNEL
            </button>
            <button 
              onClick={() => openWhatsApp("https://chat.whatsapp.com/HpCNxJdZvtrEZNGsM4XcVL?mode=gi_t")}
              className="bg-amber-700 text-white px-3 py-2 md:px-4 md:py-3 rounded-lg md:rounded-xl font-bold text-[10px] md:text-sm hover:bg-amber-800 transition-colors shadow-md flex items-center gap-2"
            >
              <MessageCircle className="w-3 h-3 md:w-4 md:h-4" /> AZZAHRA
            </button>
            <button 
              onClick={() => openWhatsApp("https://chat.whatsapp.com/HpCNxJdZvtrEZNGsM4XcVL?mode=gi_t")}
              className="bg-emerald-600 text-white px-3 py-2 md:px-4 md:py-3 rounded-lg md:rounded-xl font-bold text-[10px] md:text-sm hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2"
            >
              <MessageCircle className="w-3 h-3 md:w-4 md:h-4" /> ABM
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index} 
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all"
              onClick={() => onNavigate?.(stat.tab)}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Pending Payments</h2>
            <button 
              onClick={() => onNavigate?.('finance')}
              className="text-sm text-blue-600 font-semibold hover:underline flex items-center gap-1"
            >
              View All <span className="hidden sm:inline">Finance</span> <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                  <th className="pb-4">Package</th>
                  <th className="pb-4">Type</th>
                  <th className="pb-4">Item / Vendor</th>
                  <th className="pb-4 text-right">Amount</th>
                  <th className="pb-4 text-center">Due Date</th>
                  <th className="pb-4 text-center">Status</th>
                  <th className="pb-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendingPayments.map((payment) => (
                  <tr key={payment.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="py-4">
                      <p className="text-sm font-bold text-gray-900">{payment.package}</p>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        payment.type === 'TICKET' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {payment.type}
                      </span>
                    </td>
                    <td className="py-4">
                      <p className="text-sm text-gray-700">{payment.item}</p>
                      <p className="text-xs text-gray-400">{payment.vendor}</p>
                    </td>
                    <td className="py-4 text-right">
                      <p className="text-sm font-black text-rose-600">{payment.amount}</p>
                    </td>
                    <td className="py-4 text-center">
                      <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                        {payment.dueDate}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold ${getStatusColor(payment.daysRemaining)}`}>
                        <Clock className="w-3 h-3" />
                        {payment.daysRemaining < 0 
                          ? `Overdue by ${Math.abs(payment.daysRemaining)} days` 
                          : payment.daysRemaining === 0 
                            ? 'Due Today' 
                            : `${payment.daysRemaining} days left`}
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => sendWhatsAppReminder(payment)}
                          className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                          title="Send WhatsApp Reminder"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onNavigate?.('finance')}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {pendingPayments.map((payment) => (
              <div key={payment.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{payment.package}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      payment.type === 'TICKET' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {payment.type}
                    </span>
                  </div>
                  <p className="text-sm font-black text-rose-600">{payment.amount}</p>
                </div>
                
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-gray-700">{payment.item}</p>
                    <p className="text-[10px] text-gray-400">{payment.vendor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Due Date</p>
                    <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                      {payment.dueDate}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold ${getStatusColor(payment.daysRemaining)}`}>
                    <Clock className="w-3 h-3" />
                    {payment.daysRemaining < 0 
                      ? `Overdue by ${Math.abs(payment.daysRemaining)} days` 
                      : payment.daysRemaining === 0 
                        ? 'Due Today' 
                        : `${payment.daysRemaining} days left`}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => sendWhatsAppReminder(payment)}
                      className="p-2 rounded-lg bg-emerald-50 text-emerald-600"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onNavigate?.('finance')}
                      className="p-2 rounded-lg bg-blue-50 text-blue-600"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <button 
              onClick={() => onNavigate?.('sales-order')}
              className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 font-semibold text-sm hover:bg-amber-100 transition-colors text-left flex items-center justify-between"
            >
              Create New Quotation <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onNavigate?.('database')}
              className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-semibold text-sm hover:bg-blue-100 transition-colors text-left flex items-center justify-between"
            >
              Add New Maskapai <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onNavigate?.('sales-order')}
              className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold text-sm hover:bg-emerald-100 transition-colors text-left flex items-center justify-between"
            >
              View Sales Report <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onNavigate?.('templates')}
              className="p-4 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 font-semibold text-sm hover:bg-purple-100 transition-colors text-left flex items-center justify-between"
            >
              Manage Templates <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Airline Information</h2>
          </div>
          <button 
            onClick={() => onNavigate?.('flights')}
            className="text-sm text-blue-600 font-semibold hover:underline flex items-center gap-1"
          >
            Manage Flights <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {airlineInfo.map((flight) => (
            <div key={flight.id} className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{flight.airline}</p>
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                  Active
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-700">{flight.departure}</p>
                    <p className="text-[10px]">Departure</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-700">{flight.return}</p>
                    <p className="text-[10px]">Return</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Users2 className="w-4 h-4 text-gray-400" />
                      <span>Available Seats</span>
                    </div>
                    <span className={`text-xs font-bold ${flight.availableSeats < 10 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {flight.availableSeats} / {flight.totalSeats}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${flight.availableSeats < 10 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${(flight.availableSeats / flight.totalSeats) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NEW: Pilgrim Bookings & Shop Items Dispatch Panels */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 font-sans">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-150 pb-4 mb-6 gap-4">
          <div>
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              🕋 Kelola Transaksi Baru Jamaah
            </h2>
            <p className="text-xs text-gray-500 mt-1">Proses pendaftaran paket umroh dan pengiriman belanjaan perlengkapan jamaah Anda secara real-time.</p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 gap-1 self-start md:self-auto">
            <button
              onClick={() => setInternalTab('bookings')}
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${
                internalTab === 'bookings' 
                  ? 'bg-white text-emerald-800 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Pendaftaran Paket ({rawBookings.filter(b => b.statusPembayaran === 'pending').length})
            </button>
            <button
              onClick={() => setInternalTab('shop')}
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${
                internalTab === 'shop' 
                  ? 'bg-white text-emerald-800 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Belanja Perlengkapan ({shopOrders.length})
            </button>
          </div>
        </div>

        {internalTab === 'bookings' ? (
          <div>
            {rawBookings.filter(b => b.statusPembayaran === 'pending').length === 0 ? (
              <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-gray-200">
                <span className="text-3xl block mb-2">🎉</span>
                <p className="text-gray-600 font-bold text-xs">Mantap! Semua pendaftaran paket umroh jamaah baru sudah lunas atau diverifikasi.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-100 text-[10px]">
                      <th className="p-3.5">ID / Waktu</th>
                      <th className="p-3.5">Nama Jamaah</th>
                      <th className="p-3.5">Paket Pilihan</th>
                      <th className="p-3.5 text-right">Nilai Tagihan</th>
                      <th className="p-3.5 text-center">Aksi Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {rawBookings.filter(b => b.statusPembayaran === 'pending').map((booking) => (
                      <tr key={booking.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-gray-800 block text-xs">#{booking.id.substring(0, 8).toUpperCase()}</span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            {booking.createdAt ? (booking.createdAt.seconds ? new Date(booking.createdAt.seconds * 1000).toLocaleString('id-ID') : 'Baru saja') : 'Baru saja'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-extrabold text-gray-800 block text-xs">
                            {jamaahs.find(j => j.id === booking.id)?.nama_paspor || booking.jamaahId?.substring(0, 8)}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">ID: {booking.jamaahId}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="bg-emerald-55 text-emerald-75 font-extrabold px-2 py-0.5 rounded-full text-[10px] uppercase">
                            {booking.jenisPaket || 'Master'}
                          </span>
                          <span className="text-gray-600 block text-[11px] mt-1 font-bold">
                            {booking.paketLabel || 'Paket Pilihan Program'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-sans">
                          <strong className="text-amber-600 font-black text-sm block">
                            Rp {(booking.totalHarga || 0).toLocaleString('id-ID')}
                          </strong>
                          <span className="text-[10px] bg-amber-105 text-amber-85 px-1.5 py-0.5 rounded-full font-bold inline-block mt-1 uppercase">
                            Pending Payment
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleConfirmBookingPayment(booking.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer text-[10px]"
                          >
                            KONFIRMASI LUNAS
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            {shopOrders.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-gray-200">
                <span className="text-3xl block mb-2">🛍️</span>
                <p className="text-gray-600 font-bold text-xs">Belum ada jamaah yang memesan pakaian/ihram tambahan di shop market.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-100 text-[10px]">
                      <th className="p-3.5">ID / Detail Item</th>
                      <th className="p-3.5">Nama Pembeli & Alamat Kirim</th>
                      <th className="p-3.5 text-right">Pembayaran</th>
                      <th className="p-3.5 text-center">Status Kirim</th>
                      <th className="p-3.5 text-center">Kontrol Seller</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {shopOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/50 font-sans">
                        <td className="p-3.5 max-w-[200px]">
                          <span className="font-mono text-gray-400 text-[10px] block font-bold">ID: #{order.id.substring(0, 8).toUpperCase()}</span>
                          <span className="font-extrabold text-xs text-gray-800 block mt-1">{order.productName}</span>
                          <span className="text-gray-500 text-[10px] block mt-0.5">
                            Jumlah: <strong className="text-gray-800">{order.quantity || 1} Pcs</strong> | Satuan: Rp {(order.productPrice || 0).toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td className="p-3.5 max-w-[240px]">
                          <strong className="text-gray-800 block font-extrabold text-[12px]">{order.jamaahName || 'Jamaah Marawa'}</strong>
                          <p className="text-gray-500 leading-relaxed text-[11px] bg-slate-50 p-2 rounded-xl mt-1.5 border border-slate-100">
                            📍 Alamat: {order.shippingAddress || '-'}
                          </p>
                          <span className="text-[10px] font-bold text-gray-400 block mt-1 font-mono">
                            Kurir: <strong className="text-gray-700 uppercase">{order.shippingVendor || 'Reguler'}</strong>
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <strong className="text-amber-600 font-black text-sm block">Rp {(order.totalCost || 0).toLocaleString('id-ID')}</strong>
                          <span className="text-[10px] text-gray-400 font-bold block mt-1 font-mono">Metode: {order.paymentMethod || 'Manual'}</span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            order.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' :
                            order.status === 'Dibatalkan' ? 'bg-red-150 text-red-75 border border-red-200' :
                            order.status?.startsWith('Dikirim') ? 'bg-indigo-100 text-indigo-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {order.status || 'Diproses Seller'}
                          </span>
                          {order.noResi && (
                            <span className="font-mono text-[9px] block text-indigo-600 font-bold mt-1.5 bg-indigo-50 px-1 py-0.5 rounded">
                              RESI: {order.noResi}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center space-y-2">
                          {order.status !== 'Selesai' && order.status !== 'Dibatalkan' && (
                            <div className="flex flex-col gap-1.5 max-w-[150px] mx-auto">
                              {!order.noResi && (
                                <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                                  <input
                                    type="text"
                                    placeholder="Input No. Resi..."
                                    value={resiInputs[order.id] || ''}
                                    onChange={(e) => setResiInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                                    className="bg-transparent text-[10px] outline-none border-none py-1 px-1.5 w-full font-bold"
                                  />
                                  <button
                                    onClick={() => {
                                      const r = resiInputs[order.id]?.trim();
                                      if (!r) {
                                        alert("Mohon ketikkan nomor resi kurir pengiriman.");
                                        return;
                                      }
                                      handleUpdateShopOrderStatus(order.id, 'Dikirim', r);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-2 py-1 rounded font-sans text-[8px]"
                                  >
                                    KIRIM
                                  </button>
                                </div>
                              )}
                              
                              {order.noResi && order.status !== 'Selesai' && (
                                <button
                                  onClick={() => handleUpdateShopOrderStatus(order.id, 'Selesai')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-2.5 py-1 text-[10px] rounded-xl cursor-pointer"
                                >
                                  ✓ SELESAIKAN PESANAN
                                </button>
                              )}

                              <button
                                onClick={() => handleUpdateShopOrderStatus(order.id, 'Dibatalkan')}
                                className="text-red-500 hover:text-red-700 font-black text-[10px] py-1 underline cursor-pointer"
                              >
                                BATALKAN
                              </button>
                            </div>
                          )}
                          {(order.status === 'Selesai' || order.status === 'Dibatalkan') && (
                            <span className="text-gray-400 font-bold text-[10px]">TUNTAS</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">AI Tools</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all group cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">WhatsApp AI Bot</p>
              <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                Beta
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Bot belajar dari pertanyaan user WhatsApp
            </p>
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <code className="text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded">/api/whatsapp-bot</code>
              <ArrowRight className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { title: 'New Quotation Created', desc: 'John Doe created a quotation for Saudia Airlines', time: '2 hours ago', tab: 'sales-order' as TabType },
            { title: 'Vendor Payments Updated', desc: 'Jane Smith updated room costs for Grand Zowar', time: '4 hours ago', tab: 'finance' as TabType },
            { title: 'New Customer Added', desc: 'PT. Berkah Umrah added to database', time: '1 day ago', tab: 'database' as TabType },
            { title: 'Template Modified', desc: 'Standard 9 Days itinerary updated', time: '2 days ago', tab: 'templates' as TabType },
          ].map((activity, i) => (
            <div 
              key={i} 
              className="flex items-center gap-4 pb-4 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg p-2"
              onClick={() => onNavigate?.(activity.tab)}
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs shrink-0">
                {activity.title.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div className="flex-grow">
                <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                <p className="text-xs text-gray-500">{activity.desc}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
