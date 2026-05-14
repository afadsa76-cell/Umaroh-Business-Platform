import React, { useState } from 'react';
import { Users, Info, Calculator } from 'lucide-react';

export const MutawifView: React.FC = () => {
  const [hargaAsing, setHargaAsing] = useState<number>(300);
  const [jumlahHari, setJumlahHari] = useState<number>(8);
  const [kurs, setKurs] = useState<number>(4700);
  const [persentase, setPersentase] = useState<number>(80);
  const [maxPax, setMaxPax] = useState<number>(50);

  const generateData = () => {
    const data = [];
    const totalHargaBeli = hargaAsing * jumlahHari * kurs;

    for (let pax = 1; pax <= maxPax; pax++) {
      const hargaBeli = totalHargaBeli / pax;
      const margin = hargaBeli * (persentase / 100);
      const hargaJual = hargaBeli + margin;

      data.push({
        pax,
        hargaBeli,
        hargaJual,
        margin
      });
    }
    return data;
  };

  const mutawifData = generateData();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            Data Mutawif
          </h1>
          <p className="text-gray-500 mt-1">Manage and view Mutawif prices per pax</p>
        </div>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Asumsi Dasar Mutawif</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Keuntungan based on persentasi {persentase}%</li>
                <li>Data by Statistik Histori</li>
                <li>Update berkala setiap vendor berikan harga</li>
                <li>Kurs Reyal: Rp {kurs.toLocaleString('id-ID')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Calculator Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-4">
          <Calculator className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-gray-900">Kalkulator Mutawif</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Harga Asing (SAR/Hari)</label>
            <input 
              type="number" 
              min="1"
              value={hargaAsing} 
              onChange={(e) => setHargaAsing(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Hari</label>
            <input 
              type="number" 
              min="1"
              value={jumlahHari} 
              onChange={(e) => setJumlahHari(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kurs (IDR)</label>
            <input 
              type="number" 
              min="1"
              value={kurs} 
              onChange={(e) => setKurs(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Persentase Margin (%)</label>
            <input 
              type="number" 
              min="0"
              value={persentase} 
              onChange={(e) => setPersentase(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tampilkan Sampai (Pax)</label>
            <input 
              type="number" 
              min="1"
              max="100"
              value={maxPax} 
              onChange={(e) => setMaxPax(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden xl:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Item</th>
                <th scope="col" className="px-4 py-3 font-semibold text-center">Jumlah PAX</th>
                <th scope="col" className="px-4 py-3 font-semibold text-center">Jumlah Hari</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Asing</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Kurs</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Jual</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Beli</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Margin</th>
                <th scope="col" className="px-4 py-3 font-semibold text-center">Persen</th>
              </tr>
            </thead>
            <tbody>
              {mutawifData.map((item, index) => (
                <tr 
                  key={item.pax} 
                  className={`border-b border-gray-100 hover:bg-emerald-50/50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">MUTAWIF + TRANSPORTASI</td>
                  <td className="px-4 py-3 text-center text-gray-900 font-semibold">{item.pax}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{jumlahHari}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{hargaAsing} SAR</td>
                  <td className="px-4 py-3 text-right text-gray-600">{kurs}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">Rp {item.hargaJual.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3 text-right text-gray-600">Rp {item.hargaBeli.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3 text-right text-gray-600">Rp {item.margin.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{persentase}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="xl:hidden divide-y divide-gray-100">
          {mutawifData.map((item) => (
            <div key={item.pax} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">MUTAWIF + TRANSPORTASI</h3>
                  <div className="text-sm text-gray-500 mt-1">
                    Pax: <span className="font-bold text-emerald-600">{item.pax}</span> | Hari: {jumlahHari}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-600 font-bold text-lg">
                    Rp {item.hargaJual.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-gray-400">
                    {hargaAsing} SAR (Kurs: {kurs})
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <div>
                  <div className="text-gray-500 text-xs uppercase font-semibold">Harga Beli</div>
                  <div className="text-gray-900">Rp {item.hargaBeli.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs uppercase font-semibold">Margin</div>
                  <div className="text-emerald-700 font-medium">Rp {item.margin.toLocaleString('id-ID', { maximumFractionDigits: 0 })} ({persentase}%)</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
