import React, { useState, useEffect } from 'react';
import { useKurs } from '../../hooks/useKurs';
import { Coins, RefreshCw, CheckCircle, AlertCircle, TrendingUp, Info, ShieldAlert, ArrowRightLeft } from 'lucide-react';
import { auth } from '../../firebase';

export const MasterKursView: React.FC = () => {
  const { kurs, loading, error, updateKurs } = useKurs();
  const [sarInput, setSarInput] = useState<string>('');
  const [usdInput, setUsdInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync inputs with Firestore data once loaded
  useEffect(() => {
    if (!loading && kurs) {
      setSarInput(kurs.sarToIdr.toString());
      setUsdInput(kurs.usdToIdr.toString());
    }
  }, [loading, kurs]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setValidationError(null);

    const sarNum = parseInt(sarInput);
    const usdNum = parseInt(usdInput);

    if (isNaN(sarNum) || sarNum <= 0) {
      setValidationError('Kurs Saudi Riyal (SAR) harus berupa angka positif.');
      return;
    }
    if (isNaN(usdNum) || usdNum <= 0) {
      setValidationError('Kurs US Dollar (USD) harus berupa angka positif.');
      return;
    }

    setIsSaving(true);
    try {
      const currentUser = auth.currentUser;
      const userEmail = currentUser?.email || 'admin@umaroh.com';
      await updateKurs(sarNum, usdNum, userEmail);
      setSuccessMsg('Master Kurs berhasil diperbarui dan disinkronkan ke seluruh sistem!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      console.error(err);
      setValidationError('Gagal memperbarui kurs ke database. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mb-3" />
        <p className="text-gray-500 font-medium">Memuat konfigurasi Master Kurs...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <Coins className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Master Kurs</h1>
          </div>
          <p className="text-gray-500 text-sm md:text-base">
            Konfigurasi pusat untuk nilai tukar mata uang asing ke Rupiah (IDR).
          </p>
        </div>
        
        {/* Connection Status Indicator */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Terhubung Real-Time</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>{error} (Menggunakan nilai default sistem).</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Hand: Live Rate Display Cards & Form */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Visual Current Rates Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* SAR card */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 text-emerald-200 opacity-20 transform -rotate-12">
                <Coins className="w-32 h-32" />
              </div>
              <div className="flex justify-between items-start mb-3">
                <span className="px-2.5 py-1 bg-emerald-200/60 text-emerald-900 rounded-full text-xs font-black tracking-wider">SAR / Riyal</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-950 font-mono tracking-tight mb-1">
                {formatCurrency(kurs.sarToIdr)}
              </div>
              <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                <span>1 SAR</span>
                <ArrowRightLeft className="w-3 h-3" />
                <span>Rupiah (IDR)</span>
              </div>
            </div>

            {/* USD card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 text-blue-200 opacity-20 transform -rotate-12">
                <Coins className="w-32 h-32" />
              </div>
              <div className="flex justify-between items-start mb-3">
                <span className="px-2.5 py-1 bg-blue-200/60 text-blue-900 rounded-full text-xs font-black tracking-wider">USD / Dollar</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-blue-950 font-mono tracking-tight mb-1">
                {formatCurrency(kurs.usdToIdr)}
              </div>
              <div className="text-[11px] text-blue-800 font-semibold flex items-center gap-1">
                <span>1 USD</span>
                <ArrowRightLeft className="w-3 h-3" />
                <span>Rupiah (IDR)</span>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>Perbarui Nilai Kurs Pusat</span>
            </h2>

            <form onSubmit={handleSave} className="space-y-5">
              
              {validationError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {successMsg && (
                <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-semibold">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Kurs SAR (Saudi Riyal) ke IDR
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-400 font-black text-xs">Rp</span>
                    </div>
                    <input
                      type="number"
                      required
                      value={sarInput}
                      onChange={(e) => setSarInput(e.target.value)}
                      placeholder="Contoh: 4900"
                      className="block w-full rounded-xl border border-gray-300 py-3 pl-9 pr-4 text-sm font-semibold text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Kurs USD (US Dollar) ke IDR
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-400 font-black text-xs">Rp</span>
                    </div>
                    <input
                      type="number"
                      required
                      value={usdInput}
                      onChange={(e) => setUsdInput(e.target.value)}
                      placeholder="Contoh: 20000"
                      className="block w-full rounded-xl border border-gray-300 py-3 pl-9 pr-4 text-sm font-semibold text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all duration-200 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Terapkan Master Kurs Baru</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Last Updated Meta */}
          {kurs.updatedAt && (
            <div className="text-[11px] text-gray-500 flex items-center gap-1.5 justify-center md:justify-start">
              <Info className="w-3.5 h-3.5 text-gray-400" />
              <span>Terakhir diperbarui pada {new Date(kurs.updatedAt).toLocaleString('id-ID')} oleh <strong className="text-gray-700">{kurs.updatedBy}</strong></span>
            </div>
          )}

        </div>

        {/* Right Hand: Documentation & Safeguard Panel */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Safeguard Alert Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <span>Sistem Proteksi Paket Lama</span>
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              Sistem secara otomatis menerapkan perlindungan data (data freeze). Perubahan pada nilai <strong>Master Kurs</strong> di atas:
            </p>
            <ul className="list-disc pl-4 text-xs text-amber-800 space-y-2">
              <li>
                <strong>Hanya berlaku</strong> untuk pembuatan paket baru, template visa/hotel baru, serta lembar kerja quotation baru.
              </li>
              <li>
                <strong>TIDAK AKAN</strong> mengubah harga atau memengaruhi perhitungan paket-paket yang sudah jadi, draf, maupun paket yang sudah dipublikasikan. Nilai kurs pada saat paket dibuat dibekukan secara permanen.
              </li>
            </ul>
          </div>

          {/* Integration Information */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Modul yang Terhubung
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 text-xs">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-800">Paket Master & Wizard</h4>
                  <p className="text-gray-500 mt-0.5">Semua kalkulasi HPP dan estimasi tiket maskapai (SAR) didasarkan pada kurs aktif.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-xs">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-800">Quotation Worksheet</h4>
                  <p className="text-gray-500 mt-0.5">Penawaran harga ke jamaah dalam IDR otomatis dikonversi menggunakan master kurs.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-xs">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-800">Template Price List</h4>
                  <p className="text-gray-500 mt-0.5">Sub-modul Visa, Hotel, Transportasi, Mutawif, dan Ziarah Tambahan menyerap konfigurasi ini sebagai default awal.</p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
