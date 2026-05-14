import React, { useState, useEffect } from 'react';
import { getTransactions, deleteTransaction, updateTransaction } from '../data/transactions';
import { Transaction } from '../types/transaction';
import { formatCurrency, formatPercent } from '../utils/format';
import { Trash2, TrendingUp, DollarSign, PieChart, Edit2, X, Save } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export const RevenueReport: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form state for editing
  const [editPax, setEditPax] = useState<number>(0);
  const [editOmzet, setEditOmzet] = useState<number>(0);
  const [editHpp, setEditHpp] = useState<number>(0);
  const [editBiayaTambahan, setEditBiayaTambahan] = useState<number>(0);
  const [editCatatan, setEditCatatan] = useState<string>('');

  useEffect(() => {
    setTransactions(getTransactions());
  }, []);

  const handleDelete = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
      deleteTransaction(id);
      setTransactions(getTransactions());
    }
  };

  const handleEditClick = (t: Transaction) => {
    setEditingTransaction(t);
    setEditPax(t.jumlahPax);
    setEditOmzet(t.totalOmzet);
    setEditHpp(t.totalHpp);
    setEditBiayaTambahan(t.biayaTambahan || 0);
    setEditCatatan(t.catatan || '');
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
  };

  const handleSaveEdit = () => {
    if (editingTransaction) {
      const updated: Transaction = {
        ...editingTransaction,
        jumlahPax: editPax,
        totalOmzet: editOmzet,
        totalHpp: editHpp,
        biayaTambahan: editBiayaTambahan,
        catatan: editCatatan,
        totalProfit: editOmzet - editHpp - editBiayaTambahan
      };
      updateTransaction(updated);
      setTransactions(getTransactions());
      setEditingTransaction(null);
    }
  };

  const totalOmzet = transactions.reduce((sum, t) => sum + t.totalOmzet, 0);
  const totalHpp = transactions.reduce((sum, t) => sum + t.totalHpp, 0);
  const totalBiayaTambahan = transactions.reduce((sum, t) => sum + (t.biayaTambahan || 0), 0);
  const totalProfit = transactions.reduce((sum, t) => sum + t.totalProfit, 0);
  const averageMargin = totalOmzet > 0 ? totalProfit / totalOmzet : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Laporan Pendapatan (Laba/Rugi)</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Omzet</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalOmzet)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total HPP (Modal)</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalHpp)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Laba Bersih</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalProfit)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Rata-rata Margin</p>
              <p className="text-xl font-bold text-gray-900">{formatPercent(averageMargin)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Riwayat Transaksi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
              <tr>
                <th className="px-4 py-3">Tanggal Simpan</th>
                <th className="px-4 py-3">Nama Paket</th>
                <th className="px-4 py-3">Keberangkatan</th>
                <th className="px-4 py-3 text-center">Pax</th>
                <th className="px-4 py-3 text-right">Omzet</th>
                <th className="px-4 py-3 text-right">HPP</th>
                <th className="px-4 py-3 text-right">Biaya Tambahan</th>
                <th className="px-4 py-3 text-right">Laba Bersih</th>
                <th className="px-4 py-3 text-center">Margin</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    Belum ada data transaksi. Simpan transaksi dari menu Sales Order.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      {format(new Date(t.date), 'dd MMM yyyy', { locale: id })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {t.namaPaket || '-'}
                      {t.namaTravel && <span className="block text-xs text-gray-500">{t.namaTravel}</span>}
                      {t.catatan && <span className="block text-xs text-amber-600 mt-1">Catatan: {t.catatan}</span>}
                    </td>
                    <td className="px-4 py-3">{t.tglKeberangkatan}</td>
                    <td className="px-4 py-3 text-center">{t.jumlahPax}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(t.totalOmzet)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(t.totalHpp)}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(t.biayaTambahan || 0)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(t.totalProfit)}</td>
                    <td className="px-4 py-3 text-center">
                      {formatPercent(t.totalOmzet > 0 ? t.totalProfit / t.totalOmzet : 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(t)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Transaksi"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">Edit Transaksi</h3>
              <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-blue-800 font-medium">Paket: {editingTransaction.namaPaket}</p>
                <p className="text-sm text-blue-600">Keberangkatan: {editingTransaction.tglKeberangkatan}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pax Aktual</label>
                  <input
                    type="number"
                    value={editPax}
                    onChange={(e) => setEditPax(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Omzet Aktual (Rp)</label>
                  <input
                    type="number"
                    value={editOmzet}
                    onChange={(e) => setEditOmzet(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total HPP Aktual (Rp)</label>
                  <input
                    type="number"
                    value={editHpp}
                    onChange={(e) => setEditHpp(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biaya Tambahan / Tak Terduga (Rp)</label>
                  <input
                    type="number"
                    value={editBiayaTambahan}
                    onChange={(e) => setEditBiayaTambahan(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan / Alasan Perubahan</label>
                <textarea
                  value={editCatatan}
                  onChange={(e) => setEditCatatan(e.target.value)}
                  placeholder="Misal: Ada penambahan biaya denda bagasi, jamaah batal 1 orang, dll."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 h-24"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mt-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Laba Bersih Setelah Perubahan:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(editOmzet - editHpp - editBiayaTambahan)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                <Save className="w-4 h-4" />
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
