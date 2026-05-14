import React, { useState } from 'react';
import { MapPin, Users, Package, PlaneTakeoff } from 'lucide-react';
import { TrackerPaket } from './tracker/TrackerPaket';
import { TrackerJamaah } from './tracker/TrackerJamaah';
import { TrackerKeberangkatan } from './tracker/TrackerKeberangkatan';

type TabType = 'paket' | 'jamaah' | 'keberangkatan';

export const TrackerView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('paket');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mapping & Tracker</h1>
        <p className="text-gray-600">Pantau dan kelola mapping paket, data jamaah, dan status keberangkatan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Paket Card */}
        <div 
          onClick={() => setActiveTab('paket')}
          className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition-all ${activeTab === 'paket' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-blue-300'}`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-lg ${activeTab === 'paket' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
              <Package className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Tracker Paket</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">Monitoring status paket perjalanan umrah yang sedang berjalan atau direncanakan.</p>
          <button className={`w-full py-2 rounded-lg text-sm font-medium transition-colors border ${activeTab === 'paket' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}>
            Lihat Detail Paket
          </button>
        </div>

        {/* Jamaah Card */}
        <div 
          onClick={() => setActiveTab('jamaah')}
          className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition-all ${activeTab === 'jamaah' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-gray-200 hover:border-emerald-300'}`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-lg ${activeTab === 'jamaah' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Tracker Jamaah</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">Pantau kelengkapan dokumen, pembayaran, dan status masing-masing jamaah.</p>
          <button className={`w-full py-2 rounded-lg text-sm font-medium transition-colors border ${activeTab === 'jamaah' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}>
            Lihat Data Jamaah
          </button>
        </div>

        {/* Keberangkatan Card */}
        <div 
          onClick={() => setActiveTab('keberangkatan')}
          className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition-all ${activeTab === 'keberangkatan' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-gray-200 hover:border-amber-300'}`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-lg ${activeTab === 'keberangkatan' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600'}`}>
              <PlaneTakeoff className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Tracker Keberangkatan</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">Jadwal penerbangan, status visa, dan persiapan keberangkatan rombongan.</p>
          <button className={`w-full py-2 rounded-lg text-sm font-medium transition-colors border ${activeTab === 'keberangkatan' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}>
            Lihat Jadwal Keberangkatan
          </button>
        </div>
      </div>

      <div className="mt-8">
        {activeTab === 'paket' && <TrackerPaket />}
        {activeTab === 'jamaah' && <TrackerJamaah />}
        {activeTab === 'keberangkatan' && <TrackerKeberangkatan />}
      </div>
    </div>
  );
};
