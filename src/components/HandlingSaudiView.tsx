import React, { useState, useMemo, useEffect } from 'react';
import { Calculator, DollarSign, Users, Plus, Trash2, Edit, X, FileText, Save, RotateCcw, PlusCircle, Check } from 'lucide-react';
import { HANDLING_TIERS, HANDLING_CONSTANTS, HandlingTier } from '../data/handlingSaudi';
import { useKurs } from '../hooks/useKurs';

export const HandlingSaudiView: React.FC = () => {
  const { kurs: masterKurs, updateKurs } = useKurs();
  const [paxInput, setPaxInput] = useState<number>(35);
  const [kurs, setKurs] = useState<number>(HANDLING_CONSTANTS.defaultKurs);
  const [marginPercent, setMarginPercent] = useState<number>(HANDLING_CONSTANTS.defaultMarginPercent);

  // Sync with global USD kurs
  useEffect(() => {
    if (masterKurs) {
      setKurs(masterKurs.usdToIdr);
    }
  }, [masterKurs]);

  // Load / Save tiers
  const [localTiers, setLocalTiers] = useState<HandlingTier[]>(() => {
    const cached = localStorage.getItem('umaroh_db_handling_saudi');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse cached saudi tiers:', e);
      }
    }
    return HANDLING_TIERS;
  });

  const saveTiers = (updated: HandlingTier[]) => {
    setLocalTiers(updated);
    localStorage.setItem('umaroh_db_handling_saudi', JSON.stringify(updated));
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);

  // Form states
  const [formMinPax, setFormMinPax] = useState<number>(1);
  const [formMaxPax, setFormMaxPax] = useState<number>(7);
  const [formHpp, setFormHpp] = useState<number>(249);

  // Master Description states and default configuration
  const defaultDescription = useMemo(() => ({
    termasuk: [
      "Harga diatas adalah harga estimasi, sewaktu-waktu dapat di sesuaikan dengan perubahan komponen di Arab Saudi.",
      "Harga diatas adalah harga per Pax.",
      "HANDLING AIRPORT; Meet & Assist Airport JED/MED",
      "1. Handling Bagasi saat Kedatangan dan Kepulangan",
      "2. Tip Muasasah",
      "3. Tip Porter",
      "4. Air Zam-zam 1 Galon/Pax",
      "5. Penyambutan dengan Branding Partner",
      "HANDLING HOTEL; Handling Check-In Check-Out Hotel Makkah dan Madinah, Meliputi:",
      "1. Pengambilan Kunci Kamar",
      "2. Room Showing",
      "3. Checking Aminities",
      "4. Pengaturan Room List",
      "5. Penyerahan Kunci",
      "6. Pengurusan Bagasi Hingga Depan Kamar",
      "7. Tip Bellman",
      "HANDLING TRANSPORTASI; Penanganan Transportasi minimal 5 trip regular, dengan detail sebagai berikut:",
      "1. Memastikan Kedatangan Sesuai Jadwal",
      "2. Memastikan Kebersihan Kendaraan",
      "3. Memastikan Fasilitas Kendaraan Sesuai",
      "4. Snack Box (Sesuai Program)",
      "5. Tip Sopir",
      "MEALS;",
      "1. Meal Box saat Kedatangan",
      "2. Meal Box saat Kepulangan",
      "SNACK; diberikan 3 kali dengan detail berikut:",
      "1. Mazarat Makkah",
      "2. Mazarat Madinah",
      "3. Transfer Makkah - Madinah",
      "GUIDES;",
      "1. Muthawif 8 Hari",
      "2. Muthawif 1 Kali di Raudhah",
      "BRANDING PARTNER;",
      "1. Sign Board Kedatangan",
      "2. Welcome Banner Kedatangan",
      "3. Head Rest Cover sesuai Trip",
      "4. Snack Paper + Logo Travel",
      "5. Logo Travel untuk Pack Meal"
    ],
    tidakTermasuk: [
      "Pengeluaran belanja pribadi",
      "Kelebihan bagasi"
    ]
  }), []);

  const [description, setDescription] = useState<{ termasuk: string[]; tidakTermasuk: string[] }>(() => {
    const cached = localStorage.getItem('umaroh_db_handling_saudi_deskripsi');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.termasuk) && Array.isArray(parsed.tidakTermasuk)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse cached description:', e);
      }
    }
    return {
      termasuk: [
        "Harga diatas adalah harga estimasi, sewaktu-waktu dapat di sesuaikan dengan perubahan komponen di Arab Saudi.",
        "Harga diatas adalah harga per Pax.",
        "HANDLING AIRPORT; Meet & Assist Airport JED/MED",
        "1. Handling Bagasi saat Kedatangan dan Kepulangan",
        "2. Tip Muasasah",
        "3. Tip Porter",
        "4. Air Zam-zam 1 Galon/Pax",
        "5. Penyambutan dengan Branding Partner",
        "HANDLING HOTEL; Handling Check-In Check-Out Hotel Makkah dan Madinah, Meliputi:",
        "1. Pengambilan Kunci Kamar",
        "2. Room Showing",
        "3. Checking Aminities",
        "4. Pengaturan Room List",
        "5. Penyerahan Kunci",
        "6. Pengurusan Bagasi Hingga Depan Kamar",
        "7. Tip Bellman",
        "HANDLING TRANSPORTASI; Penanganan Transportasi minimal 5 trip regular, dengan detail sebagai berikut:",
        "1. Memastikan Kedatangan Sesuai Jadwal",
        "2. Memastikan Kebersihan Kendaraan",
        "3. Memastikan Fasilitas Kendaraan Sesuai",
        "4. Snack Box (Sesuai Program)",
        "5. Tip Sopir",
        "MEALS;",
        "1. Meal Box saat Kedatangan",
        "2. Meal Box saat Kepulangan",
        "SNACK; diberikan 3 kali dengan detail berikut:",
        "1. Mazarat Makkah",
        "2. Mazarat Madinah",
        "3. Transfer Makkah - Madinah",
        "GUIDES;",
        "1. Muthawif 8 Hari",
        "2. Muthawif 1 Kali di Raudhah",
        "BRANDING PARTNER;",
        "1. Sign Board Kedatangan",
        "2. Welcome Banner Kedatangan",
        "3. Head Rest Cover sesuai Trip",
        "4. Snack Paper + Logo Travel",
        "5. Logo Travel untuk Pack Meal"
      ],
      tidakTermasuk: [
        "Pengeluaran belanja pribadi",
        "Kelebihan bagasi"
      ]
    };
  });

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [tempTermasuk, setTempTermasuk] = useState<string[]>([]);
  const [tempTidakTermasuk, setTempTidakTermasuk] = useState<string[]>([]);

  const startEditingDesc = () => {
    setTempTermasuk([...description.termasuk]);
    setTempTidakTermasuk([...description.tidakTermasuk]);
    setIsEditingDesc(true);
  };

  const handleSaveDesc = () => {
    const updated = {
      termasuk: tempTermasuk.map(item => item.trim()).filter(Boolean),
      tidakTermasuk: tempTidakTermasuk.map(item => item.trim()).filter(Boolean)
    };
    setDescription(updated);
    localStorage.setItem('umaroh_db_handling_saudi_deskripsi', JSON.stringify(updated));
    setIsEditingDesc(false);
  };

  const handleResetDesc = () => {
    if (confirm("Apakah Anda yakin ingin mengembalikan deskripsi ke setelan awal default?")) {
      setDescription(defaultDescription);
      localStorage.setItem('umaroh_db_handling_saudi_deskripsi', JSON.stringify(defaultDescription));
      if (isEditingDesc) {
        setTempTermasuk([...defaultDescription.termasuk]);
        setTempTidakTermasuk([...defaultDescription.tidakTermasuk]);
      }
    }
  };

  const handleAddTermasukItem = () => {
    setTempTermasuk([...tempTermasuk, ""]);
  };

  const handleRemoveTermasukItem = (index: number) => {
    const next = [...tempTermasuk];
    next.splice(index, 1);
    setTempTermasuk(next);
  };

  const handleUpdateTermasukItem = (index: number, val: string) => {
    const next = [...tempTermasuk];
    next[index] = val;
    setTempTermasuk(next);
  };

  const handleAddTidakTermasukItem = () => {
    setTempTidakTermasuk([...tempTidakTermasuk, ""]);
  };

  const handleRemoveTidakTermasukItem = (index: number) => {
    const next = [...tempTidakTermasuk];
    next.splice(index, 1);
    setTempTidakTermasuk(next);
  };

  const handleUpdateTidakTermasukItem = (index: number, val: string) => {
    const next = [...tempTidakTermasuk];
    next[index] = val;
    setTempTidakTermasuk(next);
  };

  const isHeader = (item: string) => {
    const trimmed = item.trim();
    return (
      trimmed.endsWith(':') || 
      trimmed.endsWith(';') || 
      (trimmed === trimmed.toUpperCase() && trimmed.length > 5 && !trimmed.match(/^\d/))
    );
  };

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
    const margin = beli * (marginPercent / 100);
    const jual = beli + margin;
    return { hppPlusAdm, beli, margin, jual };
  };

  const getTierId = (t: HandlingTier) => `${t.minPax}-${t.maxPax}`;

  const calculationResult = useMemo(() => {
    const tier = localTiers.find(t => paxInput >= t.minPax && paxInput <= t.maxPax);
    if (!tier) return null;

    return {
      tier,
      ...calculatePrice(tier.hpp)
    };
  }, [paxInput, kurs, marginPercent, localTiers]);

  // Handle addition
  const handleAddTier = (e: React.FormEvent) => {
    e.preventDefault();
    const newTier: HandlingTier = {
      minPax: Number(formMinPax),
      maxPax: Number(formMaxPax),
      hpp: Number(formHpp)
    };
    saveTiers([...localTiers, newTier]);
    setIsAddOpen(false);
  };

  // Handle editing
  const handleEditTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTierId) return;

    const [oldMin, oldMax] = editingTierId.split('-').map(Number);
    const updated = localTiers.map(t => {
      if (t.minPax === oldMin && t.maxPax === oldMax) {
        return {
          minPax: Number(formMinPax),
          maxPax: Number(formMaxPax),
          hpp: Number(formHpp)
        };
      }
      return t;
    });

    saveTiers(updated);
    setIsEditOpen(false);
    setEditingTierId(null);
  };

  const openEditModal = (t: HandlingTier) => {
    setFormMinPax(t.minPax);
    setFormMaxPax(t.maxPax);
    setFormHpp(t.hpp);
    setEditingTierId(getTierId(t));
    setIsEditOpen(true);
  };

  // Deletion logic
  const handleSingleDelete = (t: HandlingTier) => {
    const id = getTierId(t);
    if (confirm(`Apakah Anda yakin ingin menghapus tier ${t.minPax}-${t.maxPax} pax?`)) {
      const updated = localTiers.filter(item => getTierId(item) !== id);
      saveTiers(updated);
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} tier terpilih?`)) {
      const updated = localTiers.filter(item => !selectedIds.includes(getTierId(item)));
      saveTiers(updated);
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(item => item !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(localTiers.map(getTierId));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSaveKurs = async () => {
    try {
      await updateKurs(masterKurs?.sarToIdr || 4900, kurs);
      alert('Kurs Saudi Handling (USD) berhasil diperbarui!');
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui kurs');
    }
  };

  const isAllSelected = localTiers.length > 0 && selectedIds.length === localTiers.length;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
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
            setFormMinPax(1);
            setFormMaxPax(10);
            setFormHpp(100);
            setIsAddOpen(true);
          }}
          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Handling Service Manual
        </button>
      </div>

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
                  Jumlah Pax tidak ter-cover oleh tier handling manapun.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="lg:w-2/3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Tabel Paket Service Handling Saudi</h2>
                <p className="text-sm text-gray-500 mt-1">Daftar paket handling berdasarkan jangkauan Pax</p>
              </div>

              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus ({selectedIds.length})
                </button>
              )}
            </div>
            
            {/* Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 font-medium uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-center">Pax Range</th>
                    <th className="px-4 py-3 text-center">HPP (USD)</th>
                    <th className="px-4 py-3 text-right">Beli (IDR)</th>
                    <th className="px-4 py-3 text-right bg-emerald-50 text-emerald-800">Jual (IDR)</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {localTiers.map((tier) => {
                    const id = getTierId(tier);
                    const isSel = selectedIds.includes(id);
                    const prices = calculatePrice(tier.hpp);
                    return (
                      <tr 
                        key={id} 
                        className={`hover:bg-gray-50 transition-colors ${isSel ? 'bg-amber-50/50' : ''}`}
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={(e) => handleSelectOne(id, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-800">
                          {tier.minPax} - {tier.maxPax} Pax
                        </td>
                        <td className="px-4 py-3 text-center font-medium">${tier.hpp}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-600">{formatCurrency(prices.beli)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
                          {formatCurrency(prices.jual)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center items-center gap-2">
                            <button
                              onClick={() => openEditModal(tier)}
                              className="text-amber-600 hover:text-amber-800 hover:bg-amber-50 p-1.5 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSingleDelete(tier)}
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
          </div>
        </div>
      </div>

      {/* Master Deskripsi Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-4 mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Database Master Deskripsi</h2>
              <p className="text-sm text-gray-500">Syarat & Ketentuan Inclusions (Harga Termasuk) & Exclusions (Harga Tidak Termasuk) untuk Handling Saudi</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {isEditingDesc ? (
              <>
                <button
                  onClick={handleSaveDesc}
                  className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Simpan Perubahan
                </button>
                <button
                  onClick={() => setIsEditingDesc(false)}
                  className="flex-1 sm:flex-initial bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  Batal
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={startEditingDesc}
                  className="flex-1 sm:flex-initial bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Edit className="w-4 h-4" />
                  Edit Deskripsi
                </button>
                <button
                  onClick={handleResetDesc}
                  className="flex-1 sm:flex-initial bg-gray-50 hover:bg-red-50 border border-gray-200 text-gray-600 hover:text-red-600 text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  title="Kembalikan ke Setelan Awal"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset ke Default
                </button>
              </>
            )}
          </div>
        </div>

        {isEditingDesc ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Edit Harga Termasuk */}
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/60">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-emerald-800 text-sm uppercase tracking-wide">Inclusions (Harga Termasuk)</h3>
                <button
                  onClick={handleAddTermasukItem}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  Tambah Baris
                </button>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {tempTermasuk.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs font-bold w-6">{index + 1}.</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleUpdateTermasukItem(index, e.target.value)}
                      placeholder="Masukkan deskripsi item..."
                      className={`flex-1 px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 text-xs font-medium ${
                        isHeader(item) 
                          ? 'border-emerald-300 bg-emerald-50/20 font-bold text-gray-800' 
                          : 'border-gray-300 focus:ring-emerald-500'
                      }`}
                    />
                    <button
                      onClick={() => handleRemoveTermasukItem(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {tempTermasuk.length === 0 && (
                  <p className="text-gray-400 text-xs italic text-center py-4">Belum ada item ditambahkan.</p>
                )}
              </div>
            </div>

            {/* Edit Harga Tidak Termasuk */}
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/60">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-red-800 text-sm uppercase tracking-wide">Exclusions (Harga Tidak Termasuk)</h3>
                <button
                  onClick={handleAddTidakTermasukItem}
                  className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  Tambah Baris
                </button>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {tempTidakTermasuk.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs font-bold w-6">{index + 1}.</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleUpdateTidakTermasukItem(index, e.target.value)}
                      placeholder="Masukkan deskripsi item..."
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                    />
                    <button
                      onClick={() => handleRemoveTidakTermasukItem(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {tempTidakTermasuk.length === 0 && (
                  <p className="text-gray-400 text-xs italic text-center py-4">Belum ada item ditambahkan.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* View Harga Termasuk */}
            <div className="bg-emerald-50/20 border border-emerald-100 p-6 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-10 -mt-10 pointer-events-none"></div>
              <h3 className="font-extrabold text-emerald-800 text-sm uppercase tracking-wider mb-4 border-b border-emerald-100 pb-2 flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                Harga Termasuk (Inclusions)
              </h3>
              <div className="space-y-1.5">
                {description.termasuk.map((item, idx) => {
                  const isHead = isHeader(item);
                  if (isHead) {
                    return (
                      <div key={idx} className="font-bold text-gray-800 text-xs mt-4 mb-2 first:mt-0 tracking-wide border-b border-emerald-100/60 pb-1 flex items-center gap-2">
                        <span className="w-1.5 h-3 bg-emerald-500 rounded-sm shrink-0"></span>
                        {item}
                      </div>
                    );
                  }
                  const hasNumber = item.trim().match(/^\d+\./);
                  return (
                    <div 
                      key={idx} 
                      className={`text-xs text-gray-600 py-0.5 flex items-start gap-2 ${
                        hasNumber ? 'pl-4' : 'pl-1'
                      }`}
                    >
                      {!hasNumber && <span className="text-emerald-500 font-bold shrink-0">•</span>}
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  );
                })}
                {description.termasuk.length === 0 && (
                  <p className="text-gray-400 text-xs italic text-center py-4">Belum ada deskripsi.</p>
                )}
              </div>
            </div>

            {/* View Harga Tidak Termasuk */}
            <div className="bg-red-50/10 border border-red-100 p-6 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-10 -mt-10 pointer-events-none"></div>
              <h3 className="font-extrabold text-red-800 text-sm uppercase tracking-wider mb-4 border-b border-red-100 pb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                Harga Tidak Termasuk (Exclusions)
              </h3>
              <div className="space-y-1.5">
                {description.tidakTermasuk.map((item, idx) => (
                  <div key={idx} className="text-xs text-gray-600 py-0.5 flex items-start gap-2">
                    <span className="text-red-400 font-bold shrink-0">•</span>
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))}
                {description.tidakTermasuk.length === 0 && (
                  <p className="text-gray-400 text-xs italic text-center py-4">Belum ada deskripsi.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Add / Edit Modals */}
      {(isAddOpen || isEditOpen) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg">
                {isAddOpen ? 'Tambah Service Handling Manual' : 'Edit Service Handling'}
              </h3>
              <button 
                onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
                className="hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={isAddOpen ? handleAddTier : handleEditTier} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Min Pax</label>
                  <input
                    type="number"
                    value={formMinPax}
                    onChange={(e) => setFormMinPax(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Max Pax</label>
                  <input
                    type="number"
                    value={formMaxPax}
                    onChange={(e) => setFormMaxPax(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">HPP (USD)</label>
                <input
                  type="number"
                  value={formHpp}
                  onChange={(e) => setFormHpp(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  min="1"
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
