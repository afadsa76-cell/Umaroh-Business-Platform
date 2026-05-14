import React, { useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { manasikData } from '../data/manasik';

export const ManasikView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = manasikData.filter(item => 
    item.item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            Manasik
          </h1>
          <p className="text-gray-500 mt-1">Manage and view prices for Manasik</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Items</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Beli</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Jual</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`border-b border-gray-100 hover:bg-emerald-50/50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{item.item}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      Rp {item.hargaBeli.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      Rp {item.hargaJual.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    No items found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
