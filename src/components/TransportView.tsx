import React, { useState } from 'react';
import { Bus, Car, Search, Calculator } from 'lucide-react';
import { transportData } from '../data/transport';

export const TransportView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Calculator state
  const [selectedVehicleId, setSelectedVehicleId] = useState(transportData[0].id);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [paxCount, setPaxCount] = useState<number>(1);
  const [exchangeRate, setExchangeRate] = useState<number>(4200); // Default SAR to IDR rate

  const selectedVehicle = transportData.find(v => v.id === selectedVehicleId) || transportData[0];
  const selectedRoute = selectedVehicle.routes[selectedRouteIndex] || selectedVehicle.routes[0];

  const totalSar = selectedRoute.price;
  const totalIdr = totalSar * exchangeRate;
  const perPaxIdr = paxCount > 0 ? totalIdr / paxCount : 0;
  const marginPercentage = 40;
  const sellingPricePerPaxIdr = perPaxIdr * (1 + marginPercentage / 100);

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVehicleId(e.target.value);
    setSelectedRouteIndex(0); // Reset route when vehicle changes
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bus className="w-6 h-6 text-emerald-600" />
            Transportation Rates
          </h1>
          <p className="text-gray-500 mt-1">Manage and view transportation prices for various routes</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search routes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Calculator Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-4">
          <Calculator className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-gray-900">Kalkulator Per Pax (Rupiah)</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kendaraan</label>
            <select 
              value={selectedVehicleId} 
              onChange={handleVehicleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            >
              {transportData.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rute</label>
            <select 
              value={selectedRouteIndex} 
              onChange={(e) => setSelectedRouteIndex(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            >
              {selectedVehicle.routes.map((r, idx) => (
                <option key={idx} value={idx}>{r.route} (SAR {r.price})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pax</label>
            <input 
              type="number" 
              min="1"
              value={paxCount} 
              onChange={(e) => setPaxCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kurs (SAR ke IDR)</label>
            <input 
              type="number" 
              min="1"
              value={exchangeRate} 
              onChange={(e) => setExchangeRate(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>
        
        <div className="bg-emerald-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          <div className="bg-white p-3 rounded-md shadow-sm border border-emerald-100">
            <p className="text-sm text-gray-500 mb-1">Total Harga (SAR)</p>
            <p className="text-xl font-bold text-gray-900">SAR {totalSar.toLocaleString()}</p>
          </div>
          <div className="bg-white p-3 rounded-md shadow-sm border border-emerald-100">
            <p className="text-sm text-gray-500 mb-1">Total Harga (IDR)</p>
            <p className="text-xl font-bold text-gray-900">Rp {totalIdr.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-white p-3 rounded-md shadow-sm border border-emerald-100">
            <p className="text-sm text-gray-500 mb-1">Harga Modal Per Pax (IDR)</p>
            <p className="text-xl font-bold text-gray-900">Rp {perPaxIdr.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-emerald-600 p-3 rounded-md shadow-sm text-white">
            <p className="text-sm text-emerald-100 mb-1">Harga Jual Per Pax (+40%)</p>
            <p className="text-2xl font-bold">Rp {sellingPricePerPaxIdr.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {transportData.map((vehicle) => {
          const filteredRoutes = vehicle.routes.filter(r => 
            r.route.toLowerCase().includes(searchTerm.toLowerCase())
          );

          if (filteredRoutes.length === 0) return null;

          return (
            <div key={vehicle.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-emerald-600 px-4 py-3 flex items-center gap-2">
                {vehicle.name === 'BUS' ? (
                  <Bus className="w-5 h-5 text-white" />
                ) : (
                  <Car className="w-5 h-5 text-white" />
                )}
                <h2 className="text-lg font-bold text-white">{vehicle.name}</h2>
                <span className="ml-auto text-xs bg-white/20 px-2 py-1 rounded text-white font-medium uppercase tracking-wider">
                  Vendor: {vehicle.namaVendor}
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Route</th>
                      <th scope="col" className="px-4 py-3 font-semibold text-right w-32">Price (SAR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoutes.map((route, index) => (
                      <tr 
                        key={index} 
                        className={`border-b border-gray-100 hover:bg-emerald-50/50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">{route.route}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          {route.price.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


