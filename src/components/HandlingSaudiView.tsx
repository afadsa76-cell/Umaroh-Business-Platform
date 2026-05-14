import React, { useState, useMemo } from 'react';
import { Plane, Calculator, DollarSign, Users, RefreshCw } from 'lucide-react';
import { HANDLING_TIERS, HANDLING_CONSTANTS } from '../data/handlingSaudi';

export const HandlingSaudiView: React.FC = () => {
  const [paxInput, setPaxInput] = useState<number>(35);
  const [kurs, setKurs] = useState<number>(HANDLING_CONSTANTS.defaultKurs);
  const [marginPercent, setMarginPercent] = useState<number>(HANDLING_CONSTANTS.defaultMarginPercent);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculatePrice = (hpp: number) => {
    const hppPlusAdm = hpp + HANDLING_CONSTANTS.adminFee;
    const beli = hppPlusAdm * kurs;
    const margin = beli * (marginPercent / 100); // Margin is percentage of Beli? Or markup?
    // PDF: Beli 4.352.000, Jual 5.657.600. Diff = 1.305.600.
    // 1.305.600 / 4.352.000 = 0.3 (30%). So it is a markup on Beli.
    const jual = beli + margin;
    return { hppPlusAdm, beli, margin, jual };
  };

  const calculationResult = useMemo(() => {
    const tier = HANDLING_TIERS.find(t => paxInput >= t.minPax && paxInput <= t.maxPax);
    if (!tier) return null;

    return {
      tier,
      ...calculatePrice(tier.hpp)
    };
  }, [paxInput, kurs, marginPercent]);

  // Generate table data
  const tableData = useMemo(() => {
    const rows = [];
    // We'll generate rows for 1 to 46 as per PDF
    for (let i = 1; i <= 46; i++) {
      const tier = HANDLING_TIERS.find(t => i >= t.minPax && i <= t.maxPax);
      if (tier) {
        rows.push({
          pax: i,
          hpp: tier.hpp,
          ...calculatePrice(tier.hpp)
        });
      }
    }
    return rows;
  }, [kurs, marginPercent]);

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
        
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
                  Jumlah Pax
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    value={paxInput}
                    onChange={(e) => setPaxInput(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    min="1"
                    max="46"
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

              {calculationResult ? (
                <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">HPP (USD)</span>
                    <span className="font-medium">{calculationResult.tier.hpp}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">HPP + Adm (USD)</span>
                    <span className="font-medium">{calculationResult.hppPlusAdm}</span>
                  </div>
                  <div className="border-t border-emerald-200 pt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-600">Harga Beli</span>
                      <span className="font-medium">{formatCurrency(calculationResult.beli)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-600">Margin ({marginPercent}%)</span>
                      <span className="font-medium text-emerald-600">+{formatCurrency(calculationResult.margin)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-emerald-200">
                      <span className="font-bold text-gray-900">Harga Jual</span>
                      <span className="font-bold text-xl text-emerald-700">{formatCurrency(calculationResult.jual)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-100 text-center text-red-600 text-sm">
                  Jumlah Pax tidak valid (1-46)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="lg:w-2/3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Paket Full Service Basic Handling TFA</h2>
                <p className="text-sm text-gray-500 mt-1">Update berkala setiap vendor berikan harga</p>
              </div>
              <div className="text-right hidden md:block">
                <div className="text-sm text-gray-500">Kurs Saat Ini</div>
                <div className="font-mono font-bold text-lg">Rp {kurs.toLocaleString('id-ID')}</div>
              </div>
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 font-medium uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-center">Pax</th>
                    <th className="px-4 py-3 text-center">HPP (USD)</th>
                    <th className="px-4 py-3 text-right">Harga Beli (IDR)</th>
                    <th className="px-4 py-3 text-right">Margin (IDR)</th>
                    <th className="px-4 py-3 text-right bg-emerald-50 text-emerald-800">Harga Jual (IDR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tableData.map((row) => (
                    <tr 
                      key={row.pax} 
                      className={`hover:bg-gray-50 transition-colors ${row.pax === paxInput ? 'bg-emerald-50' : ''}`}
                    >
                      <td className="px-4 py-3 text-center font-medium">{row.pax}</td>
                      <td className="px-4 py-3 text-center">{row.hpp}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600">{formatCurrency(row.beli)}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600">{formatCurrency(row.margin)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${row.pax === paxInput ? 'text-emerald-700' : 'text-gray-900'}`}>
                        {formatCurrency(row.jual)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="xl:hidden divide-y divide-gray-100">
              {tableData.map((row) => (
                <div 
                  key={row.pax} 
                  className={`p-4 hover:bg-gray-50 transition-colors ${row.pax === paxInput ? 'bg-emerald-50' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-sm font-bold text-gray-900">Pax: {row.pax}</div>
                      <div className="text-xs text-gray-500 mt-1">HPP: ${row.hpp}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-700 font-bold text-lg">
                        {formatCurrency(row.jual)}
                      </div>
                      <div className="text-xs text-gray-400">
                        Beli: {formatCurrency(row.beli)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-emerald-600 font-medium">
                    Margin: {formatCurrency(row.margin)} ({marginPercent}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
