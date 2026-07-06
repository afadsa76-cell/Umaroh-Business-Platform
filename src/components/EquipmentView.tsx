import React, { useState, useMemo } from 'react';
import { Briefcase, Search, FileText, Save, RotateCcw, PlusCircle, Trash2, Edit, X, Sparkles, AlertCircle } from 'lucide-react';
import { equipmentData } from '../data/equipment';

export const EquipmentView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEquipment = equipmentData.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Master Description default state based on the provided images
  const defaultDesc = useMemo(() => ({
    full: {
      title: "PERLENGKAPAN UMROH (Eksklusif Umaroh)",
      subtitle: "Sebelum berangkat umroh sebaiknya siapkan perlengkapan yg wajib anda siapkan dan anda bawa agar memudahkan perjalanan ibadah mu",
      items: [
        "Koper Bagasi",
        "Koper Cabin",
        "Tas Slempang",
        "Blazer Batik",
        "Hijab/Scraft",
        "Sampul Paspor",
        "Name tag",
        "buku umroh",
        "Mukena/Kain Ihram",
        "Buku Doa",
        "Tag Koper",
        "Sampul Koper"
      ],
      note: "Perlengkapan diatas dapat disesuaikan dengan kebutuhan Bapak/Ibu mitra ketika membuat paket dan kebutuhan Calon Jamaah serta kami siapkan terpisah sesuai katagori kebutuhan."
    },
    aksesoris: {
      title: "Aksesoris Perlengkapan",
      items: [
        "Sampul Koper",
        "Sampul Paspor",
        "Tali ID Card",
        "Buku Do'a",
        "Blazer Batik",
        "Tag Koper"
      ]
    }
  }), []);

  const [description, setDescription] = useState(() => {
    const cached = localStorage.getItem('umaroh_db_equipment_deskripsi');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.full && Array.isArray(parsed.full.items) && parsed.aksesoris && Array.isArray(parsed.aksesoris.items)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse cached equipment description:', e);
      }
    }
    return defaultDesc;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [tempFullItems, setTempFullItems] = useState<string[]>([]);
  const [tempFullSubtitle, setTempFullSubtitle] = useState('');
  const [tempFullNote, setTempFullNote] = useState('');
  const [tempAksesorisItems, setTempAksesorisItems] = useState<string[]>([]);

  const startEditing = () => {
    setTempFullItems([...description.full.items]);
    setTempFullSubtitle(description.full.subtitle);
    setTempFullNote(description.full.note || '');
    setTempAksesorisItems([...description.aksesoris.items]);
    setIsEditing(true);
  };

  const handleSave = () => {
    const updated = {
      full: {
        title: description.full.title,
        subtitle: tempFullSubtitle.trim(),
        items: tempFullItems.map(item => item.trim()).filter(Boolean),
        note: tempFullNote.trim()
      },
      aksesoris: {
        title: description.aksesoris.title,
        items: tempAksesorisItems.map(item => item.trim()).filter(Boolean)
      }
    };
    setDescription(updated);
    localStorage.setItem('umaroh_db_equipment_deskripsi', JSON.stringify(updated));
    setIsEditing(false);
  };

  const handleReset = () => {
    if (confirm("Apakah Anda yakin ingin mengembalikan deskripsi perlengkapan ke default?")) {
      setDescription(defaultDesc);
      localStorage.setItem('umaroh_db_equipment_deskripsi', JSON.stringify(defaultDesc));
      if (isEditing) {
        setTempFullItems([...defaultDesc.full.items]);
        setTempFullSubtitle(defaultDesc.full.subtitle);
        setTempFullNote(defaultDesc.full.note);
        setTempAksesorisItems([...defaultDesc.aksesoris.items]);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-emerald-600" />
            Equipment & Supplies
          </h1>
          <p className="text-gray-500 mt-1">Kelola dan lihat harga paket perlengkapan umrah serta master deskripsi item</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Equipment Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Paket Perlengkapan</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Beli</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">17%</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Harga Jual</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Pembulatan Harga Jual</th>
              </tr>
            </thead>
            <tbody>
              {filteredEquipment.length > 0 ? (
                filteredEquipment.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`border-b border-gray-100 hover:bg-emerald-50/50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      Rp {item.basePrice.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      Rp {item.margin17.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      Rp {item.sellingPrice.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      Rp {item.roundedPrice.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada paket perlengkapan yang cocok dengan "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Database Master Deskripsi Perlengkapan (Based on Uploaded Flyer Layout) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-4 mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Database Master Deskripsi Perlengkapan</h2>
              <p className="text-xs text-gray-500">Sesuaikan item list bawaan untuk Paket Perlengkapan Umroh dan Aksesoris</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Simpan Deskripsi
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 sm:flex-initial bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  Batal
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={startEditing}
                  className="flex-1 sm:flex-initial bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Edit className="w-4 h-4" />
                  Edit Deskripsi
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 sm:flex-initial bg-gray-50 hover:bg-red-50 border border-gray-200 text-gray-600 hover:text-red-600 text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset ke Default
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Editing Full Perlengkapan */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200/80">
              <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">
                Edit {description.full.title}
              </h3>
              
              <div className="mb-4">
                <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Subtitle / Deskripsi Pembuka</label>
                <textarea
                  value={tempFullSubtitle}
                  onChange={(e) => setTempFullSubtitle(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  rows={2}
                />
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider">Item List Perlengkapan</label>
                  <button
                    onClick={() => setTempFullItems([...tempFullItems, ''])}
                    className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Tambah Item
                  </button>
                </div>
                
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {tempFullItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs font-bold w-6">{idx + 1}.</span>
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const next = [...tempFullItems];
                          next[idx] = e.target.value;
                          setTempFullItems(next);
                        }}
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                        placeholder="Nama perlengkapan..."
                      />
                      <button
                        onClick={() => {
                          const next = [...tempFullItems];
                          next.splice(idx, 1);
                          setTempFullItems(next);
                        }}
                        className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {tempFullItems.length === 0 && (
                    <p className="text-gray-400 text-xs italic text-center py-4">Belum ada item ditambahkan.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Catatan Kaki (Footer Note)</label>
                <textarea
                  value={tempFullNote}
                  onChange={(e) => setTempFullNote(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  rows={2}
                />
              </div>
            </div>

            {/* Editing Aksesoris */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200/80">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
                <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                  Edit {description.aksesoris.title}
                </h3>
                <button
                  onClick={() => setTempAksesorisItems([...tempAksesorisItems, ''])}
                  className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Tambah Item
                </button>
              </div>

              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {tempAksesorisItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs font-bold w-6">{idx + 1}.</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const next = [...tempAksesorisItems];
                        next[idx] = e.target.value;
                        setTempAksesorisItems(next);
                      }}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                      placeholder="Nama aksesoris..."
                    />
                    <button
                      onClick={() => {
                        const next = [...tempAksesorisItems];
                        next.splice(idx, 1);
                        setTempAksesorisItems(next);
                      }}
                      className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {tempAksesorisItems.length === 0 && (
                  <p className="text-gray-400 text-xs italic text-center py-4">Belum ada item ditambahkan.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* View Full Perlengkapan (Flyer Visual Layout) */}
            <div className="bg-amber-500/[0.02] border border-amber-500/15 rounded-[24px] p-6 relative overflow-hidden flex flex-col justify-between">
              {/* Top Banner Accent */}
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-400/5 rounded-full -mr-6 -mt-6 pointer-events-none"></div>
              
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-amber-100 pb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-wider">
                    {description.full.title}
                  </h3>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Flyer Image Container */}
                  <div 
                    onClick={() => setZoomImage("https://lh3.googleusercontent.com/d/1Z8WPQumBK99IDgkDFvnHc1LXxtULR8pO")}
                    className="lg:w-2/5 aspect-[4/3] lg:aspect-auto lg:h-[260px] rounded-xl overflow-hidden border border-amber-500/10 shadow-sm bg-white flex items-center justify-center cursor-zoom-in group relative"
                  >
                    <img 
                      src="https://lh3.googleusercontent.com/d/1Z8WPQumBK99IDgkDFvnHc1LXxtULR8pO" 
                      alt="Flyer Perlengkapan Umroh" 
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <span className="text-[9px] bg-white/95 text-gray-800 font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                        <Search className="w-2.5 h-2.5" /> Perbesar
                      </span>
                    </div>
                  </div>

                  {/* List Content */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-4 italic leading-relaxed border-l-2 border-amber-400/40 pl-3">
                        "{description.full.subtitle}"
                      </p>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        {description.full.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-gray-700 py-1 border-b border-gray-100/60">
                            <span className="text-amber-500 font-extrabold text-base leading-none">•</span>
                            <span className="font-medium">{item}</span>
                          </div>
                        ))}
                        {description.full.items.length === 0 && (
                          <p className="text-gray-400 text-xs italic col-span-2 text-center py-4">Belum ada item.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {description.full.note && (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex items-start gap-2.5 mt-4">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                    {description.full.note}
                  </p>
                </div>
              )}
            </div>

            {/* View Aksesoris Visual Layout */}
            <div className="bg-emerald-500/[0.02] border border-emerald-500/15 rounded-[24px] p-6 relative overflow-hidden flex flex-col justify-between">
              {/* Top Banner Accent */}
              <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-400/5 rounded-full -mr-6 -mt-6 pointer-events-none"></div>
              
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-emerald-100 pb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-wider">
                    {description.aksesoris.title}
                  </h3>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Flyer Image Container */}
                  <div 
                    onClick={() => setZoomImage("https://lh3.googleusercontent.com/d/1F8WMjYC0Hl8Okjf6K1_RNnAfNuAQoLTV")}
                    className="lg:w-2/5 aspect-[4/3] lg:aspect-auto lg:h-[260px] rounded-xl overflow-hidden border border-emerald-500/10 shadow-sm bg-white flex items-center justify-center cursor-zoom-in group relative"
                  >
                    <img 
                      src="https://lh3.googleusercontent.com/d/1F8WMjYC0Hl8Okjf6K1_RNnAfNuAQoLTV" 
                      alt="Flyer Aksesoris Perlengkapan" 
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <span className="text-[9px] bg-white/95 text-gray-800 font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                        <Search className="w-2.5 h-2.5" /> Perbesar
                      </span>
                    </div>
                  </div>

                  {/* List Content */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      {description.aksesoris.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-xs text-gray-700 py-1.5 px-3 bg-white border border-emerald-100/40 rounded-xl shadow-[0_2px_8px_rgba(16,185,129,0.02)]">
                          <span className="text-emerald-600 font-black text-[10px] bg-emerald-50 w-5 h-5 flex items-center justify-center rounded-md shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-medium">{item}</span>
                        </div>
                      ))}
                      {description.aksesoris.items.length === 0 && (
                        <p className="text-gray-400 text-xs italic text-center py-4">Belum ada item.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex items-start gap-2.5 mt-4">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-emerald-800 font-medium leading-relaxed">
                  Aksesoris eksklusif Umaroh dikemas dan dipersiapkan dengan kualitas bahan terbaik demi kenyamanan maksimal para jamaah selama di tanah suci.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Image Zoom Overlay Modal */}
      {zoomImage && (
        <div 
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center">
            <button 
              onClick={(e) => { e.stopPropagation(); setZoomImage(null); }}
              className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors border border-white/10 focus:outline-none"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={zoomImage} 
              alt="Flyer Expanded" 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};


