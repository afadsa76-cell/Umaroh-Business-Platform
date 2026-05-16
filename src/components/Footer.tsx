import React from 'react';
import { Phone, Mail, Globe } from 'lucide-react';
import { logoBase64 } from '../utils/logoBase64';
import { openWhatsApp } from '../utils/whatsapp';

interface FooterProps {
  minimalOnMobile?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ minimalOnMobile = false }) => {
  return (
    <footer className={`bg-gray-100 text-gray-800 border-t border-gray-200 transition-all ${minimalOnMobile ? 'mt-0 py-4 lg:mt-12 lg:py-16' : 'mt-12 py-16'}`}>
      <div className="container mx-auto px-4">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12 ${minimalOnMobile ? 'hidden lg:grid' : ''}`}>
          {/* Left Side: Logo & Description */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <img src={logoBase64} alt="Umaroh Logo" className="h-8" />
            </div>
            <p className="text-gray-600 leading-relaxed max-w-md mb-8">
              Umaroh adalah platform digital penyedia layanan satu atap untuk bisnis perjalanan umrah. 
              Kami mengelola seluruh operasional, perjalanan, jamaah, hingga ujroh secara end-to-end 
              melalui sistem digital yang otomatis dan transparan.
            </p>
            <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-700">
              <a href="#" className="hover:text-amber-600 transition-colors">Beranda</a>
              <a href="#" className="hover:text-amber-600 transition-colors">Tentang</a>
              <a href="#" className="hover:text-amber-600 transition-colors">Kemitraan</a>
              <a href="#" className="hover:text-amber-600 transition-colors">Berita</a>
              <a href="#" className="hover:text-amber-600 transition-colors">Galeri</a>
              <a href="#" className="hover:text-amber-600 transition-colors">Kontak</a>
              <a href="#" className="hover:text-amber-600 transition-colors">ULC</a>
            </div>
          </div>

          {/* Right Side: Newsletter & Addresses */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-black">Dapatkan Informasi Terbaru</h3>
            <p className="text-gray-600 text-sm mb-6">
              Bergabunglah dalam newsletter kami untuk update berita, promo, dan peluang kemitraan dari Umaroh.
            </p>
            <div className="flex gap-2 mb-8">
              <input 
                type="email" 
                placeholder="Masukkan email anda" 
                className="flex-grow bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-2 rounded-lg text-sm shadow-md transition-all">
                Subscribe
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <p className="font-bold text-black">Alamat Kantor (Bogor):</p>
                <p>Jl. Tangkuban Prahu No.7, RT.01/RW.03, Babakan, Kec.Bogor Tengah, Kota Bogor, Jawa Barat 16128</p>
              </div>
              <div>
                <p className="font-bold text-black">Alamat Kantor (Makassar):</p>
                <p>Jl. Andi Djemma, Metropolitan Residence Blok B3, Kel.Banta-Bantaeng, Kec.Rappocini, Kota Makassar, Sulawesi Selatan 90223</p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Structure & Operating Hours */}
        <div className={`border-t border-gray-200 py-12 mb-8 ${minimalOnMobile ? 'hidden lg:block' : ''}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Divisi Akuisisi */}
            <div>
              <h4 className="text-amber-600 font-bold mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Divisi Akuisisi
              </h4>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Ketua Divisi</p>
                  <p className="font-bold text-black">Admin Mas Ilham</p>
                  <p className="text-gray-600">0857-7801-9661</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Tim</p>
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium text-black">Admin Dayat</p>
                      <p className="text-gray-600">0811-8880-6909</p>
                    </div>
                    <div>
                      <p className="font-medium text-black">Admin Rehan</p>
                      <p className="text-gray-600">0821-1559-7772</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Divisi Paket Konsorsium & Custom */}
            <div className="space-y-8">
              <div>
                <h4 className="text-amber-600 font-bold mb-4 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Divisi Paket Konsorsium
                </h4>
                <div className="text-sm">
                  <p className="font-bold text-black">Admin Yusuf</p>
                  <p className="text-gray-600">0823-8200-8748</p>
                </div>
              </div>
              <div>
                <h4 className="text-amber-600 font-bold mb-4 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Divisi Paket Custom
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Ketua Divisi</p>
                    <p className="font-bold text-black">Admin Mba Ayu</p>
                    <p className="text-gray-600">0811-4441-592</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Tim</p>
                    <p className="font-medium text-black">Tim Custom</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Divisi Edukasi */}
            <div>
              <h4 className="text-amber-600 font-bold mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Divisi Edukasi
              </h4>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Ketua Divisi</p>
                  <p className="font-bold text-black">Admin Rusman</p>
                  <p className="text-gray-600">0858-2524-6513</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Tim</p>
                  <div>
                    <p className="font-medium text-black">Admin Ranti</p>
                    <p className="text-gray-600">0821-6006-6304</p>
                  </div>
                </div>
              </div>
            </div>

            {/* NQH Wisata Promo */}
            <div>
              <h4 className="text-amber-600 font-bold mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4" /> NQH Wisata
              </h4>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Reservasi Tiket</p>
                  <div className="space-y-1">
                    <p className="font-bold text-black text-xs">SANI: 085811007001</p>
                    <p className="font-bold text-black text-xs">SYAHLA: 085814788361</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Visa & Hotel</p>
                  <div className="space-y-1">
                    <p className="font-medium text-black text-xs">FAESAL: 081399250475</p>
                    <p className="font-medium text-black text-xs">RENNY: 081296816327</p>
                  </div>
                </div>
                <div className="pt-1">
                  <button 
                    onClick={() => openWhatsApp("https://chat.whatsapp.com/ECg9fKmcJCb8l53sRRFcmF")}
                    className="text-amber-600 font-bold hover:underline text-xs text-left"
                  >
                    Join WA Group
                  </button>
                </div>
              </div>
            </div>

            {/* FRESHNEL Promo */}
            <div>
              <h4 className="text-amber-600 font-bold mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4" /> FRESHNEL Promo
              </h4>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Sales Team</p>
                  <div className="space-y-1">
                    <p className="font-bold text-black text-xs">UMAR: 082333344936</p>
                    <p className="font-bold text-black text-xs">RIDHO: 082228939996</p>
                    <p className="font-bold text-black text-xs">SEPTI: 081250001352</p>
                    <p className="font-bold text-black text-xs">FINA: 082228939995</p>
                  </div>
                </div>
                <div className="pt-1">
                  <button 
                    onClick={() => openWhatsApp("https://chat.whatsapp.com/FbBKB7rAM1BL6k4GFp5GiH")}
                    className="text-amber-600 font-bold hover:underline text-xs text-left"
                  >
                    Join WA Group
                  </button>
                </div>
              </div>
            </div>

            {/* AZZAHRA Travel */}
            <div>
              <h4 className="text-amber-600 font-bold mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4" /> AZZAHRA Travel
              </h4>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Sales Team</p>
                  <div className="space-y-1">
                    <p className="font-bold text-black text-xs">ASTRIE: 089531820777</p>
                    <p className="font-bold text-black text-xs">ALI: 08971799215</p>
                  </div>
                </div>
                <div className="pt-1">
                  <button 
                    onClick={() => openWhatsApp("https://chat.whatsapp.com/HpCNxJdZvtrEZNGsM4XcVL?mode=gi_t")}
                    className="text-amber-600 font-bold hover:underline text-xs text-left"
                  >
                    Join WA Group
                  </button>
                </div>
              </div>
            </div>

            {/* ABM Travel (PT AZZA BAROKAH MADINAH) */}
            <div>
              <h4 className="text-amber-600 font-bold mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4" /> ABM Travel
              </h4>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Sales Team</p>
                  <div className="space-y-1">
                    <p className="font-bold text-black text-xs">SELVI: 081320002218</p>
                    <p className="font-bold text-black text-xs">NINA: 081320002219</p>
                    <p className="font-bold text-black text-xs">DAHLIA: 081243062200</p>
                  </div>
                </div>
                <div className="pt-1">
                  <p className="text-[10px] text-gray-500 italic">Office: 021 4750 657</p>
                </div>
              </div>
            </div>

            {/* Jam Operasional */}
            <div>
              <h4 className="text-amber-600 font-bold mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Jam Operasional
              </h4>
              <div className="space-y-3 text-sm">
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Senin – Jumat</span>
                    <span className="font-bold text-black">09.00 – 17.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sabtu</span>
                    <span className="font-bold text-black">09.00 – 15.00</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 text-right font-medium uppercase tracking-widest">Waktu Indonesia Barat (WIB)</p>
                </div>
                <div className="pt-4">
                  <p className="text-xs text-gray-500 italic leading-relaxed">
                    Kami siap melayani kebutuhan perjalanan umrah Anda selama jam kerja operasional.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className={`flex gap-6 ${minimalOnMobile ? 'hidden lg:flex' : ''}`}>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-amber-500" />
              <a href="https://umaroh.com/" target="_blank" rel="noopener noreferrer" className="text-sm hover:text-amber-600 transition-colors">
                https://umaroh.com/
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-500" />
              <a href="mailto:umarohtravel@gmail.com" className="text-sm hover:text-amber-600 transition-colors">
                umarohtravel@gmail.com
              </a>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex gap-3 ${minimalOnMobile ? 'hidden lg:flex' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 cursor-pointer transition-colors">
                <span className="text-xs font-bold">IG</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 cursor-pointer transition-colors">
                <span className="text-xs font-bold">YT</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 cursor-pointer transition-colors">
                <span className="text-xs font-bold">FB</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 cursor-pointer transition-colors">
                <span className="text-xs font-bold">WA</span>
              </div>
            </div>
            <p className="text-gray-500 text-xs">
              © 2026 Umaroh All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
