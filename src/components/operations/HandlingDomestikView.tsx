import React, { useState, useMemo } from 'react';
import { Plane, Search, Plus, Trash2, Edit, X } from 'lucide-react';
import { handlingDomestikData, HandlingDomestik } from '../../data/handlingDomestik';

export const HandlingDomestikView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Load/Save local handling domestik list
  const [localList, setLocalList] = useState<HandlingDomestik[]>(() => {
    const cached = localStorage.getItem('umaroh_db_handling_domestik');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse cached handling domestik list:', e);
      }
    }
    return handlingDomestikData;
  });

  const saveList = (updated: HandlingDomestik[]) => {
    setLocalList(updated);
    localStorage.setItem('umaroh_db_handling_domestik', JSON.stringify(updated));
  };

  React.useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<HandlingDomestik[]>;
      if (customEvent.detail) {
        setLocalList(customEvent.detail);
      }
    };
    window.addEventListener('umaroh_db_sync:umaroh_db_handling_domestik', handleSync);
    return () => window.removeEventListener('umaroh_db_sync:umaroh_db_handling_domestik', handleSync);
  }, []);

  const filteredData = useMemo(() => {
    return localList.filter(item => 
      item.item.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [localList, searchTerm]);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isAllSelected = filteredData.length > 0 && filteredData.every(item => selectedIds.includes(item.id));

  // Add/Edit states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HandlingDomestik | null>(null);

  // Form states
  const [formItem, setFormItem] = useState('');
  const [formHargaBeli, setFormHargaBeli] = useState<number>(150000);
  const [formHargaJual, setFormHargaJual] = useState<number>(250000);

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
    if (!formItem.trim()) {
      alert('Nama item wajib diisi!');
      return;
    }

    const newItem: HandlingDomestik = {
      id: 'hd_' + Date.now(),
      item: formItem,
      hargaBeli: Number(formHargaBeli),
      hargaJual: Number(formHargaJual),
    };

    saveList([newItem, ...localList]);
    setIsAddOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!formItem.trim()) {
      alert('Nama item wajib diisi!');
      return;
    }

    const updated = localList.map((item) => {
      if (item.id === editingItem.id) {
        return {
          ...item,
          item: formItem,
          hargaBeli: Number(formHargaBeli),
          hargaJual: Number(formHargaJual),
        };
      }
      return item;
    });

    saveList(updated);
    setIsEditOpen(false);
    setEditingItem(null);
  };

  const openEditModal = (item: HandlingDomestik) => {
    setEditingItem(item);
    setFormItem(item.item);
    setFormHargaBeli(item.hargaBeli);
    setFormHargaJual(item.hargaJual);
    setIsEditOpen(true);
  };

  const handleSingleDelete = (item: HandlingDomestik) => {
    if (confirm(`Apakah Anda yakin ingin menghapus "${item.item}"?`)) {
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Plane className="w-6 h-6 text-emerald-600" />
            Database Master Handling Domestik
          </h1>
          <p className="text-gray-500 mt-1">Kelola daftar layanan bandara domestik, harga beli, dan harga jual</p>
        </div>

        <button
          onClick={() => {
            setFormItem('');
            setFormHargaBeli(150000);
            setFormHargaJual(250000);
            setIsAddOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Handling Domestik Manual
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

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
                Hapus Terpilih ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
              <tr>
                <th scope="col" className="px-4 py-3 text-center w-12"></th>
                <th scope="col" className="px-4 py-3 font-semibold">Items</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Beli</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right text-emerald-800 bg-emerald-50/50">Harga Jual</th>
                <th scope="col" className="px-4 py-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.length > 0 ? (
                filteredData.map((item) => {
                  const isSel = selectedIds.includes(item.id);
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
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600"
                        />
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">{item.item}</td>
                      <td className="px-4 py-3 text-right text-gray-600 font-mono">
                        {formatCurrency(item.hargaBeli)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 bg-emerald-50/20 font-mono">
                        {formatCurrency(item.hargaJual)}
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
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada item yang cocok dengan "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add / Edit Modals */}
      {(isAddOpen || isEditOpen) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg">
                {isAddOpen ? 'Tambah Handling Domestik Manual' : 'Edit Handling Domestik'}
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Item / Layanan</label>
                <input
                  type="text"
                  value={formItem}
                  onChange={(e) => setFormItem(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Contoh: BAGASI PP + LOUNGE KEBERANGKATAN"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Beli (Rp)</label>
                <input
                  type="number"
                  value={formHargaBeli}
                  onChange={(e) => setFormHargaBeli(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Jual (Rp)</label>
                <input
                  type="number"
                  value={formHargaJual}
                  onChange={(e) => setFormHargaJual(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  min="0"
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
