import React, { useState, useEffect, useMemo } from 'react';
import { 
  Landmark, Handshake, Layers, AlertTriangle, 
  Search, Download, Printer, ChevronDown, ChevronUp, 
  Info, CheckCircle2, AlertCircle, Calendar, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { db, collection, onSnapshot, handleFirestoreError, OperationType } from '../../firebase';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Re-using local interfaces
interface MitraTracker {
  id: string;
  nama_mitra: string;
  nama_brand: string;
  jumlah_seat: number;
  paket_umroh: string;
  tanggal_berangkat: string;
  total_tagihan: number;
  dp: number;
  term1: number;
  term2: number;
  pelunasan: number;
  total_bayar: number;
  sisa_tagihan: number;
  persentase_bayar: number;
  status_pembayaran: string;
  status_risiko: string;
  pic?: string;
}

interface CostComponent {
  id: string;
  nama_komponen: string;
  kategori_komponen: string;
  vendor_id: string;
  package_id: string;
  qty: number;
  harga_satuan: number;
  total_biaya: number;
  dp: number;
  termin_1: number;
  termin_2: number;
  pelunasan: number;
  total_bayar: number;
  sisa_tagihan: number;
  persentase_bayar: number;
  status_pembayaran: string;
  status_risiko: string;
  status_operasional: string;
}

interface ConsolidatedPackage {
  packageName: string;
  departureDate: string;
  
  // Client/Mitra side
  totalSeats: number;
  totalInflowExpected: number;
  totalInflowReceived: number;
  totalInflowPending: number;
  mitras: MitraTracker[];
  
  // Vendor/Cost side
  totalCostBudgeted: number;
  totalCostPaid: number;
  totalCostPending: number;
  components: CostComponent[];
  
  // Derived
  budgetedProfit: number;
  budgetedMarginPercent: number;
  cashflowDifference: number; // Inflow - Outflow (surplus/deficit)
  isOperationalOverspending: boolean;
  statusRisiko: 'Aman' | 'Waspada' | 'Kritikal';
}

export const CumulativeFinanceReport: React.FC = () => {
  const [mitras, setMitras] = useState<MitraTracker[]>([]);
  const [components, setComponents] = useState<CostComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPackages, setExpandedPackages] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'profitable' | 'at-risk' | 'deficit'>('all');

  // Load datasets in real-time
  useEffect(() => {
    setLoading(true);
    
    const unsubMitra = onSnapshot(
      collection(db, 'mitra_tracker'), 
      (snap) => {
        const uItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MitraTracker));
        setMitras(uItems);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'mitra_tracker');
      }
    );

    const unsubComp = onSnapshot(
      collection(db, 'package_cost_components'), 
      (snap) => {
        const cItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CostComponent));
        setComponents(cItems);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'package_cost_components');
      }
    );

    const timer = setTimeout(() => {
      setLoading(false);
    }, 850);

    return () => {
      unsubMitra();
      unsubComp();
      clearTimeout(timer);
    };
  }, []);

  // Consolidation Logic
  const consolidatedData = useMemo(() => {
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
          mitras: [],
          totalCostBudgeted: 0,
          totalCostPaid: 0,
          totalCostPending: 0,
          components: [],
          budgetedProfit: 0,
          budgetedMarginPercent: 0,
          cashflowDifference: 0,
          isOperationalOverspending: false,
          statusRisiko: 'Aman'
        });
      }

      const pObj = packagesMap.get(pkgName)!;
      pObj.totalSeats += m.jumlah_seat || 0;
      pObj.totalInflowExpected += m.total_tagihan || 0;
      pObj.totalInflowReceived += m.total_bayar || 0;
      pObj.totalInflowPending += m.sisa_tagihan || 0;
      pObj.mitras.push(m);
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
          mitras: [],
          totalCostBudgeted: 0,
          totalCostPaid: 0,
          totalCostPending: 0,
          components: [],
          budgetedProfit: 0,
          budgetedMarginPercent: 0,
          cashflowDifference: 0,
          isOperationalOverspending: false,
          statusRisiko: 'Aman'
        });
      }

      const pObj = packagesMap.get(pkgName)!;
      pObj.totalCostBudgeted += c.total_biaya || 0;
      pObj.totalCostPaid += c.total_bayar || 0;
      pObj.totalCostPending += c.sisa_tagihan || 0;
      pObj.components.push(c);
    });

    // 3. Post-process Derived figures
    const list = Array.from(packagesMap.values());
    list.forEach(p => {
      p.budgetedProfit = p.totalInflowExpected - p.totalCostBudgeted;
      p.budgetedMarginPercent = p.totalInflowExpected > 0 
        ? (p.budgetedProfit / p.totalInflowExpected) * 100 
        : 0;
      p.cashflowDifference = p.totalInflowReceived - p.totalCostPaid;
      
      // Determine risks
      p.isOperationalOverspending = p.totalInflowReceived < p.totalCostPaid;
      
      const hasCriticalMitra = p.mitras.some(m => m.status_risiko === 'Kritikal' || m.status_risiko === 'Risiko Tinggi');
      const hasWaspadaMitra = p.mitras.some(m => m.status_risiko === 'Waspada' || m.status_risiko === 'Kuning');
      const hasOverspending = p.isOperationalOverspending;
      
      if (hasCriticalMitra || (p.totalCostPending > 0 && p.totalInflowPending > p.totalInflowExpected * 0.4)) {
        p.statusRisiko = 'Kritikal';
      } else if (hasWaspadaMitra || hasOverspending || p.totalInflowPending > 0) {
        p.statusRisiko = 'Waspada';
      } else {
        p.statusRisiko = 'Aman';
      }
    });

    // Sort by departure date descending, push empty dates to bottom
    return list.sort((a, b) => {
      if (!a.departureDate) return 1;
      if (!b.departureDate) return -1;
      return new Date(b.departureDate).getTime() - new Date(a.departureDate).getTime();
    });
  }, [mitras, components]);

  // Total Global Accounting Metrics
  const globalMetrics = useMemo(() => {
    let expectedInflow = 0;
    let actualInflow = 0;
    let pendingInflow = 0;
    let seats = 0;

    let budgetedOutflow = 0;
    let actualOutflow = 0;
    let pendingOutflow = 0;

    consolidatedData.forEach(p => {
      expectedInflow += p.totalInflowExpected;
      actualInflow += p.totalInflowReceived;
      pendingInflow += p.totalInflowPending;
      seats += p.totalSeats;

      budgetedOutflow += p.totalCostBudgeted;
      actualOutflow += p.totalCostPaid;
      pendingOutflow += p.totalCostPending;
    });

    const netProfitTarget = expectedInflow - budgetedOutflow;
    const netProfitRealized = actualInflow - actualOutflow;
    const currentLiquidityFactor = expectedInflow > 0 ? (actualInflow / expectedInflow) * 100 : 0;
    const vendorPayProgress = budgetedOutflow > 0 ? (actualOutflow / budgetedOutflow) * 100 : 0;

    return {
      expectedInflow,
      actualInflow,
      pendingInflow,
      seats,
      budgetedOutflow,
      actualOutflow,
      pendingOutflow,
      netProfitTarget,
      netProfitRealized,
      currentLiquidityFactor,
      vendorPayProgress
    };
  }, [consolidatedData]);

  // Cost component category statistics for Doughnut representation
  const costCategoryChartData = useMemo(() => {
    const stats: Record<string, number> = {};
    components.forEach(c => {
      const cat = c.kategori_komponen || 'Custom Component';
      stats[cat] = (stats[cat] || 0) + (c.total_biaya || 0);
    });

    const total = Object.values(stats).reduce((a, b) => a + b, 0);

    return Object.entries(stats)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [components]);

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return consolidatedData.filter(p => {
      // 1. Search Query Match
      const matchesSearch = p.packageName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.departureDate.includes(searchQuery);
      
      if (!matchesSearch) return false;

      // 2. Sub Tab Filters
      if (activeTab === 'profitable') return p.budgetedProfit > 0;
      if (activeTab === 'at-risk') return p.statusRisiko === 'Kritikal' || p.statusRisiko === 'Waspada';
      if (activeTab === 'deficit') return p.cashflowDifference < 0;

      return true;
    });
  }, [consolidatedData, searchQuery, activeTab]);

  const togglePackageExpand = (pkgName: string) => {
    setExpandedPackages(prev => ({
      ...prev,
      [pkgName]: !prev[pkgName]
    }));
  };

  const handleExpandAll = () => {
    const nextStates: Record<string, boolean> = {};
    filteredPackages.forEach(p => {
      nextStates[p.packageName] = true;
    });
    setExpandedPackages(nextStates);
  };

  const handleCollapseAll = () => {
    setExpandedPackages({});
  };

  // Format currency in IDR
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Export Consolidated Report to Excel
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: General Consolidated Summary
    const summaryData = filteredPackages.map((p, idx) => ({
      'No': idx + 1,
      'Nama Paket': p.packageName,
      'Tanggal Keberangkatan': p.departureDate || 'Belum Ditentukan',
      'Seat Terjual': p.totalSeats,
      'Total Target Mitra (Inflow)': p.totalInflowExpected,
      'Mitra Terbayar (Cash-In)': p.totalInflowReceived,
      'Sisa Piutang Mitra': p.totalInflowPending,
      'Total Biaya Vendor (Outflow)': p.totalCostBudgeted,
      'Vendor Terbayar (Cash-Out)': p.totalCostPaid,
      'Sisa Hutang Vendor': p.totalCostPending,
      'Laba Proyeksi (Budgeted)': p.budgetedProfit,
      'Margin Proyeksi (%)': p.budgetedMarginPercent.toFixed(1) + '%',
      'Net Arus Kas Aktual': p.cashflowDifference,
      'Arus Kas Sehat': p.cashflowDifference >= 0 ? 'Surplus' : 'Defisit (Bahaya)',
      'Status Risiko': p.statusRisiko
    }));

    const worksheetSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, worksheetSummary, 'Konsolidasi Paket');

    // Add Mitra specific records
    const mitraExportData: Record<string, unknown>[] = [];
    filteredPackages.forEach(p => {
      p.mitras.forEach(m => {
        mitraExportData.push({
          'Paket Umroh': p.packageName,
          'Nama Mitra/Keagenan': m.nama_mitra,
          'Brand': m.nama_brand,
          'PIC': m.pic,
          'Seat': m.jumlah_seat,
          'Total Tagihan': m.total_tagihan,
          'Total Bayar': m.total_bayar,
          'Sisa Tagihan': m.sisa_tagihan,
          'Progress Pembayaran': m.persentase_bayar + '%',
          'Status': m.status_pembayaran,
          'Risiko': m.status_risiko
        });
      });
    });
    const worksheetMitras = XLSX.utils.json_to_sheet(mitraExportData);
    XLSX.utils.book_append_sheet(workbook, worksheetMitras, 'Rincian Mitra');

    // Add Vendor Cost Components records
    const costExportData: Record<string, unknown>[] = [];
    filteredPackages.forEach(p => {
      p.components.forEach(c => {
        costExportData.push({
          'Paket Umroh': p.packageName,
          'Nama Komponen': c.nama_komponen,
          'Kategori': c.kategori_komponen,
          'Vendor ID': c.vendor_id,
          'Jumlah Qty': c.qty,
          'Total Biaya': c.total_biaya,
          'DP': c.dp,
          'Termin 1': c.termin_1,
          'Termin 2': c.termin_2,
          'Pelunasan': c.pelunasan,
          'Total Terbayar': c.total_bayar,
          'Sisa Hutang': c.sisa_tagihan,
          'Status Pembayaran': c.status_pembayaran,
          'Status Operasional': c.status_operasional
        });
      });
    });
    const worksheetCosts = XLSX.utils.json_to_sheet(costExportData);
    XLSX.utils.book_append_sheet(workbook, worksheetCosts, 'Komponen Biaya Vendor');

    XLSX.writeFile(workbook, `Laporan_Konsolidasi_Umaroh_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export Combined / Consolidated PDF Report with Section Dividers
  const exportConsolidatedPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const today = new Date().toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // 1. Document Title & Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(29, 78, 216); // Royal Blue
    doc.text("PT NAWAITUL UMRAH HAJI", 14, 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Laporan Konsolidasi & Kumulatif Komparasi Pendanaan Mitra vs Biaya Vendor", 14, 26);
    doc.setFontSize(9);
    doc.text(`Waktu Cetak: ${today} | Oleh: Pihak Manajemen Keuangan`, 14, 31);

    // 2. Executive Quick Metrics Row
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(14, 35, 269, 25, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55, 65, 81);
    doc.text("RINGKASAN EKSEKUTIF KEUANGAN KONSOLIDASI (PT NAWAITUL UMRAH HAJI)", 18, 41);

    // Grid columns inside drawing
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Total Proyeksi Pendanaan Mitra:", 18, 47);
    doc.setFont("helvetica", "bold");
    doc.text(formatIDR(globalMetrics.expectedInflow), 18, 51);

    doc.setFont("helvetica", "normal");
    doc.text("Total Realisasi Cash-In Mitra:", 75, 47);
    doc.setFont("helvetica", "bold");
    doc.text(`${formatIDR(globalMetrics.actualInflow)} (${globalMetrics.currentLiquidityFactor.toFixed(1)}%)`, 75, 51);

    doc.setFont("helvetica", "normal");
    doc.text("Total Proyeksi Biaya Vendor:", 135, 47);
    doc.setFont("helvetica", "bold");
    doc.text(formatIDR(globalMetrics.budgetedOutflow), 135, 51);

    doc.setFont("helvetica", "normal");
    doc.text("Total Terbayar ke Vendor (Cash-Out):", 195, 47);
    doc.setFont("helvetica", "bold");
    doc.text(`${formatIDR(globalMetrics.actualOutflow)} (${globalMetrics.vendorPayProgress.toFixed(1)}%)`, 195, 51);

    doc.setFont("helvetica", "normal");
    doc.text("Laba Kotor Proyeksi:", 250, 47);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74);
    doc.text(formatIDR(globalMetrics.netProfitTarget), 250, 51);

    // Reset text color for table
    doc.setTextColor(0);

    // 3. Consolidated Table with Divider row
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableBody: any[] = [];
    let pNum = 1;
    filteredPackages.forEach((p, index) => {
      const showDivider = index > 0 && (filteredPackages[index - 1].totalInflowExpected > 0 && p.totalInflowExpected === 0);
      if (showDivider) {
        // Add a clean solid colored divider row across columns using cell content with colSpan
        tableBody.push([
          {
            content: 'KOMPONEN BIAYA VENDOR KHUSUS / OPERASIONAL TANPA DATA MITRA',
            colSpan: 12,
            styles: { 
              halign: 'center', 
              fillColor: [254, 243, 199], // light amber (bg-amber-100)
              textColor: [120, 53, 4], // dark amber (text-amber-900)
              fontStyle: 'bold',
              fontSize: 7.5
            }
          }
        ]);
      }

      tableBody.push([
        pNum++,
        p.packageName,
        p.departureDate ? p.departureDate.split('-').sort().join('/') : '-',
        p.totalSeats,
        formatIDR(p.totalInflowExpected),
        formatIDR(p.totalInflowReceived),
        formatIDR(p.totalCostBudgeted),
        formatIDR(p.totalCostPaid),
        formatIDR(p.budgetedProfit),
        `${p.budgetedMarginPercent.toFixed(1)}%`,
        formatIDR(p.cashflowDifference),
        p.statusRisiko
      ]);
    });

    autoTable(doc, {
      startY: 65,
      head: [[
        'No', 'Nama Paket Acuan', 'Brt', 'Seat', 'Target Mitra', 'Realized Inflow', 
        'Budget Vendor', 'Realized Outflow', 'Margin Proy.', '%', 'Arus Kas Net', 'Risiko'
      ]],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [49, 46, 129], fontSize: 7.5, halign: 'center' }, // dark violet/indigo
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 10, halign: 'center' },
        4: { cellWidth: 26, halign: 'right' },
        5: { cellWidth: 26, halign: 'right' },
        6: { cellWidth: 26, halign: 'right' },
        7: { cellWidth: 26, halign: 'right' },
        8: { cellWidth: 24, halign: 'right' },
        9: { cellWidth: 12, halign: 'center' },
        10: { cellWidth: 26, halign: 'right' },
        11: { cellWidth: 15, halign: 'center' }
      },
      styles: { fontSize: 7, valign: 'middle' },
      didParseCell: (data) => {
        if (data.cell.section === 'body') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rowData = data.row.raw as any[];
          // Safe guard check: make sure rowData is an array and does not contain a colSpan cell
          if (Array.isArray(rowData) && rowData.length > 1) {
            if (data.column.index === 10) {
              const strVal = rowData[10];
              if (typeof strVal === 'string' && strVal.includes('-')) {
                data.cell.styles.textColor = [185, 28, 28]; // red for negative
              } else if (typeof strVal === 'string' && strVal !== 'Rp 0') {
                data.cell.styles.textColor = [21, 128, 61]; // green
              }
            }
            if (data.column.index === 11) {
              const rsk = rowData[11];
              if (rsk === 'Kritikal') {
                data.cell.styles.textColor = [185, 28, 28];
                data.cell.styles.fontStyle = 'bold';
              } else if (rsk === 'Waspada') {
                data.cell.styles.textColor = [217, 119, 6];
              } else if (rsk === 'Aman') {
                data.cell.styles.textColor = [21, 128, 61];
              }
            }
          }
        }
      }
    });

    // 4. Signatures area
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 160;
    if (finalY < 165) {
      doc.text("Disetujui Oleh:", 25, finalY + 15);
      doc.line(25, finalY + 30, 75, finalY + 30);
      doc.text("Direktur Utama PT NAWAITUL UMRAH HAJI", 25, finalY + 34);

      doc.text("Dibuat Oleh:", 210, finalY + 15);
      doc.line(210, finalY + 30, 260, finalY + 30);
      doc.text("Finance Controller", 210, finalY + 34);
    } else {
      doc.addPage();
      doc.text("Disetujui Oleh:", 25, 30);
      doc.line(25, 45, 75, 45);
      doc.text("Direktur Utama PT NAWAITUL UMRAH HAJI", 25, 49);

      doc.text("Dibuat Oleh:", 210, 30);
      doc.line(210, 45, 260, 45);
      doc.text("Finance Controller", 210, 49);
    }

    doc.save(`Laporan_Keuangan_Konsolidasi_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export Tracker Mitra PDF Report
  const exportMitraPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const today = new Date().toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // 1. Document Title & Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(29, 78, 216); // Royal Blue
    doc.text("PT NAWAITUL UMRAH HAJI", 14, 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Laporan Keuangan Tracker Mitra (Sisi Pendanaan & Piutang)", 14, 26);
    doc.setFontSize(9);
    doc.text(`Waktu Cetak: ${today} | Oleh: Pihak Manajemen Keuangan`, 14, 31);

    // 2. Executive Quick Metrics Row for Mitra
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(14, 35, 269, 25, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55, 65, 81);
    doc.text("RINGKASAN EKSEKUTIF PENDANAAN MITRA KONSOLIDASI", 18, 41);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Total Proyeksi Pendanaan Mitra:", 18, 47);
    doc.setFont("helvetica", "bold");
    doc.text(formatIDR(globalMetrics.expectedInflow), 18, 51);

    doc.setFont("helvetica", "normal");
    doc.text("Total Realisasi Cash-In Mitra:", 85, 47);
    doc.setFont("helvetica", "bold");
    doc.text(`${formatIDR(globalMetrics.actualInflow)} (${globalMetrics.currentLiquidityFactor.toFixed(1)}%)`, 85, 51);

    doc.setFont("helvetica", "normal");
    doc.text("Total Sisa Piutang Mitra:", 160, 47);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(217, 119, 6); // Orange/Amber
    doc.text(formatIDR(globalMetrics.pendingInflow), 160, 51);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    doc.text("Total Seat Terjual:", 230, 47);
    doc.setFont("helvetica", "bold");
    doc.text(`${globalMetrics.seats} Pax`, 230, 51);

    // 3. Mitra Table
    const tableBody = filteredPackages.map((p, index) => {
      const marginPct = p.totalInflowExpected > 0 ? (p.totalInflowReceived / p.totalInflowExpected) * 100 : 0;
      return [
        index + 1,
        p.packageName,
        p.departureDate ? p.departureDate.split('-').sort().join('/') : '-',
        p.totalSeats,
        formatIDR(p.totalInflowExpected),
        formatIDR(p.totalInflowReceived),
        formatIDR(p.totalInflowPending),
        `${marginPct.toFixed(1)}%`,
        p.statusRisiko
      ];
    });

    autoTable(doc, {
      startY: 65,
      head: [[
        'No', 'Nama Paket Acuan', 'Keberangkatan', 'Jumlah Seat', 'Target Pendanaan Mitra', 'Realisasi Cash-In', 'Sisa Piutang Mitra', '% Pelunasan', 'Status Risiko'
      ]],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [49, 46, 129], fontSize: 8, halign: 'center' }, // dark violet/indigo
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 35, halign: 'right' },
        5: { cellWidth: 35, halign: 'right' },
        6: { cellWidth: 35, halign: 'right' },
        7: { cellWidth: 20, halign: 'center' },
        8: { cellWidth: 20, halign: 'center' }
      },
      styles: { fontSize: 7.5, valign: 'middle' },
      didParseCell: (data) => {
        if (data.column.index === 6 && data.cell.section === 'body') {
          const rawVal = filteredPackages[data.row.index].totalInflowPending;
          if (rawVal > 0) {
            data.cell.styles.textColor = [217, 119, 6]; // amber
          }
        }
        if (data.column.index === 8 && data.cell.section === 'body') {
          const rsk = filteredPackages[data.row.index].statusRisiko;
          if (rsk === 'Kritikal') {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          } else if (rsk === 'Waspada') {
            data.cell.styles.textColor = [217, 119, 6];
          } else {
            data.cell.styles.textColor = [21, 128, 61];
          }
        }
      }
    });

    // 4. Signatures area
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 160;
    if (finalY < 165) {
      doc.text("Disetujui Oleh:", 25, finalY + 15);
      doc.line(25, finalY + 30, 75, finalY + 30);
      doc.text("Direktur Utama PT NAWAITUL UMRAH HAJI", 25, finalY + 34);

      doc.text("Dibuat Oleh:", 210, finalY + 15);
      doc.line(210, finalY + 30, 260, finalY + 30);
      doc.text("Finance Controller", 210, finalY + 34);
    } else {
      doc.addPage();
      doc.text("Disetujui Oleh:", 25, 30);
      doc.line(25, 45, 75, 45);
      doc.text("Direktur Utama PT NAWAITUL UMRAH HAJI", 25, 49);

      doc.text("Dibuat Oleh:", 210, 30);
      doc.line(210, 45, 260, 45);
      doc.text("Finance Controller", 210, 49);
    }

    doc.save(`Laporan_Tracker_Mitra_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export Tracker Vendor PDF Report
  const exportVendorPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const today = new Date().toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // 1. Document Title & Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(29, 78, 216); // Royal Blue
    doc.text("PT NAWAITUL UMRAH HAJI", 14, 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Laporan Keuangan Tracker Vendor (Sisi Pengeluaran & Hutang)", 14, 26);
    doc.setFontSize(9);
    doc.text(`Waktu Cetak: ${today} | Oleh: Pihak Manajemen Keuangan`, 14, 31);

    // 2. Executive Quick Metrics Row for Vendor
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(14, 35, 269, 25, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55, 65, 81);
    doc.text("RINGKASAN EKSEKUTIF REALISASI BIAYA VENDOR KONSOLIDASI", 18, 41);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Total Proyeksi Biaya Vendor:", 18, 47);
    doc.setFont("helvetica", "bold");
    doc.text(formatIDR(globalMetrics.budgetedOutflow), 18, 51);

    doc.setFont("helvetica", "normal");
    doc.text("Total Realisasi Cash-Out:", 85, 47);
    doc.setFont("helvetica", "bold");
    doc.text(`${formatIDR(globalMetrics.actualOutflow)} (${globalMetrics.vendorPayProgress.toFixed(1)}%)`, 85, 51);

    doc.setFont("helvetica", "normal");
    doc.text("Total Sisa Hutang ke Vendor:", 160, 47);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(185, 28, 28); // Red
    doc.text(formatIDR(globalMetrics.pendingOutflow), 160, 51);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    doc.text("Sisa Arus Kas Bersih Aktual:", 220, 47);
    doc.setFont("helvetica", "bold");
    const netCash = globalMetrics.actualInflow - globalMetrics.actualOutflow;
    if (netCash >= 0) {
      doc.setTextColor(21, 128, 61);
    } else {
      doc.setTextColor(185, 28, 28);
    }
    doc.text(formatIDR(netCash), 220, 51);

    // 3. Vendor Table
    const tableBody = filteredPackages.map((p, index) => {
      const payPct = p.totalCostBudgeted > 0 ? (p.totalCostPaid / p.totalCostBudgeted) * 100 : 0;
      return [
        index + 1,
        p.packageName,
        p.departureDate ? p.departureDate.split('-').sort().join('/') : '-',
        formatIDR(p.totalCostBudgeted),
        formatIDR(p.totalCostPaid),
        formatIDR(p.totalCostPending),
        `${payPct.toFixed(1)}%`,
        formatIDR(p.cashflowDifference),
        p.cashflowDifference >= 0 ? 'Surplus' : 'Defisit'
      ];
    });

    autoTable(doc, {
      startY: 65,
      head: [[
        'No', 'Nama Paket Acuan', 'Keberangkatan', 'Total Budget HPP Vendor', 'Realisasi Cash-Out', 'Sisa Hutang Vendor', '% Terbayar', 'Arus Kas Net (In-Out)', 'F-Status'
      ]],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [49, 46, 129], fontSize: 8, halign: 'center' }, // dark violet/indigo
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' },
        5: { cellWidth: 35, halign: 'right' },
        6: { cellWidth: 20, halign: 'center' },
        7: { cellWidth: 35, halign: 'right' },
        8: { cellWidth: 20, halign: 'center' }
      },
      styles: { fontSize: 7.5, valign: 'middle' },
      didParseCell: (data) => {
        if (data.column.index === 5 && data.cell.section === 'body') {
          const rawVal = filteredPackages[data.row.index].totalCostPending;
          if (rawVal > 0) {
            data.cell.styles.textColor = [185, 28, 28]; // red
          }
        }
        if (data.column.index === 7 && data.cell.section === 'body') {
          const rawVal = filteredPackages[data.row.index].cashflowDifference;
          if (rawVal < 0) {
            data.cell.styles.textColor = [185, 28, 28]; // red
          } else {
            data.cell.styles.textColor = [21, 128, 61]; // green
          }
        }
        if (data.column.index === 8 && data.cell.section === 'body') {
          const rawVal = filteredPackages[data.row.index].cashflowDifference;
          if (rawVal < 0) {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [21, 128, 61];
          }
        }
      }
    });

    // Signatures area
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 160;
    if (finalY < 165) {
      doc.text("Disetujui Oleh:", 25, finalY + 15);
      doc.line(25, finalY + 30, 75, finalY + 30);
      doc.text("Direktur Utama PT NAWAITUL UMRAH HAJI", 25, finalY + 34);

      doc.text("Dibuat Oleh:", 210, finalY + 15);
      doc.line(210, finalY + 30, 260, finalY + 30);
      doc.text("Finance Controller", 210, finalY + 34);
    } else {
      doc.addPage();
      doc.text("Disetujui Oleh:", 25, 30);
      doc.line(25, 45, 75, 45);
      doc.text("Direktur Utama PT NAWAITUL UMRAH HAJI", 25, 49);

      doc.text("Dibuat Oleh:", 210, 30);
      doc.line(210, 45, 260, 45);
      doc.text("Finance Controller", 210, 49);
    }

    doc.save(`Laporan_Tracker_Vendor_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <span className="text-xs text-gray-500 font-extrabold tracking-wider uppercase">Loading Laporan Konsolidasi...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 pb-16 sm:px-6 lg:px-8 bg-gray-55/50 min-h-screen py-6" id="cons_finance_portal">
      
      {/* 1. Header & Actions Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm transition-all">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-100/80 text-indigo-700 rounded-xl shadow-inner shrink-0">
            <Landmark className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-indigo-950 uppercase tracking-tight flex items-center gap-2">
              Laporan Konsolidasi & Keuangan Kumulatif
              <span className="text-xs bg-indigo-100 text-indigo-800 py-1 px-2.5 rounded-full font-bold">MANAGEMENT REVIEW</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1.5 max-w-xl">
              Panel integrasi analitik real-time yang menggabungkan aliran <strong>Piutang Pendanaan (Sisi Mitra)</strong> dengan <strong>Komponen Biaya Pengeluaran Operasional (Sisi Vendor)</strong> secara komulatif berdasarkan paket keberangkatan.
            </p>
          </div>
        </div>
        
        {/* Print / Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            type="button"
            onClick={exportConsolidatedPDF}
            className="flex items-center gap-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl transition shadow-md cursor-pointer uppercase tracking-wider"
          >
            <Printer className="w-4 h-4 text-white" />
            Cetak PDF Konsolidasi
          </button>
          <button 
            type="button"
            onClick={exportMitraPDF}
            className="flex items-center gap-2 text-xs font-black bg-indigo-50 hover:bg-indigo-100 text-indigo-750 py-2.5 px-4 rounded-xl transition border border-indigo-200 shadow-sm cursor-pointer uppercase tracking-wider"
          >
            <Printer className="w-4 h-4 text-indigo-650" />
            Cetak PDF Tracker Mitra
          </button>
          <button 
            type="button"
            onClick={exportVendorPDF}
            className="flex items-center gap-2 text-xs font-black bg-amber-50 hover:bg-amber-100 text-amber-800 py-2.5 px-4 rounded-xl transition border border-amber-200 shadow-sm cursor-pointer uppercase tracking-wider"
          >
            <Printer className="w-4 h-4 text-amber-600" />
            Cetak PDF Tracker Vendor
          </button>
          <button 
            type="button"
            onClick={exportToExcel}
            className="flex items-center gap-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl transition shadow-md cursor-pointer uppercase tracking-wider"
          >
            <Download className="w-4 h-4" />
            Ekspor Excel (XLSX)
          </button>
        </div>
      </div>

      {/* 2. Executive Key Indicator Box Rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Source of Funds expected vs collected */}
        <div className="bg-white p-5 rounded-2xl border border-indigo-100/60 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-16 h-16 bg-indigo-50 rounded-full group-hover:scale-110 transition pointer-events-none"></div>
          <div>
            <span className="text-[10px] font-black tracking-widest text-indigo-800 uppercase block">PENDANAAN MITRA (INFLOW)</span>
            <h2 className="text-xl font-extrabold text-slate-850 mt-1 tracking-tight">{formatIDR(globalMetrics.actualInflow)}</h2>
            <div className="text-[11px] text-gray-550 mt-1.5 flex items-center gap-1">
              <span>Target Proyeksi:</span>
              <strong className="text-indigo-900">{formatIDR(globalMetrics.expectedInflow)}</strong>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center text-[10px] text-gray-500 mb-1">
              <span>Likuiditas Masuk</span>
              <span className="font-extrabold text-indigo-700">{globalMetrics.currentLiquidityFactor.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(globalMetrics.currentLiquidityFactor, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Metric 2: Operational Costs budgeted vs paid */}
        <div className="bg-white p-5 rounded-2xl border border-orange-100/60 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-16 h-16 bg-orange-50 rounded-full group-hover:scale-110 transition pointer-events-none"></div>
          <div>
            <span className="text-[10px] font-black tracking-widest text-orange-800 uppercase block">REALISASI BIAYA VENDOR (OUTFLOW)</span>
            <h2 className="text-xl font-extrabold text-slate-850 mt-1 tracking-tight">{formatIDR(globalMetrics.actualOutflow)}</h2>
            <div className="text-[11px] text-gray-550 mt-1.5 flex items-center gap-1">
              <span>Batas Anggaran HPP:</span>
              <strong className="text-orange-900">{formatIDR(globalMetrics.budgetedOutflow)}</strong>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center text-[10px] text-gray-500 mb-1">
              <span>Tingkat Pelunasan Vendor</span>
              <span className="font-extrabold text-orange-700">{globalMetrics.vendorPayProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-orange-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(globalMetrics.vendorPayProgress, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Metric 3: Profit Margin Forecast */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-16 h-16 bg-emerald-50 rounded-full group-hover:scale-110 transition pointer-events-none"></div>
          <div>
            <span className="text-[10px] font-black tracking-widest text-emerald-800 uppercase block">PROYEKSI LABA KOTOR (HPP)</span>
            <h2 className="text-xl font-extrabold text-emerald-700 mt-1 tracking-tight">
              {formatIDR(globalMetrics.netProfitTarget)}
            </h2>
            <p className="text-[10px] text-gray-500 mt-1 leading-normal">
              Margin Proyeksi Bersih:{' '}
              <strong className="text-emerald-800">
                {globalMetrics.expectedInflow > 0 
                  ? ((globalMetrics.netProfitTarget / globalMetrics.expectedInflow) * 100).toFixed(1) 
                  : 0}%
              </strong>
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center text-[11px] text-gray-650 bg-emerald-50 py-1.5 px-2.5 rounded-xl border border-emerald-100/50">
              <span className="font-medium">Laba Riil Kas:</span>
              <span className={`font-black ${globalMetrics.netProfitRealized >= 0 ? 'text-emerald-700' : 'text-red-650'}`}>
                {formatIDR(globalMetrics.netProfitRealized)}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Receivables vs Payables */}
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-16 h-16 bg-amber-50 rounded-full group-hover:scale-110 transition pointer-events-none"></div>
          <div>
            <span className="text-[10px] font-black tracking-widest text-amber-800 uppercase block">RISIKO POSISI PIUTANG / HUTANG</span>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Piutang Mitra:</span>
                <span className="font-extrabold text-amber-700">{formatIDR(globalMetrics.pendingInflow)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Hutang Vendor:</span>
                <span className="font-extrabold text-red-600">{formatIDR(globalMetrics.pendingOutflow)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            {globalMetrics.pendingInflow >= globalMetrics.pendingOutflow ? (
              <div className="text-[10px] bg-green-50 text-green-750 px-2 py-1 select-none rounded border border-green-100 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Piutang Menutupi Hutang</span>
              </div>
            ) : (
              <div className="text-[10px] bg-rose-50 text-rose-750 px-2 py-1 select-none rounded border border-rose-100 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                <span>Bahaya Liquidity Gap!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Real-time Warning & Liquidity Diagnostics Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-indigo-600" />
          <h3 className="font-black text-xs uppercase tracking-wider text-slate-800">
            Analisis Diagnostik & Indikator Likuiditas Per Paket
          </h3>
        </div>
        
        {/* Warning cards of operational overspending */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Diagnostic 1: Operational Deficit / Overspending */}
          <div className="bg-slate-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-[11px] font-black tracking-wide text-gray-700 uppercase flex items-center gap-1.5 mb-2">
              <ArrowDownRight className="w-4 h-4 text-red-500" />
              Paket Defisit Aliran Kas Aktual
            </h4>
            {consolidatedData.filter(p => p.cashflowDifference < 0).length === 0 ? (
              <p className="text-[11px] text-green-700 font-bold bg-green-50/50 p-2 border border-green-100 rounded-lg">
                ✓ Seluruh Paket saat ini mengalami surplus arus kas (Aliran Pendanaan mengungguli Bayar Vendor).
              </p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {consolidatedData.filter(p => p.cashflowDifference < 0).map(p => (
                  <div key={p.packageName} className="flex justify-between items-center text-xs p-2 bg-red-50 rounded border border-red-100/50">
                    <span className="font-bold text-gray-800 truncate max-w-[140px]">{p.packageName}</span>
                    <span className="font-black text-red-700 whitespace-nowrap">{formatIDR(p.cashflowDifference)}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[9px] text-gray-450 mt-2 leading-snug">
              * Terjadi jika kas actual yang dikeluarkan ke vendor melebihi kas aman yang terkumpul dari mitra travel di paket tersebut.
            </p>
          </div>

          {/* Diagnostic 2: High Outstanding Receivables Risk */}
          <div className="bg-slate-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-[11px] font-black tracking-wide text-gray-700 uppercase flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Risiko Piutang Mitra Terbengkalai
            </h4>
            {consolidatedData.filter(p => p.totalInflowPending > p.totalInflowExpected * 0.35).length === 0 ? (
              <p className="text-[11px] text-green-700 font-bold bg-green-50/50 p-2 border border-green-100 rounded-lg">
                ✓ Tidak ada paket dengan risiko piutang kritis (&gt;35% dari target).
              </p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {consolidatedData.filter(p => p.totalInflowPending > p.totalInflowExpected * 0.35).map(p => {
                  const percentPending = p.totalInflowExpected > 0 ? (p.totalInflowPending / p.totalInflowExpected) * 100 : 0;
                  return (
                    <div key={p.packageName} className="flex justify-between items-center text-xs p-2 bg-amber-50 rounded border border-amber-100/50">
                      <span className="font-bold text-gray-800 truncate max-w-[140px]">{p.packageName}</span>
                      <span className="font-black text-amber-700 whitespace-nowrap">{percentPending.toFixed(1)}% Outstanding</span>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[9px] text-gray-450 mt-2 leading-snug">
              * Menampilkan paket di mana lebih dari 35% dana piutang belum disetor kembali oleh mitra-mitra rekanan.
            </p>
          </div>

          {/* Diagnostic 3: Critical Priority Packages */}
          <div className="bg-slate-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-[11px] font-black tracking-wide text-gray-700 uppercase flex items-center gap-1.5 mb-2">
              <AlertCircle className="w-4 h-4 text-purple-600" />
              Paket Status Kritikal Keuangan
            </h4>
            {consolidatedData.filter(p => p.statusRisiko === 'Kritikal').length === 0 ? (
              <p className="text-[11px] text-green-700 font-bold bg-green-50/50 p-2 border border-green-100 rounded-lg">
                ✓ Seluruh paket saat ini didiagnosis berada dalam status risiko Terkendali / Aman.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {consolidatedData.filter(p => p.statusRisiko === 'Kritikal').map(p => (
                  <div key={p.packageName} className="flex justify-between items-center text-xs p-2 bg-rose-50 rounded border border-pink-100">
                    <span className="font-bold text-gray-800 truncate max-w-[140px]">{p.packageName}</span>
                    <span className="font-black text-rose-700 text-[10px] bg-red-100/80 px-2 py-0.5 rounded-full">KRITIKAL</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[9px] text-gray-450 mt-2 leading-snug">
              * Menandakan paket yang memiliki agen mitra bermasalah besar, overspending kritis, atau tenggat pelunasan gantung.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Combined Custom Charts (SVG Grouped Bars & Cost Allocation) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart A: Dual Comparison Bar Chart of Packages */}
        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm lg:col-span-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800">Komparasi Aliran Dana per Paket Utama (Inflow vs Outflow)</h3>
              <p className="text-[11px] text-gray-450 mt-1">Laba proyeksi dicapai dari margin rentang bar biru (Tagihan Mitra) vs bar emas (Biaya HPP Vendor).</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-extrabold select-none">
                <span className="w-3 h-3 bg-indigo-600 rounded-sm"></span>
                <span>Inflow Mitra</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-orange-600 font-extrabold select-none">
                <span className="w-3 h-3 bg-orange-400 rounded-sm"></span>
                <span>Outflow Vendor</span>
              </div>
            </div>
          </div>

          {/* Simple Highly Styled custom SVG Drawing */}
          {consolidatedData.length === 0 ? (
            <div className="h-64 flex items-center justify-center border border-dashed border-gray-200 rounded-xl text-xs text-gray-450">
              Belum ada data paket untuk ditampilkan di visualisasi komparasi.
            </div>
          ) : (
            <div className="space-y-4">
              {consolidatedData.slice(0, 5).map(p => {
                const maxVal = Math.max(...consolidatedData.map(pt => Math.max(pt.totalInflowExpected, pt.totalCostBudgeted, 1000000)));
                const inflowPercent = (p.totalInflowExpected / maxVal) * 100;
                const inflowReceivedPercent = (p.totalInflowReceived / maxVal) * 100;
                const costPercent = (p.totalCostBudgeted / maxVal) * 100;
                const costPaidPercent = (p.totalCostPaid / maxVal) * 100;

                return (
                  <div key={p.packageName} className="p-3 bg-slate-50 hover:bg-indigo-50/20 rounded-xl transition border border-gray-100">
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="font-extrabold text-indigo-950 truncate max-w-[280px]">{p.packageName}</span>
                      <span className="font-bold text-gray-500 text-[10px] bg-white border px-2 py-0.5 rounded-full shadow-sm">
                        Proyeksi Laba: <strong className="text-emerald-700">{formatIDR(p.budgetedProfit)}</strong>
                      </span>
                    </div>
                    
                    {/* Progress Bar Container comparison */}
                    <div className="space-y-2">
                      {/* INFLOW BAR */}
                      <div className="space-y-1">
                        <div className="w-full bg-gray-150 h-3 rounded-md overflow-hidden relative group">
                          {/* Total Expected line greyed / opacity */}
                          <div 
                            className="bg-indigo-200 absolute top-0 left-0 h-full ease-out duration-500"
                            style={{ width: `${inflowPercent}%` }}
                          ></div>
                          {/* Collected solid color */}
                          <div 
                            className="bg-indigo-600 absolute top-0 left-0 h-full rounded-r ease-out duration-700"
                            style={{ width: `${inflowReceivedPercent}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[9px] text-indigo-900 font-semibold px-0.5">
                          <span>Collected: {formatIDR(p.totalInflowReceived)}</span>
                          <span className="font-bold opacity-60">Target: {formatIDR(p.totalInflowExpected)}</span>
                        </div>
                      </div>

                      {/* OUTFLOW BAR */}
                      <div className="space-y-1">
                        <div className="w-full bg-gray-150 h-3 rounded-md overflow-hidden relative">
                          {/* Total Cost budgeted */}
                          <div 
                            className="bg-orange-200 absolute top-0 left-0 h-full ease-out duration-500"
                            style={{ width: `${costPercent}%` }}
                          ></div>
                          {/* Cost component Paid */}
                          <div 
                            className="bg-orange-500 absolute top-0 left-0 h-full rounded-r ease-out duration-700"
                            style={{ width: `${costPaidPercent}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[9px] text-orange-900 font-semibold px-0.5">
                          <span>Paid Out: {formatIDR(p.totalCostPaid)}</span>
                          <span className="font-bold opacity-60">HPP Vendor: {formatIDR(p.totalCostBudgeted)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {consolidatedData.length > 5 && (
                <div className="text-center">
                  <span className="text-[10px] text-gray-500 italic bg-gray-100 rounded-full px-3 py-1 font-bold">
                    + Menampilkan 5 paket terdekat dari total {consolidatedData.length} paket aktif.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chart B: Cost Categorical Allocations Doughnut pie */}
        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm lg:col-span-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800 mb-2">Alokasi Komponen Biaya (HPP)</h3>
            <p className="text-[11px] text-gray-450 mb-4">Grafik rincian porsi pengisian keuangan HPP paling dominan saat ini.</p>
          </div>

          {costCategoryChartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center border border-dashed border-gray-200 rounded-xl text-xs text-gray-450 my-auto">
              Tidak ada data komponen biaya vendor.
            </div>
          ) : (
            <div className="space-y-4 my-auto">
              {/* Nice visually stacked vertical bar percentage layout */}
              <div className="space-y-2.5">
                {costCategoryChartData.slice(0, 5).map((c, idx) => {
                  const colors = [
                    'bg-indigo-600',
                    'bg-emerald-500',
                    'bg-amber-500',
                    'bg-sky-500',
                    'bg-purple-500',
                    'bg-rose-500'
                  ];
                  const activeColor = colors[idx % colors.length];
                  
                  return (
                    <div key={c.name} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-gray-750 flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${activeColor}`}></span>
                          {c.name}
                        </span>
                        <span className="font-extrabold text-indigo-950 font-mono">
                          {c.percentage.toFixed(1)}% <span className="text-gray-400 font-normal">({formatIDR(c.value)})</span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${activeColor}`} style={{ width: `${c.percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {costCategoryChartData.length > 5 && (
                <div className="text-right">
                  <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                    + {costCategoryChartData.length - 5} Kategori Lainnya diluar 5 teratas
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-[10px] text-gray-500 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Kategori Maskapai & Hotel Makkah mendominasi ketersediaan HPP perjalanan.</span>
          </div>
        </div>

      </div>

      {/* 5. Main Consolidated Grid/Table of Packages */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Table Top Banner Controls */}
        <div className="p-6 border-b border-gray-200 bg-gray-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'all' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
              }`}
            >
              Semua Paket ({consolidatedData.length})
            </button>
            <button
              onClick={() => setActiveTab('profitable')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'profitable' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-white text-gray-600 hover:text-emerald-700 border border-gray-200'
              }`}
            >
              Margin Profit &gt; 0
            </button>
            <button
              onClick={() => setActiveTab('at-risk')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'at-risk' 
                  ? 'bg-amber-600 text-white shadow-sm' 
                  : 'bg-white text-gray-600 hover:text-amber-700 border border-gray-200'
              }`}
            >
              Risiko Kolektabilitas
            </button>
            <button
              onClick={() => setActiveTab('deficit')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'deficit' 
                  ? 'bg-red-600 text-white shadow-sm' 
                  : 'bg-white text-gray-600 hover:text-red-750 border border-gray-200'
              }`}
            >
              Arus Kas Defisit
            </button>
          </div>

          <div className="relative max-w-xs w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </span>
            <input
              type="text"
              placeholder="Cari nama paket/tahun..."
              className="text-xs block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Action helper bar */}
        <div className="px-6 py-2 bg-indigo-50/20 border-b border-gray-100 flex items-center justify-between text-xs text-indigo-950 font-bold">
          <span>MENAMPILKAN {filteredPackages.length} UNIT LAPORAN KONSOLIDASI</span>
          <div className="space-x-3">
            <button 
              type="button"
              onClick={handleExpandAll}
              className="hover:underline text-indigo-700 font-extrabold uppercase text-[10px] tracking-wider cursor-pointer"
            >
              Buka Semua Detail
            </button>
            <span className="text-gray-300">|</span>
            <button 
              type="button"
              onClick={handleCollapseAll}
              className="hover:underline text-indigo-700 font-extrabold uppercase text-[10px] tracking-wider cursor-pointer"
            >
              Tutup Semua Detail
            </button>
          </div>
        </div>

        {/* Consolidated Table View */}
        {filteredPackages.length === 0 ? (
          <div className="p-16 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="font-extrabold text-sm text-gray-700 uppercase">Tidak ada laporan yang cocok</h4>
            <p className="text-xs text-gray-500 mt-2">Atur ulang kata pencarian atau sub-tab saringan diatas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed text-left">
              <thead className="bg-slate-100 divide-y divide-gray-200 select-none">
                <tr className="text-[10px] font-black text-gray-700 tracking-wider uppercase border-b border-200">
                  <th className="px-6 py-4.5 w-12 text-center">#</th>
                  <th className="px-6 py-4.5 text-left w-64">Skenario / Nama Paket Utama</th>
                  <th className="px-4 py-4.5 text-center w-28">Brkt (H-Day)</th>
                  <th className="px-4 py-4.5 text-center w-24">Seat Terjual</th>
                  <th className="px-4 py-4.5 text-right w-44">Target Mitra (Inflow)</th>
                  <th className="px-4 py-4.5 text-right w-44">Modal HPP (Outflow)</th>
                  <th className="px-4 py-4.5 text-right w-40">Proyeksi Laba</th>
                  <th className="px-4 py-4.5 text-center w-20">Margin%</th>
                  <th className="px-4 py-4.5 text-right w-44">Kas Actual Difference</th>
                  <th className="px-4 py-4.5 text-center w-28">F-Status</th>
                  <th className="px-6 py-4.5 w-16"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-xs">
                {filteredPackages.map((p, index) => {
                  const isExpanded = !!expandedPackages[p.packageName];
                  const hasDeficit = p.cashflowDifference < 0;
                  const daysToDep = p.departureDate 
                    ? Math.ceil((new Date(p.departureDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
                    : null;

                  const showDivider = index > 0 && (filteredPackages[index - 1].totalInflowExpected > 0 && p.totalInflowExpected === 0);

                  return (
                    <React.Fragment key={p.packageName}>
                      {showDivider && (
                        <tr className="bg-amber-50/50 border-y-2 border-dashed border-amber-300">
                          <td colSpan={11} className="px-6 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <div className="h-[2px] bg-amber-300 flex-grow max-w-[250px]"></div>
                              <span className="text-[10px] font-black tracking-widest text-amber-800 uppercase flex items-center gap-1.5 bg-amber-100/80 px-3 py-1 rounded-full border border-amber-200">
                                <Layers className="w-3.5 h-3.5 text-amber-600" />
                                KOMPONEN BIAYA VENDOR KHUSUS / OPERASIONAL TANPA DATA MITRA
                              </span>
                              <div className="h-[2px] bg-amber-300 flex-grow max-w-[250px]"></div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {/* Parent Row */}
                      <tr 
                        className={`hover:bg-indigo-50/10 transition duration-150 cursor-pointer ${isExpanded ? 'bg-indigo-50/5' : ''}`}
                        onClick={() => togglePackageExpand(p.packageName)}
                      >
                        {/* 1. Item Index */}
                        <td className="px-6 py-4 text-center font-bold text-gray-400">
                          {index + 1}
                        </td>

                        {/* 2. Package Name */}
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-slate-850 truncate max-w-xs">{p.packageName}</div>
                          {p.departureDate && (
                            <span className="text-[10px] text-gray-500 font-mono mt-0.5 block flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                              Keberangkatan: {p.departureDate.split('-').reverse().join('/')}
                            </span>
                          )}
                        </td>

                        {/* 3. Days Remaining */}
                        <td className="px-4 py-4 text-center">
                          {daysToDep !== null ? (
                            <span className={`font-black font-mono text-[11px] px-2 py-0.5 rounded-full ${
                              daysToDep < 0 ? 'bg-gray-100 text-gray-600' :
                              daysToDep <= 30 ? 'bg-red-50 text-red-750' : 'bg-green-50 text-green-755'
                            }`}>
                              {daysToDep < 0 ? 'Selesai' : `H-${daysToDep}`}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">No Date</span>
                          )}
                        </td>

                        {/* 4. Seats Sold */}
                        <td className="px-4 py-4 text-center font-mono font-bold text-gray-800">
                          {p.totalSeats} Pax
                        </td>

                        {/* 5. Target Mitra Inflow */}
                        <td className="px-4 py-4 text-right">
                          <span className="font-extrabold text-slate-850 font-mono">{formatIDR(p.totalInflowExpected)}</span>
                          <span className="text-[9px] text-gray-500 mt-0.5 block font-mono">
                            Ke kas: {p.totalInflowExpected > 0 ? ((p.totalInflowReceived / p.totalInflowExpected) * 100).toFixed(1) : 0}% ({formatIDR(p.totalInflowReceived)})
                          </span>
                        </td>

                        {/* 6. Budgeted Cost Outflow */}
                        <td className="px-4 py-4 text-right">
                          <span className="font-extrabold text-slate-800 font-mono">{formatIDR(p.totalCostBudgeted)}</span>
                          <span className="text-[9px] text-gray-500 mt-0.5 block font-mono">
                            Bayar: {p.totalCostBudgeted > 0 ? ((p.totalCostPaid / p.totalCostBudgeted) * 100).toFixed(1) : 0}% ({formatIDR(p.totalCostPaid)})
                          </span>
                        </td>

                        {/* 7. Profit Budgeted */}
                        <td className="px-4 py-4 text-right">
                          <span className={`font-black font-mono ${p.budgetedProfit >= 0 ? 'text-emerald-700' : 'text-rose-750'}`}>
                            {formatIDR(p.budgetedProfit)}
                          </span>
                        </td>

                        {/* 8. Margin % */}
                        <td className="px-4 py-4 text-center">
                          <span className={`font-extrabold text-[11px] font-mono px-2 py-0.5 rounded ${
                            p.budgetedMarginPercent <= 5 ? 'bg-red-50 text-red-600' :
                            p.budgetedMarginPercent <= 15 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {p.budgetedMarginPercent.toFixed(1)}%
                          </span>
                        </td>

                        {/* 9. Cashflow real difference */}
                        <td className="px-4 py-4 text-right">
                          <span className={`font-extrabold font-mono flex items-center justify-end gap-1 ${hasDeficit ? 'text-red-700' : 'text-green-700'}`}>
                            {hasDeficit ? (
                              <ArrowDownRight className="w-3.5 h-3.5 text-red-600" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5 text-green-600" />
                            )}
                            {formatIDR(p.cashflowDifference)}
                          </span>
                          <span className="text-[9px] text-gray-450 mt-0.5 block italic">
                            {hasDeficit ? 'Overpaid (Hutang Khas)' : 'Safe (Kas Surplus)'}
                          </span>
                        </td>

                        {/* 10. Financial Indicator status */}
                        <td className="px-4 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            p.statusRisiko === 'Kritikal' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            p.statusRisiko === 'Waspada' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {p.statusRisiko}
                          </span>
                        </td>

                        {/* 11. Chevron Icon */}
                        <td className="px-6 py-4 text-center" onClick={(e) => { e.stopPropagation(); togglePackageExpand(p.packageName); }}>
                          <button type="button" className="text-gray-400 hover:text-indigo-600 p-1 bg-gray-55/10 rounded-full hover:bg-indigo-50 cursor-pointer">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Section */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={11} className="px-6 py-4.5 bg-indigo-50/20 shadow-inner">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-2">
                              
                              {/* Left Column: Mitra-Side breakdown (Income Sources) */}
                              <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                                <div className="flex items-center justify-between border-b pb-2 mb-3">
                                  <h4 className="text-[11px] font-black uppercase text-indigo-950 flex items-center gap-1.5">
                                    <Handshake className="w-4 h-4 text-indigo-700" />
                                    SIALAN & ALIRAN DANA MITRA ({p.mitras.length} MITRA REKANAN)
                                  </h4>
                                  <span className="text-[10px] text-gray-450">Beban Colektabilitas Sisa Piutang: <strong>{formatIDR(p.totalInflowPending)}</strong></span>
                                </div>
                                
                                {p.mitras.length === 0 ? (
                                  <p className="text-xs text-gray-400 italic text-center py-4">
                                    Belum ada pendataan pendaftaran tiket mitra untuk paket ini.
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-150 text-[11px]">
                                      <thead>
                                        <tr className="text-left text-gray-500 font-extrabold uppercase text-[9px] tracking-wider">
                                          <th className="py-1 px-2">Nama Keagenan</th>
                                          <th className="py-1 px-2 text-center">Seat</th>
                                          <th className="py-1 px-2 text-right">Tagihan Total</th>
                                          <th className="py-1 px-2 text-right">Terbayar</th>
                                          <th className="py-1 px-2 text-right">Piutang</th>
                                          <th className="py-1 px-2 text-center">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 font-mono">
                                        {p.mitras.map(m => (
                                          <tr key={m.id} className="hover:bg-gray-50/50">
                                            <td className="py-2.5 px-2 font-sans font-extrabold text-indigo-950">
                                              {m.nama_mitra}
                                              <span className="text-[9px] text-gray-400 font-normal font-sans block mt-0.5">PIC: {m.pic || '-'} | Brand: {m.nama_brand}</span>
                                            </td>
                                            <td className="py-2.5 px-2 text-center font-bold font-sans text-gray-700">{m.jumlah_seat} pax</td>
                                            <td className="py-2.5 px-2 text-right text-gray-800">{formatIDR(m.total_tagihan)}</td>
                                            <td className="py-2.5 px-2 text-right text-emerald-700">{formatIDR(m.total_bayar)}</td>
                                            <td className="py-2.5 px-2 text-right text-orange-700">{formatIDR(m.sisa_tagihan)}</td>
                                            <td className="py-2.5 px-2 text-center font-sans">
                                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                m.status_pembayaran === 'Lunas' ? 'bg-green-100 text-green-800' :
                                                m.status_pembayaran === 'DP' ? 'bg-indigo-100 text-indigo-800' : 'bg-red-15/10 text-red-650'
                                              }`}>
                                                {m.status_pembayaran}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* Right Column: Cost Component / Vendor-Side breakdown (Expenses) */}
                              <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                                <div className="flex items-center justify-between border-b pb-2 mb-3">
                                  <h4 className="text-[11px] font-black uppercase text-orange-950 flex items-center gap-1.5">
                                    <Layers className="w-4 h-4 text-orange-600" />
                                    STRUKTUR BIAYA VENDOR HPP ({p.components.length} KOMPONEN)
                                  </h4>
                                  <span className="text-[10px] text-gray-450">Beban Tagihan Hutang Vendor: <strong>{formatIDR(p.totalCostPending)}</strong></span>
                                </div>

                                {p.components.length === 0 ? (
                                  <p className="text-xs text-gray-400 italic text-center py-4">
                                    Tidak terdapat rincian input alokasi HPP untuk paket ini. Silahkan upload di Cost Component Tracker.
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-150 text-[11px]">
                                      <thead>
                                        <tr className="text-left text-gray-500 font-extrabold uppercase text-[9px] tracking-wider">
                                          <th className="py-1 px-2">Komponen / Vendor</th>
                                          <th className="py-1 px-2">Kategori</th>
                                          <th className="py-1 px-2 text-right">RAB Biaya</th>
                                          <th className="py-1 px-2 text-right">Terbayar</th>
                                          <th className="py-1 px-2 text-right">Sisa Hutang</th>
                                          <th className="py-1 px-2 text-center">F-Bayar</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 font-mono">
                                        {p.components.map(c => (
                                          <tr key={c.id} className="hover:bg-gray-50/50">
                                            <td className="py-2.5 px-2 font-sans font-extrabold text-orange-955">
                                              {c.nama_komponen}
                                              <span className="text-[9px] text-gray-400 font-normal font-sans block mt-0.5">Vendor: {c.vendor_id} | Qty: {c.qty}</span>
                                            </td>
                                            <td className="py-2.5 px-2 font-sans text-gray-600">{c.kategori_komponen}</td>
                                            <td className="py-2.5 px-2 text-right text-gray-800">{formatIDR(c.total_biaya)}</td>
                                            <td className="py-2.5 px-2 text-right text-blue-700">{formatIDR(c.total_bayar)}</td>
                                            <td className="py-2.5 px-2 text-right text-red-700">{formatIDR(c.sisa_tagihan)}</td>
                                            <td className="py-2.5 px-2 text-center font-sans">
                                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                c.status_pembayaran === 'Lunas' ? 'bg-green-100 text-green-800' :
                                                c.status_pembayaran === 'Belum Bayar' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                                              }`}>
                                                {c.status_pembayaran}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
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
        )}

      </div>
      
    </div>
  );
};
