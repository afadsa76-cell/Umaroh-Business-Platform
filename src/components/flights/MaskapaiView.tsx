import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, PlaneTakeoff, RefreshCw, X, Download, FileText, Check, ChevronLeft, ChevronRight, Zap, Upload, FileSpreadsheet, FileUp } from 'lucide-react';
import { Maskapai, maskapaiData as initialData } from '../../data/maskapai';
import * as XLSX from 'xlsx';
import { db, collection, onSnapshot, writeBatch, doc, updateDoc, deleteDoc, handleFirestoreError, OperationType, query, where, setDoc } from '../../firebase';

export interface ParsedFlightItem extends Partial<Maskapai> {
  isUpdate?: boolean;
  targetExistingName?: string;
}

const extractAirportCode = (city?: string) => {
  if (!city) return "";
  const match = city.match(/\(([A-Z]{3})\)/i);
  if (match) return match[1].toUpperCase();
  const cleaned = city.replace(/[^A-Za-z]/g, "").trim();
  if (cleaned.length === 3) return cleaned.toUpperCase();
  return city.substring(0, 3).toUpperCase();
};

const generateDefaultRute = (origin?: string, destination?: string) => {
  const originCode = extractAirportCode(origin) || "CGK";
  const destCode = extractAirportCode(destination) || "JED";
  return `${originCode} - ${destCode} / ${destCode} - ${originCode}`;
};

const generateDefaultItinerary = (maskapaiName?: string, tglBerangkat?: string, tglPulang?: string, destination?: string) => {
  if (!tglBerangkat || !tglPulang) return "";
  
  const formatDateShort = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    return `${d.getDate()}${months[d.getMonth()]}`;
  };

  const depDateFormatted = formatDateShort(tglBerangkat);
  const retDateFormatted = formatDateShort(tglPulang);
  const maskapaiShortName = maskapaiName ? maskapaiName.split(' ')[0].toUpperCase() : 'SV';
  const randomPnr = Math.random().toString(36).substring(2, 8).toUpperCase();
  const destCity = extractAirportCode(destination) || 'JED';
  const days = Math.round((new Date(tglPulang).getTime() - new Date(tglBerangkat).getTime()) / (1000 * 3600 * 24)) + 1;

  return `${destCity}${destCity} HK20 ${days}D PNR:${randomPnr}\n` +
    `${depDateFormatted} ${maskapaiShortName}827 CGK${destCity} 0040 0610\n` +
    `${retDateFormatted} ${maskapaiShortName}816 ${destCity}CGK 1830 0815+1`;
};

const getAirlineFromCode = (code: string): string => {
  const c = code.toUpperCase();
  switch (c) {
    case 'WY': return 'OMAN AIR';
    case 'SV': return 'SAUDIA AIRLINES';
    case 'GA': return 'GARUDA INDONESIA';
    case 'QR': return 'QATAR AIRWAYS';
    case 'EK': return 'EMIRATES';
    case 'EY': return 'ETIHAD AIRWAYS';
    case 'MH': return 'MALAYSIA AIRLINES';
    case 'TK': return 'TURKISH AIRLINES';
    case 'SQ': return 'SINGAPORE AIRLINES';
    case 'TR':
    case 'TZ': return 'SCOOT';
    case 'AK':
    case 'QZ':
    case 'FD':
    case 'D7': return 'AIRASIA';
    case 'HU': return 'HAINAN AIRLINES';
    case 'CZ': return 'CHINA SOUTHERN';
    case 'JT': return 'LION AIR';
    case 'ID': return 'BATIK AIR';
    case 'XY': return 'FLYNAS';
    case 'KU': return 'KUWAIT AIRWAYS';
    case 'GF': return 'GULF AIR';
    case 'FZ': return 'FLYDUBAI';
    default: return `${c} AIRLINES`;
  }
};

const getCityDisplayName = (code: string): string => {
  const c = code.toUpperCase();
  switch (c) {
    case 'CGK': return 'JAKARTA (CGK)';
    case 'SUB': return 'SURABAYA (SUB)';
    case 'KNO': return 'MEDAN (KNO)';
    case 'UPG': return 'MAKASSAR (UPG)';
    case 'SOC': return 'SOLO (SOC)';
    case 'KJT': return 'MAJALENGKA (KJT)';
    case 'JED': return 'JEDDAH (JED)';
    case 'MED': return 'MADINAH (MED)';
    case 'MCT': return 'MUSCAT (MCT)';
    case 'DOH': return 'DOHA (DOH)';
    case 'DXB': return 'DUBAI (DXB)';
    case 'KUL': return 'KUALA LUMPUR (KUL)';
    case 'SIN': return 'SINGAPORE (SIN)';
    default: return c;
  }
};

const calculateMarginAndSellPrice = (buyPrice: number, airlineName: string): { margin: number; persen: number; hargaJual: number } => {
  if (buyPrice <= 0) return { margin: 0, persen: 0, hargaJual: 0 };
  let pct = buyPrice >= 15000000 ? 1 : 2;
  const upper = (airlineName || '').toUpperCase();
  if (upper.includes('INDIGO') || upper.includes('HAINAN')) {
    pct = 2;
  }
  let calculatedMargin = Math.round((buyPrice * (pct / 100)) / 10000) * 10000;
  if (calculatedMargin < 200000) calculatedMargin = 300000;
  const hargaJual = buyPrice + calculatedMargin;
  const actualPersen = Number(((calculatedMargin / buyPrice) * 100).toFixed(2));
  return { margin: calculatedMargin, persen: actualPersen, hargaJual };
};

