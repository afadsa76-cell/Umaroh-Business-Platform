export const parseDate = (dateStr: string): Date | null => {
  // Try parsing DD/MM/YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try parsing DD MONTH YYYY
  const parts = dateStr.split(' ');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const monthStr = parts[1].toUpperCase();
    const year = parseInt(parts[2]);

    const months: { [key: string]: number } = {
      'JAN': 0, 'JANUARY': 0,
      'FEB': 1, 'FEBRUARY': 1,
      'MAR': 2, 'MARCH': 2,
      'APR': 3, 'APRIL': 3,
      'MAY': 4,
      'JUN': 5, 'JUNE': 5,
      'JUL': 6, 'JULY': 6,
      'AUG': 7, 'AUGUST': 7,
      'SEPT': 8, 'SEP': 8, 'SEPTEMBER': 8,
      'OCT': 9, 'OCTOBER': 9,
      'NOV': 10, 'NOVEMBER': 10,
      'DEC': 11, 'DECEMBER': 11
    };

    if (months[monthStr] !== undefined) {
      return new Date(year, months[monthStr], day);
    }
  }

  return null;
};

export const parseDateRange = (rangeStr: string): { start: Date | null, end: Date | null } => {
  const parts = rangeStr.split(' TO ');
  if (parts.length !== 2) return { start: null, end: null };

  const start = parseDate(parts[0].trim());
  const end = parseDate(parts[1].trim());

  return { start, end };
};

export const isDateInRange = (checkDate: Date, rangeStr: string): boolean => {
  const { start: startDate, end: endDate } = parseDateRange(rangeStr);

  if (!startDate || !endDate) return false;

  // Set times to midnight for comparison
  const check = new Date(checkDate);
  check.setHours(0, 0, 0, 0);
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  return check >= start && check <= end;
};

export const subMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
};

export const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export const getDaysRemaining = (targetDate: Date): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export interface HijriDate {
  day: number;
  month: number;
  year: number;
  monthName: string;
}

export const gregorianToHijri = (date: Date, offset = 0): HijriDate => {
  const adjustedDate = new Date(date);
  if (offset !== 0) {
    adjustedDate.setDate(adjustedDate.getDate() + offset);
  }

  let m = adjustedDate.getMonth() + 1;
  let y = adjustedDate.getFullYear();
  const d = adjustedDate.getDate();

  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = Math.floor(a / 4);
  const c = 2 - a + b;
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + c - 1524;

  const jdIslamic = jd - 1948440 + 10632;
  const cycle = Math.floor((jdIslamic - 1) / 10631);
  const extra = jdIslamic - 10631 * cycle;
  const yearCycle = Math.floor((extra - 1) / 354.366);
  const hYear = 30 * cycle + yearCycle;
  const daysInYear = extra - Math.ceil(yearCycle * 354.366);
  
  let hMonth = 1;
  let hDay = daysInYear;
  
  const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];
  const leapYears = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29];
  const relativeYear = hYear % 30;
  if (leapYears.includes(relativeYear)) {
    monthLengths[11] = 30;
  }

  for (let i = 0; i < 12; i++) {
    if (hDay <= monthLengths[i]) {
      hMonth = i + 1;
      break;
    }
    hDay -= monthLengths[i];
  }

  const hijriMonthNames = [
    "Muharram",
    "Safar",
    "Rabi'ul Awal",
    "Rabi'ul Akhir",
    "Jumadil Awal",
    "Jumadil Akhir",
    "Rajab",
    "Sya'ban",
    "Ramadhan",
    "Syawal",
    "Dzulqa'dah",
    "Dzulhijjah"
  ];

  return {
    day: Math.max(1, hDay),
    month: hMonth,
    year: hYear,
    monthName: hijriMonthNames[hMonth - 1] || ""
  };
};

export interface UmrahSeasonInfo {
  monthName: string;
  year: number;
  season: "Low Season" | "Medium Season" | "High Season" | "Peak Season" | "Umrah Ditutup" | "Awal Musim (Low Season)";
  periodText: string;
}

export const getUmrahSeasonAndPeriod = (date: Date, offset = 0): UmrahSeasonInfo => {
  const h = gregorianToHijri(date, offset);
  let season: "Low Season" | "Medium Season" | "High Season" | "Peak Season" | "Umrah Ditutup" | "Awal Musim (Low Season)";
  
  switch (h.month) {
    case 1:
      season = "Awal Musim (Low Season)";
      break;
    case 2:
      season = "Low Season";
      break;
    case 3:
    case 4:
    case 5:
    case 6:
      season = "Medium Season";
      break;
    case 7:
    case 8:
      season = "High Season";
      break;
    case 9:
      season = "Peak Season";
      break;
    case 10:
      season = "Low Season";
      break;
    case 11:
    case 12:
    default:
      season = "Umrah Ditutup";
      break;
  }

  return {
    monthName: h.monthName,
    year: h.year,
    season,
    periodText: `${h.monthName} ${h.year}H (${season})`
  };
};

