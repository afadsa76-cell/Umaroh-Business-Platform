export interface TransportRoute {
  route: string;
  price: number;
}

export interface TransportVehicle {
  id: string;
  name: string;
  namaVendor: string;
  routes: TransportRoute[];
}

export const transportData: TransportVehicle[] = [
  {
    id: 'bus',
    name: 'BUS',
    namaVendor: 'TFA',
    routes: [
      { route: 'Airport Jeddah - Hotel Jeddah', price: 700 },
      { route: 'Airport Jeddah - Hotel Madinah', price: 1450 },
      { route: 'Airport Jeddah - Hotel Makkah', price: 750 },
      { route: 'Airport Madinah - Hotel Madinah', price: 700 },
      { route: 'Sta. Haramain - Hotel', price: 700 },
      { route: 'Jeddah - Makkah', price: 750 },
      { route: 'Makkah/Jeddah - Madinah', price: 1450 },
      { route: 'City Tour Makkah/Madinah', price: 750 },
      { route: 'Makkah - City Tour Thaif (6 hours)', price: 1450 },
      { route: 'Makkah - City Tour Jeddah (6 hours)', price: 1450 },
      { route: 'Full Trip (Jed - Mak - CT Mak - CT Mad - Mad)', price: 4800 },
      { route: 'Full Trip (Jed - Mak - CT Mak - CT Mad - Jed)', price: 4800 },
    ]
  },
  {
    id: 'hiace',
    name: 'HIACE',
    namaVendor: 'TFA',
    routes: [
      { route: 'Airport Jeddah - Hotel Jeddah', price: 500 },
      { route: 'Airport Jeddah - Hotel Makkah', price: 550 },
      { route: 'Airport Jeddah - Hotel Madinah', price: 950 },
      { route: 'Airport Madinah - Hotel Madinah', price: 500 },
      { route: 'Sta. Haramain Mak/Mad - Hotel Mak/Mad', price: 500 },
      { route: 'Jeddah - Makkah', price: 550 },
      { route: 'Hotel Makkah - Hotel Madinah', price: 950 },
      { route: 'Hotel Jeddah - Hotel Makkah', price: 550 },
      { route: 'Hotel Jeddah - Hotel Madinah', price: 950 },
      { route: 'Jeddah/Makkah - Madinah', price: 950 },
      { route: 'City Tour Makkah/Madinah', price: 550 },
      { route: 'Makkah - City Tour Thaif (6 hours)', price: 1050 },
      { route: 'Makkah - City Tour Jeddah (6 hours)', price: 1050 },
      { route: 'Full Trip (Jed - Mak - CT Mak - CT Mad - Airport Mad)', price: 3300 },
      { route: 'Full Trip (Jed - Mak - CT Mak - CT Mad - Airport Jed)', price: 3750 },
    ]
  },
  {
    id: 'staria',
    name: 'STARIA',
    namaVendor: 'TFA',
    routes: [
      { route: 'Airport Jeddah - Hotel Jeddah', price: 450 },
      { route: 'Airport Jeddah - Hotel Makkah', price: 550 },
      { route: 'Airport Jeddah - Hotel Madinah', price: 950 },
      { route: 'Airport Madinah - Hotel Madinah', price: 450 },
      { route: 'Sta. Haramain Madinah/Makkah - Hotel Madinah/Makkah', price: 450 },
      { route: 'Jeddah - Makkah', price: 550 },
      { route: 'Jeddah/Makkah - Madinah', price: 950 },
      { route: 'City Tour Makkah/Madinah', price: 650 },
      { route: 'Makkah - City Tour Thaif (6 hours)', price: 1000 },
      { route: 'Makkah - City Tour Jeddah (6 hours)', price: 1000 },
      { route: 'Hotel Makkah - Hotel Madinah', price: 950 },
      { route: 'Full Trip (Jed - Mak - CT Mak - CT Mad - Airport Mad)', price: 3450 },
      { route: 'Full Trip (Jed - Mak - CT Mak - CT Mad - Airport Jed)', price: 3900 },
      { route: 'Madinah - Al Ula (One day trip)', price: 2350 },
    ]
  },
  {
    id: 'gmc',
    name: 'GMC',
    namaVendor: 'TFA',
    routes: [
      { route: 'Airport Jeddah - Hotel Jeddah', price: 500 },
      { route: 'Airport Jeddah - Hotel Makkah', price: 600 },
      { route: 'Airport Jeddah - Hotel Madinah', price: 1130 },
      { route: 'Airport Madinah - Hotel Madinah', price: 500 },
      { route: 'Sta. Haramain Mak/Mad - Hotel Mak/Mad', price: 500 },
      { route: 'Jeddah - Makkah', price: 600 },
      { route: 'Jeddah/Makkah - Madinah', price: 1130 },
      { route: 'Hotel Jeddah - Hotel Makkah', price: 600 },
      { route: 'Hotel Jeddah - Hotel Madinah', price: 1130 },
      { route: 'Madinah - Al Ula (One day trip)', price: 1950 },
      { route: 'Madinah - Al Ula (2 days trip)', price: 3650 },
      { route: 'City Tour Makkah/Madinah', price: 600 },
      { route: 'Makkah - City Tour Thaif (6 hours)', price: 1050 },
      { route: 'Makkah - City Tour Jeddah (6 hours)', price: 1050 },
      { route: 'Full Trip (Jed - Mak - CT Mak - CT Mad - Airport Mad)', price: 3650 },
      { route: 'Full Trip (Jed - Mak - CT Mak - CT Mad - Airport Jed)', price: 4250 },
    ]
  },
  {
    id: 'kang-asep',
    name: 'KANG ASEP',
    namaVendor: 'Kang Asep',
    routes: [
      { route: 'Full Trip (Jed - Mak - CT Mak - CT Mad - Airport Mad)', price: 2500 },
    ]
  },
  {
    id: 'dharmawisata',
    name: 'DHARMAWISATA',
    namaVendor: 'Dharmawisata',
    routes: [
      { route: 'Full Trip (Jed - Mak - CT Mak - CT Mad - Airport Mad)', price: 2600 },
    ]
  }
];
