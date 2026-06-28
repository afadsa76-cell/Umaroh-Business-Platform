import React from 'react';
import { Search, CheckCircle2, Calendar, Plane, Clock, Star, Share2, Trash2, Edit2, ChevronRight, Building2, Users, Minus, Plus, ArrowRight, ArrowLeft, X, Upload } from 'lucide-react';
import { db, auth, collection, onSnapshot, query, where, addDoc, serverTimestamp, deleteDoc, doc, handleFirestoreError, OperationType } from '../firebase';
import { syncBookingToTracker } from '../utils/firebaseSync';
import { PaketMaster, Maskapai, Hotel } from '../types';
import { PaketDetailView } from './PaketDetailView';

interface PaketMitra {
  id: string;
  paketMasterId: string;
  mitraId: string;
  namaPaketMitra: string;
  markup: number;
  hargaJual: number;
  status: string;
}

interface DisplayPaket {
  id: string;
  type: string;
  displayName: string;
  displayPrice: number;
  deskripsi: string;
  tglBerangkat?: string;
  durasiHari?: number;
  maskapaiId?: string;
  sisaKuota?: number;
  paketMasterId?: string;
  mitraId?: string;
  hargaDasar?: number;
  hargaJual?: number;
  hargaJualQuad?: number;
  hargaJualTriple?: number;
  hargaJualDouble?: number;
  status?: string;
}

interface KatalogPaketViewProps {
  initialSearch?: string;
  onViewMitra?: (mitraId: string) => void;
}

interface ManifestInput {
  title: string;
  namaLengkap: string;
  nik: string;
  nama_paspor: string;
  no_paspor: string;
  tanggal_lahir: string;
  tempat_lahir: string;
  tgl_issue_paspor: string;
  tgl_exp_paspor: string;
  kota_paspor: string;
  kewarganegaraan: string;
  telepon: string;
  emergency_contact: string;
  filePassport?: string;
  fileKtp?: string;
  fileVaccine?: string;
  fileFoto?: string;
  fileKk?: string;
}

