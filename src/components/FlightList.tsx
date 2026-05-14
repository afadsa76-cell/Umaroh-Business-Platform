import React from 'react';
import { Flight } from '../types/airline';
import { Plane, Users, Calendar, MapPin, Clock } from 'lucide-react';

interface FlightListProps {
  flights: Flight[];
}

export const FlightList: React.FC<FlightListProps> = ({ flights }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {flights.map((flight) => (
        <div key={flight.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
          <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-emerald-400" />
              <span className="font-bold tracking-tight">{flight.airline}</span>
            </div>
            <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded">{flight.flightNumber}</span>
          </div>
          
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Origin</span>
                <div className="flex items-center gap-1 text-gray-700">
                  <MapPin className="w-3 h-3" />
                  <span className="font-medium">{flight.origin}</span>
                </div>
              </div>
              <div className="h-[1px] flex-grow mx-4 bg-dashed border-t border-gray-200" />
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Destination</span>
                <div className="flex items-center gap-1 text-gray-700">
                  <span className="font-medium">{flight.destination}</span>
                  <MapPin className="w-3 h-3" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{flight.departureDate}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 justify-end">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{flight.departureTime}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-50 flex justify-between items-end">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Availability</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${flight.availableSeats < 10 ? 'text-red-500' : 'text-slate-900'}`}>
                    {flight.availableSeats}
                  </span>
                  <span className="text-gray-400 text-sm">/ {flight.totalSeats} seats</span>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">Price</span>
                <span className="text-lg font-bold text-emerald-600">
                  Rp {flight.price.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {flight.availableSeats === 0 && (
              <div className="mt-4 bg-red-50 text-red-600 text-center py-2 rounded-lg text-sm font-bold uppercase tracking-widest">
                Sold Out
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
