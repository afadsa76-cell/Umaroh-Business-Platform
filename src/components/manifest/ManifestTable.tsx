import React from 'react';
import { JamaahTracker } from '../tracker/types';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface ValidatedJamaah extends JamaahTracker {
  isValid: boolean;
  isExpired: boolean;
  isAlmostExpired: boolean;
  isPasporEmpty: boolean;
  isNamaPasporEmpty: boolean;
}

interface Props {
  data: ValidatedJamaah[];
}

export const ManifestTable: React.FC<Props> = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
          <tr>
            <th className="p-3 font-medium text-center">No</th>
            <th className="p-3 font-medium">Title</th>
            <th className="p-3 font-medium">Nama Paspor</th>
            <th className="p-3 font-medium">No Paspor</th>
            <th className="p-3 font-medium">Tgl Dikeluarkan</th>
            <th className="p-3 font-medium">Tgl Kadaluarsa</th>
            <th className="p-3 font-medium">Kota Paspor</th>
            <th className="p-3 font-medium">Tempat Lahir</th>
            <th className="p-3 font-medium">Tanggal Lahir</th>
            <th className="p-3 font-medium">Kewarganegaraan</th>
            <th className="p-3 font-medium text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((jamaah, index) => (
            <tr key={jamaah.id} className={`hover:bg-gray-50 ${!jamaah.isValid ? 'bg-rose-50/30' : ''}`}>
              <td className="p-3 text-center text-gray-500">{index + 1}</td>
              <td className="p-3">{jamaah.title || '-'}</td>
              <td className="p-3 font-medium text-gray-900 uppercase">
                {jamaah.nama_paspor || <span className="text-rose-500 italic">Kosong</span>}
              </td>
              <td className="p-3 uppercase">
                {jamaah.no_paspor || <span className="text-rose-500 italic">Kosong</span>}
              </td>
              <td className="p-3">{jamaah.tgl_issue_paspor || '-'}</td>
              <td className="p-3">
                <span className={`${jamaah.isExpired ? 'text-rose-600 font-medium' : jamaah.isAlmostExpired ? 'text-amber-600 font-medium' : ''}`}>
                  {jamaah.tgl_exp_paspor || '-'}
                </span>
              </td>
              <td className="p-3">{jamaah.kota_paspor || '-'}</td>
              <td className="p-3">{jamaah.tempat_lahir || '-'}</td>
              <td className="p-3">{jamaah.tanggal_lahir || '-'}</td>
              <td className="p-3 uppercase">{jamaah.kewarganegaraan || 'INDONESIA'}</td>
              <td className="p-3 text-center">
                {jamaah.isValid ? (
                  <div className="flex justify-center" title="Valid">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                ) : (
                  <div className="flex justify-center" title="Tidak Lengkap / Expired">
                    <XCircle className="w-5 h-5 text-rose-500" />
                  </div>
                )}
                {jamaah.isAlmostExpired && jamaah.isValid && (
                  <div className="flex justify-center mt-1" title="Paspor Hampir Expired (< 6 Bulan)">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                )}
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={11} className="p-8 text-center text-gray-500">
                Tidak ada data jamaah dengan status READY pada paket ini.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
