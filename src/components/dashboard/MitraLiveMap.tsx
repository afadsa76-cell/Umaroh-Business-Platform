import React, { useState } from 'react';
import { Activity, Radio, Search, Clock, Sparkles, RefreshCw, MessageSquare } from 'lucide-react';

interface UserRecord {
  id: string;
  role?: string;
  status?: string;
  namaLengkap?: string;
  name?: string;
  brandName?: string;
  jenisMitra?: string;
  kota?: string;
  phone?: string;
  whatsapp?: string;
  lastActiveAt?: string;
  updatedAt?: string;
}

interface MitraLiveMapProps {
  users: UserRecord[];
}

interface StylizedMitra {
  id: string;
  brandName: string;
  name: string;
  city: string;
  whatsapp?: string;
  coords: { x: number; y: number };
  isActiveNow: boolean;
  minutesAgo: number;
  activeStatusText: string;
}

export const CITY_COORDINATES: Record<string, { x: number; y: number }> = {
  jakarta: { x: 350, y: 245 },
  jabodetabek: { x: 350, y: 245 },
  tangerang: { x: 335, y: 245 },
  bekasi: { x: 365, y: 245 },
  depok: { x: 345, y: 250 },
  bogor: { x: 350, y: 255 },
  bandung: { x: 380, y: 255 },
  semarang: { x: 440, y: 253 },
  yogyakarta: { x: 455, y: 262 },
  solo: { x: 470, y: 260 },
  surabaya: { x: 520, y: 254 },
  malang: { x: 512, y: 265 },
  sidoarjo: { x: 528, y: 258 },
  gresik: { x: 518, y: 250 },
  medan: { x: 120, y: 80 },
  palembang: { x: 240, y: 170 },
  pekanbaru: { x: 180, y: 120 },
  aceh: { x: 50, y: 40 },
  bandaaceh: { x: 50, y: 40 },
  padang: { x: 150, y: 140 },
  lampung: { x: 310, y: 220 },
  bali: { x: 575, y: 265 },
  denpasar: { x: 575, y: 265 },
  lombok: { x: 605, y: 265 },
  mataram: { x: 605, y: 265 },
  makassar: { x: 680, y: 190 },
  manado: { x: 750, y: 100 },
  balikpapan: { x: 590, y: 155 },
  samarinda: { x: 600, y: 140 },
  pontianak: { x: 460, y: 140 },
  banjarmasin: { x: 560, y: 180 },
  ambon: { x: 820, y: 180 },
  jayapura: { x: 950, y: 190 },
};

// Map skeleton background nodes
const SUMATRA_NODES = [
  { x: 60, y: 50 }, { x: 100, y: 80 }, { x: 140, y: 100 }, { x: 180, y: 130 },
  { x: 220, y: 160 }, { x: 260, y: 185 }, { x: 290, y: 215 }
];
const JAVA_NODES = [
  { x: 330, y: 240 }, { x: 370, y: 245 }, { x: 410, y: 248 }, { x: 450, y: 252 },
  { x: 490, y: 255 }, { x: 530, y: 258 }
];
const BORNEO_NODES = [
  { x: 460, y: 120 }, { x: 500, y: 100 }, { x: 550, y: 110 }, { x: 575, y: 135 },
  { x: 550, y: 165 }, { x: 500, y: 175 }, { x: 460, y: 155 }
];
const SULAWESI_NODES = [
  { x: 635, y: 130 }, { x: 675, y: 125 }, { x: 710, y: 110 }, { x: 745, y: 115 },
  { x: 680, y: 155 }, { x: 710, y: 175 }, { x: 660, y: 185 }
];
const NUSA_TENGGARA_NODES = [
  { x: 575, y: 265 }, { x: 610, y: 267 }, { x: 645, y: 268 }, { x: 680, y: 270 }
];
const PAPUA_NODES = [
  { x: 840, y: 165 }, { x: 875, y: 160 }, { x: 915, y: 170 }, { x: 955, y: 175 },
  { x: 975, y: 190 }, { x: 935, y: 210 }, { x: 890, y: 200 }, { x: 855, y: 190 }
];

