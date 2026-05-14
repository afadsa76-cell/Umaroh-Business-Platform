import React, { useState } from 'react';
import { Flight } from '../types/airline';
import { PlusCircle, Info } from 'lucide-react';

interface FlightFormProps {
  onAddOrUpdate: (flight: Omit<Flight, 'id' | 'availableSeats'>) => void;
}

export const FlightForm: React.FC<FlightFormProps> = ({ onAddOrUpdate }) => {
  const [formData, setFormData] = useState({
    airline: '',
    flightNumber: '',
    origin: '',
    destination: '',
    departureDate: '',
    departureTime: '',
    totalSeats: 100,
    price: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddOrUpdate({
      ...formData,
      totalSeats: Number(formData.totalSeats),
      price: Number(formData.price)
    });
    // Reset form partially or fully? 
    // Maybe keep it for quick "updates" as requested
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-2xl mx-auto my-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-emerald-50 rounded-2xl">
          <PlusCircle className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Input Data Penerbangan</h2>
          <p className="text-sm text-gray-500">Tambahkan jadwal baru atau kurangi kursi otomatis jika data sama.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Maskapai</label>
            <input
              required
              name="airline"
              value={formData.airline}
              onChange={handleChange}
              placeholder="Contoh: Garuda Indonesia"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Nomor Penerbangan</label>
            <input
              required
              name="flightNumber"
              value={formData.flightNumber}
              onChange={handleChange}
              placeholder="Contoh: GA123"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Asal</label>
            <input
              required
              name="origin"
              value={formData.origin}
              onChange={handleChange}
              placeholder="Contoh: Jakarta (CGK)"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Tujuan</label>
            <input
              required
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              placeholder="Contoh: Jeddah (JED)"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Tanggal Keberangkatan</label>
            <input
              required
              type="date"
              name="departureDate"
              value={formData.departureDate}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Waktu</label>
            <input
              required
              type="time"
              name="departureTime"
              value={formData.departureTime}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Total Kursi</label>
            <input
              required
              type="number"
              name="totalSeats"
              value={formData.totalSeats}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Harga (Rp)</label>
            <input
              required
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Catatan:</strong> Jika Anda memasukkan data yang sama (Maskapai, No. Penerbangan, & Tanggal), sistem akan otomatis mengurangi ketersediaan kursi sebanyak 1.
          </p>
        </div>

        <button
          type="submit"
          className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
        >
          Simpan Data / Update Kursi
        </button>
      </form>
    </div>
  );
};
