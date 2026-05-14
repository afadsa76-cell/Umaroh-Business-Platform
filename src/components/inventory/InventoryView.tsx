import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Search } from 'lucide-react';

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Koper' | 'Kain Ihram' | 'Mukena' | 'Buku Panduan' | 'Lainnya';
  totalStock: number;
  allocated: number; // Jumlah yang sudah diserahkan ke jamaah
  minStockAlert: number;
}

export const InventoryView: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    name: '',
    category: 'Koper',
    totalStock: 0,
    allocated: 0,
    minStockAlert: 10,
  });

  useEffect(() => {
    const saved = localStorage.getItem('inventory_items');
    if (saved) {
      setItems(JSON.parse(saved));
    } else {
      // Initial dummy data
      const initial: InventoryItem[] = [
        { id: '1', name: 'Koper Bagasi 24 Inch', category: 'Koper', totalStock: 150, allocated: 45, minStockAlert: 20 },
        { id: '2', name: 'Koper Kabin 20 Inch', category: 'Koper', totalStock: 150, allocated: 45, minStockAlert: 20 },
        { id: '3', name: 'Kain Ihram Pria', category: 'Kain Ihram', totalStock: 80, allocated: 20, minStockAlert: 15 },
        { id: '4', name: 'Mukena Wanita', category: 'Mukena', totalStock: 100, allocated: 25, minStockAlert: 15 },
        { id: '5', name: 'Buku Panduan Doa', category: 'Buku Panduan', totalStock: 200, allocated: 45, minStockAlert: 30 },
      ];
      setItems(initial);
      localStorage.setItem('inventory_items', JSON.stringify(initial));
    }
  }, []);

  const saveItems = (newItems: InventoryItem[]) => {
    setItems(newItems);
    localStorage.setItem('inventory_items', JSON.stringify(newItems));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      const updated = items.map(item => item.id === editingItem.id ? { ...item, ...formData } as InventoryItem : item);
      saveItems(updated);
    } else {
      const newItem: InventoryItem = {
        ...formData,
        id: Date.now().toString(),
        allocated: 0,
      } as InventoryItem;
      saveItems([...items, newItem]);
    }
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({ name: '', category: 'Koper', totalStock: 0, allocated: 0, minStockAlert: 10 });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Yakin ingin menghapus item ini?')) {
      saveItems(items.filter(item => item.id !== id));
    }
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500 rounded-lg">
            <Package className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory & Gudang</h1>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setFormData({ name: '', category: 'Koper', totalStock: 0, allocated: 0, minStockAlert: 10 });
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Tambah Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {['Koper', 'Kain Ihram', 'Mukena', 'Buku Panduan'].map(cat => {
          const catItems = items.filter(i => i.category === cat);
          const total = catItems.reduce((sum, i) => sum + i.totalStock, 0);
          const available = catItems.reduce((sum, i) => sum + (i.totalStock - i.allocated), 0);
          return (
            <div key={cat} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-gray-500 text-sm font-medium mb-2">{cat}</h3>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{available}</p>
                  <p className="text-xs text-gray-400">Tersedia</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-600">{total}</p>
                  <p className="text-xs text-gray-400">Total Stok</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-4">Nama Item</th>
                <th className="p-4">Kategori</th>
                <th className="p-4 text-center">Total Stok</th>
                <th className="p-4 text-center">Terpakai</th>
                <th className="p-4 text-center">Tersedia</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => {
                const available = item.totalStock - item.allocated;
                const isLow = available <= item.minStockAlert;
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">{item.name}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4 text-center font-semibold">{item.totalStock}</td>
                    <td className="p-4 text-center text-blue-600 font-semibold">{item.allocated}</td>
                    <td className="p-4 text-center font-bold text-gray-900">{available}</td>
                    <td className="p-4 text-center">
                      {isLow ? (
                        <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">Low Stock</span>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">Aman</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg">
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
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit Item' : 'Tambah Item'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Item</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value as any})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="Koper">Koper</option>
                  <option value="Kain Ihram">Kain Ihram</option>
                  <option value="Mukena">Mukena</option>
                  <option value="Buku Panduan">Buku Panduan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Stok</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.totalStock}
                    onChange={e => setFormData({...formData, totalStock: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batas Alert (Min)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.minStockAlert}
                    onChange={e => setFormData({...formData, minStockAlert: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">
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
