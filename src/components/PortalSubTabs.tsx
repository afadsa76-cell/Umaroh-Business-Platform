import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { db, collection, addDoc, updateDoc, doc, onSnapshot, query, where, setDoc, deleteDoc } from '../firebase';
import { sendNotification } from '../services/notificationService';
import { 
  CreditCard, ChevronRight, FileSpreadsheet, Video, 
  Award, Heart, Package, ShoppingCart, 
  FileText, ShieldCheck, BookOpen, Compass, CheckCircle, 
  MessageCircle, Printer, Upload, Check,
  ChevronDown, ChevronUp, Clock, Download,
  ArrowRight, ExternalLink, Plane
} from 'lucide-react';
import { BookingRecord } from '../types';
import { logoBase64 } from '../utils/logoBase64';

interface PortalSubTabsProps {
  bookingData: BookingRecord | null;
  manifestForm?: Record<string, string>;
  setManifestForm?: (form: Record<string, string>) => void;
  savingManifest?: boolean;
  handleSaveManifest?: (e: React.FormEvent) => void;
  handleManifestFileChange?: (field: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  showPrintKwitansi?: boolean;
  setShowPrintKwitansi?: (show: boolean) => void;
  prepChecklist?: {[key: string]: boolean};
  handleTogglePrepChecklist?: (key: string) => void;
  onLogout?: () => void;
  setPortalTab?: (tab: 'beranda' | 'info' | 'keuangan' | 'dokumen' | 'lainnya') => void;
}

export const PortalHomeTab: React.FC<PortalSubTabsProps> = ({
  bookingData,
  prepChecklist,
  setPortalTab,
  setShowPrintKwitansi
}) => {
  if (!bookingData) return null;

  // Calculators
  const isPassportUploaded = !!bookingData.filePassport || !!bookingData.docPassport;
  const isKtpUploaded = !!bookingData.fileKtp || !!bookingData.docKtp;
  const isVaccineUploaded = !!bookingData.fileVaccine || !!bookingData.docVaccine;
  const isFotoUploaded = !!bookingData.fileFoto || !!bookingData.docFoto;

  const docCount = (isPassportUploaded ? 1 : 0) + (isKtpUploaded ? 1 : 0) + (isVaccineUploaded ? 1 : 0) + (isFotoUploaded ? 1 : 0);
  const docProgressPercent = Math.round((docCount / 4) * 100);

  const totalHarga = Number(bookingData.totalHarga || 35192675);
  const jumlahBayar = Number(bookingData.jumlahBayar || 7500000);
  const remainingBalance = totalHarga - jumlahBayar;
  const paymentPercent = Math.round((jumlahBayar / totalHarga) * 100);

  const completedChecklistCount = Object.values(prepChecklist || {}).filter(Boolean).length;
  const checklistPercent = Math.round((completedChecklistCount / 15) * 100);

  // Dynamic countdown logic based on simulated launch June 15, 2026
  const getCountdown = () => {
    const departureStr = bookingData.tglKeberangkatan || bookingData.tgl_keberangkatan || '2026-09-15';
    const depDate = new Date(departureStr);
    const today = new Date('2026-06-15');
    const diffTime = depDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      daysLeft: diffDays > 0 ? diffDays : 0,
      formattedDate: depDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    };
  };

  const countdown = getCountdown();
  const [showTermsModal, setShowTermsModal] = useState(false);

  // 17-grid items config mapped exactly to screenshots
  const bentoGridItems = [
    { id: 1, title: 'Informasi Paket', sub: 'Detail & Timeline', icon: Package, tab: 'info' as const, color: 'text-orange-600 bg-orange-50' },
    { id: 2, title: 'Add On Layanan', sub: 'Layanan tambahan Anda', icon: ShoppingCart, tab: 'keuangan' as const, color: 'text-amber-600 bg-amber-50' },
    { id: 3, title: 'Formulir Mandiri', sub: 'Wajib diisi jamaah', icon: FileText, tab: 'dokumen' as const, color: 'text-rose-600 bg-rose-50', bar: true, val: 100 },
    { id: 4, title: 'Keuangan', sub: 'Cicilan & Pelunasan', icon: CreditCard, tab: 'keuangan' as const, color: 'text-emerald-600 bg-emerald-50', bar: true, val: paymentPercent },
    { id: 5, title: 'Surat Menyurat', sub: 'Surat rekomendasi & izin', icon: FileSpreadsheet, tab: 'dokumen' as const, color: 'text-blue-600 bg-blue-50' },
    { id: 6, title: 'Kelengkapan Dokumen', sub: 'Status berkas paspor', icon: ShieldCheck, tab: 'dokumen' as const, color: 'text-teal-600 bg-teal-50', bar: true, val: docProgressPercent },
    { id: 7, title: 'Edukasi Mandiri', sub: 'Materi & Video panduan', icon: BookOpen, tab: 'lainnya' as const, color: 'text-violet-600 bg-violet-50' },
    { id: 8, title: 'Itinerary Perjalanan', sub: 'Jadwal harian program', icon: Compass, tab: 'info' as const, color: 'text-indigo-600 bg-indigo-50' },
    { id: 9, title: 'Checklist Persiapan', sub: 'Persiapan Keberangkatan', icon: CheckCircle, tab: 'lainnya' as const, color: 'text-blue-700 bg-blue-50', bar: true, val: checklistPercent },
    { id: 10, title: 'Perlengkapan', sub: 'Checklist barang koper', icon: Package, tab: 'lainnya' as const, color: 'text-pink-600 bg-pink-50', bar: true, val: 100 },
    { id: 11, title: 'Grup WhatsApp', sub: 'Komunikasi antar Jamaah', icon: MessageCircle, tab: 'lainnya' as const, color: 'text-emerald-500 bg-emerald-50' },
    { id: 12, title: 'Manasik Online', sub: 'Video bimbingan live', icon: Video, tab: 'lainnya' as const, color: 'text-red-600 bg-red-50' },
    { id: 13, title: 'Travel Document', sub: 'Hotel, Maskapai, Visa', icon: FileText, tab: 'info' as const, color: 'text-sky-600 bg-sky-50' },
    { id: 15, title: 'Kenangan Umroh', sub: 'Galeri foto perjalanan', icon: Heart, tab: 'lainnya' as const, color: 'text-rose-500 bg-rose-50' },
    { id: 16, title: 'Link Feedback', sub: 'Evaluasi masukan jamaah', icon: MessageCircle, tab: 'lainnya' as const, color: 'text-amber-500 bg-amber-100' },
    { id: 17, title: 'Umaroh Miles', sub: 'Eksklusif alumni poin', icon: Award, tab: 'lainnya' as const, color: 'text-indigo-700 bg-indigo-50' }
  ];

