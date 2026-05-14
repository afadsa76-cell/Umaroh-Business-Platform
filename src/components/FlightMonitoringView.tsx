import React, { useState, useEffect } from 'react';
import { Plane, Calendar, Users2, Search, Filter, ArrowRight, Clock, MapPin, CheckCircle2, AlertCircle, Activity } from 'lucide-react';

interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  departure: string;
  returnDate: string;
  route: string;
  totalSeats: number;
  bookedSeats: number;
  status: 'On Time' | 'Delayed' | 'Scheduled';
  type: 'Direct' | 'Transit';
  lastUpdate: string;
}

export const FlightMonitoringView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [flights, setFlights] = useState<Flight[]>([
    { id: '1', airline: 'Saudia Airlines', flightNumber: 'SV-817', departure: '12 Apr 2026', returnDate: '26 Apr 2026', route: 'CGK - JED', totalSeats: 50, bookedSeats: 35, status: 'Scheduled', type: 'Direct', lastUpdate: 'Just now' },
    { id: '2', airline: 'Garuda Indonesia', flightNumber: 'GA-980', departure: '05 May 2026', returnDate: '19 May 2026', route: 'CGK - MED', totalSeats: 45, bookedSeats: 13, status: 'Scheduled', type: 'Direct', lastUpdate: '1 min ago' },
    { id: '3', airline: 'Qatar Airways', flightNumber: 'QR-957', departure: '20 May 2026', returnDate: '03 Jun 2026', route: 'CGK - DOH - JED', totalSeats: 30, bookedSeats: 25, status: 'Scheduled', type: 'Transit', lastUpdate: '2 mins ago' },
    { id: '4', airline: 'Lion Air', flightNumber: 'JT-110', departure: '15 Jun 2026', returnDate: '29 Jun 2026', route: 'SUB - JED', totalSeats: 45, bookedSeats: 5, status: 'Scheduled', type: 'Direct', lastUpdate: '5 mins ago' },
    { id: '5', airline: 'Emirates', flightNumber: 'EK-357', departure: '10 Jul 2026', returnDate: '24 Jul 2026', route: 'CGK - DXB - MED', totalSeats: 40, bookedSeats: 10, status: 'Scheduled', type: 'Transit', lastUpdate: '10 mins ago' },
  ]);

  // Real-time simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setFlights(currentFlights => {
        return currentFlights.map(flight => {
          // 20% chance to update a flight
          if (Math.random() > 0.8) {
            const seatChange = Math.random() > 0.7 ? 1 : 0; // 30% chance to add a seat
            const newBooked = Math.min(flight.totalSeats, flight.bookedSeats + seatChange);
            
            // Randomly change status occasionally
            let newStatus = flight.status;
            if (Math.random() > 0.95) {
              const statuses: Flight['status'][] = ['On Time', 'Delayed', 'Scheduled'];
              newStatus = statuses[Math.floor(Math.random() * statuses.length)];
            }

            return {
              ...flight,
              bookedSeats: newBooked,
              status: newStatus,
              lastUpdate: 'Just now'
            };
          }
          return flight;
        });
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const filteredFlights = flights.filter(f => 
    f.airline.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.flightNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.route.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'On Time': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Delayed': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Plane className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Monitoring Penerbangan</h1>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-100">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Live</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">Pantau ketersediaan kursi dan status penerbangan real-time</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari maskapai, rute..."
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredFlights.map((flight) => {
          const availableSeats = flight.totalSeats - flight.bookedSeats;
          const occupancyRate = (flight.bookedSeats / flight.totalSeats) * 100;
          
          return (
            <div key={flight.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Airline & Flight Info */}
                  <div className="flex items-center gap-4 min-w-[250px]">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
                      <Plane className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{flight.airline}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {flight.flightNumber}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                          {flight.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Route & Schedule */}
                  <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Route</p>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900">{flight.route.split(' - ')[0]}</span>
                          <ArrowRight className="w-4 h-4 text-gray-300" />
                          <span className="font-bold text-gray-900">{flight.route.split(' - ').slice(-1)[0]}</span>
                        </div>
                      </div>
                      <div className="h-8 w-px bg-gray-100 hidden md:block" />
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Departure</p>
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {flight.departure}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Return</p>
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {flight.returnDate}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Occupancy & Status */}
                    <div className="flex items-center justify-between md:justify-end gap-8">
                      <div className="text-right min-w-[150px]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500">Seat Occupancy</span>
                          <span className={`text-xs font-bold ${availableSeats < 10 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {flight.bookedSeats} / {flight.totalSeats}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${availableSeats < 10 ? 'bg-rose-500' : 'bg-blue-500'}`}
                            style={{ width: `${occupancyRate}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {availableSeats} seats available
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full border text-[10px] font-bold ${getStatusStyle(flight.status)}`}>
                          {flight.status}
                        </span>
                        <button className="text-xs text-blue-600 font-bold hover:underline">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer Info */}
              <div className="bg-gray-50/50 px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Confirmed Group
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <Clock className="w-3 h-3 text-blue-500" />
                    Last updated: {flight.lastUpdate}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-500">
                        U{i}
                      </div>
                    ))}
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-600">
                      +12
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400">Current Passengers</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Section */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h4 className="font-bold text-emerald-900">High Demand</h4>
          </div>
          <p className="text-sm text-emerald-700">Qatar Airways (QR-957) is almost full. Consider opening a new block for May 2026.</p>
        </div>
        
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h4 className="font-bold text-amber-900">Upcoming Deadlines</h4>
          </div>
          <p className="text-sm text-amber-700">Saudia Airlines (SV-817) manifest must be submitted by March 25th.</p>
        </div>

        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
          <div className="flex items-center gap-3 mb-2">
            <Users2 className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-blue-900">Total Capacity</h4>
          </div>
          <p className="text-sm text-blue-700">Currently managing 210 total seats across 5 active flight blocks.</p>
        </div>
      </div>
    </div>
  );
};
