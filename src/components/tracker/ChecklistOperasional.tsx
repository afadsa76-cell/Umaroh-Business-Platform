import React, { useState, useEffect } from 'react';
import { CheckCircle2, Save, FileText, DollarSign, Plane, Package, Upload, Download } from 'lucide-react';
import { PaketTracker } from './types';
import { updateDoc, doc, db, handleFirestoreError, OperationType } from '../../firebase';

interface Props {
  paket: PaketTracker;
}

const defaultChecklist = {
  pasporTerkumpul: 0,
  meningitisTerkumpul: 0,
  biometrikSelesai: 0,
  ktpKkTerkumpul: 0,
  dpMasuk: 0,
  pelunasanMasuk: 0,
  statusTiket: 'Pending' as const,
  statusHotelMakkah: 'Pending' as const,
  statusHotelMadinah: 'Pending' as const,
  statusVisa: 'Pending' as const,
  statusBus: 'Pending' as const,
  koperDibagikan: 0,
  statusManasik: 'Pending' as const,
  statusSiskopatuh: 'Pending' as const,
  files: {} as Record<string, string>,
};

export const ChecklistOperasional: React.FC<Props> = ({ paket }) => {
  const [checklist, setChecklist] = useState(paket.checklist || defaultChecklist);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setChecklist(paket.checklist || defaultChecklist);
  }, [paket]);

  const handleChange = (field: string, value: string | number) => {
    setChecklist(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (field: string, file: File) => {
    if (file.size > 800000) {
      alert('File terlalu besar. Maksimal 800KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const newFiles = { ...(checklist.files || {}), [field]: base64 };
      setChecklist(prev => ({ ...prev, files: newFiles }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'tracker_paket', paket.id), {
        checklist
      });
      // Optional: Update overall status based on checklist progress
      let newStatus = paket.status;
      if (checklist.statusTiket === 'Issued' && checklist.statusVisa === 'Issued') {
        newStatus = 'Siap Berangkat';
      } else if (checklist.statusTiket === 'Booked') {
        newStatus = 'Booking Seat';
      } else if (checklist.statusVisa === 'Proses Provider') {
        newStatus = 'Proses Visa';
      }
      
      if (newStatus !== paket.status) {
        await updateDoc(doc(db, 'tracker_paket', paket.id), { status: newStatus });
      }
      
      alert('Checklist berhasil diperbarui!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'tracker_paket');
    } finally {
      setIsSaving(false);
    }
  };

  const target = paket.targetJamaah || 0;

  const renderNumberInput = (label: string, field: keyof typeof defaultChecklist) => (
    <div className="flex flex-col gap-2 py-3 border-b border-gray-100 last:border-0">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min="0"
          max={target}
          value={checklist[field] as number}
          onChange={(e) => handleChange(field, Number(e.target.value))}
          className="w-20 h-10 bg-white border border-gray-200 rounded-xl text-center text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">/ {target} JAMA'AH</span>
      </div>
    </div>
  );

  const renderTrackingItem = (label: string, field: string, options: string[], fileField?: string) => {
    const currentValue = checklist[field as keyof typeof checklist] as string || 'Pending';
    const fileUrl = fileField ? (checklist.files?.[fileField] as string) : null;
    
    return (
      <div className="flex flex-col gap-3 py-4 border-b border-gray-50 last:border-0">
        <div className="flex items-center justify-between">
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
           {fileField && (
             <div className="flex items-center gap-2">
               {fileUrl && (
                 <a 
                   href={fileUrl} 
                   download={`${label.replace(/\s+/g, '_').toLowerCase()}.pdf`}
                   className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-black hover:bg-emerald-100 transition-colors border border-emerald-100"
                 >
                   <Download className="w-3 h-3" />
                   DOWNLOAD PDF
                 </a>
               )}
               <label className="cursor-pointer flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[8px] font-black hover:bg-blue-100 transition-colors border border-blue-100">
                 <Upload className="w-3 h-3" />
                 {fileUrl ? 'UPDATE PDF' : 'UPLOAD PDF'}
                 <input 
                   type="file" 
                   accept=".pdf" 
                   className="hidden" 
                   onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) handleFileUpload(fileField, file);
                   }}
                 />
               </label>
             </div>
           )}
        </div>
        <div className="flex flex-wrap gap-2">
          {options.map(opt => {
            const isSelected = currentValue.toLowerCase() === opt.toLowerCase();
            return (
              <button
                key={opt}
                onClick={() => handleChange(field, opt)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] transition-all border ${
                  isSelected 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-blue-600" />
          Checklist Operasional
        </h3>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Menyimpan...' : 'Simpan Progress'}
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* A. Dokumen & Administrasi */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
               <FileText className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-gray-900 uppercase italic">Fase Dokumen</h4>
          </div>
          <div className="bg-white p-2 rounded-2xl">
            {renderNumberInput('Paspor Terkumpul', 'pasporTerkumpul')}
            {renderNumberInput('Buku Kuning (Meningitis)', 'meningitisTerkumpul')}
            {renderNumberInput('Rekam Biometrik', 'biometrikSelesai')}
            {renderNumberInput('KTP & KK', 'ktpKkTerkumpul')}
          </div>

          <div className="flex items-center gap-2 mt-8 mb-2">
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
               <DollarSign className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-gray-900 uppercase italic">Fase Pembayaran</h4>
          </div>
          <div className="bg-white p-2 rounded-2xl">
            {renderNumberInput('DP Masuk', 'dpMasuk')}
            {renderNumberInput('Pelunasan Masuk', 'pelunasanMasuk')}
          </div>
        </div>

        {/* C. Operasional & Vendor */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
               <Plane className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-gray-900 uppercase italic">Fase Operasional</h4>
          </div>
          <div className="bg-white p-2 rounded-2xl">
            {renderTrackingItem('Tiket Pesawat', 'statusTiket', ['Pending', 'Booked', 'Issued'], 'tiketPesawat')}
            {renderTrackingItem('Hotel Makkah', 'statusHotelMakkah', ['Pending', 'Booked', 'Paid'], 'hotelMakkah')}
            {renderTrackingItem('Hotel Madinah', 'statusHotelMadinah', ['Pending', 'Booked', 'Paid'], 'hotelMadinah')}
            {renderTrackingItem('Visa', 'statusVisa', ['Pending', 'Proses Provider', 'Issued'], 'visa')}
            {renderTrackingItem('Transportasi (Bus)', 'statusBus', ['Pending', 'Booked', 'Paid'], 'bus')}
          </div>

          <div className="flex items-center gap-2 mt-8 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
               <Package className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-gray-900 uppercase italic">Fase Perlengkapan</h4>
          </div>
          <div className="bg-white p-2 rounded-2xl">
            <div className="flex flex-col gap-2 py-4 border-b border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Koper Dibagikan</span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max={target}
                  value={checklist.koperDibagikan || 0}
                  onChange={(e) => handleChange('koperDibagikan', Number(e.target.value))}
                  className="w-20 h-10 bg-white border border-gray-200 rounded-xl text-center text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">/ {target} JAMA'AH</span>
              </div>
            </div>
            {renderTrackingItem('Jadwal Manasik', 'statusManasik', ['Pending', 'Jadwal Ditetapkan', 'Selesai'], 'manasik')}
            {renderTrackingItem('Siskopatuh', 'statusSiskopatuh', ['Pending', 'Proses', 'Selesai'], 'siskopatuh')}
          </div>
        </div>
      </div>
    </div>
  );
};
