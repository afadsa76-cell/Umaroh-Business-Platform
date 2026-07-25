import React, { useState, useMemo, useEffect } from 'react';
import { Users, Info, Calculator, Plus, Trash2, Edit, X, Search } from 'lucide-react';
import { useKurs } from '../../hooks/useKurs';

export interface MutawifService {
  id: string;
  name: string;
  hargaAsingPerHari: number;
  jumlahHari: number;
  marginPersen: number;
}

const initialServices: MutawifService[] = [
  {
    id: 'm1',
    name: 'MUTAWIF + TRANSPORTASI',
    hargaAsingPerHari: 300,
    jumlahHari: 8,
    marginPersen: 80,
  },
  {
    id: 'm2',
    name: 'MUTAWIF ONLY',
    hargaAsingPerHari: 150,
    jumlahHari: 8,
    marginPersen: 50,
  }
];

export const MutawifView: React.FC = () => {
  const { kurs: masterKurs, updateKurs } = useKurs();
  const [searchTerm, setSearchTerm] = useState('');
  const [kurs, setKurs] = useState<number>(4900);

  // Sync exchange rate with global SAR rate
  useEffect(() => {
    if (masterKurs) {
      setKurs(masterKurs.sarToIdr);
    }
  }, [masterKurs]);

  // Load/Save local mutawif services
  const [localServices, setLocalServices] = useState<MutawifService[]>(() => {
    const cached = localStorage.getItem('umaroh_db_mutawif');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse cached mutawif services:', e);
      }
    }
    return initialServices;
  });

  const saveServices = (updated: MutawifService[]) => {
    setLocalServices(updated);
    localStorage.setItem('umaroh_db_mutawif', JSON.stringify(updated));
  };

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<MutawifService[]>;
      if (customEvent.detail) {
        setLocalServices(customEvent.detail);
      }
    };
    window.addEventListener('umaroh_db_sync:umaroh_db_mutawif', handleSync);
    return () => window.removeEventListener('umaroh_db_sync:umaroh_db_mutawif', handleSync);
  }, []);

  const filteredData = useMemo(() => {
    return localServices.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [localServices, searchTerm]);

  // Calculator states
  const [selectedServiceId, setSelectedServiceId] = useState<string>(localServices[0]?.id || 'm1');
  const [calcPax, setCalcPax] = useState<number>(30);

  const selectedService = useMemo(() => {
    return localServices.find(s => s.id === selectedServiceId) || localServices[0];
  }, [selectedServiceId, localServices]);

  const calculationResult = useMemo(() => {
    if (!selectedService) return null;

    const totalHargaBeliGrup = selectedService.hargaAsingPerHari * selectedService.jumlahHari * kurs;
    const hargaBeliPerPax = totalHargaBeliGrup / calcPax;
    const marginPerPax = hargaBeliPerPax * (selectedService.marginPersen / 100);
    const hargaJualPerPax = hargaBeliPerPax + marginPerPax;

    return {
      totalHargaBeliGrup,
      hargaBeliPerPax,
      marginPerPax,
      hargaJualPerPax,
    };
  }, [selectedService, calcPax, kurs]);

  // Multi-selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isAllSelected = filteredData.length > 0 && filteredData.every(item => selectedIds.includes(item.id));

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MutawifService | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formHargaAsingPerHari, setFormHargaAsingPerHari] = useState<number>(300);
  const [formJumlahHari, setFormJumlahHari] = useState<number>(8);
  const [formMarginPersen, setFormMarginPersen] = useState<number>(80);

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
    if (!formName.trim()) {
      alert('Nama layanan wajib diisi!');
      return;
    }

    const newItem: MutawifService = {
      id: 'mutawif_' + Date.now(),
      name: formName,
      hargaAsingPerHari: Number(formHargaAsingPerHari),
      jumlahHari: Number(formJumlahHari),
      marginPersen: Number(formMarginPersen),
    };

    saveServices([newItem, ...localServices]);
    setIsAddOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!formName.trim()) {
      alert('Nama layanan wajib diisi!');
      return;
    }

    const updated = localServices.map((item) => {
      if (item.id === editingItem.id) {
        return {
          ...item,
          name: formName,
          hargaAsingPerHari: Number(formHargaAsingPerHari),
          jumlahHari: Number(formJumlahHari),
          marginPersen: Number(formMarginPersen),
        };
      }
      return item;
    });

    saveServices(updated);
    setIsEditOpen(false);
    setEditingItem(null);
  };

  const openEditModal = (item: MutawifService) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormHargaAsingPerHari(item.hargaAsingPerHari);
    setFormJumlahHari(item.jumlahHari);
    setFormMarginPersen(item.marginPersen);
    setIsEditOpen(true);
  };

  const handleSingleDelete = (item: MutawifService) => {
    if (confirm(`Apakah Anda yakin ingin menghapus layanan Mutawif "${item.name}"?`)) {
      const updated = localServices.filter(i => i.id !== item.id);
      saveServices(updated);
      setSelectedIds(selectedIds.filter(id => id !== item.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} layanan Mutawif terpilih?`)) {
      const updated = localServices.filter(item => !selectedIds.includes(item.id));
      saveServices(updated);
      setSelectedIds([]);
    }
  };

  const handleSaveKurs = async () => {
    try {
      await updateKurs(kurs, masterKurs?.usdToIdr || 20000);
      alert('Kurs Mutawif (SAR) berhasil diperbarui!');
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
            <Users className="w-6 h-6 text-emerald-600" />
            Database Master Mutawif
          </h1>
          <p className="text-gray-500 mt-1">Kelola harga mutawif, jumlah hari tugas, margin keuntungan, dan kurs SAR</p>
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
            setFormName('');
            setFormHargaAsingPerHari(300);
            setFormJumlahHari(8);
            setFormMarginPersen(80);
            setIsAddOpen(true);
          }}
          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Mutawif Manual
        </button>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg shadow-sm">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-bold text-yellow-800">Asumsi Dasar Mutawif</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc pl-5 space-y-1 font-medium">
                <li>Keuntungan berdasarkan persentase margin per layanan</li>
                <li>Biaya grup dihitung dengan rumus: (Harga Asing/Hari) x (Jumlah Hari) x Kurs</li>
                <li>Biaya per Pax diperoleh dengan membagi Biaya grup dengan Jumlah Pax</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Calculator Section */}
        <div className="lg:w-1/3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <Calculator className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Kalkulator Per Pax</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pilih Layanan
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-semibold text-gray-800"
                >
                  {localServices.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Simulasi Jumlah Pax
                </label>
                <input
                  type="number"
                  value={calcPax}
                  onChange={(e) => setCalcPax(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  min="1"
                />
              </div>

              {calculationResult && selectedService ? (
                <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Grup (SAR)</span>
                    <span className="font-bold">{selectedService.hargaAsingPerHari * selectedService.jumlahHari} SAR</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Beli Grup</span>
                    <span className="font-semibold">{formatCurrency(calculationResult.totalHargaBeliGrup)}</span>
                  </div>
                  <div className="border-t border-emerald-200 pt-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Beli per Pax</span>
                      <span className="font-medium">{formatCurrency(calculationResult.hargaBeliPerPax)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Margin ({selectedService.marginPersen}%)</span>
                      <span className="font-medium text-emerald-600">+{formatCurrency(calculationResult.marginPerPax)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-emerald-200">
                      <span className="font-bold text-gray-900">Jual per Pax</span>
                      <div className="text-right">
                        <span className="font-bold text-lg text-emerald-700">{formatCurrency(calculationResult.hargaJualPerPax)}</span>
                        <span className="text-xs text-gray-500 block">Untuk {calcPax} Pax</span>
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
            <h2 className="text-xl font-bold text-gray-900">Daftar Layanan Mutawif</h2>

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
                  Hapus ({selectedIds.length})
                </button>
              )}
            </div>
          </div>

          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari layanan mutawif..."
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
                    <th className="px-4 py-3 text-center w-12"></th>
                    <th scope="col" className="px-4 py-3 font-semibold">Nama Layanan</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-center">Tugas Hari</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">SAR / Hari</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Total (SAR)</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Total Beli (IDR)</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-center">Margin (%)</th>
                    <th scope="col" className="px-4 py-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredData.length > 0 ? (
                    filteredData.map((item) => {
                      const isSel = selectedIds.includes(item.id);
                      const totalSar = item.hargaAsingPerHari * item.jumlahHari;
                      const totalIdr = totalSar * kurs;

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
                          <td className="px-4 py-3 font-bold text-gray-900 cursor-pointer" onClick={() => setSelectedServiceId(item.id)}>
                            {item.name}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600 font-semibold">{item.jumlahHari} Hari</td>
                          <td className="px-4 py-3 text-right text-gray-600 font-mono">{item.hargaAsingPerHari} SAR</td>
                          <td className="px-4 py-3 text-right text-gray-600 font-mono font-semibold">{totalSar} SAR</td>
                          <td className="px-4 py-3 text-right text-emerald-800 font-bold font-mono">{formatCurrency(totalIdr)}</td>
                          <td className="px-4 py-3 text-center text-gray-600 font-semibold">{item.marginPersen}%</td>
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
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        Tidak ada layanan yang cocok dengan "{searchTerm}"
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
                {isAddOpen ? 'Tambah Layanan Mutawif Manual' : 'Edit Layanan Mutawif'}
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Layanan</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Contoh: MUTAWIF ONLY STANDARD"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">SAR / Hari</label>
                  <input
                    type="number"
                    value={formHargaAsingPerHari}
                    onChange={(e) => setFormHargaAsingPerHari(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Jumlah Hari</label>
                  <input
                    type="number"
                    value={formJumlahHari}
                    onChange={(e) => setFormJumlahHari(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Margin (%)</label>
                <input
                  type="number"
                  value={formMarginPersen}
                  onChange={(e) => setFormMarginPersen(Number(e.target.value))}
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
