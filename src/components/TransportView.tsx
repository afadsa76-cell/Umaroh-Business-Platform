import React, { useState, useMemo, useEffect } from 'react';
import { Bus, Search, Calculator, Plus, Trash2, Edit, X } from 'lucide-react';
import { transportData, TransportVehicle } from '../data/transport';
import { useKurs } from '../hooks/useKurs';

export const TransportView: React.FC = () => {
  const { kurs: masterKurs, updateKurs } = useKurs();
  const [searchTerm, setSearchTerm] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number>(4200);

  // Sync exchange rate with master SAR kurs
  useEffect(() => {
    if (masterKurs) {
      setExchangeRate(masterKurs.sarToIdr);
    }
  }, [masterKurs]);

  // Load/Save local transport list
  const [localTransport, setLocalTransport] = useState<TransportVehicle[]>(() => {
    const cached = localStorage.getItem('umaroh_db_transport');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse cached transport:', e);
      }
    }
    return transportData;
  });

  const saveTransport = (updated: TransportVehicle[]) => {
    setLocalTransport(updated);
    localStorage.setItem('umaroh_db_transport', JSON.stringify(updated));
  };

  // Calculator State
  const [selectedVehicleId, setSelectedVehicleId] = useState(localTransport[0]?.id || 'bus');
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [paxCount, setPaxCount] = useState<number>(1);

  const selectedVehicle = localTransport.find(v => v.id === selectedVehicleId) || localTransport[0];
  const selectedRoute = selectedVehicle?.routes[selectedRouteIndex] || selectedVehicle?.routes[0] || { route: '', price: 0 };

  const totalSar = selectedRoute.price;
  const totalIdr = totalSar * exchangeRate;
  const perPaxIdr = paxCount > 0 ? totalIdr / paxCount : 0;
  const marginPercentage = 40;
  const sellingPricePerPaxIdr = perPaxIdr * (1 + marginPercentage / 100);

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVehicleId(e.target.value);
    setSelectedRouteIndex(0);
  };

  // Flat representation of routes for tabular view (to make editing/selection super easy)
  interface FlatRouteItem {
    id: string; // unique key (vehicleId_index)
    vehicleId: string;
    vehicleName: string;
    namaVendor: string;
    routeIndex: number;
    route: string;
    price: number;
  }

  const flatRoutes: FlatRouteItem[] = useMemo(() => {
    const items: FlatRouteItem[] = [];
    localTransport.forEach((vehicle) => {
      vehicle.routes.forEach((route, idx) => {
        items.push({
          id: `${vehicle.id}_${idx}`,
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          namaVendor: vehicle.namaVendor,
          routeIndex: idx,
          route: route.route,
          price: route.price,
        });
      });
    });
    return items;
  }, [localTransport]);

  const filteredFlatRoutes = useMemo(() => {
    return flatRoutes.filter((item) =>
      item.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.namaVendor.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [flatRoutes, searchTerm]);

  // Multi-selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isAllSelected = filteredFlatRoutes.length > 0 && filteredFlatRoutes.every(item => selectedIds.includes(item.id));

  // Add/Edit manual states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FlatRouteItem | null>(null);

  // Form states
  const [formVehicleType, setFormVehicleType] = useState('BUS');
  const [formVendor, setFormVendor] = useState('TFA');
  const [formRoute, setFormRoute] = useState('');
  const [formPrice, setFormPrice] = useState<number>(500);

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredFlatRoutes.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRoute.trim()) {
      alert('Rute wajib diisi!');
      return;
    }

    const vehicleId = formVehicleType.toLowerCase().replace(/\s+/g, '_');
    const existingVehicleIdx = localTransport.findIndex(v => v.id === vehicleId);

    let updated: TransportVehicle[];
    if (existingVehicleIdx > -1) {
      updated = localTransport.map((v, idx) => {
        if (idx === existingVehicleIdx) {
          return {
            ...v,
            routes: [...v.routes, { route: formRoute, price: Number(formPrice) }],
          };
        }
        return v;
      });
    } else {
      updated = [
        ...localTransport,
        {
          id: vehicleId,
          name: formVehicleType.toUpperCase(),
          namaVendor: formVendor,
          routes: [{ route: formRoute, price: Number(formPrice) }],
        },
      ];
    }

    saveTransport(updated);
    setIsAddOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!formRoute.trim()) {
      alert('Rute wajib diisi!');
      return;
    }

    const updated = localTransport.map((vehicle) => {
      if (vehicle.id === editingItem.vehicleId) {
        const updatedRoutes = vehicle.routes.map((r, idx) => {
          if (idx === editingItem.routeIndex) {
            return { route: formRoute, price: Number(formPrice) };
          }
          return r;
        });
        return {
          ...vehicle,
          name: formVehicleType.toUpperCase(),
          namaVendor: formVendor,
          routes: updatedRoutes,
        };
      }
      return vehicle;
    });

    saveTransport(updated);
    setIsEditOpen(false);
    setEditingItem(null);
  };

  const openEditModal = (item: FlatRouteItem) => {
    setEditingItem(item);
    setFormVehicleType(item.vehicleName);
    setFormVendor(item.namaVendor);
    setFormRoute(item.route);
    setFormPrice(item.price);
    setIsEditOpen(true);
  };

  const handleSingleDelete = (item: FlatRouteItem) => {
    if (confirm(`Apakah Anda yakin ingin menghapus rute "${item.route}" untuk kendaraan ${item.vehicleName}?`)) {
      const updated = localTransport.map((vehicle) => {
        if (vehicle.id === item.vehicleId) {
          return {
            ...vehicle,
            routes: vehicle.routes.filter((_, idx) => idx !== item.routeIndex),
          };
        }
        return vehicle;
      }).filter(vehicle => vehicle.routes.length > 0); // remove vehicle if empty

      saveTransport(updated);
      setSelectedIds(selectedIds.filter(id => id !== item.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} rute terpilih?`)) {
      // Group by vehicleId to remove easily
      const toDeleteMap: { [vehicleId: string]: number[] } = {};
      selectedIds.forEach((id) => {
        const [vId, idx] = id.split('_');
        if (!toDeleteMap[vId]) toDeleteMap[vId] = [];
        toDeleteMap[vId].push(Number(idx));
      });

      const updated = localTransport.map((vehicle) => {
        if (toDeleteMap[vehicle.id]) {
          const indicesToRemove = toDeleteMap[vehicle.id];
          return {
            ...vehicle,
            routes: vehicle.routes.filter((_, idx) => !indicesToRemove.includes(idx)),
          };
        }
        return vehicle;
      }).filter(vehicle => vehicle.routes.length > 0);

      saveTransport(updated);
      setSelectedIds([]);
    }
  };

  const handleSaveExchangeRate = async () => {
    try {
      await updateKurs(exchangeRate, masterKurs?.usdToIdr || 20000);
      alert('Kurs Transportasi (SAR) berhasil diperbarui!');
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
            <Bus className="w-6 h-6 text-emerald-600" />
            Database Master Transportasi
          </h1>
          <p className="text-gray-500 mt-1">Kelola rute, jenis kendaraan, harga SAR, dan kurs master transportasi</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari rute, kendaraan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Control Panel: Kurs and Add Manual */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="font-bold text-gray-700 text-sm whitespace-nowrap">Kurs SAR ke IDR:</span>
          <div className="relative rounded-lg shadow-sm max-w-[150px]">
            <input
              type="number"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(Number(e.target.value))}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-gray-800"
            />
          </div>
          <button
            onClick={handleSaveExchangeRate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex items-center gap-1 shrink-0"
          >
            Update Kurs
          </button>
        </div>

        <button
          onClick={() => {
            setFormVehicleType('BUS');
            setFormVendor('TFA');
            setFormRoute('');
            setFormPrice(750);
            setIsAddOpen(true);
          }}
          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Transportasi Manual
        </button>
      </div>

      {/* Calculator Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-4">
          <Calculator className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-gray-900">Kalkulator Per Pax (Rupiah)</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kendaraan</label>
            <select 
              value={selectedVehicleId} 
              onChange={handleVehicleChange}
              className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-emerald-500"
            >
              {localTransport.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rute</label>
            <select 
              value={selectedRouteIndex} 
              onChange={(e) => setSelectedRouteIndex(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-emerald-500"
            >
              {selectedVehicle?.routes.map((r, idx) => (
                <option key={idx} value={idx}>{r.route} (SAR {r.price})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pax</label>
            <input 
              type="number" 
              min="1"
              value={paxCount} 
              onChange={(e) => setPaxCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-emerald-500"
            />
          </div>
        </div>
        
        <div className="bg-emerald-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          <div className="bg-white p-3 rounded-md shadow-sm border border-emerald-100">
            <p className="text-sm text-gray-500 mb-1">Total Harga (SAR)</p>
            <p className="text-xl font-bold text-gray-900">SAR {totalSar.toLocaleString()}</p>
          </div>
          <div className="bg-white p-3 rounded-md shadow-sm border border-emerald-100">
            <p className="text-sm text-gray-500 mb-1">Total Harga (IDR)</p>
            <p className="text-xl font-bold text-gray-900">Rp {totalIdr.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-white p-3 rounded-md shadow-sm border border-emerald-100">
            <p className="text-sm text-gray-500 mb-1">Harga Modal Per Pax (IDR)</p>
            <p className="text-xl font-bold text-gray-900">Rp {perPaxIdr.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-emerald-600 p-3 rounded-md shadow-sm text-white">
            <p className="text-sm text-emerald-100 mb-1">Harga Jual Per Pax (+40%)</p>
            <p className="text-2xl font-bold">Rp {sellingPricePerPaxIdr.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      </div>

      {/* Main Routes Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-sans">Daftar Lengkap Rute & Kendaraan</h2>
            <p className="text-sm text-gray-500 mt-1">Daftar tarif rute untuk semua tipe transportasi</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-semibold text-xs uppercase tracking-wider text-gray-500">Pilih Semua ({filteredFlatRoutes.length} Item)</span>
            </label>

            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
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
                <th scope="col" className="px-4 py-3">Kendaraan</th>
                <th scope="col" className="px-4 py-3">Rute</th>
                <th scope="col" className="px-4 py-3">Vendor</th>
                <th scope="col" className="px-4 py-3 text-right">Harga (SAR)</th>
                <th scope="col" className="px-4 py-3 text-right text-emerald-700 bg-emerald-50/50">Harga (IDR)</th>
                <th scope="col" className="px-4 py-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredFlatRoutes.map((item) => {
                const isSel = selectedIds.includes(item.id);
                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-emerald-50/30 transition-colors ${isSel ? 'bg-amber-50/60' : ''}`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-800">
                      {item.vehicleName}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.route}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 uppercase font-semibold">{item.namaVendor}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      SAR {item.price.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 bg-emerald-50/20">
                      Rp {(item.price * exchangeRate).toLocaleString('id-ID')}
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
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modals */}
      {(isAddOpen || isEditOpen) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg">
                {isAddOpen ? 'Tambah Transportasi Manual' : 'Edit Rute Transportasi'}
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tipe Kendaraan</label>
                <input
                  type="text"
                  value={formVehicleType}
                  onChange={(e) => setFormVehicleType(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Contoh: BUS, HIACE, STARIA, GMC"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor</label>
                <input
                  type="text"
                  value={formVendor}
                  onChange={(e) => setFormVendor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Contoh: TFA, Dharmawisata"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Rute</label>
                <input
                  type="text"
                  value={formRoute}
                  onChange={(e) => setFormRoute(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Contoh: Airport Jeddah - Hotel Makkah"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Harga (SAR)</label>
                <input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
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
