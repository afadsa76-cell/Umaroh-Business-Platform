import React, { useState, useEffect } from 'react';
import { db, auth, collection, query, where, onSnapshot } from '../../firebase';
import { 
  Sparkles, Copy, Check, Send, AlertCircle, RefreshCw, 
  FileText, Compass, Megaphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PackageItem {
  id: string;
  nama: string;
  type: 'master' | 'mitra';
  durasiHari: number;
  maskapaiId?: string;
  hargaQuad: number;
}

export const AIMarketingView: React.FC = () => {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [selectedPkgId, setSelectedPkgId] = useState('');
  const [targetChannel, setTargetChannel] = useState('WhatsApp Broadcast');
  const [tone, setTone] = useState('Inspirational & Persuasive');
  const [customInstructions, setCustomInstructions] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const userId = auth.currentUser?.uid;

  // Real-Time snapshot of packages to select from
  useEffect(() => {
    if (!userId) return;

    const qMaster = query(collection(db, 'paket_master'), where('status', '==', 'published'));
    const unsubscribeMaster = onSnapshot(qMaster, (snapshot) => {
      const masterItems = snapshot.docs.map(d => {
        const item = d.data();
        return {
          id: d.id,
          nama: item.nama || 'Paket Pusat',
          type: 'master' as const,
          durasiHari: Number(item.durasiHari) || 9,
          maskapaiId: item.maskapaiId || 'Saudi Arabian',
          hargaQuad: Number(item.hargaJualQuad || item.hargaDasar || 38000000),
        };
      });

      const qMitra = query(collection(db, 'paket_mitra'), where('mitraId', '==', userId));
      const unsubscribeMitra = onSnapshot(qMitra, (mitraSnap) => {
        const mitraItems = mitraSnap.docs.map(d => {
          const item = d.data();
          return {
            id: d.id,
            nama: item.namaPaketMitra || item.nama || 'Paket Kustom Saya',
            type: 'mitra' as const,
            durasiHari: Number(item.durasiHari) || 9,
            maskapaiId: item.maskapaiId || 'Saudi Arabian',
            hargaQuad: Number(item.hargaJualQuad || item.hargaQuad || 38000000),
          };
        });

        const combined = [...masterItems, ...mitraItems];
        setPackages(combined);
        if (combined.length > 0 && !selectedPkgId) {
          setSelectedPkgId(combined[0].id);
        }
      });

      return () => unsubscribeMitra();
    }, (error) => {
      console.error("Error fetching packages for AI copywriter:", error);
    });

    return () => unsubscribeMaster();
  }, [userId]);

  const handleGenerateCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkgId) {
      setErrorMsg('Pilih paket rujukan terlebih dahulu.');
      return;
    }

    setErrorMsg('');
    setIsGenerating(true);
    setGeneratedText('');

    const targetPkg = packages.find(p => p.id === selectedPkgId);

    try {
      const respond = await fetch('/api/ai/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName: targetPkg?.nama,
          targetChannel,
          tone,
          customInstructions,
          duration: targetPkg?.durasiHari,
          price: targetPkg?.hargaQuad,
          airline: targetPkg?.maskapaiId
        })
      });

      if (!respond.ok) {
        const bodyObj = await respond.json().catch(() => ({}));
        throw new Error(bodyObj.error || 'Gagal menghubungi asisten AI di server');
      }

      const body = await respond.json().catch(() => ({}));
      if (body.error) {
        throw new Error(body.error);
      }

      setGeneratedText(body.result || '');
    } catch (err) {
      const error = err as Error;
      console.error(error);
      setErrorMsg(error.message || 'Respons server mengalami gangguan.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToWhatsApp = () => {
    if (!generatedText) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(generatedText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="bg-[#1e1b4b] rounded-3xl p-6 text-white md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 shrink-0">
            <Sparkles className="w-8 h-8 text-amber-300 animate-pulse" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tight mb-1">
              AI MARKETING ASSISTANT
            </h2>
            <p className="text-xs font-bold text-indigo-200 uppercase tracking-[0.2em]">
              Asisten Copywriting bertenaga Gemini AI untuk merancang promosi dalam hitungan detik.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Hand: Controls Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-black text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-indigo-700">
              <Megaphone className="w-4 h-4" /> Atur Parameter Promosi
            </h3>
          </div>

          <form onSubmit={handleGenerateCopy} className="space-y-4">
            {/* Package selector */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Paket Rujukan Promosi
              </label>
              <select
                value={selectedPkgId}
                onChange={e => setSelectedPkgId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 focus:border-indigo-500 bg-white rounded-xl text-xs font-extrabold outline-none transition"
              >
                {packages.length === 0 ? (
                  <option value="">-- Belum ada Paket Aktif --</option>
                ) : (
                  packages.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.type === 'mitra' ? '[Markup Saya]' : '[Pusat]'} {p.nama}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Target Channel */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Platform Media / Saluran Pemasaran
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'WhatsApp Broadcast',
                  'Instagram Caption',
                  'Facebook Post',
                  'Flyer Promo Konten',
                  'Email Newsletter'
                ].map(channel => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => setTargetChannel(channel)}
                    className={`py-2 px-3 border rounded-xl font-bold text-[10px] uppercase text-left transition ${
                      targetChannel === channel 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-500 font-extrabold shadow-sm' 
                        : 'bg-white hover:bg-gray-50 text-gray-500 border-gray-200'
                    }`}
                  >
                    {channel === 'WhatsApp Broadcast' && '💬 '}
                    {channel === 'Instagram Caption' && '📸 '}
                    {channel === 'Facebook Post' && '👥 '}
                    {channel === 'Flyer Promo Konten' && '🖼️ '}
                    {channel === 'Email Newsletter' && '📧 '}
                    {channel}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone selector */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Tone / Gaya Bahasa
              </label>
              <select
                value={tone}
                onChange={e => setTone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 focus:border-indigo-500 bg-white rounded-xl text-xs font-extrabold outline-none transition"
              >
                <option value="Inspirational & Persuasive">Inspirational & Persuasive</option>
                <option value="Heartwarming & Spiritual">Spiritual & Menyentuh Hati</option>
                <option value="Urgent Promo/Diskon Terbatas">Urgent (Promo Terbatas & Diskon)</option>
                <option value="Elegant, Premium & Professional">Premium, Eksklusif & Professional</option>
                <option value="Casual & Friendly">Bebas, Ramah & Mengakar (Anak Muda)</option>
              </select>
            </div>

            {/* Special Instructions text area */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Target Khusus / Instruksi Tambahan (Opsional)
              </label>
              <textarea
                placeholder="Contoh: Tekankan keunggulan hotel yang sangat dekat dari Masjidil Haram, diskon khusus pendaftar minggu ini, atau nomor WA pendaftaran."
                value={customInstructions}
                onChange={e => setCustomInstructions(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 focus:border-indigo-500 rounded-xl text-xs font-semibold outline-none transition h-24"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-[11px] font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isGenerating || packages.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-extrabold text-xs uppercase py-3.5 rounded-xl transition shadow shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Merancang Salinan...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" /> Generate Copywriting AI
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Hand: Output Panel */}
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col h-full min-h-[400px]">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between mb-4">
            <h4 className="font-black text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-indigo-600">
              <FileText className="w-4 h-4" /> Hasil Copywriting AI
            </h4>
            
            {generatedText && (
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Salin Teks'}
                </button>

                <button
                  onClick={shareToWhatsApp}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  Bagikan ke WA
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 bg-gray-50/50 rounded-2xl p-5 border border-dashed border-gray-200 overflow-y-auto relative">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-white/80 backdrop-blur-xs rounded-2xl"
                >
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                  <p className="text-xs font-black text-gray-900 uppercase tracking-widest">
                    Gemini AI Sedang Merajut Kata...
                  </p>
                  <p className="text-[10px] text-gray-500 font-bold mt-1 max-w-xs">
                    Menganalisis parameter rujukan, merajut untaian emosional & detail paket wisata untuk hasil pemasaran terbaik.
                  </p>
                </motion.div>
              ) : generatedText ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-gray-800 font-medium leading-relaxed whitespace-pre-wrap select-all font-sans prose prose-indigo max-w-none"
                >
                  {generatedText}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-8"
                >
                  <Compass className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500">
                    Belum ada copywriting yang dihasilkan
                  </p>
                  <p className="text-[10px] max-w-xs font-semibold mt-1">
                    Atur setelan promosi di panel kiri kemudian klik tombol generate untuk memantulkan kreativitas kecerdasan buatan.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