const parseBulkText = (text: string, manualPrice?: number, customVendor?: string, targetYear?: number, existingList: Maskapai[] = []) => {
  if (!text) return [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // 1. Auto-detect vendor if not custom
  let detectedVendor = customVendor && customVendor !== 'All' ? customVendor : '';
  const upperText = text.toUpperCase();
  if (!detectedVendor || detectedVendor === 'PT. Darmawisata Indonesia') {
    if (upperText.includes('AZZA') || upperText.includes('ABM')) {
      detectedVendor = 'PT AZZA BAROKAH MADINAH';
    } else if (upperText.includes('BURGUNDY')) {
      detectedVendor = 'PT. BURGUNDY WISATA INTERNATIONAL';
    } else if (upperText.includes('DAHLIA')) {
      detectedVendor = 'IBU DAHLIA';
    } else if (upperText.includes('NQH')) {
      detectedVendor = 'NQH WISATA';
    } else if (upperText.includes('ARRAYYAN')) {
      detectedVendor = 'PT ARRAYYAN AL MUBARAK';
    } else if (upperText.includes('MADANI')) {
      detectedVendor = 'Madani Tour';
    } else if (upperText.includes('FATAYA')) {
      detectedVendor = 'FATAYA';
    } else if (upperText.includes('FRESHNEL')) {
      detectedVendor = 'FRESHNEL';
    } else if (upperText.includes('HAINAN')) {
      detectedVendor = 'HAINANTIKET.COM';
    } else {
      detectedVendor = customVendor || 'PT. Darmawisata Indonesia';
    }
  }

  // 2. Determine year
  let resolvedYear = targetYear;
  if (!resolvedYear) {
    const yearMatch = text.match(/\b(202[6-9])\b/);
    if (yearMatch) {
      resolvedYear = parseInt(yearMatch[1]);
    } else {
      resolvedYear = new Date().getFullYear();
    }
  }

  const parseFlightDate = (dateStr: string, fallbackYear: number) => {
    const m = dateStr.match(/^(\d{1,2})([A-Za-z]{3})/i);
    if (!m) return '';
    const day = parseInt(m[1]);
    const monthStr = m[2].toUpperCase();
    const months: Record<string, number> = {
      JAN: 0, FEB: 1, MAR: 2, APR: 3, MEI: 4, MAY: 4, JUN: 5, JUL: 6, AGT: 7, AUG: 7, SEP: 8, OKT: 9, OCT: 9, NOV: 10, DES: 11, DEC: 11
    };
    const monthIdx = months[monthStr] !== undefined ? months[monthStr] : 1;
    let year = fallbackYear;
    if (!targetYear) {
      const now = new Date();
      if (monthIdx < now.getMonth() && year <= now.getFullYear()) {
        year = now.getFullYear() + 1;
      }
    }
    const mm = String(monthIdx + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  // Extract global price if present
  let defaultPrice = manualPrice || 0;
  if (!defaultPrice) {
    const priceRegex = /harga\s*(?:rp\.?\s*)?([\d.]+)/i;
    for (const line of lines) {
      const match = line.match(priceRegex);
      if (match) {
        defaultPrice = parseInt(match[1].replace(/\./g, '')) || 0;
        break;
      }
    }
  }

  const flights: ParsedFlightItem[] = [];

  // Pattern A: GDS Line like "1 WY 850G 01FEB M CGKMCT*HK45 1355 1830 /E"
  const gdsSegmentRegex = /^\s*(\d+)\s+([A-Z0-9]{2})\s*(\d+[A-Z]?)\s+(\d{1,2}[A-Za-z]{3})\s*(?:[A-Za-z]?)\s+([A-Za-z]{3})([A-Za-z]{3})(?:\*HK(\d+))?\s+(\d{4})\s+(\d{4})/i;
  
  // Pattern B: Standard Direct Line like "01NOV SV827 CGKJED 0040 0610"
  const directFlightRegex = /(\d{2}[A-Za-z]{3})\s+([A-Za-z]{2}\d+[A-Za-z]?)\s+([A-Za-z]{6})\s+(\d{4})\s+(\d{4}(?:\+\d)?)/i;

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const cleanLine = rawLine.replace(/[*_]/g, '').trim();

    // Check if line is GDS segment 1 (start of a GDS PNR block)
    const gdsMatch = cleanLine.match(gdsSegmentRegex);
    if (gdsMatch && gdsMatch[1] === '1') {
      let headerLine = "";
      if (i > 0) {
        headerLine = lines[i - 1].replace(/[*_]/g, '').trim();
      }

      // Collect all segments
      const segments: Array<{ seq: number; carrier: string; flightNo: string; dateStr: string; from: string; to: string; seats?: number; depTime: string; arrTime: string; raw: string }> = [];
      const segmentRawLines: string[] = [];
      let currentIdx = i;

      while (currentIdx < lines.length) {
        const segLineClean = lines[currentIdx].replace(/[*_]/g, '').trim();
        const m = segLineClean.match(gdsSegmentRegex);
        if (m) {
          segments.push({
            seq: parseInt(m[1]),
            carrier: m[2].toUpperCase(),
            flightNo: m[3],
            dateStr: m[4],
            from: m[5].toUpperCase(),
            to: m[6].toUpperCase(),
            seats: m[7] ? parseInt(m[7]) : undefined,
            depTime: m[8],
            arrTime: m[9],
            raw: lines[currentIdx]
          });
          segmentRawLines.push(lines[currentIdx]);
          currentIdx++;
        } else {
          break;
        }
      }

      if (segments.length >= 2) {
        let blockPrice = defaultPrice;
        let blockDays = 9;
        let blockPnr = "";

        const headerPnrMatch = headerLine.match(/(?:[A-Z0-9]+)\/([A-Z0-9\s]+)\/(\d+)\s*D\s*\/([\d.]+)/i);
        if (headerPnrMatch) {
          blockPnr = headerPnrMatch[1].trim();
          blockDays = parseInt(headerPnrMatch[2]) || 9;
          blockPrice = parseInt(headerPnrMatch[3].replace(/\./g, '')) || blockPrice;
        } else {
          const daysMatch = headerLine.match(/(\d+)\s*D/i);
          if (daysMatch) blockDays = parseInt(daysMatch[1]);
          const priceMatch = headerLine.match(/([\d.]+000)/);
          if (priceMatch) blockPrice = parseInt(priceMatch[1].replace(/\./g, '')) || blockPrice;
        }

        const leg1 = segments[0];
        const lastLeg = segments[segments.length - 1];
        const outDestLeg = segments.length >= 4 ? segments[1] : leg1;
        const retOriginLeg = segments.length >= 4 ? segments[2] : lastLeg;

        const originCode = leg1.from;
        const outDestCode = outDestLeg.to;
        const retOriginCode = retOriginLeg.from;
        const retDestCode = lastLeg.to;

        const airlineName = getAirlineFromCode(leg1.carrier);
        const depDate = parseFlightDate(leg1.dateStr, resolvedYear);
        const retDate = parseFlightDate(lastLeg.dateStr, resolvedYear);

        const availableSeats = leg1.seats || 45;
        const isTransit = segments.length > 2;

        let ruteLabel = `${originCode} - ${outDestCode} / ${retOriginCode} - ${retDestCode}`;
        if (isTransit) {
          ruteLabel = `${originCode} - ${leg1.to} - ${outDestCode} / ${retOriginCode} - ${lastLeg.from} - ${retDestCode}`;
        }

        let destinationCityName = outDestCode === 'JED' ? 'JEDDAH (JED)' : (outDestCode === 'MED' ? 'MADINAH (MED)' : outDestCode);
        if (outDestCode !== retOriginCode && (outDestCode === 'JED' || retOriginCode === 'JED')) {
          destinationCityName = `JEDDAH (JED) / MEDINAH (MED)`;
        }

        const marginCalc = calculateMarginAndSellPrice(blockPrice, airlineName);
        const itineraryText = [
          headerLine ? `*${headerLine}*` : `*${airlineName} ${ruteLabel} (${blockDays}D)*`,
          ...segmentRawLines
        ].join('\n');

        // Check if this flight matches an existing flight in existingList to enable UPDATE mode
        const existingMatch = existingList.find(ex => {
          if (blockPnr) {
            const pnrTokens = blockPnr.split(/\s+/).filter(Boolean);
            const matchesPnr = pnrTokens.some(token => 
              (ex.name && ex.name.toUpperCase().includes(token.toUpperCase())) ||
              (ex.id && ex.id.toLowerCase().includes(token.toLowerCase())) ||
              (ex.flightItinerary && ex.flightItinerary.toUpperCase().includes(token.toUpperCase()))
            );
            if (matchesPnr) return true;
          }
          if (
            ex.namaVendor?.toLowerCase() === detectedVendor.toLowerCase() &&
            ex.tanggalKeberangkatan === depDate &&
            (ex.ruteLabel === ruteLabel || ex.programDays === blockDays)
          ) {
            return true;
          }
          return false;
        });

        const isUpdate = Boolean(existingMatch);
        const resolvedId = existingMatch?.id || `flight-import-${Date.now()}-${flights.length + 1}`;

        flights.push({
          id: resolvedId,
          isUpdate,
          targetExistingName: existingMatch?.name,
          name: `${airlineName} ${originCode}-${outDestCode}/${retOriginCode} (${String(blockDays).padStart(2, '0')}D) (${availableSeats} PAX)${blockPnr ? ` (PNR: ${blockPnr})` : ''}`,
          namaVendor: detectedVendor,
          ruteLabel,
          originCityName: getCityDisplayName(originCode),
          destinationCityName,
          tanggalKeberangkatan: depDate,
          tanggalKepulangan: retDate,
          programDays: blockDays,
          totalSeats: availableSeats,
          availableSeats: availableSeats,
          hargaBeli: blockPrice,
          hargaSetoran: blockPrice,
          hargaJual: marginCalc.hargaJual,
          margin: marginCalc.margin,
          persen: marginCalc.persen,
          tipePenerbangan: isTransit ? 'TRANSIT' : 'DIRECT',
          flightItinerary: itineraryText,
          updatedAt: new Date().toISOString()
        });

        i = currentIdx;
        continue;
      }
    }

    // Pattern B: Direct 2-leg Flight
    const match1 = cleanLine.match(directFlightRegex);
    if (match1) {
      let match2: RegExpMatchArray | null = null;
      let nextFlightIdx = -1;
      
      for (let j = i + 1; j <= i + 3 && j < lines.length; j++) {
        const cleanNextLine = lines[j].replace(/[*_]/g, '').trim();
        const m = cleanNextLine.match(directFlightRegex);
        if (m) {
          match2 = m;
          nextFlightIdx = j;
          break;
        }
      }
      
      if (match2 && nextFlightIdx !== -1) {
        let programHeader = "";
        if (i > 0) {
          const prevLine = lines[i - 1].replace(/[*_]/g, '').trim();
          if (prevLine.toUpperCase().includes('PROG') || prevLine.toUpperCase().includes(' JED') || prevLine.toUpperCase().includes(' D') || prevLine.toUpperCase().includes('MED')) {
            programHeader = prevLine;
          }
        }
        if (!programHeader) {
          programHeader = "JED JED PROG 9D";
        }
        
        let seatLine = "";
        let availableSeats = 45;
        const headerSeatMatch = programHeader.match(/(?:pax|hk)\s*(\d+)/i) || programHeader.match(/(\d+)\s*(?:pax|hk)/i);
        if (headerSeatMatch) {
          availableSeats = parseInt(headerSeatMatch[1]) || 45;
        }
        
        for (let j = nextFlightIdx + 1; j <= nextFlightIdx + 3 && j < lines.length; j++) {
          const nextLineClean = lines[j].replace(/[*_]/g, '').trim();
          if (nextLineClean.toLowerCase().includes('pax') || nextLineClean.toLowerCase().includes('hk') || nextLineClean.toLowerCase().includes('hold')) {
            seatLine = nextLineClean;
            const seatMatch = nextLineClean.match(/(?:pax|hk)\s*(\d+)/i) || nextLineClean.match(/(\d+)\s*(?:pax|hk)/i);
            if (seatMatch) availableSeats = parseInt(seatMatch[1]) || availableSeats;
            break;
          }
        }

        const tglBerangkat = parseFlightDate(match1[1], resolvedYear);
        const tglKepulangan = parseFlightDate(match2[1], resolvedYear);
        
        const carrierCode = match1[2].substring(0, 2).toUpperCase();
        const airlineName = getAirlineFromCode(carrierCode);
        
        const outRoute = match1[3].toUpperCase();
        const retRoute = match2[3].toUpperCase();
        const originCity = outRoute.substring(0, 3);
        const outDest = outRoute.substring(3, 6);
        const retOrigin = retRoute.substring(0, 3);
        const retDest = retRoute.substring(3, 6);
        
        let destinationCityName = outDest === 'JED' ? 'JEDDAH (JED)' : (outDest === 'MED' ? 'MADINAH (MED)' : outDest);
        if (outDest !== retOrigin && (retOrigin === 'MED' || retOrigin === 'JED')) {
          destinationCityName = `JEDDAH (JED) / MEDINAH (MED)`;
        }
        const ruteLabel = `${originCity} - ${outDest} / ${retOrigin} - ${retDest}`;
        
        const progMatch = programHeader.match(/(\d+)\s*D/i);
        const programDays = progMatch ? parseInt(progMatch[1]) : (
          tglBerangkat && tglKepulangan ? Math.round((new Date(tglKepulangan).getTime() - new Date(tglBerangkat).getTime()) / (1000 * 3600 * 24)) + 1 : 9
        );
        
        const marginCalc = calculateMarginAndSellPrice(defaultPrice, airlineName);
        const itineraryParts = [
          `*${programHeader}*`,
          lines[i].replace(/[*_]/g, '').trim(),
          lines[nextFlightIdx].replace(/[*_]/g, '').trim()
        ];
        if (seatLine) itineraryParts.push(`*${seatLine}*`);

        // Check if direct flight exists in existingList
        const existingMatch = existingList.find(ex => {
          if (
            ex.namaVendor?.toLowerCase() === detectedVendor.toLowerCase() &&
            ex.tanggalKeberangkatan === tglBerangkat &&
            (ex.ruteLabel === ruteLabel || ex.programDays === programDays)
          ) {
            return true;
          }
          return false;
        });

        const isUpdate = Boolean(existingMatch);
        const resolvedId = existingMatch?.id || `flight-import-${Date.now()}-${flights.length + 1}`;

        flights.push({
          id: resolvedId,
          isUpdate,
          targetExistingName: existingMatch?.name,
          name: `${airlineName} ${originCity}-${outDest}/${retOrigin} (${String(programDays).padStart(2, '0')}D) (${availableSeats} PAX)`,
          namaVendor: detectedVendor,
          ruteLabel,
          originCityName: getCityDisplayName(originCity),
          destinationCityName,
          tanggalKeberangkatan: tglBerangkat,
          tanggalKepulangan: tglKepulangan,
          totalSeats: availableSeats,
          availableSeats: availableSeats,
          hargaSetoran: defaultPrice,
          hargaBeli: defaultPrice,
          hargaJual: marginCalc.hargaJual,
          margin: marginCalc.margin,
          persen: marginCalc.persen,
          flightItinerary: itineraryParts.join('\n'),
          tipePenerbangan: 'DIRECT',
          programDays,
          updatedAt: new Date().toISOString()
        });
        
        i = nextFlightIdx + 1;
        continue;
      }
    }

    i++;
  }

  return flights;
};

interface MaskapaiViewProps {
  isVendorMode?: boolean;
  vendorName?: string;
}

export const MaskapaiView: React.FC<MaskapaiViewProps> = ({ isVendorMode = false, vendorName = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState<Maskapai[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'confirm' | 'migrating' | 'success' | 'error'>('idle');

  // Dynamic filter states
  const [filterKeberangkatan, setFilterKeberangkatan] = useState<'future' | 'past' | 'all'>('future');
  const [filterMinSeats, setFilterMinSeats] = useState<number>(10);
  const [filterVendor, setFilterVendor] = useState<string>('All');
  const [isCleaning, setIsCleaning] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterKeberangkatan, filterMinSeats, filterVendor]);

  // Bulk parsing state variables
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkPriceInput, setBulkPriceInput] = useState<string>('');
  const [bulkVendorInput, setBulkVendorInput] = useState<string>('');
  const [bulkYearInput, setBulkYearInput] = useState<string>('auto');
  const [bulkActiveTab, setBulkActiveTab] = useState<'text' | 'file'>('text');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [parsedFlights, setParsedFlights] = useState<ParsedFlightItem[]>([]);

  useEffect(() => {
    const manualPrice = parseInt(bulkPriceInput.replace(/\D/g, '')) || 0;
    const selectedYear = bulkYearInput === 'auto' ? undefined : parseInt(bulkYearInput);
    const flights = parseBulkText(
      bulkText,
      manualPrice,
      isVendorMode ? vendorName : (bulkVendorInput || undefined),
      selectedYear,
      data
    );
    setParsedFlights(flights);
  }, [bulkText, bulkPriceInput, bulkVendorInput, bulkYearInput, isVendorMode, vendorName, data]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        if (content) {
          setBulkText(content);
          setBulkActiveTab('text');
          showToastMsg(`File teks ${file.name} berhasil dimuat!`, 'info');
        }
      };
      reader.readAsText(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
          
          if (!rawRows || rawRows.length === 0) {
            showToastMsg('File Excel kosong atau format kolom tidak terbaca.', 'error');
            return;
          }

          const flightsFromExcel: ParsedFlightItem[] = [];
          
          rawRows.forEach((row, idx) => {
            const name = String(row['Maskapai'] || row['Airline'] || row['Nama'] || row['Penerbangan'] || 'SAUDIA AIRLINES');
            const vendor = String(row['Vendor'] || row['Nama Vendor'] || bulkVendorInput || 'PT. Darmawisata Indonesia');
            const tglBerangkat = String(row['Tgl Berangkat'] || row['Tanggal Keberangkatan'] || row['Departure'] || '');
            const tglPulang = String(row['Tgl Pulang'] || row['Tanggal Kepulangan'] || row['Return'] || '');
            const rute = String(row['Rute'] || row['Route'] || 'CGK - JED / JED - CGK');
            const seats = parseInt(String(row['Seats'] || row['Kursi'] || row['PAX'] || row['Total Seats'] || '45')) || 45;
            const hargaBeli = parseInt(String(row['Harga Beli'] || row['Harga Setoran'] || row['Modal'] || row['Price'] || '0').replace(/\D/g, '')) || 0;
            const customHargaJual = parseInt(String(row['Harga Jual'] || '0').replace(/\D/g, '')) || 0;
            
            const marginCalc = calculateMarginAndSellPrice(hargaBeli, name);
            const finalHargaJual = customHargaJual > 0 ? customHargaJual : marginCalc.hargaJual;
            const finalMargin = finalHargaJual - hargaBeli;
            const finalPersen = hargaBeli > 0 ? Number(((finalMargin / hargaBeli) * 100).toFixed(2)) : 0;
            
            const originCity = rute.split('-')[0]?.trim() || 'CGK';
            const destCity = rute.includes('MED') ? 'JEDDAH (JED) / MEDINAH (MED)' : 'JEDDAH (JED)';

            const existingMatch = data.find(ex => 
              ex.namaVendor?.toLowerCase() === vendor.toLowerCase() && 
              ex.tanggalKeberangkatan === tglBerangkat && 
              (ex.ruteLabel === rute || ex.name === name)
            );
            const isUpdate = Boolean(existingMatch);
            const resolvedId = existingMatch?.id || `excel-import-${Date.now()}-${idx + 1}`;

            flightsFromExcel.push({
              id: resolvedId,
              isUpdate,
              targetExistingName: existingMatch?.name,
              name,
              namaVendor: vendor,
              ruteLabel: rute,
              originCityName: originCity === 'CGK' ? 'JAKARTA (CGK)' : originCity,
              destinationCityName: destCity,
              tanggalKeberangkatan: tglBerangkat,
              tanggalKepulangan: tglPulang,
              programDays: tglBerangkat && tglPulang ? Math.max(1, Math.round((new Date(tglPulang).getTime() - new Date(tglBerangkat).getTime()) / (1000 * 3600 * 24)) + 1) : 9,
              totalSeats: seats,
              availableSeats: seats,
              hargaBeli,
              hargaSetoran: hargaBeli,
              hargaJual: finalHargaJual,
              margin: finalMargin,
              persen: finalPersen,
              tipePenerbangan: rute.includes('MCT') || rute.includes('DOH') || rute.includes('DXB') || rute.includes('KUL') ? 'TRANSIT' : 'DIRECT',
              flightItinerary: `*${vendor}*\n*${name}*\n${rute}\n${tglBerangkat} s/d ${tglPulang}`,
              updatedAt: new Date().toISOString()
            });
          });

          setParsedFlights(flightsFromExcel);
          const updateCount = flightsFromExcel.filter(f => f.isUpdate).length;
          showToastMsg(`Sukses mengekstrak ${flightsFromExcel.length} rute dari file Excel! (${updateCount} rute cocok untuk di-update).`, 'success');
        } catch (err) {
          console.error(err);
          showToastMsg('Gagal membaca file Excel: ' + (err as Error).message, 'error');
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleRemoveParsedFlight = (idx: number) => {
    setParsedFlights(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveBulk = async () => {
    if (parsedFlights.length === 0) return;
    setIsSavingBulk(true);
    try {
      const newSavedFlights: Maskapai[] = [];
      
      parsedFlights.forEach((flight, idx) => {
        const docId = flight.id || `flight-${Date.now()}-${idx + 1}`;
        
        const cleanedPayload: Maskapai = {
          id: docId,
          name: flight.name || 'MASKAPAI UMRAH',
          originCityName: flight.originCityName || 'JAKARTA (CGK)',
          destinationCityName: flight.destinationCityName || 'JEDDAH (JED)',
          ruteLabel: flight.ruteLabel || 'CGK - JED / JED - CGK',
          tanggalKeberangkatan: flight.tanggalKeberangkatan || '',
          tanggalKepulangan: flight.tanggalKepulangan || '',
          programDays: flight.programDays || 9,
          totalSeats: flight.totalSeats || 45,
          availableSeats: flight.availableSeats ?? flight.totalSeats ?? 45,
          hargaBeli: flight.hargaBeli || 0,
          hargaSetoran: flight.hargaSetoran || flight.hargaBeli || 0,
          hargaJual: flight.hargaJual || 0,
          margin: flight.margin || 0,
          persen: flight.persen || 0,
          namaVendor: flight.namaVendor || 'PT AZZA BAROKAH MADINAH',
          flightItinerary: flight.flightItinerary || '',
          tipePenerbangan: flight.tipePenerbangan || 'TRANSIT',
          updatedAt: new Date().toISOString()
        };
        
        newSavedFlights.push(cleanedPayload);
      });
      
      // 1. Unrecord from deleted registry so they are always visible
      await unrecordDeletedIds(newSavedFlights.map(f => f.id));

      // 2. Persist locally to localStorage (guarantees zero data loss even if Firestore quota exceeded)
      saveCustomLocalMaskapai(newSavedFlights);

      // 3. Optimistically update existing in place and prepend new items so they are immediately visible
      setData(prev => {
        const savedMap = new Map(newSavedFlights.map(f => [f.id, f]));
        const updatedPrev = prev.map(p => savedMap.get(p.id) || p);
        const existingIdSet = new Set(prev.map(p => p.id));
        const genuinelyNew = newSavedFlights.filter(f => !existingIdSet.has(f.id));
        return [...genuinelyNew, ...updatedPrev];
      });

      const updatedCount = parsedFlights.filter(f => f.isUpdate).length;
      const newCount = parsedFlights.length - updatedCount;

      // 4. Background cloud sync to Firestore
      try {
        const batchChunks: Maskapai[][] = [];
        const chunkSize = 200;
        for (let i = 0; i < newSavedFlights.length; i += chunkSize) {
          batchChunks.push(newSavedFlights.slice(i, i + chunkSize));
        }

        for (const bChunk of batchChunks) {
          const batch = writeBatch(db);
          bChunk.forEach((flight) => {
            const docRef = doc(db, 'maskapai', flight.id);
            batch.set(docRef, flight, { merge: true });
          });
          await batch.commit();
        }

        const msg = updatedCount > 0 
          ? `Sukses! ${newCount > 0 ? `${newCount} rute baru ditambahkan & ` : ''}${updatedCount} rute jadwal berhasil diperbarui di database!`
          : `Sukses menambahkan ${newCount} rute maskapai ke database!`;
        showToastMsg(msg, 'success');
      } catch (cloudError) {
        console.warn("Firestore bulk batch warning (data saved locally):", cloudError);
        showToastMsg(`Sukses! ${newSavedFlights.length} rute berhasil disimpan secara lokal & aktif di sistem! (Penyimpanan lokal aktif).`, 'info');
      }

      setIsBulkOpen(false);
      setBulkText('');
      setBulkPriceInput('');
      setBulkVendorInput('');
      setParsedFlights([]);
    } catch (error) {
      console.error("Error saving bulk maskapai:", error);
      showToastMsg("Gagal mengimpor rute penerbangan: " + (error as Error).message, 'error');
    } finally {
      setIsSavingBulk(false);
    }
  };

  // Extract unique vendors for filtering
  const vendors = Array.from(
    new Set(
      data
        .map(item => item.namaVendor?.trim())
        .filter(Boolean)
    )
  )
  .filter(v => v.toLowerCase() !== 'all')
  .sort();

  // Custom interactive modal states (fixes blockages & security errors in sandboxed iframes)
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Maskapai | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Auto-Hapus toggle & execution tracker
  const lastCleanupTimestamp = useRef<number>(0);
  const [autoCleanupActive, setAutoCleanupActive] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('maskapai_auto_cleanup_active');
      return val !== null ? val === 'true' : true; // Default aktif
    } catch {
      return true;
    }
  });

  // Persistent registry of IDs that have been deleted (prevents resurrecting on Sync Data Baru)
  const [deletedRegistry, setDeletedRegistry] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('maskapai_deleted_ids_registry');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed.filter(id => !id.startsWith('ptazza-')));
      }
    } catch (e) {
      console.error(e);
    }
    return new Set<string>();
  });
  const deletedRegistryRef = useRef<Set<string>>(deletedRegistry);
  useEffect(() => {
    deletedRegistryRef.current = deletedRegistry;
  }, [deletedRegistry]);

  // Sync deletedRegistry with Firestore umaroh_master_data
  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'umaroh_master_data', 'maskapai_deleted_registry'), (snap) => {
        if (snap.exists()) {
          const remoteIds = snap.data()?.deletedIds || [];
          if (Array.isArray(remoteIds)) {
            const cleanRemote = remoteIds.filter((id: string) => !id.startsWith('ptazza-'));
            const next = new Set<string>(cleanRemote);
            setDeletedRegistry(next);
            try {
              localStorage.setItem('maskapai_deleted_ids_registry', JSON.stringify(cleanRemote));
            } catch (e) {
              console.error(e);
            }
          }
        }
      }, (err) => {
        console.warn('Gagal membaca deleted registry dari Firestore:', err);
      });
      return () => unsub();
    } catch (err) {
      console.warn('Listener deleted registry error:', err);
    }
  }, []);

  const recordDeletedIds = async (idsToAdd: string[]) => {
    if (!idsToAdd || idsToAdd.length === 0) return;
    const updated = new Set([...deletedRegistryRef.current, ...idsToAdd]);
    setDeletedRegistry(updated);
    deletedRegistryRef.current = updated;
    const updatedArr = Array.from(updated);
    try {
      localStorage.setItem('maskapai_deleted_ids_registry', JSON.stringify(updatedArr));
    } catch (e) {
      console.error(e);
    }
    try {
      await setDoc(doc(db, 'umaroh_master_data', 'maskapai_deleted_registry'), {
        deletedIds: updatedArr,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn("Gagal menyimpan deleted registry ke Firestore:", e);
    }
  };

  const unrecordDeletedIds = async (idsToRemove: string[]) => {
    if (!idsToRemove || idsToRemove.length === 0) return;
    const idSet = new Set(idsToRemove);
    const updated = new Set([...deletedRegistryRef.current].filter(id => !idSet.has(id)));
    setDeletedRegistry(updated);
    deletedRegistryRef.current = updated;
    const updatedArr = Array.from(updated);
    try {
      localStorage.setItem('maskapai_deleted_ids_registry', JSON.stringify(updatedArr));
    } catch (e) {
      console.error(e);
    }
    try {
      await setDoc(doc(db, 'umaroh_master_data', 'maskapai_deleted_registry'), {
        deletedIds: updatedArr,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn("Gagal update deleted registry ke Firestore:", e);
    }
  };

  const getCustomLocalMaskapai = (): Maskapai[] => {
    try {
      const raw = localStorage.getItem('umaroh_custom_maskapai');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load local custom maskapai:', e);
    }
    return [];
  };

  const saveCustomLocalMaskapai = (items: Maskapai[]) => {
    try {
      const current = getCustomLocalMaskapai();
      const map = new Map(current.map(m => [m.id, m]));
      items.forEach(m => map.set(m.id, m));
      localStorage.setItem('umaroh_custom_maskapai', JSON.stringify(Array.from(map.values())));
    } catch (e) {
      console.error('Failed to save local custom maskapai:', e);
    }
  };

  const handleResetDeletedRegistry = async () => {
    if (!window.confirm("Apakah Anda yakin ingin me-reset riwayat rute yang pernah dihapus? Setelah di-reset, rute tersebut dapat disinkronkan kembali jika Anda mengklik tombol Sync Data Baru.")) {
      return;
    }
    const emptySet = new Set<string>();
    setDeletedRegistry(emptySet);
    deletedRegistryRef.current = emptySet;
    try {
      localStorage.removeItem('maskapai_deleted_ids_registry');
      await setDoc(doc(db, 'umaroh_master_data', 'maskapai_deleted_registry'), {
        deletedIds: [],
        updatedAt: new Date().toISOString()
      }, { merge: true });
      showToastMsg("Riwayat rute terhapus berhasil di-reset.", "success");
    } catch (e) {
      console.error(e);
      showToastMsg("Gagal me-reset riwayat terhapus.", "error");
    }
  };

  const toggleAutoCleanup = () => {
    const next = !autoCleanupActive;
    setAutoCleanupActive(next);
    if (next) {
      lastCleanupTimestamp.current = 0; // Segera aktifkan pembersihan jika ada rute kedaluwarsa
    }
    try {
      localStorage.setItem('maskapai_auto_cleanup_active', String(next));
    } catch (e) {
      console.error(e);
    }
    showToastMsg(
      next 
        ? "Auto-Hapus Database DIAKTIFKAN: Jadwal kedaluwarsa, kursi habis & rute mati otomatis dibersihkan." 
        : "Auto-Hapus Database DINONAKTIFKAN: Mode manual aktif.",
      next ? "success" : "info"
    );
  };

  // Batch selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  const showToastMsg = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
  };

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Maskapai>>({
    name: '',
    originCityName: '',
    destinationCityName: '',
    ruteLabel: '',
    tanggalKeberangkatan: '',
    tanggalKepulangan: '',
    hargaSetoran: 0,
    hargaJual: 0,
    availableSeats: 0,
    namaVendor: '',
    flightItinerary: ''
  });

  useEffect(() => {
    const colRef = collection(db, 'maskapai');
    const q = isVendorMode && vendorName
      ? query(colRef, where('namaVendor', '==', vendorName))
      : colRef;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const maskapaiList: Maskapai[] = [];
      const remoteIds = new Set<string>();
      
      snapshot.forEach((doc) => {
        // Strict guard: Jangan masukkan data yang ada di deletedRegistry
        if (deletedRegistryRef.current.has(doc.id)) {
          return;
        }
        const item = { id: doc.id, ...doc.data() } as Maskapai;
        maskapaiList.push(item);
        remoteIds.add(doc.id);
      });
      
      // Merge custom local flights & initialData items
      const customLocal = getCustomLocalMaskapai();
      const customMap = new Map(customLocal.map(c => [c.id, c]));
      
      const mergedList = maskapaiList.map(m => customMap.get(m.id) || m);
      const allKnownIds = new Set(mergedList.map(m => m.id));
      
      // Add custom local items that weren't in remote Firestore
      customLocal.forEach(c => {
        if (!allKnownIds.has(c.id) && !deletedRegistryRef.current.has(c.id)) {
          if (isVendorMode && vendorName && c.namaVendor !== vendorName) return;
          mergedList.push(c);
          allKnownIds.add(c.id);
        }
      });

      // Add static initialData items
      initialData.forEach((staticItem) => {
        if (!allKnownIds.has(staticItem.id) && !deletedRegistryRef.current.has(staticItem.id)) {
          if (isVendorMode && vendorName && staticItem.namaVendor !== vendorName) {
            return;
          }
          mergedList.push(staticItem);
          allKnownIds.add(staticItem.id);
        }
      });

      setData(mergedList);
      setLoading(false);
    }, (error) => {
      console.warn("Firestore maskapai fetch offline / quota notice:", error);
      setLoading(false);
      const customLocal = getCustomLocalMaskapai();
      const fallbackList: Maskapai[] = [...customLocal];
      const seen = new Set(fallbackList.map(f => f.id));

      initialData.forEach(item => {
        if (seen.has(item.id)) return;
        if (deletedRegistryRef.current.has(item.id)) return;
        if (isVendorMode && vendorName && item.namaVendor !== vendorName) return;
        fallbackList.push(item);
        seen.add(item.id);
      });
      setData(fallbackList);
    });

    return () => unsubscribe();
  }, [isVendorMode, vendorName]);

  const handleOpenForm = (item?: Maskapai) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        name: item.name,
        originCityName: item.originCityName,
        destinationCityName: item.destinationCityName,
        ruteLabel: item.ruteLabel,
        tanggalKeberangkatan: item.tanggalKeberangkatan,
        tanggalKepulangan: item.tanggalKepulangan,
        hargaSetoran: item.hargaSetoran,
        hargaBeli: item.hargaBeli || item.hargaSetoran,
        hargaJual: item.hargaJual,
        availableSeats: item.availableSeats,
        namaVendor: isVendorMode ? vendorName : item.namaVendor,
        margin: item.margin || 0,
        persen: item.persen || 0,
        flightItinerary: item.flightItinerary || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        originCityName: '',
        destinationCityName: '',
        ruteLabel: '',
        tanggalKeberangkatan: '',
        tanggalKepulangan: '',
        hargaSetoran: 0,
        hargaBeli: 0,
        hargaJual: 0,
        availableSeats: 45,
        namaVendor: isVendorMode ? vendorName : '',
        margin: 0,
        persen: 0,
        flightItinerary: ''
      });
    }
    setSingleQuickPaste('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setSingleQuickPaste('');
  };

  const [singleQuickPaste, setSingleQuickPaste] = useState('');

  const handleQuickParseSingle = () => {
    if (!singleQuickPaste.trim()) {
      showToastMsg('Silakan tempel teks broadcast atau PNR terlebih dahulu', 'info');
      return;
    }
    const parsed = parseBulkText(singleQuickPaste, undefined, isVendorMode ? vendorName : undefined, undefined, data);
    if (parsed.length === 0) {
      showToastMsg('Format penerbangan tidak terdeteksi. Pastikan mencakup tanggal dan kode rute.', 'error');
      return;
    }
    const item = parsed[0];
    if (item.isUpdate && item.id) {
      setEditingId(item.id);
      showToastMsg(`Rute cocok dengan jadwal yang sudah ada (${item.targetExistingName || item.name}). Mode UPDATE aktif!`, 'info');
    } else {
      showToastMsg(`Format berhasil diekstrak ke form! Silakan tinjau dan simpan.`, 'success');
    }
    setFormData(prev => ({
      ...prev,
      name: item.name || prev.name,
      originCityName: item.originCityName || prev.originCityName,
      destinationCityName: item.destinationCityName || prev.destinationCityName,
      ruteLabel: item.ruteLabel || prev.ruteLabel,
      tanggalKeberangkatan: item.tanggalKeberangkatan || prev.tanggalKeberangkatan,
      tanggalKepulangan: item.tanggalKepulangan || prev.tanggalKepulangan,
      programDays: item.programDays || prev.programDays,
      hargaBeli: item.hargaBeli || prev.hargaBeli,
      hargaSetoran: item.hargaSetoran || prev.hargaSetoran,
      hargaJual: item.hargaJual || prev.hargaJual,
      margin: item.margin || prev.margin,
      persen: item.persen || prev.persen,
      availableSeats: item.availableSeats ?? prev.availableSeats,
      totalSeats: item.totalSeats ?? prev.totalSeats,
      namaVendor: item.namaVendor || prev.namaVendor,
      flightItinerary: item.flightItinerary || prev.flightItinerary
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalItinerary = formData.flightItinerary?.trim() || generateDefaultItinerary(
        formData.name,
        formData.tanggalKeberangkatan,
        formData.tanggalKepulangan,
        formData.destinationCityName
      );

      const finalRuteLabel = formData.ruteLabel?.trim() || generateDefaultRute(
        formData.originCityName,
        formData.destinationCityName
      );

      const docId = editingId || `maskapai-${Date.now()}`;

      const finalItem: Maskapai = {
        id: docId,
        name: formData.name || 'MASKAPAI UMRAH',
        originCityName: formData.originCityName || 'JAKARTA (CGK)',
        destinationCityName: formData.destinationCityName || 'JEDDAH (JED)',
        ruteLabel: finalRuteLabel,
        tanggalKeberangkatan: formData.tanggalKeberangkatan || '',
        tanggalKepulangan: formData.tanggalKepulangan || '',
        programDays: formData.programDays || 9,
        totalSeats: formData.totalSeats || 45,
        availableSeats: formData.availableSeats ?? formData.totalSeats ?? 45,
        hargaBeli: formData.hargaBeli || 0,
        hargaSetoran: formData.hargaSetoran || formData.hargaBeli || 0,
        hargaJual: formData.hargaJual || 0,
        margin: formData.margin || 0,
        persen: formData.persen || 0,
        namaVendor: formData.namaVendor || 'PT AZZA BAROKAH MADINAH',
        flightItinerary: finalItinerary,
        tipePenerbangan: formData.tipePenerbangan || 'TRANSIT',
        updatedAt: new Date().toISOString()
      };

      // 1. Unrecord from deleted registry if it was previously marked as deleted
      await unrecordDeletedIds([docId]);

      // 2. Persist locally to localStorage (zero loss guarantee)
      saveCustomLocalMaskapai([finalItem]);

      // 3. Optimistically update local React state
      setData(prev => {
        const exists = prev.some(p => p.id === docId);
        if (exists) {
          return prev.map(p => p.id === docId ? finalItem : p);
        }
        return [finalItem, ...prev];
      });

      handleCloseForm();

      // 4. Sync with Firestore using setDoc with merge: true (works for both existing and new documents)
      try {
        await setDoc(doc(db, 'maskapai', docId), finalItem, { merge: true });
        showToastMsg(`Sukses! Data rute ${finalItem.name} berhasil disimpan & di-update ke database!`, 'success');
      } catch (cloudErr) {
        console.warn("Firestore sync warning (saved locally):", cloudErr);
        showToastMsg(`Sukses! Data rute ${finalItem.name} disimpan secara lokal & aktif di sistem! (Penyimpanan lokal aktif).`, 'info');
      }
    } catch (error) {
      console.error("Error saving maskapai:", error);
      showToastMsg('Gagal menyimpan data maskapai: ' + (error as Error).message, 'error');
    }
  };

  const handleSyncStaticData = async () => {
    if (migrationStatus === 'idle') {
      setMigrationStatus('confirm');
      return;
    }
    if (migrationStatus !== 'confirm') return;

    setMigrationStatus('migrating');
    try {
      const existingIds = new Set(data.map(item => item.id));
      const today = new Date().toISOString().split('T')[0];
      const deletedSet = deletedRegistryRef.current;

      // Saring hanya data yang BENAR-BENAR BARU:
      // 1. Belum ada di database Firestore saat ini
      // 2. Belum pernah dihapus oleh user / sistem (tidak ada di deletedRegistry)
      // 3. Bukan jadwal yang sudah kedaluwarsa / lampau
      // 4. Memiliki kuota kursi > 0
      const genuineNewItems = initialData.filter(item => {
        if (existingIds.has(item.id)) return false;
        if (deletedSet.has(item.id)) return false;
        if (item.tanggalKeberangkatan && item.tanggalKeberangkatan < today) return false;
        if (item.tanggalKepulangan && item.tanggalKepulangan < today) return false;
        if (item.availableSeats !== undefined && item.availableSeats <= 0) return false;
        return true;
      });

      if (genuineNewItems.length === 0) {
        setMigrationStatus('idle');
        const countDeleted = initialData.filter(item => deletedSet.has(item.id)).length;
        showToastMsg(
          `Tidak ada rute baru untuk disinkronkan. ${countDeleted > 0 ? `(${countDeleted} rute yang sudah pernah dihapus dicegah muncul kembali).` : 'Semua rute sudah mutakhir.'}`,
          'info'
        );
        return;
      }

      // Chunk genuineNewItems to respect Firestore limit of 500 writes per batch
      const chunkSize = 400;
      for (let i = 0; i < genuineNewItems.length; i += chunkSize) {
        const chunk = genuineNewItems.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          const itemRef = doc(db, 'maskapai', item.id);
          const seedPayload = {
            ...item,
            updatedAt: new Date().toISOString()
          };
          batch.set(itemRef, seedPayload, { merge: true });
        });
        await batch.commit();
      }

      setMigrationStatus('success');
      showToastMsg(`Berhasil menambahkan ${genuineNewItems.length} rute baru! (Rute yang sudah dihapus tetap diabaikan)`, 'success');
      setTimeout(() => setMigrationStatus('idle'), 3000);
    } catch (error) {
      console.error('Error syncing data:', error);
      setMigrationStatus('error');
      setTimeout(() => setMigrationStatus('idle'), 3000);
      handleFirestoreError(error, OperationType.WRITE, 'maskapai');
    }
  };

  const handleExportExcel = () => {
    const excelData = data.map(item => {
      let kode = '';
      const nameUpper = item.name.toUpperCase();
      if (nameUpper.includes('GARUDA')) kode = 'GA';
      else if (nameUpper.includes('SAUDIA')) kode = 'SV';
      else if (nameUpper.includes('INDIGO')) kode = '6E';
      else if (nameUpper.includes('HAINAN')) kode = 'HU';
      else if (nameUpper.includes('LION')) kode = 'JT';
      else if (nameUpper.includes('QATAR')) kode = 'QR';
      else if (nameUpper.includes('EMIRATES')) kode = 'EK';
      else if (nameUpper.includes('ETIHAD')) kode = 'EY';
      else if (nameUpper.includes('BATIC') || nameUpper.includes('BATIK')) kode = 'ID';
      
      return {
        'nama_maskapai': `${item.name} (${item.programDays || 9} Hari) (${item.tanggalKeberangkatan}) - Sisa: ${item.availableSeats}`,
        'kode_maskapai': kode,
        'harga_maskapai': item.hargaJual || item.hargaBeli,
        'durasi_program_hari': item.programDays,
        'nama_periode': `${item.tanggalKeberangkatan} - ${item.tanggalKepulangan}`,
        'kota_berangkat': item.originCityName || 'Jakarta',
        'kota_tujuan_umrah': item.destinationCityName || 'Jeddah / Madinah',
        'umrah_la': 'false',
        'kota_wisata_lanjutan': '',
        'tipe_penerbangan': item.ruteLabel && item.ruteLabel.toLowerCase().includes('transit') ? 'transit' : 'direct',
        'kelas_penerbangan': 'economy',
        'logo_url': ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Maskapai');
    XLSX.writeFile(workbook, 'template_maskapai.xlsx');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getUpdateStatusText = (item: Maskapai) => {
    if (!item.updatedAt) {
      // Jika tidak ada updatedAt, cek apakah jadwal masih di masa depan & kuota masih ada
      const isFuture = Boolean(item.tanggalKeberangkatan && item.tanggalKeberangkatan >= todayStr);
      return { 
        text: isFuture ? 'Tersedia' : 'Belum diupdate', 
        days: isFuture ? 0 : 999, 
        isStale: !isFuture 
      };
    }
    try {
      const updatedDate = new Date(item.updatedAt);
      if (isNaN(updatedDate.getTime())) {
        return { text: 'Format tanggal salah', days: 999, isStale: true };
      }
      const diffTime = new Date().getTime() - updatedDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      if (diffDays < 1 / 24) {
        return { text: 'Baru saja', days: diffDays, isStale: false };
      }
      if (diffDays < 1) {
        const hours = Math.round(diffDays * 24);
        return { text: `${hours} jam yang lalu`, days: diffDays, isStale: false };
      }
      const roundedDays = Math.floor(diffDays);
      return { 
        text: `${roundedDays} hari yang lalu`, 
        days: diffDays, 
        isStale: diffDays >= 3 // EXPIRED / MATI: jika >= 3 hari tanpa update dari vendor
      };
    } catch {
      return { text: 'Gagal parse', days: 999, isStale: true };
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper terpusat untuk status operasional tiket
  const checkFlightStatus = (item: Maskapai) => {
    const isPast = Boolean(
      (item.tanggalKeberangkatan && item.tanggalKeberangkatan < todayStr) ||
      (item.tanggalKepulangan && item.tanggalKepulangan < todayStr)
    );
    const isSeatsEmpty = item.availableSeats !== undefined && item.availableSeats <= 0;
    const staleInfo = getUpdateStatusText(item);
    // CRITICAL FIX: Only consider stale if flight has expired in the past or has zero seats.
    // Active future flight schedules (e.g. 2026/2027) must NEVER be auto-deleted!
    const isStale = staleInfo.isStale && (isPast || isSeatsEmpty);
    const isOutdated = isPast || isSeatsEmpty || isStale;
    return { isPast, isSeatsEmpty, isStale, isOutdated, staleInfo };
  };

  // Eksekusi otomatis Database Optimization Engine saat terdeteksi data kedaluwarsa & mode aktif
  useEffect(() => {
    if (isVendorMode || loading || data.length === 0 || !autoCleanupActive || isCleaning) return;

    // Cooldown 10 detik agar tidak membebani Firestore secara agresif
    if (Date.now() - lastCleanupTimestamp.current < 10000) return;

    const outdated = data.filter(item => checkFlightStatus(item).isOutdated);
    if (outdated.length > 0) {
      const timer = setTimeout(() => {
        lastCleanupTimestamp.current = Date.now();
        console.log(`[Auto-Hapus Engine] Menjalankan pembersihan otomatis untuk ${outdated.length} rute kedaluwarsa / mati...`);
        executeCleanupDatabase(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, data, autoCleanupActive, isVendorMode, isCleaning]);

  const filteredData = data.filter(item => {
    // Saring data yang sudah terdaftar dalam deletedRegistry
    if (deletedRegistry.has(item.id)) return false;

    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tanggalKeberangkatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tanggalKepulangan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.namaVendor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.originCityName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.destinationCityName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    const status = checkFlightStatus(item);

    // Departure Date / Vendor Update Filter
    if (filterKeberangkatan === 'future') {
      if (status.isOutdated) return false;
    } else if (filterKeberangkatan === 'past') {
      if (!status.isOutdated) return false;
    }

    // Minimum Seats Filter
    if (item.availableSeats < filterMinSeats) return false;

    // Vendor Filter
    if (!isVendorMode && filterVendor !== 'All') {
      if ((item.namaVendor || '').trim() !== filterVendor) return false;
    }

    return true;
  });

  // Pagination calculation
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Selection Helpers
  const allFilteredIds = filteredData.map(item => item.id);
  const isAllSelected = filteredData.length > 0 && allFilteredIds.every(id => selectedIds.includes(id));
  const isSomeSelected = filteredData.length > 0 && !isAllSelected && allFilteredIds.some(id => selectedIds.includes(id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const unique = new Set([...prev, ...allFilteredIds]);
        return Array.from(unique);
      });
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Database maintenance counters
  const expiredCount = data.filter(item => checkFlightStatus(item).isPast).length;
  const zeroSeatCount = data.filter(item => checkFlightStatus(item).isSeatsEmpty).length;
  const staleCount = data.filter(item => checkFlightStatus(item).isStale).length;
  const outdatedCount = data.filter(item => checkFlightStatus(item).isOutdated).length;

  const handleCleanupDatabase = async () => {
    const outdated = data.filter(item => checkFlightStatus(item).isOutdated);
    if (outdated.length === 0) {
      showToastMsg("Database sudah bersih & optimal. Tidak ada rute kedaluwarsa, kursi habis, atau tanpa update (>3 hari).", "info");
      return;
    }
    setShowCleanupModal(true);
  };

  const executeCleanupDatabase = async (silent = false) => {
    const outdated = data.filter(item => checkFlightStatus(item).isOutdated);

    setShowCleanupModal(false);
    if (outdated.length === 0) {
      if (!silent) {
        showToastMsg("Tidak ada jadwal yang perlu dibersihkan saat ini.", "info");
      }
      return;
    }

    setIsCleaning(true);
    const idsToDelete = outdated.map(item => item.id);
    // Optimistic UI removal: langsung buang dari data & catat di deletedRegistry
    setData(prev => prev.filter(x => !idsToDelete.includes(x.id)));
    await recordDeletedIds(idsToDelete);

    try {
      const batchLength = 100;
      for (let i = 0; i < outdated.length; i += batchLength) {
        const batch = writeBatch(db);
        const chunk = outdated.slice(i, i + batchLength);
        chunk.forEach(item => {
          batch.delete(doc(db, 'maskapai', item.id));
        });
        await batch.commit();
      }
      if (!silent) {
        showToastMsg(`Berhasil! ${outdated.length} data maskapai tidak aktif telah dihapus permanen dari database.`, "success");
      } else {
        showToastMsg(`Auto-Hapus Engine: ${outdated.length} jadwal kedaluwarsa & mati (>3 hari) otomatis dibersihkan.`, "info");
      }
    } catch (err) {
      console.error("Gagal melakukan pembersihan:", err);
      if (!silent) {
        showToastMsg("Gagal melakukan pembersihan database.", "error");
      }
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <PlaneTakeoff className="w-6 h-6 text-emerald-600" />
            Database Maskapai
          </h2>
          <p className="text-gray-500 text-sm mt-1">Kelola data harga tiket pesawat dan rute</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSyncStaticData}
            disabled={migrationStatus === 'migrating'}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 text-white ${
              migrationStatus === 'confirm' ? 'bg-orange-600 hover:bg-orange-700' :
              migrationStatus === 'success' ? 'bg-green-600' :
              migrationStatus === 'error' ? 'bg-red-600' :
              'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${migrationStatus === 'migrating' ? 'animate-spin' : ''}`} />
            {migrationStatus === 'idle' && 'Sync Data Baru'}
            {migrationStatus === 'confirm' && 'Yakin Sync?'}
            {migrationStatus === 'migrating' && 'Syncing...'}
            {migrationStatus === 'success' && 'Selesai!'}
            {migrationStatus === 'error' && 'Gagal!'}
          </button>
          <button 
            onClick={handleExportExcel}
            className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Excel
          </button>
          <button 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-black text-xs uppercase tracking-wide transition-all shadow-md shadow-blue-200 hover:shadow-lg active:scale-95 cursor-pointer" 
            onClick={() => setIsBulkOpen(true)}
            title="Upload file Excel / CSV / TXT atau copas broadcast promo WhatsApp vendor (PT AZZA, Burgundy, dll)"
          >
            <Upload className="w-4 h-4" />
            Upload / Update (WA & Excel)
          </button>
          <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors" onClick={() => handleOpenForm()}>
            <Plus className="w-4 h-4" />
            Tambah Maskapai
          </button>
        </div>
      </div>

      {/* Info Panel & Advisory */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 mb-6 text-sm shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-bold text-amber-900 flex items-center gap-1.5 mb-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
              Asumsi Dasar Margin:
            </p>
            <ul className="list-disc list-inside text-amber-800 space-y-1 pl-1">
              <li>Indigo & Hainan: <span className="font-bold">2%</span></li>
              <li>Harga Tiket Pesawat &lt; Rp 15.000.000: <span className="font-bold">2%</span></li>
              <li>Harga Tiket Pesawat &ge; Rp 15.000.000: <span className="font-bold">1%</span></li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-amber-900 flex items-center gap-1.5 mb-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
              Catatan Operasional:
            </p>
            <ul className="list-disc list-inside text-amber-800 space-y-1 pl-1">
              <li>Keuntungan otomatis dikalkulasi berdasarkan persentase.</li>
              <li>Data diperbarui secara real-time berdasarkan laporan dari Wholesaler/Vendor tiket.</li>
              <li>Lakukan pembersihan berkala pada rute lama agar performa pencarian tetap optimal.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* SYSTEM MAINTENANCE CONSOLE */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 mb-6 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-md text-[10px] tracking-wider uppercase animate-pulse">OPTIMALISASI DB</span>
            <h3 className="text-sm font-black tracking-widest uppercase text-amber-400">Database Optimization Engine (Auto-Hapus)</h3>
            <button
              onClick={toggleAutoCleanup}
              type="button"
              className={`ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 transition-all cursor-pointer border ${
                autoCleanupActive 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
              title="Klik untuk mengaktifkan / menonaktifkan pembersihan otomatis"
            >
              <Zap className={`w-3 h-3 ${autoCleanupActive ? 'text-emerald-400 fill-emerald-400' : 'text-slate-500'}`} />
              Auto-Hapus: {autoCleanupActive ? 'AKTIF (Otomatis)' : 'MANUAL'}
            </button>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed max-w-xl">
            Sistem otomatis menganalisis jadwal lampau, kursi habis (0 seat), dan tiket vendor tidak diupdate &gt; 3 hari.
            Terdeteksi <span className="font-extrabold text-amber-400 underline">{outdatedCount} rute kedaluwarsa / mati</span> dari total <span className="font-extrabold text-white">{data.length} item</span> yang tersimpan.
            {autoCleanupActive ? (
              <span className="text-emerald-400 font-bold block mt-0.5">
                ● Engine Aktif: Rute mati/kedaluwarsa otomatis dibersihkan secara berkala dari Firestore.
              </span>
            ) : (
              <span className="text-slate-400 font-medium block mt-0.5">
                ○ Mode Manual: Gunakan tombol bersihkan di samping untuk membersihkan data.
              </span>
            )}
          </p>
          
          <div className="flex flex-wrap gap-4 mt-1 font-mono text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-rose-500 rounded-full"></span> 
              Berangkat Lampau: <strong className="text-rose-400 font-bold">{expiredCount}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-orange-400 rounded-full"></span> 
              Tidak Diupdate (&gt;3 Hari): <strong className="text-orange-400 font-bold">{staleCount}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span> 
              Sisa 0 Seats: <strong className="text-yellow-400 font-bold">{zeroSeatCount}</strong>
            </span>
            {deletedRegistry.size > 0 && (
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2 h-2 bg-amber-400 rounded-full"></span> 
                Riwayat Terhapus: <strong className="text-amber-300 font-bold">{deletedRegistry.size} rute diblokir</strong>
                <button
                  type="button"
                  onClick={handleResetDeletedRegistry}
                  className="underline hover:text-white ml-1 text-[9px] cursor-pointer text-amber-200"
                  title="Klik jika ingin mengizinkan sinkronisasi ulang untuk rute yang pernah dihapus"
                >
                  [Reset Blacklist]
                </button>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBatchDeleteModal(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-rose-250 cursor-pointer animate-in fade-in slide-in-from-right-3 duration-200"
            >
              <Trash2 className="w-4 h-4" />
              Hapus {selectedIds.length} Terpilih
            </button>
          )}
          <button
            onClick={handleCleanupDatabase}
            disabled={isCleaning || outdatedCount === 0}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              outdatedCount === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50' :
              isCleaning ? 'bg-orange-600 text-white animate-pulse' :
              'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white shadow-lg cursor-pointer hover:shadow-amber-500/10'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {isCleaning ? 'Sedang Menghapus...' : outdatedCount === 0 ? 'Database Optimal (0 Expired)' : `Bersihkan ${outdatedCount} Jadwal Expired`}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Dynamic Filters Deck */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari maskapai, rute, atau periode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium bg-white"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
            {/* Keberangkatan Filter Tabs */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Rerata Jadwal:</span>
              <div className="flex bg-gray-200 p-1 rounded-xl border border-gray-300/40">
                <button
                  onClick={() => setFilterKeberangkatan('future')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    filterKeberangkatan === 'future' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Aktif / Mendatang
                </button>
                <button
                  onClick={() => setFilterKeberangkatan('past')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    filterKeberangkatan === 'past' ? 'bg-white text-rose-700 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Lampau / Expired
                </button>
                <button
                  onClick={() => setFilterKeberangkatan('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    filterKeberangkatan === 'all' ? 'bg-white text-gray-800 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Semua
                </button>
              </div>
            </div>

            {/* Vendor Filter Select Dropdown */}
            {!isVendorMode && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Vendor:</span>
                <select
                  value={filterVendor}
                  onChange={(e) => setFilterVendor(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="All">All</option>
                  {vendors.map((vendor) => (
                    <option key={vendor} value={vendor}>
                      {vendor}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Seats Filter select drop down */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Batas Sisa Seat:</span>
              <select
                value={filterMinSeats}
                onChange={(e) => setFilterMinSeats(Number(e.target.value))}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value={0}>Tampilkan Semua Seats</option>
                <option value={1}>Sisa &ge; 1 Seat</option>
                <option value={5}>Sisa &ge; 5 Seats</option>
                <option value={10}>Sisa &ge; 10 Seats (Default)</option>
                <option value={20}>Sisa &ge; 20 Seats</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat data maskapai...</div>
        ) : (
          <>
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = isSomeSelected;
                          }
                        }}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">Maskapai & Rute</th>
                    <th className="px-4 py-3 font-semibold text-center">Seats</th>
                    {!isVendorMode && <th className="px-4 py-3 font-semibold">Harga Jual</th>}
                    <th className="px-4 py-3 font-semibold">Harga Beli</th>
                    {!isVendorMode && <th className="px-4 py-3 font-semibold">Margin</th>}
                    {!isVendorMode && <th className="px-4 py-3 font-semibold">Persen</th>}
                    <th className="px-4 py-3 font-semibold">Program Days</th>
                    <th className="px-4 py-3 font-semibold">Tgl Berangkat</th>
                    <th className="px-4 py-3 font-semibold">Tgl Pulang</th>
                    <th className="px-4 py-3 font-semibold">Vendor</th>
                    <th className="px-4 py-3 font-semibold">Origin City</th>
                    <th className="px-4 py-3 font-semibold">Destination City</th>
                    <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item) => {
                    const staleInfo = getUpdateStatusText(item);
                    return (
                      <tr 
                        key={item.id} 
                        className={`border-b border-gray-100 transition-colors ${
                          item.tanggalKeberangkatan < todayStr 
                            ? 'bg-rose-50/25 hover:bg-rose-50/40 opacity-70' 
                            : staleInfo.isStale
                              ? 'bg-orange-50/20 hover:bg-orange-50/35 opacity-80 border-l-2 border-l-orange-400'
                              : item.availableSeats <= 0
                                ? 'bg-gray-50/40 hover:bg-gray-50/60 opacity-80'
                                : 'hover:bg-gray-55/50'
                        }`}
                      >
                        <td className="px-4 py-3 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => handleSelectOne(item.id)}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-950">{item.name}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.tanggalKeberangkatan < todayStr && (
                                <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide uppercase">
                                  Kedaluwarsa
                                </span>
                              )}
                              {staleInfo.isStale ? (
                                <span className="bg-orange-100 text-orange-850 border border-orange-200 text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide uppercase">
                                  Mati (&gt;3 Hari No Update)
                                </span>
                              ) : (
                                <span className="bg-emerald-105 text-emerald-800 border border-emerald-200 text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide uppercase">
                                  Aktif: {staleInfo.text}
                                </span>
                              )}
                              {item.availableSeats <= 0 && (
                                <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide uppercase">
                                  Habis Seat
                                </span>
                              )}
                              {item.availableSeats > 0 && item.availableSeats < 10 && (
                                <span className="bg-yellow-105 text-yellow-800 border border-yellow-250 text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide uppercase">
                                  Sisa Menipis
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              item.availableSeats === 0 ? 'bg-red-100 text-red-700' :
                              item.availableSeats <= 5 ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {item.availableSeats} / {item.totalSeats}
                            </span>
                            <div className="w-16 h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                              <div 
                                className={`h-full ${
                                  item.availableSeats === 0 ? 'bg-red-500' :
                                  item.availableSeats <= 5 ? 'bg-orange-500' :
                                  'bg-blue-500'
                                }`}
                                style={{ width: `${(item.availableSeats / item.totalSeats) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        {!isVendorMode && <td className="px-4 py-3 text-emerald-600 font-semibold">{formatCurrency(item.hargaJual)}</td>}
                        <td className="px-4 py-3 text-gray-600">{formatCurrency(item.hargaBeli)}</td>
                        {!isVendorMode && <td className="px-4 py-3 text-gray-600">{formatCurrency(item.margin)}</td>}
                        {!isVendorMode && (
                          <td className="px-4 py-3">
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-medium">
                              {item.persen}%
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-center">{item.programDays}</td>
                        <td className="px-4 py-3 text-gray-600">{item.tanggalKeberangkatan}</td>
                        <td className="px-4 py-3 text-gray-600">{item.tanggalKepulangan}</td>
                        <td className="px-4 py-3 text-gray-600">
                          <div className="flex flex-col">
                            <span className="font-semibold">{item.namaVendor}</span>
                            <span className="text-[10px] text-gray-400">Update: {staleInfo.text}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{item.originCityName}</td>
                        <td className="px-4 py-3 text-gray-600">{item.destinationCityName}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors" 
                              title="Tandai Diperbarui (Aktifkan)"
                              onClick={async () => {
                                try {
                                  await updateDoc(doc(db, 'maskapai', item.id), {
                                    updatedAt: new Date().toISOString()
                                  });
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.WRITE, `maskapai/${item.id}`);
                                }
                              }}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button className="p-1 text-blue-600 hover:bg-blue-50 rounded" onClick={() => handleOpenForm(item)}>
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button className="p-1 text-red-600 hover:bg-red-50 rounded" onClick={() => setItemToDelete(item)}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {paginatedData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada data maskapai yang ditemukan.
                </div>
              )}
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="xl:hidden bg-gray-50 border-b border-gray-250 px-4 py-2.5 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = isSomeSelected;
                    }
                  }}
                  onChange={handleSelectAll}
                />
                Pilih Semua ({filteredData.length} Rute)
              </label>
              {selectedIds.length > 0 && (
                <span className="text-xs font-black text-rose-600">
                  {selectedIds.length} Terpilih
                </span>
              )}
            </div>

            <div className="xl:hidden divide-y divide-gray-100">
              {paginatedData.map((item) => {
                const staleInfo = getUpdateStatusText(item);
                return (
                  <div 
                    key={item.id} 
                    className={`p-4 transition-colors flex gap-3 ${
                      item.tanggalKeberangkatan < todayStr 
                        ? 'bg-rose-50/15 border-l-4 border-rose-500 opacity-75' 
                        : staleInfo.isStale
                          ? 'bg-orange-50/15 border-l-4 border-orange-500 opacity-80'
                          : item.availableSeats <= 0
                            ? 'bg-gray-50/40 border-l-4 border-gray-400 opacity-80'
                            : 'hover:bg-gray-55 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-start pt-1">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleSelectOne(item.id)}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-gray-950 text-base">{item.name}</h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tanggalKeberangkatan < todayStr && (
                            <span className="bg-rose-150 text-rose-800 border border-rose-200 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                              Kedaluwarsa
                            </span>
                          )}
                          {staleInfo.isStale ? (
                            <span className="bg-orange-150 text-orange-850 border border-orange-200 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                              Mati (&gt;3 Hari No Update)
                            </span>
                          ) : (
                            <span className="bg-emerald-105 text-emerald-850 border border-emerald-200 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                              Aktif: {staleInfo.text}
                            </span>
                          )}
                          {item.availableSeats <= 0 && (
                            <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                              Habis Seat
                            </span>
                          )}
                          {item.availableSeats > 0 && item.availableSeats < 10 && (
                            <span className="bg-yellow-105 text-yellow-800 border border-yellow-250 text-[9px] font-black px-1.5 py-0.5 rounded uppercase font-bold">
                              Sisa Menipis
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-2.5">
                          <span className="font-medium text-emerald-600">{item.originCityName}</span>
                          <span>→</span>
                          <span className="font-medium text-emerald-600">{item.destinationCityName}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          item.availableSeats === 0 ? 'bg-red-100 text-red-700' :
                          item.availableSeats <= 5 ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {item.availableSeats} / {item.totalSeats} Seats
                        </span>
                        {!isVendorMode && (
                          <div className="text-emerald-600 font-bold mt-1">
                            {formatCurrency(item.hargaJual)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-4">
                      <div>
                        <div className="text-gray-500 text-xs uppercase font-semibold">Tgl Berangkat</div>
                        <div className="text-gray-900">{item.tanggalKeberangkatan}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs uppercase font-semibold">Tgl Pulang</div>
                        <div className="text-gray-900">{item.tanggalKepulangan}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs uppercase font-semibold">Vendor</div>
                        <div className="text-gray-900">
                          <div>{item.namaVendor}</div>
                          <div className="text-[10px] text-gray-400">Update: {staleInfo.text}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs uppercase font-semibold">Program</div>
                        <div className="text-gray-900">{item.programDays} Days</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs uppercase font-semibold">Harga Beli</div>
                        <div className="text-gray-700">{formatCurrency(item.hargaBeli)}</div>
                      </div>
                      {!isVendorMode && (
                        <div>
                          <div className="text-gray-500 text-xs uppercase font-semibold">Margin</div>
                          <div className="text-emerald-700 font-medium">{formatCurrency(item.margin)} ({item.persen}%)</div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-50">
                      <button 
                        className="flex items-center gap-1 text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" 
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'maskapai', item.id), {
                              updatedAt: new Date().toISOString()
                            });
                          } catch (err) {
                            handleFirestoreError(err, OperationType.WRITE, `maskapai/${item.id}`);
                          }
                        }}
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reaktifkan
                      </button>
                      <button className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" onClick={() => handleOpenForm(item)}>
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button className="flex items-center gap-1 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" onClick={() => setItemToDelete(item)}>
                        <Trash2 className="w-4 h-4" />
                        Hapus
                      </button>
                    </div>
                  </div>
                  </div>
                );
              })}
              {paginatedData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada data maskapai yang ditemukan.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredData.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-gray-600">
                <div>
                  Menampilkan <span className="font-extrabold text-gray-900">{startIndex + 1}</span> - <span className="font-extrabold text-gray-900">{Math.min(startIndex + ITEMS_PER_PAGE, totalItems)}</span> dari <span className="font-extrabold text-gray-900">{totalItems}</span> Rute Maskapai
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={validCurrentPage === 1}
                      className="p-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Halaman Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => page === 1 || page === totalPages || Math.abs(page - validCurrentPage) <= 1)
                      .reduce<(number | string)[]>((acc, page, idx, arr) => {
                        if (idx > 0 && typeof arr[idx - 1] === 'number' && page - (arr[idx - 1] as number) > 1) {
                          acc.push('...');
                        }
                        acc.push(page);
                        return acc;
                      }, [])
                      .map((item, idx) => {
                        if (typeof item === 'string') {
                          return <span key={`dots-${idx}`} className="px-1 text-gray-400">...</span>;
                        }
                        return (
                          <button
                            key={item}
                            onClick={() => setCurrentPage(item)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                              validCurrentPage === item
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={validCurrentPage === totalPages}
                      className="p-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Halaman Selanjutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 mt-10 mb-10">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Maskapai' : 'Tambah Maskapai Baru'}
              </h3>
              <button 
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Quick Paste & Auto-Fill from WhatsApp Broadcast / PNR */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/90 rounded-2xl p-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xs">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase text-blue-950 tracking-wider">
                        Copas Cepat Broadcast WA / PNR Vendor (Isi & Update Otomatis)
                      </span>
                      <p className="text-[11px] text-blue-700 font-medium">
                        Tempel pesan WA (Oman Air, Saudia, Garuda dll). Sistem otomatis mengisi rute, tanggal, harga modal & jual, serta beralih ke mode UPDATE jika PNR sudah terdaftar.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <input
                    type="text"
                    value={singleQuickPaste}
                    onChange={(e) => setSingleQuickPaste(e.target.value)}
                    placeholder="Contoh: ABM/QENXXX CWDXXX/11D/14.500.000 atau 1 WY 850G 01FEB M CGKMCT*HK45..."
                    className="flex-1 px-3.5 py-2.5 text-xs border border-blue-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleQuickParseSingle}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95 cursor-pointer uppercase tracking-wider"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Ekstrak ke Form
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Maskapai</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name || ""}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      const isItineraryEmpty = !formData.flightItinerary || formData.flightItinerary === generateDefaultItinerary(formData.name, formData.tanggalKeberangkatan, formData.tanggalKepulangan, formData.destinationCityName);
                      const updated = { ...formData, name: val };
                      if (isItineraryEmpty && val && formData.tanggalKeberangkatan && formData.tanggalKepulangan) {
                        updated.flightItinerary = generateDefaultItinerary(val, formData.tanggalKeberangkatan, formData.tanggalKepulangan, formData.destinationCityName);
                      }
                      setFormData(updated);
                    }}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold uppercase"
                    placeholder="SAUDIA AIRLINES"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Vendor / Travel</label>
                  <input 
                    type="text" 
                    required
                    value={formData.namaVendor || ""}
                    onChange={(e) => setFormData({...formData, namaVendor: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="PT MADINAH IMAN WISATA"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-semibold text-gray-700">Rute / Label</label>
                    <button
                      type="button"
                      onClick={() => {
                        const generated = generateDefaultRute(formData.originCityName, formData.destinationCityName);
                        setFormData(prev => ({ ...prev, ruteLabel: generated }));
                      }}
                      className="text-[10px] text-emerald-650 hover:text-emerald-700 hover:bg-emerald-100 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Auto-Fill
                    </button>
                  </div>
                  <input 
                    type="text" 
                    required
                    value={formData.ruteLabel || ""}
                    onChange={(e) => setFormData({...formData, ruteLabel: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="CGK - JED / MED - CGK"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kota Keberangkatan</label>
                  <input 
                    type="text" 
                    required
                    value={formData.originCityName || ""}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      const isRuteEmpty = !formData.ruteLabel || formData.ruteLabel === generateDefaultRute(formData.originCityName, formData.destinationCityName);
                      const updated = { ...formData, originCityName: val };
                      if (isRuteEmpty) {
                        updated.ruteLabel = generateDefaultRute(val, formData.destinationCityName);
                      }
                      setFormData(updated);
                    }}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                    placeholder="JAKARTA (CGK)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kota Tujuan</label>
                  <input 
                    type="text" 
                    required
                    value={formData.destinationCityName || ""}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      const isRuteEmpty = !formData.ruteLabel || formData.ruteLabel === generateDefaultRute(formData.originCityName, formData.destinationCityName);
                      const isItineraryEmpty = !formData.flightItinerary || formData.flightItinerary === generateDefaultItinerary(formData.name, formData.tanggalKeberangkatan, formData.tanggalKepulangan, formData.destinationCityName);
                      const updated = { ...formData, destinationCityName: val };
                      if (isRuteEmpty) {
                        updated.ruteLabel = generateDefaultRute(formData.originCityName, val);
                      }
                      if (isItineraryEmpty && formData.name && formData.tanggalKeberangkatan && formData.tanggalKepulangan) {
                        updated.flightItinerary = generateDefaultItinerary(formData.name, formData.tanggalKeberangkatan, formData.tanggalKepulangan, val);
                      }
                      setFormData(updated);
                    }}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                    placeholder="JEDDAH (JED)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Available Seats / Total Seats</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={formData.availableSeats ?? ""}
                    onChange={(e) => setFormData({...formData, availableSeats: parseInt(e.target.value) || 0, totalSeats: Math.max(parseInt(e.target.value) || 0, formData.totalSeats || 45)})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tgl Keberangkatan</label>
                  <input 
                    type="date" 
                    required
                    value={formData.tanggalKeberangkatan || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const isItineraryEmpty = !formData.flightItinerary || formData.flightItinerary === generateDefaultItinerary(formData.name, formData.tanggalKeberangkatan, formData.tanggalKepulangan, formData.destinationCityName);
                      const updated = { ...formData, tanggalKeberangkatan: val };
                      if (isItineraryEmpty && formData.name && val && formData.tanggalKepulangan) {
                        updated.flightItinerary = generateDefaultItinerary(formData.name, val, formData.tanggalKepulangan, formData.destinationCityName);
                      }
                      setFormData(updated);
                    }}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tgl Kepulangan</label>
                  <input 
                    type="date" 
                    required
                    value={formData.tanggalKepulangan || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const isItineraryEmpty = !formData.flightItinerary || formData.flightItinerary === generateDefaultItinerary(formData.name, formData.tanggalKeberangkatan, formData.tanggalKepulangan, formData.destinationCityName);
                      const updated = { ...formData, tanggalKepulangan: val };
                      if (isItineraryEmpty && formData.name && formData.tanggalKeberangkatan && val) {
                        updated.flightItinerary = generateDefaultItinerary(formData.name, formData.tanggalKeberangkatan, val, formData.destinationCityName);
                      }
                      setFormData(updated);
                    }}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Program Hari (Auto dari Tgl)</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={formData.tanggalKeberangkatan && formData.tanggalKepulangan ? Math.round((new Date(formData.tanggalKepulangan).getTime() - new Date(formData.tanggalKeberangkatan).getTime()) / (1000 * 3600 * 24)) + 1 : 9}
                    onChange={(e) => setFormData({...formData, programDays: parseInt(e.target.value) || 9})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50"
                  />
                </div>                 <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Beli (Modal/Setoran)</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={formData.hargaBeli || formData.hargaSetoran || ""}
                    onChange={(e) => {
                      const beli = parseFloat(e.target.value) || 0;
                      if (isVendorMode) {
                        const existingMargin = formData.margin || 0;
                        const jual = beli + existingMargin;
                        const persen = beli > 0 ? Number(((existingMargin / beli) * 100).toFixed(1)) : 0;
                        setFormData({...formData, hargaBeli: beli, hargaSetoran: beli, hargaJual: jual, margin: existingMargin, persen});
                      } else {
                        const jual = formData.hargaJual || 0;
                        const margin = jual - beli;
                        const persen = beli > 0 ? Number(((margin / beli) * 100).toFixed(1)) : 0;
                        setFormData({...formData, hargaBeli: beli, hargaSetoran: beli, margin, persen});
                      }
                    }}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                {!isVendorMode && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Jual</label>
                      <input 
                        type="number" 
                        required
                        min={0}
                        value={formData.hargaJual ?? ""}
                        onChange={(e) => {
                          const jual = parseFloat(e.target.value) || 0;
                          const beli = formData.hargaBeli || formData.hargaSetoran || 0;
                          const margin = jual - beli;
                          const persen = beli > 0 ? Number(((margin / beli) * 100).toFixed(1)) : 0;
                          setFormData({...formData, hargaJual: jual, margin, persen});
                        }}
                        className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Preview Margin</label>
                      <div className="w-full p-2.5 border border-gray-200 bg-gray-50 rounded-xl outline-none font-medium text-gray-500">
                        Rp {(formData.margin || 0).toLocaleString('id-ID')} ({formData.persen || 0}%)
                      </div>
                    </div>
                  </>
                )}

                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-semibold text-gray-700">Deskripsi / Itinerary Penerbangan (PNR)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const generated = generateDefaultItinerary(
                          formData.name,
                          formData.tanggalKeberangkatan,
                          formData.tanggalKepulangan,
                          formData.destinationCityName
                        );
                        setFormData({ ...formData, flightItinerary: generated });
                      }}
                      className="text-xs text-emerald-650 hover:text-emerald-700 hover:bg-emerald-100 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-3 h-3 animate-spin duration-1000" /> Auto-Generate
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={formData.flightItinerary || ''}
                    onChange={(e) => setFormData({ ...formData, flightItinerary: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-xs bg-white leading-relaxed"
                    placeholder="Contoh:&#10;JEDJED HK20 9D PNR:7Y57CV&#10;18Nov SV817 CGKJED 1000 1555&#10;29Nov SV826 JEDCGK 0900 2245"
                  />
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-4 font-medium border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={handleCloseForm}
                  className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Item Deletion Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 overflow-hidden animate-in zoom-in-95 duration-200 text-gray-950">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-2 text-rose-600">
              <Trash2 className="w-5 h-5" />
              Hapus Data Maskapai?
            </h3>
            <p className="text-gray-650 text-sm mb-6 leading-relaxed">
              Apakah Anda yakin ingin menghapus data maskapai <strong className="text-gray-950">{itemToDelete.name}</strong> ({itemToDelete.tanggalKeberangkatan})? Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  const targetItem = itemToDelete;
                  setItemToDelete(null);
                  // Optimistic UI removal: langsung buang dari data & catat di deletedRegistry
                  setData(prev => prev.filter(x => x.id !== targetItem.id));
                  await recordDeletedIds([targetItem.id]);
                  try {
                    await deleteDoc(doc(db, 'maskapai', targetItem.id));
                    showToastMsg("Berhasil menghapus data maskapai", "success");
                  } catch (err) {
                    handleFirestoreError(err, OperationType.DELETE, `maskapai/${targetItem.id}`);
                    showToastMsg("Gagal menghapus data maskapai", "error");
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-rose-200"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Deletion Confirmation Modal */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 overflow-hidden animate-in zoom-in-95 duration-200 text-gray-950">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-2 text-rose-600">
              <Trash2 className="w-5 h-5" />
              Hapus Maskapai Terpilih?
            </h3>
            <p className="text-gray-650 text-sm mb-6 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong className="text-gray-950">{selectedIds.length} maskapai</strong> yang Anda pilih? Tindakan ini akan menghapus semua data terpilih secara permanen dari database.
            </p>
            <div className="flex justify-end gap-3">
              <button
                disabled={isDeletingSelected}
                onClick={() => setShowBatchDeleteModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                disabled={isDeletingSelected}
                onClick={async () => {
                  setIsDeletingSelected(true);
                  const idsToDelete = [...selectedIds];
                  // Optimistic UI removal: langsung buang dari data & catat di deletedRegistry
                  setData(prev => prev.filter(x => !idsToDelete.includes(x.id)));
                  setSelectedIds([]);
                  setShowBatchDeleteModal(false);
                  await recordDeletedIds(idsToDelete);

                  try {
                    const chunks: string[][] = [];
                    const chunkSize = 400;
                    for (let i = 0; i < idsToDelete.length; i += chunkSize) {
                      chunks.push(idsToDelete.slice(i, i + chunkSize));
                    }

                    for (const chunk of chunks) {
                      const batch = writeBatch(db);
                      chunk.forEach((id) => {
                        batch.delete(doc(db, 'maskapai', id));
                      });
                      await batch.commit();
                    }

                    showToastMsg(`Berhasil menghapus ${idsToDelete.length} data maskapai`, "success");
                  } catch (err) {
                    console.error(err);
                    showToastMsg("Gagal menghapus data maskapai", "error");
                  } finally {
                    setIsDeletingSelected(false);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-rose-200 flex items-center gap-2 disabled:opacity-50"
              >
                {isDeletingSelected ? "Sedang Menghapus..." : "Hapus Terpilih"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Database Optimization/Auto-Hapus Confirmation Modal */}
      {showCleanupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 overflow-hidden animate-in zoom-in-95 duration-200 text-white">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">PEMBERSIHAN</span>
              <h3 className="text-lg font-black tracking-wide text-amber-400 font-sans">OPTIMALISASI DATABASE MASTER</h3>
            </div>
            
            <p className="text-slate-300 text-sm leading-relaxed mb-6 font-sans">
              Sistem akan menghapus permanen <span className="font-extrabold text-amber-400 font-mono text-base">{outdatedCount} rute tidak aktif / mati</span> dari Firestore. Tindakan ini memperkecil beban database dan tidak bisa dibatalkan.
            </p>

            <div className="bg-slate-950/80 rounded-xl p-4 mb-6 border border-slate-800/60 font-mono text-xs space-y-2 text-slate-400">
              <div className="flex justify-between items-center pb-1 border-b border-slate-800/50">
                <span>Penerbangan Masa Lampau:</span>
                <strong className="text-rose-400 text-right">{expiredCount} rute</strong>
              </div>
              <div className="flex justify-between items-center pb-1 border-b border-slate-800/50">
                <span>Vendor Tidak Aktif (&gt;3 hari):</span>
                <strong className="text-orange-400 text-right">{staleCount} rute</strong>
              </div>
              <div className="flex justify-between items-center">
                <span>Sisa 0 Bangku (Habis):</span>
                <strong className="text-yellow-400 text-right">{zeroSeatCount} rute</strong>
              </div>
            </div>

            <div className="flex justify-end gap-3 text-xs font-bold font-sans">
              <button
                onClick={() => setShowCleanupModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors uppercase tracking-wider"
              >
                Batal
              </button>
              <button
                onClick={() => executeCleanupDatabase(false)}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white rounded-xl shadow-lg shadow-rose-950/45 transition-colors uppercase tracking-wider"
              >
                Mulai Pembersihan Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Upload & Bulk Import Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white p-2.5 rounded-2xl shadow-md shadow-blue-200">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-tight">
                    Upload & Import Jadwal Maskapai
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Copas broadcast promo WhatsApp/GDS PNR (Oman Air, Saudia, Garuda dll) atau upload file Excel / CSV / TXT
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsBulkOpen(false);
                  setBulkText('');
                  setBulkPriceInput('');
                  setBulkVendorInput('');
                  setParsedFlights([]);
                }}
                className="p-2 hover:bg-gray-150 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Left Controls & Input, Right Preview */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              {/* Left Input & Configuration (7 cols) */}
              <div className="lg:col-span-6 xl:col-span-6 p-4 sm:p-6 flex flex-col gap-4 border-r border-gray-100 overflow-y-auto">
                {/* Mode Selector Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-2xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setBulkActiveTab('text')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      bulkActiveTab === 'text'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-550 hover:text-gray-900'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Copas Broadcast WA / PNR
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkActiveTab('file')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      bulkActiveTab === 'file'
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-gray-550 hover:text-gray-900'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Upload File (Excel / CSV / TXT)
                  </button>
                </div>

                {/* Preset Sample Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Coba Contoh:</span>
                    <button
                    type="button"
                    onClick={() => {
                      setBulkActiveTab('text');
                      setBulkVendorInput('PT AZZA BAROKAH MADINAH');
                      setBulkYearInput('2027');
                      setBulkText(`*READY PNR 2026/2027 BY OMAN AIR✈️*
*▪️FEBRUARY 2027*▪️

*ABM/QENXXX CWDXXX QENXXX/11D/14.500.000*
1 WY 850G 01FEB M CGKMCT*HK45 1355  1830  /E
2 WY 673G 01FEB M MCTJED*HK45 2130  0005   02FEB T /E
3 WY 680G 10FEB W MEDMCT*HK45 1740  2130  /E
4 WY 849G 11FEB Q MCTCGK*HK45 0145  1240  /E

*ABM/APAXXX CWBXXX WBKXXX/9D/14.800.000*
1 WY 850G 02FEB T CGKMCT*HK39 1355  1830  /E
2 WY 671G 03FEB W MCTJED*HK39 0135  0410  /E
3 WY 680G 09FEB T MEDMCT*HK39 1740  2130  /E
4 WY 849G 10FEB W MCTCGK*HK39 0145  1240  /E

*ABM/AOCXXX WBDXXX WBKXXX/13D/14.800.000*
1 WY 850G 13FEB J CGKMCT*HK39 1355  1830  /E
2 WY 671G 14FEB S MCTJED*HK39 0135  0410  /E
3 WY 680G 24FEB W MEDMCT*HK39 1740  2130  /E
4 WY 849G 25FEB Q MCTCGK*HK39 0145  1240  /E

*ABM/MHHXXX MHBXXX/12D/14.500.000*
1 WY 850G 20FEB J CGKMCT*HK30 1355  1830  /E
2 WY 673G 20FEB J MCTJED*HK30 2130  0005   21FEB S /E
3 WY 680G 02MAR T MEDMCT*HK30 1740  2130  /E
4 WY 849G 03MAR W MCTCGK*HK30 0145  1240  /E`);
                    }}
                    className="text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold px-2.5 py-1 rounded-lg transition-colors border border-blue-200/50"
                  >
                    PT AZZA BAROKAH MADINAH (Oman Air 4 Rute)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkActiveTab('text');
                      setBulkVendorInput('PT. BURGUNDY WISATA INTERNATIONAL');
                      setBulkYearInput('2026');
                      setBulkText(`*PT. BURGUNDY WISATA INTERNATIONAL*
*JEDMED - 9D - 19 PAX*
*HARGA : 16.000.000*
20OCT SV827 CGKJED 0040 0635
27OCT SV820 MEDCGK 2045 1025+1

*JEDMED - 9D - 20 PAX*
*HARGA : 16.000.000*
22OCT SV817 CGKJED 0910 1440
29OCT SV820 MEDCGK 2045 1025+1`);
                    }}
                    className="text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold px-2.5 py-1 rounded-lg transition-colors border border-emerald-200/50"
                  >
                    PT. BURGUNDY (Saudia)
                  </button>
                </div>

                {/* Configuration Row: Vendor, Year, Default Price */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black uppercase text-gray-500 tracking-wider">Vendor</label>
                    <select
                      value={isVendorMode ? vendorName : bulkVendorInput}
                      disabled={isVendorMode}
                      onChange={(e) => setBulkVendorInput(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold bg-white"
                    >
                      <option value="">Auto-Detect dari Teks</option>
                      <option value="PT AZZA BAROKAH MADINAH">PT AZZA BAROKAH MADINAH</option>
                      <option value="PT. BURGUNDY WISATA INTERNATIONAL">PT. BURGUNDY WISATA</option>
                      <option value="IBU DAHLIA">IBU DAHLIA</option>
                      <option value="NQH WISATA">NQH WISATA</option>
                      <option value="PT. Darmawisata Indonesia">PT. Darmawisata Indonesia</option>
                      <option value="PT ARRAYYAN AL MUBARAK">PT ARRAYYAN AL MUBARAK</option>
                      <option value="Madani Tour">Madani Tour</option>
                      <option value="FATAYA">FATAYA</option>
                      <option value="FRESHNEL">FRESHNEL</option>
                      <option value="HAINANTIKET.COM">HAINANTIKET.COM</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black uppercase text-gray-500 tracking-wider">Tahun Keberangkatan</label>
                    <select
                      value={bulkYearInput}
                      onChange={(e) => setBulkYearInput(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold bg-white"
                    >
                      <option value="auto">Auto-Detect / Cerdas</option>
                      <option value="2027">2027</option>
                      <option value="2026">2026</option>
                      <option value="2028">2028</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black uppercase text-gray-500 tracking-wider">Harga Default (IDR)</label>
                    <input
                      type="text"
                      value={bulkPriceInput}
                      onChange={(e) => setBulkPriceInput(e.target.value)}
                      placeholder="Auto / Isi jika tidak tertera"
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Input Panel Switcher */}
                {bulkActiveTab === 'text' ? (
                  <div className="flex flex-col gap-1.5 flex-1 min-h-[220px]">
                    <label className="text-[11px] font-black uppercase text-gray-500 tracking-wider flex justify-between items-center">
                      <span>Pesan Promo WhatsApp / Telegram / GDS PNR</span>
                      <span className="text-[10px] text-gray-400 font-normal">Format 4-Leg Transit & 2-Leg Direct didukung</span>
                    </label>
                    <textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder={`Copas pesan promo di sini... Contoh:&#10;*ABM/QENXXX CWDXXX QENXXX/11D/14.500.000*&#10;1 WY 850G 01FEB M CGKMCT*HK45 1355 1830&#10;2 WY 673G 01FEB M MCTJED*HK45 2130 0005 02FEB&#10;3 WY 680G 10FEB W MEDMCT*HK45 1740 2130&#10;4 WY 849G 11FEB Q MCTCGK*HK45 0145 1240`}
                      className="w-full flex-1 p-3.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-mono leading-relaxed resize-none bg-gray-50 focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 flex-1 justify-center items-center p-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <FileSpreadsheet className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-800">Pilih atau Drag & Drop File Jadwal</h4>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm">
                        Mendukung file spreadsheet <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong> atau teks <strong>.txt</strong>
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center gap-2"
                    >
                      <FileUp className="w-4 h-4" />
                      Pilih File Dari Komputer / HP
                    </button>

                    <div className="text-[11px] text-gray-400 bg-white p-2 rounded-xl border border-gray-200/60 max-w-md text-left">
                      <strong>Kolom Excel yang dikenali:</strong> Maskapai, Vendor, Tgl Berangkat, Tgl Pulang, Rute, Seats/Kursi, Harga Beli/Setoran, Harga Jual.
                    </div>
                  </div>
                )}
              </div>

              {/* Right Preview Panel (6 cols) */}
              <div className="lg:col-span-6 xl:col-span-6 p-4 sm:p-6 bg-gray-50/60 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-3 shrink-0">
                  <span className="text-xs font-black uppercase text-gray-600 tracking-wider flex items-center gap-2">
                    Hasil Analisa & Preview Rute
                    <span className="bg-blue-600 text-white font-black px-2 py-0.5 rounded-full text-[10px]">
                      {parsedFlights.length} Rute
                    </span>
                  </span>
                  {parsedFlights.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setParsedFlights([])}
                      className="text-[11px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Bersihkan
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {parsedFlights.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 gap-3 border-2 border-dashed border-gray-200 rounded-2xl bg-white/60">
                      <PlaneTakeoff className="w-12 h-12 text-gray-300 stroke-[1.5]" />
                      <div>
                        <p className="text-sm font-bold text-gray-650">Belum ada rute terdeteksi</p>
                        <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                          Copas format pesan promo di panel kiri atau klik salah satu tombol <strong>Coba Contoh</strong> di atas untuk melihat preview langsung.
                        </p>
                      </div>
                    </div>
                  ) : (
                    parsedFlights.map((flight, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm hover:border-blue-300 transition-all relative group">
                        <button
                          type="button"
                          onClick={() => handleRemoveParsedFlight(idx)}
                          className="absolute top-3 right-3 text-gray-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Hapus rute ini dari impor"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="pr-6">
                          <div className="flex flex-wrap items-center gap-2">
                            {flight.isUpdate ? (
                              <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-lg font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                                <RefreshCw className="w-3 h-3 text-amber-700" /> UPDATE JADWAL
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-lg font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                                <Plus className="w-3 h-3 text-emerald-700" /> TAMBAH BARU
                              </span>
                            )}
                            <span className="text-xs bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-lg font-black uppercase tracking-wider">
                              {flight.name?.split('(')[0]?.trim() || flight.name}
                            </span>
                            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-lg border border-blue-200/60">
                              {flight.tipePenerbangan || 'DIRECT'}
                            </span>
                            <span className="text-[10px] text-gray-500 font-bold">
                              🏢 {flight.namaVendor}
                            </span>
                          </div>

                          <div className="mt-1 text-xs font-bold text-gray-800">
                            {flight.ruteLabel}
                          </div>

                          <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600 font-medium bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                            <div>🛫 Berangkat: <strong className="text-gray-900">{flight.tanggalKeberangkatan}</strong></div>
                            <div>🛬 Pulang: <strong className="text-gray-900">{flight.tanggalKepulangan} ({flight.programDays}H)</strong></div>
                            <div>💺 Kuota Kursi: <strong className="text-blue-600">{flight.availableSeats} PAX</strong></div>
                            <div>💰 Modal (Setoran): <strong className="text-gray-900 font-mono">Rp {(flight.hargaSetoran || flight.hargaBeli || 0).toLocaleString('id-ID')}</strong></div>
                            <div className="col-span-2 pt-1 border-t border-gray-200/50 flex justify-between items-center text-[11px]">
                              <span>Harga Jual: <strong className="text-emerald-700 font-mono">Rp {(flight.hargaJual || 0).toLocaleString('id-ID')}</strong></span>
                              <span className="text-emerald-600 font-bold">Margin: Rp {(flight.margin || 0).toLocaleString('id-ID')} ({flight.persen || 0}%)</span>
                            </div>
                          </div>

                          {flight.flightItinerary && (
                            <details className="mt-2 text-[10px] text-gray-500">
                              <summary className="cursor-pointer font-bold hover:text-gray-700 select-none">
                                📋 Lihat Itinerary PNR
                              </summary>
                              <div className="mt-1 p-2 bg-gray-50 border border-gray-100 rounded-lg font-mono text-[9px] whitespace-pre-line leading-relaxed max-h-24 overflow-y-auto">
                                {flight.flightItinerary}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 flex flex-wrap justify-between items-center gap-3 bg-gray-50/60 shrink-0">
              <div className="text-xs text-gray-500">
                {parsedFlights.length > 0 && (
                  <span>
                    Siap memproses <strong className="text-gray-900">{parsedFlights.length} rute</strong>:{' '}
                    <span className="text-emerald-700 font-bold">
                      {parsedFlights.filter(f => !f.isUpdate).length} Rute Baru
                    </span>
                    {parsedFlights.some(f => f.isUpdate) && (
                      <>
                        {' & '}
                        <span className="text-amber-700 font-bold">
                          {parsedFlights.filter(f => f.isUpdate).length} Update Jadwal
                        </span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkOpen(false);
                    setBulkText('');
                    setBulkPriceInput('');
                    setBulkVendorInput('');
                    setParsedFlights([]);
                  }}
                  className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveBulk}
                  disabled={parsedFlights.length === 0 || isSavingBulk}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-extrabold rounded-xl text-xs transition-all uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-200 disabled:shadow-none cursor-pointer"
                >
                  {isSavingBulk ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sedang Menyimpan ({parsedFlights.length} Rute)...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Simpan & Update ke Database ({parsedFlights.length} Rute)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-semibold text-white ${
            toast.type === 'success' ? 'bg-emerald-600 border-emerald-500' :
            toast.type === 'error' ? 'bg-rose-600 border-rose-500' :
            'bg-slate-800 border-slate-700'
          }`}>
            <span>{toast.text}</span>
            <button onClick={() => setToast(null)} className="hover:opacity-80 p-0.5 rounded-full bg-white/10 text-white transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
