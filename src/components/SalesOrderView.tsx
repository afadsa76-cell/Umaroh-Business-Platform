import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { hotels, Hotel } from '../data/hotels';
import { HANDLING_TIERS, HANDLING_CONSTANTS } from '../data/handlingSaudi';
import { transportData } from '../data/transport';
import { equipmentData } from '../data/equipment';
import { visaData } from '../data/visa';
import { maskapaiData } from '../data/maskapai';
import { handlingDomestikData } from '../data/handlingDomestik';
import { manasikData } from '../data/manasik';
import { ziarahData } from '../data/ziarah';
import { keretaCepatData } from '../data/keretaCepat';
import { umrahAirports } from '../data/airports';
import { FileSpreadsheet, Image as ImageIcon, FileText, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import { AIPromptInput } from './AIPromptInput';
import { Type } from '@google/genai';
import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';
import { formatCurrency, formatPercent } from '../utils/format';
import { saveTransaction } from '../data/transactions';
import { Transaction } from '../types/transaction';
import { OfferingTemplate } from './OfferingTemplate';
import { db, collection, addDoc } from '../firebase';
import { generateTimelineEstimasi } from './tracker/utils';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

import { isDateInRange } from '../utils/dateUtils';

const getTargetSeason = (hotel: Hotel, dateStr: string) => {
  if (!dateStr) return hotel.seasons[0];
  
  const checkDate = new Date(dateStr);
  const exactSeason = hotel.seasons.find(s => isDateInRange(checkDate, s.range));
  
  return exactSeason || null;
};

const getQuadPrice = (hotel: Hotel, dateStr: string) => {
  const targetSeason = getTargetSeason(hotel, dateStr);
  const quadPriceEntry = targetSeason?.prices.find(p => p.roomType.toLowerCase() === 'quad');
  return quadPriceEntry ? quadPriceEntry.price : null;
};

const getTriplePrice = (hotel: Hotel, dateStr: string) => {
  const targetSeason = getTargetSeason(hotel, dateStr);
  const triplePriceEntry = targetSeason?.prices.find(p => p.roomType.toLowerCase() === 'triple');
  return triplePriceEntry ? triplePriceEntry.price : null;
};

const getDoublePrice = (hotel: Hotel, dateStr: string) => {
  const targetSeason = getTargetSeason(hotel, dateStr);
  const doublePriceEntry = targetSeason?.prices.find(p => p.roomType.toLowerCase() === 'double');
  return doublePriceEntry ? doublePriceEntry.price : null;
};

const getHotelSeasonRange = (hotel: Hotel, dateStr: string) => {
  const targetSeason = getTargetSeason(hotel, dateStr);
  return targetSeason ? targetSeason.range : '';
};

export const SalesOrderView: React.FC = () => {
  const [namaPaket, setNamaPaket] = useState('');
  const [namaTravel, setNamaTravel] = useState('');
  const [namaMitra, setNamaMitra] = useState('');
  const [jenisPaket, setJenisPaket] = useState('Reguler');
  const [emberkasi, setEmberkasi] = useState('Soekarno-Hatta (CGK) - Jakarta');
  const [tglKeberangkatan, setTglKeberangkatan] = useState('');
  const [programHari, setProgramHari] = useState('');
  const [jumlahPax, setJumlahPax] = useState(20);
  const [tl, setTl] = useState(0);
  const [room, setRoom] = useState('');
  const [pic, setPic] = useState('');
  const [hargaVisaUpdate, setHargaVisaUpdate] = useState(135);
  const [hargaTransportasiUpdate, setHargaTransportasiUpdate] = useState(2500);
  const [hargaMutawwifUpdate, setHargaMutawwifUpdate] = useState(300);
  const [pakaiMutawif, setPakaiMutawif] = useState(true);
  const [kursSaudi, setKursSaudi] = useState(4700);
  const [kursUsd, setKursUsd] = useState(17000);
  const [malamMadinah, setMalamMadinah] = useState(3);
  const [malamMakkah, setMalamMakkah] = useState(4);
  const tableRef = useRef<HTMLDivElement>(null);
  const offeringRef = useRef<HTMLDivElement>(null);

  const salesOrderSchema = {
    type: Type.OBJECT,
    properties: {
      namaPaket: { type: Type.STRING, description: "Nama paket umrah" },
      namaTravel: { type: Type.STRING, description: "Nama travel" },
      namaMitra: { type: Type.STRING, description: "Nama mitra" },
      emberkasi: { 
        type: Type.STRING, 
        description: "Bandara keberangkatan/emberkasi di Indonesia",
        enum: umrahAirports.map(a => a.name)
      },
      tglKeberangkatan: { type: Type.STRING, description: "Tanggal keberangkatan dalam format YYYY-MM-DD" },
      programHari: { type: Type.STRING, description: "Jumlah hari program (misal: 9, 10, 12)" },
      jumlahPax: { type: Type.NUMBER, description: "Jumlah pax atau jamaah" },
      tl: { type: Type.NUMBER, description: "Jumlah tour leader (TL)" },
      room: { type: Type.STRING, description: "Tipe kamar (misal: Quad, Triple, Double)" },
      pic: { type: Type.STRING, description: "Nama PIC" },
      malamMadinah: { type: Type.NUMBER, description: "Jumlah malam di Madinah" },
      malamMakkah: { type: Type.NUMBER, description: "Jumlah malam di Makkah" },
      selectedHotelMadinah: { type: Type.STRING, description: "ID Hotel Madinah dari database" },
      selectedHotelMakkah: { type: Type.STRING, description: "ID Hotel Makkah dari database" },
      selectedMaskapai: { type: Type.STRING, description: "ID Maskapai dari database" },
      selectedTransport: { type: Type.STRING, description: "ID Transport dari database (format: id|routeIndex)" },
      selectedHandling: { type: Type.STRING, description: "Min Pax untuk Handling Saudi (misal: '40')" },
      selectedEquipment: { type: Type.STRING, description: "ID Perlengkapan dari database" },
      selectedVisa: { type: Type.STRING, description: "ID Visa dari database" },
      selectedHandlingDomestik: { type: Type.STRING, description: "ID Handling Domestik dari database" },
      selectedManasik: { type: Type.STRING, description: "ID Manasik dari database" },
      selectedZiarah: { type: Type.STRING, description: "ID Ziarah dari database" },
      selectedKeretaCepat: { type: Type.STRING, description: "ID Kereta Cepat dari database" },
    }
  };

  const salesOrderSystemInstruction = "Anda adalah asisten AI untuk mengisi form Sales Order Umrah. Ekstrak informasi dari teks yang diberikan pengguna dan kembalikan dalam format JSON sesuai schema. Jika pengguna tidak menyebutkan hotel spesifik, pilihkan secara otomatis hotel Madinah dan Makkah yang tersedia dari contextData. Jika ada informasi yang tidak disebutkan, biarkan kosong atau gunakan nilai default yang masuk akal.";

  const handleDataParsed = (data: any) => {
    if (data.namaPaket) setNamaPaket(data.namaPaket);
    if (data.namaTravel) setNamaTravel(data.namaTravel);
    if (data.namaMitra) setNamaMitra(data.namaMitra);
    if (data.emberkasi) setEmberkasi(data.emberkasi);
    if (data.tglKeberangkatan) setTglKeberangkatan(data.tglKeberangkatan);
    if (data.programHari) setProgramHari(data.programHari);
    if (data.jumlahPax) setJumlahPax(data.jumlahPax);
    if (data.tl !== undefined) setTl(data.tl);
    if (data.room) setRoom(data.room);
    if (data.pic) setPic(data.pic);
    if (data.malamMadinah) setMalamMadinah(data.malamMadinah);
    if (data.malamMakkah) setMalamMakkah(data.malamMakkah);
    
    if (data.selectedHotelMadinah) setSelectedHotelMadinah(data.selectedHotelMadinah);
    if (data.selectedHotelMakkah) setSelectedHotelMakkah(data.selectedHotelMakkah);
    if (data.selectedMaskapai) setSelectedMaskapai(data.selectedMaskapai);
    if (data.selectedTransport) setSelectedTransport(data.selectedTransport);
    if (data.selectedHandling) setSelectedHandling(data.selectedHandling);
    if (data.selectedEquipment) setSelectedEquipment(data.selectedEquipment);
    if (data.selectedVisa) setSelectedVisa(data.selectedVisa);
    if (data.selectedHandlingDomestik) setSelectedHandlingDomestik(data.selectedHandlingDomestik);
    if (data.selectedManasik) setSelectedManasik(data.selectedManasik);
    if (data.selectedZiarah) setSelectedZiarah(data.selectedZiarah);
    if (data.selectedKeretaCepat) setSelectedKeretaCepat(data.selectedKeretaCepat);
  };

  // Selections
  const [selectedHotelMadinah, setSelectedHotelMadinah] = useState(hotels.find(h => h.city === 'Madinah')?.id || '');
  const [selectedHotelMakkah, setSelectedHotelMakkah] = useState(hotels.find(h => h.city === 'Makkah')?.id || '');
  const [selectedHandling, setSelectedHandling] = useState(HANDLING_TIERS[0]?.minPax.toString() || '');
  const [selectedEquipment, setSelectedEquipment] = useState(equipmentData[0]?.id || '');
  const [selectedVisa, setSelectedVisa] = useState(visaData[0]?.id || '');
  const [selectedTransport, setSelectedTransport] = useState(transportData[0] ? `${transportData[0].id}|0` : '');
  const [selectedMaskapai, setSelectedMaskapai] = useState('');
  const [selectedHandlingDomestik, setSelectedHandlingDomestik] = useState(handlingDomestikData[0]?.id || '');
  const [selectedManasik, setSelectedManasik] = useState(manasikData[0]?.id || '');
  const [selectedZiarah, setSelectedZiarah] = useState('');
  const [selectedKeretaCepat, setSelectedKeretaCepat] = useState('');

  // Prices and Margins
  const [maskapaiHargaApk, setMaskapaiHargaApk] = useState(16000000);
  const [maskapaiHargaVendor, setMaskapaiHargaVendor] = useState(15200000);
  
  const [namaWisata, setNamaWisata] = useState('');
  const [hargaWisataApk, setHargaWisataApk] = useState(0);
  const [hargaWisataVendor, setHargaWisataVendor] = useState(0);

  const [asuransiHargaApk, setAsuransiHargaApk] = useState(65000);
  const [asuransiHargaVendor, setAsuransiHargaVendor] = useState(65000);
  
  const [manasikHargaApk, setManasikHargaApk] = useState(50000);
  const [manasikHargaVendor, setManasikHargaVendor] = useState(0);
  
  const [handlingDomestikHargaApk, setHandlingDomestikHargaApk] = useState(200000);
  const [handlingDomestikHargaVendor, setHandlingDomestikHargaVendor] = useState(135000);

  const [ziarahHargaApk, setZiarahHargaApk] = useState(0);
  const [ziarahHargaVendor, setZiarahHargaVendor] = useState(0);

  const [keretaCepatHargaApk, setKeretaCepatHargaApk] = useState(0);
  const [keretaCepatHargaVendor, setKeretaCepatHargaVendor] = useState(0);

  const [komisiMitra, setKomisiMitra] = useState(3000000);
  const komisiUmarohPercent = 10;
  const komisiUmaroh = komisiMitra * (komisiUmarohPercent / 100);

  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('salesOrderState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.namaPaket !== undefined) setNamaPaket(parsed.namaPaket);
        if (parsed.namaTravel !== undefined) setNamaTravel(parsed.namaTravel);
        if (parsed.namaMitra !== undefined) setNamaMitra(parsed.namaMitra);
        if (parsed.jenisPaket !== undefined) setJenisPaket(parsed.jenisPaket);
        if (parsed.emberkasi !== undefined) setEmberkasi(parsed.emberkasi);
        if (parsed.tglKeberangkatan !== undefined) setTglKeberangkatan(parsed.tglKeberangkatan);
        if (parsed.programHari !== undefined) setProgramHari(parsed.programHari);
        if (parsed.jumlahPax !== undefined) setJumlahPax(parsed.jumlahPax);
        if (parsed.tl !== undefined) setTl(parsed.tl);
        if (parsed.room !== undefined) setRoom(parsed.room);
        if (parsed.pic !== undefined) setPic(parsed.pic);
        if (parsed.hargaVisaUpdate !== undefined) setHargaVisaUpdate(parsed.hargaVisaUpdate);
        if (parsed.hargaTransportasiUpdate !== undefined) setHargaTransportasiUpdate(parsed.hargaTransportasiUpdate);
        if (parsed.hargaMutawwifUpdate !== undefined) setHargaMutawwifUpdate(parsed.hargaMutawwifUpdate);
        if (parsed.pakaiMutawif !== undefined) setPakaiMutawif(parsed.pakaiMutawif);
        if (parsed.kursSaudi !== undefined) setKursSaudi(parsed.kursSaudi);
        if (parsed.kursUsd !== undefined) setKursUsd(parsed.kursUsd);
        if (parsed.malamMadinah !== undefined) setMalamMadinah(parsed.malamMadinah);
        if (parsed.malamMakkah !== undefined) setMalamMakkah(parsed.malamMakkah);
        if (parsed.selectedHotelMadinah !== undefined) setSelectedHotelMadinah(parsed.selectedHotelMadinah);
        if (parsed.selectedHotelMakkah !== undefined) setSelectedHotelMakkah(parsed.selectedHotelMakkah);
        if (parsed.selectedHandling !== undefined) setSelectedHandling(parsed.selectedHandling);
        if (parsed.selectedEquipment !== undefined) setSelectedEquipment(parsed.selectedEquipment);
        if (parsed.selectedVisa !== undefined) setSelectedVisa(parsed.selectedVisa);
        if (parsed.selectedTransport !== undefined) setSelectedTransport(parsed.selectedTransport);
        if (parsed.selectedMaskapai !== undefined) setSelectedMaskapai(parsed.selectedMaskapai);
        if (parsed.selectedHandlingDomestik !== undefined) setSelectedHandlingDomestik(parsed.selectedHandlingDomestik);
        if (parsed.selectedManasik !== undefined) setSelectedManasik(parsed.selectedManasik);
        if (parsed.selectedZiarah !== undefined) setSelectedZiarah(parsed.selectedZiarah);
        if (parsed.selectedKeretaCepat !== undefined) setSelectedKeretaCepat(parsed.selectedKeretaCepat);
        if (parsed.maskapaiHargaApk !== undefined) setMaskapaiHargaApk(parsed.maskapaiHargaApk);
        if (parsed.maskapaiHargaVendor !== undefined) setMaskapaiHargaVendor(parsed.maskapaiHargaVendor);
        if (parsed.namaWisata !== undefined) setNamaWisata(parsed.namaWisata);
        if (parsed.hargaWisataApk !== undefined) setHargaWisataApk(parsed.hargaWisataApk);
        if (parsed.hargaWisataVendor !== undefined) setHargaWisataVendor(parsed.hargaWisataVendor);
        if (parsed.asuransiHargaApk !== undefined) setAsuransiHargaApk(parsed.asuransiHargaApk);
        if (parsed.asuransiHargaVendor !== undefined) setAsuransiHargaVendor(parsed.asuransiHargaVendor);
        if (parsed.manasikHargaApk !== undefined) setManasikHargaApk(parsed.manasikHargaApk);
        if (parsed.manasikHargaVendor !== undefined) setManasikHargaVendor(parsed.manasikHargaVendor);
        if (parsed.handlingDomestikHargaApk !== undefined) setHandlingDomestikHargaApk(parsed.handlingDomestikHargaApk);
        if (parsed.handlingDomestikHargaVendor !== undefined) setHandlingDomestikHargaVendor(parsed.handlingDomestikHargaVendor);
        if (parsed.ziarahHargaApk !== undefined) setZiarahHargaApk(parsed.ziarahHargaApk);
        if (parsed.ziarahHargaVendor !== undefined) setZiarahHargaVendor(parsed.ziarahHargaVendor);
        if (parsed.keretaCepatHargaApk !== undefined) setKeretaCepatHargaApk(parsed.keretaCepatHargaApk);
        if (parsed.keretaCepatHargaVendor !== undefined) setKeretaCepatHargaVendor(parsed.keretaCepatHargaVendor);
        if (parsed.komisiMitra !== undefined) setKomisiMitra(parsed.komisiMitra);
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (!isLoaded) return;
    const stateToSave = {
      namaPaket, namaTravel, namaMitra, jenisPaket, emberkasi, tglKeberangkatan,
      programHari, jumlahPax, tl, room, pic, hargaVisaUpdate, hargaTransportasiUpdate,
      hargaMutawwifUpdate, pakaiMutawif, kursSaudi, kursUsd, malamMadinah, malamMakkah,
      selectedHotelMadinah, selectedHotelMakkah, selectedHandling, selectedEquipment,
      selectedVisa, selectedTransport, selectedMaskapai, selectedHandlingDomestik,
      selectedManasik, selectedZiarah, selectedKeretaCepat, maskapaiHargaApk,
      maskapaiHargaVendor, namaWisata, hargaWisataApk, hargaWisataVendor,
      asuransiHargaApk, asuransiHargaVendor, manasikHargaApk, manasikHargaVendor,
      handlingDomestikHargaApk, handlingDomestikHargaVendor, ziarahHargaApk,
      ziarahHargaVendor, keretaCepatHargaApk, keretaCepatHargaVendor, komisiMitra
    };
    localStorage.setItem('salesOrderState', JSON.stringify(stateToSave));
  }, [
    isLoaded,
    namaPaket, namaTravel, namaMitra, jenisPaket, emberkasi, tglKeberangkatan,
    programHari, jumlahPax, tl, room, pic, hargaVisaUpdate, hargaTransportasiUpdate,
    hargaMutawwifUpdate, pakaiMutawif, kursSaudi, kursUsd, malamMadinah, malamMakkah,
    selectedHotelMadinah, selectedHotelMakkah, selectedHandling, selectedEquipment,
    selectedVisa, selectedTransport, selectedMaskapai, selectedHandlingDomestik,
    selectedManasik, selectedZiarah, selectedKeretaCepat, maskapaiHargaApk,
    maskapaiHargaVendor, namaWisata, hargaWisataApk, hargaWisataVendor,
    asuransiHargaApk, asuransiHargaVendor, manasikHargaApk, manasikHargaVendor,
    handlingDomestikHargaApk, handlingDomestikHargaVendor, ziarahHargaApk,
    ziarahHargaVendor, keretaCepatHargaApk, keretaCepatHargaVendor, komisiMitra
  ]);

  const customSelectStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: 'transparent',
      border: 'none',
      boxShadow: 'none',
      fontStyle: 'italic',
      fontWeight: '500',
      minHeight: 'auto',
      padding: 0,
      cursor: 'text',
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: 0,
    }),
    input: (provided: any) => ({
      ...provided,
      margin: 0,
      padding: 0,
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    dropdownIndicator: (provided: any) => ({
      ...provided,
      padding: '0 4px',
    }),
    menu: (provided: any) => ({
      ...provided,
      fontStyle: 'normal',
      fontWeight: 'normal',
      zIndex: 50,
      width: 'max-content',
      minWidth: '100%',
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      fontSize: '0.875rem',
      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
      color: state.isSelected ? 'white' : '#1f2937',
    })
  };

  // Helper to calculate row values
  const calculateRow = (hargaApk: number, hargaVendor: number, jamaahBayar: number, jamaahBeli: number) => {
    const estMargin = hargaApk - hargaVendor;
    const pctMargin = hargaApk > 0 ? estMargin / hargaApk : 0;
    const totalHrgJual = hargaApk * jamaahBayar;
    const totalHargaBeli = hargaVendor * jamaahBeli;
    const totalMargin = totalHrgJual - totalHargaBeli;
    return { estMargin, pctMargin, totalHrgJual, totalHargaBeli, totalMargin };
  };

  const jamaahBayar = jumlahPax;
  const jamaahBeli = jumlahPax + tl;

  const availableMadinahHotels = hotels.filter(h => h.city === 'Madinah' && getQuadPrice(h, tglKeberangkatan) !== null);
  const availableMakkahHotels = hotels.filter(h => h.city === 'Makkah' && getQuadPrice(h, tglKeberangkatan) !== null);

  const availableMaskapai = [...maskapaiData]
    .filter(m => {
      const matchDays = programHari ? m.programDays.toString() === programHari : true;
      
      // Filter by Emberkasi
      const selectedAirport = umrahAirports.find(a => a.name === emberkasi);
      const airportCode = selectedAirport?.id;
      const matchEmberkasi = airportCode ? m.originCityName.includes(`(${airportCode})`) : true;
      
      return matchDays && matchEmberkasi;
    })
    .sort((a, b) => {
      if (!tglKeberangkatan) {
        return new Date(a.tanggalKeberangkatan).getTime() - new Date(b.tanggalKeberangkatan).getTime();
      }
      const dateA = new Date(a.tanggalKeberangkatan).getTime();
      const dateB = new Date(b.tanggalKeberangkatan).getTime();
      const targetDate = new Date(tglKeberangkatan).getTime();
      
      return Math.abs(dateA - targetDate) - Math.abs(dateB - targetDate);
    });

  useEffect(() => {
    if (selectedHotelMadinah && !availableMadinahHotels.find(h => h.id === selectedHotelMadinah)) {
      setSelectedHotelMadinah('');
    }
    if (selectedHotelMakkah && !availableMakkahHotels.find(h => h.id === selectedHotelMakkah)) {
      setSelectedHotelMakkah('');
    }
    if (selectedMaskapai && !availableMaskapai.find(m => m.id === selectedMaskapai)) {
      setSelectedMaskapai('');
    }
  }, [tglKeberangkatan, programHari]);

  useEffect(() => {
    const maskapai = maskapaiData.find(m => m.id === selectedMaskapai);
    if (maskapai) {
      setMaskapaiHargaApk(maskapai.hargaJual);
      setMaskapaiHargaVendor(maskapai.hargaBeli);
    }
  }, [selectedMaskapai]);

  useEffect(() => {
    const tier = HANDLING_TIERS.find(h => jumlahPax >= h.minPax && jumlahPax <= h.maxPax) || HANDLING_TIERS[HANDLING_TIERS.length - 1];
    if (tier) {
      setSelectedHandling(tier.minPax.toString());
    }
    if (jumlahPax > 35) {
      setSelectedTransport('none|0');
    } else {
      let vehicleId = 'bus';
      if (jumlahPax <= 5) vehicleId = 'gmc';
      else if (jumlahPax <= 7) vehicleId = 'staria';
      else if (jumlahPax <= 12) vehicleId = 'hiace';
      else vehicleId = 'bus';

      const vehicle = transportData.find(t => t.id === vehicleId);
      if (vehicle) {
        const fullTripIndex = vehicle.routes.findIndex(r => r.route.toLowerCase().includes('full trip'));
        if (fullTripIndex !== -1) {
          setSelectedTransport(`${vehicleId}|${fullTripIndex}`);
        }
      }
    }
    
    // Auto select Visa based on pax
    const targetVisa = jumlahPax > 34 
      ? visaData.find(v => v.paxRange.includes('35-55')) || visaData[1] || visaData[0]
      : visaData.find(v => v.paxRange.includes('1-34')) || visaData[0];
    if (targetVisa) {
      setSelectedVisa(targetVisa.id);
    }
  }, [jumlahPax]);

  useEffect(() => {
    const handlingDomestik = handlingDomestikData.find(h => h.id === selectedHandlingDomestik);
    if (handlingDomestik) {
      setHandlingDomestikHargaApk(handlingDomestik.hargaJual);
      setHandlingDomestikHargaVendor(handlingDomestik.hargaBeli);
    } else {
      setHandlingDomestikHargaApk(0);
      setHandlingDomestikHargaVendor(0);
    }
  }, [selectedHandlingDomestik]);

  useEffect(() => {
    const manasik = manasikData.find(m => m.id === selectedManasik);
    if (manasik) {
      setManasikHargaApk(manasik.hargaJual);
      setManasikHargaVendor(manasik.hargaBeli);
    } else {
      setManasikHargaApk(0);
      setManasikHargaVendor(0);
    }
  }, [selectedManasik]);

  useEffect(() => {
    const ziarah = ziarahData.find(z => z.id === selectedZiarah);
    if (ziarah) {
      const vendor = (ziarah.hargaAsing * kursSaudi) / (jumlahPax > 0 ? jumlahPax : 1);
      
      let multiplier = 1;
      const itemName = ziarah.item.toUpperCase();
      if (itemName.includes('JABAL KHANDAMAH')) {
        multiplier = 1.2;
      } else if (itemName.includes('AL ULA MADINAH')) {
        multiplier = 2.0;
      } else if (itemName.includes('JABAL MAGNET')) {
        multiplier = 2.9;
      } else if (itemName.includes('THAIF')) {
        multiplier = 2.0;
      } else if (ziarah.hargaBeli > 0) {
        multiplier = ziarah.hargaJual / ziarah.hargaBeli;
      }

      setZiarahHargaVendor(vendor);
      setZiarahHargaApk(vendor * multiplier);
    } else {
      setZiarahHargaApk(0);
      setZiarahHargaVendor(0);
    }
  }, [selectedZiarah, kursSaudi, jumlahPax]);

  useEffect(() => {
    const keretaCepat = keretaCepatData.find(k => k.id === selectedKeretaCepat);
    if (keretaCepat) {
      setKeretaCepatHargaApk(keretaCepat.hargaJual);
      setKeretaCepatHargaVendor(keretaCepat.hargaBeli);
    } else {
      setKeretaCepatHargaApk(0);
      setKeretaCepatHargaVendor(0);
    }
  }, [selectedKeretaCepat]);

  // Row calculations
  const effectiveMaskapaiHargaApk = jenisPaket === 'Paket L.A.' ? 0 : maskapaiHargaApk;
  const effectiveMaskapaiHargaVendor = jenisPaket === 'Paket L.A.' ? 0 : maskapaiHargaVendor;
  const maskapaiObj = maskapaiData.find(m => m.id === selectedMaskapai);
  const maskapai = calculateRow(effectiveMaskapaiHargaApk, effectiveMaskapaiHargaVendor, jamaahBayar, jamaahBeli);
  
  const wisataRow = calculateRow(hargaWisataApk, hargaWisataVendor, jamaahBayar, jamaahBeli);

  // Hotel Madinah
  const hotelMadinahObj = hotels.find(h => h.id === selectedHotelMadinah);
  const hotelMadinahHargaVendor = hotelMadinahObj ? ((getQuadPrice(hotelMadinahObj, tglKeberangkatan) || 0) * kursSaudi * malamMadinah) / 4 : 0;
  const hotelMadinahHargaApk = hotelMadinahHargaVendor * 1.10; // 10% markup
  const hotelMadinah = calculateRow(hotelMadinahHargaApk, hotelMadinahHargaVendor, jamaahBayar, jamaahBeli);

  // Hotel Makkah
  const hotelMakkahObj = hotels.find(h => h.id === selectedHotelMakkah);
  const hotelMakkahHargaVendor = hotelMakkahObj ? ((getQuadPrice(hotelMakkahObj, tglKeberangkatan) || 0) * kursSaudi * malamMakkah) / 4 : 0;
  const hotelMakkahHargaApk = hotelMakkahHargaVendor * 1.10; // 10% markup
  const hotelMakkah = calculateRow(hotelMakkahHargaApk, hotelMakkahHargaVendor, jamaahBayar, jamaahBeli);

  // Handling
  const handlingObj = HANDLING_TIERS.find(h => h.minPax.toString() === selectedHandling);
  const handlingHargaVendor = handlingObj ? (handlingObj.hpp + HANDLING_CONSTANTS.adminFee) * kursUsd : 0;
  const handlingHargaApk = handlingHargaVendor * (1 + HANDLING_CONSTANTS.defaultMarginPercent / 100);
  const handling = calculateRow(handlingHargaApk, handlingHargaVendor, jamaahBayar, jamaahBeli);

  // Mutawif
  const mutawifHari = programHari ? (parseInt(programHari) || 9) - 1 : 8;
  const mutawifHargaVendor = (pakaiMutawif && jumlahPax > 0) ? (hargaMutawwifUpdate * mutawifHari * kursSaudi) / jumlahPax : 0;
  const mutawifHargaApk = mutawifHargaVendor * 1.80; // 80% margin
  const mutawifRow = calculateRow(mutawifHargaApk, mutawifHargaVendor, jamaahBayar, jamaahBeli);

  // Equipment
  const equipmentObj = equipmentData.find(e => e.id === selectedEquipment);
  const equipmentHargaVendor = equipmentObj ? equipmentObj.basePrice : 0;
  const equipmentHargaApk = equipmentObj ? equipmentObj.roundedPrice : 0;
  const perlengkapan = calculateRow(equipmentHargaApk, equipmentHargaVendor, jamaahBayar, jamaahBeli);

  // Visa
  const visaObj = visaData.find(v => v.id === selectedVisa);
  const visaHargaVendor = visaObj ? visaObj.vendorPrice : 0;
  const visaHargaApk = visaObj ? visaObj.sellingPrice : 0;
  const visaRow = calculateRow(visaHargaApk, visaHargaVendor, jamaahBayar, jamaahBeli);

  // Transport
  const [transportId, routeIndexStr] = selectedTransport.split('|');
  const transportObj = transportData.find(t => t.id === transportId);
  const transportRoute = transportObj?.routes[Number(routeIndexStr)];
  const transportHargaVendor = transportRoute ? (transportRoute.price * kursSaudi) / (jumlahPax > 0 ? jumlahPax : 1) : 0;
  const transportHargaApk = transportHargaVendor * 1.29; // Example 29% markup
  const transportRow = calculateRow(transportHargaApk, transportHargaVendor, jamaahBayar, jamaahBeli);

  const asuransi = calculateRow(asuransiHargaApk, asuransiHargaVendor, jamaahBayar, jamaahBeli);
  const manasik = calculateRow(manasikHargaApk, manasikHargaVendor, jamaahBayar, jamaahBeli);
  const ziarah = calculateRow(ziarahHargaApk, ziarahHargaVendor, jamaahBayar, jamaahBeli);
  const keretaCepat = calculateRow(keretaCepatHargaApk, keretaCepatHargaVendor, jamaahBayar, jamaahBeli);
  const handlingDomestik = calculateRow(handlingDomestikHargaApk, handlingDomestikHargaVendor, jamaahBayar, jamaahBeli);

  // Tour Leader
  const subtotalHargaVendor = effectiveMaskapaiHargaVendor + hotelMadinahHargaVendor + hotelMakkahHargaVendor + handlingHargaVendor + mutawifHargaVendor + equipmentHargaVendor + visaHargaVendor + transportHargaVendor + asuransiHargaVendor + manasikHargaVendor + ziarahHargaVendor + keretaCepatHargaVendor + handlingDomestikHargaVendor + (jenisPaket === 'Plus Wisata' ? hargaWisataVendor : 0);
  const tlHargaApk = (jumlahPax > 0 && tl > 0) ? (subtotalHargaVendor * tl) / jumlahPax : 0;
  const tlRow = calculateRow(tlHargaApk, 0, jamaahBayar, 0); 

  // Totals
  const totalHargaApk = effectiveMaskapaiHargaApk + hotelMadinahHargaApk + hotelMakkahHargaApk + handlingHargaApk + mutawifHargaApk + equipmentHargaApk + visaHargaApk + transportHargaApk + asuransiHargaApk + manasikHargaApk + ziarahHargaApk + keretaCepatHargaApk + handlingDomestikHargaApk + tlHargaApk + (jenisPaket === 'Plus Wisata' ? hargaWisataApk : 0);
  
  const totalHrgJual = maskapai.totalHrgJual + hotelMadinah.totalHrgJual + hotelMakkah.totalHrgJual + handling.totalHrgJual + mutawifRow.totalHrgJual + perlengkapan.totalHrgJual + visaRow.totalHrgJual + transportRow.totalHrgJual + asuransi.totalHrgJual + manasik.totalHrgJual + ziarah.totalHrgJual + keretaCepat.totalHrgJual + handlingDomestik.totalHrgJual + tlRow.totalHrgJual + (jenisPaket === 'Plus Wisata' ? wisataRow.totalHrgJual : 0);
  
  const totalHargaBeliAll = maskapai.totalHargaBeli + hotelMadinah.totalHargaBeli + hotelMakkah.totalHargaBeli + handling.totalHargaBeli + mutawifRow.totalHargaBeli + perlengkapan.totalHargaBeli + visaRow.totalHargaBeli + transportRow.totalHargaBeli + asuransi.totalHargaBeli + manasik.totalHargaBeli + ziarah.totalHargaBeli + keretaCepat.totalHargaBeli + handlingDomestik.totalHargaBeli + tlRow.totalHargaBeli + (jenisPaket === 'Plus Wisata' ? wisataRow.totalHargaBeli : 0);
  
  const totalHargaVendor = totalHargaBeliAll / (jumlahPax > 0 ? jumlahPax : 1);
  const totalEstMargin = totalHargaApk - totalHargaVendor;
  const totalMarginAll = totalHrgJual - totalHargaBeliAll;

  const hotelMadinahTriple = hotelMadinahObj ? ((getTriplePrice(hotelMadinahObj, tglKeberangkatan) || 0) * kursSaudi * malamMadinah) / 3 : 0;
  const hotelMakkahTriple = hotelMakkahObj ? ((getTriplePrice(hotelMakkahObj, tglKeberangkatan) || 0) * kursSaudi * malamMakkah) / 3 : 0;

  const hotelMadinahDouble = hotelMadinahObj ? ((getDoublePrice(hotelMadinahObj, tglKeberangkatan) || 0) * kursSaudi * malamMadinah) / 2 : 0;
  const hotelMakkahDouble = hotelMakkahObj ? ((getDoublePrice(hotelMakkahObj, tglKeberangkatan) || 0) * kursSaudi * malamMakkah) / 2 : 0;

  const hargaQuadDewasa = totalHargaApk + komisiMitra + komisiUmaroh;
  const hargaTripleDewasa = totalHargaApk - (hotelMadinahHargaApk + hotelMakkahHargaApk) + hotelMadinahTriple + hotelMakkahTriple + komisiMitra + komisiUmaroh;
  const hargaDoubleDewasa = totalHargaApk - (hotelMadinahHargaApk + hotelMakkahHargaApk) + hotelMadinahDouble + hotelMakkahDouble + komisiMitra + komisiUmaroh;

  const handleSaveTransaction = () => {
    if (!namaPaket || !tglKeberangkatan) {
      alert("Nama Paket dan Tanggal Keberangkatan harus diisi sebelum menyimpan transaksi.");
      return;
    }

    const transaction: Transaction = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      namaPaket,
      namaTravel,
      tglKeberangkatan,
      jumlahPax,
      totalOmzet: totalHrgJual + (komisiMitra * jamaahBayar) + (komisiUmaroh * jamaahBayar),
      totalHpp: totalHargaBeliAll + (komisiMitra * jamaahBayar),
      totalProfit: totalMarginAll + (komisiUmaroh * jamaahBayar)
    };

    saveTransaction(transaction);
    alert("Transaksi berhasil disimpan! Anda bisa melihatnya di menu Laporan Pendapatan.");
  };

  const handleDownloadExcel = () => {
    const data = [
      ["NAMA PAKET", namaPaket, "", "", "JUMLAH PAX", jumlahPax, "PIC", pic, "", "", "", ""],
      ["EMBERKASI", emberkasi, "", "", "", "", "", "", "", "", "", ""],
      ["TGL KEBERANGKATAN", tglKeberangkatan, "", "", "+ TL", tl, "", "", "", "", "", ""],
      ["PROGRAM HARI", programHari, "ROOM", room, "NAMA TRAVEL", namaTravel, "", "", "", "", "", ""],
      ["NAMA MITRA", namaMitra, "", "", "", "", "", "", "", "", "", ""],
      [],
      ["DESK", "VENDOR", "HARGA APK", "HARGA VENDOR", "EST. MARGIN", "% MARGIN", "JAMAAH BAYAR", "TOTAL HRG JUAL", "JAMAAH BELI", "TOTAL HARGA BELI", "TOTAL MARGIN", "REFF."]
    ];

    if (effectiveMaskapaiHargaApk > 0) data.push([`MASKAPAI: ${maskapaiObj?.name || "-"} (${maskapaiObj?.programDays || "-"} Hari) (${maskapaiObj?.tanggalKeberangkatan || "-"}) - Sisa: ${maskapaiObj?.availableSeats || "-"}`, maskapaiObj?.namaVendor || "-", effectiveMaskapaiHargaApk, effectiveMaskapaiHargaVendor, maskapai.estMargin, formatPercent(maskapai.pctMargin), jamaahBayar, maskapai.totalHrgJual, jamaahBeli, maskapai.totalHargaBeli, maskapai.totalMargin, "CONFIRMED"]);
    if (jenisPaket === 'Plus Wisata' && hargaWisataApk > 0) data.push([`WISATA: ${namaWisata || "-"}`, "-", hargaWisataApk, hargaWisataVendor, wisataRow.estMargin, formatPercent(wisataRow.pctMargin), jamaahBayar, wisataRow.totalHrgJual, jamaahBeli, wisataRow.totalHargaBeli, wisataRow.totalMargin, "UPDATE"]);
    if (hotelMadinahHargaApk > 0) data.push([`HOTEL MADINAH: ${hotelMadinahObj?.name || "-"}`, hotelMadinahObj?.vendor || "-", hotelMadinahHargaApk, hotelMadinahHargaVendor, hotelMadinah.estMargin, formatPercent(hotelMadinah.pctMargin), jamaahBayar, hotelMadinah.totalHrgJual, jamaahBeli, hotelMadinah.totalHargaBeli, hotelMadinah.totalMargin, "UPDATE RATE"]);
    if (hotelMakkahHargaApk > 0) data.push([`HOTEL MAKKAH: ${hotelMakkahObj?.name || "-"}`, hotelMakkahObj?.vendor || "-", hotelMakkahHargaApk, hotelMakkahHargaVendor, hotelMakkah.estMargin, formatPercent(hotelMakkah.pctMargin), jamaahBayar, hotelMakkah.totalHrgJual, jamaahBeli, hotelMakkah.totalHargaBeli, hotelMakkah.totalMargin, "UPDATE RATE"]);
    if (handlingHargaApk > 0) data.push([`HANDLING: ${handlingObj ? `${handlingObj.minPax}-${handlingObj.maxPax} Pax` : "-"}`, "TFA", handlingHargaApk, handlingHargaVendor, handling.estMargin, formatPercent(handling.pctMargin), jamaahBayar, handling.totalHrgJual, jamaahBeli, handling.totalHargaBeli, handling.totalMargin, "UPDATE"]);
    if (mutawifHargaApk > 0) data.push([`MUTAWIF: ${mutawifHari} Hari${!pakaiMutawif ? ' (Tidak Dipakai)' : ''}`, "TFA", mutawifHargaApk, mutawifHargaVendor, mutawifRow.estMargin, formatPercent(mutawifRow.pctMargin), jamaahBayar, mutawifRow.totalHrgJual, jamaahBeli, mutawifRow.totalHargaBeli, mutawifRow.totalMargin, "UPDATE"]);
    if (equipmentHargaApk > 0) data.push([`PERLENGKAPAN: ${equipmentObj?.name || "-"}`, "UMAROH", equipmentHargaApk, equipmentHargaVendor, perlengkapan.estMargin, formatPercent(perlengkapan.pctMargin), jamaahBayar, perlengkapan.totalHrgJual, jamaahBeli, perlengkapan.totalHargaBeli, perlengkapan.totalMargin, "GUDANG OK"]);
    if (visaHargaApk > 0) data.push([`VISA: ${visaObj?.paxRange || "-"}`, "TFA", visaHargaApk, visaHargaVendor, visaRow.estMargin, formatPercent(visaRow.pctMargin), jamaahBayar, visaRow.totalHrgJual, jamaahBeli, visaRow.totalHargaBeli, visaRow.totalMargin, "UPDATE"]);
    if (transportHargaApk > 0) data.push([`TRANSPORT: ${transportObj?.name || "-"} ${transportRoute?.route || ""}`, transportObj?.namaVendor || "-", transportHargaApk, transportHargaVendor, transportRow.estMargin, formatPercent(transportRow.pctMargin), jamaahBayar, transportRow.totalHrgJual, jamaahBeli, transportRow.totalHargaBeli, transportRow.totalMargin, ""]);
    if (asuransiHargaApk > 0) data.push(["ASURANSI ZURICH BASIC", "ZURICH", asuransiHargaApk, asuransiHargaVendor, asuransi.estMargin, formatPercent(asuransi.pctMargin), jamaahBayar, asuransi.totalHrgJual, jamaahBeli, asuransi.totalHargaBeli, asuransi.totalMargin, "UPDATE"]);
    if (manasikHargaApk > 0) data.push([`MANASIK: ${manasikData.find(m => m.id === selectedManasik)?.item || "-"}`, "-", manasikHargaApk, manasikHargaVendor, manasik.estMargin, formatPercent(manasik.pctMargin), jamaahBayar, manasik.totalHrgJual, jamaahBeli, manasik.totalHargaBeli, manasik.totalMargin, ""]);
    if (ziarahHargaApk > 0) data.push([`ZIARAH: ${ziarahData.find(z => z.id === selectedZiarah)?.item || "-"}`, "-", ziarahHargaApk, ziarahHargaVendor, ziarah.estMargin, formatPercent(ziarah.pctMargin), jamaahBayar, ziarah.totalHrgJual, jamaahBeli, ziarah.totalHargaBeli, ziarah.totalMargin, ""]);
    if (keretaCepatHargaApk > 0) data.push([`KERETA CEPAT: ${keretaCepatData.find(k => k.id === selectedKeretaCepat)?.item || "-"}`, "-", keretaCepatHargaApk, keretaCepatHargaVendor, keretaCepat.estMargin, formatPercent(keretaCepat.pctMargin), jamaahBayar, keretaCepat.totalHrgJual, jamaahBeli, keretaCepat.totalHargaBeli, keretaCepat.totalMargin, ""]);
    if (handlingDomestikHargaApk > 0) data.push([`HANDLING DOMESTIK: ${handlingDomestikData.find(h => h.id === selectedHandlingDomestik)?.item || "-"}`, "BOWO", handlingDomestikHargaApk, handlingDomestikHargaVendor, handlingDomestik.estMargin, formatPercent(handlingDomestik.pctMargin), jamaahBayar, handlingDomestik.totalHrgJual, jamaahBeli, handlingDomestik.totalHargaBeli, handlingDomestik.totalMargin, "UPDATE"]);
    if (tlHargaApk > 0) data.push(["TOUR LEADER (TL)", "", tlHargaApk, tlHargaVendor, tlRow.estMargin, "0%", jamaahBayar, tlRow.totalHrgJual, "", "", tlRow.totalMargin, ""]);

    data.push(
      [],
      ["HARGA DEWASA SEBELUM ADA KOMISI", "", totalHargaApk, totalHargaVendor, totalEstMargin, formatPercent(totalEstMargin / totalHargaApk), "", totalHrgJual, "", totalHargaBeliAll, totalMarginAll, ""]
    );

    if (komisiMitra > 0) data.push(["KOMISI MITRA", "", komisiMitra, "", "", "", "", "", "", "", "", ""]);
    if (komisiUmaroh > 0) data.push(["KOMISI UMAROH", "", komisiUmaroh, "", "", "", "", "", "", "", "", ""]);

    data.push(
      ["HARGA QUAD DEWASA SETELAH ADA KOMISI", "", hargaQuadDewasa, "", "", "", "", "", "", "", "", ""],
      ["HARGA TRIPLE DEWASA SETELAH ADA KOMISI", "", hargaTripleDewasa, "", "", "", "", "", "", "", "", ""],
      ["HARGA DOUBLE DEWASA SETELAH ADA KOMISI", "", hargaDoubleDewasa, "", "", "", "", "", "", "", "", ""]
    );

    data.push(
      [],
      [],
      ["", "PREPARED", "", "", "", "CHECKED", "", "", "", "APPROVED", "", ""],
      [],
      [],
      [],
      ["", "RINALDI MAULANA", "", "", "", "SERUNI B. RAHMA", "", "", "", "H. AGUS SOFIANDI", "", ""]
    );

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Order");
    XLSX.writeFile(wb, `SalesOrder_${namaPaket || 'Draft'}_${tglKeberangkatan || ''}.xlsx`);
  };

  const handleGenerateJPG = async () => {
    if (offeringRef.current) {
      try {
        const canvas = await htmlToImage.toCanvas(offeringRef.current, { 
          pixelRatio: 2,
          backgroundColor: '#FFC000',
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.download = `Offering_${namaPaket || 'Draft'}.jpg`;
        link.href = imgData;
        link.click();
      } catch (error) {
        console.error("Error generating JPG:", error);
        alert("Gagal membuat JPG. Pastikan semua data terisi.");
      }
    }
  };

  const handleGenerateSOPDF = async () => {
    if (tableRef.current) {
      try {
        const tableElement = tableRef.current.querySelector('table');
        if (!tableElement) return;

        const scrollWidth = tableElement.scrollWidth;
        const scrollHeight = tableElement.scrollHeight;
        
        const canvas = await htmlToImage.toCanvas(tableElement, { 
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          width: scrollWidth,
          height: scrollHeight
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        // Calculate PDF dimensions to fit the image
        const pdf = new jsPDF({
          orientation: scrollWidth > scrollHeight ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        pdf.save(`SO_${namaPaket || 'Draft'}.pdf`);
      } catch (error) {
        console.error("Error generating SO PDF:", error);
        alert("Gagal membuat PDF SO. Pastikan semua data terisi.");
      }
    }
  };

  const handleGeneratePDF = async () => {
    if (offeringRef.current) {
      try {
        const canvas = await htmlToImage.toCanvas(offeringRef.current, { 
          pixelRatio: 2,
          backgroundColor: '#FFC000',
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        pdf.save(`Offering_${namaPaket || 'Draft'}.pdf`);
      } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Gagal membuat PDF. Pastikan semua data terisi.");
      }
    }
  };

  const handleSaveToTracker = async () => {
    if (!namaPaket || !tglKeberangkatan) {
      alert("Nama Paket dan Tanggal Keberangkatan harus diisi sebelum menyimpan.");
      return;
    }

    try {
      const timeline_estimasi = generateTimelineEstimasi(tglKeberangkatan);
      await addDoc(collection(db, 'tracker_paket'), {
        namaPaket,
        tanggalBerangkat: tglKeberangkatan,
        targetJamaah: jumlahPax,
        terdaftar: 0,
        status: 'Persiapan',
        timeline_estimasi,
        timeline_actual: {}
      });
      alert("Paket berhasil disimpan ke Tracker!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tracker_paket');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-full overflow-x-auto">
      <AIPromptInput 
        onDataParsed={handleDataParsed} 
        schema={salesOrderSchema} 
        systemInstruction={salesOrderSystemInstruction} 
        placeholder="Ketik prompt di sini (contoh: Buatkan penawaran untuk 40 pax keberangkatan 12 Desember dengan 3 malam di Madinah...)"
        contextData={{
          hotels: hotels.map(h => ({ id: h.id, name: h.name, city: h.city, rating: h.stars })),
          maskapai: maskapaiData.map(m => ({ id: m.id, name: m.name, originCityName: m.originCityName, destinationCityName: m.destinationCityName })),
          handlingSaudi: HANDLING_TIERS,
          transport: transportData.map(t => ({ id: t.id, name: t.name, routes: t.routes.map((r, i) => ({ index: i, route: r.route })) })),
          equipment: equipmentData.map(e => ({ id: e.id, name: e.name })),
          visa: visaData.map(v => ({ id: v.id, paxRange: v.paxRange })),
          airports: umrahAirports,
          handlingDomestik: handlingDomestikData.map(h => ({ id: h.id, item: h.item })),
          manasik: manasikData.map(m => ({ id: m.id, item: m.item })),
          ziarah: ziarahData.map(z => ({ id: z.id, item: z.item })),
          keretaCepat: keretaCepatData.map(k => ({ id: k.id, item: k.item })),
        }}
      />

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Sales Order / Quotation</h2>
          <div className="flex gap-4 items-center">
            <button 
              onClick={handleGenerateJPG}
              className="flex items-center gap-2 bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors text-sm"
              title="Generate Offering JPG"
            >
              <ImageIcon className="w-4 h-4" />
              JPG
            </button>
            <button 
              onClick={handleGenerateSOPDF}
              className="flex items-center gap-2 bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors text-sm"
              title="Download SO PDF"
            >
              <FileText className="w-4 h-4" />
              SO PDF
            </button>
            <button 
              onClick={handleGeneratePDF}
              className="flex items-center gap-2 bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700 transition-colors text-sm"
              title="Generate Offering PDF"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button 
              onClick={handleDownloadExcel}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
            <button 
              onClick={handleSaveTransaction}
              className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm"
              title="Simpan Transaksi untuk Laporan Pendapatan"
            >
              <Save className="w-4 h-4" />
              Simpan Transaksi
            </button>
            <button 
              onClick={handleSaveToTracker}
              className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors text-sm"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Kurs SAR:</label>
              <input type="number" value={kursSaudi} onChange={e => setKursSaudi(Number(e.target.value))} className="border rounded px-2 py-1 w-24 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Kurs USD:</label>
              <input type="number" value={kursUsd} onChange={e => setKursUsd(Number(e.target.value))} className="border rounded px-2 py-1 w-24 text-sm" />
            </div>
          </div>
        </div>

        <div ref={tableRef} className="overflow-x-auto bg-white">
          <table className="w-full text-sm border-collapse min-w-[1200px]">
            <tbody>
              {/* Header Rows */}
              <tr className="bg-gray-100 border-b border-gray-300">
                <td colSpan={2} className="border-r border-gray-300 p-2 font-bold text-center">NAMA PAKET</td>
                <td colSpan={2} className="border-r border-gray-300 p-2">
                  <input type="text" value={namaPaket} onChange={e => setNamaPaket(e.target.value)} className="w-full bg-white border border-gray-300 rounded px-2 py-1" />
                </td>
                <td className="border-r border-gray-300 p-2 font-bold">JUMLAH PAX</td>
                <td className="border-r border-gray-300 p-2 text-center bg-gray-200">
                  <input type="number" value={jumlahPax} onChange={e => setJumlahPax(Number(e.target.value))} className="w-16 bg-white border border-gray-300 rounded px-1 py-1 text-center" />
                </td>
                <td className="border-r border-gray-300 p-2 font-bold text-center">PIC</td>
                <td className="border-r border-gray-300 p-2 text-center">
                  <input type="text" value={pic} onChange={e => setPic(e.target.value)} className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-center" />
                </td>
                <td colSpan={3} className="border-r border-gray-300 p-2 font-bold text-right italic text-gray-600"></td>
                <td className="p-2"></td>
              </tr>
              <tr className="bg-gray-100 border-b border-gray-300">
                <td colSpan={2} className="border-r border-gray-300 p-2 font-bold text-center">TGL DAN BULAN KEBERANGKATAN</td>
                <td colSpan={2} className="border-r border-gray-300 p-2">
                  <input type="date" value={tglKeberangkatan} onChange={e => setTglKeberangkatan(e.target.value)} className="w-full bg-white border border-gray-300 rounded px-2 py-1" />
                </td>
                <td className="border-r border-gray-300 p-2 font-bold">+ TL</td>
                <td className="border-r border-gray-300 p-2 text-center bg-gray-200">
                  <input type="number" value={tl} onChange={e => setTl(Number(e.target.value))} className="w-16 bg-white border border-gray-300 rounded px-1 py-1 text-center" />
                </td>
                <td className="border-r border-gray-300 p-2 font-bold">JENIS PAKET</td>
                <td className="border-r border-gray-300 p-2">
                  <select value={jenisPaket} onChange={e => setJenisPaket(e.target.value)} className="w-full bg-white border border-gray-300 rounded px-2 py-1">
                    <option value="Reguler">Reguler</option>
                    <option value="Plus Wisata">Plus Wisata</option>
                    <option value="Paket L.A.">Paket L.A.</option>
                  </select>
                </td>
                <td colSpan={3} className="border-r border-gray-300 p-2 font-bold text-right italic text-gray-600"></td>
                <td className="p-2"></td>
              </tr>
              <tr className="bg-gray-100 border-b border-gray-300">
                <td colSpan={2} className="border-r border-gray-300 p-2 font-bold text-center">PROGRAM HARI</td>
                <td colSpan={2} className="border-r border-gray-300 p-2">
                  <select value={programHari} onChange={e => setProgramHari(e.target.value)} className="w-full bg-white border border-gray-300 rounded px-2 py-1">
                    <option value="">Pilih Hari</option>
                    {Array.from({ length: 22 }, (_, i) => i + 9).map(day => (
                      <option key={day} value={day}>{day} Hari</option>
                    ))}
                  </select>
                </td>
                <td className="border-r border-gray-300 p-2 font-bold">ROOM</td>
                <td className="border-r border-gray-300 p-2">
                  <input type="text" value={room} onChange={e => setRoom(e.target.value)} className="w-full bg-white border border-gray-300 rounded px-2 py-1" />
                </td>
                <td className="border-r border-gray-300 p-2 font-bold">NAMA TRAVEL</td>
                <td className="border-r border-gray-300 p-2">
                  <input type="text" value={namaTravel} onChange={e => setNamaTravel(e.target.value)} className="w-full bg-white border border-gray-300 rounded px-2 py-1" />
                </td>
                <td colSpan={3} className="border-r border-gray-300 p-2 font-bold text-right italic text-gray-600"></td>
                <td className="p-2"></td>
              </tr>
              <tr className="bg-gray-100 border-b border-gray-400">
                <td colSpan={2} className="border-r border-gray-300 p-2 font-bold text-center">NAMA MITRA</td>
                <td colSpan={2} className="border-r border-gray-300 p-2">
                  <input type="text" value={namaMitra} onChange={e => setNamaMitra(e.target.value)} className="w-full bg-white border border-gray-300 rounded px-2 py-1" />
                </td>
                <td colSpan={2} className="border-r border-gray-300 p-2 font-bold text-center uppercase">Emberkasi</td>
                <td colSpan={2} className="border-r border-gray-300 p-2">
                  <select 
                    value={emberkasi} 
                    onChange={e => setEmberkasi(e.target.value)} 
                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 outline-none"
                  >
                    {umrahAirports.map(airport => (
                      <option key={airport.id} value={airport.name}>{airport.name}</option>
                    ))}
                  </select>
                </td>
                <td colSpan={4} className="border-r border-gray-300 p-2"></td>
              </tr>

              {/* Column Headers */}
              <tr className="bg-gray-200 border-b-2 border-gray-400 font-bold text-center">
                <td className="border-r border-gray-300 p-2 min-w-[400px]">DESK</td>
                <td className="border-r border-gray-300 p-2 w-32">VENDOR</td>
                <td className="border-r border-gray-300 p-2 w-32">HARGA APK</td>
                <td className="border-r border-gray-300 p-2 w-32">HARGA VENDOR</td>
                <td className="border-r border-gray-300 p-2 w-32">EST. MARGIN</td>
                <td className="border-r border-gray-300 p-2 w-20">% MARGIN</td>
                <td className="border-r border-gray-300 p-2 w-20 bg-green-100">JAMAAH BAYAR</td>
                <td className="border-r border-gray-300 p-2 w-32 bg-green-100">TOTAL HRG JUAL</td>
                <td className="border-r border-gray-300 p-2 w-20 bg-green-100">JAMAAH BELI</td>
                <td className="border-r border-gray-300 p-2 w-32 bg-green-100">TOTAL HARGA BELI</td>
                <td className="border-r border-gray-300 p-2 w-32 bg-green-100">TOTAL MARGIN</td>
                <td className="p-2 w-24">REFF.</td>
              </tr>

              {/* Data Rows */}
              <tr className={`border-b border-gray-300 hover:bg-gray-50 ${jenisPaket === 'Paket L.A.' ? 'opacity-50' : ''}`}>
                <td className="border-r border-gray-300 p-2 font-medium italic">
                  <select disabled={jenisPaket === 'Paket L.A.'} value={selectedMaskapai} onChange={e => setSelectedMaskapai(e.target.value)} className="w-full bg-transparent font-medium italic outline-none">
                    <option value="">Pilih Maskapai...</option>
                    {availableMaskapai.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} - {m.programDays} Hari - {m.tanggalKeberangkatan} s/d {m.tanggalKepulangan} 
                        ({m.availableSeats} / {m.totalSeats} Seats)
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-r border-gray-300 p-2 text-center">{maskapaiObj?.namaVendor || ''}</td>
                <td className="border-r border-gray-300 p-2 text-right">
                  <input disabled={jenisPaket === 'Paket L.A.'} type="number" value={effectiveMaskapaiHargaApk} onChange={e => setMaskapaiHargaApk(Number(e.target.value))} className="w-full bg-transparent text-right outline-none" />
                </td>
                <td className="border-r border-gray-300 p-2 text-right">
                  <input disabled={jenisPaket === 'Paket L.A.'} type="number" value={effectiveMaskapaiHargaVendor} onChange={e => setMaskapaiHargaVendor(Number(e.target.value))} className="w-full bg-transparent text-right outline-none" />
                </td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(maskapai.estMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{formatPercent(maskapai.pctMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBayar}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(maskapai.totalHrgJual)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBeli}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(maskapai.totalHargaBeli)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(maskapai.totalMargin)}</td>
                <td className="p-2 text-center text-xs">CONFIRMED</td>
              </tr>
              
              {jenisPaket === 'Plus Wisata' && (
                <tr className="border-b border-gray-300 hover:bg-gray-50">
                  <td className="border-r border-gray-300 p-2 font-medium italic">
                    <input type="text" placeholder="Nama Wisata..." value={namaWisata} onChange={e => setNamaWisata(e.target.value)} className="w-full bg-transparent font-medium italic outline-none" />
                  </td>
                  <td className="border-r border-gray-300 p-2 text-center">-</td>
                  <td className="border-r border-gray-300 p-2 text-right">
                    <input type="number" value={hargaWisataApk} onChange={e => setHargaWisataApk(Number(e.target.value))} className="w-full bg-transparent text-right outline-none" />
                  </td>
                  <td className="border-r border-gray-300 p-2 text-right">
                    <input type="number" value={hargaWisataVendor} onChange={e => setHargaWisataVendor(Number(e.target.value))} className="w-full bg-transparent text-right outline-none" />
                  </td>
                  <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(wisataRow.estMargin)}</td>
                  <td className="border-r border-gray-300 p-2 text-center">{formatPercent(wisataRow.pctMargin)}</td>
                  <td className="border-r border-gray-300 p-2 text-center">{jamaahBayar}</td>
                  <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(wisataRow.totalHrgJual)}</td>
                  <td className="border-r border-gray-300 p-2 text-center">{jamaahBeli}</td>
                  <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(wisataRow.totalHargaBeli)}</td>
                  <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(wisataRow.totalMargin)}</td>
                  <td className="p-2 text-center text-xs">UPDATE</td>
                </tr>
              )}

              <tr className="border-b border-gray-300 hover:bg-gray-50">
                <td className="border-r border-gray-300 p-2 font-medium italic">
                  <div className="flex items-center gap-2">
                    <div className="flex-grow min-w-[250px]">
                      <Select
                        value={
                          availableMadinahHotels.find(h => h.id === selectedHotelMadinah)
                            ? {
                                value: selectedHotelMadinah,
                                label: `HOTEL MADINAH: ${availableMadinahHotels.find(h => h.id === selectedHotelMadinah)?.name} ${availableMadinahHotels.find(h => h.id === selectedHotelMadinah)?.mealPlan} ${availableMadinahHotels.find(h => h.id === selectedHotelMadinah)?.stars ? `- ${availableMadinahHotels.find(h => h.id === selectedHotelMadinah)?.stars} Bintang ` : ''}(${getHotelSeasonRange(availableMadinahHotels.find(h => h.id === selectedHotelMadinah)!, tglKeberangkatan)}) (SAR ${getQuadPrice(availableMadinahHotels.find(h => h.id === selectedHotelMadinah)!, tglKeberangkatan)})`
                              }
                            : null
                        }
                        onChange={(selected: any) => setSelectedHotelMadinah(selected ? selected.value : '')}
                        options={availableMadinahHotels.map(h => ({
                          value: h.id,
                          label: `HOTEL MADINAH: ${h.name} ${h.mealPlan} ${h.stars ? `- ${h.stars} Bintang ` : ''}(${getHotelSeasonRange(h, tglKeberangkatan)}) (SAR ${getQuadPrice(h, tglKeberangkatan)})`
                        }))}
                        styles={customSelectStyles}
                        placeholder="Pilih Hotel Madinah..."
                        isClearable
                      />
                    </div>
                    {selectedHotelMadinah && (
                      <div className="flex items-center gap-1 shrink-0 bg-white border border-gray-300 rounded px-1">
                        <input type="number" value={malamMadinah} onChange={e => setMalamMadinah(Number(e.target.value))} className="w-10 text-center outline-none bg-transparent" min="1" title="Jumlah Malam" />
                        <span className="text-xs text-gray-500 pr-1">Malam</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="border-r border-gray-300 p-2 text-center">{hotelMadinahObj?.vendor || ''}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(hotelMadinahHargaApk)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(hotelMadinahHargaVendor)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(hotelMadinah.estMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{formatPercent(hotelMadinah.pctMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBayar}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(hotelMadinah.totalHrgJual)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBeli}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(hotelMadinah.totalHargaBeli)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(hotelMadinah.totalMargin)}</td>
                <td className="p-2 text-center text-xs">UPDATE RATE</td>
              </tr>

              <tr className="border-b border-gray-300 hover:bg-gray-50">
                <td className="border-r border-gray-300 p-2 font-medium italic">
                  <div className="flex items-center gap-2">
                    <div className="flex-grow min-w-[250px]">
                      <Select
                        value={
                          availableMakkahHotels.find(h => h.id === selectedHotelMakkah)
                            ? {
                                value: selectedHotelMakkah,
                                label: `HOTEL MAKKAH: ${availableMakkahHotels.find(h => h.id === selectedHotelMakkah)?.name} ${availableMakkahHotels.find(h => h.id === selectedHotelMakkah)?.mealPlan} ${availableMakkahHotels.find(h => h.id === selectedHotelMakkah)?.stars ? `- ${availableMakkahHotels.find(h => h.id === selectedHotelMakkah)?.stars} Bintang ` : ''}(${getHotelSeasonRange(availableMakkahHotels.find(h => h.id === selectedHotelMakkah)!, tglKeberangkatan)}) (SAR ${getQuadPrice(availableMakkahHotels.find(h => h.id === selectedHotelMakkah)!, tglKeberangkatan)})`
                              }
                            : null
                        }
                        onChange={(selected: any) => setSelectedHotelMakkah(selected ? selected.value : '')}
                        options={availableMakkahHotels.map(h => ({
                          value: h.id,
                          label: `HOTEL MAKKAH: ${h.name} ${h.mealPlan} ${h.stars ? `- ${h.stars} Bintang ` : ''}(${getHotelSeasonRange(h, tglKeberangkatan)}) (SAR ${getQuadPrice(h, tglKeberangkatan)})`
                        }))}
                        styles={customSelectStyles}
                        placeholder="Pilih Hotel Makkah..."
                        isClearable
                      />
                    </div>
                    {selectedHotelMakkah && (
                      <div className="flex items-center gap-1 shrink-0 bg-white border border-gray-300 rounded px-1">
                        <input type="number" value={malamMakkah} onChange={e => setMalamMakkah(Number(e.target.value))} className="w-10 text-center outline-none bg-transparent" min="1" title="Jumlah Malam" />
                        <span className="text-xs text-gray-500 pr-1">Malam</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="border-r border-gray-300 p-2 text-center">{hotelMakkahObj?.vendor || ''}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(hotelMakkahHargaApk)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(hotelMakkahHargaVendor)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(hotelMakkah.estMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{formatPercent(hotelMakkah.pctMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBayar}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(hotelMakkah.totalHrgJual)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBeli}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(hotelMakkah.totalHargaBeli)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(hotelMakkah.totalMargin)}</td>
                <td className="p-2 text-center text-xs">UPDATE RATE</td>
              </tr>

              <tr className="border-b border-gray-300 hover:bg-gray-50">
                <td className="border-r border-gray-300 p-2 font-medium">
                  <select value={selectedHandling} onChange={e => setSelectedHandling(e.target.value)} className="w-full bg-transparent font-medium outline-none">
                    <option value="">Tanpa Handling</option>
                    {HANDLING_TIERS.map(h => (
                      <option key={h.minPax.toString()} value={h.minPax.toString()}>Handling {h.minPax}-{h.maxPax} Pax</option>
                    ))}
                  </select>
                </td>
                <td className="border-r border-gray-300 p-2 text-center">TFA</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(handlingHargaApk)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(handlingHargaVendor)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(handling.estMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{formatPercent(handling.pctMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBayar}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(handling.totalHrgJual)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBeli}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(handling.totalHargaBeli)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(handling.totalMargin)}</td>
                <td className="p-2 text-center text-xs">UPDATE</td>
              </tr>

              <tr className="border-b border-gray-300 hover:bg-gray-50">
                <td className="border-r border-gray-300 p-2 font-medium">
                  <div className="flex items-center justify-between">
                    <span>Mutawif ({mutawifHari} Hari)</span>
                    <select 
                      value={pakaiMutawif ? "ya" : "tidak"} 
                      onChange={e => setPakaiMutawif(e.target.value === "ya")}
                      className="ml-2 bg-white border border-gray-300 rounded px-1 py-0.5 text-xs"
                    >
                      <option value="ya">Pakai</option>
                      <option value="tidak">Tidak</option>
                    </select>
                  </div>
                </td>
                <td className="border-r border-gray-300 p-2 text-center">TFA</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(mutawifHargaApk)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(mutawifHargaVendor)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(mutawifRow.estMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{formatPercent(mutawifRow.pctMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBayar}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(mutawifRow.totalHrgJual)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBeli}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(mutawifRow.totalHargaBeli)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(mutawifRow.totalMargin)}</td>
                <td className="p-2 text-center text-xs">UPDATE</td>
              </tr>

              <tr className="border-b border-gray-300 hover:bg-gray-50">
                <td className="border-r border-gray-300 p-2 font-medium">
                  <select value={selectedEquipment} onChange={e => setSelectedEquipment(e.target.value)} className="w-full bg-transparent font-medium outline-none">
                    <option value="">Tanpa Perlengkapan</option>
                    {equipmentData.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </td>
                <td className="border-r border-gray-300 p-2 text-center">UMAROH</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(equipmentHargaApk)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(equipmentHargaVendor)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(perlengkapan.estMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{formatPercent(perlengkapan.pctMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBayar}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(perlengkapan.totalHrgJual)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBeli}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(perlengkapan.totalHargaBeli)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(perlengkapan.totalMargin)}</td>
                <td className="p-2 text-center text-xs">GUDANG OK</td>
              </tr>

              <tr className="border-b border-gray-300 hover:bg-gray-50">
                <td className="border-r border-gray-300 p-2 font-medium">
                  <select value={selectedVisa} onChange={e => setSelectedVisa(e.target.value)} className="w-full bg-transparent font-medium outline-none">
                    <option value="">Tanpa Visa</option>
                    {visaData.map(v => (
                      <option key={v.id} value={v.id}>VISA {v.paxRange}</option>
                    ))}
                  </select>
                </td>
                <td className="border-r border-gray-300 p-2 text-center">TFA</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(visaHargaApk)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(visaHargaVendor)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(visaRow.estMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{formatPercent(visaRow.pctMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBayar}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(visaRow.totalHrgJual)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBeli}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(visaRow.totalHargaBeli)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(visaRow.totalMargin)}</td>
                <td className="p-2 text-center text-xs">UPDATE</td>
              </tr>

              <tr className="border-b border-gray-300 hover:bg-gray-50">
                <td className="border-r border-gray-300 p-2 font-medium">
                  <select value={selectedTransport} onChange={e => setSelectedTransport(e.target.value)} className="w-full bg-transparent font-medium outline-none">
                    <option value="none|0">Tanpa Transportasi</option>
                    {transportData.map(t => (
                      <optgroup key={t.id} label={t.name}>
                        {t.routes.map((r, i) => (
                          <option key={`${t.id}-${i}`} value={`${t.id}|${i}`}>
                            {t.name} - {r.route} (SAR {r.price})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </td>
                <td className="border-r border-gray-300 p-2 text-center">{transportObj?.namaVendor || ''}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(transportHargaApk)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(transportHargaVendor)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(transportRow.estMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{formatPercent(transportRow.pctMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBayar}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(transportRow.totalHrgJual)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBeli}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(transportRow.totalHargaBeli)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(transportRow.totalMargin)}</td>
                <td className="p-2 text-center text-xs"></td>
              </tr>

              <tr className="border-b border-gray-300 hover:bg-gray-50">
                <td className="border-r border-gray-300 p-2 font-medium">ASURANSI ZURICH BASIC</td>
                <td className="border-r border-gray-300 p-2 text-center">ZURICH</td>
                <td className="border-r border-gray-300 p-2 text-right">
                  <input type="number" value={asuransiHargaApk} onChange={e => setAsuransiHargaApk(Number(e.target.value))} className="w-full text-right bg-transparent" />
                </td>
                <td className="border-r border-gray-300 p-2 text-right">
                  <input type="number" value={asuransiHargaVendor} onChange={e => setAsuransiHargaVendor(Number(e.target.value))} className="w-full text-right bg-transparent" />
                </td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(asuransi.estMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{formatPercent(asuransi.pctMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBayar}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(asuransi.totalHrgJual)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBeli}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(asuransi.totalHargaBeli)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(asuransi.totalMargin)}</td>
                <td className="p-2 text-center text-xs">UPDATE</td>
              </tr>

              <tr className="border-b border-gray-300 hover:bg-gray-50">
                <td className="border-r border-gray-300 p-2 font-medium">
                  <select value={selectedManasik} onChange={e => setSelectedManasik(e.target.value)} className="w-full bg-transparent font-medium outline-none">
                    <option value="">Tanpa Manasik</option>
                    {manasikData.map(m => (
                      <option key={m.id} value={m.id}>MANASIK {m.item}</option>
                    ))}
                  </select>
                </td>
                <td className="border-r border-gray-300 p-2 text-center"></td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(manasikHargaApk)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(manasikHargaVendor)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(manasik.estMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{formatPercent(manasik.pctMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBayar}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(manasik.totalHrgJual)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBeli}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(manasik.totalHargaBeli)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(manasik.totalMargin)}</td>
                <td className="p-2 text-center text-xs"></td>
              </tr>

              <tr className="border-b border-gray-300 hover:bg-gray-50">
                <td className="border-r border-gray-300 p-2 font-medium">
                  <select value={selectedZiarah} onChange={e => setSelectedZiarah(e.target.value)} className="w-full bg-transparent font-medium outline-none">
                    <option value="">Tanpa Ziarah Tambahan</option>
                    {ziarahData.map(z => (
                      <option key={z.id} value={z.id}>{z.item}</option>
                    ))}
                  </select>
                </td>
                <td className="border-r border-gray-300 p-2 text-center"></td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(ziarahHargaApk)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(ziarahHargaVendor)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(ziarah.estMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{formatPercent(ziarah.pctMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBayar}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(ziarah.totalHrgJual)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBeli}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(ziarah.totalHargaBeli)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(ziarah.totalMargin)}</td>
                <td className="p-2 text-center text-xs"></td>
              </tr>

              <tr className="border-b border-gray-300 hover:bg-gray-50">
                <td className="border-r border-gray-300 p-2 font-medium">
                  <select value={selectedKeretaCepat} onChange={e => setSelectedKeretaCepat(e.target.value)} className="w-full bg-transparent font-medium outline-none">
                    <option value="">Tanpa Kereta Cepat</option>
                    {keretaCepatData.map(k => (
                      <option key={k.id} value={k.id}>{k.item}</option>
                    ))}
                  </select>
                </td>
                <td className="border-r border-gray-300 p-2 text-center"></td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(keretaCepatHargaApk)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(keretaCepatHargaVendor)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(keretaCepat.estMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{formatPercent(keretaCepat.pctMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBayar}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(keretaCepat.totalHrgJual)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBeli}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(keretaCepat.totalHargaBeli)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(keretaCepat.totalMargin)}</td>
                <td className="p-2 text-center text-xs"></td>
              </tr>

              <tr className="border-b border-gray-300 hover:bg-gray-50">
                <td className="border-r border-gray-300 p-2 font-medium">
                  <select value={selectedHandlingDomestik} onChange={e => setSelectedHandlingDomestik(e.target.value)} className="w-full bg-transparent font-medium outline-none">
                    <option value="">Tanpa Handling Domestik</option>
                    {handlingDomestikData.map(h => (
                      <option key={h.id} value={h.id}>{h.item}</option>
                    ))}
                  </select>
                </td>
                <td className="border-r border-gray-300 p-2 text-center">BOWO</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(handlingDomestikHargaApk)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(handlingDomestikHargaVendor)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(handlingDomestik.estMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{formatPercent(handlingDomestik.pctMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBayar}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(handlingDomestik.totalHrgJual)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{jamaahBeli}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(handlingDomestik.totalHargaBeli)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(handlingDomestik.totalMargin)}</td>
                <td className="p-2 text-center text-xs">UPDATE</td>
              </tr>

              <tr className="border-b border-gray-300 bg-[#00A9E0] text-black font-bold">
                <td className="border-r border-gray-300 p-2" colSpan={2}>TOUR LEADER (TL)</td>
                <td className="border-r border-gray-300 p-2 text-right">{tl > 0 ? formatCurrency(tlHargaApk) : ''}</td>
                <td className="border-r border-gray-300 p-2 text-right">{tl > 0 ? 'Rp -' : ''}</td>
                <td className="border-r border-gray-300 p-2 text-right"></td>
                <td className="border-r border-gray-300 p-2 text-center">{tl > 0 ? '0%' : ''}</td>
                <td className="border-r border-gray-300 p-2 text-center">{tl > 0 ? jamaahBayar : ''}</td>
                <td className="border-r border-gray-300 p-2 text-right">{tl > 0 ? formatCurrency(tlRow.totalHrgJual) : ''}</td>
                <td className="border-r border-gray-300 p-2 text-center"></td>
                <td className="border-r border-gray-300 p-2 text-right">{tl > 0 ? 'Rp -' : ''}</td>
                <td className="border-r border-gray-300 p-2 text-right font-black">{tl > 0 ? formatCurrency(tlRow.totalMargin) : ''}</td>
                <td className="p-2"></td>
              </tr>

              <tr className="border-b border-gray-300 bg-yellow-300 font-bold italic text-black">
                <td colSpan={2} className="border-r border-gray-300 p-2 text-center uppercase whitespace-nowrap">Harga Dewasa Sebelum Ada Komisi</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(totalHargaApk)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(totalHargaVendor)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(totalEstMargin)}</td>
                <td className="border-r border-gray-300 p-2 text-center">{formatPercent(totalEstMargin / totalHargaApk)}</td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(totalHrgJual)}</td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(totalHargaBeliAll)}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(totalMarginAll)}</td>
                <td className="p-2"></td>
              </tr>

              <tr className="border-b border-gray-300 hover:bg-gray-50">
                <td colSpan={2} className="border-r border-gray-300 p-2 font-medium">KOMISI MITRA</td>
                <td className="border-r border-gray-300 p-2 text-right">
                  <input type="number" value={komisiMitra} onChange={e => setKomisiMitra(Number(e.target.value))} className="w-full text-right bg-transparent" />
                </td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(komisiMitra * jamaahBayar)}</td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(komisiMitra * jamaahBayar)}</td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="p-2"></td>
              </tr>

              <tr className="border-b border-gray-300 hover:bg-gray-50">
                <td colSpan={2} className="border-r border-gray-300 p-2 font-medium">KOMISI UMAROH</td>
                <td className="border-r border-gray-300 p-2 text-right">
                  {formatCurrency(komisiUmaroh)}
                </td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(komisiUmaroh)}</td>
                <td className="border-r border-gray-300 p-2 text-center bg-yellow-300 font-bold">{formatPercent((totalEstMargin + komisiUmaroh) / (hargaQuadDewasa || 1))}</td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(komisiUmaroh * jamaahBayar)}</td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(komisiUmaroh * jamaahBayar)}</td>
                <td className="p-2"></td>
              </tr>

              <tr className="border-b border-gray-300 bg-yellow-300 font-bold italic text-black">
                <td colSpan={2} className="border-r border-gray-300 p-2 text-center uppercase whitespace-nowrap">Harga Quad Dewasa Setelah Ada Komisi</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(hargaQuadDewasa)}</td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(totalEstMargin + komisiUmaroh)}</td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(totalHrgJual + (komisiMitra * jamaahBayar) + (komisiUmaroh * jamaahBayar))}</td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(totalHargaBeliAll + (komisiMitra * jamaahBayar))}</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(totalMarginAll + (komisiUmaroh * jamaahBayar))}</td>
                <td className="p-2"></td>
              </tr>

              <tr className="border-b border-gray-300 bg-yellow-300 font-bold italic">
                <td colSpan={2} className="border-r border-gray-300 p-2 text-center">HARGA TRIPLE DEWASA SETELAH ADA KOMISI</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(hargaTripleDewasa)}</td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(totalMarginAll + (komisiUmaroh * jamaahBayar))}</td>
                <td className="p-2"></td>
              </tr>

              <tr className="border-b border-gray-300 bg-yellow-300 font-bold italic">
                <td colSpan={2} className="border-r border-gray-300 p-2 text-center">HARGA DOUBLE DEWASA SETELAH ADA KOMISI</td>
                <td className="border-r border-gray-300 p-2 text-right">{formatCurrency(hargaDoubleDewasa)}</td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2"></td>
                <td className="border-r border-gray-300 p-2 text-center">{formatPercent((totalMarginAll + (komisiUmaroh * jamaahBayar)) / (totalHrgJual + (komisiMitra * jamaahBayar) + (komisiUmaroh * jamaahBayar)))}</td>
                <td className="p-2"></td>
              </tr>

              {/* Signature Section */}
              <tr>
                <td colSpan={12} className="h-12"></td>
              </tr>
              <tr className="text-center font-bold">
                <td colSpan={4} className="p-2">PREPARED</td>
                <td colSpan={4} className="p-2">CHECKED</td>
                <td colSpan={4} className="p-2">APPROVED</td>
              </tr>
              <tr>
                <td colSpan={4} className="h-24"></td>
                <td colSpan={4} className="h-24"></td>
                <td colSpan={4} className="h-24"></td>
              </tr>
              <tr className="text-center font-bold uppercase">
                <td colSpan={4} className="p-2">RINALDI MAULANA</td>
                <td colSpan={4} className="p-2">SERUNI B. RAHMA</td>
                <td colSpan={4} className="p-2">H. AGUS SOFIANDI</td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Offering Template for Capture */}
      <div className="absolute -left-[9999px] top-0">
        <OfferingTemplate 
          ref={offeringRef}
          namaPaket={namaPaket}
          namaTravel={namaTravel}
          namaMitra={namaMitra}
          emberkasi={emberkasi}
          tglKeberangkatan={tglKeberangkatan}
          programHari={programHari}
          jumlahPax={jumlahPax}
          tl={tl}
          hotelMadinah={hotelMadinahObj?.name || '-'}
          hotelMakkah={hotelMakkahObj?.name || '-'}
          mealPlanMadinah={hotelMadinahObj?.mealPlan}
          mealPlanMakkah={hotelMakkahObj?.mealPlan}
          maskapai={maskapaiObj?.name || '-'}
          hargaQuad={hargaQuadDewasa}
          hargaTriple={hargaTripleDewasa}
          hargaDouble={hargaDoubleDewasa}
          maskapaiHarga={effectiveMaskapaiHargaApk}
          hotelMadinahHarga={hotelMadinahHargaApk}
          hotelMakkahHarga={hotelMakkahHargaApk}
          handlingSaudiHarga={handlingHargaApk}
          visaHarga={visaHargaApk}
          transportHarga={transportHargaApk}
          asuransiHarga={asuransiHargaApk}
          handlingDomestikHarga={handlingDomestikHargaApk}
          perlengkapanHarga={equipmentHargaApk}
          tlHarga={tlHargaApk}
          wisataHarga={jenisPaket === 'Plus Wisata' ? hargaWisataApk : undefined}
          namaWisata={namaWisata}
          manasikHarga={manasikHargaApk}
          ziarahHarga={ziarahHargaApk}
          mutawwifHarga={mutawifHargaApk}
          keretaCepatHarga={keretaCepatHargaApk}
          hargaDewasaSebelumKomisi={totalHargaApk}
          komisiMitra={komisiMitra}
          komisiUmaroh={komisiUmaroh}
        />
      </div>
    </div>
  );
};
