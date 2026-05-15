import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Star, MapPin, Calendar, Printer, Users, Briefcase, RefreshCw, Download } from 'lucide-react';
import { hotels, Hotel } from '../data/hotels';
import { isDateInRange, parseDateRange } from '../utils/dateUtils';
import { HANDLING_TIERS } from '../data/handlingSaudi';
import { visaData } from '../data/visa';
import html2canvas from 'html2canvas';
import { AIPromptInput } from './AIPromptInput';
import { Type } from '@google/genai';
import { logoBase64 } from '../utils/logoBase64';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { FileText } from 'lucide-react';

interface QuotationRow {
  madinah?: Partial<Hotel>;
  makkah?: Partial<Hotel>;
  priceDouble?: number | string;
  priceTriple?: number | string;
  priceQuad?: number | string;
}

import { sanitizeForHtml2Canvas } from '../utils/exportUtils';

export const QuotationView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [paxCount, setPaxCount] = useState<number>(35);
  const [includeHandling, setIncludeHandling] = useState<boolean>(false);
  const [includeMutawif, setIncludeMutawif] = useState<boolean>(false);
  const [includeVisa, setIncludeVisa] = useState<boolean>(false);
  const [currency, setCurrency] = useState<'SAR' | 'USD' | 'IDR'>('IDR');
  const [kurs, setKurs] = useState<number>(4700);
  const [kursUsd, setKursUsd] = useState<number>(17000);
  const [rows, setRows] = useState<QuotationRow[]>(Array(14).fill({}));
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const prevSelectedDate = useRef<string>('');

  const quotationSchema = {
    type: Type.OBJECT,
    properties: {
      selectedDate: { type: Type.STRING, description: "Tanggal keberangkatan dalam format YYYY-MM-DD" },
      paxCount: { type: Type.NUMBER, description: "Jumlah pax atau jamaah" },
      includeHandling: { type: Type.BOOLEAN, description: "Apakah termasuk handling" },
      includeMutawif: { type: Type.BOOLEAN, description: "Apakah termasuk mutawif" },
      includeVisa: { type: Type.BOOLEAN, description: "Apakah termasuk visa" },
      currency: { type: Type.STRING, description: "Mata uang (IDR, SAR, USD)" },
      rows: {
        type: Type.ARRAY,
        description: "Daftar baris hotel yang dipilih",
        items: {
          type: Type.OBJECT,
          properties: {
            madinahHotelId: { type: Type.STRING, description: "ID Hotel Madinah dari database" },
            makkahHotelId: { type: Type.STRING, description: "ID Hotel Makkah dari database" }
          }
        }
      }
    }
  };

  const quotationSystemInstruction = "Anda adalah asisten AI untuk mengisi form Quotation Umrah. Ekstrak informasi dari teks yang diberikan pengguna dan kembalikan dalam format JSON sesuai schema. Jika pengguna tidak menyebutkan hotel spesifik, pilihkan secara otomatis 3-4 kombinasi hotel Madinah dan Makkah yang tersedia dari contextData (misalnya kombinasi bintang 3, bintang 4, dan bintang 5) dan masukkan ke dalam array 'rows'. Jika ada informasi yang tidak disebutkan, biarkan kosong atau gunakan nilai default yang masuk akal.";

  const handleDataParsed = (data: any) => {
    const newDate = data.selectedDate || selectedDate;
    const newPax = data.paxCount || paxCount;
    const newHandling = data.includeHandling !== undefined ? data.includeHandling : includeHandling;
    const newMutawif = data.includeMutawif !== undefined ? data.includeMutawif : includeMutawif;
    const newVisa = data.includeVisa !== undefined ? data.includeVisa : includeVisa;
    const newCurrency = data.currency || currency;

    if (data.selectedDate) setSelectedDate(data.selectedDate);
    if (data.paxCount) setPaxCount(data.paxCount);
    if (data.includeHandling !== undefined) setIncludeHandling(data.includeHandling);
    if (data.includeMutawif !== undefined) setIncludeMutawif(data.includeMutawif);
    if (data.includeVisa !== undefined) setIncludeVisa(data.includeVisa);
    if (data.currency) setCurrency(data.currency as 'SAR' | 'USD' | 'IDR');
    
    if (data.rows && Array.isArray(data.rows)) {
      const newRows = [...rows];
      
      // Calculate handling, mutawwif, visa prices
      let handlingSAR = 0;
      if (newHandling) {
        const tier = HANDLING_TIERS.find(t => newPax >= t.minPax && newPax <= t.maxPax);
        handlingSAR = Math.round((tier ? tier.hpp : 0) * 3.75);
      }
      
      let mutawwifSAR = newMutawif ? 250 : 0;
      
      let visaIDR = 0;
      if (newVisa) {
        const visa = newPax > 34 
          ? visaData.find(v => v.paxRange.includes('35-55')) || visaData[1] || visaData[0]
          : visaData.find(v => v.paxRange.includes('1-34')) || visaData[0];
        visaIDR = visa?.sellingPrice || 0;
      }

      data.rows.forEach((r: any, index: number) => {
        const madinah = hotels.find(h => h.id === r.madinahHotelId);
        const makkah = hotels.find(h => h.id === r.makkahHotelId);
        
        let row: QuotationRow = {};
        
        if (index < newRows.length) {
          row = {
            ...newRows[index],
            madinah: madinah || newRows[index].madinah,
            makkah: makkah || newRows[index].makkah
          };
        } else {
          row = {
            madinah: madinah || undefined,
            makkah: makkah || undefined,
            priceDouble: '-',
            priceTriple: '-',
            priceQuad: '-'
          };
        }

        // Recalculate prices for this row
        if (newDate && row.madinah?.name && row.makkah?.name) {
          let pDoubleMadinah = 0, pTripleMadinah = 0, pQuadMadinah = 0;
          let pDoubleMakkah = 0, pTripleMakkah = 0, pQuadMakkah = 0;

          if (row.madinah?.id) {
            pDoubleMadinah = getHotelPrice(row.madinah as Hotel, newDate, 'Double');
            pTripleMadinah = getHotelPrice(row.madinah as Hotel, newDate, 'Triple');
            pQuadMadinah = getHotelPrice(row.madinah as Hotel, newDate, 'Quad');
          }
          
          if (row.makkah?.id) {
            pDoubleMakkah = getHotelPrice(row.makkah as Hotel, newDate, 'Double');
            pTripleMakkah = getHotelPrice(row.makkah as Hotel, newDate, 'Triple');
            pQuadMakkah = getHotelPrice(row.makkah as Hotel, newDate, 'Quad');
          }

          if (pQuadMadinah === 0 || pQuadMakkah === 0) {
            row.priceDouble = '-';
            row.priceTriple = '-';
            row.priceQuad = '-';
          } else {
            const totalDoubleSAR = pDoubleMadinah + pDoubleMakkah + handlingSAR + mutawwifSAR;
            const totalTripleSAR = pTripleMadinah + pTripleMakkah + handlingSAR + mutawwifSAR;
            const totalQuadSAR = pQuadMadinah + pQuadMakkah + handlingSAR + mutawwifSAR;

            const convert = (sarAmount: number) => {
              const idrAmount = (sarAmount * kurs) + visaIDR;
              if (newCurrency === 'IDR') return idrAmount;
              if (newCurrency === 'SAR') return idrAmount / kurs;
              if (newCurrency === 'USD') return idrAmount / kursUsd;
              return idrAmount;
            };

            row.priceDouble = convert(totalDoubleSAR);
            row.priceTriple = convert(totalTripleSAR);
            row.priceQuad = convert(totalQuadSAR);
          }
        } else {
          row.priceDouble = '-';
          row.priceTriple = '-';
          row.priceQuad = '-';
        }

        if (index < newRows.length) {
          newRows[index] = row;
        } else {
          newRows.push(row);
        }
      });
      setRows(newRows);
    }
  };

  // Helper to format currency
  const formatCurrency = (amount: number | string) => {
    if (typeof amount === 'string') return amount;
    
    let currencyCode = 'IDR';
    let locale = 'id-ID';
    
    if (currency === 'SAR') {
      currencyCode = 'SAR';
      locale = 'en-US';
    } else if (currency === 'USD') {
      currencyCode = 'USD';
      locale = 'en-US';
    }

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currency === 'IDR' ? 0 : 2,
      maximumFractionDigits: currency === 'IDR' ? 0 : 2,
    }).format(amount);
  };

  // Helper to calculate price for a single hotel
  function getHotelPrice(hotel: Hotel, dateStr: string, type: string): number {
    const checkDate = new Date(dateStr);
    
    // First try exact match
    let season = hotel.seasons.find(s => isDateInRange(checkDate, s.range));
    
    // If no exact match, find the closest season
    if (!season) {
      let closestSeason = null;
      let minDiff = Infinity;

      for (const s of hotel.seasons) {
        const { start, end } = parseDateRange(s.range);
        if (start && end) {
          const diffStart = Math.abs(checkDate.getTime() - start.getTime());
          const diffEnd = Math.abs(checkDate.getTime() - end.getTime());
          const diff = Math.min(diffStart, diffEnd);
          if (diff < minDiff) {
            minDiff = diff;
            closestSeason = s;
          }
        }
      }
      season = closestSeason || undefined;
    }

    const prices = season?.prices || [];
    const priceEntry = prices.find(p => p.roomType.toLowerCase().includes(type.toLowerCase()));
    
    if (!priceEntry) return 0;

    // Base price
    const basePrice = Math.round(priceEntry.price);
    
    // Calculate 10% markup
    const markupPrice = basePrice * 1.10;
    
    // Calculate per pax based on room type
    let divider = 1;
    if (type === 'Double') divider = 2;
    if (type === 'Triple') divider = 3;
    if (type === 'Quad') divider = 4;

    return Math.round(markupPrice / divider);
  }

  // Get handling price per pax in SAR
  function getHandlingPriceSAR(currentPaxCount: number = paxCount, isIncluded: boolean = includeHandling): number {
    if (!isIncluded) return 0;
    
    const tier = HANDLING_TIERS.find(t => currentPaxCount >= t.minPax && currentPaxCount <= t.maxPax);
    const hppUSD = tier ? tier.hpp : 0;
    
    // Convert USD to SAR (Assuming 1 USD = 3.75 SAR)
    return Math.round(hppUSD * 3.75);
  }

  // Get visa price per pax in IDR based on pax count
  function getVisaPriceIDR(currentPaxCount: number = paxCount, isIncluded: boolean = includeVisa): number {
    if (!isIncluded) return 0;
    const visa = currentPaxCount > 34 
      ? visaData.find(v => v.paxRange.includes('35-55')) || visaData[1] || visaData[0]
      : visaData.find(v => v.paxRange.includes('1-34')) || visaData[0];
    return visa?.sellingPrice || 0;
  }

  // Get mutawwif price per pax in SAR
  function getMutawwifPriceSAR(isIncluded: boolean = includeMutawif): number {
    if (!isIncluded) return 0;
    return 250; // Default selling price in SAR
  }

  // Helper to get availability text if the hotel is not available exactly on the selected date
  function getHotelAvailabilityText(hotel: Hotel | undefined, dateStr: string): string {
    if (!hotel || !dateStr || !hotel.seasons) return '';
    const checkDate = new Date(dateStr);
    
    // Exact match
    const exactMatch = hotel.seasons.find(s => isDateInRange(checkDate, s.range));
    if (exactMatch) return ''; // No need to show text if it's an exact match
    
    // Find closest season
    let closestSeason = null;
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
          closestSeason = s;
          closestStart = start;
        }
      }
    }
    
    if (closestStart) {
      return `Avail: ${format(closestStart, 'dd MMM yyyy', { locale: id })}`;
    }
    return '';
  }

  // Update rows when date, paxCount, includeHandling, includeMutawif, includeVisa, currency, or kurs changes
  useEffect(() => {
    if (!selectedDate) {
      setRows(Array(14).fill({}));
      prevSelectedDate.current = '';
      return;
    }

    const checkDate = new Date(selectedDate);
    const maxDate = new Date(checkDate);
    maxDate.setDate(maxDate.getDate() + 30);

    const availableMadinahHotels = hotels.filter(hotel => {
      if (hotel.city !== 'Madinah') return false;
      const season = hotel.seasons.find(s => {
        const { start, end } = parseDateRange(s.range);
        if (!start || !end) return false;
        return start <= maxDate && end >= checkDate;
      });
      return season && season.prices && season.prices.length > 0;
    });

    const availableMakkahHotels = hotels.filter(hotel => {
      if (hotel.city !== 'Makkah') return false;
      const season = hotel.seasons.find(s => {
        const { start, end } = parseDateRange(s.range);
        if (!start || !end) return false;
        return start <= maxDate && end >= checkDate;
      });
      return season && season.prices && season.prices.length > 0;
    });

    const handlingSAR = getHandlingPriceSAR();
    const mutawwifSAR = getMutawwifPriceSAR();
    const visaIDR = getVisaPriceIDR();

    const isDateChanged = selectedDate !== prevSelectedDate.current;
    prevSelectedDate.current = selectedDate;

    // Update existing rows with new prices if both hotels are present
    setRows(prevRows => {
      let baseRows = prevRows;

      // If date changed, or if it's completely empty, auto-fill
      if (isDateChanged || prevRows.every(r => !r.madinah?.name && !r.makkah?.name)) {
        // Sort by stars descending to pair 5-star with 5-star, etc.
        const sortedMadinah = [...availableMadinahHotels].sort((a, b) => (b.stars || 0) - (a.stars || 0));
        const sortedMakkah = [...availableMakkahHotels].sort((a, b) => (b.stars || 0) - (a.stars || 0));

        baseRows = Array.from({ length: 14 }, (_, i) => {
          const madinahHotel = sortedMadinah[i];
          const makkahHotel = sortedMakkah[i];
          return {
            madinah: madinahHotel || {},
            makkah: makkahHotel || {},
            priceDouble: '-',
            priceTriple: '-',
            priceQuad: '-',
          };
        });
      }

      // Otherwise, update prices for existing rows
      return baseRows.map(row => {
        if (row.madinah?.name && row.makkah?.name) {
          let pDoubleMadinah = 0, pTripleMadinah = 0, pQuadMadinah = 0;
          let pDoubleMakkah = 0, pTripleMakkah = 0, pQuadMakkah = 0;

          if (row.madinah?.id) {
            pDoubleMadinah = getHotelPrice(row.madinah as Hotel, selectedDate, 'Double');
            pTripleMadinah = getHotelPrice(row.madinah as Hotel, selectedDate, 'Triple');
            pQuadMadinah = getHotelPrice(row.madinah as Hotel, selectedDate, 'Quad');
          }
          
          if (row.makkah?.id) {
            pDoubleMakkah = getHotelPrice(row.makkah as Hotel, selectedDate, 'Double');
            pTripleMakkah = getHotelPrice(row.makkah as Hotel, selectedDate, 'Triple');
            pQuadMakkah = getHotelPrice(row.makkah as Hotel, selectedDate, 'Quad');
          }

          // Check if both hotels have prices. If Madinah has no price but Makkah has, don't show.
          // We check Quad as a proxy for having a price entry.
          if (pQuadMadinah === 0 || pQuadMakkah === 0) {
            return {
              ...row,
              priceDouble: '-',
              priceTriple: '-',
              priceQuad: '-',
            };
          }

          const totalDoubleSAR = pDoubleMadinah + pDoubleMakkah + handlingSAR + mutawwifSAR;
          const totalTripleSAR = pTripleMadinah + pTripleMakkah + handlingSAR + mutawwifSAR;
          const totalQuadSAR = pQuadMadinah + pQuadMakkah + handlingSAR + mutawwifSAR;

          // Convert to target currency
          const convert = (sarAmount: number) => {
            const idrAmount = (sarAmount * kurs) + visaIDR;
            if (currency === 'IDR') return idrAmount;
            if (currency === 'SAR') return idrAmount / kurs;
            if (currency === 'USD') return idrAmount / kursUsd;
            return idrAmount;
          };

          return {
            ...row,
            priceDouble: convert(totalDoubleSAR),
            priceTriple: convert(totalTripleSAR),
            priceQuad: convert(totalQuadSAR),
          };
        }
        return {
          ...row,
          priceDouble: '-',
          priceTriple: '-',
          priceQuad: '-',
        };
      });
    });
  }, [selectedDate, paxCount, includeHandling, includeMutawif, includeVisa, kurs, kursUsd, currency]);

  const handleHotelChange = (index: number, type: 'madinah' | 'makkah', name: string) => {
    const newRows = [...rows];
    const currentRow = { ...newRows[index] };
    
    // Find hotel in full list
    const matchedHotel = hotels.find(h => h.name.toLowerCase() === name.toLowerCase());

    if (type === 'madinah') {
      currentRow.madinah = matchedHotel ? { ...matchedHotel } : { name };
    } else {
      currentRow.makkah = matchedHotel ? { ...matchedHotel } : { name };
    }

    // Recalculate prices if we have a date and BOTH hotels are selected
    if (selectedDate && currentRow.madinah?.name && currentRow.makkah?.name) {
      const handlingSAR = getHandlingPriceSAR();
      const mutawwifSAR = getMutawwifPriceSAR();
      const visaIDR = getVisaPriceIDR();
      
      let pDoubleMadinah = 0, pTripleMadinah = 0, pQuadMadinah = 0;
      let pDoubleMakkah = 0, pTripleMakkah = 0, pQuadMakkah = 0;

      if (currentRow.madinah?.id) {
        pDoubleMadinah = getHotelPrice(currentRow.madinah as Hotel, selectedDate, 'Double');
        pTripleMadinah = getHotelPrice(currentRow.madinah as Hotel, selectedDate, 'Triple');
        pQuadMadinah = getHotelPrice(currentRow.madinah as Hotel, selectedDate, 'Quad');
      }
      
      if (currentRow.makkah?.id) {
        pDoubleMakkah = getHotelPrice(currentRow.makkah as Hotel, selectedDate, 'Double');
        pTripleMakkah = getHotelPrice(currentRow.makkah as Hotel, selectedDate, 'Triple');
        pQuadMakkah = getHotelPrice(currentRow.makkah as Hotel, selectedDate, 'Quad');
      }

      // Check if both hotels have prices
      if (pQuadMadinah === 0 || pQuadMakkah === 0) {
        currentRow.priceDouble = '-';
        currentRow.priceTriple = '-';
        currentRow.priceQuad = '-';
      } else {
        const totalDoubleSAR = pDoubleMadinah + pDoubleMakkah + handlingSAR + mutawwifSAR;
        const totalTripleSAR = pTripleMadinah + pTripleMakkah + handlingSAR + mutawwifSAR;
        const totalQuadSAR = pQuadMadinah + pQuadMakkah + handlingSAR + mutawwifSAR;

        const convert = (sarAmount: number) => {
          const idrAmount = (sarAmount * kurs) + visaIDR;
          if (currency === 'IDR') return idrAmount;
          if (currency === 'SAR') return idrAmount / kurs;
          if (currency === 'USD') return idrAmount / kursUsd;
          return idrAmount;
        };

        currentRow.priceDouble = convert(totalDoubleSAR);
        currentRow.priceTriple = convert(totalTripleSAR);
        currentRow.priceQuad = convert(totalQuadSAR);
      }
    } else {
      // If either hotel is missing, reset prices to '-'
      currentRow.priceDouble = '-';
      currentRow.priceTriple = '-';
      currentRow.priceQuad = '-';
    }

    newRows[index] = currentRow;
    setRows(newRows);
  };

  const handleRowChange = (index: number, field: keyof QuotationRow, value: string | number) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const handleStarChange = (index: number, type: 'madinah' | 'makkah', value: string) => {
    const newRows = [...rows];
    const currentRow = { ...newRows[index] };
    if (type === 'madinah') {
      currentRow.madinah = { ...currentRow.madinah, stars: parseInt(value) || undefined };
    } else {
      currentRow.makkah = { ...currentRow.makkah, stars: parseInt(value) || undefined };
    }
    setRows(newRows);
  };

  const handleDownloadImage = async () => {
    if (!printRef.current) return;
    setIsGeneratingImage(true);

    try {
      const { toJpeg } = await import('html-to-image');
      
      const image = await toJpeg(printRef.current, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        skipFonts: false,
        cacheBust: true,
      });
      
      const filename = `Quotation_${selectedDate || 'Draft'}.jpg`;
      await import('../utils/fileUtils').then(m => m.downloadFile(image, filename));
    } catch (error) {
      console.error('Image generation failed:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const madinahHotels = useMemo(() => {
    let filtered = hotels.filter(h => h.city === 'Madinah');
    if (selectedDate) {
      const checkDate = new Date(selectedDate);
      const maxDate = new Date(checkDate);
      maxDate.setDate(maxDate.getDate() + 30);
      
      filtered = filtered.filter(hotel => {
        return hotel.seasons.some(season => {
          const { start, end } = parseDateRange(season.range);
          if (!start || !end) return false;
          return start <= maxDate && end >= checkDate;
        });
      });
    }
    return filtered;
  }, [selectedDate]);

  const makkahHotels = useMemo(() => {
    let filtered = hotels.filter(h => h.city === 'Makkah');
    if (selectedDate) {
      const checkDate = new Date(selectedDate);
      const maxDate = new Date(checkDate);
      maxDate.setDate(maxDate.getDate() + 30);
      
      filtered = filtered.filter(hotel => {
        return hotel.seasons.some(season => {
          const { start, end } = parseDateRange(season.range);
          if (!start || !end) return false;
          return start <= maxDate && end >= checkDate;
        });
      });
    }
    return filtered;
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center gap-6 print:p-0 print:bg-white print:block">
      
      <div className="w-full max-w-[210mm]">
        <AIPromptInput 
          onDataParsed={handleDataParsed} 
          schema={quotationSchema} 
          systemInstruction={quotationSystemInstruction} 
          placeholder="Ketik prompt di sini (contoh: Buatkan quotation untuk 40 pax keberangkatan 12 Desember dengan handling dan visa...)"
          contextData={{
            hotels: hotels.map(h => ({ id: h.id, name: h.name, city: h.city, rating: h.stars })),
            handlingSaudi: HANDLING_TIERS,
            visa: visaData
          }}
        />
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 w-full max-w-[210mm] flex flex-col gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-4 w-full">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Calendar className="text-gray-500 w-4 h-4 flex-shrink-0" />
            <span className="font-medium text-gray-700 whitespace-nowrap text-sm">Period:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none w-full text-sm"
            />
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[120px]">
            <Users className="text-gray-500 w-4 h-4 flex-shrink-0" />
            <span className="font-medium text-gray-700 whitespace-nowrap text-sm">Pax:</span>
            <input
              type="number"
              min="1"
              max="50"
              value={paxCount}
              onChange={(e) => setPaxCount(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1.5 w-full focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[150px]">
            <RefreshCw className="text-gray-500 w-4 h-4 flex-shrink-0" />
            <span className="font-medium text-gray-700 whitespace-nowrap text-sm">Currency:</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'SAR' | 'USD' | 'IDR')}
              className="border border-gray-300 rounded-md px-2 py-1.5 w-full focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            >
              <option value="IDR">IDR</option>
              <option value="SAR">SAR</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 w-full">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 w-[160px]">
              <RefreshCw className="text-gray-500 w-4 h-4 flex-shrink-0" />
              <span className="font-medium text-gray-700 whitespace-nowrap text-sm">Kurs SAR:</span>
              <input
                type="number"
                value={kurs}
                onChange={(e) => setKurs(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-2 py-1.5 w-full focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>

            <div className="flex items-center gap-2 w-[160px]">
              <RefreshCw className="text-gray-500 w-4 h-4 flex-shrink-0" />
              <span className="font-medium text-gray-700 whitespace-nowrap text-sm">Kurs USD:</span>
              <input
                type="number"
                value={kursUsd}
                onChange={(e) => setKursUsd(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-2 py-1.5 w-full focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Briefcase className="text-gray-500 w-4 h-4 flex-shrink-0" />
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeHandling}
                    onChange={(e) => setIncludeHandling(e.target.checked)}
                    className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="font-medium text-gray-700 text-sm">Handling</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeMutawif}
                    onChange={(e) => setIncludeMutawif(e.target.checked)}
                    className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="font-medium text-gray-700 text-sm">Mutawif</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeVisa}
                    onChange={(e) => setIncludeVisa(e.target.checked)}
                    className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="font-medium text-gray-700 text-sm">Visa</span>
                </label>
              </div>
            </div>
          </div>

          <button 
            onClick={handleDownloadImage}
            disabled={isGeneratingImage}
            className="flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto ml-auto"
          >
            {isGeneratingImage ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="whitespace-nowrap text-sm font-medium">{isGeneratingImage ? 'Generating...' : 'Download JPG'}</span>
          </button>
        </div>
      </div>

      {/* Datalists */}
      <datalist id="madinah-list">
        {madinahHotels.map(h => (
          <option key={h.id} value={h.name} />
        ))}
      </datalist>
      <datalist id="makkah-list">
        {makkahHotels.map(h => (
          <option key={h.id} value={h.name} />
        ))}
      </datalist>

      {/* A4 Aspect Ratio Container */}
      <div className="w-full overflow-x-auto pb-8 flex justify-center no-scrollbar">
        <div ref={printRef} className="w-[210mm] min-h-[297mm] bg-amber-400 shadow-2xl relative text-gray-900 font-sans flex flex-col print:shadow-none print:m-0 flex-shrink-0">
        
        {/* Background Pattern (Subtle) */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>

        {/* Header */}
        <div className="p-2 pb-4 flex justify-between items-start relative z-10">
          <div className="flex flex-col">
             {/* Logo */}
            <div className="flex items-center gap-3 mb-2">
               <img src={logoBase64} alt="Umaroh Logo" className="h-14" />
            </div>
            <p className="text-[10px] italic font-semibold ml-1 tracking-wide">Platform Digital Umrah & Haji Pertama di Indonesia</p>
          </div>
          
          <div className="border-l-2 border-gray-900 pl-6 py-1 pdf-header-content">
            <h1 className="text-2xl font-bold leading-tight">Price UST</h1>
            <h2 className="text-2xl font-bold leading-tight mb-3">Hotel Madinah / Makkah</h2>
            <div className="border-b-2 border-gray-900 w-32 mb-2"></div>
            <h3 className="text-xl font-bold">
              {selectedDate ? new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Periode'}
            </h3>
          </div>
        </div>

        {/* Table Section */}
        <div className="px-2 py-4 flex-grow relative z-10">
          <div className="bg-white border-[3px] border-purple-600 rounded-sm overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-amber-400 text-center font-bold uppercase text-xs tracking-wider">
                  <th className="p-2 border-r border-amber-400/50 w-6">No</th>
                  <th className="p-2 border-r border-amber-400/50">Madinah</th>
                  <th className="p-2 border-r border-amber-400/50 w-6"><Star className="w-3 h-3 mx-auto fill-current" /></th>
                  <th className="p-2 border-r border-amber-400/50">Makkah</th>
                  <th className="p-2 border-r border-amber-400/50 w-6"><Star className="w-3 h-3 mx-auto fill-current" /></th>
                  <th className="p-2 border-r border-amber-400/50 w-22">Quad ({currency})</th>
                  <th className="p-2 border-r border-amber-400/50 w-22">Triple ({currency})</th>
                  <th className="p-2 w-22">Double ({currency})</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-b border-gray-200 text-center hover:bg-gray-50 group">
                    <td className="border-r border-gray-200 font-bold bg-gray-50 text-gray-700">{index + 1}</td>
                    
                    {/* Madinah Hotel */}
                    <td className="border-r border-gray-200 text-left px-2 font-medium relative py-2">
                      <div className="flex flex-col">
                        <input
                          type="text"
                          list="madinah-list"
                          className="w-full bg-transparent px-2 outline-none placeholder-gray-300 focus:placeholder-gray-400"
                          placeholder="Select Madinah..."
                          value={row.madinah?.name || ''}
                          onChange={(e) => handleHotelChange(index, 'madinah', e.target.value)}
                        />
                        <div className="flex justify-between items-center px-2">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Madinah</span>
                          {selectedDate && row.madinah?.id && getHotelAvailabilityText(row.madinah as Hotel, selectedDate) && (
                            <span className="text-[9px] text-emerald-600 font-medium whitespace-nowrap">
                              {getHotelAvailabilityText(row.madinah as Hotel, selectedDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="border-r border-gray-200 font-bold text-xs p-0">
                      <input
                        type="text"
                        className="w-full h-full bg-transparent text-center outline-none"
                        value={row.madinah?.stars || ''}
                        onChange={(e) => handleStarChange(index, 'madinah', e.target.value)}
                      />
                    </td>

                    {/* Makkah Hotel */}
                    <td className="border-r border-gray-200 text-left px-2 font-medium relative py-2">
                      <div className="flex flex-col">
                        <input
                          type="text"
                          list="makkah-list"
                          className="w-full bg-transparent px-2 outline-none placeholder-gray-300 focus:placeholder-gray-400"
                          placeholder="Select Makkah..."
                          value={row.makkah?.name || ''}
                          onChange={(e) => handleHotelChange(index, 'makkah', e.target.value)}
                        />
                        <div className="flex justify-between items-center px-2">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Makkah</span>
                          {selectedDate && row.makkah?.id && getHotelAvailabilityText(row.makkah as Hotel, selectedDate) && (
                            <span className="text-[9px] text-emerald-600 font-medium whitespace-nowrap">
                              {getHotelAvailabilityText(row.makkah as Hotel, selectedDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="border-r border-gray-200 font-bold text-xs p-0">
                      <input
                        type="text"
                        className="w-full h-full bg-transparent text-center outline-none"
                        value={row.makkah?.stars || ''}
                        onChange={(e) => handleStarChange(index, 'makkah', e.target.value)}
                      />
                    </td>

                    {/* Prices */}
                    <td className="border-r border-gray-200 font-mono text-xs p-0">
                      <input
                        type="text"
                        className="w-full h-full bg-transparent text-center outline-none"
                        value={formatCurrency(row.priceQuad || '')}
                        onChange={(e) => handleRowChange(index, 'priceQuad', e.target.value)}
                      />
                    </td>
                    <td className="border-r border-gray-200 font-mono text-xs p-0">
                      <input
                        type="text"
                        className="w-full h-full bg-transparent text-center outline-none"
                        value={formatCurrency(row.priceTriple || '')}
                        onChange={(e) => handleRowChange(index, 'priceTriple', e.target.value)}
                      />
                    </td>
                    <td className="font-mono text-xs p-0">
                      <input
                        type="text"
                        className="w-full h-full bg-transparent text-center outline-none"
                        value={formatCurrency(row.priceDouble || '')}
                        onChange={(e) => handleRowChange(index, 'priceDouble', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-2 mt-2 flex justify-between items-start relative z-10">
            {/* Include Section */}
            <div className="w-[60%]">
                <h3 className="text-sm font-bold mb-1 pb-1 uppercase tracking-wide border-b-2 border-gray-900 inline-block">HANDLING SAUDI ARABIA ( ECONOMY )</h3>
                <ol className="list-decimal list-outside ml-4 text-[10px] font-bold space-y-0.5 leading-tight">
                    {includeVisa && <li>Visa Umrah</li>}
                    {includeMutawif && <li>Mutawif / Guide</li>}
                    <li>Handling Kedatangan Bandara Madinah / Jeddah</li>
                    <li>Handling kepulangan di Bandara Jeddah / Madinah</li>
                    <li>Biaya Porter Bandara Madinah & Jeddah</li>
                    <li>Handling Check in dan Check out Hotel Madinah dan Makkah</li>
                    <li>Biaya Tips Bellboy hotel Makkah dan Madinah</li>
                    <li>Biaya Tips Driver selama perjalanan</li>
                    <li>Air Mineral selama perjalanan</li>
                    <li>Snacks box ( makanan Ringan saat perjalanan Madinah - Makkah )</li>
                    <li>Snacks box ( makanan Ringan selama program ziarah )</li>
                    <li>Snacks box ( makanan Ringan saat perjalanan Makkah – Jeddah kepulangan )</li>
                    <li>Makan siang / makan malam saat kedatangan</li>
                    <li>Makan siang / makan malam saat kepulangan</li>
                    <li>Air Zamzam 05 Liter ( Apabila Diizinkan )</li>
                </ol>
            </div>

            {/* Base On Section */}
            <div className="w-[40%] text-right flex flex-col items-end justify-start pt-2">
                <h3 className="text-2xl font-bold uppercase tracking-wide mb-2">Base On</h3>
                <div className="text-[80px] font-bold leading-none tracking-tighter">{paxCount}</div>
                <div className="text-5xl font-bold uppercase tracking-widest mt-2">Pax</div>
            </div>
        </div>
        {/* Bottom Contact Bar */}
        <div className="mt-auto px-2 pt-2 pb-4 flex justify-between items-end relative z-10 border-t border-gray-900/20">
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
  </div>
);
};
