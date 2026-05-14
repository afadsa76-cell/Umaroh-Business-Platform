import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Search, Download, Filter, Edit, CheckCircle, AlertCircle, Clock, Package, Save, X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format, subDays, differenceInDays, isToday, isPast, isFuture, parseISO, startOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

type PaymentStatus = 'Belum Bayar' | 'DP' | 'Lunas';

interface VendorService {
  id: string;
  paketId: string;
  namaPaket: string;
  namaLayanan: string;
  vendor: string;
  tanggalKeberangkatan: string;
  tanggalKepulangan: string;
  reminderDPHMinus: number;
  reminderPelunasanHMinus: number;
  estimasiBiaya: number;
  statusPembayaran: PaymentStatus;
  pic: string;
  catatan: string;
  isManualDate?: boolean;
  manualPelunasanDate?: string;
  paymentPerItems?: string;
  dpAmount?: number;
  payment1?: number;
  payment2?: number;
  payment3?: number;
  totalPembelian?: number;
}

const initialData: VendorService[] = [
  {
    id: '1',
    paketId: 'P1',
    namaPaket: 'UMRAH REGULER 9 HARI',
    namaLayanan: 'Maskapai',
    vendor: 'Lion Air',
    tanggalKeberangkatan: '2026-05-15',
    tanggalKepulangan: '2026-05-24',
    reminderDPHMinus: 45,
    reminderPelunasanHMinus: 14,
    estimasiBiaya: 675000000,
    statusPembayaran: 'Belum Bayar',
    pic: 'Rinaldi',
    catatan: 'Booking 45 seat'
  },
  {
    id: '2',
    paketId: 'P1',
    namaPaket: 'UMRAH REGULER 9 HARI',
    namaLayanan: 'Hotel Makkah',
    vendor: 'Emaar Andalusia',
    tanggalKeberangkatan: '2026-05-15',
    tanggalKepulangan: '2026-05-24',
    reminderDPHMinus: 40,
    reminderPelunasanHMinus: 10,
    estimasiBiaya: 250000000,
    statusPembayaran: 'DP',
    pic: 'Seruni',
    catatan: '20 Kamar Quad'
  },
  {
    id: '3',
    paketId: 'P2',
    namaPaket: 'UMRAH PROMO 12 HARI',
    namaLayanan: 'Visa Umroh',
    vendor: 'Provider Visa A',
    tanggalKeberangkatan: '2026-04-10',
    tanggalKepulangan: '2026-04-22',
    reminderDPHMinus: 30,
    reminderPelunasanHMinus: 20,
    estimasiBiaya: 90000000,
    statusPembayaran: 'Lunas',
    pic: 'Mirna',
    catatan: '40 Pax'
  },
  {
    id: '4',
    paketId: 'P2',
    namaPaket: 'UMRAH PROMO 12 HARI',
    namaLayanan: 'Handling Saudi',
    vendor: 'Saudi Handling Co',
    tanggalKeberangkatan: '2026-04-10',
    tanggalKepulangan: '2026-04-22',
    reminderDPHMinus: 14,
    reminderPelunasanHMinus: 7,
    estimasiBiaya: 15000000,
    statusPembayaran: 'Belum Bayar',
    pic: 'Rinaldi',
    catatan: 'Bus & Mutawif'
  },
  {
    id: '5',
    paketId: 'P3',
    namaPaket: 'UMRAH PLUS TURKI 12 HARI',
    namaLayanan: 'Perlengkapan Jamaah',
    vendor: 'Koperasi Umroh',
    tanggalKeberangkatan: '2026-03-20',
    tanggalKepulangan: '2026-04-01',
    reminderDPHMinus: 60,
    reminderPelunasanHMinus: 30,
    estimasiBiaya: 45000000,
    statusPembayaran: 'Belum Bayar',
    pic: 'Seruni',
    catatan: 'Koper, Kain Ihram, Mukena'
  }
];

