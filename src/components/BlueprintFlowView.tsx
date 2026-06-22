import React, { useState, useEffect } from 'react';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  Layers, 
  Plus, 
  Edit3, 
  Check, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles, 
  RefreshCw,
  Settings,
  X,
  Clock,
  HelpCircle
} from 'lucide-react';
import { db, collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from '../firebase';

export interface BlueprintNode {
  id: string;
  step: number;
  title: string;
  role: 'mitra_dev' | 'operasional' | 'finance' | 'marketing' | 'owner' | 'jamaah' | 'mitra' | 'admin';
  roleLabel: string;
  description: string;
  inputFrom: string;
  outputTo: string;
  status: 'active' | 'warning' | 'completed';
}

const DEFAULT_NODES: BlueprintNode[] = [
  {
    id: 'node-1',
    step: 1,
    title: 'Pendaftaran & Verifikasi Kemitraan',
    role: 'mitra_dev',
    roleLabel: 'Mitra Development',
    description: 'Calon Mitra mendaftar di portal. Divisi Mitra Dev melakukan review berkas, verifikasi legalitas, rating kredibilitas, dan mengaktifkan akun kemitraan secara real-time.',
    inputFrom: 'Formulir Registrasi Mandiri Mitra',
    outputTo: 'Akses Portal & Katalog Paket Mitra',
    status: 'completed'
  },
  {
    id: 'node-2',
    step: 2,
    title: 'Penyusunan Media Promosi & Iklan',
    role: 'marketing',
    roleLabel: 'Digital Marketing',
    description: 'Divisi Digital Marketing menyusun ad-banners, template penawaran profesional, katalog promosi cerdas bertenaga AI, dan mengelola kampanye lead-generation.',
    inputFrom: 'Database Master Paket Aktif',
    outputTo: 'Portal Promosi & Media Sosial Agen',
    status: 'completed'
  },
  {
    id: 'node-3',
    step: 3,
    title: 'Alokasi Maskapai & Hotel (Allotment)',
    role: 'operasional',
    roleLabel: 'Operasional',
    description: 'Tim Operasional mendaftarkan kuota tiket penerbangan dari maskapai dan melakukan pemetaan kamar (layout hotel) di Mekkah/Madinah dengan vendor partner.',
    inputFrom: 'Quotation Kontrak Vendor',
    outputTo: 'Inventarisasi Seat & Room di Master DB',
    status: 'completed'
  },
  {
    id: 'node-4',
    step: 4,
    title: 'Pencarian & Pemesanan Paket Jamaah',
    role: 'jamaah',
    roleLabel: 'Jamaah & Mitra',
    description: 'Jamaah (atau dibantu Mitra) memilih paket Umrah, mengunci seat (booking), melengkapi data paspor, dan memasukkan detail ukuran perlengkapan.',
    inputFrom: 'Portal Katalog Paket Publik',
    outputTo: 'Data Reservasi & Tagihan Awal (Invoice)',
    status: 'active'
  },
  {
    id: 'node-5',
    step: 5,
    title: 'Verifikasi Pembayaran & Penerbitan Invoice',
    role: 'finance',
    roleLabel: 'Finance & Keuangan',
    description: 'Finance mendeteksi transfer dana jamaah, melakukan approve kuitansi pembayaran, menerbitkan Invoice digital berstempel, dan memperbarui sisa batas kredit limit mitra.',
    inputFrom: 'Bukti Transfer Pembayaran Jamaah',
    outputTo: 'Kuitansi Resmi & Status Pelunasan Rekening',
    status: 'completed'
  },
  {
    id: 'node-6',
    step: 6,
    title: 'Pemberkasan & Generate Manifest Group',
    role: 'operasional',
    roleLabel: 'Operasional',
    description: 'Tim Admin mengumpulkan dokumen asli paspor, visa, dan sertifikat vaksinasi, memasukkannya ke sistem manifest, lalu mengunduh manifest grup terpadu satu kali klik.',
    inputFrom: 'Berkas Berkas Persyaratan Jamaah',
    outputTo: 'Manifest Penerbangan & Pemesanan Bus Saudi',
    status: 'active'
  },
  {
    id: 'node-7',
    step: 7,
    title: 'Logistik, Gudang & Distribusi Perlengkapan',
    role: 'operasional',
    roleLabel: 'Operasional (Gudang)',
    description: 'Mengelola stok kain ihram, koper, mukena, dan tas paspor di gudang pusat. Mengatur jadwal pengiriman & update resi pendistribusian logistik sampai ke tangan agen/jamaah.',
    inputFrom: 'Data Ukuran & Checklist Perlengkapan',
    outputTo: 'Tanda Terima Kurir & Manifest Bagasi',
    status: 'active'
  },
  {
    id: 'node-8',
    step: 8,
    title: 'Pemberangkatan & Keberangkatan Terpandu',
    role: 'operasional',
    roleLabel: 'Operasional (Airport & TL)',
    description: 'Petugas bandara memantau gate penerbangan dan bagasi. Tour Leader (TL) memandu rombongan jamaah melalui imigrasi dan mengaktifkan real-time tracking posisi jemaah.',
    inputFrom: 'Manifest Keberangkatan & Tiket Boarding',
    outputTo: 'Notifikasi Posisi Rombongan di Madinah',
    status: 'active'
  },
  {
    id: 'node-9',
    step: 9,
    title: 'Monitoring KPI Bisnis & Evaluasi Margin',
    role: 'owner',
    roleLabel: 'Owner / CEO',
    description: 'Pemilik perusahaan memantau performa KPI seluruh divisi secara real-time, menganalisis kurva pertumbuhan omzet, retensi mitra, dan profitabilitas kumulatif.',
    inputFrom: 'Laporan Konsolidasi Finansial & Kerja Ops',
    outputTo: 'Keputusan Strategis & Rencana Ekspansi',
    status: 'completed'
  }
];

export const BlueprintFlowView: React.FC = () => {
  const [nodes, setNodes] = useState<BlueprintNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<BlueprintNode | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // 3D Visual Customizations State
  const [viewMode, setViewMode] = useState<'3d' | 'classic'>('3d');
  const [highlightRole, setHighlightRole] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Edit form states
  const [formTitle, setFormTitle] = useState('');
  const [formRole, setFormRole] = useState<'mitra_dev' | 'operasional' | 'finance' | 'marketing' | 'owner' | 'jamaah' | 'mitra' | 'admin'>('operasional');
  const [formDescription, setFormDescription] = useState('');
  const [formInputFrom, setFormInputFrom] = useState('');
  const [formOutputTo, setFormOutputTo] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'warning' | 'completed'>('active');
  const [formStep, setFormStep] = useState(1);

  useEffect(() => {
    // Sync nodes with Firestore for dynamic changes
    const unsub = onSnapshot(collection(db, 'system_blueprint_nodes'), (snapshot) => {
      if (snapshot.empty) {
        // Hydrate from DEFAULT_NODES if Firestore has no data yet
        initializeDefaultNodes();
      } else {
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BlueprintNode));
        fetched.sort((a, b) => a.step - b.step);
        setNodes(fetched);
        setLoading(false);
      }
    }, (err) => {
      console.error("Error listening to blueprints from firestore", err);
      // Fallback on local memory if permission bounds block database fetch
      setNodes(DEFAULT_NODES);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const initializeDefaultNodes = async () => {
    try {
      console.log("Initializing database blueprint nodes with premium default configurations...");
      for (const node of DEFAULT_NODES) {
        await setDoc(doc(db, 'system_blueprint_nodes', node.id), node);
      }
    } catch (e) {
      console.error("Could not write initial default blueprint settings:", e);
      setNodes(DEFAULT_NODES);
      setLoading(false);
    }
  };

  const handleSelectNode = (node: BlueprintNode) => {
    setSelectedNode(node);
    setFormTitle(node.title);
    setFormRole(node.role);
    setFormDescription(node.description);
    setFormInputFrom(node.inputFrom);
    setFormOutputTo(node.outputTo);
    setFormStatus(node.status);
    setFormStep(node.step);
    setIsEditing(true);
    setIsAdding(false);
  };

  const startAddNewNode = () => {
    setIsAdding(true);
    setIsEditing(false);
    setSelectedNode(null);
    setFormTitle('');
    setFormRole('operasional');
    setFormDescription('');
    setFormInputFrom('');
    setFormOutputTo('');
    setFormStatus('active');
    setFormStep(nodes.length > 0 ? Math.max(...nodes.map(n => n.step)) + 1 : 1);
  };

  const saveNodeChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    let roleLabelStr = 'Operasional';
    if (formRole === 'mitra_dev') roleLabelStr = 'Mitra Development';
    else if (formRole === 'finance') roleLabelStr = 'Finance & Keuangan';
    else if (formRole === 'marketing') roleLabelStr = 'Digital Marketing';
    else if (formRole === 'owner') roleLabelStr = 'Owner / CEO';
    else if (formRole === 'jamaah') roleLabelStr = 'Jamaah & Mitra';
    else if (formRole === 'mitra') roleLabelStr = 'Mitra Keagenan';
    else if (formRole === 'admin') roleLabelStr = 'Sistem Admin';

    const payload: Omit<BlueprintNode, 'id'> = {
      step: Number(formStep),
      title: formTitle,
      role: formRole,
      roleLabel: roleLabelStr,
      description: formDescription,
      inputFrom: formInputFrom,
      outputTo: formOutputTo,
      status: formStatus
    };

    try {
      if (isAdding) {
        const newId = `node-${Date.now()}`;
        await setDoc(doc(db, 'system_blueprint_nodes', newId), { id: newId, ...payload });
        setIsAdding(false);
      } else if (selectedNode) {
        await updateDoc(doc(db, 'system_blueprint_nodes', selectedNode.id), payload);
        setIsEditing(false);
        setSelectedNode(null);
      }
    } catch (e) {
      console.error("Failed to commit node updates:", e);
      // Fallback on local changes for instantaneous responsiveness inside current sandbox
      const localPayload = { id: selectedNode?.id || `node-${Date.now()}`, ...payload };
      if (isAdding) {
        setNodes(prev => [...prev, localPayload].sort((a,b) => a.step - b.step));
        setIsAdding(false);
      } else {
        setNodes(prev => prev.map(n => n.id === selectedNode?.id ? localPayload : n).sort((a,b) => a.step - b.step));
        setIsEditing(false);
        setSelectedNode(null);
      }
    }
  };

  const deleteNode = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus alur kerja ini? Diagram flowchart dan blueprint akan otomatis disesuaikan secara real-time.")) return;
    try {
      await deleteDoc(doc(db, 'system_blueprint_nodes', id));
      setIsEditing(false);
      setSelectedNode(null);
    } catch (e) {
      console.error("Could not delete node:", e);
      setNodes(prev => prev.filter(n => n.id !== id));
      setIsEditing(false);
      setSelectedNode(null);
    }
  };

  // Helper values for background highlighting on roles
  const getRoleBadgeStyle = (r: string) => {
    switch (r) {
      case 'mitra_dev': return 'bg-sky-500 text-white';
      case 'marketing': return 'bg-pink-500 text-white';
      case 'operasional': return 'bg-indigo-600 text-white';
      case 'jamaah': return 'bg-emerald-600 text-white';
      case 'finance': return 'bg-amber-600 text-white';
      case 'owner': return 'bg-rose-600 text-white';
      default: return 'bg-gray-650 text-white';
    }
  };

  const getStatusBadge = (status: 'active' | 'warning' | 'completed') => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-1 rounded-full border border-emerald-150 shadow-sm leading-none uppercase">
            <Check className="w-3 h-3" /> Stabil / Live
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-700 font-extrabold px-2.5 py-1 rounded-full border border-rose-150 shadow-sm leading-none uppercase animate-pulse">
            <AlertTriangle className="w-3 h-3" /> Penyesuaian
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 font-extrabold px-2.5 py-1 rounded-full border border-blue-150 shadow-sm leading-none uppercase">
            <Clock className="w-3 h-3 animate-spin duration-3000" /> Proses Aktif
          </span>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 relative " id="blueprint-root-container">
      {/* Visual Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-gray-150 pb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white rounded-2xl shadow-xl shadow-indigo-150 border border-indigo-600">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-black uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-150">
              Interactive Blueprint & Flowchart Engine
            </span>
            <h1 className="text-2xl md:text-3.5xl font-black text-gray-950 tracking-tight mt-1.5 leading-none flex items-center gap-2">
              Blueprint Arsitektur ERP {viewMode === '3d' && <Sparkles className="w-5 h-5 text-indigo-600 animate-bounce" />}
            </h1>
            <p className="text-xs text-gray-500 mt-1.5 font-medium">
              Alur kerja terpadu seluruh entitas sistem (Jamaah, Mitra, Admin, & Owner) secara real-time dan reaktif.
            </p>
          </div>
        </div>

        {/* Action Controls & View Selector */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Legend/Help trigger */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all font-bold text-xs cursor-pointer active:scale-95 shadow-sm"
          >
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            Petunjuk Alur
          </button>

          {/* Perspective Toggle */}
          <div className="bg-gray-100 p-1 rounded-2xl border border-gray-200/60 inline-flex shadow-inner">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${viewMode === '3d' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
            >
              🚀 3D Isometric
            </button>
            <button
              onClick={() => setViewMode('classic')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${viewMode === 'classic' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
            >
              📊 Flat Classic
            </button>
          </div>

          {/* Core Action: Add Step */}
          <button
            onClick={startAddNewNode}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 hover:shadow-indigo-100 font-extrabold text-xs cursor-pointer shadow-lg shadow-indigo-50 relative overflow-hidden transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Tambah Alur Baru
          </button>
        </div>
      </div>

      {/* Dynamic Popups or Guides */}
      <AnimatePresence>
        {showHelp && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-6 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-3xl border border-indigo-950 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Sparkles className="w-48 h-48 text-indigo-400" />
            </div>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-extrabold text-lg text-indigo-200">Reaktivitas Arsitektur Terpadu</h4>
                <p className="text-xs text-indigo-100/90 max-w-3xl mt-1.5 leading-relaxed">
                  Modul ini mencerminkan state operasional yang solid. Setiap administrator dalam ERP dapat menambah, mengedit, ataupun memodifikasi langkah alur ini. Setiap kali Anda menekan tombol simpan, data akan tersinkronisasi ke Cloud Firestore dan merestrukturisasi visual flowchart 3D secara instan bagi seluruh pengguna ERP lainnya.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-5">
                  <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/40">
                    <span className="text-[10px] font-black tracking-widest text-indigo-400 block uppercase mb-1">Mekanisme Relasi</span>
                    <p className="text-[11px] text-gray-300">Input dari langkah sebelumnya terhubung secara logis ke tahapan output selanjutnya.</p>
                  </div>
                  <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/40">
                    <span className="text-[10px] font-black tracking-widest text-pink-400 block uppercase mb-1">UI 3D Perspektif</span>
                    <p className="text-[11px] text-gray-300">Gunakan visual 3D untuk merasakan layout kedalaman (depth perspective) alur yang interaktif.</p>
                  </div>
                  <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/40">
                    <span className="text-[10px] font-black tracking-widest text-emerald-400 block uppercase mb-1">Keterikatan Peran</span>
                    <p className="text-[11px] text-gray-300">Saring dan sorot alur berdasarkan divisi penanggung jawab tertentu melalui tombol filter.</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-indigo-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Filter Bar by Roles */}
      <div className="bg-white p-4 rounded-3xl border border-gray-150 shadow-sm mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2">Sorot Peran:</span>
          <div className="flex flex-wrap gap-1.5 pl-1">
            <button
              onClick={() => setHighlightRole(null)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${!highlightRole ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-150'}`}
            >
              Semua Divisi ({nodes.length})
            </button>
            {(['mitra_dev', 'operasional', 'finance', 'marketing', 'owner', 'jamaah'] as const).map((r) => {
              const count = nodes.filter(n => n.role === r).length;
              const label = r === 'mitra_dev' ? 'Mitra Dev' : r === 'marketing' ? 'Marketing' : r === 'operasional' ? 'Operasional' : r === 'finance' ? 'Finance' : r === 'owner' ? 'Owner' : 'Jamaah / Agen';
              return (
                <button
                  key={r}
                  onClick={() => setHighlightRole(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all relative cursor-pointer ${highlightRole === r ? getRoleBadgeStyle(r) + ' shadow-sm' : 'bg-gray-100 text-gray-650 hover:bg-gray-150'}`}
                >
                  {label}
                  {count > 0 && (
                    <span className="ml-1.5 bg-white/20 text-white rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="text-[11px] text-gray-450 font-mono font-bold pr-2 bg-gray-50 px-3 py-1 bg-indigo-50/50 rounded-xl border border-indigo-100/50 text-indigo-700">
          STATUS ALUR: {nodes.filter(n => n.status === 'completed').length} LIVE / {nodes.filter(n => n.status === 'active').length} BERJALAN
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center bg-white rounded-3xl border border-gray-150 shadow-sm flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-xs uppercase font-extrabold tracking-wider text-gray-450">Memuat Blueprint Sistem dari Firestore...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left / Middle: Visual Area Flowchart */}
          <div className={`lg:col-span-8 flex flex-col gap-6`}>
            
            {/* The 3D Render Canvas Container */}
            <div 
              className={`bg-gradient-to-br from-indigo-950/5 via-slate-900/5 to-emerald-950/5 p-4 md:p-8 rounded-[36px] border border-gray-250/70 shadow-inner relative overflow-hidden transition-all duration-500`}
              style={viewMode === '3d' ? { perspective: '1200px' } : undefined}
            >
              <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
              
              {/* Dynamic Connecting Lines SVG behind nodes */}
              <div className="absolute inset-0 pointer-events-none" />

              <motion.div 
                className="relative space-y-8 md:space-y-12"
                style={viewMode === '3d' ? { rotateX: 18, rotateZ: -4, scale: 0.98 } : undefined}
                layout
              >
                {nodes.length === 0 ? (
                  <div className="p-12 text-center bg-white/80 backdrop-blur rounded-2xl shadow-sm text-gray-400">
                    Belum ada parameter simpul langkah yang dikonfigurasikan. Tambah baru untuk memulai!
                  </div>
                ) : (
                  nodes.map((node, index) => {
                    const isMuted = highlightRole && node.role !== highlightRole;
                    const isSelected = selectedNode?.id === node.id;
                    const nextNode = nodes[index + 1];

                    return (
                      <div key={node.id} className="relative">
                        
                        {/* 3D Isometric Card Container with Custom Perspective shadows */}
                        <motion.div
                          onClick={() => handleSelectNode(node)}
                          className={`
                            relative bg-white p-5 md:p-6 rounded-3xl border text-left cursor-pointer transition-all duration-300
                            ${isMuted ? 'opacity-30 blur-[0.5px]' : 'opacity-100 scale-100 hover:-translate-y-1.5'}
                            ${isSelected ? 'border-indigo-600 shadow-xl ring-2 ring-indigo-400/20' : 'border-gray-200/90 shadow-md'}
                            ${viewMode === '3d' ? 'shadow-[0_12px_24px_-8px_rgba(0,0,0,0.1),0_20px_40px_-4px_rgba(99,102,241,0.05)]' : ''}
                          `}
                          whileHover={{ scale: isMuted ? 1 : 1.015 }}
                          layout
                        >
                          {/* Inner glowing glow line if active */}
                          {node.status === 'active' && (
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-3xl" />
                          )}
                          
                          <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
                            <div className="flex gap-4 items-start">
                              {/* Step numbering visually elegant */}
                              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-indigo-50/80 border border-indigo-100 shadow-inner flex items-center justify-center font-extrabold text-sm md:text-md text-indigo-700 shrink-0 font-mono">
                                0{node.step}
                              </div>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-black text-gray-950 text-sm md:text-base tracking-tight leading-snug">
                                    {node.title}
                                  </h3>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getRoleBadgeStyle(node.role)}`}>
                                    {node.roleLabel}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                                  {node.description}
                                </p>

                                {/* Input Output Meta flow details */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 border-t border-gray-100 pt-3 text-[11px] text-gray-500">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-gray-450 uppercase shrink-0">Inputs From:</span>
                                    <span className="truncate bg-gray-50 text-gray-600 px-2 py-0.5 rounded-md border border-gray-100 font-medium">{node.inputFrom || 'Pemicu Eksternal'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-indigo-400 uppercase shrink-0">Outputs To:</span>
                                    <span className="truncate bg-indigo-50/30 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100/50 font-semibold">{node.outputTo || 'Simpul Akhir'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Status badge and step controller */}
                            <div className="flex flex-row md:flex-col items-center justify-between w-full md:w-auto shrink-0 pt-2 md:pt-0 gap-2 border-t md:border-t-0 border-gray-100">
                              {getStatusBadge(node.status)}
                              <span className="text-[10px] font-mono text-gray-400 font-extrabold uppercase">Step {node.step} of {nodes.length}</span>
                            </div>
                          </div>

                          {/* Hover edit pen icon */}
                          <div className="absolute top-4 right-4 text-gray-300 hover:text-indigo-600 transition-colors opacity-0 hover:opacity-100 group">
                            <Edit3 className="w-4 h-4" />
                          </div>
                        </motion.div>

                        {/* Animated connector arrow */}
                        {nextNode && (
                          <div className="w-full h-8 md:h-12 flex items-center justify-center relative pointer-events-none">
                            <div className="absolute top-0 bottom-0 w-0.5 bg-dashed border-l border-indigo-200/80" />
                            <motion.div 
                              className="bg-indigo-650 text-white rounded-full p-1.5 shadow-md border border-indigo-500"
                              animate={{ y: [ -4, 4, -4 ] }}
                              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            >
                              <ArrowRight className="w-3.5 h-3.5 rotate-90" />
                            </motion.div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </motion.div>
            </div>

            {/* Explanation of Roles Blueprint Cards in magnificent 3D design */}
            <div className="mt-8">
              <h2 className="text-xl font-black text-gray-900 tracking-tight mb-4 flex items-center gap-2">
                <span>📚 Panduan Peran & Tanggung Jawab ERP</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold py-1 px-2.5 rounded-full border border-indigo-150 uppercase font-mono">ALL ROLES MAPPED</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    role: 'mitra_dev',
                    label: 'Mitra Development',
                    color: 'from-sky-500 to-blue-650',
                    text: 'Mengontrol penuh pendaftaran keagenan baru, memproses validasi berkas fisik, mengawali kontrak kerjasama legal, dan membantu integrasi dashboard e-learning bagi para mitra.'
                  },
                  {
                    role: 'operasional',
                    label: 'Divisi Operasional',
                    color: 'from-indigo-600 to-indigo-850',
                    text: 'Berperan besar mendaftarkan hotel, maskapai penerbangan, mengelola manifest keberangkatan, memonitor pembagian barang inventaris, hingga penunjukan pendamping tour leader di bandara.'
                  },
                  {
                    role: 'finance',
                    label: 'Divisi Keuangan & Billing',
                    color: 'from-amber-600 to-amber-700',
                    text: 'Bertanggung jawab memonitor setoran awal jamaah, mengonfirmasi pelunasan rekening bank, menerbitkan kwitansi resmi berstempel digital, dan mengelola cost ledger tagihan ke vendor.'
                  },
                  {
                    role: 'marketing',
                    label: 'Digital Marketing & AI',
                    color: 'from-pink-500 to-pink-700',
                    text: 'Mendisain materi konten digital, menata ad-campaign sosial media, merespon scoring calon prospek pembeli, dan mengonfigurasikan sistem asisten AI interaktif bagi marketing umum.'
                  },
                  {
                    role: 'owner',
                    label: 'Owner / Direksi Utama',
                    color: 'from-rose-500 to-rose-700',
                    text: 'Memantau indikator performansi global perusahaan (KPI), melihat visualisasi omzet terkumpul secara kumulatif, serta menyetujui kebijakan strategis ekspansi usaha travel.'
                  },
                  {
                    role: 'jamaah',
                    label: 'Jamaah & Mitra Keagenan',
                    color: 'from-emerald-500 to-emerald-700',
                    text: 'Pengguna utama yang meresolusi aktivitas pembelian tiket, mendaftar langsung lewat katalog, menyerahkan koper penjelajah, mendownload invoice, dan melakukan lacak lokasi rombongan.'
                  }
                ].map((p, ix) => (
                  <div 
                    key={ix} 
                    className={`bg-white p-5 rounded-3xl border border-gray-150 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 flex flex-col justify-between`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`w-3 h-3 rounded-full bg-gradient-to-r ${p.color} shrink-0`} />
                        <h4 className="font-extrabold text-gray-950 text-xs md:text-sm uppercase tracking-wide">{p.label}</h4>
                      </div>
                      <p className="text-[11px] text-gray-650 leading-relaxed font-medium">
                        {p.text}
                      </p>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-gray-400 block mt-4 uppercase self-start bg-gray-50 px-2 py-0.5 rounded border border-gray-100">Role Code: {p.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Side Editor / Adder Panel */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Context Header editor */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/40 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-xl">
                    <Settings className="w-4 h-4 text-indigo-600 animate-spin duration-3000" />
                  </div>
                  <h3 className="font-black text-gray-950 text-sm uppercase tracking-tight">
                    {isAdding ? "Tambah Alur" : isEditing ? "Detail & Edit Alur" : "Kendali Alur Kerja"}
                  </h3>
                </div>
                {!isAdding && !isEditing && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded">SIAP MONITOR</span>
                )}
              </div>

              {isAdding || isEditing ? (
                <form onSubmit={saveNodeChanges} className="space-y-4">
                  {/* Step Order & Title */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">No Urut</label>
                      <input
                        type="number"
                        required
                        value={formStep}
                        onChange={(e) => setFormStep(Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nama Tahap / Alur</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Pembagian Kain Ihram"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Divisi Penanggung Jawab */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Divisi Penanggung Jawab (Role)</label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as BlueprintNode['role'])}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="mitra_dev">Mitra Development</option>
                      <option value="operasional">Tim Operasional</option>
                      <option value="finance">Tim Finance & Finance Cumulative</option>
                      <option value="marketing">Digital Marketing & Leads</option>
                      <option value="owner">Owner / Board of Directors</option>
                      <option value="jamaah">Jamaah Mandiri & Rombongan</option>
                    </select>
                  </div>

                  {/* Description deskripsi lengkap */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Detail Proses / Prosedur Standar</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Jelaskan tahapan proses bisnis, apa saja instrumen sistem yang digunakan..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700/95 focus:bg-white focus:ring-1 focus:ring-indigo-500 leading-normal"
                    />
                  </div>

                  {/* Inputs Outputs dari mana kemana */}
                  <div className="space-y-3 p-3 bg-gray-50 rounded-2xl border border-gray-200/60">
                    <span className="text-[9px] font-black tracking-widest text-indigo-700 block uppercase">Logika Jalur Aliran</span>
                    
                    <div>
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-1">Menerima Input Dari:</label>
                      <input
                        type="text"
                        placeholder="e.g. Deposit Tunai atau Submit Dokumen"
                        value={formInputFrom}
                        onChange={(e) => setFormInputFrom(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-750 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-1">Menghasilkan Output Ke:</label>
                      <input
                        type="text"
                        placeholder="e.g. Generate PDF Tiket atau Pengepakan Koper"
                        value={formOutputTo}
                        onChange={(e) => setFormOutputTo(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-750 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Status Alur */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Status Keandalan / Sistem</label>
                    <div className="flex gap-2">
                      {[
                        { val: 'completed', label: 'Stabil / Live', style: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' },
                        { val: 'active', label: 'Proses Aktif', style: 'border-blue-200 text-blue-700 hover:bg-blue-50' },
                        { val: 'warning', label: 'Butuh Penyesuaian', style: 'border-rose-200 text-rose-700 hover:bg-rose-50' }
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setFormStatus(item.val as BlueprintNode['status'])}
                          className={`flex-1 py-2 text-[10px] font-extrabold border rounded-xl cursor-pointer ${formStatus === item.val ? 'bg-indigo-600 text-white border-indigo-650 shadow-sm' : 'bg-gray-50 ' + item.style}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Cancel Hapus buttons */}
                  <div className="flex flex-col gap-2 pt-3">
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 text-white font-black py-2.5 rounded-xl hover:bg-indigo-700 shadow-md text-xs uppercase cursor-pointer"
                    >
                      {isAdding ? "Buat / Publish Simpul Kerja" : "Simpan Perubahan Alur"}
                    </button>
                    
                    <div className="flex gap-2">
                      {isEditing && selectedNode && (
                        <button
                          type="button"
                          onClick={() => deleteNode(selectedNode.id)}
                          className="flex-1 border border-rose-200 hover:bg-rose-50 text-rose-600 font-extrabold py-2 rounded-xl text-[11px] uppercase cursor-pointer"
                        >
                          Hapus Simpul
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsAdding(false);
                          setIsEditing(false);
                          setSelectedNode(null);
                        }}
                        className="flex-1 bg-gray-100 hover:bg-gray-150 text-gray-700 font-extrabold py-2 rounded-xl text-[11px] uppercase cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="text-center p-6 bg-gray-50 rounded-2xl border border-gray-150">
                    <Sparkles className="w-8 h-8 mx-auto text-indigo-600/70 opacity-80 mb-2 animate-bounce" />
                    <p className="text-xs font-black uppercase text-gray-900 tracking-wider">Pilih Simpul Alur Kerja</p>
                    <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                      Klik salah satu kartu alur kerja pada diagram interaktif untuk mempelajari bagan logistik sirkulasi input/output, atau mengedit data simulasi workflow aslinya.
                    </p>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Integrasi Cloud</h4>
                    <div className="flex items-center gap-3 text-xs bg-indigo-50/40 p-3.5 rounded-2xl border border-indigo-100/50">
                      <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-ping" />
                      <div className="font-medium text-indigo-950 text-[11px] leading-relaxed">
                        Arsitektur ini didukung oleh database Firestore. Perubahan di sini langsung didistribusikan ke seluruh admin yang terhubung di Umaroh ERP Center.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Quick Summary of Role Stats */}
            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm">
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-black px-2.5 py-1 rounded-full border border-indigo-150 uppercase tracking-wider">Statistik Distribusi Alur</span>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-50 p-3.5 rounded-2xl text-center border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">LANGKAH TOTAL</span>
                  <p className="text-2xl font-black text-indigo-600 mt-1">{nodes.length}</p>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl text-center border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">DIVISI TERLIBAT</span>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{new Set(nodes.map(n => n.role)).size}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
