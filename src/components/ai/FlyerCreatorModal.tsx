import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Download, Sliders, Type, Settings, Sparkles, 
  RefreshCw, Save, AlertTriangle, Plus, Trash2, Upload, Image as ImageIcon, Move, Eye, EyeOff, Building2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { db, doc, updateDoc, serverTimestamp } from '../../firebase';
import { runWithOklchFix } from '../../utils/fileUtils';
import { PaketMaster, Maskapai } from '../../types';
import { hotels } from '../../data/hotels';

interface FlyerCreatorModalProps {
  paket: PaketMaster;
  onClose: () => void;
  mitraDetails?: { brandName: string; name: string; hp?: string } | null;
  maskapai?: Maskapai[];
}

export interface FlyerElement {
  id: string;
  label: string;
  type: 'text' | 'image';
  text?: string; // For text type
  imageUrl?: string; // For image type (Base64 or external url)
  fontSize?: number; // For text type
  width?: number; // For image width or text block width
  height?: number; // For image height
  xPos: number; // percentage (0-100)
  yPos: number; // percentage (0-100)
  color?: string; // For text color
  align?: 'left' | 'center' | 'right';
  isBold?: boolean;
  isItalic?: boolean;
  hasShadow?: boolean;
  hasBackground?: boolean; // For badge capsule effect
  show: boolean;
  isCustom?: boolean;
}

// Utility to format Indonesian date format dynamically (e.g. 2026-09-21 to 21 September 2026)
const formatIndonesianDate = (dateStr: string | undefined): string => {
  if (!dateStr) return 'DESEMBER 2026';
  
  // Try to parse YYYY-MM-DD
  const regYYYYMMDD = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = dateStr.match(regYYYYMMDD);
  if (match) {
    const year = match[1];
    const monthIndex = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${months[monthIndex]} ${year}`;
    }
  }
  
  // Try parsing default standard Date formats
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const monthIndex = d.getMonth();
      const year = d.getFullYear();
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${day} ${months[monthIndex]} ${year}`;
    }
  } catch {
    // ignore
  }
  
  return dateStr;
};

