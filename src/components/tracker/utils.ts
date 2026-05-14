import { subDays, format } from 'date-fns';
import { Timeline } from './types';

export const generateTimelineEstimasi = (tanggalBerangkat: string): Timeline => {
  const date = new Date(tanggalBerangkat);
  return {
    dp: format(subDays(date, 45), 'yyyy-MM-dd'),
    pelunasan: format(subDays(date, 30), 'yyyy-MM-dd'),
    dokumen: format(subDays(date, 25), 'yyyy-MM-dd'),
    visa: format(subDays(date, 20), 'yyyy-MM-dd'),
    tiket: format(subDays(date, 7), 'yyyy-MM-dd'),
    berangkat: format(date, 'yyyy-MM-dd'),
  };
};

export const getStatusColor = (estimasi?: string, actual?: string) => {
  if (actual) return 'bg-emerald-500'; // Selesai
  if (!estimasi) return 'bg-gray-300'; // Belum ada data
  
  const estDate = new Date(estimasi);
  if (isNaN(estDate.getTime())) return 'bg-gray-300';
  
  const today = new Date();
  
  const diffDays = Math.ceil((estDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
  
  if (isNaN(diffDays)) return 'bg-gray-300';
  
  if (diffDays < 0) return 'bg-rose-500'; // Terlambat
  if (diffDays <= 7) return 'bg-amber-500'; // Mendekati deadline
  return 'bg-gray-300'; // Masih aman tapi belum selesai
};
