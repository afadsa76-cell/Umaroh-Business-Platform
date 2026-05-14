import React from 'react';
import { Hotel } from '../data/hotels';
import { Calendar, Users, Utensils, Building, Star, MapPin } from 'lucide-react';

interface HotelCardProps {
  hotel: Hotel;
  onClick: (hotel: Hotel) => void;
}

export const HotelCard: React.FC<HotelCardProps> = ({ hotel, onClick }) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
      <div className="bg-black p-4 text-white">
        <div className="flex justify-between items-start gap-2">
          <button 
            onClick={() => onClick(hotel)}
            className="text-xl font-bold truncate hover:text-amber-400 text-left w-full focus:outline-none transition-colors"
          >
            {hotel.name}
          </button>
          {hotel.stars && (
            <div className="flex items-center bg-amber-500/20 px-2 py-1 rounded-lg shrink-0 border border-amber-500/30">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400 mr-1" />
              <span className="text-xs font-bold text-amber-400">{hotel.stars}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 mt-2">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <MapPin className="w-4 h-4 text-amber-500" />
            <span className="font-medium">{hotel.city}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Building className="w-4 h-4 text-amber-500" />
            <span className="font-medium">{hotel.vendor}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Utensils className="w-4 h-4 text-amber-500" />
            <span className="font-medium">{hotel.mealPlan} Meal Plan</span>
          </div>
        </div>
      </div>
      
      <div className="p-4 flex-grow overflow-auto">
        <div className="space-y-6">
          {hotel.seasons.map((season, idx) => (
            <div key={idx} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
              <div className="flex items-start gap-2 mb-3 text-gray-700">
                <Calendar className="w-4 h-4 mt-1 text-amber-600 flex-shrink-0" />
                <span className="text-sm font-semibold uppercase tracking-wide">{season.range}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {season.prices.map((price, pIdx) => (
                  <div key={pIdx} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100 hover:border-amber-200 transition-colors">
                    <div className="text-xs text-gray-500 uppercase mb-1 truncate" title={price.roomType}>
                      {price.roomType}
                    </div>
                    <div className="text-amber-700 font-bold text-lg">
                      {Math.round(price.price)}
                    </div>
                    <div className="text-[10px] text-gray-400">SAR</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-50 p-3 text-center text-xs text-gray-500 border-t border-gray-100">
        Prices in Saudi Riyals (SAR) • Subject to availability
      </div>
    </div>
  );
};
