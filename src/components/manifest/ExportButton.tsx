import React from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { JamaahTracker } from '../tracker/types';

interface ValidatedJamaah extends JamaahTracker {
  isValid: boolean;
  isExpired: boolean;
  isAlmostExpired: boolean;
  isPasporEmpty: boolean;
  isNamaPasporEmpty: boolean;
}

interface Props {
  data: ValidatedJamaah[];
  paketName: string;
}

export const ExportButton: React.FC<Props> = ({ data, paketName }) => {
  const exportToExcel = () => {
    if (data.length === 0) {
      alert("Tidak ada data valid untuk diexport.");
      return;
    }

    const exportData = data.map((j, index) => ({
      'No': index + 1,
      'Title': j.title || '',
      'No Identitas': j.nik || '',
      'Nama Paspor': (j.nama_paspor || '').toUpperCase(),
      'No Paspor': (j.no_paspor || '').toUpperCase(),
      'Tanggal Dikeluarkan Paspor': j.tgl_issue_paspor || '',
      'Tanggal Kadaluarsa Paspor': j.tgl_exp_paspor || '',
      'Kota Paspor': (j.kota_paspor || '').toUpperCase(),
      'Tempat Lahir': (j.tempat_lahir || '').toUpperCase(),
      'Tanggal Lahir': j.tanggal_lahir || '',
      'Kewarganegaraan': (j.kewarganegaraan || 'WNI').toUpperCase(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Manifest");
    XLSX.writeFile(workbook, `Manifest_${paketName.replace(/\s+/g, '_')}.xlsx`);
  };

  const exportToPDF = () => {
    if (data.length === 0) {
      alert("Tidak ada data valid untuk diexport.");
      return;
    }

    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text(`Manifest Jamaah - ${paketName}`, 14, 22);
    
    const tableColumn = ["No", "Title", "No Identitas", "Nama Paspor", "No Paspor", "Tgl Keluar", "Tgl Exp", "Kota Paspor", "Tempat Lahir", "Tgl Lahir", "WN"];
    const tableRows = data.map((j, index) => [
      index + 1,
      j.title || '',
      j.nik || '',
      (j.nama_paspor || '').toUpperCase(),
      (j.no_paspor || '').toUpperCase(),
      j.tgl_issue_paspor || '',
      j.tgl_exp_paspor || '',
      (j.kota_paspor || '').toUpperCase(),
      (j.tempat_lahir || '').toUpperCase(),
      j.tanggal_lahir || '',
      (j.kewarganegaraan || 'WNI').toUpperCase()
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [107, 33, 168] } // Purple-800
    });

    doc.save(`Manifest_${paketName.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="flex gap-2">
      <button 
        onClick={exportToExcel}
        className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors"
        disabled={data.length === 0}
      >
        <FileSpreadsheet className="w-4 h-4" /> Export Excel
      </button>
      <button 
        onClick={exportToPDF}
        className="flex items-center gap-2 bg-rose-600 text-white px-3 py-2 rounded-lg hover:bg-rose-700 text-sm font-medium transition-colors"
        disabled={data.length === 0}
      >
        <FileText className="w-4 h-4" /> Export PDF
      </button>
    </div>
  );
};
