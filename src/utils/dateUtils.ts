export const parseDate = (dateStr: string): Date | null => {
  // Try parsing DD/MM/YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [_, day, month, year] = slashMatch;
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
