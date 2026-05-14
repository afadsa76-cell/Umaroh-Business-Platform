import React, { forwardRef } from 'react';
import { formatCurrency } from '../utils/format';
import { logoBase64 } from '../utils/logoBase64';

interface OfferingProps {
  namaPaket: string;
  namaTravel: string;
  namaMitra: string;
  emberkasi: string;
  tglKeberangkatan: string;
  programHari: string;
  jumlahPax: number;
  tl: number;
  hotelMadinah: string;
  hotelMakkah: string;
  mealPlanMadinah?: string;
  mealPlanMakkah?: string;
  maskapai: string;
  hargaQuad: number;
  hargaTriple: number;
  hargaDouble: number;
  
  maskapaiHarga: number;
  hotelMadinahHarga: number;
  hotelMakkahHarga: number;
  handlingSaudiHarga: number;
  visaHarga: number;
  transportHarga: number;
  asuransiHarga: number;
  handlingDomestikHarga: number;
  perlengkapanHarga: number;
  tlHarga: number;
  wisataHarga?: number;
  namaWisata?: string;
  manasikHarga?: number;
  ziarahHarga?: number;
  mutawwifHarga?: number;
  keretaCepatHarga?: number;
  hargaDewasaSebelumKomisi: number;
  komisiMitra: number;
  komisiUmaroh: number;
}

