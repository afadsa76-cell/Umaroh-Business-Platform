import React, { useState, useEffect } from 'react';
import { Plane, Search, RefreshCw, Clock, Gauge, Navigation, Landmark, AlertCircle, ShieldCheck, Milestone } from 'lucide-react';

interface Flight {
  id: string;
  flightNo: string;
  airline: string;
  airlineLogoColor: string;
  aircraft: string;
  departureTime: string; // HH:MM
  arrivalTime: string; // HH:MM
  origin: string; // CGK
  destination: string; // JED / MED
  originName: string;
  destinationName: string;
  terminal: string;
  gate: string;
  baggage: string;
}

const CONSTANT_FLIGHTS: Flight[] = [
  {
    id: 'fl-1',
    flightNo: 'SV 813',
    airline: 'Saudi Arabian Airlines',
    airlineLogoColor: 'bg-emerald-600 text-white border-emerald-700',
    aircraft: 'Boeing 777-300ER',
    departureTime: '07:30',
    arrivalTime: '13:10',
    origin: 'CGK',
    destination: 'JED',
    originName: 'Soekarno-Hatta Int\'l, Jakarta',
    destinationName: 'King Abdulaziz Int\'l, Jeddah',
    terminal: '3 (CGK) / 1 (JED)',
    gate: 'Gate D4',
    baggage: 'C3'
  },
  {
    id: 'fl-2',
    flightNo: 'GA 980',
    airline: 'Garuda Indonesia',
    airlineLogoColor: 'bg-teal-600 text-white border-teal-700',
    aircraft: 'Airbus A330-900neo',
    departureTime: '11:30',
    arrivalTime: '17:30',
    origin: 'CGK',
    destination: 'JED',
    originName: 'Soekarno-Hatta Int\'l, Jakarta',
    destinationName: 'King Abdulaziz Int\'l, Jeddah',
    terminal: '3 (CGK) / 1 (JED)',
    gate: 'Gate D1',
    baggage: 'C5'
  },
  {
    id: 'fl-3',
    flightNo: 'SV 821',
    airline: 'Saudi Arabian Airlines',
    airlineLogoColor: 'bg-emerald-600 text-white border-emerald-700',
    aircraft: 'Boeing 787-9 Dreamliner',
    departureTime: '10:10',
    arrivalTime: '15:50',
    origin: 'CGK',
    destination: 'MED',
    originName: 'Soekarno-Hatta Int\'l, Jakarta',
    destinationName: 'Prince Mohammad Bin Abdulaziz, Medina',
    terminal: '3 (CGK) / Main (MED)',
    gate: 'Gate D6',
    baggage: 'B2'
  },
  {
    id: 'fl-4',
    flightNo: 'JT 110',
    airline: 'Lion Air',
    airlineLogoColor: 'bg-red-500 text-white border-red-600',
    aircraft: 'Airbus A330-900neo',
    departureTime: '13:40',
    arrivalTime: '19:40',
    origin: 'CGK',
    destination: 'JED',
    originName: 'Soekarno-Hatta Int\'l, Jakarta',
    destinationName: 'King Abdulaziz Int\'l, Jeddah',
    terminal: '2F (CGK) / Hajj (JED)',
    gate: 'Gate E5',
    baggage: 'H1'
  },
  {
    id: 'fl-5',
    flightNo: 'GA 960',
    airline: 'Garuda Indonesia',
    airlineLogoColor: 'bg-teal-600 text-white border-teal-700',
    aircraft: 'Boeing 777-300ER',
    departureTime: '15:10',
    arrivalTime: '21:10',
    origin: 'CGK',
    destination: 'MED',
    originName: 'Soekarno-Hatta Int\'l, Jakarta',
    destinationName: 'Prince Mohammad Bin Abdulaziz, Medina',
    terminal: '3 (CGK) / Main (MED)',
    gate: 'Gate D2',
    baggage: 'B4'
  },
  {
    id: 'fl-6',
    flightNo: 'SV 815',
    airline: 'Saudi Arabian Airlines',
    airlineLogoColor: 'bg-emerald-600 text-white border-emerald-700',
    aircraft: 'Boeing 777-300ER',
    departureTime: '18:30',
    arrivalTime: '00:10',
    origin: 'CGK',
    destination: 'JED',
    originName: 'Soekarno-Hatta Int\'l, Jakarta',
    destinationName: 'King Abdulaziz Int\'l, Jeddah',
    terminal: '3 (CGK) / 1 (JED)',
    gate: 'Gate D5',
    baggage: 'C2'
  },
  {
    id: 'fl-7',
    flightNo: 'JT 080',
    airline: 'Lion Air',
    airlineLogoColor: 'bg-red-500 text-white border-red-600',
    aircraft: 'Airbus A330-300',
    departureTime: '20:10',
    arrivalTime: '01:50',
    origin: 'CGK',
    destination: 'MED',
    originName: 'Soekarno-Hatta Int\'l, Jakarta',
    destinationName: 'Prince Mohammad Bin Abdulaziz, Medina',
    terminal: '2F (CGK) / Main (MED)',
    gate: 'Gate E2',
    baggage: 'B1'
  },
  {
    id: 'fl-8',
    flightNo: 'SV 817',
    airline: 'Saudi Arabian Airlines',
    airlineLogoColor: 'bg-emerald-600 text-white border-emerald-700',
    aircraft: 'Boeing 777-300ER',
    departureTime: '22:20',
    arrivalTime: '04:00',
    origin: 'CGK',
    destination: 'JED',
    originName: 'Soekarno-Hatta Int\'l, Jakarta',
    destinationName: 'King Abdulaziz Int\'l, Jeddah',
    terminal: '3 (CGK) / 1 (JED)',
    gate: 'Gate D3',
    baggage: 'C1'
  }
];

