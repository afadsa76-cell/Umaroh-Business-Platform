import { Flight } from '../types/airline';

const STORAGE_KEY = 'maskapai_flights';

export const getFlights = (): Flight[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return [
    {
      id: '1',
      airline: 'Garuda Indonesia',
      flightNumber: 'GA123',
      origin: 'Jakarta (CGK)',
      destination: 'Jeddah (JED)',
      departureDate: '2026-04-20',
      departureTime: '10:00',
      totalSeats: 300,
      availableSeats: 250,
      price: 15000000
    },
    {
      id: '2',
      airline: 'Saudi Arabian Airlines',
      flightNumber: 'SV816',
      origin: 'Jakarta (CGK)',
      destination: 'Madinah (MED)',
      departureDate: '2026-04-21',
      departureTime: '15:30',
      totalSeats: 350,
      availableSeats: 120,
      price: 14500000
    }
  ];
};

export const saveFlights = (flights: Flight[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flights));
};

export const addOrUpdateFlight = (newFlight: Omit<Flight, 'id' | 'availableSeats'>) => {
  const flights = getFlights();
  
  // Logic: "setiap update akan berkurang otomatis jika data yg di berikan sama"
  // We check if a flight with same airline, flightNumber, and departureDate exists
  const existingIndex = flights.findIndex(f => 
    f.airline === newFlight.airline && 
    f.flightNumber === newFlight.flightNumber && 
    f.departureDate === newFlight.departureDate
  );

  if (existingIndex !== -1) {
    const existing = flights[existingIndex];
    if (existing.availableSeats > 0) {
      // Decrement seats if data is the same
      flights[existingIndex] = {
        ...existing,
        availableSeats: existing.availableSeats - 1
      };
    }
  } else {
    // Add new flight
    const flight: Flight = {
      ...newFlight,
      id: Math.random().toString(36).substr(2, 9),
      availableSeats: newFlight.totalSeats
    };
    flights.push(flight);
  }

  saveFlights(flights);
  return flights;
};