export const KatalogPaketView = ({ initialSearch = '', onViewMitra }: KatalogPaketViewProps) => {
  const [paketMasters, setPaketMasters] = React.useState<PaketMaster[]>([]);
  const [paketMitras, setPaketMitras] = React.useState<PaketMitra[]>([]);
  const [agencies, setAgencies] = React.useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = React.useState(initialSearch);
  const [showExpired, setShowExpired] = React.useState(false);
  const [selectedPaket, setSelectedPaket] = React.useState<DisplayPaket | null>(null);
  const [bookingSuccess, setBookingSuccess] = React.useState(false);
  const [viewingDetail, setViewingDetail] = React.useState<PaketMaster | null>(null);
  const [hotels, setHotels] = React.useState<Hotel[]>([]);
  const [maskapai, setMaskapai] = React.useState<Maskapai[]>([]);
  
  const [selectedRoomType, setSelectedRoomType] = React.useState<'quad' | 'triple' | 'double'>('quad');
  const [paxCount, setPaxCount] = React.useState<number>(1);
  const [bookingStep, setBookingStep] = React.useState<'config' | 'manifest' | 'payment'>('config');
  const [manifests, setManifests] = React.useState<ManifestInput[]>([]);
  const [activePaxTab, setActivePaxTab] = React.useState<number>(0);
  const [showExampleModal, setShowExampleModal] = React.useState(false);
  const [showTermsModal, setShowTermsModal] = React.useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<'lunas' | 'dp' | 'cicilan' | 'va'>('lunas');
  const [vaAmount, setVaAmount] = React.useState<number>(5000000);
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);
  const [signatureData, setSignatureData] = React.useState<string>('');
  const [buktiTransfer, setBuktiTransfer] = React.useState<string>('');
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [hasSigned, setHasSigned] = React.useState(false);

  React.useEffect(() => {
    if (selectedPaket) {
      setBookingStep('config');
      setSelectedRoomType('quad');
      setPaxCount(1);
      setActivePaxTab(0);
      setSelectedPaymentMethod('lunas');
      setVaAmount(5000000);
      setAgreedToTerms(false);
      setSignatureData('');
      setBuktiTransfer('');
      setHasSigned(false);
      setIsDrawing(false);
      setShowTermsModal(false);
    }
  }, [selectedPaket]);

  React.useEffect(() => {
    setManifests(prev => {
      const newManifests = [...prev];
      if (newManifests.length < paxCount) {
        for (let i = newManifests.length; i < paxCount; i++) {
          newManifests.push({
            title: 'MR',
            namaLengkap: '',
            nik: '',
            nama_paspor: '',
            no_paspor: '',
            tanggal_lahir: '',
            tempat_lahir: '',
            tgl_issue_paspor: '',
            tgl_exp_paspor: '',
            kota_paspor: '',
            kewarganegaraan: 'WNI',
            telepon: '',
            emergency_contact: ''
          });
        }
      } else if (newManifests.length > paxCount) {
        newManifests.splice(paxCount);
      }
      return newManifests;
    });
  }, [paxCount]);

  const userId = auth.currentUser?.uid;
  const [currentUserRole, setCurrentUserRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId) return;
    const unsubUser = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserRole(docSnap.data().role || 'jamaah');
      }
    });
    return () => unsubUser();
  }, [userId]);

  const handleOpenDetail = (paket: DisplayPaket) => {
    const master = paketMasters.find(m => m.id === paket.paketMasterId || m.id === paket.id);
    if (master) {
      const merged = {
        ...master,
        nama: paket.displayName || master.nama,
        hargaJualQuad: paket.hargaJualQuad || master.hargaJualQuad,
        hargaJualTriple: paket.hargaJualTriple || master.hargaJualTriple,
        hargaJualDouble: paket.hargaJualDouble || master.hargaJualDouble,
        mitraId: paket.mitraId || master.mitraId || null,
        customPaketId: paket.id,
        isMitraPaket: paket.type === 'mitra'
      };
      setViewingDetail(merged as unknown as PaketMaster);
    }
  };

  React.useEffect(() => {
    setSearchTerm(initialSearch);
  }, [initialSearch]);

  React.useEffect(() => {
    // Fetch users for mitra/partner agency mapping (querying specifically where role == 'mitra' to avoid permission-denied for jamaah)
    const qUsers = query(collection(db, 'users'), where('role', '==', 'mitra'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const agencyMap: Record<string, string> = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        agencyMap[docSnap.id] = data.brandName || data.namaLengkap || data.nama || 'Umaroh';
      });
      setAgencies(agencyMap);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // Fetch published & archived Paket Master
    const qMaster = query(collection(db, 'paket_master'));
    const unsubMaster = onSnapshot(qMaster, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as PaketMaster))
        .filter(p => p.status === 'published' || p.status === 'archived');
      setPaketMasters(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'paket_master');
    });

    // Fetch active Paket Mitra
    const qMitra = query(collection(db, 'paket_mitra'), where('status', '==', 'active'));
    const unsubMitra = onSnapshot(qMitra, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaketMitra));
      setPaketMitras(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'paket_mitra');
    });

    // Fetch Hotels & Maskapai for detail view
    const unsubHotels = onSnapshot(collection(db, 'master_hotels'), (snapshot) => {
      setHotels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as Hotel));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'master_hotels');
    });

    const unsubMaskapai = onSnapshot(collection(db, 'maskapai'), (snapshot) => {
      setMaskapai(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as Maskapai));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'maskapai');
    });

    return () => {
      unsubUsers();
      unsubMaster();
      unsubMitra();
      unsubHotels();
      unsubMaskapai();
    };
  }, []);

  const renderTermsModal = () => {
    if (!showTermsModal) return null;

    return (
      <div 
        className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-3 md:p-4 overflow-y-auto"
        style={{ zIndex: 10000 }}
      >
        <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">
                SYARAT & KETENTUAN
              </h3>
              <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest mt-1">
                BACA S&K & TANDA TANGAN DIGITAL
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="w-8 h-8 rounded-full bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-all border border-slate-150 shadow-xxs cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin text-slate-800">
            {/* T&C Text */}
            <div className="space-y-3">
              <span className="block text-[9px] font-black text-slate-400 tracking-wider uppercase">Ketentuan Pembayaran & Pembatalan:</span>
              <div className="h-44 overflow-y-auto bg-slate-50 border border-slate-150 rounded-2xl p-3.5 text-[10px] text-slate-650 space-y-2.5 leading-relaxed font-sans scrollbar-thin">
                <p className="font-bold text-slate-800">MOHON BACA SYARAT & KETENTUAN BERIKUT SEBELUM MEMBAYAR:</p>
                <p>1. Seluruh transaksi pembayaran yang sah hanya ditujukan ke rekening Bank Syariah Indonesia (BSI) PT Nawaitul Umrah Haji atau Virtual Account resmi.</p>
                <p>2. Bukti transfer yang Anda unggah akan diverifikasi oleh bagian keuangan kami dalam waktu maksimal 1x24 jam.</p>
                <p>3. Uang muka (DP) minimal sebesar Rp 5.000.000 per pax bersifat mengikat seat keberangkatan Anda.</p>
                <p>4. Sisa tagihan pelunasan paket umrah wajib diselesaikan paling lambat 45 hari sebelum tanggal jadwal keberangkatan.</p>
                <p>5. Pembatalan pendaftaran sepihak akan dikenakan potongan administrasi sesuai syarat & ketentuan pembatalan regulasi asosiasi penyelenggara umrah.</p>
              </div>
            </div>

            {/* Signature Area */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <div>
                  <span className="block text-[9px] font-black text-slate-800 tracking-wider uppercase">Tanda Tangan Digital Jamaah *</span>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Goreskan tanda tangan Anda di area putih di bawah</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const canvas = canvasRef.current;
                    if (canvas) {
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        setHasSigned(false);
                        setSignatureData('');
                      }
                    }
                  }}
                  className="text-[8px] font-black text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-100 transition-all uppercase tracking-widest cursor-pointer"
                >
                  BERSIHKAN
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-inner relative">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  onMouseDown={(e) => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const ctx = canvas.getContext('2d');
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    if (!ctx) return;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = '#1e293b';
                    setIsDrawing(true);
                  }}
                  onMouseMove={(e) => {
                    if (!isDrawing) return;
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const ctx = canvas.getContext('2d');
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    if (!ctx) return;
                    ctx.lineTo(x, y);
                    ctx.stroke();
                    setHasSigned(true);
                  }}
                  onMouseUp={() => {
                    setIsDrawing(false);
                    const canvas = canvasRef.current;
                    if (canvas) setSignatureData(canvas.toDataURL());
                  }}
                  onMouseLeave={() => {
                    if (isDrawing) {
                      setIsDrawing(false);
                      const canvas = canvasRef.current;
                      if (canvas) setSignatureData(canvas.toDataURL());
                    }
                  }}
                  onTouchStart={(e) => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const ctx = canvas.getContext('2d');
                    const rect = canvas.getBoundingClientRect();
                    if (e.touches.length === 0) return;
                    const x = e.touches[0].clientX - rect.left;
                    const y = e.touches[0].clientY - rect.top;
                    if (!ctx) return;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = '#1e293b';
                    setIsDrawing(true);
                  }}
                  onTouchMove={(e) => {
                    if (!isDrawing) return;
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const ctx = canvas.getContext('2d');
                    const rect = canvas.getBoundingClientRect();
                    if (e.touches.length === 0) return;
                    const x = e.touches[0].clientX - rect.left;
                    const y = e.touches[0].clientY - rect.top;
                    if (!ctx) return;
                    ctx.lineTo(x, y);
                    ctx.stroke();
                    setHasSigned(true);
                  }}
                  onTouchEnd={() => {
                    setIsDrawing(false);
                    const canvas = canvasRef.current;
                    if (canvas) setSignatureData(canvas.toDataURL());
                  }}
                  className="w-full h-36 cursor-crosshair touch-none bg-white"
                />
              </div>
            </div>

            {/* Checkbox agreement */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100 p-3 rounded-2xl border border-slate-150 shadow-xxs transition-all">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4.5 h-4.5 cursor-pointer"
                />
                <span className="text-[9px] font-black text-slate-700 uppercase tracking-tight leading-normal select-none">
                  Saya menyatakan telah membaca, memahami, dan menyetujui seluruh Syarat & Ketentuan pembayaran di atas.
                </span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setAgreedToTerms(false);
                setHasSigned(false);
                setSignatureData('');
                setShowTermsModal(false);
              }}
              className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!agreedToTerms || !hasSigned}
              onClick={() => {
                setShowTermsModal(false);
              }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center ${
                agreedToTerms && hasSigned
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md shadow-emerald-600/10'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-250'
              }`}
            >
              Setujui & Simpan
            </button>
          </div>

        </div>
      </div>
    );
  };

  const renderExampleModal = () => {
    if (!showExampleModal) return null;

    return (
      <div 
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        style={{ zIndex: 9999 }}
      >
        <div className="bg-slate-50 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative border border-white animate-in zoom-in duration-200">
          
          {/* Close Button */}
          <button
            type="button"
            onClick={() => setShowExampleModal(false)}
            className="absolute top-4 right-4 w-9 h-9 bg-white hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-800 shadow-sm border border-slate-100 transition-colors cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Poster Body */}
          <div className="p-6 md:p-8 font-sans bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] flex flex-col items-center">
            
            {/* Header with Brand & Title */}
            <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 text-center sm:text-left">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                  REGISTRASI &
                </h2>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none uppercase mt-1">
                  PENDAFTARAN
                </h2>
              </div>
              
              {/* Logo Badge */}
              <div className="flex items-center gap-1.5 bg-white p-1.5 px-3 rounded-full border border-slate-150 shadow-xs shrink-0">
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white font-black text-[10px]">
                    U
                  </div>
                  <span className="text-[11px] font-black text-slate-800 tracking-tight">umaroh</span>
                </div>
                <div className="w-[1px] h-3.5 bg-slate-200 mx-1" />
                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wide">
                  Supported PPIU.28092200496140003
                </span>
              </div>
            </div>

            {/* Inner Poster Card with Grid of Documents */}
            <div className="bg-white border border-slate-150 rounded-[28px] p-5 w-full shadow-md space-y-6">
              
              {/* Row 1: Passport, KTP, Photo */}
              <div className="grid grid-cols-3 gap-3">
                {/* Scan Passport */}
                <div className="flex flex-col items-center">
                  <div className="w-full aspect-[4/3] bg-orange-50 border border-orange-100 rounded-lg p-1.5 flex flex-col justify-between shadow-xs relative overflow-hidden">
                    <div className="w-1.5 h-full bg-rose-500/10 absolute left-0 top-0" />
                    <div className="text-[6px] font-mono text-slate-400 text-right">AA000000</div>
                    <div className="flex gap-1 items-center justify-center my-auto">
                      <div className="w-5 h-7 bg-rose-200/60 rounded-xs border border-rose-300 flex flex-col p-0.5 justify-between shadow-xxs">
                        <div className="w-full h-1 bg-emerald-500/20 rounded-xs" />
                        <div className="w-2.5 h-3 bg-slate-300 rounded-xs self-end" />
                      </div>
                      <div className="w-6 h-7 bg-orange-100 rounded-xs border border-orange-200 flex flex-col p-1 justify-between shadow-xxs">
                        <div className="w-full h-0.5 bg-slate-300 rounded-xs" />
                        <div className="w-full h-0.5 bg-slate-300 rounded-xs" />
                        <div className="w-full h-0.5 bg-slate-300 rounded-xs" />
                        <div className="w-full h-0.5 bg-slate-300 rounded-xs" />
                      </div>
                    </div>
                    <div className="text-[5px] font-black text-amber-700 uppercase tracking-widest text-center">PASSPORT</div>
                  </div>
                  <span className="text-[9px] font-black text-slate-700 text-center mt-2 leading-tight">
                    Scan Passport
                  </span>
                </div>

                {/* KTP */}
                <div className="flex flex-col items-center">
                  <div className="w-full aspect-[4/3] bg-sky-50 border border-sky-100 rounded-lg p-1.5 flex flex-col justify-between shadow-xs relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <div className="w-8 h-1 bg-sky-300 rounded-xs" />
                        <div className="w-6 h-0.5 bg-slate-300 rounded-xs" />
                      </div>
                      <div className="w-2.5 h-3.5 bg-rose-400 rounded-xs shadow-xxs" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="w-full h-0.5 bg-slate-300 rounded-xs" />
                      <div className="w-full h-0.5 bg-slate-300 rounded-xs" />
                    </div>
                    <div className="text-[5px] font-bold text-sky-800 uppercase tracking-widest leading-none">PROVINSI JAWATIMUR</div>
                  </div>
                  <span className="text-[9px] font-black text-slate-700 text-center mt-2 leading-tight">
                    KTP
                  </span>
                </div>

                {/* Pas Foto 4x6 */}
                <div className="flex flex-col items-center">
                  <div className="w-full aspect-[4/3] bg-slate-50 border border-slate-150 rounded-lg p-1.5 flex items-center justify-center gap-1.5 shadow-xs">
                    {/* Male Avatar */}
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 rounded-full bg-slate-200 flex items-end justify-center overflow-hidden border border-slate-300">
                        <div className="w-3.5 h-3.5 bg-sky-600 rounded-full translate-y-1 relative">
                          <div className="absolute top-0 left-1 w-1.5 h-1.5 bg-rose-200 rounded-full -translate-y-1.5" />
                        </div>
                      </div>
                    </div>
                    {/* Female Hijab Avatar */}
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300 bg-emerald-50">
                        <div className="w-4 h-4 bg-slate-800 rounded-t-full relative flex items-center justify-center">
                          <div className="w-2.5 h-2.5 bg-rose-100 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-slate-700 text-center mt-2 leading-tight">
                    Pas Foto 4x6
                  </span>
                </div>
              </div>

              {/* Row 2: Vaccine & Family Card */}
              <div className="grid grid-cols-2 gap-4">
                {/* Vaccine Cert */}
                <div className="flex flex-col items-center">
                  <div className="w-full aspect-[4/3] bg-amber-50/60 border border-amber-100 rounded-lg p-2 flex flex-col justify-between shadow-xs">
                    <div className="flex justify-between items-start">
                      <div className="w-7 h-1 bg-amber-400 rounded-xs" />
                      <div className="w-3 h-3 bg-slate-800 rounded-xs flex flex-col justify-between p-0.5 shadow-xxs">
                        <div className="w-full h-full bg-white rounded-xs" />
                      </div>
                    </div>
                    <div className="space-y-1 my-auto">
                      <div className="w-full h-0.5 bg-slate-300 rounded-xs" />
                      <div className="w-4/5 h-0.5 bg-slate-300 rounded-xs" />
                    </div>
                    <div className="text-[5px] font-black text-amber-800 uppercase tracking-widest leading-none">YELLOW BOOK</div>
                  </div>
                  <span className="text-[9px] font-black text-slate-700 text-center mt-2 leading-tight">
                    Sertifikat Vaksin Meningitis & Polio
                  </span>
                </div>

                {/* Family Card */}
                <div className="flex flex-col items-center">
                  <div className="w-full aspect-[4/3] bg-cyan-50/50 border border-cyan-100 rounded-lg p-2 flex flex-col justify-between shadow-xs">
                    <div className="border-b border-cyan-200 pb-0.5 flex justify-between items-center">
                      <span className="text-[4px] font-bold text-cyan-800">KARTU KELUARGA</span>
                      <span className="text-[3px] font-mono text-cyan-700">No.32021612...</span>
                    </div>
                    <div className="space-y-0.5 my-1">
                      <div className="grid grid-cols-4 gap-0.5">
                        <div className="h-0.5 bg-cyan-200 rounded-xs"></div>
                        <div className="h-0.5 bg-slate-300 rounded-xs col-span-3"></div>
                      </div>
                      <div className="grid grid-cols-4 gap-0.5">
                        <div className="h-0.5 bg-cyan-200 rounded-xs"></div>
                        <div className="h-0.5 bg-slate-300 rounded-xs col-span-3"></div>
                      </div>
                      <div className="grid grid-cols-4 gap-0.5">
                        <div className="h-0.5 bg-cyan-200 rounded-xs"></div>
                        <div className="h-0.5 bg-slate-300 rounded-xs col-span-3"></div>
                      </div>
                    </div>
                    <div className="flex justify-end pr-1">
                      <div className="w-4 h-2 bg-slate-100 border border-slate-200 rounded-xs shadow-xxs"></div>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-slate-700 text-center mt-2 leading-tight">
                    Kartu Keluarga
                  </span>
                </div>
              </div>
            </div>

            {/* Note Section */}
            <p className="text-[9px] font-semibold text-slate-500 text-center mt-5 leading-relaxed bg-white/60 p-3 rounded-2xl border border-slate-150/40">
              <span className="font-bold text-slate-800">Catatan :</span> Paspor asli dikirimkan ke kantor pusat kami tepat setelah melakukan pendaftaran atau maksimal 45 hari sebelum keberangkatan untuk mempermudah proses handling bandara dan kebutuhan jika sewaktu-waktu perlu diserahkan ke kedutaan.
            </p>

            {/* Social handles footer */}
            <div className="w-full border-t border-slate-200 mt-5 pt-4 flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-slate-500 font-mono text-[9px] font-bold">
              <div className="flex items-center gap-1">
                <span className="text-slate-400">📷</span>
                <span>@umarohindonesia</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400">🎵</span>
                <span>umarohcom</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400">🌐</span>
                <span>umaroh.com</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400">▶️</span>
                <span>Umaroh Indonesia</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  const renderBookingModal = () => {
    if (!selectedPaket) return null;

    // Calculate prices
    const quadPrice = selectedPaket.hargaJualQuad || selectedPaket.displayPrice || selectedPaket.hargaJual || selectedPaket.hargaDasar || 0;
    const triplePrice = selectedPaket.hargaJualTriple || (quadPrice * 1.1) || (quadPrice + 2500000);
    const doublePrice = selectedPaket.hargaJualDouble || (quadPrice * 1.2) || (quadPrice + 5000000);

    const getRoomUnitPrice = (): number => {
      if (selectedRoomType === 'quad') return quadPrice;
      if (selectedRoomType === 'triple') return triplePrice;
      if (selectedRoomType === 'double') return doublePrice;
      return quadPrice;
    };

    const unitPrice = getRoomUnitPrice();
    const totalHarga = unitPrice * paxCount;

    const updateActiveManifestField = (field: keyof ManifestInput, value: string) => {
      setManifests(prev => prev.map((item, idx) => idx === activePaxTab ? { ...item, [field]: value } : item));
    };

    const handleFileChange = (field: keyof ManifestInput, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 1200000) {
        alert('Ukuran berkas terlalu besar. Maksimal adalah 1.2 MB agar tersimpan optimal.');
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        setManifests(prev => prev.map((item, idx) => idx === activePaxTab ? { ...item, [field]: base64 } : item));
      };
      reader.onerror = () => {
        alert('Gagal membaca berkas.');
      };
    };

    const updateActiveManifestFile = (field: keyof ManifestInput, value: string) => {
      setManifests(prev => prev.map((item, idx) => idx === activePaxTab ? { ...item, [field]: value } : item));
    };

    const validateManifests = (): boolean => {
      for (let i = 0; i < manifests.length; i++) {
        const m = manifests[i];
        if (!m.namaLengkap || m.namaLengkap.trim() === '') {
          alert(`Nama Lengkap Jamaah #${i + 1} harus diisi!`);
          setActivePaxTab(i);
          return false;
        }
        if (!m.nik || m.nik.trim() === '') {
          alert(`NIK Jamaah #${i + 1} harus diisi!`);
          setActivePaxTab(i);
          return false;
        }
        if (m.nik.length < 16) {
          alert(`NIK Jamaah #${i + 1} harus 16 digit!`);
          setActivePaxTab(i);
          return false;
        }
        if (!m.telepon || m.telepon.trim() === '') {
          alert(`No Telepon Jamaah #${i + 1} harus diisi!`);
          setActivePaxTab(i);
          return false;
        }
      }
      return true;
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-[32px] max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh] text-slate-800">
          
          {/* Close button top right */}
          <button 
            type="button"
            onClick={() => setSelectedPaket(null)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-all z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {bookingSuccess ? (
            <div className="text-center py-10 space-y-4 my-auto">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
                <CheckCircle2 className="w-8 h-8 text-[#10b981]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">Pemesanan Sukses!</h3>
                <p className="text-xs text-slate-500 mt-1">Sistem sedang mendaftarkan pesanan Anda di manifest pusat.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-y-auto pr-1 scrollbar-thin">
              
              {bookingStep === 'config' ? (
                <>
                  {/* Header */}
                  <div className="text-center mb-6 mt-2">
                    <h3 className="text-[16px] font-black tracking-tight text-slate-900 uppercase">
                      PILIH KAMAR & JUMLAH JAMAAH
                    </h3>
                    <p className="text-[9px] font-bold tracking-widest text-emerald-600 uppercase mt-1">
                      KONFIGURASI KEBUTUHAN AKOMODASI ANDA
                    </p>
                  </div>

                  {/* TIPE KAMAR Section */}
                  <div className="space-y-3 mb-6">
                    <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase block mb-1">
                      TIPE KAMAR (ROOM TYPE)
                    </span>

                    {/* Quad Room Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedRoomType('quad')}
                      className={`w-full p-3 md:p-3.5 rounded-2xl flex items-center justify-between text-left transition-all outline-none ${
                        selectedRoomType === 'quad'
                          ? 'border-2 border-[#10b981] bg-emerald-50/10 shadow-sm'
                          : 'border border-slate-100 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
                          selectedRoomType === 'quad' ? 'bg-[#10b981] text-white' : 'bg-slate-50 text-slate-400'
                        }`}>
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className={`text-[12px] font-black leading-tight ${selectedRoomType === 'quad' ? 'text-emerald-700' : 'text-slate-700'}`}>
                            QUAD ROOM
                          </h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                            KAPASITAS 4 ORANG
                          </p>
                        </div>
                      </div>
                      <span className={`text-[13px] font-black ${selectedRoomType === 'quad' ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {formatCurrency(quadPrice)}
                      </span>
                    </button>

                    {/* Triple Room Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedRoomType('triple')}
                      className={`w-full p-3 md:p-3.5 rounded-2xl flex items-center justify-between text-left transition-all outline-none ${
                        selectedRoomType === 'triple'
                          ? 'border-2 border-[#10b981] bg-emerald-50/10 shadow-sm'
                          : 'border border-slate-100 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
                          selectedRoomType === 'triple' ? 'bg-[#10b981] text-white' : 'bg-slate-50 text-slate-400'
                        }`}>
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className={`text-[12px] font-black leading-tight ${selectedRoomType === 'triple' ? 'text-emerald-700' : 'text-slate-700'}`}>
                            TRIPLE ROOM
                          </h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                            KAPASITAS 3 ORANG
                          </p>
                        </div>
                      </div>
                      <span className={`text-[13px] font-black ${selectedRoomType === 'triple' ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {formatCurrency(triplePrice)}
                      </span>
                    </button>

                    {/* Double Room Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedRoomType('double')}
                      className={`w-full p-3 md:p-3.5 rounded-2xl flex items-center justify-between text-left transition-all outline-none ${
                        selectedRoomType === 'double'
                          ? 'border-2 border-[#10b981] bg-emerald-50/10 shadow-sm'
                          : 'border border-slate-100 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
                          selectedRoomType === 'double' ? 'bg-[#10b981] text-white' : 'bg-slate-50 text-slate-400'
                        }`}>
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className={`text-[12px] font-black leading-tight ${selectedRoomType === 'double' ? 'text-emerald-700' : 'text-slate-700'}`}>
                            DOUBLE ROOM
                          </h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                            KAPASITAS 2 ORANG
                          </p>
                        </div>
                      </div>
                      <span className={`text-[13px] font-black ${selectedRoomType === 'double' ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {formatCurrency(doublePrice)}
                      </span>
                    </button>
                  </div>

                  {/* JUMLAH PAX / JAMAAH Section */}
                  <div className="bg-slate-50/50 p-4 rounded-[24px] border border-slate-100 text-center mb-6">
                    <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase block mb-3">
                      JUMLAH PAX / JAMAAH
                    </span>

                    <div className="flex items-center justify-center gap-5 bg-white p-2 border border-slate-100 rounded-2xl max-w-[180px] mx-auto shadow-sm">
                      <button
                        type="button"
                        disabled={paxCount <= 1}
                        onClick={() => setPaxCount(prev => Math.max(1, prev - 1))}
                        className={`w-11 h-11 bg-slate-50 hover:bg-slate-100 border border-slate-200/40 rounded-xl flex items-center justify-center text-slate-800 font-extrabold text-lg transition-all active:scale-90 ${
                          paxCount <= 1 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <Minus className="w-4 h-4 text-slate-700" />
                      </button>
                      <span className="text-xl font-black text-slate-900 w-10 text-center select-none">
                        {paxCount}
                      </span>
                      <button
                        type="button"
                        disabled={paxCount >= 10}
                        onClick={() => setPaxCount(prev => Math.min(10, prev + 1))}
                        className={`w-11 h-11 bg-slate-50 hover:bg-slate-100 border border-slate-200/40 rounded-xl flex items-center justify-center text-slate-800 font-extrabold text-lg transition-all active:scale-90 ${
                          paxCount >= 10 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <Plus className="w-4 h-4 text-slate-700" />
                      </button>
                    </div>

                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-2 block leading-none">
                      MAKSIMAL 10 PAX PER TRANSAKSI
                    </span>
                  </div>

                  {/* Bottom Sticky Total and Button */}
                  <div className="border-t border-slate-100 pt-4 mt-auto space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                          TOTAL BAYAR
                        </span>
                        <h5 className="text-emerald-600 font-black text-[22px] leading-tight italic tracking-tighter mt-0.5">
                          {formatCurrency(totalHarga)}
                        </h5>
                      </div>
                      <div className="bg-slate-100/60 text-slate-600 px-3 py-1.5 rounded-full font-black text-[9px] uppercase flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-500" />
                        <span>{paxCount} PAX</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setBookingStep('manifest');
                        setActivePaxTab(0);
                      }}
                      className="w-full py-4 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-slate-950/10 cursor-pointer animate-in fade-in"
                    >
                      <span>LANJUT ISI DATA</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </>
              ) : bookingStep === 'manifest' ? (
                <>
                  {/* Header */}
                  <div className="text-center mb-4 mt-2">
                    <h3 className="text-[16px] font-black tracking-tight text-slate-900 uppercase">
                      ISI DATA MANIFEST
                    </h3>
                    <p className="text-[9px] font-bold tracking-widest text-emerald-600 uppercase mt-1">
                      JAMAAH {activePaxTab + 1} DARI {paxCount}
                    </p>
                  </div>

                  {/* Pilgrim Tabs */}
                  {paxCount > 1 && (
                    <div className="flex gap-1 overflow-x-auto pb-3 mb-4 scrollbar-thin border-b border-slate-100 shrink-0">
                      {manifests.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActivePaxTab(idx)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase whitespace-nowrap transition-all outline-none ${
                            activePaxTab === idx
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          JAMAAH #{idx + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Manifest Form */}
                  <div className="flex-1 space-y-4 pb-6 overflow-y-auto pr-1">
                    {/* Nama Lengkap */}
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-1">Nama Lengkap (Sesuai KTP) *</label>
                      <input
                        type="text"
                        required
                        value={manifests[activePaxTab]?.namaLengkap || ''}
                        onChange={e => updateActiveManifestField('namaLengkap', e.target.value.toUpperCase())}
                        placeholder="NAMA LENGKAP"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-[#10b981] outline-none text-slate-800"
                      />
                    </div>

                    {/* Row with Title & NIK */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1">
                        <label className="block text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-1">Title *</label>
                        <select
                          value={manifests[activePaxTab]?.title || 'MR'}
                          onChange={e => updateActiveManifestField('title', e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-[#10b981] outline-none text-slate-800"
                        >
                          <option value="MR">MR</option>
                          <option value="MRS">MRS</option>
                          <option value="MS">MS</option>
                          <option value="MSTR">MSTR</option>
                          <option value="MISS">MISS</option>
                          <option value="LAKI-LAKI">LAKI-LAKI</option>
                          <option value="PEREMPUAN">PEREMPUAN</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-1">NIK (16 Digit) *</label>
                        <input
                          type="text"
                          maxLength={16}
                          required
                          value={manifests[activePaxTab]?.nik || ''}
                          onChange={e => updateActiveManifestField('nik', e.target.value.replace(/\D/g, ''))}
                          placeholder="KTP NIK"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#10b981] outline-none text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Row with Tempat & Tanggal Lahir */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-1">Tempat Lahir</label>
                        <input
                          type="text"
                          value={manifests[activePaxTab]?.tempat_lahir || ''}
                          onChange={e => updateActiveManifestField('tempat_lahir', e.target.value.toUpperCase())}
                          placeholder="TEMPAT LAHIR"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-[#10b981] outline-none text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-1">Tanggal Lahir</label>
                        <input
                          type="date"
                          value={manifests[activePaxTab]?.tanggal_lahir || ''}
                          onChange={e => updateActiveManifestField('tanggal_lahir', e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-[#10b981] outline-none text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Nama Paspor */}
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-1">Nama Sesuai Paspor</label>
                      <input
                        type="text"
                        value={manifests[activePaxTab]?.nama_paspor || ''}
                        onChange={e => updateActiveManifestField('nama_paspor', e.target.value.toUpperCase())}
                        placeholder="NAMA DI PASPOR"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-[#10b981] outline-none text-slate-800"
                      />
                    </div>

                    {/* Row with No Paspor & Kota Paspor */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-1">No Paspor</label>
                        <input
                          type="text"
                          value={manifests[activePaxTab]?.no_paspor || ''}
                          onChange={e => updateActiveManifestField('no_paspor', e.target.value.toUpperCase())}
                          placeholder="NOMOR PASPOR"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-[#10b981] outline-none text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-1">Kota Paspor</label>
                        <input
                          type="text"
                          value={manifests[activePaxTab]?.kota_paspor || ''}
                          onChange={e => updateActiveManifestField('kota_paspor', e.target.value.toUpperCase())}
                          placeholder="KOTA PASPOR"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-[#10b981] outline-none text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Paspor Dates */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-1">Tgl Issue Paspor</label>
                        <input
                          type="date"
                          value={manifests[activePaxTab]?.tgl_issue_paspor || ''}
                          onChange={e => updateActiveManifestField('tgl_issue_paspor', e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-[#10b981] outline-none text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-1">Tgl Exp Paspor</label>
                        <input
                          type="date"
                          value={manifests[activePaxTab]?.tgl_exp_paspor || ''}
                          onChange={e => updateActiveManifestField('tgl_exp_paspor', e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-[#10b981] outline-none text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Kewarganegaraan & No HP */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-1">Kewarganegaraan</label>
                        <input
                          type="text"
                          value={manifests[activePaxTab]?.kewarganegaraan || 'WNI'}
                          onChange={e => updateActiveManifestField('kewarganegaraan', e.target.value.toUpperCase())}
                          placeholder="WNI"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-[#10b981] outline-none text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-1">Telepon / No HP *</label>
                        <input
                          type="text"
                          required
                          value={manifests[activePaxTab]?.telepon || ''}
                          onChange={e => updateActiveManifestField('telepon', e.target.value)}
                          placeholder="CONTOH: 0812345678"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#10b981] outline-none text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Digital File Upload Section */}
                    <div className="border-t border-slate-100 pt-4 mt-2">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-[10px] font-black text-slate-800 tracking-wider uppercase">
                          Unggah Berkas Digital (JPEG / PNG / PDF)
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowExampleModal(true)}
                          className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 px-2 py-1 rounded-lg transition-all"
                        >
                          <span>💡 KLIK CONTOH</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Paspor */}
                        <div className="border border-slate-150 rounded-2xl p-2.5 bg-slate-50 flex flex-col justify-between min-h-[90px]">
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">PASPOR</span>
                            <span className="text-[10px] font-black text-slate-750 block line-clamp-1 leading-tight">Scan Passport</span>
                          </div>
                          <div className="mt-2">
                            {manifests[activePaxTab]?.filePassport ? (
                              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-150 rounded-xl px-2 py-1">
                                <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wide">Terunggah</span>
                                <button
                                  type="button"
                                  onClick={() => updateActiveManifestFile('filePassport', '')}
                                  className="text-red-500 hover:text-red-700 text-[9px] font-bold"
                                >
                                  Hapus
                                </button>
                              </div>
                            ) : (
                              <label className="block text-center bg-white hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl py-1.5 cursor-pointer transition-all">
                                <div className="flex items-center justify-center gap-1">
                                  <Upload className="w-3 h-3 text-slate-400" />
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Pilih Berkas</span>
                                </div>
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png,.pdf"
                                  className="hidden"
                                  onChange={(e) => handleFileChange('filePassport', e)}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                        
                        {/* KTP */}
                        <div className="border border-slate-150 rounded-2xl p-2.5 bg-slate-50 flex flex-col justify-between min-h-[90px]">
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">IDENTITAS</span>
                            <span className="text-[10px] font-black text-slate-750 block line-clamp-1 leading-tight">KTP Asli</span>
                          </div>
                          <div className="mt-2">
                            {manifests[activePaxTab]?.fileKtp ? (
                              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-150 rounded-xl px-2 py-1">
                                <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wide">Terunggah</span>
                                <button
                                  type="button"
                                  onClick={() => updateActiveManifestFile('fileKtp', '')}
                                  className="text-red-500 hover:text-red-700 text-[9px] font-bold"
                                >
                                  Hapus
                                </button>
                              </div>
                            ) : (
                              <label className="block text-center bg-white hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl py-1.5 cursor-pointer transition-all">
                                <div className="flex items-center justify-center gap-1">
                                  <Upload className="w-3 h-3 text-slate-400" />
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Pilih Berkas</span>
                                </div>
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png,.pdf"
                                  className="hidden"
                                  onChange={(e) => handleFileChange('fileKtp', e)}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Foto 4x6 */}
                        <div className="border border-slate-150 rounded-2xl p-2.5 bg-slate-50 flex flex-col justify-between min-h-[90px]">
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">PAS FOTO</span>
                            <span className="text-[10px] font-black text-slate-750 block line-clamp-1 leading-tight">Pas Foto 4x6</span>
                          </div>
                          <div className="mt-2">
                            {manifests[activePaxTab]?.fileFoto ? (
                              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-150 rounded-xl px-2 py-1">
                                <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wide">Terunggah</span>
                                <button
                                  type="button"
                                  onClick={() => updateActiveManifestFile('fileFoto', '')}
                                  className="text-red-500 hover:text-red-700 text-[9px] font-bold"
                                >
                                  Hapus
                                </button>
                              </div>
                            ) : (
                              <label className="block text-center bg-white hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl py-1.5 cursor-pointer transition-all">
                                <div className="flex items-center justify-center gap-1">
                                  <Upload className="w-3 h-3 text-slate-400" />
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Pilih Berkas</span>
                                </div>
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png,.pdf"
                                  className="hidden"
                                  onChange={(e) => handleFileChange('fileFoto', e)}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Sertifikat Vaksin */}
                        <div className="border border-slate-150 rounded-2xl p-2.5 bg-slate-50 flex flex-col justify-between min-h-[90px]">
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">VAKSINASI</span>
                            <span className="text-[10px] font-black text-slate-750 block line-clamp-1 leading-tight">Sertifikat Vaksin</span>
                          </div>
                          <div className="mt-2">
                            {manifests[activePaxTab]?.fileVaccine ? (
                              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-150 rounded-xl px-2 py-1">
                                <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wide">Terunggah</span>
                                <button
                                  type="button"
                                  onClick={() => updateActiveManifestFile('fileVaccine', '')}
                                  className="text-red-500 hover:text-red-700 text-[9px] font-bold"
                                >
                                  Hapus
                                </button>
                              </div>
                            ) : (
                              <label className="block text-center bg-white hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl py-1.5 cursor-pointer transition-all">
                                <div className="flex items-center justify-center gap-1">
                                  <Upload className="w-3 h-3 text-slate-400" />
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Pilih Berkas</span>
                                </div>
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png,.pdf"
                                  className="hidden"
                                  onChange={(e) => handleFileChange('fileVaccine', e)}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Kartu Keluarga */}
                        <div className="border border-slate-150 rounded-2xl p-2.5 bg-slate-50 flex flex-col justify-between min-h-[90px] col-span-2">
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">KELUARGA</span>
                            <span className="text-[10px] font-black text-slate-750 block line-clamp-1 leading-tight">Kartu Keluarga (KK)</span>
                          </div>
                          <div className="mt-2">
                            {manifests[activePaxTab]?.fileKk ? (
                              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-150 rounded-xl px-2 py-1">
                                <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wide">Terunggah</span>
                                <button
                                  type="button"
                                  onClick={() => updateActiveManifestFile('fileKk', '')}
                                  className="text-red-500 hover:text-red-700 text-[9px] font-bold"
                                >
                                  Hapus
                                </button>
                              </div>
                            ) : (
                              <label className="block text-center bg-white hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl py-1.5 cursor-pointer transition-all">
                                <div className="flex items-center justify-center gap-1">
                                  <Upload className="w-3 h-3 text-slate-400" />
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Pilih Berkas</span>
                                </div>
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png,.pdf"
                                  className="hidden"
                                  onChange={(e) => handleFileChange('fileKk', e)}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="border-t border-slate-100 pt-4 mt-auto flex gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setBookingStep('config')}
                      className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-slate-600" />
                      <span>KEMBALI</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (validateManifests()) {
                          setBookingStep('payment');
                        }
                      }}
                      className="flex-2 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-emerald-600/10 cursor-pointer"
                    >
                      <span>LANJUT KE PEMBAYARAN</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Header */}
                  <div className="text-center mb-4 mt-2">
                    <h3 className="text-[16px] font-black tracking-tight text-slate-900 uppercase">
                      METODE PEMBAYARAN
                    </h3>
                    <p className="text-[9px] font-bold tracking-widest text-emerald-600 uppercase mt-1">
                      AMANKAN SEAT KEBERANGKATAN SEKARANG
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 mb-4 space-y-2">
                    <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                      <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block leading-none">PAKET PILIHAN</span>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight mt-1">
                          {selectedPaket.displayName || 'Paket Pilihan'}
                        </h4>
                      </div>
                      <div className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100 font-black text-[9px] uppercase tracking-wide">
                        {paxCount} PAX • {selectedRoomType.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TOTAL TAGIHAN LUNAS</span>
                      <span className="text-emerald-600 font-black text-base italic tracking-tight">{formatCurrency(totalHarga)}</span>
                    </div>
                  </div>

                  {/* Payment Method Option Cards */}
                  <div className="space-y-2.5 mb-5">
                    <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase block">
                      PILIH METODE PEMBAYARAN *
                    </span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {/* Method 1: Bayar Lunas */}
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMethod('lunas')}
                        className={`p-3 rounded-2xl border text-left transition-all relative ${
                          selectedPaymentMethod === 'lunas'
                            ? 'border-2 border-emerald-500 bg-emerald-50/10 shadow-sm'
                            : 'border-slate-150 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-[10px] font-black text-slate-800 uppercase tracking-wide">1. Bayar Lunas</span>
                        <span className="block text-[8px] text-slate-400 font-bold uppercase mt-0.5">Sesuai Pax & Room</span>
                        {selectedPaymentMethod === 'lunas' && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        )}
                      </button>

                      {/* Method 2: Bayar DP 5jt/pax */}
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMethod('dp')}
                        className={`p-3 rounded-2xl border text-left transition-all relative ${
                          selectedPaymentMethod === 'dp'
                            ? 'border-2 border-emerald-500 bg-emerald-50/10 shadow-sm'
                            : 'border-slate-150 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-[10px] font-black text-slate-800 uppercase tracking-wide">2. Bayar DP 5jt/pax</span>
                        <span className="block text-[8px] text-slate-400 font-bold uppercase mt-0.5">DP Awal Booking</span>
                        {selectedPaymentMethod === 'dp' && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        )}
                      </button>

                      {/* Method 3: Cicilan Syariah */}
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMethod('cicilan')}
                        className={`p-3 rounded-2xl border text-left transition-all relative ${
                          selectedPaymentMethod === 'cicilan'
                            ? 'border-2 border-emerald-500 bg-emerald-50/10 shadow-sm'
                            : 'border-slate-150 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-[10px] font-black text-slate-800 uppercase tracking-wide">3. Cicilan Syariah</span>
                        <span className="block text-[8px] text-slate-400 font-bold uppercase mt-0.5">Murni Tanpa Riba</span>
                        {selectedPaymentMethod === 'cicilan' && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        )}
                      </button>

                      {/* Method 4: VA Minimal 5jt */}
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMethod('va')}
                        className={`p-3 rounded-2xl border text-left transition-all relative ${
                          selectedPaymentMethod === 'va'
                            ? 'border-2 border-emerald-500 bg-emerald-50/10 shadow-sm'
                            : 'border-slate-150 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-[10px] font-black text-slate-800 uppercase tracking-wide">4. Bayar VA Min 5jt</span>
                        <span className="block text-[8px] text-slate-400 font-bold uppercase mt-0.5">Virtual Account</span>
                        {selectedPaymentMethod === 'va' && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Payment Details Area based on selection */}
                  <div className="bg-white border border-slate-150 rounded-2xl p-4 mb-4 space-y-3 shadow-xs">
                    {selectedPaymentMethod === 'lunas' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Jumlah Pembayaran Lunas</span>
                          <span className="text-sm font-black text-emerald-700 font-mono">{formatCurrency(totalHarga)}</span>
                        </div>
                        <div className="space-y-1.5 border-t border-slate-100 pt-3">
                          <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase block">TRANSFER KE REKENING BSI:</span>
                          <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="block text-[10px] font-black text-slate-800 tracking-tight">BANK SYARIAH INDONESIA (BSI)</span>
                              <span className="block text-xs font-black text-emerald-600 tracking-wider font-mono mt-0.5">5577775003</span>
                              <span className="block text-[9px] font-bold text-slate-500 mt-0.5">a.n. PT. Nawaitul umrah haji</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText('5577775003');
                                alert('Nomor rekening berhasil disalin!');
                              }}
                              className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-100 transition-all uppercase tracking-widest cursor-pointer"
                            >
                              SALIN
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedPaymentMethod === 'dp' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100">
                          <div>
                            <span className="text-[8px] font-bold text-slate-500 uppercase block">DP Wajib (5jt/pax)</span>
                            <span className="text-xs font-black text-emerald-700 font-mono">{formatCurrency(5000000 * paxCount)}</span>
                          </div>
                          <div className="border-l border-emerald-200/60 pl-2">
                            <span className="text-[8px] font-bold text-slate-500 uppercase block">Sisa Pembayaran</span>
                            <span className="text-xs font-black text-slate-700 font-mono">{formatCurrency(totalHarga - (5000000 * paxCount))}</span>
                          </div>
                        </div>
                        <div className="space-y-1.5 border-t border-slate-100 pt-3">
                          <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase block">TRANSFER KE REKENING BSI:</span>
                          <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="block text-[10px] font-black text-slate-800 tracking-tight">BANK SYARIAH INDONESIA (BSI)</span>
                              <span className="block text-xs font-black text-emerald-600 tracking-wider font-mono mt-0.5">5577775003</span>
                              <span className="block text-[9px] font-bold text-slate-500 mt-0.5">a.n. PT. Nawaitul umrah haji</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText('5577775003');
                                alert('Nomor rekening berhasil disalin!');
                              }}
                              className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-100 transition-all uppercase tracking-widest cursor-pointer"
                            >
                              SALIN
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedPaymentMethod === 'cicilan' && (
                      <div className="space-y-3 py-1 text-center">
                        <span className="inline-block bg-indigo-50 text-indigo-700 text-[8px] font-black px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-widest mb-1">
                          PROGRAM KEMITRAAN SYARIAH
                        </span>
                        <p className="text-[10px] text-slate-600 leading-relaxed max-w-sm mx-auto">
                          Program cicilan amanah bebas riba langsung dari PT Nawaitul Umrah Haji. Silakan klik tombol di bawah ini untuk mengisi formulir pengajuan cicilan Anda:
                        </p>
                        <a
                          href="https://umaroh.com/formulir-cicilan-syariah"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl border border-indigo-500 shadow-sm transition-all uppercase tracking-wider mt-1 cursor-pointer"
                        >
                          <span>Buka Formulir Cicilan</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    {selectedPaymentMethod === 'va' && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-black text-slate-400 tracking-wider uppercase">Masukkan Nominal Bayar VA (Min Rp 5.000.000) *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-3.5 text-xs font-black text-slate-400">Rp</span>
                            <input
                              type="number"
                              min="5000000"
                              max={totalHarga}
                              value={vaAmount}
                              onChange={(e) => setVaAmount(Math.min(totalHarga, Math.max(0, Number(e.target.value))))}
                              className="w-full p-3 pl-8 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
                            />
                          </div>
                          <div className="flex justify-between text-[8px] font-bold text-slate-400 mt-1">
                            <span>MINIMAL: Rp 5.000.000</span>
                            <span>MAKSIMAL: {formatCurrency(totalHarga)}</span>
                          </div>
                        </div>
                        <div className="border-t border-slate-100 pt-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-150 text-center text-[9px] text-slate-500">
                          💳 Nomor VA Mandiri/BSI/BNI akan otomatis diterbitkan oleh sistem setelah Anda menyelesaikan pendaftaran ini.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Wajib Upload Bukti Transfer */}
                  <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/70 mb-4 space-y-3">
                    <div>
                      <span className="block text-[10px] font-black text-slate-800 tracking-wider uppercase">Unggah Bukti Pembayaran / Pengajuan * (WAJIB)</span>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Upload Bukti Transfer ATM / M-Banking / Screenshot Form</span>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-3">
                      {buktiTransfer ? (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">BUKTI TRANSFER TERUNGGAH</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setBuktiTransfer('')}
                            className="text-red-500 hover:text-red-700 text-[10px] font-black uppercase tracking-widest cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <label className="block text-center bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl py-3 cursor-pointer transition-all">
                          <div className="flex items-center justify-center gap-1.5">
                            <Upload className="w-4 h-4 text-slate-400 animate-bounce" />
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">PILIH BUKTI PEMBAYARAN</span>
                          </div>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 1200000) {
                                alert('Ukuran berkas terlalu besar. Maksimal adalah 1.2 MB.');
                                return;
                              }
                              const reader = new FileReader();
                              reader.readAsDataURL(file);
                              reader.onload = () => setBuktiTransfer(reader.result as string);
                              reader.onerror = () => alert('Gagal membaca berkas.');
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Syarat & Ketentuan & Tanda Tangan (Unified Section) */}
                  <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/70 mb-4 space-y-3">
                    <div>
                      <span className="block text-[10px] font-black text-slate-800 tracking-wider uppercase">Syarat & Ketentuan & Tanda Tangan *</span>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Wajib membaca S&K dan membubuhkan tanda tangan</span>
                    </div>

                    {agreedToTerms && hasSigned && signatureData ? (
                      <div className="bg-emerald-50/60 border border-emerald-150 rounded-xl p-3 space-y-2.5">
                        <div className="flex items-center gap-2 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>S&K Disetujui & Ditandatangani</span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-center h-20 relative overflow-hidden">
                          <img src={signatureData} alt="Tanda Tangan" className="max-h-16 object-contain" referrerPolicy="no-referrer" />
                          <span className="absolute bottom-1 right-2 text-[7px] font-mono text-slate-400">TEREKAM SECARA DIGITAL</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          className="w-full text-center text-emerald-700 hover:text-emerald-800 bg-white hover:bg-slate-50 border border-emerald-200 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer font-bold"
                        >
                          UBAH TANDA TANGAN / BACA ULANG S&K
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-amber-500/10 cursor-pointer font-bold"
                      >
                        <span>BACA S&K & TANDA TANGAN SEKARANG</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>

                  {/* Bottom Actions for payment */}
                  <div className="border-t border-slate-100 pt-4 mt-auto flex gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setBookingStep('manifest')}
                      className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-slate-600" />
                      <span>KEMBALI</span>
                    </button>

                    <button
                      type="button"
                      disabled={!agreedToTerms || !buktiTransfer || !hasSigned}
                      onClick={async () => {
                        try {
                          const isMitraPaket = !!selectedPaket.paketMasterId || selectedPaket.type === 'mitra';
                          
                          // Use the first traveler's info as the primary/booking-level pilgrim data
                          const primaryPax = manifests[0];
                          const primaryGender = primaryPax.title === 'MR' || primaryPax.title === 'LAKI-LAKI' || primaryPax.title === 'MSTR' ? 'L' : 'P';

                          const bookingData = {
                            jamaahId: userId,
                            paketId: selectedPaket.id,
                            jenisPaket: isMitraPaket ? 'mitra' : 'master',
                            mitraId: selectedPaket.mitraId || (currentUserRole === 'mitra' ? userId : null),
                            paketLabel: selectedPaket.displayName || 'Paket Pilihan',
                            statusPembayaran: 'pending',
                            statusKeberangkatan: 'menunggu',
                            totalHarga: totalHarga,
                            paxCount: paxCount,
                            roomType: selectedRoomType,
                            
                            // Payment step data
                            metodePembayaran: selectedPaymentMethod,
                            jumlahBayar: selectedPaymentMethod === 'lunas' ? totalHarga : (selectedPaymentMethod === 'dp' ? (5000000 * paxCount) : (selectedPaymentMethod === 'va' ? vaAmount : 0)),
                            sisaBayar: selectedPaymentMethod === 'lunas' ? 0 : (selectedPaymentMethod === 'dp' ? (totalHarga - (5000000 * paxCount)) : (selectedPaymentMethod === 'va' ? (totalHarga - vaAmount) : totalHarga)),
                            buktiTransfer: buktiTransfer,
                            signatureData: signatureData,
                            
                            // Primary manifest data mapped to booking level for backward-compatibility
                            namaJamaah: primaryPax.namaLengkap,
                            nik: primaryPax.nik,
                            no_paspor: primaryPax.no_paspor,
                            tanggal_lahir: primaryPax.tanggal_lahir,
                            tgl_issue_paspor: primaryPax.tgl_issue_paspor,
                            tgl_exp_paspor: primaryPax.tgl_exp_paspor,
                            kota_paspor: primaryPax.kota_paspor,
                            tempat_lahir: primaryPax.tempat_lahir,
                            kewarganegaraan: primaryPax.kewarganegaraan,
                            noHp: primaryPax.telepon,
                            jenisKelamin: primaryGender,
                            
                            // Document synchronization
                            docPassport: !!primaryPax.filePassport,
                            docKtp: !!primaryPax.fileKtp,
                            docVaccine: !!primaryPax.fileVaccine,
                            docFoto: !!primaryPax.fileFoto,
                            filePassport: primaryPax.filePassport || '',
                            fileKtp: primaryPax.fileKtp || '',
                            fileVaccine: primaryPax.fileVaccine || '',
                            fileFoto: primaryPax.fileFoto || '',
                            fileKk: primaryPax.fileKk || '',
                            
                            // Full manifest list saved on booking doc
                            manifestList: manifests,
                            
                            createdAt: serverTimestamp()
                          };

                          const docRef = await addDoc(collection(db, 'bookings'), bookingData);
                          await syncBookingToTracker(docRef.id, {
                            ...bookingData,
                            createdAt: new Date().toISOString()
                          });
                          setBookingSuccess(true);
                          setTimeout(() => {
                            setBookingSuccess(false);
                            setSelectedPaket(null);
                          }, 3000);
                        } catch (error) {
                          console.error("Error creating booking:", error);
                          alert("Gagal membuat pemesanan. Silakan coba lagi.");
                        }
                      }}
                      className={`flex-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-emerald-600/10 ${
                        agreedToTerms && buktiTransfer && hasSigned
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                      }`}
                    >
                      <span>KONFIRMASI & SELESAI</span>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </>
              )}

            </div>
          )}

        </div>
        {/* Render example modal and terms modal inside the same overlay stacking context */}
        {renderExampleModal()}
        {renderTermsModal()}
      </div>
    );
  };

  const formatCurrency = (amount: number | string | undefined | null) => {
    const val = typeof amount === 'number' ? amount : Number(amount || 0);
    if (isNaN(val)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Math.round(val));
  };

  const handleEdit = (e: React.MouseEvent, paket: DisplayPaket) => {
    e.stopPropagation();
    const master = paketMasters.find(m => m.id === paket.paketMasterId || m.id === paket.id);
    if (master) {
      setViewingDetail(master);
    }
  };

  const handleShare = (e: React.MouseEvent, paket: DisplayPaket) => {
    e.stopPropagation();
    const shareText = `*${paket.displayName}*\n\n📅 Berangkat: ${paket.tglBerangkat || '-'}\n💰 Harga mulai: ${formatCurrency(paket.displayPrice)}\n✈️ Maskapai: ${paket.maskapaiId || '-'}\n⏳ Durasi: ${paket.durasiHari || '-'} Hari\n\nInfo selengkapnya hubungi kami!`;
    navigator.clipboard.writeText(shareText);
    alert('Link & detail paket disalin!');
  };

  const handleDelete = async (e: React.MouseEvent, paket: DisplayPaket) => {
    e.stopPropagation();
    if (window.confirm(`Hapus paket "${paket.displayName}"?`)) {
      try {
        const collectionName = paket.type === 'master' ? 'paket_master' : 'paket_mitra';
        await deleteDoc(doc(db, collectionName, paket.id));
      } catch (error) {
        console.error("Error deleting:", error);
        alert('Gagal menghapus paket');
      }
    }
  };

  // Combine and format packages for display
  const displayPackages: DisplayPaket[] = [
    ...paketMasters.map(p => {
      const qPrice = p.hargaJualQuad || p.hargaDasar || p.hargaEkonomi || 0;
      return { 
        ...p, 
        type: 'master', 
        displayPrice: qPrice, 
        displayName: p.nama,
        tglBerangkat: p.tglBerangkat,
        durasiHari: p.durasiHari,
        maskapaiId: p.maskapaiId,
        hargaJualQuad: qPrice,
        hargaJualTriple: p.hargaJualTriple || (qPrice ? Math.round(qPrice * 1.1) : 0),
        hargaJualDouble: p.hargaJualDouble || (qPrice ? Math.round(qPrice * 1.2) : 0)
      };
    }),
    ...paketMitras.map(p => {
      const master = paketMasters.find(m => m.id === p.paketMasterId);
      const markup = p.markup || 0;
      
      const priceQuad = (master?.hargaJualQuad || master?.hargaDasar || master?.hargaEkonomi || 0) + markup;
      const priceTriple = (master?.hargaJualTriple || 0) > 0 ? (master?.hargaJualTriple || 0) + markup : (priceQuad ? Math.round(priceQuad * 1.1) : 0);
      const priceDouble = (master?.hargaJualDouble || 0) > 0 ? (master?.hargaJualDouble || 0) + markup : (priceQuad ? Math.round(priceQuad * 1.2) : 0);

      return { 
        ...p, 
        type: 'mitra', 
        displayPrice: priceQuad, 
        displayName: p.namaPaketMitra,
        deskripsi: master?.deskripsi || 'Paket Umroh Spesial',
        tglBerangkat: master?.tglBerangkat,
        durasiHari: master?.durasiHari,
        maskapaiId: master?.maskapaiId,
        sisaKuota: master?.sisaKuota || 0,
        hargaJualQuad: priceQuad,
        hargaJualTriple: priceTriple,
        hargaJualDouble: priceDouble
      };
    })
  ].filter(p => {
    const matchesSearch = p.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    const todayStr = new Date().toISOString().split('T')[0];
    const masterObj = p.paketMasterId ? paketMasters.find(m => m.id === p.paketMasterId) : p;
    const isArchived = p.status === 'archived' || masterObj?.status === 'archived';
    const hasPassed = !!(masterObj?.tglBerangkat && masterObj.tglBerangkat < todayStr);
    const isExpired = isArchived || hasPassed;

    if (!showExpired && isExpired) return false;
    return true;
  });

  if (viewingDetail) {
    return (
      <div className="relative">
        <PaketDetailView 
          paket={viewingDetail}
          hotels={hotels}
          maskapai={maskapai}
          isMitraContext={false}
          onBack={() => setViewingDetail(null)}
          onViewMitra={onViewMitra}
          onBook={(p) => {
            // Convert PaketMaster to DisplayPaket structure for booking modal
            const qPrice = p.hargaJualQuad || p.hargaDasar || p.hargaEkonomi || 0;
            setSelectedPaket({
              id: p.id,
              type: 'master',
              displayName: p.nama,
              displayPrice: qPrice,
              deskripsi: p.deskripsi || '',
              tglBerangkat: p.tglBerangkat,
              durasiHari: p.durasiHari,
              maskapaiId: p.maskapaiId,
              hargaJualQuad: qPrice,
              hargaJualTriple: p.hargaJualTriple || (qPrice ? Math.round(qPrice * 1.1) : 0),
              hargaJualDouble: p.hargaJualDouble || (qPrice ? Math.round(qPrice * 1.2) : 0),
              mitraId: p.mitraId || undefined
            });
          }}
        />

        {/* Booking Confirmation Popup specifically active inside viewing detail too */}
        {renderBookingModal()}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search Bar & Expiry Filter */}
      <div className="bg-white p-1.5 md:p-2 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-2 w-full relative z-20">
        <div className="flex-1 flex items-center px-3 md:px-4 py-2 md:py-3 bg-gray-50 rounded-lg md:rounded-xl border border-gray-100 w-full">
          <Search className="w-4 h-4 md:w-5 md:h-5 text-gray-400 mr-2 md:mr-3" />
          <input 
            type="text" 
            placeholder="Cari nama paket..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-xs md:text-sm text-gray-700" 
          />
        </div>
        
        <button
          onClick={() => setShowExpired(!showExpired)}
          className={`px-4 py-2.5 rounded-lg md:rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap w-full md:w-auto justify-center ${
            showExpired 
              ? 'bg-rose-50 text-rose-600 border border-rose-200' 
              : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          {showExpired ? 'Sembunyikan Kadaluarsa' : 'Lihat Paket Kadaluarsa'}
        </button>
      </div>

      {/* Package Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {displayPackages.map((paket, index) => {
          const todayStr = new Date().toISOString().split('T')[0];
          const masterRef = paket.paketMasterId ? paketMasters.find(m => m.id === paket.paketMasterId) : paket;
          const isArchived = paket.status === 'archived' || masterRef?.status === 'archived';
          const hasPassed = !!(masterRef?.tglBerangkat && masterRef.tglBerangkat < todayStr);
          const isExpired = isArchived || hasPassed;

          return (
            <div 
              key={paket.id + index} 
              onClick={() => handleOpenDetail(paket)}
              className={`bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 group transition-all hover:shadow-xl flex flex-col cursor-pointer lg:min-h-[480px] ${
                isExpired ? 'opacity-70 grayscale-[35%] border-dashed border-gray-300' : ''
              }`}
            >
              {/* Image Header with Badges & Overlays */}
            <div className="h-44 bg-gray-200 relative">
              <img 
                src={`https://images.unsplash.com/photo-${index % 3 === 0 ? '1565552643983-61629090f4fa' : index % 3 === 1 ? '1591604129939-f1efa4d9f7fa' : '1512453979798-5ea266f8880c'}?q=80&w=800&auto=format&fit=crop`} 
                alt={paket.displayName} 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
              
              {/* Top Badges */}
              <div className="absolute top-3 left-3 flex gap-2">
                <span className="bg-indigo-600/90 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">UMRAH</span>
                {isExpired ? (
                  <span className="bg-rose-600/90 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                    {isArchived ? 'DIARSIPKAN' : 'KADALUARSA'}
                  </span>
                ) : (
                  <span className="bg-emerald-500/90 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">AKTIF</span>
                )}
              </div>

              {/* Bottom Left Info */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white">
                <Calendar className="w-3 h-3" />
                <span className="text-[10px] font-black tracking-tight">{paket.tglBerangkat || '2026-05-15'}</span>
              </div>

              {/* Bottom Right Rating */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full">
                <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] font-black text-white">4.9</span>
              </div>
            </div>

            <div className="p-5 flex-grow flex flex-col">
              {/* Title */}
              <h3 className="text-gray-900 font-black text-sm md:text-base leading-tight uppercase italic tracking-tight mb-1">
                {paket.displayName}
              </h3>
              
              {/* Mitra info */}
              <div 
                onClick={(e) => {
                  if (paket.mitraId && onViewMitra) {
                    e.stopPropagation();
                    onViewMitra(paket.mitraId);
                  }
                }}
                className={`flex items-center gap-1.5 mb-3 text-[10px] font-black whitespace-nowrap overflow-hidden text-ellipsis ${
                  paket.mitraId && onViewMitra 
                    ? 'text-[#047857] hover:text-[#035a41] hover:underline cursor-pointer' 
                    : 'text-indigo-700/90'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-[#047857]" />
                <span className="uppercase tracking-wide">
                  {agencies[paket.mitraId || ''] || 'Umaroh Pusat'}
                </span>
              </div>
              
              {/* Icon Info Row */}
              <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-50">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Plane className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">{paket.maskapaiId || 'SAUDI'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">{paket.durasiHari || '9'} HARI</span>
                </div>
              </div>

              {/* Price & Action Row */}
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">HARGA JUAL</p>
                  <p className="text-emerald-600 font-black text-lg md:text-xl leading-none italic tracking-tighter">
                    {formatCurrency(paket.displayPrice)}
                  </p>
                </div>
                
                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={(e) => handleEdit(e, paket)}
                    className="w-7 h-7 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={(e) => handleShare(e, paket)}
                    className="w-7 h-7 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                  >
                    <Share2 className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, paket)}
                    className="w-7 h-7 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              {/* Detail Link Footer */}
              <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">
                    {paket.sisaKuota || 12} JAMAAH TERDAFTAR
                  </span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDetail(paket);
                  }}
                  className="text-indigo-600 font-black text-[9px] uppercase tracking-widest flex items-center gap-0.5 hover:gap-1.5 transition-all"
                >
                  DETAIL <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          );
        })}

        {displayPackages.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            Tidak ada paket yang ditemukan.
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {renderBookingModal()}
    </div>
  );
};
