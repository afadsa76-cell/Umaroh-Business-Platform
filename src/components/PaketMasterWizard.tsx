import React, { useState, useEffect, useMemo } from "react";
import { isDateInRange } from "../utils/dateUtils";
import {
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Check,
  Search,
  Building2,
  MapPin,
  Star,
  Calendar,
  Minus,
  Plus,
  User,
  FileText,
  Bus,
  Shield,
  BookOpen,
  Home,
  Map,
  Train,
  Users,
  UserCheck,
  Receipt,
  Banknote,
  Download,
  Sparkles,
  Layers,
  ImagePlus,
  Lock,
  Globe,
  ArrowRightLeft,
  MessageCircle,
  Plane,
  PlaneTakeoff,
  ListCheck,
  ArrowRight,
  X,
  Briefcase,
  ShoppingBag,
  Shirt,
  AlertCircle,
} from "lucide-react";
import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  doc,
  onSnapshot,
  db,
  handleFirestoreError,
  OperationType,
} from "../firebase";
import { generateWALink, openWhatsApp } from "../utils/whatsapp";
import { hotels } from "../data/hotels";
import { equipmentData } from "../data/equipment";
import { handlingDomestikData } from "../data/handlingDomestik";
import { visaData } from "../data/visa";
import { keretaCepatData } from "../data/keretaCepat";
import { manasikData } from "../data/manasik";
import { ziarahData } from "../data/ziarah";
import { HANDLING_TIERS, HANDLING_CONSTANTS } from "../data/handlingSaudi";
import { transportData } from "../data/transport";

import { AIResultModal } from "./AIResultModal";
import { generateItinerary, generateMarketingCopy } from "../services/aiService";
import { sanitizeForHtml2Canvas, captureToDataUrl } from "../utils/exportUtils";
import { Capacitor } from '@capacitor/core';
import html2pdf from 'html2pdf.js';
import { INDONESIA_EMBARKASI, KATEGORI_PROGRAM } from '../constants';

import {
  Maskapai,
  WizardHotel,
  Layanan,
  LayananOption,
  Bandara,
  PaketWisata,
  WizardFormData,
  VisaData
} from "../types";

