import React from 'react';
import { FileText, Info } from 'lucide-react';
import { visaData } from '../data/visa';

export const VisaView: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            Visa Services
          </h1>
          <p className="text-gray-500 mt-1">Manage and view prices for Umrah visa processing</p>
        </div>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Asumsi Dasar</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Keuntungan based on persentasi 7%</li>
                <li>Data by actual vendor pricelist</li>
                <li>Update berkala setiap vendor berikan harga</li>
                <li>Kurs: Rp 17.000</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="hidden xl:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Vendor Visa</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Asing $</th>
                <th scope="col" className="px-4 py-3 font-semibold text-center">Jumlah PAX</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Kurs</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Jual</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Vendor</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Margin</th>
                <th scope="col" className="px-4 py-3 font-semibold text-center">Persen</th>
              </tr>
            </thead>
            <tbody>
              {visaData.map((item, index) => (
                <tr 
                  key={item.id} 
                  className={`border-b border-gray-100 hover:bg-emerald-50/50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{item.vendorName}</td>
                  <td className="px-4 py-3 text-right text-gray-600">${item.foreignPriceUsd}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item.paxRange}</td>
                  <td className="px-4 py-3 text-right text-gray-600">Rp {item.exchangeRate.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">Rp {item.sellingPrice.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right text-gray-600">Rp {item.vendorPrice.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right text-gray-600">Rp {item.margin.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="xl:hidden divide-y divide-gray-100">
          {visaData.map((item) => (
            <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{item.vendorName}</h3>
                  <div className="text-sm text-gray-500 mt-1">
                    Range: <span className="font-medium text-emerald-600">{item.paxRange} PAX</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-600 font-bold text-lg">
                    Rp {item.sellingPrice.toLocaleString('id-ID')}
                  </div>
                  <div className="text-xs text-gray-400">
                    ${item.foreignPriceUsd} (Kurs: {item.exchangeRate.toLocaleString('id-ID')})
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <div>
                  <div className="text-gray-500 text-xs uppercase font-semibold">Harga Vendor</div>
                  <div className="text-gray-900">Rp {item.vendorPrice.toLocaleString('id-ID')}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs uppercase font-semibold">Margin</div>
                  <div className="text-emerald-700 font-medium">Rp {item.margin.toLocaleString('id-ID')} ({item.percentage}%)</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
