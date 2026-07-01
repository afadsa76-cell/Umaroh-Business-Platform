import React, { useState, useEffect } from 'react';
import { LayoutDashboard, TrendingUp, Users, Package, ArrowRight, MessageCircle, Clock, Plane, Calendar, Printer, FileText, X, Award, ChevronRight, Shield, Landmark, Sparkles, Building, Bell, Info, AlertTriangle, Check } from 'lucide-react';
import { TabType } from './Navbar';
import { format, differenceInDays, parseISO, startOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { db, collection, onSnapshot, handleFirestoreError, OperationType, doc, updateDoc, auth, query, where } from '../firebase';
import { getTransactions } from '../data/transactions';
import { PaketTracker, JamaahTracker } from './tracker/types';
import { openWhatsApp } from '../utils/whatsapp';
import { syncBookingToTracker } from '../utils/firebaseSync';
import { ShopOrder, AppNotification } from '../types';
import { listenToUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService';
import { MitraLiveMap } from './dashboard/MitraLiveMap';

interface InvoiceTransaction {
  id: string;
  userId?: string;
  bookingId?: string;
  namaJamaah?: string;
  type?: string;
  amount: number;
  status?: string;
  description?: string;
  createdAt?: string;
}

interface CurrentUserInvoiceData {
  id?: string;
  name?: string;
  namaLengkap?: string;
  brandName?: string;
  logo?: string;
  customMitraProfile?: {
    logo?: string;
  };
  alamat?: string;
  noHp?: string;
  phone?: string;
}

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

interface UserRecord {
  id: string;
  role?: string;
  status?: string;
  namaLengkap?: string;
  name?: string;
  brandName?: string;
  jenisMitra?: string;
  kota?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [pakets, setPakets] = useState<PaketTracker[]>([]);
  const [jamaahs, setJamaahs] = useState<JamaahTracker[]>([]);
  const [totalOmzet, setTotalOmzet] = useState(0);
  const [airlineInfo, setAirlineInfo] = useState<DisplayFlight[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  
  // Real-time Pilgrim bookings & Merchandise shop orders
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([]);
  const [rawBookings, setRawBookings] = useState<PilgrimBooking[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [resiInputs, setResiInputs] = useState<Record<string, string>>({});
  const [internalTab, setInternalTab] = useState<'bookings' | 'shop'>('bookings');

  // Load real-time notifications for administration panels
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (!user) return;
      const unsubscribeNotifications = listenToUserNotifications(user.uid, 'admin', (notifs) => {
        setNotifications(notifs);
      });
      return () => unsubscribeNotifications();
    });
    return () => unsubAuth();
  }, []);

  // Invoice state variables inside DashboardView.tsx
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<PilgrimBooking | null>(null);
  const [invoiceTxs, setInvoiceTxs] = useState<InvoiceTransaction[]>([]);
  const [currentUserData, setCurrentUserData] = useState<CurrentUserInvoiceData | null>(null);
  const [invoiceNote, setInvoiceNote] = useState('Pembayaran sah dilakukan melalui Kasir Kantor Pusat atau via Transfer Bank Resmi Agent. Harap simpan invoice ini sebagai bukti administrasi resmi untuk pengurusan keberangkatan.');
  const [invoiceCustomNum, setInvoiceCustomNum] = useState('');
  const [showInvoiceStamp, setShowInvoiceStamp] = useState(true);
  const [cashierName, setCashierName] = useState('');

  // Load current user profile for invoice branding
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) return;
      const userRef = doc(db, 'users', user.uid);
      const unsubscribeSnap = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const uData = docSnap.data() as CurrentUserInvoiceData;
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
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvoiceTransaction));
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

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

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error loading users for dashboard:", error);
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
      unsubUsers();
    };
  }, []);

  const activePakets = pakets.filter(p => p.status !== 'Selesai').length;
  const totalJamaah = jamaahs.length;

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
      {/* Modern Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-gray-150 pb-6 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-600 text-gray-950 rounded-2xl shadow-indigo-100 shadow-lg">
            <LayoutDashboard className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border border-indigo-150 shrink-0">
              Umaroh ERP Center
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mt-1 leading-none">
              Dashboard Overview
            </h1>
          </div>
        </div>

        {/* Live Operational Context Area + Notification Bell */}
        <div className="flex items-center gap-3 shrink-0 relative z-50">
          {/* Admin Real-time Notification Bell */}
          <div className="relative">
            <button 
              onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              className="p-3 bg-white text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 shadow-sm rounded-2xl transition-all cursor-pointer flex items-center justify-center relative active:scale-95"
              title="Notifikasi Masuk (Admin)"
            >
              <Bell className="w-5 h-5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm font-sans animate-bounce">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            {showNotificationDropdown && (
              <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl border border-gray-150 shadow-xl z-50 overflow-hidden text-gray-900 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-gray-150 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-gray-800 tracking-wider">Pemberitahuan Sistem</span>
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {notifications.filter(n => !n.read).length} Baru
                      </span>
                    )}
                  </div>
                  {notifications.filter(n => !n.read).length > 0 && (
                    <button 
                      onClick={async () => {
                        await markAllNotificationsAsRead(notifications);
                      }}
                      className="text-[10px] font-extrabold text-indigo-600 hover:underline uppercase tracking-wider cursor-pointer"
                    >
                      Tandai Semua Dibaca
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-gray-500" />
                      <p className="text-xs font-bold uppercase tracking-wider">Belum Ada Notifikasi</p>
                      <p className="text-[10px] text-gray-450 mt-1">Status operasional, withdraw mitra, & pendaftaran jamaah akan muncul di sini secara real-time.</p>
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
                                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-ping"></span>
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

          <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
            <div className="text-left font-mono text-[11px] text-gray-600 leading-tight">
              <p className="font-extrabold text-gray-900 flex items-center gap-1.5 uppercase">
                <Clock className="w-3.5 h-3.5 text-indigo-600" /> SYSTEM ACTIVE
              </p>
              <p className="mt-0.5 font-semibold text-gray-500">
                {format(new Date(), "eeee, dd MMMM yyyy", { locale: idLocale })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Big Promo Ticket 2026 Interactive Widget replaced with Live Connection Map */}
      <MitraLiveMap users={users} />

      {/* KPI Stats Bento Grid (Dynamic calculations) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1: Revenue */}
        <div 
          onClick={() => onNavigate?.('sales-order')}
          className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-100">
              GROWTH STATE
            </span>
          </div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">OMZET TERKUMPUL</p>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 mt-1">
            Rp {totalOmzet.toLocaleString('id-ID')}
          </h2>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Diverifikasi Keuangan</span>
            <span className="font-extrabold text-emerald-600 font-mono">100% OK</span>
          </div>
        </div>

        {/* Card 2: Mitra Jaringan */}
        <div 
          onClick={() => onNavigate?.('database')}
          className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-105 transition-transform">
              <Building className="w-6 h-6" />
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border border-indigo-110">
              PARTNERSHIP
            </span>
          </div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">MITRA / AGEN AKTIF</p>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 mt-1">
            {users.filter(u => u.role === 'mitra').length} Mitra
          </h2>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Registrasi Digital</span>
            <span className="font-extrabold text-indigo-600 font-mono">
              {users.filter(u => u.role === 'mitra' && u.status === 'active').length} Terverifikasi
            </span>
          </div>
        </div>

        {/* Card 3: Total Jamaah */}
        <div 
          onClick={() => onNavigate?.('tracker')}
          className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-110">
              TOTAL SOULS
            </span>
          </div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">JAMAAH TERDAFTAR</p>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 mt-1">
            {totalJamaah} Jamaah
          </h2>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Pelunasan Tagihan</span>
            <span className="font-extrabold text-blue-600 font-mono">
              {jamaahs.filter(j => j.statusPembayaran === 'Lunas').length} Lunas
            </span>
          </div>
        </div>

        {/* Card 4: Open Flights Allotments */}
        <div 
          onClick={() => onNavigate?.('flights')}
          className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 group-hover:scale-105 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <span className="text-[10px] bg-amber-50 text-amber-700 font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-110">
              LAUNCH INVENTORY
            </span>
          </div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">PAKET UMROH AKTIF</p>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 mt-1">
            {activePakets} Paket Program
          </h2>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Status Persiapan</span>
            <span className="font-extrabold text-amber-600 font-mono">
              {pakets.filter(p => p.status === 'Persiapan').length} Persiapan
            </span>
          </div>
        </div>
      </div>

      {/* Main Insights Bento Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Bento Widget 1: Real-Time Pilgrim Document & Payment Matrix (Columns Span 2) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  Kesiapan Dokumen & Pembayaran Jamaah
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Pantau kesiapan Paspor, Vaksin meningitis & data pembayaran jamaah Anda.</p>
              </div>
              <button 
                onClick={() => onNavigate?.('tracker')}
                className="text-xs text-indigo-600 hover:text-indigo-805 font-bold flex items-center gap-1 uppercase tracking-wider"
              >
                View Tracker <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              {jamaahs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-500 text-xs font-bold">Belum ada data jamaah yang terdaftar di sistem.</p>
                </div>
              ) : (
                <table className="w-full text-left font-sans text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-black uppercase text-[10px] tracking-wider">
                      <th className="pb-3">NAMA JAMAAH & KOTA</th>
                      <th className="pb-3 text-center">PASPOR</th>
                      <th className="pb-3 text-center">VAKSIN MENINGITIS</th>
                      <th className="pb-3 text-center">PEMBAYARAN</th>
                      <th className="pb-3 text-right">KESIAPAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {jamaahs.slice(0, 5).map((j) => {
                      const isPasporReady = j.statusPaspor === 'Sudah Ada';
                      const isVaksinReady = j.statusVaksin === 'Sudah';
                      const isLunas = j.statusPembayaran === 'Lunas';
                      const isDp = j.statusPembayaran === 'DP';

                      // Calculate document score %
                      let completedItems = 0;
                      if (isPasporReady) completedItems++;
                      if (isVaksinReady) completedItems++;
                      if (isLunas) completedItems += 2;
                      else if (isDp) completedItems += 1;
                      const scorePercentage = Math.min(100, Math.round((completedItems / 4) * 100));

                      return (
                        <tr key={j.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5">
                            <span className="font-extrabold text-gray-800 block text-xs truncate max-w-[170px]">
                              {j.namaLengkap}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono hover:underline inline-block mt-0.5 uppercase">
                              📍 {j.kabupaten_kota || j.provinsi || 'Kota Asal'}
                            </span>
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              isPasporReady ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {j.statusPaspor || 'Belum Ada'}
                            </span>
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              isVaksinReady ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {isVaksinReady ? 'LENGKAP' : 'BELUM'}
                            </span>
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              isLunas ? 'bg-emerald-50 text-emerald-750 font-bold border border-emerald-100' : 
                              isDp ? 'bg-amber-50 text-amber-700 font-bold border border-amber-100' : 
                              'bg-rose-50 text-rose-700 font-bold border border-rose-100'
                            }`}>
                              {j.statusPembayaran || 'Belum Bayar'}
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-extrabold text-gray-800 font-mono text-[11px]">{scorePercentage}%</span>
                              <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden border border-gray-150">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    scorePercentage === 100 ? 'bg-emerald-500' :
                                    scorePercentage >= 50 ? 'bg-amber-400' :
                                    'bg-rose-500'
                                  }`} 
                                  style={{ width: `${scorePercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Analytical Footnotes */}
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center select-none">
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100/50">
              <span className="text-[10px] text-gray-400 font-black tracking-wider uppercase block">PASPOR AMAN</span>
              <strong className="text-sm font-black text-gray-800 mt-1 block">
                {jamaahs.filter(j => j.statusPaspor === 'Sudah Ada').length} / {totalJamaah}
              </strong>
            </div>
            <div className="bg-emerald-50/30 p-2.5 rounded-2xl border border-emerald-100/40">
              <span className="text-[10px] text-emerald-700 font-black tracking-wider uppercase block">LUNAS AMAN</span>
              <strong className="text-sm font-black text-emerald-800 mt-1 block">
                {jamaahs.filter(j => j.statusPembayaran === 'Lunas').length} / {totalJamaah}
              </strong>
            </div>
            <div className="bg-amber-50/25 p-2.5 rounded-2xl border border-amber-100/30">
              <span className="text-[10px] text-amber-700 font-black tracking-wider uppercase block">INDENT DP</span>
              <strong className="text-sm font-black text-amber-800 mt-1 block">
                {jamaahs.filter(j => j.statusPembayaran === 'DP').length} / {totalJamaah}
              </strong>
            </div>
          </div>
        </div>

        {/* Bento Widget 2: Jaringan Kemitraan & Mitra Lokasi */}
        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500 animate-bounce" />
                  Mitra & Agen Terkini
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Keagenan digital yang terhubung di platform Umaroh.</p>
              </div>
              <button 
                onClick={() => onNavigate?.('database')}
                className="text-xs text-indigo-600 hover:text-indigo-805 font-bold font-sans uppercase tracking-wider"
              >
                Lihat Semua
              </button>
            </div>

            {/* List of Mitras */}
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto no-scrollbar">
              {users.filter(u => u.role === 'mitra').length === 0 ? (
                <div className="text-center py-10 bg-gray-50 border border-dashed rounded-2xl">
                  <span className="text-lg block">🤝</span>
                  <p className="text-[11px] text-gray-500 font-bold mt-1">Belum ada Mitra terdaftar di platform ini.</p>
                </div>
              ) : (
                users.filter(u => u.role === 'mitra').slice(0, 5).map((m) => {
                  return (
                    <div key={m.id} className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-100 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-750 font-black flex items-center justify-center text-xs uppercase shadow-sm border border-indigo-100 shrink-0">
                          {m.namaLengkap?.substring(0, 2).toUpperCase() || 'MT'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-gray-950 truncate max-w-[130px]">
                            {m.namaLengkap || m.name || 'Mitra Umaroh'}
                          </p>
                          <span className="text-[9px] font-black text-indigo-600 font-mono tracking-wider block uppercase mt-0.5 truncate max-w-[130px]">
                            💼 {m.brandName || m.jenisMitra || 'RESELLER DIGITAL'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] bg-emerald-50 text-emerald-825 border border-emerald-100 px-2 py-0.5 rounded-full font-black uppercase tracking-wider font-mono">
                          {m.status || 'ACTIVE'}
                        </span>
                        <p className="text-[8px] text-gray-400 mt-1 block">📍 {m.kota || 'Indonesia'}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4">
            <button 
              onClick={() => onNavigate?.('sales-order')}
              className="w-full bg-slate-900 hover:bg-slate-950 text-white font-black py-3 rounded-2xl transition shadow-sm text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              Rancang Sales Order Baru
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Airline Seat Allotments Progress Grid */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-150 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-blue-500 text-white rounded-xl shadow-md">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">Airline Seat Allotments (Real-Time Block Seat)</h2>
              <p className="text-xs text-gray-400 mt-0.5">Sisa kuota Block Seat maskapai penerbangan di masing-masing grup keberangkatan.</p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate?.('flights')}
            className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 uppercase tracking-wider"
          >
            Manage Flights <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {airlineInfo.length === 0 ? (
            <div className="col-span-full text-center py-8 bg-gray-50 border border-dashed rounded-2xl">
              <p className="text-xs text-gray-500 font-bold">Belum ada rilis block seat maskapai saat ini.</p>
            </div>
          ) : (
            airlineInfo.map((flight) => {
              const seatPercent = Math.min(100, Math.round(((flight.availableSeats || 0) / (flight.totalSeats || 100)) * 100));
              return (
                <div key={flight.id} className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all group relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-extrabold text-xs text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                      ✈️ {flight.airline}
                    </p>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-750 text-[9px] font-black border border-indigo-100 uppercase tracking-widest">
                      ACTIVE PNR
                    </span>
                  </div>
                  
                  <div className="space-y-3.5 mb-4">
                    <div className="flex items-start gap-2 text-xs text-gray-600">
                      <Calendar className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-black text-gray-800 leading-none">{flight.departure}</p>
                        <span className="text-[9px] text-gray-400 block mt-1 font-mono uppercase">Keberangkatan</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2 text-xs text-gray-600">
                      <Calendar className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-black text-gray-800 leading-none">{flight.return}</p>
                        <span className="text-[9px] text-gray-400 block mt-1 font-mono uppercase">Kepulangan</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-150">
                    <div className="flex items-center justify-between mb-1.5 text-[10px]">
                      <span className="text-gray-400 font-black uppercase">Quota Sisa:</span>
                      <span className={`font-black font-mono ${flight.availableSeats < 10 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {flight.availableSeats} / {flight.totalSeats} SEAT
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden border border-gray-300">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          flight.availableSeats < 10 ? 'bg-rose-500' : 'bg-emerald-500'
                        }`} 
                        style={{ width: `${seatPercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pilgrim Bookings & Shop Items Dispatch Panels */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-150 shadow-sm mb-8 font-sans">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-150 pb-4 mb-6 gap-4">
          <div>
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              📦 Kelola Transaksi Baru Jamaah
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Proses pendaftaran paket umroh dan pengiriman belanjaan perlengkapan jamaah Anda secara real-time.</p>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl shrink-0 gap-1.5 self-start md:self-auto select-none">
            <button
              onClick={() => setInternalTab('bookings')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                internalTab === 'bookings' 
                  ? 'bg-white text-indigo-950 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-950'
              }`}
            >
              Pendaftaran Paket ({rawBookings.filter(b => b.statusPembayaran === 'pending').length})
            </button>
            <button
              onClick={() => setInternalTab('shop')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                internalTab === 'shop' 
                  ? 'bg-white text-indigo-950 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-950'
              }`}
            >
              Belanja Perlengkapan ({shopOrders.length})
            </button>
          </div>
        </div>

        {internalTab === 'bookings' ? (
          <div>
            {rawBookings.filter(b => b.statusPembayaran === 'pending').length === 0 ? (
              <div className="p-12 text-center bg-slate-50/50 rounded-3xl border border-dashed border-gray-250">
                <span className="text-4xl block mb-2">🎉</span>
                <p className="text-gray-500 font-bold text-xs uppercase">Mantap! Semua pendaftaran paket umroh jamaah baru sudah lunas atau diverifikasi.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-150 text-[10px]">
                      <th className="p-4 rounded-l-2xl">ID / Waktu</th>
                      <th className="p-4">Nama Jamaah</th>
                      <th className="p-4">Paket Pilihan</th>
                      <th className="p-4 text-right">Nilai Tagihan</th>
                      <th className="p-4 text-center rounded-r-2xl">Aksi Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {rawBookings.filter(b => b.statusPembayaran === 'pending').map((booking) => (
                      <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <span className="font-mono font-black text-gray-800 block text-xs">#{booking.id.substring(0, 8).toUpperCase()}</span>
                          <span className="text-[10px] text-gray-400 block mt-1 font-mono">
                            {booking.createdAt ? (booking.createdAt.seconds ? new Date(booking.createdAt.seconds * 1000).toLocaleString('id-ID') : 'Baru saja') : 'Baru saja'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-extrabold text-gray-800 block text-xs">
                            {jamaahs.find(j => j.id === booking.id)?.nama_paspor || booking.jamaahId?.substring(0, 8)}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">ID: {booking.jamaahId}</span>
                        </td>
                        <td className="p-4">
                          <span className="bg-emerald-50 text-emerald-700 font-black px-2.5 py-0.5 rounded-full text-[9px] uppercase border border-emerald-100">
                            {booking.jenisPaket || 'Master'}
                          </span>
                          <span className="text-gray-650 block text-[11px] mt-1.5 font-bold">
                            {booking.paketLabel || 'Paket Pilihan Program'}
                          </span>
                        </td>
                        <td className="p-4 text-right font-sans">
                          <strong className="text-amber-600 font-black text-sm block">
                            Rp {(booking.totalHarga || 0).toLocaleString('id-ID')}
                          </strong>
                          <span className="text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-black inline-block mt-1.5 uppercase tracking-wide border border-amber-100">
                            Pending Payment
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedInvoiceBooking(booking);
                                setInvoiceCustomNum(`INV/${new Date().getFullYear()}/UMR/${booking.id.substring(0, 6).toUpperCase()}`);
                                setIsInvoiceOpen(true);
                              }}
                              className="bg-indigo-50 hover:bg-indigo-110 text-indigo-700 p-2.5 rounded-xl transition cursor-pointer border border-indigo-100 shadow-sm"
                              title="Cetak Invoice & Administrasi Kwitansi"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleConfirmBookingPayment(booking.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer text-[10px] uppercase tracking-wider"
                            >
                              KONFIRMASI LUNAS
                            </button>
                          </div>
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
              <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-gray-250">
                <span className="text-4xl block mb-2">🛍️</span>
                <p className="text-gray-500 font-bold text-xs uppercase">Belum ada jamaah yang memesan pakaian/ihram tambahan di shop market.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-150 text-[10px]">
                      <th className="p-4 rounded-l-2xl">ID / Detail Item</th>
                      <th className="p-4">Nama Pembeli & Alamat Kirim</th>
                      <th className="p-4 text-right">Pembayaran</th>
                      <th className="p-4 text-center">Status Kirim</th>
                      <th className="p-4 text-center rounded-r-2xl">Kontrol Seller</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {shopOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/50 font-sans transition-colors">
                        <td className="p-4 max-w-[200px]">
                          <span className="font-mono text-gray-400 text-[10px] block font-bold">ID: #{order.id.substring(0, 8).toUpperCase()}</span>
                          <span className="font-black text-xs text-gray-800 block mt-1">{order.productName}</span>
                          <span className="text-gray-500 text-[10px] block mt-1">
                            Jumlah: <strong className="text-gray-800">{order.quantity || 1} Pcs</strong> | Satuan: Rp {(order.productPrice || 0).toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td className="p-4 max-w-[240px]">
                          <strong className="text-gray-850 block font-black text-[12px]">{order.jamaahName || 'Jamaah Umaroh'}</strong>
                          <p className="text-gray-500 leading-relaxed text-[11px] bg-slate-50 p-2.5 rounded-2xl mt-1.5 border border-slate-100">
                            📍 Alamat: {order.shippingAddress || '-'}
                          </p>
                          <span className="text-[10px] font-bold text-gray-400 block mt-1.5 font-mono">
                            Kurir: <strong className="text-gray-700 uppercase">{order.shippingVendor || 'Reguler'}</strong>
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <strong className="text-amber-600 font-black text-sm block">Rp {(order.totalCost || 0).toLocaleString('id-ID')}</strong>
                          <span className="text-[10px] text-gray-400 font-bold block mt-1 font-mono">Metode: {order.paymentMethod || 'Manual'}</span>
                        </td>
                        <td className="p-4 text-center">
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
                        <td className="p-4 text-center space-y-2">
                          {order.status !== 'Selesai' && order.status !== 'Dibatalkan' && (
                            <div className="flex flex-col gap-1.5 max-w-[150px] mx-auto">
                              {!order.noResi && (
                                <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
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
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-2.5 py-1 rounded-lg font-sans text-[8px] cursor-pointer"
                                  >
                                    KIRIM
                                  </button>
                                </div>
                              )}
                              
                              {order.noResi && order.status !== 'Selesai' && (
                                <button
                                  onClick={() => handleUpdateShopOrderStatus(order.id, 'Selesai')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-2.5 py-1.5 text-[10px] rounded-xl cursor-pointer shadow-sm uppercase tracking-wider"
                                >
                                  ✓ SELESAIKAN PESANAN
                                </button>
                              )}

                              <button
                                onClick={() => handleUpdateShopOrderStatus(order.id, 'Dibatalkan')}
                                className="text-red-500 hover:text-red-700 font-extrabold text-[10px] py-1 underline cursor-pointer uppercase tracking-wider"
                              >
                                BATALKAN
                              </button>
                            </div>
                          )}
                          {(order.status === 'Selesai' || order.status === 'Dibatalkan') && (
                            <span className="text-gray-400 font-bold text-[10px] uppercase">TUNTAS</span>
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

      {/* Quick Core Actions Platform */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Vendor Invoice Payment Alerts */}
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-1.5">
                  <Landmark className="w-5 h-5 text-indigo-600" />
                  Tagihan Vendor & Pembayaran Mendatang
                </h2>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">Batas pelunasan termin bus, hotel & visa di Arab Saudi.</p>
              </div>
              <button 
                onClick={() => onNavigate?.('finance')}
                className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 uppercase tracking-wider"
              >
                View Accounts <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-black uppercase text-[10px] tracking-wider">
                    <th className="pb-3">NAMA PAKET</th>
                    <th className="pb-3">TIPE</th>
                    <th className="pb-3">VENDOR / LAYANAN</th>
                    <th className="pb-3 text-right">TAGIHAN</th>
                    <th className="pb-3 text-center">LIMIT HARI</th>
                    <th className="pb-3 text-center">STATUS</th>
                    <th className="pb-3 text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pendingPayments.slice(0, 4).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3">
                        <strong className="text-gray-800 text-xs truncate max-w-[150px] block">{p.package}</strong>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          p.type === 'TICKET' ? 'bg-blue-50 text-blue-700 border border-blue-105' : 'bg-amber-50 text-amber-700 border border-amber-105'
                        }`}>
                          {p.type}
                        </span>
                      </td>
                      <td className="py-3">
                        <p className="text-gray-800 font-bold">{p.item}</p>
                        <p className="text-[9px] text-gray-400 leading-none mt-0.5">{p.vendor}</p>
                      </td>
                      <td className="py-3 text-right">
                        <strong className="text-xs text-rose-600 font-black">{p.amount}</strong>
                      </td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-black tracking-wide border border-slate-200">
                          {p.dueDate}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${getStatusColor(p.daysRemaining)}`}>
                          {p.daysRemaining < 0 
                            ? `Overdue ${Math.abs(p.daysRemaining)}D` 
                            : p.daysRemaining === 0 
                              ? 'TODAY' 
                              : `${p.daysRemaining} days`}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <button 
                          onClick={() => sendWhatsAppReminder({
                            pic: 'Admin',
                            package: p.package,
                            type: p.type,
                            vendor: p.vendor,
                            paymentType: p.paymentType,
                            amount: p.amount,
                            dueDate: p.dueDate
                          })}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors inline-block cursor-pointer alignment-center"
                          title="Kirim Wa Reminder"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pendingPayments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-450 font-bold font-sans">
                        Tidak ada tagihan tertata / masih kosong.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 mt-4">
            <span>Selesaikan pembayaran tepat waktu untuk mengamankan PNR & Visa.</span>
            <button 
              onClick={() => onNavigate?.('finance')} 
              className="text-indigo-600 font-black uppercase tracking-wider hover:underline"
            >
              Urus Keuangan &rarr;
            </button>
          </div>
        </div>

        {/* Quick Config Actions Tool Panel */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Sistem Akses Cepat
            </h2>
            <p className="text-xs text-gray-400 mb-6">Modul konfigurasi administrasi ERP back-office harian.</p>

            <div className="space-y-3">
              <button 
                onClick={() => onNavigate?.('sales-order')}
                className="w-full p-4 rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 text-indigo-950 font-black text-xs hover:shadow-sm transition-all text-left flex items-center justify-between uppercase tracking-wider"
              >
                <span>RUMUSKAN PENAWARAN BARU</span> <ArrowRight className="w-4 h-4 text-indigo-600" />
              </button>
              <button 
                onClick={() => onNavigate?.('database')}
                className="w-full p-4 rounded-2xl bg-amber-50/50 hover:bg-amber-50 border border-amber-100 text-amber-950 font-black text-xs hover:shadow-sm transition-all text-left flex items-center justify-between uppercase tracking-wider"
              >
                <span>KELOLA DATABASE MASKAPAI</span> <ArrowRight className="w-4 h-4 text-amber-600" />
              </button>
              <button 
                onClick={() => onNavigate?.('flights')}
                className="w-full p-4 rounded-2xl bg-blue-50/50 hover:bg-blue-50 border border-blue-105 text-blue-950 font-black text-xs hover:shadow-sm transition-all text-left flex items-center justify-between uppercase tracking-wider"
              >
                <span>JADWAL PERJALANAN & FLIGHTS</span> <ArrowRight className="w-4 h-4 text-blue-600" />
              </button>
              <button 
                onClick={() => onNavigate?.('templates')}
                className="w-full p-4 rounded-2xl bg-purple-50/50 hover:bg-purple-50 border border-purple-100 text-purple-950 font-black text-xs hover:shadow-sm transition-all text-left flex items-center justify-between uppercase tracking-wider"
              >
                <span>TEMPLATES & MAJALAH PROGRAM</span> <ArrowRight className="w-4 h-4 text-purple-600" />
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center select-none">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">Umaroh Internal Platform</span>
          </div>
        </div>
      </div>

      {/* AI Tools Info Panel & Recent Activity combined */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        
        {/* CS Intelligence Panel */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-md">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">Umaroh AI Assistant (Online Bot)</h2>
                <p className="text-xs text-gray-400 mt-1">Smart Engine untuk membantu menjawab calon jamaah di WhatsApp.</p>
              </div>
            </div>

            <p className="text-xs text-gray-650 leading-relaxed bg-slate-50 border border-slate-150 p-4 rounded-2xl mb-4 font-medium">
              Sistem AI terhubung langsung dengan endpoint publik untuk melatih ribuan data perjalanan, ketersediaan hotel, visa, dan asuransi secara real-time. Membantu meringankan beban Customer Service hingga 85%.
            </p>

            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="font-mono text-[10px] font-black text-gray-600">LIVE ENDPOINT URL</span>
              </div>
              <code className="text-[10px] text-indigo-600 bg-indigo-50/50 px-2.5 py-1 rounded-xl font-bold font-mono">/api/whatsapp-bot</code>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4 text-right">
            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-150 shadow-sm">
              Status Bot: Active
            </span>
          </div>
        </div>

        {/* Recent Activities Panel */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-150 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 mb-4">Aktivitas Sistem Terbaru</h2>
          <div className="space-y-4">
            {[
              { title: 'Quotation Penawaran Dibuat', desc: 'Sistem merumuskan harga tiket Saudia Airlines PNR khusus', time: '2 jam yang lalu', tab: 'sales-order' as TabType },
              { title: 'Update Tagihan Termin Hotel', desc: 'Bagian keuangan memperbarui DP hotel Grand Zowar Madinah', time: '4 jam yang lalu', tab: 'finance' as TabType },
              { title: 'Mitra Baru Bergabung', desc: 'Keagenan PT. Berkat Umrah sukses didaftarkan sebagai platinum', time: '1 hari yang lalu', tab: 'database' as TabType },
              { title: 'Perubahan Template Itinerary', desc: 'Itinerary standart program 9 hari direvisi bagian operasional', time: '2 hari yang lalu', tab: 'templates' as TabType },
            ].map((activity, i) => (
              <div 
                key={i} 
                className="flex items-center gap-4 pb-3.5 border-b border-gray-50 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl transition-all"
                onClick={() => onNavigate?.(activity.tab)}
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-750 font-black flex items-center justify-center text-xs shrink-0 shadow-sm border border-indigo-100">
                  {activity.title.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-xs font-black text-gray-900 truncate leading-none">{activity.title}</p>
                  <p className="text-[10px] text-gray-500 mt-1 truncate">{activity.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] text-gray-400 font-mono italic">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    {/* ================= INVOICE GENERATOR & PRINTER MODAL (ACCURATE ERP INSPIRED) ================= */}
      {isInvoiceOpen && selectedInvoiceBooking && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 overflow-y-auto p-4 md:p-8 flex items-center justify-center font-sans no-print animate-in fadeIn duration-150">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col md:flex-row h-[90vh] max-h-[850px] animate-in zoom-in-95 duration-200">
            
            {/* Left Panel: Invoice Configurator Controls */}
            <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-100 p-5 flex flex-col justify-between overflow-y-auto select-none">
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
                  onClick={() => window.print()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  CETAK / PRINT KERTAS A4
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
                  <div className="absolute right-12 top-40 rotate-[12deg] pointer-events-none select-none z-10">
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
                    <div className="flex items-center gap-2">
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
                    <div className="text-[10px] text-gray-500 leading-relaxed max-w-sm pt-1">
                      {currentUserData?.alamat || 'Pusat Niaga Kav. 12, Area Bandara Internasional, Jakarta, Indonesia.'}
                      <span className="block mt-0.5">Mobile/WA: {currentUserData?.noHp || currentUserData?.phone || '+62 822-1234-5678'}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
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
                <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 p-4 rounded-xl border border-slate-205/60 grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <h4 className="text-[9px] text-gray-400 font-black uppercase tracking-wider mb-1">DITAGIHKAN KEPADA:</h4>
                    <strong className="text-sm text-indigo-900 block font-black">
                      {jamaahs.find(j => j.id === selectedInvoiceBooking.id)?.nama_paspor || selectedInvoiceBooking.jamaahId?.substring(0, 8)}
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
                <div className="mb-5">
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
                <div className="mb-5">
                  <div className="border border-slate-200 rounded-xl overflow-hidden font-sans">
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
                      <tbody className="divide-y divide-slate-150 font-medium">
                        {invoiceTxs.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/30">
                            <td className="p-2 font-mono text-gray-800">#{tx.id.substring(0, 8).toUpperCase()}</td>
                            <td className="p-2 text-gray-600">
                              {tx.createdAt 
                                ? new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                : 'Baru saja'
                              }
                            </td>
                            <td className="p-2 uppercase text-gray-600">
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
                    <span className="font-extrabold uppercase tracking-wide block text-amber-900 border-b border-amber-200/50 pb-1 mb-1">
                      Catatan Legalitas Administrasi:
                    </span>
                    {invoiceNote}
                  </div>

                  {/* Pricing Arithmetic Block */}
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2 select-none">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-gray-500 font-semibold">Total Nilai Tagihan Paket:</span>
                      <strong className="font-mono text-gray-900">
                        {formatCurrency(selectedInvoiceBooking.totalHarga || 0)}
                      </strong>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-emerald-700 font-extrabold">Dana Terverifikasi Masuk:</span>
                      <strong className="font-mono text-emerald-800 font-black">
                        {formatCurrency(
                          invoiceTxs
                            .filter(tx => tx.status?.toLowerCase() === 'success' || tx.status?.toLowerCase() === 'lunas' || tx.status === undefined)
                            .reduce((sum, tx) => sum + (tx.amount || 0), 0)
                        )}
                      </strong>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                      <span className="text-indigo-850 font-black uppercase tracking-wider">SISA TAGIHAN MANDIRI (AR):</span>
                      <strong className="font-mono text-indigo-900 font-black text-[13px] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {formatCurrency(
                          Math.max(0, (selectedInvoiceBooking.totalHarga || 0) - invoiceTxs
                            .filter(tx => tx.status?.toLowerCase() === 'success' || tx.status?.toLowerCase() === 'lunas' || tx.status === undefined)
                            .reduce((sum, tx) => sum + (tx.amount || 0), 0))
                        )}
                      </strong>
                    </div>

                    <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[9px] text-gray-500 dark:border-dashed">
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
                <div className="pt-4 border-t border-slate-200 grid grid-cols-2 text-center text-[10px] tracking-wide text-gray-600 gap-4 mt-6 font-sans">
                  <div>
                    <h5 className="font-black text-gray-400 mb-10 text-[9px] uppercase tracking-wider">Hormat Kami, Calon Jamaah</h5>
                    <div className="h-[1px] bg-gray-300 w-36 mx-auto mb-1"></div>
                    <span className="text-gray-800 font-bold block text-[11px]">
                      {jamaahs.find(j => j.id === selectedInvoiceBooking.id)?.nama_paspor || 'Jamaah Pembeli'}
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
