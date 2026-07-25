import React, { useState, useMemo } from 'react';
import { Hotel, Calendar, CheckSquare, Square, Calculator, AlertCircle, TrendingUp as TrendingUpIcon, MessageCircle } from 'lucide-react';
import { openWhatsApp } from '../../utils/whatsapp';
import { AIPromptInput } from '../ai/AIPromptInput';
import { Type } from '../../types';

interface MappingRow {
  id: string;
  packageName: string;
  type: 'TICKET' | 'HOTEL_MADINAH' | 'HOTEL_MAKKAH' | 'BUS' | 'VISA' | 'OTHER';
  isChecked: boolean;
  itemName: string; // e.g., Airline name or Hotel name
  vendor: string;
  currency: 'IDR' | 'SAR' | 'USD';
  date1: string; // e.g., Departure Date or Check-In
  date2: string; // e.g., Return Date or Check-Out
  budget: string;
  quantity: string; // e.g., Seats or Rooms
  vendorInvoice: number;
  dpVendor: number;
  dpDate: string;
  payment1: number;
  p1Date: string;
  payment2: number;
  p2Date: string;
  payment3: number;
  p3Date: string;
  finalPayment: number;
  finalDate: string;
  sisa: number;
}

export const HotelMappingView: React.FC = () => {
  const initialReadyTickets: MappingRow[] = [
    {
      id: 't1',
      packageName: 'PAKET PEJABAT #1 18 JUNI 2026 - CGK OMAN AIR',
      type: 'TICKET',
      isChecked: true,
      itemName: 'OMAN AIR (WY)',
      vendor: 'OMAN AIR / WHITESKY',
      currency: 'IDR',
      date1: '18 Jun 2026',
      date2: '26 Jun 2026',
      budget: 'IDR 14.500.000',
      quantity: '45 SEATS',
      vendorInvoice: 652500000,
      dpVendor: 50000000,
      dpDate: '10 Jan 2026',
      payment1: 200000000,
      p1Date: '15 Feb 2026',
      payment2: 200000000,
      p2Date: '15 Mar 2026',
      payment3: 0,
      p3Date: '',
      finalPayment: 0,
      finalDate: '18 May 2026',
      sisa: 202500000,
    },
    {
      id: '1',
      packageName: 'PAKET PEJABAT #1 18 JUNI 2026 - CGK OMAN AIR',
      type: 'HOTEL_MADINAH',
      isChecked: true,
      itemName: 'GRAND ZOWAR / setaraf',
      vendor: 'DIAR',
      currency: 'SAR',
      date1: '19 Jun 2026',
      date2: '22 Jun 2026',
      budget: 'SAR 450.00',
      quantity: '10 QUAD',
      vendorInvoice: 4500,
      dpVendor: 1000,
      dpDate: '20 Jan 2026',
      payment1: 500,
      p1Date: '20 Feb 2026',
      payment2: 0,
      p2Date: '',
      payment3: 0,
      p3Date: '',
      finalPayment: 0,
      finalDate: '19 May 2026',
      sisa: 3000,
    },
    {
      id: '2',
      packageName: 'PAKET PEJABAT #1 18 JUNI 2026 - CGK OMAN AIR',
      type: 'HOTEL_MAKKAH',
      isChecked: true,
      itemName: 'EMAAR ANDALUSIA / setaraf',
      vendor: 'MAYSAN / EMAAR',
      currency: 'SAR',
      date1: '22 Jun 2026',
      date2: '25 Jun 2026',
      budget: 'SAR 470.00',
      quantity: '1 QUINT',
      vendorInvoice: 470,
      dpVendor: 100,
      dpDate: '20 Jan 2026',
      payment1: 0,
      p1Date: '',
      payment2: 0,
      p2Date: '',
      payment3: 0,
      p3Date: '',
      finalPayment: 0,
      finalDate: '22 May 2026',
      sisa: 370,
    },
    {
      id: '3',
      packageName: 'PAKET BONEK KONSORSIUM 16 JULI 2026 - SUB',
      type: 'HOTEL_MADINAH',
      isChecked: true,
      itemName: 'ARKAN ALMANAR / Setaraf',
      vendor: 'MAYSAN',
      currency: 'SAR',
      date1: '16 Jul 2026',
      date2: '21 Jul 2026',
      budget: 'SAR 520.00',
      quantity: '9 QUAD',
      vendorInvoice: 4680,
      dpVendor: 2000,
      dpDate: '15 Mar 2026',
      payment1: 1000,
      p1Date: '15 Apr 2026',
      payment2: 0,
      p2Date: '',
      payment3: 0,
      p3Date: '',
      finalPayment: 0,
      finalDate: '16 Jun 2026',
      sisa: 1680,
    },
    {
      id: '4',
      packageName: 'PAKET BONEK KONSORSIUM 16 JULI 2026 - SUB',
      type: 'HOTEL_MAKKAH',
      isChecked: true,
      itemName: 'EMAAR ANDALUSIA / setaraf',
      vendor: 'MAYSAN / EMAAR',
      currency: 'SAR',
      date1: '21 Jul 2026',
      date2: '27 Jul 2026',
      budget: 'SAR 470.00',
      quantity: '2 QUINT',
      vendorInvoice: 940,
      dpVendor: 400,
      dpDate: '15 Mar 2026',
      payment1: 0,
      p1Date: '',
      payment2: 0,
      p2Date: '',
      payment3: 0,
      p3Date: '',
      finalPayment: 0,
      finalDate: '21 Jun 2026',
      sisa: 540,
    },
    {
      id: '5',
      packageName: 'PAKET KONGSI #1 - 4 AGUSTUS 2026',
      type: 'HOTEL_MADINAH',
      isChecked: true,
      itemName: 'GRAND ZOWAR / setaraf',
      vendor: 'DIAR',
      currency: 'SAR',
      date1: '05 Aug 2026',
      date2: '08 Aug 2026',
      budget: 'SAR 400.00',
      quantity: '10 QUAD',
      vendorInvoice: 4000,
      dpVendor: 1000,
      dpDate: '01 Apr 2026',
      payment1: 0,
      p1Date: '',
      payment2: 0,
      p2Date: '',
      payment3: 0,
      p3Date: '',
      finalPayment: 0,
      finalDate: '05 Jul 2026',
      sisa: 3000,
    },
    {
      id: '6',
      packageName: 'PAKET KONGSI #1 - 4 AGUSTUS 2026',
      type: 'HOTEL_MAKKAH',
      isChecked: true,
      itemName: 'LE MEREDIAN KUDAI / setaraf',
      vendor: 'DIAR',
      currency: 'SAR',
      date1: '08 Aug 2026',
      date2: '12 Aug 2026',
      budget: 'SAR 410.00',
      quantity: '10 QUAD',
      vendorInvoice: 4100,
      dpVendor: 1000,
      dpDate: '01 Apr 2026',
      payment1: 0,
      p1Date: '',
      payment2: 0,
      p2Date: '',
      payment3: 0,
      p3Date: '',
      finalPayment: 0,
      finalDate: '08 Jul 2026',
      sisa: 3100,
    },
  ];

  const initialNotReadyTickets: MappingRow[] = [
    {
      id: 'nr1',
      packageName: 'PEJABAT #2 BY INDIGO - JUNI 2026',
      type: 'HOTEL_MADINAH',
      isChecked: false,
      itemName: 'GRAND ZOWAR / setaraf',
      vendor: 'DIAR',
      currency: 'SAR',
      date1: '',
      date2: '',
      budget: 'SAR 450.00',
      quantity: '',
      vendorInvoice: 0,
      dpVendor: 0,
      dpDate: '',
      payment1: 0,
      p1Date: '',
      payment2: 0,
      p2Date: '',
      payment3: 0,
      p3Date: '',
      finalPayment: 0,
      finalDate: '',
      sisa: 0,
    },
    {
      id: 'nr2',
      packageName: 'PEJABAT #2 BY INDIGO - JUNI 2026',
      type: 'HOTEL_MAKKAH',
      isChecked: false,
      itemName: 'EMAAR ANDALUSIA / setaraf',
      vendor: 'MAYSAN / EMAAR',
      currency: 'SAR',
      date1: '',
      date2: '',
      budget: 'SAR 470.00',
      quantity: '',
      vendorInvoice: 0,
      dpVendor: 0,
      dpDate: '',
      payment1: 0,
      p1Date: '',
      payment2: 0,
      p2Date: '',
      payment3: 0,
      p3Date: '',
      finalPayment: 0,
      finalDate: '',
      sisa: 0,
    },
  ];

  const [readyTickets, setReadyTickets] = useState<MappingRow[]>(initialReadyTickets);
  const [notReadyTickets, setNotReadyTickets] = useState<MappingRow[]>(initialNotReadyTickets);

  const mappingPaketSchema = {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.ARRAY,
        description: "List of mapping items to add or update",
        items: {
          type: Type.OBJECT,
          properties: {
            packageName: { type: Type.STRING, description: "Nama paket" },
            type: { 
              type: Type.STRING, 
              enum: ['TICKET', 'HOTEL_MADINAH', 'HOTEL_MAKKAH', 'BUS', 'VISA', 'OTHER'],
              description: "Tipe komponen"
            },
            isChecked: { type: Type.BOOLEAN, description: "Apakah sudah confirmed (READY TICKET)" },
            itemName: { type: Type.STRING, description: "Nama item (Maskapai/Hotel/dll)" },
            vendor: { type: Type.STRING, description: "Nama vendor" },
            currency: { type: Type.STRING, enum: ['IDR', 'SAR', 'USD'], description: "Mata uang" },
            date1: { type: Type.STRING, description: "Tanggal mulai/keberangkatan" },
            date2: { type: Type.STRING, description: "Tanggal selesai/kepulangan" },
            budget: { type: Type.STRING, description: "Budget per unit (misal: SAR 450.00)" },
            quantity: { type: Type.STRING, description: "Kuantitas (misal: 45 SEATS, 10 QUAD)" },
            vendorInvoice: { type: Type.NUMBER, description: "Total tagihan vendor" },
            dpVendor: { type: Type.NUMBER, description: "DP yang dibayarkan" },
            dpDate: { type: Type.STRING, description: "Tanggal DP" },
            payment1: { type: Type.NUMBER, description: "Pembayaran 1" },
            p1Date: { type: Type.STRING, description: "Tanggal P1" },
            payment2: { type: Type.NUMBER, description: "Pembayaran 2" },
            p2Date: { type: Type.STRING, description: "Tanggal P2" },
            payment3: { type: Type.NUMBER, description: "Pembayaran 3" },
            p3Date: { type: Type.STRING, description: "Tanggal P3" },
            finalPayment: { type: Type.NUMBER, description: "Pelunasan" },
            finalDate: { type: Type.STRING, description: "Tanggal pelunasan" },
          }
        }
      }
    }
  };

  const mappingPaketSystemInstruction = `Anda adalah asisten AI untuk mengelola Mapping Paket Umrah. 
Tugas Anda adalah mengekstrak data dari teks atau dokumen yang diberikan dan memetakannya ke dalam struktur data Mapping Paket.
Data yang diekstrak harus mencakup detail paket, tipe komponen (TICKET, HOTEL, dll), vendor, jadwal, dan alur pembayaran (DP, P1, P2, P3, Final).
Jika isChecked bernilai true, item akan masuk ke kategori READY TICKET. Jika false, masuk ke BELUM READY TICKET.
Gunakan data context yang diberikan untuk mencocokkan nama vendor atau item jika tersedia.`;

  const handleDataParsed = (data: { items?: Partial<MappingRow>[] }) => {
    if (!data.items || !Array.isArray(data.items)) return;

    const newItems: MappingRow[] = data.items.map((item, index) => {
      const totalPaid = (item.dpVendor || 0) + (item.payment1 || 0) + (item.payment2 || 0) + (item.payment3 || 0) + (item.finalPayment || 0);
      return {
        id: `ai-${Date.now()}-${index}`,
        packageName: item.packageName || 'PAKET BARU',
        type: item.type || 'OTHER',
        isChecked: item.isChecked ?? false,
        itemName: item.itemName || '-',
        vendor: item.vendor || '-',
        currency: item.currency || (item.type === 'TICKET' ? 'IDR' : 'SAR'),
        date1: item.date1 || '',
        date2: item.date2 || '',
        budget: item.budget || '0',
        quantity: item.quantity || '-',
        vendorInvoice: item.vendorInvoice || 0,
        dpVendor: item.dpVendor || 0,
        dpDate: item.dpDate || '',
        payment1: item.payment1 || 0,
        p1Date: item.p1Date || '',
        payment2: item.payment2 || 0,
        p2Date: item.p2Date || '',
        payment3: item.payment3 || 0,
        p3Date: item.p3Date || '',
        finalPayment: item.finalPayment || 0,
        finalDate: item.finalDate || '',
        sisa: (item.vendorInvoice || 0) - totalPaid
      };
    });

    const ready = newItems.filter((item) => item.isChecked);
    const notReady = newItems.filter((item) => !item.isChecked);

    if (ready.length > 0) setReadyTickets(prev => [...prev, ...ready]);
    if (notReady.length > 0) setNotReadyTickets(prev => [...prev, ...notReady]);
  };

  const handleInputChange = (id: string, field: keyof MappingRow, value: string | number | boolean, isReady: boolean) => {
    const updateFn = (prev: MappingRow[]) => prev.map(row => {
      if (row.id === id) {
        if (typeof row[field] === 'number') {
          return { ...row, [field]: parseFloat(value as string) || 0 };
        }
        return { ...row, [field]: value };
      }
      return row;
    });

    if (isReady) {
      setReadyTickets(updateFn);
    } else {
      setNotReadyTickets(updateFn);
    }
  };

  const handleRecalculate = () => {
    const recalculateFn = (row: MappingRow) => {
      const totalPaid = row.dpVendor + row.payment1 + row.payment2 + row.payment3 + row.finalPayment;
      return { ...row, sisa: row.vendorInvoice - totalPaid };
    };

    setReadyTickets(prev => prev.map(recalculateFn));
    setNotReadyTickets(prev => prev.map(recalculateFn));
  };

  const sendWhatsAppReminder = (row: MappingRow) => {
    const message = `Halo, pengingat pembayaran untuk:\n\nPaket: ${row.packageName}\nItem: ${row.itemName}\nVendor: ${row.vendor}\nSisa Tagihan: ${row.sisa.toLocaleString()}\nTanggal: ${row.date1}\n\nMohon segera diproses. Terima kasih.`;
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
    openWhatsApp(waUrl);
  };

  const totals = useMemo(() => {
    const all = [...readyTickets, ...notReadyTickets];
    const kurs = { SAR: 4900, USD: 20000, IDR: 1 };
    
    return {
      totalBudgetIDR: all.reduce((sum, r) => sum + (r.vendorInvoice * (kurs[r.currency] || 1)), 0),
      totalSisaIDR: all.reduce((sum, r) => sum + (r.sisa * (kurs[r.currency] || 1)), 0),
      totalRooms: all.reduce((sum, r) => {
        if (r.type === 'TICKET') return sum;
        const match = r.quantity.match(/(\d+)/);
        return sum + (match ? parseInt(match[1]) : 0);
      }, 0)
    };
  }, [readyTickets, notReadyTickets]);

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const TableHeader = () => (
    <thead className="bg-gray-100 text-[10px] uppercase tracking-wider font-bold text-gray-600">
      <tr>
        <th className="px-2 py-3 border-b border-gray-200 text-left">Nama Paket</th>
        <th className="px-2 py-3 border-b border-gray-200 text-center">Tipe</th>
        <th className="px-2 py-3 border-b border-gray-200 text-center">Check</th>
        <th className="px-2 py-3 border-b border-gray-200 text-left">Item / Hotel</th>
        <th className="px-2 py-3 border-b border-gray-200 text-left">Vendor</th>
        <th className="px-2 py-3 border-b border-gray-200 text-center">Tgl 1</th>
        <th className="px-2 py-3 border-b border-gray-200 text-center">Tgl 2</th>
        <th className="px-2 py-3 border-b border-gray-200 text-right">Budget</th>
        <th className="px-2 py-3 border-b border-gray-200 text-center">Qty</th>
        <th className="px-2 py-3 border-b border-gray-200 text-right">Tagihan</th>
        <th className="px-2 py-3 border-b border-gray-200 text-right">DP & Tgl</th>
        <th className="px-2 py-3 border-b border-gray-200 text-right">P1 & Tgl</th>
        <th className="px-2 py-3 border-b border-gray-200 text-right">P2 & Tgl</th>
        <th className="px-2 py-3 border-b border-gray-200 text-right">P3 & Tgl</th>
        <th className="px-2 py-3 border-b border-gray-200 text-right">Final & Tgl</th>
        <th className="px-2 py-3 border-b border-gray-200 text-right bg-emerald-50 text-emerald-700">Sisa</th>
        <th className="px-2 py-3 border-b border-gray-200 text-center">WA</th>
      </tr>
    </thead>
  );

  const renderRows = (data: MappingRow[], isReady: boolean) => {
    return data.map((row, index) => {
      const isFirstOfPackage = index === 0 || data[index - 1].packageName !== row.packageName;
      const packageRows = data.filter(r => r.packageName === row.packageName).length;

      const inputClass = "w-16 px-1 py-0.5 border border-gray-200 rounded text-right font-mono focus:ring-1 focus:ring-blue-500 outline-none text-[10px]";
      const dateInputClass = "w-20 px-1 py-0.5 border border-gray-200 rounded text-center font-mono focus:ring-1 focus:ring-blue-500 outline-none text-[9px] mt-1";

      const getTypeColor = (type: string) => {
        switch (type) {
          case 'TICKET': return 'text-blue-700 bg-blue-50';
          case 'HOTEL_MADINAH': return 'text-amber-700 bg-amber-50';
          case 'HOTEL_MAKKAH': return 'text-purple-700 bg-purple-50';
          default: return 'text-gray-700 bg-gray-50';
        }
      };

      return (
        <tr key={row.id} className="hover:bg-gray-50 text-[11px] border-b border-gray-100">
          {isFirstOfPackage ? (
            <td className="px-2 py-3 font-bold text-blue-800 align-top max-w-[150px]" rowSpan={packageRows}>
              {row.packageName}
            </td>
          ) : null}
          <td className="px-2 py-3 text-center">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${getTypeColor(row.type)}`}>
              {row.type.replace('_', ' ')}
            </span>
          </td>
          <td className="px-2 py-3 text-center">
            {row.isChecked ? (
              <CheckSquare className="w-4 h-4 text-emerald-500 mx-auto" />
            ) : (
              <Square className="w-4 h-4 text-gray-300 mx-auto" />
            )}
          </td>
          <td className="px-2 py-3 text-gray-700 font-medium">{row.itemName}</td>
          <td className="px-2 py-3 text-gray-600 font-medium">{row.vendor}</td>
          <td className="px-2 py-3 text-center whitespace-nowrap">{row.date1 || '-'}</td>
          <td className="px-2 py-3 text-center whitespace-nowrap">{row.date2 || '-'}</td>
          <td className="px-2 py-3 text-right font-mono text-rose-600 whitespace-nowrap">{row.budget}</td>
          <td className="px-2 py-3 text-center font-bold">{row.quantity || '-'}</td>
          <td className="px-2 py-3 text-right">
            <input 
              type="number" 
              className={inputClass} 
              value={row.vendorInvoice} 
              onChange={(e) => handleInputChange(row.id, 'vendorInvoice', e.target.value, isReady)}
            />
          </td>
          <td className="px-2 py-3 text-right">
            <div className="flex flex-col items-end">
              <input 
                type="number" 
                className={inputClass} 
                value={row.dpVendor} 
                onChange={(e) => handleInputChange(row.id, 'dpVendor', e.target.value, isReady)}
              />
              <input 
                type="text" 
                placeholder="Tgl DP"
                className={dateInputClass} 
                value={row.dpDate} 
                onChange={(e) => handleInputChange(row.id, 'dpDate', e.target.value, isReady)}
              />
            </div>
          </td>
          <td className="px-2 py-3 text-right">
            <div className="flex flex-col items-end">
              <input 
                type="number" 
                className={inputClass} 
                value={row.payment1} 
                onChange={(e) => handleInputChange(row.id, 'payment1', e.target.value, isReady)}
              />
              <input 
                type="text" 
                placeholder="Tgl P1"
                className={dateInputClass} 
                value={row.p1Date} 
                onChange={(e) => handleInputChange(row.id, 'p1Date', e.target.value, isReady)}
              />
            </div>
          </td>
          <td className="px-2 py-3 text-right">
            <div className="flex flex-col items-end">
              <input 
                type="number" 
                className={inputClass} 
                value={row.payment2} 
                onChange={(e) => handleInputChange(row.id, 'payment2', e.target.value, isReady)}
              />
              <input 
                type="text" 
                placeholder="Tgl P2"
                className={dateInputClass} 
                value={row.p2Date} 
                onChange={(e) => handleInputChange(row.id, 'p2Date', e.target.value, isReady)}
              />
            </div>
          </td>
          <td className="px-2 py-3 text-right">
            <div className="flex flex-col items-end">
              <input 
                type="number" 
                className={inputClass} 
                value={row.payment3} 
                onChange={(e) => handleInputChange(row.id, 'payment3', e.target.value, isReady)}
              />
              <input 
                type="text" 
                placeholder="Tgl P3"
                className={dateInputClass} 
                value={row.p3Date} 
                onChange={(e) => handleInputChange(row.id, 'p3Date', e.target.value, isReady)}
              />
            </div>
          </td>
          <td className="px-2 py-3 text-right">
            <div className="flex flex-col items-end">
              <input 
                type="number" 
                className={inputClass} 
                value={row.finalPayment} 
                onChange={(e) => handleInputChange(row.id, 'finalPayment', e.target.value, isReady)}
              />
              <input 
                type="text" 
                placeholder="Tgl Final"
                className={dateInputClass} 
                value={row.finalDate} 
                onChange={(e) => handleInputChange(row.id, 'finalDate', e.target.value, isReady)}
              />
            </div>
          </td>
          <td className="px-2 py-3 text-right font-mono bg-emerald-50/50 text-emerald-700 font-bold">
            {row.sisa.toLocaleString()}
          </td>
          <td className="px-2 py-3 text-center">
            <button 
              onClick={() => sendWhatsAppReminder(row)}
              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
              title="Send WhatsApp Reminder"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg">
            <Hotel className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mapping Paket</h1>
            <p className="text-sm text-gray-500">Summary & Payment Flow Allocation</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleRecalculate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
          >
            <Calculator className="w-4 h-4" />
            Recalculate Sisa
          </button>
        </div>
      </div>

      <AIPromptInput 
        onDataParsed={handleDataParsed}
        schema={mappingPaketSchema}
        systemInstruction={mappingPaketSystemInstruction}
        placeholder="Ketik prompt di sini (contoh: Tambahkan mapping hotel Madinah untuk paket Pejabat #2, vendor Diar, budget SAR 450, check-in 20 Juni...)"
        contextData={{
          existingPackages: [...readyTickets, ...notReadyTickets].map(r => r.packageName),
          types: ['TICKET', 'HOTEL_MADINAH', 'HOTEL_MAKKAH', 'BUS', 'VISA', 'OTHER']
        }}
      />

      <div className="space-y-8">
        {/* Ready Ticket Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-emerald-800">READY TICKET</h2>
            </div>
            <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Confirmed
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <TableHeader />
              <tbody>
                {renderRows(readyTickets, true)}
              </tbody>
            </table>
          </div>
        </div>

        {/* Belum Ready Ticket Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              <h2 className="font-bold text-amber-800">BELUM READY TICKET</h2>
            </div>
            <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Pending
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <TableHeader />
              <tbody>
                {renderRows(notReadyTickets, false)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Total Budget (IDR)</h3>
          <p className="text-2xl font-black text-rose-600">{formatIDR(totals.totalBudgetIDR)}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
            <TrendingUpIcon className="w-4 h-4 text-emerald-500" />
            <span>Converted with Kurs SAR 4.900 & USD 20.000</span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Total Kamar (QUAD)</h3>
          <p className="text-3xl font-black text-amber-600">{totals.totalRooms} Rooms</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
            <Hotel className="w-4 h-4 text-amber-500" />
            <span>Across all packages</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Vendor Outstanding (IDR)</h3>
          <p className="text-2xl font-black text-emerald-600">{formatIDR(totals.totalSisaIDR)}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span>Total remaining balance in IDR</span>
          </div>
        </div>
      </div>
    </div>
  );
};
