import React from 'react';
import { Timeline } from './types';
import { getStatusColor } from './utils';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface Props {
  estimasi?: Timeline;
  actual?: Timeline;
}

export const TrackerTimeline: React.FC<Props> = ({ estimasi, actual }) => {
  const steps = [
    { key: 'dp', label: 'DP' },
    { key: 'pelunasan', label: 'Pelunasan' },
    { key: 'dokumen', label: 'Dokumen' },
    { key: 'visa', label: 'Visa' },
    { key: 'tiket', label: 'Tiket' },
    { key: 'berangkat', label: 'Berangkat' },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-6">Timeline Tracker</h3>
      <div className="relative overflow-x-auto pb-4">
        {/* Line */}
        <div className="absolute top-5 left-4 right-4 h-1 bg-gray-200 -z-10 min-w-[600px]"></div>
        
        <div className="flex justify-between min-w-[600px]">
          {steps.map((step) => {
            const estDate = estimasi?.[step.key as keyof Timeline];
            const actDate = actual?.[step.key as keyof Timeline];
            const colorClass = getStatusColor(estDate, actDate);
            
            return (
              <div key={step.key} className="flex flex-col items-center w-24">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white mb-2 ${colorClass}`}>
                  {actDate ? <CheckCircle2 className="w-5 h-5" /> : 
                   colorClass.includes('rose') ? <AlertCircle className="w-5 h-5" /> : 
                   <Clock className="w-5 h-5" />}
                </div>
                <div className="text-sm font-medium text-gray-800">{step.label}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Est: {estDate || '-'}
                </div>
                <div className="text-xs text-emerald-600 font-medium">
                  Act: {actDate || '-'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mt-6 flex flex-wrap gap-4 text-xs text-gray-600 justify-center">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Selesai Tepat Waktu</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Mendekati Deadline</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-rose-500"></div> Terlambat</div>
      </div>
    </div>
  );
};
