import React, { useState, useEffect, useRef } from "react";
import { gregorianToHijri } from "../../utils/dateUtils";
import { ChevronLeft, ChevronRight, Calendar, Info, HelpCircle } from "lucide-react";

interface HijriGregorianDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  className?: string;
  isDarkMode?: boolean;
}

export const HijriGregorianDatePicker: React.FC<HijriGregorianDatePickerProps> = ({
  value,
  onChange,
  className = "",
  isDarkMode: propIsDarkMode,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (propIsDarkMode !== undefined) return propIsDarkMode;
    return localStorage.getItem("mitraTheme") === "dark" || 
           document.documentElement.classList.contains("dark") || 
           document.body.classList.contains("dark");
  });

  useEffect(() => {
    if (propIsDarkMode !== undefined) {
      setIsDarkMode(propIsDarkMode);
    } else {
      const interval = setInterval(() => {
        const dark = localStorage.getItem("mitraTheme") === "dark" || 
                     document.documentElement.classList.contains("dark") || 
                     document.body.classList.contains("dark");
        setIsDarkMode(dark);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [propIsDarkMode]);

  const [isOpen, setIsOpen] = useState(false);
  const [hijriOffset, setHijriOffset] = useState(() => {
    const saved = localStorage.getItem("hijri_offset");
    return saved ? parseInt(saved, 10) : 0;
  });

  const selectedDate = value ? new Date(value) : null;
  const [viewDate, setViewDate] = useState(() => (selectedDate && !isNaN(selectedDate.getTime()) ? new Date(selectedDate) : new Date()));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDate && !isNaN(selectedDate.getTime())) {
      setViewDate(new Date(selectedDate));
    }
  }, [value]);

  useEffect(() => {
    localStorage.setItem("hijri_offset", hijriOffset.toString());
  }, [hijriOffset]);

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Names of months & days in Indonesian
  const gMonths = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const indonesianDays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const handlePrevMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleSelectDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0);

    const days: Date[] = [];
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const days = getDaysInMonth(viewDate);
  const firstDayIndex = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  // Helper to get beautiful formatting
  const getFormattedDateText = (date: Date) => {
    const dayName = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][date.getDay()];
    const gDay = date.getDate();
    const gMonth = gMonths[date.getMonth()];
    const gYear = date.getFullYear();
    const h = gregorianToHijri(date, hijriOffset);
    return `${dayName}, ${gDay} ${gMonth} ${gYear} M / ${h.day} ${h.monthName} ${h.year} H`;
  };

  // Get Hijri month span for current viewed Gregorian month
  const getHijriMonthSpan = () => {
    if (days.length === 0) return "";
    const startH = gregorianToHijri(days[0], hijriOffset);
    const endH = gregorianToHijri(days[days.length - 1], hijriOffset);
    if (startH.monthName === endH.monthName) {
      return `${startH.monthName} ${startH.year} H`;
    }
    return `${startH.monthName} - ${endH.monthName} ${startH.year} H`;
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Target input field */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
          isDarkMode 
            ? "bg-slate-900 border-slate-700 text-slate-100 hover:border-amber-400" 
            : "bg-gray-50/50 border-gray-200/80 hover:border-blue-400 text-gray-800"
        }`}
      >
        <div className="flex-1 min-w-0">
          {selectedDate && !isNaN(selectedDate.getTime()) ? (
            <div className="flex flex-col text-left">
              <span className="text-xs font-extrabold uppercase text-[#B28200] dark:text-amber-400">
                {gMonths[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </span>
              <span className="text-xs font-black truncate mt-0.5">
                {getFormattedDateText(selectedDate)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
              PILIH TANGGAL KEBERANGKATAN (DWI-TANGGAL)
            </span>
          )}
        </div>
        <Calendar className={`w-5 h-5 shrink-0 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
      </div>

      {/* Popover Calendar Grid */}
      {isOpen && (
        <div className={`absolute left-0 mt-2 w-full md:w-[24.5rem] p-4 rounded-2xl border shadow-2xl z-50 transition-all ${
          isDarkMode 
            ? "bg-slate-900 border-slate-800 text-slate-100" 
            : "bg-white border-gray-150 text-slate-900"
        }`}>
          {/* Header Controls */}
          <div className="flex items-center justify-between mb-3">
            <button 
              type="button"
              onClick={handlePrevMonth}
              className={`p-2 rounded-xl transition-all active:scale-95 ${
                isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center flex flex-col">
              <span className="text-xs font-black uppercase tracking-wide">
                {gMonths[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-0.5">
                🌙 {getHijriMonthSpan()}
              </span>
            </div>
            <button 
              type="button"
              onClick={handleNextMonth}
              className={`p-2 rounded-xl transition-all active:scale-95 ${
                isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {indonesianDays.map((day, idx) => (
              <span 
                key={day} 
                className={`text-[9px] font-black uppercase py-1 ${
                  idx === 0 
                    ? "text-red-500" 
                    : idx === 5 
                    ? "text-emerald-500" 
                    : isDarkMode ? "text-slate-500" : "text-gray-400"
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Calendar grid body */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots before day 1 */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square"></div>
            ))}

            {/* Day Cells */}
            {days.map((date) => {
              const hDate = gregorianToHijri(date, hijriOffset);
              const isSelected = selectedDate && 
                selectedDate.getDate() === date.getDate() && 
                selectedDate.getMonth() === date.getMonth() && 
                selectedDate.getFullYear() === date.getFullYear();

              const isToday = new Date().toDateString() === date.toDateString();

              return (
                <button
                  type="button"
                  key={date.toISOString()}
                  onClick={() => handleSelectDate(date)}
                  className={`aspect-square rounded-xl p-1 flex flex-col justify-between items-center transition-all relative group cursor-pointer ${
                    isSelected 
                      ? "bg-[#F5B800] text-slate-950 font-black scale-102 ring-2 ring-amber-400/30" 
                      : isToday
                      ? isDarkMode ? "bg-slate-800 border border-amber-500/50 text-[#F5B800]" : "bg-amber-50 border border-amber-400 text-amber-900"
                      : isDarkMode 
                      ? "hover:bg-slate-800 text-slate-100 border border-transparent" 
                      : "hover:bg-gray-50 text-gray-800 border border-transparent"
                  }`}
                >
                  {/* Gregorian (Masehi) Day Number */}
                  <span className="text-xs font-bold leading-none mt-0.5">{date.getDate()}</span>
                  
                  {/* Hijri (Islamic) Day Number */}
                  <span className={`text-[8px] leading-none font-mono tracking-tighter ${
                    isSelected 
                      ? "text-slate-900 font-extrabold" 
                      : isDarkMode ? "text-slate-400 group-hover:text-amber-400" : "text-gray-400 group-hover:text-[#B28200]"
                  }`}>
                    {hDate.day}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer of popover */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 text-left space-y-2">
            {/* Display full selected info */}
            {selectedDate ? (
              <div className="flex gap-2 items-start bg-amber-500/5 dark:bg-amber-400/5 p-2 rounded-xl border border-amber-400/10">
                <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Tanggal Terpilih</p>
                  <p className="text-[10px] font-bold mt-0.5 leading-snug">{getFormattedDateText(selectedDate)}</p>
                </div>
              </div>
            ) : (
              <p className="text-[9px] text-gray-400 italic text-center">Belum ada tanggal dipilih.</p>
            )}

            {/* Hijri adjustment controller */}
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-extrabold uppercase text-gray-400 flex items-center gap-1">
                Koreksi Hijriah
                <span title="Koreksi manual +/- 1 hari jika hilal lokal berbeda dengan perhitungan baku." className="cursor-help">
                  <HelpCircle className="w-3 h-3 text-gray-400" />
                </span>
              </span>
              <div className="flex items-center gap-1">
                {[-1, 0, 1].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setHijriOffset(val)}
                    className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-black transition-all ${
                      hijriOffset === val
                        ? "bg-[#055734] text-white"
                        : isDarkMode
                        ? "bg-slate-800 text-slate-400 hover:text-slate-100"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {val > 0 ? `+${val}` : val}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setViewDate(new Date());
                  handleSelectDate(new Date());
                }}
                className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg transition-all ${
                  isDarkMode ? "hover:bg-slate-800 text-amber-400" : "hover:bg-amber-50 text-[#B28200]"
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg transition-all ${
                  isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
