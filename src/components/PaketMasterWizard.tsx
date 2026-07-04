import React, { useState, useEffect, useMemo } from "react";
import { isDateInRange } from "../utils/dateUtils";
import { useKurs } from "../hooks/useKurs";
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
  Edit3,
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
  auth,
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
import { HijriGregorianDatePicker } from "./HijriGregorianDatePicker";
import { getUmrahSeasonAndPeriod } from "../utils/dateUtils";
import { generateItinerary, generateMarketingCopy } from "../services/aiService";
import { sanitizeForHtml2Canvas, captureToDataUrl } from "../utils/exportUtils";
import { Capacitor } from '@capacitor/core';
import html2pdf from 'html2pdf.js';
import { INDONESIA_EMBARKASI, KATEGORI_PROGRAM } from '../constants';
import { getNormalizedHotelNameKey } from "./database/HotelMediaView";

import {
  Maskapai,
  WizardHotel,
  Layanan,
  LayananOption,
  Bandara,
  PaketWisata,
  WizardFormData,
} from "../types";

interface SimpleHotel {
  id: string;
  name?: string;
  nama?: string;
  city?: string;
  kota?: string;
  stars?: number;
  bintang?: number;
  priceQuad?: number;
  priceTriple?: number;
  priceDouble?: number;
  vendor?: string;
  mealPlan?: string;
  seasons?: Array<{
    range: string;
    prices: Array<{
      roomType: 'Quad' | 'Triple' | 'Double';
      price: number;
    }>;
  }>;
}

interface HotelMetaItem {
  id: string;
  hotelId: string;
  hotelName: string;
  city: string;
  photoUrl: string;
  distance: string;
  stars?: number;
}

const formatDateShort = (dateStr?: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  return `${d.getDate()}${months[d.getMonth()]}`;
};

