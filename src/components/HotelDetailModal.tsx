import React, { useState } from 'react';
import { Hotel, PriceEntry } from '../data/hotels';
import { X, Calendar, Users, Calculator, Moon, Star, MapPin } from 'lucide-react';

interface HotelDetailModalProps {
  hotel: Hotel;
  onClose: () => void;
}

export const HotelDetailModal: React.FC<HotelDetailModalProps> = ({ hotel, onClose }) => {
  const [nights, setNights] = useState(1);
  const EXCHANGE_RATE = 4700;

  const getPaxCount = (roomType: string): number => {
    const lower = roomType.toLowerCase();
    if (lower.includes('single')) return 1;
    if (lower.includes('double')) return 2;
    if (lower.includes('triple')) return 3;
    if (lower.includes('quad')) return 4;
    if (lower.includes('quint')) return 5;
    
    // Extract number from "4pax", "10 pax", etc.
    const match = lower.match(/(\d+)\s*pax/);
    if (match) return parseInt(match[1], 10);
    
    return 1; // Default fallback
  };

  const formatCurrency = (amount: number, currency: string = 'SAR') => {
    return new Intl.NumberFormat('en-SA', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + (currency ? ` ${currency}` : '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-emerald-900 text-white p-6 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{hotel.name}</h2>
              {hotel.stars && (
                <div className="flex items-center bg-emerald-800/50 px-2 py-1 rounded-lg border border-emerald-700/50">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 mr-1" />
                  <span className="text-sm font-bold">{hotel.stars}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-emerald-200 mt-2">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{hotel.city}</span>
              </div>
              <span className="text-emerald-400">•</span>
              <span className="bg-emerald-800/50 px-2 py-0.5 rounded text-sm border border-emerald-700">
                {hotel.vendor}
              </span>
              <span className="text-emerald-400">•</span>
              <span>{hotel.mealPlan} Meal Plan</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-emerald-200 hover:text-white hover:bg-emerald-800 p-2 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Calculator Controls */}
        <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg shadow-sm border border-emerald-200 flex items-center gap-2">
              <Moon className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Nights:</span>
              <input 
                type="number" 
                min="1" 
                max="30"
                value={nights}
                onChange={(e) => setNights(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 p-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-800"
              />
            </div>
            <div className="text-xs text-emerald-700 font-medium">
              Rate: 1 SAR = {formatCurrency(EXCHANGE_RATE, 'IDR')}
            </div>
          </div>
          <div className="text-xs text-emerald-600 italic">
            * Showing price per pax for {nights} night{nights > 1 ? 's' : ''}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="space-y-8">
            {hotel.seasons.map((season, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-gray-100/50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    {season.range}
                  </span>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-1 gap-3">
                    {season.prices.map((price, pIdx) => {
                      const pax = getPaxCount(price.roomType);
                      const basePrice = price.price;
                      const pricePerPaxPerNight = basePrice / pax;
                      const totalIdrPerPax = pricePerPaxPerNight * EXCHANGE_RATE * nights;
                      
                      return (
                        <div key={pIdx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-emerald-300 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 text-emerald-800 font-bold p-2 rounded w-12 text-center text-sm">
                              {pax} Pax
                            </div>
                            <div>
                              <div className="font-bold text-gray-900">{price.roomType}</div>
                              <div className="text-xs text-gray-500">
                                Room Price: {formatCurrency(Math.round(basePrice))} SAR / night
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50">
                            <div className="text-xs text-gray-500 mb-1">Total Price per Pax (IDR)</div>
                            <div className="text-lg font-bold text-emerald-700 flex items-center justify-end gap-1">
                              <span className="text-xs text-emerald-500">Rp</span>
                              {formatCurrency(Math.round(totalIdrPerPax), '')}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              ({formatCurrency(Math.round(pricePerPaxPerNight))} SAR/pax × {nights} nights × {EXCHANGE_RATE})
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-500 shrink-0">
          * Calculated prices are estimates in Indonesian Rupiah (IDR).
        </div>
      </div>
    </div>
  );
};
