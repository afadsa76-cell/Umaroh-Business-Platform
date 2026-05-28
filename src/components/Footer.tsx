import React from 'react';
import { Mail, Globe } from 'lucide-react';
import { logoBase64 } from '../utils/logoBase64';
import { AdBanner } from './AdBanner';

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

        {/* Official Team & Contact Info */}
        <div className={`border-t border-gray-200 py-12 mb-8 ${minimalOnMobile ? 'hidden lg:block' : ''}`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact Card (From Image 2) */}
            <div className="lg:col-span-2">
              <div className="bg-amber-400 rounded-3xl p-8 relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-300 rounded-full -mr-16 -mt-16 opacity-50" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500 rounded-full -ml-12 -mb-12 opacity-30" />
                
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-black text-center mb-10 pt-4">
                    Informasi Tim &<br />Kontak Resmi Umaroh
                  </h3>
                  
                  <div className="space-y-6 max-w-xl mx-auto">
                    {/* Team Kemitraan */}
                    <div className="bg-white rounded-2xl p-2 shadow-sm flex flex-col md:flex-row items-stretch md:items-center overflow-hidden">
                      <div className="bg-amber-500 text-black font-bold px-6 py-3 flex items-center justify-center text-sm">
                        Team (Kemitraan)
                      </div>
                      <div className="flex-grow bg-black text-white px-6 py-3 flex items-center justify-center font-bold tracking-wide">
                        +62 811-8880-6909
                      </div>
                    </div>
                    <div className="px-6 mb-4">
                      <ul className="text-black text-sm space-y-1 list-disc list-inside font-medium opacity-80">
                        <li>Ilham Fichri Abdullah</li>
                        <li>Dayat</li>
                        <li>Rehan</li>
                      </ul>
                    </div>
                    
                    {/* Team Paket Umrah */}
                    <div className="bg-white rounded-2xl p-2 shadow-sm flex flex-col md:flex-row items-stretch md:items-center overflow-hidden">
                      <div className="bg-amber-500 text-black font-bold px-6 py-3 flex items-center justify-center text-sm">
                        Team (Paket umrah)
                      </div>
                      <div className="flex-grow bg-black text-white px-6 py-3 flex items-center justify-center font-bold tracking-wide">
                        +62 838-4497-4952
                      </div>
                    </div>
                    <div className="px-6">
                      <ul className="text-black text-sm space-y-1 list-disc list-inside font-medium opacity-80">
                        <li>Seruni</li>
                        <li>Rinaldy</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Jam Operasional */}
            <div>
              <h4 className="text-amber-600 font-bold mb-6 flex items-center gap-2 text-lg">
                <Globe className="w-5 h-5" /> Jam Operasional
              </h4>
              <div className="space-y-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between mb-3 pb-3 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Senin – Jumat</span>
                    <span className="font-bold text-black">09.00 – 17.00</span>
                  </div>
                  <div className="flex justify-between mb-3">
                    <span className="text-gray-500 font-medium">Sabtu</span>
                    <span className="font-bold text-black">09.00 – 15.00</span>
                  </div>
                  <div className="mt-4 pt-4 bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.2em]">
                      Waktu Indonesia Barat (WIB)
                    </p>
                  </div>
                </div>
                <div className="pt-4">
                  <p className="text-sm text-gray-500 italic leading-relaxed text-center px-4">
                    "Kami siap melayani kebutuhan perjalanan umrah Anda selama jam kerja operasional."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 mb-4">
          <AdBanner adSlot="footer-banner" />
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
