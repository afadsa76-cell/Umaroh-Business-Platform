import React, { useState, useRef, useEffect } from 'react';
import { Calendar, RefreshCw, Download, Users, DollarSign, MapPin } from 'lucide-react';
import { captureToDataUrl } from '../utils/exportUtils';
import { AIPromptInput } from './AIPromptInput';
import { Type } from '@google/genai';
import { logoBase64 } from '../utils/logoBase64';

export const MutawifTemplateView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [hargaAsing, setHargaAsing] = useState<number>(300);
  const [jumlahHari, setJumlahHari] = useState<number>(8);
  const [kurs, setKurs] = useState<number>(4700);
  const [persentase, setPersentase] = useState<number>(80);
  const [maxPax, setMaxPax] = useState<number>(50);
  const [currency, setCurrency] = useState<'SAR' | 'IDR'>('IDR');
  const printRef = useRef<HTMLDivElement>(null);

  const [tableRows, setTableRows] = useState<{ item: string; pax: string; hari: string; harga: string }[]>([]);

  const mutawifSchema = {
    type: Type.OBJECT,
    properties: {
      selectedDate: { type: Type.STRING, description: "Tanggal keberangkatan dalam format YYYY-MM-DD" },
      hargaAsing: { type: Type.NUMBER, description: "Harga asing/vendor dalam SAR" },
      jumlahHari: { type: Type.NUMBER, description: "Jumlah hari" },
      persentase: { type: Type.NUMBER, description: "Persentase margin keuntungan" },
      maxPax: { type: Type.NUMBER, description: "Maksimal jumlah pax" },
      currency: { type: Type.STRING, description: "Mata uang (IDR atau SAR)" }
    }
  };

  const mutawifSystemInstruction = "Anda adalah asisten AI untuk mengisi form Pricelist Mutawif Umrah. Ekstrak informasi dari teks yang diberikan pengguna dan kembalikan dalam format JSON sesuai schema. Jika ada informasi yang tidak disebutkan, biarkan kosong atau gunakan nilai default yang masuk akal.";

  const handleDataParsed = (data: { selectedDate?: string; hargaAsing?: number; jumlahHari?: number; persentase?: number; maxPax?: number; currency?: string }) => {
    if (data.selectedDate) setSelectedDate(data.selectedDate);
    if (data.hargaAsing !== undefined) setHargaAsing(data.hargaAsing);
    if (data.jumlahHari !== undefined) setJumlahHari(data.jumlahHari);
    if (data.persentase !== undefined) setPersentase(data.persentase);
    if (data.maxPax !== undefined) setMaxPax(data.maxPax);
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
    const data = [];
    const totalHargaBeli = hargaAsing * jumlahHari * kurs;

    for (let pax = 1; pax <= maxPax; pax++) {
      const hargaBeli = totalHargaBeli / pax;
      const margin = hargaBeli * (persentase / 100);
      let hargaJual = hargaBeli + margin;

      if (currency === 'SAR') {
          hargaJual = hargaJual / kurs;
      }

      data.push({
        item: 'MUTAWIF + TRANSPORTASI',
        pax: pax.toString(),
        hari: jumlahHari.toString(),
        harga: formatPrice(Math.round(hargaJual)),
      });
    }

    setTableRows(data);
  };

  // Auto-fill on mount and when dependencies change
  useEffect(() => {
    autoFillData();
  }, [hargaAsing, jumlahHari, kurs, persentase, maxPax, currency]);

  const handleRowChange = (index: number, field: 'item' | 'pax' | 'hari' | 'harga', value: string) => {
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
      
      const filename = `PriceList_Mutawif_${selectedDate || 'Draft'}.jpg`;
      
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

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center gap-6 print:p-0 print:bg-white print:block">
      <div className="w-full max-w-[210mm]">
        <AIPromptInput 
          onDataParsed={handleDataParsed} 
          schema={mutawifSchema} 
          systemInstruction={mutawifSystemInstruction} 
          placeholder="Ketik prompt di sini (contoh: Buatkan pricelist mutawif untuk 8 hari dengan harga vendor 300 SAR dan margin 80%...)"
        />
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 w-full max-w-[210mm] flex flex-col gap-4 print:hidden">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="text-gray-500 w-5 h-5" />
            <span className="font-medium text-gray-700">Harga Asing:</span>
            <input 
              type="number" 
              min="1"
              value={hargaAsing} 
              onChange={(e) => setHargaAsing(Math.max(1, parseInt(e.target.value) || 0))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none w-28"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Jml Hari:</span>
            <input 
              type="number" 
              min="1"
              value={jumlahHari} 
              onChange={(e) => setJumlahHari(Math.max(1, parseInt(e.target.value) || 0))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none w-20"
            />
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
              value={persentase}
              onChange={(e) => setPersentase(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none w-20"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Max Pax:</span>
            <input
              type="number"
              value={maxPax}
              onChange={(e) => setMaxPax(Number(e.target.value))}
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
            <h2 className="text-2xl font-bold leading-tight mb-2">Mutawif</h2>
            <div className="border-b-2 border-gray-900 w-full mb-2"></div>
            <h3 className="text-xl font-bold">
              {selectedDate ? new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Periode'}
            </h3>
          </div>
        </div>

        {/* Table Section */}
        <div className="relative z-10 flex-grow mt-4">
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr className="bg-gray-900 text-[#FDB913] text-center font-bold uppercase text-sm tracking-wider">
                <th className="p-3 border-r border-gray-700 w-2/5">ITEM</th>
                <th className="p-3 border-r border-gray-700 w-1/5">PAX</th>
                <th className="p-3 border-r border-gray-700 w-1/5">HARI</th>
                <th className="p-3 w-1/5">HARGA</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, index) => (
                <tr key={index} className="border-b border-gray-200 text-center">
                  <td className="border-r border-gray-200 p-0 h-10 px-4">
                    <input
                      type="text"
                      className="w-full h-full bg-transparent outline-none font-medium text-sm text-left"
                      value={row.item}
                      onChange={(e) => handleRowChange(index, 'item', e.target.value)}
                    />
                  </td>
                  <td className="border-r border-gray-200 p-0 h-10">
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-center outline-none font-medium text-sm"
                      value={row.pax}
                      onChange={(e) => handleRowChange(index, 'pax', e.target.value)}
                    />
                  </td>
                  <td className="border-r border-gray-200 p-0 h-10">
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-center outline-none font-medium text-sm"
                      value={row.hari}
                      onChange={(e) => handleRowChange(index, 'hari', e.target.value)}
                    />
                  </td>
                  <td className="p-0 h-10">
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-center outline-none font-medium text-sm"
                      value={row.harga}
                      onChange={(e) => handleRowChange(index, 'harga', e.target.value)}
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