export const FlyerCreatorModal: React.FC<FlyerCreatorModalProps> = ({ 
  paket, 
  onClose,
  mitraDetails,
  maskapai
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'layout' | 'style'>('content');
  const [selectedElementId, setSelectedElementId] = useState<string>('title');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const flyerRef = useRef<HTMLDivElement>(null);

  // Background Customization States
  const [templateId, setTemplateId] = useState<string>('11TPEHKFNdMRPbwpdot6mcxT1PcB4Z8p5');
  const [customBgImage, setCustomBgImage] = useState<string | null>(null);
  const [customBgUrl, setCustomBgUrl] = useState<string>('');
  const [bgDimOpacity, setBgDimOpacity] = useState<number>(0); // 0 to 100 for backdrop overlay dimming
  const [useFallbackBg, setUseFallbackBg] = useState(false);
  const [bgGradient, setBgGradient] = useState('bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950');

  // TWO OPTIONS FLYER STATES
  const [flyerOption, setFlyerOption] = useState<'automatic' | 'editor'>('automatic');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [customHp, setCustomHp] = useState<string>(mitraDetails?.hp || '');
  const [customBrandName, setCustomBrandName] = useState<string>(mitraDetails?.brandName || '');
  const [customSupportName, setCustomSupportName] = useState<string>('PT. NAWAITUL UMROH HAJI');

  // Opsi 2 Custom States (Toggles & Positions)
  const [selectedAutoElementId, setSelectedAutoElementId] = useState<string>('programTitle');
  const [enableManualDragAuto, setEnableManualDragAuto] = useState<boolean>(false);
  const [showSupportedPpiu, setShowSupportedPpiu] = useState<boolean>(true);
  const [showTrustLogos, setShowTrustLogos] = useState<boolean>(true);

  const [autoElements, setAutoElements] = useState<Record<string, { xPos: number; yPos: number; width: number; show: boolean; label: string }>>({
    logoMitra: { xPos: 15, yPos: 11, width: 72, show: true, label: 'Logo Brand (Kiri Atas)' },
    supportedPpiu: { xPos: 76, yPos: 11, width: 230, show: true, label: 'Supported PPIU (Kanan Atas)' },
    programTitle: { xPos: 50, yPos: 26.8, width: 540, show: true, label: 'Judul Program & Durasi' },
    pricingFlight: { xPos: 50, yPos: 45.2, width: 540, show: true, label: 'Harga & Maskapai Penerbangan' },
    hotelsRow: { xPos: 50, yPos: 59.5, width: 540, show: true, label: 'Fasilitas Hotel Madinah & Makkah' },
    includesCard: { xPos: 50, yPos: 77.0, width: 540, show: true, label: 'Termasuk (Include) & Logo Otoritas' },
    footerBar: { xPos: 50, yPos: 95, width: 600, show: true, label: 'Footer Kontak & Informasi' },
  });

  // Resolve hotels details safely
  const resolvedHotelMadinah = hotels.find(h => h.id === paket.hotelMadinahId);
  const hotelMadinahName = resolvedHotelMadinah?.name || paket.hotelMadinahId || 'ODST / Setaraf';
  const hotelMadinahStars = resolvedHotelMadinah?.stars || resolvedHotelMadinah?.bintang || 3;

  const resolvedHotelMakkah = hotels.find(h => h.id === paket.hotelMakkahId);
  const hotelMakkahName = resolvedHotelMakkah?.name || paket.hotelMakkahId || 'ROYAL MAJESTIC / Setaraf';
  const hotelMakkahStars = resolvedHotelMakkah?.stars || resolvedHotelMakkah?.bintang || 4;

  // Sync mitraDetails
  useEffect(() => {
    if (mitraDetails?.hp) {
      setCustomHp(mitraDetails.hp);
    }
    if (mitraDetails?.brandName) {
      setCustomBrandName(mitraDetails.brandName);
    }
  }, [mitraDetails]);

  // Resolve maskapai name
  const resolvedMaskapaiName = maskapai?.find(m => m.id === paket.maskapaiId)?.name || 'GARUDA INDONESIA';

  // Load prices safely
  const formatCurrencyValue = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const initialPrice = paket.hargaJualQuad || paket.hargaDasar || paket.hargaEkonomi || 27500000;
  const initialPriceStr = `${formatCurrencyValue(initialPrice)}`;

  // Default Elements meticulously matched to the flyer layout scribbles
  const [elements, setElements] = useState<FlyerElement[]>([
    {
      id: 'logoMitra',
      label: 'Logo Brand Mitra (Top Left)',
      type: 'image',
      imageUrl: '', // default empty, user can upload
      width: 120,
      height: 120,
      xPos: 18,
      yPos: 11,
      show: true,
    },
    {
      id: 'title',
      label: 'Nama Program / Paket',
      type: 'text',
      text: paket.nama.toUpperCase(),
      fontSize: 32,
      xPos: 50,
      yPos: 27,
      color: '#F59E0B',
      align: 'center',
      isBold: true,
      isItalic: false,
      hasShadow: true,
      show: true,
    },
    {
      id: 'badgeDuration',
      label: 'Capsule Durasi & Tanggal',
      type: 'text',
      text: `${paket.durasiHari || 9} HARI | ${formatIndonesianDate(paket.tglBerangkat)}`,
      fontSize: 15,
      xPos: 50,
      yPos: 35,
      color: '#FFFFFF',
      align: 'center',
      isBold: true,
      isItalic: false,
      hasShadow: false,
      hasBackground: true, // Special black capsule badge behind it
      show: true,
    },
    {
      id: 'priceQuad',
      label: 'Harga HPP QUAD (Kiri)',
      type: 'text',
      text: `HPP QUAD\nRp ${(initialPrice / 1000000).toFixed(1)} Jt`,
      fontSize: 18,
      xPos: 35,
      yPos: 46,
      color: '#F59E0B',
      align: 'center',
      isBold: true,
      isItalic: false,
      hasShadow: true,
      show: true,
    },
    {
      id: 'priceTripleDouble',
      label: 'Harga Triple & Double (Tengah)',
      type: 'text',
      text: `HPP TRIPLE: Rp ${paket.hargaJualTriple ? (paket.hargaJualTriple / 1000000).toFixed(1) : 'XX,X'} Jt\nHPP DOUBLE: Rp ${paket.hargaJualDouble ? (paket.hargaJualDouble / 1000000).toFixed(1) : 'XX,X'} Jt`,
      fontSize: 13.5,
      xPos: 55,
      yPos: 46,
      color: '#FFFFFF',
      align: 'left',
      isBold: true,
      isItalic: false,
      hasShadow: true,
      show: true,
    },
    {
      id: 'flightBy',
      label: 'Maskapai Penerbangan (Kanan)',
      type: 'text',
      text: `Flight by:\n✈️ ${resolvedMaskapaiName}`,
      fontSize: 15,
      xPos: 76,
      yPos: 46,
      color: '#F59E0B',
      align: 'center',
      isBold: true,
      isItalic: false,
      hasShadow: true,
      show: true,
    },
    {
      id: 'hotelMadinah',
      label: 'Card Hotel Madinah (Kiri)',
      type: 'text',
      text: `🏨 HOTEL MADINAH\n${paket.hotelMadinahId ? 'Bintang 5' : 'ODST / Setaraf'}\n⭐⭐⭐`,
      fontSize: 13.5,
      xPos: 33,
      yPos: 56,
      color: '#111827',
      align: 'center',
      isBold: true,
      isItalic: false,
      hasShadow: false,
      show: true,
    },
    {
      id: 'hotelMakkah',
      label: 'Card Hotel Makkah (Kanan)',
      type: 'text',
      text: `🏨 HOTEL MAKKAH\n${paket.hotelMakkahId ? 'Bintang 5' : 'ROYAL MAJESTIC / Setaraf'}\n⭐⭐⭐⭐`,
      fontSize: 13.5,
      xPos: 67,
      yPos: 56,
      color: '#111827',
      align: 'center',
      isBold: true,
      isItalic: false,
      hasShadow: false,
      show: true,
    },
    {
      id: 'includeBox',
      label: 'Include / Daftar Fasilitas',
      type: 'text',
      text: `✨ INCLUDE & FASILITAS:\n• Asuransi Perjalanan & Visa Umroh Resmi\n• Tiket Pesawat PP & Hotel Full Board Saudi\n• Mutawif/Pembimbing Ibadah Berpengalaman\n• Air Zamzam & Perlengkapan Koper Premium`,
      fontSize: 13.5,
      xPos: 38,
      yPos: 76,
      color: '#1F2937',
      align: 'left',
      isBold: true,
      isItalic: false,
      hasShadow: false,
      show: true,
    },
    {
      id: 'contact',
      label: 'Footer Informasi Kontak',
      type: 'text',
      text: `Informasi & Pendaftaran Hubungi:\n📞 ${mitraDetails?.hp || '0812-3456-7890'} (${mitraDetails?.brandName || 'Mitra Umaroh'})`,
      fontSize: 16.5,
      xPos: 50,
      yPos: 92,
      color: '#FFFFFF',
      align: 'center',
      isBold: true,
      isItalic: false,
      hasShadow: true,
      show: true,
    }
  ]);

  // Load custom saved flyer configurations from Firestore if available
  useEffect(() => {
    const customFlyer = (paket as unknown as Record<string, unknown>).customFlyerSettings;
    if (customFlyer && Array.isArray(customFlyer)) {
      const upgraded = (customFlyer as Record<string, unknown>[]).map((el) => ({
        ...el,
        type: (el.type as string) || 'text', // backward compatibility
      })) as unknown as FlyerElement[];
      setElements(upgraded);
    }

    const customAutoSettings = (paket as unknown as Record<string, unknown>).customAutoFlyerSettings;
    if (customAutoSettings && typeof customAutoSettings === 'object') {
      setAutoElements(customAutoSettings as typeof autoElements);
    }
    const savedEnableManualDragAuto = (paket as unknown as Record<string, unknown>).enableManualDragAuto;
    if (typeof savedEnableManualDragAuto === 'boolean') {
      setEnableManualDragAuto(savedEnableManualDragAuto);
    }
    const savedShowSupportedPpiu = (paket as unknown as Record<string, unknown>).showSupportedPpiu;
    if (typeof savedShowSupportedPpiu === 'boolean') {
      setShowSupportedPpiu(savedShowSupportedPpiu);
    }
    const savedShowTrustLogos = (paket as unknown as Record<string, unknown>).showTrustLogos;
    if (typeof savedShowTrustLogos === 'boolean') {
      setShowTrustLogos(savedShowTrustLogos);
    }
  }, [paket]);

  const handleUpdateAutoElement = (id: string, updates: Partial<{ xPos: number; yPos: number; width: number; show: boolean }>) => {
    setAutoElements(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...updates
      }
    }));
  };

  const handleAutoElementDragStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    if (!enableManualDragAuto) return;
    e.preventDefault();
    setSelectedAutoElementId(id);
    const canvasElement = flyerRef.current;
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    
    const handleMove = (clientX: number, clientY: number) => {
      const xPercent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const yPercent = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      
      handleUpdateAutoElement(id, {
        xPos: Math.round(xPercent * 10) / 10,
        yPos: Math.round(yPercent * 10) / 10
      });
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleMove(moveEvent.clientX, moveEvent.clientY);
    };

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length > 0) {
        handleMove(moveEvent.touches[0].clientX, moveEvent.touches[0].clientY);
      }
    };

    const handleDragEnd = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };

    if (e.type === 'mousedown') {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleDragEnd);
    } else if (e.type === 'touchstart') {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    }
  };

  // Sync logoUrl and handle logo uploads
  useEffect(() => {
    const logoEl = elements.find(el => el.id === 'logoMitra');
    if (logoEl && logoEl.imageUrl) {
      setLogoUrl(logoEl.imageUrl);
    }
  }, [elements]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const base64 = event.target.result as string;
          setLogoUrl(base64);
          handleUpdateElement('logoMitra', { imageUrl: base64 });
          showMsg('success', 'Logo brand berhasil diunggah!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const showMsg = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleUpdateElement = (id: string, updates: Partial<FlyerElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const handleAddTextElement = () => {
    const newId = `custom_text_${Date.now()}`;
    const newElement: FlyerElement = {
      id: newId,
      label: `Teks Kustom #${elements.filter(e => e.isCustom).length + 1}`,
      type: 'text',
      text: 'Ketuk untuk edit teks kustom Anda...',
      fontSize: 12,
      xPos: 50,
      yPos: 50,
      color: '#FFFFFF',
      align: 'center',
      isBold: true,
      isItalic: false,
      hasShadow: true,
      show: true,
      isCustom: true
    };
    setElements(prev => [...prev, newElement]);
    setSelectedElementId(newId);
    showMsg('success', 'Berhasil menambahkan teks kustom baru! Silakan geser atau edit teks.');
  };

  const handleAddImageElement = () => {
    const newId = `custom_img_${Date.now()}`;
    const newElement: FlyerElement = {
      id: newId,
      label: `Gambar Kustom #${elements.filter(e => e.isCustom && e.type === 'image').length + 1}`,
      type: 'image',
      imageUrl: '', // starts empty, user uploads
      width: 60,
      height: 60,
      xPos: 50,
      yPos: 50,
      show: true,
      isCustom: true
    };
    setElements(prev => [...prev, newElement]);
    setSelectedElementId(newId);
    showMsg('success', 'Berhasil menambahkan placeholder gambar baru! Silakan upload file gambar di panel samping.');
  };

  const handleDeleteElement = (id: string) => {
    if (selectedElementId === id) {
      const remaining = elements.filter(el => el.id !== id);
      if (remaining.length > 0) {
        setSelectedElementId(remaining[0].id);
      }
    }
    setElements(prev => prev.filter(el => el.id !== id));
    showMsg('success', 'Elemen berhasil dihapus dari flyer.');
  };

  const selectedElement = elements.find(el => el.id === selectedElementId) || elements[0];

  // Save current positions and customizations to Firestore
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'paket_master', paket.id), {
        customFlyerSettings: elements,
        customAutoFlyerSettings: autoElements,
        enableManualDragAuto,
        showSupportedPpiu,
        showTrustLogos,
        updatedAt: serverTimestamp()
      });
      showMsg('success', 'Semua posisi elemen flyer berhasil disimpan permanen ke database!');
    } catch (err) {
      console.error(err);
      showMsg('error', 'Gagal menyimpan konfigurasi flyer ke database.');
    } finally {
      setIsSaving(false);
    }
  };

  // Get active background image
  const getImageUrl = () => {
    if (useFallbackBg) return '';
    if (customBgImage) return customBgImage;
    if (customBgUrl) return customBgUrl;
    return `https://lh3.googleusercontent.com/d/${templateId}`;
  };

  // Handle local background image upload
  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomBgImage(event.target.result as string);
          setUseFallbackBg(false);
          showMsg('success', 'Background kustom berhasil diunggah!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle local image element upload (such as logo, flight icons)
  const handleElementImageUpload = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleUpdateElement(id, { imageUrl: event.target.result as string });
          showMsg('success', 'Gambar elemen berhasil diperbarui!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Interactive Drag & Drop Event Handlers
  const handleElementDragStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.preventDefault();
    setSelectedElementId(id);
    const canvasElement = flyerRef.current;
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    
    const handleMove = (clientX: number, clientY: number) => {
      const xPercent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const yPercent = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      
      handleUpdateElement(id, {
        xPos: Math.round(xPercent * 10) / 10,
        yPos: Math.round(yPercent * 10) / 10
      });
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleMove(moveEvent.clientX, moveEvent.clientY);
    };

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length > 0) {
        handleMove(moveEvent.touches[0].clientX, moveEvent.touches[0].clientY);
      }
    };

    const handleDragEnd = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };

    if (e.type === 'mousedown') {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleDragEnd);
    } else if (e.type === 'touchstart') {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    }
  };

  // Download high-resolution poster render
  const handleDownloadFlyer = async () => {
    if (!flyerRef.current) return;
    setIsGenerating(true);
    showMsg('success', 'Sedang memproses render flyer beresolusi tinggi...');
    
    try {
      // Ensure all custom fonts are completely loaded before capturing
      if (document.fonts) {
        await document.fonts.ready;
      }
      await new Promise(resolve => setTimeout(resolve, 600));

      const canvas = await runWithOklchFix(async () => {
        return await html2canvas(flyerRef.current!, {
          useCORS: true,
          allowTaint: false,
          scale: 3, // Premium high-resolution sharp render (3x scale)
          backgroundColor: '#FFFFFF',
          logging: false,
          onclone: (clonedDoc) => {
            const captureArea = clonedDoc.getElementById('flyer-capture-area');
            if (captureArea) {
              // 1. Remove backdrop blur and replace with solid background colors so they are perfectly readable and sharp in canvas
              captureArea.querySelectorAll('.backdrop-blur-sm, .backdrop-blur-md, .backdrop-blur-lg').forEach(el => {
                const htmlEl = el as HTMLElement;
                htmlEl.style.backdropFilter = 'none';
                htmlEl.style.filter = 'none';
              });

              // Replace all semi-transparent background color classes with solid ones to prevent html2canvas transparent layout rendering bugs
              captureArea.querySelectorAll('[class*="bg-"]').forEach(el => {
                const htmlEl = el as HTMLElement;
                const className = htmlEl.className;
                if (className.includes('bg-white/')) {
                  htmlEl.style.backgroundColor = '#ffffff';
                } else if (className.includes('bg-amber-950/')) {
                  htmlEl.style.backgroundColor = '#451a03';
                } else if (className.includes('bg-slate-900/')) {
                  htmlEl.style.backgroundColor = '#0f172a';
                } else if (className.includes('bg-black/')) {
                  htmlEl.style.backgroundColor = '#000000';
                } else if (className.includes('bg-slate-950/')) {
                  htmlEl.style.backgroundColor = '#020617';
                }
              });

              // Add a specific, powerful CSS style sheet to the cloned document's head
              // to absolutely prevent font clipping/slicing on tall, condensed fonts like "Zain"
              const styleBlock = clonedDoc.createElement('style');
              styleBlock.innerHTML = `
                /* Disable vertical text clipping across the entire flyer container */
                #flyer-capture-area,
                #flyer-capture-area * {
                  overflow: visible !important;
                  text-overflow: clip !important;
                  box-sizing: border-box !important;
                }

                /* Neutralize .truncate classes inside the clone to allow visible text renders (keeping nowrap) */
                #flyer-capture-area .truncate {
                  overflow: visible !important;
                  text-overflow: clip !important;
                  white-space: nowrap !important;
                  max-width: none !important;
                }

                /* Ensure heading h1 has proper line-height in clone to prevent top/bottom slice */
                #flyer-capture-area h1 {
                  line-height: 1.35 !important;
                  padding-bottom: 2.5px !important;
                }



                /* Specific box adjustment for the regulatory logos to keep them vertically centered */
                #flyer-capture-area .bg-white.rounded {
                  height: 32px !important;
                  padding-top: 1px !important;
                  padding-bottom: 1px !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: center !important;
                  align-items: center !important;
                }
              `;
              clonedDoc.head.appendChild(styleBlock);

              // Ensure all text elements have subpixel antialiasing and crisp rendering
              captureArea.querySelectorAll('h1, span, p, div, li').forEach(el => {
                const htmlEl = el as HTMLElement;
                const styleObj = htmlEl.style as unknown as Record<string, string>;
                styleObj.webkitFontSmoothing = 'antialiased';
                styleObj.mozOsxFontSmoothing = 'grayscale';
                htmlEl.style.textRendering = 'optimizeLegibility';
              });

              // 2. Fix drop-shadow filters on text which render as blurry duplicate outlines in html2canvas
              captureArea.querySelectorAll('h1, span, p, div').forEach(el => {
                const htmlEl = el as HTMLElement;
                if (htmlEl.className.includes('drop-shadow-') || (htmlEl.style.filter && htmlEl.style.filter.includes('drop-shadow'))) {
                  htmlEl.style.filter = 'none';
                  htmlEl.style.textShadow = '1px 1px 2px rgba(0,0,0,0.95)';
                }
              });

              // 3. For any Option 1 elements using the complex multi-layer text shadow, simplify it to a clean single sharp shadow
              captureArea.querySelectorAll('[style*="text-shadow"]').forEach(el => {
                const htmlEl = el as HTMLElement;
                if (htmlEl.style.textShadow && htmlEl.style.textShadow.includes(',')) {
                  htmlEl.style.textShadow = '1px 1px 2px rgba(0,0,0,0.95)';
                }
              });

              // 4. Convert all absolute percentage elements with translate transforms to static pixel integers
              // to prevent html2canvas fractional subpixel text blurring and shadow duplication.
              // We query the original DOM element from document to get its actual, computed, real-world dimensions.
              const containerWidth = 600;
              const containerHeight = 900;
              captureArea.querySelectorAll('[id^="el-"]').forEach(el => {
                const htmlEl = el as HTMLElement;
                const originalEl = document.getElementById(htmlEl.id);
                if (originalEl && htmlEl.style.left && htmlEl.style.left.includes('%') && htmlEl.style.transform && htmlEl.style.transform.includes('translate')) {
                  const leftPct = parseFloat(htmlEl.style.left);
                  const topPct = parseFloat(htmlEl.style.top);
                  const elWidth = originalEl.offsetWidth || 360;
                  const elHeight = originalEl.offsetHeight || 30;
                  
                  if (!isNaN(leftPct) && !isNaN(topPct)) {
                    const xPx = Math.round((leftPct / 100) * containerWidth - (elWidth / 2));
                    const yPx = Math.round((topPct / 100) * containerHeight - (elHeight / 2));
                    
                    htmlEl.style.left = `${xPx}px`;
                    htmlEl.style.top = `${yPx}px`;
                    htmlEl.style.transform = 'none';
                  }
                }
              });
            }
          }
        });
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
      const link = document.createElement('a');
      link.download = `Flyer_Promo_${paket.nama.replace(/\s+/g, '_')}.jpg`;
      link.href = dataUrl;
      link.click();
      showMsg('success', 'Flyer berhasil diunduh ke galeri perangkat Anda!');
    } catch (err) {
      console.error('HTML2Canvas Error:', err);
      showMsg('error', 'Gagal merender gambar. Gunakan mode "Upload Background" atau "Fallback background" jika error CORS berlanjut.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Preset Colors
  const colors = [
    { name: 'Emas/Kuning', hex: '#F59E0B' },
    { name: 'Putih', hex: '#FFFFFF' },
    { name: 'Hitam', hex: '#111827' },
    { name: 'Biru Tua', hex: '#1E3A8A' },
    { name: 'Hijau Zamrud', hex: '#10B981' },
    { name: 'Merah Maroon', hex: '#991B1B' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden bg-slate-950/80 backdrop-blur-md">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3.5 rounded-2xl shadow-xl text-white font-bold text-xs uppercase tracking-wider transition-all border ${
          notification.type === 'success' ? 'bg-emerald-600 border-emerald-400' : 'bg-rose-600 border-rose-400'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="bg-white w-full max-w-6xl h-[92vh] rounded-[36px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                Flyer Creator & Poster Editor
                <span className="bg-indigo-100 text-indigo-800 text-[8px] px-2.5 py-0.5 rounded-full font-black">INTERACTIVE DRAG</span>
              </h3>
              <p className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5">Sesuaikan teks & gambar secara fleksibel menggunakan cursor/mouse</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          
          {/* LEFT: Live Interactive Flyer Preview Container */}
          <div className="flex-1 bg-slate-100 flex flex-col min-h-[450px] border-r border-gray-100 relative overflow-hidden">
            
            {/* Top Sticky Selector Bar */}
            <div className="bg-slate-50 border-b border-gray-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 z-30 shadow-sm shrink-0">
              <div className="flex gap-2 w-[340px] max-w-full bg-slate-200/80 p-1 rounded-xl border border-gray-200 shadow-inner">
                <button
                  onClick={() => setFlyerOption('automatic')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-extrabold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    flyerOption === 'automatic'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Opsi 2: Otomatis
                </button>
                <button
                  onClick={() => setFlyerOption('editor')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-extrabold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    flyerOption === 'editor'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-slate-100'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Opsi 1: Custom
                </button>
              </div>

              {flyerOption === 'editor' ? (
                <div className="text-[9px] text-gray-500 font-extrabold tracking-wider flex items-center gap-1.5 bg-slate-200/60 px-3 py-1 rounded-full uppercase">
                  <Move className="w-3 h-3 text-indigo-600" /> Geser Elemen Di Atas Gambar
                </div>
              ) : (
                <div className="text-[9px] text-indigo-600 font-extrabold tracking-wider flex items-center gap-1.5 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase">
                  <Sparkles className="w-3 h-3 text-indigo-600 animate-pulse" /> Desain Otomatis Instan
                </div>
              )}
            </div>

            {/* Scrollable Canvas Area */}
            <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-start relative">
              <div className="flex flex-col items-center gap-3 my-auto">
              
              {/* Flyer canvas container */}
              <div 
                ref={flyerRef}
                id="flyer-capture-area"
                className={`relative w-[600px] h-[900px] rounded-[24px] shadow-2xl overflow-hidden shrink-0 select-none ${
                  useFallbackBg ? bgGradient : 'bg-slate-200'
                }`}
                style={{
                  width: '600px',
                  height: '900px',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                }}
              >
                {/* Background Template Image */}
                {!useFallbackBg && getImageUrl() && (
                  <img 
                    src={getImageUrl()} 
                    alt="Flyer Background" 
                    crossOrigin="anonymous"
                    className="absolute inset-0 w-full h-full object-cover z-0"
                    onError={() => {
                      console.warn("Failed to load background, setting fallback");
                      setUseFallbackBg(true);
                    }}
                  />
                )}

                {/* Optional dark color overlay dim opacity */}
                {bgDimOpacity > 0 && (
                  <div 
                    className="absolute inset-0 bg-black z-0 pointer-events-none" 
                    style={{ opacity: bgDimOpacity / 100 }}
                  />
                )}

                {flyerOption === 'automatic' ? (
                  // ==========================================
                  // OPSI 2: AUTOMATIC DESIGN TEMPLATE (POLISHED & CRISP)
                  // ==========================================
                  <div className="absolute inset-0 z-10 text-white">
                    {/* Render each block as absolute absolute-positioned draggable blocks if enableManualDragAuto is true, otherwise render standard nested layout */}
                    {enableManualDragAuto ? (
                      <>
                        {/* 1. Logo Mitra Auto */}
                        {autoElements.logoMitra.show && (
                          <div
                            id="el-auto-logoMitra"
                            onMouseDown={(e) => handleAutoElementDragStart(e, 'logoMitra')}
                            onTouchStart={(e) => handleAutoElementDragStart(e, 'logoMitra')}
                            className={`absolute cursor-grab active:cursor-grabbing p-1 rounded-2xl transition-all select-none z-20 ${
                              selectedAutoElementId === 'logoMitra'
                                ? 'border-2 border-dashed border-indigo-600 bg-indigo-600/10 shadow-lg ring-4 ring-indigo-500/10'
                                : 'border border-transparent hover:border-dashed hover:border-indigo-400 hover:bg-indigo-400/5'
                            }`}
                            style={{
                              left: `${autoElements.logoMitra.xPos}%`,
                              top: `${autoElements.logoMitra.yPos}%`,
                              transform: 'translate(-50%, -50%)',
                              width: `${autoElements.logoMitra.width}px`,
                            }}
                          >
                            <div className="bg-white/95 p-1.5 rounded-[18px] shadow-md border border-white/55 w-full h-full aspect-square flex items-center justify-center shrink-0">
                              {logoUrl ? (
                                <img 
                                  src={logoUrl} 
                                  alt="Logo Brand" 
                                  className="w-full h-full object-contain rounded-lg pointer-events-none"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center text-center">
                                  <Building2 className="w-6 h-6 text-indigo-600" />
                                  <span className="text-[9px] font-black text-gray-500 uppercase leading-none mt-1 truncate max-w-full">
                                    {customBrandName || 'Mitra'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 2. Supported PPIU Auto */}
                        {showSupportedPpiu && autoElements.supportedPpiu.show && (
                          <div
                            id="el-auto-supportedPpiu"
                            onMouseDown={(e) => handleAutoElementDragStart(e, 'supportedPpiu')}
                            onTouchStart={(e) => handleAutoElementDragStart(e, 'supportedPpiu')}
                            className={`absolute cursor-grab active:cursor-grabbing p-1 rounded-2xl transition-all select-none z-20 ${
                              selectedAutoElementId === 'supportedPpiu'
                                ? 'border-2 border-dashed border-indigo-600 bg-indigo-600/10 shadow-lg ring-4 ring-indigo-500/10'
                                : 'border border-transparent hover:border-dashed hover:border-indigo-400 hover:bg-indigo-400/5'
                            }`}
                            style={{
                              left: `${autoElements.supportedPpiu.xPos}%`,
                              top: `${autoElements.supportedPpiu.yPos}%`,
                              transform: 'translate(-50%, -50%)',
                              width: `${autoElements.supportedPpiu.width}px`,
                            }}
                          >
                            <div className="w-full flex flex-col items-end text-right bg-slate-950/70 px-3 py-1.5 rounded-[18px] border border-white/10 shrink-0 shadow-sm">
                              <div className="bg-amber-500 text-slate-950 font-black text-[12px] px-2.5 py-0.5 rounded-full shadow-sm tracking-widest uppercase leading-none">
                                umaroh
                              </div>
                              <span className="text-[10px] font-extrabold text-white mt-1 uppercase tracking-wider leading-none">
                                Supported by PPIU.28092200496140003
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 3. Program Title Auto */}
                        {autoElements.programTitle.show && (
                          <div
                            id="el-auto-programTitle"
                            onMouseDown={(e) => handleAutoElementDragStart(e, 'programTitle')}
                            onTouchStart={(e) => handleAutoElementDragStart(e, 'programTitle')}
                            className={`absolute cursor-grab active:cursor-grabbing p-1 rounded-3xl transition-all select-none z-20 ${
                              selectedAutoElementId === 'programTitle'
                                ? 'border-2 border-dashed border-indigo-600 bg-indigo-600/10 shadow-lg ring-4 ring-indigo-500/10'
                                : 'border border-transparent hover:border-dashed hover:border-indigo-400 hover:bg-indigo-400/5'
                            }`}
                            style={{
                              left: `${autoElements.programTitle.xPos}%`,
                              top: `${autoElements.programTitle.yPos}%`,
                              transform: 'translate(-50%, -50%)',
                              width: `${autoElements.programTitle.width}px`,
                            }}
                          >
                            <div className="w-full text-center bg-slate-950/75 border border-white/10 rounded-[24px] py-2.5 px-3.5 shadow-lg backdrop-blur-sm shrink-0">
                              <h1 className="text-[19.5px] font-extrabold text-amber-400 tracking-wide uppercase leading-snug [text-shadow:_0_1px_2px_rgba(0,0,0,0.8)] overflow-hidden line-clamp-2 max-h-[57px]">
                                {paket.nama}
                              </h1>
                              <div className="inline-block mt-1 bg-black/80 border border-amber-500/30 rounded-full px-4 py-1 shadow-md text-center">
                                <span 
                                  className="text-[12px] font-black uppercase tracking-wider text-white leading-normal"
                                  style={{ color: '#FFFFFF', textShadow: '1px 1px 1px rgba(0,0,0,0.6)' }}
                                >
                                  ✨ {paket.durasiHari || 9} HARI | {formatIndonesianDate(paket.tglBerangkat)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 4. Pricing & Flight Card */}
                        {autoElements.pricingFlight.show && (
                          <div
                            id="el-auto-pricingFlight"
                            onMouseDown={(e) => handleAutoElementDragStart(e, 'pricingFlight')}
                            onTouchStart={(e) => handleAutoElementDragStart(e, 'pricingFlight')}
                            className={`absolute cursor-grab active:cursor-grabbing p-1 rounded-3xl transition-all select-none z-20 ${
                              selectedAutoElementId === 'pricingFlight'
                                ? 'border-2 border-dashed border-indigo-600 bg-indigo-600/10 shadow-lg ring-4 ring-indigo-500/10'
                                : 'border border-transparent hover:border-dashed hover:border-indigo-400 hover:bg-indigo-400/5'
                            }`}
                            style={{
                              left: `${autoElements.pricingFlight.xPos}%`,
                              top: `${autoElements.pricingFlight.yPos}%`,
                              transform: 'translate(-50%, -50%)',
                              width: `${autoElements.pricingFlight.width}px`,
                            }}
                          >
                            <div className="w-full bg-white/95 shadow-lg rounded-[24px] py-2 px-3 text-slate-800 grid grid-cols-12 gap-2.5 border border-white/50 shrink-0">
                              <div className="col-span-8 bg-slate-900 text-white rounded-[18px] py-2 px-3 flex items-center justify-between border border-slate-800 shadow-inner">
                                <div className="flex flex-col text-left py-0.5">
                                  <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">HPP QUAD</span>
                                  <span className="text-[22px] font-black text-amber-400 mt-0.5 leading-normal">
                                    Rp {(initialPrice / 1000000).toFixed(1)} <span className="text-[14px]">Jt</span>
                                  </span>
                                </div>
                                <div className="w-[1px] h-9 bg-slate-800"></div>
                                <div className="flex flex-col text-[13px] font-black text-white leading-normal pr-1 py-0.5">
                                  <div className="flex justify-between gap-1.5">
                                    <span className="text-gray-400 uppercase tracking-wider">TRIPLE:</span>
                                    <span className="text-amber-400">Rp {paket.hargaJualTriple ? (paket.hargaJualTriple / 1000000).toFixed(1) : 'XX,X'} Jt</span>
                                  </div>
                                  <div className="flex justify-between gap-1.5 mt-0.5">
                                    <span className="text-gray-400 uppercase tracking-wider">DOUBLE:</span>
                                    <span className="text-amber-400">Rp {paket.hargaJualDouble ? (paket.hargaJualDouble / 1000000).toFixed(1) : 'XX,X'} Jt</span>
                                  </div>
                                </div>
                              </div>
                              <div className="col-span-4 flex flex-col justify-center items-center text-center">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5 leading-normal">Flight by:</span>
                                <span className="text-[12.5px] font-black text-slate-800 uppercase tracking-wide leading-normal break-words max-w-full">
                                  ✈️ {resolvedMaskapaiName}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 5. Hotels Row */}
                        {autoElements.hotelsRow.show && (
                          <div
                            id="el-auto-hotelsRow"
                            onMouseDown={(e) => handleAutoElementDragStart(e, 'hotelsRow')}
                            onTouchStart={(e) => handleAutoElementDragStart(e, 'hotelsRow')}
                            className={`absolute cursor-grab active:cursor-grabbing p-1 rounded-3xl transition-all select-none z-20 ${
                              selectedAutoElementId === 'hotelsRow'
                                ? 'border-2 border-dashed border-indigo-600 bg-indigo-600/10 shadow-lg ring-4 ring-indigo-500/10'
                                : 'border border-transparent hover:border-dashed hover:border-indigo-400 hover:bg-indigo-400/5'
                            }`}
                            style={{
                              left: `${autoElements.hotelsRow.xPos}%`,
                              top: `${autoElements.hotelsRow.yPos}%`,
                              transform: 'translate(-50%, -50%)',
                              width: `${autoElements.hotelsRow.width}px`,
                            }}
                          >
                            <div className="w-full grid grid-cols-2 gap-2.5 shrink-0">
                              <div className="bg-white/95 rounded-[24px] py-2 px-2.5 flex items-center gap-2.5 shadow-md border border-white/50">
                                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 overflow-hidden">
                                  <span className="text-2xl">🕌</span>
                                </div>
                                <div className="min-w-0 flex-1 text-left">
                                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">HOTEL MADINAH</span>
                                  <span className="block text-[13px] font-black text-slate-800 truncate uppercase mt-0.5">{hotelMadinahName}</span>
                                  <span className="block text-[11px] font-bold text-emerald-700 truncate mt-0.5">± 3-5 Menit Jalan Kaki</span>
                                  <div className="flex text-amber-500 text-[10px] mt-0.5 leading-none items-center gap-0.5">
                                    {'★'.repeat(hotelMadinahStars)}
                                  </div>
                                </div>
                              </div>
                              <div className="bg-white/95 rounded-[24px] py-2 px-2.5 flex items-center gap-2.5 shadow-md border border-white/50">
                                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 overflow-hidden">
                                  <span className="text-2xl">🕋</span>
                                </div>
                                <div className="min-w-0 flex-1 text-left">
                                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">HOTEL MAKKAH</span>
                                  <span className="block text-[13px] font-black text-slate-800 truncate uppercase mt-0.5">{hotelMakkahName}</span>
                                  <span className="block text-[11px] font-bold text-emerald-700 truncate mt-0.5">± 5-7 Menit Jalan Kaki</span>
                                  <div className="flex text-amber-500 text-[10px] mt-0.5 leading-none items-center gap-0.5">
                                    {'★'.repeat(hotelMakkahStars)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 6. Includes & Regulatory Card */}
                        {autoElements.includesCard.show && (
                          <div
                            id="el-auto-includesCard"
                            onMouseDown={(e) => handleAutoElementDragStart(e, 'includesCard')}
                            onTouchStart={(e) => handleAutoElementDragStart(e, 'includesCard')}
                            className={`absolute cursor-grab active:cursor-grabbing p-1 rounded-3xl transition-all select-none z-20 ${
                              selectedAutoElementId === 'includesCard'
                                ? 'border-2 border-dashed border-indigo-600 bg-indigo-600/10 shadow-lg ring-4 ring-indigo-500/10'
                                : 'border border-transparent hover:border-dashed hover:border-indigo-400 hover:bg-indigo-400/5'
                            }`}
                            style={{
                              left: `${autoElements.includesCard.xPos}%`,
                              top: `${autoElements.includesCard.yPos}%`,
                              transform: 'translate(-50%, -50%)',
                              width: `${autoElements.includesCard.width}px`,
                            }}
                          >
                            <div className="w-full bg-amber-950 border border-amber-500/35 rounded-[24px] py-2 px-3 flex items-start justify-between shadow-lg shrink-0">
                              <div className="min-w-0 flex-1 text-left">
                                <div className="inline-block bg-black text-amber-400 font-extrabold text-[12px] px-3.5 py-1 rounded-full border border-amber-500/30 shadow-sm uppercase tracking-widest mb-1.5 text-center leading-normal">
                                  Termasuk (Include)
                                </div>
                                <ul className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-bold text-amber-50/95 leading-normal">
                                  <li className="flex items-center gap-0.5">
                                    <span className="text-amber-400 font-bold">✓</span> Visa Umroh Resmi
                                  </li>
                                  <li className="flex items-center gap-0.5">
                                    <span className="text-amber-400 font-bold">✓</span> Asuransi Perjalanan
                                  </li>
                                  <li className="flex items-center gap-0.5">
                                    <span className="text-amber-400 font-bold">✓</span> Tour Leader & Guide
                                  </li>
                                  <li className="flex items-center gap-0.5">
                                    <span className="text-amber-400 font-bold">✓</span> Air Zamzam 5 Liter
                                  </li>
                                  <li className="flex items-center gap-0.5">
                                    <span className="text-amber-400 font-bold">✓</span> Hotel Full Board
                                  </li>
                                  <li className="flex items-center gap-0.5">
                                    <span className="text-amber-400 font-bold">✓</span> Mutawif Profesional
                                  </li>
                                  <li className="flex items-center gap-0.5">
                                    <span className="text-amber-400 font-bold">✓</span> Perlengkapan Premium
                                  </li>
                                  <li className="flex items-center gap-0.5">
                                    <span className="text-amber-400 font-bold">✓</span> Transport Bus Saudi
                                  </li>
                                </ul>
                              </div>

                              {showTrustLogos && (
                                <div className="flex flex-col gap-1.5 items-center justify-center pl-4 self-center border-l border-amber-500/20 shrink-0">
                                  <div className="bg-white rounded px-1.5 py-1 flex flex-col items-center justify-center border border-gray-200 shadow-sm w-[72px] text-center h-8 leading-none">
                                    <span className="text-[10px] font-black text-slate-800 tracking-tighter uppercase leading-none">SISKO</span>
                                    <span className="text-[10px] font-black text-teal-600 tracking-tighter uppercase leading-none mt-0.5">PATUH</span>
                                  </div>
                                  <div className="bg-white rounded px-1.5 py-1 flex items-center justify-center border border-gray-200 shadow-sm w-[72px] text-center h-8 leading-none">
                                    <span className="text-[11px] font-extrabold text-slate-800 tracking-tighter uppercase leading-none flex items-center gap-0.5">
                                      <span className="text-red-600">✔</span> KAN
                                    </span>
                                  </div>
                                  <div className="bg-white rounded px-1.5 py-1 flex flex-col items-center justify-center border border-gray-200 shadow-sm w-[72px] text-center h-8 leading-none">
                                    <span className="text-[8px] font-bold text-gray-500 uppercase leading-none">KEMENAG</span>
                                    <span className="text-[10px] font-black text-amber-600 uppercase leading-none mt-0.5">RI</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 7. Footer Bar Auto */}
                        {autoElements.footerBar.show && (
                          <div
                            id="el-auto-footerBar"
                            onMouseDown={(e) => handleAutoElementDragStart(e, 'footerBar')}
                            onTouchStart={(e) => handleAutoElementDragStart(e, 'footerBar')}
                            className={`absolute cursor-grab active:cursor-grabbing p-1 rounded-2xl transition-all select-none z-20 ${
                              selectedAutoElementId === 'footerBar'
                                ? 'border-2 border-dashed border-indigo-600 bg-indigo-600/10 shadow-lg ring-4 ring-indigo-500/10'
                                : 'border border-transparent hover:border-dashed hover:border-indigo-400 hover:bg-indigo-400/5'
                            }`}
                            style={{
                              left: `${autoElements.footerBar.xPos}%`,
                              top: `${autoElements.footerBar.yPos}%`,
                              transform: 'translate(-50%, -50%)',
                              width: `${autoElements.footerBar.width}px`,
                            }}
                          >
                            <div className="w-full h-[90px] bg-slate-950 border border-slate-800 rounded-[18px] py-3 px-6 flex items-center justify-between text-[10px] text-gray-300 tracking-wider font-semibold">
                              <div className="flex flex-col text-left">
                                <span className="text-[9px] text-gray-400 uppercase leading-none">DILAYANI & DIDUKUNG OLEH:</span>
                                <span className="text-white font-extrabold uppercase mt-1 truncate max-w-[200px]" style={{ fontSize: '13px', color: '#ffffff' }}>
                                  {customSupportName}
                                </span>
                                <span className="text-[10px] text-amber-400 mt-1 font-mono font-bold leading-none">PPIU.28092200496140003</span>
                              </div>
                              <div className="flex flex-col items-end text-right">
                                <span className="text-[9px] text-gray-400 uppercase leading-none">PENDAFTARAN & INFO HUBUNGI:</span>
                                <span className="text-amber-400 font-extrabold uppercase text-[13px] mt-1 font-mono">
                                  {customHp || '0812-3456-7890'}
                                </span>
                                <span className="text-[10px] text-white mt-1 truncate max-w-[180px] uppercase leading-none font-black">
                                  {customBrandName || 'MITRA UMAROH'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      // ==========================================
                      // STANDARD STATIC FLEX LAYOUT (DEFAULT)
                      // ==========================================
                      <div className="absolute inset-0 z-10 flex flex-col text-white">
                        <div className="pt-5.5 pb-16 px-5.5 flex flex-col justify-between h-[810px]">
                          {/* Header Row */}
                          <div className="flex justify-between items-start">
                            {/* Logo Brand Mitra Card (Top Left) */}
                            <div className="bg-white/95 p-1.5 rounded-[18px] shadow-md border border-white/55 w-18 h-18 flex items-center justify-center shrink-0">
                              {logoUrl ? (
                                <img 
                                  src={logoUrl} 
                                  alt="Logo Brand" 
                                  className="w-full h-full object-contain rounded-lg"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center text-center">
                                  <Building2 className="w-6 h-6 text-indigo-600" />
                                  <span className="text-[9px] font-black text-gray-500 uppercase leading-none mt-1 truncate max-w-full">
                                    {customBrandName || 'Mitra'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Supported PPIU (Top Right) */}
                            {showSupportedPpiu && (
                              <div className="flex flex-col items-end text-right bg-slate-950/70 px-3 py-1.5 rounded-[18px] border border-white/10 shrink-0 shadow-sm">
                                <div className="bg-amber-500 text-slate-950 font-black text-[12px] px-2.5 py-0.5 rounded-full shadow-sm tracking-widest uppercase leading-none">
                                  umaroh
                                </div>
                                <span className="text-[10px] font-extrabold text-white mt-1 uppercase tracking-wider leading-none">
                                  Supported by PPIU.28092200496140003
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Program Title & Duration Badge */}
                          <div className="text-center mt-2 bg-slate-950/75 border border-white/10 rounded-[24px] py-2.5 px-3.5 shadow-lg backdrop-blur-sm shrink-0">
                            <h1 className="text-[19.5px] font-extrabold text-amber-400 tracking-wide uppercase leading-snug [text-shadow:_0_1px_2px_rgba(0,0,0,0.8)] overflow-hidden line-clamp-2 max-h-[57px]">
                              {paket.nama}
                            </h1>
                            <div className="inline-block mt-1 bg-black/80 border border-amber-500/30 rounded-full px-4 py-1 shadow-md text-center">
                              <span 
                                className="text-[12px] font-black uppercase tracking-wider text-white leading-normal"
                                style={{ color: '#FFFFFF', textShadow: '1px 1px 1px rgba(0,0,0,0.6)' }}
                              >
                                ✨ {paket.durasiHari || 9} HARI | {formatIndonesianDate(paket.tglBerangkat)}
                              </span>
                            </div>
                          </div>

                          {/* Main Pricing & Flight Card */}
                          <div className="bg-white/95 shadow-lg rounded-[24px] py-2 px-3 mt-2 text-slate-800 grid grid-cols-12 gap-2.5 border border-white/50 shrink-0">
                            {/* Price Container */}
                            <div className="col-span-8 bg-slate-900 text-white rounded-[18px] py-2 px-3 flex items-center justify-between border border-slate-800 shadow-inner">
                              {/* Quad */}
                              <div className="flex flex-col text-left py-0.5">
                                <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">HPP QUAD</span>
                                <span className="text-[22px] font-black text-amber-400 mt-0.5 leading-normal">
                                  Rp {(initialPrice / 1000000).toFixed(1)} <span className="text-[14px]">Jt</span>
                                </span>
                              </div>
                              {/* Divider */}
                              <div className="w-[1px] h-9 bg-slate-800"></div>
                              {/* Triple & Double */}
                              <div className="flex flex-col text-[13px] font-black text-white leading-normal pr-1 py-0.5">
                                <div className="flex justify-between gap-1.5">
                                  <span className="text-gray-400 uppercase tracking-wider">TRIPLE:</span>
                                  <span className="text-amber-400">Rp {paket.hargaJualTriple ? (paket.hargaJualTriple / 1000000).toFixed(1) : 'XX,X'} Jt</span>
                                </div>
                                <div className="flex justify-between gap-1.5 mt-0.5">
                                  <span className="text-gray-400 uppercase tracking-wider">DOUBLE:</span>
                                  <span className="text-amber-400">Rp {paket.hargaJualDouble ? (paket.hargaJualDouble / 1000000).toFixed(1) : 'XX,X'} Jt</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Flight Container */}
                            <div className="col-span-4 flex flex-col justify-center items-center text-center">
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5 leading-normal">Flight by:</span>
                              <span className="text-[12.5px] font-black text-slate-800 uppercase tracking-wide leading-normal break-words max-w-full">
                                ✈️ {resolvedMaskapaiName}
                              </span>
                            </div>
                          </div>

                          {/* Proximity / Hotels Row */}
                          <div className="grid grid-cols-2 gap-2.5 mt-2 shrink-0">
                            {/* Madinah Card */}
                            <div className="bg-white/95 rounded-[24px] py-2 px-2.5 flex items-center gap-2.5 shadow-md border border-white/50">
                              <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 overflow-hidden">
                                <span className="text-2xl">🕌</span>
                              </div>
                              <div className="min-w-0 flex-1 text-left">
                                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">HOTEL MADINAH</span>
                                <span className="block text-[13px] font-black text-slate-800 truncate uppercase mt-0.5">{hotelMadinahName}</span>
                                <span className="block text-[11px] font-bold text-emerald-700 truncate mt-0.5">± 3-5 Menit Jalan Kaki</span>
                                <div className="flex text-amber-500 text-[10px] mt-0.5 leading-none items-center gap-0.5">
                                  {'★'.repeat(hotelMadinahStars)}
                                </div>
                              </div>
                            </div>

                            {/* Makkah Card */}
                            <div className="bg-white/95 rounded-[24px] py-2 px-2.5 flex items-center gap-2.5 shadow-md border border-white/50">
                              <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 overflow-hidden">
                                <span className="text-2xl">🕋</span>
                              </div>
                              <div className="min-w-0 flex-1 text-left">
                                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">HOTEL MAKKAH</span>
                                <span className="block text-[13px] font-black text-slate-800 truncate uppercase mt-0.5">{hotelMakkahName}</span>
                                <span className="block text-[11px] font-bold text-emerald-700 truncate mt-0.5">± 5-7 Menit Jalan Kaki</span>
                                <div className="flex text-amber-500 text-[10px] mt-0.5 leading-none items-center gap-0.5">
                                  {'★'.repeat(hotelMakkahStars)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Includes & Regulatory Badges */}
                          <div className="bg-amber-950 border border-amber-500/35 rounded-[24px] py-2 px-3 mt-2 flex items-start justify-between shadow-lg shrink-0">
                            <div className="min-w-0 flex-1 text-left">
                              {/* INCLUDE Badge */}
                              <div className="inline-block bg-black text-amber-400 font-extrabold text-[12px] px-3.5 py-1 rounded-full border border-amber-500/30 shadow-sm uppercase tracking-widest mb-1.5 text-center leading-normal">
                                Termasuk (Include)
                              </div>
                              <ul className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-bold text-amber-50/95 leading-normal">
                                <li className="flex items-center gap-0.5">
                                  <span className="text-amber-400 font-bold">✓</span> Visa Umroh Resmi
                                </li>
                                <li className="flex items-center gap-0.5">
                                  <span className="text-amber-400 font-bold">✓</span> Asuransi Perjalanan
                                </li>
                                <li className="flex items-center gap-0.5">
                                  <span className="text-amber-400 font-bold">✓</span> Tour Leader & Guide
                                </li>
                                <li className="flex items-center gap-0.5">
                                  <span className="text-amber-400 font-bold">✓</span> Air Zamzam 5 Liter
                                </li>
                                <li className="flex items-center gap-0.5">
                                  <span className="text-amber-400 font-bold">✓</span> Hotel Full Board
                                </li>
                                <li className="flex items-center gap-0.5">
                                  <span className="text-amber-400 font-bold">✓</span> Mutawif Profesional
                                </li>
                                <li className="flex items-center gap-0.5">
                                  <span className="text-amber-400 font-bold">✓</span> Perlengkapan Premium
                                </li>
                                <li className="flex items-center gap-0.5">
                                  <span className="text-amber-400 font-bold">✓</span> Transport Bus Saudi
                                </li>
                              </ul>
                            </div>

                            {/* Authority Trust Logos */}
                            {showTrustLogos && (
                              <div className="flex flex-col gap-1.5 items-center justify-center pl-4 self-center border-l border-amber-500/20 shrink-0">
                                <div className="bg-white rounded px-1.5 py-1 flex flex-col items-center justify-center border border-gray-200 shadow-sm w-[72px] text-center h-8 leading-none">
                                  <span className="text-[10px] font-black text-slate-800 tracking-tighter uppercase leading-none">SISKO</span>
                                  <span className="text-[10px] font-black text-teal-600 tracking-tighter uppercase leading-none mt-0.5">PATUH</span>
                                </div>
                                <div className="bg-white rounded px-1.5 py-1 flex items-center justify-center border border-gray-200 shadow-sm w-[72px] text-center h-8 leading-none">
                                  <span className="text-[11px] font-extrabold text-slate-800 tracking-tighter uppercase leading-none flex items-center gap-0.5">
                                    <span className="text-red-600">✔</span> KAN
                                  </span>
                                </div>
                                <div className="bg-white rounded px-1.5 py-1 flex flex-col items-center justify-center border border-gray-200 shadow-sm w-[72px] text-center h-8 leading-none">
                                  <span className="text-[8px] font-bold text-gray-500 uppercase leading-none">KEMENAG</span>
                                  <span className="text-[10px] font-black text-amber-600 uppercase leading-none mt-0.5">RI</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dark Footer Bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-[90px] bg-slate-950 border-t border-slate-800 py-3 px-6 flex items-center justify-between text-[10px] text-gray-300 tracking-wider font-semibold z-10">
                          <div className="flex flex-col text-left">
                            <span className="text-[9px] text-gray-400 uppercase leading-none">DILAYANI & DIDUKUNG OLEH:</span>
                            <span className="text-white font-extrabold uppercase mt-1 truncate max-w-[200px]" style={{ fontSize: '13px', color: '#ffffff' }}>
                              {customSupportName}
                            </span>
                            <span className="text-[10px] text-amber-400 mt-1 font-mono font-bold leading-none">PPIU.28092200496140003</span>
                          </div>
                          <div className="flex flex-col items-end text-right">
                            <span className="text-[9px] text-gray-400 uppercase leading-none">PENDAFTARAN & INFO HUBUNGI:</span>
                            <span className="text-amber-400 font-extrabold uppercase text-[13px] mt-1 font-mono">
                              {customHp || '0812-3456-7890'}
                            </span>
                            <span className="text-[10px] text-white mt-1 truncate max-w-[180px] uppercase leading-none font-black">
                              {customBrandName || 'MITRA UMAROH'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // ==========================================
                  // OPSI 1: INTERACTIVE DRAGGABLE ELEMENTS (EXISTING)
                  // ==========================================
                  <>
                    {elements.map((el) => {
                      if (!el.show) return null;
                      const isSelected = selectedElementId === el.id;

                      return (
                        <div
                          key={el.id}
                          id={`el-${el.id}`}
                          onMouseDown={(e) => handleElementDragStart(e, el.id)}
                          onTouchStart={(e) => handleElementDragStart(e, el.id)}
                          className={`absolute cursor-grab active:cursor-grabbing p-1.5 rounded transition-all select-none z-10 ${
                            isSelected 
                              ? 'border-2 border-dashed border-indigo-600 bg-indigo-600/10 shadow-lg ring-4 ring-indigo-500/10' 
                              : 'border border-transparent hover:border-dashed hover:border-indigo-400 hover:bg-indigo-400/5'
                          }`}
                          style={{
                            left: `${el.xPos}%`,
                            top: `${el.yPos}%`,
                            transform: 'translate(-50%, -50%)',
                            width: el.width ? `${el.width}px` : '360px',
                            maxWidth: '95%',
                          }}
                        >
                          {/* Visual Anchor for dragging */}
                          {isSelected && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-[8px] font-black uppercase text-white px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                              <Move className="w-2.5 h-2.5" /> Move
                            </div>
                          )}

                          {/* Element Content Render */}
                          {el.type === 'text' ? (
                            <div
                              style={{
                                fontSize: `${el.fontSize || 12}px`,
                                color: el.color || '#FFFFFF',
                                textAlign: el.align || 'center',
                                fontWeight: el.isBold ? '900' : 'normal',
                                fontStyle: el.isItalic ? 'italic' : 'normal',
                                fontFamily: '"Inter", sans-serif',
                                textShadow: el.hasShadow 
                                  ? '1px 1px 2px rgba(0,0,0,0.95)' 
                                  : 'none',
                                lineHeight: '1.25',
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {el.hasBackground ? (
                                <div className="bg-slate-950/90 text-white px-4 py-1.5 rounded-full border border-yellow-500/30 inline-block font-mono font-extrabold uppercase tracking-widest text-center shadow-lg">
                                  {el.text}
                                </div>
                              ) : (
                                el.text
                              )}
                            </div>
                          ) : (
                            // Image Type Element (Logo brand, Airline logo, etc.)
                            <div className="flex items-center justify-center">
                              {el.imageUrl ? (
                                <img 
                                  src={el.imageUrl} 
                                  alt={el.label} 
                                  className="object-contain"
                                  style={{
                                    width: el.width ? `${el.width}px` : '80px',
                                    height: el.height ? `${el.height}px` : '80px',
                                  }}
                                />
                              ) : (
                                // Placeholder
                                <div 
                                  className="border border-indigo-400 bg-white/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-2 text-indigo-700"
                                  style={{
                                    width: el.width ? `${el.width}px` : '80px',
                                    height: el.height ? `${el.height}px` : '80px',
                                  }}
                                >
                                  <ImageIcon className="w-5 h-5 mb-1" />
                                  <span className="text-[8px] font-black text-center uppercase leading-none">{el.label.replace('Card ', '').substring(0, 15)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Footer system credit */}
                <div className="absolute bottom-1 right-2 z-20 text-[6px] font-mono opacity-20 text-gray-400">
                  PT Azza Barokah Madinah Official Flyer System
                </div>
              </div>

              {/* Status Info Warning Helper */}
              <div className="w-[400px] bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                  Jika Anda melihat error warna 'oklab' saat mengunduh flyer, abaikan saja karena sistem telah mengoreksi dan mengonversi otomatis ke format gambar yang didukung browser Anda.
                </p>
              </div>

            </div>
          </div>
        </div>

          {/* RIGHT: Editor & Configuration panel */}
          <div className="w-full lg:w-[480px] flex flex-col h-full bg-white">
            
            {flyerOption === 'automatic' ? (
              // ==========================================
              // SIDEBAR UNTUK TEMPLAT OTOMATIS (OPSI 2)
              // ==========================================
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="bg-indigo-50 border-b border-indigo-100 p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                    <span className="text-xs font-black text-indigo-900 uppercase tracking-wider">Flyer Otomatis Settings</span>
                  </div>
                  <p className="text-[10px] text-indigo-600 font-semibold mt-1 uppercase leading-relaxed">
                    Ubah logo brand mitra, info kontak pendaftaran, dan background flyer secara instan.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* MANUAL GENDER & TOGGLE POSITION CONTROLLER FOR OPSI 2 */}
                  <div className="bg-slate-50 border border-indigo-100 p-4 rounded-3xl space-y-4">
                    <span className="block text-[10px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                      Interaktivitas & Visibilitas Elemen
                    </span>

                    {/* Toggle Hilangkan Badge Sesuai Gambar */}
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-150 shadow-sm">
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-black text-gray-700 uppercase">Tampilkan Badge PPIU</span>
                          <span className="text-[8px] font-semibold text-gray-400">Supported by PPIU (Kanan Atas)</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={showSupportedPpiu}
                          onChange={(e) => setShowSupportedPpiu(e.target.checked)}
                          className="w-4.5 h-4.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-150 shadow-sm">
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-black text-gray-700 uppercase">Tampilkan Logo Otoritas</span>
                          <span className="text-[8px] font-semibold text-gray-400">SISKO PATUH, KAN, KEMENAG RI</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={showTrustLogos}
                          onChange={(e) => setShowTrustLogos(e.target.checked)}
                          className="w-4.5 h-4.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-200/60 pt-3">
                      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-indigo-100 shadow-sm">
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-black text-indigo-950 uppercase flex items-center gap-1">
                            <Move className="w-3 h-3 text-indigo-600" /> Geser Manual Elemen (Drag)
                          </span>
                          <span className="text-[8px] font-semibold text-indigo-500">Geser langsung dengan mouse/sentuhan di layar flyer</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableManualDragAuto}
                            onChange={(e) => setEnableManualDragAuto(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>

                    {enableManualDragAuto && (
                      <div className="bg-white border border-indigo-100 p-3.5 rounded-2xl space-y-3 shadow-inner">
                        <label className="block text-[9px] font-black text-indigo-900 uppercase tracking-widest text-left">Edit Posisi & Ukuran Elemen</label>
                        <select
                          value={selectedAutoElementId}
                          onChange={(e) => setSelectedAutoElementId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {Object.entries(autoElements).map(([key, data]) => (
                            <option key={key} value={key}>{data.label}</option>
                          ))}
                        </select>

                        {/* Position Inputs / Sliders */}
                        <div className="space-y-3 pt-1 text-left">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-black uppercase text-gray-400">
                              <span>Posisi Horizontal (X)</span>
                              <span className="text-indigo-600 font-mono font-bold">{autoElements[selectedAutoElementId]?.xPos}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="0.5"
                              value={autoElements[selectedAutoElementId]?.xPos ?? 50}
                              onChange={(e) => handleUpdateAutoElement(selectedAutoElementId, { xPos: parseFloat(e.target.value) })}
                              className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-black uppercase text-gray-400">
                              <span>Posisi Vertikal (Y)</span>
                              <span className="text-indigo-600 font-mono font-bold">{autoElements[selectedAutoElementId]?.yPos}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="0.5"
                              value={autoElements[selectedAutoElementId]?.yPos ?? 50}
                              onChange={(e) => handleUpdateAutoElement(selectedAutoElementId, { yPos: parseFloat(e.target.value) })}
                              className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-black uppercase text-gray-400">
                              <span>Lebar Elemen (Width)</span>
                              <span className="text-indigo-600 font-mono font-bold">{autoElements[selectedAutoElementId]?.width}px</span>
                            </div>
                            <input
                              type="range"
                              min="50"
                              max="600"
                              step="5"
                              value={autoElements[selectedAutoElementId]?.width ?? 100}
                              onChange={(e) => handleUpdateAutoElement(selectedAutoElementId, { width: parseInt(e.target.value) })}
                              className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase">Tampilkan Elemen Ini</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={autoElements[selectedAutoElementId]?.show ?? true}
                                onChange={(e) => handleUpdateAutoElement(selectedAutoElementId, { show: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* LOGO BRAND MITRA UPLOADER */}
                  <div className="bg-slate-50 border border-gray-150 p-4 rounded-3xl space-y-3">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Logo Brand Mitra</label>
                    <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-150 shadow-sm">
                      <div className="w-14 h-14 rounded-xl bg-slate-50 border border-dashed border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Preview Logo" className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="inline-flex items-center justify-center px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl cursor-pointer transition-all text-[10px] font-black uppercase tracking-wider">
                          Pilih File Logo
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        {logoUrl && (
                          <button
                            onClick={() => {
                              setLogoUrl('');
                              handleUpdateElement('logoMitra', { imageUrl: '' });
                            }}
                            className="block text-[9px] font-bold text-rose-600 hover:underline mt-1.5 uppercase tracking-wider"
                          >
                            Hapus Logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CONTACT & OVERRIDE SETTINGS */}
                  <div className="bg-slate-50 border border-gray-150 p-4 rounded-3xl space-y-4">
                    <span className="block text-[10px] font-black text-gray-900 uppercase tracking-wider">
                      Informasi Kontak & Legal
                    </span>

                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Nama Brand / Agen Mitra</label>
                      <input
                        type="text"
                        value={customBrandName}
                        onChange={(e) => setCustomBrandName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Contoh: AZZA BAROKAH TOUR"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">No. WhatsApp / HP</label>
                      <input
                        type="text"
                        value={customHp}
                        onChange={(e) => setCustomHp(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Contoh: 0812-3456-7890"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Pendukung Resmi (Legal Footer)</label>
                      <input
                        type="text"
                        value={customSupportName}
                        onChange={(e) => setCustomSupportName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Contoh: PT. NAWAITUL UMROH HAJI"
                      />
                    </div>
                  </div>

                  {/* BACKGROUND & THEMING CHOICE */}
                  <div className="bg-slate-50 border border-gray-150 p-4 rounded-3xl space-y-3">
                    <span className="block text-[10px] font-black text-gray-900 uppercase tracking-wider">
                      Tema & Latar Belakang
                    </span>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          setUseFallbackBg(false);
                          setTemplateId('11TPEHKFNdMRPbwpdot6mcxT1PcB4Z8p5');
                          setCustomBgImage(null);
                        }}
                        className={`p-2.5 rounded-xl text-[9px] font-black border transition-all ${
                          !useFallbackBg && templateId === '11TPEHKFNdMRPbwpdot6mcxT1PcB4Z8p5' && !customBgImage
                            ? 'border-indigo-600 bg-white text-indigo-700 font-black shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-slate-50'
                        }`}
                      >
                        🕌 Default Mecca
                      </button>

                      <button
                        onClick={() => {
                          setUseFallbackBg(true);
                          setBgGradient('bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950');
                        }}
                        className={`p-2.5 rounded-xl text-[9px] font-black border transition-all ${
                          useFallbackBg && bgGradient.includes('indigo-950')
                            ? 'border-indigo-600 bg-white text-indigo-700 font-black shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-slate-50'
                        }`}
                      >
                        🌌 Midnight Blue
                      </button>

                      <button
                        onClick={() => {
                          setUseFallbackBg(true);
                          setBgGradient('bg-gradient-to-b from-emerald-950 via-teal-900 to-emerald-950');
                        }}
                        className={`p-2.5 rounded-xl text-[9px] font-black border transition-all ${
                          useFallbackBg && bgGradient.includes('emerald-950')
                            ? 'border-indigo-600 bg-white text-indigo-700 font-black shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-slate-50'
                        }`}
                      >
                        🕌 Emerald Green
                      </button>

                      <button
                        onClick={() => {
                          setUseFallbackBg(true);
                          setBgGradient('bg-gradient-to-b from-amber-950 via-yellow-950 to-slate-950');
                        }}
                        className={`p-2.5 rounded-xl text-[9px] font-black border transition-all ${
                          useFallbackBg && bgGradient.includes('amber-950')
                            ? 'border-indigo-600 bg-white text-indigo-700 font-black shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-slate-50'
                        }`}
                      >
                        ✨ Golden Velvet
                      </button>
                    </div>

                    {/* LOCAL BACKGROUND FILE UPLOADER */}
                    <div className="pt-2 border-t border-gray-200/60 mt-2">
                      <label className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 border border-dashed border-gray-300 rounded-xl cursor-pointer transition-all text-[9px] font-black text-gray-700 shadow-sm uppercase tracking-wider">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        Unggah Background Gambar
                        <input type="file" accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setCustomBgImage(event.target.result as string);
                                setUseFallbackBg(false);
                                showMsg('success', 'Background gambar berhasil diunggah!');
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }} className="hidden" />
                      </label>
                      {customBgImage && (
                        <div className="flex items-center justify-between mt-2 px-2.5 py-1.5 bg-indigo-50/50 rounded-lg border border-indigo-100">
                          <span className="text-[8px] font-bold text-indigo-700 uppercase">Background Kustom Aktif</span>
                          <button
                            onClick={() => {
                              setCustomBgImage(null);
                              showMsg('success', 'Latar belakang kustom dilepas.');
                            }}
                            className="text-[8px] font-black text-rose-600 uppercase hover:underline"
                          >
                            Reset
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AUTO TEMPLATE NOTES */}
                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-3xl">
                    <p className="text-[9.5px] text-amber-800 font-bold leading-relaxed">
                      💡 <strong>Rekomendasi Terbaik:</strong> Gunakan opsi background <strong>"Default Mecca"</strong> untuk hasil visual paling mewah karena latar belakang tersebut menyertakan gambar Makkah Tower yang agung yang telah dioptimalkan secara estetik dengan kartu informasi lainnya.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // ==========================================
              // SIDEBAR UNTUK INTERACTIVE CUSTOM EDITOR (OPSI 1)
              // ==========================================
              <>
                {/* Tabs */}
                <div className="flex border-b border-gray-100 bg-slate-50">
              <button
                onClick={() => setActiveTab('content')}
                className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'content' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                Teks & Gambar
              </button>
              <button
                onClick={() => setActiveTab('layout')}
                className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'layout' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Posisi & Ukuran
              </button>
              <button
                onClick={() => setActiveTab('style')}
                className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'style' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Edit Background
              </button>
            </div>

            {/* Scrollable controls panel */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* TARGET SELECTOR & TOGGLE VIEW */}
              <div className="bg-slate-50 border border-gray-150 p-4 rounded-3xl space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Pilih Elemen Target</label>
                  
                  {/* Delete option if custom */}
                  {selectedElement.isCustom && (
                    <button
                      onClick={() => handleDeleteElement(selectedElement.id)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus Elemen
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedElementId}
                    onChange={(e) => setSelectedElementId(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {elements.map(el => (
                      <option key={el.id} value={el.id}>
                        {el.label} {el.show ? '🟢' : '⚫'}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleUpdateElement(selectedElement.id, { show: !selectedElement.show })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      selectedElement.show 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    }`}
                    title={selectedElement.show ? "Sembunyikan elemen" : "Tampilkan elemen"}
                  >
                    {selectedElement.show ? (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>ON</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4" />
                        <span>OFF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* TAB 1: CONTENT & TEXT AND IMAGE UPLOADER */}
              {activeTab === 'content' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  
                  {/* TEXT TYPE CONTENT EDIT */}
                  {selectedElement.type === 'text' ? (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Teks / Konten Manual
                      </label>
                      <textarea
                        value={selectedElement.text || ''}
                        onChange={(e) => handleUpdateElement(selectedElement.id, { text: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Ketik teks kustom Anda..."
                      />
                    </div>
                  ) : (
                    // IMAGE TYPE CONTENT EDIT (Upload Custom PNG/JPEG logo)
                    <div className="space-y-3 bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl">
                      <div>
                        <span className="block text-[10px] font-black text-indigo-800 uppercase tracking-widest">
                          Upload Gambar untuk Elemen Ini
                        </span>
                        <p className="text-[9px] text-indigo-600 font-semibold mt-0.5">
                          Unggah file PNG transparan (seperti Logo Mitra Anda) untuk menggantikan kotak placeholder
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-indigo-50 border border-dashed border-indigo-300 rounded-xl cursor-pointer transition-colors text-xs font-black text-indigo-700">
                          <Upload className="w-4 h-4" />
                          <span>PILIH FILE GAMBAR LOGO</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleElementImageUpload(e, selectedElement.id)}
                            className="hidden"
                          />
                        </label>

                        {selectedElement.imageUrl && (
                          <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-indigo-100">
                            <span className="text-[9px] font-mono text-gray-500 truncate max-w-[200px]">
                              Gambar Terpasang (Base64)
                            </span>
                            <button
                              onClick={() => handleUpdateElement(selectedElement.id, { imageUrl: '' })}
                              className="text-[9px] font-black text-rose-600 uppercase hover:underline"
                            >
                              Reset Gambar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* QUICK ADD MANUAL BUTTONS */}
                  <div className="border-t border-gray-100 pt-4 space-y-2">
                    <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Tambahkan Elemen Kustom Baru
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleAddTextElement}
                        className="p-3 bg-white hover:bg-slate-50 text-indigo-600 border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Plus className="w-4 h-4" /> Tambah Teks Baru
                      </button>
                      <button
                        onClick={handleAddImageElement}
                        className="p-3 bg-white hover:bg-slate-50 text-indigo-600 border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <ImageIcon className="w-4 h-4" /> Tambah Gambar Baru
                      </button>
                    </div>
                  </div>

                  {/* PRELOADED QUICK TEXT PRESETS */}
                  {selectedElement.type === 'text' && (
                    <div className="bg-slate-50 border border-gray-150 p-4 rounded-3xl space-y-3">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">
                        Preset Teks Otomatis dari Paket
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <button 
                          onClick={() => handleUpdateElement(selectedElement.id, { text: paket.nama.toUpperCase() })}
                          className="p-2 bg-white rounded-xl border border-gray-200 hover:bg-indigo-50 font-bold text-gray-700 text-left truncate transition-colors"
                        >
                          🏷️ Nama Program
                        </button>
                        <button 
                          onClick={() => handleUpdateElement(selectedElement.id, { text: initialPriceStr })}
                          className="p-2 bg-white rounded-xl border border-gray-200 hover:bg-indigo-50 font-bold text-gray-700 text-left truncate transition-colors"
                        >
                          💰 Harga Quad
                        </button>
                        <button 
                          onClick={() => handleUpdateElement(selectedElement.id, { text: `${paket.durasiHari || 9} HARI | ${paket.tglBerangkat || 'DESEMBER 2026'}` })}
                          className="p-2 bg-white rounded-xl border border-gray-200 hover:bg-indigo-50 font-bold text-gray-700 text-left truncate transition-colors"
                        >
                          📅 Durasi & Tgl
                        </button>
                        <button 
                          onClick={() => handleUpdateElement(selectedElement.id, { text: `✈️ ${resolvedMaskapaiName}` })}
                          className="p-2 bg-white rounded-xl border border-gray-200 hover:bg-indigo-50 font-bold text-gray-700 text-left truncate transition-colors"
                        >
                          ✈️ Maskapai Penerbangan
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* TAB 2: LAYOUT / POSITIONS & SIZE */}
              {activeTab === 'layout' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  
                  {/* Position manual sliders */}
                  <div className="space-y-4 bg-slate-50 p-4 rounded-3xl border border-gray-150">
                    <span className="block text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                      Presisi Posisi Manual (Sumbu X & Y)
                    </span>

                    {/* Y Pos Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-gray-600">
                        <span>Posisi Vertikal (Y - Jarak Atas)</span>
                        <span className="text-indigo-600 font-mono text-xs">{selectedElement.yPos}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.5"
                        value={selectedElement.yPos}
                        onChange={(e) => handleUpdateElement(selectedElement.id, { yPos: Number(e.target.value) })}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    {/* X Pos Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-gray-600">
                        <span>Posisi Horisontal (X - Jarak Kiri)</span>
                        <span className="text-indigo-600 font-mono text-xs">{selectedElement.xPos}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.5"
                        value={selectedElement.xPos}
                        onChange={(e) => handleUpdateElement(selectedElement.id, { xPos: Number(e.target.value) })}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* ELEMENT SIZE CONTROLS */}
                  <div className="space-y-4 bg-slate-50 p-4 rounded-3xl border border-gray-150">
                    <span className="block text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                      Ukuran Elemen ({selectedElement.type === 'text' ? 'Font' : 'Dimensi Gambar'})
                    </span>

                    {selectedElement.type === 'text' ? (
                      /* Font Size Slider */
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-gray-600">
                          <span>Ukuran Huruf (Font Size)</span>
                          <span className="text-indigo-600 font-mono text-xs">{selectedElement.fontSize || 12}px</span>
                        </div>
                        <input
                          type="range"
                          min="6"
                          max="54"
                          step="1"
                          value={selectedElement.fontSize || 12}
                          onChange={(e) => handleUpdateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    ) : (
                      /* Image Width / Height sliders */
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-gray-600">
                            <span>Lebar Gambar (Width)</span>
                            <span className="text-indigo-600 font-mono text-xs">{selectedElement.width || 80}px</span>
                          </div>
                          <input
                            type="range"
                            min="15"
                            max="300"
                            step="5"
                            value={selectedElement.width || 80}
                            onChange={(e) => handleUpdateElement(selectedElement.id, { width: Number(e.target.value) })}
                            className="w-full accent-indigo-600 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-gray-600">
                            <span>Tinggi Gambar (Height)</span>
                            <span className="text-indigo-600 font-mono text-xs">{selectedElement.height || 80}px</span>
                          </div>
                          <input
                            type="range"
                            min="15"
                            max="300"
                            step="5"
                            value={selectedElement.height || 80}
                            onChange={(e) => handleUpdateElement(selectedElement.id, { height: Number(e.target.value) })}
                            className="w-full accent-indigo-600 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {/* Width boundary for text element block */}
                    {selectedElement.type === 'text' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-gray-600">
                          <span>Lebar Area Teks (Boundary Width)</span>
                          <span className="text-indigo-600 font-mono text-xs">{selectedElement.width || 360}px</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="400"
                          step="10"
                          value={selectedElement.width || 360}
                          onChange={(e) => handleUpdateElement(selectedElement.id, { width: Number(e.target.value) })}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* STYLINGS AND ALIGNMENT (TEXT ONLY) */}
                  {selectedElement.type === 'text' && (
                    <div className="space-y-3 bg-slate-50 p-4 rounded-3xl border border-gray-150">
                      <span className="block text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                        Perataan & Gaya Tambahan
                      </span>

                      {/* Alignments */}
                      <div className="grid grid-cols-3 gap-2">
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() => handleUpdateElement(selectedElement.id, { align })}
                            className={`py-2 rounded-xl text-xs font-black uppercase border tracking-wider transition-all ${
                              selectedElement.align === align
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-slate-50'
                            }`}
                          >
                            {align === 'left' ? 'Kiri' : align === 'center' ? 'Tengah' : 'Kanan'}
                          </button>
                        ))}
                      </div>

                      {/* Text styling switches */}
                      <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] font-bold text-gray-700">
                        <label className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded-xl border border-gray-150">
                          <input
                            type="checkbox"
                            checked={selectedElement.isBold || false}
                            onChange={(e) => handleUpdateElement(selectedElement.id, { isBold: e.target.checked })}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          Sangat Tebal (900)
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded-xl border border-gray-150">
                          <input
                            type="checkbox"
                            checked={selectedElement.isItalic || false}
                            onChange={(e) => handleUpdateElement(selectedElement.id, { isItalic: e.target.checked })}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          Cetak Miring
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded-xl border border-gray-150">
                          <input
                            type="checkbox"
                            checked={selectedElement.hasShadow || false}
                            onChange={(e) => handleUpdateElement(selectedElement.id, { hasShadow: e.target.checked })}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          Shadow Hitam
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded-xl border border-gray-150">
                          <input
                            type="checkbox"
                            checked={selectedElement.hasBackground || false}
                            onChange={(e) => handleUpdateElement(selectedElement.id, { hasBackground: e.target.checked })}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          Capsule Badge
                        </label>
                      </div>

                      {/* Font Color Presets */}
                      <div className="space-y-1.5 pt-2 border-t border-gray-200">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">
                          Pilihan Warna Huruf
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {colors.map((color) => (
                            <button
                              key={color.hex}
                              onClick={() => handleUpdateElement(selectedElement.id, { color: color.hex })}
                              className={`flex items-center gap-1.5 p-2 rounded-xl border text-[10px] font-bold uppercase transition-all ${
                                selectedElement.color?.toUpperCase() === color.hex.toUpperCase()
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                  : 'border-gray-200 bg-white text-gray-600 hover:bg-slate-50'
                              }`}
                            >
                              <span 
                                className="w-3.5 h-3.5 rounded-full border border-gray-300 block shrink-0" 
                                style={{ backgroundColor: color.hex }}
                              />
                              <span className="truncate">{color.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )}

              {/* TAB 3: BACKGROUND CUSTOMIZATION */}
              {activeTab === 'style' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  
                  {/* LOCAL BACKGROUND UPLOADER */}
                  <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-3xl space-y-3">
                    <div>
                      <span className="block text-[10px] font-black text-indigo-800 uppercase tracking-widest">
                        Upload Gambar Background Kustom
                      </span>
                      <p className="text-[9px] text-indigo-600 font-semibold mt-0.5">
                        Anda dapat mengunggah file JPG/PNG dari galeri Anda untuk digunakan sebagai latar belakang flyer
                      </p>
                    </div>

                    <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-indigo-50 border border-dashed border-indigo-300 rounded-xl cursor-pointer transition-all text-xs font-black text-indigo-700 shadow-sm">
                      <Upload className="w-4 h-4" />
                      <span>UNGKAH LATAR BELAKANG</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBgImageUpload}
                        className="hidden"
                      />
                    </label>

                    {customBgImage && (
                      <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-indigo-100">
                        <span className="text-[9px] font-mono text-gray-500 truncate max-w-[200px]">
                          Gambar Background Aktif
                        </span>
                        <button
                          onClick={() => {
                            setCustomBgImage(null);
                            showMsg('success', 'Background kustom di-reset ke template resmi.');
                          }}
                          className="text-[9px] font-black text-rose-600 uppercase hover:underline"
                        >
                          Reset Template
                        </button>
                      </div>
                    )}
                  </div>

                  {/* DIM BACKGROUND OVERLAY */}
                  <div className="space-y-1.5 bg-slate-50 p-4 rounded-3xl border border-gray-150">
                    <div className="flex justify-between text-[10px] font-bold text-gray-600">
                      <span>Kegelapan Latar Belakang (Dim Opacity)</span>
                      <span className="text-indigo-600 font-mono text-xs">{bgDimOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      step="5"
                      value={bgDimOpacity}
                      onChange={(e) => setBgDimOpacity(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <p className="text-[9px] text-gray-400 font-bold leading-relaxed">
                      Geser ke kanan untuk memberi warna gelap transparan di atas background agar tulisan Anda jauh lebih mudah dibaca.
                    </p>
                  </div>

                  {/* FALLBACK SETTING */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-3xl border border-gray-150">
                    <span className="block text-[10px] font-black text-gray-900 uppercase tracking-wider">
                      Opsi Background Alternatif (Fallback)
                    </span>

                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-700 bg-white p-3 rounded-2xl border border-gray-150">
                      <input
                        type="checkbox"
                        checked={useFallbackBg}
                        onChange={(e) => setUseFallbackBg(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Gunakan Background Gradien (Tanpa Gambar)
                    </label>

                    {useFallbackBg && (
                      <div className="space-y-2 pt-2 border-t border-gray-200">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
                          Pilihan Warna Gradien Fallback
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setBgGradient('bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950')}
                            className={`p-2.5 rounded-xl text-[9px] font-bold border transition-all ${
                              bgGradient.includes('indigo-950') ? 'border-indigo-500 bg-white font-black' : 'border-gray-150 bg-slate-50'
                            }`}
                          >
                            🌌 Midnight Indigo
                          </button>
                          <button
                            onClick={() => setBgGradient('bg-gradient-to-b from-emerald-950 via-teal-900 to-emerald-950')}
                            className={`p-2.5 rounded-xl text-[9px] font-bold border transition-all ${
                              bgGradient.includes('emerald-950') ? 'border-emerald-500 bg-white font-black' : 'border-gray-150 bg-slate-50'
                            }`}
                          >
                            🕌 Emerald Velvet
                          </button>
                          <button
                            onClick={() => setBgGradient('bg-gradient-to-b from-amber-950 via-yellow-950 to-slate-950')}
                            className={`p-2.5 rounded-xl text-[9px] font-bold border transition-all ${
                              bgGradient.includes('amber-950') ? 'border-amber-500 bg-white font-black' : 'border-gray-150 bg-slate-50'
                            }`}
                          >
                            ✨ Golden Velvet
                          </button>
                          <button
                            onClick={() => setBgGradient('bg-gradient-to-b from-rose-950 via-slate-900 to-rose-950')}
                            className={`p-2.5 rounded-xl text-[9px] font-bold border transition-all ${
                              bgGradient.includes('rose-950') ? 'border-rose-500 bg-white font-black' : 'border-gray-150 bg-slate-50'
                            }`}
                          >
                            💖 Rose Twilight
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* GOOGLE DRIVE / EXTERNAL LINK CUSTOMIZER */}
                  <div className="space-y-4 bg-slate-50 p-4 rounded-3xl border border-gray-150">
                    <span className="block text-[10px] font-black text-gray-900 uppercase tracking-wider">
                      Tautan & Sumber Gambar Luar (URL)
                    </span>

                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        Gunakan URL Gambar Latar Belakang (Opsional)
                      </label>
                      <input
                        type="text"
                        value={customBgUrl}
                        onChange={(e) => {
                          setCustomBgUrl(e.target.value);
                          if (e.target.value) setUseFallbackBg(false);
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-[11px] font-mono text-gray-700 outline-none"
                        placeholder="https://link-gambar.com/bg.jpg"
                      />
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-gray-200">
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        Google Drive Background File ID (Template Resmi)
                      </label>
                      <input
                        type="text"
                        value={templateId}
                        onChange={(e) => {
                          setTemplateId(e.target.value);
                          if (e.target.value) {
                            setCustomBgImage(null);
                            setCustomBgUrl('');
                            setUseFallbackBg(false);
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-[11px] font-mono text-gray-700 outline-none"
                        placeholder="ID File Google Drive"
                      />
                    </div>
                  </div>

                </div>
              )}

            </div>
            </>
          )}

            {/* Bottom Actions Area */}
            <div className="p-6 bg-slate-50 border-t border-gray-100 grid grid-cols-2 gap-4">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="py-3.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Seting
              </button>
              <button
                onClick={handleDownloadFlyer}
                disabled={isGenerating}
                className="py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/35 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download Flyer
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
