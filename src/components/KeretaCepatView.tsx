import React, { useState, useMemo, useEffect } from 'react';
import { Train, Search, Calculator, DollarSign, Users, Plus, Trash2, Edit, X } from 'lucide-react';
import { keretaCepatData, KeretaCepat } from '../data/keretaCepat';
import { useKurs } from '../hooks/useKurs';

export const KeretaCepatView: React.FC = () => {
  const { kurs: masterKurs, updateKurs } = useKurs();
  const [searchTerm, setSearchTerm] = useState('');
  const [kurs, setKurs] = useState<number>(4900);

  // Sync with global SAR rate
  useEffect(() => {
    if (masterKurs) {
      setKurs(masterKurs.sarToIdr);
    }
  }, [masterKurs]);

  // Load / Save local kereta cepat list
  const [localList, setLocalList] = useState<KeretaCepat[]>(() => {
    const cached = localStorage.getItem('umaroh_db_kereta_cepat');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse cached kereta cepat:', e);
      }
    }
    return keretaCepatData;
  });

  const saveList = (updated: KeretaCepat[]) => {
    setLocalList(updated);
    localStorage.setItem('umaroh_db_kereta_cepat', JSON.stringify(updated));
  };

  // Calculator State
  const [selectedItemId, setSelectedItemId] = useState<string>(localList[0]?.id || '');
  const [marginPercent, setMarginPercent] = useState<number>(10);
  const [paxInput, setPaxInput] = useState<number>(1);

  const selectedItem = useMemo(() => {
    return localList.find(item => item.id === selectedItemId) || localList[0];
  }, [selectedItemId, localList]);

  // Sync margin when selected item changes
  useEffect(() => {
    if (selectedItem) {
      setMarginPercent(selectedItem.persen);
    }
  }, [selectedItem]);

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

  const filteredData = useMemo(() => {
    return localList.filter(item => 
      item.item.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [localList, searchTerm]);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isAllSelected = filteredData.length > 0 && filteredData.every(item => selectedIds.includes(item.id));

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KeretaCepat | null>(null);

  // Form states
  const [formItemName, setFormItemName] = useState('');
  const [formHargaAsing, setFormHargaAsing] = useState<number>(287);
  const [formMataUang, setFormMataUang] = useState('SAR');
  const [formPersen, setFormPersen] = useState<number>(10);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
    if (!formItemName.trim()) {
      alert('Nama item wajib diisi!');
      return;
    }

    const priceBeli = Number(formHargaAsing) * kurs;
    const priceMargin = priceBeli * (Number(formPersen) / 100);
    const priceJual = priceBeli + priceMargin;

    const newItem: KeretaCepat = {
      id: 'kc_' + Date.now(),
      item: formItemName,
      hargaAsing: Number(formHargaAsing),
      mataUang: formMataUang,
      hargaBeli: priceBeli,
      margin: priceMargin,
      hargaJual: priceJual,
      persen: Number(formPersen),
    };

    saveList([newItem, ...localList]);
    setIsAddOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!formItemName.trim()) {
      alert('Nama item wajib diisi!');
      return;
    }

    const priceBeli = Number(formHargaAsing) * kurs;
    const priceMargin = priceBeli * (Number(formPersen) / 100);
    const priceJual = priceBeli + priceMargin;

    const updated = localList.map((item) => {
      if (item.id === editingItem.id) {
        return {
          ...item,
          item: formItemName,
          hargaAsing: Number(formHargaAsing),
          mataUang: formMataUang,
          hargaBeli: priceBeli,
          margin: priceMargin,
          hargaJual: priceJual,
          persen: Number(formPersen),
        };
      }
      return item;
    });

    saveList(updated);
    setIsEditOpen(false);
    setEditingItem(null);
  };

  const openEditModal = (item: KeretaCepat) => {
    setEditingItem(item);
    setFormItemName(item.item);
    setFormHargaAsing(item.hargaAsing);
    setFormMataUang(item.mataUang);
    setFormPersen(item.persen);
    setIsEditOpen(true);
  };

  const handleSingleDelete = (item: KeretaCepat) => {
    if (confirm(`Apakah Anda yakin ingin menghapus item "${item.item}"?`)) {
      const updated = localList.filter(i => i.id !== item.id);
      saveList(updated);
      setSelectedIds(selectedIds.filter(id => id !== item.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} item terpilih?`)) {
      const updated = localList.filter(item => !selectedIds.includes(item.id));
      saveList(updated);
      setSelectedIds([]);
    }
  };

  const handleSaveKurs = async () => {
    try {
      await updateKurs(kurs, masterKurs?.usdToIdr || 20000);
      alert('Kurs Kereta Cepat (SAR) berhasil diperbarui!');
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
            <Train className="w-6 h-6 text-emerald-600" />
            Database Master Kereta Cepat
          </h1>
          <p className="text-gray-500 mt-1">Kelola rute, harga asing, margin, dan kurs kereta cepat Haramain</p>
        </div>
      </div>

      {/* Control Panel: Kurs and Add Manual */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="font-bold text-gray-700 text-sm whitespace-nowrap">Kurs SAR ke IDR:</span>
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
            setFormItemName('');
            setFormHargaAsing(287);
            setFormMataUang('SAR');
            setFormPersen(10);
            setIsAddOpen(true);
          }}
          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Kereta Cepat Manual
        </button>
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
                  {localList.map(item => (
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h2 className="text-xl font-bold text-gray-900">Daftar Rute Kereta Cepat</h2>
            
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-xs text-gray-500 uppercase tracking-wider">Pilih Semua ({filteredData.length} Item)</span>
              </label>

              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Terpilih ({selectedIds.length})
                </button>
              )}
            </div>
          </div>

          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari rute kereta cepat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-center w-12"></th>
                    <th scope="col" className="px-4 py-3 font-semibold">Items</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Asing</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Beli</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Margin</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right text-emerald-800 bg-emerald-50/50">Harga Jual</th>
                    <th scope="col" className="px-4 py-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredData.length > 0 ? (
                    filteredData.map((item) => {
                      const isSel = selectedIds.includes(item.id);
                      const priceBeli = item.hargaAsing * kurs;
                      const priceMargin = priceBeli * (item.persen / 100);
                      const priceJual = priceBeli + priceMargin;

                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-emerald-50/30 transition-colors ${
                            isSel ? 'bg-amber-50/60' : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSel}
                              onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-emerald-600"
                            />
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900 cursor-pointer" onClick={() => setSelectedItemId(item.id)}>
                            {item.item}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 font-mono">
                            {item.mataUang} {item.hargaAsing.toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 font-mono">
                            Rp {priceBeli.toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 font-mono">
                            Rp {priceMargin.toLocaleString('id-ID')} ({item.persen}%)
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-700 bg-emerald-50/20 font-mono">
                            Rp {priceJual.toLocaleString('id-ID')}
                          </td>
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
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Tidak ada item yang cocok dengan "{searchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Add / Edit Modals */}
      {(isAddOpen || isEditOpen) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg">
                {isAddOpen ? 'Tambah Kereta Cepat Manual' : 'Edit Kereta Cepat'}
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Item / Rute</label>
                <input
                  type="text"
                  value={formItemName}
                  onChange={(e) => setFormItemName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Contoh: MADINAH - MEKKAH CLASS AC"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Asing</label>
                  <input
                    type="number"
                    value={formHargaAsing}
                    onChange={(e) => setFormHargaAsing(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mata Uang</label>
                  <select
                    value={formMataUang}
                    onChange={(e) => setFormMataUang(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="SAR">SAR</option>
                    <option value="USD">USD</option>
                    <option value="IDR">IDR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Margin (%)</label>
                <input
                  type="number"
                  value={formPersen}
                  onChange={(e) => setFormPersen(Number(e.target.value))}
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