interface PaketMasterWizardProps {
  initialData?: Partial<WizardFormData> & { id?: string; paketMasterId?: string; namaPaketMitra?: string };
  isMitraContext?: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialStepName?: string;
  autoDownloadPdf?: boolean;
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
  if (kategori === "TIKET ONLY") {
    return [
      "INFORMASI DASAR",
      "MASKAPAI",
      "HARGA & REVIEW",
      "REVIEW FASILITAS",
      "PUBLIKASI & DESKRIPSI",
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

const getHotelImages = (photoUrl: string | undefined, hotelId: string, hotelNama?: string, hotelKota?: string): string[] => {
  if (!photoUrl) {
    const fallback = getHotelImage(hotelId, hotelNama, hotelKota);
    return fallback ? [fallback] : [];
  }
  // Try to split by common separators: newline, semicolon, or comma
  const rawUrls = photoUrl.includes('\n')
    ? photoUrl.split('\n')
    : photoUrl.includes(';')
    ? photoUrl.split(';')
    : photoUrl.split(',');

  const urls = rawUrls
    .map((url) => url.trim())
    .filter((url) => url.startsWith("http") || url.startsWith("data:image"));

  if (urls.length === 0) {
    const fallback = getHotelImage(hotelId, hotelNama, hotelKota);
    return fallback ? [fallback] : [];
  }
  return urls;
};

interface HotelImageCarouselProps {
  images: string[];
  hotelName: string;
  kota?: string;
}

const HotelImageCarousel: React.FC<HotelImageCarouselProps> = ({ images, hotelName, kota }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        // Find next non-failed index if possible
        let nextIndex = (prevIndex + 1) % images.length;
        for (let i = 0; i < images.length; i++) {
          if (!failedImages[nextIndex]) {
            return nextIndex;
          }
          nextIndex = (nextIndex + 1) % images.length;
        }
        return prevIndex;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [images, failedImages]);

  const handleImageError = (index: number) => {
    setFailedImages((prev) => ({ ...prev, [index]: true }));
  };

  const isAllFailed = images.length === 0 || images.every((_, idx) => failedImages[idx]);

  if (isAllFailed) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950/85 to-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
        {/* Modern ambient radial lighting */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-65"></div>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/25 to-transparent"></div>
        
        {/* Soft luxury glow-ring with hotel icon */}
        <div className="relative mb-3 p-3.5 bg-blue-500/10 rounded-2xl border border-blue-500/20 backdrop-blur-md shadow-inner transition-transform duration-300 hover:scale-110">
          <Building2 className="w-8 h-8 text-blue-400" />
        </div>
        
        {/* Clean, readable text */}
        <span className="text-xs font-bold text-slate-200 uppercase tracking-wider text-center max-w-[90%] truncate px-2">
          {hotelName}
        </span>
        <span className="text-[10px] text-slate-500 font-semibold tracking-wider mt-1 uppercase">
          {kota || "Makkah/Madinah"} Hotel
        </span>
      </div>
    );
  }

  // Find first index that hasn't failed to show as default
  const validIndex = failedImages[currentIndex] ? images.findIndex((_, idx) => !failedImages[idx]) : currentIndex;
  const activeIndex = validIndex !== -1 ? validIndex : 0;

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      {images.map((img, idx) => {
        if (failedImages[idx]) return null;
        return (
          <img
            key={idx}
            src={img}
            alt={`${hotelName} - ${idx + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${
              idx === activeIndex ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
            }`}
            referrerPolicy="no-referrer"
            onError={() => handleImageError(idx)}
          />
        );
      })}
      
      {/* Visual indicators for slides */}
      {images.filter((_, idx) => !failedImages[idx]).length > 1 && (
        <div className="absolute bottom-3 right-3 flex gap-1 z-10 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 shadow-sm">
          {images.map((_, idx) => {
            if (failedImages[idx]) return null;
            return (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  idx === activeIndex ? "bg-blue-400 w-3" : "bg-white/40"
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

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

const getFallbackDistance = (id: string, name?: string): string => {
  const norm = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (norm.includes("millenniumalaqeeq") || id === "millennium-al-aqeeq-diar") return "50m ke Pelataran";
  if (norm.includes("harithia") || norm.includes("haritzia") || id === "al-harithia-diar") return "70m ke Pelataran";
  if (norm.includes("daraleiman") || id === "dar-al-eiman-al-haram") return "100m ke Pelataran";
  if (norm.includes("rotana")) return "50m ke Pelataran";
  if (norm.includes("movenpick") || norm.includes("moevenpick")) return "50m ke Pelataran";
  if (norm.includes("safwa")) return "50m ke Pelataran";
  if (norm.includes("taibafront") || norm.includes("taibahfront")) return "120m ke Pelataran";
  if (norm.includes("shazaregency")) return "100m ke Pelataran";
  if (norm.includes("rove")) return "150m ke Pelataran";
  if (norm.includes("makkah") && norm.includes("tower")) return "80m ke Pelataran";
  if (norm.includes("azka")) return "150m ke Pelataran";
  if (norm.includes("massa") || norm.includes("masah")) return "200m ke Pelataran";
  if (norm.includes("meridien") || norm.includes("miredien")) return "250m ke Pelataran";
  if (norm.includes("pullman") || norm.includes("zamzam")) return "50m ke Pelataran";
  return "";
};

export const PaketMasterWizard: React.FC<PaketMasterWizardProps> = ({
  initialData,
  isMitraContext = false,
  onCancel,
  onSuccess,
  initialStepName,
  autoDownloadPdf = false,
}) => {
  const { kurs: masterKurs } = useKurs();
  const effectiveKursSar = initialData?.kursSar || masterKurs.sarToIdr || 4900;
  const effectiveKursUsd = initialData?.kursUsd || masterKurs.usdToIdr || 20000;

  const [currentStep, setCurrentStep] = useState(() => {
    if (initialStepName) {
      const steps = getSteps(initialData?.kategori || "UMRAH REGULAR");
      const idx = steps.indexOf(initialStepName);
      if (idx !== -1) {
        return idx + 1;
      }
    }
    return 1;
  });
  const [hotelStep, setHotelStep] = useState<"madinah" | "makkah">("madinah");
  const [maskapaiList, setMaskapaiList] = useState<Maskapai[]>([]);
  const [hotelsList, setHotelsList] = useState<WizardHotel[]>([]);
  const [hotelMetas, setHotelMetas] = useState<HotelMetaItem[]>([]);
  const [dbLayananList, setDbLayananList] = useState<Layanan[]>([]);
  const [bandaraList, setBandaraList] = useState<Bandara[]>([]);
  const [paketWisataList, setPaketWisataList] = useState<PaketWisata[]>([]);
  const [createdDocId, setCreatedDocId] = useState<string | null>(() => initialData?.id || null);
  const [selectedAirlineBrand, setSelectedAirlineBrand] = useState<string>("");
  const [isEditingItinerary, setIsEditingItinerary] = useState<boolean>(false);

  const [aiResult, setAiResult] = useState<{ title: string; content: string } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const pdfExportRef = React.useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState("Paket Master System");

  useEffect(() => {
    let unsubUser: () => void = () => {};
    const currentUser = auth.currentUser;
    if (currentUser) {
      if (currentUser.displayName) {
        setUserName(currentUser.displayName);
      } else if (currentUser.email) {
        setUserName(currentUser.email.split("@")[0]);
      }

      try {
        const userRef = doc(db, "users", currentUser.uid);
        unsubUser = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const fullName = data.namaLengkap || data.name || data.displayName;
            if (fullName) {
              setUserName(fullName);
            }
          }
        }, (err) => {
          console.warn("Could not fetch user name from firestore:", err);
        });
      } catch (err) {
        console.warn("Error setting up user listener:", err);
      }
    }
    return () => {
      unsubUser();
    };
  }, []);

  useEffect(() => {
    if (autoDownloadPdf) {
      const timer = setTimeout(() => {
        handleExport('pdf').then(() => {
          onCancel();
        }).catch((err) => {
          console.error("Auto download failed:", err);
          onCancel();
        });
      }, 1000); // 1000ms is standard to ensure everything has loaded/rendered in DOM
      return () => clearTimeout(timer);
    }
  }, [autoDownloadPdf]);

  const parseNum = (val: string | number | undefined, def = 0): number => {
    const n = Number(val);
    return isNaN(n) ? def : n;
  };

  const getMetaForHotelInternal = (hotelId: string, hotelName: string, hotelCity?: string) => {
    if (!hotelMetas || hotelMetas.length === 0) return undefined;
    
    const targetNorm = getNormalizedHotelNameKey(hotelName);
    const targetCityNorm = hotelCity 
      ? hotelCity.toLowerCase()
          .replace(/mecca/g, "makkah")
          .replace(/mekkah/g, "makkah")
          .replace(/medina/g, "madinah")
          .replace(/medinah/g, "madinah")
          .replace(/[^a-z]/g, "") 
      : "";
    
    return hotelMetas.find(m => {
      if (m.hotelId === hotelId) return true;
      if (m.hotelName && hotelName && m.hotelName.toLowerCase() === hotelName.toLowerCase()) return true;
      
      const mNorm = getNormalizedHotelNameKey(m.hotelName);
      const mCityNorm = m.city 
        ? m.city.toLowerCase()
            .replace(/mecca/g, "makkah")
            .replace(/mekkah/g, "makkah")
            .replace(/medina/g, "madinah")
            .replace(/medinah/g, "madinah")
            .replace(/[^a-z]/g, "") 
        : "";
      
      if (targetNorm && mNorm === targetNorm) {
        if (targetCityNorm && mCityNorm) {
          return targetCityNorm === mCityNorm;
        }
        return true;
      }
      return false;
    });
  };

  const getHelperStars = (hotelId?: string, defaultStars?: number): number => {
    if (!hotelId) return defaultStars || 5;
    const hotel = hotelsList.find((h) => h.id === hotelId);
    const hotelName = hotel?.nama || "";
    const hotelCity = hotel?.kota || "";
    const meta = getMetaForHotelInternal(hotelId, hotelName, hotelCity);
    return meta?.stars || hotel?.bintang || defaultStars || 5;
  };

  const getHotelDistanceInternal = (hotel: WizardHotel): string => {
    const metaObj = getMetaForHotelInternal(hotel.id, hotel.nama, hotel.kota);
    return metaObj?.distance || getFallbackDistance(hotel.id, hotel.nama) || "";
  };

  const parseDistanceInMeters = (distanceStr: string): number => {
    const norm = distanceStr.toLowerCase();
    
    // 1. Match meter number first (e.g. "50m", "150m") to avoid incorrect semantic fallbacks
    const match = norm.match(/(\d+)\s*m/);
    if (match) {
      return parseInt(match[1], 10);
    }
    
    // 2. Match kilometer number
    if (norm.includes("km")) {
      const matchK = norm.match(/([\d.]+)\s*km/);
      if (matchK) {
        return Math.round(parseFloat(matchK[1]) * 1000);
      }
    }

    // 3. Text/Semantic fallbacks
    if (
      norm.includes("sangat dekat") ||
      norm.includes("halaman masjid") ||
      norm.includes("depan masjid") ||
      norm.includes("sebelah masjid") ||
      norm.includes("nol meter") ||
      norm.includes("menempel")
    ) {
      return 50;
    }

    if (norm.includes("pelataran") || norm.includes("halaman")) {
      return 100;
    }

    if (norm.trim() === "") {
      return 9999;
    }

    return 200;
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
    flightItinerary: "",
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
    if (isMitraContext && !base.mitraId) {
      base.mitraId = auth.currentUser?.uid || null;
    }
    if (base.tglBerangkat && !base.preferredDepartureDate) {
      base.preferredDepartureDate = base.tglBerangkat;
    }
    // Fallback for loading existing packages created by Mitra where markup wasn't saved separately
    if (base.mitraId && base.markup === undefined && base.marginBersih !== undefined) {
      base.markup = base.marginBersih;
    }
    return base;
  });

  // Helper to identify the brand of a maskapai
  const getAirlineBrand = (name: string): string => {
    const upper = (name || "").toUpperCase();
    if (upper.includes("SAUDIA") || upper.includes("SAUDI") || upper.includes("SV")) return "SAUDIA";
    if (upper.includes("GARUDA") || upper.includes("GA")) return "GARUDA";
    if (upper.includes("LION") || upper.includes("JT")) return "LION";
    if (upper.includes("BATIK") || upper.includes("ID")) return "BATIK";
    if (upper.includes("PELITA")) return "PELITA";
    if (upper.includes("QATAR") || upper.includes("QR")) return "QATAR";
    if (upper.includes("EMIRATES") || upper.includes("EK")) return "EMIRATES";
    if (upper.includes("OMAN") || upper.includes("WY")) return "OMAN";
    if (upper.includes("TURKISH") || upper.includes("TK")) return "TURKISH";
    if (upper.includes("ETIHAD") || upper.includes("EY")) return "ETIHAD";
    if (upper.includes("SINGAPORE") || upper.includes("SQ")) return "SINGAPORE";
    if (upper.includes("MALAYSIA") || upper.includes("MH")) return "MALAYSIA";
    if (upper.includes("SCOOT") || upper.includes("TR")) return "SCOOT";
    if (upper.includes("GULF") || upper.includes("GF")) return "GULF";
    if (upper.includes("FLYNAS") || upper.includes("XY")) return "FLYNAS";
    return "LAINNYA";
  };

  // Helper to parse text-based itinerary into structured segments
  const parseItineraryLines = (itineraryText: string) => {
    const lines = (itineraryText || "").split("\n").map(l => l.trim()).filter(Boolean);
    const flightsParsed = [];
    const flightRegex = /(\d{1,2}[A-Za-z]{3})\s+([A-Za-z]{2}\d+)\s+([A-Za-z]{6})\s+(\d{4})\s+(\d{4}(?:\+\d)?)/i;
    
    for (const line of lines) {
      const match = line.match(flightRegex);
      if (match) {
        const date = match[1];
        const flightNo = match[2];
        const route = match[3];
        const depTime = match[4];
        const arrTime = match[5];
        
        const origin = route.substring(0, 3).toUpperCase();
        const destination = route.substring(3, 6).toUpperCase();
        
        const formatTime = (t: string) => {
          if (t.length >= 4) {
            return `${t.substring(0, 2)}:${t.substring(2, 4)}`;
          }
          return t;
        };
        
        flightsParsed.push({
          date,
          flightNo: flightNo.toUpperCase(),
          origin,
          destination,
          depTime: formatTime(depTime),
          arrTime: formatTime(arrTime),
          originalLine: line
        });
      }
    }
    return flightsParsed;
  };

  // Dynamic brand extraction from master database (maskapaiList)
  const dynamicBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    const brandsList: { value: string; label: string }[] = [];
    
    const prettyNames: Record<string, string> = {
      SAUDIA: "Saudi Arabian Airlines (SV)",
      GARUDA: "Garuda Indonesia (GA)",
      LION: "Lion Air (JT)",
      BATIK: "Batik Air (ID)",
      PELITA: "Pelita Air",
      QATAR: "Qatar Airways (QR)",
      EMIRATES: "Emirates (EK)",
      OMAN: "Oman Air (WY)",
      TURKISH: "Turkish Airlines (TK)",
      ETIHAD: "Etihad Airways (EY)",
      SINGAPORE: "Singapore Airlines (SQ)",
      MALAYSIA: "Malaysia Airlines (MH)",
      SCOOT: "Scoot (TR)",
      GULF: "Gulf Air (GF)",
      FLYNAS: "Flynas (XY)",
      INDIGO: "IndiGo Airlines (6E)",
      HAINAN: "Hainan Airlines (HU)",
    };

    const filteredMaskapais = maskapaiList.filter((m) => {
      if (m.tipePenerbangan) return m.tipePenerbangan === formData.tipePenerbangan;
      
      const name = (m.name || "").toUpperCase();
      const directAirlines = ["GARUDA", "SAUDI", "SAUDIA", "LION", "BATIK", "PELITA", "AIRFAST", "JT", "ID", "GA", "SV"];
      const isKnownDirect = directAirlines.some(brand => {
        const regex = new RegExp(`\\b${brand}\\b`, 'i');
        return regex.test(name);
      });
      
      if (formData.tipePenerbangan === "TRANSIT") return !isKnownDirect;
      if (formData.tipePenerbangan === "DIRECT") return isKnownDirect;
      return true;
    });

    filteredMaskapais.forEach((m) => {
      const brand = getAirlineBrand(m.name);
      if (brand && brand !== "LAINNYA" && !brandsSet.has(brand)) {
        brandsSet.add(brand);
        const label = prettyNames[brand] || `${brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase()} Airlines`;
        brandsList.push({ value: brand, label });
      }
    });

    const allAirlinesUpper = maskapaiList.map(m => (m.name || "").toUpperCase());
    const hasIndigo = allAirlinesUpper.some(name => name.includes("INDIGO") || name.includes("6E"));
    const hasHainan = allAirlinesUpper.some(name => name.includes("HAINAN") || name.includes("HU"));

    if (hasIndigo && formData.tipePenerbangan === "TRANSIT" && !brandsSet.has("INDIGO")) {
      brandsList.push({ value: "INDIGO", label: "IndiGo Airlines (6E)" });
    }
    if (hasHainan && formData.tipePenerbangan === "TRANSIT" && !brandsSet.has("HAINAN")) {
      brandsList.push({ value: "HAINAN", label: "Hainan Airlines (HU)" });
    }

    return brandsList.sort((a, b) => a.label.localeCompare(b.label));
  }, [maskapaiList, formData.tipePenerbangan]);

  // Dynamic destination display formatting (e.g. JEDDAH (JED))
  const destinationDisplay = useMemo(() => {
    if (!formData.kotaTujuan) return "JEDDAH (JED)";
    
    const target = formData.kotaTujuan.toUpperCase();
    const match = bandaraList.find(b => 
      (b.kota || "").toUpperCase() === target ||
      (b.kode || "").toUpperCase() === target ||
      target.includes((b.kota || "").toUpperCase())
    );
    
    if (match) {
      return `${(match.kota || "").toUpperCase()} (${(match.kode || "").toUpperCase()})`;
    }
    
    if (target.includes("(")) {
      return target;
    }
    
    return target;
  }, [formData.kotaTujuan, bandaraList]);

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

    // Filter by Selected Airline Brand (Tipe Maskapai / Pesawat)
    if (selectedAirlineBrand) {
      list = list.filter((m) => {
        const brand = getAirlineBrand(m.name);
        return brand === selectedAirlineBrand;
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
    if (!anchorDate) {
      // Sort chronologically even when anchor date is not yet selected
      return [...list].sort((a, b) => {
        const dateA = a.tanggalKeberangkatan ? new Date(a.tanggalKeberangkatan).getTime() : 0;
        const dateB = b.tanggalKeberangkatan ? new Date(b.tanggalKeberangkatan).getTime() : 0;
        return dateA - dateB;
      });
    }
    const baseDate = new Date(anchorDate);
    if (isNaN(baseDate.getTime())) {
      return [...list].sort((a, b) => {
        const dateA = a.tanggalKeberangkatan ? new Date(a.tanggalKeberangkatan).getTime() : 0;
        const dateB = b.tanggalKeberangkatan ? new Date(b.tanggalKeberangkatan).getTime() : 0;
        return dateA - dateB;
      });
    }
    
    // Use a window around the anchor date to keep the results stable.
    // This prevents results from disappearing if tglBerangkat updates.
    const minDate = new Date(baseDate);
    minDate.setDate(minDate.getDate() - 7); // 1 week before anchor
    const maxDate = new Date(baseDate);
    maxDate.setDate(maxDate.getDate() + 37); // ~5 weeks after anchor

    const filtered = list.filter((m) => {
      if (!m.tanggalKeberangkatan) return false;
      const mDate = new Date(m.tanggalKeberangkatan);
      if (isNaN(mDate.getTime())) return false;
      return mDate >= minDate && mDate <= maxDate;
    });

    // Urutkan sesuai tanggal keberangkatan secara kronologis
    return [...filtered].sort((a, b) => {
      const dateA = a.tanggalKeberangkatan ? new Date(a.tanggalKeberangkatan).getTime() : 0;
      const dateB = b.tanggalKeberangkatan ? new Date(b.tanggalKeberangkatan).getTime() : 0;
      return dateA - dateB;
    });
  }, [
    maskapaiList, 
    formData.tglBerangkat, 
    formData.preferredDepartureDate, 
    formData.durasiHari, 
    formData.tipePenerbangan, 
    formData.kotaKeberangkatan, 
    formData.kotaTujuan,
    selectedAirlineBrand
  ]);

  // Reset selected maskapai if it's not present in the master database list (deleted)
  useEffect(() => {
    if (maskapaiList.length === 0) return; // Wait for master list to load first to avoid race conditions
    if (formData.maskapaiId) {
      const existsInDb = maskapaiList.some(m => m.id === formData.maskapaiId);
      if (!existsInDb) {
        setFormData(prev => ({
          ...prev,
          maskapaiId: '',
          maskapaiLabel: '',
          estimasiHargaMaskapai: 0
        }));
      }
    }
  }, [maskapaiList, formData.maskapaiId]);

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
  const [hotelFilterJarak, setHotelFilterJarak] = useState("ALL");
  const [hotelSort, setHotelSort] = useState<"default" | "lowest" | "highest">("default");
  const [hotelPage, setHotelPage] = useState(1);

  const targetJamaah = Number(formData.targetJamaah) || 35;
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

  // Dynamic Database Loader for local storage custom data (Solusi B)
  const getLocalData = <T,>(key: string, fallback: T): T => {
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error(`Failed to parse cached ${key}:`, e);
      }
    }
    return fallback;
  };

  const localVisaSource = getLocalData("umaroh_db_visa", visaData);
  const localSaudiSource = getLocalData("umaroh_db_handling_saudi", HANDLING_TIERS);
  const localTransportSource = getLocalData("umaroh_db_transport", transportData);
  const localZiarahSource = getLocalData("umaroh_db_ziarah", ziarahData);
  const localHdomestikSource = getLocalData("umaroh_db_handling_domestik", handlingDomestikData);
  const localKcSource = getLocalData("umaroh_db_kereta_cepat", keretaCepatData);
  const localMutawifSource = getLocalData("umaroh_db_mutawif", [
    {
      id: "m1",
      name: "MUTAWIF + TRANSPORTASI",
      hargaAsingPerHari: 300,
      jumlahHari: 8,
      marginPersen: 80,
    }
  ]);

  const vData = (targetJamaah <= 34 
    ? (localVisaSource.find((v) => v.paxRange.includes("1-34")) || localVisaSource[0])
    : (localVisaSource.find((v) => v.paxRange.includes("35-55")) || localVisaSource[1] || localVisaSource[0])) || localVisaSource[0];
    
  const visaPrice = vData ? Math.round((vData.foreignPriceUsd * effectiveKursUsd) * (1 + (vData.percentage || 7) / 100)) : 0;
  const visaName = `Visa Umrah (${vData?.paxRange || (targetJamaah <= 34 ? "1-34 PAX" : "35-55 PAX")})`;

  const saudiTier = localSaudiSource.find(
    (t) => targetJamaah >= t.minPax && targetJamaah <= t.maxPax,
  ) ||
    localSaudiSource[localSaudiSource.length - 1] || { hpp: 43 };
  const saudiHppUsd = saudiTier.hpp;
  const saudiSell = Math.round(
    (saudiHppUsd + HANDLING_CONSTANTS.adminFee) *
      effectiveKursUsd *
      (1 + HANDLING_CONSTANTS.defaultMarginPercent / 100),
  );

  // Flatten transport options from localTransportSource
  const transportOptions = [];
  localTransportSource.forEach((vehicle) => {
    const idLower = vehicle.id.toLowerCase();
    // Only allow BUS, GMC, STARIA, HIACE
    if (!['bus', 'gmc', 'staria', 'hiace'].includes(idLower)) {
      return;
    }

    // Filter only Full Trip routes
    const fullTripRoutes = vehicle.routes.filter((route) =>
      route.route.toLowerCase().includes("full trip")
    );

    if (fullTripRoutes.length === 0) return;

    // Find the route with the highest price
    let highestRoute = fullTripRoutes[0];
    let maxPrice = idLower === 'bus' ? 2600 : highestRoute.price;

    fullTripRoutes.forEach((route) => {
      const currentPrice = idLower === 'bus' ? 2600 : route.price;
      if (currentPrice > maxPrice) {
        maxPrice = currentPrice;
        highestRoute = route;
      }
    });

    const isVisa35to55 = vData ? vData.paxRange.includes("35-55") : false;
    const pricePerPax = isVisa35to55 
      ? 0 
      : (targetJamaah > 0 ? Math.round(((maxPrice * effectiveKursSar) / targetJamaah) * 1.4) : 0);

    // Clean label: e.g. "BUS - Full Trip" instead of including detailed route route info or vendor
    const label = isVisa35to55 
      ? `${vehicle.name} - Full Trip (Termasuk Visa 35-55)` 
      : `${vehicle.name} - Full Trip`;

    transportOptions.push({
      id: `trans_${vehicle.id}_full_trip`,
      label: label,
      price: pricePerPax
    });
  });

  const mutawifOptions = localMutawifSource.map((item) => {
    const days = item.jumlahHari || 8;
    const pricePerPax = targetJamaah > 0 
      ? Math.round(((item.hargaAsingPerHari * effectiveKursSar * days) / targetJamaah) * (1 + item.marginPersen / 100))
      : 0;
    return {
      id: `mutawif_${item.id}`,
      label: `${item.name} (${days} Hari, ${item.hargaAsingPerHari} SAR/Hari)`,
      price: pricePerPax,
    };
  });

  const ziarahOptions = localZiarahSource.map((item) => {
    const rateToUse = item.currency === "USD" ? effectiveKursUsd : effectiveKursSar;
    const foreignPerPax = item.hargaAsing / (item.jumlahPax || 45);
    const priceBeli = foreignPerPax * rateToUse;
    const calculatedMargin = item.hargaBeli > 0 ? ((item.hargaJual / item.hargaBeli) - 1) : 0.2;
    const priceJual = Math.round(priceBeli * (1 + calculatedMargin));
    return {
      id: `ziarah_${item.id}`,
      label: item.item,
      price: priceJual,
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
      options: localHdomestikSource.map((item) => ({
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
    {
      id: "group_transport",
      nama: "Transportasi",
      deskripsi: `Pilihan Kendaraan Full Trip (${targetJamaah} Pax)`,
      isGroup: true,
      options: transportOptions,
    },
    {
      id: "group_mutawif",
      nama: `Mutawif`,
      deskripsi: `Pilihan Pemandu Ibadah Selama Program`,
      isGroup: true,
      options: mutawifOptions,
    },
    {
      id: "group_kereta",
      nama: "Kereta Cepat",
      deskripsi: "Layanan Transportasi Kereta Cepat Haramain",
      isGroup: true,
      options: localKcSource.map((item) => {
        const rateToUse = item.mataUang === "USD" ? effectiveKursUsd : effectiveKursSar;
        const priceBeli = item.hargaAsing * rateToUse;
        const priceMargin = priceBeli * ((item.persen || 20) / 100);
        const calculatedHargaJual = Math.round(priceBeli + priceMargin);
        return {
          id: `kc_${item.id}`,
          label: item.item,
          price: calculatedHargaJual,
        };
      }),
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
    if (!hotel) return 0;
    
    // If hotel has season ranges defined (usually static list or highly structured db entries)
    if (hotel.seasons && hotel.seasons.length > 0 && dateStr) {
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        let season = hotel.seasons.find((s) => isDateInRange(dateObj, s.range));
        
        // Fallback: If no season matched but we have seasons, use the first season
        if (!season && hotel.seasons.length > 0) {
          season = hotel.seasons[0];
        }
        
        if (season) {
          const priceEntry = season.prices.find((p) => p.roomType === roomType);
          if (priceEntry) {
            const kurs = effectiveKursSar; // Use standard conversion rate
            const margin = 1.1;
            let divisor = 1;
            if (roomType === 'Quad') divisor = 4;
            else if (roomType === 'Triple') divisor = 3;
            else if (roomType === 'Double') divisor = 2;
            
            const price = ((priceEntry.price * kurs) / divisor) * margin;
            return price > 0 ? Math.ceil(price / 1000) * 1000 : 0;
          }
        }
      }
    }
    
    // Graceful Fallback: For database hotels without seasons, return their directly specified base price
    if (roomType === 'Quad') return hotel.priceQuad || 0;
    if (roomType === 'Triple') return hotel.priceTriple || 0;
    if (roomType === 'Double') return hotel.priceDouble || 0;
    return 0;
  };

  const pricingSummary = useMemo(() => {
    const maskapaiPrice = Number(formData.estimasiHargaMaskapai) || 0;

    let hMadinah = hotelsList.find((h) => h.id === formData.hotelMadinahId);
    if (!hMadinah && formData.hotelMadinahId) {
      // Prevent visual flicker/empty states while hotelsList is loading from Firestore
      hMadinah = {
        id: formData.hotelMadinahId,
        nama: formData.hotelMadinahId.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        kota: "madinah",
        bintang: 5,
        priceQuad: 0,
        priceTriple: 0,
        priceDouble: 0,
        seasons: []
      };
    }

    let hMakkah = hotelsList.find((h) => h.id === formData.hotelMakkahId);
    if (!hMakkah && formData.hotelMakkahId) {
      hMakkah = {
        id: formData.hotelMakkahId,
        nama: formData.hotelMakkahId.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        kota: "makkah",
        bintang: 5,
        priceQuad: 0,
        priceTriple: 0,
        priceDouble: 0,
        seasons: []
      };
    }

    let hWisata = hotelsList.find((h) => h.id === formData.hotelWisataId);
    if (!hWisata && formData.hotelWisataId) {
      hWisata = {
        id: formData.hotelWisataId,
        nama: formData.hotelWisataId.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        kota: (formData.negaraWisata || "turkey").toLowerCase(),
        bintang: 5,
        priceQuad: 0,
        priceTriple: 0,
        priceDouble: 0,
        seasons: []
      };
    }

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
            const rawPrice = selectedOpt.price;
            const roundedPrice = rawPrice > 0 ? Math.ceil(rawPrice / 1000) * 1000 : 0;
            acc.push({
              id: selectedOpt.id,
              nama: `${item.nama}: ${selectedOpt.label}`,
              harga: roundedPrice,
            });
          }
        }
      } else {
        if (formData.selectedLayanan?.includes(item.id)) {
          const rawPrice = item.harga || 0;
          const roundedPrice = rawPrice > 0 ? Math.ceil(rawPrice / 1000) * 1000 : 0;
          acc.push({
            id: item.id,
            nama: item.nama,
            harga: roundedPrice
          });
        }
      }
      return acc;
    }, []);

    const layananTotal = selectedLayananItems.reduce((sum, item) => sum + (Number(item.harga) || 0), 0);

    const baseQuad = maskapaiPrice + hWisataTotalQuad + hQuadMadinah + hQuadMakkah + layananTotal;
    const baseTriple = maskapaiPrice + hWisataTotalTriple + hTripleMadinah + hTripleMakkah + layananTotal;
    const baseDouble = maskapaiPrice + hWisataTotalDouble + hDoubleMadinah + hDoubleMakkah + layananTotal;

    const effectiveIsMitra = isMitraContext || !!formData.mitraId;
    let margin = Number(formData.marginBersih) || 0;
    let mitraMarkup = 0;

    if (effectiveIsMitra) {
      if (formData.markup !== undefined) {
        mitraMarkup = Number(formData.markup) || 0;
      } else {
        mitraMarkup = Number(formData.marginBersih) || 0;
        margin = 0;
      }
    }

    const adminFee = margin * 0.1;
    const mitraAdminFee = mitraMarkup * 0.1;
    
    // In Partner context, the Admin's profit (margin + fee) is part of the cost base (removed)
    const adminServiceFee = 0;
    
    const displayKomisiMitra = effectiveIsMitra ? mitraMarkup : margin;
    const displayKomisiUmaroh = effectiveIsMitra ? mitraAdminFee : adminFee;
    
    const totalMarkupCount = effectiveIsMitra ? (mitraMarkup + mitraAdminFee) : (margin + adminFee);

    // Wisata Halal specific
    const baseIDR = (formData.hargaDasar || 1350) * 19000;
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

    const wisataMargin = formData.wisataMargin !== undefined ? formData.wisataMargin : 1000000;
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
      finalQuad: Math.round(baseQuad + totalMarkupCount + adminServiceFee),
      finalTriple: Math.round(baseTriple + totalMarkupCount + adminServiceFee),
      finalDouble: Math.round(baseDouble + totalMarkupCount + adminServiceFee),
      adminFee: Math.round(displayKomisiUmaroh),
      totalKomisiMitra: Math.round(displayKomisiMitra - (Number(formData.ujrohPartner) || 0)),
      ujrohAnda: Math.round(margin - (Number(formData.ujrohPartner) || 0)),
      ujrohPartner: Math.round(Number(formData.ujrohPartner) || 0),
      totalKomisiUmaroh: Math.round(displayKomisiUmaroh),
      adminServiceFee: Math.round(adminServiceFee),
      totalMarkup: effectiveIsMitra ? Math.round(mitraMarkup + mitraAdminFee) : Math.round(margin + adminFee),
      finalWisataPrice,
      baseIDR,
      wisataAddonsTotal,
      wisataAdminFee: Math.round(wisataAdminFee)
    };
  }, [formData, hotelsList, maskapaiList, dbLayananList, visaData, transportData, ziarahData, isMitraContext]);