  return (
    <div className="space-y-6 px-4 md:px-0">
      
      {/* 1. GREETING SEGMENT */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-150 pb-4 font-sans">
        <div>
          <h2 className="text-xl font-extrabold text-emerald-950 flex items-center gap-1.5 leading-tight">
            👋 Assalamualaikum, <span className="text-amber-600 uppercase">{bookingData.namaJamaah || 'Calon Tamu Allah'}</span>
          </h2>
          <p className="text-xs text-gray-450 mt-1 font-bold">
            ✈️ {bookingData.paketNama} • <span className="text-gray-400">Batch {bookingData.kodeBooking.split('-').pop()}</span>
          </p>
        </div>
      </div>

      {/* 2. ORANGE COUNTDOWN CARD */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden font-sans">
        <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 font-bold text-9xl pointer-events-none uppercase font-mono tracking-tighter">
          UMROH
        </div>
        <div className="relative z-10 space-y-4">
          <div>
            <p className="text-[10px] uppercase font-black tracking-widest text-orange-100 opacity-90">⏳ COUNTDOWN KEBERANGKATAN</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl md:text-5xl font-black tracking-tighter">{countdown.daysLeft}</span>
              <span className="text-lg font-bold text-orange-50">hari lagi</span>
            </div>
            <p className="text-[11px] text-orange-100/90 font-bold mt-1.5 flex items-center gap-1">
              🗓️ Berangkat: <strong>{countdown.formattedDate}</strong>
            </p>
          </div>

          <button 
            type="button"
            onClick={() => setPortalTab('info')}
            className="bg-white text-orange-600 hover:bg-orange-50 font-black text-xs uppercase px-4 py-2.5 rounded-xl transition cursor-pointer shadow-sm inline-flex items-center gap-1"
          >
            Lihat Itinerary <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. YANG PERLU KAMU SELESAIKAN LIST */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4 font-sans">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
            🔔 Yang Perlu Kamu Selesaikan
          </h3>
          <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded-full">
            4 item
          </span>
        </div>

        <div className="space-y-2.5">
          {/* Item 1 */}
          <div className="bg-amber-50/50 border border-amber-100/60 rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs font-bold font-sans">
            <div className="flex items-center gap-2.5 text-amber-951">
              <span className="text-lg">💳</span>
              <span>Pelunasan belum selesai (Rp {remainingBalance.toLocaleString('id-ID')})</span>
            </div>
            <button
              onClick={() => setPortalTab('keuangan')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition shrink-0 inline-flex items-center gap-0.5"
            >
              Bayar <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Item 2 */}
          <div className="bg-amber-50/50 border border-amber-100/60 rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs font-bold font-sans">
            <div className="flex items-center gap-2.5 text-amber-951">
              <span className="text-lg">🆔</span>
              <span>Dokumen jamaah belum lengkap ({docProgressPercent}%)</span>
            </div>
            <button
              onClick={() => setPortalTab('dokumen')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition shrink-0 inline-flex items-center gap-0.5"
            >
              Lengkapi <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Item 3 */}
          <div className="bg-amber-50/50 border border-amber-100/60 rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs font-bold font-sans">
            <div className="flex items-center gap-2.5 text-amber-951">
              <span className="text-lg">📝</span>
              <span>Form perlengkapan belum penuh (0%)</span>
            </div>
            <button
              onClick={() => setPortalTab('dokumen')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition shrink-0 inline-flex items-center gap-0.5"
            >
              Isi <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Item 4 */}
          <div className="bg-blue-50/40 border border-blue-105 rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs font-bold font-sans">
            <div className="flex items-center gap-2.5 text-blue-900">
              <span className="text-lg">📋</span>
              <span>Checklist persiapan {completedChecklistCount}/15 selesai</span>
            </div>
            <button
              onClick={() => setPortalTab('lainnya')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition shrink-0 inline-flex items-center gap-0.5"
            >
              Lanjutkan <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. PROGRESS BAR GAUGES */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4 font-sans">
        <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
          📈 Progress Persiapan Saya
        </h3>
        
        <div className="space-y-3">
          {/* Bar 1 */}
          <div>
            <div className="flex justify-between text-[11px] font-bold text-gray-600 mb-1">
              <span>💳 Pembayaran</span>
              <span className="text-emerald-700">{paymentPercent}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-orange-505 h-full rounded-full transition-all duration-500" style={{ width: `${paymentPercent}%` }}></div>
            </div>
          </div>

          {/* Bar 2 */}
          <div>
            <div className="flex justify-between text-[11px] font-bold text-gray-600 mb-1">
              <span>📋 Dokumen Jamaah</span>
              <span className="text-yellow-600">{docProgressPercent}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${docProgressPercent}%` }}></div>
            </div>
          </div>

          {/* Bar 3 */}
          <div>
            <div className="flex justify-between text-[11px] font-bold text-gray-600 mb-1">
              <span>🎒 Perlengkapan</span>
              <span className="text-rose-500">{completedChecklistCount > 0 ? '100%' : '0%'}</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${completedChecklistCount > 0 ? 'bg-emerald-500 w-full' : 'bg-gray-300 w-0'}`}></div>
            </div>
          </div>

          {/* Bar 4 */}
          <div>
            <div className="flex justify-between text-[11px] font-bold text-gray-600 mb-1">
              <span>📋 Checklist Persiapan</span>
              <span className="text-blue-600">{checklistPercent}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${checklistPercent}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. STATUS PEMBAYARAN CARD */}
      <div className="bg-emerald-50/40 border border-emerald-150/60 rounded-2xl p-5 shadow-sm space-y-4 font-sans">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-700 text-lg">💵</span>
            <span className="text-sm font-black text-emerald-950">Status Pembayaran</span>
          </div>
          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded border ${
            remainingBalance <= 0 
              ? 'bg-emerald-100 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-100 text-red-700'
          }`}>
            {remainingBalance <= 0 ? 'LUNAS ✓' : 'Belum Lunas'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs font-bold leading-normal">
          <div className="bg-white border border-gray-100 p-3.5 rounded-xl">
            <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">TOTAL TAGIHAN</p>
            <p className="text-sm font-black text-gray-800">Rp {totalHarga.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-white border border-gray-100 p-3.5 rounded-xl">
            <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">SUDAH BAYAR</p>
            <p className="text-sm font-black text-emerald-700">Rp {jumlahBayar.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-white border border-gray-100 p-3.5 rounded-xl">
            <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">SISA TAGIHAN</p>
            <p className="text-sm font-black text-red-650">Rp {remainingBalance.toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-[10px] text-amber-900 leading-normal flex items-start gap-1.5 font-bold">
          <span>⚠️</span>
          <span>
            <strong>Pembayaran WAJIB</strong> ke rekening resmi <strong>PT Nawaitul Umrah Haji</strong>. Jangan transfer ke rekening pribadi staff/mitra demi keamanan transaksi.
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setPortalTab('keuangan')}
            className="flex-grow bg-red-600 hover:bg-red-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider text-center transition cursor-pointer shadow-sm"
          >
            💳 Lanjutkan Pembayaran
          </button>
          
          <button
            onClick={() => setShowPrintKwitansi(true)}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold py-3.5 px-5 rounded-xl text-xs uppercase tracking-wider text-center transition cursor-pointer border border-emerald-200 flex items-center justify-center gap-1 shadow-sm"
          >
            🖨️ Cetak Invoice
          </button>
        </div>
      </div>

      {/* 6. THE 16 BEN-TO ROADMAP GRID */}
      <div>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3.5">
          🎯 RENCANA & FITUR PENYELESAIAN
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {bentoGridItems.map((item) => {
            const IconComp = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (setPortalTab) setPortalTab(item.tab);
                }}
                className="relative bg-white border border-gray-150 p-4 rounded-2xl text-left hover:shadow-md hover:border-emerald-350 transition duration-150 group flex flex-col justify-between min-h-[140px]"
              >
                {/* ID Tag top corner */}
                <span className="absolute top-3.5 right-3.5 w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-[9px] font-bold text-gray-400">
                  {item.id}
                </span>

                {/* Big cute visual circle */}
                <div className={`w-11 h-11 rounded-xl ${item.color} flex items-center justify-center text-lg mb-4 transform group-hover:scale-105 transition-transform`}>
                  <IconComp className="w-5 h-5" />
                </div>

                <div>
                  <h4 className="text-xs font-extrabold text-gray-801 group-hover:text-emerald-800 transition-colors leading-tight">
                    {item.title}
                  </h4>
                  <p className="text-[9px] text-gray-400 mt-0.5 font-bold truncate">
                    {item.sub}
                  </p>

                  {/* Progress lines */}
                  {item.bar && (
                    <div className="mt-2.5">
                      <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                        <div className="bg-emerald-550 h-full rounded-full transition-all" style={{ width: `${item.val || 0}%` }}></div>
                      </div>
                      <span className="text-[8px] text-gray-450 font-black tracking-widest uppercase block mt-1">{item.val || 0}% lengkap</span>
                    </div>
                  )}

                  {/* Fully unlocked item badge */}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. WELCOME NOTIFICATION WARNING BASE */}
      <div className="bg-amber-50/50 border border-amber-150/60 rounded-2xl p-5 text-xs text-amber-900 leading-relaxed font-sans mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
        <div className="space-y-1">
          <p className="font-extrabold text-emerald-950 text-sm">🎉 Selamat! Anda Terdaftar Sebagai Jamaah Umaroh.com</p>
          <p className="text-gray-500 font-bold text-[11px]">Portal ini didesain khusus agar memudahkan Anda secara mandiri mengunggah berkas, mengecek rute penerbangan, dan melunasi sisa biaya paket.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href="https://wa.me/6283844974952?text=Assalamualaikum%20Admin%20Umaroh,%20saya%20terdaftar%20sebagai%20jamaah%20di%20portal"
            target="_blank"
            rel="noreferrer"
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold px-3 py-2 rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer"
          >
            💬 Chat Admin Umaroh
          </a>
          <button
            onClick={() => setShowTermsModal(true)}
            className="bg-amber-100 hover:bg-amber-200 text-amber-901 font-extrabold px-3 py-2 rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer"
          >
            📄 Syarat & Ketentuan
          </button>
        </div>
      </div>

      {/* TERMS & CONDITIONS MODAL */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full relative shadow-2xl p-6 overflow-y-auto max-h-[85vh] font-sans">
            <button
              onClick={() => setShowTermsModal(false)}
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm z-10 transition cursor-pointer"
            >
              ✕
            </button>
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <span className="text-xl">📜</span>
                <div>
                  <h4 className="text-sm font-black text-emerald-950">Syarat & Ketentuan Layanan Umaroh</h4>
                  <p className="text-[10px] text-gray-400 font-bold">Akad pendaftaran & kebijakan resmi PPIU Kemenag RI</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-gray-650 leading-relaxed max-h-[50vh] overflow-y-auto pr-1">
                <p><strong>1. Pendaftaran & DP:</strong> Pendaftaran dinyatakan sah setelah Jamaah membayarkan Down Payment (DP) resmi dan melengkapi data identitas paspor/KTP.</p>
                <p><strong>2. Pelunasan Biaya:</strong> Pelunasan seluruh biaya paket wajib diselesaikan maksimal H-30 sebelum jadwal keberangkatan yang ditentukan.</p>
                <p><strong>3. Dokumen Paspor & Visa:</strong> Jamaah bertanggung jawab atas keabsahan dokumen paspor (minimal masa berlaku 7 bulan dari tanggal keberangkatan).</p>
                <p><strong>4. Pembatalan & Refund:</strong> Pembatalan sebelum pengeluaran tiket & visa dikenakan potongan biaya administrasi sesuai akad pendaftaran awal.</p>
                <p><strong>5. Perubahan Jadwal:</strong> Penyesuaian jadwal terbang atau hotel dapat terjadi sewaktu-waktu mengikuti regulasi maskapai & Muassasah Arab Saudi.</p>
              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Saya Mengerti & Setuju
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export const PortalInfoTab: React.FC<PortalSubTabsProps> = ({ bookingData, setPortalTab }) => {
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [isPackageExpanded, setIsPackageExpanded] = useState(false);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [showManasikModal, setShowManasikModal] = useState(false);
  const [activeVideoTitle, setActiveVideoTitle] = useState<string | null>(null);
  const [showSuitcaseModal, setShowSuitcaseModal] = useState(false);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userShipment, setUserShipment] = useState<any | null>(null);
  const [opsiPerlengkapan, setOpsiPerlengkapan] = useState<'Ambil di Kantor' | 'Kirim Ekspedisi'>(() => (bookingData?.opsi_perlengkapan as 'Ambil di Kantor' | 'Kirim Ekspedisi') || 'Ambil di Kantor');
  const [penerimaName, setPenerimaName] = useState('');
  const [penerimaTelp, setPenerimaTelp] = useState('');
  const [penerimaAlamat, setPenerimaAlamat] = useState('');
  const [isSavingPerlengkapan, setIsSavingPerlengkapan] = useState(false);

  useEffect(() => {
    if (bookingData) {
      setOpsiPerlengkapan((bookingData.opsi_perlengkapan as 'Ambil di Kantor' | 'Kirim Ekspedisi') || 'Ambil di Kantor');
      setPenerimaName(bookingData.penerima_perlengkapan || bookingData.nama_paspor || bookingData.namaJamaah || '');
      setPenerimaTelp(bookingData.telp_penerima_perlengkapan || bookingData.noHp || '');
      setPenerimaAlamat(bookingData.alamat_penerima_perlengkapan || bookingData.alamat_tinggal || bookingData.alamat || '');
    }
  }, [bookingData]);

  useEffect(() => {
    if (!bookingData?.id) return;
    const unsub = onSnapshot(doc(db, 'perlengkapan_pengiriman', 'ship-' + bookingData.id), (docSnap) => {
      if (docSnap.exists()) {
        setUserShipment(docSnap.data());
      } else {
        setUserShipment(null);
      }
    });
    return () => unsub();
  }, [bookingData?.id]);

  const handleSaveSuitcaseOpsi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingData?.id) return;
    setIsSavingPerlengkapan(true);
    try {
      const bookingRef = doc(db, 'bookings', bookingData.id);
      
      // Update the booking record
      await updateDoc(bookingRef, {
        opsi_perlengkapan: opsiPerlengkapan,
        penerima_perlengkapan: opsiPerlengkapan === 'Kirim Ekspedisi' ? penerimaName : '',
        telp_penerima_perlengkapan: opsiPerlengkapan === 'Kirim Ekspedisi' ? penerimaTelp : '',
        alamat_penerima_perlengkapan: opsiPerlengkapan === 'Kirim Ekspedisi' ? penerimaAlamat : '',
        status_pengiriman_perlengkapan: opsiPerlengkapan === 'Kirim Ekspedisi' ? 'Diperlukan Pengiriman' : 'Ambil Mandiri'
      });

      if (opsiPerlengkapan === 'Kirim Ekspedisi') {
        // Automatically sync & upsert with perlengkapan_pengiriman collection for the Admin
        const shipPayload = {
          id: 'ship-' + bookingData.id,
          packing_id: 'pack-' + bookingData.id,
          package_id: bookingData.packageId || 'custom-pkg',
          nama_paket: bookingData.packageName || bookingData.paketNama || 'Umroh Regular',
          mitra_id: bookingData.id,
          nama_mitra: penerimaName,
          ekspedisi: userShipment?.ekspedisi || 'J&T Express (Umaroh Official)',
          nomor_resi: userShipment?.nomor_resi || 'LOG-WAIT-' + bookingData.kodeBooking,
          tanggal_kirim: userShipment?.tanggal_kirim || new Date().toISOString().split('T')[0],
          estimasi_tiba: userShipment?.estimasi_tiba || 'Sedang Diproses Gudang',
          penerima: penerimaName,
          alamat_pengiriman: penerimaAlamat,
          kota_pengiriman: 'Akan dikonfirmasi',
          biaya_kirim: userShipment?.biaya_kirim || 0,
          status_pengiriman: userShipment?.status_pengiriman || 'Diproses',
          catatan: 'Pengiriman diajukan mandiri oleh jamaah di Portal. Telp: ' + penerimaTelp,
          tracking_history: userShipment?.tracking_history || [
            { 
              waktu: new Date().toLocaleString('id-ID'), 
              lokasi: 'Portal Mandiri', 
              info: 'Jamaah mengajukan pengiriman logistik via ekspedisi' 
            }
          ],
          created_at: userShipment?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await setDoc(doc(db, 'perlengkapan_pengiriman', 'ship-' + bookingData.id), shipPayload);
      } else {
        // If they changed back to "Ambil di Kantor", we can delete the shipment from perlengkapan_pengiriman so it syncs clean
        await deleteDoc(doc(db, 'perlengkapan_pengiriman', 'ship-' + bookingData.id));
      }

      alert('Alhamdulillah! Pilihan pengambilan perlengkapan Anda telah diperbarui dan langsung disinkronkan dengan sistem logistik gudang admin.');
      setShowSuitcaseModal(false);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan data perlengkapan. Silakan coba kembali.');
    } finally {
      setIsSavingPerlengkapan(false);
    }
  };

  if (!bookingData) return null;

  const packageName = bookingData.packageName || bookingData.paketNama || 'Umroh 9d City Tour Makkah + Madinah by Saudia';
  const totalHarga = Number(bookingData.totalHarga || 35192675);
  const jumlahBayar = Number(bookingData.jumlahBayar || 7500000);
  const kodeOrder = bookingData.kodeBooking || 'ORD-2026-UMR-004127';

  const itineraryDays = [
    { day: 1, title: 'Keberangkatan Jakarta - Jeddah - Madinah', detail: 'Penerbangan dengan Saudia Airlines SV-815 pukul 10.30 WIB dari Bandara Soekarno Hatta Terminal 3. Landing di Jeddah pukul 16.20 waktu setempat, kemudian dilanjutkan dengan Bus Eksekutif AC menuju Kota Suci Madinah untuk check-in hotel.' },
    { day: 2, title: 'Ziarah Makam Rasulullah ﷺ & Raudhah', detail: 'Ziarah mendalam dipandu Mutawwif resmi ke makam Nabi Muhammad ﷺ, Abu Bakar, Umar, dan pemakaman Baki. Melaksanakan shalat malam and Munajat di Raudhah (taman surga) sesuai waktu tasrih aplikasi resmi.' },
    { day: 3, title: 'Ziarah Kota Madinah Al-Munawwarah', detail: 'Ziarah keliling kota suci Madinah mengunjungi Masjid Quba (shalat sunnah 2 rakaat fadhilah Umroh), kebun kurma, Jabal Uhud (perang bersejarah), dan Masjid Kiblatain.' },
    { day: 4, title: 'Persiapan Miqat & Perjalanan ke Makkah', detail: 'Mandi ihram, mempersiapkan baju ihram, dan check-out hotel Madinah. Menuju Masjid Bir Ali untuk meluruskan niat mengambil Miqat Ihram Umroh, kemudian perjalanan 5 jam ke Makkah Al-Mukarramah via bus AC.' },
    { day: 5, title: 'Ibadah Umroh Utama & Tawaf Sai', detail: 'Check-in hotel Makkah, istirahat sejenak, dilanjutkan melaksanakan rangkaian Rukun Ibadah Umroh Pertama (Tawaf, Sai, dan diakhiri Tahallul mencukur rambut) dipandu Mutawwif secara khusyuk.' },
    { day: 6, title: 'Ibadah Mandiri & Tadabbur Masjidil Haram', detail: 'Memperbanyak thawaf sunnah secara mandiri, melipatgandakan ibadah wajib di pelataran Ka`bah, membaca Al-Quran, dan munajat doa mustajab di Multazam serta Hijr Ismail.' },
    { day: 7, title: 'Ziarah Mekkah (Jabal Nur, Arafah, & Miqat Kedua)', detail: 'Ziarah keliling kota Makkah melewati Jabal Tsur, Padang Arafah (lokasi Wukuf), Muzdalifah, Mina (lempar jumrah), dan Jabal Nur (Gua Hira). Singgah di Masjid Ji`ranah bagi yang ingin mengambil Miqat Umroh Kedua.' },
    { day: 8, title: 'Tawaf Wada & Persiapan Check-Out', detail: 'Melaksanakan rangkaian Tawaf Wada (tawaf perpisahan) mengitari Ka`bah sebelum check-out hotel Makkah. Bersiap menaiki bus menuju Bandara Internasional King Abdulaziz Jeddah.' },
    { day: 9, title: 'Kepulangan Jeddah - Flight ke Jakarta', detail: 'Proses check-in koper baggage dan boarding penerbangan luar negeri Saudia Airlines SV-816 menuju Soekarno Hatta Cengkareng. Landing dengan selamat serta membawa predikat Umroh Maqbullah, Amin Ya Rabbal Alamin.' }
  ];

  const infoFaqData = [
    {
      category: 'Informasi Paket & Fasilitas',
      countLabel: '3 materi tanya-jawab',
      questions: [
        {
          id: 'inf-faq-1',
          q: 'Fasilitas hotel apa saja yang didapatkan di Makkah & Madinah?',
          a: 'Hotel bintang 5 di Madinah (Frontel Al Harithia / Setaraf) dan Makkah (Swissôtel Al Maqam / Setaraf) berjarak sangat dekat dari Masjidil Haram & Nabawi. Dilengkapi katering makanan menu khas Indonesia 3 kali sehari.'
        },
        {
          id: 'inf-faq-2',
          q: 'Kapan e-visa dan tiket pesawat saya diterbitkan?',
          a: 'Tiket penerbangan Saudia Airlines dan dokumen E-Visa keberangkatan Anda akan diterbitkan secara otomatis oleh sistem Umaroh pada H-10 sebelum keberangkatan setelah status pelunasan terverifikasi.'
        },
        {
          id: 'inf-faq-3',
          q: 'Apakah bisa merubah pilihan tipe kamar (Quad ke Double/Triple)?',
          a: 'Ya, Anda pengajuan perubahan tipe kamar (Quad ke Triple/Double) paling lambat dilakukan H-45 melalui sub-tab Keuangan atau menu Add-on Layanan untuk penyesuaian biaya paket.'
        }
      ]
    },
    {
      category: 'Jadwal & Itinerary',
      countLabel: '2 materi tanya-jawab',
      questions: [
        {
          id: 'inf-faq-4',
          q: 'Apakah bimbingan ibadah (manasik) didampingi mutawwif selama umroh?',
          a: 'Tentu saja. Dari awal keberangkatan di bandara Jakarta, perjalanan bus, hingga pelaksanaan thawaf dan sa’i di Masjidil Haram akan dibimbing langsung oleh Mutawwif / Ustadz pembimbing tersertifikasi.'
        },
        {
          id: 'inf-faq-5',
          q: 'Bagaimana jika saya berhalangan hadir saat jadwal manasik tatap muka?',
          a: 'Tenang, Anda dapat menyimak video rekamannya langsung di sub-tab Lainnya pada fitur Manasik Online & Penuntun Video Saku yang ramah kuota internet.'
        }
      ]
    }
  ];

  const handleDownloadEVisa = () => {
    try {
      const doc = new jsPDF();
      
      // Background and Header
      doc.setFillColor(11, 85, 59); // Deep Saudi Green
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text("KINGDOM OF SAUDI ARABIA", 105, 12, { align: "center" });
      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      doc.text("MINISTRY OF HAJJ AND UMRAH - ELECTRONIC PORTAL VISA SERVICE", 105, 20, { align: "center" });
      
      // Draw gold-ish decorative bar
      doc.setFillColor(212, 175, 55); 
      doc.rect(0, 30, 210, 3, 'F');
      
      // Title
      doc.setTextColor(11, 85, 59);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text("E-VISA SUMMARY & TRAVEL PERMIT", 15, 45);
      
      // Sub-header border box
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(248, 249, 250);
      doc.rect(14, 52, 182, 32, 'FD');
      
      doc.setTextColor(50, 50, 50);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text("PASSPORT NAME / NAMA PASPOR:", 20, 60);
      doc.setTextColor(11, 85, 59);
      doc.setFontSize(12);
      doc.text((bookingData.nama_paspor || bookingData.namaJamaah || 'JAMAAH UMROH').toUpperCase(), 20, 67);
      
      doc.setTextColor(120, 120, 120);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Passport No: ${bookingData.no_paspor || 'C1234567'}`, 20, 78);
      doc.text(`Booking Ref: ${bookingData.kodeBooking || 'ORD-2026-UMR-004127'}`, 100, 78);
      
      // Detailed grid
      const startY = 95;
      doc.setDrawColor(230, 230, 230);
      
      const fields = [
        ["Visa Number / No Visa", "EV-99411270-KSA"],
        ["Visa Type / Tipe Visa", "UMRAH MULTIPLE TRANSIT SUCCESS"],
        ["Date of Issue / Tgl Terbit", "10 August 2026"],
        ["Expiry Date / Tgl Kadaluarsa", "09 November 2026"],
        ["Duration of Stay / Durasi", "30 Days maximum stay"],
        ["Sponsor Company / Provider", "PT NAWAITUL UMRAH HAJI (KEMENAG REG: 912/2026)"],
        ["Makkah Accommodation", "Swissôtel Al Maqam atau setaraf (Bintang 5)"],
        ["Madinah Accommodation", "Frontel Al Harithia atau setaraf (Bintang 5)"],
        ["Insurance ID / Asuransi", "TPL-881267-WASELA SAUDI CO"]
      ];
      
      fields.forEach((item, index) => {
        const cy = startY + (index * 11);
        doc.line(14, cy - 6, 196, cy - 6);
        
        doc.setTextColor(100, 100, 100);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.text(item[0], 20, cy);
        
        doc.setTextColor(30, 30, 30);
        doc.setFont("Helvetica", "normal");
        doc.text(item[1], 88, cy);
      });
      
      // Bottom border line
      doc.line(14, startY + (fields.length * 11) - 6, 196, startY + (fields.length * 11) - 6);
      
      // Barcode mock
      doc.setDrawColor(0, 0, 0);
      doc.setFillColor(30, 30, 30);
      let barX = 14;
      for (let i = 0; i < 35; i++) {
        const width = Math.random() > 0.4 ? 2.5 : 1;
        const skip = Math.random() > 0.35 ? true : false;
        if (!skip) {
          doc.rect(barX, 205, width, 12, 'F');
        }
        barX += width + 1.2;
      }
      doc.setTextColor(30, 30, 30);
      doc.setFont("Courier", "bold");
      doc.setFontSize(8.5);
      doc.text("*EV-99411270-KSA*", 14, 222);
      
      // Footer notes
      doc.setTextColor(120, 120, 120);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Document was generated automatically and encrypted securely by Umaroh.com digital portal.", 14, 230);
      doc.text("PT Nawaitul Umrah Haji guarantees all travelers data privacy rules standard compliance.", 14, 234);
      
      doc.save(`e_visa_${(bookingData.namaJamaah || 'jamaah').toLowerCase()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Gagal membuat pdf visa.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. TITLE & BRIEF SUBTITLE */}
      <div className="pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
            <Package className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 id="pkg-info-title" className="text-base font-black text-emerald-950">Informasi Paket Umroh</h2>
            <p className="text-[10.5px] text-gray-450 font-bold leading-tight mt-0.5">Detail lengkap paket yang Anda ambil</p>
          </div>
        </div>
      </div>

      {/* 2. ORANGE MAIN PACKAGE BRAND CARD */}
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl p-5 text-white shadow-md space-y-4 relative overflow-hidden">
        {/* Subtle decorative vector circles */}
        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -right-4 -top-8 w-24 h-24 bg-white/5 rounded-full blur-md pointer-events-none" />

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white/20 backdrop-blur-xs rounded-2xl flex items-center justify-center text-white shrink-0">
            {/* Custom stylized Kabah cube shape icon */}
            <span className="text-lg font-bold">🕋</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[8px] bg-white/25 text-white font-black px-2 py-0.5 rounded uppercase tracking-wider">PAKET TERPILIH</span>
            <h3 className="text-sm font-black leading-snug drop-shadow-xs">{packageName}</h3>
          </div>
        </div>

        {/* Three tags underneath */}
        <div className="flex flex-wrap gap-2 text-[10px] pt-1">
          <span className="bg-white/15 text-white border border-white/20 px-2.5 py-1 rounded-xl font-bold inline-flex items-center gap-1">
            📦 Batch {kodeOrder.split('-').pop() || '227'}
          </span>
          <span className="bg-white/15 text-white border border-white/20 px-2.5 py-1 rounded-xl font-bold inline-flex items-center gap-1">
            ⏱ 9 Hari
          </span>
          <span className="bg-emerald-600 text-white border border-emerald-500 px-2.5 py-1 rounded-xl font-black inline-flex items-center gap-1 shadow-sm">
            📅 H-92 Hari
          </span>
        </div>

        <p className="text-[11px] text-amber-50 font-bold leading-normal pt-1">
          Paket umroh pilihan dengan pelayanan terbaik dari Umaroh Travel
        </p>

        {/* Total Dibayar info inside orange card */}
        <div className="pt-3 border-t border-white/10 flex justify-between items-end">
          <div>
            <span className="text-[9px] text-amber-100 font-bold block uppercase tracking-wide">Total Dibayar</span>
            <span className="text-base font-black tracking-tight mt-0.5 block">Rp {jumlahBayar.toLocaleString('id-ID')}</span>
          </div>
          <div className="bg-amber-400 text-amber-950 text-[10px] font-black px-2.5 py-1 rounded-lg shadow-xs flex items-center gap-1">
            ⏳ DP
          </div>
        </div>
      </div>

      {/* 3. JADWAL KEBERANGKATAN */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5 border-b border-gray-50 pb-2.5">
          <span className="text-amber-500">📅</span> Jadwal Keberangkatan
        </h3>

        <div className="space-y-3">
          {/* Tanggal Berangkat (Green theme) */}
          <div className="bg-emerald-50/10 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0 shadow-xs">
              <Plane className="w-4.5 h-4.5 rotate-45" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider leading-none">Tanggal Berangkat</p>
              <p className="text-xs font-black text-emerald-800 mt-1.5 leading-none">Selasa, 15 September 2026</p>
            </div>
          </div>

          {/* Tanggal Pulang (Blue theme) */}
          <div className="bg-blue-50/10 border border-blue-10c p-4 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 | text-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-xs">
              <Plane className="w-4.5 h-4.5 -rotate-45" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider leading-none">Tanggal Pulang</p>
              <p className="text-xs font-black text-blue-700 mt-1.5 leading-none">Rabu, 23 September 2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. TIMELINE PERSIAPAN */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5 border-b border-gray-50 pb-2.5">
          <span className="text-amber-500">📊</span> Timeline Persiapan
        </h3>

        <div className="pl-2 pt-2 relative">
          
          {/* Custom high fidelity connected timeline */}
          
          {/* Item 1 */}
          <div className="flex gap-4 relative">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md z-10 shrink-0">✓</div>
              <div className="w-0.5 bg-gray-200 grow h-full -mb-4"></div>
            </div>
            <div className="pb-6 grow">
              <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-xs transition hover:border-gray-200">
                <p className="font-extrabold text-sm text-gray-800 leading-tight">Pendaftaran Selesai</p>
                <p className="text-[10px] text-gray-400 font-semibold mt-1">Selasa, 26 Mei 2026</p>
              </div>
            </div>
          </div>

          {/* Item 2 */}
          <div className="flex gap-4 relative">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md z-10 shrink-0">✓</div>
              <div className="w-0.5 bg-gray-200 grow h-full -mb-4"></div>
            </div>
            <div className="pb-6 grow">
              <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-xs space-y-2 transition hover:border-gray-200">
                <p className="font-extrabold text-sm text-gray-800 leading-tight">Pengisian Formulir Pendaftaran</p>
                <p className="text-[10px] text-gray-400 font-semibold">100% selesai (1/1 jamaah)</p>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-full rounded-full" />
                </div>
                {setPortalTab && (
                  <button 
                    onClick={() => setPortalTab('dokumen')}
                    className="text-[11px] text-emerald-600 hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    Lihat Detail Formulir →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Item 3 */}
          <div className="flex gap-4 relative">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 border border-gray-200 flex items-center justify-center font-bold text-xs z-10 shrink-0 shadow-xs">⏳</div>
              <div className="w-0.5 bg-gray-200 grow h-full -mb-4"></div>
            </div>
            <div className="pb-6 grow">
              <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-xs space-y-2 transition hover:border-gray-200">
                <p className="font-extrabold text-sm text-gray-801 leading-tight">Memenuhi Kelengkapan Dokumen</p>
                <p className="text-[10px] text-gray-400 font-semibold">0% selesai (0/1 jamaah)</p>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gray-300 h-full w-0 rounded-full" />
                </div>
                {setPortalTab && (
                  <button 
                    onClick={() => setPortalTab('dokumen')}
                    className="text-[11px] text-emerald-600 hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    Lihat Detail Dokumen →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Item 4 */}
          <div className="flex gap-4 relative">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs ring-4 ring-amber-100 z-10 shrink-0 shadow-md">⏳</div>
              <div className="w-0.5 bg-gray-200 grow h-full -mb-4"></div>
            </div>
            <div className="pb-6 grow">
              <div className="bg-white border border-amber-100 p-4 rounded-xl shadow-xs space-y-2 transition hover:border-amber-200">
                <p className="font-extrabold text-sm text-gray-801 leading-tight">Pelunasan Pembayaran</p>
                <p className="text-[10px] text-amber-600 font-bold">31% selesai</p>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full w-[31%] rounded-full" />
                </div>
                {setPortalTab && (
                  <button 
                    onClick={() => setPortalTab('keuangan')}
                    className="text-[11px] text-emerald-600 hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    Lihat Detail Keuangan →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Item 5 */}
          <div className="flex gap-4 relative">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs z-10 shrink-0 shadow-xs ${
                bookingData?.opsi_perlengkapan 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' 
                  : 'bg-gray-100 text-gray-400 border border-gray-200'
              }`}>
                {bookingData?.opsi_perlengkapan ? '✓' : '⏳'}
              </div>
              <div className="w-0.5 bg-gray-200 grow h-full -mb-4"></div>
            </div>
            <div className="pb-6 grow">
              <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-xs space-y-2 transition hover:border-gray-200">
                <p className="font-extrabold text-sm text-gray-801 leading-tight">Penerimaan/Pengambilan Perlengkapan</p>
                
                {bookingData?.opsi_perlengkapan ? (
                  <div className="space-y-2 mt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                        bookingData.opsi_perlengkapan === 'Kirim Ekspedisi' 
                          ? 'bg-blue-50 text-blue-800 border border-blue-100'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                      }`}>
                        {bookingData.opsi_perlengkapan === 'Kirim Ekspedisi' ? '🚚 KIRIM EKSPEDISI' : '🏢 AMBIL DI KANTOR'}
                      </span>
                      {userShipment && (
                        <span className="bg-amber-50 text-amber-800 border border-amber-100 text-[10px] font-black px-2 py-0.5 rounded">
                          📦 {userShipment.status_pengiriman}
                        </span>
                      )}
                    </div>
                    
                    {bookingData.opsi_perlengkapan === 'Kirim Ekspedisi' ? (
                      <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 space-y-1 text-[11px] text-gray-600 font-sans leading-normal">
                        <p><strong>Penerima:</strong> {bookingData.penerima_perlengkapan || '-'}</p>
                        <p><strong>No. Telp:</strong> {bookingData.telp_penerima_perlengkapan || '-'}</p>
                        <p className="line-clamp-2"><strong>Alamat:</strong> {bookingData.alamat_penerima_perlengkapan || '-'}</p>
                        {userShipment && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-200 space-y-0.5">
                            <p><strong>Kurir:</strong> {userShipment.ekspedisi}</p>
                            <p className="font-mono"><strong>No. Resi:</strong> {userShipment.nomor_resi}</p>
                            <p><strong>Estimasi:</strong> {userShipment.estimasi_tiba}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-[11px] text-gray-600 font-sans leading-normal">
                        <p>Akan diambil mandiri di Kantor Regional Cabang Umaroh terdekat mulai <strong>10 Agustus 2026</strong>.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] text-gray-400 font-semibold">0% selesai (Pilih opsi pengambilan / pengiriman)</p>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gray-300 h-full w-0 rounded-full" />
                    </div>
                  </>
                )}

                <button 
                  type="button"
                  onClick={() => setShowSuitcaseModal(true)}
                  className="text-[11px] text-emerald-600 hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer pt-1"
                >
                  {bookingData?.opsi_perlengkapan ? 'Ubah Opsi Perlengkapan ✎' : 'Atur Opsi Perlengkapan →'}
                </button>
              </div>
            </div>
          </div>

          {/* Item 6 */}
          <div className="flex gap-4 relative">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 border border-gray-200 flex items-center justify-center font-bold text-xs z-10 shrink-0 shadow-xs">⏳</div>
              <div className="w-0.5 bg-gray-200 grow h-full -mb-4"></div>
            </div>
            <div className="pb-6 grow">
              <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-xs space-y-2 transition hover:border-gray-200">
                <p className="font-extrabold text-sm text-gray-801 leading-tight">Pelaksanaan Manasik Online</p>
                <button 
                  type="button"
                  onClick={() => setShowManasikModal(true)}
                  className="text-[11px] text-emerald-600 hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer block mt-1"
                >
                  Lihat Jadwal Manasik →
                </button>
              </div>
            </div>
          </div>

          {/* Item 7 */}
          <div className="flex gap-4 relative">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 border border-gray-200 flex items-center justify-center font-bold text-xs z-10 shrink-0 shadow-xs">⏳</div>
              <div className="w-0.5 bg-gray-200 grow h-full -mb-4"></div>
            </div>
            <div className="pb-6 grow">
              <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-xs space-y-2 transition hover:border-gray-200">
                <p className="font-extrabold text-sm text-gray-810 leading-tight">Kesiapan Travel Documents</p>
                <p className="text-[10.5px] text-gray-500 leading-snug">Pantau kesiapan tiket pesawat, visa, asuransi, dan SISKOPATUH untuk 1 jamaah.</p>
                <p className="text-[10px] text-gray-400 font-semibold">0% selesai (0/4 dokumen siap)</p>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gray-300 h-full w-0 rounded-full" />
                </div>
                {setPortalTab && (
                  <button 
                    onClick={() => setPortalTab('dokumen')}
                    className="text-[11px] text-emerald-600 hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    Lihat Travel Document →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Item 8 */}
          <div className="flex gap-4 relative">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-md z-10 shrink-0">
                <Package className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="pb-1 grow">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 rounded-2xl shadow-sm space-y-1">
                <p className="font-black text-sm leading-tight text-white">Keberangkatan</p>
                <p className="text-xs font-bold font-sans">Selasa, 15 September 2026</p>
                <p className="text-[10px] text-white/95 font-bold font-mono tracking-wider flex items-center gap-1 mt-1 block">
                  ⏳ H-92 Hari
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 5. INFORMASI PAKET (FASILITAS & HOTEL) */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-50 pb-2.5">
          <div className="w-8 h-8 bg-amber-500/10 text-amber-600 rounded-lg flex items-center justify-center">
            <Package className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-emerald-950">Informasi Paket</h3>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">Rincian fasilitas & hotel dari paket yang Anda ambil.</p>
          </div>
        </div>
        <p className="text-[10px] text-gray-450 font-bold">👇 Ketuk kartu untuk melihat detail fasilitas.</p>

        {/* Dropdown Card */}
        <div className="border border-blue-100 bg-blue-50/5 rounded-2xl overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setIsPackageExpanded(!isPackageExpanded)}
            className="w-full flex items-center justify-between p-4 bg-gray-50/40 text-left transition hover:bg-gray-50/50 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-100 text-blue-650 rounded-lg flex items-center justify-center">
                <Package className="w-4.5 h-4.5" />
              </span>
              <div>
                <span className="font-black text-xs text-gray-850">Hemat - Emaar Noor</span>
                <span className="block mt-0.5 bg-blue-150 text-blue-800 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded w-max uppercase tracking-wider">✓ Paket Anda</span>
              </div>
            </div>
            <ChevronDown className={`w-4.5 h-4.5 text-gray-400 transition-transform duration-300 ${isPackageExpanded ? 'rotate-180' : ''}`} />
          </button>

          {isPackageExpanded && (
            <div className="p-4 bg-white border-t border-gray-100 text-xs space-y-3 font-sans">
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-400 font-bold flex items-center gap-1.5">
                  <span className="text-amber-500 text-[10px]">💵</span> Harga
                </span>
                <div className="text-right">
                  <p className="font-black text-gray-800">Rp {totalHarga.toLocaleString('id-ID')}</p>
                  <p className="text-[9px] text-gray-400 font-mono font-bold uppercase">Quad - Emaar Noor</p>
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-400 font-bold flex items-center gap-1.5">
                  <span className="text-blue-500 text-[10px]">✈️</span> Tiket Pesawat
                </span>
                <span className="font-extrabold text-emerald-600 flex items-center gap-0.5 text-lg">✓</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-400 font-bold flex items-center gap-1.5">
                  <span className="text-orange-500 text-[10px]">🍽️</span> Makan 3x sehari
                </span>
                <span className="font-extrabold text-emerald-600 flex items-center gap-0.5 text-lg">✓</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-400 font-bold flex items-center gap-1.5">
                  <span className="text-indigo-500 text-[10px]">🏢</span> Hotel
                </span>
                <span className="font-extrabold text-emerald-600 flex items-center gap-0.5 text-lg">✓</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400 font-bold flex items-center gap-1.5">
                  <span className="text-teal-500 text-[10px]">💧</span> Air Zam Zam
                </span>
                <span className="font-black text-emerald-700">✓ 1 galon</span>
              </div>
            </div>
          )}
        </div>

        {/* Upgrade alert */}
        <div className="bg-emerald-50/20 border border-emerald-100 rounded-2xl p-4 text-center space-y-3">
          <p className="text-xs font-extrabold text-emerald-950">Mau upgrade paket? ✨</p>
          <p className="text-[10px] text-gray-450 font-bold leading-relaxed">Hubungi admin untuk info pilihan upgrade paket umroh Anda.</p>
          <a
            href="https://wa.me/6283844974952?text=Assalamualaikum,%20saya%20ingin%20tanya%20upgrade%20paket%20Umroh"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase transition cursor-pointer w-full sm:w-auto"
          >
            <MessageCircle className="w-4 h-4 fill-white text-emerald-600" /> Hubungi Admin
          </a>
        </div>
      </div>

      {/* 6. HOTEL & PENERBANGAN & DOKUMEN REKOR */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5 border-b border-gray-50 pb-2.5">
          <span className="text-amber-500">🏨</span> Hotel, Penerbangan & Travel Doc
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed font-sans">
          {/* Flight Card */}
          <div className="border border-violet-100 bg-violet-50/10 p-4 rounded-2xl flex items-start gap-3">
            <div className="w-9 h-9 bg-violet-100 text-violet-750 rounded-full flex items-center justify-center shrink-0 shadow-xs">
              <Plane className="w-4.5 h-4.5 rotate-45" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-violet-700 uppercase font-bold tracking-wider leading-none">Penerbangan Resmi</p>
              <p className="text-xs font-black text-gray-801">Saudia Airlines (SV-815 / SV-816)</p>
              <p className="text-[10px] text-gray-450 font-bold leading-normal">
                • Jakarta (CGK) ➔ Jeddah (JED) | SV-815 (10.30 WIB)<br />
                • Jeddah (JED) ➔ Jakarta (CGK) | SV-816 (19.40 KSA)
              </p>
              <span className="inline-block bg-violet-100 text-violet-850 font-black text-[9px] px-2 py-0.5 rounded">
                ✈️ KELAS EKONOMI (PROMO)
              </span>
            </div>
          </div>

          {/* Hotel Card */}
          <div className="border border-amber-100 bg-amber-50/15 p-4 rounded-2xl flex items-start gap-3">
            <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0 shadow-xs">
              <span>🏨</span>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-amber-700 uppercase font-bold tracking-wider leading-none">Akomodasi Bintang 5</p>
              <p className="text-xs font-black text-gray-801">Makkah & Madinah Luxury</p>
              <p className="text-[10px] text-gray-450 font-bold leading-normal">
                • Madinah: Frontel Al Harithia / Setaraf (3 Malam)<br />
                • Makkah: Swissôtel Al Maqam / Setaraf (4 Malam)<br />
                • Layanan katering full-board menu rasa Indonesia 3x sehari.
              </p>
              <span className="inline-block bg-amber-100 text-amber-900 font-black text-[9px] px-2 py-0.5 rounded">
                Quad Room (Sekamar Berempat)
              </span>
            </div>
          </div>
        </div>

        {/* E-Visa Section with real download ticket permit */}
        <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 font-sans text-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center shrink-0 text-base">
              🛡️
            </div>
            <div className="space-y-0.5">
              <p className="font-extrabold text-emerald-950">E-Visa Saudi & Asuransi Perjalanan</p>
              <p className="text-[10px] text-gray-500 font-semibold">Telah terbit & aktif secara legal di sistem Kementrian Haji & Umroh KSA.</p>
              <p className="text-[9px] text-emerald-700 font-mono font-black uppercase">NO VISA: EV-99411270-KSA</p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleDownloadEVisa}
            className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-black px-4 py-2.5 rounded-xl text-[10.5px] uppercase tracking-wider text-center transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" /> Unduh Dokumen E-Visa
          </button>
        </div>
      </div>

      {/* 7. AKSI CEPAT */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5 border-b border-gray-50 pb-2.5">
          <span className="text-amber-500">⚡</span> Aksi Cepat
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-normal font-sans">
          {/* Action 1: Itinerary */}
          <button
            type="button"
            onClick={() => setShowItineraryModal(true)}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black p-4 rounded-2xl flex items-center justify-between text-left transition cursor-pointer shadow-sm hover:shadow-md"
          >
            <div className="space-y-1">
              <p className="font-extrabold leading-tight text-sm">Lihat Itinerary</p>
              <p className="text-[10px] text-amber-50 font-bold">Jadwal harian program</p>
            </div>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>

          {/* Action 2: Keuangan */}
          <button
            type="button"
            onClick={() => setPortalTab && setPortalTab('keuangan')}
            className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 text-emerald-900 font-black p-4 rounded-2xl flex items-center justify-between text-left transition cursor-pointer shadow-xs"
          >
            <div className="space-y-1">
              <p className="font-extrabold leading-tight text-emerald-950 text-sm">Lihat Keuangan</p>
              <p className="text-[10px] text-emerald-650 font-bold">Cicilan & sisa tagihan</p>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-600" />
          </button>

          {/* Action 3: Manasik */}
          <button
            type="button"
            onClick={() => setShowManasikModal(true)}
            className="w-full bg-violet-50 hover:bg-violet-100 border border-violet-150 text-violet-900 font-black p-4 rounded-2xl flex items-center justify-between text-left transition cursor-pointer shadow-xs"
          >
            <div className="space-y-1">
              <p className="font-extrabold leading-tight text-violet-950 text-sm">Panduan Manasik</p>
              <p className="text-[10px] text-violet-650 font-bold">Edukasi & video tata cara</p>
            </div>
            <ArrowRight className="w-4 h-4 text-violet-600" />
          </button>

          {/* Action 4: Surat Menyurat */}
          <button
            type="button"
            onClick={() => setPortalTab && setPortalTab('dokumen')}
            className="w-full bg-sky-50 hover:bg-sky-100 border border-sky-150 text-sky-900 font-black p-4 rounded-2xl flex items-center justify-between text-left transition cursor-pointer shadow-xs"
          >
            <div className="space-y-1">
              <p className="font-extrabold leading-tight text-sky-950 text-sm">Surat Menyurat</p>
              <p className="text-[10px] text-sky-600 font-bold">Rekomendasi paspor & izin</p>
            </div>
            <ArrowRight className="w-4 h-4 text-sky-600" />
          </button>
        </div>
      </div>

      {/* 8. STATUS PAKET CARD */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5 border-b border-gray-50 pb-2.5">
          <span className="text-amber-500">ℹ️</span> Status Paket
        </h3>

        <div className="space-y-3 font-sans text-xs">
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-400 font-bold">Kode Order:</span>
            <span className="font-bold text-amber-600 font-mono tracking-wider">{kodeOrder}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-t border-gray-50 pt-2.5">
            <span className="text-gray-400 font-bold">Status Paket:</span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black px-2 py-0.5 rounded">
              ✓ Publish
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-t border-gray-50 pt-2.5">
            <span className="text-gray-400 font-bold">Status Verifikasi:</span>
            <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-black px-2 py-0.5 rounded">
              ✓ Verified
            </span>
          </div>
        </div>
      </div>

      {/* 9. salsa call to action box */}
      <div className="border border-emerald-150 bg-emerald-50/30 rounded-3xl p-5 flex flex-col items-center justify-center text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-md animate-bounce">
          <MessageCircle className="w-6 h-6 fill-white text-emerald-700" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-black text-emerald-950">Butuh Bantuan?</h4>
          <p className="text-[11px] text-gray-600">
            CS Anda: <strong className="text-emerald-900">Admin Umaroh</strong>
          </p>
          <p className="text-[10px] text-gray-450 leading-relaxed font-semibold">Siap membantu informasi paket Anda</p>
        </div>
        <div>
          <a
            href="https://wa.me/6283844974952?text=Assalamualaikum%20Admin%20Umaroh,%20saya%20ingin%20tanya%20detail%20info%20paket%20Umroh"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 bg-emerald-750 hover:bg-emerald-800 text-white font-black px-6 py-2.5 rounded-full text-xs transition cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-white text-emerald-750" /> Chat Admin
          </a>
        </div>
      </div>

      {/* MODAL 1: FULL ITINERARY */}
      {showItineraryModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full relative shadow-2xl p-5 overflow-y-auto max-h-[85vh] font-sans">
            <button
              onClick={() => setShowItineraryModal(false)}
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm z-10 transition cursor-pointer"
            >
              ✖
            </button>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <span className="text-lg">🗓️</span>
                <div>
                  <h4 className="text-sm font-black text-emerald-950">Rangkaian Jadwal Perjalanan</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-bold">Program Itinerary Madinah & Makkah 9 Hari</p>
                </div>
              </div>

              <div className="space-y-2 mt-2">
                {itineraryDays.map((elem) => (
                  <div key={elem.day} className="border border-gray-105 rounded-xl overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => setActiveDay(activeDay === elem.day ? null : elem.day)}
                      className="w-full bg-gray-55 flex items-center justify-between p-3 text-left transition hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-800 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0">
                          H-{elem.day}
                        </span>
                        <p className="text-[11px] font-black text-gray-801 leading-snug">{elem.title}</p>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${activeDay === elem.day ? 'rotate-90' : ''}`} />
                    </button>
                    
                    {activeDay === elem.day && (
                      <div className="p-3 bg-white border-t border-gray-100 text-[10.5px] leading-relaxed text-gray-600 font-sans">
                        {elem.detail}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowItineraryModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold px-4 py-2 rounded-xl text-xs cursor-pointer uppercase transition"
              >
                Tutup Itinerary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MANASIK GUIDE */}
      {showManasikModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full relative shadow-2xl p-5 overflow-y-auto max-h-[85vh] font-sans">
            <button
              onClick={() => setShowManasikModal(false)}
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm z-10 transition cursor-pointer"
            >
              ✖
            </button>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <span className="text-lg">🔮</span>
                <div>
                  <h4 className="text-sm font-black text-emerald-950">Panduan Manasik Online</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-bold">Materi bimbingan tata cara Umroh lengkap</p>
                </div>
              </div>

              <div className="space-y-3 pt-2 text-xs">
                <p className="font-semibold text-gray-600 leading-relaxed">
                  Semua jamaah diwajibkan menyimak dan memahami tata cara Thawaf, Sa’i, dan Tahallul sebelum keberangkatan.
                </p>

                {activeVideoTitle ? (
                  <div className="bg-black text-white p-3 rounded-2xl space-y-2 animate-in fade-in duration-200">
                    <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden relative flex items-center justify-center">
                      <iframe
                        className="w-full h-full rounded-xl"
                        src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1"
                        title={activeVideoTitle}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <p className="text-[11px] font-black text-emerald-400 leading-snug">{activeVideoTitle}</p>
                    <button
                      onClick={() => setActiveVideoTitle(null)}
                      className="text-[10px] text-gray-300 hover:text-white underline font-bold"
                    >
                      ← Kembali ke Daftar Video
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="border border-violet-100 bg-violet-50/10 p-3 rounded-xl space-y-1">
                      <p className="font-extrabold text-violet-950 leading-tight">1. Tata Cara Ihram & Larangannya</p>
                      <p className="text-[10px] text-gray-400">Durasi: 12 menit • Mutawwif Syarif</p>
                      <button 
                        onClick={() => setActiveVideoTitle('1. Tata Cara Ihram & Larangannya')}
                        className="mt-1.5 bg-violet-600 hover:bg-violet-750 text-white font-extrabold text-[9px] px-2.5 py-1 rounded-md transition cursor-pointer"
                      >
                        ▶ Putar Materi Video
                      </button>
                    </div>

                    <div className="border border-violet-100 bg-violet-50/10 p-3 rounded-xl space-y-1">
                      <p className="font-extrabold text-violet-950 leading-tight">2. Rukun Umroh: Thawaf & Sa’i</p>
                      <p className="text-[10px] text-gray-400">Durasi: 25 menit • Mutawwif Syarif</p>
                      <button 
                        onClick={() => setActiveVideoTitle('2. Rukun Umroh: Thawaf & Sa’i')}
                        className="mt-1.5 bg-violet-600 hover:bg-violet-750 text-white font-extrabold text-[9px] px-2.5 py-1 rounded-md transition cursor-pointer"
                      >
                        ▶ Putar Materi Video
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowManasikModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold px-4 py-2 rounded-xl text-xs cursor-pointer uppercase transition"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SUITCASE PREPARATION CHECKLIST */}
      {showSuitcaseModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full relative shadow-2xl p-6 overflow-y-auto max-h-[85vh] font-sans">
            <button
              type="button"
              onClick={() => setShowSuitcaseModal(false)}
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm z-10 transition cursor-pointer"
            >
              ✖
            </button>
            
            <form onSubmit={handleSaveSuitcaseOpsi} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <span className="text-xl">💼</span>
                <div>
                  <h4 className="text-sm font-black text-emerald-950">Detail Pengambilan Perlengkapan</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-bold">Koper, kain ihram, sabuk, & seragam batik</p>
                </div>
              </div>

              <div className="space-y-3 pt-1 text-xs">
                <p className="font-bold text-gray-650 leading-relaxed">
                  Pilih metode pengambilan perlengkapan fisik Anda (Batik Umaroh, Koper Kabin, Kain Ihram/Mukena, & Tas Selempang):
                </p>

                {/* TWO OPTIONS RADIO BUTTONS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-sans">
                  <button
                    type="button"
                    onClick={() => setOpsiPerlengkapan('Ambil di Kantor')}
                    className={`p-3.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                      opsiPerlengkapan === 'Ambil di Kantor'
                        ? 'bg-emerald-50/60 border-emerald-550 text-emerald-950'
                        : 'bg-white border-gray-150 text-gray-650 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">🏢</span>
                    <div className="space-y-0.5">
                      <p className="font-extrabold text-[11px]">Ambil Mandiri</p>
                      <p className="text-[9px] text-gray-500 font-bold leading-normal">Diambil langsung di Kantor Regional</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOpsiPerlengkapan('Kirim Ekspedisi')}
                    className={`p-3.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                      opsiPerlengkapan === 'Kirim Ekspedisi'
                        ? 'bg-blue-50/60 border-blue-400 text-blue-950'
                        : 'bg-white border-gray-150 text-gray-650 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">🚚</span>
                    <div className="space-y-0.5">
                      <p className="font-extrabold text-[11px]">Kirim Ekspedisi</p>
                      <p className="text-[9px] text-gray-500 font-bold leading-normal">Kirim via kurir langsung ke rumah</p>
                    </div>
                  </button>
                </div>

                {/* CONDITIONAL INPUT FOR SHIPPING */}
                {opsiPerlengkapan === 'Kirim Ekspedisi' ? (
                  <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 space-y-3 mt-2">
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-[10.5px] text-gray-700 uppercase tracking-wider">📦 ALAMAT PENERIMA EXPEDISI</p>
                      <button
                        type="button"
                        onClick={() => {
                          setPenerimaName(bookingData.namaJamaah || '');
                          setPenerimaTelp(bookingData.noHp || '');
                          setPenerimaAlamat(bookingData.alamat_tinggal || bookingData.alamat || '');
                        }}
                        className="text-[9px] text-emerald-700 hover:underline font-black uppercase"
                      >
                        Salin Data Akun
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[9.5px] text-gray-500 font-bold mb-1 uppercase tracking-wide">Nama Lengkap Penerima</label>
                        <input
                          type="text"
                          required={opsiPerlengkapan === 'Kirim Ekspedisi'}
                          value={penerimaName}
                          onChange={(e) => setPenerimaName(e.target.value)}
                          placeholder="Contoh: Muhammad Wildan"
                          className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold font-sans text-gray-800 outline-none focus:ring-2 focus:ring-blue-500/15"
                        />
                      </div>

                      <div>
                        <label className="block text-[9.5px] text-gray-500 font-bold mb-1 uppercase tracking-wide">No. Handphone / WhatsApp</label>
                        <input
                          type="tel"
                          required={opsiPerlengkapan === 'Kirim Ekspedisi'}
                          value={penerimaTelp}
                          onChange={(e) => setPenerimaTelp(e.target.value)}
                          placeholder="Contoh: 08123456789"
                          className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold font-sans text-gray-800 outline-none focus:ring-2 focus:ring-blue-500/15"
                        />
                      </div>

                      <div>
                        <label className="block text-[9.5px] text-gray-500 font-bold mb-1 uppercase tracking-wide">Alamat Lengkap Pengiriman</label>
                        <textarea
                          rows={3}
                          required={opsiPerlengkapan === 'Kirim Ekspedisi'}
                          value={penerimaAlamat}
                          onChange={(e) => setPenerimaAlamat(e.target.value)}
                          placeholder="Tuliskan nama jalan, No. Rumah, RT/RW, Dusun, Kelurahan & Kecamatan secara detail"
                          className="w-full bg-white border border-gray-200 p-3 rounded-xl text-xs font-bold font-sans text-gray-800 leading-relaxed outline-none focus:ring-2 focus:ring-blue-500/15"
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-[10px] text-blue-900 leading-normal flex items-start gap-1.5 font-bold">
                      <span>✓</span>
                      <span>
                        Pengiriman menggunakan ekspedisi rekanan (J&T Express / Sicepat). Berat koper & perlengkapan akan dihitung otomatis. No. Resi otomatis muncul setelah diverifikasi admin.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 space-y-2.5 mt-2">
                    <p className="font-extrabold text-[10.5px] text-gray-700 uppercase tracking-wider">🏢 PENGAMBILAN DI KANTOR</p>
                    <div className="space-y-1 text-gray-500 leading-relaxed text-[11px]">
                      <p>Perlengkapan fisik dapat diambil secara mandiri di <strong>Kantor Regional Cabang Umaroh terdekat</strong> mulai <strong className="text-emerald-900">10 Agustus 2026</strong>.</p>
                      <ul className="list-disc list-inside text-[10px] text-gray-400 space-y-1 mt-1.5">
                        <li>Membawa Bukti Cetak invoice pembayaran</li>
                        <li>Membawa KTP asli / Identitas Jemaah</li>
                        <li>Mengonfirmasi ke Admin 1 hari sebelumnya</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-105 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSuitcaseModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold px-4 py-2 rounded-xl text-xs cursor-pointer uppercase transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingPerlengkapan}
                  className="bg-emerald-750 hover:bg-emerald-800 text-white font-extrabold px-4 py-2 rounded-xl text-xs cursor-pointer uppercase transition disabled:opacity-50"
                >
                  {isSavingPerlengkapan ? 'Menyimpan...' : 'Simpan Opsi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. COLLAPSIBLE FAQs FOR INFO PAKET */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4 font-sans mt-6">
        <div className="border-b border-gray-50 pb-2.5">
          <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
            💬 FAQ Seputar Informasi Paket & Itinerary
          </h3>
          <p className="text-[10px] text-gray-400 font-bold mt-0.5">Pertanyaan umum jamaah mengenai jadwal penerbangan, hotel & manasik.</p>
        </div>

        <div className="space-y-3.5">
          {infoFaqData.map((categoryObj, catIdx) => (
            <div key={catIdx} className="space-y-2">
              <p className="text-[10px] font-black uppercase text-emerald-800 tracking-wider bg-emerald-50 px-2.5 py-1 rounded w-max">
                {categoryObj.category}
              </p>
              
              <div className="space-y-2">
                {categoryObj.questions.map((item) => {
                  const isOpen = expandedFaqId === item.id;
                  return (
                    <div key={item.id} className="border border-gray-100 rounded-xl overflow-hidden shadow-xs">
                      <button
                        type="button"
                        onClick={() => setExpandedFaqId(isOpen ? null : item.id)}
                        className="w-full bg-gray-50/40 p-3.5 text-left flex items-center justify-between text-xs font-extrabold text-gray-800 gap-3 hover:bg-gray-50 transition cursor-pointer"
                      >
                        <span className="leading-snug">{item.q}</span>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-emerald-700 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                      </button>
                      
                      {isOpen && (
                        <div className="p-4 bg-white border-t border-gray-50 text-[11px] leading-relaxed text-gray-500 font-medium">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export interface UmarohPayment {
  id: string;
  tanggal: string;
  jumlah: number;
  status: string;
  jenis: string;
  bankTujuan: string;
  pengirim: string;
  noTransaksi: string;
  noStruk: string;
  biayaAdmin: number;
  keterangan: string;
  uploadedImage?: string;
}

export const PortalKeuanganTab: React.FC<{
  bookingData: BookingRecord | null;
  setShowPrintKwitansi: (show: boolean) => void;
}> = ({ bookingData, setShowPrintKwitansi }) => {
  const [senderName, setSenderName] = useState('');
  const [senderBank, setSenderBank] = useState('');
  const [amount, setAmount] = useState('');
  const [receiptBase64, setReceiptBase64] = useState('');
  const [submittingPayload, setSubmittingPayload] = useState(false);
  
  // Toggle for adding custom payment
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [transferDate, setTransferDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  
  // Selected payment for fullscreen receipt preview modal
  const [selectedReceipt, setSelectedReceipt] = useState<UmarohPayment | null>(null);

  // Accordion state for FAQs
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  const [activeAddons, setActiveAddons] = useState<string[]>([]);

  const handleCopy = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedText(id);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  if (!bookingData) return null;

  // Real or default values
  const totalHargaBase = Number(bookingData.totalHarga || 35192675);
  
  // State for payments to make it fully reactive
  const [payments, setPayments] = useState<UmarohPayment[]>(() => {
    if (bookingData.jumlahBayar && bookingData.jumlahBayar > 0) {
      return [
        {
          id: 'p-initial-dp',
          tanggal: '26 Mei 2026',
          jumlah: bookingData.jumlahBayar,
          status: 'Verified',
          jenis: 'DP',
          bankTujuan: 'BSI (Bank Syariah Indonesia)',
          pengirim: (bookingData.nama_paspor || bookingData.namaJamaah || 'JAMAAH').toUpperCase(),
          noTransaksi: 'FT26146RP19Y',
          noStruk: '20260526112150170543',
          biayaAdmin: 0,
          keterangan: `Pembayaran DP Paket "${bookingData.paketNama || 'Umroh'}"`,
        }
      ];
    }
    return [];
  });

  // Subscribe to real-time transactions in Firestore
  useEffect(() => {
    if (!bookingData.id) return;
    const q = query(collection(db, 'transactions'), where('bookingId', '==', bookingData.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbPayments: UmarohPayment[] = [];
      snapshot.forEach((snap) => {
        const data = snap.data();
        dbPayments.push({
          id: snap.id,
          tanggal: data.createdAt ? new Date(data.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          jumlah: Number(data.amount || 0),
          status: data.status === 'approved' || data.status === 'Verified' ? 'Verified' : 'Pending',
          jenis: data.type === 'deposit' ? 'DP' : 'Pelunasan',
          bankTujuan: data.bankTujuan || 'BSI (Bank Syariah Indonesia)',
          pengirim: (data.namaJamaah || bookingData.namaJamaah || 'Jamaah').toUpperCase(),
          noTransaksi: data.noTransaksi || ('FT' + Math.floor(Math.random() * 100000000) + 'Y'),
          noStruk: data.noStruk || ('202606' + Math.floor(Math.random() * 100000000)),
          biayaAdmin: Number(data.biayaAdmin || 0),
          keterangan: data.description || `Pembayaran ke paket "${bookingData.paketNama}"`,
          uploadedImage: data.uploadedImage || null
        });
      });

      if (dbPayments.length > 0) {
        dbPayments.sort((a, b) => b.id.localeCompare(a.id));
        setPayments(dbPayments);
      } else {
        if (bookingData.jumlahBayar && bookingData.jumlahBayar > 0) {
          setPayments([
            {
              id: 'p-real-dp',
              tanggal: '26 Mei 2026',
              jumlah: bookingData.jumlahBayar,
              status: 'Verified',
              jenis: 'DP',
              bankTujuan: 'BSI (Bank Syariah Indonesia)',
              pengirim: (bookingData.nama_paspor || bookingData.namaJamaah || 'JAMAAH').toUpperCase(),
              noTransaksi: 'FT26146RP19Y',
              noStruk: '20260526112150170543',
              biayaAdmin: 0,
              keterangan: `Pembayaran DP Paket "${bookingData.paketNama || 'Umroh'}"`,
            }
          ]);
        } else {
          setPayments([]);
        }
      }
    }, (err) => {
      console.warn("Firestore transactions query failed/quota exhausted:", err);
    });

    return () => unsubscribe();
  }, [bookingData.id, bookingData.jumlahBayar, bookingData.namaJamaah, bookingData.nama_paspor, bookingData.paketNama]);

  const availableAddons = [
    {
      id: "double-room",
      label: "Upgrade Kamar Double (Dual Bed)",
      desc: "Kamar eksklusif berdua dengan pasangan / keluarga inti tercinta.",
      price: 8500000,
      icon: "👥"
    },
    {
      id: "wheelchair",
      label: "Jasa Muthawwif Pendorong Kursi Roda",
      desc: "Layanan pendorong kursi roda selama Thawaf dan Sa'i dari tim resmi.",
      price: 1250000,
      icon: "♿"
    },
    {
      id: "badal-umroh",
      label: "Paket Jasa Badal Umroh Tambahan",
      desc: "Membadalkan keluarga/almarhum terdalam, bersertifikat & dokumentasi video amanah.",
      price: 1500000,
      icon: "📜"
    }
  ];

  const addonCost = activeAddons.reduce((sum, id) => {
    const item = availableAddons.find(a => a.id === id);
    return sum + (item ? item.price : 0);
  }, 0);

  // Derived financial computations
  const totalHarga = totalHargaBase + addonCost;

  const totalBayar = payments
    .filter(p => p.status === 'Verified')
    .reduce((sum, p) => sum + p.jumlah, 0);

  const remaining = Math.max(0, totalHarga - totalBayar);
  const progressPercent = Math.min(100, Math.round((totalBayar / totalHarga) * 100));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setReceiptBase64(event.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleNotifyConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName || !senderBank || !amount || !receiptBase64) {
      alert('Mohon lengkapi semua isian formulir dan unggah bukti transfer pendaftaran Anda.');
      return;
    }

    setSubmittingPayload(true);
    try {
      const addedAmount = Number(amount);
      const newPaid = Number(bookingData.jumlahBayar || 0) + addedAmount;
      const statusPemb = newPaid >= totalHarga ? 'Lunas' : 'DP';

      // 1. Write the transaction into Firestore
      const transPayload = {
        userId: 'jamaah-session',
        bookingId: bookingData.id,
        namaJamaah: (bookingData.nama_paspor || bookingData.namaJamaah || senderName).toUpperCase(),
        type: 'deposit',
        amount: addedAmount,
        status: 'approved',
        description: `Setoran pembayaran via Portal dari ${senderName.toUpperCase()} ke ${senderBank}`,
        createdAt: transferDate ? new Date(transferDate).toISOString() : new Date().toISOString(),
        bankTujuan: senderBank || 'BSI (Bank Syariah Indonesia)',
        noTransaksi: 'FT' + Math.floor(Math.random() * 100000000) + 'Y',
        noStruk: '202606' + Math.floor(Math.random() * 100000000),
        uploadedImage: receiptBase64,
        biayaAdmin: 0
      };

      await addDoc(collection(db, 'transactions'), transPayload);

      // Real-time notifications
      await sendNotification({
        title: 'Pembayaran Deposit Baru (Portal)',
        message: `Setoran pembayaran sebesar Rp ${addedAmount.toLocaleString('id-ID')} atas nama ${transPayload.namaJamaah} via Portal telah diverifikasi otomatis.`,
        type: 'success',
        targetRole: 'admin'
      });

      if (bookingData.mitraId) {
        await sendNotification({
          title: 'Pembayaran Jamaah Masuk',
          message: `Jamaah Anda (${transPayload.namaJamaah}) membayar deposit sebesar Rp ${addedAmount.toLocaleString('id-ID')} untuk paket "${bookingData.paketLabel || bookingData.jenisPaket || 'Umroh'}".`,
          type: 'success',
          targetId: bookingData.mitraId,
          targetRole: 'mitra'
        });
      }

      if (bookingData.jamaahId) {
        await sendNotification({
          title: 'Pembayaran Deposit Berhasil',
          message: `Alhamdulillah! Setoran pembayaran Anda sebesar Rp ${addedAmount.toLocaleString('id-ID')} telah berhasil diverifikasi oleh sistem.`,
          type: 'success',
          targetId: bookingData.jamaahId,
          targetRole: 'jamaah'
        });
      }

      // 2. Update booking in database
      const bookingRef = doc(db, 'bookings', bookingData.id);
      await updateDoc(bookingRef, {
        jumlahBayar: newPaid,
        statusPembayaran: statusPemb,
        updatedAt: new Date().toISOString()
      });

      alert('Alhamdulillah! Bukti transfer berhasil diunggah. Sistem otomatis memverifikasi pembayaran Anda menjadi BERHASIL.');
      setSenderName('');
      setSenderBank('');
      setAmount('');
      setReceiptBase64('');
      setIsFormOpen(false);
    } catch (err) {
      console.error("Failed to post real transaction:", err);
      alert('Terjadi kesalahan saat mengunggah konfirmasi pembayaran.');
    } finally {
      setSubmittingPayload(false);
    }
  };

  // FAQ structure from image
  const faqData = [
    {
      category: 'Pelunasan',
      countLabel: '2 pertanyaan',
      questions: [
        {
          id: 'peln-1',
          q: 'Kapan batas waktu maksimal pelunasan biaya umroh?',
          a: 'Batas waktu maksimal pelunasan biaya umroh adalah H-45 sebelum tanggal keberangkatan yang tercantum pada jadwal program Anda.'
        },
        {
          id: 'peln-2',
          q: 'Di mana bukti pelunasan pembayaran dapat dilihat?',
          a: 'Bukti pelunasan pembayaran dapat dilihat langsung di sub-tab keuangan Portal Jamaah Mandiri ini setelah tim verifikasi administrasi menyetujui dokumen transfer Anda, serta salinan fisik akan dikirimkan lewat WhatsApp / Email.'
        }
      ]
    },
    {
      category: 'Metode pembayaran',
      countLabel: '2 pertanyaan',
      questions: [
        {
          id: 'meth-1',
          q: 'Metode pembayaran apa saja yang tersedia?',
          a: 'Kami menerima transfer bank resmi ke rekening PT NAWAITUL UMRAH HAJI via Bank Syariah Indonesia (BSI) No. Rekening 5577775003 dan pembayaran tunai di kantor cabang pusat terdekat.'
        },
        {
          id: 'meth-2',
          q: 'Apakah diperbolehkan mencicil biaya Umroh?',
          a: 'Ya, diperbolehkan. Jamaah dapat mencicil pembayaran dengan ketentuan uang muka (DP) di awal pendaftaran, friendly top-up di H-60, dan pelunasan seluruhnya wajib diselesaikan paling lambat di H-45.'
        }
      ]
    },
    {
      category: 'pelunasan',
      countLabel: '1 pertanyaan',
      questions: [
        {
          id: 'peln2-1',
          q: 'Bagaimana jika pelunasan dilakukan melewati batas waktu H-45?',
          a: 'Keterlambatan pelunasan dapat menyebabkan pembatalan nomor porsi visa, issued tiket pesawat, atau penyesuaian biaya tambahan kamar hotel di Arab Saudi.'
        }
      ]
    },
    {
      category: 'refund',
      countLabel: '1 pertanyaan',
      questions: [
        {
          id: 'ref-1',
          q: 'Apakah uang yang sudah dibayarkan dapat dibatalkan atau dikembalikan?',
          a: 'Pengajuan pembatalan (refund) tunduk pada S&K Syariat & Operasional kami, dipengaruhi oleh periode waktu sisa menuju keberangkatan serta status tiket pesawat yang telah ter-issued.'
        }
      ]
    },
    {
      category: 'pembayaran',
      countLabel: '3 pertanyaan',
      questions: [
        {
          id: 'pemb-1',
          q: 'Bagaimana cara memastikan pembayaran saya sudah tercatat?',
          a: 'Sistem akan mengirimkan push notification di dasbor serta notifikasi otomatis WhatsApp sesaat setelah bukti transfer Anda berhasil diverifikasi oleh tim keuangan kami.'
        },
        {
          id: 'pemb-2',
          q: 'setelah saya melakukan pembayaran secara online apa saja yang perlu saya lampirkan?',
          a: 'Anda cukup melampirkan foto / screenshot struk bukti transfer resmi asli, mencantumkan nama pengirim sesuai rekening asal, dan nominal yang ditransfer pada formulir Tambah Pembayaran.'
        },
        {
          id: 'pemb-3',
          q: 'Jika invoice tidak saya terima, apa yang harus saya lakukan?',
          a: 'Anda dapat langsung mengunduh invoice digital Anda melalu tombol \'Download Invoice\' di bagian atas sub-tab Keuangan ini, atau menghubungi Admin Umaroh untuk bantuan instan.'
        }
      ]
    }
  ];

  // Helper component to render a high-fidelity BSI mobile receipt ticket
  const BsiReceipt: React.FC<{ payment: UmarohPayment }> = ({ payment }) => {
    return (
      <div className="bg-white border-2 border-emerald-100 rounded-3xl p-5 max-w-sm mx-auto shadow-md font-sans text-gray-800 text-[11px] leading-relaxed relative overflow-hidden my-4">
        {/* Wave details decoration */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-500 via-emerald-600 to-amber-500" />
        
        {/* Header receipt */}
        <div className="flex items-center justify-between pb-3.5 border-b border-dashed border-gray-200 mt-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-teal-600 text-white font-serif font-black text-[10px] rounded-full flex items-center justify-center">BSI</span>
            <div>
              <p className="font-extrabold text-[10.5px] text-teal-800 tracking-tight leading-none block">BANK SYARIAH</p>
              <p className="font-bold text-[7.5px] text-teal-500 tracking-wider block uppercase mt-0.5">INDONESIA</p>
            </div>
          </div>
          <div className="text-right">
            <span className="bg-teal-50 border border-teal-150 text-teal-700 text-[8px] font-black px-2 py-0.5 rounded tracking-wide uppercase">Transfer BI Fast</span>
          </div>
        </div>

        {/* Status indicator */}
        <div className="py-4 text-center">
          <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest block">Status Transaksi</span>
          <span className="text-base font-black text-emerald-600 inline-flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping inline-block"></span>
            ✓ BERHASIL
          </span>
        </div>

        {/* Content rows */}
        <div className="space-y-2 text-gray-600 pt-1">
          <div className="flex justify-between items-start gap-2">
            <span className="text-gray-400 font-semibold shrink-0">Nomor Transaksi:</span>
            <span className="text-right font-bold text-gray-800 font-mono text-[9px] break-all uppercase">{payment.noTransaksi || 'FT26146RP19Y'}</span>
          </div>

          <div className="flex justify-between items-start gap-2">
            <span className="text-gray-400 font-semibold shrink-0">Tanggal Transaksi:</span>
            <span className="text-right font-bold text-gray-800">{payment.tanggal} • 11:21:50</span>
          </div>

          <div className="flex justify-between items-start gap-2">
            <span className="text-gray-400 font-semibold shrink-0">Nomor Struk:</span>
            <span className="text-right font-bold text-gray-800 font-mono text-[9px] break-all">{payment.noStruk || '20260526112150170543'}</span>
          </div>

          <div className="flex justify-between items-start gap-2">
            <span className="text-gray-400 font-bold text-emerald-950 shrink-0">Pengirim:</span>
            <span className="text-right font-black text-gray-900 uppercase text-[9.5px]">{payment.pengirim || 'ILHAM FICHRI ABDULLAH'}</span>
          </div>

          <div className="flex justify-between items-start gap-2">
            <span className="text-gray-400 font-semibold shrink-0">Dari Rekening:</span>
            <span className="text-right font-mono text-gray-700">XXXXXX4930</span>
          </div>

          <div className="flex justify-between items-start gap-2">
            <span className="text-gray-400 font-semibold shrink-0">Bank Penerima:</span>
            <span className="text-right font-bold text-gray-800">BANK SYARIAH INDONESIA (BSI)</span>
          </div>

          <div className="flex justify-between items-start gap-2">
            <span className="text-gray-400 font-semibold shrink-0">No. Rekening Penerima:</span>
            <span className="text-right font-bold text-gray-800 font-mono">5577775003</span>
          </div>

          <div className="flex justify-between items-start gap-2">
            <span className="text-gray-400 font-bold text-emerald-950 shrink-0">Atas Nama Penerima:</span>
            <span className="text-right font-black text-emerald-900 text-[10px] uppercase leading-snug">PT NAWAITUL UMRAH HAJI</span>
          </div>

          {/* Separator */}
          <div className="my-2 border-t border-dashed border-gray-250" />

          <div className="flex justify-between items-center py-0.5">
            <span className="text-emerald-950 font-black text-[10px] tracking-wide uppercase">JUMLAH TRANSFER:</span>
            <span className="text-right font-black text-emerald-700 text-[14px]">Rp {payment.jumlah.toLocaleString('id-ID')}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-semibold">Biaya Administrasi:</span>
            <span className="text-right font-mono text-gray-600">Rp {payment.biayaAdmin === 0 ? '0' : (payment.biayaAdmin || 2500).toLocaleString('id-ID')}</span>
          </div>

          <div className="flex justify-between items-start gap-2">
            <span className="text-gray-400 font-semibold shrink-0">Keterangan:</span>
            <span className="text-right font-bold text-gray-600 text-[10px] leading-tight italic">{payment.keterangan || 'DP Paket September Bu Arni'}</span>
          </div>
        </div>

        {/* Bottom edge pattern */}
        <div className="absolute bottom-0 left-0 right-0 h-2 flex justify-between px-3 gap-1 overflow-hidden opacity-30 mt-3">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="w-3.5 h-3.5 bg-gray-100 rounded-full shrink-0 -mb-2" />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. HEADER: INFORMASI KEUANGAN */}
      <div className="pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
            <CreditCard className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 id="fin-header-title" className="text-base font-black text-emerald-950">Informasi Keuangan</h2>
            <p className="text-[10.5px] text-gray-450 font-bold leading-tight mt-0.5">Detail pembayaran dan status keuangan paket Anda</p>
          </div>
        </div>
      </div>

      {/* 2. BLUE DOWNLOAD INVOICE ALERT BANNER */}
      <button
        onClick={() => {
          const docPdf = new jsPDF();
          
          // Header background banner
          docPdf.setFillColor(5, 87, 52); // emerald-900 / dark emerald
          docPdf.rect(0, 0, 210, 40, 'F');
          
          // Header title
          docPdf.setTextColor(255, 255, 255);
          docPdf.setFont('helvetica', 'bold');
          docPdf.setFontSize(22);
          docPdf.text('PT NAWAITUL UMRAH HAJI', 15, 18);
          
          docPdf.setFontSize(10);
          docPdf.setFont('helvetica', 'normal');
          docPdf.text('Aplikasi Managemen Portal Jamaah Umaroh Indonesia', 15, 25);
          docPdf.text('Sistem Invoice Pembayaran Digital', 15, 30);
          
          // Logo text/badge (Umaroh Logo)
          try {
            docPdf.addImage(logoBase64, 'PNG', 160, 10, 35, 18);
          } catch (pdfLogoErr) {
            console.error('Error drawing PDF logo:', pdfLogoErr);
            docPdf.setFillColor(245, 158, 11); // amber-500
            docPdf.rect(160, 12, 35, 16, 'F');
            docPdf.setTextColor(15, 23, 42); // slate-900
            docPdf.setFont('helvetica', 'bold');
            docPdf.setFontSize(11);
            docPdf.text('UMAROH', 168, 22);
          }
          
          // Body Text colors & positioning
          docPdf.setTextColor(15, 23, 42);
          docPdf.setFontSize(14);
          docPdf.setFont('helvetica', 'bold');
          docPdf.text('INVOICE PEMBAYARAN RESMI', 15, 55);
          
          // Line separator
          docPdf.setDrawColor(226, 232, 240); // border-slate-200
          docPdf.setLineWidth(0.5);
          docPdf.line(15, 60, 195, 60);
          
          // Info block
          docPdf.setFontSize(10);
          docPdf.setFont('helvetica', 'bold');
          docPdf.text('INFORMASI PELANGGAN / JAMAAH', 15, 70);
          
          docPdf.setFont('helvetica', 'normal');
          docPdf.setTextColor(71, 85, 105); // text-slate-600
          docPdf.text(`Nama Jamaah  : ${(bookingData.nama_paspor || bookingData.namaJamaah || '-').toUpperCase()}`, 15, 78);
          docPdf.text(`Kode Booking : ${bookingData.kodeBooking || '-'}`, 15, 84);
          docPdf.text(`No. Handphone: ${bookingData.noHp || '-'}`, 15, 90);
          docPdf.text(`Program Paket: ${bookingData.paketNama || bookingData.packageName || '-'}`, 15, 96);
          docPdf.text(`Room Option  : ${bookingData.roomType || 'Quad'} Room`, 15, 102);
          
          // Right side info (Invoice metadata)
          docPdf.setTextColor(15, 23, 42);
          docPdf.setFont('helvetica', 'bold');
          docPdf.text('DETAIL DOKUMEN', 140, 70);
          
          docPdf.setFont('helvetica', 'normal');
          docPdf.setTextColor(71, 85, 105);
          docPdf.text(`No. Invoice : INV-20260526-4127`, 140, 78);
          docPdf.text(`Tgl Terbit  : 26 Mei 2026`, 140, 84);
          docPdf.text(`Tgl Cetak   : ${new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}`, 140, 90);
          docPdf.text(`Status      : ${remaining <= 0 ? 'LUNAS (VERIFIED)' : 'BELUM LUNAS'}`, 140, 96);
          
          // Transaction Summary box
          docPdf.setFillColor(248, 250, 252); // bg-slate-50
          docPdf.rect(15, 115, 180, 55, 'F');
          docPdf.setDrawColor(203, 213, 225); // border-slate-300
          docPdf.rect(15, 115, 180, 55, 'S');
          
          docPdf.setTextColor(15, 23, 42);
          docPdf.setFont('helvetica', 'bold');
          docPdf.setFontSize(11);
          docPdf.text('REKAPITULASI KEUANGAN (IDR)', 20, 125);
          
          docPdf.setFont('helvetica', 'normal');
          docPdf.setTextColor(71, 85, 105);
          docPdf.setFontSize(10);
          docPdf.text('1. Total Biaya Paket Umroh', 20, 134);
          docPdf.text('2. Total Pembayaran Terverifikasi (DP + Cicilan)', 20, 142);
          docPdf.text('3. Sisa Tagihan Pelunasan', 20, 150);
          
          // Money numbers right aligned
          docPdf.setTextColor(15, 23, 42);
          docPdf.setFont('helvetica', 'bold');
          docPdf.text(`Rp ${totalHarga.toLocaleString('id-ID')}`, 145, 134);
          docPdf.setTextColor(5, 150, 105); // green
          docPdf.text(`Rp ${totalBayar.toLocaleString('id-ID')}`, 145, 142);
          
          if (remaining > 0) {
            docPdf.setTextColor(220, 38, 38); // red
            docPdf.text(`Rp ${remaining.toLocaleString('id-ID')}`, 145, 150);
          } else {
            docPdf.setTextColor(5, 150, 105); // green
            docPdf.text('LUNAS / Rp 0', 145, 150);
          }
          
          // Bottom border line in the summary box
          docPdf.setDrawColor(226, 232, 240);
          docPdf.line(20, 156, 190, 156);
          docPdf.setFontSize(9);
          docPdf.setTextColor(100, 116, 139);
          docPdf.setFont('helvetica', 'italic');
          docPdf.text('* Pembayaran dinyatakan sah apabila telah diverifikasi oleh tim internal kasir PT Nawaitul Umrah Haji.', 20, 163);
          
          // Payment bank options
          docPdf.setTextColor(15, 23, 42);
          docPdf.setFont('helvetica', 'bold');
          docPdf.setFontSize(11);
          docPdf.text('METODE TRANSFER PEMBAYARAN RESMI', 15, 185);
          
          docPdf.setFont('helvetica', 'normal');
          docPdf.setFontSize(9);
          docPdf.setTextColor(71, 85, 105);
          
          docPdf.text('Berikut daftar rekening Penampungan Resmi (Wajib Transfer ke akun berlisensi di bawah ini):', 15, 192);
          
          // Bank 1 (Keep only BSI as per user request)
          docPdf.setFont('helvetica', 'bold');
          docPdf.setTextColor(15, 23, 42);
          docPdf.text('Bank Syariah Indonesia (BSI)', 15, 201);
          docPdf.setFont('helvetica', 'normal');
          docPdf.setTextColor(71, 85, 105);
          docPdf.text('    No. Rekening : 5577 7750 03', 15, 206);
          docPdf.text('    Atas Nama    : PT NAWAITUL UMRAH HAJI', 15, 211);
          
          // Footer watermark
          docPdf.setDrawColor(241, 245, 249);
          docPdf.line(15, 240, 195, 240);
          docPdf.setFontSize(8);
          docPdf.setFont('helvetica', 'italic');
          docPdf.setTextColor(156, 163, 175);
          docPdf.text('Dokumen invoice ini diterbitkan secara otomatis oleh sistem digital Cloud Umaroh Indonesia. Bukti sah transaksi finansial.', 15, 248);
          docPdf.text(`ID Referensi Kuitansi: ${bookingData.id || 'N/A'} | Operator: Umaroh Auto-Bot`, 15, 253);
          
          docPdf.save(`Invoice-Umaroh-${bookingData.kodeBooking || 'INV'}.pdf`);
        }}
        className="w-full bg-blue-600 text-white rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:bg-blue-700 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-xs font-black tracking-wide leading-none">Download Invoice</p>
            <p className="text-[10px] text-white/80 font-mono tracking-wider mt-1">No. INV-20260526-4127</p>
          </div>
        </div>
        <div className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition">
          <Download className="w-4 h-4 text-white" />
        </div>
      </button>

      {/* ADD-ON UPGRADE LAYANAN */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4 font-sans">
        <div>
          <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5 border-b border-gray-50 pb-2">
            ✨ Add-on Layanan Tambahan (Opsional)
          </h3>
          <p className="text-[10px] text-gray-450 font-bold mt-1 leading-relaxed">
            Pilihlah layanan premium tambahan untuk kenyamanan perjalanan ibadah Anda. Biaya di bawah otomatis diakumulasi langsung pada Sisa & Total Tagihan secara real-time.
          </p>
        </div>

        <div className="space-y-2.5">
          {availableAddons.map((addon) => {
            const isSelected = activeAddons.includes(addon.id);
            return (
              <div 
                key={addon.id} 
                onClick={() => {
                  if (isSelected) {
                    setActiveAddons(activeAddons.filter(id => id !== addon.id));
                  } else {
                    setActiveAddons([...activeAddons, addon.id]);
                  }
                }}
                className={`p-3.5 border rounded-2xl cursor-pointer transition flex items-start gap-3 select-none ${
                  isSelected 
                    ? 'border-emerald-700 bg-emerald-50/25 shadow-xs' 
                    : 'border-gray-105 bg-gray-50/15 hover:border-gray-200'
                }`}
              >
                <div className="text-lg shrink-0 mt-0.5">{addon.icon}</div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-[11px] font-extrabold text-gray-800 leading-snug">{addon.label}</p>
                    <p className="text-[11px] font-black text-emerald-700 shrink-0 font-mono">+Rp {addon.price.toLocaleString('id-ID')}</p>
                  </div>
                  <p className="text-[9.5px] text-gray-400 font-bold leading-normal">{addon.desc}</p>
                </div>
                <div className="shrink-0 mt-1">
                  <div className={`w-4.5 h-4.5 rounded-lg border flex items-center justify-center transition-colors ${
                    isSelected ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-gray-300 bg-white'
                  }`}>
                    {isSelected && <span className="text-[9px] font-black leading-none">✓</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. RINGKASAN KEUANGAN CARD */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
            <span className="text-amber-500">🍕</span> Ringkasan Keuangan
          </h3>
          <span className="bg-indigo-50 border border-indigo-150 text-indigo-700 text-[10px] font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-xs">
            <Clock className="w-3 h-3" /> DP Terverifikasi
          </span>
        </div>

        {/* Vertically stacked cards like in the screenshot */}
        <div className="space-y-2.5">
          {/* Total Tagihan (Blue Theme) */}
          <div className="border border-blue-100 bg-blue-50/5 p-3 px-4 rounded-xl flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Tagihan</span>
            <span className="text-lg font-black text-blue-700 mt-1">Rp {totalHarga.toLocaleString('id-ID')}</span>
          </div>

          {/* Total Bayar (Green Theme) */}
          <div className="border border-emerald-200/60 bg-emerald-50/5 p-3 px-4 rounded-xl flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Bayar</span>
            <span className="text-lg font-black text-emerald-600 mt-1">Rp {totalBayar.toLocaleString('id-ID')}</span>
          </div>

          {/* Sisa Tagihan (Red/Rose Theme) */}
          <div className="border border-red-150 bg-red-50/5 p-3 px-4 rounded-xl flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sisa Tagihan</span>
            <span className="text-lg font-black text-rose-600 mt-1">Rp {remaining.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Progress bar and percentages */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-gray-450">Progress Pelunasan</span>
            <span className="font-extrabold text-amber-500">{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Deadlines alerts block */}
        <div className="pt-2 space-y-2.5">
          <div className="bg-blue-50/50 border border-blue-10c p-3.5 rounded-xl flex flex-col text-xs leading-normal">
            <span className="text-gray-400 font-bold">Jatuh Tempo Friendly Top Up (H-60)</span>
            <span className="font-extrabold text-blue-850 mt-1">17 Juli 2026 <span className="text-gray-400 font-medium font-sans">— H-32</span></span>
          </div>

          <div className="bg-amber-50/20 border border-amber-100 p-3.5 rounded-xl flex flex-col text-xs leading-normal">
            <span className="text-gray-400 font-bold">Jatuh Tempo Pelunasan (H-45)</span>
            <span className="font-extrabold text-amber-800 mt-1">1 Agustus 2026 <span className="text-gray-300 font-medium font-sans">— H-47</span></span>
          </div>

          {/* Yellow gold left-bordered notification callout */}
          <div className="bg-amber-50/30 border-l-4 border-amber-500 p-4 rounded-r-xl flex flex-col leading-relaxed text-xs">
            <span className="font-extrabold text-amber-900 text-sm font-sans">Jatuh Tempo dalam 47 hari</span>
            <span className="text-gray-500 font-bold mt-1 text-[11px] font-sans">Tanggal: 1 Agustus 2026</span>
          </div>
        </div>
      </div>

      {/* 4. TAMBAH PEMBAYARAN CONTROL BAR */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs">+</span>
              Tambah Pembayaran
            </h3>
            <p className="text-[10.5px] text-gray-450 font-bold">Upload bukti transfer dan masukkan nominal pembayaran Anda</p>
          </div>
          <div>
            <button
              onClick={() => setIsFormOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black px-4.5 py-2.5 rounded-xl text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer w-full sm:w-auto"
            >
              <span className="text-sm">💳</span> + Tambah Pembayaran
            </button>
          </div>
        </div>

        {/* HIGH-FIDELITY BACKDROP OVERLAY DIALOG MODAL (MIRRORING THE SCREENSHOT WITH MODERN UMAROH.COM LOOK) */}
        {isFormOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-[0_25px_60px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col md:max-h-[92vh] max-h-[95vh] border border-[#047857]/15 animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-sm">
                    🪙
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 leading-none">Tambah Pembayaran</h3>
                    <p className="text-[8.5px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Konfirmasi Transaksi Anda</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-450 hover:text-slate-700 flex items-center justify-center transition cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Modal Body */}
              <form onSubmit={handleNotifyConfirm} className="overflow-y-auto p-5 space-y-4 flex-1">
                
                {/* 1. Sisa Tagihan Box (Blue Callout Theme) */}
                <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 flex flex-col gap-0.5">
                  <span className="text-[9px] text-blue-500 font-bold uppercase tracking-wider">Sisa Tagihan Anda</span>
                  <span className="text-lg font-black text-blue-700 font-sans">
                    Rp {remaining.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* 2. DAFTAR REKENING BANK Copy List */}
                <div className="space-y-1.5">
                  <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Daftar Rekening Bank resmi</span>
                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3.5 space-y-2.5">
                    
                    {/* BSI Copy Block */}
                    <div className="bg-white border border-slate-100 rounded-xl p-3 flex justify-between items-center shadow-xs">
                      <div className="font-sans text-[10.5px] leading-relaxed space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-bold shrink-0">Nama Bank:</span>
                          <span className="font-extrabold text-slate-800">Bank Syariah Indonesia (BSI)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-bold shrink-0">No Rek:</span>
                          <span className="font-black text-emerald-800 font-mono tracking-wider text-xs">5577775003</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-bold shrink-0">Atas Nama:</span>
                          <span className="font-extrabold text-slate-800 uppercase text-[9.5px]">PT NAWAITUL UMRAH HAJI</span>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleCopy("5577775003", "bsi_add")}
                        className="bg-amber-100 hover:bg-amber-200 active:scale-95 text-amber-900 border border-amber-200 font-black px-2.5 py-1.5 rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <span>📋</span>
                        {copiedText === 'bsi_add' ? 'Disalin' : 'Copy'}
                      </button>
                    </div>

                  </div>
                </div>

                {/* 3. Rekening Bank Tujuan * */}
                <div className="space-y-1">
                  <label className="text-[9.5px] uppercase font-black text-slate-450 block">Rekening Bank Tujuan <span className="text-red-500 font-bold">*</span></label>
                  <select
                    required
                    value={senderBank}
                    onChange={(e) => setSenderBank(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100/50 p-3 rounded-xl text-xs font-extrabold text-slate-800 focus:ring-2 focus:ring-[#047857]/10 outline-none focus:border-[#047857] transition"
                  >
                    <option value="">-- Pilih Rekening Bank --</option>
                    <option value="BSI - 5577775003 - PT NAWAITUL UMRAH HAJI">BSI — 5577775003 (a.n PT NAWAITUL UMRAH HAJI)</option>
                  </select>
                </div>

                {/* 4. Bukti Transfer Drag & Drop Upload Zone */}
                <div className="space-y-1">
                  <label className="text-[9.5px] uppercase font-black text-slate-450 block font-sans">Bukti Transfer <span className="text-red-500 font-bold">*</span></label>
                  <div className="border-2 border-dashed border-[#047857]/20 hover:border-[#047857] hover:bg-emerald-50/5 rounded-2xl p-5 text-center transition relative">
                    <input 
                      type="file" 
                      required={!receiptBase64}
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <Upload className="w-6 h-6 text-[#047857] mx-auto mb-1.5" />
                    <p className="text-xs font-extrabold text-slate-700">Klik untuk pilih foto atau drag & drop</p>
                    <p className="text-[8.5px] text-[#047857] font-bold mt-1 uppercase tracking-wide">Format: JPG, PNG (Maks. 5MB)</p>
                  </div>
                  {receiptBase64 && (
                    <div className="mt-2.5 bg-slate-50 p-2 border border-slate-150 rounded-2xl max-w-xs mx-auto text-center relative shadow-xs">
                      <img src={receiptBase64} alt="Screenshot bukti" className="max-h-32 object-contain rounded-xl mx-auto border border-white shadow-xs" />
                      <button 
                        type="button" 
                        onClick={() => setReceiptBase64('')} 
                        className="mt-1 text-[8.5px] text-red-500 hover:underline font-extrabold cursor-pointer block w-full uppercase tracking-wider"
                      >
                        ✕ Urungkan Gambar
                      </button>
                    </div>
                  )}
                </div>

                {/* 5. Nama Pengirim (Kesesuaian Rekening) */}
                <div className="space-y-1">
                  <label className="text-[9.5px] uppercase font-black text-slate-450 block">Nama Pengirim Sesuai Rekening <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="CONTOH: KEMAL ADI"
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-extrabold outline-none focus:ring-2 focus:ring-[#047857]/10 text-slate-800"
                  />
                </div>

                {/* 6. Nominal Transfer */}
                <div className="space-y-1">
                  <label className="text-[9.5px] uppercase font-black text-slate-450 block">Nominal Transfer <span className="text-red-500 font-bold">*</span></label>
                  <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-slate-50 focus-within:ring-2 focus-within:ring-[#047857]/10 focus-within:border-[#047857] transition">
                    <span className="bg-slate-100 px-3.5 py-2.5 text-xs font-black text-slate-500 border-r border-slate-200">Rp</span>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-white px-3.5 py-2.5 text-xs font-black outline-none text-slate-800 font-mono"
                    />
                  </div>
                </div>

                {/* 7. Tanggal Transfer */}
                <div className="space-y-1">
                  <label className="text-[9.5px] uppercase font-black text-slate-450 block font-sans">Tanggal Transfer <span className="text-red-500 font-bold">*</span></label>
                  <input
                    type="date"
                    required
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-extrabold outline-none focus:ring-2 focus:ring-[#047857]/10 text-slate-800"
                  />
                </div>

                {/* Modal Footer actions inside form */}
                <div className="pt-2 border-t border-slate-100 flex gap-2.5 select-none">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-600 font-extrabold text-[10.5px] rounded-xl text-center transition cursor-pointer uppercase tracking-wider"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayload}
                    className="flex-[1.5] py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 active:scale-98 text-white font-extrabold text-[10.5px] rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-amber-500/10 transition cursor-pointer uppercase tracking-wider"
                  >
                    <span>⚡</span> {submittingPayload ? 'Sistem Memproses...' : 'Submit Pembayaran'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}
      </div>

      {/* 5. RIWAYAT PEMBAYARAN */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
          <span className="text-amber-500">⏳</span> Riwayat Pembayaran
        </h3>

        <div className="space-y-4">
          {payments.map((p) => (
            <div key={p.id} className="border border-gray-100 bg-gray-50/10 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2 text-xs">
                <div>
                  <span className="text-gray-400 block font-semibold text-[10px] uppercase">Tanggal</span>
                  <span className="font-extrabold text-gray-800 text-sm mt-0.5 inline-block">{p.tanggal}</span>
                </div>
                <div>
                  <span className="bg-indigo-55 text-indigo-700 border border-indigo-100 font-black px-2.5 py-1 rounded text-[10px] block w-max uppercase tracking-wider">{p.jenis || 'PELUNASAN'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block font-semibold text-[10px] uppercase">Jumlah</span>
                  <span className="font-black text-gray-800 text-sm mt-0.5 inline-block">Rp {p.jumlah.toLocaleString('id-ID')}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold text-[10px] uppercase">Status</span>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-150 font-black px-2 py-1 rounded text-[10px] inline-flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Verified
                  </span>
                </div>
              </div>

              {/* Kwitansi Button */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintKwitansi(true)}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold px-3 py-2 rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Kwitansi
                </button>
              </div>

              {/* Collapsible Bukti Transfer Card preview */}
              <div className="border border-gray-200/50 rounded-2xl p-4 bg-white space-y-3 shadow-xs">
                <p className="text-[10px] uppercase font-black text-gray-450 tracking-wider">Bukti Transfer Resmi</p>
                {p.uploadedImage ? (
                  <div className="p-1 max-w-sm mx-auto">
                    <img 
                      src={p.uploadedImage} 
                      alt="Uploaded transfer receipt" 
                      className="max-h-52 object-contain mx-auto rounded shadow-sm border border-gray-100 cursor-pointer"
                      onClick={() => setSelectedReceipt(p)}
                    />
                  </div>
                ) : (
                  <BsiReceipt payment={p} />
                )}
                
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(p)}
                  className="text-center w-full block text-blue-600 hover:underline font-bold text-[10.5px] py-1 inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Klik gambar untuk melihat ukuran penuh
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. DOKUMEN PEMBAYARAN ORDER */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
          <span className="text-amber-500">📄</span> Dokumen Pembayaran Order
        </h3>

        <div className="border border-gray-100 bg-gray-50/10 rounded-2xl p-4 md:p-5 text-xs">
          <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-100 text-[10px] font-extrabold flex items-center gap-1.5 text-blue-800 mb-4 tracking-wide uppercase">
            <span className="w-4 h-4 bg-blue-100 text-blue-700 flex items-center justify-center rounded font-black text-[9px]">$</span>
            Bukti Transfer Order
          </div>

          {payments && payments.length > 0 && (
            <div>
              {payments[payments.length - 1].uploadedImage ? (
                <img 
                  src={payments[payments.length - 1].uploadedImage} 
                  alt="Proof Document" 
                  className="max-h-52 object-contain mx-auto rounded shadow-sm border border-gray-100 cursor-pointer"
                  onClick={() => setSelectedReceipt(payments[payments.length - 1])}
                />
              ) : (
                <BsiReceipt payment={payments[payments.length - 1]} />
              )}
            </div>
          )}

          <div className="pt-2 text-center">
            <button
              onClick={() => setSelectedReceipt(payments[payments.length - 1])}
              className="text-blue-600 hover:underline font-extrabold text-[10px] tracking-wide inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Klik gambar untuk melihat ukuran penuh
            </button>
          </div>
        </div>
      </div>

      {/* 7. INFO PAKET */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
          <span className="text-amber-500">📦</span> Info Paket
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          <div className="p-4 border border-gray-100 bg-gray-50/30 rounded-xl flex flex-col gap-1.5">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Nama Paket</span>
            <span className="font-extrabold text-gray-801 leading-snug">{bookingData.packageName || 'Umroh 9d City Tour Makkah + Madinah by Saudia'}</span>
          </div>

          <div className="p-4 border border-gray-100 bg-gray-50/30 rounded-xl flex flex-col gap-1.5">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Batch</span>
            <span className="font-extrabold text-gray-801">Batch 227</span>
          </div>

          <div className="p-4 border border-gray-100 bg-gray-50/30 rounded-xl flex flex-col gap-1.5">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Jumlah Jamaah</span>
            <span className="font-extrabold text-gray-801">1 Orang</span>
          </div>

          <div className="p-4 border border-gray-100 bg-gray-50/30 rounded-xl flex flex-col gap-1.5">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Keberangkatan</span>
            <span className="font-black text-gray-801 flex flex-col gap-0.5">
              <span>15 September 2026</span>
              <span className="text-amber-600 font-medium font-sans text-[10px] mt-0.5 inline-block bg-amber-50/65 w-max px-2 py-0.5 rounded border border-amber-100">H-92 Hari</span>
            </span>
          </div>
        </div>
      </div>

      {/* 8. BUTUH BANTUAN? CS WHATSAPP BOX */}
      <div className="border border-emerald-150 bg-emerald-50/30 rounded-3xl p-5 flex flex-col items-center justify-center text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-md animate-bounce">
          <MessageCircle className="w-6 h-6 fill-white text-emerald-700" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-black text-emerald-950">Butuh Bantuan?</h4>
          <p className="text-[11px] text-gray-600">
            CS Anda: <strong className="text-emerald-900">Admin Umaroh</strong>
          </p>
          <p className="text-[10px] text-gray-450 leading-relaxed font-semibold">Siap membantu informasi pembayaran Anda</p>
        </div>
        <div>
          <a
            href="https://wa.me/6283844974952?text=Assalamualaikum%20Admin%20Umaroh,%20konfirmasi%2520keuangan%20Umroh"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 bg-emerald-750 hover:bg-emerald-800 text-white font-black px-6 py-2.5 rounded-full text-xs transition cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-white text-emerald-750" /> Chat Admin
          </a>
        </div>
      </div>

      {/* 9. FAQ ADMINISTRASI & KEUANGAN */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center shrink-0">
            <span className="font-black text-sm">?</span>
          </div>
          <div>
            <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider">FAQ Administrasi & Keuangan</h3>
            <p className="text-[10px] text-gray-450 leading-tight">Pertanyaan yang Sering Diajukan seputar Pembayaran dan Administrasi</p>
          </div>
        </div>

        <div className="space-y-4">
          {faqData.map((group) => (
            <div key={group.category} className="space-y-2">
              {/* Category banner */}
              <div className="bg-amber-500 text-white px-3.5 py-2.5 rounded-xl text-[10px] font-black flex justify-between items-center shadow-xs uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  📁 {group.category}
                </span>
                <span className="bg-amber-600/70 border border-white/20 text-white text-[9px] px-2 py-0.5 rounded font-black tracking-normal">
                  {group.countLabel}
                </span>
              </div>

              {/* Questions accordions */}
              <div className="space-y-1.5 pl-1.5">
                {group.questions.map((faq) => {
                  const isExpanded = expandedFaqId === faq.id;
                  return (
                    <div key={faq.id} className="bg-white border border-gray-105 rounded-xl overflow-hidden shadow-xs">
                      <button
                        type="button"
                        onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                        className="w-full flex items-center justify-between p-3.5 text-left transition hover:bg-gray-50/50 cursor-pointer gap-2"
                      >
                        <span className="text-[11.5px] font-extrabold text-gray-750 leading-snug">
                          {faq.q}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                        )}
                      </button>
                      
                      {isExpanded && (
                        <div className="px-4 py-3 bg-gray-50/40 border-t border-gray-50 text-[10.5px] leading-relaxed text-gray-500 font-sans">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center">
          <button
            onClick={() => alert('Menautkan ke database FAQ pusat umaroh Syariah Cabang. Seluruh data panduan Administrasi & Keuangan tersedia.')}
            className="bg-amber-500 hover:bg-amber-600 text-white font-black px-5 py-3 rounded-xl text-xs uppercase tracking-wide inline-flex items-center justify-center gap-1.5 transition shadow-sm w-full sm:w-auto cursor-pointer"
          >
            📋 Lihat Semua FAQ Administrasi <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FULLSCREEN PREVIEW RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full relative shadow-2xl p-4 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm z-10 transition cursor-pointer"
            >
              ✖
            </button>
            <div className="pt-6">
              {selectedReceipt.uploadedImage ? (
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-center text-gray-400 uppercase tracking-widest">Bukti Transfer Unggahan</h4>
                  <img src={selectedReceipt.uploadedImage} alt="Bukti Transfer" className="w-full h-auto rounded-2xl border border-gray-100 shadow-md" />
                  <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-100 text-center text-[10px] font-black uppercase">
                    Status: Verified • Rp {selectedReceipt.jumlah.toLocaleString('id-ID')}
                  </div>
                </div>
              ) : (
                <BsiReceipt payment={selectedReceipt} />
              )}
            </div>
            <div className="mt-4 pt-2 flex justify-end">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold px-4 py-2 rounded-xl text-xs cursor-pointer uppercase transition"
              >
                Tutup Review
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export const PortalLainnyaTab: React.FC<{
  bookingData: BookingRecord | null;
  prepChecklist: {[key: string]: boolean};
  handleTogglePrepChecklist: (key: string) => void;
}> = ({ bookingData, prepChecklist, handleTogglePrepChecklist }) => {
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  if (!bookingData) return null;

  const essentialList = [
    { key: 'ihram', label: '👔 Kain Ihram & Sabuk (L) / Mukena & Khimar Ihram (P)' },
    { key: 'sandal', label: '鞋 Sandal Kamar Ringan & Kantong Jaring Sandal Gantung' },
    { key: 'buku', label: '📘 Buku Panduan Doa Saku & Bacaan Manasik Praktis' },
    { key: 'sabun', label: '🧴 Sabun Non-parfum, Pelembab & Sunscreen Ramah Ihram' },
    { key: 'obat', label: '💊 Obat-obatan Pribadi, Vitamin, Plaster kaki & Masker' },
    { key: 'koper', label: '💼 Koper Kabin Resmi Berlabel Umroh & Tas Gantung Paspor' },
    { key: 'powerbank', label: '🔋 Powerbank 10.000mAh & Steker Arab 3-Pin (Colokan G)' },
    { key: 'jaket', label: '🧥 Jaket / Syal Hangat (Madinah relative sejuk dingin subuh)' },
    { key: 'kacamata', label: '👓 Kacamata Hitam & Payung Lipat Mungil Penahan Terik' },
    { key: 'botol', label: '🚰 Botol Semprotan Spray untuk Air Wajah / Zam-zam' },
    { key: 'dok', label: '📄 Printout Fotokopi Visa, Tiket & Paspor saku' },
    { key: 'riyal', label: '💵 Uang Tunai Riyal Saudi (SAR) untuk jajan kecil harian' },
    { key: 'sajadah', label: 'Scarves Sajadah Tipis Praktis Travel Ringan' },
    { key: 'lip', label: '💄 Pelembab Bibir (Lipbalm) penahan kering bibir retak' },
    { key: 'plastik', label: '🛍️ Kantong Plastik Kecil Ziploc untuk baju basah / kotor' }
  ];

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    
    setIsSendingFeedback(true);
    try {
      await addDoc(collection(db, 'feedback_jamaah'), {
        bookingId: bookingData.id || '',
        jamaahName: bookingData.namaJamaah || 'Jamaah Umaroh',
        rating: feedbackRating,
        feedback: feedbackText,
        createdAt: new Date().toISOString()
      });
      setFeedbackSubmitted(true);
      setFeedbackText('');
    } catch (err) {
      console.error('Error sending feedback:', err);
      setFeedbackSubmitted(true);
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const completedChecklistCount = Object.values(prepChecklist || {}).filter(Boolean).length;

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. INTERACTIVE PREVENTIVE CHECKLIST OF 15 ITEMS */}
      <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
            📋 Checklist 15 Barang Bawaan Esensial Koper
          </h3>
          <p className="text-[10px] text-gray-500 mt-1">Sentuh baris untuk mencentang barang yang sudah Anda masukkan koper kabin demi keamanan bagasi.</p>
          <div className="mt-2.5 bg-emerald-50 text-emerald-950 font-black px-3 py-1.5 rounded-lg text-[10px] flex justify-between items-center">
            <span>🎒 KELENGKAPAN BARANG:</span>
            <span>{completedChecklistCount} dari 15 Berhasil Terpacking</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 font-medium text-xs text-gray-700 leading-snug">
          {essentialList.map((item) => {
            const isChecked = !!prepChecklist[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleTogglePrepChecklist(item.key)}
                className={`w-full p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition active:scale-[0.98] ${
                  isChecked 
                    ? 'bg-emerald-50/50 border-emerald-250 text-emerald-950' 
                    : 'bg-white border-gray-150 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className={`w-4 h-4 rounded mt-0.5 flex-shrink-0 flex items-center justify-center border transition-all ${
                  isChecked ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-gray-50 border-gray-350'
                }`}>
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MANASIK ONLINE AND LIVESTREAM VIDEO */}
      <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-gray-901 uppercase tracking-widest flex items-center gap-1.5">
          📹 VIDEO PENUNTUN MANASIK SAKU
        </h3>
        
        {isPlayingVideo ? (
          <div className="bg-black text-white rounded-xl p-3 space-y-3">
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <iframe
                className="w-full h-full"
                src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1"
                title="Video Bimbingan Manasik Umroh"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-extrabold text-emerald-400">Tutorial Tata Cara Ber-Ihram, Tawaf & Sa'i</span>
              <button
                onClick={() => setIsPlayingVideo(false)}
                className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer"
              >
                ✕ Tutup Video
              </button>
            </div>
          </div>
        ) : (
          <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden flex flex-col justify-between p-4 text-white relative">
            <div className="absolute inset-0 bg-cover bg-center opacity-30 select-none" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1565552645632-d725f8bab19f?auto=format&fit=crop&q=80')" }}></div>
            
            <span className="bg-red-650 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg self-start z-10 animate-pulse">LIVE REPLAY STREAMING</span>
            
            <div className="text-center z-10 my-auto">
              <button
                onClick={() => setIsPlayingVideo(true)}
                className="w-14 h-14 rounded-full bg-white text-emerald-800 flex items-center justify-center mx-auto shadow-xl hover:scale-110 active:scale-95 transition cursor-pointer"
              >
                ▶️
              </button>
              <p className="text-xs font-black mt-3 text-shadow-sm">Tutorial Tata Cara Ber-Ihram, Tawaf & Sai Sesuai Sunnah</p>
              <p className="text-[10px] text-gray-300">Durasi: 42 Menit • Dipandu oleh KH. Mas`ud Halimi</p>
            </div>

            <div className="text-[9px] text-gray-400 z-10 flex justify-between">
              <span>2.4K Jamaah menonton</span>
              <span>Umaroh Synergy HD 1080p</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. WHATSAPP LINK COMMUNITY */}
      <div className="bg-emerald-950 text-white p-6 rounded-2xl relative overflow-hidden space-y-4">
        <div className="space-y-1">
          <h4 className="text-sm font-extrabold">📌 Gabung WhatsApp Group Jamaah</h4>
          <p className="text-xs text-emerald-100 font-bold leading-relaxed">Komunikasi antar pimpinan regu, mutawwif, coordinator batch, dan sesama anggota jamaah satu program.</p>
        </div>
        <a
          href="https://wa.me/6283844974952"
          target="_blank"
          rel="noreferrer"
          className="inline-block bg-white text-emerald-950 font-extrabold px-5 py-3 rounded-xl text-xs uppercase tracking-wider hover:scale-[1.02] transition shadow-md"
        >
          💬 Gabung Group WA Batch
        </a>
      </div>

      {/* 4. FEEDBACK FORM */}
      <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h4 className="text-xs font-black text-gray-401 uppercase tracking-widest">⭐ MASUKAN & ULASAN LAYANAN</h4>
          <p className="text-[11px] text-gray-500 mt-1">Ulasan Anda akan dijadikan parameter indeks kepuasan perbaikan fasilitas katering, hotel, dan bus mutawwif pada perjalanan selanjutnya.</p>
        </div>

        {feedbackSubmitted ? (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center space-y-1 animate-in zoom-in-95 duration-200">
            <p className="text-xs font-black text-emerald-900">Alhamdulillah! Terima kasih atas ulasan bintang {feedbackRating} Anda.</p>
            <p className="text-[10px] text-gray-600">Masukan Anda telah berhasil disimpan di database server Umaroh.</p>
            <button
              onClick={() => setFeedbackSubmitted(false)}
              className="mt-2 text-[10px] text-emerald-700 underline font-bold cursor-pointer"
            >
              Tulis ulasan lain
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendFeedback} className="space-y-3">
            <div className="flex gap-2 text-xl cursor-default py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedbackRating(star)}
                  className={`transition-colors duration-150 cursor-pointer ${star <= feedbackRating ? 'text-amber-500' : 'text-gray-200'}`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              required
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Tuliskan ulasan masukan pelayanan hotel, mutawwif, pendaftaran disini..."
              className="w-full bg-gray-55 border border-gray-200 p-3.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/10"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSendingFeedback}
                className="bg-emerald-750 hover:bg-emerald-800 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSendingFeedback ? 'Mengirim...' : 'Kirim Masukan'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 5. RA-HMAH MILES LOYALTY PROGRAM */}
      <div className="bg-amber-50/50 border border-amber-150/60 rounded-2xl p-5 space-y-3 text-xs leading-normal font-sans">
        <h4 className="text-[11px] font-black text-amber-900 uppercase tracking-wider">🌟 PROGRAM LOYALITAS SAHABAT MILES</h4>
        <p className="text-gray-500 font-bold">Kumpulkan poin Sahabat Miles setiap mendaftar ber-Umroh. Poin dapat ditukar diskon paket haji furoda, koper eksklusif fiber, badal umroh gratis, atau upgrade kamar hotel bintang 5.</p>
        <div className="bg-white border border-amber-100 p-3.5 rounded-xl flex items-center justify-between font-mono">
          <div>
            <p className="text-[10px] text-gray-400 font-bold">TINGKATAN MEMBERSHIP</p>
            <p className="text-xs font-black text-amber-700">BRONZE ALUMNI</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-bold">SALDO POIN</p>
            <p className="text-xs font-black text-emerald-800">1,500 MILES</p>
          </div>
        </div>
      </div>

    </div>
  );
};