interface PaketMasterWizardProps {
  initialData?: Partial<WizardFormData> & { id?: string; paketMasterId?: string; namaPaketMitra?: string };
  isMitraContext?: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const getSteps = (kategori: string) => {
  if (kategori === "WISATA HALAL") {
    return [
      "INFORMASI DASAR",
      "PILIH PAKET WISATA",
      "DETAIL INFO",
      "LAYANAN TAMBAHAN",
      "REVIEW FASILITAS",
      "RINGKASAN HARGA",
      "VALIDASI AKHIR",
    ];
  }
  if (kategori === "UMRAH PLUS") {
    return [
      "INFORMASI DASAR",
      "MASKAPAI",
      "HOTEL WISATA",
      "HOTEL UMRAH",
      "LAYANAN",
      "HARGA & REVIEW",
      "REVIEW FASILITAS",
      "PUBLIKASI & DESKRIPSI",
      "VALIDASI AKHIR",
    ];
  }
  if (kategori === "UMRAH LA") {
    return [
      "INFORMASI DASAR",
      "INFO LAND ARRANGEMENT",
      "HOTEL",
      "LAYANAN",
      "HARGA & REVIEW",
      "REVIEW FASILITAS",
      "PUBLIKASI & DESKRIPSI",
      "VALIDASI AKHIR",
    ];
  }
  return [
    "INFORMASI DASAR",
    "MASKAPAI",
    "HOTEL",
    "LAYANAN",
    "HARGA & REVIEW",
    "REVIEW FASILITAS",
    "PUBLIKASI & DESKRIPSI",
    "VALIDASI AKHIR",
  ];
};

const WISATA_OPTIONS = [
  {
    category: "MAKKAH",
    items: ["City Tour Makkah", "Jabal Nur", "Jabal Tsur", "Museum Makkah"],
  },
  {
    category: "MADINAH",
    items: [
      "City Tour Madinah",
      "Jabal Uhud",
      "Masjid Quba",
      "Kebun Kurma",
      "Percetakan Al-Quran",
    ],
  },
];

const getHotelImage = (id: string, nama?: string, kota?: string) => {
  // Try to match by name (case insensitive, removing spaces/dashes)
  const normalizedName = (nama || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  // Create a reverse lookup dictionary based on slug-like keys
  // This allows us to match even if the ID is a random Firebase string
  const customHotelImagesRaw: Record<string, string> = {
    daraleimanalharamdiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/192664537.jpg?k=db1de05ffc3ec1e89ce24b0de5eb4d8eeef24a1b55979f64db58cf1ce24f11fd&o=&hp=1",
    millenniumalaqeeqdiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/43360875.jpg?k=3ce9ab0d5ab9bf8bdc6d32fe5a7aee3bda1a6c11fcbae7326da35154316a3bc9&o=&hp=1",
    almarwarotanadiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/33054199.jpg?k=b42023d8c117e3f89fd925904593f6310243be44fbb7dc3f837bd636bc40b3ff&o=&hp=1",
    movenpickhajardiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/15646194.jpg?k=8050e68f3aedeaddfdedb1d5be7fa6a77d1ca45cfec60b0ba5232ee34d168541&o=&hp=1",
    safwatowerdiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/119933583.jpg?k=7f88dafaecddf0ba722428584dc74c2fa5727beaa5c317fdb0e729a433f48a60&o=&hp=1",
    alharithiadiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/25078563.jpg?k=b4fffc6b943dcd3e125ab9afb53db9aef299a416a2202b8dff28eff40f090538&o=&hp=1",
    taibafrontdiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/388481309.jpg?k=b7dc66ad0f531d0fe539de5d57b1029ba7d9bc26322ad1ebfb6cce1fd4585db5&o=&hp=1",
    shazaregencydiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/226027376.jpg?k=9882aee6587394aaee1be008c2a3e0fec7dcb6ab7c2e09dd78b2d1844bdfeb09&o=&hp=1",
    ruvediar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/204229641.jpg?k=8bc78ed4d4850de485c2763f35dc2b0be8a1ea522ed1a8ec902c114cb3d1bc8d&o=&hp=1",
    makkahtowershoteldiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/281140026.jpg?k=cf6a65520a40f80695029e0758dd0624bbdafd1ba82be3c90e8c8959eb4e5e48&o=&hp=1",
    makkahtowersownerdiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/281139414.jpg?k=42f46eab0f279be78171d9894e1d533ce1d3f9af479c3b879ecaa58826d9e1f5&o=&hp=1",
    azkaalsafadiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/88746738.jpg?k=66a3d9b0ca5c81de4fbc40d6c5c0d2df5eafe69528fbbcc053b841cd0b2401f8&o=&hp=1",
    azkaalmaqamdiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/193245229.jpg?k=6cb43c9ba8b8c2be4171dc82c5f1c5f3e9c5225bfeb1e27a1bfe12bbbb8def9e&o=&hp=1",
    grandalmassadiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/172230623.jpg?k=b4d8d172ae3755cfccb5dc2bd2d5345a909ac4ce726055d78ba7a54460fba4bf&o=&hp=1",
    grandplazaalmadinahdiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/388485121.jpg?k=75e630cc2f168f0efd927a3ed17d727b140cc5367611a2f6fb3fbb959a72dfc4&o=&hp=1",
    winnerinnalkhairdiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/498863618.jpg?k=e1d6d871e4ccfe1fc56a42a033c4f74d0d08c5c7d0a7a0300dedde0cb27d3c0e&o=&hp=1",
    alansargoldentulipdiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/223788057.jpg?k=69d7c0f13f1ba5e022f462bb9def0fc78bceaf776b26d83bb3aaac7de1ddc1fa&o=&hp=1",
    deyaraleimandiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/119934579.jpg?k=ae3d3b76cf515433144171adfb4db7ce8544e3d36b282ea8dc844bbcf3eb79e7&o=&hp=1",
    durrataleimandiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/24719036.jpg?k=7f3747ebc6a1e948ff11e5f5f4c52f6fbfb83d1c1a01103f56ceb2e6988891cf&o=&hp=1",
    maysanalmashaerdiar:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/291689252.jpg?k=cf9b441a140f0c0ae16538c64227c81d3976cd8d207dfbc52140810db68e64c3&o=&hp=1",
  };

  // Find by partial string matching against the hotel name + vendor
  const matchingKey = Object.keys(customHotelImagesRaw).find((key) =>
    normalizedName.includes(key.replace("diar", "")),
  );

  if (matchingKey) {
    return customHotelImagesRaw[matchingKey];
  }

  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const makkahImages = [
    "https://images.unsplash.com/photo-1565552643983-6597af594348?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1591814603953-294bdfc919d3?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1580418827464-3b2d184eb4ed?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1604169727725-709de7d4fb77?auto=format&fit=crop&w=800&q=80",
  ];

  const madinahImages = [
    "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1565561085289-54fb296adff4?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1584347713837-14238eeb59be?auto=format&fit=crop&w=800&q=80",
  ];

  const wisataImages = [
    "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1526392060635-9d60198810b7?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1541432901042-2d8bd64b4e9c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1577931818228-56f8f74a0aa2?auto=format&fit=crop&w=800&q=80",
  ];

  if (kota?.toLowerCase() === "makkah") {
    return makkahImages[hash % makkahImages.length];
  } else if (kota?.toLowerCase() === "madinah") {
    return madinahImages[hash % madinahImages.length];
  } else {
    return wisataImages[hash % wisataImages.length];
  }
};

export const PaketMasterWizard: React.FC<PaketMasterWizardProps> = ({
  initialData,
  isMitraContext = false,
  onCancel,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [hotelStep, setHotelStep] = useState<"madinah" | "makkah">("madinah");
  const [maskapaiList, setMaskapaiList] = useState<Maskapai[]>([]);
  const [hotelsList, setHotelsList] = useState<WizardHotel[]>([]);
  const [dbLayananList, setDbLayananList] = useState<Layanan[]>([]);
  const [bandaraList, setBandaraList] = useState<Bandara[]>([]);
  const [paketWisataList, setPaketWisataList] = useState<PaketWisata[]>([]);

  const [aiResult, setAiResult] = useState<{ title: string; content: string } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const pdfExportRef = React.useRef<HTMLDivElement>(null);

  const parseNum = (val: string | number | undefined, def = 0): number => {
    const n = Number(val);
    return isNaN(n) ? def : n;
  };

  const defaultData: WizardFormData = {
    kategori: "UMRAH REGULAR",
    nama: "",
    periode: "",
    durasiHari: 9,
    durasiWisata: 2,
    negaraWisata: "TURKEY",
    alurPerjalanan: "WISATA TERLEBIH DAHULU",
    kotaKeberangkatan: "",
    kotaTujuan: "",
    urutanKunjungan: "",
    tglBerangkat: "",
    tglKepulangan: "",
    targetJamaah: 45,
    preferredDepartureDate: "",
    maskapaiId: "",
    hargaDasar: 0,
    deskripsi: "",
    tipePublikasi: "B2C (PUBLIC)",
    tipePenjualan: "INDIVIDUAL",
    photoUtama: null,
    tipePenerbangan: "DIRECT",
    kelasPenerbangan: "Ekonomi",
    estimasiHargaMaskapai: 0,
    hotelMadinahId: "",
    chkInMadinah: "",
    durasiMadinah: 3,
    chkOutMadinah: "",
    hotelMakkahId: "",
    chkInMakkah: "",
    durasiMakkah: 4,
    chkOutMakkah: "",
    hotelWisataId: "",
    selectedLayanan: [],
    selectedWisata: [],
    marginBersih: 1000000,
    ujrohPartner: 0,
    markup: 1000000,
  };

  const [formData, setFormData] = useState<WizardFormData>(() => {
    const base = {
      ...defaultData,
      ...(initialData as WizardFormData || {}),
    };
    if (base.tglBerangkat && !base.preferredDepartureDate) {
      base.preferredDepartureDate = base.tglBerangkat;
    }
    return base;
  });

  // Filter maskapai
  const filteredMaskapaiList = useMemo(() => {
    let list = maskapaiList;
    
    // Auto-filter by Tipe Penerbangan (DIRECT/TRANSIT)
    if (formData.tipePenerbangan) {
      list = list.filter((m) => {
        // If explicitly set in DB property, use it
        if (m.tipePenerbangan) return m.tipePenerbangan === formData.tipePenerbangan;
        
        const name = (m.name || "").toUpperCase();
        
        // 1. BRAND-BASED IDENTIFICATION
        // Direct Carriers (Indonesia to KSA)
        const directAirlines = ["GARUDA", "SAUDI", "SAUDIA", "LION", "BATIK", "PELITA", "AIRFAST", "JT", "ID", "GA", "SV"];
        // Transit Carriers (Hub outside KSA)
        const transitAirlines = [
          "EMIRATES", "EK", "QATAR", "QR", "TURKISH", "TK", "INDIGO", "6E", "OMAN", "WY", 
          "ETIHAD", "EY", "SINGAPORE", "SQ", "MALAYSIA", "MH", "SCOOT", "TR", "GULF", "GF",
          "AIRASIA", "AK", "QZ", "AIR ARABIA", "G9", "KUWAIT", "KU", "Flynas", "XY",
          "SRILANKAN", "UL", "CATHAY", "CX", "THAI", "TG", "EVA", "BR", "PHILIPPINE", "PR",
          "EGYPTAIR", "MS", "JAL", "JL", "ANA", "NH", "IBERIA", "ETHIOPIAN"
        ];
        
        const isKnownDirect = directAirlines.some(brand => {
          // Check for full word or common code surrounded by non-word chars
          const regex = new RegExp(`\\b${brand}\\b`, 'i');
          return regex.test(name);
        });
        
        const isKnownTransit = transitAirlines.some(brand => {
          const regex = new RegExp(`\\b${brand}\\b`, 'i');
          return regex.test(name);
        });

        // 2. ROUTE-BASED HEURISTIC (Fallback/Verification)
        const transitHubs = ["BOM", "DXB", "KUL", "SIN", "AUH", "IST", "DOH", "MCT", "KWI", "SHJ", "BAH", "AMM", "LHR", "AMS", "CDG", "BKK", "HKG", "TPE", "MNL", "ADD", "CAI"];
        const saudiCodes = ["JED", "MED", "RUH", "DMM", "ELQ", "HAS"];
        
        const codes = name.match(/[A-Z]{3}/g) || [];
        // A flight is transit if it has a stop in a known transit hub OR 
        // if it has more than 2 codes where the middle codes are not Saudi codes.
        const hasTransitHub = transitHubs.some(hub => name.includes(hub));
        const hasMiddleOutsideStop = codes.length > 2 && codes.slice(1, -1).some(code => !saudiCodes.includes(code));
        
        let isTransit = isKnownTransit || hasTransitHub || hasMiddleOutsideStop || name.includes("VIA") || name.includes("STOP");
        
        // Priority: Known Direct brands override general transit heuristics (e.g. Garuda via MED is still Direct)
        if (isKnownDirect) isTransit = false;

        if (formData.tipePenerbangan === "TRANSIT") return isTransit;
        if (formData.tipePenerbangan === "DIRECT") return !isTransit;
        return true;
      });
    }

    // NEW: Filter by Departure City Hub (CGK, SUB, etc.)
    if (formData.kotaKeberangkatan) {
      const origin = formData.kotaKeberangkatan.toUpperCase();
      const targetMatch = origin.match(/\(([A-Z]{3})\)/);
      const targetCode = targetMatch ? targetMatch[1] : null;

      if (targetCode) {
        list = list.filter((m) => {
          const name = (m.name || "").toUpperCase();
          const rute = (m.ruteLabel || "").toUpperCase();
          const searchSample = `${name} ${rute}`.replace(/\s+/g, ' ');
          
          // 1. Identify common Indonesian Hubs
          const indoHubs = INDONESIA_EMBARKASI.map(e => e.kode);
          const saudiHubs = ["JED", "MED", "RUH", "DMM", "ELQ", "HAS"];

          // If user picked a Saudi city as departure (e.g. Madinah - Jeddah city trip), block all Indonesian packages
          if (saudiHubs.includes(targetCode)) return false;

          // Exclusion: If I chose SUB, I MUST NOT see CGK-JED, KNO-JED, etc.
          const otherIndoHubs = indoHubs.filter(h => h !== targetCode);
          const hasOtherIndoHubStart = otherIndoHubs.some(oh => 
            searchSample.includes(`${oh}-`) || 
            searchSample.includes(`${oh} -`) ||
            searchSample.startsWith(oh)
          );

          if (hasOtherIndoHubStart) return false;

          // Inclusion: If a route pattern is detected, it MUST start with my targetCode
          const routeMatch = searchSample.match(/\b([A-Z]{3})\s?-\s?[A-Z]{3}\b/);
          if (routeMatch) {
            const detectedOrigin = routeMatch[1];
            if (indoHubs.includes(detectedOrigin) && detectedOrigin !== targetCode) {
              return false;
            }
          }

          // Force presence of the target code in the flight label
          if (!searchSample.includes(targetCode)) return false;

          return true;
        });
      }
    }

    // NEW: Filter by Destination City Hub (Jeddah First vs Madinah First)
    if (formData.kotaTujuan) {
      const dest = formData.kotaTujuan.toUpperCase();
      list = list.filter((m) => {
        const name = (m.name || "").toUpperCase();
        const rute = (m.ruteLabel || "").toUpperCase();
        const searchSample = `${name} ${rute}`;
        
        // Precise Airport Code Extraction (exclude common non-airport 3-letter strings)
        const codesMatch = searchSample.match(/\b[A-Z]{3}\b/g) || [];
        const excludeWords = ["AIR", "BIG", "PNR", "VIP", "MAX", "VIA", "BOE", "BUS", "LCC"];
        const airportCodes = codesMatch.filter(code => !excludeWords.includes(code));
        
        const saudiCodes = ["JED", "MED", "RUH", "DMM", "ELQ", "HAS"];
        // The "Destination First" is the FIRST time the plane touches Saudi ground
        const firstSaudiArrival = airportCodes.find(code => saudiCodes.includes(code));
        
        if (dest.includes("JEDDAH") || dest === "JED") {
           return firstSaudiArrival === "JED";
        }
        if (dest.includes("MADINAH") || dest === "MED") {
           return firstSaudiArrival === "MED";
        }
        return true;
      });
    }

    if (formData.durasiHari) {
      list = list.filter(
        (m) =>
          !m.programDays ||
          Number(m.programDays) === Number(formData.durasiHari),
      );
    }
    const anchorDate = formData.preferredDepartureDate || formData.tglBerangkat;
    if (!anchorDate) return list;
    const baseDate = new Date(anchorDate);
    if (isNaN(baseDate.getTime())) return list;
    
    // Use a window around the anchor date to keep the results stable.
    // This prevents results from disappearing if tglBerangkat updates.
    const minDate = new Date(baseDate);
    minDate.setDate(minDate.getDate() - 7); // 1 week before anchor
    const maxDate = new Date(baseDate);
    maxDate.setDate(maxDate.getDate() + 37); // ~5 weeks after anchor

    return list.filter((m) => {
      if (!m.tanggalKeberangkatan) return false;
      const mDate = new Date(m.tanggalKeberangkatan);
      if (isNaN(mDate.getTime())) return false;
      return mDate >= minDate && mDate <= maxDate;
    });
  }, [
    maskapaiList, 
    formData.tglBerangkat, 
    formData.preferredDepartureDate, 
    formData.durasiHari, 
    formData.tipePenerbangan, 
    formData.kotaKeberangkatan, 
    formData.kotaTujuan
  ]);

  // Reset selected maskapai if it's filtered out
  useEffect(() => {
    if (formData.maskapaiId) {
      const isValid = filteredMaskapaiList.some(m => m.id === formData.maskapaiId);
      if (!isValid) {
        setFormData(prev => ({
          ...prev,
          maskapaiId: '',
          maskapaiLabel: '',
          estimasiHargaMaskapai: 0
        }));
      }
    }
  }, [formData.tipePenerbangan, formData.kotaTujuan, formData.kotaKeberangkatan, filteredMaskapaiList, formData.maskapaiId]);

  // Synchronize Hotel Dates based on tglBerangkat and durations
  useEffect(() => {
    if (!formData.tglBerangkat) return;
    try {
      const baseDate = new Date(formData.tglBerangkat);
      if (isNaN(baseDate.getTime())) return;

      const inMadinah = formData.tglBerangkat;
      const outMadinahDate = new Date(baseDate);
      outMadinahDate.setDate(
        outMadinahDate.getDate() + (formData.durasiMadinah || 3),
      );
      const outMadinah = outMadinahDate.toISOString().split("T")[0];

      const inMakkah = outMadinah;
      const outMakkahDate = new Date(outMadinahDate);
      outMakkahDate.setDate(
        outMakkahDate.getDate() + (formData.durasiMakkah || 4),
      );
      const outMakkah = outMakkahDate.toISOString().split("T")[0];

      if (
        formData.chkInMadinah !== inMadinah ||
        formData.chkOutMadinah !== outMadinah ||
        formData.chkInMakkah !== inMakkah ||
        formData.chkOutMakkah !== outMakkah
      ) {
        setFormData((prev) => ({
          ...prev,
          chkInMadinah: inMadinah,
          chkOutMadinah: outMadinah,
          chkInMakkah: inMakkah,
          chkOutMakkah: outMakkah,
        }));
      }
    } catch {
      // Ignore parsing errors
    }
  }, [formData.tglBerangkat, formData.durasiMadinah, formData.durasiMakkah]);

  const [isSaving, setIsSaving] = useState(false);
  const [hotelSearchTerm, setHotelSearchTerm] = useState("");
  const [hotelFilterBintang, setHotelFilterBintang] = useState("ALL");
  const [hotelPage, setHotelPage] = useState(1);

  const targetJamaah = Number(formData.targetJamaah) || 35;
  const durasiHari = Number(formData.durasiHari) || 9;
  const maskapaiPrice = Number(formData.estimasiHargaMaskapai) || 0;

  let hQuadMakkah = 0,
    hQuadMadinah = 0;
  if (formData.hotelMakkahId) {
    const m = hotelsList.find((h) => h.id === formData.hotelMakkahId);
    if (m) hQuadMakkah = (m.priceQuad || 0) * (formData.durasiMakkah || 4);
  }
  if (formData.hotelMadinahId) {
    const m = hotelsList.find((h) => h.id === formData.hotelMadinahId);
    if (m) hQuadMadinah = (m.priceQuad || 0) * (formData.durasiMadinah || 3);
  }
  const baseBelanja = maskapaiPrice + hQuadMakkah + hQuadMadinah;
  const tourLeaderPrice =
    targetJamaah > 0 ? Math.round(baseBelanja / targetJamaah) : 0;

  const vData: VisaData = (targetJamaah <= 34 
    ? (visaData.find((v) => v.paxRange === "1-34 PAX") || visaData[0])
    : (visaData.find((v) => v.paxRange === "35-55 PAX") || visaData[1])) || visaData[0];
    
  const visaPrice = vData.sellingPrice || 0;
  const visaName = `Visa Umrah (${vData.paxRange || (targetJamaah <= 34 ? "1-34 PAX" : "35-55 PAX")})`;

  const saudiTier = HANDLING_TIERS.find(
    (t) => targetJamaah >= t.minPax && targetJamaah <= t.maxPax,
  ) ||
    HANDLING_TIERS[HANDLING_TIERS.length - 1] || { hpp: 43 };
  const saudiHppUsd = saudiTier.hpp;
  const saudiSell = Math.round(
    (saudiHppUsd + HANDLING_CONSTANTS.adminFee) *
      HANDLING_CONSTANTS.defaultKurs *
      (1 + HANDLING_CONSTANTS.defaultMarginPercent / 100),
  );

  const isGroupPax = targetJamaah >= 35;
  const transportOptions = [
    { id: "trans_satria", label: "Satria", sar: 3900 },
    { id: "trans_hiace", label: "Hiace", sar: 3750 },
    { id: "trans_gmc", label: "GMC", sar: 4250 },
    { id: "trans_bus", label: "BUS", sar: 2600 },
  ].map((opt) => ({
    id: opt.id,
    label: `${opt.label} Full Trip`,
    price: targetJamaah > 0 ? Math.round(((opt.sar * 4700) / targetJamaah) * 1.4) : 0,
  }));

  const mutawwifDays = Math.max(1, durasiHari - 1);
  const mutawwifPrice =
    targetJamaah > 0
      ? Math.round(((300 * 4700 * mutawwifDays) / targetJamaah) * 1.8)
      : 0;

  const ziarahOptions = ziarahData.map((item) => {
    const margin = 0.2;
    const computedPrice =
      targetJamaah > 0
        ? Math.round(((item.hargaAsing * 4700) / targetJamaah) * (1 + margin))
        : 0;
    return {
      id: `ziarah_${item.id}`,
      label: `${item.item} (${item.hargaAsing} SAR / ${targetJamaah} Pax)`,
      price: computedPrice,
    };
  });

  // Filter out db items that might overlap with our auto-generated ones by name
  const staticNameKeywords = [
    "handling domestik",
    "perlengkapan",
    "visa",
    "tour leader",
    "asuransi",
    "handling saudi",
    "transportasi",
    "mutawwif",
    "muthawif",
    "muthawwif",
    "kereta cepat",
    "manasik",
    "ziarah",
    "wisata",
  ];

  const filteredDbLayananList = dbLayananList.filter((item) => {
    const dbName = (item.nama || "").toLowerCase();
    // Only keep it if it does NOT match any of the static keywords
    return !staticNameKeywords.some((keyword) => dbName.includes(keyword));
  });

  const layananList = [
    ...filteredDbLayananList,
    {
      id: "group_hdomestik",
      nama: "Handling Domestik",
      deskripsi: "Layanan Elevasi Bandara & Lounge Keberangkatan",
      isGroup: true,
      options: handlingDomestikData.map((item) => ({
        id: `hdomestik_${item.id}`,
        label: item.item,
        price: item.hargaJual,
      })),
    },
    {
      id: "group_equip",
      nama: "Perlengkapan",
      deskripsi: "Perlindungan Jamaah & Paket Travel Kit",
      isGroup: true,
      options: equipmentData.map((item) => ({
        id: `equip_${item.id}`,
        label: item.name,
        price: item.roundedPrice,
      })),
    },
    {
      id: "visa_auto",
      nama: visaName,
      deskripsi: `Layanan Pengurusan Dokumen Keimigrasian (${targetJamaah} Pax)`,
      harga: visaPrice,
    },
    {
      id: "asuransi",
      nama: "Asuransi",
      deskripsi: "Asuransi Perjalanan Umrah & Kesehatan",
      harga: 65000,
    },
    {
      id: "hsaudi_auto",
      nama: `Handling Saudi`,
      deskripsi: `Kedatangan & Keberangkatan`,
      harga: saudiSell,
    },
    isGroupPax ? {
      id: "transportasi_auto",
      nama: `Transportasi Bus`,
      deskripsi: `Biaya Transportasi (Gratis/Included for 35-55 Pax)`,
      harga: 0,
    } : {
      id: "group_transport",
      nama: "Transportasi",
      deskripsi: `Pilihan Kendaraan Full Trip (${targetJamaah} Pax)`,
      isGroup: true,
      options: transportOptions,
    },
    {
      id: "mutawwif_auto",
      nama: `Mutawwif (${mutawwifDays} Hari)`,
      deskripsi: `Pemandu Ibadah Selama Program`,
      harga: mutawwifPrice,
    },
    {
      id: "group_kereta",
      nama: "Kereta Cepat",
      deskripsi: "Layanan Transportasi Kereta Cepat Haramain",
      isGroup: true,
      options: keretaCepatData.map((item) => ({
        id: `kc_${item.id}`,
        label: item.item,
        price: item.hargaJual,
      })),
    },
    {
      id: "group_manasik",
      nama: "Manasik",
      deskripsi: "Bimbingan Ibadah Umrah Offline/Online",
      isGroup: true,
      options: manasikData.map((item) => ({
        id: `manasik_${item.id}`,
        label: `Manasik ${item.item}`,
        price: item.hargaJual,
      })),
    },
    {
      id: "group_ziarah",
      nama: "Ziarah Tambahan",
      deskripsi: `Pilihan Ziarah`,
      isGroup: true,
      options: ziarahOptions,
    },
    {
      id: "tour_leader",
      nama: "Tour Leader",
      deskripsi: "Biaya Subsidi Tour Leader (Pembagian Beli / Pax)",
      harga: tourLeaderPrice,
    },
  ];

  const getHotelPriceDynamic = (hotel: WizardHotel | undefined, dateStr: string, roomType: 'Quad' | 'Triple' | 'Double') => {
    if (!hotel || !dateStr) return 0;
    if (!hotel.seasons || hotel.seasons.length === 0) return 0;
    
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return 0;
    
    let season = hotel.seasons.find((s) => isDateInRange(dateObj, s.range));
    
    // Fallback: If no season found, use the first season
    if (!season && hotel.seasons.length > 0) {
      season = hotel.seasons[0];
    }
    
    if (!season) return 0;
    
    const priceEntry = season.prices.find((p) => p.roomType === roomType);
    if (!priceEntry) return 0;
    
    const kurs = 4700; // Use a standard kurs or from state if available
    const margin = 1.1;
    let divisor = 1;
    if (roomType === 'Quad') divisor = 4;
    else if (roomType === 'Triple') divisor = 3;
    else if (roomType === 'Double') divisor = 2;
    
    return ((priceEntry.price * kurs) / divisor) * margin;
  };

  const pricingSummary = useMemo(() => {
    const maskapaiPrice = Number(formData.estimasiHargaMaskapai) || 0;

    const hMadinah = hotelsList.find((h) => h.id === formData.hotelMadinahId);
    const hMakkah = hotelsList.find((h) => h.id === formData.hotelMakkahId);
    const hWisata = hotelsList.find((h) => h.id === formData.hotelWisataId);

    const tglCheckInMadinah = formData.chkInMadinah || formData.tglBerangkat;
    const tglCheckInMakkah = formData.chkInMakkah || formData.tglBerangkat;

    const priceQuadMadinah = getHotelPriceDynamic(hMadinah, tglCheckInMadinah, 'Quad');
    const priceQuadMakkah = getHotelPriceDynamic(hMakkah, tglCheckInMakkah, 'Quad');
    const priceTripleMadinah = getHotelPriceDynamic(hMadinah, tglCheckInMadinah, 'Triple');
    const priceTripleMakkah = getHotelPriceDynamic(hMakkah, tglCheckInMakkah, 'Triple');
    const priceDoubleMadinah = getHotelPriceDynamic(hMadinah, tglCheckInMadinah, 'Double');
    const priceDoubleMakkah = getHotelPriceDynamic(hMakkah, tglCheckInMakkah, 'Double');

    const hQuadMadinah = priceQuadMadinah * parseNum(formData.durasiMadinah, 3);
    const hQuadMakkah = priceQuadMakkah * parseNum(formData.durasiMakkah, 4);
    const hTripleMadinah = priceTripleMadinah * parseNum(formData.durasiMadinah, 3);
    const hTripleMakkah = priceTripleMakkah * parseNum(formData.durasiMakkah, 4);
    const hDoubleMadinah = priceDoubleMadinah * parseNum(formData.durasiMadinah, 3);
    const hDoubleMakkah = priceDoubleMakkah * parseNum(formData.durasiMakkah, 4);

    const hWisataTotalQuad = formData.kategori === "UMRAH PLUS"
      ? (getHotelPriceDynamic(hWisata, formData.tglBerangkat, 'Quad') || 0) * parseNum(formData.durasiWisata, 0)
      : 0;
    const hWisataTotalTriple = formData.kategori === "UMRAH PLUS"
      ? (getHotelPriceDynamic(hWisata, formData.tglBerangkat, 'Triple') || 0) * parseNum(formData.durasiWisata, 0)
      : 0;
    const hWisataTotalDouble = formData.kategori === "UMRAH PLUS"
      ? (getHotelPriceDynamic(hWisata, formData.tglBerangkat, 'Double') || 0) * parseNum(formData.durasiWisata, 0)
      : 0;

    const selectedLayananItems = layananList.reduce((acc: {id: string, nama: string, harga: number}[], item: Layanan) => {
      if (item.isGroup) {
        if (formData.selectedLayanan?.includes(item.id)) {
          const selectedOpt = item.options?.find((opt) =>
            formData.selectedLayanan?.includes(opt.id)
          );
          if (selectedOpt) {
            acc.push({
              id: selectedOpt.id,
              nama: `${item.nama}: ${selectedOpt.label}`,
              harga: selectedOpt.price,
            });
          }
        }
      } else {
        if (formData.selectedLayanan?.includes(item.id)) {
          acc.push({
            id: item.id,
            nama: item.nama,
            harga: item.harga || 0
          });
        }
      }
      return acc;
    }, []);

    const layananTotal = selectedLayananItems.reduce((sum, item) => sum + (Number(item.harga) || 0), 0);

    const baseQuad = maskapaiPrice + hWisataTotalQuad + hQuadMadinah + hQuadMakkah + layananTotal;
    const baseTriple = maskapaiPrice + hWisataTotalTriple + hTripleMadinah + hTripleMakkah + layananTotal;
    const baseDouble = maskapaiPrice + hWisataTotalDouble + hDoubleMadinah + hDoubleMakkah + layananTotal;

    const margin = Number(formData.marginBersih) || 0;
    const adminFee = margin * 0.1;
    const mitraMarkup = isMitraContext ? (Number(formData.markup) || 0) : 0;
    const mitraAdminFee = mitraMarkup * 0.1;
    
    // In Partner context, the Admin's profit (margin + fee) is part of the cost base
    const adminServiceFee = isMitraContext ? (margin + adminFee) : 0;
    
    const displayKomisiMitra = isMitraContext ? mitraMarkup : margin;
    const displayKomisiUmaroh = isMitraContext ? mitraAdminFee : adminFee;
    
    const totalMarkupCount = isMitraContext ? (mitraMarkup + mitraAdminFee) : (margin + adminFee);

    // Wisata Halal specific
    const baseIDR = (formData.hargaDasar || 1350) * 16000;
    let wisataAddonsTotal = 0;
    if (formData.wisataAddon_tourLeader) wisataAddonsTotal += 250000 * (Number(formData.wisataAddon_tourLeaderCount) || 1);
    if (formData.wisataAddon_handling) wisataAddonsTotal += 250000;
    if (formData.wisataAddon_travelKits) wisataAddonsTotal += 250000;
    if (formData.wisataAddon_merch_koper) wisataAddonsTotal += 1500000;
    if (formData.wisataAddon_merch_slingbag) wisataAddonsTotal += 50000;
    if (formData.wisataAddon_merch_kaos) wisataAddonsTotal += 150000;
    if (formData.wisataAddon_merch_jaket) wisataAddonsTotal += 250000;
    if (formData.wisataAddon_merch_tasserut) wisataAddonsTotal += 25000;
    if (formData.wisataAddon_merch_topi) wisataAddonsTotal += 35000;
    if (formData.wisataAddon_merch_spanduk) wisataAddonsTotal += 150000;

    const wisataMargin = formData.wisataMargin !== undefined ? formData.wisataMargin : 100000;
    const wisataAdminFee = Math.round(wisataMargin * 0.1);
    const finalWisataPrice = Math.round(baseIDR + wisataAddonsTotal + wisataMargin + wisataAdminFee);

    return {
      hMadinah,
      hMakkah,
      hWisata,
      hQuadMadinah,
      hQuadMakkah,
      hTripleMadinah,
      hTripleMakkah,
      hDoubleMadinah,
      hDoubleMakkah,
      hWisataTotal: Math.round(hWisataTotalQuad), // Using Quad as baseline for summary view
      selectedLayananItems,
      layananTotal,
      baseQuad: Math.round(baseQuad),
      baseTriple: Math.round(baseTriple),
      baseDouble: Math.round(baseDouble),
      finalQuad: Math.round(baseQuad + totalMarkupCount),
      finalTriple: Math.round(baseTriple + totalMarkupCount),
      finalDouble: Math.round(baseDouble + totalMarkupCount),
      adminFee: Math.round(adminFee),
      totalKomisiMitra: Math.round(displayKomisiMitra),
      ujrohAnda: Math.round(margin - (Number(formData.ujrohPartner) || 0)),
      ujrohPartner: Math.round(Number(formData.ujrohPartner) || 0),
      totalKomisiUmaroh: Math.round(displayKomisiUmaroh),
      adminServiceFee: Math.round(adminServiceFee),
      totalMarkup: isMitraContext ? Math.round(mitraMarkup + mitraAdminFee) : Math.round(margin + adminFee),
      finalWisataPrice,
      baseIDR,
      wisataAddonsTotal,
      wisataAdminFee: Math.round(wisataAdminFee)
    };
  }, [formData, hotelsList, maskapaiList, dbLayananList, visaData, transportData, ziarahData, isMitraContext]);

  useEffect(() => {
    setHotelPage(1);
  }, [hotelSearchTerm, hotelFilterBintang, hotelStep]);

  useEffect(() => {
    const unsubMaskapai = onSnapshot(
      collection(db, "maskapai"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Maskapai));
        setMaskapaiList(data);
      },
      (error) => handleFirestoreError(error, OperationType.GET, "maskapai"),
    );

    const staticHotels: WizardHotel[] = hotels.map((h) => {
      const quad =
        h.seasons[0]?.prices.find((p) => p.roomType === "Quad")?.price ||
        0;
      const triple =
        h.seasons[0]?.prices.find((p) => p.roomType === "Triple")?.price ||
        0;
      const double =
        h.seasons[0]?.prices.find((p) => p.roomType === "Double")?.price ||
        0;

      const kurs = 4700;
      const margin = 1.1;

      return {
        id: h.id,
        nama: h.name,
        kota: h.city.toLowerCase(),
        bintang: h.stars || 5,
        priceQuad: quad ? ((quad * kurs) / 4) * margin : 0,
        priceTriple: triple ? ((triple * kurs) / 3) * margin : 0,
        priceDouble: double ? ((double * kurs) / 2) * margin : 0,
        vendor: h.vendor,
        seasons: h.seasons,
      };
    });

    const unsubHotels = onSnapshot(
      collection(db, "master_hotels"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as WizardHotel));
        setHotelsList([...staticHotels, ...data]);
      },
      (error) =>
        handleFirestoreError(error, OperationType.GET, "master_hotels"),
    );

    const unsubLayanan = onSnapshot(
      collection(db, "master_layanan"),
      (snapshot) => {
        const dbData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Layanan));
        setDbLayananList(dbData);
      },
      (error) =>
        handleFirestoreError(error, OperationType.GET, "master_layanan"),
    );

    const unsubBandara = onSnapshot(
      collection(db, "master_bandara"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Bandara));
        setBandaraList(data);
      },
      (error) =>
        handleFirestoreError(error, OperationType.GET, "master_bandara"),
    );

    const unsubPaketWisata = onSnapshot(
      collection(db, "master_paket_wisata"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as PaketWisata));
        setPaketWisataList(data);
      },
      (error) =>
        handleFirestoreError(error, OperationType.GET, "master_paket_wisata"),
    );

    return () => {
      unsubMaskapai();
      unsubHotels();
      unsubLayanan();
      unsubBandara();
      unsubPaketWisata();
    };
  }, []);

  const currentStepsList = getSteps(formData.kategori);
  const currentStepName =
    currentStepsList[currentStep - 1] || currentStepsList[0];

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      kotaKeberangkatan:
        prev.kotaKeberangkatan || `${INDONESIA_EMBARKASI[0].kota} (${INDONESIA_EMBARKASI[0].kode})`,
      kotaTujuan:
        prev.kotaTujuan || "JEDDAH (JED)",
    }));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // Allow up to 10MB for input, but we will compress it
        alert("Ukuran file terlalu besar. Maksimal 10MB sebelum kompresi.");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Resize logic
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1000; // Max dimension 1000px

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress as JPEG with 0.5 quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
          
          // Check compressed size (Base64 length * 0.75 is approx byte size)
          if (compressedBase64.length * 0.75 > 800 * 1024) {
            alert("Hasil kompresi masih terlalu besar. Gunakan foto dengan dimensi lebih kecil.");
            return;
          }

          setFormData((prev) => ({ ...prev, photoUtama: compressedBase64 }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExitClick = () => {
    setShowExitConfirmation(true);
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const isNew = !initialData?.id;
      const generateRequestId = () => {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const code = Array.from({ length: 4 }, () => letters.charAt(Math.floor(Math.random() * letters.length))).join("");
        return `REQ-${code}`;
      };

      const dataToSave: Partial<WizardFormData> = {
        photoUtama: formData.photoUtama || null,
        requestId: initialData?.requestId || generateRequestId(),
        nama: formData.nama || "Paket Draft",
        deskripsi: formData.deskripsi || "",
        tipePublikasi: formData.tipePublikasi || "B2C",
        tipePenjualan: formData.tipePenjualan || "INDIVIDUAL",
        hargaDasar: Number(pricingSummary.baseQuad || 0),
        maskapaiId: formData.maskapaiId || "",
        hotelMadinahId: formData.hotelMadinahId || "",
        hotelMakkahId: formData.hotelMakkahId || "",
        hotelWisataId: formData.hotelWisataId || "",
        selectedLayanan: formData.selectedLayanan || [],
        selectedWisata: formData.selectedWisata || [],
        kuota: Number(formData.targetJamaah || 0),
        sisaKuota: Number(formData.targetJamaah || 0),
        status: "draft",
        validationStatus: isMitraContext ? 'pending' : 'approved',
        kategori: formData.kategori,
        periode: formData.periode,
        durasiHari: formData.durasiHari,
        kotaKeberangkatan: formData.kotaKeberangkatan,
        kotaTujuan: formData.kotaTujuan,
        urutanKunjungan: formData.urutanKunjungan,
        tglBerangkat: formData.tglBerangkat,
        tglKepulangan: formData.tglKepulangan,
        tipePenerbangan: formData.tipePenerbangan,
        kelasPenerbangan: formData.kelasPenerbangan,
        estimasiHargaMaskapai: Number(formData.estimasiHargaMaskapai || 0),
        marginBersih: Number(formData.marginBersih || 0),
        ujrohPartner: Number(formData.ujrohPartner || 0),
        durasiMadinah: Number(formData.durasiMadinah || 3),
        durasiMakkah: Number(formData.durasiMakkah || 4),
        durasiWisata: Number(formData.durasiWisata || 0),
        paketWisataId: formData.paketWisataId || "",
        negaraWisata: formData.negaraWisata || "",
        mitraId: formData.mitraId || null,
        hargaJualQuad: Math.round(pricingSummary.finalQuad),
        hargaJualTriple: Math.round(pricingSummary.finalTriple),
        hargaJualDouble: Math.round(pricingSummary.finalDouble),
      };

      if (isNew) {
        await addDoc(collection(db, "paket_master"), {
          ...dataToSave,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "paket_master", initialData.id), {
          ...dataToSave,
          updatedAt: serverTimestamp(),
        });
      }

      onSuccess();
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan draft");
    } finally {
      setIsSaving(false);
      setShowExitConfirmation(false);
    }
  };

  const handleNext = () => {
    if (currentStepName === "HOTEL" || currentStepName === "HOTEL UMRAH") {
      if (!formData.hotelMadinahId) {
        alert("Hotel Madinah wajib dipilih!");
        setHotelStep("madinah");
        return;
      }
      if (!formData.hotelMakkahId) {
        alert("Hotel Makkah wajib dipilih!");
        setHotelStep("makkah");
        return;
      }
    }

    if (currentStep < currentStepsList.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const isNew = !initialData?.id;
      const generateRequestId = () => {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const code = Array.from({ length: 4 }, () => letters.charAt(Math.floor(Math.random() * letters.length))).join("");
        return `REQ-${code}`;
      };

      const dataToSave: Partial<WizardFormData> = {
        photoUtama: formData.photoUtama || null,
        requestId: initialData?.requestId || generateRequestId(),
        nama: formData.nama || "Paket Umroh Tanpa Nama",
        deskripsi: formData.deskripsi || "",
        tipePublikasi: formData.tipePublikasi || "B2C",
        tipePenjualan: formData.tipePenjualan || "INDIVIDUAL",
        hargaDasar: Number(pricingSummary.baseQuad || 0),
        maskapaiId: formData.maskapaiId || "",
        hotelMadinahId: formData.hotelMadinahId || "",
        hotelMakkahId: formData.hotelMakkahId || "",
        hotelWisataId: formData.hotelWisataId || "",
        selectedLayanan: formData.selectedLayanan || [],
        selectedWisata: formData.selectedWisata || [],
        kuota: Number(formData.targetJamaah || 0),
        sisaKuota: Number(formData.targetJamaah || 0),
        status: isMitraContext ? 'pending_validation' : (formData.status || "draft"),
        validationStatus: isMitraContext ? 'pending' : 'approved',
        // Additional meta
        kategori: formData.kategori,
        periode: formData.periode,
        durasiHari: formData.durasiHari,
        kotaKeberangkatan: formData.kotaKeberangkatan,
        kotaTujuan: formData.kotaTujuan,
        urutanKunjungan: formData.urutanKunjungan,
        tglBerangkat: formData.tglBerangkat,
        tglKepulangan: formData.tglKepulangan,
        tipePenerbangan: formData.tipePenerbangan,
        kelasPenerbangan: formData.kelasPenerbangan,
        estimasiHargaMaskapai: Number(formData.estimasiHargaMaskapai || 0),
        marginBersih: Number(formData.marginBersih || 0),
        ujrohPartner: Number(formData.ujrohPartner || 0),
        durasiMadinah: Number(formData.durasiMadinah || 3),
        durasiMakkah: Number(formData.durasiMakkah || 4),
        durasiWisata: Number(formData.durasiWisata || 0),
        paketWisataId: formData.paketWisataId || "",
        negaraWisata: formData.negaraWisata || "",
        mitraId: formData.mitraId || null,
        hargaJualQuad: Math.round(pricingSummary.finalQuad),
        hargaJualTriple: Math.round(pricingSummary.finalTriple),
        hargaJualDouble: Math.round(pricingSummary.finalDouble),
      };

      if (isMitraContext) {
        if (formData.isMarkupOnly || formData.paketMasterId || initialData?.paketMasterId) {
          const markupData = {
            paketMasterId: formData.paketMasterId || initialData?.paketMasterId,
            mitraId: formData.mitraId,
            namaPaketMitra: formData.nama || formData.namaPaketMitra,
            markup: Number(formData.markup || 0),
            hargaJual: Math.round(pricingSummary.finalQuad),
            hargaJualTriple: Math.round(pricingSummary.finalTriple),
            hargaJualDouble: Math.round(pricingSummary.finalDouble),
            photoUtama: formData.photoUtama || null,
            status: 'active',
            updatedAt: serverTimestamp(),
          };

          if (!isNew && initialData?.id && !formData.isNewMarkup) {
            // Update Existing Markup
            try {
              await updateDoc(doc(db, "paket_mitra", initialData.id), markupData);
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, `paket_mitra/${initialData.id}`);
            }
          } else {
            // Create New Markup
            try {
              await addDoc(collection(db, "paket_mitra"), {
                ...markupData,
                createdAt: serverTimestamp(),
              });
            } catch (e) {
              handleFirestoreError(e, OperationType.CREATE, 'paket_mitra');
            }
          }
        } else {
          // Validation process for Mitra creating OWN Master Package
          if (isNew) {
            try {
              await addDoc(collection(db, "paket_master"), {
                ...dataToSave,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            } catch (e) {
              handleFirestoreError(e, OperationType.CREATE, 'paket_master');
            }
          } else {
            try {
              await updateDoc(doc(db, "paket_master", initialData.id), {
                ...dataToSave,
                updatedAt: serverTimestamp(),
              });
            } catch (e) {
              handleFirestoreError(e, OperationType.WRITE, `paket_master/${initialData.id}`);
            }
          }
        }
      } else {
        // Normal Admin flow
        if (initialData?.id) {
          try {
            await updateDoc(doc(db, "paket_master", initialData.id), {
              ...dataToSave,
              updatedAt: serverTimestamp(),
            });
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `paket_master/${initialData.id}`);
          }
        } else {
          try {
            await addDoc(collection(db, "paket_master"), {
              ...dataToSave,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, 'paket_master');
          }
        }
      }

      onSuccess();
      
      // Trigger WhatsApp if finishing from VALIDASI AKHIR step
      if (currentStepName === "VALIDASI AKHIR") {
        const adminPhone = "6283844974952";
        const isUpdate = !isNew;
        const msgHeader = isUpdate 
          ? "Ada UPDATE paket yang membutuhkan validasi ulang:" 
          : "Ada paket baru yang membutuhkan validasi:";
        const waMessage = `Assalamu'alaikum Admin Operasional,\n\n${msgHeader}\n\n*Nama Paket:* ${dataToSave.nama}\n*Kategori:* ${dataToSave.kategori || formData.kategori}\n\nMohon segera ditinjau.\n\nTerima kasih.`;
        openWhatsApp(generateWALink(adminPhone, waMessage));
      }
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan data");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateItinerary = async () => {
    setIsAiLoading(true);
    try {
      const hMadinah = hotelsList.find((h) => h.id === formData.hotelMadinahId);
      const hMakkah = hotelsList.find((h) => h.id === formData.hotelMakkahId);
      const maskapai = maskapaiList.find((m) => m.id === formData.maskapaiId);

      const data = {
        ...formData,
        hotelMadinahNama: hMadinah?.nama || "TBA",
        hotelMakkahNama: hMakkah?.nama || "TBA",
        maskapaiNama: maskapai?.name || "TBA",
      };

      const result = await generateItinerary(data);
      setAiResult({ title: "Itinerary AI", content: result || "" });
    } catch {
      alert("Gagal generate itinerary");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGenerateMarketing = async () => {
    setIsAiLoading(true);
    try {
      const hMadinah = hotelsList.find((h) => h.id === formData.hotelMadinahId);
      const hMakkah = hotelsList.find((h) => h.id === formData.hotelMakkahId);
      const maskapai = maskapaiList.find((m) => m.id === formData.maskapaiId);

      // Simple calculation for display if needed
      const result = await generateMarketingCopy({
        ...formData,
        hotelMadinahNama: hMadinah?.nama || "TBA",
        hotelMakkahNama: hMakkah?.nama || "TBA",
        hotelMadinahStars: hMadinah?.bintang || 0,
        hotelMakkahStars: hMakkah?.bintang || 0,
        maskapaiNama: maskapai?.name || "TBA",
      });
      setAiResult({ title: "Marketing Content AI", content: result || "" });
    } catch {
      alert("Gagal generate marketing content");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleExport = async (type: 'pdf' | 'jpg') => {
    // ...
    const pdfElement = document.getElementById('pdf-export-content');
    if (!pdfElement) return;

    const filename = `Deskripsi_Paket_${formData.nama || "TBA"}`;

    if (type === 'pdf') {
      const opt = {
        margin: 10,
        filename: `${filename}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 3, 
          useCORS: true,
          logging: false,
          letterRendering: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc: Document) => {
            const el = clonedDoc.getElementById('pdf-export-content');
            if (el) {
              el.style.display = 'block';
              el.style.position = 'relative';
              el.style.left = '0';
              el.style.top = '0';
              el.style.visibility = 'visible';
              el.style.width = '210mm';
              el.style.backgroundColor = '#ffffff';
              el.style.color = '#111827';
            }
            
            // Sanitize colors for html2canvas compatibility
            if (pdfElement) {
              sanitizeForHtml2Canvas(clonedDoc, pdfElement);
            }
          }
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      try {
        const h2p = html2pdf().from(pdfElement).set(opt);
        const { Capacitor } = await import('@capacitor/core');
        
        if (Capacitor.isNativePlatform()) {
          const pdfDataUri = await h2p.output('datauristring') as string;
          await import('../utils/fileUtils').then(m => m.downloadFile(pdfDataUri, `${filename}.pdf`));
        } else {
          await h2p.save();
        }
      } catch (error) {
        console.error('PDF generation failed:', error);
        alert("Gagal mengunduh PDF. Silakan coba lagi.");
      }
    } else {
      // JPG Export using html-to-image via our robust utility
      try {
        const dataUrl = await captureToDataUrl(pdfElement, {
          pixelRatio: 3,
          backgroundColor: '#ffffff'
        });

        const isNative = Capacitor.isNativePlatform();
        if (isNative) {
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          const { Share } = await import('@capacitor/share');
          
          const fileContent = dataUrl.split(',')[1];
          const fileName = `${filename}.jpg`;
          
          const result = await Filesystem.writeFile({
            path: fileName,
            data: fileContent,
            directory: Directory.Cache,
          });

          await Share.share({
            title: fileName,
            url: result.uri,
          });
        } else {
          await import('../utils/fileUtils').then(m => m.downloadFile(dataUrl, `${filename}.jpg`));
        }
      } catch (error) {
        console.error('JPG generation failed:', error);
        pdfElement.style.cssText = "display: none;"; // Fallback restore
        alert("Gagal mengunduh JPG. Silakan coba lagi.");
      }
    }
  };

  return (
    <div className="bg-white md:rounded-2xl md:shadow-md md:border md:border-gray-100 p-0 sm:p-6 md:p-8 min-h-screen md:min-h-0">
      {/* Header & Back Button */}
      <div className="flex items-center gap-4 mb-8 px-4 sm:px-0 pt-4 sm:pt-0">
        <button
          onClick={handleExitClick}
          className="p-2 bg-gray-50 text-gray-600 hover:text-emerald-600 rounded-full transition-colors font-bold"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">
          {initialData ? "Edit Paket Master" : "Buat Paket Program Baru"}
        </h2>
      </div>

      {/* Stepper Wizard Indicator */}
      <div className="hidden md:flex justify-between items-center mb-10 overflow-x-auto pb-4 custom-scrollbar">
        {currentStepsList.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isPassed = stepNumber < currentStep;

          return (
            <div
              key={step}
              className="flex flex-col items-center relative flex-1 min-w-[90px]"
            >
              {/* Connecting line */}
              {index !== 0 && (
                <div
                  className={`absolute top-5 -left-[50%] w-full h-[2px] -m-px ${
                    isPassed ? "bg-emerald-500" : "bg-gray-200"
                  }`}
                />
              )}

              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm z-10 ${
                  isActive
                    ? "bg-emerald-600 text-white ring-4 ring-emerald-50"
                    : isPassed
                      ? "bg-emerald-50 text-emerald-500 ring-2 ring-emerald-200"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {isPassed ? (
                  <Check className="w-5 h-5" strokeWidth={3} />
                ) : (
                  stepNumber
                )}
              </div>
              <span
                className={`text-[9px] sm:text-[10px] font-bold mt-3 text-center uppercase tracking-wider ${
                  isActive
                    ? "text-emerald-700"
                    : isPassed
                      ? "text-emerald-600"
                      : "text-gray-400"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile Stepper Text */}
      <div className="md:hidden flex items-center justify-between mb-8 bg-emerald-50 p-4 rounded-xl">
        <span className="text-emerald-700 font-bold text-sm">
          Langkah {currentStep} dari {currentStepsList.length}
        </span>
        <span className="text-emerald-800 font-black text-sm">
          {currentStepsList[currentStep - 1]}
        </span>
      </div>

      {/* Forms Area */}
      <div className="min-h-[400px]">
        {currentStepName === "INFORMASI DASAR" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Kategori Program */}
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">
                PILIH KATEGORI IBADAH/PERJALANAN
              </label>
              <div className="flex flex-wrap gap-2">
                {KATEGORI_PROGRAM.map((kat) => (
                  <button
                    key={kat}
                    onClick={() => setFormData({ ...formData, kategori: kat })}
                    className={`flex-1 min-w-[120px] px-5 py-4 rounded-xl text-[10px] sm:text-xs font-bold transition-all border ${
                      formData.kategori === kat
                        ? "bg-blue-50 text-blue-700 border-blue-500 shadow-sm"
                        : "bg-white text-gray-500 border-gray-100 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-current opacity-50"></span>
                      </span>
                      {kat}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Area Destinasi Wisata Halal */}
            {formData.kategori === "WISATA HALAL" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                <label className="block text-[10px] sm:text-xs font-bold text-blue-500 mb-4 uppercase tracking-wider">
                  PILIH NEGARA TUJUAN *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from(
                    new Set(paketWisataList.map((p) => (p.lokasi || "").toUpperCase())),
                  ).map((negaraName) => {
                    const isSelected = formData.negaraWisata === negaraName;
                    const defaultImgUrl =
                      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
                    const listPaket = paketWisataList.filter(
                      (p) => (p.lokasi || "").toUpperCase() === negaraName,
                    );
                    // Ambil img dari paket pertama dari negara tsb jika tersedia
                    const destImg = listPaket[0]?.img || defaultImgUrl;
                    const availableCount = listPaket.length;

                    return (
                      <button
                        key={negaraName}
                        onClick={() =>
                          setFormData({ ...formData, negaraWisata: negaraName })
                        }
                        className={`relative h-40 rounded-2xl overflow-hidden group text-left border-2 transition-all ${
                          isSelected
                            ? "border-blue-500 shadow-lg shadow-blue-500/20 scale-[1.02] z-10"
                            : "border-transparent hover:border-blue-200"
                        }`}
                      >
                        {/* Background Image */}
                        <div className="absolute inset-0">
                          <img
                            src={destImg}
                            alt={negaraName}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          <div
                            className={`absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent transition-opacity ${
                              isSelected
                                ? "opacity-90"
                                : "opacity-70 group-hover:opacity-80"
                            }`}
                          />
                        </div>

                        {/* Content */}
                        <div className="absolute inset-0 p-4 flex flex-col justify-end">
                          <h4 className="text-white font-black text-lg mb-1 tracking-wide">
                            {negaraName}
                          </h4>
                          <div className="flex items-center gap-1.5 text-gray-300 text-[10px] sm:text-xs font-bold">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${availableCount > 0 ? "bg-emerald-400" : "bg-gray-500"}`}
                            />
                            {availableCount} PAKET YG TERSEDIA
                          </div>
                        </div>

                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-sm animate-in zoom-in duration-300">
                            <Check className="w-4 h-4" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {formData.kategori !== "WISATA HALAL" && (
              <>
                {/* Nama Program Paket */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                    Nama Program Paket
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: Paket Umrah Plus Turkiye 12 Hari"
                    value={formData.nama || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, nama: e.target.value })
                    }
                    className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-800 font-medium transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Pilih Periode */}
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                      PILIH PERIODE *
                    </label>
                    <select
                      value={formData.periode || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, periode: e.target.value })
                      }
                      className="w-full p-4 bg-gray-50/50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-800 font-bold appearance-none transition-all"
                    >
                      <option value="">Awal Tahun 2025</option>
                      <option value="Awal Musim">
                        Awal Musim (Muharram-Safar)
                      </option>
                      <option value="High Season">
                        High Season (Rajab-Ramadhan)
                      </option>
                      <option value="Akhir Musim">
                        Akhir Musim (Syawal-Dzulhijjah)
                      </option>
                    </select>
                  </div>

                  {/* Durasi Program (Umrah Plus Wisata atau Biasa) */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {formData.kategori === "UMRAH PLUS"
                          ? "DURASI PROGRAM UMRAH PLUS WISATA *"
                          : "DURASI PROGRAM *"}
                      </label>
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase">
                        {formData.durasiHari} HARI
                      </span>
                    </div>
                    <div className="pt-2 pb-1 relative group">
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={formData.durasiHari}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            durasiHari: parseInt(e.target.value),
                          })
                        }
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-[9px] font-bold text-gray-300 mt-2">
                        <span>1 Hari</span>
                        <span>30 Hari</span>
                      </div>
                    </div>
                  </div>

                  {/* === UMRAH PLUS EXCLUSIVE FIELDS === */}
                  {formData.kategori === "UMRAH PLUS" && (
                    <>
                      {/* Negara Wisata Tambahan */}
                      <div>
                        <label className="block text-[10px] sm:text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                          NEGARA WISATA TAMBAHAN *
                        </label>
                        <select
                          value={formData.negaraWisata || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              negaraWisata: e.target.value,
                            })
                          }
                          className="w-full p-4 bg-gray-50/50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-800 font-bold appearance-none transition-all"
                        >
                          <option value="">-- Pilih Negara Wisata --</option>
                          {Array.from(
                            new Set(
                              paketWisataList.map((p) =>
                                (p.lokasi || "").toUpperCase(),
                              ),
                            ),
                          ).map((negara) => (
                            <option key={negara} value={negara}>
                              {negara}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Durasi Program Wisata */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">
                            DURASI PROGRAM WISATA *
                          </label>
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase">
                            {formData.durasiWisata} HARI
                          </span>
                        </div>
                        <div className="pt-2 pb-1 relative group">
                          <input
                            type="range"
                            min="1"
                            max="15"
                            value={formData.durasiWisata}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                durasiWisata: parseInt(e.target.value),
                              })
                            }
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                          <div className="flex justify-between text-[9px] font-bold text-gray-300 mt-2">
                            <span>1 Hari</span>
                            <span>15 Hari</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Kota Keberangkatan */}
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                      KOTA KEBERANGKATAN *
                    </label>
                    <select
                      value={formData.kotaKeberangkatan || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          kotaKeberangkatan: e.target.value,
                        })
                      }
                      className="w-full p-4 bg-gray-50/50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 font-bold appearance-none"
                    >
                      <option value="">-- Pilih Kota --</option>
                      {INDONESIA_EMBARKASI.map((item) => (
                         <option key={item.kode} value={`${item.kota} (${item.kode})`}>
                           {item.kota} ({item.kode})
                         </option>
                      ))}
                    </select>
                  </div>

                  {/* Kota Tujuan Utama */}
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                      KOTA TUJUAN UTAMA *
                    </label>
                    {formData.kategori === "UMRAH PLUS" ||
                    formData.kategori === "WISATA HALAL" ? (
                      <div className="w-full p-4 bg-gray-50/50 border border-transparent rounded-xl text-gray-800 font-bold uppercase">
                        {formData.negaraWisata || "-"}
                      </div>
                    ) : (
                      <select
                        value={formData.kotaTujuan || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            kotaTujuan: e.target.value,
                          })
                        }
                        className="w-full p-4 bg-gray-50/50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 font-bold appearance-none"
                      >
                        <option value="">-- Pilih Kota Tujuan --</option>
                        {bandaraList
                          .filter(
                            (b) => (b.negara || "").toUpperCase() === "ARAB SAUDI",
                          )
                          .map((b) => (
                            <option key={b.id} value={(b.kota || "").toUpperCase()}>
                              {(b.kota || "").toUpperCase()} ({(b.kode || "")})
                            </option>
                          ))}
                      </select>
                    )}
                  </div>

                  {/* Alur Perjalanan & Urutan Kunjungan */}
                  {formData.kategori === "UMRAH PLUS" ? (
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                        ALUR PERJALANAN *
                      </label>
                      <select
                        value={formData.alurPerjalanan}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            alurPerjalanan: e.target.value,
                          })
                        }
                        className="w-full p-4 bg-gray-50/50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 font-bold appearance-none"
                      >
                        <option value="WISATA TERLEBIH DAHULU">
                          WISATA TERLEBIH DAHULU
                        </option>
                        <option value="UMRAH TERLEBIH DAHULU">
                          UMRAH TERLEBIH DAHULU
                        </option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                        URUTAN KUNJUNGAN KOTA *
                      </label>
                      <select
                        value={formData.urutanKunjungan || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            urutanKunjungan: e.target.value,
                          })
                        }
                        className="w-full p-4 bg-gray-50/50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 font-bold appearance-none"
                      >
                        <option value="">-- Pilih Urutan --</option>
                        <option value="Madinah - Mekkah">
                          Madinah - Mekkah
                        </option>
                        <option value="Mekkah - Madinah">
                          Mekkah - Madinah
                        </option>
                        <option value="Mekkah - Madinah - Thaif">
                          Mekkah - Madinah - Thaif
                        </option>
                      </select>
                    </div>
                  )}

                  {/* Tanggal Berangkat */}
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                      TANGGAL KEBERANGKATAN *
                    </label>
                    <input
                      type="date"
                      value={formData.tglBerangkat || ""}
                      onChange={(e) => {
                        const newTglBerangkat = e.target.value;
                        let newTglPulang = formData.tglKepulangan;
                        if (newTglBerangkat) {
                          const dt = new Date(newTglBerangkat);
                          if (!isNaN(dt.getTime())) {
                            dt.setDate(dt.getDate() + (formData.durasiHari || 9));
                            newTglPulang = dt.toISOString().split("T")[0];
                          }
                        }
                        setFormData({
                          ...formData,
                          tglBerangkat: newTglBerangkat,
                          preferredDepartureDate: newTglBerangkat,
                          tglKepulangan: newTglPulang,
                        });
                      }}
                      className="w-full p-4 bg-gray-50/50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 font-bold"
                    />
                  </div>

                  {/* Tanggal Kepulangan (Otomatis) */}
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
                      TANGGAL KEPULANGAN (OTOMATIS)
                    </label>
                    <div className="w-full p-4 bg-gray-50/30 text-gray-400 font-bold rounded-xl border border-transparent">
                      {formData.tglKepulangan && !isNaN(new Date(formData.tglKepulangan).getTime())
                        ? new Date(formData.tglKepulangan).toLocaleDateString(
                            "id-ID",
                            { year: "numeric", month: "long", day: "numeric" },
                          )
                        : "dd/mm/yyyy"}
                    </div>
                  </div>

                  {/* Durasi Umrah (Otomatis) - Only if UMRAH PLUS */}
                  {formData.kategori === "UMRAH PLUS" && (
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
                        DURASI UMRAH (OTOMATIS)
                      </label>
                      <div className="w-full p-4 bg-gray-50/30 text-gray-400 font-bold rounded-xl border border-transparent flex justify-between items-center">
                        <span>
                          {Math.max(
                            0,
                            (Number(formData.durasiHari) || 0) - (Number(formData.durasiWisata) || 0),
                          )}
                        </span>
                        <span className="text-[10px] tracking-widest uppercase">
                          HARI
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Target Jamaah Max */}
                  <div className="md:col-span-2 mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">
                        TARGET JAMAAH *
                      </label>
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase">
                        {formData.targetJamaah} PAX
                      </span>
                    </div>
                    <div className="pt-2 pb-1 relative group">
                      <input
                        type="range"
                        min="2"
                        max="90"
                        value={formData.targetJamaah}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            targetJamaah: parseInt(e.target.value),
                          })
                        }
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-[9px] font-bold text-blue-200 mt-2">
                        <span>2 Pax</span>
                        <span>90 Pax</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {currentStepName === "PILIH PAKET WISATA" &&
          formData.kategori === "WISATA HALAL" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="flex justify-between items-center bg-gray-50 p-4 border border-gray-100 rounded-xl">
                <div>
                  <h3 className="text-sm font-black text-gray-900 tracking-wider uppercase">
                    PILIH PAKET WISATA
                  </h3>
                  <p className="text-[10px] sm:text-xs font-bold text-gray-400 tracking-widest uppercase mt-1">
                    MENAMPILKAN PAKET UNTUK {formData.negaraWisata || "TURKEY"}
                  </p>
                </div>
                <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                  {
                    paketWisataList.filter(
                      (p) =>
                        (p.lokasi || "").toUpperCase() ===
                        (formData.negaraWisata || "TURKEY"),
                    ).length
                  }{" "}
                  PAKET TERSEDIA
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paketWisataList
                  .filter(
                    (p) =>
                      (p.lokasi || "").toUpperCase() ===
                      (formData.negaraWisata || "TURKEY"),
                  )
                  .map((paket) => {
                    const isSelected = formData.paketWisataId === paket.id;
                    return (
                      <button
                        key={paket.id}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            paketWisataId: paket.id,
                            nama: paket.nama,
                            hargaDasar: paket.hargaStart,
                          })
                        }
                        className={`relative rounded-2xl overflow-hidden group text-left border-2 transition-all flex flex-col bg-white ${
                          isSelected
                            ? "border-blue-500 shadow-lg shadow-blue-500/20 scale-[1.01]"
                            : "border-transparent hover:border-gray-200 shadow-sm hover:shadow-md"
                        }`}
                      >
                        <div className="h-48 relative overflow-hidden w-full bg-gray-100">
                          <img
                            src={
                              paket.img ||
                              "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                            }
                            alt={paket.nama}
                            className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="p-5 flex flex-col items-center justify-center text-center">
                          <h4 className="font-black text-sm text-gray-900 tracking-wider mb-2">
                            {paket.nama}
                          </h4>
                          <div className="text-[9px] font-bold text-gray-400 tracking-widest uppercase mb-4">
                            {paket.deskripsi}
                          </div>
                          <div className="text-xs font-black text-emerald-600 tracking-widest uppercase">
                            START $ {paket.hargaStart?.toFixed(2)}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                {paketWisataList.filter(
                  (p) =>
                    (p.lokasi || "").toUpperCase() ===
                    (formData.negaraWisata || "TURKEY"),
                ).length === 0 && (
                  <div className="col-span-1 md:col-span-2 py-20 text-center text-gray-400 font-bold text-xs">
                    Belum ada paket wisata tersedia untuk negara ini
                  </div>
                )}
              </div>
            </div>
          )}

        {currentStepName === "DETAIL INFO" &&
          formData.kategori === "WISATA HALAL" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
              {/* Header / Rute */}
              <div className="mb-6">
                <h3 className="text-lg sm:text-xl font-black text-[#1A1C29] tracking-wider uppercase">
                  {formData.paketWisataId
                    ? paketWisataList.find(
                        (p) => p.id === formData.paketWisataId,
                      )?.deskripsi || "EXPLORE ISTANBUL - BURSA - CAPPADOCIA"
                    : "EXPLORE ISTANBUL - BURSA - CAPPADOCIA"}
                </h3>
              </div>

              {/* Gallery Placeholder */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                  <img
                    src={
                      paketWisataList.find(
                        (p) => p.id === formData.paketWisataId,
                      )?.img ||
                      "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
                    }
                    alt="Gallery 1"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                  <img
                    src="https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
                    alt="Gallery 2"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                  <img
                    src="https://images.unsplash.com/photo-1533140920038-7fba022f778d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
                    alt="Gallery 3"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* Banner duration and pax */}
              <div className="flex flex-col sm:flex-row bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
                <div className="flex-1 p-4 border-b sm:border-b-0 sm:border-r border-gray-200">
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-1">
                    DURATION
                  </p>
                  <p className="text-sm font-black text-gray-900 uppercase">
                    {paketWisataList.find(
                      (p) => p.id === formData.paketWisataId,
                    )?.durasiHari || 10}{" "}
                    HARI{" "}
                    {Math.max(
                      1,
                      (paketWisataList.find(
                        (p) => p.id === formData.paketWisataId,
                      )?.durasiHari || 10) - 1,
                    )}{" "}
                    MALAM
                  </p>
                </div>
                <div className="flex-1 p-4">
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-1">
                    MIN PAX
                  </p>
                  <p className="text-sm font-black text-gray-900 uppercase">
                    2 PAX
                  </p>
                </div>
              </div>

              {/* Pricing Tables */}
              <div className="grid grid-cols-1 gap-6 mb-8">
                {(() => {
                  const selectedPaket = paketWisataList.find(
                    (p) => p.id === formData.paketWisataId,
                  );
                  const baseUSD = selectedPaket
                    ? selectedPaket.hargaStart
                    : 840;
                  const multiplier = 16000;

                  const fitTiers = [
                    { label: "2", factor: 1.5 },
                    { label: "4", factor: 1.3 },
                    { label: "7", factor: 1.15 },
                    { label: "8", factor: 1.05 },
                    { label: "9", factor: 1.05 },
                  ];

                  const groupTiers = [
                    { label: "10-14", factor: 1.1 },
                    { label: "15-19", factor: 1.08 },
                    { label: "20-24", factor: 1.05 },
                    { label: "25-29", factor: 1.02 },
                    { label: "30-34", factor: 1.0 },
                    { label: "35-39", factor: 0.98 },
                    { label: "40-49", factor: 0.95 },
                  ];

                  const handleSelectTier = (
                    tierLabel: string,
                    price: number,
                  ) => {
                    setFormData({
                      ...formData,
                      wisataTierPax: tierLabel,
                      hargaDasar: price / multiplier, // Keep standard in USD for Step 6
                    });
                  };

                  return (
                    <>
                      {/* FIT Table */}
                      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                        <div className="flex justify-between items-center bg-[#FFFdf5] p-3 border-b border-[#fbecc8]">
                          <span className="text-[10px] font-black uppercase text-gray-800">
                            FIT
                          </span>
                          <span className="text-[10px] font-black uppercase text-gray-800">
                            PRICE / PAX
                          </span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {fitTiers.map((tier) => {
                            const price =
                              Math.round(
                                (baseUSD * tier.factor * multiplier) / 50000,
                              ) * 50000; // Round to nearest 50k
                            const isSelected =
                              formData.wisataTierPax === `FIT-${tier.label}` ||
                              (!formData.wisataTierPax && tier.label === "8"); // Default 8 pax

                            return (
                              <div
                                key={`fit-${tier.label}`}
                                className={`flex justify-between items-center p-4 transition-colors ${isSelected ? "bg-blue-50/30" : ""}`}
                              >
                                <span className="text-xs font-bold text-gray-700 w-12">
                                  {tier.label}
                                </span>
                                <div className="flex-1 flex justify-center">
                                  <div
                                    onClick={() =>
                                      handleSelectTier(
                                        `FIT-${tier.label}`,
                                        price,
                                      )
                                    }
                                    className={`w-5 h-5 border-2 rounded flex items-center justify-center cursor-pointer transition-colors ${isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white hover:border-blue-400"}`}
                                  >
                                    {isSelected && (
                                      <Check
                                        className="w-3 h-3 text-white"
                                        strokeWidth={3}
                                      />
                                    )}
                                  </div>
                                </div>
                                <span
                                  className={`text-xs font-black w-28 text-right ${isSelected ? "text-blue-700" : "text-gray-900"}`}
                                >
                                  Rp {price.toLocaleString("id-ID")}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* GROUP Table */}
                      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                        <div className="flex justify-between items-center bg-[#FFFdf5] p-3 border-b border-[#fbecc8]">
                          <span className="text-[10px] font-black uppercase text-gray-800">
                            GROUP
                          </span>
                          <span className="text-[10px] font-black uppercase text-gray-800">
                            PRICE / PAX
                          </span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {groupTiers.map((tier) => {
                            const price =
                              Math.round(
                                (baseUSD * tier.factor * multiplier) / 50000,
                              ) * 50000;
                            const isSelected =
                              formData.wisataTierPax === `GROUP-${tier.label}`;

                            return (
                              <div
                                key={`grp-${tier.label}`}
                                className={`flex justify-between items-center p-4 transition-colors ${isSelected ? "bg-blue-50/30" : ""}`}
                              >
                                <span className="text-xs font-bold text-gray-700 w-12">
                                  {tier.label}
                                </span>
                                <div className="flex-1 flex justify-center">
                                  <div
                                    onClick={() =>
                                      handleSelectTier(
                                        `GROUP-${tier.label}`,
                                        price,
                                      )
                                    }
                                    className={`w-5 h-5 border-2 rounded flex items-center justify-center cursor-pointer transition-colors ${isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white hover:border-blue-400"}`}
                                  >
                                    {isSelected && (
                                      <Check
                                        className="w-3 h-3 text-white"
                                        strokeWidth={3}
                                      />
                                    )}
                                  </div>
                                </div>
                                <span
                                  className={`text-xs font-black w-28 text-right ${isSelected ? "text-blue-700" : "text-gray-900"}`}
                                >
                                  Rp {price.toLocaleString("id-ID")}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Include & Exclude */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-gray-200 rounded-xl overflow-hidden mb-8 bg-white text-xs">
                <div className="border-b lg:border-b-0 lg:border-r border-gray-200">
                  <div className="bg-emerald-50 p-3 border-b border-gray-200 text-[10px] font-black uppercase text-emerald-900 tracking-wider">
                    INCLUDE
                  </div>
                  <ul className="p-5 space-y-4 text-gray-600 font-medium leading-relaxed">
                    <li className="flex items-start gap-3">
                      <Check
                        className="text-emerald-500 w-4 h-4 flex-shrink-0 mt-0.5"
                        strokeWidth={3}
                      />
                      <span>
                        Meet and greet service by our English speaking driver.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check
                        className="text-emerald-500 w-4 h-4 flex-shrink-0 mt-0.5"
                        strokeWidth={3}
                      />
                      <span>All transfers by air conditioning coach.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check
                        className="text-emerald-500 w-4 h-4 flex-shrink-0 mt-0.5"
                        strokeWidth={3}
                      />
                      <span>
                        Accommodation in 4/5* Hotels based on breakfast and
                        dinner.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check
                        className="text-emerald-500 w-4 h-4 flex-shrink-0 mt-0.5"
                        strokeWidth={3}
                      />
                      <span>
                        All sightseeing tours as mentioned in the itinerary.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check
                        className="text-emerald-500 w-4 h-4 flex-shrink-0 mt-0.5"
                        strokeWidth={3}
                      />
                      <span>Entrance fees to all sites as indicated.</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="bg-red-50 p-3 border-b border-gray-200 text-[10px] font-black uppercase text-red-900 tracking-wider">
                    EXCLUDE
                  </div>
                  <ul className="p-5 space-y-4 text-gray-600 font-medium leading-relaxed">
                    <li className="flex items-start gap-3">
                      <X
                        className="text-red-500 w-4 h-4 flex-shrink-0 mt-0.5"
                        strokeWidth={3}
                      />
                      <span>International Airfare</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <X
                        className="text-red-500 w-4 h-4 flex-shrink-0 mt-0.5"
                        strokeWidth={3}
                      />
                      <span>Turkey entry Visa</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <X
                        className="text-red-500 w-4 h-4 flex-shrink-0 mt-0.5"
                        strokeWidth={3}
                      />
                      <span>Any optional tours, personal expenses</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Tentative Itinerary */}
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-8 bg-white">
                <div className="bg-blue-50 p-3 border-b border-blue-100 text-[10px] font-black uppercase text-blue-900 tracking-wider">
                  TENTATIVE ITINERARY
                </div>
                <div className="divide-y divide-gray-100">
                  {[
                    {
                      day: 1,
                      title: "ARRIVAL ISTANBUL",
                      desc: "Meet & Greet, Transfer to hotel",
                    },
                    {
                      day: 2,
                      title: "ISTANBUL - BURSA",
                      desc: "Grand Mosque, Green Tomb, Silk Market",
                    },
                    {
                      day: 3,
                      title: "BURSA - KUSADASI",
                      desc: "Ephesus Ancient City",
                    },
                    {
                      day: 4,
                      title: "KUSADASI - PAMUKKALE",
                      desc: "Hierapolis, Cotton Castle",
                    },
                    {
                      day: 5,
                      title: "PAMUKKALE - KONYA - CAPPADOCIA",
                      desc: "Mevlana Museum",
                    },
                    {
                      day: 6,
                      title: "CAPPADOCIA",
                      desc: "Underground City, Goreme Valley",
                    },
                    {
                      day: 7,
                      title: "CAPPADOCIA - ANKARA - ISTANBUL",
                      desc: "Salt Lake, Ataturk Mausoleum",
                    },
                    {
                      day: 8,
                      title: "ISTANBUL CITY TOUR",
                      desc: "Hagia Sophia, Blue Mosque, Topkapi Palace",
                    },
                  ].map((item) => (
                    <div key={item.day} className="p-4 sm:p-5">
                      <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" /> DAY {item.day}
                      </p>
                      <p className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wide">
                        {item.title}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1 font-medium">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        {currentStepName === "LAYANAN TAMBAHAN" &&
          formData.kategori === "WISATA HALAL" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
              {/* Header */}
              <div className="text-center mb-10">
                <h3 className="text-lg sm:text-xl font-black text-[#1A1C29] tracking-wider uppercase mb-1">
                  ADDITIONAL & ADD ON
                </h3>
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 tracking-widest uppercase">
                  PILIH LAYANAN TAMBAHAN DAN PERLENGKAPAN PAX
                </p>
              </div>

              {/* Essential Services */}
              <div className="space-y-4">
                {/* Tour Leader */}
                <div
                  className={`border-2 rounded-[1.25rem] overflow-hidden transition-all duration-200 ${formData.wisataAddon_tourLeader ? "border-blue-500 bg-white ring-4 ring-blue-500/10" : "border-gray-200 bg-white hover:border-gray-300"}`}
                >
                  <div
                    className="p-5 flex items-center cursor-pointer"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        wisataAddon_tourLeader:
                          !formData.wisataAddon_tourLeader,
                      })
                    }
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mr-5 transition-colors ${formData.wisataAddon_tourLeader ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400"}`}
                    >
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-xs text-[#1A1C29] uppercase tracking-wider mb-1">
                        TOUR LEADER
                      </h4>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">
                        PENDAMPING DARI TANAH AIR
                      </p>
                      <p className="text-[10px] font-black text-blue-600">
                        Rp 250.000
                      </p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${formData.wisataAddon_tourLeader ? "border-blue-500 bg-blue-500 text-white" : "border-gray-200 bg-transparent"}`}
                    >
                      {formData.wisataAddon_tourLeader && (
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      )}
                    </div>
                  </div>

                  {/* EXPANDED CONTENT */}
                  {formData.wisataAddon_tourLeader && (
                    <div className="p-5 pt-0">
                      <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                        <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                          JUMLAH TOUR LEADER (PAX):
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="w-full border border-gray-200 rounded-lg p-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          value={formData.wisataAddon_tourLeaderCount || 1}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              wisataAddon_tourLeaderCount: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Handling Domestik */}
                <div
                  className={`border-2 rounded-[1.25rem] overflow-hidden transition-all duration-200 ${formData.wisataAddon_handling ? "border-blue-500 bg-white ring-4 ring-blue-500/10" : "border-gray-200 bg-white hover:border-gray-300"}`}
                >
                  <div
                    className="p-5 flex items-center cursor-pointer"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        wisataAddon_handling: !formData.wisataAddon_handling,
                      })
                    }
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mr-5 transition-colors ${formData.wisataAddon_handling ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400"}`}
                    >
                      <Shield className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-xs text-[#1A1C29] uppercase tracking-wider mb-1">
                        HANDLING DOMESTIK
                      </h4>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">
                        LAYANAN BANDARA KEBERANGKATAN
                      </p>
                      <p className="text-[10px] font-black text-blue-600">
                        Rp 250.000
                      </p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${formData.wisataAddon_handling ? "border-blue-500 bg-blue-500 text-white" : "border-gray-200 bg-transparent"}`}
                    >
                      {formData.wisataAddon_handling && (
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      )}
                    </div>
                  </div>

                  {/* EXPANDED CONTENT */}
                  {formData.wisataAddon_handling && (
                    <div className="p-5 pt-0">
                      <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                        <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                          TIPE HANDLING:
                        </label>
                        <select
                          className="w-full bg-[#E5F3FF] border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                          value={
                            formData.wisataAddon_handlingType ||
                            "Handling domestik + Lounge"
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              wisataAddon_handlingType: e.target.value,
                            })
                          }
                        >
                          <option>Handling domestik + Lounge</option>
                          <option>Handling domestik Only</option>
                          <option>Lounge Only</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Travel Kits */}
                <div
                  className={`border-2 rounded-[1.25rem] overflow-hidden transition-all duration-200 ${formData.wisataAddon_travelKits ? "border-blue-500 bg-white ring-4 ring-blue-500/10" : "border-gray-200 bg-white hover:border-gray-300"}`}
                >
                  <div
                    className="p-5 flex items-center cursor-pointer"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        wisataAddon_travelKits:
                          !formData.wisataAddon_travelKits,
                      })
                    }
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mr-5 transition-colors ${formData.wisataAddon_travelKits ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400"}`}
                    >
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-xs text-[#1A1C29] uppercase tracking-wider mb-1">
                        TRAVEL KITS
                      </h4>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">
                        NAMETAG & TAS KECIL
                      </p>
                      <p className="text-[10px] font-black text-blue-600">
                        Rp 250.000
                      </p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${formData.wisataAddon_travelKits ? "border-blue-500 bg-blue-500 text-white" : "border-gray-200 bg-transparent"}`}
                    >
                      {formData.wisataAddon_travelKits && (
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Merchandise Divider */}
              <div className="pt-8 mb-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                  MERCHANDISE & ADD ONS
                </h4>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    {
                      id: "koper",
                      name: "KOPER CUSTOM",
                      desc: "KOPER DENGAN DESAIN KHUSUS",
                      price: 1500000,
                      icon: Briefcase,
                    },
                    {
                      id: "slingbag",
                      name: "SLING BAG",
                      desc: "TAS SELEMPANG EKSKLUSIF",
                      price: 50000,
                      icon: ShoppingBag,
                    },
                    {
                      id: "kaos",
                      name: "KAOS GRUP",
                      desc: "KAOS SERAGAM ROMBONGAN",
                      price: 150000,
                      icon: Shirt,
                    },
                    {
                      id: "jaket",
                      name: "JACKET GRUP",
                      desc: "JAKET SERAGAM ROMBONGAN",
                      price: 250000,
                      icon: Shirt,
                    },
                    {
                      id: "tasserut",
                      name: "TAS SERUT",
                      desc: "TAS SERUT PRAKTIS",
                      price: 25000,
                      icon: ShoppingBag,
                    },
                    {
                      id: "topi",
                      name: "TOPI",
                      desc: "TOPI IDENTITAS GRUP",
                      price: 35000,
                      icon: User,
                    },
                    {
                      id: "spanduk",
                      name: "SPANDUK ROMBONGAN",
                      desc: "SPANDUK UNTUK FOTO BERSAMA",
                      price: 150000,
                      icon: FileText,
                    },
                  ].map((item) => {
                    const isSelected = formData[`wisataAddon_merch_${item.id}`];
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className={`border rounded-[1rem] overflow-hidden transition-all duration-200 bg-white ${isSelected ? "border-blue-200 ring-2 ring-blue-500/10 shadow-sm" : "border-gray-100 hover:border-gray-200"}`}
                      >
                        <div
                          className="p-4 flex items-center cursor-pointer"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              [`wisataAddon_merch_${item.id}`]: !isSelected,
                            })
                          }
                        >
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 transition-colors ${isSelected ? "bg-gray-50 text-gray-400" : "bg-gray-50 text-gray-300"}`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-black text-[11px] text-[#1A1C29] uppercase tracking-wider mb-0.5">
                              {item.name}
                            </h4>
                            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">
                              {item.desc}
                            </p>
                            <p className="text-[10px] font-black text-gray-900">
                              Rp {item.price.toLocaleString("id-ID")}
                            </p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${isSelected ? "border-transparent bg-transparent text-blue-500" : "border-gray-200 bg-transparent text-transparent"}`}
                          >
                            {isSelected ? (
                              <Check className="w-4 h-4" strokeWidth={4} />
                            ) : (
                              <div className="w-full h-full rounded-full" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        {currentStepName === "REVIEW FASILITAS" &&
          formData.kategori === "WISATA HALAL" &&
          (() => {
            const baseIDR = (formData.hargaDasar || 1350) * 16000;
            let addonsTotal = 0;
            if (formData.wisataAddon_tourLeader)
              addonsTotal +=
                250000 * (Number(formData.wisataAddon_tourLeaderCount) || 1);
            if (formData.wisataAddon_handling) addonsTotal += 250000;
            if (formData.wisataAddon_travelKits) addonsTotal += 250000;
            if (formData.wisataAddon_merch_koper) addonsTotal += 1500000;
            if (formData.wisataAddon_merch_slingbag) addonsTotal += 50000;
            if (formData.wisataAddon_merch_kaos) addonsTotal += 150000;
            if (formData.wisataAddon_merch_jaket) addonsTotal += 250000;
            if (formData.wisataAddon_merch_tasserut) addonsTotal += 25000;
            if (formData.wisataAddon_merch_topi) addonsTotal += 35000;
            if (formData.wisataAddon_merch_spanduk) addonsTotal += 150000;

            const hppTotal = baseIDR + addonsTotal;
            const currentMargin =
              formData.wisataMargin !== undefined
                ? formData.wisataMargin
                : 100000;
            const adminFee = Math.round(currentMargin * 0.1);
            const totalMarkup = Math.round(currentMargin + adminFee);
            const finalPrice = Math.round(hppTotal + totalMarkup);

            return (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
                {/* 1. HPP DASAR PAKET */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-gray-900 rounded-full"></div>
                    <h4 className="font-black text-sm text-[#1A1C29] uppercase tracking-wider">
                      1. HPP DASAR PAKET
                    </h4>
                  </div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-3 mb-4">
                    BIAYA POKOK (HARGA BASE + ADDITIONAL & ADD ONS)
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#F8F9FA] border border-gray-100 rounded-2xl p-5">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-4">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        HPP TOTAL / PAX
                      </p>
                      <h3 className="font-black text-xl italic text-[#1A1C29]">
                        Rp {hppTotal.toLocaleString("id-ID")}
                      </h3>
                    </div>
                    <div className="bg-[#F8F9FA] border border-gray-100 rounded-2xl p-5">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        DURASI PROGRAM
                      </p>
                      <h3 className="font-black text-xl italic text-[#1A1C29]">
                        10D9N
                      </h3>
                    </div>
                  </div>
                </div>

                {/* 2. PENGATURAN PROFIT */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                    <h4 className="font-black text-sm text-[#1A1C29] uppercase tracking-wider">
                      2. PENGATURAN PROFIT (UJROH MITRA)
                    </h4>
                  </div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-3 mb-4">
                    TENTUKAN MARGIN KEUNTUNGAN PER PAX (10.000 - 1.000.000)
                  </p>

                  <div className="bg-white rounded-[2rem] p-6 sm:p-10 shadow-xl shadow-gray-200/40 border border-gray-100 flex flex-col items-center">
                    {/* Kontrol Margin */}
                    <div className="bg-gray-50 rounded-full p-2 flex items-center justify-between gap-4 sm:gap-8 min-w-[280px] sm:min-w-[320px] mb-8">
                      <button
                        onClick={() =>
                          setFormData({
                            ...formData,
                            wisataMargin: Math.max(0, currentMargin - 50000),
                          })
                        }
                        className="w-12 h-12 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors cursor-pointer z-10"
                      >
                        <Minus className="w-5 h-5 pointer-events-none" />
                      </button>

                      <div className="text-center flex-1">
                        <h3 className="font-black text-2xl sm:text-3xl text-blue-600 tracking-tight italic">
                          Rp {currentMargin.toLocaleString("id-ID")}
                        </h3>
                        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-1">
                          MARGIN
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          setFormData({
                            ...formData,
                            wisataMargin: currentMargin + 50000,
                          })
                        }
                        className="w-12 h-12 rounded-full bg-blue-600 shadow-lg shadow-blue-500/40 flex items-center justify-center text-white hover:bg-blue-700 transition-colors cursor-pointer z-10"
                      >
                        <Plus className="w-5 h-5 pointer-events-none" />
                      </button>
                    </div>

                    {/* Breakdown Card */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                      <div className="flex-1 bg-gray-50 border border-gray-100 p-4 rounded-2xl relative overflow-hidden">
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex justify-between">
                          ADMIN FEE (10%) <ArrowRightLeft className="w-3 h-3" />
                        </p>
                        <h4 className="font-black text-sm text-gray-900 italic">
                          Rp {adminFee.toLocaleString("id-ID")}
                        </h4>
                      </div>
                      <div className="flex-1 bg-blue-50 border border-blue-100 p-4 rounded-2xl relative overflow-hidden">
                        <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1.5 flex justify-between">
                          TOTAL MARKUP <ArrowRight className="w-3 h-3" />
                        </p>
                        <h4 className="font-black text-sm text-blue-700 italic">
                          Rp {totalMarkup.toLocaleString("id-ID")}
                        </h4>
                      </div>
                    </div>

                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-6 text-center">
                      BIAYA ADMIN DISEDIAKAN UNTUK PENGELOLAAN INDUSTRI SISTEM
                    </p>
                  </div>
                </div>

                {/* 3. HARGA JUAL MARKETPLACE (FINAL) */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-[#009B66] rounded-full"></div>
                    <h4 className="font-black text-sm text-[#1A1C29] uppercase tracking-wider">
                      3. HARGA JUAL MARKETPLACE (FINAL)
                    </h4>
                  </div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-3 mb-4">
                    HARGA AKHIR PER PAX YANG AKAN TAYANG DI APLIKASI JAMAAH
                  </p>

                  <div className="bg-[#131620] rounded-[2rem] p-8 sm:p-12 relative overflow-hidden text-center flex flex-col items-center justify-center shadow-2xl">
                    {/* Decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                    <div className="bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10 mb-6 z-10">
                      <span className="text-[9px] font-black text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Check
                          className="w-3 h-3 text-teal-400"
                          strokeWidth={3}
                        />{" "}
                        WISATA HALAL PACKAGE
                      </span>
                    </div>

                    <h1 className="font-black text-4xl sm:text-5xl text-white tracking-tight italic mb-3 z-10">
                      <span className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500 mr-2">
                        Rp
                      </span>
                      {finalPrice.toLocaleString("id-ID")}
                    </h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest z-10">
                      ALL-IN / PER PAX
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

        {(currentStepName === "MASKAPAI" ||
          currentStepName === "INFO LAND ARRANGEMENT") && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {formData.kategori === "UMRAH LA" ? (
              <div className="bg-[#FFFDF5] border border-[#FBECC8] rounded-[2rem] p-12 flex flex-col items-center justify-center text-center shadow-inner">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-[#FEEAC1] flex items-center justify-center mb-6">
                  <PlaneTakeoff
                    className="w-10 h-10 text-[#F59E0B]"
                    strokeWidth={2}
                  />
                </div>
                <h3 className="text-xl font-black text-[#1A1C29] tracking-wider mb-3">
                  KATEGORI LAND ARRANGEMENT
                </h3>
                <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest max-w-md leading-relaxed">
                  TIKET PESAWAT TIDAK TERMASUK DALAM PAKET INI.
                  <br />
                  MITRA HANYA MENYEDIAKAN AKOMODASI DI SAUDI.
                </p>
              </div>
            ) : (
              <>
                {/* Tipe Penerbangan */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">
                    Tipe Penerbangan
                  </label>
                  <div className="flex border border-gray-200 rounded-xl overflow-hidden p-1 bg-gray-50 max-w-2xl">
                    {["DIRECT", "TRANSIT"].map((type) => (
                      <button
                        key={type}
                        onClick={() =>
                          setFormData({ ...formData, tipePenerbangan: type })
                        }
                        className={`flex-1 py-3 text-sm font-bold transition-all rounded-lg ${
                          formData.tipePenerbangan === type
                            ? "bg-white text-emerald-600 border border-emerald-100 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Pilih Maskapai */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                      Pilih Maskapai
                    </label>
                    <select
                      value={formData.maskapaiId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        const selectedMaskapai = maskapaiList.find(
                          (m) => m.id === newId,
                        );

                        const newTglBerangkat = selectedMaskapai
                          ? selectedMaskapai.tanggalKeberangkatan
                          : formData.tglBerangkat;
                        let newTglPulang = formData.tglKepulangan;
                        if (newTglBerangkat) {
                          const dateObj = new Date(newTglBerangkat);
                          if (!isNaN(dateObj.getTime())) {
                            dateObj.setDate(
                              dateObj.getDate() +
                                (formData.durasiHari || 9) -
                                1,
                            );
                            newTglPulang = dateObj.toISOString().split("T")[0];
                          }
                        }

                        setFormData({
                          ...formData,
                          maskapaiId: newId,
                          estimasiHargaMaskapai: selectedMaskapai
                            ? selectedMaskapai.hargaJual || 0
                            : formData.estimasiHargaMaskapai || 0,
                          tglBerangkat: newTglBerangkat,
                          tglKepulangan: newTglPulang,
                          // If we haven't anchored a date yet, use this one as the anchor
                          // so the list doesn't shift unexpectedly if they keep clicking.
                          preferredDepartureDate: formData.preferredDepartureDate || newTglBerangkat
                        });
                      }}
                      className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800 font-medium appearance-none bg-white"
                    >
                      <option value="">-- Pilih Maskapai --</option>
                      {filteredMaskapaiList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.programDays || 9} Hari) ({m.tanggalKeberangkatan}) - Sisa:{" "}
                          {m.availableSeats}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kelas Penerbangan */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                      Kelas Penerbangan
                    </label>
                    <select
                      value={formData.kelasPenerbangan}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          kelasPenerbangan: e.target.value,
                        })
                      }
                      className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800 font-medium appearance-none bg-white"
                    >
                      <option value="Ekonomi">Ekonomi</option>
                      <option value="Bisnis">Bisnis</option>
                      <option value="First Class">First Class</option>
                    </select>
                  </div>
                </div>

                {/* Estimasi Harga Maskapai */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                    Estimasi Harga Maskapai (Per pax)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                      Rp
                    </span>
                    <input
                      type="text"
                      placeholder="0"
                      value={
                        formData.estimasiHargaMaskapai
                          ? Number(
                              formData.estimasiHargaMaskapai,
                            ).toLocaleString("id-ID")
                          : ""
                      }
                      onChange={(e) => {
                        const rawVal = e.target.value.replace(/\D/g, "");
                        setFormData({
                          ...formData,
                          estimasiHargaMaskapai: rawVal ? Number(rawVal) : 0,
                        });
                      }}
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800 font-bold transition-all"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {currentStepName === "HOTEL WISATA" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 relative pb-20">
            {/* Banner Header Dinamis */}
            <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-blue-900 text-lg uppercase tracking-wide">
                  PAKET WISATA {formData.negaraWisata || "TURKEY"}
                </h3>
                <p className="text-xs font-bold text-blue-600 uppercase mt-1">
                  DURASI PROGRAM: {formData.durasiWisata || 0} HARI
                </p>
              </div>
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Globe className="w-6 h-6 text-blue-500" />
              </div>
            </div>

            <div className="mt-8 mb-4">
              <label className="block text-[10px] sm:text-xs font-bold text-gray-900 uppercase tracking-wider">
                PILIH HOTEL WISATA
              </label>
            </div>

            {/* Search and Filters */}
            <div className="mb-4">
              <div className="relative mb-3">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={hotelSearchTerm}
                  onChange={(e) => setHotelSearchTerm(e.target.value)}
                  placeholder="Cari nama hotel wisata..."
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={hotelFilterBintang}
                  onChange={(e) => setHotelFilterBintang(e.target.value)}
                  className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 outline-none appearance-none"
                >
                  <option value="ALL">Semua Bintang</option>
                  <option value="5">Bintang 5</option>
                  <option value="4">Bintang 4</option>
                  <option value="3">Bintang 3</option>
                </select>
                <select className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 outline-none appearance-none">
                  <option>Harga Terendah</option>
                </select>
              </div>
            </div>

            {/* Hotel Cards Grid */}
            {(() => {
              const filtered = hotelsList
                .filter(
                  (h) =>
                    h.kota?.toLowerCase() !== "madinah" &&
                    h.kota?.toLowerCase() !== "makkah",
                )
                .filter((h) =>
                  h.nama?.toLowerCase().includes(hotelSearchTerm.toLowerCase()),
                )
                .filter(
                  (h) =>
                    hotelFilterBintang === "ALL" ||
                    String(h.bintang) === hotelFilterBintang,
                );

              const pageSize = 10;
              const totalPages = Math.ceil(filtered.length / pageSize);
              const paginated = filtered.slice(
                (hotelPage - 1) * pageSize,
                hotelPage * pageSize,
              );

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {paginated.map((hotel) => {
                      const isSelected = formData.hotelWisataId === hotel.id;
                      return (
                        <div
                          key={hotel.id}
                          onClick={() =>
                            setFormData({
                              ...formData,
                              hotelWisataId: hotel.id,
                            })
                          }
                          className={`bg-white rounded-2xl overflow-hidden border-2 cursor-pointer transition-all flex flex-col ${isSelected ? "border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.15)] ring-4 ring-blue-50" : "border-gray-100 hover:border-gray-300"}`}
                        >
                          <div className="h-44 overflow-hidden relative bg-gray-100 flex items-center justify-center shrink-0">
                            <img
                              src={getHotelImage(
                                hotel.id,
                                hotel.nama,
                                hotel.kota,
                              )}
                              alt={hotel.nama}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />

                            <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>
                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                              <div>
                                <h4 className="text-white drop-shadow-md font-black uppercase text-sm mb-1">
                                  {hotel.nama}
                                </h4>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] text-gray-700 bg-white/90 px-1.5 py-0.5 rounded font-bold uppercase w-fit">
                                    {hotel.kota}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {[...Array(hotel.bintang || 5)].map(
                                      (_, i) => (
                                        <Star
                                          key={i}
                                          className="w-3 h-3 fill-amber-500 text-amber-500"
                                        />
                                      ),
                                    )}
                                  </div>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                                  <Check className="w-3.5 h-3.5 text-white" />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="p-5 flex flex-col flex-1">
                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-3 border-b border-gray-100 pb-2">
                              ESTIMASI HARGA PER PAX (DURASI{" "}
                              {formData.durasiWisata} MALAM)
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-auto">
                              <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                                <div className="text-[9px] text-gray-500 font-bold uppercase mb-1">
                                  QUAD
                                </div>
                                <div className="text-blue-700 font-black text-xs">
                                  Rp{" "}
                                  {(
                                    (hotel.priceQuad ||
                                      hotel.pricePerNight ||
                                      0) * formData.durasiWisata
                                  ).toLocaleString("id-ID")}
                                </div>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                                <div className="text-[9px] text-gray-500 font-bold uppercase mb-1">
                                  TRIPLE
                                </div>
                                <div className="text-blue-700 font-black text-xs">
                                  Rp{" "}
                                  {(
                                    (hotel.priceTriple ||
                                      hotel.pricePerNight ||
                                      0) * formData.durasiWisata
                                  ).toLocaleString("id-ID")}
                                </div>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                                <div className="text-[9px] text-gray-500 font-bold uppercase mb-1">
                                  DOUBLE
                                </div>
                                <div className="text-blue-700 font-black text-xs">
                                  Rp{" "}
                                  {(
                                    (hotel.priceDouble ||
                                      hotel.pricePerNight ||
                                      0) * formData.durasiWisata
                                  ).toLocaleString("id-ID")}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mb-8">
                      <button
                        onClick={() =>
                          setHotelPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={hotelPage === 1}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-bold disabled:opacity-50 hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="text-xs font-bold text-gray-500">
                        Page {hotelPage} of {totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setHotelPage((prev) => Math.min(prev + 1, totalPages))
                        }
                        disabled={hotelPage === totalPages}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-bold disabled:opacity-50 hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Preview Itinerary Wisata */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-6">
                PREVIEW ITINERARY WISATA
              </h4>
              <div className="space-y-0 text-sm">
                {[...Array(Math.max(1, formData.durasiWisata))].map(
                  (_, idx) => (
                    <div key={idx} className="flex relative">
                      {/* Line connector */}
                      {idx < formData.durasiWisata - 1 && (
                        <div className="absolute left-[7px] top-6 bottom-0 w-[1px] bg-gray-300"></div>
                      )}

                      {/* Circle marker */}
                      <div className="w-4 h-4 rounded-full border-2 border-blue-500 bg-white z-10 shrink-0 mt-1 mr-4"></div>

                      <div className="pb-8">
                        <h5 className="font-bold text-gray-800 text-[11px] tracking-wider uppercase mb-1">
                          HARI KE-{idx + 1}: EKSPLORASI{" "}
                          {formData.negaraWisata || "TURKEY"}
                        </h5>
                        <p className="text-[10px] text-gray-500 leading-relaxed max-w-2xl">
                          Agenda itinerary sedang dalam penyusunan. Mengunjungi
                          destinasi populer dan penginapan di{" "}
                          {formData.negaraWisata || "Turkey"}. Termasuk makan
                          siang dan sarapan sesuai standar pelayanan yang
                          berlaku.
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        )}

        {(currentStepName === "HOTEL" || currentStepName === "HOTEL UMRAH") && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header sub-step */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
                <h3 className="font-bold text-gray-700 uppercase tracking-wide text-xs sm:text-sm">
                  Pilih Hotel DI{" "}
                  {hotelStep === "madinah"
                    ? "Madinah (Langkah 3.1)"
                    : "Makkah (Langkah 3.2)"}
                </h3>
              </div>
              <div className="flex bg-gray-100 rounded-full p-1 gap-1">
                <button
                  onClick={() => setHotelStep("madinah")}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${hotelStep === "madinah" ? "bg-emerald-100 text-emerald-700" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {hotelStep === "madinah" && <span className="mr-1">3.1</span>}
                  MADINAH
                </button>
                <button
                  onClick={() => setHotelStep("makkah")}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${hotelStep === "makkah" ? "bg-emerald-100 text-emerald-700" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {hotelStep === "makkah" && <span className="mr-1">3.2</span>}
                  MAKKAH
                </button>
              </div>
            </div>

            {/* Dark Blue Date Box */}
            <div className="bg-[#1e2336] rounded-xl p-4 flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 font-bold mb-1 block uppercase">
                  Check In
                </label>
                <input
                  type="date"
                  value={
                    hotelStep === "madinah"
                      ? formData.chkInMadinah
                      : formData.chkInMakkah
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    const dateVal = new Date(val);
                    if (hotelStep === "madinah") {
                      if (!isNaN(dateVal.getTime())) {
                        const outDate = new Date(dateVal);
                        outDate.setDate(
                          outDate.getDate() + (formData.durasiMadinah || 3),
                        );
                        setFormData({
                          ...formData,
                          chkInMadinah: val,
                          chkOutMadinah: outDate.toISOString().split("T")[0],
                        });
                      } else {
                        setFormData({ ...formData, chkInMadinah: val });
                      }
                    } else {
                      if (!isNaN(dateVal.getTime())) {
                        const outDate = new Date(dateVal);
                        outDate.setDate(
                          outDate.getDate() + (formData.durasiMakkah || 4),
                        );
                        setFormData({
                          ...formData,
                          chkInMakkah: val,
                          chkOutMakkah: outDate.toISOString().split("T")[0],
                        });
                      } else {
                        setFormData({ ...formData, chkInMakkah: val });
                      }
                    }
                  }}
                  className="w-full bg-[#151928] text-gray-300 px-3 py-2 rounded-lg border border-gray-700 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 font-bold mb-1 block uppercase">
                  Durasi Malam
                </label>
                <div className="flex items-center bg-[#151928] rounded-lg border border-gray-700 py-1.5 px-1">
                  <button
                    onClick={() => {
                      if (hotelStep === "madinah" && (Number(formData.durasiMadinah) || 0) > 1)
                        setFormData({
                          ...formData,
                          durasiMadinah: (Number(formData.durasiMadinah) || 0) - 1,
                        });
                      if (hotelStep === "makkah" && (Number(formData.durasiMakkah) || 0) > 1)
                        setFormData({
                          ...formData,
                          durasiMakkah: (Number(formData.durasiMakkah) || 0) - 1,
                        });
                    }}
                    className="px-3 text-gray-400 hover:text-white"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={
                      hotelStep === "madinah"
                        ? formData.durasiMadinah
                        : formData.durasiMakkah
                    }
                    className="w-full bg-transparent text-center text-white font-bold text-sm outline-none"
                    readOnly
                  />
                  <button
                    onClick={() => {
                      if (hotelStep === "madinah")
                        setFormData({
                          ...formData,
                          durasiMadinah: (Number(formData.durasiMadinah) || 0) + 1,
                        });
                      if (hotelStep === "makkah")
                        setFormData({
                          ...formData,
                          durasiMakkah: (Number(formData.durasiMakkah) || 0) + 1,
                        });
                    }}
                    className="px-3 text-gray-400 hover:text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 font-bold mb-1 block uppercase">
                  Check Out
                </label>
                <input
                  type="date"
                  min={
                    hotelStep === "madinah"
                      ? formData.chkInMadinah
                      : formData.chkInMakkah
                  }
                  max={formData.tglKepulangan || undefined}
                  value={
                    hotelStep === "madinah"
                      ? formData.chkOutMadinah
                      : formData.chkOutMakkah
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    const dateVal = new Date(val);
                    if (hotelStep === "madinah") {
                      const inDate = new Date(
                        formData.chkInMadinah || formData.tglBerangkat,
                      );
                      if (
                        !isNaN(dateVal.getTime()) &&
                        !isNaN(inDate.getTime())
                      ) {
                        const diff = Math.ceil(
                          (dateVal.getTime() - inDate.getTime()) /
                            (1000 * 3600 * 24),
                        );
                        setFormData({
                          ...formData,
                          chkOutMadinah: val,
                          durasiMadinah: Math.max(1, diff),
                        });
                      } else {
                        setFormData({ ...formData, chkOutMadinah: val });
                      }
                    } else {
                      const inDate = new Date(
                        formData.chkInMakkah ||
                          formData.chkOutMadinah ||
                          formData.tglBerangkat,
                      );
                      if (
                        !isNaN(dateVal.getTime()) &&
                        !isNaN(inDate.getTime())
                      ) {
                        const diff = Math.ceil(
                          (dateVal.getTime() - inDate.getTime()) /
                            (1000 * 3600 * 24),
                        );
                        setFormData({
                          ...formData,
                          chkOutMakkah: val,
                          durasiMakkah: Math.max(1, diff),
                        });
                      } else {
                        setFormData({ ...formData, chkOutMakkah: val });
                      }
                    }
                  }}
                  className="w-full bg-[#151928] text-gray-300 px-3 py-2 rounded-lg border border-gray-700 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex-1 flex items-end">
                <div className="w-full bg-[#0d4a3e] border border-[#166554] text-white rounded-lg p-2 flex flex-col items-center justify-center min-h-[42px]">
                  <span className="text-[10px] font-bold text-emerald-200">
                    PERJALANAN HARI
                  </span>
                  <span className="text-sm font-black text-white flex items-center gap-1">
                    <User className="w-3 h-3" />{" "}
                    {hotelStep === "madinah"
                      ? (formData.durasiMadinah || 3) + 1
                      : (formData.durasiMakkah || 4) + 1}{" "}
                    Hari /{" "}
                    {hotelStep === "madinah"
                      ? formData.durasiMadinah
                      : formData.durasiMakkah}{" "}
                    Malam
                  </span>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mb-4">
              <div className="relative mb-3">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={hotelSearchTerm}
                  onChange={(e) => setHotelSearchTerm(e.target.value)}
                  placeholder="Cari nama hotel..."
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={hotelFilterBintang}
                  onChange={(e) => setHotelFilterBintang(e.target.value)}
                  className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 outline-none appearance-none"
                >
                  <option value="ALL">Semua Bintang</option>
                  <option value="5">Bintang 5</option>
                  <option value="4">Bintang 4</option>
                  <option value="3">Bintang 3</option>
                </select>
                <select className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 outline-none appearance-none">
                  <option>Harga Terendah</option>
                </select>
              </div>
            </div>

            {/* Hotel Cards Grid */}
            {(() => {
              const checkDate = hotelStep === "madinah" 
                ? (formData.chkInMadinah || formData.tglBerangkat) 
                : (formData.chkInMakkah || formData.tglBerangkat);

              const filtered = hotelsList
                .filter((h) => h.kota?.toLowerCase() === hotelStep)
                .filter((h) => {
                  if (!checkDate) return true;
                  if (!h.seasons || h.seasons.length === 0) return true;
                  const dateObj = new Date(checkDate);
                  if (isNaN(dateObj.getTime())) return true;
                  return h.seasons.some((season) => isDateInRange(dateObj, season.range));
                })
                .filter((h) =>
                  h.nama?.toLowerCase().includes(hotelSearchTerm.toLowerCase()),
                )
                .filter(
                  (h) =>
                    hotelFilterBintang === "ALL" ||
                    String(h.bintang) === hotelFilterBintang,
                );

              const pageSize = 10;
              const totalPages = Math.ceil(filtered.length / pageSize);
              const paginated = filtered.slice(
                (hotelPage - 1) * pageSize,
                hotelPage * pageSize,
              );

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {paginated.map((hotel) => {
                      const isSelected =
                        hotelStep === "madinah"
                          ? formData.hotelMadinahId === hotel.id
                          : formData.hotelMakkahId === hotel.id;

                      const currentPriceQuad = getHotelPriceDynamic(hotel, checkDate, 'Quad');
                      const currentPriceTriple = getHotelPriceDynamic(hotel, checkDate, 'Triple');
                      const currentPriceDouble = getHotelPriceDynamic(hotel, checkDate, 'Double');

                      let seasonText = null;
                      if (checkDate && hotel.seasons && hotel.seasons.length > 0) {
                        const dateObj = new Date(checkDate);
                        if (!isNaN(dateObj.getTime())) {
                          const activeSeason = hotel.seasons.find((s) => isDateInRange(dateObj, s.range));
                          if (activeSeason) {
                            seasonText = activeSeason.range;
                          }
                        }
                      }

                      return (
                        <div
                          key={hotel.id}
                          onClick={() => {
                            if (hotelStep === "madinah")
                              setFormData({
                                ...formData,
                                hotelMadinahId: hotel.id,
                              });
                            else
                              setFormData({
                                ...formData,
                                hotelMakkahId: hotel.id,
                              });
                          }}
                          className={`bg-[#0b101e] rounded-2xl overflow-hidden border cursor-pointer transition-all flex flex-col relative min-h-[220px] group ${isSelected ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] ring-2 ring-blue-500" : "border-gray-800 hover:border-gray-600"}`}
                        >
                          {/* FULL BACKGROUND IMAGE */}
                          <div className="absolute inset-0">
                            <img
                              src={getHotelImage(
                                hotel.id,
                                hotel.nama,
                                hotel.kota,
                              )}
                              alt={hotel.nama}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            <div
                              className={`absolute inset-0 bg-gradient-to-t ${isSelected ? "from-blue-900/95 via-blue-900/80" : "from-[#0b101e]/95 via-[#0b101e]/80"} to-black/20`}
                            ></div>
                          </div>

                          <div className="p-4 flex flex-col flex-1 relative z-10 justify-between">
                            <div className="flex justify-between items-start mb-2">
                              <div className="pr-4">
                                <h4 className="text-white font-black uppercase text-[10px] sm:text-xs md:text-sm mb-1 line-clamp-2 drop-shadow-md">
                                  {hotel.nama}
                                </h4>
                                <p className="text-[8px] sm:text-[10px] text-gray-300 font-bold uppercase tracking-wider drop-shadow">
                                  {hotel.kota}
                                </p>
                              </div>
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors shadow-lg ${isSelected ? "bg-blue-500 text-white" : "bg-black/50 text-gray-400 border border-white/20"}`}
                              >
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </div>
                            </div>

                            <div className="mt-auto pt-4">
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm shrink-0">
                                  <Star className="w-2.5 h-2.5 fill-amber-400" />{" "}
                                  {hotel.bintang || 5}
                                </span>
                                {seasonText && (
                                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm min-w-0 flex-1">
                                    <Calendar className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate whitespace-nowrap">{seasonText}</span>
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-3 gap-1 md:gap-2">
                                <div className="bg-black/40 backdrop-blur-md rounded-lg p-1 md:p-2 text-center border border-white/10 flex flex-col justify-between min-w-0">
                                  <div className="text-[7px] md:text-[8px] text-gray-400 font-bold uppercase mb-0.5">
                                    QUAD
                                  </div>
                                  <div
                                    className="text-emerald-400 font-bold text-[8px] sm:text-xs whitespace-nowrap leading-tight"
                                    title={`Rp ${Math.round(currentPriceQuad || 0).toLocaleString("id-ID")}`}
                                  >
                                    <span className="text-[6px] md:text-[7px] mr-0.5 text-emerald-400/70">Rp</span>
                                    {Math.round(currentPriceQuad || 0).toLocaleString(
                                      "id-ID",
                                    )}
                                  </div>
                                  <div className="text-[5px] md:text-[7px] text-gray-500 mt-0.5 uppercase">
                                    PAX/MLM
                                  </div>
                                </div>
                                <div className="bg-black/40 backdrop-blur-md rounded-lg p-1 md:p-2 text-center border border-white/10 flex flex-col justify-between min-w-0">
                                  <div className="text-[7px] md:text-[8px] text-gray-400 font-bold uppercase mb-0.5">
                                    TRIPLE
                                  </div>
                                  <div
                                    className="text-emerald-400 font-bold text-[8px] sm:text-xs whitespace-nowrap leading-tight"
                                    title={`Rp ${Math.round(currentPriceTriple || 0).toLocaleString("id-ID")}`}
                                  >
                                    <span className="text-[6px] md:text-[7px] mr-0.5 text-emerald-400/70">Rp</span>
                                    {Math.round(currentPriceTriple || 0).toLocaleString(
                                      "id-ID",
                                    )}
                                  </div>
                                  <div className="text-[5px] md:text-[7px] text-gray-500 mt-0.5 uppercase">
                                    PAX/MLM
                                  </div>
                                </div>
                                <div className="bg-black/40 backdrop-blur-md rounded-lg p-1 md:p-2 text-center border border-white/10 flex flex-col justify-between min-w-0">
                                  <div className="text-[7px] md:text-[8px] text-gray-400 font-bold uppercase mb-0.5">
                                    DOUBLE
                                  </div>
                                  <div
                                    className="text-emerald-400 font-bold text-[8px] sm:text-xs whitespace-nowrap leading-tight"
                                    title={`Rp ${Math.round(currentPriceDouble || 0).toLocaleString("id-ID")}`}
                                  >
                                    <span className="text-[6px] md:text-[7px] mr-0.5 text-emerald-400/70">Rp</span>
                                    {Math.round(currentPriceDouble || 0).toLocaleString(
                                      "id-ID",
                                    )}
                                  </div>
                                  <div className="text-[5px] md:text-[7px] text-gray-500 mt-0.5 uppercase">
                                    PAX/MLM
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mb-8">
                      <button
                        onClick={() =>
                          setHotelPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={hotelPage === 1}
                        className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 text-xs font-bold disabled:opacity-50 hover:bg-gray-800"
                      >
                        Previous
                      </button>
                      <span className="text-xs font-bold text-gray-500">
                        Page {hotelPage} of {totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setHotelPage((prev) => Math.min(prev + 1, totalPages))
                        }
                        disabled={hotelPage === totalPages}
                        className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 text-xs font-bold disabled:opacity-50 hover:bg-gray-800"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Summary Box */}
            <div className="bg-[#07593c] rounded-2xl p-5 md:p-6 relative overflow-hidden mt-8">
              <Building2 className="absolute -right-6 -bottom-6 w-40 h-40 text-emerald-900/40 z-0" />

              <div className="flex items-center gap-2 mb-6 relative z-10">
                <Building2 className="w-5 h-5 text-emerald-300" />
                <h3 className="text-white font-black text-xs md:text-sm uppercase tracking-wider">
                  RINGKASAN ESTIMASI HARGA JUAL KOMPONEN HOTEL PER PAX
                </h3>
              </div>

              <div className="space-y-4 relative z-10">
                {["madinah", "makkah"].map((citySpan) => {
                  const hId =
                    citySpan === "madinah"
                      ? formData.hotelMadinahId
                      : formData.hotelMakkahId;
                  const durasi =
                    citySpan === "madinah"
                      ? parseNum(formData.durasiMadinah, 3)
                      : parseNum(formData.durasiMakkah, 4);
                  const hObj = hotelsList.find((h) => h.id === hId);

                  if (!hObj) return null;

                  const checkIn = citySpan === "madinah" ? (formData.chkInMadinah || formData.tglBerangkat) : (formData.chkInMakkah || formData.tglBerangkat);
                  const pQuad = getHotelPriceDynamic(hObj, checkIn, 'Quad');
                  const pTriple = getHotelPriceDynamic(hObj, checkIn, 'Triple');
                  const pDouble = getHotelPriceDynamic(hObj, checkIn, 'Double');

                  return (
                    <div
                      key={citySpan}
                      className="border border-[#116e4d] bg-[#0c6344] rounded-xl p-4"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider">
                          HOTEL {citySpan.toUpperCase()}: {hObj.nama} ★
                          {hObj.bintang || 5}
                        </span>
                        <span className="text-emerald-100 text-[10px] font-bold bg-[#116e4d] px-2 py-1 rounded-md">
                          {(durasi || 0) + 1} HARI {durasi} MALAM
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-[#167855] rounded-lg p-2.5 text-center border border-[#1e8c65]">
                          <div className="text-emerald-200 text-[9px] font-bold uppercase mb-1 tracking-wider">
                            QUAD
                          </div>
                          <div className="text-white font-black text-sm">
                            Rp{" "}
                            {Math.round(pQuad * durasi).toLocaleString(
                              "id-ID",
                            )}
                          </div>
                        </div>
                        <div className="bg-[#167855] rounded-lg p-2.5 text-center border border-[#1e8c65]">
                          <div className="text-emerald-200 text-[9px] font-bold uppercase mb-1 tracking-wider">
                            TRIPLE
                          </div>
                          <div className="text-white font-black text-sm">
                            Rp{" "}
                            {Math.round(pTriple * durasi).toLocaleString(
                              "id-ID",
                            )}
                          </div>
                        </div>
                        <div className="bg-[#167855] rounded-lg p-2.5 text-center border border-[#1e8c65]">
                          <div className="text-emerald-200 text-[9px] font-bold uppercase mb-1 tracking-wider">
                            DOUBLE
                          </div>
                          <div className="text-white font-black text-sm">
                            Rp{" "}
                            {Math.round(pDouble * durasi).toLocaleString(
                              "id-ID",
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-[#116e4d] mt-6 pt-5 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3 relative z-10">
                <div className="w-full sm:w-auto">
                  <div className="text-emerald-300 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5 sm:mb-1">
                    TOTAL ESTIMASI KOMPONEN HOTEL (QUAD)
                  </div>
                  <div className="text-white font-black text-xl sm:text-2xl flex items-baseline gap-1">
                    {(() => {
                      const hMadinah = hotelsList.find(
                        (h) => h.id === formData.hotelMadinahId,
                      );
                      const hMakkah = hotelsList.find(
                        (h) => h.id === formData.hotelMakkahId,
                      );
                      const dMadinah = parseNum(formData.durasiMadinah, 3);
                      const dMakkah = parseNum(formData.durasiMakkah, 4);

                      const chkMadinah = formData.chkInMadinah || formData.tglBerangkat;
                      const chkMakkah = formData.chkInMakkah || formData.tglBerangkat;
                      
                      const sum =
                        getHotelPriceDynamic(hMadinah, chkMadinah, 'Quad') * dMadinah +
                        getHotelPriceDynamic(hMakkah, chkMakkah, 'Quad') * dMakkah;
                      return `Rp ${Math.round(sum).toLocaleString("id-ID")}`;
                    })()}
                    <span className="text-[10px] sm:text-xs font-bold text-emerald-200">
                      / PAX
                    </span>
                  </div>
                </div>
                <div className="text-[7px] sm:text-[9px] font-bold text-emerald-300 italic opacity-80 sm:text-right w-full sm:w-auto">
                  *Harga sudah termasuk durasi menginap di kedua kota
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Layanan */}
        {currentStepName === "LAYANAN" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 relative pb-40">
            {/* Header sub-step */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
              <h3 className="font-bold text-gray-700 uppercase tracking-wide text-xs sm:text-sm">
                KONFIGURASI LAYANAN & OPERASIONAL (LANGKAH 4)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {layananList.map((item) => {
                const isGroup = !!item.isGroup;
                const isSelected = formData.selectedLayanan?.includes(item.id);
                // Also true if any of the group's sub-options are selected
                const isGroupSelected =
                  isSelected ||
                  (isGroup &&
                    item.options?.some((opt) =>
                      formData.selectedLayanan?.includes(opt.id),
                    ));

                const isWisata =
                  item.id.toLowerCase() === "wisata" ||
                  item.nama.toLowerCase() === "wisata" ||
                  item.nama.toLowerCase().includes("wisata/ziarah");

                // For grouped items, if selected, find the active option's price. Otherwise show minimum price.
                let displayPrice = item.harga || 0;
                if (isGroup) {
                  const activeOpt = item.options?.find((opt) =>
                    formData.selectedLayanan?.includes(opt.id),
                  );
                  if (activeOpt) {
                    displayPrice = activeOpt.price;
                  } else {
                    // Defaults to first price, or 0 if empty
                    displayPrice = item.options?.[0]?.price || 0;
                  }
                }

                // Helper to map realistic UI icons based on the real service name from the db:
                let Icon = ListCheck;
                const lowerName = item.nama.toLowerCase();
                if (
                  lowerName.includes("handling") ||
                  lowerName.includes("bandara")
                )
                  Icon = PlaneTakeoff;
                else if (
                  lowerName.includes("buss") ||
                  lowerName.includes("bus") ||
                  lowerName.includes("transportasi")
                )
                  Icon = Bus;
                else if (lowerName.includes("asuransi")) Icon = Shield;
                else if (
                  lowerName.includes("perlengkapan") ||
                  lowerName.includes("aksesoris")
                )
                  Icon = Briefcase;
                else if (
                  lowerName.includes("muthawwif") ||
                  lowerName.includes("guide") ||
                  lowerName.includes("leader")
                )
                  Icon = UserCheck;
                else if (lowerName.includes("visa")) Icon = FileText;
                else if (lowerName.includes("muassasah")) Icon = Layers;
                else if (
                  lowerName.includes("kereta") ||
                  lowerName.includes("train")
                )
                  Icon = Train;
                else if (lowerName.includes("manasik")) Icon = BookOpen;
                else if (
                  lowerName.includes("ziarah") ||
                  lowerName.includes("wisata")
                )
                  Icon = Map;

                return (
                  <div
                    key={item.id}
                    className="relative group flex flex-col h-full rounded-2xl border-2 transition-all cursor-pointer bg-white hover:border-gray-300 hover:shadow-md hover:bg-gray-50/50"
                    style={{
                      borderColor: isGroupSelected ? "#3b82f6" : undefined,
                      backgroundColor: isGroupSelected ? "#eff6ff" : undefined,
                      boxShadow: isGroupSelected
                        ? "0 8px 30px rgba(59,130,246,0.12)"
                        : undefined,
                    }}
                  >
                    <div
                      onClick={() => {
                        let currentSelections = formData.selectedLayanan || [];
                        if (
                          currentSelections.includes(item.id) ||
                          (isGroup &&
                            item.options?.some((o: LayananOption) =>
                              currentSelections.includes(o.id),
                            ))
                        ) {
                          // Deselect all
                          currentSelections = currentSelections.filter(
                            (id: string) =>
                              id !== item.id &&
                              (!isGroup ||
                                !item.options
                                  ?.map((o: LayananOption) => o.id)
                                  .includes(id)),
                          );
                        } else {
                          // Select main + auto select first option if group
                          currentSelections = [...currentSelections, item.id];
                          if (isGroup && item.options.length > 0) {
                            currentSelections.push(item.options[0].id);
                          }
                        }
                        setFormData({
                          ...formData,
                          selectedLayanan: currentSelections,
                        });
                      }}
                      className="flex flex-col flex-1 p-4"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                            isGroupSelected
                              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                              : "bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500"
                          }`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isGroupSelected
                              ? "bg-blue-600 text-white scale-110"
                              : "bg-transparent text-transparent border-2 border-gray-200 group-hover:border-blue-300"
                          }`}
                        >
                          <Check
                            className={`w-3.5 h-3.5 ${isGroupSelected ? "opacity-100" : "opacity-0"}`}
                            strokeWidth={3}
                          />
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col min-w-0">
                        <h4 className="font-black text-[#1A1C29] text-sm uppercase mb-1 tracking-wider">
                          {item.nama}
                        </h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest line-clamp-2 mb-6 leading-relaxed flex-1">
                          {item.deskripsi}
                        </p>

                        <div className="mt-auto flex items-end justify-between">
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">
                            BIAYA PER PAX
                          </div>
                          <div className="font-black text-lg text-blue-600">
                            Rp {displayPrice.toLocaleString("id-ID")}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Group Options */}
                    {isGroup && isGroupSelected && (
                      <div className="px-4 pb-4 w-full">
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                          <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 border-b-2 border-blue-50 pb-1.5 inline-block">
                            PILIHAN LAYANAN
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {item.options?.map((opt: LayananOption) => {
                              const isOptSelected =
                                formData.selectedLayanan?.includes(opt.id);
                              return (
                                <button
                                  key={opt.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Remove all options of this group from selected
                                    const wSelections = (
                                      formData.selectedLayanan || []
                                    ).filter(
                                      (id: string) =>
                                        !item.options
                                          ?.map((o: LayananOption) => o.id)
                                          .includes(id),
                                    );
                                    // Add this one
                                    wSelections.push(opt.id);
                                    setFormData({
                                      ...formData,
                                      selectedLayanan: wSelections,
                                    });
                                  }}
                                  className={`px-3 py-1.5 rounded-lg border text-[10px] transition-all flex items-center gap-1.5 ${
                                    isOptSelected
                                      ? "border-blue-600 bg-white text-gray-800 font-bold shadow-sm"
                                      : "border-gray-200 bg-white text-gray-400 font-medium hover:border-gray-300"
                                  }`}
                                >
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full ${isOptSelected ? "bg-blue-600" : "bg-gray-300"}`}
                                  ></div>
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Expandable Wisata Options (Non-group DB item) */}
                    {isWisata && isSelected && !isGroup && (
                      <div className="px-4 pb-4 w-full">
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-blue-100/50 animate-in fade-in slide-in-from-top-2">
                          {WISATA_OPTIONS.map((cat) => (
                            <div key={cat.category} className="mb-4 last:mb-0">
                              <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 border-b border-blue-100 pb-1 inline-block">
                                {cat.category}
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {cat.items.map((opt) => {
                                  const isOptSelected =
                                    formData.selectedWisata?.includes(opt);
                                  return (
                                    <button
                                      key={opt}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const wSelections =
                                          formData.selectedWisata || [];
                                        let newWSelections;
                                        if (wSelections.includes(opt)) {
                                          newWSelections = wSelections.filter(
                                            (w: string) => w !== opt,
                                          );
                                        } else {
                                          newWSelections = [
                                            ...wSelections,
                                            opt,
                                          ];
                                        }
                                        setFormData({
                                          ...formData,
                                          selectedWisata: newWSelections,
                                        });
                                      }}
                                      className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${
                                        isOptSelected
                                          ? "border-blue-600 bg-white text-gray-800 shadow-sm"
                                          : "border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300"
                                      }`}
                                    >
                                      <div
                                        className={`w-1.5 h-1.5 rounded-full ${isOptSelected ? "bg-amber-500" : "bg-gray-300"}`}
                                      ></div>
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total Beban Layanan Section */}
            <div className="relative sm:absolute sm:bottom-4 sm:left-4 sm:right-4 z-20 my-4 sm:my-0">
              <div className="bg-[#0f111a] rounded-2xl p-3 md:p-6 shadow-2xl relative overflow-hidden border border-white/5">
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent sm:hidden" />
                <Receipt className="absolute -right-4 -top-4 w-20 md:w-32 h-20 md:h-32 text-blue-500/5 z-0" />

                <div className="flex justify-between items-center mb-1.5 md:mb-6 relative z-10">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-7 h-7 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                      <Receipt className="w-3.5 h-3.5 md:w-5 md:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white font-black text-[9px] md:text-sm uppercase tracking-wider truncate">
                        TOTAL BEBAN LAYANAN
                      </h3>
                      <p className="hidden md:block text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">
                        AKUMULASI BIAYA OPERASIONAL PER PAX
                      </p>
                    </div>
                  </div>
                  <button className="px-2 py-0.5 md:px-3 md:py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md md:rounded-lg text-[8px] md:text-[10px] font-black text-gray-400 hover:text-white transition-all uppercase tracking-widest">
                    DETAIL
                  </button>
                </div>

                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <User className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-blue-500" />
                    </div>
                    <span className="text-[8px] md:text-xs font-black text-blue-400/80 uppercase tracking-widest">
                      PER PAX
                    </span>
                  </div>
                  <div className="text-white font-black text-xl md:text-4xl tabular-nums tracking-tight">
                    {(() => {
                      // Total sum correctly retrieves `.harga` from DB items explicitly matching ID
                      const total = layananList.reduce((sum, item) => {
                        let itemCost = 0;
                        if (item.isGroup) {
                          if (formData.selectedLayanan?.includes(item.id)) {
                            const selectedOpt = item.options?.find((opt: LayananOption) =>
                              formData.selectedLayanan?.includes(opt.id),
                            );
                            if (selectedOpt) itemCost = selectedOpt.price;
                          }
                        } else {
                          if (formData.selectedLayanan?.includes(item.id)) {
                            itemCost = Number(item.harga) || 0;
                          }
                        }
                        return sum + itemCost;
                      }, 0);
                      return `Rp ${Math.round(total).toLocaleString("id-ID")}`;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Harga & Review */}
        {currentStepName === "HARGA & REVIEW" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
              <h3 className="font-bold text-gray-700 uppercase tracking-wide text-xs sm:text-sm">
                LANGKAH 5: PERHITUNGAN HARGA & REVIEW PAKET
              </h3>
            </div>
            {(() => {
              const {
                baseQuad,
                baseTriple,
                baseDouble,
                finalQuad,
                finalTriple,
                finalDouble,
              } = pricingSummary;

                  // Values for UI Controls (The profit settings section)
                  const marginAdmin = Number(formData.marginBersih) || 0;
                  const adminFeeAdmin = marginAdmin * 0.1;
                  const totalMarkupAdmin = marginAdmin + adminFeeAdmin;

                  const marginMitra = isMitraContext ? (Number(formData.markup) || 0) : 0;
                  const adminFeeMitra = marginMitra * 0.1;
                  const totalMarkupMitra = marginMitra + adminFeeMitra;

                  const currentMarkup = isMitraContext ? marginMitra : marginAdmin;
                  const adminFeeDisplay = isMitraContext ? adminFeeMitra : adminFeeAdmin;
                  const totalMarkupDisplay = isMitraContext ? totalMarkupMitra : totalMarkupAdmin;

                  return (
                    <div className="space-y-8">
                      {/* Bagian 1: HPP Dasar */}
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest">
                            1. HPP DASAR PER TIPE KAMAR
                          </h4>
                          <div className="px-2 py-1 bg-gray-100 rounded text-[9px] font-bold text-gray-500">
                            BIAYA MODAL
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { title: "HPP QUAD", val: baseQuad },
                            { title: "HPP TRIPLE", val: baseTriple },
                            { title: "HPP DOUBLE", val: baseDouble },
                          ].map((item) => (
                            <div
                              key={item.title}
                              className="bg-white border border-gray-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]"
                            >
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                {item.title}
                              </span>
                              <span className="text-xl sm:text-2xl font-black text-gray-800 tracking-tighter">
                                Rp {Math.round(item.val || 0).toLocaleString("id-ID")}
                              </span>
                              <span className="text-[9px] font-bold text-gray-300 mt-1">
                                PER PAX
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bagian 2: Pengaturan Profit */}
                      <div>
                        <h4 className="text-[10px] sm:text-xs font-black text-blue-600 border-l-4 border-blue-600 pl-2 uppercase tracking-widest mb-4">
                          2. PENGATURAN PROFIT (UJROH MITRA)
                        </h4>

                        <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 text-center relative overflow-hidden">
                          <div className="inline-block relative z-10 w-full max-w-sm mx-auto">
                            <div className="flex items-center justify-between mb-2">
                              <button
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    [isMitraContext ? "markup" : "marginBersih"]: Math.max(0, currentMarkup - 50000),
                                  })
                                }
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border-2 border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors bg-white shadow-sm shrink-0"
                              >
                                <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>

                              <div className="flex-1 flex flex-col items-center px-2 sm:px-4 min-w-0">
                                <div className="flex items-start text-blue-600">
                                  <span className="text-sm sm:text-2xl font-black mt-1 sm:mt-2 italic mr-0.5 sm:mr-1">
                                    Rp
                                  </span>
                                  <span
                                    className="text-2xl sm:text-6xl font-black italic tracking-tighter truncate"
                                    style={{ fontFamily: "Impact, sans-serif" }}
                                  >
                                    {Math.round(currentMarkup || 0).toLocaleString("id-ID")}
                                  </span>
                                </div>
                                <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mt-1 sm:mt-2 whitespace-nowrap">
                                  MARGIN BERSIH
                                </span>
                              </div>

                              <button
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    [isMitraContext ? "markup" : "marginBersih"]: currentMarkup + 50000,
                                  })
                                }
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-colors shrink-0"
                              >
                                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-6 sm:mt-10 relative z-10 w-full max-w-lg mx-auto">
                            <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-gray-100 relative overflow-hidden flex flex-col items-start text-left">
                              <span className="text-[60px] sm:text-[80px] font-black text-gray-100 absolute -right-2 sm:-right-4 -bottom-4 sm:-bottom-6 italic leading-none select-none pointer-events-none">
                                %
                              </span>
                              <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 relative z-10">
                                ADMIN FEE (10%)
                              </span>
                              <span className="text-lg sm:text-xl font-black text-gray-800 italic relative z-10">
                                Rp {Math.round(adminFeeDisplay || 0).toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div className="bg-blue-50 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-blue-100 relative flex items-center justify-between text-left overflow-hidden">
                              <div className="flex flex-col items-start min-w-0 pr-6 sm:pr-8">
                                <span className="text-[8px] sm:text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5 sm:mb-1">
                                  TOTAL MARKUP
                                </span>
                                <span className="text-base sm:text-xl font-black text-blue-600 italic truncate">
                                  Rp {Math.round(totalMarkupDisplay || 0).toLocaleString("id-ID")}
                                </span>
                              </div>
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200/50">
                                <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                              </div>
                            </div>
                          </div>

                          <div className="text-[9px] font-bold text-gray-300 mt-6 uppercase tracking-widest">
                            DATA ADMIN DIGUNAKAN UNTUK PENGELOLAAN APLIKASI AMANAH.
                          </div>
                        </div>
                      </div>

                      {/* Bagian 3: Harga Final */}
                      <div className="pt-4">
                        <h4 className="text-[10px] sm:text-xs font-black text-[#009B66] border-l-4 border-[#009B66] pl-2 uppercase tracking-widest mb-4">
                          3. HARGA JUAL MARKETPLACE (FINAL)
                        </h4>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4 pl-3 -mt-2">
                          HARGA AKHIR PER PAX YANG AKAN TAYANG DI APLIKASI JAMAAH
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-center">
                          {[
                            {
                              title: "QUAD PACKAGE",
                              val: finalQuad,
                              type: "light",
                              tagColor: "text-[#009B66]",
                            },
                            {
                              title: "TRIPLE PACKAGE",
                              val: finalTriple,
                              type: "dark",
                              tagColor: "text-blue-400",
                            },
                            {
                              title: "DOUBLE PACKAGE",
                              val: finalDouble,
                              type: "light",
                              tagColor: "text-[#009B66]",
                            },
                          ].map((item) => (
                            <div
                              key={item.title}
                          className={
                            item.type === "dark"
                              ? "bg-[#111424] border border-gray-800 p-6 sm:p-8 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-2xl relative z-10 md:scale-110"
                              : "bg-white border border-gray-100 p-6 sm:p-8 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                          }
                        >
                          <div
                            className={`px-3 py-1 ${item.type === "dark" ? "bg-white/10 border-white/10" : "bg-[#F2FDF8] border-[#E5F9F1]"} border rounded-lg mb-4`}
                          >
                            <span
                              className={`text-[8px] font-black uppercase tracking-widest ${item.tagColor}`}
                            >
                              {item.title}
                            </span>
                          </div>
                          <div
                            className={
                              item.type === "dark"
                                ? "text-xl sm:text-2xl font-black text-white italic mb-2 tracking-tighter"
                                : "text-xl sm:text-2xl font-black text-gray-900 italic mb-2 tracking-tighter"
                            }
                          >
                            <span className="text-sm sm:text-lg mr-1 inline-block">
                              Rp
                            </span>
                            {Math.round(item.val || 0).toLocaleString("id-ID")}
                          </div>
                          <span
                            className={
                              item.type === "dark"
                                ? "text-[8px] font-bold text-gray-500 uppercase tracking-widest"
                                : "text-[8px] font-bold text-gray-400 uppercase tracking-widest"
                            }
                          >
                            ALL-IN / PER PAX
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Removed duplicate step 7 block */}

        {currentStepName === "REVIEW FASILITAS" &&
          formData.kategori !== "WISATA HALAL" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
              {/* Top Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
                <button 
                  onClick={() => handleExport('pdf')}
                  className="flex items-center justify-center gap-2 bg-[#1A1C29] text-white py-4 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-800 transition-colors shadow-lg"
                >
                  <FileText className="w-4 h-4" />
                  PDF DESKRIPSI
                </button>
                <button 
                  onClick={() => handleExport('jpg')}
                  className="flex items-center justify-center gap-2 bg-white border-2 border-[#1A1C29] text-[#1A1C29] py-4 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-colors shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  JPG DESKRIPSI
                </button>
                <button 
                  onClick={handleGenerateItinerary}
                  disabled={isAiLoading}
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isAiLoading ? "GENERATING..." : "GENERATE ITINERARY AI"}
                </button>
                <button 
                  onClick={handleGenerateMarketing}
                  disabled={isAiLoading}
                  className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isAiLoading ? "GENERATING..." : "GENERATE MARKETING AI"}
                </button>
              </div>

              <div ref={pdfExportRef} className="space-y-6">
                {(() => {
                  const {
                    hMadinah,
                    hMakkah,
                    hWisata,
                    hQuadMadinah,
                    hQuadMakkah,
                    hWisataTotal,
                    selectedLayananItems,
                    finalQuad,
                    finalTriple,
                    finalDouble,
                    adminFee
                  } = pricingSummary;

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <FileText className="w-5 h-5" />
                          </div>
                          <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">
                            INFORMASI DASAR PAKET
                          </h3>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                              NAMA PAKET IBADAH
                            </p>
                            <h4 className="text-xl sm:text-2xl font-black text-gray-800 italic uppercase">
                              {formData.nama || "UNTITLED PACKAGE"}
                            </h4>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                KATEGORI & PROGRAM
                              </p>
                              <p className="text-xs sm:text-sm font-black text-gray-700 uppercase">
                                {formData.kategori || "UMRAH REGULER"}{" "}
                                {formData.kategori === "UMRAH PLUS" &&
                                  `(+ ${formData.negaraWisata || "TURKEY"})`}{" "}
                                • {formData.periode || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                DURASI & JAMAAH
                              </p>
                              <p className="text-xs sm:text-sm font-black text-gray-700 uppercase">
                                {formData.durasiHari || 9} HARI{" "}
                                {formData.kategori === "UMRAH PLUS" &&
                                  `(${formData.durasiWisata || 0} HARI WISATA)`}{" "}
                                - {formData.targetJamaah} PAX
                              </p>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                KEBERANGKATAN
                              </p>
                              <p className="text-xs sm:text-sm font-black text-gray-700 uppercase flex items-center gap-2">
                                {formData.kotaKeberangkatan || "JAKARTA"}
                                <ArrowRight className="w-3 h-3 text-gray-400" />
                                {formData.kategori === "UMRAH PLUS" ? (
                                  <>
                                    {formData.alurPerjalanan ===
                                    "WISATA TERLEBIH DAHULU" ? (
                                      <>
                                        {formData.negaraWisata || "TURKEY"}{" "}
                                        <ArrowRight className="w-3 h-3 text-gray-400" />{" "}
                                        SAUDI
                                      </>
                                    ) : (
                                      <>
                                        SAUDI{" "}
                                        <ArrowRight className="w-3 h-3 text-gray-400" />{" "}
                                        {formData.negaraWisata || "TURKEY"}
                                      </>
                                    )}
                                  </>
                                ) : (
                                  "SAUDI"
                                )}
                              </p>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                TANGGAL & URUTAN
                              </p>
                              <p className="text-xs sm:text-sm font-black text-gray-700 uppercase">
                                {formData.tglBerangkat || "-"} •{" "}
                                {formData.kategori === "UMRAH PLUS"
                                  ? formData.alurPerjalanan
                                  : formData.urutanKunjungan ||
                                    "MADINAH-MAKKAH"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Check className="w-5 h-5" />
                          </div>
                          <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">
                            FASILITAS & RINCIAN HARGA
                          </h3>
                        </div>

                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                                <Plane className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-xs sm:text-sm text-gray-700 uppercase">
                                {maskapaiList.find(
                                  (m) => m.id === formData.maskapaiId,
                                )?.name || "MASKAPAI"}{" "}
                                ({formData.kelasPenerbangan || "EKONOMI"})
                              </span>
                            </div>
                            <span className="font-black text-xs sm:text-sm text-blue-600 italic">
                              Rp{" "}
                              {Number(
                                formData.estimasiHargaMaskapai || 0,
                              ).toLocaleString("id-ID")}
                            </span>
                          </div>

                          {formData.kategori === "UMRAH PLUS" && (
                            <div className="flex justify-between items-center py-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                                  <MapPin className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-xs sm:text-sm text-gray-700 uppercase">
                                  HOTEL {formData.negaraWisata || "TURKEY"} ★
                                  {hWisata?.bintang || 5} (
                                  {hWisata?.nama || "HILTON"} -{" "}
                                  {(formData.durasiWisata || 0) + 1} HARI{" "}
                                  {formData.durasiWisata || 0} MALAM)
                                </span>
                              </div>
                              <span className="font-black text-xs sm:text-sm text-blue-600 italic">
                                Rp {hWisataTotal.toLocaleString("id-ID")}
                              </span>
                            </div>
                          )}

                          {hMadinah && (
                            <div className="flex justify-between items-center py-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-xs sm:text-sm text-gray-700 uppercase">
                                  {hMadinah.nama} ★{hMadinah.bintang || 5} (
                                  {parseNum(formData.durasiMadinah, 3) + 1} HARI{" "}
                                  {parseNum(formData.durasiMadinah, 3)} MALAM)
                                </span>
                              </div>
                              <span className="font-black text-xs sm:text-sm text-blue-600 italic">
                                Rp{" "}
                                {Math.round(hQuadMadinah || 0).toLocaleString("id-ID")}
                              </span>
                            </div>
                          )}
                          {hMakkah && (
                            <div className="flex justify-between items-center py-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-xs sm:text-sm text-gray-700 uppercase">
                                  {hMakkah.nama} ★{hMakkah.bintang || 5} (
                                  {parseNum(formData.durasiMakkah, 4) + 1} HARI{" "}
                                  {parseNum(formData.durasiMakkah, 4)} MALAM)
                                </span>
                              </div>
                              <span className="font-black text-xs sm:text-sm text-blue-600 italic">
                                Rp {Math.round(hQuadMakkah || 0).toLocaleString("id-ID")}
                              </span>
                            </div>
                          )}

                          {selectedLayananItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 border-dashed"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                                    <Check className="w-4 h-4 text-emerald-500" />
                                  </div>
                                  <span className="font-bold text-xs sm:text-sm text-gray-700 uppercase">
                                    {item.nama}
                                  </span>
                                </div>
                                <span className="font-black text-xs sm:text-sm text-blue-600 italic">
                                  Rp {Math.round(item.harga || 0).toLocaleString("id-ID")}
                                </span>
                              </div>
                            ))}


                          {(pricingSummary.totalKomisiMitra > 0) && (
                            <>
                              <div className="flex justify-between items-center py-2 border-b border-gray-50 border-dashed">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                                    <Banknote className="w-4 h-4" />
                                  </div>
                                  <span className="font-bold text-xs sm:text-sm text-gray-700 uppercase">
                                    KOMISI MITRA
                                  </span>
                                </div>
                                <span className="font-black text-xs sm:text-sm text-blue-600 italic">
                                  Rp {pricingSummary.totalKomisiMitra.toLocaleString("id-ID")}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-50 border-dashed">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                                    <Banknote className="w-4 h-4" />
                                  </div>
                                  <span className="font-bold text-xs sm:text-sm text-gray-700 uppercase">
                                    KOMISI UMAROH
                                  </span>
                                </div>
                                <span className="font-black text-xs sm:text-sm text-blue-600 italic">
                                  Rp {pricingSummary.totalKomisiUmaroh.toLocaleString("id-ID")}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="lg:sticky lg:top-8 bg-[#1A1C29] rounded-[2rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden text-white border border-gray-800">
                      <Receipt className="absolute -right-8 -top-8 w-40 h-40 text-blue-900/20 z-0" />

                      <div className="relative z-10 text-center mb-8 pb-6 border-b border-gray-800">
                        <div className="inline-block px-4 py-1.5 rounded-full border border-blue-900/50 bg-blue-900/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-2">
                          HARGA JUAL FINAL
                        </div>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                          LUMRAH DIBAYARKAN JAMAAH
                        </p>
                      </div>

                      <div className="relative z-10 space-y-8">
                        {[
                          { title: "QUAD ROOM", val: finalQuad },
                          { title: "TRIPLE ROOM", val: finalTriple },
                          { title: "DOUBLE ROOM", val: finalDouble },
                        ].map((item, idx) => (
                          <div
                            key={item.title}
                            className={
                              idx !== 2 ? "border-b border-gray-800 pb-8" : ""
                            }
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {item.title}
                              </span>
                              <span className="px-2 py-0.5 bg-blue-600 rounded text-[8px] font-black italic">
                                PROFIT
                              </span>
                            </div>
                            <div className="text-xl sm:text-2xl font-black italic mb-1 flex items-baseline tracking-tighter">
                              <span className="text-sm mr-1 opacity-50">Rp</span>
                              {Math.round(item.val || 0).toLocaleString("id-ID")}
                            </div>
                            <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                              <Layers className="w-3 h-3" />
                              INC. ADMIN (RP{" "}
                              {Math.round(adminFee || 0).toLocaleString("id-ID")})
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
              </div>
            </div>
          )}

        {currentStepName === "RINGKASAN HARGA" &&
          formData.kategori === "WISATA HALAL" &&
          (() => {
            const { finalWisataPrice, wisataAdminFee, baseIDR, totalKomisiMitra: currentMargin } = pricingSummary;
            const adminFee = wisataAdminFee;
            const finalPrice = finalWisataPrice;

            return (
              <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                {/* Header Title */}
                <div className="flex flex-col items-center justify-center mb-8 relative">
                  <h3 className="text-xl sm:text-2xl font-black text-[#1A1C29] tracking-wider uppercase mb-1 italic">
                    RINGKASAN HARGA PAKET
                  </h3>
                  <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 tracking-widest uppercase">
                    RINCIAN BIAYA DAN HARGA JUAL FINAL JAMAAH
                  </p>
                      <div className="sm:absolute sm:right-0 top-0 mt-4 sm:mt-0 flex gap-2">
                        <button 
                          onClick={() => handleExport('pdf')}
                          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-[9px] font-bold text-gray-600 hover:bg-gray-50 transition-colors uppercase tracking-widest shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button 
                          onClick={() => handleExport('jpg')}
                          className="flex items-center gap-2 px-4 py-2 border border-blue-600 bg-blue-50 rounded-lg text-[9px] font-bold text-blue-600 hover:bg-blue-100 transition-colors uppercase tracking-widest shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" /> JPG
                        </button>
                      </div>
                </div>

                {/* Layout Content */}
                <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">
                  {/* Left Column: Details */}
                  <div className="flex-1 border border-gray-100 rounded-[2rem] p-6 lg:p-8 bg-white shadow-xl shadow-gray-200/40">
                    {/* INFORMASI DASAR PAKET */}
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <h4 className="font-black text-xs text-[#1A1C29] uppercase tracking-wider">
                            INFORMASI DASAR PAKET
                          </h4>
                        </div>
                        <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-[8px] font-bold text-gray-600 hover:bg-gray-50 uppercase">
                          <FileText className="w-3 h-3" /> PDF
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        <div>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                            NAMA PAKET
                          </p>
                          <h5 className="font-black text-xs text-gray-900 uppercase">
                            {formData.nama || "BELUM DIISI"}
                          </h5>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                            DESTINASI & NEGARA
                          </p>
                          <h5 className="font-black text-xs text-gray-900 uppercase">
                            {formData.urutanKunjungan || "BELUM DIISI"}
                          </h5>
                          <p className="text-[9px] font-black text-blue-600 uppercase mt-0.5">
                            {formData.negaraWisata || "BELUM DIISI"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                            TARGET JAMAAH & KEBERANGKATAN
                          </p>
                          <h5 className="font-black text-xs text-gray-900 uppercase">
                            {formData.targetJamaah || 0} PAX •{" "}
                            {formData.tglBerangkat || "BELUM DIISI"}
                          </h5>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                            DURASI & PILIHAN PAX
                          </p>
                          <h5 className="font-black text-xs text-gray-900 uppercase">
                            {formData.durasiHari || 0} HARI / PAX
                          </h5>
                        </div>
                      </div>
                    </div>

                    {/* FASILITAS TERMASUK */}
                    <div>
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                          <ListCheck className="w-4 h-4" />
                        </div>
                        <h4 className="font-black text-xs text-[#1A1C29] uppercase tracking-wider">
                          FASILITAS TERMASUK & RINCIAN HARGA
                        </h4>
                      </div>

                      <div className="space-y-4">
                        {/* Base items */}
                        <div className="flex items-center justify-between pb-3 border-b border-gray-50 border-dotted">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center text-gray-400">
                              <Plane className="w-3.5 h-3.5" />
                            </div>
                            <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider">
                              TIKET PESAWAT PP
                            </p>
                          </div>
                          <p className="text-[10px] font-bold text-gray-500 italic">
                            Termasuk dalam Paket Dasar
                          </p>
                        </div>
                        <div className="flex items-center justify-between pb-3 border-b border-gray-50 border-dotted">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-400">
                              <Building2 className="w-3.5 h-3.5" />
                            </div>
                            <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider">
                              AKOMODASI HOTEL WISATA
                            </p>
                          </div>
                          <p className="text-[10px] font-black text-gray-700 italic">
                            Rp {Math.round(baseIDR).toLocaleString("id-ID")}
                          </p>
                        </div>

                        {/* Addons List */}
                        {formData.wisataAddon_handling && (
                          <div className="flex items-center justify-between pb-3 border-b border-gray-50 border-dotted">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center text-gray-400">
                                <Shield className="w-3.5 h-3.5" />
                              </div>
                              <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider">
                                HANDLING DOMESTIK
                              </p>
                            </div>
                            <p className="text-[10px] font-black text-gray-700 italic">
                              Rp 250.000
                            </p>
                          </div>
                        )}

                        {formData.wisataAddon_travelKits && (
                          <div className="flex items-center justify-between pb-3 border-b border-gray-50 border-dotted">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center text-gray-400">
                                <Briefcase className="w-3.5 h-3.5" />
                              </div>
                              <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider">
                                TRAVEL KITS
                              </p>
                            </div>
                            <p className="text-[10px] font-black text-gray-700 italic">
                              Rp 250.000
                            </p>
                          </div>
                        )}

                        {formData.wisataAddon_tourLeader && (
                          <div className="flex items-center justify-between pb-3 border-b border-gray-50 border-dotted">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center text-gray-400">
                                <UserCheck className="w-3.5 h-3.5" />
                              </div>
                              <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider">
                                TOUR LEADER (
                                {formData.wisataAddon_tourLeaderCount || 1} PAX)
                              </p>
                            </div>
                            <p className="text-[10px] font-black text-gray-700 italic">
                              Rp{" "}
                              {Math.round(
                                250000 *
                                  (Number(formData.wisataAddon_tourLeaderCount) ||
                                    1),
                              ).toLocaleString("id-ID")}
                            </p>
                          </div>
                        )}

                        {/* Merch */}
                        {[
                          {
                            id: "koper",
                            name: "KOPER CUSTOM",
                            price: 1500000,
                            icon: Briefcase,
                          },
                          {
                            id: "slingbag",
                            name: "SLING BAG",
                            price: 50000,
                            icon: ShoppingBag,
                          },
                          {
                            id: "kaos",
                            name: "KAOS GRUP",
                            price: 150000,
                            icon: Shirt,
                          },
                          {
                            id: "jaket",
                            name: "JACKET GRUP",
                            price: 250000,
                            icon: Shirt,
                          },
                          {
                            id: "tasserut",
                            name: "TAS SERUT",
                            price: 25000,
                            icon: ShoppingBag,
                          },
                          {
                            id: "topi",
                            name: "TOPI",
                            price: 35000,
                            icon: User,
                          },
                          {
                            id: "spanduk",
                            name: "SPANDUK ROMBONGAN",
                            price: 150000,
                            icon: FileText,
                          },
                        ].map((item) => {
                          if (!formData[`wisataAddon_merch_${item.id}`])
                            return null;
                          const Icon = item.icon;
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between pb-3 border-b border-gray-50 border-dotted"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center text-gray-400">
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider">
                                  {item.name}
                                </p>
                              </div>
                              <p className="text-[10px] font-black text-gray-700 italic">
                                Rp {Math.round(item.price).toLocaleString("id-ID")}
                              </p>
                            </div>
                          );
                        })}

                        {/* Margins */}
                        <div className="flex items-center justify-between pt-2 pb-3 border-b border-gray-50 border-dotted">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-md bg-green-50 flex items-center justify-center text-green-500">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <p className="text-[10px] font-black text-green-600 uppercase tracking-wider">
                              KOMISI MITRA / PAX
                            </p>
                          </div>
                          <p className="text-[10px] font-black text-green-600 italic">
                            Rp {Math.round(currentMargin).toLocaleString("id-ID")}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pb-3 border-b border-gray-50 border-dotted mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center text-gray-400">
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </div>
                            <p className="text-[10px] font-black text-gray-700 uppercase tracking-wider">
                              ADMIN FEE (10%)
                            </p>
                          </div>
                          <p className="text-[10px] font-black text-gray-700 italic">
                            Rp {Math.round(adminFee).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Hero Final Price */}
                  <div className="w-full lg:w-[320px] bg-[#131620] rounded-[2rem] p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-0 right-[-20%] w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

                    <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 z-10">
                      HARGA JUAL FINAL
                    </h4>
                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-10 z-10">
                      PER PAX (ALL-IN)
                    </p>

                    <div className="z-10 mt-10 mb-8">
                      <h1 className="font-black text-2xl sm:text-4xl text-white tracking-tighter italic flex flex-col items-center">
                        <span className="text-sm sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500 mb-1">
                          Rp
                        </span>
                        {Math.round(finalPrice).toLocaleString("id-ID")}
                      </h1>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded border border-white/10 mt-4 z-10">
                      <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest">
                        HARGA JUAL JAMAAH
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

        {currentStepName === "PUBLIKASI & DESKRIPSI" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* 1. UPLOAD FOTO UTAMA */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-black mt-0.5">
                  1.
                </span>
                <div className="flex flex-col">
                  <h3 className="font-black text-gray-900 text-sm tracking-widest uppercase">
                    UPLOAD FOTO UTAMA PAKET
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    GUNAKAN FOTO TERBAIK UNTUK MENARIK JAMAAH
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div className="w-full h-80 border-2 border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer group relative overflow-hidden">
                  {formData.photoUtama ? (
                    <>
                      <img 
                        src={formData.photoUtama} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <ImagePlus className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">GANTI FOTO</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <ImagePlus className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-xs font-black text-gray-700 uppercase tracking-wider">
                        Klik atau seret foto ke sini
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 mt-2">
                        PNG, JPG (MAX 5MB)
                      </p>
                    </>
                  )}
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
              {/* 2. TIPE PUBLIKASI */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-black mt-0.5">
                    2.
                  </span>
                  <div className="flex flex-col">
                    <h3 className="font-black text-gray-900 text-sm tracking-widest uppercase">
                      TIPE PUBLIKASI
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    { id: "PAKET PRIBADI", icon: Lock },
                    { id: "TEMPLATE PUBLIK", icon: Globe },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        setFormData({ ...formData, tipePublikasi: item.id })
                      }
                      className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                        formData.tipePublikasi === item.id
                          ? "border-blue-600 bg-blue-50 text-blue-600 shadow-md"
                          : "border-gray-100 bg-white text-gray-400 hover:border-gray-200"
                      }`}
                    >
                      <item.icon className="w-8 h-8" strokeWidth={1.5} />
                      <span className="text-[10px] font-black tracking-widest uppercase text-center">
                        {item.id}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. TIPE PENJUALAN */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-black mt-0.5">
                    3.
                  </span>
                  <div className="flex flex-col">
                    <h3 className="font-black text-gray-900 text-sm tracking-widest uppercase">
                      TIPE PENJUALAN
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    { id: "JUAL SENDIRI", icon: User },
                    { id: "JUAL BERSAMA", icon: Users },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        setFormData({ ...formData, tipePenjualan: item.id })
                      }
                      className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                        formData.tipePenjualan === item.id
                          ? "border-blue-600 bg-blue-50 text-blue-600 shadow-md"
                          : "border-gray-100 bg-white text-gray-400 hover:border-gray-200"
                      }`}
                    >
                      <item.icon className="w-8 h-8" strokeWidth={1.5} />
                      <span className="text-[10px] font-black tracking-widest uppercase text-center">
                        {item.id}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bagian 4: Pembagian Hasil (hanya muncul jika jual bersama) */}
            {formData.tipePenjualan === "JUAL BERSAMA" && (
              <div className="bg-[#1A1C29] p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 mt-8 border border-gray-800">
                {/* Header Panel */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 pb-6 border-b border-gray-800 space-y-4 sm:space-y-0">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/30">
                      <ArrowRightLeft className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-emerald-400 font-black text-lg uppercase tracking-wide">
                        PEMBAGIAN HASIL (SHARING)
                      </h4>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                        TENTUKAN KOMISI UNTUK MITRA PENJUAL (RESELLER/AGEN)
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-emerald-950/40 border border-emerald-500/40 rounded-full text-emerald-400 text-[10px] font-black tracking-widest uppercase">
                    COLLABORATION
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-center z-10 relative">
                  {/* Left: Input Ujroh Partner */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Ujroh Sharing
                      </span>
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                        MAKS. RP{" "}
                        {Math.round(Number(formData.marginBersih) || 0).toLocaleString(
                          "id-ID",
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-[#11131C] border border-gray-800 rounded-2xl p-4 shadow-inner">
                      <button
                        onClick={() =>
                          setFormData({
                            ...formData,
                            ujrohPartner: Math.max(
                              0,
                              (Number(formData.ujrohPartner) || 0) - 50000,
                            ),
                          })
                        }
                        className="w-10 h-10 rounded-xl bg-gray-800 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <div className="text-2xl font-black italic">
                        Rp{" "}
                        {Math.round(Number(formData.ujrohPartner) || 0).toLocaleString(
                          "id-ID",
                        )}
                      </div>
                      <button
                        onClick={() =>
                          setFormData({
                            ...formData,
                            ujrohPartner: Math.min(
                              Number(formData.marginBersih) || 0,
                              (Number(formData.ujrohPartner) || 0) + 50000,
                            ),
                          })
                        }
                        className="w-10 h-10 rounded-xl bg-emerald-500 flex flex-col items-center justify-center text-emerald-950 hover:bg-emerald-400 hover:scale-105 transition-all"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Right: Breakdown Dashboard */}
                  <div className="border border-gray-800 rounded-2xl p-6 bg-[#11131C] space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-800">
                      <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">
                        UJROH ANDA (OWNER)
                      </span>
                      <span className="font-black text-sm sm:text-base italic text-white flex items-baseline gap-1">
                        Rp{" "}
                        {Math.round(
                          (Number(formData.marginBersih) || 0) -
                          (Number(formData.ujrohPartner) || 0)
                        ).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-gray-800">
                      <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">
                        UJROH PARTNER (SELLER)
                      </span>
                      <span className="font-black text-sm sm:text-base italic text-emerald-400">
                        Rp{" "}
                        {Math.round(Number(formData.ujrohPartner) || 0).toLocaleString(
                          "id-ID",
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[10px] sm:text-xs font-bold text-blue-400 uppercase tracking-widest">
                        TOTAL UJROH PAKET
                      </span>
                      <span className="font-black text-base sm:text-lg italic text-blue-400">
                        Rp{" "}
                        {Math.round(pricingSummary.totalKomisiMitra).toLocaleString(
                          "id-ID",
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStepName === "VALIDASI AKHIR" && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95 duration-500">
            {/* Design Icon Matched to Mockup */}
            <div className="relative mb-12">
              <div className="w-32 h-32 bg-[#F2FBF8] rounded-[2.5rem] flex items-center justify-center shadow-sm">
                 <div className="w-16 h-16 bg-[#009B66] rounded-full flex items-center justify-center ring-8 ring-[#D9F2E9]">
                    <Check className="w-10 h-10 text-white" strokeWidth={4} />
                 </div>
              </div>
            </div>

            <h3 className="text-4xl font-black text-[#1A1C29] mb-4 italic uppercase tracking-tighter">
              LUAR BIASA!
            </h3>
            <p className="text-xs font-black text-[#94A3B8] max-w-md mx-auto leading-relaxed mb-16 uppercase tracking-[0.2em]">
              PAKET {formData.kategori?.toUpperCase()} SIAP DIAJUKAN UNTUK VALIDASI OPERASIONAL.
            </p>

            <div className="flex flex-col items-center gap-6 w-full max-w-sm">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-4 py-6 bg-[#26D971] hover:bg-[#1EBE5F] text-white font-black rounded-[2.5rem] shadow-[0_20px_40px_-10px_rgba(38,217,113,0.3)] text-sm uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <div className="bg-white/20 p-2 rounded-lg">
                  <MessageCircle className="w-6 h-6 fill-white" />
                </div>
                {isSaving ? "MEMPROSES..." : "AJUKAN VALIDASI VIA WA"}
              </button>
              
              <button
                onClick={onCancel}
                className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.3em] hover:text-emerald-600 transition-colors py-2"
              >
                KEMBALI KE DASHBOARD
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      {currentStepName !== "VALIDASI AKHIR" &&
        (formData.kategori === "WISATA HALAL" &&
        currentStepName === "INFORMASI DASAR" ? (
          <div className="mt-8">
            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 px-8 py-4 font-bold rounded-xl transition-colors shadow-lg bg-[#009B66] hover:bg-[#008A5A] text-white shadow-[#009B66]/20 text-[10px] sm:text-xs uppercase tracking-widest"
            >
              LIHAT PAKET <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        ) : formData.kategori === "WISATA HALAL" &&
          currentStepName === "PILIH PAKET WISATA" ? (
          <div className="border-t border-gray-100 mt-10 pt-6 flex gap-4">
            <button
              onClick={handlePrev}
              className="flex-shrink-0 px-6 py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> KEMBALI
            </button>
            <button
              onClick={handleNext}
              disabled={!formData.paketWisataId}
              className="flex-1 flex items-center justify-center gap-2 px-8 py-4 font-bold rounded-xl transition-colors shadow-lg bg-[#009B66] hover:bg-[#008A5A] text-white shadow-[#009B66]/20 text-[10px] sm:text-xs uppercase tracking-widest disabled:opacity-50"
            >
              LANJUT DETAIL <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        ) : formData.kategori === "WISATA HALAL" &&
          currentStepName === "DETAIL INFO" ? (
          <div className="border-t border-gray-100 mt-10 pt-6 flex justify-between items-center bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
            <button
              onClick={handlePrev}
              className="px-6 py-3.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 flex items-center text-[10px] sm:text-xs uppercase tracking-widest"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> KEMBALI
            </button>
            <button
              onClick={handleNext}
              className="px-8 py-3.5 flex items-center gap-2 font-bold rounded-xl shadow-lg bg-[#009B66] hover:bg-[#008A5A] text-white shadow-[#009B66]/20 text-[10px] sm:text-xs uppercase tracking-widest"
            >
              LANJUT REVIEW <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        ) : formData.kategori === "WISATA HALAL" &&
          currentStepName === "LAYANAN TAMBAHAN" ? (
          <div className="border-t border-gray-100 mt-10 pt-6 flex justify-between items-center bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
            <button
              onClick={handlePrev}
              className="px-6 py-3.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 flex items-center text-[10px] sm:text-xs uppercase tracking-widest"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> KEMBALI
            </button>
            <button
              onClick={handleNext}
              className="px-8 py-3.5 flex items-center gap-2 font-bold rounded-xl shadow-lg bg-[#009B66] hover:bg-[#008A5A] text-white shadow-[#009B66]/20 text-[10px] sm:text-xs uppercase tracking-widest"
            >
              LANJUT SUMMARY <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        ) : formData.kategori === "WISATA HALAL" &&
          currentStepName === "REVIEW FASILITAS" ? (
          <div className="border-t border-gray-100 mt-10 pt-6 flex justify-between items-center bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
            <button
              onClick={handlePrev}
              className="px-6 py-3.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 flex items-center text-[10px] sm:text-xs uppercase tracking-widest"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> KEMBALI
            </button>
            <button
              onClick={handleNext}
              className="px-8 py-3.5 flex items-center gap-2 font-bold rounded-xl shadow-lg bg-[#009B66] hover:bg-[#008A5A] text-white shadow-[#009B66]/20 text-[10px] sm:text-xs uppercase tracking-widest"
            >
              LANJUT RINGKASAN <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        ) : formData.kategori === "WISATA HALAL" &&
          currentStepName === "RINGKASAN HARGA" ? (
          <div className="border-t border-gray-100 mt-10 pt-6 flex justify-between items-center bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
            <button
              onClick={handlePrev}
              className="px-6 py-3.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 flex items-center text-[10px] sm:text-xs uppercase tracking-widest"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> KEMBALI
            </button>
            <button
              onClick={handleNext}
              className="px-8 py-3.5 flex items-center gap-2 font-bold rounded-xl shadow-lg bg-[#009B66] hover:bg-[#008A5A] text-white shadow-[#009B66]/20 text-[10px] sm:text-xs uppercase tracking-widest"
            >
              LANJUT VALIDASI <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        ) : (
          <div className="border-t border-gray-100 mt-10 pt-6 flex justify-between items-center">
            {currentStep > 1 ? (
              <button
                onClick={handlePrev}
                className="px-6 py-3 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors"
              >
                Kembali
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={
                currentStep < currentStepsList.length
                  ? handleNext
                  : handleSave
              }
              disabled={isSaving}
              className={`flex items-center gap-2 px-8 py-3 font-bold rounded-xl transition-colors shadow-lg disabled:opacity-50 bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20`}
            >
              {isSaving
                ? "MENYIMPAN..."
                : currentStep < currentStepsList.length
                  ? "Lanjutkan"
                  : "SIMPAN & SELESAI"}
              {isSaving ? null : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        ))}

      {aiResult && (
        <AIResultModal
          title={aiResult.title}
          content={aiResult.content}
          onClose={() => setAiResult(null)}
          onSave={aiResult.title === "Marketing Content AI" ? (content) => setFormData({ ...formData, deskripsi: content }) : undefined}
        />
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col items-center">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-orange-500" />
            </div>
            
            <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight text-center">
              BELUM SELESAI!
            </h3>
            
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center leading-relaxed mb-8 px-4">
              ANDA SEDANG DALAM PROSES PEMBUATAN PAKET. APAKAH ANDA INGIN MENYIMPAN PROGRESS INI SEBAGAI DRAFT?
            </p>
            
            <div className="space-y-3 w-full">
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="w-full py-4 bg-[#009B66] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-[#009B66]/20 hover:bg-[#008A5A] transition-all disabled:opacity-50"
              >
                {isSaving ? "MENYIMPAN..." : "SIMPAN SEBAGAI DRAFT & KELUAR"}
              </button>
              
              <button
                onClick={onCancel}
                className="w-full py-4 bg-white border border-red-100 text-gray-600 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-red-50 transition-all"
              >
                KELUAR TANPA SIMPAN
              </button>
              
              <button
                onClick={() => setShowExitConfirmation(false)}
                className="w-full py-4 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-gray-600 transition-all mt-2"
              >
                LANJUTKAN EDIT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PDF TEMPLATE */}
      <div id="pdf-export-content" className="fixed -left-[9999px] top-0 bg-white text-gray-900 p-10 w-[210mm] min-h-[297mm]">
        {/* HEADER AREA */}
        <div className="flex items-center justify-center mb-10 pb-8 border-b-2 border-dashed border-gray-100">
           <div className="text-center">
             <div className="mb-4 flex justify-center">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <FileText className="w-10 h-10" />
                </div>
             </div>
             <h1 className="text-3xl font-black text-blue-900 uppercase">DESKRIPSI PAKET</h1>
             <p className="text-xs font-bold text-gray-400 uppercase mt-1">SISTEM INTEGRASI PAKET MASTER</p>
           </div>
        </div>

        {/* 1. INFORMASI DASAR PAKET (CARD) */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-black text-gray-900 text-sm uppercase tracking-wide">
              INFORMASI DASAR PAKET
            </h3>
          </div>

          <div className="space-y-10">
            <div className="text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                NAMA PAKET IBADAH
              </p>
              <h4 className="text-2xl font-black text-blue-900 uppercase">
                {formData.nama || "UNTITLED PACKAGE"}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-12">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Home className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">KATEGORI & PROGRAM</p>
                    <p className="text-sm font-black text-gray-700 uppercase">
                      {formData.kategori || "UMRAH REGULER"} {formData.kategori === "UMRAH PLUS" && `(+ ${formData.negaraWisata || "TURKEY"})`}
                    </p>
                 </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Calendar className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">DURASI & JAMAAH</p>
                    <p className="text-sm font-black text-gray-700 uppercase">
                      {formData.durasiHari || 9} HARI - {formData.targetJamaah || 45} PAX
                    </p>
                 </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Plane className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">KEBERANGKATAN</p>
                  <div className="text-[11px] font-black text-gray-700 uppercase flex items-center">
                    {formData.kotaKeberangkatan || "JAKARTA"} <span className="mx-1">→</span> SAUDI
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">TANGGAL & URUTAN</p>
                  <p className="text-[10px] font-black text-gray-700 uppercase leading-none">
                    {formData.tglBerangkat || "-"} | {formData.urutanKunjungan || "MADINAH-MAKKAH"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. FASILITAS (CARD) */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Check className="w-5 h-5" />
            </div>
            <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">
              FASILITAS & RINCIAN HARGA
            </h3>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center py-2 border-b border-gray-50 border-dashed">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                   <Plane className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm text-gray-800 uppercase">
                   {maskapaiList.find(m => m.id === formData.maskapaiId)?.name || 'MASKAPAI'} ({formData.kelasPenerbangan || 'EKONOMI'})
                </span>
              </div>
              <span className="font-black text-blue-700 italic">Rp {Number(formData.estimasiHargaMaskapai || 0).toLocaleString('id-ID')}</span>
            </div>

            {pricingSummary.hMadinah && (
              <div className="flex justify-between items-center py-2 border-b border-gray-50 border-dashed">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                     <Building2 className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm text-gray-800 uppercase">
                     {pricingSummary.hMadinah.nama} ★{pricingSummary.hMadinah.bintang || 5} ({parseNum(formData.durasiMadinah, 3)} MALAM)
                  </span>
                </div>
                <span className="font-black text-blue-700 italic">Rp {pricingSummary.hQuadMadinah.toLocaleString('id-ID')}</span>
              </div>
            )}

            {pricingSummary.hMakkah && (
              <div className="flex justify-between items-center py-2 border-b border-gray-50 border-dashed">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                     <Building2 className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm text-gray-800 uppercase">
                     {pricingSummary.hMakkah.nama} ★{pricingSummary.hMakkah.bintang || 5} ({parseNum(formData.durasiMakkah, 4)} MALAM)
                  </span>
                </div>
                <span className="font-black text-blue-700 italic">Rp {pricingSummary.hQuadMakkah.toLocaleString('id-ID')}</span>
              </div>
            )}

            {pricingSummary.selectedLayananItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-50 border-dashed">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                     <Check className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm text-gray-800 uppercase">{item.nama}</span>
                </div>
                <span className="font-black text-blue-700 italic">Rp {(item.harga || 0).toLocaleString('id-ID')}</span>
              </div>
            ))}


            {(pricingSummary.totalKomisiMitra > 0) && (
              <>
                <div className="flex justify-between items-center py-2 border-b border-gray-50 border-dashed">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                       <Banknote className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-sm text-gray-800 uppercase">
                      {isMitraContext ? 'KOMISI MITRA' : 'TOTAL UJROH PAKET'}
                    </span>
                  </div>
                  <span className="font-black text-blue-700 italic">Rp {pricingSummary.totalKomisiMitra.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50 border-dashed">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                       <Banknote className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-sm text-gray-800 uppercase">KOMISI UMAROH</span>
                  </div>
                  <span className="font-black text-blue-700 italic">Rp {pricingSummary.totalKomisiUmaroh.toLocaleString('id-ID')}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 3. HARGA FINAL (DARK CARD) */}
        <div className="bg-[#111424] rounded-[2.5rem] p-10 border border-gray-800 shadow-2xl relative overflow-hidden text-white">
           <Receipt className="absolute -right-12 -top-12 w-48 h-48 text-blue-900/10" />
           
           <div className="text-center mb-10 pb-8 border-b border-white/5 relative z-10">
              <div className="inline-block px-6 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-black uppercase tracking-widest mb-3">
                 HARGA JUAL FINAL
              </div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">LUMRAH DIBAYARKAN JAMAAH</p>
           </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 items-stretch">
               {[
                 { title: 'QUAD ROOM', val: pricingSummary.finalQuad },
                 { title: 'TRIPLE ROOM', val: pricingSummary.finalTriple },
                 { title: 'DOUBLE ROOM', val: pricingSummary.finalDouble },
               ].map((item) => (
                 <div key={item.title} className="text-center flex flex-col items-center flex-1">
                    <div className="mb-2">
                       <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{item.title}</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-black italic mb-2 text-white flex items-baseline justify-center tracking-tighter">
                       <span className="text-sm mr-1 opacity-50">Rp</span>
                       {Math.round(item.val || 0).toLocaleString('id-ID')}
                    </div>
                    <div className="flex flex-col items-center gap-1 text-[8px] text-gray-500 font-bold uppercase tracking-widest leading-tight">
                       <div className="flex items-center gap-1">
                        <Layers className="w-2.5 h-2.5" />
                        INC. ADMIN (RP {Math.round(pricingSummary.adminFee || 0).toLocaleString('id-ID')})
                       </div>
                    </div>
                 </div>
               ))}
            </div>
        </div>

        {/* Footer info */}
        <div className="mt-auto pt-20 grid grid-cols-2 gap-10">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-20 underline decoration-gray-100 underline-offset-8">Diketahui Oleh,</p>
            <div className="w-40 h-[2px] bg-gray-900/10 mx-auto mb-2"></div>
            <p className="text-[11px] font-black text-gray-900 uppercase">Direktur Operasional</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-20 underline decoration-gray-100 underline-offset-8">Disusun Oleh,</p>
            <div className="w-40 h-[2px] bg-gray-900/10 mx-auto mb-2"></div>
            <p className="text-[11px] font-black text-gray-900 uppercase">Paket Master System</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaketMasterWizard;