  useEffect(() => {
    setHotelPage(1);
  }, [hotelSearchTerm, hotelFilterBintang, hotelStep, hotelSort, hotelFilterJarak]);

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

    const cachedHotelsStr = localStorage.getItem('umaroh_db_hotels');
    let hotelsSource = hotels;
    if (cachedHotelsStr) {
      try {
        hotelsSource = JSON.parse(cachedHotelsStr);
      } catch (e) {
        console.error('Failed to parse cached hotels:', e);
      }
    }

    const staticHotels: WizardHotel[] = (hotelsSource as SimpleHotel[]).map((h) => {
      const quad =
        h.seasons?.[0]?.prices?.find((p) => p.roomType === "Quad")?.price ||
        0;
      const triple =
        h.seasons?.[0]?.prices?.find((p) => p.roomType === "Triple")?.price ||
        0;
      const double =
        h.seasons?.[0]?.prices?.find((p) => p.roomType === "Double")?.price ||
        0;

      const kurs = effectiveKursSar;
      const margin = 1.1;

      // Ensure manual/standard priceQuad exists as fallback if seasons is not defined
      const priceQ = quad ? ((quad * kurs) / 4) * margin : (h.priceQuad || 0);
      const priceT = triple ? ((triple * kurs) / 3) * margin : (h.priceTriple || 0);
      const priceD = double ? ((double * kurs) / 2) * margin : (h.priceDouble || 0);

      return {
        id: h.id,
        nama: h.name || h.nama || "",
        kota: (h.city || h.kota || "").toLowerCase(),
        bintang: h.stars || h.bintang || 5,
        priceQuad: priceQ,
        priceTriple: priceT,
        priceDouble: priceD,
        vendor: h.vendor || "",
        seasons: h.seasons || [],
        mealPlan: h.mealPlan || "FB",
      };
    });

    const unsubHotels = onSnapshot(
      collection(db, "master_hotels"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          const bintangVal = Number(d.bintang || d.stars || d.star || 5);
          return {
            id: doc.id,
            nama: d.name || d.nama || "",
            kota: (d.city || d.kota || "").toLowerCase(),
            bintang: bintangVal,
            priceQuad: Number(d.priceQuad || d.pricePerNight || 0),
            priceTriple: Number(d.priceTriple || 0),
            priceDouble: Number(d.priceDouble || 0),
            vendor: d.vendor || "",
            seasons: d.seasons || [],
            mealPlan: d.mealPlan || "FB",
          } as WizardHotel;
        });
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