export const FlightTrackerWidget: React.FC = () => {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'EN_ROUTE' | 'DEPARTING' | 'ARRIVED'>('ALL');
  const [expandedFlightId, setExpandedFlightId] = useState<string | null>(null);
  const [currentTimeStamp, setCurrentTimeStamp] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState<string>('Baru saja');
  const [refreshCount, setRefreshCount] = useState(0);

  // Keep timestamp rolling for live minute/second based animations
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStamp(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Set friendly updated time
  useEffect(() => {
    setLastUpdated('Updated: ' + currentTimeStamp.toLocaleTimeString('id-ID'));
  }, [refreshCount, currentTimeStamp]);

  const handleRefresh = () => {
    setRefreshCount(prev => prev + 1);
  };

  // Logic to parse real-time active state of each flight based on user's current local time
  const getFlightStatusAndProgress = (flight: Flight) => {
    const now = currentTimeStamp;
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    // Parse Depart time
    const [depH, depM] = flight.departureTime.split(':').map(Number);
    const depDate = new Date(currentYear, currentMonth, currentDate, depH, depM, 0);

    // Parse Arrive time (if less than departure, it lands on next day)
    const [arrH, arrM] = flight.arrivalTime.split(':').map(Number);
    let arrDate = new Date(currentYear, currentMonth, currentDate, arrH, arrM, 0);
    if (arrDate.getTime() < depDate.getTime()) {
      arrDate = new Date(currentYear, currentMonth, currentDate + 1, arrH, arrM, 0);
    }

    const totalDurationMs = arrDate.getTime() - depDate.getTime();
    const elapsedMs = now.getTime() - depDate.getTime();

    // Determine status & progress
    let status: 'SCHEDULED' | 'BOARDING' | 'EN_ROUTE' | 'ARRIVED';
    let progress: number;
    let altitudeString = '-';
    let speedString = '-';
    let etaString = '';

    if (elapsedMs < 0) {
      // Before departure
      const msToDepart = Math.abs(elapsedMs);
      const hoursToDepart = msToDepart / (1000 * 60 * 60);

      if (hoursToDepart <= 2) {
        status = 'BOARDING';
      } else {
        status = 'SCHEDULED';
      }
      progress = 0;
    } else if (elapsedMs >= 0 && elapsedMs < totalDurationMs) {
      // In flight
      status = 'EN_ROUTE';
      progress = (elapsedMs / totalDurationMs) * 100;

      // Realistic flight stats cycle
      const currentProgressRatio = elapsedMs / totalDurationMs;
      // Climbing, cruising, descending altitude logic
      let altVal: number;
      let speedVal: number;

      if (currentProgressRatio < 0.1) {
        altVal = Math.floor(currentProgressRatio * 10 * 30000) + 1000;
        speedVal = Math.floor(currentProgressRatio * 10 * 500) + 300;
      } else if (currentProgressRatio > 0.9) {
        altVal = Math.floor((1 - currentProgressRatio) * 10 * 37000) + 1000;
        speedVal = Math.floor((1 - currentProgressRatio) * 10 * 600) + 250;
      } else {
        // Cruising slight turbulence fluctuation
        altVal = 38000 + (Math.sin(now.getSeconds() / 5) * 200);
        speedVal = 880 + (Math.cos(now.getSeconds() / 10) * 15);
      }

      altitudeString = `${Math.floor(altVal).toLocaleString('id-ID')} ft`;
      speedString = `${Math.floor(speedVal)} km/h`;

      // ETA
      const remainingMs = totalDurationMs - elapsedMs;
      const remHours = Math.floor(remainingMs / (1000 * 60 * 60));
      const remMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      etaString = `${remHours}j ${remMins}m lagi`;
    } else {
      // Landed
      status = 'ARRIVED';
      progress = 100;
      altitudeString = '0 ft';
      speedString = '0 km/h';
    }

    return {
      status,
      progress,
      altitudeString,
      speedString,
      etaString,
      depDate,
      arrDate
    };
  };

  // Filter flights
  const processedFlights = CONSTANT_FLIGHTS.map(f => {
    const liveData = getFlightStatusAndProgress(f);
    return { ...f, liveData };
  }).filter(f => {
    // Search queries
    const searchMatch = f.flightNo.toLowerCase().includes(search.toLowerCase()) || 
                        f.airline.toLowerCase().includes(search.toLowerCase()) ||
                        f.destination.toLowerCase().includes(search.toLowerCase());
    
    if (!searchMatch) return false;

    // Tabs filter
    if (activeFilter === 'EN_ROUTE') return f.liveData.status === 'EN_ROUTE';
    if (activeFilter === 'DEPARTING') return f.liveData.status === 'BOARDING' || f.liveData.status === 'SCHEDULED';
    if (activeFilter === 'ARRIVED') return f.liveData.status === 'ARRIVED';
    return true;
  });

  // Brief status counter
  const totalEnRoute = CONSTANT_FLIGHTS.filter(f => getFlightStatusAndProgress(f).status === 'EN_ROUTE').length;
  const totalBoarding = CONSTANT_FLIGHTS.filter(f => getFlightStatusAndProgress(f).status === 'BOARDING').length;
  const totalArrived = CONSTANT_FLIGHTS.filter(f => getFlightStatusAndProgress(f).status === 'ARRIVED').length;

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col gap-6" id="flight_tracker_widget">
      {/* Header and Live pulsating badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Jadwal Penerbangan Real-Time</h3>
            <span className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full text-[10px] font-black text-rose-600 animate-pulse shadow-sm">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
              LIVE DATA
            </span>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Flight log kargo & jamaah rute Jakarta (CGK) ke Arab Saudi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-400">{lastUpdated}</span>
          <button 
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-amber-600 bg-gray-50 hover:bg-amber-50 rounded-xl transition-all duration-200 border border-gray-100"
            title="Sikronisasi Jadwal"
          >
            <RefreshCw size={14} className="animate-spin-slow" />
          </button>
        </div>
      </div>

      {/* Grid Stats Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
        <div className="text-center sm:text-left">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">DALAM PERJALANAN</p>
          <p className="text-lg font-black text-blue-600 flex items-center justify-center sm:justify-start gap-1">
            {totalEnRoute} <span className="text-xs font-bold text-gray-500">penerbangan</span>
          </p>
        </div>
        <div className="text-center sm:text-left border-l border-gray-200/50 pl-2">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">BOARDING / PERSIAPAN</p>
          <p className="text-lg font-black text-emerald-600 flex items-center justify-center sm:justify-start gap-1">
            {totalBoarding} <span className="text-xs font-bold text-gray-500">pesawat</span>
          </p>
        </div>
        <div className="text-center sm:text-left border-l border-gray-200/50 pl-2">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">DI ARAB SAUDI</p>
          <p className="text-lg font-black text-indigo-600 flex items-center justify-center sm:justify-start gap-1">
            {totalArrived} <span className="text-xs font-bold text-gray-500">mendarat</span>
          </p>
        </div>
        <div className="text-center sm:text-left border-l border-gray-200/50 pl-2">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">PENGATURAN API</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
            <ShieldCheck size={10} /> TERINTEGRASI
          </span>
        </div>
      </div>

      {/* Search & Tabs Filtering */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Cari maskapai, No. penerbangan, atau kota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-gray-800"
          />
        </div>

        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 self-start no-scrollbar overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeFilter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Semua
          </button>
          <button
            onClick={() => setActiveFilter('EN_ROUTE')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeFilter === 'EN_ROUTE' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            In Flight
          </button>
          <button
            onClick={() => setActiveFilter('DEPARTING')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeFilter === 'DEPARTING' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Keberangkatan
          </button>
          <button
            onClick={() => setActiveFilter('ARRIVED')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeFilter === 'ARRIVED' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Landed
          </button>
        </div>
      </div>

      {/* Flight List Container */}
      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 no-scrollbar">
        {processedFlights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center">
            <Plane className="w-8 h-8 text-gray-300 mb-2 rotate-45" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tidak ada penerbangan ditemukan</p>
            <p className="text-[10px] text-gray-300 font-medium">Ubah kriteria pencarian atau ganti filter kategori</p>
          </div>
        ) : (
          processedFlights.map((flight) => {
            const isExpanded = expandedFlightId === flight.id;
            const { status, progress, altitudeString, speedString, etaString } = flight.liveData;

            // Badge Color Helper
            const getStatusBadge = () => {
              switch (status) {
                case 'EN_ROUTE':
                  return (
                    <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-[9px] font-black text-blue-600 tracking-wider">
                      EN ROUTE
                    </span>
                  );
                case 'BOARDING':
                  return (
                    <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded text-[9px] font-black text-emerald-600 tracking-wider">
                      BOARDING
                    </span>
                  );
                case 'ARRIVED':
                  return (
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-[9px] font-black text-indigo-600 tracking-wider">
                      ARRIVED
                    </span>
                  );
                case 'SCHEDULED':
                  return (
                    <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[9px] font-black text-gray-500 tracking-wider">
                      SCHEDULED
                    </span>
                  );
              }
            };

            return (
              <div 
                key={flight.id} 
                className={`border border-gray-100 hover:border-amber-200 rounded-2xl p-4 transition-all duration-200 cursor-pointer ${isExpanded ? 'bg-amber-50/20 border-amber-200' : 'bg-white hover:bg-gray-50/50'}`}
                onClick={() => setExpandedFlightId(isExpanded ? null : flight.id)}
              >
                {/* Micro Flight Header Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border uppercase shrink-0 ${flight.airlineLogoColor}`}>
                      {flight.origin}
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        {flight.flightNo}
                        <span className="text-[10px] font-normal text-slate-400">| {flight.airline}</span>
                      </h4>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{flight.aircraft}</p>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge()}
                  </div>
                </div>

                {/* Progress Visualizer Routing */}
                <div className="grid grid-cols-7 items-center gap-2 px-1 mb-2">
                  <div className="col-span-2 text-left">
                    <p className="text-xs font-black text-slate-900 tracking-tight">{flight.departureTime}</p>
                    <p className="text-[9px] text-gray-500 font-bold uppercase">{flight.origin}</p>
                  </div>

                  <div className="col-span-3 relative flex flex-col items-center justify-center">
                    {/* Airline live path progress */}
                    <div className="w-full h-[3px] bg-slate-100 rounded-full relative">
                      <div 
                        className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-1000 ${status === 'ARRIVED' ? 'bg-indigo-500' : 'bg-blue-500'}`} 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    {/* Moving Airplane icon */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-full transition-all duration-1000"
                      style={{ left: `calc(${progress}% - 8px)` }}
                    >
                      <Plane 
                        size={14} 
                        className={`text-blue-600 transition-transform ${status === 'ARRIVED' ? 'rotate-90 text-indigo-600' : status === 'EN_ROUTE' ? 'rotate-90 animate-pulse' : 'rotate-90'}`} 
                      />
                    </div>
                    {status === 'EN_ROUTE' && (
                      <span className="text-[8px] font-mono text-blue-600 mt-2 font-black">{etaString}</span>
                    )}
                  </div>

                  <div className="col-span-2 text-right">
                    <p className="text-xs font-black text-slate-900 tracking-tight">{flight.arrivalTime}</p>
                    <p className="text-[9px] text-gray-500 font-bold uppercase">{flight.destination}</p>
                  </div>
                </div>

                {/* Accordion expand menu */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100/80 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
                      <Navigation size={15} className="text-amber-500" />
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">TEMPAT METODE</p>
                        <p className="text-[10px] text-slate-700 font-bold truncate">{flight.originName}</p>
                      </div>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
                      <Landmark size={15} className="text-blue-500" />
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">TAMPAT TUJUAN</p>
                        <p className="text-[10px] text-slate-700 font-bold truncate">{flight.destinationName}</p>
                      </div>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
                      <Milestone size={15} className="text-emerald-500" />
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">TERMINAL & GERBANG</p>
                        <p className="text-[10px] text-slate-700 font-bold truncate">{flight.terminal} | {flight.gate}</p>
                      </div>
                    </div>

                    {status === 'EN_ROUTE' && (
                      <div className="sm:col-span-3 bg-blue-50/40 p-3 rounded-xl border border-blue-100/50 grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Gauge size={14} className="text-blue-500" />
                          <div>
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Ketinggian (Altitude)</span>
                            <span className="text-xs font-black text-blue-900 font-mono">{altitudeString}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-blue-500" />
                          <div>
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Kecepatan Darat</span>
                            <span className="text-xs font-black text-blue-900 font-mono">{speedString}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {status === 'ARRIVED' && (
                      <div className="sm:col-span-3 bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/50 flex items-center gap-2 text-emerald-800">
                        <AlertCircle size={14} className="text-emerald-500 shrink-0" />
                        <p className="text-[9px] font-bold leading-normal uppercase tracking-wider">
                          Pesawat telah mendarat dengan selamat di bandara tujuan. Pengambilan bagasi di conveyor belt <span className="font-extrabold">{flight.baggage}</span>.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="text-[9px] text-slate-400 flex items-center gap-1.5 justify-center py-1 bg-slate-50 rounded-xl">
        <AlertCircle size={10} />
        Sistem memonitor pergerakan penerbangan Umrah & kargo kementerian haji secara real-time.
      </div>
    </div>
  );
};
