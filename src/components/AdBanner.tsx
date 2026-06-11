import React, { useEffect, useState } from 'react';
import { db, collection, onSnapshot, query, where } from '../firebase';
import { Sparkles, Terminal, X, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface AdCampaignData {
  id: string;
  title: string;
  tagline: string;
  cta: string;
  targetUrl: string;
  category: string;
  layoutBg: string; // Tailwind linear gradient or class
  priority: number;
  status: string;
}

interface AdBannerProps {
  adSlot: 'header' | 'sidebar' | 'footer-banner' | 'dashboard-embed';
  className?: string;
  onDismiss?: () => void;
}

export const AdBanner: React.FC<AdBannerProps> = ({ adSlot, className = '', onDismiss }) => {
  const [config, setConfig] = useState<{
    mode: 'simulated' | 'adsense';
    adSenseClient: string;
    adSenseSlot: string;
  }>({
    mode: 'simulated',
    adSenseClient: 'ca-pub-3377023550565067', // Real client publisher ID
    adSenseSlot: '1234567890',
  });
  
  const [activeCampaign, setActiveCampaign] = useState<AdCampaignData | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasValidWidth, setHasValidWidth] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Selective global error interceptor to prevent AdSense tag script noise from bubbling up
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event?.message || '';
      if (msg.includes('adsbygoogle') || msg.includes('TagError') || msg.includes('No slot size')) {
        console.warn('[AdSense Safeguard] Intercepted uncaught ad container layout error safely:', msg);
        try {
          event.preventDefault();
        } catch (err) {
          console.debug('preventDefault error', err);
        }
        return true;
      }
    };
    
    window.addEventListener('error', handleGlobalError);
    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  // Measure parent container offsetWidth before allowing initialization
  useEffect(() => {
    if (config.mode !== 'adsense' || !containerRef.current) return;

    const checkWidth = () => {
      const w = containerRef.current?.offsetWidth || 0;
      if (w > 0) {
        setHasValidWidth(true);
      }
    };

    checkWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            setHasValidWidth(true);
            observer.disconnect();
          }
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    } else {
      const timer = setTimeout(checkWidth, 600);
      return () => clearTimeout(timer);
    }
  }, [config.mode, activeCampaign]);

  // Load configuration and campaigns
  useEffect(() => {
    // 1. Listen for ad configuration
    const configDocRef = collection(db, 'ad_network_config');
    const unsubConfig = onSnapshot(configDocRef, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setConfig({
          mode: (data.mode as 'simulated' | 'adsense') || 'simulated',
          adSenseClient: data.adSenseClient || 'ca-pub-3377023550565067',
          adSenseSlot: data[`adSenseSlot${adSlot.charAt(0).toUpperCase() + adSlot.slice(1)}`] || '1234567890',
        });
      }
    }, (err) => {
      console.warn("Using offline fallback for Ad Configuration:", err);
    });

    // 2. Default high-quality fallback campaigns in Indonesian for Umrah travels
    const defaultCampaigns: AdCampaignData[] = [
      {
        id: 'promo_syawal',
        title: 'Diskon Spesial Umroh Syawal 1447H',
        tagline: 'Diskon Kemitraan Rp 2.000.000 per pax khusus mitra terdaftar Umaroh ERP. Slot terbatas!',
        cta: 'Klaim Diskon',
        targetUrl: 'https://umaroh.com/syawal-promo',
        category: 'Promo Umroh',
        layoutBg: 'from-amber-600 via-amber-500 to-yellow-500 text-white',
        priority: 1,
        status: 'Aktif'
      },
      {
        id: 'mutawif_cert',
        title: 'Sertifikasi & Pelatihan Mutawif Profesional',
        tagline: 'Tingkatkan standar pelayanan jamaah dengan guide bersertified resmi. Daftar Angkatan X!',
        cta: 'Daftar Pelatihan',
        targetUrl: 'https://umaroh.com/mutawif-academy',
        category: 'Pendidikan',
        layoutBg: 'from-emerald-700 to-teal-600 text-white',
        priority: 2,
        status: 'Aktif'
      },
      {
        id: 'saudi_visa_fast',
        title: 'Layanan VIP Saudi Visa Fast-Track',
        tagline: 'Pengurusan Visa Umrah, Turis & Bisnis Arab Saudi dijamin instant 24 jam terbit legal.',
        cta: 'Ajukan Visa',
        targetUrl: 'https://umaroh.com/saudi-visa',
        category: 'Visa Provider',
        layoutBg: 'from-slate-800 via-indigo-950 to-indigo-900 text-slate-100',
        priority: 3,
        status: 'Aktif'
      },
      {
        id: 'hotel_makkah_deal',
        title: 'Mega Promo Voucher Hilton Makkah',
        tagline: 'Dapatkan diskon eksklusif sampai dengan 35% untuk pemesanan group & FIT. Booking aman.',
        cta: 'Cek Voucher Kamar',
        targetUrl: 'https://umaroh.com/hilton-makkah-deals',
        category: 'Voucher Hotel',
        layoutBg: 'from-cyan-800 to-blue-700 text-slate-50',
        priority: 4,
        status: 'Aktif'
      },
      {
        id: 'saptco_vip_bus',
        title: 'Sewa Armanda Bus VIP Saptco 2026',
        tagline: 'Nikmati transportasi mutakhir Coach Mercedes Benz untuk kenyamanan ziarah jamaah Anda.',
        cta: 'Sewa Sekarang',
        targetUrl: 'https://umaroh.com/saptco-charter',
        category: 'Transportasi',
        layoutBg: 'from-rose-800 to-pink-700 text-white',
        priority: 5,
        status: 'Aktif'
      }
    ];

    // 3. Listen for online campaign creations from Firestore
    const campaignsCol = collection(db, 'ad_campaigns');
    const q = query(campaignsCol, where('status', '==', 'Aktif'));
    
    const unsubCampaigns = onSnapshot(q, (snap) => {
      const campaignsList: AdCampaignData[] = [];
      snap.forEach(d => {
        campaignsList.push({ id: d.id, ...d.data() } as AdCampaignData);
      });
      
      const merged = campaignsList.length > 0 ? campaignsList : defaultCampaigns;
      
      // Select random Campaign or based on slot priority
      const filteredForSlot = merged.sort(() => .5 - Math.random());
      if (filteredForSlot.length > 0) {
        setActiveCampaign(filteredForSlot[0]);
      }
    }, (err) => {
      console.warn("Using offline local campaigns database:", err);
      // Fallback
      setActiveCampaign(defaultCampaigns[Math.floor(Math.random() * defaultCampaigns.length)]);
    });

    return () => {
      unsubConfig();
      unsubCampaigns();
    };
  }, [adSlot]);

  // Inject Google AdSense scripts dynamically if AdSense mode is active and parent width is verified
  useEffect(() => {
    if (config.mode === 'adsense' && hasValidWidth) {
      try {
        const existingScript = document.getElementById('adsbygoogle-script');
        if (!existingScript) {
          const script = document.createElement('script');
          script.id = 'adsbygoogle-script';
          script.async = true;
          script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adSenseClient}`;
          script.crossOrigin = 'anonymous';
          script.onerror = (e) => {
            console.warn('Google AdSense script loading blocked or failed.', e);
          };
          document.head.appendChild(script);
        }
        
        // Push the ad unit safely
        const win = window as unknown as { adsbygoogle: unknown[] };
        win.adsbygoogle = win.adsbygoogle || [];
        win.adsbygoogle.push({});
      } catch (err) {
        console.warn('Google AdSense script initialization failed gracefully:', err);
      }
    }
  }, [config.mode, config.adSenseClient, hasValidWidth]);

  // Log track events to Firebase & localStorage
  const trackAdEvent = async (type: 'impression' | 'click') => {
    if (!activeCampaign) return;
    try {
      const log = {
        id: `adlog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        adId: activeCampaign.id,
        adTitle: activeCampaign.title,
        adSlot: adSlot,
        type: type,
        timestamp: new Date().toISOString()
      };
      
      // TEMPORARILY DISABLED: Suspended cloud saving to prevent extreme Firestore write quota exhaustion
      // await addDoc(collection(db, 'ad_performance_logs'), log);
      
      // Keep state locally
      let stored = [];
      try {
        stored = JSON.parse(localStorage.getItem('ad_performance_data') || '[]');
      } catch (e) {
        console.warn('Failed parsing ad_performance_data:', e);
        localStorage.removeItem('ad_performance_data');
      }
      localStorage.setItem('ad_performance_data', JSON.stringify([log, ...stored]));
    } catch {
      // Offline fallback silent
      const log = {
        id: `adlog_${Date.now()}`,
        adId: activeCampaign.id,
        adTitle: activeCampaign.title,
        adSlot: adSlot,
        type: type,
        timestamp: new Date().toISOString()
      };
      let stored = [];
      try {
        stored = JSON.parse(localStorage.getItem('ad_performance_data') || '[]');
      } catch (e) {
        console.warn('Failed parsing ad_performance_data in offline branch:', e);
        localStorage.removeItem('ad_performance_data');
      }
      localStorage.setItem('ad_performance_data', JSON.stringify([log, ...stored]));
    }
  };

  // Log initial impression once campaign is ready
  useEffect(() => {
    if (activeCampaign && !isDismissed) {
      trackAdEvent('impression');
    }
  }, [activeCampaign?.id, isDismissed]);

  const handleCtaClick = () => {
    trackAdEvent('click');
  };

  if (isDismissed) return null;

  return (
    <div ref={containerRef} className={`w-full overflow-hidden ${className}`}>
      {config.mode === 'adsense' ? (
        // Google AdSense Implementation Space
        <div className="relative bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center select-none shadow-sm">
          <div className="absolute top-1.5 right-1.5 flex items-center gap-2">
            <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              AD BY GOOGLE
            </span>
            <button
              onClick={() => {
                setIsDismissed(true);
                if (onDismiss) onDismiss();
              }}
              className="p-1 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
            </button>
          </div>
          
          <div className="py-2 flex flex-col items-center justify-center min-h-[90px]">
            {/* The AdSense Ad Slot Tag - Render only when width > 0 to prevent availableWidth=0 TagError */}
            {hasValidWidth ? (
              <ins 
                className="adsbygoogle"
                style={{ display: 'block', minWidth: '120px', minHeight: '90px' }}
                data-ad-client={config.adSenseClient}
                data-ad-slot={config.adSenseSlot}
                data-ad-format="auto"
                data-full-width-responsive="true"
              />
            ) : (
              <div className="text-xs text-slate-400 animate-pulse font-mono flex items-center justify-center p-4">
                Memuat ukuran penempatan iklan...
              </div>
            )}
            
            {/* Sandboxed visual loader to let users know where Ads would render */}
            <div className="flex flex-col items-center gap-1 mt-2 text-slate-400 text-xs">
              <Terminal className="w-4 h-4 text-slate-500 animate-pulse" />
              <p className="font-mono text-[10px] text-slate-500 font-bold">
                AdsbyGoogle Tag Actived: ca-pub-...{config.adSenseClient.slice(-6)} / Slot: {config.adSenseSlot}
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Simulated Interactive Ad Network (Optimized Conversion Content for Traveling Agents)
        activeCampaign && (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`relative bg-gradient-to-r ${activeCampaign.layoutBg} rounded-2xl p-6 shadow-lg border border-white/10`}
            >
              {/* Top bar info */}
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5 bg-black/15 px-2.5 py-1 rounded-full border border-white/10">
                  <Sparkles className="w-3.5 h-3.5 animate-bounce text-amber-200" />
                  <span className="text-[10px] font-black tracking-wider uppercase text-amber-100">
                    Sponsor Partner: {activeCampaign.category}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase font-black tracking-widest text-white/50 bg-black/25 px-2 py-0.5 rounded border border-white/5">
                    IKLAN MITRA
                  </span>
                  <button
                    onClick={() => {
                      setIsDismissed(true);
                      if (onDismiss) onDismiss();
                    }}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-white/70 hover:text-white" />
                  </button>
                </div>
              </div>

              {/* Main Banner Grid */}
              <div className={`grid grid-cols-1 ${adSlot === 'sidebar' ? 'gap-4' : 'md:grid-cols-4 gap-6'} items-center`}>
                <div className={adSlot === 'sidebar' ? 'w-full' : 'md:col-span-3'}>
                  <h4 className="text-base font-black tracking-tight leading-snug drop-shadow-sm mb-1.5">
                    {activeCampaign.title}
                  </h4>
                  <p className="text-xs text-white/90 font-medium leading-relaxed max-w-2xl">
                    {activeCampaign.tagline}
                  </p>
                </div>

                <div className={`flex flex-col gap-2 ${adSlot === 'sidebar' ? 'w-full' : 'md:col-span-1 md:items-end'}`}>
                  <a
                    href={activeCampaign.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={handleCtaClick}
                    className="w-full text-center px-4 py-2.5 bg-white text-gray-900 border hover:bg-gray-50 text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <span>{activeCampaign.cta}</span>
                    <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                  </a>
                  
                  <div className="flex items-center gap-1 text-[10px] text-white/60 justify-center w-full">
                    <ShieldCheck className="w-3 h-3 text-emerald-300" />
                    <span>Terverifikasi Aman</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )
      )}
    </div>
  );
};