    const unsubHotelMetas = onSnapshot(
      collection(db, "hotel_metadata"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as HotelMetaItem));
        setHotelMetas(data);
      },
      (error) =>
        handleFirestoreError(error, OperationType.GET, "hotel_metadata"),
    );

    return () => {
      unsubMaskapai();
      unsubHotels();
      unsubLayanan();
      unsubBandara();
      unsubPaketWisata();
      unsubHotelMetas();
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
      const isNew = !createdDocId;
      const generateRequestId = () => {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const code = Array.from({ length: 4 }, () => letters.charAt(Math.floor(Math.random() * letters.length))).join("");
        return `REQ-${code}`;
      };

      const dataToSave: Partial<WizardFormData> = {
        photoUtama: formData.photoUtama || null,
        kursSar: effectiveKursSar,
        kursUsd: effectiveKursUsd,
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
        flightItinerary: formData.flightItinerary || "",
        marginBersih: Number(formData.marginBersih || 0),
        ujrohPartner: Number(formData.ujrohPartner || 0),
        markup: Number(formData.markup || 0),
        durasiMadinah: Number(formData.durasiMadinah || 3),
        durasiMakkah: Number(formData.durasiMakkah || 4),
        durasiWisata: Number(formData.durasiWisata || 0),
        paketWisataId: formData.paketWisataId || "",
        negaraWisata: formData.negaraWisata || "",
        mitraId: formData.mitraId || null,
        hargaJualQuad: Math.round(pricingSummary.finalQuad),
        hargaJualTriple: Math.round(pricingSummary.finalTriple),
        hargaJualDouble: Math.round(pricingSummary.finalDouble),
        wisataAddon_tourLeader: formData.wisataAddon_tourLeader || false,
        wisataAddon_tourLeaderCount: Number(formData.wisataAddon_tourLeaderCount || 0),
        wisataAddon_handling: formData.wisataAddon_handling || false,
        wisataAddon_handlingType: formData.wisataAddon_handlingType || "",
        wisataAddon_travelKits: formData.wisataAddon_travelKits || false,
        wisataAddon_merch_koper: formData.wisataAddon_merch_koper || false,
        wisataAddon_merch_slingbag: formData.wisataAddon_merch_slingbag || false,
        wisataAddon_merch_kaos: formData.wisataAddon_merch_kaos || false,
        wisataAddon_merch_jaket: formData.wisataAddon_merch_jaket || false,
        wisataAddon_merch_tasserut: formData.wisataAddon_merch_tasserut || false,
        wisataAddon_merch_topi: formData.wisataAddon_merch_topi || false,
        wisataAddon_merch_spanduk: formData.wisataAddon_merch_spanduk || false,
      };

      if (isNew) {
        const docRef = await addDoc(collection(db, "paket_master"), {
          ...dataToSave,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setCreatedDocId(docRef.id);
      } else {
        await updateDoc(doc(db, "paket_master", createdDocId || initialData!.id), {
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

  const handleNext = async () => {
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

    if (currentStepName === "REVIEW FASILITAS") {
      setIsSaving(true);
      try {
        await saveToDatabase();
      } catch (e) {
        console.error("Auto-save failed on Next:", e);
      } finally {
        setIsSaving(false);
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

  const saveToDatabase = async (): Promise<string | null> => {
    const isNew = !createdDocId;
    const generateRequestId = () => {
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const code = Array.from({ length: 4 }, () => letters.charAt(Math.floor(Math.random() * letters.length))).join("");
      return `REQ-${code}`;
    };

    const dataToSave: Partial<WizardFormData> = {
      photoUtama: formData.photoUtama || null,
      kursSar: effectiveKursSar,
      kursUsd: effectiveKursUsd,
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
      flightItinerary: formData.flightItinerary || "",
      marginBersih: Number(formData.marginBersih || 0),
      ujrohPartner: Number(formData.ujrohPartner || 0),
      markup: Number(formData.markup || 0),
      durasiMadinah: Number(formData.durasiMadinah || 3),
      durasiMakkah: Number(formData.durasiMakkah || 4),
      durasiWisata: Number(formData.durasiWisata || 0),
      paketWisataId: formData.paketWisataId || "",
      negaraWisata: formData.negaraWisata || "",
      mitraId: formData.mitraId || null,
      hargaJualQuad: Math.round(pricingSummary.finalQuad),
      hargaJualTriple: Math.round(pricingSummary.finalTriple),
      hargaJualDouble: Math.round(pricingSummary.finalDouble),
      wisataAddon_tourLeader: formData.wisataAddon_tourLeader || false,
      wisataAddon_tourLeaderCount: Number(formData.wisataAddon_tourLeaderCount || 0),
      wisataAddon_handling: formData.wisataAddon_handling || false,
      wisataAddon_handlingType: formData.wisataAddon_handlingType || "",
      wisataAddon_travelKits: formData.wisataAddon_travelKits || false,
      wisataAddon_merch_koper: formData.wisataAddon_merch_koper || false,
      wisataAddon_merch_slingbag: formData.wisataAddon_merch_slingbag || false,
      wisataAddon_merch_kaos: formData.wisataAddon_merch_kaos || false,
      wisataAddon_merch_jaket: formData.wisataAddon_merch_jaket || false,
      wisataAddon_merch_tasserut: formData.wisataAddon_merch_tasserut || false,
      wisataAddon_merch_topi: formData.wisataAddon_merch_topi || false,
      wisataAddon_merch_spanduk: formData.wisataAddon_merch_spanduk || false,
    };

    let savedId = createdDocId;

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

        if (!isNew && savedId && !formData.isNewMarkup) {
          // Update Existing Markup
          try {
            await updateDoc(doc(db, "paket_mitra", savedId), markupData);
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `paket_mitra/${savedId}`);
            throw e;
          }
        } else {
          // Create New Markup
          try {
            const docRef = await addDoc(collection(db, "paket_mitra"), {
              ...markupData,
              createdAt: serverTimestamp(),
            });
            savedId = docRef.id;
            setCreatedDocId(docRef.id);
            // After creating, it is no longer a new markup for subsequent updates
            setFormData((prev) => ({ ...prev, isNewMarkup: false }));
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, 'paket_mitra');
            throw e;
          }
        }
      } else {
        // Validation process for Mitra creating OWN Master Package
        if (isNew) {
          try {
            const docRef = await addDoc(collection(db, "paket_master"), {
              ...dataToSave,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            savedId = docRef.id;
            setCreatedDocId(docRef.id);
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, 'paket_master');
            throw e;
          }
        } else {
          try {
            await updateDoc(doc(db, "paket_master", savedId!), {
              ...dataToSave,
              updatedAt: serverTimestamp(),
            });
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `paket_master/${savedId}`);
            throw e;
          }
        }
      }
    } else {
      // Normal Admin flow
      if (!isNew && savedId) {
        try {
          await updateDoc(doc(db, "paket_master", savedId), {
            ...dataToSave,
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `paket_master/${savedId}`);
          throw e;
        }
      } else {
        try {
          const docRef = await addDoc(collection(db, "paket_master"), {
            ...dataToSave,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          savedId = docRef.id;
          setCreatedDocId(docRef.id);
        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, 'paket_master');
          throw e;
        }
      }
    }

    return savedId;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const savedId = await saveToDatabase();
      if (!savedId) {
        throw new Error("Gagal menyimpan ke database");
      }

      onSuccess();
      
      // Trigger WhatsApp if finishing from VALIDASI AKHIR step
      if (currentStepName === "VALIDASI AKHIR") {
        const adminPhone = "6283844974952";
        const isUpdate = !(!initialData?.id);
        const msgHeader = isUpdate 
          ? "Ada UPDATE paket yang membutuhkan validasi ulang:" 
          : "Ada paket baru yang membutuhkan validasi:";
        const waMessage = `Assalamu'alaikum Admin Operasional,\n\n${msgHeader}\n\n*Nama Paket:* ${formData.nama || "Paket Umroh Tanpa Nama"}\n*Kategori:* ${formData.kategori}\n\nMohon segera ditinjau.\n\nTerima kasih.`;
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
        hotelMadinahStars: getHelperStars(formData.hotelMadinahId, hMadinah?.bintang),
        hotelMakkahStars: getHelperStars(formData.hotelMakkahId, hMakkah?.bintang),
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
    if (!autoDownloadPdf) {
      setIsSaving(true);
      try {
        await saveToDatabase();
      } catch (e) {
        console.error("Auto-save failed on export:", e);
      } finally {
        setIsSaving(false);
      }
    }

    const pdfElement = document.getElementById('pdf-export-content');
    if (!pdfElement) return;

    const filename = `Deskripsi_Paket_${formData.nama || "TBA"}`;

    if (type === 'pdf') {
      const opt = {
        margin: 0,
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

              if (el.parentElement) {
                el.parentElement.style.height = 'auto';
                el.parentElement.style.overflow = 'visible';
                el.parentElement.style.position = 'relative';
                el.parentElement.style.visibility = 'visible';
                el.parentElement.style.display = 'block';
              }
            }
            
            // Sanitize colors for html2canvas compatibility
            if (pdfElement) {
              sanitizeForHtml2Canvas(clonedDoc, pdfElement);
            }
          }
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ['css', 'legacy'] }
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
    <div className="bg-white md:rounded-2xl md:shadow-md md:border md:border-gray-100 p-0 sm:p-6 md:p-8 min-h-screen md:min-h-0 relative">
      {autoDownloadPdf && (
        <div className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
          <div className="relative flex flex-col items-center justify-center space-y-6">
            <div className="relative flex items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-100 border-t-emerald-600"></div>
              <FileText className="w-6 h-6 text-emerald-600 absolute animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Mempersiapkan Dokumen</h3>
              <p className="text-sm font-medium text-gray-600 max-w-md">
                Mengunduh PDF deskripsi paket <span className="font-bold text-emerald-600">"{formData.nama || "TBA"}"</span> langsung ke perangkat Anda...
              </p>
            </div>
          </div>
        </div>
      )}
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
                      className="w-full p-4 bg-gray-50/50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-800 font-bold transition-all"
                    >
                      {formData.periode && 
                       !["Low Season", "Medium Season", "High Season", "Peak Season", "Umrah Ditutup", "Awal Musim (Low Season)", "Akhir Musim (Syawal-Dzulhijjah)"].includes(formData.periode) && (
                        <option value={formData.periode}>
                          🌙 {formData.periode}
                        </option>
                      )}
                      <option value="">-- Pilih Periode Secara Manual --</option>
                      <option value="Low Season">Low Season (Safar, Syawal)</option>
                      <option value="Medium Season">Medium Season (Rabi'ul Awal - Jumadil Akhir)</option>
                      <option value="High Season">High Season (Rajab, Sya'ban)</option>
                      <option value="Peak Season">Peak Season (Ramadhan)</option>
                      <option value="Umrah Ditutup">Umrah Ditutup (Dzulqa'dah, Dzulhijjah)</option>
                      <option value="Awal Musim (Low Season)">Awal Musim / Low Season (Muharram-Safar)</option>
                      <option value="Akhir Musim (Syawal-Dzulhijjah)">Akhir Musim (Syawal-Dzulhijjah)</option>
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
                              paketWisataId: "", // Reset PaketWisataId when country changes
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

                      {/* Program Paket Wisata (Produk Tour yang Diinput) */}
                      {formData.negaraWisata && (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                          <label className="block text-[10px] sm:text-xs font-bold text-[#009B66] mb-2 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#009B66]"></span>
                            PROGRAM PAKET WISATA (PRODUK TOUR) *
                          </label>
                          <select
                            value={formData.paketWisataId || ""}
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              const matched = paketWisataList.find((p) => p.id === selectedId);
                              setFormData({
                                ...formData,
                                paketWisataId: selectedId,
                                durasiWisata: matched ? matched.durasiHari : formData.durasiWisata,
                              });
                            }}
                            className="w-full p-4 bg-emerald-50/10 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800 font-bold appearance-none transition-all"
                          >
                            <option value="">-- Pilih Program Wisata yang Telah Diinput --</option>
                            {paketWisataList
                              .filter(
                                (p) =>
                                  (p.lokasi || "").toUpperCase() ===
                                  (formData.negaraWisata || "").toUpperCase(),
                              )
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nama} ({p.durasiHari} Hari)
                                </option>
                              ))}
                          </select>
                          <p className="text-[9px] text-gray-400 mt-1.5 font-bold tracking-wider uppercase">
                            Menampilkan data Paket Wisata yang diinput di menu database
                          </p>
                        </div>
                      )}

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
                      RUTE TUJUAN UTAMA *
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
                    <HijriGregorianDatePicker
                      value={formData.tglBerangkat || ""}
                      onChange={(newTglBerangkat) => {
                        let newTglPulang = formData.tglKepulangan;
                        let autoPeriode = formData.periode;
                        if (newTglBerangkat) {
                          const dt = new Date(newTglBerangkat);
                          if (!isNaN(dt.getTime())) {
                            dt.setDate(dt.getDate() + (formData.durasiHari || 9));
                            newTglPulang = dt.toISOString().split("T")[0];
                            
                            // Calculate automatic Hijri period and Umrah season
                            const departureDateObj = new Date(newTglBerangkat);
                            const offsetStr = localStorage.getItem("hijri_offset");
                            const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
                            const seasonInfo = getUmrahSeasonAndPeriod(departureDateObj, offset);
                            autoPeriode = seasonInfo.periodText;
                          }
                        }
                        setFormData({
                          ...formData,
                          tglBerangkat: newTglBerangkat,
                          preferredDepartureDate: newTglBerangkat,
                          tglKepulangan: newTglPulang,
                          periode: autoPeriode,
                        });
                      }}
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
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="2"
                          max="90"
                          value={formData.targetJamaah || ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setFormData({
                              ...formData,
                              targetJamaah: isNaN(val) ? 0 : Math.min(90, Math.max(2, val)),
                            });
                          }}
                          className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
                        />
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase">
                          PAX
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 pb-1 relative group">
                      <input
                        type="range"
                        min="2"
                        max="90"
                        value={formData.targetJamaah || 35}
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
                  const multiplier = 19000;

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
            const baseIDR = (formData.hargaDasar || 1350) * 19000;
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
                : 1000000;
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
                    <div className="bg-gray-50 rounded-full p-2 flex items-center justify-between gap-4 sm:gap-8 min-w-[280px] sm:min-w-[320px] mb-6">
                      <button
                        onClick={() =>
                          setFormData({
                            ...formData,
                            wisataMargin: Math.max(0, currentMargin - 500000),
                          })
                        }
                        className="w-12 h-12 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-blue-600 transition-colors cursor-pointer z-10"
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
                            wisataMargin: Math.min(10000000, currentMargin + 500000),
                          })
                        }
                        className="w-12 h-12 rounded-full bg-blue-600 shadow-lg shadow-blue-500/40 flex items-center justify-center text-white hover:bg-blue-700 transition-colors cursor-pointer z-10"
                      >
                        <Plus className="w-5 h-5 pointer-events-none" />
                      </button>
                    </div>

                    {/* Slider Margin */}
                    <div className="w-full max-w-md mb-8 px-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                          GESER MARGIN (KELIPATAN 500RB)
                        </span>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase">
                          Rp {(currentMargin / 1000000).toFixed(1)} JT
                        </span>
                      </div>
                      <div className="pt-2 pb-1 relative group">
                        <input
                          type="range"
                          min="0"
                          max="10000000"
                          step="500000"
                          value={currentMargin}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              wisataMargin: parseInt(e.target.value),
                            })
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-[9px] font-bold text-blue-300 mt-2">
                          <span>Rp 0</span>
                          <span>Rp 10.000.000</span>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown Card */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
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
                {/* Info Card: Sinkronisasi Otomatis Jadwal */}
                <div className="p-4 bg-emerald-50 border border-emerald-100/60 rounded-2xl flex gap-3.5 items-start text-emerald-950 shadow-sm animate-in fade-in duration-300">
                  <div className="p-2 bg-emerald-100/80 rounded-xl text-emerald-700 shrink-0">
                    <Calendar className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold tracking-tight text-emerald-950">
                      Sinkronisasi Jadwal Penerbangan Otomatis
                    </h4>
                    <p className="text-xs text-emerald-800/90 leading-relaxed font-semibold" id="flight-sync-info-p">
                      Memilih maskapai di bawah ini akan menyinkronkan <strong className="text-emerald-950">Tanggal Keberangkatan</strong> dan <strong className="text-emerald-950">Tanggal Kepulangan</strong> program paket Anda secara otomatis sesuai dengan jadwal penerbangan yang telah terdaftar.
                    </p>
                  </div>
                </div>

                {/* Tipe Penerbangan */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">
                    Tipe Penerbangan
                  </label>
                  <div className="flex border border-gray-200 rounded-xl overflow-hidden p-1 bg-gray-50 max-w-2xl">
                    {["DIRECT", "TRANSIT"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setFormData({ 
                            ...formData, 
                            tipePenerbangan: type,
                            maskapaiId: "",
                            estimasiHargaMaskapai: 0,
                            flightItinerary: ""
                          });
                          setSelectedAirlineBrand("");
                        }}
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
                  {/* Tipe Maskapai / Pesawat */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                      Tipe Maskapai / Pesawat
                    </label>
                    <select
                      value={selectedAirlineBrand}
                      onChange={(e) => {
                        const newBrand = e.target.value;
                        setSelectedAirlineBrand(newBrand);
                        // Clear selected maskapai if it doesn't match the new brand
                        if (newBrand && formData.maskapaiId) {
                          const currentMaskapai = maskapaiList.find(m => m.id === formData.maskapaiId);
                          if (currentMaskapai) {
                            const brandOfCurrent = getAirlineBrand(currentMaskapai.name);
                            if (brandOfCurrent !== newBrand) {
                              setFormData(prev => ({
                                ...prev,
                                maskapaiId: "",
                                flightItinerary: "",
                                estimasiHargaMaskapai: 0
                              }));
                            }
                          }
                        }
                      }}
                      className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800 font-medium appearance-none bg-white"
                    >
                      <option value="">-- Semua Tipe Maskapai --</option>
                      {dynamicBrands.map((brand) => (
                        <option key={brand.value} value={brand.value}>
                          {brand.label}
                        </option>
                      ))}
                    </select>
                  </div>

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

                        const depDateFormatted = formatDateShort(selectedMaskapai?.tanggalKeberangkatan);
                        const retDateFormatted = formatDateShort(selectedMaskapai?.tanggalKepulangan);
                        const maskapaiShortName = selectedMaskapai ? selectedMaskapai.name.split(' ')[0] : 'SV';
                        const randomPnr = Math.random().toString(36).substring(2, 8).toUpperCase();
                        
                        const generatedItinerary = selectedMaskapai
                          ? `CGK${selectedMaskapai.destinationCityName || 'JED'} HK20 ${selectedMaskapai.programDays || 9}D PNR:${randomPnr}\n` +
                            `${depDateFormatted} ${maskapaiShortName}827 CGK${selectedMaskapai.destinationCityName || 'JED'} 0040 0610\n` +
                            `${retDateFormatted} ${maskapaiShortName}816 ${selectedMaskapai.destinationCityName || 'JED'}CGK 1830 0815+1`
                          : "";

                        setFormData({
                          ...formData,
                          maskapaiId: newId,
                          estimasiHargaMaskapai: selectedMaskapai
                            ? selectedMaskapai.hargaJual || 0
                            : formData.estimasiHargaMaskapai || 0,
                          flightItinerary: selectedMaskapai?.flightItinerary || generatedItinerary,
                          tglBerangkat: newTglBerangkat,
                          tglKepulangan: newTglPulang,
                          // If we haven't anchored a date yet, use this one as the anchor
                          // so the list doesn't shift unexpectedly if they keep clicking.
                          preferredDepartureDate: formData.preferredDepartureDate || newTglBerangkat
                        });
                        // Automatically close text edit mode to show the new ticket immediately
                        setIsEditingItinerary(false);
                      }}
                      className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800 font-medium appearance-none bg-white"
                    >
                      <option value="">-- Pilih Maskapai --</option>
                      {filteredMaskapaiList.map((m) => {
                        const cleanName = m.namaVendor
                          ? m.name.replace(` (${m.namaVendor})`, '')
                          : m.name.replace(/\s*\(Madani Tour\)/gi, '');
                        
                        const formattedDate = m.tanggalKeberangkatan 
                          ? new Date(m.tanggalKeberangkatan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '-';

                        return (
                          <option key={m.id} value={m.id}>
                            [{formattedDate}] {cleanName} - {m.programDays || 9} Hari (Sisa: {m.availableSeats})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Estimasi Harga & Deskripsi Penerbangan Side-by-Side */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Estimasi Harga Maskapai */}
                  <div className="md:col-span-1">
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
                        className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800 font-bold transition-all bg-white"
                      />
                    </div>
                  </div>

                  {/* Deskripsi Penerbangan */}
                  <div className="md:col-span-2">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Deskripsi Penerbangan
                      </label>
                      {isEditingItinerary && (
                        <button
                          type="button"
                          onClick={() => setIsEditingItinerary(false)}
                          className="text-[11px] font-extrabold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider flex items-center gap-1"
                        >
                          Lihat Tampilan Tiket
                        </button>
                      )}
                    </div>

                    {isEditingItinerary ? (
                      <div className="space-y-3">
                        <textarea
                          placeholder="JEDJED HK20 9D PNR:XXX2L5&#10;28Des SV827 CGKJED 0040 0610&#10;04Jan SV816 JEDCGK 1830 0815+1"
                          value={formData.flightItinerary || ""}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              flightItinerary: e.target.value,
                            });
                          }}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-gray-800 font-mono transition-all bg-white leading-relaxed resize-none h-[120px]"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setIsEditingItinerary(false)}
                            className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-all uppercase tracking-wider flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Selesai Mengedit
                          </button>
                        </div>
                      </div>
                    ) : (
                      (() => {
                        const parsedFlights = parseItineraryLines(formData.flightItinerary || "");
                        const pnrMatch = (formData.flightItinerary || "").match(/PNR\s*:\s*([A-Z0-9]+)/i);
                        const pnrCode = pnrMatch ? pnrMatch[1] : "AUTO-GEN";
                        
                        return parsedFlights.length > 0 ? (
                          <div className="relative bg-[#0d1222] border border-[#1e294b] p-6 rounded-3xl shadow-xl overflow-hidden space-y-5 text-gray-100">
                            {/* Decorative Cutout Circles for Boarding Pass Style */}
                            <div className="absolute top-[45%] -left-3.5 w-7 h-7 bg-white rounded-full border border-gray-200 z-10"></div>
                            <div className="absolute top-[45%] -right-3.5 w-7 h-7 bg-white rounded-full border border-gray-200 z-10"></div>
                            
                            {/* Ticket Header */}
                            <div className="flex justify-between items-center pb-4 border-b border-[#1e294b] border-dashed">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                  <Plane className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border border-emerald-500/20">
                                    BOARDING PASS
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-bold ml-2 uppercase">
                                    {formData.tipePenerbangan || "DIRECT"}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">RESERVASI (PNR)</span>
                                <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">{pnrCode}</span>
                              </div>
                            </div>

                            {/* Flight Segments */}
                            <div className="space-y-5">
                              {parsedFlights.map((flight, idx) => (
                                <React.Fragment key={idx}>
                                  {idx > 0 && (
                                    <div className="border-t border-dashed border-[#1e294b] my-4 pt-4"></div>
                                  )}
                                  <div className="grid grid-cols-3 items-center">
                                    {/* Origin Airport */}
                                    <div className="space-y-1">
                                      <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider">DEPARTURE</span>
                                      <span className="text-2xl font-black text-white tracking-tight font-mono">{flight.origin}</span>
                                      <span className="text-[10px] font-bold text-emerald-400 block">{flight.date}</span>
                                    </div>

                                    {/* Flight Path / Plane */}
                                    <div className="flex flex-col items-center px-2">
                                      <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full mb-1 border border-emerald-500/15">
                                        {flight.flightNo}
                                      </span>
                                      <div className="w-full relative flex items-center justify-center my-1.5">
                                        <div className="w-full border-t-2 border-dashed border-[#1e294b] absolute"></div>
                                        <Plane className="w-4 h-4 text-emerald-400 bg-[#0d1222] relative z-10 px-0.5 rotate-90" />
                                      </div>
                                      <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">
                                        Flight Duration
                                      </span>
                                    </div>

                                    {/* Destination Airport */}
                                    <div className="space-y-1 text-right">
                                      <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider">ARRIVAL</span>
                                      <span className="text-2xl font-black text-white tracking-tight font-mono">{flight.destination}</span>
                                      <span className="text-[10px] font-bold text-gray-300 block">TIBA: {flight.arrTime}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Sub-card with Details */}
                                  <div className="flex justify-between items-center bg-[#151b32] p-3 rounded-2xl border border-[#1e294b]/60 text-xs text-gray-300">
                                    <div className="flex items-center gap-2 font-bold">
                                      <Calendar className="w-4 h-4 text-emerald-400" />
                                      <span>Jadwal Keberangkatan:</span>
                                      <strong className="text-white font-extrabold">{flight.date}</strong>
                                    </div>
                                    <div className="font-mono text-xs font-black text-emerald-400 bg-emerald-500/5 px-2.5 py-0.5 rounded border border-emerald-500/10">
                                      WAKTU: {flight.depTime}
                                    </div>
                                  </div>
                                </React.Fragment>
                              ))}
                            </div>

                            {/* Footer Link / Toggle to edit raw text */}
                            <div className="pt-2 flex justify-between items-center border-t border-[#1e294b]/40">
                              <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                E-Ticket sinkron dengan manifest utama
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsEditingItinerary(true)}
                                className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1 uppercase tracking-widest bg-emerald-500/5 hover:bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/10 transition-all"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Edit Text Manual
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 border border-dashed border-gray-200 rounded-2xl text-center bg-gray-50 text-gray-400 space-y-3">
                            <Plane className="w-8 h-8 text-gray-300 mx-auto mb-2 stroke-[1.5]" />
                            <p className="text-xs font-bold text-gray-500">Belum ada rute penerbangan dipilih</p>
                            <p className="text-[10px] text-gray-400 max-w-sm mx-auto">
                              Silakan pilih maskapai di atas untuk memunculkan e-ticket otomatis, atau klik tombol di bawah untuk menulis manual.
                            </p>
                            <button
                              type="button"
                              onClick={() => setIsEditingItinerary(true)}
                              className="text-[10px] font-extrabold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider flex items-center gap-1 mx-auto"
                            >
                              <Edit3 className="w-3 h-3" /> Tulis Manual
                            </button>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {currentStepName === "HOTEL WISATA" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 relative pb-20">
            {/* Banner Header Dinamis terhubung Database Paket Wisata */}
            {(() => {
              const selectedPaket = paketWisataList.find((p) => p.id === formData.paketWisataId);
              return (
                <div className="bg-[#FFFDF5] border border-amber-200 rounded-2xl p-5 shadow-sm transition-all animate-in fade-in">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[9px] font-black tracking-widest bg-amber-100 text-amber-800 rounded-md uppercase">
                          {formData.negaraWisata || "TURKEY"}
                        </span>
                        {selectedPaket ? (
                          <span className="px-2 py-0.5 text-[9px] font-black tracking-widest bg-emerald-100 text-emerald-800 rounded-md uppercase animate-pulse">
                            TERHUBUNG DATABASE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-black tracking-widest bg-red-100 text-red-800 rounded-md uppercase">
                            DRAFT MANUAL
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-gray-900 text-sm sm:text-base uppercase tracking-wider">
                        {selectedPaket ? selectedPaket.nama : `PAKET WISATA ${formData.negaraWisata || "TURKEY"}`}
                      </h3>
                      {selectedPaket ? (
                        <p className="text-[11px] font-bold text-gray-500 leading-relaxed max-w-2xl">
                          RUTE: {selectedPaket.deskripsi}
                        </p>
                      ) : (
                        <p className="text-[11px] font-bold text-red-500 flex items-center gap-1">
                          ⚠️ Tidak ada Paket Wisata terpilih. Silakan pilih di bawah agar rute/itinerary terisi otomatis dari database.
                        </p>
                      )}
                    </div>
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center shrink-0">
                      <span className="text-[9px] font-black text-gray-400 tracking-wider">DURASI</span>
                      <span className="text-sm font-black text-blue-600">{selectedPaket ? selectedPaket.durasiHari : (formData.durasiWisata || 2)} HARI</span>
                    </div>
                  </div>

                  {/* Dropdown switch Paket Wisata langsung di halaman ini */}
                  <div className="mt-4 pt-4 border-t border-dashed border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider shrink-0">
                      PILIH HUBUNGAN DATA PAKET WISATA:
                    </span>
                    <select
                      value={formData.paketWisataId || ""}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const matched = paketWisataList.find((p) => p.id === selectedId);
                        setFormData({
                          ...formData,
                          paketWisataId: selectedId,
                          durasiWisata: matched ? matched.durasiHari : formData.durasiWisata,
                        });
                      }}
                      className="text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none max-w-md w-full"
                    >
                      <option value="">-- Pilih Paket Program Wisata (Database) --</option>
                      {paketWisataList
                        .filter(
                          (p) =>
                            (p.lokasi || "").toUpperCase() ===
                            (formData.negaraWisata || "").toUpperCase(),
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nama} ({p.durasiHari} Hari)
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              );
            })()}

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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <select
                  value={hotelFilterJarak}
                  onChange={(e) => setHotelFilterJarak(e.target.value)}
                  className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 outline-none appearance-none"
                >
                  <option value="ALL">Semua Jarak</option>
                  <option value="VERY_CLOSE">Sangat Dekat (≤ 150m)</option>
                  <option value="CLOSE">Dekat (≤ 350m)</option>
                  <option value="MEDIUM">Sedang (≤ 600m)</option>
                  <option value="FAR">Lebih Jauh (&gt; 600m)</option>
                </select>
                <select
                  value={hotelSort}
                  onChange={(e) => setHotelSort(e.target.value as "default" | "lowest" | "highest")}
                  className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 outline-none appearance-none"
                >
                  <option value="default">Tanpa Filter (Default)</option>
                  <option value="lowest">Harga Terendah</option>
                  <option value="highest">Harga Tertinggi</option>
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
                    String(getHelperStars(h.id, h.bintang)) === hotelFilterBintang,
                )
                .filter((h) => {
                  if (hotelFilterJarak === "ALL") return true;
                  const distStr = getHotelDistanceInternal(h);
                  const meters = parseDistanceInMeters(distStr);
                  if (hotelFilterJarak === "VERY_CLOSE") return meters <= 150;
                  if (hotelFilterJarak === "CLOSE") return meters <= 350;
                  if (hotelFilterJarak === "MEDIUM") return meters <= 600;
                  if (hotelFilterJarak === "FAR") return meters > 600;
                  return true;
                });

              const getPriceForWisataSort = (hotel: WizardHotel) => {
                const dyn = getHotelPriceDynamic(hotel, formData.tglBerangkat, 'Quad');
                if (dyn > 0) return dyn;
                return hotel.priceQuad || 0;
              };

              // 1. Group/deduplicate by name, keeping only the highest price item for each unique name
              const uniqueWisataMap = new window.Map<string, { hotel: WizardHotel, index: number }>();
              filtered.forEach((h, index) => {
                const normalizedName = getNormalizedHotelNameKey(h.nama || h.name || "");
                const price = getPriceForWisataSort(h);
                
                if (!normalizedName) return;
                
                if (!uniqueWisataMap.has(normalizedName)) {
                  uniqueWisataMap.set(normalizedName, { hotel: h, index });
                } else {
                  const existing = uniqueWisataMap.get(normalizedName)!;
                  if (price > getPriceForWisataSort(existing.hotel)) {
                    uniqueWisataMap.set(normalizedName, { hotel: h, index });
                  }
                }
              });

              // Convert the map back to array and restore relative original order
              const sorted = (Array.from(uniqueWisataMap.values()) as Array<{ hotel: WizardHotel; index: number }>)
                .sort((a, b) => a.index - b.index)
                .map((item) => item.hotel);

              if (hotelSort === "highest") {
                sorted.sort((a, b) => getPriceForWisataSort(b) - getPriceForWisataSort(a));
              } else if (hotelSort === "lowest") {
                sorted.sort((a, b) => getPriceForWisataSort(a) - getPriceForWisataSort(b));
              }

              const pageSize = 10;
              const totalPages = Math.ceil(sorted.length / pageSize);
              const paginated = sorted.slice(
                (hotelPage - 1) * pageSize,
                hotelPage * pageSize,
              );

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {paginated.map((hotel) => {
                      const isSelected = formData.hotelWisataId === hotel.id;
                      const metaObj = getMetaForHotelInternal(hotel.id, hotel.nama, hotel.kota);
                      const images = getHotelImages(metaObj?.photoUrl, hotel.id, hotel.nama, hotel.kota);

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
                            <HotelImageCarousel images={images} hotelName={hotel.nama} kota={hotel.kota} />

                            <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>
                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                              <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h4 className="text-white drop-shadow-md font-black uppercase text-sm">
                                    {hotel.nama}
                                  </h4>
                                  <div className="flex items-center gap-0.5 shrink-0 bg-[#0d1527]/50 border border-amber-500/30 px-1.5 py-0.5 rounded backdrop-blur-sm">
                                    {Array.from({ length: getHelperStars(hotel.id, hotel.bintang || 5) }).map((_, idx) => (
                                      <Star key={idx} className="w-2.5 h-2.5 fill-amber-450 text-amber-400" />
                                    ))}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] text-gray-700 bg-white/90 px-1.5 py-0.5 rounded font-bold uppercase w-fit">
                                    {hotel.kota}
                                  </span>
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
            {(() => {
              const selectedPaket = paketWisataList.find((p) => p.id === formData.paketWisataId);
              // Split description by " - " delimiter to extract daily programs
              const activities = selectedPaket && selectedPaket.deskripsi 
                ? selectedPaket.deskripsi.split(/\s*-\s*/) 
                : [];

              return (
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-6 flex items-center justify-between">
                    <span>PREVIEW ITINERARY WISATA {selectedPaket && " (TERHUBUNG)"}</span>
                    {selectedPaket && (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                        {selectedPaket.nama}
                      </span>
                    )}
                  </h4>
                  <div className="space-y-0 text-sm">
                    {[...Array(Math.max(1, formData.durasiWisata))].map((_, idx) => {
                      const activityText = activities[idx] || (activities.length > 0 
                        ? `Kelanjutan Program: ${activities.join(" & ")}`
                        : "");

                      return (
                        <div key={idx} className="flex relative">
                          {/* Line connector */}
                          {idx < formData.durasiWisata - 1 && (
                            <div className="absolute left-[7px] top-6 bottom-0 w-[1px] bg-gray-300"></div>
                          )}

                          {/* Circle marker */}
                          <div className={`w-4 h-4 rounded-full border-2 bg-white z-10 shrink-0 mt-1 mr-4 ${selectedPaket ? "border-[#009B66]" : "border-blue-500"}`}></div>

                          <div className="pb-8">
                            <h5 className="font-bold text-gray-800 text-[11px] tracking-wider uppercase mb-1">
                              HARI KE-{idx + 1}: {activityText ? activityText : `EKSPLORASI ${formData.negaraWisata || "TURKEY"}`}
                            </h5>
                            <p className="text-[10px] text-gray-500 leading-relaxed max-w-2xl">
                              {selectedPaket ? (
                                `Bagian dari program tour resmi ${selectedPaket.nama} di ${formData.negaraWisata || "Turkey"}. Agenda harian mencakup kunjungan ke destinasi populer, transportasi lokal ber-AC, pemandu wisata lokal berbahasa Indonesia/Inggris, serta makan sesuai jadwal.`
                              ) : (
                                `Agenda itinerary sedang dalam penyusunan. Mengunjungi destinasi populer dan penginapan di ${formData.negaraWisata || "Turkey"}. Termasuk makan siang dan sarapan sesuai standar pelayanan yang berlaku.`
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
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
            <div className="bg-[#1e2336] rounded-xl p-4 mb-6">
              {/* Info Program Card */}
              <div className="flex items-center justify-between bg-[#151928] border border-blue-500/20 px-3 py-2 rounded-xl mb-4 text-xs font-semibold text-blue-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                  <span>Program Terpilih (Tahap 1):</span>
                  <strong className="text-white text-sm bg-blue-600/30 px-2.5 py-0.5 rounded font-bold font-mono">
                    {formData.durasiHari || 9} HARI
                  </strong>
                </div>
                <span className="hidden sm:inline text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                  Batasan Aktif
                </span>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
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
                        if (hotelStep === "madinah" && (Number(formData.durasiMadinah) || 3) > 1) {
                          const newDur = (Number(formData.durasiMadinah) || 3) - 1;
                          const inDateStr = formData.chkInMadinah || formData.tglBerangkat;
                          let newOut = formData.chkOutMadinah;
                          if (inDateStr) {
                            const dateVal = new Date(inDateStr);
                            if (!isNaN(dateVal.getTime())) {
                              dateVal.setDate(dateVal.getDate() + newDur);
                              newOut = dateVal.toISOString().split("T")[0];
                            }
                          }
                          setFormData({
                            ...formData,
                            durasiMadinah: newDur,
                            chkOutMadinah: newOut,
                          });
                        }
                        if (hotelStep === "makkah" && (Number(formData.durasiMakkah) || 4) > 1) {
                          const newDur = (Number(formData.durasiMakkah) || 4) - 1;
                          const inDateStr = formData.chkInMakkah || formData.tglBerangkat;
                          let newOut = formData.chkOutMakkah;
                          if (inDateStr) {
                            const dateVal = new Date(inDateStr);
                            if (!isNaN(dateVal.getTime())) {
                              dateVal.setDate(dateVal.getDate() + newDur);
                              newOut = dateVal.toISOString().split("T")[0];
                            }
                          }
                          setFormData({
                            ...formData,
                            durasiMakkah: newDur,
                            chkOutMakkah: newOut,
                          });
                        }
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
                        const programDays = Number(formData.durasiHari) || 9;
                        const maxAllowedCombined = programDays - 1;

                        if (hotelStep === "madinah") {
                          const currentDur = Number(formData.durasiMadinah) || 3;
                          const inDateStr = formData.chkInMadinah || formData.tglBerangkat;
                          
                          let maxN = maxAllowedCombined;
                          if (inDateStr && formData.tglKepulangan) {
                            const dIn = new Date(inDateStr);
                            const dOutLimit = new Date(formData.tglKepulangan);
                            if (!isNaN(dIn.getTime()) && !isNaN(dOutLimit.getTime())) {
                              const diffDays = Math.floor((dOutLimit.getTime() - dIn.getTime()) / (1000 * 3600 * 24));
                              if (diffDays > 0) {
                                maxN = Math.min(maxN, diffDays);
                              }
                            }
                          }
                          maxN = Math.max(1, maxN);

                          if (currentDur < maxN) {
                            const newDur = currentDur + 1;
                            let newOut = formData.chkOutMadinah;
                            if (inDateStr) {
                              const dateVal = new Date(inDateStr);
                              if (!isNaN(dateVal.getTime())) {
                                dateVal.setDate(dateVal.getDate() + newDur);
                                newOut = dateVal.toISOString().split("T")[0];
                              }
                            }
                            setFormData({
                              ...formData,
                              durasiMadinah: newDur,
                              chkOutMadinah: newOut,
                            });
                          }
                        }

                        if (hotelStep === "makkah") {
                          const currentDur = Number(formData.durasiMakkah) || 4;
                          const inDateStr = formData.chkInMakkah || formData.tglBerangkat;
                          
                          let maxN = maxAllowedCombined;
                          if (inDateStr && formData.tglKepulangan) {
                            const dIn = new Date(inDateStr);
                            const dOutLimit = new Date(formData.tglKepulangan);
                            if (!isNaN(dIn.getTime()) && !isNaN(dOutLimit.getTime())) {
                              const diffDays = Math.floor((dOutLimit.getTime() - dIn.getTime()) / (1000 * 3600 * 24));
                              if (diffDays > 0) {
                                maxN = Math.min(maxN, diffDays);
                              }
                            }
                          }
                          maxN = Math.max(1, maxN);

                          if (currentDur < maxN) {
                            const newDur = currentDur + 1;
                            let newOut = formData.chkOutMakkah;
                            if (inDateStr) {
                              const dateVal = new Date(inDateStr);
                              if (!isNaN(dateVal.getTime())) {
                                dateVal.setDate(dateVal.getDate() + newDur);
                                newOut = dateVal.toISOString().split("T")[0];
                              }
                            }
                            setFormData({
                              ...formData,
                              durasiMakkah: newDur,
                              chkOutMakkah: newOut,
                            });
                          }
                        }
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
                      const maxAllowedCombined = (Number(formData.durasiHari) || 9) - 1;

                      if (hotelStep === "madinah") {
                        const inDate = new Date(
                          formData.chkInMadinah || formData.tglBerangkat,
                        );
                        if (
                          !isNaN(dateVal.getTime()) &&
                          !isNaN(inDate.getTime())
                        ) {
                          const rawDiff = Math.ceil(
                            (dateVal.getTime() - inDate.getTime()) /
                              (1000 * 3600 * 24),
                          );
                          const diff = Math.min(maxAllowedCombined, Math.max(1, rawDiff));
                          const finalDate = new Date(inDate);
                          finalDate.setDate(finalDate.getDate() + diff);
                          const finalDateStr = finalDate.toISOString().split("T")[0];

                          setFormData({
                            ...formData,
                            chkOutMadinah: finalDateStr,
                            durasiMadinah: diff,
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
                          const rawDiff = Math.ceil(
                            (dateVal.getTime() - inDate.getTime()) /
                              (1000 * 3600 * 24),
                          );
                          const diff = Math.min(maxAllowedCombined, Math.max(1, rawDiff));
                          const finalDate = new Date(inDate);
                          finalDate.setDate(finalDate.getDate() + diff);
                          const finalDateStr = finalDate.toISOString().split("T")[0];

                          setFormData({
                            ...formData,
                            chkOutMakkah: finalDateStr,
                            durasiMakkah: diff,
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <select
                  value={hotelFilterJarak}
                  onChange={(e) => setHotelFilterJarak(e.target.value)}
                  className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 outline-none appearance-none"
                >
                  <option value="ALL">Semua Jarak</option>
                  <option value="VERY_CLOSE">Sangat Dekat (≤ 150m)</option>
                  <option value="CLOSE">Dekat (≤ 350m)</option>
                  <option value="MEDIUM">Sedang (≤ 600m)</option>
                  <option value="FAR">Lebih Jauh (&gt; 600m)</option>
                </select>
                <select
                  value={hotelSort}
                  onChange={(e) => setHotelSort(e.target.value as "default" | "lowest" | "highest")}
                  className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 outline-none appearance-none"
                >
                  <option value="default">Tanpa Filter (Default)</option>
                  <option value="lowest">Harga Terendah</option>
                  <option value="highest">Harga Tertinggi</option>
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
                    String(getHelperStars(h.id, h.bintang)) === hotelFilterBintang,
                )
                .filter((h) => {
                  if (hotelFilterJarak === "ALL") return true;
                  const distStr = getHotelDistanceInternal(h);
                  const meters = parseDistanceInMeters(distStr);
                  if (hotelFilterJarak === "VERY_CLOSE") return meters <= 150;
                  if (hotelFilterJarak === "CLOSE") return meters <= 350;
                  if (hotelFilterJarak === "MEDIUM") return meters <= 600;
                  if (hotelFilterJarak === "FAR") return meters > 600;
                  return true;
                });

              const getPriceForSort = (hotel: WizardHotel) => {
                const dyn = getHotelPriceDynamic(hotel, checkDate, 'Quad');
                if (dyn > 0) return dyn;
                return hotel.priceQuad || 0;
              };

              // 1. Group/deduplicate by name, keeping only the highest price item for each unique name
              const uniqueMap = new window.Map<string, { hotel: WizardHotel, index: number }>();
              filtered.forEach((h, index) => {
                const normalizedName = getNormalizedHotelNameKey(h.nama || h.name || "");
                const price = getPriceForSort(h);
                
                if (!normalizedName) return;
                
                if (!uniqueMap.has(normalizedName)) {
                  uniqueMap.set(normalizedName, { hotel: h, index });
                } else {
                  const existing = uniqueMap.get(normalizedName)!;
                  if (price > getPriceForSort(existing.hotel)) {
                    uniqueMap.set(normalizedName, { hotel: h, index });
                  }
                }
              });

              // Convert the map back to array and restore relative original order
              const sorted = (Array.from(uniqueMap.values()) as Array<{ hotel: WizardHotel; index: number }>)
                .sort((a, b) => a.index - b.index)
                .map((item) => item.hotel);

              if (hotelSort === "highest") {
                sorted.sort((a, b) => getPriceForSort(b) - getPriceForSort(a));
              } else if (hotelSort === "lowest") {
                sorted.sort((a, b) => getPriceForSort(a) - getPriceForSort(b));
              }

              const pageSize = 16;
              const totalPages = Math.ceil(sorted.length / pageSize);
              const paginated = sorted.slice(
                (hotelPage - 1) * pageSize,
                hotelPage * pageSize,
              );

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {paginated.map((hotel) => {
                      const isSelected =
                        hotelStep === "madinah"
                          ? formData.hotelMadinahId === hotel.id
                          : formData.hotelMakkahId === hotel.id;

                      const currentPriceQuad = getHotelPriceDynamic(hotel, checkDate, 'Quad');
                      const currentPriceTriple = getHotelPriceDynamic(hotel, checkDate, 'Triple');
                      const currentPriceDouble = getHotelPriceDynamic(hotel, checkDate, 'Double');

                      const displayPriceQuad = currentPriceQuad > 0 ? Math.ceil(currentPriceQuad / 1000) * 1000 : 0;
                      const displayPriceTriple = currentPriceTriple > 0 ? Math.ceil(currentPriceTriple / 1000) * 1000 : 0;
                      const displayPriceDouble = currentPriceDouble > 0 ? Math.ceil(currentPriceDouble / 1000) * 1000 : 0;

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

                      const metaObj = getMetaForHotelInternal(hotel.id, hotel.nama, hotel.kota);
                      const distanceStr = metaObj?.distance || getFallbackDistance(hotel.id, hotel.nama) || "";
                      const images = getHotelImages(metaObj?.photoUrl, hotel.id, hotel.nama, hotel.kota);

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
                          className={`bg-[#0b101e] rounded-xl overflow-hidden border cursor-pointer transition-all flex flex-col relative group ${
                            isSelected
                              ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] ring-2 ring-blue-500/80"
                              : "border-gray-800/80 hover:border-gray-700 hover:shadow-md hover:shadow-black/20"
                          }`}
                        >
                          {/* TOP SECTION: CLEAR HOTEL PHOTO */}
                          <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
                            <HotelImageCarousel images={images} hotelName={hotel.nama} kota={hotel.kota} />
                            {/* Subtle gradient overlay at the bottom for readability */}
                            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent"></div>

                            {/* Checkbox indicator absolute top-right */}
                            <div className="absolute top-2.5 right-2.5">
                              <div
                                className={`w-6.5 h-6.5 rounded-full flex items-center justify-center transition-all shadow-md ${
                                  isSelected
                                    ? "bg-blue-500 text-white border border-blue-450"
                                    : "bg-black/50 text-gray-300 border border-white/15 backdrop-blur-xs"
                                }`}
                              >
                                {isSelected ? (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-white/20 transition-colors" />
                                )}
                              </div>
                            </div>

                            {/* Distance / Map Pin absolute bottom-2.5 left-2.5 */}
                            {distanceStr && (
                              <span className="absolute bottom-2.5 left-2.5 bg-sky-500/95 text-white px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-bold flex items-center gap-0.5 shadow-md backdrop-blur-xs">
                                <MapPin className="w-3 h-3 text-white" />
                                <span className="max-w-[100px] truncate">{distanceStr}</span>
                              </span>
                            )}
                          </div>

                          {/* BOTTOM SECTION: HOTEL INFORMATION & PRICING */}
                          <div className="p-3 flex flex-col flex-1 justify-between gap-3">
                            <div className="space-y-1.5">
                              <div className="flex flex-col gap-0.5">
                                <h4 className="text-white font-extrabold uppercase text-xs sm:text-xs line-clamp-1 tracking-wide leading-tight group-hover:text-blue-400 transition-colors" title={hotel.nama}>
                                  {hotel.nama}
                                </h4>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                    {hotel.kota}
                                  </span>

                                  {/* Bintang (Stars) next to Kota */}
                                  <div className="flex items-center gap-0.5 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/15">
                                    {Array.from({ length: getHelperStars(hotel.id, hotel.bintang || 5) }).map((_, idx) => (
                                      <Star key={idx} className="w-2 h-2 fill-amber-400 text-amber-400" />
                                    ))}
                                  </div>

                                  {/* MEAL PLAN BADGE */}
                                  <span className="ml-auto bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded text-[8px] font-black tracking-wider">
                                    {hotel.mealPlan || "FB"}
                                  </span>
                                </div>
                              </div>

                              {seasonText && (
                                <span className="inline-flex bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold items-center gap-1 shadow-sm max-w-full">
                                  <Calendar className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{seasonText}</span>
                                </span>
                              )}
                            </div>

                            {/* PRICING GRID */}
                            <div className="grid grid-cols-3 gap-1">
                              {/* QUAD */}
                              <div className="bg-[#131b2e] rounded-lg px-1 py-1.5 text-center border border-gray-800/60 flex flex-col justify-between min-w-0 shadow-sm">
                                <div className="text-[7px] text-gray-400 font-extrabold uppercase tracking-wider mb-0.5">
                                  QUAD
                                </div>
                                <div
                                  className="text-emerald-400 font-black text-[9px] sm:text-xs whitespace-nowrap leading-tight tracking-tight flex items-center justify-center gap-0.5"
                                  title={`Rp ${Math.round(displayPriceQuad || 0).toLocaleString("id-ID")}`}
                                >
                                  <span className="text-[6px] sm:text-[7px] font-bold text-emerald-400/70 shrink-0">Rp</span>
                                  <span className="truncate">{Math.round(displayPriceQuad || 0).toLocaleString("id-ID")}</span>
                                </div>
                                <div className="text-[6px] text-gray-500 mt-0.5 uppercase font-semibold">
                                  PAX/MLM
                                </div>
                              </div>

                              {/* TRIPLE */}
                              <div className="bg-[#131b2e] rounded-lg px-1 py-1.5 text-center border border-gray-800/60 flex flex-col justify-between min-w-0 shadow-sm">
                                <div className="text-[7px] text-gray-400 font-extrabold uppercase tracking-wider mb-0.5">
                                  TRIPLE
                                </div>
                                <div
                                  className="text-emerald-400 font-black text-[9px] sm:text-xs whitespace-nowrap leading-tight tracking-tight flex items-center justify-center gap-0.5"
                                  title={`Rp ${Math.round(displayPriceTriple || 0).toLocaleString("id-ID")}`}
                                >
                                  <span className="text-[6px] sm:text-[7px] font-bold text-emerald-400/70 shrink-0">Rp</span>
                                  <span className="truncate">{Math.round(displayPriceTriple || 0).toLocaleString("id-ID")}</span>
                                </div>
                                <div className="text-[6px] text-gray-500 mt-0.5 uppercase font-semibold">
                                  PAX/MLM
                                </div>
                              </div>

                              {/* DOUBLE */}
                              <div className="bg-[#131b2e] rounded-lg px-1 py-1.5 text-center border border-gray-800/60 flex flex-col justify-between min-w-0 shadow-sm">
                                <div className="text-[7px] text-gray-400 font-extrabold uppercase tracking-wider mb-0.5">
                                  DOUBLE
                                </div>
                                <div
                                  className="text-emerald-400 font-black text-[9px] sm:text-xs whitespace-nowrap leading-tight tracking-tight flex items-center justify-center gap-0.5"
                                  title={`Rp ${Math.round(displayPriceDouble || 0).toLocaleString("id-ID")}`}
                                >
                                  <span className="text-[6px] sm:text-[7px] font-bold text-emerald-400/70 shrink-0">Rp</span>
                                  <span className="truncate">{Math.round(displayPriceDouble || 0).toLocaleString("id-ID")}</span>
                                </div>
                                <div className="text-[6px] text-gray-500 mt-0.5 uppercase font-semibold">
                                  PAX/MLM
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

            {/* Dynamic Pax Adjuster for Mitigating Publish Price Errors */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-5 md:p-6 text-white border border-blue-500/20 shadow-xl mb-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-blue-500 text-white font-black text-[9px] px-2.5 py-0.5 rounded uppercase tracking-wider">
                      Dynamic Recalculation Engine
                    </span>
                    <span className="bg-amber-500 text-white font-black text-[9px] px-2.5 py-0.5 rounded uppercase tracking-wider">
                      Offline-Safe Anti-Loss
                    </span>
                  </div>
                  <h4 className="text-base md:text-lg font-black uppercase tracking-tight">
                    Penyesuaian Pax Aktual & Rekalkulasi Biaya
                  </h4>
                  <p className="text-xs text-blue-100 font-medium leading-relaxed">
                    Jika kuota awal dipublish untuk <span className="font-bold underline">35 Pax</span>, namun pendaftar riil hanya <span className="font-bold underline">20 Pax</span>, Anda tidak perlu rugi! Cukup ubah angka Pax di bawah ini. Seluruh estimasi komponen operasional (seperti sharing bus, pemandu mutawif, asuransi, visa tier, dll.) akan dihitung ulang secara otomatis per kepala.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15 flex flex-col items-center justify-center shrink-0 w-full md:w-56">
                  <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-2">
                    Jumlah Pax Aktual
                  </span>
                  
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = Number(formData.targetJamaah) || 35;
                        if (cur > 2) {
                          setFormData({ ...formData, targetJamaah: cur - 1 });
                        }
                      }}
                      className="w-10 h-10 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 transition-all flex items-center justify-center text-white font-black text-lg focus:outline-none"
                    >
                      -
                    </button>
                    
                    <div className="relative">
                      <input
                        type="number"
                        min="2"
                        max="90"
                        value={formData.targetJamaah || ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setFormData({
                            ...formData,
                            targetJamaah: isNaN(val) ? 0 : Math.min(90, Math.max(2, val)),
                          });
                        }}
                        className="w-20 h-10 bg-white text-gray-900 rounded-lg text-center font-black text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const cur = Number(formData.targetJamaah) || 35;
                        if (cur < 90) {
                          setFormData({ ...formData, targetJamaah: cur + 1 });
                        }
                      }}
                      className="w-10 h-10 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 transition-all flex items-center justify-center text-white font-black text-lg focus:outline-none"
                    >
                      +
                    </button>
                  </div>
                  
                  <div className="text-[9px] text-blue-300 font-semibold uppercase mt-3 tracking-wider animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Menghitung Ulang Otomatis
                  </div>
                </div>
              </div>
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
                let rawPrice = (item as { harga?: number }).harga || 0;
                if (isGroup) {
                  const activeOpt = item.options?.find((opt) =>
                    formData.selectedLayanan?.includes(opt.id),
                  );
                  if (activeOpt) {
                    rawPrice = activeOpt.price;
                  } else {
                    // Defaults to first price, or 0 if empty
                    rawPrice = item.options?.[0]?.price || 0;
                  }
                }
                const displayPrice = rawPrice > 0 ? Math.ceil(rawPrice / 1000) * 1000 : 0;

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
                    {isGroup && isGroupSelected && item.id !== "group_mutawif" && (
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
                    Rp {pricingSummary.layananTotal.toLocaleString("id-ID")}
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

                  const effectiveIsMitra = isMitraContext || !!formData.mitraId;
                  const marginMitra = effectiveIsMitra ? (Number(formData.markup !== undefined ? formData.markup : formData.marginBersih) || 0) : 0;
                  const adminFeeMitra = marginMitra * 0.1;
                  const totalMarkupMitra = marginMitra + adminFeeMitra;

                  const currentMarkup = effectiveIsMitra ? marginMitra : marginAdmin;
                  const adminFeeDisplay = effectiveIsMitra ? adminFeeMitra : adminFeeAdmin;
                  const totalMarkupDisplay = effectiveIsMitra ? totalMarkupMitra : totalMarkupAdmin;

                  return (
                    <div className="space-y-8">
                      {/* Bagian 1: HPP Dasar */}
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest">
                            {formData.kategori === "TIKET ONLY" ? "1. HPP DASAR TIKET PESAWAT" : "1. HPP DASAR PER TIPE KAMAR"}
                          </h4>
                          <div className="px-2 py-1 bg-gray-100 rounded text-[9px] font-bold text-gray-500">
                            BIAYA MODAL
                          </div>
                        </div>
                        {formData.kategori === "TIKET ONLY" ? (
                          <div className="bg-white border border-gray-100 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] max-w-sm mx-auto">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                              HPP TIKET MASUK / MASKAPAI
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-gray-800 tracking-tighter">
                              Rp {Math.round(baseQuad || 0).toLocaleString("id-ID")}
                            </span>
                            <span className="text-[9px] font-bold text-gray-300 mt-1">
                              PER PAX
                            </span>
                          </div>
                        ) : (
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
                        )}
                      </div>

                      {/* Bagian 2: Pengaturan Profit */}
                      <div>
                        <h4 className="text-[10px] sm:text-xs font-black text-blue-600 border-l-4 border-blue-600 pl-2 uppercase tracking-widest mb-4">
                          2. PENGATURAN PROFIT (UJROH MITRA)
                        </h4>

                        <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 text-center relative overflow-hidden">
                          <div className="inline-block relative z-10 w-full max-w-md mx-auto">
                            <div className="flex items-center justify-between mb-6 gap-2 sm:gap-4">
                              <button
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    [isMitraContext ? "markup" : "marginBersih"]: Math.max(0, currentMarkup - 500000),
                                  })
                                }
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border-2 border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors bg-white shadow-sm shrink-0"
                              >
                                <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>

                              <div className="flex-1 flex flex-col items-center px-1 sm:px-3 min-w-0">
                                <div className="flex items-start text-blue-600">
                                  <span className="text-xs sm:text-xl font-black mt-1 sm:mt-2 italic mr-0.5 sm:mr-1">
                                    Rp
                                  </span>
                                  <span
                                    className={`${
                                      currentMarkup >= 10000000
                                        ? "text-xl sm:text-3xl md:text-4xl"
                                        : currentMarkup >= 5000000
                                        ? "text-2xl sm:text-4xl md:text-[2.75rem]"
                                        : "text-2xl sm:text-4xl md:text-[3.25rem]"
                                    } font-black italic tracking-tight leading-none`}
                                    style={{ fontFamily: "Impact, sans-serif" }}
                                  >
                                    {Math.round(currentMarkup || 0).toLocaleString("id-ID")}
                                  </span>
                                </div>
                                <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mt-1.5 sm:mt-2 whitespace-nowrap">
                                  MARGIN BERSIH
                                </span>
                              </div>

                              <button
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    [isMitraContext ? "markup" : "marginBersih"]: Math.min(10000000, currentMarkup + 500000),
                                  })
                                }
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-colors shrink-0"
                              >
                                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            </div>

                            {/* Slider Margin */}
                            <div className="w-full max-w-md mx-auto mb-6 px-1 sm:px-2">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                  GESER MARGIN (KELIPATAN 500RB)
                                </span>
                                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-[9px] font-black uppercase">
                                  Rp {(currentMarkup / 1000000).toFixed(1)} JT
                                </span>
                              </div>
                              <div className="pt-2 pb-1 relative group">
                                <input
                                  type="range"
                                  min="0"
                                  max="10000000"
                                  step="500000"
                                  value={currentMarkup || 0}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      [isMitraContext ? "markup" : "marginBersih"]: parseInt(e.target.value),
                                    })
                                  }
                                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="flex justify-between text-[9px] font-bold text-blue-300 mt-2">
                                  <span>Rp 0</span>
                                  <span>Rp 10.000.000</span>
                                </div>
                              </div>
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

                        {formData.kategori === "TIKET ONLY" ? (
                          <div className="bg-[#111424] border border-gray-800 p-8 sm:p-10 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-2xl max-w-md mx-auto w-full">
                            <div className="px-3 py-1 bg-white/10 border border-white/10 rounded-lg mb-4">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#009B66]">
                                TIKET ONLY PACKAGE
                              </span>
                            </div>
                            <div className="text-2xl sm:text-3xl font-black text-white italic mb-2 tracking-tighter">
                              <span className="text-lg mr-1 inline-block">Rp</span>
                              {Math.round(finalQuad || 0).toLocaleString("id-ID")}
                            </div>
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                              HARGA TIKET NET / PER PAX
                            </span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-center">
                            {[
                              {
                                title: "QUAD PACKAGE",
                                val: finalQuad,
                                type: "dark",
                                tagColor: "text-blue-400",
                              },
                              {
                                title: "TRIPLE PACKAGE",
                                val: finalTriple,
                                type: "light",
                                tagColor: "text-[#009B66]",
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
                        )}
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
                    finalDouble
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
                                        {destinationDisplay}
                                      </>
                                    ) : (
                                      <>
                                        {destinationDisplay}{" "}
                                        <ArrowRight className="w-3 h-3 text-gray-400" />{" "}
                                        {formData.negaraWisata || "TURKEY"}
                                      </>
                                    )}
                                  </>
                                ) : (
                                  destinationDisplay
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
                              <div className="flex flex-col">
                                <span className="font-bold text-xs sm:text-sm text-gray-700 uppercase">
                                  {maskapaiList.find(
                                    (m) => m.id === formData.maskapaiId,
                                  )?.name || "MASKAPAI"}{" "}
                                  ({formData.kelasPenerbangan || "EKONOMI"})
                                </span>
                                {formData.flightItinerary && (
                                  <pre className="text-[10px] text-gray-500 font-mono whitespace-pre-wrap mt-1.5 border-l-2 border-emerald-500 pl-2 leading-relaxed bg-gray-50/70 p-2 rounded-lg max-w-sm sm:max-w-md">
                                    {formData.flightItinerary}
                                  </pre>
                                )}
                              </div>
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
                                  {getHelperStars(formData.hotelWisataId, hWisata?.bintang)} (
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
                                  {hMadinah.nama} ★{getHelperStars(formData.hotelMadinahId, hMadinah.bintang)} (
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
                                  {hMakkah.nama} ★{getHelperStars(formData.hotelMakkahId, hMakkah.bintang)} (
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

                          {(isMitraContext || !!formData.mitraId) && pricingSummary.adminServiceFee > 0 && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 border-dashed">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                                  <Check className="w-4 h-4 text-emerald-500" />
                                </div>
                                <span className="font-bold text-xs sm:text-sm text-gray-700 uppercase">
                                  SISTEM & LAYANAN PUSAT
                                </span>
                              </div>
                              <span className="font-black text-xs sm:text-sm text-blue-600 italic">
                                Rp {pricingSummary.adminServiceFee.toLocaleString("id-ID")}
                              </span>
                            </div>
                          )}


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
                              {Math.round(pricingSummary.adminFee || 0).toLocaleString("id-ID")})
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

            <div className="pt-6 max-w-xl">
              {/* 2. TIPE PENJUALAN */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-black mt-0.5">
                    2.
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

            {/* Bagian 3: Pembagian Hasil (hanya muncul jika jual bersama) */}
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
      <div style={{ height: 0, overflow: 'hidden', position: 'absolute', top: 0, left: 0, width: '100%', pointerEvents: 'none' }}>
        <div id="pdf-export-content" className="bg-white text-gray-900 p-10 w-[210mm] min-h-[297mm]">
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
        <div style={{ pageBreakInside: 'avoid' }} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
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
                  <div className="text-[11px] font-black text-gray-700 uppercase flex items-center flex-wrap gap-1">
                    {formData.kotaKeberangkatan || "JAKARTA"}
                    <span className="text-gray-400 font-bold mx-0.5">→</span>
                    {formData.kategori === "UMRAH PLUS" ? (
                      formData.alurPerjalanan === "WISATA TERLEBIH DAHULU" ? (
                        <>
                          {formData.negaraWisata || "TURKEY"}
                          <span className="text-gray-400 font-bold mx-0.5">→</span>
                          {destinationDisplay}
                        </>
                      ) : (
                        <>
                          {destinationDisplay}
                          <span className="text-gray-400 font-bold mx-0.5">→</span>
                          {formData.negaraWisata || "TURKEY"}
                        </>
                      )
                    ) : (
                      destinationDisplay
                    )}
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
          <div style={{ pageBreakInside: 'avoid' }} className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Check className="w-5 h-5" />
            </div>
            <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">
              FASILITAS & RINCIAN HARGA
            </h3>
          </div>

          <div className="space-y-6">
            <div style={{ pageBreakInside: 'avoid' }} className="flex justify-between items-center py-2 border-b border-gray-50 border-dashed">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                   <Plane className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-gray-800 uppercase">
                     {maskapaiList.find(m => m.id === formData.maskapaiId)?.name || 'MASKAPAI'} ({formData.kelasPenerbangan || 'EKONOMI'})
                  </span>
                  {formData.flightItinerary && (
                    <pre style={{ whiteSpace: 'pre-wrap' }} className="text-[10px] text-gray-500 font-mono mt-1 border-l-2 border-emerald-500 pl-2 leading-relaxed bg-gray-50/70 p-1.5 rounded max-w-sm">
                      {formData.flightItinerary}
                    </pre>
                  )}
                </div>
              </div>
              <span className="font-black text-blue-700 italic">Rp {Number(formData.estimasiHargaMaskapai || 0).toLocaleString('id-ID')}</span>
            </div>

            {pricingSummary.hMadinah && (
              <div style={{ pageBreakInside: 'avoid' }} className="flex justify-between items-center py-2 border-b border-gray-50 border-dashed">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                     <Building2 className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm text-gray-800 uppercase">
                     {pricingSummary.hMadinah.nama} ★{getHelperStars(formData.hotelMadinahId, pricingSummary.hMadinah.bintang)} ({parseNum(formData.durasiMadinah, 3)} MALAM)
                  </span>
                </div>
                <span className="font-black text-blue-700 italic">Rp {pricingSummary.hQuadMadinah.toLocaleString('id-ID')}</span>
              </div>
            )}

            {pricingSummary.hMakkah && (
              <div style={{ pageBreakInside: 'avoid' }} className="flex justify-between items-center py-2 border-b border-gray-50 border-dashed">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                     <Building2 className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm text-gray-800 uppercase">
                     {pricingSummary.hMakkah.nama} ★{getHelperStars(formData.hotelMakkahId, pricingSummary.hMakkah.bintang)} ({parseNum(formData.durasiMakkah, 4)} MALAM)
                  </span>
                </div>
                <span className="font-black text-blue-700 italic">Rp {pricingSummary.hQuadMakkah.toLocaleString('id-ID')}</span>
              </div>
            )}

            {pricingSummary.selectedLayananItems.map((item) => (
              <div key={item.id} style={{ pageBreakInside: 'avoid' }} className="flex justify-between items-center py-2 border-b border-gray-50 border-dashed">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                     <Check className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm text-gray-800 uppercase">{item.nama}</span>
                </div>
                <span className="font-black text-blue-700 italic">Rp {(item.harga || 0).toLocaleString('id-ID')}</span>
              </div>
            ))}

            {(isMitraContext || !!formData.mitraId) && pricingSummary.adminServiceFee > 0 && (
              <div style={{ pageBreakInside: 'avoid' }} className="flex justify-between items-center py-2 border-b border-gray-50 border-dashed">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                     <Check className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm text-gray-800 uppercase">SISTEM & LAYANAN PUSAT</span>
                </div>
                <span className="font-black text-blue-700 italic">Rp {pricingSummary.adminServiceFee.toLocaleString('id-ID')}</span>
              </div>
            )}


            {(pricingSummary.totalKomisiMitra > 0) && (
              <>
                <div style={{ pageBreakInside: 'avoid' }} className="flex justify-between items-center py-2 border-b border-gray-50 border-dashed">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                       <Banknote className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-sm text-gray-800 uppercase">
                      {(isMitraContext || !!formData.mitraId) ? 'KOMISI MITRA' : 'TOTAL UJROH PAKET'}
                    </span>
                  </div>
                  <span className="font-black text-blue-700 italic">Rp {pricingSummary.totalKomisiMitra.toLocaleString('id-ID')}</span>
                </div>
                <div style={{ pageBreakInside: 'avoid' }} className="flex justify-between items-center py-2 border-b border-gray-50 border-dashed">
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
        <div style={{ pageBreakInside: 'avoid' }} className="bg-[#111424] rounded-[2.5rem] p-10 border border-gray-800 shadow-2xl relative overflow-hidden text-white">
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
        <div style={{ pageBreakInside: 'avoid' }} className="mt-auto pt-20 grid grid-cols-2 gap-10">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-20 underline decoration-gray-100 underline-offset-8">Diketahui Oleh,</p>
            <div className="w-40 h-[2px] bg-gray-900/10 mx-auto mb-2"></div>
            <p className="text-[11px] font-black text-gray-900 uppercase">Direktur Operasional</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-20 underline decoration-gray-100 underline-offset-8">Disusun Oleh,</p>
            <div className="w-40 h-[2px] bg-gray-900/10 mx-auto mb-2"></div>
            <p className="text-[11px] font-black text-gray-900 uppercase">{userName}</p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default PaketMasterWizard;
