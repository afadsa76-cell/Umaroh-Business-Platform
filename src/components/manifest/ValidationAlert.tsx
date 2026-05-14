import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';

interface Props {
  total: number;
  validCount: number;
  invalidCount: number;
  almostExpiredCount: number;
}

export const ValidationAlert: React.FC<Props> = ({ total, validCount, invalidCount, almostExpiredCount }) => {
  if (total === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-blue-800 font-medium">Total READY</p>
          <p className="text-2xl font-bold text-blue-900">{total}</p>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-emerald-800 font-medium">Data Valid</p>
          <p className="text-2xl font-bold text-emerald-900">{validCount}</p>
        </div>
      </div>

      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
          <XCircle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-rose-800 font-medium">Tidak Lengkap/Expired</p>
          <p className="text-2xl font-bold text-rose-900">{invalidCount}</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-amber-800 font-medium">Hampir Expired</p>
          <p className="text-2xl font-bold text-amber-900">{almostExpiredCount}</p>
        </div>
      </div>
    </div>
  );
};
