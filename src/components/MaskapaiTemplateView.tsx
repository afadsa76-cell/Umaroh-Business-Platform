import React, { useState, useRef } from 'react';
import { Download, RefreshCw, MapPin, Search } from 'lucide-react';
import { captureToDataUrl } from '../utils/exportUtils';
import { maskapaiData } from '../data/maskapai';
import { AIPromptInput } from './AIPromptInput';
import { Type } from '@google/genai';
import { logoBase64 } from '../utils/logoBase64';

import { INDONESIA_EMBARKASI } from '../constants';

export const MaskapaiTemplateView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState('');
  const [creationDate, setCreationDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterDate, setFilterDate] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const maskapaiSchema = {
    type: Type.OBJECT,
    properties: {
      searchTerm: { type: Type.STRING, description: "Kata kunci pencarian maskapai atau rute" },
      selectedVendor: { type: Type.STRING, description: "Nama vendor penyedia tiket" },
      creationDate: { type: Type.STRING, description: "Tanggal cetak dalam format YYYY-MM-DD" }
    }
  };

  const maskapaiSystemInstruction = "Anda adalah asisten AI untuk mengisi form Pricelist Maskapai Umrah. Ekstrak informasi dari teks yang diberikan pengguna dan kembalikan dalam format JSON sesuai schema. Jika ada informasi yang tidak disebutkan, biarkan kosong atau gunakan nilai default yang masuk akal.";

  const handleDataParsed = (data: { searchTerm?: string; selectedVendor?: string; creationDate?: string }) => {
    if (data.searchTerm) setSearchTerm(data.searchTerm);
    if (data.selectedVendor) setSelectedVendor(data.selectedVendor);
    if (data.creationDate) setCreationDate(data.creationDate);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const vendors = Array.from(new Set(maskapaiData.map(item => item.namaVendor).filter(Boolean))).sort();

  const filteredData = [...maskapaiData]
    .filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.originCityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.destinationCityName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesOrigin = selectedOrigin === '' || (
        item.originCityName.toLowerCase() === selectedOrigin.toLowerCase() ||
        item.originCityName.toLowerCase().startsWith(selectedOrigin.toLowerCase() + " (")
      );

      const hasEnoughSeats = item.availableSeats > 15;

      const matchesVendor = selectedVendor === '' || item.namaVendor === selectedVendor;

      let matchesDate = true;
      if (filterDate) {
        const startDate = new Date(filterDate);
        const endDate = new Date(filterDate);
        endDate.setMonth(endDate.getMonth() + 3);
        
        const itemDate = new Date(item.tanggalKeberangkatan);
        matchesDate = itemDate >= startDate && itemDate <= endDate;
      }
      
      return matchesSearch && matchesOrigin && hasEnoughSeats && matchesDate && matchesVendor;
    })
    .sort((a, b) => {
      const dateA = new Date(a.tanggalKeberangkatan).getTime();
      const dateB = new Date(b.tanggalKeberangkatan).getTime();
      return dateA - dateB;
    })
    .slice(0, 10);

  const handleDownloadImage = async () => {
    if (!printRef.current) return;
    setIsGeneratingImage(true);
    
    try {
      const dataUrl = await captureToDataUrl(printRef.current, {
        pixelRatio: 2,
        backgroundColor: '#FDB913'
      });
      
      const filename = `PriceList_Maskapai_${new Date().toISOString().split('T')[0]}.jpg`;
      
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        
        const base64Data = dataUrl.split(',')[1];
        const result = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache
        });

        await Share.share({
          title: filename,
          url: result.uri
        });
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        link.click();
      }
    } catch (_error) {
      console.error('Image generation failed:', _error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center gap-6 print:p-0 print:bg-white print:block">
      
      <div className="w-full max-w-[210mm]">
        <AIPromptInput 
          onDataParsed={handleDataParsed} 
          schema={maskapaiSchema} 
          systemInstruction={maskapaiSystemInstruction} 
          placeholder="Ketik prompt di sini (contoh: Cari maskapai Garuda untuk tanggal 12 Desember...)"
          contextData={{
            maskapai: maskapaiData.map(m => ({ name: m.name, originCityName: m.originCityName, destinationCityName: m.destinationCityName }))
          }}
        />
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 w-full max-w-[210mm] flex flex-col gap-4 print:hidden">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-grow relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari maskapai atau rute..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700 whitespace-nowrap">Keberangkatan:</span>
            <select
              value={selectedOrigin}
              onChange={(e) => setSelectedOrigin(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none bg-white min-w-[150px]"
            >
              <option value="">Seluruh Indonesia</option>
              {INDONESIA_EMBARKASI.map(emb => (
                <option key={emb.kode} value={emb.kota}>{emb.kota} ({emb.kode})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700 whitespace-nowrap">Vendor:</span>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none bg-white min-w-[150px]"
            >
              <option value="">Semua Vendor</option>
              {vendors.map(vendor => (
                <option key={vendor} value={vendor}>{vendor}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700 whitespace-nowrap">Filter Tgl:</span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700 whitespace-nowrap">Tanggal Cetak:</span>
            <input
              type="date"
              value={creationDate}
              onChange={(e) => setCreationDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          
          <button 
            onClick={handleDownloadImage}
            disabled={isGeneratingImage}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingImage ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isGeneratingImage ? 'Generating JPG...' : 'Download JPG'}
          </button>
        </div>
      </div>

      {/* A4 Aspect Ratio Container */}
      <div ref={printRef} className="w-[210mm] min-h-[297mm] bg-[#FDB913] shadow-2xl relative text-gray-900 font-sans flex flex-col print:shadow-none print:m-0 border-4 border-gray-900 p-8">
        
        {/* Background Pattern (Subtle) */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start relative z-10 mb-10">
          <div className="flex flex-col">
             {/* Logo */}
            <div className="flex items-center gap-3 mb-2">
               <img src={logoBase64} alt="Umaroh Logo" className="h-14" />
            </div>
            <p className="text-[10px] italic font-semibold ml-1 tracking-wide">Platform Digital Umrah & Haji Pertama di Indonesia</p>
          </div>
          
          <div className="border-l-2 border-gray-900 pl-6 py-1">
            <h1 className="text-2xl font-bold leading-tight">Price List</h1>
            <h2 className="text-2xl font-bold leading-tight mb-2">Tiket Pesawat</h2>
            <div className="border-b-2 border-gray-900 w-full mb-2"></div>
            <h3 className="text-xl font-bold">
              {creationDate && !isNaN(new Date(creationDate).getTime()) ? new Date(creationDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
            </h3>
          </div>
        </div>

        {/* Tables Section */}
        <div className="relative z-10 flex-grow">
          <div className="bg-white overflow-hidden rounded-lg border-2 border-gray-900">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-900 text-[#FDB913] text-center font-bold uppercase text-xs tracking-wider">
                  <th className="p-3 border-r border-gray-700 text-left pl-4">MASKAPAI & RUTE</th>
                  <th className="p-3 border-r border-gray-700 w-32">PERIODE</th>
                  <th className="p-3 border-r border-gray-700 w-20">PROG</th>
                  <th className="p-3 border-r border-gray-700 w-20">SISA SEAT</th>
                  <th className="p-3 w-32">HARGA JUAL</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr key={item.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="border-r border-gray-200 p-3">
                      <div className="font-bold text-sm text-gray-900">{item.name}</div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {item.originCityName} → {item.destinationCityName}
                      </div>
                    </td>
                    <td className="border-r border-gray-200 p-3 text-center">
                      <div className="text-[10px] font-bold text-gray-700">
                        {item.tanggalKeberangkatan && !isNaN(new Date(item.tanggalKeberangkatan).getTime()) ? new Date(item.tanggalKeberangkatan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </div>
                      <div className="text-[10px] text-gray-400">s/d</div>
                      <div className="text-[10px] font-bold text-gray-700">
                        {item.tanggalKepulangan && !isNaN(new Date(item.tanggalKepulangan).getTime()) ? new Date(item.tanggalKepulangan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </div>
                    </td>
                    <td className="border-r border-gray-200 p-3 text-center font-bold text-sm">
                      {item.programDays}D
                    </td>
                    <td className="border-r border-gray-200 p-3 text-center font-bold text-sm text-emerald-600">
                      {item.availableSeats}
                    </td>
                    <td className="p-3 text-right font-bold text-base text-amber-600">
                      {formatCurrency(item.hargaJual)}
                    </td>
                  </tr>
                ))}
                {/* Fill empty rows to maintain height if needed */}
                {Array.from({ length: Math.max(0, 10 - filteredData.length) }).map((_, i) => (
                  <tr key={`empty-${i}`} className="border-b border-gray-200 h-16">
                    <td className="border-r border-gray-200"></td>
                    <td className="border-r border-gray-200"></td>
                    <td className="border-r border-gray-200"></td>
                    <td className="border-r border-gray-200"></td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Note */}
          <div className="mt-4 p-5 bg-gray-900 text-[#FDB913] rounded-lg shadow-inner">
            <h4 className="font-bold text-sm mb-3 uppercase border-b border-[#FDB913]/30 pb-2 tracking-wide">SYARAT & KETENTUAN TIKET PESAWAT UMROH</h4>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[10px] leading-relaxed font-medium">
              <div className="space-y-2">
                <p>a. Harga tiket sewaktu-waktu dapat berubah mengikuti perubahan tax, kurs, dan kebijakan maskapai pada saat issued tiket.</p>
                <p>b. Deposit pembayaran sesuai ketentuan masing-masing maskapai dan bersifat NON REFUNDABLE serta NON TRANSFERABLE.</p>
                <p>c. Deposit dianggap sah setelah adanya konfirmasi seat dari pihak maskapai atau wholesaler.</p>
                <p>d. Pelunasan wajib dilakukan maksimal 35 hari sebelum tanggal keberangkatan, kecuali terdapat ketentuan lain dari maskapai.</p>
                <p>e. Penggantian nama, perubahan tanggal, perubahan rute, maupun pindah PNR mengikuti aturan maskapai terkait dan dapat dikenakan biaya tambahan.</p>
                <p>f. Seat yang sudah dikonfirmasi namun dibatalkan oleh pihak jamaah setelah pembayaran deposit akan dikenakan penalti sesuai kebijakan maskapai.</p>
                <p>g. Harga yang tercantum merupakan estimasi harga publish/group dan dapat berubah mengikuti ketersediaan seat.</p>
              </div>
              <div className="space-y-2">
                <p>h. Tiket yang telah issued umumnya bersifat: <b>FIX DATE, FIX FLIGHT, NON REROUTE, NON REFUND.</b></p>
                <p>i. Ketersediaan seat bersifat dinamis dan dapat berubah sewaktu-waktu tanpa pemberitahuan terlebih dahulu.</p>
                <p>j. Penambahan maupun pengurangan jumlah seat setelah deadline materialisasi dapat dikenakan penalti sesuai aturan maskapai.</p>
                <p>k. Permintaan special meal, tambahan bagasi, wheel chair, maupun kebutuhan khusus lainnya wajib diinformasikan sebelum issued tiket.</p>
                <p>l. Pihak travel tidak bertanggung jawab atas perubahan jadwal penerbangan, delay, reschedule, maupun pembatalan penerbangan yang dilakukan maskapai.</p>
                <p>m. Jamaah wajib memastikan dokumen perjalanan seperti paspor and visa sudah valid sesuai ketentuan keberangkatan.</p>
                <p>n. Dengan melakukan pembayaran deposit, jamaah dianggap telah membaca, memahami, dan menyetujui seluruh syarat dan ketentuan yang berlaku.</p>
              </div>
            </div>
            
            <div className="mt-5 pt-3 border-t border-[#FDB913]/30">
              <h4 className="font-bold text-xs mb-2 uppercase tracking-wide">KETENTUAN PENALTI:</h4>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[10px] leading-relaxed font-medium">
                <p>1. Pembatalan setelah pembayaran deposit akan dikenakan potongan sesuai nominal deposit yang telah dibayarkan.</p>
                <p>2. Pembatalan setelah tiket issued dapat dikenakan biaya penalti hingga FULL TICKET sesuai aturan maskapai.</p>
                <p>3. Pengurangan jumlah pax after proses materialisasi atau blocking seat dapat dikenakan biaya penalti per seat.</p>
                <p>4. Seluruh biaya penalti mengikuti kebijakan maskapai dan partner ticketing yang berlaku saat proses berlangsung.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Contact Bar */}
        <div className="mt-8 pt-6 flex justify-between items-end relative z-10 border-t-2 border-gray-900">
            <div>
                <h4 className="font-bold text-xl uppercase mb-1">Call admin Ops</h4>
                <div className="font-bold text-lg tracking-wide">+62 838 4497 4952</div>
            </div>

            <div className="text-left max-w-[250px] text-[10px] font-bold leading-tight">
                <div className="flex items-start gap-2">
                    <MapPin className="w-6 h-6 flex-shrink-0 fill-gray-900 text-[#FDB913]" />
                    <p>Jl. Tangkuban Prahu No.7, RT.01/RW.05, Babakan, Kecamatan Bogor Tengah, Kota Bogor, Jawa Barat 16128</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
