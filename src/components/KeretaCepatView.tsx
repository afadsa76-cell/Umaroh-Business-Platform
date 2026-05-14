import React, { useState, useMemo } from 'react';
import { Train, Search, Calculator, RefreshCw, DollarSign, Users } from 'lucide-react';
import { keretaCepatData } from '../data/keretaCepat';

export const KeretaCepatView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Calculator state
  const [selectedItemId, setSelectedItemId] = useState<string>(keretaCepatData[0]?.id || '');
  const [kurs, setKurs] = useState<number>(4700);
  const [marginPercent, setMarginPercent] = useState<number>(10);
  const [paxInput, setPaxInput] = useState<number>(1);

  const filteredData = keretaCepatData.filter(item => 
    item.item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const selectedItem = useMemo(() => {
    return keretaCepatData.find(item => item.id === selectedItemId);
  }, [selectedItemId]);

  const calculationResult = useMemo(() => {
    if (!selectedItem) return null;

    const hargaBeliPerPax = selectedItem.hargaAsing * kurs;
    const marginPerPax = hargaBeliPerPax * (marginPercent / 100);
    const hargaJualPerPax = hargaBeliPerPax + marginPerPax;

    const totalBeli = hargaBeliPerPax * paxInput;
    const totalMargin = marginPerPax * paxInput;
    const totalJual = hargaJualPerPax * paxInput;

    return {
      hargaBeliPerPax,
      marginPerPax,
      hargaJualPerPax,
      totalBeli,
      totalMargin,
      totalJual
    };
  }, [selectedItem, kurs, marginPercent, paxInput]);

  // Update margin when item changes
  React.useEffect(() => {
    if (selectedItem) {
      setMarginPercent(selectedItem.persen);
    }
  }, [selectedItem]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Train className="w-6 h-6 text-emerald-600" />
            Kereta Cepat
          </h1>
          <p className="text-gray-500 mt-1">Manage and view prices for Kereta Cepat</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Calculator Section */}
        <div className="lg:w-1/3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <Calculator className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Calculator</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pilih Item
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  {keretaCepatData.map(item => (
                    <option key={item.id} value={item.id}>{item.item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jumlah Pax
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    value={paxInput}
                    onChange={(e) => setPaxInput(Math.max(1, Number(e.target.value)))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kurs (IDR)
                </label>
                <div className="relative">
                  <RefreshCw className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    value={kurs}
                    onChange={(e) => setKurs(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Margin (%)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    value={marginPercent}
                    onChange={(e) => setMarginPercent(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {calculationResult && selectedItem ? (
                <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Harga Asing</span>
                    <span className="font-medium">{selectedItem.mataUang} {selectedItem.hargaAsing}</span>
                  </div>
                  <div className="border-t border-emerald-200 pt-2">
                    <div className="flex justify-between items-center mb-1 text-sm">
                      <span className="text-gray-600">Harga Beli / Pax</span>
                      <span className="font-medium">{formatCurrency(calculationResult.hargaBeliPerPax)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-1 text-sm">
                      <span className="text-gray-600">Margin / Pax ({marginPercent}%)</span>
                      <span className="font-medium text-emerald-600">+{formatCurrency(calculationResult.marginPerPax)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-emerald-200">
                      <span className="font-bold text-gray-900">Total Harga Jual</span>
                      <div className="text-right">
                        <span className="font-bold text-xl text-emerald-700 block">{formatCurrency(calculationResult.totalJual)}</span>
                        <span className="text-xs text-gray-500">Untuk {paxInput} Pax</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="lg:w-2/3">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Daftar Harga</h2>
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
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Items</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Asing</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Beli</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Margin</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Jual</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length > 0 ? (
                    filteredData.map((item, index) => (
                      <tr 
                        key={item.id} 
                        className={`border-b border-gray-100 hover:bg-emerald-50/50 transition-colors cursor-pointer ${
                          selectedItemId === item.id ? 'bg-emerald-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">{item.item}</td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {item.mataUang} {item.hargaAsing.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          Rp {item.hargaBeli.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          Rp {item.margin.toLocaleString('id-ID')} ({item.persen}%)
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          Rp {item.hargaJual.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No items found matching "{searchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="xl:hidden divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <div 
                    key={item.id} 
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      selectedItemId === item.id ? 'bg-emerald-50' : ''
                    }`}
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900">{item.item}</h3>
                      <div className="text-emerald-600 font-bold">
                        Rp {item.hargaJual.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500 uppercase font-semibold">Harga Asing: </span>
                        <span className="text-gray-700">{item.mataUang} {item.hargaAsing.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500 uppercase font-semibold">Margin: </span>
                        <span className="text-emerald-700">{item.persen}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500 uppercase font-semibold">Harga Beli: </span>
                        <span className="text-gray-700">Rp {item.hargaBeli.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No items found matching "{searchTerm}"
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

