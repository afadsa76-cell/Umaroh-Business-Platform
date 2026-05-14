export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  totalSeats: number;
  availableSeats: number;
  price: number;
}

export interface Booking {
  id: string;
  flightId: string;
  passengerName: string;
  bookingDate: string;
}
