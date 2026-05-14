import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { JamaahTracker, Timeline } from './types';
import { differenceInDays } from 'date-fns';

interface Props {
  jamaahs: JamaahTracker[];
  estimasi?: Timeline;
  actual?: Timeline;
  tanggalBerangkat?: string;
}

export const AlertBox: React.FC<Props> = ({ jamaahs, estimasi, actual, tanggalBerangkat }) => {
  const alerts: string[] = [];
  const today = new Date();

  if (tanggalBerangkat) {
    const tglBerangkat = new Date(tanggalBerangkat);
    if (!isNaN(tglBerangkat.getTime())) {
      const daysToDeparture = differenceInDays(tglBerangkat, today);

      // Check jamaah belum lunas H-30
      if (daysToDeparture <= 30) {
        const belumLunas = jamaahs.filter(j => j.statusPembayaran !== 'Lunas');
        if (belumLunas.length > 0) {
          alerts.push(`H-${daysToDeparture}: Terdapat ${belumLunas.length} jamaah yang belum lunas (Batas H-30).`);
        }
      }

      // Check paspor belum terkumpul H-20
      if (daysToDeparture <= 20) {
        const pasporBelum = jamaahs.filter(j => j.statusPaspor !== 'Sudah Ada');
        if (pasporBelum.length > 0) {
          alerts.push(`H-${daysToDeparture}: Terdapat ${pasporBelum.length} jamaah dengan paspor belum terkumpul (Batas H-20).`);
        }
      }

      // Check visa belum keluar H-14
      if (daysToDeparture <= 14) {
        if (!actual?.visa) {
          alerts.push(`H-${daysToDeparture}: Visa belum keluar (Batas H-14).`);
        }
      }
    }
  }

  // Check timeline keterlambatan umum
  if (estimasi) {
    const steps = ['dp', 'pelunasan', 'dokumen', 'visa', 'tiket', 'berangkat'] as const;
    steps.forEach(step => {
      if (estimasi[step] && !actual?.[step]) {
        const estDate = new Date(estimasi[step]!);
        if (!isNaN(estDate.getTime()) && estDate < today) {
          alerts.push(`Timeline ${step.toUpperCase()} terlambat dari estimasi (${estimasi[step]}).`);
        }
      }
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 text-rose-800 font-semibold mb-2">
        <AlertTriangle className="w-5 h-5" />
        <h3>Alert & Peringatan</h3>
      </div>
      <ul className="list-disc list-inside text-sm text-rose-700 space-y-1">
        {alerts.map((alert, idx) => (
          <li key={idx}>{alert}</li>
        ))}
      </ul>
    </div>
  );
};
