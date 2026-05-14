import React from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { PaketTracker, JamaahTracker, KeberangkatanTracker } from './types';
import * as XLSX from 'xlsx';

interface Props {
  paket: PaketTracker;
  jamaahs: JamaahTracker[];
  keberangkatan?: KeberangkatanTracker;
}

export const ManifestGenerator: React.FC<Props> = ({ paket, jamaahs, keberangkatan }) => {
  
  const handleDownloadExcel = () => {
    // Prepare Data for Excel
    const dataToExport = jamaahs.map((j, index) => ({
      'No': index + 1,
      'Title': j.title || '',
      'No Identitas': j.nik || '',
      'Nama Paspor (Sesuai Nama di Paspor)': (j.nama_paspor || j.namaLengkap).toUpperCase(),
      'No Paspor': (j.no_paspor || '').toUpperCase(),
      'Tanggal Dikeluarkan Paspor': j.tgl_issue_paspor || '',
      'Tanggal Kadaluarsa Paspor': j.tgl_exp_paspor || '',
      'Kota Paspor': (j.kota_paspor || '').toUpperCase(),
      'Tempat Lahir': (j.tempat_lahir || '').toUpperCase(),
      'Tanggal Lahir': j.tanggal_lahir || '',
      'Kewarganegaraan': (j.kewarganegaraan || 'WNI').toUpperCase(),
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);

    // Auto-size columns
    const colWidths = [
      { wch: 5 }, // No
      { wch: 10 }, // Title
      { wch: 20 }, // NIK
      { wch: 35 }, // Nama Paspor
      { wch: 15 }, // No Paspor
      { wch: 25 }, // Tgl Issue
      { wch: 25 }, // Tgl Exp
      { wch: 20 }, // Kota Paspor
      { wch: 20 }, // Tempat Lahir
      { wch: 15 }, // Tgl Lahir
      { wch: 20 }, // Kewarganegaraan
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Manifest Jamaah');

    // Add Flight Info Sheet if available
    if (keberangkatan) {
      const flightData = [
        { Keterangan: 'Nama Paket', Nilai: paket.namaPaket },
        { Keterangan: 'Maskapai', Nilai: keberangkatan.maskapai },
        { Keterangan: 'No. Penerbangan', Nilai: keberangkatan.nomorPenerbangan },
        { Keterangan: 'Kode Booking (PNR)', Nilai: keberangkatan.kodeBooking || '-' },
        { Keterangan: 'Rute', Nilai: keberangkatan.rute || '-' },
        { Keterangan: 'Waktu Berangkat', Nilai: keberangkatan.waktuBerangkat && !isNaN(new Date(keberangkatan.waktuBerangkat).getTime()) ? new Date(keberangkatan.waktuBerangkat).toLocaleString('id-ID') : '-' },
        { Keterangan: 'Waktu Tiba', Nilai: keberangkatan.waktuTiba && !isNaN(new Date(keberangkatan.waktuTiba).getTime()) ? new Date(keberangkatan.waktuTiba).toLocaleString('id-ID') : '-' },
        { Keterangan: 'Tour Leader', Nilai: keberangkatan.tourLeader || '-' },
        { Keterangan: 'Mutawwif', Nilai: keberangkatan.mutawwif || '-' },
      ];
      const wsFlight = XLSX.utils.json_to_sheet(flightData);
      wsFlight['!cols'] = [{ wch: 25 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, wsFlight, 'Info Keberangkatan');
    }

    XLSX.writeFile(wb, `Manifest_${paket.namaPaket.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
          Generate Manifest Resmi
        </h3>
        <button
          onClick={handleDownloadExcel}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Download Excel Manifest
        </button>
      </div>
      <div className="p-4 bg-white">
        <p className="text-sm text-gray-600">
          Manifest ini akan menggabungkan data jamaah (termasuk detail paspor), pembagian kamar (Rooming List), dan data penerbangan (jika sudah diisi di Tracker Keberangkatan). File Excel ini siap diserahkan ke maskapai atau provider visa.
        </p>
      </div>
    </div>
  );
};
