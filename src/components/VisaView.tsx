import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Info, Plus, Trash2, Edit, X, Search } from 'lucide-react';
import { visaData, VisaData } from '../data/visa';
import { useKurs } from '../hooks/useKurs';

export const VisaView: React.FC = () => {
  const { kurs: masterKurs, updateKurs } = useKurs();
  const [searchTerm, setSearchTerm] = useState('');
  const [kurs, setKurs] = useState<number>(20000);

  // Sync exchange rate with global USD rate
  useEffect(() => {
    if (masterKurs) {
      setKurs(masterKurs.usdToIdr);
    }
  }, [masterKurs]);

  // Load/Save local visa list
  const [localList, setLocalList] = useState<VisaData[]>(() => {
    const cached = localStorage.getItem('umaroh_db_visa');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse cached visa list:', e);
      }
    }
    return visaData;
  });

  const saveList = (updated: VisaData[]) => {
    setLocalList(updated);
    localStorage.setItem('umaroh_db_visa', JSON.stringify(updated));
  };

  const filteredData = useMemo(() => {
    return localList.filter((item) =>
      item.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.paxRange.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [localList, searchTerm]);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isAllSelected = filteredData.length > 0 && filteredData.every(item => selectedIds.includes(item.id));

  // Add/Edit states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VisaData | null>(null);

  // Form states
  const [formVendorName, setFormVendorName] = useState('');
  const [formForeignPriceUsd, setFormForeignPriceUsd] = useState<number>(137);
  const [formPaxRange, setFormPaxRange] = useState('1-34 PAX');
  const [formPercentage, setFormPercentage] = useState<number>(7);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculatePrices = (foreignPrice: number, percentage: number) => {
    const vendorPrice = foreignPrice * kurs;
    const margin = vendorPrice * (percentage / 100);
    const sellingPrice = vendorPrice + margin;
    return { vendorPrice, margin, sellingPrice };
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredData.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const vendorNameVal = formVendorName.trim() || '-';
    const { vendorPrice, margin, sellingPrice } = calculatePrices(Number(formForeignPriceUsd), Number(formPercentage));

    const newItem: VisaData = {
      id: 'visa_' + Date.now(),
      vendorName: vendorNameVal,
      foreignPriceUsd: Number(formForeignPriceUsd),
      paxRange: formPaxRange,
      exchangeRate: kurs,
      vendorPrice,
      margin,
      sellingPrice,
      percentage: Number(formPercentage),
    };

    saveList([newItem, ...localList]);
    setIsAddOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const vendorNameVal = formVendorName.trim() || '-';
    const { vendorPrice, margin, sellingPrice } = calculatePrices(Number(formForeignPriceUsd), Number(formPercentage));

    const updated = localList.map((item) => {
      if (item.id === editingItem.id) {
        return {
          ...item,
          vendorName: vendorNameVal,
          foreignPriceUsd: Number(formForeignPriceUsd),
          paxRange: formPaxRange,
          exchangeRate: kurs,
          vendorPrice,
          margin,
          sellingPrice,
          percentage: Number(formPercentage),
        };
      }
      return item;
    });

    saveList(updated);
    setIsEditOpen(false);
    setEditingItem(null);
  };

  const openEditModal = (item: VisaData) => {
    setEditingItem(item);
    setFormVendorName(item.vendorName === '-' ? '' : item.vendorName);
    setFormForeignPriceUsd(item.foreignPriceUsd);
    setFormPaxRange(item.paxRange);
    setFormPercentage(item.percentage);
    setIsEditOpen(true);
  };

  const handleSingleDelete = (item: VisaData) => {
    if (confirm(`Apakah Anda yakin ingin menghapus visa untuk "${item.paxRange}"?`)) {
      const updated = localList.filter(i => i.id !== item.id);
      saveList(updated);
      setSelectedIds(selectedIds.filter(id => id !== item.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} item visa terpilih?`)) {
      const updated = localList.filter(item => !selectedIds.includes(item.id));
      saveList(updated);
      setSelectedIds([]);
    }
  };

  const handleSaveKurs = async () => {
    try {
      await updateKurs(masterKurs?.sarToIdr || 4900, kurs);
      alert('Kurs Visa (USD) berhasil diperbarui!');
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui kurs');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            Database Master Visa
          </h1>
          <p className="text-gray-500 mt-1">Kelola harga vendor visa umrah, margin, dan kurs master visa (USD)</p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari rute, vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Control Panel: Kurs and Add Manual */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="font-bold text-gray-700 text-sm whitespace-nowrap">Kurs USD ke IDR:</span>
          <div className="relative rounded-lg shadow-sm max-w-[150px]">
            <input
              type="number"
              value={kurs}
              onChange={(e) => setKurs(Number(e.target.value))}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-gray-800"
            />
          </div>
          <button
            onClick={handleSaveKurs}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex items-center gap-1 shrink-0"
          >
            Update Kurs
          </button>
        </div>

        <button
          onClick={() => {
            setFormVendorName('');
            setFormForeignPriceUsd(137);
            setFormPaxRange('1-34 PAX');
            setFormPercentage(7);
            setIsAddOpen(true);
          }}
          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Visa Manual
        </button>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg shadow-sm">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-bold text-yellow-800">Asumsi Dasar Visa</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc pl-5 space-y-1 font-medium">
                <li>Keuntungan berdasarkan persentase (Default 7%)</li>
                <li>Data disesuaikan pricelist aktual vendor</li>
                <li>Mata Uang dasar USD, dikonversi otomatis menggunakan Kurs USD Master</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-4">
          <span className="font-bold text-gray-800">Daftar Paket & Layanan Visa</span>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-semibold text-xs text-gray-500 uppercase">Pilih Semua ({filteredData.length} Item)</span>
            </label>

            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden xl:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-center w-12"></th>
                <th scope="col" className="px-4 py-3 font-semibold">Vendor Visa</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Asing</th>
                <th scope="col" className="px-4 py-3 font-semibold text-center">Jumlah PAX</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Vendor</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Margin</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right text-emerald-800 bg-emerald-50/50">Harga Jual</th>
                <th scope="col" className="px-4 py-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((item) => {
                const isSel = selectedIds.includes(item.id);
                const { vendorPrice, margin, sellingPrice } = calculatePrices(item.foreignPriceUsd, item.percentage);
                return (
                  <tr 
                    key={item.id} 
                    className={`border-b border-gray-100 hover:bg-emerald-50/20 transition-colors ${
                      isSel ? 'bg-amber-50/60' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{item.vendorName}</td>
                    <td className="px-4 py-3 text-right text-gray-600 font-mono">${item.foreignPriceUsd}</td>
                    <td className="px-4 py-3 text-center text-gray-600 font-semibold">{item.paxRange}</td>
                    <td className="px-4 py-3 text-right text-gray-600 font-mono">{formatCurrency(vendorPrice)}</td>
                    <td className="px-4 py-3 text-right text-gray-600 font-mono">{formatCurrency(margin)} ({item.percentage}%)</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600 bg-emerald-50/10 font-mono">{formatCurrency(sellingPrice)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center items-center gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-amber-600 hover:text-amber-800 hover:bg-amber-50 p-1.5 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSingleDelete(item)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="xl:hidden divide-y divide-gray-100">
          {filteredData.map((item) => {
            const isSel = selectedIds.includes(item.id);
            const { vendorPrice, margin, sellingPrice } = calculatePrices(item.foreignPriceUsd, item.percentage);
            return (
              <div 
                key={item.id} 
                className={`p-4 hover:bg-gray-50 transition-colors ${isSel ? 'bg-amber-50/50' : ''}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{item.vendorName}</h3>
                      <div className="text-sm text-gray-500 mt-1">
                        Range: <span className="font-semibold text-emerald-600">{item.paxRange}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-600 font-bold text-lg">
                      {formatCurrency(sellingPrice)}
                    </div>
                    <div className="text-xs text-gray-400">
                      ${item.foreignPriceUsd} (Kurs: {kurs.toLocaleString('id-ID')})
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-3">
                  <div>
                    <div className="text-gray-500 text-xs uppercase font-semibold">Harga Vendor</div>
                    <div className="text-gray-900 font-mono">{formatCurrency(vendorPrice)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs uppercase font-semibold">Margin ({item.percentage}%)</div>
                    <div className="text-emerald-700 font-bold font-mono">{formatCurrency(margin)}</div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-gray-100 pt-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className="text-amber-600 hover:text-amber-800 text-xs font-semibold px-2.5 py-1 rounded border border-amber-200 bg-amber-50 flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleSingleDelete(item)}
                    className="text-red-600 hover:text-red-800 text-xs font-semibold px-2.5 py-1 rounded border border-red-200 bg-red-50 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Add / Edit Modals */}
      {(isAddOpen || isEditOpen) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg">
                {isAddOpen ? 'Tambah Visa Manual' : 'Edit Visa'}
              </h3>
              <button 
                onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
                className="hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={isAddOpen ? handleSaveAdd : handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor Visa</label>
                <input
                  type="text"
                  value={formVendorName}
                  onChange={(e) => setFormVendorName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Contoh: TFA, Visa Premium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Asing (USD)</label>
                <input
                  type="number"
                  value={formForeignPriceUsd}
                  onChange={(e) => setFormForeignPriceUsd(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Jumlah PAX Range</label>
                <input
                  type="text"
                  value={formPaxRange}
                  onChange={(e) => setFormPaxRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Contoh: 1-34 PAX"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Margin (%)</label>
                <input
                  type="number"
                  value={formPercentage}
                  onChange={(e) => setFormPercentage(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  min="0"
                  max="100"
                  required
                />
              </div>

              <div className="border-t border-gray-200 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
