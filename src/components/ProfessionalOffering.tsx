import React from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { MapPin } from 'lucide-react';
import { logoBase64 } from '../utils/logoBase64';

interface ProfessionalOfferingProps {
  data: {
    tanggalPembuatan: Date;
    namaTravel: string;
    namaMitra: string;
    emberkasi: string;
    jumlahPax: number;
    tourLeaderCount: number;
    jadwalKeberangkatan: string;
    program: string;
    prices: {
      maskapai: number;
      hotelMadinah: number;
      hotelMakkah: number;
      handlingSaudi: number;
      mutawif: number;
      aksesoris: number;
      addOn: number;
      visa: number;
      asuransi: number;
      handlingDomestik: number;
      tl: number;
      hargaHpp: number;
      komisiMitra: number;
      komisiUmaroh: number;
      hargaQuad: number;
      hargaTriple: number;
      hargaDouble: number;
    };
    details: {
      hotelMadinahName: string;
      hotelMakkahName: string;
      maskapaiName: string;
      maskapaiSeats: string;
    };
  };
}

const formatIDR = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('Rp', 'Rp ');
};

export const ProfessionalOffering: React.FC<ProfessionalOfferingProps> = ({ data }) => {
  return (
    <div id="professional-offering" className="bg-[#FDB913] p-8 leading-tight text-gray-900 font-sans relative flex flex-col" style={{ width: '210mm', minHeight: '297mm', border: '4px solid #8b5cf6' }}>
      {/* Background Pattern (Subtle) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start relative z-10 mb-6">
        <div className="flex flex-col">
           {/* Logo */}
          <div className="flex items-center gap-3 mb-2">
             <img src={logoBase64} alt="Umaroh Logo" className="h-14" />
          </div>
          <p className="text-[10px] italic font-semibold ml-1 tracking-wide">Platform Digital Umrah & Haji Pertama di Indonesia</p>
        </div>
        
        <div className="border-l-2 border-gray-900 pl-6 py-1">
          <h1 className="text-3xl font-bold leading-tight mb-1">Offering</h1>
          <h2 className="text-xl font-bold leading-tight mb-2">Sales Order / Quotation</h2>
          <div className="border-b-2 border-gray-900 w-full mb-2"></div>
          <h3 className="text-lg font-bold">
            {format(data.tanggalPembuatan, 'd MMMM yyyy', { locale: id })}
          </h3>
        </div>
      </div>

      {/* Info Table */}
      <div className="relative z-10 mb-4">
        <table className="w-full border-collapse bg-white shadow-sm">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="p-2 font-bold uppercase text-xs w-1/3 bg-gray-50 border-r border-gray-200">Nama Travel</td>
              <td className="p-2 font-bold uppercase text-xs">{data.namaTravel}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-2 font-bold uppercase text-xs bg-gray-50 border-r border-gray-200">Nama Mitra</td>
              <td className="p-2 font-bold uppercase text-xs">{data.namaMitra}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-2 font-bold uppercase text-xs bg-gray-50 border-r border-gray-200">Emberkasi</td>
              <td className="p-2 font-bold uppercase text-xs">{data.emberkasi}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-2 font-bold uppercase text-xs bg-gray-50 border-r border-gray-200">Program</td>
              <td className="p-2 font-bold uppercase text-xs">{data.program}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-2 font-bold uppercase text-xs bg-gray-50 border-r border-gray-200">Jadwal Keberangkatan</td>
              <td className="p-2 font-bold uppercase text-xs">{data.jadwalKeberangkatan}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-2 font-bold uppercase text-xs bg-gray-50 border-r border-gray-200">Jumlah Pax</td>
              <td className="p-2 font-bold uppercase text-xs">{data.jumlahPax} PAX {data.tourLeaderCount > 0 ? `(+ ${data.tourLeaderCount} TL)` : ''}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Harga Paket Table */}
      <div className="relative z-10 mb-4">
        <table className="w-full border-collapse bg-white shadow-sm">
          <thead>
            <tr className="bg-gray-900 text-[#FDB913] text-center font-bold uppercase text-xs tracking-wider">
              <th className="p-2 border-r border-gray-700 w-1/3">QUAD</th>
              <th className="p-2 border-r border-gray-700 w-1/3">TRIPLE</th>
              <th className="p-2 w-1/3">DOUBLE</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200 text-center">
              <td className="p-2 font-bold text-sm border-r border-gray-200">{formatIDR(data.prices.hargaQuad)}</td>
              <td className="p-2 font-bold text-sm border-r border-gray-200">{formatIDR(data.prices.hargaTriple)}</td>
              <td className="p-2 font-bold text-sm">{formatIDR(data.prices.hargaDouble)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Fasilitas / Include Table */}
      <div className="relative z-10 mb-6">
        <table className="w-full border-collapse bg-white shadow-sm text-[11px]">
          <thead>
            <tr className="bg-gray-900 text-[#FDB913] text-left font-bold uppercase text-xs tracking-wider">
              <th className="p-2 border-r border-gray-700 w-2/3">FASILITAS / INCLUDE</th>
              <th className="p-2 text-right">NILAI (ESTIMASI)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="p-1.5 font-bold uppercase border-r border-gray-200">
                MASKAPAI: {data.details.maskapaiName}
                <span className="ml-2 text-[9px] bg-gray-100 px-1.5 py-0.5 rounded">
                  Seats: {data.details.maskapaiSeats}
                </span>
              </td>
              <td className="p-1.5 text-right font-medium">{formatIDR(data.prices.maskapai)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-1.5 font-bold uppercase border-r border-gray-200">HOTEL MADINAH: {data.details.hotelMadinahName}</td>
              <td className="p-1.5 text-right font-medium">{formatIDR(data.prices.hotelMadinah)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-1.5 font-bold uppercase border-r border-gray-200">HOTEL MAKKAH: {data.details.hotelMakkahName}</td>
              <td className="p-1.5 text-right font-medium">{formatIDR(data.prices.hotelMakkah)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-1.5 font-bold uppercase border-r border-gray-200">HANDLING SAUDI FULL</td>
              <td className="p-1.5 text-right font-medium">{formatIDR(data.prices.handlingSaudi)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-1.5 font-bold uppercase border-r border-gray-200">VISA UMROH + TRANSPORTASI</td>
              <td className="p-1.5 text-right font-medium">{formatIDR(data.prices.visa)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-1.5 font-bold uppercase border-r border-gray-200">ASURANSI ZURICH BASIC</td>
              <td className="p-1.5 text-right font-medium">{formatIDR(data.prices.asuransi)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-1.5 font-bold uppercase border-r border-gray-200">HANDLING DOMESTIK</td>
              <td className="p-1.5 text-right font-medium">{formatIDR(data.prices.handlingDomestik)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-1.5 font-bold uppercase border-r border-gray-200">AKSESORIS / PERLENGKAPAN</td>
              <td className="p-1.5 text-right font-medium">{formatIDR(data.prices.aksesoris)}</td>
            </tr>
            <tr className="border-b border-gray-200 bg-gray-50">
              <td className="p-1.5 font-bold uppercase border-r border-gray-200">TOUR LEADER (TL)</td>
              <td className="p-1.5 text-right font-bold">{formatIDR(data.prices.tl)}</td>
            </tr>
            <tr className="border-b border-gray-200 bg-amber-50">
              <td className="p-1.5 font-bold uppercase border-r border-gray-200">HARGA DEWASA SEBELUM KOMISI</td>
              <td className="p-1.5 text-right font-bold">{formatIDR(data.prices.hargaHpp)}</td>
            </tr>
            <tr className="border-b border-gray-200 bg-amber-50">
              <td className="p-1.5 font-bold uppercase border-r border-gray-200">KOMISI MITRA</td>
              <td className="p-1.5 text-right font-bold">{formatIDR(data.prices.komisiMitra)}</td>
            </tr>
            <tr className="border-b border-gray-200 bg-amber-50">
              <td className="p-1.5 font-bold uppercase border-r border-gray-200">KOMISI UMAROH</td>
              <td className="p-1.5 text-right font-bold">{formatIDR(data.prices.komisiUmaroh)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Page Break for PDF */}
      <div className="html2pdf__page-break"></div>

      {/* Ketentuan Section (New from PDF) */}
      <div className="relative z-10 bg-white shadow-sm border border-gray-200 mb-4 overflow-hidden">
        <div className="bg-gray-900 text-[#FDB913] px-3 py-1.5 font-bold text-xs uppercase tracking-wider">
          Ketentuan
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="border-r border-gray-200">
            <div className="bg-[#FDB913]/30 px-3 py-1 font-bold text-[10px] uppercase border-b border-gray-200">
              Biaya Belum Termasuk
            </div>
            <div className="p-3 text-[10px] leading-relaxed">
              <ol className="list-decimal list-inside space-y-1">
                <li>Passport</li>
                <li>Buku kuning / Suntik Meningitis</li>
                <li>Vaksin polio</li>
                <li>Perlengkapan Pribadi</li>
                <li>Kegiatan tambahan diluar program</li>
                <li>Perlengkapan full +Rp 1.000.000</li>
              </ol>
            </div>
          </div>
          
          <div>
            <div className="bg-[#FDB913]/30 px-3 py-1 font-bold text-[10px] uppercase border-b border-gray-200">
              Ketentuan Paket
            </div>
            <div className="p-3 text-[10px] leading-relaxed">
              <ol className="list-decimal list-inside space-y-1">
                <li>Harga Paket merupakan harga HPP minimal PAX</li>
                <li>Jika ada pengurangan pax, maka harga akan menyesuaikan</li>
                <li>Batas waktu pendaftaran Jamaah maksimal 45 hari sebelum keberangkatan</li>
                <li>Mitra wajib memberikan konfirmasi Margin yang akan diambil</li>
                <li>Jika ada kegiatan tambahan yang akan diambil diluar paket, maka Mitra wajib memberikan informasi kepada Umaroh</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Informasi & Booking Section */}
      <div className="relative z-10 bg-white shadow-sm border border-gray-200 mb-4 overflow-hidden">
        <div className="bg-gray-900 text-[#FDB913] px-3 py-1.5 font-bold text-xs uppercase tracking-wider">
          Informasi & Booking
        </div>
        
        <div className="p-3">
          <div className="flex gap-8 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
              <span className="text-[10px] font-bold">ILHAM FICHRI 0889-7673-6991</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
              <span className="text-[10px] font-bold">KHARINA AYU 0811-4441-592</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-[10px] leading-relaxed">
              <ol className="list-decimal list-inside space-y-1">
                <li>Pendaftaran dapat dilakukan melalui WhatsApp kepada team Mitra Development</li>
                <li>Mitra wajib melakukan DP dan mengirimkan berkas Jamaah</li>
                <li>Semua prosedur hingga keberangkatan InsyaAllah mudah dan sudah menjadi tugas Umaroh dalam melayani Mitra dan Jamaah</li>
              </ol>
            </div>
            
            <div className="bg-gray-50 p-2 rounded border border-gray-100">
              <div className="font-bold text-[9px] uppercase mb-1 text-gray-500">Teknis</div>
              <ul className="list-disc list-inside text-[9px] space-y-1 text-gray-700">
                <li>Mitra mengirimkan Paspor dan dokumen pendukung milik Jamaah kepada PIC operational</li>
                <li>Aksesoris akan dikirimkan ke kantor Mitra atau langsung ke alamat jamaah</li>
                <li>Manasik dapat dilakukan secara online</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Pembayaran Section */}
      <div className="relative z-10 bg-white shadow-sm border border-gray-200 mb-6 overflow-hidden">
        <div className="bg-gray-900 text-[#FDB913] px-3 py-1.5 font-bold text-xs uppercase tracking-wider">
          Pembayaran
        </div>
        
        <div className="p-3 flex justify-between items-center">
          <div className="space-y-1">
            <div className="font-bold text-[11px] text-blue-900">PT. NAWAITUL UMRAH HAJI</div>
            <div className="text-[10px] font-mono">BANK BCA - 738 0989 918</div>
            <div className="text-[10px] font-mono">BANK BSI - 557 7775 003</div>
            <div className="text-[10px] font-mono">BANK BRI - 5951 01 000011 566</div>
          </div>
          
          <div className="max-w-[250px] text-right">
            <p className="text-[9px] italic text-gray-600 leading-tight">
              "Dengan mendaftar program ini, mitra dianggap setuju dengan semua syarat dan ketentuan yang berlaku."
            </p>
            <div className="mt-4 text-[10px] font-bold">
              Prepared by : Operational
            </div>
          </div>
        </div>
      </div>
      {/* Bottom Contact Bar */}
      <div className="mt-auto pt-6 flex justify-between items-end relative z-10 border-t border-gray-900/20">
          <div>
              <h4 className="font-bold text-base uppercase mb-0.5">Call admin Ops</h4>
              <div className="font-bold text-sm tracking-wide">+62 838 4497 4952</div>
          </div>

          <div className="text-left max-w-[200px] text-[8px] font-bold leading-tight">
              <div className="flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 flex-shrink-0 fill-gray-900 text-[#FDB913]" />
                  <p>Jl. Tangkuban Prahu No.7, Babakan, Bogor Tengah, Kota Bogor, Jawa Barat 16128</p>
              </div>
          </div>
      </div>
    </div>
  );
};