export const OfferingTemplate = forwardRef<HTMLDivElement, OfferingProps>(({
  namaPaket,
  namaTravel,
  namaMitra,
  emberkasi,
  tglKeberangkatan,
  programHari,
  jumlahPax,
  tl,
  hotelMadinah,
  hotelMakkah,
  mealPlanMadinah,
  mealPlanMakkah,
  maskapai,
  hargaQuad,
  hargaTriple,
  hargaDouble,
  maskapaiHarga,
  hotelMadinahHarga,
  hotelMakkahHarga,
  handlingSaudiHarga,
  visaHarga,
  transportHarga,
  asuransiHarga,
  handlingDomestikHarga,
  perlengkapanHarga,
  tlHarga,
  wisataHarga,
  namaWisata,
  manasikHarga,
  ziarahHarga,
  mutawwifHarga,
  keretaCepatHarga,
  hargaDewasaSebelumKomisi,
  komisiMitra,
  komisiUmaroh
}, ref) => {
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div 
      ref={ref} 
      className="p-8 w-[800px] relative flex flex-col"
      style={{ 
        fontFamily: "'Inter', sans-serif",
        backgroundColor: '#FFC000', // Yellow background
        color: '#000000'
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col">
          <img src={logoBase64} alt="Umaroh Logo" className="h-12 mb-2 object-contain" />
          <p className="text-xs font-semibold italic">Platform Digital Umrah & Haji Pertama di Indonesia</p>
        </div>
        <div className="text-right border-l-2 border-black pl-4">
          <h1 className="text-3xl font-bold tracking-tight">Offering</h1>
          <h2 className="text-xl font-bold border-b-2 border-black pb-1 mb-2 inline-block">Sales Order / Quotation</h2>
          <p className="text-lg font-semibold">{today}</p>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-white p-4 mb-4 text-sm font-bold grid grid-cols-[180px_1fr] gap-y-2">
        <div>NAMA TRAVEL</div>
        <div>{namaTravel || '-'}</div>
        <div>NAMA MITRA</div>
        <div>{namaMitra || '-'}</div>
        <div>EMBERKASI</div>
        <div>{emberkasi || '-'}</div>
        <div>PROGRAM</div>
        <div>{namaPaket || '-'} ({programHari ? `${programHari} Hari` : '-'})</div>
        <div>JADWAL KEBERANGKATAN</div>
        <div>{tglKeberangkatan || '-'}</div>
        <div>JUMLAH PAX</div>
        <div>{jumlahPax} PAX {tl > 0 ? `(+ ${tl} TL)` : ''}</div>
      </div>

      {/* Prices Section */}
      <div className="mb-4">
        <div className="grid grid-cols-3 bg-[#111827] text-[#FFC000] text-center font-bold text-sm py-2">
          <div>QUAD</div>
          <div>TRIPLE</div>
          <div>DOUBLE</div>
        </div>
        <div className="grid grid-cols-3 bg-white text-center font-bold text-lg py-3">
          <div>{formatCurrency(hargaQuad)}</div>
          <div>{formatCurrency(hargaTriple)}</div>
          <div>{formatCurrency(hargaDouble)}</div>
        </div>
      </div>

      {/* Facilities Section */}
      <div className="mb-4">
        <div className="flex justify-between bg-[#111827] text-[#FFC000] font-bold text-sm py-2 px-4">
          <div>FASILITAS / INCLUDE</div>
          <div>NILAI (ESTIMASI)</div>
        </div>
        <div className="bg-white text-xs font-bold">
          {maskapaiHarga > 0 && (
            <div className="flex justify-between py-2 px-4 border-b border-gray-100">
              <div>MASKAPAI: {maskapai}</div>
              <div>{formatCurrency(maskapaiHarga)}</div>
            </div>
          )}
          {hotelMadinahHarga > 0 && (
            <div className="flex justify-between py-2 px-4 border-b border-gray-100">
              <div>HOTEL MADINAH: {hotelMadinah} {mealPlanMadinah ? `(${mealPlanMadinah})` : ''}</div>
              <div>{formatCurrency(hotelMadinahHarga)}</div>
            </div>
          )}
          {hotelMakkahHarga > 0 && (
            <div className="flex justify-between py-2 px-4 border-b border-gray-100">
              <div>HOTEL MAKKAH: {hotelMakkah} {mealPlanMakkah ? `(${mealPlanMakkah})` : ''}</div>
              <div>{formatCurrency(hotelMakkahHarga)}</div>
            </div>
          )}
          {handlingSaudiHarga > 0 && (
            <div className="flex justify-between py-2 px-4 border-b border-gray-100">
              <div>HANDLING SAUDI FULL</div>
              <div>{formatCurrency(handlingSaudiHarga)}</div>
            </div>
          )}
          {visaHarga > 0 && (
            <div className="flex justify-between py-2 px-4 border-b border-gray-100">
              <div>VISA UMROH</div>
              <div>{formatCurrency(visaHarga)}</div>
            </div>
          )}
          {transportHarga > 0 && (
            <div className="flex justify-between py-2 px-4 border-b border-gray-100">
              <div>TRANSPORTASI</div>
              <div>{formatCurrency(transportHarga)}</div>
            </div>
          )}
          {asuransiHarga > 0 && (
            <div className="flex justify-between py-2 px-4 border-b border-gray-100">
              <div>ASURANSI ZURICH BASIC</div>
              <div>{formatCurrency(asuransiHarga)}</div>
            </div>
          )}
          {handlingDomestikHarga > 0 && (
            <div className="flex justify-between py-2 px-4 border-b border-gray-100">
              <div>HANDLING DOMESTIK</div>
              <div>{formatCurrency(handlingDomestikHarga)}</div>
            </div>
          )}
          {perlengkapanHarga > 0 && (
            <div className="flex justify-between py-2 px-4 border-b border-gray-100">
              <div>AKSESORIS / PERLENGKAPAN</div>
              <div>{formatCurrency(perlengkapanHarga)}</div>
            </div>
          )}
          {tlHarga > 0 && (
            <div className="flex justify-between py-2 px-4 border-b border-gray-100">
              <div>TOUR LEADER (TL)</div>
              <div>{formatCurrency(tlHarga)}</div>
            </div>
          )}
          {wisataHarga !== undefined && wisataHarga > 0 && (
            <div className="flex justify-between py-2 px-4 border-b border-gray-100">
              <div>WISATA: {namaWisata || '-'}</div>
              <div>{formatCurrency(wisataHarga)}</div>
            </div>
          )}
          {manasikHarga !== undefined && manasikHarga > 0 && (
            <div className="flex justify-between py-2 px-4 border-b border-gray-100">
              <div>MANASIK</div>
              <div>{formatCurrency(manasikHarga)}</div>
            </div>
          )}
          {ziarahHarga !== undefined && ziarahHarga > 0 && (
            <div className="flex justify-between py-2 px-4 border-b border-gray-100">
              <div>ZIARAH TAMBAHAN</div>
              <div>{formatCurrency(ziarahHarga)}</div>
            </div>
          )}
          {mutawwifHarga !== undefined && mutawwifHarga > 0 && (
            <div className="flex justify-between py-2 px-4 border-b border-gray-100">
              <div>MUTAWWIF</div>
              <div>{formatCurrency(mutawwifHarga)}</div>
            </div>
          )}
          {keretaCepatHarga !== undefined && keretaCepatHarga > 0 && (
            <div className="flex justify-between py-2 px-4 border-b border-gray-100">
              <div>KERETA CEPAT</div>
              <div>{formatCurrency(keretaCepatHarga)}</div>
            </div>
          )}
          <div className="flex justify-between py-2 px-4 border-b border-gray-100" style={{ backgroundColor: '#FFFF00' }}>
            <div className="font-bold">HARGA DEWASA SEBELUM KOMISI</div>
            <div className="font-bold">{formatCurrency(hargaDewasaSebelumKomisi)}</div>
          </div>
          {komisiMitra > 0 && (
            <div className="flex justify-between py-2 px-4 border-b border-gray-100">
              <div>KOMISI MITRA</div>
              <div>{formatCurrency(komisiMitra)}</div>
            </div>
          )}
          {komisiUmaroh > 0 && (
            <div className="flex justify-between py-2 px-4">
              <div>KOMISI UMAROH</div>
              <div>{formatCurrency(komisiUmaroh)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Ketentuan Section */}
      <div className="mb-4">
        <div className="bg-[#111827] text-[#FFC000] font-bold text-sm py-2 px-4">
          KETENTUAN
        </div>
        <div className="bg-white p-4 text-xs">
          <div className="font-bold mb-2">BIAYA BELUM TERMASUK</div>
          <ol className="list-decimal pl-4 mb-4 space-y-1">
            <li>Passport</li>
            <li>Buku kuning / Suntik Meningitis</li>
            <li>Vaksin polio</li>
            <li>Perlengkapan Pribadi</li>
            <li>Kegiatan tambahan diluar program</li>
            <li>Perlengkapan full +Rp 1.000.000</li>
          </ol>
          
          <div className="font-bold mb-2">KETENTUAN PAKET</div>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Harga Paket merupakan harga HPP minimal PAX</li>
            <li>Jika ada pengurangan pax, maka harga akan menyesuaikan</li>
            <li>Batas waktu pendaftaran Jamaah maksimal 45 hari sebelum keberangkatan</li>
            <li>Mitra wajib memberikan konfirmasi Margin yang akan diambil</li>
            <li>Jika ada kegiatan tambahan yang akan diambil diluar paket, maka Mitra wajib memberikan informasi kepada Umaroh</li>
          </ol>
        </div>
      </div>

      {/* Informasi & Booking Section */}
      <div className="mb-4">
        <div className="bg-[#111827] text-[#FFC000] font-bold text-sm py-2 px-4">
          INFORMASI & BOOKING
        </div>
        <div className="bg-white p-4 text-xs">
          <div className="flex gap-8 font-bold mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
              ILHAM FICHRI 0889-7673-6991
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
              KHARINA AYU 0811-4441-592
            </div>
          </div>
          <ol className="list-decimal pl-4 mb-4 space-y-1">
            <li>Pendaftaran dapat dilakukan melalui WhatsApp kepada team Mitra Development</li>
            <li>Mitra wajib melakukan DP dan mengirimkan berkas Jamaah</li>
            <li>Semua prosedur hingga keberangkatan InsyaAllah mudah dan sudah menjadi tugas Umaroh dalam melayani Mitra dan Jamaah</li>
          </ol>
          
          <div className="font-bold text-[10px] text-gray-500 mb-1">TEKNIS</div>
          <ul className="list-disc pl-4 space-y-1 text-[10px] text-gray-600">
            <li>Mitra mengirimkan Paspor dan dokumen pendukung milik Jamaah kepada PIC operational</li>
            <li>Aksesoris akan dikirimkan ke kantor Mitra atau langsung ke alamat jamaah</li>
            <li>Manasik dapat dilakukan secara online</li>
          </ul>
        </div>
      </div>

      {/* Pembayaran Section */}
      <div className="mb-4">
        <div className="bg-[#111827] text-[#FFC000] font-bold text-sm py-2 px-4">
          PEMBAYARAN
        </div>
        <div className="bg-white p-4 text-xs flex justify-between items-end">
          <div>
            <div className="font-bold mb-1">PT. NAWAITUL UMRAH HAJI</div>
            <div className="text-gray-600">BANK BCA - 738 0989 918</div>
            <div className="text-gray-600">BANK BSI - 557 7775 003</div>
            <div className="text-gray-600">BANK BRI - 5951 01 000011 566</div>
          </div>
          <div className="text-right">
            <div className="italic text-[10px] text-gray-500 mb-2">"Dengan mendaftar program ini, mitra dianggap setuju<br/>dengan semua syarat dan ketentuan yang berlaku."</div>
            <div className="font-bold">Prepared by : Operational</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-2 font-bold text-sm">
        <div>
          <div>Call admin Ops</div>
          <div>+62 838 4497 4952</div>
        </div>
        <div className="text-right text-[10px] flex items-center gap-1 max-w-[200px]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
            <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          Jl. Tangkuban Prahu No.7, Babakan, Bogor Tengah, Kota Bogor, Jawa Barat 16128
        </div>
      </div>
    </div>
  );
});

OfferingTemplate.displayName = 'OfferingTemplate';
