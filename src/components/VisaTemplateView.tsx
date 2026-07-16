import React, { useState, useRef, useEffect } from 'react';
import { Calendar, RefreshCw, Download, MapPin, DollarSign, Wand2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { captureToDataUrl } from '../utils/exportUtils';
import { visaData } from '../data/visa';
import { transportData } from '../data/transport';
import { AIPromptInput } from './AIPromptInput';
import { Type } from '../types';
import { logoBase64 } from '../utils/logoBase64';
import { useKurs } from '../hooks/useKurs';

export const VisaTemplateView: React.FC = () => {
  const { kurs: masterKurs, loading: masterKursLoading } = useKurs();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [totalPax, setTotalPax] = useState<number>(45);
  const [currency, setCurrency] = useState<'IDR' | 'USD' | 'SAR'>('IDR');
  const [includeTransport, setIncludeTransport] = useState(false);
  const [transportType, setTransportType] = useState<string>('BUS');
  const [transportRoute, setTransportRoute] = useState<string>('Full Trip (Jed - Mak - CT Mak - CT Mad - Mad)');
  const [kurs, setKurs] = useState<number>(20000); // Default USD to IDR
  const [kursSar, setKursSar] = useState<number>(4900); // Default SAR to IDR

  useEffect(() => {
    if (!masterKursLoading && masterKurs) {
      setKurs(masterKurs.usdToIdr);
      setKursSar(masterKurs.sarToIdr);
    }
  }, [masterKurs, masterKursLoading]);
  const [marginPercent, setMarginPercent] = useState<number>(7);
  const printRef = useRef<HTMLDivElement>(null);

  const [paxRows, setPaxRows] = useState<{pax: string, hargaVisa: string, hargaTransport: string, vehicle?: string}[]>(Array(5).fill({ pax: '', hargaVisa: '', hargaTransport: '' }));

  const visaSchema = {
    type: Type.OBJECT,
    properties: {
      selectedDate: { type: Type.STRING, description: "Tanggal keberangkatan dalam format YYYY-MM-DD" },
      marginPercent: { type: Type.NUMBER, description: "Persentase margin keuntungan" },
      kurs: { type: Type.NUMBER, description: "Kurs USD ke Rupiah" },
      kursSar: { type: Type.NUMBER, description: "Kurs SAR ke Rupiah" },
      currency: { type: Type.STRING, enum: ["IDR", "USD", "SAR"], description: "Mata uang utama yang digunakan" },
      includeTransport: { type: Type.BOOLEAN, description: "Apakah termasuk harga transportasi" },
      tiers: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            totalPax: { type: Type.NUMBER },
            transportType: { type: Type.STRING },
            transportRoute: { type: Type.STRING }
          }
        },
        description: "Daftar opsi tier (pax dan transportasi)"
      }
    }
  };

  const visaSystemInstruction = "Anda adalah asisten AI untuk mengisi form Pricelist Visa. Ekstrak informasi dari teks yang diberikan pengguna (seperti tanggal, margin, kurs, mata uang IDR/USD/SAR, dan apakah termasuk transportasi beserta harganya) dan kembalikan dalam format JSON sesuai schema. Jika ada informasi yang tidak disebutkan, biarkan kosong atau gunakan nilai default yang masuk akal.";

  const handleDataParsed = (data: { selectedDate?: string; marginPercent?: number; kurs?: number; kursSar?: number; currency?: string; includeTransport?: boolean; tiers?: { totalPax?: number; transportType?: string; transportRoute?: string }[]; totalPax?: number }) => {
    if (data.selectedDate) setSelectedDate(data.selectedDate);
    if (data.marginPercent !== undefined) setMarginPercent(data.marginPercent);
    if (data.kurs !== undefined) setKurs(data.kurs);
    if (data.kursSar !== undefined) setKursSar(data.kursSar);
    if (data.currency) setCurrency(data.currency as 'IDR' | 'USD' | 'SAR');
    if (data.includeTransport !== undefined) setIncludeTransport(data.includeTransport);
    
    if (data.tiers && Array.isArray(data.tiers)) {
      const newRows = data.tiers.map((tierObj) => {
        const p = tierObj.totalPax || 45;
        const vType = (tierObj.transportType || 'BUS').toUpperCase();
        const rName = tierObj.transportRoute || transportRoute;
        return calculateTierRow(p, vType, rName);
      });
      
      const filledRows = [...newRows];
      while (filledRows.length < 5) {
          filledRows.push({ pax: '', hargaVisa: '', hargaTransport: '', vehicle: '' });
      }
      setPaxRows(filledRows);
    } else if (data.totalPax !== undefined) {
      setTotalPax(data.totalPax);
      autoFillData();
    }
  };

  const formatCurrency = (amount: number, curr: string = currency) => {
    if (curr === 'IDR') {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } else if (curr === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } else if (curr === 'SAR') {
      return `SAR ${new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)}`;
    }
    return amount.toString();
  };

  const calculateTierRow = (pax: number, vType: string, rName: string) => {
    const matchingTier = visaData.find(tier => {
      const range = tier.paxRange.match(/(\d+)-(\d+)/);
      if (range) {
        const min = parseInt(range[1]);
        const max = parseInt(range[2]);
        return pax >= min && pax <= max;
      }
      if (tier.paxRange.includes('+')) {
        const min = parseInt(tier.paxRange);
        return pax >= min;
      }
      return false;
    }) || visaData[0];

    let dbTransportPrice = 0;
    if (includeTransport) {
      const vehicle = transportData.find(v => v.name === vType);
      if (vehicle) {
        const route = vehicle.routes.find(r => r.route === rName);
        if (route) {
          dbTransportPrice = route.price;
        }
      }
    }

    const basePriceUsd = matchingTier.foreignPriceUsd;
    let jualVisa = 0;
    if (currency === 'IDR') {
      const beli = basePriceUsd * kurs;
      const margin = beli * (marginPercent / 100);
      jualVisa = beli + margin;
    } else if (currency === 'USD') {
      const margin = basePriceUsd * (marginPercent / 100);
      jualVisa = basePriceUsd + margin;
    } else if (currency === 'SAR') {
      const beliSar = (basePriceUsd * kurs) / kursSar;
      const margin = beliSar * (marginPercent / 100);
      jualVisa = beliSar + margin;
    }

    let jualTransport = 0;
    if (includeTransport) {
      const transportIdr = dbTransportPrice * kursSar;
      if (currency === 'IDR') jualTransport = transportIdr / pax;
      else if (currency === 'USD') jualTransport = (transportIdr / pax) / kurs;
      else if (currency === 'SAR') jualTransport = (transportIdr / pax) / kursSar;
    }

    return {
      pax: `${pax} PAX`,
      hargaVisa: formatCurrency(jualVisa),
      hargaTransport: includeTransport ? formatCurrency(jualTransport) : '',
      vehicle: vType
    };
  };

  const autoFillData = () => {
    const row = calculateTierRow(totalPax, transportType, transportRoute);
    const newRows = [row];
    
    const filledRows = [...newRows];
    while (filledRows.length < 5) {
        filledRows.push({ pax: '', hargaVisa: '', hargaTransport: '', vehicle: '' });
    }
    setPaxRows(filledRows);
  };

  const addTierOption = () => {
    const row = calculateTierRow(totalPax, transportType, transportRoute);
    // Find first empty row or append
    const emptyIndex = paxRows.findIndex(r => !r.pax);
    if (emptyIndex !== -1) {
      const newRows = [...paxRows];
      newRows[emptyIndex] = row;
      setPaxRows(newRows);
    } else {
      setPaxRows([...paxRows, row]);
    }
  };

  // Auto-fill on mount
  useEffect(() => {
    autoFillData();
    
    // Pre-fill some default includes based on standard visa (wait, I should just remove this since includeRows is gone)
  }, []); // Run once on mount

  // Recalculate when kurs, margin, currency, or transport changes
  useEffect(() => {
    // Only auto-update if there's only one row or we want to refresh all
    // For simplicity, let's just refresh the first row if it's the only one
    if (paxRows.filter(r => r.pax).length <= 1) {
      autoFillData();
    }
  }, [kurs, kursSar, marginPercent, currency, includeTransport, totalPax, transportType, transportRoute]);

  const handlePaxChange = (index: number, field: 'pax' | 'hargaVisa' | 'hargaTransport', value: string) => {
    const newRows = [...paxRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setPaxRows(newRows);
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
      
      const filename = `${includeTransport ? 'Visa_Transport' : 'Visa'}_Template_${selectedDate || 'Draft'}.jpg`;
      
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
          schema={visaSchema} 
          systemInstruction={visaSystemInstruction} 
          placeholder="Ketik prompt di sini (contoh: Buatkan pricelist visa untuk 12 Desember dengan margin 10%...)"
        />
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 w-full max-w-[210mm] flex flex-col gap-4 print:hidden">
        <div className="flex items-center gap-4 flex-wrap">
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
            <span className="font-medium text-gray-700">Currency:</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'IDR' | 'USD' | 'SAR')}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none w-24"
            >
              <option value="IDR">IDR</option>
              <option value="USD">USD</option>
              <option value="SAR">SAR</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <RefreshCw className="text-gray-500 w-5 h-5" />
            <span className="font-medium text-gray-700">Kurs USD:</span>
            <input
              type="number"
              value={kurs}
              onChange={(e) => setKurs(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none w-28"
            />
          </div>

          <div className="flex items-center gap-2">
            <RefreshCw className="text-gray-500 w-5 h-5" />
            <span className="font-medium text-gray-700">Kurs SAR:</span>
            <input
              type="number"
              value={kursSar}
              onChange={(e) => setKursSar(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none w-28"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Total PAX:</span>
            <input
              type="number"
              value={totalPax}
              onChange={(e) => setTotalPax(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none w-24"
            />
          </div>
          
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

        <div className="flex items-center justify-between flex-wrap gap-4 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeTransport"
                checked={includeTransport}
                onChange={(e) => setIncludeTransport(e.target.checked)}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label htmlFor="includeTransport" className="font-medium text-gray-700 cursor-pointer">
                Tambah Transportasi
              </label>
            </div>

            {includeTransport && (
              <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700 text-sm">Jenis:</span>
                  <select
                    value={transportType}
                    onChange={(e) => setTransportType(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-28"
                  >
                    {transportData.map(v => (
                      <option key={v.id} value={v.name}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700 text-sm">Rute:</span>
                  <select
                    value={transportRoute}
                    onChange={(e) => setTransportRoute(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-48"
                  >
                    {transportData.find(v => v.name === transportType)?.routes.map((r, i) => (
                      <option key={i} value={r.route}>{r.route}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={addTierOption}
              className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              <Wand2 className="w-4 h-4" />
              Tambah Tier
            </button>

            <button 
              onClick={autoFillData}
              className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg hover:bg-emerald-200 transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Reset & Auto-fill
            </button>
            
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
            <h1 className="text-4xl font-bold leading-tight mb-2">
              {includeTransport ? 'Visa & Transportasi' : 'Visa'}
            </h1>
            <div className="border-b-2 border-gray-900 w-full mb-2"></div>
            <h3 className="text-xl font-bold">
              {selectedDate ? new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Periode'}
            </h3>
          </div>
        </div>

        {/* PAX & HARGA Table */}
        <div className="relative z-10 mb-6">
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr className="bg-gray-900 text-[#FDB913] text-center font-bold uppercase text-base tracking-wider">
                <th className={`p-2 border-r border-gray-700 ${includeTransport ? 'w-[20%]' : 'w-1/2'}`}>PAX</th>
                <th className={`p-2 ${includeTransport ? 'border-r border-gray-700 w-[40%]' : 'w-1/2'}`}>HARGA VISA / PAX</th>
                {includeTransport && <th className="p-2 w-[40%]">HARGA TRANSPORT / PAX</th>}
              </tr>
            </thead>
            <tbody>
              {paxRows.map((row, index) => (
                <tr key={index} className="border-b border-gray-200 text-center">
                  <td className="border-r border-gray-200 p-0 h-10">
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-center outline-none font-black text-2xl"
                      value={row.pax}
                      onChange={(e) => handlePaxChange(index, 'pax', e.target.value)}
                    />
                  </td>
                  <td className={`p-0 h-10 relative ${includeTransport ? 'border-r border-gray-200' : ''}`}>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-center outline-none font-medium text-sm"
                      value={row.hargaVisa}
                      onChange={(e) => handlePaxChange(index, 'hargaVisa', e.target.value)}
                    />
                        {row.hargaVisa && (
                          <span className="absolute bottom-1 right-1 text-[11px] text-gray-400 font-bold">
                            / PAX
                          </span>
                        )}
                  </td>
                  {includeTransport && (
                    <td className="p-0 h-10 relative">
                      <input
                        type="text"
                        className="w-full h-full bg-transparent text-center outline-none font-medium text-sm"
                        value={row.hargaTransport}
                        onChange={(e) => handlePaxChange(index, 'hargaTransport', e.target.value)}
                      />
                      <div className="absolute bottom-0.5 right-1 flex flex-col items-end leading-none">
                        {row.hargaTransport && (
                          <span className="text-[11px] text-gray-400 font-bold">/ PAX</span>
                        )}
                        {row.vehicle && (
                          <span className="text-lg text-emerald-700 uppercase font-black">
                            {row.vehicle}
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PERSYARATAN Section */}
        <div className="relative z-10 flex-grow mt-4">
          <div className="bg-white-20 backdrop-blur-sm rounded-2xl p-5 border border-white-30">
            <h2 className="text-lg font-black text-gray-900 mb-4 tracking-tight">PERSYARATAN :</h2>
            
            <div className="grid grid-cols-1 gap-3">
              {[
                "SCAN PASSPORT",
                "BOOKING HOTEL",
                "PAKET INFO",
                "MANIFEST",
                "TIKET PESAWAT",
                "FULL PAYMENT"
              ].map((text, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="bg-green-500 rounded-full p-0.5 shadow-md">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-black text-gray-900 tracking-wide">{text}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-2 bg-white-40 p-2 rounded-xl border border-white-50">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <p className="text-[10px] font-black text-gray-900 uppercase leading-tight">
                * HARGA BISA BERUBAH SEWAKTU WAKTU JIKA ADA PERATURAN BARU DARI ARAB SAUDI
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Contact Bar */}
        <div className="mt-auto pt-6 flex justify-between items-end relative z-10">
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
