import React, { useState, useRef, useEffect } from 'react';
import { Calendar, RefreshCw, Download, MapPin, DollarSign, Bus } from 'lucide-react';
import { captureToDataUrl } from '../utils/exportUtils';
import { transportData } from '../data/transport';
import { AIPromptInput } from './AIPromptInput';
import { Type } from '../types';
import { logoBase64 } from '../utils/logoBase64';
import { useKurs } from '../hooks/useKurs';

export const TransportTemplateView: React.FC = () => {
  const { kurs: masterKurs, loading: masterKursLoading } = useKurs();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('gmc');
  const [kurs, setKurs] = useState<number>(4900);

  useEffect(() => {
    if (!masterKursLoading && masterKurs) {
      setKurs(masterKurs.sarToIdr);
    }
  }, [masterKurs, masterKursLoading]);
  const [marginPercent, setMarginPercent] = useState<number>(40);
  const [currency, setCurrency] = useState<'SAR' | 'IDR'>('IDR');
  const printRef = useRef<HTMLDivElement>(null);

  const [tableRows, setTableRows] = useState(Array(15).fill({ harga: '', rute: '' }));

  const transportSchema = {
    type: Type.OBJECT,
    properties: {
      selectedDate: { type: Type.STRING, description: "Tanggal keberangkatan dalam format YYYY-MM-DD" },
      selectedVehicleId: { type: Type.STRING, description: "ID Kendaraan (gmc, hiace, coaster, bus)" },
      marginPercent: { type: Type.NUMBER, description: "Persentase margin keuntungan" },
      currency: { type: Type.STRING, description: "Mata uang (IDR atau SAR)" }
    }
  };

  const transportSystemInstruction = "Anda adalah asisten AI untuk mengisi form Pricelist Transportasi Umrah. Ekstrak informasi dari teks yang diberikan pengguna dan kembalikan dalam format JSON sesuai schema. Jika ada informasi yang tidak disebutkan, biarkan kosong atau gunakan nilai default yang masuk akal.";

  const handleDataParsed = (data: { selectedDate?: string; selectedVehicleId?: string; marginPercent?: number; currency?: string }) => {
    if (data.selectedDate) setSelectedDate(data.selectedDate);
    if (data.selectedVehicleId) setSelectedVehicleId(data.selectedVehicleId);
    if (data.marginPercent !== undefined) setMarginPercent(data.marginPercent);
    if (data.currency) setCurrency(data.currency as 'SAR' | 'IDR');
  };

  const formatPrice = (amount: number) => {
    if (currency === 'IDR') {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }
  };

  const autoFillData = () => {
    const vehicle = transportData.find(v => v.id === selectedVehicleId);
    if (!vehicle) return;

    const newRows = vehicle.routes.map(route => {
      // Calculate selling price
      let basePrice = route.price;
      
      // Add margin
      basePrice = basePrice * (1 + marginPercent / 100);
      
      // Convert to IDR if needed
      if (currency === 'IDR') {
        basePrice = basePrice * kurs;
      }

      return {
        harga: formatPrice(Math.round(basePrice)),
        rute: route.route
      };
    });

    // Pad with empty rows if needed to maintain a consistent look
    const paddedRows = [...newRows];
    while (paddedRows.length < 15) {
      paddedRows.push({ harga: '', rute: '' });
    }

    setTableRows(paddedRows);
  };

  // Auto-fill on mount and when dependencies change
  useEffect(() => {
    autoFillData();
  }, [selectedVehicleId, kurs, marginPercent, currency]);

  const handleRowChange = (index: number, field: 'harga' | 'rute', value: string) => {
    const newRows = [...tableRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setTableRows(newRows);
  };

  const handleDownloadImage = async () => {
    if (!printRef.current) return;
    setIsGeneratingImage(true);
    
    try {
      // Ensure input values are captured by temporarily putting them in value attributes
      const inputs = printRef.current.querySelectorAll('input, textarea');
      inputs.forEach((input: Element) => {
        const el = input as HTMLInputElement | HTMLTextAreaElement;
        el.setAttribute('value', el.value);
        if (el.tagName === 'TEXTAREA') {
          el.textContent = el.value;
        }
      });

      const dataUrl = await captureToDataUrl(printRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      const vehicleName = transportData.find(v => v.id === selectedVehicleId)?.name || 'Transport';
      const filename = `PriceList_${vehicleName}_${selectedDate || 'Draft'}.jpg`;
      
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
    } catch (error) {
      console.error('Image generation failed:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const selectedVehicleName = transportData.find(v => v.id === selectedVehicleId)?.name || '';

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center gap-6 print:p-0 print:bg-white print:block">
      
      <div className="w-full max-w-[210mm]">
        <AIPromptInput 
          onDataParsed={handleDataParsed} 
          schema={transportSchema} 
          systemInstruction={transportSystemInstruction} 
          placeholder="Ketik prompt di sini (contoh: Buatkan pricelist transportasi Hiace untuk tanggal 12 Desember dengan margin 30%...)"
          contextData={{
            transport: transportData.map(t => ({ id: t.id, name: t.name }))
          }}
        />
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 w-full max-w-[210mm] flex flex-col gap-4 print:hidden">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Bus className="text-gray-500 w-5 h-5" />
            <span className="font-medium text-gray-700">Kendaraan:</span>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {transportData.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="text-gray-500 w-5 h-5" />
            <span className="font-medium text-gray-700">Periode:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none w-36"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <DollarSign className="text-gray-500 w-5 h-5" />
            <span className="font-medium text-gray-700">Currency:</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'SAR' | 'IDR')}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="SAR">SAR</option>
              <option value="IDR">IDR</option>
            </select>
          </div>

          {currency === 'IDR' && (
            <div className="flex items-center gap-2">
              <RefreshCw className="text-gray-500 w-5 h-5" />
              <span className="font-medium text-gray-700">Kurs:</span>
              <input
                type="number"
                value={kurs}
                onChange={(e) => setKurs(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none w-28"
              />
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <DollarSign className="text-gray-500 w-5 h-5" />
            <span className="font-medium text-gray-700">Margin (%):</span>
            <input
              type="number"
              value={marginPercent}
              onChange={(e) => setMarginPercent(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none w-20"
            />
          </div>
        </div>
        
        <div className="flex justify-end">
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
      <div ref={printRef} className="w-[210mm] min-h-[297mm] bg-[#FDB913] shadow-2xl relative text-gray-900 font-sans flex flex-col print:shadow-none print:m-0 border-4 border-purple-500 p-8">
        
        {/* Background Pattern (Subtle) */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start relative z-10 mb-8">
          <div className="flex flex-col">
             {/* Logo */}
            <div className="flex items-center gap-3 mb-2">
               <img src={logoBase64} alt="Umaroh Logo" className="h-14" />
            </div>
            <p className="text-[10px] italic font-semibold ml-1 tracking-wide">Platform Digital Umrah & Haji Pertama di Indonesia</p>
          </div>
          
          <div className="border-l-2 border-gray-900 pl-6 py-1">
            <h1 className="text-2xl font-bold leading-tight">Price List</h1>
            <h2 className="text-2xl font-bold leading-tight mb-2">Transportasi</h2>
            <div className="border-b-2 border-gray-900 w-full mb-2"></div>
            <h3 className="text-xl font-bold">
              {selectedDate ? new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Periode'}
            </h3>
          </div>
        </div>

        {/* Vehicle Title */}
        <div className="relative z-10 mb-2 flex justify-between items-end">
          <h2 className="text-2xl font-bold uppercase">{selectedVehicleName}</h2>
          <span className="text-xs font-bold uppercase bg-gray-900 text-[#FDB913] px-2 py-1 rounded">
            Vendor: {transportData.find(v => v.id === selectedVehicleId)?.namaVendor || ''}
          </span>
        </div>

        {/* Table Section */}
        <div className="relative z-10 flex-grow">
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr className="bg-gray-900 text-[#FDB913] text-center font-bold uppercase text-sm tracking-wider">
                <th className="p-3 border-r border-gray-700 w-1/3">HARGA</th>
                <th className="p-3 w-2/3">RUTE</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, index) => (
                <tr key={index} className="border-b border-gray-200 text-center">
                  <td className="border-r border-gray-200 p-0 h-10">
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-center outline-none font-medium text-sm"
                      value={row.harga}
                      onChange={(e) => handleRowChange(index, 'harga', e.target.value)}
                    />
                  </td>
                  <td className="p-0 h-10 px-4">
                    <input
                      type="text"
                      className="w-full h-full bg-transparent outline-none font-medium text-sm text-left"
                      value={row.rute}
                      onChange={(e) => handleRowChange(index, 'rute', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Contact Bar */}
        <div className="mt-auto px-2 pt-4 pb-4 flex justify-between items-end relative z-10 border-t border-gray-900/20">
            <div>
                <h4 className="font-bold text-xl uppercase mb-1">Call admin Ops</h4>
                <div className="font-bold text-lg tracking-wide">+62 838 4497 4952</div>
            </div>

            <div className="text-left max-w-[250px] text-[10px] font-bold leading-tight">
                <div className="flex items-start gap-2">
                    <MapPin className="w-6 h-6 flex-shrink-0 fill-gray-900 text-[#FDB913]" />
                    <p>Jl. Tangkuban Prahu No.7, Babakan, Bogor Tengah, Kota Bogor, Jawa Barat 16128</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
