import React from 'react';
import { JamaahTracker } from './types';

interface Props {
  jamaahs: JamaahTracker[];
  targetJamaah: number;
}

export const ProgressSummary: React.FC<Props> = ({ jamaahs, targetJamaah }) => {
  const total = jamaahs.length;
  const lunas = jamaahs.filter(j => j.statusPembayaran === 'Lunas').length;
  const dokumenLengkap = jamaahs.filter(j => j.statusPaspor === 'Sudah Ada' && j.statusVaksin === 'Sudah').length;

  const lunasPercent = total > 0 ? (lunas / total) * 100 : 0;
  const docPercent = total > 0 ? (dokumenLengkap / total) * 100 : 0;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Progress Summary</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-gray-700">Pembayaran Lunas</span>
            <span className="text-gray-500">{lunas}/{total} Jamaah</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${lunasPercent}%` }}></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-gray-700">Dokumen Lengkap (Paspor & Vaksin)</span>
            <span className="text-gray-500">{dokumenLengkap}/{total} Jamaah</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${docPercent}%` }}></div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            Target Jamaah: <span className="font-semibold text-gray-900">{targetJamaah}</span> | 
            Terdaftar: <span className="font-semibold text-gray-900">{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
