import React, { useState, useRef, useEffect } from 'react';
import { Calendar, RefreshCw, Download, MapPin, DollarSign, Building2 } from 'lucide-react';
import { captureToDataUrl } from '../utils/exportUtils';
import { hotels, Hotel } from '../data/hotels';
import { isDateInRange, parseDateRange } from '../utils/dateUtils';
import { AIPromptInput } from './AIPromptInput';
import { Type } from '@google/genai';
import { logoBase64 } from '../utils/logoBase64';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useKurs } from '../hooks/useKurs';

type HotelRow = {
  hotelName: string;
  quad: string;
  triple: string;
  double: string;
};

type StarSection = {
  star: number;
  rows: HotelRow[];
};

export const HotelTemplateView: React.FC = () => {
  const { kurs: masterKurs, loading: masterKursLoading } = useKurs();
  const [city, setCity] = useState<'Madinah' | 'Makkah'>('Madinah');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [kurs, setKurs] = useState<number>(4900);

  useEffect(() => {
    if (!masterKursLoading && masterKurs) {
      setKurs(masterKurs.sarToIdr);
    }
  }, [masterKurs, masterKursLoading]);
  const [marginPercent, setMarginPercent] = useState<number>(15);
  const [currency, setCurrency] = useState<'SAR' | 'IDR'>('SAR');
  const printRef = useRef<HTMLDivElement>(null);

  const initialSections: StarSection[] = [
    { star: 3, rows: Array(3).fill({ hotelName: '', quad: '', triple: '', double: '' }) },
    { star: 4, rows: Array(3).fill({ hotelName: '', quad: '', triple: '', double: '' }) },
    { star: 5, rows: Array(3).fill({ hotelName: '', quad: '', triple: '', double: '' }) },
  ];

  const [sections, setSections] = useState<StarSection[]>(initialSections);

  const hotelSchema = {
    type: Type.OBJECT,
    properties: {
      city: { type: Type.STRING, description: "Kota (Madinah atau Makkah)" },
      selectedDate: { type: Type.STRING, description: "Tanggal keberangkatan dalam format YYYY-MM-DD" },
      marginPercent: { type: Type.NUMBER, description: "Persentase margin keuntungan" },
      currency: { type: Type.STRING, description: "Mata uang (IDR atau SAR)" },
      selectedHotels: {
        type: Type.ARRAY,
        description: "Daftar nama hotel yang dipilih secara spesifik oleh pengguna",
        items: {
          type: Type.STRING
        }
      }
    }
  };

  const hotelSystemInstruction = "Anda adalah asisten AI untuk mengisi form Pricelist Hotel Umrah. Ekstrak informasi dari teks yang diberikan pengguna dan kembalikan dalam format JSON sesuai schema. Jika ada informasi yang tidak disebutkan, biarkan kosong atau gunakan nilai default yang masuk akal.";

  const [userSelectedHotels, setUserSelectedHotels] = useState<string[]>([]);

  const handleDataParsed = (data: {
    city?: string;
    selectedDate?: string;
    marginPercent?: number;
    currency?: string;
    selectedHotels?: string[];
  }) => {
    if (data.city) setCity(data.city as 'Madinah' | 'Makkah');
    if (data.selectedDate) setSelectedDate(data.selectedDate);
    if (data.marginPercent !== undefined) setMarginPercent(data.marginPercent);
    if (data.currency) setCurrency(data.currency as 'SAR' | 'IDR');
    
    if (data.selectedHotels && Array.isArray(data.selectedHotels) && data.selectedHotels.length > 0) {
      setUserSelectedHotels(data.selectedHotels);
    } else {
      setUserSelectedHotels([]); // Reset if no specific hotels requested
    }
  };

  const formatPrice = React.useCallback((amount: number) => {
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
  }, [currency, kurs]);

  const getHotelAvailabilityText = React.useCallback((hotelName: string, dateStr: string): string => {
    if (!hotelName || !dateStr) return '';
    const hotel = hotels.find(h => h.name.toLowerCase() === hotelName.toLowerCase() && h.city === city);
    if (!hotel || !hotel.seasons) return '';
    
    const checkDate = new Date(dateStr);
    
    // Exact match
    const exactMatch = hotel.seasons.find(s => isDateInRange(checkDate, s.range));
    if (exactMatch) return ''; // No need to show text if it's an exact match
    
    // Find closest season
    let minDiff = Infinity;
    let closestStart: Date | null = null;

    for (const s of hotel.seasons) {
      const { start, end } = parseDateRange(s.range);
      if (start && end) {
        const diffStart = Math.abs(checkDate.getTime() - start.getTime());
        const diffEnd = Math.abs(checkDate.getTime() - end.getTime());
        const diff = Math.min(diffStart, diffEnd);
        if (diff < minDiff) {
          minDiff = diff;
          closestStart = start;
        }
      }
    }
    
    if (closestStart) {
      return `Avail: ${format(closestStart, 'dd MMM yyyy', { locale: id })}`;
    }
    return '';
  }, [hotels, city]);

  const getClosestSeason = React.useCallback((hotel: Hotel, dateStr: string) => {
    const checkDate = new Date(dateStr);
    
    // First try exact match
    const exactSeason = hotel.seasons.find(s => isDateInRange(checkDate, s.range));
    if (exactSeason) return exactSeason;

    // If no exact match, find the closest season
    let closestSeason = null;
    let minDiff = Infinity;

    for (const season of hotel.seasons) {
      const { start, end } = parseDateRange(season.range);
      if (start && end) {
        const diffStart = Math.abs(checkDate.getTime() - start.getTime());
        const diffEnd = Math.abs(checkDate.getTime() - end.getTime());
        const diff = Math.min(diffStart, diffEnd);
        if (diff < minDiff) {
          minDiff = diff;
          closestSeason = season;
        }
      }
    }

    return closestSeason;
  }, []);

  const getHotelPrice = React.useCallback((hotel: Hotel, dateStr: string, type: string): number => {
    const season = getClosestSeason(hotel, dateStr);
    const prices = season?.prices || [];
    const priceEntry = prices.find(p => p.roomType.toLowerCase().includes(type.toLowerCase()));
    
    if (!priceEntry) return 0;

    // Base price per room in SAR
    let basePrice = priceEntry.price;
    
    // Add margin
    basePrice = basePrice * (1 + marginPercent / 100);
    
    // Convert to IDR if needed
    if (currency === 'IDR') {
      basePrice = basePrice * kurs;
    }

    return Math.round(basePrice);
  }, [getClosestSeason, marginPercent, currency, kurs]);

  const handleRowChange = (sectionIndex: number, rowIndex: number, field: keyof HotelRow, value: string) => {
    const newSections = [...sections];
    const newRows = [...newSections[sectionIndex].rows];
    const currentRow = { ...newRows[rowIndex], [field]: value };

    // Auto-fill prices if hotel name changes and date is selected
    if (field === 'hotelName' && selectedDate) {
      const matchedHotel = hotels.find(h => h.name.toLowerCase() === value.toLowerCase() && h.city === city);
      if (matchedHotel) {
        const pQuad = getHotelPrice(matchedHotel, selectedDate, 'Quad');
        const pTriple = getHotelPrice(matchedHotel, selectedDate, 'Triple');
        const pDouble = getHotelPrice(matchedHotel, selectedDate, 'Double');

        currentRow.quad = pQuad ? formatPrice(pQuad) : '-';
        currentRow.triple = pTriple ? formatPrice(pTriple) : '-';
        currentRow.double = pDouble ? formatPrice(pDouble) : '-';
      }
    }

    newRows[rowIndex] = currentRow;
    newSections[sectionIndex].rows = newRows;
    setSections(newSections);
  };

  // Auto-populate when date or city changes
  useEffect(() => {
    if (!selectedDate) {
      setSections(initialSections);
      return;
    }

    const checkDate = new Date(selectedDate);
    const maxDate = new Date(checkDate);
    maxDate.setDate(maxDate.getDate() + 30);
    
    // Helper to score a hotel based on how close its seasons are to the selected date
    const getHotelScore = (hotel: Hotel) => {
      let minDiff = Infinity;
      for (const season of hotel.seasons) {
        if (isDateInRange(checkDate, season.range)) return 0; // Exact match is best
        const { start, end } = parseDateRange(season.range);
        if (start && end) {
          const diffStart = Math.abs(checkDate.getTime() - start.getTime());
          const diffEnd = Math.abs(checkDate.getTime() - end.getTime());
          const diff = Math.min(diffStart, diffEnd);
          if (diff < minDiff) minDiff = diff;
        }
      }
      return minDiff;
    };

    setSections(() => {
      return initialSections.map(section => {
        let topHotels: Hotel[] = [];
        
        if (userSelectedHotels.length > 0) {
          // If user specified hotels, try to match them
          const matchedHotels = userSelectedHotels
            .map(name => hotels.find(h => h.name.toLowerCase().includes(name.toLowerCase()) && h.city === city && h.stars === section.star))
            .filter(Boolean) as Hotel[];
          
          if (matchedHotels.length > 0) {
            topHotels = matchedHotels.slice(0, 3);
          }
        }
        
        // If no user selected hotels or no matches found for this star rating, fallback to top 3
        if (topHotels.length === 0) {
          const availableHotels = hotels.filter(h => {
            if (h.city !== city || h.stars !== section.star) return false;
            // Only include if it has a season within +30 days
            return h.seasons.some(season => {
              const { start, end } = parseDateRange(season.range);
              if (!start || !end) return false;
              return start <= maxDate && end >= checkDate;
            });
          });
          availableHotels.sort((a, b) => getHotelScore(a) - getHotelScore(b));
          topHotels = availableHotels.slice(0, 3);
        }
        
        const rows = Array(3).fill({ hotelName: '', quad: '', triple: '', double: '' }).map((row, index) => {
          const hotel = topHotels[index];
          if (hotel) {
            const pQuad = getHotelPrice(hotel, selectedDate, 'Quad');
            const pTriple = getHotelPrice(hotel, selectedDate, 'Triple');
            const pDouble = getHotelPrice(hotel, selectedDate, 'Double');
            return {
              hotelName: hotel.name,
              quad: pQuad ? formatPrice(pQuad) : '-',
              triple: pTriple ? formatPrice(pTriple) : '-',
              double: pDouble ? formatPrice(pDouble) : '-',
            };
          }
          return row;
        });

        return { ...section, rows };
      });
    });
  }, [selectedDate, city, userSelectedHotels, getHotelPrice, formatPrice]);

  // Recalculate prices when margin, kurs, or currency changes
  useEffect(() => {
    if (!selectedDate) return;

    setSections(prevSections => prevSections.map(section => ({
      ...section,
      rows: section.rows.map(row => {
        if (!row.hotelName) return row;
        const matchedHotel = hotels.find(h => h.name.toLowerCase() === row.hotelName.toLowerCase() && h.city === city);
        if (matchedHotel) {
          const pQuad = getHotelPrice(matchedHotel, selectedDate, 'Quad');
          const pTriple = getHotelPrice(matchedHotel, selectedDate, 'Triple');
          const pDouble = getHotelPrice(matchedHotel, selectedDate, 'Double');
          return {
            ...row,
            quad: pQuad ? formatPrice(pQuad) : '-',
            triple: pTriple ? formatPrice(pTriple) : '-',
            double: pDouble ? formatPrice(pDouble) : '-',
          };
        }
        return row;
      })
    })));
  }, [marginPercent, kurs, currency, selectedDate, city, getHotelPrice, formatPrice]);

  const handleDownloadImage = async () => {
    if (!printRef.current) return;
    setIsGeneratingImage(true);
    
    try {
      // Ensure input values are captured by temporarily putting them in value attributes
      const inputs = printRef.current.querySelectorAll('input, textarea');
      inputs.forEach((input: Element) => {
        const inputEl = input as HTMLInputElement | HTMLTextAreaElement;
        inputEl.setAttribute('value', inputEl.value);
        if (inputEl.tagName === 'TEXTAREA') {
          inputEl.textContent = inputEl.value;
        }
      });

      const dataUrl = await captureToDataUrl(printRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      const filename = `PriceList_Hotel_${city}_${selectedDate || 'Draft'}.jpg`;
      
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

  const filteredHotels = hotels.filter(h => h.city === city);

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center gap-6 print:p-0 print:bg-white print:block">
      
      <div className="w-full max-w-[210mm]">
        <AIPromptInput 
          onDataParsed={handleDataParsed} 
          schema={hotelSchema} 
          systemInstruction={hotelSystemInstruction} 
          placeholder="Ketik prompt di sini (contoh: Buatkan pricelist hotel Madinah untuk tanggal 12 Desember dengan margin 20%...)"
          contextData={{
            hotels: hotels.map(h => ({ name: h.name, city: h.city, rating: h.stars }))
          }}
        />
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 w-full max-w-[210mm] flex flex-col gap-4 print:hidden">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="text-gray-500 w-5 h-5" />
            <span className="font-medium text-gray-700">City:</span>
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value as 'Madinah' | 'Makkah');
                setSections(initialSections); // Reset rows on city change
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="Madinah">Madinah</option>
              <option value="Makkah">Makkah</option>
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

      {[3, 4, 5].map(star => (
        <datalist key={`hotel-list-${star}`} id={`hotel-list-${star}`}>
          {filteredHotels.filter(h => h.stars === star).map(h => (
            <option key={h.id} value={h.name} />
          ))}
        </datalist>
      ))}

      {/* A4 Aspect Ratio Container */}
      <div ref={printRef} className="w-[210mm] min-h-[297mm] bg-[#FDB913] shadow-2xl relative text-gray-900 font-sans flex flex-col print:shadow-none print:m-0 border-4 border-purple-500 p-8">
        
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
            <h2 className="text-2xl font-bold leading-tight mb-2">Hotel {city}</h2>
            <div className="border-b-2 border-gray-900 w-full mb-2"></div>
            <h3 className="text-xl font-bold">
              {selectedDate ? new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Periode'}
            </h3>
          </div>
        </div>

        {/* Tables Section */}
        <div className="relative z-10 flex-grow space-y-6">
          {sections.map((section, sIndex) => (
            <div key={section.star} className="bg-white overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-[#FDB913] text-center font-bold uppercase text-xs tracking-wider">
                    <th className="p-2 border-r border-gray-700 w-2/5 text-left pl-4">BINTANG {section.star}</th>
                    <th className="p-2 border-r border-gray-700 w-1/5">QUAD</th>
                    <th className="p-2 border-r border-gray-700 w-1/5">TRIPLE</th>
                    <th className="p-2 w-1/5">DOUBLE</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, rIndex) => (
                    <tr key={rIndex} className="border-b border-gray-200 text-center">
                      <td className="border-r border-gray-200 p-0 h-10 relative">
                        <div className="flex flex-col h-full justify-center">
                          <input
                            type="text"
                            list={`hotel-list-${section.star}`}
                            className="w-full bg-transparent px-4 outline-none font-medium text-xs text-left"
                            placeholder="Nama Hotel..."
                            value={row.hotelName}
                            onChange={(e) => handleRowChange(sIndex, rIndex, 'hotelName', e.target.value)}
                          />
                          {selectedDate && row.hotelName && getHotelAvailabilityText(row.hotelName, selectedDate) && (
                            <span className="px-4 text-[9px] text-emerald-600 font-medium whitespace-nowrap text-left leading-none mt-0.5">
                              {getHotelAvailabilityText(row.hotelName, selectedDate)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border-r border-gray-200 p-0 h-10">
                        <input
                          type="text"
                          className="w-full h-full bg-transparent text-center outline-none font-medium text-xs"
                          value={row.quad}
                          onChange={(e) => handleRowChange(sIndex, rIndex, 'quad', e.target.value)}
                        />
                      </td>
                      <td className="border-r border-gray-200 p-0 h-10">
                        <input
                          type="text"
                          className="w-full h-full bg-transparent text-center outline-none font-medium text-xs"
                          value={row.triple}
                          onChange={(e) => handleRowChange(sIndex, rIndex, 'triple', e.target.value)}
                        />
                      </td>
                      <td className="p-0 h-10">
                        <input
                          type="text"
                          className="w-full h-full bg-transparent text-center outline-none font-medium text-xs"
                          value={row.double}
                          onChange={(e) => handleRowChange(sIndex, rIndex, 'double', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Note */}
          <div className="mt-4 text-sm font-bold text-gray-900 italic">
            * Harga di atas hanya untuk harga room kamar bukan per pax
          </div>
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
