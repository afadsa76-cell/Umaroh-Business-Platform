import React, { useState, useEffect, useMemo } from 'react';
import { getTransactions, deleteTransaction, updateTransaction } from '../data/transactions';
import { Transaction } from '../types/transaction';
import { formatCurrency, formatPercent } from '../utils/format';
import { Trash2, TrendingUp, DollarSign, PieChart, Edit2, X, Save, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { db, collection, onSnapshot } from '../firebase';

interface MitraTracker {
  id: string;
  nama_mitra?: string;
  nama_brand?: string;
  pic?: string;
  paket_umroh?: string;
  jumlah_seat?: number;
  total_tagihan?: number;
  total_bayar?: number;
  sisa_tagihan?: number;
  status_pembayaran?: string;
  tanggal_berangkat?: string;
}

interface CostComponent {
  id: string;
  nama_komponen?: string;
  kategori_komponen?: string;
  vendor_id?: string;
  package_id?: string;
  total_biaya?: number;
  total_bayar?: number;
  qty?: number;
  status_pembayaran?: string;
}

interface ConsolidatedPackage {
  packageName: string;
  departureDate: string;
  totalSeats: number;
  totalInflowExpected: number;
  totalInflowReceived: number;
  totalInflowPending: number;
  totalCostBudgeted: number;
  totalCostPaid: number;
  totalCostPending: number;
  mitrasList: MitraTracker[];
  componentsList: CostComponent[];
}

interface UnifiedRevenueInfo {
  id: string;
  namaPaket: string;
  namaTravel?: string;
  catatan?: string;
  tglKeberangkatan?: string;
  jumlahPax: number;
  totalOmzet: number;
  totalHpp: number;
  biayaTambahan?: number;
  totalProfit: number;
  marginPercent: number;
  totalInflowReceived: number;
  totalCostPaid: number;
  mitrasList: MitraTracker[];
  componentsList: CostComponent[];
  date?: string;
}

export const RevenueReport: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Real-time synced tracker assets
  const [mitras, setMitras] = useState<MitraTracker[]>([]);
  const [components, setComponents] = useState<CostComponent[]>([]);
  const [dataSource, setDataSource] = useState<'tracker' | 'manual'>('tracker');
  const [selectedPackForDetails, setSelectedPackForDetails] = useState<UnifiedRevenueInfo | null>(null);

  // Form state for editing (manual only)
  const [editPax, setEditPax] = useState<number>(0);
  const [editOmzet, setEditOmzet] = useState<number>(0);
  const [editHpp, setEditHpp] = useState<number>(0);
  const [editBiayaTambahan, setEditBiayaTambahan] = useState<number>(0);
  const [editCatatan, setEditCatatan] = useState<string>('');

  useEffect(() => {
    setTransactions(getTransactions());

    // Subscribe to Mitra Tracker (Real-time)
    const unsubMitra = onSnapshot(collection(db, 'mitra_tracker'), (snapshot) => {
      setMitras(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error subscribing to mitra_tracker:", error);
    });

    // Subscribe to Cost Components (Real-time)
    const unsubComp = onSnapshot(collection(db, 'package_cost_components'), (snapshot) => {
      setComponents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error subscribing to package_cost_components:", error);
    });

    return () => {
      unsubMitra();
      unsubComp();
    };
  }, []);

  // Consolidation algorithm from Mitra Tracker & Vendor Tracker
  const consolidatedPackages: UnifiedRevenueInfo[] = useMemo(() => {
    const packagesMap = new Map<string, ConsolidatedPackage>();

    // 1. Process Mitra entries (Inflows/Funding)
    mitras.forEach(m => {
      const pkgName = m.paket_umroh || 'Umum - Tanpa Paket';
      if (!packagesMap.has(pkgName)) {
        packagesMap.set(pkgName, {
          packageName: pkgName,
          departureDate: m.tanggal_berangkat || '',
          totalSeats: 0,
          totalInflowExpected: 0,
          totalInflowReceived: 0,
          totalInflowPending: 0,
          totalCostBudgeted: 0,
          totalCostPaid: 0,
          totalCostPending: 0,
          mitrasList: [],
          componentsList: []
        });
      }

      const pObj = packagesMap.get(pkgName)!;
      pObj.totalSeats += m.jumlah_seat || 0;
      pObj.totalInflowExpected += m.total_tagihan || 0;
      pObj.totalInflowReceived += m.total_bayar || 0;
      pObj.totalInflowPending += m.sisa_tagihan || 0;
      pObj.mitrasList.push(m);
      if (m.tanggal_berangkat && !pObj.departureDate) {
        pObj.departureDate = m.tanggal_berangkat;
      }
    });

    // 2. Process Cost Components (Outflows/Vendor Costs)
    components.forEach(c => {
      const pkgName = c.package_id || 'Umum - Tanpa Paket';
      if (!packagesMap.has(pkgName)) {
        packagesMap.set(pkgName, {
          packageName: pkgName,
          departureDate: '',
          totalSeats: 0,
          totalInflowExpected: 0,
          totalInflowReceived: 0,
          totalInflowPending: 0,
          totalCostBudgeted: 0,
          totalCostPaid: 0,
          totalCostPending: 0,
          mitrasList: [],
          componentsList: []
        });
      }

      const pObj = packagesMap.get(pkgName)!;
      pObj.totalCostBudgeted += c.total_biaya || 0;
      pObj.totalCostPaid += c.total_bayar || 0;
      pObj.totalCostPending += (c.total_biaya || 0) - (c.total_bayar || 0);
      pObj.componentsList.push(c);
    });

    return Array.from(packagesMap.values()).map(p => {
      const budgetedProfit = p.totalInflowExpected - p.totalCostBudgeted;
      const margin = p.totalInflowExpected > 0 ? budgetedProfit / p.totalInflowExpected : 0;
      return {
        id: p.packageName,
        namaPaket: p.packageName,
        tglKeberangkatan: p.departureDate || 'Belum Ditentukan',
        jumlahPax: p.totalSeats,
        totalOmzet: p.totalInflowExpected,
        totalHpp: p.totalCostBudgeted,
        biayaTambahan: 0,
        totalProfit: budgetedProfit,
        marginPercent: margin,
        totalInflowReceived: p.totalInflowReceived,
        totalCostPaid: p.totalCostPaid,
        mitrasList: p.mitrasList,
        componentsList: p.componentsList,
        catatan: 'Disinkronkan otomatis dari Tracker Mitra & Vendor'
      };
    });
  }, [mitras, components]);

  const activeTransactions: UnifiedRevenueInfo[] = useMemo(() => {
    if (dataSource === 'tracker') {
      return consolidatedPackages;
    }
    return transactions.map(t => ({
      id: t.id,
      namaPaket: t.namaPaket,
      tglKeberangkatan: t.tglKeberangkatan,
      jumlahPax: t.jumlahPax,
      totalOmzet: t.totalOmzet,
      totalHpp: t.totalHpp,
      biayaTambahan: t.biayaTambahan || 0,
      totalProfit: t.totalProfit,
      marginPercent: t.totalOmzet > 0 ? t.totalProfit / t.totalOmzet : 0,
      totalInflowReceived: t.totalOmzet,
      totalCostPaid: t.totalHpp,
      mitrasList: [],
      componentsList: [],
      catatan: t.catatan || '',
      date: t.date,
      namaTravel: t.namaTravel
    }));
  }, [dataSource, consolidatedPackages, transactions]);

  const handleDelete = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
      deleteTransaction(id);
      setTransactions(getTransactions());
    }
  };

  const handleEditClick = (t: Transaction) => {
    setEditingTransaction(t);
    setEditPax(t.jumlahPax);
    setEditOmzet(t.totalOmzet);
    setEditHpp(t.totalHpp);
    setEditBiayaTambahan(t.biayaTambahan || 0);
    setEditCatatan(t.catatan || '');
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
  };

  const handleSaveEdit = () => {
    if (editingTransaction) {
      const updated: Transaction = {
        ...editingTransaction,
        jumlahPax: editPax,
        totalOmzet: editOmzet,
        totalHpp: editHpp,
        biayaTambahan: editBiayaTambahan,
        catatan: editCatatan,
        totalProfit: editOmzet - editHpp - editBiayaTambahan
      };
      updateTransaction(updated);
      setTransactions(getTransactions());
      setEditingTransaction(null);
    }
  };

  const totalOmzet = activeTransactions.reduce((sum, t) => sum + t.totalOmzet, 0);
  const totalHpp = activeTransactions.reduce((sum, t) => sum + t.totalHpp, 0);
  const totalProfit = activeTransactions.reduce((sum, t) => sum + t.totalProfit, 0);
  const averageMargin = totalOmzet > 0 ? totalProfit / totalOmzet : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Laporan Pendapatan (Laba/Rugi)</h2>
          <p className="text-xs text-gray-500 mt-1">Laporan finansial konsolidasi omzet, HPP, margin kotor, dan laba bersih perusahaan.</p>
        </div>
        
        {/* Toggle Data Source */}
        <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200">
          <button
            onClick={() => setDataSource('tracker')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              dataSource === 'tracker'
                ? 'bg-white text-emerald-800 shadow-sm font-extrabold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Synced Tracker Mitra & Vendor
          </button>
          <button
            onClick={() => setDataSource('manual')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              dataSource === 'manual'
                ? 'bg-white text-indigo-700 shadow-sm font-extrabold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Manual / Sales Order
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Omzet</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalOmzet)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total HPP (Modal)</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalHpp)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Laba Bersih</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalProfit)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Rata-rata Margin</p>
              <p className="text-xl font-bold text-gray-900">{formatPercent(averageMargin)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">
            {dataSource === 'tracker' ? 'Laporan Laba/Rugi per Paket Acuan' : 'Riwayat Transaksi Manual'}
          </h3>
          {dataSource === 'tracker' ? (
            <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Sinkronisasi Otomatis Aktif
            </span>
          ) : (
            <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              Offline Cache
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-100 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Sumber / Tanggal</th>
                <th className="px-4 py-3">Nama Paket</th>
                <th className="px-4 py-3">Keberangkatan</th>
                <th className="px-4 py-3 text-center">Pax</th>
                <th className="px-4 py-3 text-right">Omzet</th>
                <th className="px-4 py-3 text-right">HPP</th>
                <th className="px-4 py-3 text-right">Biaya Tambahan</th>
                <th className="px-4 py-3 text-right">Laba Bersih</th>
                <th className="px-4 py-3 text-center">Margin</th>
                <th className="px-4 py-3 text-center">Aksi / Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {activeTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    Belum ada data transaksi yang tersinkronisasi atau disimpan.
                  </td>
                </tr>
              ) : (
                activeTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-500">
                      {dataSource === 'tracker' ? (
                        <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          TRACKER
                        </span>
                      ) : (
                        t.date ? format(new Date(t.date), 'dd MMM yyyy', { locale: id }) : '-'
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-950 uppercase">
                      {t.namaPaket || '-'}
                      {t.namaTravel && <span className="block text-[10px] font-normal text-gray-500">{t.namaTravel}</span>}
                      {t.catatan && <span className="block text-[10px] font-medium text-amber-700 mt-1 bg-amber-50 px-1.5 py-0.5 rounded inline-block">Mata Rantai: {t.catatan}</span>}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">{t.tglKeberangkatan}</td>
                    <td className="px-4 py-3 text-center font-bold text-indigo-800">{t.jumlahPax}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-bold">{formatCurrency(t.totalOmzet)}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold">{formatCurrency(t.totalHpp)}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(t.biayaTambahan || 0)}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-black">{formatCurrency(t.totalProfit)}</td>
                    <td className="px-4 py-3 text-center font-bold">
                      {formatPercent(t.marginPercent)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {dataSource === 'tracker' ? (
                        <button
                          onClick={() => setSelectedPackForDetails(t)}
                          className="flex items-center gap-1.5 mx-auto bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          Breakdown
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(t as unknown as Transaction)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Transaksi"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tracker Details Modal */}
      {selectedPackForDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-gray-105 bg-slate-50 rounded-t-2xl">
              <div>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 font-black uppercase text-[10px] px-2 py-0.5 rounded-md">
                  Rincian Penjurnalan Konsolidasi
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-1 uppercase">
                  {selectedPackForDetails.namaPaket}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedPackForDetails(null)} 
                className="text-gray-400 hover:text-gray-650 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
                <div>
                  <p className="text-gray-550 font-medium">Omzet Penjualan (Mitra)</p>
                  <p className="text-base font-black text-emerald-700">{formatCurrency(selectedPackForDetails.totalOmzet)}</p>
                </div>
                <div>
                  <p className="text-gray-550 font-medium">HPP Biaya Layanan (Vendor)</p>
                  <p className="text-base font-black text-red-700">{formatCurrency(selectedPackForDetails.totalHpp)}</p>
                </div>
                <div>
                  <p className="text-gray-550 font-medium">Proyeksi Laba Bersih</p>
                  <p className="text-base font-black text-green-700">{formatCurrency(selectedPackForDetails.totalProfit)}</p>
                </div>
                <div>
                  <p className="text-gray-550 font-medium">Kadar Margin Usaha</p>
                  <p className="text-base font-black text-indigo-700">{formatPercent(selectedPackForDetails.marginPercent)}</p>
                </div>
              </div>

              {/* Inflow Mitra details */}
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 text-xs flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Sisi Pendanaan & Tagihan Mitra (Inbound Cashflow)
                </h4>
                <div className="border border-gray-150 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-150 text-[10px] uppercase">
                      <tr>
                        <th className="p-3">Nama Mitra / Broker</th>
                        <th className="p-3 text-center">Seat Booking</th>
                        <th className="p-3 text-right">Total Tagihan</th>
                        <th className="p-3 text-right">Pembayaran Disetor</th>
                        <th className="p-3 text-right">Sisa Piutang</th>
                        <th className="p-3 text-center">Status Pembayaran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedPackForDetails.mitrasList.map((m, i) => (
                        <tr key={m.id || i} className="hover:bg-gray-50">
                          <td className="p-3">
                            <p className="font-bold text-gray-900">{m.nama_mitra}</p>
                            <p className="text-[10px] text-gray-500">{m.nama_brand} (PIC: {m.pic || '-'})</p>
                          </td>
                          <td className="p-3 text-center font-bold text-indigo-655">{m.jumlah_seat || 0} Pax</td>
                          <td className="p-3 text-right font-medium text-gray-900">{formatCurrency(m.total_tagihan || 0)}</td>
                          <td className="p-3 text-right text-emerald-600 font-medium">{formatCurrency(m.total_bayar || 0)}</td>
                          <td className="p-3 text-right font-bold text-rose-600">{formatCurrency((m.total_tagihan || 0) - (m.total_bayar || 0))}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.status_pembayaran === 'Lunas' ? 'bg-emerald-100 text-emerald-800' :
                              m.status_pembayaran === 'DP' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {m.status_pembayaran || 'Belum Bayar'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {selectedPackForDetails.mitrasList.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-gray-450 bg-gray-50/50">Belum ada mitra tracker yang mendaftar ke paket ini.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Vendor components details */}
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 text-xs flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  Sisi Komponen Biaya Vendor (Outbound Cashflow & HPP)
                </h4>
                <div className="border border-gray-150 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-150 text-[10px] uppercase">
                      <tr>
                        <th className="p-3">Nama Pengadaan</th>
                        <th className="p-3">Kategori</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3 text-right">Total Anggaran</th>
                        <th className="p-3 text-right">Telah Dibayar</th>
                        <th className="p-3 text-right">Utang Vendor</th>
                        <th className="p-3 text-center">Status Pembayaran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedPackForDetails.componentsList.map((c, i) => (
                        <tr key={c.id || i} className="hover:bg-gray-50">
                          <td className="p-3">
                            <p className="font-bold text-gray-900 uppercase">{c.nama_komponen}</p>
                            <p className="text-[10px] text-gray-500">Vendor: {c.vendor_id || '-'}</p>
                          </td>
                          <td className="p-3 text-indigo-700 font-medium">{c.kategori_komponen || 'Aksesoris'}</td>
                          <td className="p-3 text-right">{c.qty || 1}</td>
                          <td className="p-3 text-right font-medium text-gray-900">{formatCurrency(c.total_biaya || 0)}</td>
                          <td className="p-3 text-right text-emerald-600 font-medium">{formatCurrency(c.total_bayar || 0)}</td>
                          <td className="p-3 text-right font-bold text-rose-600">{formatCurrency((c.total_biaya || 0) - (c.total_bayar || 0))}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.status_pembayaran === 'Lunas' ? 'bg-emerald-100 text-emerald-800' :
                              c.status_pembayaran === 'DP' || c.status_pembayaran === 'Cicilan' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {c.status_pembayaran || 'Belum Bayar'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {selectedPackForDetails.componentsList.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-gray-450 bg-gray-50/50">Belum ada pengeluaran vendor untuk paket ini.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-105 bg-slate-50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setSelectedPackForDetails(null)}
                className="px-5 py-2 hover:bg-gray-250 bg-gray-200 text-gray-800 rounded-xl font-bold transition-colors"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (Manual Mode Only) */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">Edit Transaksi</h3>
              <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg mb-6 text-xs">
                <p className="text-sm text-blue-800 font-medium">Paket: {editingTransaction.namaPaket}</p>
                <p className="text-xs text-blue-600">Keberangkatan: {editingTransaction.tglKeberangkatan}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pax Aktual</label>
                  <input
                    type="number"
                    value={editPax}
                    onChange={(e) => setEditPax(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Omzet Aktual (Rp)</label>
                  <input
                    type="number"
                    value={editOmzet}
                    onChange={(e) => setEditOmzet(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total HPP Aktual (Rp)</label>
                  <input
                    type="number"
                    value={editHpp}
                    onChange={(e) => setEditHpp(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biaya Tambahan / Tak Terduga (Rp)</label>
                  <input
                    type="number"
                    value={editBiayaTambahan}
                    onChange={(e) => setEditBiayaTambahan(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan / Alasan Perubahan</label>
                <textarea
                  value={editCatatan}
                  onChange={(e) => setEditCatatan(e.target.value)}
                  placeholder="Misal: Ada penambahan biaya denda bagasi, jamaah batal 1 orang, dll."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 h-24 text-xs"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mt-6">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-650 font-medium">Laba Bersih Setelah Perubahan:</span>
                  <span className="text-base font-bold text-green-600">
                    {formatCurrency(editOmzet - editHpp - editBiayaTambahan)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl text-xs">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                <Save className="w-4 h-4" />
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