export function getCityCoords(cityName?: string, index: number = 0): { x: number; y: number } {
  if (!cityName) {
    const anchors = [
      { x: 350, y: 245 }, // Jakarta
      { x: 520, y: 254 }, // Surabaya
      { x: 380, y: 255 }, // Bandung
      { x: 120, y: 80 },  // Medan
      { x: 680, y: 190 }, // Makassar
    ];
    return anchors[index % anchors.length];
  }
  const clean = cityName.toLowerCase().replace(/\s+/g, '');
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return coords;
    }
  }
  const anchors = [
    { x: 350, y: 245 }, // Jakarta
    { x: 520, y: 254 }, // Surabaya
    { x: 380, y: 255 }, // Bandung
    { x: 120, y: 80 },  // Medan
    { x: 680, y: 190 }, // Makassar
  ];
  return anchors[index % anchors.length];
}

export const MitraLiveMap: React.FC<MitraLiveMapProps> = ({ users }) => {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pulseKey, setPulseKey] = useState(0);

  const normalizeWA = (phone?: string): string | undefined => {
    if (!phone) return undefined;
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      return '62' + clean.slice(1);
    }
    return clean;
  };

  // Generate real-time active statuses based on last active heartbeat time
  const mapMitras = (): StylizedMitra[] => {
    const now = new Date();
    
    return users
      .filter(u => u.role === 'mitra' || u.role === 'admin')
      .map((u, i) => {
        let active = false;
        let minutesAgo = 99999;
        let activeStatusText = "Offline";

        const activityTimeStr = u.lastActiveAt || u.updatedAt;
        if (activityTimeStr) {
          try {
            const actTime = new Date(activityTimeStr);
            const diffMs = now.getTime() - actTime.getTime();
            if (!isNaN(diffMs)) {
              const diffMins = Math.floor(diffMs / 60000);
              minutesAgo = Math.max(0, diffMins);
              
              if (diffMins < 5) {
                active = true;
                activeStatusText = "Aktif Sekarang";
              } else if (diffMins < 60) {
                activeStatusText = `${diffMins}m Lalu`;
              } else if (diffMins < 1440) {
                const hours = Math.floor(diffMins / 60);
                activeStatusText = `${hours}j Lalu`;
              } else {
                const days = Math.floor(diffMins / 1440);
                activeStatusText = `${days}h Lalu`;
              }
            }
          } catch (e) {
            console.warn("Error parsing activity timestamp for user", u.id, e);
          }
        } else {
          // If no timestamp exists, fallback
          activeStatusText = "Belum Aktif";
        }

        const resolvedCity = u.kota || 'Jakarta';
        const displayBrand = u.brandName || (u.role === 'admin' ? 'ADMIN PUSAT' : 'MITRA MANDIRI');

        // Normalize whatsapp
        const waNum = normalizeWA(u.phone || u.whatsapp);

        return {
          id: u.id,
          brandName: displayBrand,
          name: u.namaLengkap || u.name || (u.role === 'admin' ? 'Administrator' : 'Mitra'),
          city: resolvedCity,
          whatsapp: waNum,
          coords: getCityCoords(resolvedCity, i),
          isActiveNow: active,
          minutesAgo: minutesAgo,
          activeStatusText: activeStatusText
        } as StylizedMitra;
      });
  };

  const mitras = mapMitras();

  // Highlight points grouped by city coordinates
  const cityGroups = mitras.reduce<Record<string, { coords: { x: number; y: number }; city: string; items: StylizedMitra[] }>>((acc, m) => {
    const key = `${m.coords.x},${m.coords.y}`;
    if (!acc[key]) {
      acc[key] = { coords: m.coords, city: m.city, items: [] };
    }
    acc[key].items.push(m);
    return acc;
  }, {});

  const filteredMitras = mitras.filter(m => {
    const s = searchTerm.toLowerCase();
    const matchSearch = m.brandName.toLowerCase().includes(s) || 
                        m.name.toLowerCase().includes(s) || 
                        m.city.toLowerCase().includes(s);
    if (selectedCity) {
      return matchSearch && m.city.toLowerCase() === selectedCity.toLowerCase();
    }
    return matchSearch;
  });

  const handleTriggerPulse = () => {
    setPulseKey(prev => prev + 1);
  };

  const openWhatsApp = (urlOrPhone: string) => {
    if (urlOrPhone.startsWith('http')) {
      window.open(urlOrPhone, '_blank');
    } else {
      window.open(`https://wa.me/${urlOrPhone}`, '_blank');
    }
  };

  return (
    <div className="mb-8 bg-slate-950 rounded-3xl p-6 md:p-8 text-white shadow-2xl border border-slate-800 relative overflow-hidden" id="mitra-live-map-card">
      {/* Decorative stars and blueprint circles */}
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Activity className="w-64 h-64 text-white" />
      </div>
      <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-indigo-505/10 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl opacity-30 pointer-events-none"></div>

      <div className="relative z-10">
        {/* Header Block */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800/60">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1.5 shadow-md">
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" /> LIVE CONNECTIVITY
              </span>
              <span className="text-[10px] text-slate-400 font-bold tracking-wide">Peta Penyebaran & Aktivitas Real-Time Mitra</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
              🗺️ MAP NETWORK HUBS & DIGITAL AGENTS
            </h2>
          </div>

          {/* Search bar and utilities */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-xs w-full lg:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari Kota / Mitra..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] font-bold"
              />
            </div>
            <button 
              onClick={handleTriggerPulse}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition text-slate-300 hover:text-white"
              title="Refresh Live Connection Ping"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {selectedCity && (
              <button 
                onClick={() => setSelectedCity(null)}
                className="px-2.5 py-1.5 bg-indigo-950/40 text-indigo-300 border border-indigo-900/50 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-900/50 transition-all"
              >
                Reset Filter Kota
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Map Bento Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[380px]">
          
          {/* LEFT CONTAINER: The Glowing Vector Map */}
          <div className="lg:col-span-8 bg-slate-900/60 rounded-2xl border border-slate-800/40 p-3 md:p-4 relative flex flex-col justify-between overflow-hidden shadow-inner backdrop-blur-sm min-h-[300px]">
            <div className="absolute top-2 left-2 text-[9px] text-slate-500 font-mono flex items-center gap-1 uppercase">
              <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" /> ANTIGRAVITY GEO COMMAND MAP
            </div>

            {/* Interactive SVG Canvas */}
            <div className="w-full flex-grow flex items-center justify-center my-auto overflow-x-auto">
              <div className="min-w-[650px] w-full relative">
                <svg viewBox="0 0 1000 340" className="w-full h-auto select-none" key={pulseKey}>
                  
                  <defs>
                    {/* Glowing effect for active connections and elements */}
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.35" />
                    </filter>
                    
                    {/* Modern high-contrast gradient fill for the islands */}
                    <linearGradient id="islandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.9" />
                      <stop offset="50%" stopColor="#2e2a72" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#111827" stopOpacity="0.9" />
                    </linearGradient>

                    {/* Gradient for hover effects */}
                    <linearGradient id="islandGradHover" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#312e81" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                  </defs>

                  {/* Subtle Grid Coordinates Background lines */}
                  <g stroke="#ffffff" strokeWidth="0.5" strokeDasharray="3 9" opacity="0.06">
                    <line x1="100" y1="0" x2="100" y2="340" />
                    <line x1="200" y1="0" x2="200" y2="340" />
                    <line x1="300" y1="0" x2="300" y2="340" />
                    <line x1="400" y1="0" x2="400" y2="340" />
                    <line x1="500" y1="0" x2="500" y2="340" />
                    <line x1="600" y1="0" x2="600" y2="340" />
                    <line x1="700" y1="0" x2="700" y2="340" />
                    <line x1="800" y1="0" x2="800" y2="340" />
                    <line x1="900" y1="0" x2="900" y2="340" />
                    <line x1="0" y1="100" x2="1000" y2="100" />
                    <line x1="0" y1="200" x2="1000" y2="200" />
                    <line x1="0" y1="300" x2="1000" y2="300" />
                  </g>

                  {/* Dynamic pulse link curves from partner cities to Jakarta (HQ) */}
                  {mitras.filter(m => m.city.toLowerCase() !== 'jakarta').map((m) => {
                    const dx = m.coords.x - 350;
                    const dy = m.coords.y - 245;
                    const cx = 350 + dx / 2 - dy / 4;
                    const cy = 245 + dy / 2 + dx / 4;
                    return (
                      <path 
                        key={`link-${m.id}`}
                        d={`M 350 245 Q ${cx} ${cy} ${m.coords.x} ${m.coords.y}`}
                        fill="none" 
                        stroke={m.isActiveNow ? "#10b981" : "#4f46e5"} 
                        strokeWidth={m.isActiveNow ? "1.5" : "0.75"} 
                        strokeDasharray={m.isActiveNow ? "4 4" : "3 6"}
                        opacity={m.isActiveNow ? "0.6" : "0.25"} 
                        className="transition-all"
                      />
                    );
                  })}

                  {/* Stylized Island Connection Underlay Glow lines */}
                  <path d="M 60 50 L 290 215 L 530 258 L 680 270 M 500 100 L 520 254 M 680 155 L 680 190" 
                    fill="none" stroke="#6366f1" strokeWidth="1" strokeDasharray="4 6" opacity="0.15" />

                  {/* Re-designed high-fidelity solid island geometries for Indonesia */}
                  <g filter="url(#glow)" strokeLinecap="round" strokeLinejoin="round">
                    {/* Sumatra Shape */}
                    <polygon 
                      points="40,30 80,45 120,70 160,100 200,130 250,160 300,200 315,225 305,230 270,210 220,170 170,145 140,135 110,105 65,70 35,40" 
                      fill="url(#islandGrad)" 
                      stroke="#4f46e5" 
                      strokeWidth="1.5" 
                      className="transition-colors duration-300 hover:stroke-[#818cf8]"
                    />
                    
                    {/* Java Shape */}
                    <polygon 
                      points="330,242 360,242 390,245 430,246 470,248 510,250 562,254 565,260 515,260 460,261 410,260 365,256 340,250 330,245" 
                      fill="url(#islandGrad)" 
                      stroke="#4f46e5" 
                      strokeWidth="1.5" 
                      className="transition-colors duration-300 hover:stroke-[#818cf8]"
                    />

                    {/* Borneo Shape */}
                    <polygon 
                      points="450,130 470,100 520,75 560,70 590,90 605,110 615,135 595,160 570,185 540,192 490,180 445,155 440,135" 
                      fill="url(#islandGrad)" 
                      stroke="#4f46e5" 
                      strokeWidth="1.5" 
                      className="transition-colors duration-300 hover:stroke-[#818cf8]"
                    />
                    
                    {/* Sulawesi Shape */}
                    <polygon 
                      points="635,125 670,125 720,110 755,95 750,105 715,120 700,130 735,135 740,142 695,145 715,175 710,185 685,165 675,195 665,195 670,155 640,145 635,135" 
                      fill="url(#islandGrad)" 
                      stroke="#4f46e5" 
                      strokeWidth="1.5" 
                      className="transition-colors duration-300 hover:stroke-[#818cf8]"
                    />

                    {/* Bali & Nusa Tenggara Peninsula Chain */}
                    <ellipse cx="578" cy="264" rx="7" ry="4" fill="url(#islandGrad)" stroke="#4f46e5" strokeWidth="1" />
                    <ellipse cx="598" cy="265" rx="7" ry="4" fill="url(#islandGrad)" stroke="#4f46e5" strokeWidth="1" />
                    <ellipse cx="625" cy="266" rx="14" ry="5" fill="url(#islandGrad)" stroke="#4f46e5" strokeWidth="1" />
                    <ellipse cx="670" cy="267" rx="20" ry="5" fill="url(#islandGrad)" stroke="#4f46e5" strokeWidth="1" />
                    <ellipse cx="655" cy="282" rx="12" ry="6" fill="url(#islandGrad)" stroke="#4f46e5" strokeWidth="1" />
                    <ellipse cx="725" cy="275" rx="24" ry="7" transform="rotate(-10 725 275)" fill="url(#islandGrad)" stroke="#4f46e5" strokeWidth="1" />

                    {/* Papua Shape */}
                    <polygon 
                      points="795,165 810,150 835,155 830,172 855,182 900,185 965,184 970,220 920,222 875,208 845,192 810,188" 
                      fill="url(#islandGrad)" 
                      stroke="#4f46e5" 
                      strokeWidth="1.5" 
                      className="transition-colors duration-300 hover:stroke-[#818cf8]"
                    />

                    {/* Bangka Belitung */}
                    <ellipse cx="280" cy="175" rx="8" ry="4" transform="rotate(-30 280 175)" fill="url(#islandGrad)" stroke="#4f46e5" strokeWidth="1" />
                    <ellipse cx="305" cy="180" rx="6" ry="4" fill="url(#islandGrad)" stroke="#4f46e5" strokeWidth="1" />

                    {/* Maluku Islands Group */}
                    <ellipse cx="800" cy="180" rx="5" ry="3.5" fill="url(#islandGrad)" stroke="#4f46e5" strokeWidth="1" />
                    <ellipse cx="818" cy="175" rx="12" ry="4" transform="rotate(15 818 175)" fill="url(#islandGrad)" stroke="#4f46e5" strokeWidth="1" />
                    <polygon points="782,120 798,120 803,110 796,130 801,145 788,135" fill="url(#islandGrad)" stroke="#4f46e5" strokeWidth="1" />
                  </g>

                  {/* Elegant cyan star cluster overlay on main nodes for a futuristic high-tech network coordinate look */}
                  <g fill="#0284c7" opacity="0.65">
                    {[...SUMATRA_NODES, ...JAVA_NODES, ...BORNEO_NODES, ...SULAWESI_NODES, ...NUSA_TENGGARA_NODES, ...PAPUA_NODES].map((node, i) => (
                      <circle key={i} cx={node.x} cy={node.y} r="2.5" className="hover:fill-sky-400 transition cursor-pointer" />
                    ))}
                  </g>

                  {/* Dynamic interactive pin layers grouped by city with label overlays */}
                  {Object.entries(cityGroups).map(([key, group]) => {
                    const hasActiveUser = group.items.some(mit => mit.isActiveNow);
                    const isGroupSelected = selectedCity?.toLowerCase() === group.city.toLowerCase();
                    
                    return (
                      <g 
                        key={key} 
                        className="cursor-pointer group/pin"
                        onClick={() => setSelectedCity(isGroupSelected ? null : group.city)}
                      >
                        {/* Glowing ring under active nodes */}
                        {hasActiveUser && (
                          <circle 
                            cx={group.coords.x} 
                            cy={group.coords.y} 
                            r="12" 
                            fill="none" 
                            stroke="#10b981" 
                            strokeWidth="1.5" 
                            opacity="0.6"
                            className="animate-ping origin-center"
                          />
                        )}

                        {/* Node point background filler */}
                        <circle 
                          cx={group.coords.x} 
                          cy={group.coords.y} 
                          r={isGroupSelected ? "7" : "5"} 
                          fill={isGroupSelected ? "#6366f1" : hasActiveUser ? "#10b981" : "#808080"} 
                          className="transition-all duration-300 shadow-lg drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        />
                        
                        {/* Inner glowing core */}
                        <circle 
                          cx={group.coords.x} 
                          cy={group.coords.y} 
                          r={isGroupSelected ? "3" : "2"} 
                          fill="#ffffff" 
                        />

                        {/* Tooltip Overlay context panel (Aesthetic pop) */}
                        <rect 
                          x={group.coords.x - 55} 
                          y={group.coords.y - 32} 
                          width="110" 
                          height="20" 
                          rx="4" 
                          fill="#0f172a" 
                          stroke={isGroupSelected ? "#6366f1" : hasActiveUser ? "#10b981" : "#334155"} 
                          strokeWidth="1" 
                          className="opacity-0 group-hover/pin:opacity-100 transition-all duration-200 pointer-events-none shadow"
                        />
                        
                        <text 
                          x={group.coords.x} 
                          y={group.coords.y - 19} 
                          fill="#f8fafc" 
                          fontSize="8.5" 
                          fontWeight="bold" 
                          textAnchor="middle" 
                          className="opacity-0 group-hover/pin:opacity-100 transition-all duration-200 uppercase pointer-events-none font-sans"
                        >
                          📍 {group.city} ({group.items.length})
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Micro island reference tags */}
            <div className="flex flex-wrap items-center justify-center gap-5 text-[9px] font-black uppercase text-slate-500 tracking-wider pt-2 border-t border-slate-900 border-dashed">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full"></span> Sumatera</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full"></span> Jawa</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full"></span> Kalimantan</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full"></span> Sulawesi</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full"></span> Nusa Tenggara</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-slate-600 rounded-full"></span> Papua</span>
            </div>
          </div>

          {/* RIGHT CONTAINER: Live Activity Feed */}
          <div className="lg:col-span-4 bg-slate-900/40 rounded-2xl border border-slate-800/40 p-4 flex flex-col justify-between backdrop-blur-sm shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800/60">
                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" /> LIVE AGENT DIRECTORY
                </span>
                <span className="text-[10px] bg-indigo-950/60 text-indigo-300 font-extrabold px-2 py-0.5 rounded-full border border-indigo-900/50">
                  {filteredMitras.length} AGENTS
                </span>
              </div>

              {/* Feed scroll area */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {filteredMitras.map((mit) => (
                  <div 
                    key={mit.id} 
                    className={`p-3 rounded-xl transition-all border ${
                      mit.isActiveNow 
                        ? 'bg-[#10b981]/5 border-[#10b981]/20 hover:border-[#10b981]/45' 
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <div>
                        {/* Brand Name */}
                        <p className="text-[9px] font-black text-slate-400 tracking-wider uppercase">{mit.city}</p>
                        <h4 className="text-xs font-black text-white flex items-center gap-1.5 mt-0.5">
                          <span className={`w-2 h-2 rounded-full ${mit.isActiveNow ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,1)]' : 'bg-slate-600'}`}></span>
                          {mit.brandName}
                        </h4>
                      </div>
                      
                      {/* Active timer badge */}
                      <div>
                        {mit.isActiveNow ? (
                          <span className="bg-emerald-500/10 text-[#22c55e] border border-emerald-500/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">
                            Aktif Sekarang
                          </span>
                        ) : (
                          <span className="bg-slate-850 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> {mit.activeStatusText}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-350">
                      <span>👤 PIC: <strong className="text-white font-extrabold">{mit.name}</strong></span>
                      {mit.whatsapp && (
                        <button 
                          onClick={() => openWhatsApp(mit.whatsapp!)}
                          className="text-[10px] text-[#25d366] hover:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/60 transition flex items-center gap-1 cursor-pointer font-bold uppercase"
                        >
                          <MessageSquare className="w-3 h-3" /> Chat Wa
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {filteredMitras.length === 0 && (
                  <div className="p-8 text-center text-slate-500 font-bold uppercase text-[10px] tracking-wider italic">
                    Tidak ada mitra aktif terdaftar untuk pencarian/filter ini.
                  </div>
                )}
              </div>
            </div>

            {/* Bottom aggregate helper stat row */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <span>Total Region: {Object.keys(cityGroups).length} CITIES</span>
              <span className="text-[#38bdf8]">
                🟢 {mitras.filter(m => m.isActiveNow).length} ONLINE NOW
              </span>
            </div>

          </div>
          
        </div>
      </div>
    </div>
  );
};