export const MappingPaketJadiView: React.FC = () => {
  const [services, setServices] = useState<VendorService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterDate, setFilterDate] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<PaymentStatus>('Belum Bayar');
  const [editPic, setEditPic] = useState<string>('Rinaldi');
  const [editBiaya, setEditBiaya] = useState<number>(0);
  const [editIsManualDate, setEditIsManualDate] = useState<boolean>(false);
  const [editManualDate, setEditManualDate] = useState<string>('');
  const [editPaymentPerItems, setEditPaymentPerItems] = useState<string>('');
  const [editDpAmount, setEditDpAmount] = useState<number>(0);
  const [editPayment1, setEditPayment1] = useState<number>(0);
  const [editPayment2, setEditPayment2] = useState<number>(0);
  const [editPayment3, setEditPayment3] = useState<number>(0);
  const [editTotalPembelian, setEditTotalPembelian] = useState<number>(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = () => {
      const storedData = localStorage.getItem('vendor_services');
      if (storedData) {
        setServices(JSON.parse(storedData));
      } else {
        localStorage.setItem('vendor_services', JSON.stringify(initialData));
        setServices(initialData);
      }
      setLoading(false);
    };
    
    loadData();
  }, []);

  const handleDeleteService = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus layanan ini?')) {
      const updatedServices = services.filter(service => service.id !== id);
      setServices(updatedServices);
      localStorage.setItem('vendor_services', JSON.stringify(updatedServices));
    }
  };

  const toggleExpandService = (serviceId: string) => {
    setExpandedServiceId(prev => prev === serviceId ? null : serviceId);
  };

  const [newService, setNewService] = useState<Partial<VendorService>>({
    namaPaket: '',
    namaLayanan: '',
    vendor: '',
    tanggalKeberangkatan: format(new Date(), 'yyyy-MM-dd'),
    tanggalKepulangan: format(new Date(), 'yyyy-MM-dd'),
    reminderDPHMinus: 30,
    reminderPelunasanHMinus: 14,
    estimasiBiaya: 0,
    statusPembayaran: 'Belum Bayar',
    pic: 'Rinaldi',
    catatan: '',
    isManualDate: false,
    paymentPerItems: '',
    dpAmount: 0,
    payment1: 0,
    payment2: 0,
    payment3: 0,
    totalPembelian: 0
  });

  const today = startOfDay(new Date());

  const getDueDateInfo = (dateStr: string, hMinus: number, status: PaymentStatus, isDP: boolean, isManual: boolean = false, manualDate?: string) => {
    let dueDate: Date;
    
    if (isManual && manualDate && !isDP) {
      dueDate = startOfDay(parseISO(manualDate));
    } else {
      const departureDate = startOfDay(parseISO(dateStr));
      dueDate = subDays(departureDate, hMinus);
    }
    
    const daysDiff = differenceInDays(dueDate, today);
    
    let colorClass = 'text-gray-500 bg-gray-100';
    let dotClass = 'bg-gray-400';
    let isUrgent = false;

    if (status === 'Lunas' || (isDP && status === 'DP')) {
      colorClass = 'text-emerald-700 bg-emerald-100';
      dotClass = 'bg-emerald-500';
    } else {
      if (daysDiff < 0) {
        colorClass = 'text-red-700 bg-red-100';
        dotClass = 'bg-red-500';
      } else if (daysDiff <= 7) {
        colorClass = 'text-amber-700 bg-amber-100';
        dotClass = 'bg-amber-500';
        isUrgent = true;
      } else {
        colorClass = 'text-blue-700 bg-blue-100';
        dotClass = 'bg-blue-500';
      }
    }

    return {
      date: dueDate,
      formattedDate: format(dueDate, 'dd MMM yyyy', { locale: idLocale }),
      daysDiff,
      colorClass,
      dotClass,
      isUrgent
    };
  };

  const handleEditClick = (service: VendorService) => {
    setEditingId(service.id);
    setEditStatus(service.statusPembayaran);
    setEditPic(service.pic);
    setEditBiaya(service.estimasiBiaya);
    setEditIsManualDate(service.isManualDate || false);
    setEditManualDate(service.manualPelunasanDate || '');
    setEditPaymentPerItems(service.paymentPerItems || '');
    setEditDpAmount(service.dpAmount || 0);
    setEditPayment1(service.payment1 || 0);
    setEditPayment2(service.payment2 || 0);
    setEditPayment3(service.payment3 || 0);
    setEditTotalPembelian(service.totalPembelian || 0);
  };

  const handleSaveEdit = (id: string) => {
    const updatedServices = services.map(service => {
      if (service.id === id) {
        return {
          ...service,
          statusPembayaran: editStatus,
          pic: editPic,
          estimasiBiaya: editBiaya,
          isManualDate: editIsManualDate,
          manualPelunasanDate: editIsManualDate ? editManualDate : undefined,
          paymentPerItems: editPaymentPerItems,
          dpAmount: editDpAmount,
          payment1: editPayment1,
          payment2: editPayment2,
          payment3: editPayment3,
          totalPembelian: editTotalPembelian
        };
      }
      return service;
    });
    
    setServices(updatedServices);
    localStorage.setItem('vendor_services', JSON.stringify(updatedServices));
    setEditingId(null);
  };

  const handleAddService = () => {
    if (!newService.namaPaket || !newService.namaLayanan || !newService.vendor) return;
    
    const serviceToAdd = {
      paketId: `P${Math.floor(Math.random() * 1000)}`,
      ...(newService as VendorService),
      id: Math.random().toString(36).substr(2, 9),
    };
    
    const updatedServices = [...services, serviceToAdd];
    setServices(updatedServices);
    localStorage.setItem('vendor_services', JSON.stringify(updatedServices));
    
    setShowAddModal(false);
    setNewService({
      namaPaket: '',
      namaLayanan: '',
      vendor: '',
      tanggalKeberangkatan: format(new Date(), 'yyyy-MM-dd'),
      tanggalKepulangan: format(new Date(), 'yyyy-MM-dd'),
      reminderDPHMinus: 30,
      reminderPelunasanHMinus: 14,
      estimasiBiaya: 0,
      statusPembayaran: 'Belum Bayar',
      pic: 'Rinaldi',
      catatan: '',
      isManualDate: false,
      paymentPerItems: '',
      dpAmount: 0,
      payment1: 0,
      payment2: 0,
      payment3: 0,
      totalPembelian: 0
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchSearch = s.namaLayanan.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.namaPaket.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || s.statusPembayaran === filterStatus;
      const matchDate = !filterDate || s.tanggalKeberangkatan === filterDate;
      return matchSearch && matchStatus && matchDate;
    });
  }, [services, searchTerm, filterStatus, filterDate]);

  // Calculate summaries
  const summaries = useMemo(() => {
    let hariIni = 0;
    let akanDatang = 0;
    let sudahLewat = 0;

    services.forEach(s => {
      if (s.statusPembayaran === 'Lunas') return;

      const dpInfo = getDueDateInfo(s.tanggalKeberangkatan, s.reminderDPHMinus, s.statusPembayaran, true);
      const pelunasanInfo = getDueDateInfo(s.tanggalKeberangkatan, s.reminderPelunasanHMinus, s.statusPembayaran, false);

      // Check DP
      if (s.statusPembayaran === 'Belum Bayar') {
        if (dpInfo.daysDiff < 0) sudahLewat++;
        else if (dpInfo.daysDiff <= 7) hariIni++;
        else akanDatang++;
      }
      
      // Check Pelunasan
      if (pelunasanInfo.daysDiff < 0) sudahLewat++;
      else if (pelunasanInfo.daysDiff <= 7) hariIni++;
      else akanDatang++;
    });

    return { hariIni, akanDatang, sudahLewat };
  }, [services]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-600 rounded-lg shadow-lg shrink-0">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Mapping Pembayaran & Booking Layanan</h1>
            <p className="text-xs md:text-sm text-gray-500">Reminder jadwal pembayaran vendor maskapai, hotel, visa, dll.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="relative flex-grow md:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari layanan, vendor..." 
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <input 
            type="date" 
            className="flex-grow md:flex-grow-0 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />

          <select 
            className="flex-grow md:flex-grow-0 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">Semua Status</option>
            <option value="Belum Bayar">Belum Bayar</option>
            <option value="DP">DP</option>
            <option value="Lunas">Lunas</option>
          </select>

          <div className="flex gap-2 w-full md:w-auto">
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
            
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah <span className="hidden sm:inline">Manual</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <AlertCircle className="w-16 h-16 text-red-600" />
          </div>
          <h3 className="text-sm font-bold text-red-600 uppercase tracking-widest mb-2">Sudah Lewat</h3>
          <p className="text-4xl font-black text-gray-900">{summaries.sudahLewat}</p>
          <p className="text-sm text-gray-500 mt-2">Tagihan melewati jatuh tempo</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Clock className="w-16 h-16 text-amber-600" />
          </div>
          <h3 className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-2">Mendekati (H-7)</h3>
          <p className="text-4xl font-black text-gray-900">{summaries.hariIni}</p>
          <p className="text-sm text-gray-500 mt-2">Tagihan jatuh tempo segera</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden sm:col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Calendar className="w-16 h-16 text-blue-600" />
          </div>
          <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-2">Akan Datang</h3>
          <p className="text-4xl font-black text-gray-900">{summaries.akanDatang}</p>
          <p className="text-sm text-gray-500 mt-2">Tagihan di masa depan</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mb-4"></div>
            <p className="text-gray-500 font-medium">Memuat data layanan...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-900 text-[#FDB913] text-[10px] uppercase tracking-wider font-bold">
                  <tr>
                    <th rowSpan={2} className="px-4 py-4 border-r border-b border-gray-700 text-left align-middle">Paket & Layanan</th>
                    <th rowSpan={2} className="px-4 py-4 border-r border-b border-gray-700 text-left align-middle">Vendor</th>
                    <th rowSpan={2} className="px-4 py-4 border-r border-b border-gray-700 text-left align-middle">Jadwal (CI/CO)</th>
                    <th rowSpan={2} className="px-4 py-4 border-r border-b border-gray-700 text-left align-middle">Reminder DP</th>
                    <th rowSpan={2} className="px-4 py-4 border-r border-b border-gray-700 text-left align-middle">Pembayaran Selanjutnya</th>
                    <th className="px-4 py-2 border-r border-b border-gray-700 text-center bg-yellow-400 text-black">PAYMENT PER ITEMS</th>
                    <th className="px-4 py-2 border-r border-b border-gray-700 text-center bg-yellow-400 text-black">DP</th>
                    <th className="px-4 py-2 border-r border-b border-gray-700 text-center bg-yellow-400 text-black">PAYMENT 1</th>
                    <th className="px-4 py-2 border-r border-b border-gray-700 text-center bg-yellow-400 text-black">PAYMENT 2</th>
                    <th className="px-4 py-2 border-r border-b border-gray-700 text-center bg-yellow-400 text-black">PAYMENT 3</th>
                    <th className="px-4 py-2 border-r border-b border-gray-700 text-center bg-yellow-400 text-black">PELUNASAN</th>
                    <th className="px-4 py-2 border-r border-b border-gray-700 text-center bg-yellow-400 text-black">SISA PEMBAYARAN KESELURUHAN PKT</th>
                    <th className="px-4 py-2 border-r border-b border-gray-700 text-center bg-yellow-400 text-black">TOTAL PEMBELIAN PERPAKET</th>
                    <th rowSpan={2} className="px-4 py-4 border-r border-b border-gray-700 text-right align-middle">Estimasi Biaya</th>
                    <th rowSpan={2} className="px-4 py-4 border-r border-b border-gray-700 text-center align-middle">Status</th>
                    <th rowSpan={2} className="px-4 py-4 border-r border-b border-gray-700 text-left align-middle">PIC</th>
                    <th rowSpan={2} className="px-4 py-4 border-b text-center align-middle">Aksi</th>
                  </tr>
                  <tr>
                    <th colSpan={5} className="px-4 py-1 border-r border-b border-gray-700 text-center text-blue-700 italic font-bold bg-purple-200">Diisi FINANCE / OPS</th>
                    <th className="px-4 py-1 border-r border-b border-gray-700 text-center text-blue-700 italic font-bold bg-purple-200">AUTOMATIC</th>
                    <th className="px-4 py-1 border-r border-b border-gray-700 text-center bg-yellow-400"></th>
                    <th className="px-4 py-1 border-r border-b border-gray-700 text-center bg-yellow-400"></th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredServices.map((service) => {
                    const dpInfo = getDueDateInfo(service.tanggalKeberangkatan, service.reminderDPHMinus, service.statusPembayaran, true);
                    const pelunasanInfo = getDueDateInfo(service.tanggalKeberangkatan, service.reminderPelunasanHMinus, service.statusPembayaran, false, service.isManualDate, service.manualPelunasanDate);

                    const total = service.totalPembelian || 0;
                    const paid = (service.dpAmount || 0) + (service.payment1 || 0) + (service.payment2 || 0) + (service.payment3 || 0);
                    const pelunasanAmount = total - paid;
                    
                    const packageServices = services.filter(s => s.paketId === service.paketId);
                    const packageTotal = packageServices.reduce((sum, s) => sum + (s.totalPembelian || 0), 0);
                    const packagePaid = packageServices.reduce((sum, s) => sum + (s.dpAmount || 0) + (s.payment1 || 0) + (s.payment2 || 0) + (s.payment3 || 0), 0);
                    const sisaPembayaranKeseluruhan = packageTotal - packagePaid;

                    return (
                      <React.Fragment key={service.id}>
                        <tr className="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                          <td className="px-4 py-4">
                            <div className="font-bold text-gray-900">{service.namaLayanan}</div>
                          <div className="text-xs text-gray-500 mt-1">{service.namaPaket}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-800">{service.vendor}</div>
                          <div className="text-xs text-gray-500 italic mt-1">{service.catatan}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs font-medium text-emerald-700">CI: {format(parseISO(service.tanggalKeberangkatan), 'dd MMM yyyy', { locale: idLocale })}</div>
                          <div className="text-xs font-medium text-rose-700 mt-1">CO: {format(parseISO(service.tanggalKepulangan), 'dd MMM yyyy', { locale: idLocale })}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${dpInfo.colorClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dpInfo.dotClass}`}></span>
                            {dpInfo.formattedDate}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1">H-{service.reminderDPHMinus}</div>
                        </td>
                        <td className="px-4 py-4">
                          {editingId === service.id ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input 
                                  type="checkbox" 
                                  id={`manual-date-${service.id}`}
                                  checked={editIsManualDate}
                                  onChange={(e) => setEditIsManualDate(e.target.checked)}
                                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                />
                                <label htmlFor={`manual-date-${service.id}`} className="text-[10px] font-medium text-gray-700">Set Manual</label>
                              </div>
                              {editIsManualDate ? (
                                <input 
                                  type="date"
                                  className="w-full px-2 py-1 border border-amber-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  value={editManualDate}
                                  onChange={(e) => setEditManualDate(e.target.value)}
                                />
                              ) : (
                                <div className="text-[10px] text-gray-500">Otomatis (H-{service.reminderPelunasanHMinus})</div>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${pelunasanInfo.colorClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${pelunasanInfo.dotClass}`}></span>
                                {pelunasanInfo.formattedDate}
                              </div>
                              <div className="text-[10px] text-gray-500 mt-1">
                                {service.isManualDate ? 'Manual' : `Otomatis (H-${service.reminderPelunasanHMinus})`}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-4 border-r border-gray-100">
                          {editingId === service.id ? (
                            <input 
                              type="text"
                              className="w-full px-2 py-1 border border-amber-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                              value={editPaymentPerItems}
                              onChange={(e) => setEditPaymentPerItems(e.target.value)}
                              placeholder="Payment per item..."
                            />
                          ) : (
                            <div className="text-xs text-gray-700">{service.paymentPerItems || '-'}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 border-r border-gray-100 text-right font-medium">
                          {editingId === service.id ? (
                            <input 
                              type="number"
                              className="w-full px-2 py-1 border border-amber-300 rounded text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                              value={editDpAmount}
                              onChange={(e) => setEditDpAmount(Number(e.target.value))}
                            />
                          ) : (
                            <div className="text-xs text-gray-700">{service.dpAmount ? formatCurrency(service.dpAmount) : '-'}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 border-r border-gray-100 text-right font-medium">
                          {editingId === service.id ? (
                            <input 
                              type="number"
                              className="w-full px-2 py-1 border border-amber-300 rounded text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                              value={editPayment1}
                              onChange={(e) => setEditPayment1(Number(e.target.value))}
                            />
                          ) : (
                            <div className="text-xs text-gray-700">{service.payment1 ? formatCurrency(service.payment1) : '-'}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 border-r border-gray-100 text-right font-medium">
                          {editingId === service.id ? (
                            <input 
                              type="number"
                              className="w-full px-2 py-1 border border-amber-300 rounded text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                              value={editPayment2}
                              onChange={(e) => setEditPayment2(Number(e.target.value))}
                            />
                          ) : (
                            <div className="text-xs text-gray-700">{service.payment2 ? formatCurrency(service.payment2) : '-'}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 border-r border-gray-100 text-right font-medium">
                          {editingId === service.id ? (
                            <input 
                              type="number"
                              className="w-full px-2 py-1 border border-amber-300 rounded text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                              value={editPayment3}
                              onChange={(e) => setEditPayment3(Number(e.target.value))}
                            />
                          ) : (
                            <div className="text-xs text-gray-700">{service.payment3 ? formatCurrency(service.payment3) : '-'}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 border-r border-gray-100 text-right font-medium bg-purple-50">
                          <div className="text-xs text-gray-700 font-bold">
                            {formatCurrency(pelunasanAmount)}
                          </div>
                        </td>
                        <td className="px-4 py-4 border-r border-gray-100 text-right font-medium bg-gray-50">
                          <div className="text-xs text-gray-700 font-bold">
                            {formatCurrency(sisaPembayaranKeseluruhan)}
                          </div>
                        </td>
                        <td className="px-4 py-4 border-r border-gray-100 text-right font-medium bg-gray-50">
                          {editingId === service.id ? (
                            <input 
                              type="number"
                              className="w-full px-2 py-1 border border-amber-300 rounded text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                              value={editTotalPembelian}
                              onChange={(e) => setEditTotalPembelian(Number(e.target.value))}
                            />
                          ) : (
                            <div className="text-xs text-gray-700 font-bold">{service.totalPembelian ? formatCurrency(service.totalPembelian) : '-'}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-gray-700">
                          {editingId === service.id ? (
                            <input 
                              type="number"
                              className="w-full px-2 py-1 border border-amber-300 rounded text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                              value={editBiaya}
                              onChange={(e) => setEditBiaya(Number(e.target.value))}
                            />
                          ) : (
                            formatCurrency(service.estimasiBiaya)
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {editingId === service.id ? (
                            <select 
                              className="px-2 py-1 border border-amber-300 rounded text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value as PaymentStatus)}
                            >
                              <option value="Belum Bayar">Belum Bayar</option>
                              <option value="DP">DP</option>
                              <option value="Lunas">Lunas</option>
                            </select>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                              service.statusPembayaran === 'Lunas' ? 'bg-emerald-100 text-emerald-700' : 
                              service.statusPembayaran === 'DP' ? 'bg-blue-100 text-blue-700' : 
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {service.statusPembayaran}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-gray-600 font-medium">
                          {editingId === service.id ? (
                            <select 
                              className="px-2 py-1 border border-amber-300 rounded text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                              value={editPic}
                              onChange={(e) => setEditPic(e.target.value)}
                            >
                              <option value="Rinaldi">Rinaldi</option>
                              <option value="Seruni">Seruni</option>
                              <option value="Mirna">Mirna</option>
                            </select>
                          ) : (
                            service.pic
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {editingId === service.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleSaveEdit(service.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                                title="Approve & Simpan Permanen"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs font-bold">Approve</span>
                              </button>
                              <button 
                                onClick={() => setEditingId(null)}
                                className="p-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                                title="Batal"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={() => handleEditClick(service)}
                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Edit Status"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteService(service.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus Layanan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => toggleExpandService(service.id)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Lihat Summary Paket"
                              >
                                {expandedServiceId === service.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {expandedServiceId === service.id && (
                        <tr className="bg-blue-50/50 border-b border-gray-200">
                          <td colSpan={15} className="px-6 py-4">
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
                              <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Summary Paket: {service.namaPaket}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <div className="text-xs text-gray-500">Total Pembelian Paket</div>
                                  <div className="font-bold text-gray-900">{formatCurrency(packageTotal)}</div>
                                </div>
                                <div className="space-y-2">
                                  <div className="text-xs text-gray-500">Total Sudah Dibayar</div>
                                  <div className="font-bold text-emerald-600">{formatCurrency(packagePaid)}</div>
                                </div>
                                <div className="space-y-2">
                                  <div className="text-xs text-gray-500">Sisa Pembayaran Keseluruhan</div>
                                  <div className="font-bold text-rose-600">{formatCurrency(sisaPembayaranKeseluruhan)}</div>
                                </div>
                              </div>
                              
                              <div className="mt-4 pt-4 border-t border-gray-100">
                                <h5 className="text-xs font-bold text-gray-700 mb-2">Detail Pembayaran Layanan Ini:</h5>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                  <div className="bg-gray-50 p-2 rounded">
                                    <div className="text-[10px] text-gray-500 mb-1">DP</div>
                                    <div className="font-medium text-sm">{service.dpAmount ? formatCurrency(service.dpAmount) : '-'}</div>
                                    <div className="text-[10px] text-gray-400 mt-1">{dpInfo.formattedDate}</div>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded">
                                    <div className="text-[10px] text-gray-500 mb-1">Payment 1</div>
                                    <div className="font-medium text-sm">{service.payment1 ? formatCurrency(service.payment1) : '-'}</div>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded">
                                    <div className="text-[10px] text-gray-500 mb-1">Payment 2</div>
                                    <div className="font-medium text-sm">{service.payment2 ? formatCurrency(service.payment2) : '-'}</div>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded">
                                    <div className="text-[10px] text-gray-500 mb-1">Payment 3</div>
                                    <div className="font-medium text-sm">{service.payment3 ? formatCurrency(service.payment3) : '-'}</div>
                                  </div>
                                  <div className="bg-purple-50 p-2 rounded border border-purple-100">
                                    <div className="text-[10px] text-purple-700 font-bold mb-1">Pelunasan</div>
                                    <div className="font-bold text-sm text-purple-900">{formatCurrency(pelunasanAmount)}</div>
                                    <div className="text-[10px] text-purple-600 mt-1">{pelunasanInfo.formattedDate}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="xl:hidden divide-y divide-gray-100">
              {filteredServices.map((service) => {
                const dpInfo = getDueDateInfo(service.tanggalKeberangkatan, service.reminderDPHMinus, service.statusPembayaran, true);
                const pelunasanInfo = getDueDateInfo(service.tanggalKeberangkatan, service.reminderPelunasanHMinus, service.statusPembayaran, false, service.isManualDate, service.manualPelunasanDate);
                const isEditing = editingId === service.id;

                const total = service.totalPembelian || 0;
                const paid = (service.dpAmount || 0) + (service.payment1 || 0) + (service.payment2 || 0) + (service.payment3 || 0);
                const pelunasanAmount = total - paid;
                
                const packageServices = services.filter(s => s.paketId === service.paketId);
                const packageTotal = packageServices.reduce((sum, s) => sum + (s.totalPembelian || 0), 0);
                const packagePaid = packageServices.reduce((sum, s) => sum + (s.dpAmount || 0) + (s.payment1 || 0) + (s.payment2 || 0) + (s.payment3 || 0), 0);
                const sisaPembayaranKeseluruhan = packageTotal - packagePaid;

                return (
                  <div key={service.id} className={`p-4 md:p-6 ${isEditing ? 'bg-amber-50/30' : 'bg-white'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900">{service.namaLayanan}</h3>
                        <p className="text-xs text-gray-500">{service.namaPaket}</p>
                      </div>
                      <div className="text-right">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleSaveEdit(service.id)}
                              className="p-2 bg-emerald-600 text-white rounded-lg"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setEditingId(null)}
                              className="p-2 bg-gray-200 text-gray-700 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleEditClick(service)}
                              className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteService(service.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => toggleExpandService(service.id)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              {expandedServiceId === service.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Vendor:</span>
                          <span className="font-medium text-gray-900">{service.vendor}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Jadwal:</span>
                          <span className="font-medium text-emerald-700">
                            {format(parseISO(service.tanggalKeberangkatan), 'dd MMM')} - {format(parseISO(service.tanggalKepulangan), 'dd MMM yyyy')}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">PIC:</span>
                          {isEditing ? (
                            <select 
                              className="px-2 py-1 border border-amber-300 rounded text-xs"
                              value={editPic}
                              onChange={(e) => setEditPic(e.target.value)}
                            >
                              <option value="Rinaldi">Rinaldi</option>
                              <option value="Seruni">Seruni</option>
                              <option value="Mirna">Mirna</option>
                            </select>
                          ) : (
                            <span className="font-medium text-gray-900">{service.pic}</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Estimasi Biaya:</span>
                          {isEditing ? (
                            <input 
                              type="number"
                              className="w-32 px-2 py-1 border border-amber-300 rounded text-xs text-right"
                              value={editBiaya}
                              onChange={(e) => setEditBiaya(Number(e.target.value))}
                            />
                          ) : (
                            <span className="font-bold text-gray-900">{formatCurrency(service.estimasiBiaya)}</span>
                          )}
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Status:</span>
                          {isEditing ? (
                            <select 
                              className="px-2 py-1 border border-amber-300 rounded text-xs font-bold"
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value as PaymentStatus)}
                            >
                              <option value="Belum Bayar">Belum Bayar</option>
                              <option value="DP">DP</option>
                              <option value="Lunas">Lunas</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              service.statusPembayaran === 'Lunas' ? 'bg-emerald-100 text-emerald-700' : 
                              service.statusPembayaran === 'DP' ? 'bg-blue-100 text-blue-700' : 
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {service.statusPembayaran}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Reminder DP</p>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${dpInfo.colorClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dpInfo.dotClass}`}></span>
                          {dpInfo.formattedDate}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Pembayaran Selanjutnya</p>
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                id={`manual-date-mobile-${service.id}`}
                                checked={editIsManualDate}
                                onChange={(e) => setEditIsManualDate(e.target.checked)}
                                className="rounded border-gray-300 text-amber-600"
                              />
                              <label htmlFor={`manual-date-mobile-${service.id}`} className="text-[10px] font-medium text-gray-700">Set Manual</label>
                            </div>
                            {editIsManualDate && (
                              <input 
                                type="date"
                                className="w-full px-2 py-1 border border-amber-300 rounded text-xs"
                                value={editManualDate}
                                onChange={(e) => setEditManualDate(e.target.value)}
                              />
                            )}
                          </div>
                        ) : (
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${pelunasanInfo.colorClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pelunasanInfo.dotClass}`}></span>
                            {pelunasanInfo.formattedDate}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* New Payment Fields */}
                    <div className="mt-4 pt-4 border-t border-gray-50 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Payment Per Items</p>
                          {isEditing ? (
                            <input 
                              type="text"
                              className="w-full px-2 py-1 border border-amber-300 rounded text-xs"
                              value={editPaymentPerItems}
                              onChange={(e) => setEditPaymentPerItems(e.target.value)}
                              placeholder="Payment per item..."
                            />
                          ) : (
                            <p className="text-xs font-medium text-gray-900">{service.paymentPerItems || '-'}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Total Pembelian</p>
                          {isEditing ? (
                            <input 
                              type="number"
                              className="w-full px-2 py-1 border border-amber-300 rounded text-xs"
                              value={editTotalPembelian}
                              onChange={(e) => setEditTotalPembelian(Number(e.target.value))}
                            />
                          ) : (
                            <p className="text-xs font-bold text-gray-900">{service.totalPembelian ? formatCurrency(service.totalPembelian) : '-'}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">DP</p>
                          {isEditing ? (
                            <input 
                              type="number"
                              className="w-full px-2 py-1 border border-amber-300 rounded text-xs"
                              value={editDpAmount}
                              onChange={(e) => setEditDpAmount(Number(e.target.value))}
                            />
                          ) : (
                            <p className="text-xs font-medium text-gray-900">{service.dpAmount ? formatCurrency(service.dpAmount) : '-'}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Payment 1</p>
                          {isEditing ? (
                            <input 
                              type="number"
                              className="w-full px-2 py-1 border border-amber-300 rounded text-xs"
                              value={editPayment1}
                              onChange={(e) => setEditPayment1(Number(e.target.value))}
                            />
                          ) : (
                            <p className="text-xs font-medium text-gray-900">{service.payment1 ? formatCurrency(service.payment1) : '-'}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Payment 2</p>
                          {isEditing ? (
                            <input 
                              type="number"
                              className="w-full px-2 py-1 border border-amber-300 rounded text-xs"
                              value={editPayment2}
                              onChange={(e) => setEditPayment2(Number(e.target.value))}
                            />
                          ) : (
                            <p className="text-xs font-medium text-gray-900">{service.payment2 ? formatCurrency(service.payment2) : '-'}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Payment 3</p>
                          {isEditing ? (
                            <input 
                              type="number"
                              className="w-full px-2 py-1 border border-amber-300 rounded text-xs"
                              value={editPayment3}
                              onChange={(e) => setEditPayment3(Number(e.target.value))}
                            />
                          ) : (
                            <p className="text-xs font-medium text-gray-900">{service.payment3 ? formatCurrency(service.payment3) : '-'}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-500 uppercase">Pelunasan</p>
                          <p className="text-xs font-bold text-gray-900">{formatCurrency(pelunasanAmount)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-500 uppercase">Sisa Pembayaran Pkt</p>
                          <p className="text-xs font-bold text-gray-900">{formatCurrency(sisaPembayaranKeseluruhan)}</p>
                        </div>
                      </div>
                    </div>

                    {expandedServiceId === service.id && (
                      <div className="mt-4 pt-4 border-t border-blue-100 bg-blue-50/50 -mx-4 md:-mx-6 px-4 md:px-6 pb-4">
                        <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2 text-sm">
                          <Package className="w-4 h-4" />
                          Summary Paket: {service.namaPaket}
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="bg-white p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                            <span className="text-xs text-gray-500">Total Pembelian Paket</span>
                            <span className="font-bold text-gray-900">{formatCurrency(packageTotal)}</span>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                            <span className="text-xs text-gray-500">Total Sudah Dibayar</span>
                            <span className="font-bold text-emerald-600">{formatCurrency(packagePaid)}</span>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                            <span className="text-xs text-gray-500">Sisa Pembayaran Keseluruhan</span>
                            <span className="font-bold text-rose-600">{formatCurrency(sisaPembayaranKeseluruhan)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add Manual Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Tambah Paket & Layanan Manual</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nama Paket</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={newService.namaPaket}
                    onChange={(e) => setNewService({...newService, namaPaket: e.target.value})}
                    placeholder="Contoh: UMRAH REGULER"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nama Layanan</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={newService.namaLayanan}
                    onChange={(e) => setNewService({...newService, namaLayanan: e.target.value})}
                    placeholder="Contoh: Maskapai"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Vendor</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={newService.vendor}
                    onChange={(e) => setNewService({...newService, vendor: e.target.value})}
                    placeholder="Contoh: Lion Air"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Estimasi Biaya (Rp)</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={newService.estimasiBiaya}
                    onChange={(e) => setNewService({...newService, estimasiBiaya: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Keberangkatan (CI)</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={newService.tanggalKeberangkatan}
                    onChange={(e) => setNewService({...newService, tanggalKeberangkatan: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Kepulangan (CO)</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={newService.tanggalKepulangan}
                    onChange={(e) => setNewService({...newService, tanggalKepulangan: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Reminder DP (H-)</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={newService.reminderDPHMinus}
                    onChange={(e) => setNewService({...newService, reminderDPHMinus: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">PIC</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={newService.pic}
                    onChange={(e) => setNewService({...newService, pic: e.target.value})}
                  >
                    <option value="Rinaldi">Rinaldi</option>
                    <option value="Seruni">Seruni</option>
                    <option value="Mirna">Mirna</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Catatan</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={newService.catatan}
                    onChange={(e) => setNewService({...newService, catatan: e.target.value})}
                    placeholder="Catatan tambahan..."
                  />
                </div>
                
                <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-3">Detail Pembayaran</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Payment Per Items</label>
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        value={newService.paymentPerItems}
                        onChange={(e) => setNewService({...newService, paymentPerItems: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">DP Amount</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        value={newService.dpAmount}
                        onChange={(e) => setNewService({...newService, dpAmount: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Payment 1</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        value={newService.payment1}
                        onChange={(e) => setNewService({...newService, payment1: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Payment 2</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        value={newService.payment2}
                        onChange={(e) => setNewService({...newService, payment2: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Payment 3</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        value={newService.payment3}
                        onChange={(e) => setNewService({...newService, payment3: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Total Pembelian</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        value={newService.totalPembelian}
                        onChange={(e) => setNewService({...newService, totalPembelian: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-3">Pengaturan Pembayaran Selanjutnya</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        id="auto-date"
                        name="date-type"
                        checked={!newService.isManualDate}
                        onChange={() => setNewService({...newService, isManualDate: false})}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <label htmlFor="auto-date" className="text-sm text-gray-700">Otomatis (Berdasarkan H-)</label>
                    </div>
                    {!newService.isManualDate && (
                      <div className="ml-6">
                        <label className="block text-xs text-gray-500 mb-1">H- Keberangkatan</label>
                        <input 
                          type="number" 
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          value={newService.reminderPelunasanHMinus}
                          onChange={(e) => setNewService({...newService, reminderPelunasanHMinus: Number(e.target.value)})}
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2">
                      <input 
                        type="radio" 
                        id="manual-date"
                        name="date-type"
                        checked={newService.isManualDate}
                        onChange={() => setNewService({...newService, isManualDate: true})}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <label htmlFor="manual-date" className="text-sm text-gray-700">Manual (Pilih Tanggal)</label>
                    </div>
                    {newService.isManualDate && (
                      <div className="ml-6">
                        <label className="block text-xs text-gray-500 mb-1">Tanggal Pembayaran</label>
                        <input 
                          type="date" 
                          className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          value={newService.manualPelunasanDate || ''}
                          onChange={(e) => setNewService({...newService, manualPelunasanDate: e.target.value})}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleAddService}
                className="px-4 py-2 text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 rounded-lg transition-colors"
              >
                Simpan Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

