import React, { useState, useEffect } from 'react';
import { PaketTracker } from './types';
import { updateDoc, doc, db } from '../../firebase';
import { CheckCircle2, Circle, Clock, Save, FileText, DollarSign, Plane, Package } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';

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
};

export const ChecklistOperasional: React.FC<Props> = ({ paket }) => {
  const [checklist, setChecklist] = useState(paket.checklist || defaultChecklist);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setChecklist(paket.checklist || defaultChecklist);
  }, [paket]);

  const handleChange = (field: keyof typeof defaultChecklist, value: any) => {
    setChecklist(prev => ({ ...prev, [field]: value }));
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
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          max={target}
          value={checklist[field] as number}
          onChange={(e) => handleChange(field, Number(e.target.value))}
          className="w-16 p-1 text-center border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-500 w-12">/ {target}</span>
      </div>
    </div>
  );

  const renderSelect = (label: string, field: keyof typeof defaultChecklist, options: string[]) => {
    const currentValue = checklist[field] as string;
    return (
      <div className="flex flex-col py-3 border-b border-gray-50 last:border-0 gap-2">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <div className="flex flex-wrap gap-2">
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => handleChange(field, opt)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                currentValue === opt
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
              }`}
            >
              {opt}
            </button>
          ))}
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

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* A. Dokumen & Administrasi */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-amber-600" /> Fase Dokumen
          </h4>
          <div className="bg-gray-50 p-3 rounded-lg">
            {renderNumberInput('Paspor Terkumpul', 'pasporTerkumpul')}
            {renderNumberInput('Buku Kuning (Meningitis)', 'meningitisTerkumpul')}
            {renderNumberInput('Rekam Biometrik', 'biometrikSelesai')}
            {renderNumberInput('KTP & KK', 'ktpKkTerkumpul')}
          </div>
        </div>

        {/* B. Pembayaran */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-green-600" /> Fase Pembayaran
          </h4>
          <div className="bg-gray-50 p-3 rounded-lg">
            {renderNumberInput('DP Masuk', 'dpMasuk')}
            {renderNumberInput('Pelunasan Masuk', 'pelunasanMasuk')}
          </div>
        </div>

        {/* C. Operasional & Vendor */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
            <Plane className="w-4 h-4 text-blue-600" /> Fase Operasional
          </h4>
          <div className="bg-gray-50 p-3 rounded-lg">
            {renderSelect('Tiket Pesawat', 'statusTiket', ['Pending', 'Booked', 'Issued'])}
            {renderSelect('Hotel Makkah', 'statusHotelMakkah', ['Pending', 'Booked', 'Paid'])}
            {renderSelect('Hotel Madinah', 'statusHotelMadinah', ['Pending', 'Booked', 'Paid'])}
            {renderSelect('Visa', 'statusVisa', ['Pending', 'Proses Provider', 'Issued'])}
            {renderSelect('Transportasi (Bus)', 'statusBus', ['Pending', 'Booked', 'Paid'])}
          </div>
        </div>

        {/* D. Perlengkapan & Manasik */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-purple-600" /> Fase Perlengkapan
          </h4>
          <div className="bg-gray-50 p-3 rounded-lg">
            {renderNumberInput('Koper Dibagikan', 'koperDibagikan')}
            {renderSelect('Jadwal Manasik', 'statusManasik', ['Pending', 'Jadwal Ditetapkan', 'Selesai'])}
          </div>
        </div>
      </div>
    </div>
  );
};
