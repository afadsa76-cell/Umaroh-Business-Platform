import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Play, CheckCircle2, Lock, ExternalLink, 
  FileText, Award, Sparkles
} from 'lucide-react';
import { db, auth, doc, onSnapshot, updateDoc } from '../firebase';

interface ModulItem {
  id: number;
  title: string;
  desc: string;
  url?: string;
  completed: boolean;
  type: 'social' | 'link' | 'document' | 'template';
}

interface Module {
  id: number;
  title: string;
  subtitle: string;
  duration?: string;
  isUnlocked: boolean;
  videoUrl?: string;
  items: ModulItem[];
}

interface UserProfile {
  instagramHandle?: string;
  elearningProgress?: Record<string, boolean>;
}

export const ELearningMitraView = () => {
  const userId = auth.currentUser?.uid;
  const [currentUserData, setCurrentUserData] = useState<UserProfile | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<number>(1);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [instagramHandle, setInstagramHandle] = useState<string>('');
  const [showIgSuccess, setShowIgSuccess] = useState<boolean>(false);

  // Modular e-learning structures
  const [modules, setModules] = useState<Module[]>([
    {
      id: 1,
      title: 'Modul 1 – Persiapan Mitra sebagai Business Owner',
      subtitle: 'Mempersiapkan fondasi digital, legal, dan operasional sebelum mulai memasarkan paket.',
      duration: '15 Menit',
      isUnlocked: true,
      videoUrl: 'https://pageb.uk/Modul1',
      items: [
        {
          id: 1,
          title: 'Media Sosial Brand (Minimal Instagram)',
          desc: 'Membuat akun media sosial brand yang profesional demi membangun reputasi dan trust dari calon jamaah.',
          completed: false,
          type: 'social'
        },
        {
          id: 2,
          title: 'Akses & Simpan Link Bank Konten',
          desc: 'Menyimpan dan memahami penggunaan Bank Konten umrah yang berisi asset desain, video reels, bumbu copywriting, dan materi promosi siap pakai.',
          url: 'https://pageb.uk/BankKonten',
          completed: false,
          type: 'link'
        },
        {
          id: 3,
          title: 'Template Syarat & Ketentuan (Terms & Conditions)',
          desc: 'Membuat dokumen hitam-di-atas-putih menggunakan kop surat brand masing-masing sebagai rujukan aturan pendaftaran, pembatalan, dan hak jamaah.',
          url: 'https://pagea.uk/TermCondition',
          completed: false,
          type: 'document'
        },
        {
          id: 4,
          title: 'Template Invoice Jamaah',
          desc: 'Membuat format invoice tagihan pembayaran umrah resmi yang disesuaikan dengan standar umaroh.com untuk keprofesionalan transaksi Anda.',
          url: 'https://pagea.uk/InvoiceJamaah',
          completed: false,
          type: 'template'
        },
        {
          id: 5,
          title: 'Template Formulir Jamaah',
          desc: 'Menyiapkan formulir pendaftaran fisik atau digital untuk mengumpulkan detail informasi nama paspor, riwayat penyakit, dan kebutuhan khusus mereka.',
          url: 'https://pagea.uk/FormulirJamaah',
          completed: false,
          type: 'template'
        },
        {
          id: 6,
          title: 'Panduan Contoh Scan Dokumen',
          desc: 'Menyediakan lampiran panduan visual tentang kriteria scan paspor, buku kuning meningitis, dan KTP yang layak agar tidak ditolak maskapai.',
          url: 'https://pagea.uk/PanduanDokumenJamaah',
          completed: false,
          type: 'document'
        }
      ]
    },
    {
      id: 2,
      title: 'Modul 2 – Strategi Pemasaran Digital & Social Media Organik',
      subtitle: 'Membahas cara closing cepat tanpa boncos lewat optimasi Instagram Organik, WhatsApp Marketing, dan personal branding.',
      isUnlocked: false,
      items: []
    },
    {
      id: 3,
      title: 'Modul 3 – Manajemen Hubungan Pelanggan (CRM) & Teknik Closing',
      subtitle: 'Seni menangani penolakan harga, merespon calon jamaah ragu, dan mengirim penawaran follow-up agar berakhir dengan DP.',
      isUnlocked: false,
      items: []
    },
    {
      id: 4,
      title: 'Modul 4 – Skalabilitas Bisnis Umrah Agen ke Travel Mandiri',
      subtitle: 'Memahami ekosistem perizinan kementerian agama PPIU, sistem deposit seat maskapai, serta pembagian komisi berjenjang.',
      isUnlocked: false,
      items: []
    }
  ]);

  // Load user data & saved e-learning progress
  useEffect(() => {
    if (!userId) return;

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCurrentUserData(data);
        if (data.instagramHandle) {
          setInstagramHandle(data.instagramHandle);
        }
        
        // Progress formatting: elearningProgress as map of itemId -> boolean
        if (data.elearningProgress) {
          setModules(prev => prev.map(mod => {
            if (mod.id === 1) {
              return {
                ...mod,
                items: mod.items.map(item => ({
                  ...item,
                  completed: !!data.elearningProgress[`item_${item.id}`]
                }))
              };
            }
            return mod;
          }));
        }
      }
    });

    return () => unsubscribe();
  }, [userId]);

  // Handle single item completion toggle
  const handleToggleItem = async (itemId: number) => {
    if (!userId) return;

    const currentProgress = currentUserData?.elearningProgress || {};
    const itemKey = `item_${itemId}`;
    const newStatus = !currentProgress[itemKey];

    const updatedProgress = {
      ...currentProgress,
      [itemKey]: newStatus
    };

    try {
      await updateDoc(doc(db, 'users', userId), {
        elearningProgress: updatedProgress
      });
    } catch (err) {
      console.error('Gagal memperbarui progress belajar:', err);
    }
  };

  const handleSaveInstagram = async () => {
    if (!userId) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        instagramHandle: instagramHandle
      });
      setShowIgSuccess(true);
      setTimeout(() => setShowIgSuccess(false), 3000);
      
      // Auto-mark item 1 as completed if instagram handle is added
      const currentProgress = currentUserData?.elearningProgress || {};
      if (!currentProgress['item_1']) {
        await updateDoc(doc(db, 'users', userId), {
          'elearningProgress.item_1': true
        });
      }
    } catch (err) {
      console.error('Gagal menyimpan instagram handle:', err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  // Counting completions
  const modul1 = modules.find(m => m.id === 1);
  const totalItemsCount = modul1?.items.length || 6;
  const completedCount = modul1?.items.filter(i => i.completed).length || 0;
  const percentCompleted = Math.round((completedCount / totalItemsCount) * 100);

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-[#033420] to-[#0a5734] text-white rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-white/5 blur-xl pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 translate-y-8 w-48 h-48 rounded-full bg-[#055734]/40 blur-lg pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
              <Award className="w-3.5 h-3.5 text-emerald-405" /> DIGITAL PORTAL AKADEMI
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Kemitraan E-Learning</h1>
            <p className="text-xs md:text-sm text-emerald-200/90 leading-relaxed font-medium">
              Eksklusif dibuat untuk Mitra Resmi <strong className="text-white hover:underline">Umaroh.com</strong>. Pelajari bekal skill bisnis, digital copywriting, dan legalitas terbaik untuk melesatkan penjualan paket umrah kreasi brand Anda.
            </p>
          </div>

          {/* Progress Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 min-w-[200px] text-center self-start md:self-auto relative">
            <div className="text-[10px] text-emerald-300 font-extrabold uppercase tracking-wider mb-2">PROGRESS MODUL 1</div>
            <div className="text-3xl font-black italic text-emerald-450 flex justify-center items-baseline gap-1">
              {percentCompleted}<span className="text-xs text-emerald-300">%</span>
            </div>
            
            <div className="w-full bg-white/20 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="h-full bg-emerald-450 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${percentCompleted}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-emerald-100 font-semibold mt-2">
              {completedCount} dari {totalItemsCount} Langkah Selesai
            </div>
            {percentCompleted === 100 && (
              <span className="absolute -top-3 -right-3 bg-amber-405 text-stone-900 font-black text-[9px] px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 leading-none uppercase tracking-widest animate-pulse">
                <Sparkles className="w-3 h-3 text-stone-900" /> COMPLETE
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar Mini - Module List */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-black tracking-widest text-gray-400 uppercase">Kurikulum & Daftar Modul</h2>
          <div className="space-y-3">
            {modules.map((mod) => (
              <button
                key={mod.id}
                onClick={() => {
                  if (mod.isUnlocked) {
                    setActiveModuleId(mod.id);
                  }
                }}
                disabled={!mod.isUnlocked}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                  activeModuleId === mod.id
                    ? 'bg-emerald-50/50 border-[#055734] ring-1 ring-[#055734]/30'
                    : mod.isUnlocked
                      ? 'bg-white border-gray-150 hover:bg-gray-50'
                      : 'bg-gray-50 border-gray-150 cursor-not-allowed opacity-75'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 rounded-xl p-2 shrink-0 ${
                    activeModuleId === mod.id
                      ? 'bg-[#055734] text-white'
                      : mod.isUnlocked
                        ? 'bg-emerald-50 text-emerald-850'
                        : 'bg-gray-100 text-gray-400'
                  }`}>
                    {mod.isUnlocked ? (
                      <BookOpen className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${
                        activeModuleId === mod.id ? 'text-[#055734]' : 'text-gray-400'
                      }`}>
                        MODUL {mod.id}
                      </span>
                      {mod.id === 1 && percentCompleted === 100 && (
                        <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded uppercase">LULUS</span>
                      )}
                      {!mod.isUnlocked && (
                        <span className="text-[8px] bg-red-100 text-red-850 font-extrabold px-1.5 py-0.5 rounded uppercase">BERSAMBUNG</span>
                      )}
                    </div>
                    <h3 className={`text-xs font-bold leading-snug truncate ${
                      activeModuleId === mod.id ? 'text-gray-900 font-extrabold' : 'text-gray-700'
                    }`}>
                      {mod.title.split(' – ')[1] || mod.title}
                    </h3>
                    <p className="text-[10px] text-gray-500 line-clamp-2">
                      {mod.subtitle}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Core Detail Workspace Area */}
        <div className="lg:col-span-8 space-y-6">
          {activeModuleId === 1 && modul1 && (
            <div className="space-y-6">
              {/* Premium Interactive Video Player Card */}
              <div className="bg-white rounded-3xl border border-gray-150 p-6 overflow-hidden relative shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-5 pb-4 border-b border-gray-100">
                  <div className="space-y-1">
                    <h1 className="text-base font-extrabold text-gray-900 italic">Materi Video Pendamping</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">TONTON video bimbingan Modul 1 sampai tamat</p>
                  </div>
                  <a 
                    href="https://pageb.uk/Modul1" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#055734] hover:bg-[#034428] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition duration-150 shadow-sm"
                  >
                    Buka Video Langsung <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Simulated Custom Video Frame with Umaroh Aesthetics */}
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-stone-900 border border-stone-800 group group-hover:scale-[1.01] transition-transform shadow-inner flex flex-col justify-between p-6">
                  {/* Backdrop artwork */}
                  <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.85)), url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200')" }}></div>
                  
                  {/* Top bar info */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="bg-[#055734]/90 backdrop-blur-md px-3 py-1 rounded-xl border border-emerald-500/15 text-[9px] font-extrabold uppercase tracking-widest text-[#00B47A]">
                      ONLINE LESSON 1.1
                    </span>
                    <span className="text-[10px] font-bold text-emerald-300 drop-shadow-sm flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> FULL VIDEO GUIDE
                    </span>
                  </div>

                  {/* Play & Center controls */}
                  <div className="relative z-10 self-center flex flex-col items-center gap-3">
                    <a 
                      href="https://pageb.uk/Modul1" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-16 h-16 rounded-full bg-[#055734] text-white flex items-center justify-center shadow-xl shadow-stone-950/40 hover:bg-[#034428] transform hover:scale-110 active:scale-95 transition cursor-pointer"
                    >
                      <Play className="w-8 h-8 fill-white ml-1 text-white" />
                    </a>
                    <span className="text-white text-xs font-black shadow-slate-900/40 drop-shadow uppercase tracking-wider">
                      Umaroh Academy: Persiapan Owner (14:35)
                    </span>
                  </div>

                  {/* Bottom Video HUD progress look */}
                  <div className="relative z-10 space-y-2">
                    <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                      <div className="w-1/3 h-full bg-[#00B47A]"></div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-mono font-bold text-gray-300 drop-shadow">
                      <span>04:12 / 14:35</span>
                      <span>HD 1080p</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checklist Tasks Area */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-extrabold text-gray-900 italic">Daftar Langkah Persiapan</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selesaikan seluruh 6 langkah di bawah ini untuk memulai bisnis</p>
                  </div>
                  <span className="text-xs bg-emerald-50 text-[#055734] font-black px-2.5 py-1 rounded-xl">
                    {completedCount} / 6 SELESAI
                  </span>
                </div>

                {/* Steps Accordion & Detail */}
                <div className="space-y-4">
                  {modul1.items.map((item, index) => (
                    <div 
                      key={item.id}
                      className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden ${
                        item.completed 
                          ? 'border-emerald-150/80 bg-emerald-50/10' 
                          : 'border-gray-150 hover:border-gray-300'
                      }`}
                    >
                      {/* Accordion Header */}
                      <div className="p-5 flex items-start gap-4 justify-between">
                        <div className="flex items-start gap-4">
                          {/* Checked Icon Interactive */}
                          <button
                            onClick={() => handleToggleItem(item.id)}
                            className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all outline-none shrink-0 border ${
                              item.completed
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-gray-300 bg-white hover:border-[#055734]'
                            }`}
                          >
                            {item.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            ) : (
                              <div className="w-2.5 h-2.5 rounded-full bg-transparent hover:bg-gray-100"></div>
                            )}
                          </button>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-extrabold text-[#055734] bg-emerald-50 px-1.5 py-0.5 rounded leading-none uppercase">Langkah {index + 1}</span>
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{item.type}</span>
                            </div>
                            <h3 className={`text-sm font-extrabold leading-snug text-gray-900 italic ${item.completed ? 'line-through text-gray-400' : ''}`}>
                              {item.title}
                            </h3>
                            <p className="text-xs text-gray-500 max-w-2xl font-normal leading-relaxed">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Section for Custom Step Actions */}
                      <div className="px-5 pb-5 pt-0 border-t border-gray-50 bg-gray-50/40 flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Custom Form or Action Area depending on Step */}
                        <div className="w-full md:w-auto">
                          {item.id === 1 && (
                            <div className="flex items-center gap-2 w-full max-w-md">
                              <span className="text-gray-400 font-bold text-xs italic">@</span>
                              <input 
                                type="text"
                                placeholder="Media sosial brand (contoh: @kurnia_travel)"
                                value={instagramHandle}
                                onChange={(e) => setInstagramHandle(e.target.value)}
                                className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-[#055734] outline-none"
                              />
                              <button
                                onClick={handleSaveInstagram}
                                className="px-3 py-1.5 bg-[#055734] text-white rounded-xl text-xs font-black uppercase hover:bg-[#034428] transition"
                              >
                                Simpan
                              </button>
                              {showIgSuccess && (
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 animate-pulse">Saved!</span>
                              )}
                            </div>
                          )}

                          {item.id !== 1 && (
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                              <FileText className="w-4 h-4 text-[#055734]" />
                              <span>Sertifikat & File Template Sah</span>
                            </div>
                          )}
                        </div>

                        {/* Document Download / Action buttons */}
                        {item.url && (
                          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto w-full md:w-auto justify-end">
                            <button
                              onClick={() => copyToClipboard(item.url || '', `link-${item.id}`)}
                              className="px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-500 flex items-center gap-1.5 transition active:scale-95 cursor-pointer min-w-[100px] justify-center"
                            >
                              <span>{copiedLink === `link-${item.id}` ? 'Tersalin ✔' : 'Salin Link'}</span>
                            </button>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#055734] border border-emerald-150 rounded-xl text-xs font-black flex items-center gap-1.5 transition active:scale-95 uppercase tracking-wider"
                            >
                              Buka Dokumen <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Module Footer Summary Advice */}
              <div className="bg-emerald-50/30 border border-emerald-150 rounded-3xl p-6 flex items-start gap-4">
                <div className="bg-emerald-150 p-2.5 rounded-2xl text-[#055734] mt-0.5 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-black text-emerald-950 uppercase tracking-wider">PENTING SEBELUM MEMASARKAN</h4>
                  <p className="text-xs text-emerald-800 leading-relaxed font-normal">
                    Seluruh poin bimbingan wajib di atas merupakan fondasi awal yang wajib dipersiapkan mitra sebelum menjalankan aktivitas pemasaran dan pelayanan jamaah. Jika Anda menemukan kesulitan teknis, Anda dapat berdiskusi langsung di menu <strong>Diskusikan Chat Mitra & Admin</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeModuleId !== 1 && (
            <div className="bg-white rounded-3xl border border-gray-150 p-12 text-center shadow-sm">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-slate-400" />
              </div>
              <h1 className="text-xl font-extrabold text-gray-900 mb-2">Modul Segera Hadir</h1>
              <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed mb-6 font-medium">
                Penyusun tim kurikulum Umaroh.com sedang memperbarui materi visual, tips video, dan format checklist terstruktur untuk modul ini. Hubungi admin untuk informasi rilis.
              </p>
              <button 
                onClick={() => setActiveModuleId(1)}
                className="px-4 py-2 bg-[#055734] hover:bg-[#034428] text-white text-xs font-black tracking-widest uppercase rounded-xl transition"
              >
                Kembali ke Modul 1
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
