export type RoomType = 'Single' | 'Double' | 'Triple' | 'Quad' | 'Quint' | 'Jr Suite (4pax)' | 'Jr Suite (2pax)' | 'Family Suite (4pax)' | '3 Bed Suite (6pax)' | 'Two Bedroom (10 Pax)' | 'Four Bedroom (15 Pax)';

export interface PriceEntry {
  roomType: RoomType | string;
  price: number;
}

export interface Season {
  range: string;
  prices: PriceEntry[];
}

export interface Hotel {
  id: string;
  name: string;
  city: 'Makkah' | 'Madinah';
  vendor: string;
  mealPlan: 'FB' | 'HB' | 'RO' | 'BB';
  stars?: number;
  bintang?: number;
  seasons: Season[];
}

export const newRowaHotels: Hotel[] = [
  {
    "id": "rayhaan-al-marwa-rayhaan-rowa",
    "name": "Rayhaan Al Marwa Rayhaan",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 24/07/2026",
        "prices": [
          { "roomType": "Double", "price": 1150 },
          { "roomType": "Triple", "price": 1420 },
          { "roomType": "Quad", "price": 1690 }
        ]
      },
      {
        "range": "25/07/2026 TO 03/10/2026",
        "prices": [
          { "roomType": "Double", "price": 1200 },
          { "roomType": "Triple", "price": 1470 },
          { "roomType": "Quad", "price": 1740 }
        ]
      },
      {
        "range": "04/10/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 1270 },
          { "roomType": "Triple", "price": 1540 },
          { "roomType": "Quad", "price": 1810 }
        ]
      },
      {
        "range": "17/12/2026 TO 15/01/2027",
        "prices": [
          { "roomType": "Double", "price": 1970 },
          { "roomType": "Triple", "price": 2270 },
          { "roomType": "Quad", "price": 2570 }
        ]
      }
    ]
  },
  {
    "id": "movenpick-hotel-rowa",
    "name": "Mövenpick Hotel",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 24/07/2026",
        "prices": [
          { "roomType": "Double", "price": 1000 },
          { "roomType": "Triple", "price": 1220 },
          { "roomType": "Quad", "price": 1440 },
          { "roomType": "Suite 5 Pax", "price": 1550 },
          { "roomType": "Suite 6 Pax", "price": 1775 }
        ]
      },
      {
        "range": "25/07/2026 TO 13/08/2026",
        "prices": [
          { "roomType": "Double", "price": 1050 },
          { "roomType": "Triple", "price": 1275 },
          { "roomType": "Quad", "price": 1450 },
          { "roomType": "Suite 5 Pax", "price": 1700 },
          { "roomType": "Suite 6 Pax", "price": 1920 }
        ]
      },
      {
        "range": "14/08/2026 TO 07/10/2026",
        "prices": [
          { "roomType": "Double", "price": 1100 },
          { "roomType": "Triple", "price": 1320 },
          { "roomType": "Quad", "price": 1520 },
          { "roomType": "Suite 5 Pax", "price": 1740 },
          { "roomType": "Suite 6 Pax", "price": 1960 }
        ]
      },
      {
        "range": "08/10/2026 TO 19/12/2026",
        "prices": [
          { "roomType": "Double", "price": 1225 },
          { "roomType": "Triple", "price": 1445 },
          { "roomType": "Quad", "price": 1665 },
          { "roomType": "Suite 5 Pax", "price": 1800 },
          { "roomType": "Suite 6 Pax", "price": 2020 }
        ]
      },
      {
        "range": "20/12/2026 TO 09/01/2027",
        "prices": [
          { "roomType": "Double", "price": 1675 },
          { "roomType": "Triple", "price": 1895 },
          { "roomType": "Quad", "price": 2115 },
          { "roomType": "Suite 5 Pax", "price": 2300 },
          { "roomType": "Suite 6 Pax", "price": 2525 }
        ]
      }
    ]
  },
  {
    "id": "al-safwa-tower-1-rowa",
    "name": "Al Safwa Tower 1",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 20/07/2026",
        "prices": [
          { "roomType": "Double", "price": 900 },
          { "roomType": "Triple", "price": 1100 },
          { "roomType": "Quad", "price": 1250 }
        ]
      },
      {
        "range": "21/07/2026 TO 31/07/2026",
        "prices": [
          { "roomType": "Double", "price": 1100 },
          { "roomType": "Triple", "price": 1250 },
          { "roomType": "Quad", "price": 1350 }
        ]
      },
      {
        "range": "01/08/2026 TO 07/10/2026",
        "prices": [
          { "roomType": "Double", "price": 1100 },
          { "roomType": "Triple", "price": 1275 },
          { "roomType": "Quad", "price": 1375 }
        ]
      },
      {
        "range": "08/10/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 1175 },
          { "roomType": "Triple", "price": 1375 },
          { "roomType": "Quad", "price": 1525 }
        ]
      },
      {
        "range": "17/12/2026 TO 15/01/2027",
        "prices": [
          { "roomType": "Double", "price": 1675 },
          { "roomType": "Triple", "price": 1900 },
          { "roomType": "Quad", "price": 2120 }
        ]
      }
    ]
  },
  {
    "id": "safwa-tower-3-rowa",
    "name": "Safwa Tower 3",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 20/07/2026",
        "prices": [
          { "roomType": "Double", "price": 850 },
          { "roomType": "Triple", "price": 1050 },
          { "roomType": "Quad", "price": 1250 }
        ]
      },
      {
        "range": "21/07/2026 TO 31/08/2026",
        "prices": [
          { "roomType": "Double", "price": 900 },
          { "roomType": "Triple", "price": 1100 },
          { "roomType": "Quad", "price": 1300 }
        ]
      },
      {
        "range": "01/09/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 1100 },
          { "roomType": "Triple", "price": 1320 },
          { "roomType": "Quad", "price": 1540 }
        ]
      },
      {
        "range": "17/12/2026 TO 15/01/2027",
        "prices": [
          { "roomType": "Double", "price": 1750 },
          { "roomType": "Triple", "price": 1970 },
          { "roomType": "Quad", "price": 2190 }
        ]
      }
    ]
  },
  {
    "id": "pullman-zamzam-rowa",
    "name": "Pullman Zamzam",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 24/07/2026",
        "prices": [
          { "roomType": "Double", "price": 1000 },
          { "roomType": "Triple", "price": 1220 },
          { "roomType": "Quad", "price": 1440 },
          { "roomType": "Suite 6 Pax", "price": 2000 },
          { "roomType": "Suite 7 Pax", "price": 2200 }
        ]
      },
      {
        "range": "25/07/2026 TO 13/08/2026",
        "prices": [
          { "roomType": "Double", "price": 1050 },
          { "roomType": "Triple", "price": 1275 },
          { "roomType": "Quad", "price": 1500 },
          { "roomType": "Suite 6 Pax", "price": 2200 },
          { "roomType": "Suite 7 Pax", "price": 2425 }
        ]
      },
      {
        "range": "14/08/2026 TO 07/10/2026",
        "prices": [
          { "roomType": "Double", "price": 1150 },
          { "roomType": "Triple", "price": 1375 },
          { "roomType": "Quad", "price": 1600 },
          { "roomType": "Suite 6 Pax", "price": 2350 },
          { "roomType": "Suite 7 Pax", "price": 2575 }
        ]
      },
      {
        "range": "08/10/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 1225 },
          { "roomType": "Triple", "price": 1450 },
          { "roomType": "Quad", "price": 1675 },
          { "roomType": "Suite 6 Pax", "price": 2400 },
          { "roomType": "Suite 7 Pax", "price": 2625 }
        ]
      },
      {
        "range": "17/12/2026 TO 09/01/2027",
        "prices": [
          { "roomType": "Double", "price": 1675 },
          { "roomType": "Triple", "price": 1900 },
          { "roomType": "Quad", "price": 2125 },
          { "roomType": "Suite 6 Pax", "price": 2900 },
          { "roomType": "Suite 7 Pax", "price": 3125 }
        ]
      }
    ]
  },
  {
    "id": "fairmont-rowa",
    "name": "Fairmont",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 20/07/2026",
        "prices": [
          { "roomType": "Double", "price": 1350 },
          { "roomType": "Triple", "price": 1680 },
          { "roomType": "Quad", "price": 2010 }
        ]
      },
      {
        "range": "21/07/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 1470 },
          { "roomType": "Triple", "price": 1800 },
          { "roomType": "Quad", "price": 2130 }
        ]
      },
      {
        "range": "17/12/2026 TO 15/01/2027",
        "prices": [
          { "roomType": "Double", "price": 2200 },
          { "roomType": "Triple", "price": 2530 },
          { "roomType": "Quad", "price": 2860 }
        ]
      }
    ]
  },
  {
    "id": "swissotel-rowa",
    "name": "Swissôtel",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 20/07/2026",
        "prices": [
          { "roomType": "Double", "price": 1100 },
          { "roomType": "Triple", "price": 1380 },
          { "roomType": "Quad", "price": 1660 }
        ]
      },
      {
        "range": "21/07/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 1300 },
          { "roomType": "Triple", "price": 1580 },
          { "roomType": "Quad", "price": 1860 }
        ]
      }
    ]
  },
  {
    "id": "swiss-al-maqam-rowa",
    "name": "Swiss Al Maqam",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 20/07/2026",
        "prices": [
          { "roomType": "Double", "price": 1100 },
          { "roomType": "Triple", "price": 1380 },
          { "roomType": "Quad", "price": 1660 }
        ]
      },
      {
        "range": "21/07/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 1300 },
          { "roomType": "Triple", "price": 1580 },
          { "roomType": "Quad", "price": 1860 }
        ]
      },
      {
        "range": "17/12/2026 TO 15/01/2027",
        "prices": [
          { "roomType": "Double", "price": 1970 },
          { "roomType": "Triple", "price": 2250 },
          { "roomType": "Quad", "price": 2530 }
        ]
      }
    ]
  },
  {
    "id": "rotana-jabal-omar-rowa",
    "name": "Rotana Jabal Omar",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 20/07/2026",
        "prices": [
          { "roomType": "Double", "price": 940 },
          { "roomType": "Triple", "price": 1190 },
          { "roomType": "Quad", "price": 1390 }
        ]
      },
      {
        "range": "21/07/2026 TO 07/10/2026",
        "prices": [
          { "roomType": "Double", "price": 1040 },
          { "roomType": "Triple", "price": 1290 },
          { "roomType": "Quad", "price": 1490 }
        ]
      },
      {
        "range": "08/10/2026 TO 17/12/2026",
        "prices": [
          { "roomType": "Double", "price": 1150 },
          { "roomType": "Triple", "price": 1360 },
          { "roomType": "Quad", "price": 1570 }
        ]
      }
    ]
  },
  {
    "id": "address-jabal-omar-rowa",
    "name": "Address Jabal Omar",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 20/07/2026",
        "prices": [
          { "roomType": "Double", "price": 850 },
          { "roomType": "Triple", "price": 1090 },
          { "roomType": "Quad", "price": 1335 }
        ]
      },
      {
        "range": "21/07/2026 TO 07/10/2026",
        "prices": [
          { "roomType": "Double", "price": 1000 },
          { "roomType": "Triple", "price": 1210 },
          { "roomType": "Quad", "price": 1420 }
        ]
      },
      {
        "range": "08/10/2026 TO 17/12/2026",
        "prices": [
          { "roomType": "Double", "price": 1150 },
          { "roomType": "Triple", "price": 1360 },
          { "roomType": "Quad", "price": 1570 }
        ]
      }
    ]
  },
  {
    "id": "hilton-suites-rowa",
    "name": "Hilton Suites",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 20/07/2026",
        "prices": [
          { "roomType": "Double", "price": 950 },
          { "roomType": "Triple", "price": 1160 },
          { "roomType": "Quad", "price": 1370 }
        ]
      },
      {
        "range": "21/07/2026 TO 17/12/2026",
        "prices": [
          { "roomType": "Double", "price": 1150 },
          { "roomType": "Triple", "price": 1385 },
          { "roomType": "Quad", "price": 1620 }
        ]
      }
    ]
  },
  {
    "id": "olayan-ajyad-rowa",
    "name": "Olayan Ajyad",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "25/06/2026 TO 09/09/2026",
        "prices": [
          { "roomType": "Double", "price": 650 },
          { "roomType": "Triple", "price": 750 },
          { "roomType": "Quad", "price": 850 }
        ]
      },
      {
        "range": "10/09/2026 TO 07/10/2026",
        "prices": [
          { "roomType": "Double", "price": 700 },
          { "roomType": "Triple", "price": 800 },
          { "roomType": "Quad", "price": 900 }
        ]
      },
      {
        "range": "08/10/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 800 },
          { "roomType": "Triple", "price": 900 },
          { "roomType": "Quad", "price": 1000 }
        ]
      },
      {
        "range": "17/12/2026 TO 24/12/2026",
        "prices": [
          { "roomType": "Double", "price": 1000 },
          { "roomType": "Triple", "price": 1100 },
          { "roomType": "Quad", "price": 1200 }
        ]
      },
      {
        "range": "25/12/2026 TO 09/01/2027",
        "prices": [
          { "roomType": "Double", "price": 1100 },
          { "roomType": "Triple", "price": 1250 },
          { "roomType": "Quad", "price": 1400 }
        ]
      }
    ]
  },
  {
    "id": "prestige-rowa",
    "name": "Prestige",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "16/06/2026 TO 24/06/2026",
        "prices": [
          { "roomType": "Double", "price": 500 },
          { "roomType": "Triple", "price": 575 },
          { "roomType": "Quad", "price": 650 }
        ]
      },
      {
        "range": "25/06/2026 TO 09/09/2026",
        "prices": [
          { "roomType": "Double", "price": 630 },
          { "roomType": "Triple", "price": 730 },
          { "roomType": "Quad", "price": 830 }
        ]
      },
      {
        "range": "10/09/2026 TO 07/10/2026",
        "prices": [
          { "roomType": "Double", "price": 675 },
          { "roomType": "Triple", "price": 775 },
          { "roomType": "Quad", "price": 875 }
        ]
      },
      {
        "range": "08/10/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 725 },
          { "roomType": "Triple", "price": 825 },
          { "roomType": "Quad", "price": 925 }
        ]
      },
      {
        "range": "17/12/2026 TO 24/12/2026",
        "prices": [
          { "roomType": "Double", "price": 950 },
          { "roomType": "Triple", "price": 1050 },
          { "roomType": "Quad", "price": 1250 }
        ]
      },
      {
        "range": "25/12/2026 TO 09/01/2027",
        "prices": [
          { "roomType": "Double", "price": 1050 },
          { "roomType": "Triple", "price": 1200 },
          { "roomType": "Quad", "price": 1350 }
        ]
      }
    ]
  },
  {
    "id": "saja-makkah-rowa",
    "name": "Saja Makkah / Ex.Lemeredian Towers",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "25/06/2026 TO 31/07/2026",
        "prices": [
          { "roomType": "Double", "price": 280 },
          { "roomType": "Triple", "price": 330 },
          { "roomType": "Quad", "price": 380 }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          { "roomType": "Double", "price": 300 },
          { "roomType": "Triple", "price": 350 },
          { "roomType": "Quad", "price": 400 }
        ]
      },
      {
        "range": "01/10/2026 TO 31/10/2026",
        "prices": [
          { "roomType": "Double", "price": 380 },
          { "roomType": "Triple", "price": 430 },
          { "roomType": "Quad", "price": 480 }
        ]
      },
      {
        "range": "01/11/2026 TO 15/12/2026",
        "prices": [
          { "roomType": "Double", "price": 390 },
          { "roomType": "Triple", "price": 440 },
          { "roomType": "Quad", "price": 490 }
        ]
      }
    ]
  },
  {
    "id": "al-masa-grand-rowa",
    "name": "Al Masa Grand",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "25/06/2026 TO 09/09/2026",
        "prices": [
          { "roomType": "Double", "price": 440 },
          { "roomType": "Triple", "price": 490 },
          { "roomType": "Quad", "price": 540 }
        ]
      },
      {
        "range": "10/09/2026 TO 07/10/2026",
        "prices": [
          { "roomType": "Double", "price": 460 },
          { "roomType": "Triple", "price": 510 },
          { "roomType": "Quad", "price": 560 }
        ]
      },
      {
        "range": "08/10/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 500 },
          { "roomType": "Triple", "price": 550 },
          { "roomType": "Quad", "price": 600 }
        ]
      },
      {
        "range": "17/12/2026 TO 24/12/2026",
        "prices": [
          { "roomType": "Double", "price": 600 },
          { "roomType": "Triple", "price": 650 },
          { "roomType": "Quad", "price": 700 }
        ]
      },
      {
        "range": "25/12/2026 TO 09/01/2027",
        "prices": [
          { "roomType": "Double", "price": 750 },
          { "roomType": "Triple", "price": 800 },
          { "roomType": "Quad", "price": 850 }
        ]
      }
    ]
  },
  {
    "id": "al-masa-al-fazeen-rowa",
    "name": "Al Masa Al Fazeen",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "25/06/2026 TO 09/09/2026",
        "prices": [
          { "roomType": "Double", "price": 390 },
          { "roomType": "Triple", "price": 440 },
          { "roomType": "Quad", "price": 490 }
        ]
      },
      {
        "range": "10/09/2026 TO 07/10/2026",
        "prices": [
          { "roomType": "Double", "price": 440 },
          { "roomType": "Triple", "price": 490 },
          { "roomType": "Quad", "price": 540 }
        ]
      },
      {
        "range": "08/10/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 470 },
          { "roomType": "Triple", "price": 520 },
          { "roomType": "Quad", "price": 570 }
        ]
      },
      {
        "range": "17/12/2026 TO 24/12/2026",
        "prices": [
          { "roomType": "Double", "price": 550 },
          { "roomType": "Triple", "price": 600 },
          { "roomType": "Quad", "price": 650 }
        ]
      },
      {
        "range": "25/12/2026 TO 09/01/2027",
        "prices": [
          { "roomType": "Double", "price": 700 },
          { "roomType": "Triple", "price": 750 },
          { "roomType": "Quad", "price": 800 }
        ]
      }
    ]
  },
  {
    "id": "snood-ajyad-rowa",
    "name": "Snood Ajyad",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "25/06/2026 TO 09/09/2026",
        "prices": [
          { "roomType": "Double", "price": 420 },
          { "roomType": "Triple", "price": 465 },
          { "roomType": "Quad", "price": 510 }
        ]
      },
      {
        "range": "10/09/2026 TO 07/10/2026",
        "prices": [
          { "roomType": "Double", "price": 440 },
          { "roomType": "Triple", "price": 485 },
          { "roomType": "Quad", "price": 530 }
        ]
      },
      {
        "range": "08/10/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 480 },
          { "roomType": "Triple", "price": 525 },
          { "roomType": "Quad", "price": 570 }
        ]
      },
      {
        "range": "17/12/2026 TO 24/12/2026",
        "prices": [
          { "roomType": "Double", "price": 580 },
          { "roomType": "Triple", "price": 625 },
          { "roomType": "Quad", "price": 670 }
        ]
      },
      {
        "range": "25/12/2026 TO 09/01/2027",
        "prices": [
          { "roomType": "Double", "price": 730 },
          { "roomType": "Triple", "price": 775 },
          { "roomType": "Quad", "price": 820 }
        ]
      }
    ]
  },
  {
    "id": "nada-ajyad-rowa",
    "name": "Nada Ajyad",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "25/06/2026 TO 09/09/2026",
        "prices": [
          { "roomType": "Double", "price": 340 },
          { "roomType": "Triple", "price": 380 },
          { "roomType": "Quad", "price": 420 }
        ]
      },
      {
        "range": "10/09/2026 TO 07/10/2026",
        "prices": [
          { "roomType": "Double", "price": 380 },
          { "roomType": "Triple", "price": 420 },
          { "roomType": "Quad", "price": 460 }
        ]
      },
      {
        "range": "08/10/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 420 },
          { "roomType": "Triple", "price": 460 },
          { "roomType": "Quad", "price": 500 }
        ]
      },
      {
        "range": "17/12/2026 TO 24/12/2026",
        "prices": [
          { "roomType": "Double", "price": 480 },
          { "roomType": "Triple", "price": 520 },
          { "roomType": "Quad", "price": 560 }
        ]
      },
      {
        "range": "25/12/2026 TO 09/01/2027",
        "prices": [
          { "roomType": "Double", "price": 570 },
          { "roomType": "Triple", "price": 610 },
          { "roomType": "Quad", "price": 650 }
        ]
      }
    ]
  },
  {
    "id": "waha-ajyad-rowa",
    "name": "Waha Ajyad",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "25/06/2026 TO 09/09/2026",
        "prices": [
          { "roomType": "Double", "price": 320 },
          { "roomType": "Triple", "price": 360 },
          { "roomType": "Quad", "price": 400 }
        ]
      },
      {
        "range": "10/09/2026 TO 07/10/2026",
        "prices": [
          { "roomType": "Double", "price": 360 },
          { "roomType": "Triple", "price": 400 },
          { "roomType": "Quad", "price": 440 }
        ]
      },
      {
        "range": "08/10/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 400 },
          { "roomType": "Triple", "price": 440 },
          { "roomType": "Quad", "price": 480 }
        ]
      },
      {
        "range": "17/12/2026 TO 24/12/2026",
        "prices": [
          { "roomType": "Double", "price": 460 },
          { "roomType": "Triple", "price": 500 },
          { "roomType": "Quad", "price": 540 }
        ]
      },
      {
        "range": "25/12/2026 TO 09/01/2027",
        "prices": [
          { "roomType": "Double", "price": 550 },
          { "roomType": "Triple", "price": 590 },
          { "roomType": "Quad", "price": 630 }
        ]
      }
    ]
  },
  {
    "id": "diafat-al-rajaa-rowa",
    "name": "Diafat Al Rajaa",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "25/06/2026 TO 09/09/2026",
        "prices": [
          { "roomType": "Double", "price": 260 },
          { "roomType": "Triple", "price": 300 },
          { "roomType": "Quad", "price": 340 }
        ]
      },
      {
        "range": "10/09/2026 TO 07/10/2026",
        "prices": [
          { "roomType": "Double", "price": 280 },
          { "roomType": "Triple", "price": 320 },
          { "roomType": "Quad", "price": 360 }
        ]
      },
      {
        "range": "08/10/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 330 },
          { "roomType": "Triple", "price": 370 },
          { "roomType": "Quad", "price": 410 }
        ]
      },
      {
        "range": "17/12/2026 TO 24/12/2026",
        "prices": [
          { "roomType": "Double", "price": 370 },
          { "roomType": "Triple", "price": 410 },
          { "roomType": "Quad", "price": 450 }
        ]
      },
      {
        "range": "25/12/2026 TO 09/01/2027",
        "prices": [
          { "roomType": "Double", "price": 410 },
          { "roomType": "Triple", "price": 450 },
          { "roomType": "Quad", "price": 490 }
        ]
      }
    ]
  },
  {
    "id": "olayan-golden-rowa",
    "name": "Olayan Golden",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "25/06/2026 TO 09/09/2026",
        "prices": [
          { "roomType": "Double", "price": 260 },
          { "roomType": "Triple", "price": 300 },
          { "roomType": "Quad", "price": 340 }
        ]
      },
      {
        "range": "10/09/2026 TO 07/10/2026",
        "prices": [
          { "roomType": "Double", "price": 280 },
          { "roomType": "Triple", "price": 320 },
          { "roomType": "Quad", "price": 360 }
        ]
      },
      {
        "range": "08/10/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 340 },
          { "roomType": "Triple", "price": 380 },
          { "roomType": "Quad", "price": 420 }
        ]
      },
      {
        "range": "17/12/2026 TO 24/12/2026",
        "prices": [
          { "roomType": "Double", "price": 380 },
          { "roomType": "Triple", "price": 420 },
          { "roomType": "Quad", "price": 460 }
        ]
      },
      {
        "range": "25/12/2026 TO 09/01/2027",
        "prices": [
          { "roomType": "Double", "price": 420 },
          { "roomType": "Triple", "price": 460 },
          { "roomType": "Quad", "price": 500 }
        ]
      }
    ]
  },
  {
    "id": "badr-al-masa-rowa",
    "name": "Badr Al Masa",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "25/06/2026 TO 09/09/2026",
        "prices": [
          { "roomType": "Double", "price": 260 },
          { "roomType": "Triple", "price": 300 },
          { "roomType": "Quad", "price": 340 }
        ]
      },
      {
        "range": "10/09/2026 TO 07/10/2026",
        "prices": [
          { "roomType": "Double", "price": 280 },
          { "roomType": "Triple", "price": 320 },
          { "roomType": "Quad", "price": 360 }
        ]
      },
      {
        "range": "08/10/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 340 },
          { "roomType": "Triple", "price": 380 },
          { "roomType": "Quad", "price": 420 }
        ]
      },
      {
        "range": "17/12/2026 TO 24/12/2026",
        "prices": [
          { "roomType": "Double", "price": 380 },
          { "roomType": "Triple", "price": 420 },
          { "roomType": "Quad", "price": 460 }
        ]
      },
      {
        "range": "25/12/2026 TO 09/01/2027",
        "prices": [
          { "roomType": "Double", "price": 420 },
          { "roomType": "Triple", "price": 460 },
          { "roomType": "Quad", "price": 500 }
        ]
      }
    ]
  },
  {
    "id": "olayan-grand-rowa",
    "name": "Olayan Grand",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "25/06/2026 TO 11/09/2026",
        "prices": [
          { "roomType": "Double", "price": 160 },
          { "roomType": "Triple", "price": 200 },
          { "roomType": "Quad", "price": 240 }
        ]
      },
      {
        "range": "12/09/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 210 },
          { "roomType": "Triple", "price": 250 },
          { "roomType": "Quad", "price": 290 }
        ]
      },
      {
        "range": "17/12/2026 TO 09/01/2027",
        "prices": [
          { "roomType": "Double", "price": 270 },
          { "roomType": "Triple", "price": 310 },
          { "roomType": "Quad", "price": 350 }
        ]
      }
    ]
  },
  {
    "id": "snood-al-rayan-rowa",
    "name": "Snood Al Rayan",
    "city": "Makkah",
    "vendor": "ROWA",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "25/06/2026 TO 11/09/2026",
        "prices": [
          { "roomType": "Double", "price": 160 },
          { "roomType": "Triple", "price": 200 },
          { "roomType": "Quad", "price": 240 }
        ]
      },
      {
        "range": "12/09/2026 TO 16/12/2026",
        "prices": [
          { "roomType": "Double", "price": 210 },
          { "roomType": "Triple", "price": 250 },
          { "roomType": "Quad", "price": 290 }
        ]
      },
      {
        "range": "17/12/2026 TO 09/01/2027",
        "prices": [
          { "roomType": "Double", "price": 270 },
          { "roomType": "Triple", "price": 310 },
          { "roomType": "Quad", "price": 350 }
        ]
      }
    ]
  }
];

export const newAlharmainHotels: Hotel[] = [
  {
    "id": "fajr-al-badee-4-alharmain",
    "name": "Fajr Al Badee 4",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 01/08/2026",
        "prices": [
          { "roomType": "Double", "price": 280 },
          { "roomType": "Triple", "price": 320 },
          { "roomType": "Quad", "price": 360 }
        ]
      },
      {
        "range": "01/08/2026 TO 19/09/2026",
        "prices": [
          { "roomType": "Double", "price": 300 },
          { "roomType": "Triple", "price": 340 },
          { "roomType": "Quad", "price": 380 }
        ]
      }
    ]
  },
  {
    "id": "snood-al-rayan-alharmain",
    "name": "Snood Al Rayan",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 01/08/2026",
        "prices": [
          { "roomType": "Double", "price": 235 },
          { "roomType": "Triple", "price": 275 },
          { "roomType": "Quad", "price": 315 }
        ]
      },
      {
        "range": "01/08/2026 TO 05/10/2026",
        "prices": [
          { "roomType": "Double", "price": 265 },
          { "roomType": "Triple", "price": 305 },
          { "roomType": "Quad", "price": 345 }
        ]
      }
    ]
  },
  {
    "id": "mawteen-snood-alharmain",
    "name": "Mawteen Snood",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 01/08/2026",
        "prices": [
          { "roomType": "Double", "price": 200 },
          { "roomType": "Triple", "price": 245 },
          { "roomType": "Quad", "price": 290 }
        ]
      }
    ]
  },
  {
    "id": "winner-inn-ajyad-alharmain",
    "name": "Winner Inn Ajyad (ex Mather Al Eiman)",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 01/08/2026",
        "prices": [
          { "roomType": "Double", "price": 340 },
          { "roomType": "Triple", "price": 385 },
          { "roomType": "Quad", "price": 430 }
        ]
      },
      {
        "range": "01/08/2026 TO 10/12/2026",
        "prices": [
          { "roomType": "Double", "price": 360 },
          { "roomType": "Triple", "price": 405 },
          { "roomType": "Quad", "price": 450 }
        ]
      }
    ]
  },
  {
    "id": "grand-zowar-alharmain",
    "name": "Grand Zowar",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 31/07/2026",
        "prices": [
          { "roomType": "Double", "price": 390 },
          { "roomType": "Triple", "price": 430 },
          { "roomType": "Quad", "price": 470 }
        ]
      },
      {
        "range": "30/07/2026 TO 30/08/2026",
        "prices": [
          { "roomType": "Double", "price": 430 },
          { "roomType": "Triple", "price": 470 },
          { "roomType": "Quad", "price": 510 }
        ]
      }
    ]
  },
  {
    "id": "plaza-in-houd-alharmain",
    "name": "Plaza In Houd",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 3,
    "seasons": [
      {
        "range": "30/06/2026 TO 15/08/2026",
        "prices": [
          { "roomType": "Double", "price": 375 },
          { "roomType": "Triple", "price": 425 },
          { "roomType": "Quad", "price": 475 }
        ]
      }
    ]
  }
];

export const defaultHotels: Hotel[] = [
  {
    "id": "dar-al-eiman-al-haram-diar",
    "name": "Dar Al Eiman Al Haram",
    "city": "Madinah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 30/06/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1000
          },
          {
            "roomType": "Triple",
            "price": 1300
          },
          {
            "roomType": "Quad",
            "price": 1600
          }
        ]
      },
      {
        "range": "30/06/2026 TO 15/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 800
          },
          {
            "roomType": "Triple",
            "price": 925
          },
          {
            "roomType": "Quad",
            "price": 1050
          }
        ]
      },
      {
        "range": "15/08/2026 TO 11/11/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 900
          },
          {
            "roomType": "Triple",
            "price": 1025
          },
          {
            "roomType": "Quad",
            "price": 1150
          }
        ]
      },
      {
        "range": "11/11/2026 TO 10/12/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1100
          },
          {
            "roomType": "Triple",
            "price": 1225
          },
          {
            "roomType": "Quad",
            "price": 1350
          }
        ]
      }
    ]
  },
  {
    "id": "millennium-al-aqeeq-diar",
    "name": "Millennium Al Aqeeq",
    "city": "Madinah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "30/06/2026 TO 15/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 750
          },
          {
            "roomType": "Triple",
            "price": 875
          },
          {
            "roomType": "Quad",
            "price": 1000
          }
        ]
      },
      {
        "range": "15/08/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 800
          },
          {
            "roomType": "Triple",
            "price": 925
          },
          {
            "roomType": "Quad",
            "price": 1050
          }
        ]
      }
    ]
  },
  {
    "id": "al-harithia-diar",
    "name": "Al Harithia",
    "city": "Madinah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 750
          },
          {
            "roomType": "Triple",
            "price": 900
          },
          {
            "roomType": "Quad",
            "price": 1050
          }
        ]
      }
    ]
  },
  {
    "id": "taiba-front-diar",
    "name": "Taiba Front",
    "city": "Madinah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "30/06/2026 TO 15/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 700
          },
          {
            "roomType": "Triple",
            "price": 825
          },
          {
            "roomType": "Quad",
            "price": 950
          }
        ]
      },
      {
        "range": "15/08/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 750
          },
          {
            "roomType": "Triple",
            "price": 875
          },
          {
            "roomType": "Quad",
            "price": 1000
          }
        ]
      }
    ]
  },
  {
    "id": "shaza-regency-diar",
    "name": "Shaza Regency",
    "city": "Madinah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 500
          },
          {
            "roomType": "Triple",
            "price": 580
          },
          {
            "roomType": "Quad",
            "price": 660
          }
        ]
      }
    ]
  },
  {
    "id": "ruve-diar",
    "name": "Ruve",
    "city": "Madinah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 15/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 700
          },
          {
            "roomType": "Triple",
            "price": 825
          },
          {
            "roomType": "Quad",
            "price": 950
          }
        ]
      },
      {
        "range": "15/08/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 725
          },
          {
            "roomType": "Triple",
            "price": 850
          },
          {
            "roomType": "Quad",
            "price": 975
          }
        ]
      }
    ]
  },
  {
    "id": "grand-plaza-al-madinah-diar",
    "name": "Grand Plaza Al Madinah",
    "city": "Madinah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 480
          },
          {
            "roomType": "Triple",
            "price": 550
          },
          {
            "roomType": "Quad",
            "price": 620
          }
        ]
      }
    ]
  },
  {
    "id": "winner-inn-alkhair-diar",
    "name": "Winner Inn Alkhair",
    "city": "Madinah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 31/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 480
          },
          {
            "roomType": "Triple",
            "price": 530
          },
          {
            "roomType": "Quad",
            "price": 580
          }
        ]
      },
      {
        "range": "31/08/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 500
          },
          {
            "roomType": "Triple",
            "price": 550
          },
          {
            "roomType": "Quad",
            "price": 600
          }
        ]
      }
    ]
  },
  {
    "id": "al-ansar-golden-tulip-diar",
    "name": "Al Ansar Golden Tulip",
    "city": "Madinah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "15/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 490
          },
          {
            "roomType": "Triple",
            "price": 535
          },
          {
            "roomType": "Quad",
            "price": 580
          }
        ]
      },
      {
        "range": "01/08/2026 TO 01/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 510
          },
          {
            "roomType": "Triple",
            "price": 555
          },
          {
            "roomType": "Quad",
            "price": 600
          }
        ]
      },
      {
        "range": "01/09/2026 TO 01/10/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 530
          },
          {
            "roomType": "Triple",
            "price": 575
          },
          {
            "roomType": "Quad",
            "price": 620
          }
        ]
      }
    ]
  },
  {
    "id": "deyar-al-eiman-diar",
    "name": "Deyar Al Eiman",
    "city": "Madinah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 15/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 475
          },
          {
            "roomType": "Triple",
            "price": 525
          },
          {
            "roomType": "Quad",
            "price": 575
          }
        ]
      },
      {
        "range": "15/08/2026 TO 11/11/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 525
          },
          {
            "roomType": "Triple",
            "price": 575
          },
          {
            "roomType": "Quad",
            "price": 625
          }
        ]
      },
      {
        "range": "11/11/2026 TO 10/12/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 575
          },
          {
            "roomType": "Triple",
            "price": 625
          },
          {
            "roomType": "Quad",
            "price": 675
          }
        ]
      }
    ]
  },
  {
    "id": "odest-diar",
    "name": "Odest",
    "city": "Madinah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "30/06/2026 TO 14/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 430
          },
          {
            "roomType": "Triple",
            "price": 475
          },
          {
            "roomType": "Quad",
            "price": 520
          }
        ]
      },
      {
        "range": "14/08/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 460
          },
          {
            "roomType": "Triple",
            "price": 505
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      }
    ]
  },
  {
    "id": "astoneast-taiba-hotel-diar",
    "name": "Astoneast Taiba Hotel",
    "city": "Madinah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "30/06/2026 TO 15/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 370
          },
          {
            "roomType": "Triple",
            "price": 410
          },
          {
            "roomType": "Quad",
            "price": 450
          }
        ]
      },
      {
        "range": "15/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 400
          },
          {
            "roomType": "Triple",
            "price": 440
          },
          {
            "roomType": "Quad",
            "price": 480
          }
        ]
      },
      {
        "range": "01/08/2026 TO 01/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 460
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 540
          }
        ]
      },
      {
        "range": "01/09/2026 TO 01/10/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 500
          },
          {
            "roomType": "Triple",
            "price": 540
          },
          {
            "roomType": "Quad",
            "price": 580
          }
        ]
      }
    ]
  },
  {
    "id": "durrat-al-eiman-diar",
    "name": "Durrat Al Eiman",
    "city": "Madinah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "30/06/2026 TO 15/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 425
          },
          {
            "roomType": "Triple",
            "price": 475
          },
          {
            "roomType": "Quad",
            "price": 525
          }
        ]
      },
      {
        "range": "15/08/2026 TO 11/11/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 475
          },
          {
            "roomType": "Triple",
            "price": 525
          },
          {
            "roomType": "Quad",
            "price": 575
          }
        ]
      },
      {
        "range": "11/11/2026 TO 10/12/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 525
          },
          {
            "roomType": "Triple",
            "price": 575
          },
          {
            "roomType": "Quad",
            "price": 625
          }
        ]
      }
    ]
  },
  {
    "id": "jawharat-al-rashid-diar",
    "name": "Jawharat Al Rashid",
    "city": "Madinah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "30/06/2026 TO 31/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 350
          },
          {
            "roomType": "Triple",
            "price": 390
          },
          {
            "roomType": "Quad",
            "price": 430
          }
        ]
      },
      {
        "range": "31/07/2026 TO 31/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 390
          },
          {
            "roomType": "Triple",
            "price": 430
          },
          {
            "roomType": "Quad",
            "price": 470
          }
        ]
      }
    ]
  },
  {
    "id": "grand-zowar-diar",
    "name": "Grand Zowar",
    "city": "Madinah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "30/06/2026 TO 31/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 350
          },
          {
            "roomType": "Triple",
            "price": 390
          },
          {
            "roomType": "Quad",
            "price": 430
          }
        ]
      },
      {
        "range": "31/07/2026 TO 31/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 390
          },
          {
            "roomType": "Triple",
            "price": 430
          },
          {
            "roomType": "Quad",
            "price": 470
          }
        ]
      }
    ]
  },
  {
    "id": "plaza-inn-ohud-diar",
    "name": "Plaza Inn Ohud",
    "city": "Madinah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 335
          },
          {
            "roomType": "Triple",
            "price": 385
          },
          {
            "roomType": "Quad",
            "price": 435
          }
        ]
      }
    ]
  },
  {
    "id": "al-marwa-rotana-diar",
    "name": "Al Marwa Rotana",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 09/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1150
          },
          {
            "roomType": "Triple",
            "price": 1420
          },
          {
            "roomType": "Quad",
            "price": 1690
          }
        ]
      },
      {
        "range": "09/07/2026 TO 19/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1230
          },
          {
            "roomType": "Triple",
            "price": 1500
          },
          {
            "roomType": "Quad",
            "price": 1770
          }
        ]
      }
    ]
  },
  {
    "id": "movenpick-hajar-diar",
    "name": "Movenpick Hajar",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 09/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1025
          },
          {
            "roomType": "Triple",
            "price": 1225
          },
          {
            "roomType": "Quad",
            "price": 1425
          }
        ]
      },
      {
        "range": "09/07/2026 TO 19/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1100
          },
          {
            "roomType": "Triple",
            "price": 1300
          },
          {
            "roomType": "Quad",
            "price": 1500
          }
        ]
      }
    ]
  },
  {
    "id": "safwa-tower-diar",
    "name": "Safwa Tower",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 900
          },
          {
            "roomType": "Triple",
            "price": 1100
          },
          {
            "roomType": "Quad",
            "price": 1300
          }
        ]
      },
      {
        "range": "01/08/2026 TO 19/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1000
          },
          {
            "roomType": "Triple",
            "price": 1200
          },
          {
            "roomType": "Quad",
            "price": 1400
          }
        ]
      }
    ]
  },
  {
    "id": "makkah-towers-hotel-diar",
    "name": "Makkah Towers (Hotel Rooms)",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 14/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1000
          },
          {
            "roomType": "Triple",
            "price": 1130
          },
          {
            "roomType": "Quad",
            "price": 1260
          }
        ]
      }
    ]
  },
  {
    "id": "makkah-towers-owner-diar",
    "name": "Makkah Towers (Owner Rooms)",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 15/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 830
          },
          {
            "roomType": "Triple",
            "price": 910
          },
          {
            "roomType": "Quad",
            "price": 990
          }
        ]
      },
      {
        "range": "15/07/2026 TO 14/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 880
          },
          {
            "roomType": "Triple",
            "price": 960
          },
          {
            "roomType": "Quad",
            "price": 1040
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-mashaer-diar",
    "name": "Maysan Al Mashaer",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "16/06/2026 TO 25/06/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 455
          },
          {
            "roomType": "Triple",
            "price": 535
          },
          {
            "roomType": "Quad",
            "price": 615
          }
        ]
      },
      {
        "range": "25/06/2026 TO 09/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 495
          },
          {
            "roomType": "Triple",
            "price": 575
          },
          {
            "roomType": "Quad",
            "price": 655
          }
        ]
      },
      {
        "range": "09/07/2026 TO 16/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 510
          },
          {
            "roomType": "Triple",
            "price": 590
          },
          {
            "roomType": "Quad",
            "price": 670
          }
        ]
      },
      {
        "range": "16/07/2026 TO 30/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 535
          },
          {
            "roomType": "Triple",
            "price": 615
          },
          {
            "roomType": "Quad",
            "price": 695
          }
        ]
      },
      {
        "range": "30/07/2026 TO 05/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 580
          },
          {
            "roomType": "Triple",
            "price": 660
          },
          {
            "roomType": "Quad",
            "price": 740
          }
        ]
      },
      {
        "range": "05/09/2026 TO 15/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 525
          },
          {
            "roomType": "Triple",
            "price": 605
          },
          {
            "roomType": "Quad",
            "price": 685
          }
        ]
      }
    ]
  },
  {
    "id": "azka-al-safa-diar",
    "name": "Azka Al Safa",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "20/06/2026 TO 30/06/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 520
          },
          {
            "roomType": "Triple",
            "price": 570
          },
          {
            "roomType": "Quad",
            "price": 620
          }
        ]
      },
      {
        "range": "30/06/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 550
          },
          {
            "roomType": "Triple",
            "price": 625
          },
          {
            "roomType": "Quad",
            "price": 700
          }
        ]
      },
      {
        "range": "01/08/2026 TO 01/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 580
          },
          {
            "roomType": "Triple",
            "price": 665
          },
          {
            "roomType": "Quad",
            "price": 750
          }
        ]
      }
    ]
  },
  {
    "id": "azka-al-maqam-diar",
    "name": "Azka Al Maqam",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "20/06/2026 TO 30/06/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 550
          },
          {
            "roomType": "Triple",
            "price": 620
          },
          {
            "roomType": "Quad",
            "price": 690
          }
        ]
      },
      {
        "range": "30/06/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 600
          },
          {
            "roomType": "Triple",
            "price": 690
          },
          {
            "roomType": "Quad",
            "price": 780
          }
        ]
      },
      {
        "range": "01/08/2026 TO 01/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 630
          },
          {
            "roomType": "Triple",
            "price": 730
          },
          {
            "roomType": "Quad",
            "price": 830
          }
        ]
      }
    ]
  },
  {
    "id": "grand-al-massa-diar",
    "name": "Grand Al Massa",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "25/06/2026 TO 09/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 410
          },
          {
            "roomType": "Triple",
            "price": 460
          },
          {
            "roomType": "Quad",
            "price": 510
          }
        ]
      },
      {
        "range": "09/07/2026 TO 30/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 420
          },
          {
            "roomType": "Triple",
            "price": 470
          },
          {
            "roomType": "Quad",
            "price": 520
          }
        ]
      },
      {
        "range": "30/07/2026 TO 05/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      },
      {
        "range": "05/09/2026 TO 15/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 425
          },
          {
            "roomType": "Triple",
            "price": 475
          },
          {
            "roomType": "Quad",
            "price": 525
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-maqam-diar",
    "name": "Maysan Al Maqam",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 25/06/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 345
          },
          {
            "roomType": "Triple",
            "price": 395
          },
          {
            "roomType": "Quad",
            "price": 445
          }
        ]
      },
      {
        "range": "25/06/2026 TO 09/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 385
          },
          {
            "roomType": "Triple",
            "price": 435
          },
          {
            "roomType": "Quad",
            "price": 485
          }
        ]
      },
      {
        "range": "09/07/2026 TO 16/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 400
          },
          {
            "roomType": "Triple",
            "price": 450
          },
          {
            "roomType": "Quad",
            "price": 500
          }
        ]
      },
      {
        "range": "16/07/2026 TO 30/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 415
          },
          {
            "roomType": "Triple",
            "price": 465
          },
          {
            "roomType": "Quad",
            "price": 515
          }
        ]
      },
      {
        "range": "30/07/2026 TO 05/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      },
      {
        "range": "05/09/2026 TO 15/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 395
          },
          {
            "roomType": "Triple",
            "price": 445
          },
          {
            "roomType": "Quad",
            "price": 495
          }
        ]
      }
    ]
  },
  {
    "id": "mather-al-eiman-diar",
    "name": "Mather Al Eiman",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "30/06/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 280
          },
          {
            "roomType": "Triple",
            "price": 325
          },
          {
            "roomType": "Quad",
            "price": 370
          }
        ]
      },
      {
        "range": "01/08/2026 TO 19/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 300
          },
          {
            "roomType": "Triple",
            "price": 345
          },
          {
            "roomType": "Quad",
            "price": 390
          }
        ]
      }
    ]
  },
  {
    "id": "le-meredien-towers-diar",
    "name": "Le Meredien Towers",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "07/06/2026 TO 13/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 305
          },
          {
            "roomType": "Triple",
            "price": 385
          },
          {
            "roomType": "Quad",
            "price": 465
          }
        ]
      },
      {
        "range": "14/08/2026 TO 19/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 325
          },
          {
            "roomType": "Triple",
            "price": 405
          },
          {
            "roomType": "Quad",
            "price": 485
          }
        ]
      }
    ]
  },
  {
    "id": "saja-makkah-diar",
    "name": "Saja Makkah",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "16/06/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 280
          },
          {
            "roomType": "Triple",
            "price": 330
          },
          {
            "roomType": "Quad",
            "price": 380
          }
        ]
      },
      {
        "range": "01/08/2026 TO 19/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 300
          },
          {
            "roomType": "Triple",
            "price": 350
          },
          {
            "roomType": "Quad",
            "price": 400
          }
        ]
      }
    ]
  },
  {
    "id": "fajar-badea-4-diar",
    "name": "Fajar Badea 4",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 220
          },
          {
            "roomType": "Triple",
            "price": 260
          },
          {
            "roomType": "Quad",
            "price": 300
          }
        ]
      },
      {
        "range": "01/08/2026 TO 19/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 240
          },
          {
            "roomType": "Triple",
            "price": 280
          },
          {
            "roomType": "Quad",
            "price": 320
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-mashaer",
    "name": "Maysan Al Mashaer",
    "city": "Makkah",
    "vendor": "Maysan Hotels",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 25/06/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 455
          },
          {
            "roomType": "Triple",
            "price": 535
          },
          {
            "roomType": "Quad",
            "price": 615
          }
        ]
      },
      {
        "range": "25/06/2026 TO 09/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 495
          },
          {
            "roomType": "Triple",
            "price": 575
          },
          {
            "roomType": "Quad",
            "price": 655
          }
        ]
      },
      {
        "range": "09/07/2026 TO 16/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 510
          },
          {
            "roomType": "Triple",
            "price": 590
          },
          {
            "roomType": "Quad",
            "price": 670
          }
        ]
      },
      {
        "range": "16/07/2026 TO 30/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 535
          },
          {
            "roomType": "Triple",
            "price": 615
          },
          {
            "roomType": "Quad",
            "price": 695
          }
        ]
      },
      {
        "range": "30/07/2026 TO 05/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 580
          },
          {
            "roomType": "Triple",
            "price": 660
          },
          {
            "roomType": "Quad",
            "price": 740
          }
        ]
      },
      {
        "range": "05/09/2026 TO 12/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 525
          },
          {
            "roomType": "Triple",
            "price": 605
          },
          {
            "roomType": "Quad",
            "price": 685
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-maqam",
    "name": "Maysan Al Maqam",
    "city": "Makkah",
    "vendor": "Maysan Hotels",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 25/06/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 345
          },
          {
            "roomType": "Triple",
            "price": 395
          },
          {
            "roomType": "Quad",
            "price": 445
          }
        ]
      },
      {
        "range": "25/06/2026 TO 09/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 385
          },
          {
            "roomType": "Triple",
            "price": 435
          },
          {
            "roomType": "Quad",
            "price": 485
          }
        ]
      },
      {
        "range": "09/07/2026 TO 16/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 400
          },
          {
            "roomType": "Triple",
            "price": 450
          },
          {
            "roomType": "Quad",
            "price": 500
          }
        ]
      },
      {
        "range": "16/07/2026 TO 30/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 415
          },
          {
            "roomType": "Triple",
            "price": 465
          },
          {
            "roomType": "Quad",
            "price": 515
          }
        ]
      },
      {
        "range": "30/07/2026 TO 05/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      },
      {
        "range": "05/09/2026 TO 12/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 395
          },
          {
            "roomType": "Triple",
            "price": 445
          },
          {
            "roomType": "Quad",
            "price": 495
          }
        ]
      }
    ]
  },
  {
    "id": "royal-majestic",
    "name": "Royal Majestic",
    "city": "Makkah",
    "vendor": "Maysan Hotels",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 25/06/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 375
          },
          {
            "roomType": "Triple",
            "price": 425
          },
          {
            "roomType": "Quad",
            "price": 475
          }
        ]
      },
      {
        "range": "25/06/2026 TO 09/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 425
          },
          {
            "roomType": "Triple",
            "price": 475
          },
          {
            "roomType": "Quad",
            "price": 525
          }
        ]
      },
      {
        "range": "09/07/2026 TO 16/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      },
      {
        "range": "16/07/2026 TO 30/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 480
          },
          {
            "roomType": "Triple",
            "price": 530
          },
          {
            "roomType": "Quad",
            "price": 580
          }
        ]
      },
      {
        "range": "30/07/2026 TO 05/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 510
          },
          {
            "roomType": "Triple",
            "price": 560
          },
          {
            "roomType": "Quad",
            "price": 610
          }
        ]
      },
      {
        "range": "05/09/2026 TO 12/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 460
          },
          {
            "roomType": "Triple",
            "price": 510
          },
          {
            "roomType": "Quad",
            "price": 560
          }
        ]
      }
    ]
  },
  {
    "id": "grand-al-massah",
    "name": "Grand AL Massah",
    "city": "Makkah",
    "vendor": "Maysan Hotels",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 16/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 440
          },
          {
            "roomType": "Triple",
            "price": 490
          },
          {
            "roomType": "Quad",
            "price": 540
          }
        ]
      },
      {
        "range": "16/07/2026 TO 13/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      }
    ]
  },
  {
    "id": "snood-ajyad",
    "name": "Snood Ajyad",
    "city": "Makkah",
    "vendor": "Maysan Hotels",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 16/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 430
          },
          {
            "roomType": "Triple",
            "price": 475
          },
          {
            "roomType": "Quad",
            "price": 520
          }
        ]
      },
      {
        "range": "16/07/2026 TO 13/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 495
          },
          {
            "roomType": "Quad",
            "price": 540
          }
        ]
      }
    ]
  },
  {
    "id": "ramada-al-fayzen",
    "name": "Ramada AL Fayzen",
    "city": "Makkah",
    "vendor": "Maysan Hotels",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 16/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 390
          },
          {
            "roomType": "Triple",
            "price": 440
          },
          {
            "roomType": "Quad",
            "price": 490
          }
        ]
      },
      {
        "range": "16/07/2026 TO 13/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 400
          },
          {
            "roomType": "Triple",
            "price": 450
          },
          {
            "roomType": "Quad",
            "price": 500
          }
        ]
      }
    ]
  },
  {
    "id": "al-manara",
    "name": "AL Manara",
    "city": "Makkah",
    "vendor": "Maysan Hotels",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 16/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 190
          },
          {
            "roomType": "Triple",
            "price": 225
          },
          {
            "roomType": "Quad",
            "price": 260
          },
          {
            "roomType": "Quint",
            "price": 305
          }
        ]
      },
      {
        "range": "16/07/2026 TO 13/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 240
          },
          {
            "roomType": "Triple",
            "price": 275
          },
          {
            "roomType": "Quad",
            "price": 310
          },
          {
            "roomType": "Quint",
            "price": 355
          }
        ]
      },
      {
        "range": "13/08/2026 TO 12/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 290
          },
          {
            "roomType": "Triple",
            "price": 325
          },
          {
            "roomType": "Quad",
            "price": 360
          },
          {
            "roomType": "Quint",
            "price": 405
          }
        ]
      }
    ]
  },
  {
    "id": "badr-al-massah",
    "name": "Badr AL Massah",
    "city": "Makkah",
    "vendor": "Maysan Hotels",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 16/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 280
          },
          {
            "roomType": "Triple",
            "price": 330
          },
          {
            "roomType": "Quad",
            "price": 380
          }
        ]
      },
      {
        "range": "16/07/2026 TO 13/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 290
          },
          {
            "roomType": "Triple",
            "price": 340
          },
          {
            "roomType": "Quad",
            "price": 390
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-mahabas",
    "name": "Maysan AL Mahabas",
    "city": "Makkah",
    "vendor": "Maysan Hotels",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 16/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 155
          },
          {
            "roomType": "Triple",
            "price": 195
          },
          {
            "roomType": "Quad",
            "price": 235
          }
        ]
      },
      {
        "range": "16/07/2026 TO 13/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 160
          },
          {
            "roomType": "Triple",
            "price": 200
          },
          {
            "roomType": "Quad",
            "price": 240
          }
        ]
      },
      {
        "range": "13/08/2026 TO 12/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 180
          },
          {
            "roomType": "Triple",
            "price": 220
          },
          {
            "roomType": "Quad",
            "price": 260
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-multazem",
    "name": "Maysan AL Multazem",
    "city": "Makkah",
    "vendor": "Maysan Hotels",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 16/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 145
          },
          {
            "roomType": "Triple",
            "price": 190
          },
          {
            "roomType": "Quad",
            "price": 235
          }
        ]
      },
      {
        "range": "16/07/2026 TO 13/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 155
          },
          {
            "roomType": "Triple",
            "price": 200
          },
          {
            "roomType": "Quad",
            "price": 245
          }
        ]
      },
      {
        "range": "13/08/2026 TO 12/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 165
          },
          {
            "roomType": "Triple",
            "price": 210
          },
          {
            "roomType": "Quad",
            "price": 255
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-safa-jarwal",
    "name": "Maysan Al Safa Jarwal",
    "city": "Makkah",
    "vendor": "Maysan Hotels",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 13/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 130
          },
          {
            "roomType": "Triple",
            "price": 170
          },
          {
            "roomType": "Quad",
            "price": 210
          }
        ]
      },
      {
        "range": "13/08/2026 TO 12/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 140
          },
          {
            "roomType": "Triple",
            "price": 180
          },
          {
            "roomType": "Quad",
            "price": 220
          }
        ]
      }
    ]
  },
  {
    "id": "bosphorus-1",
    "name": "Bosphorus Hotel 1",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "HB",
    "stars": 4,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 1 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 825
          },
          {
            "roomType": "Triple",
            "price": 925
          },
          {
            "roomType": "Quad",
            "price": 1025
          }
        ]
      },
      {
        "range": "1 OCT 2025 TO 1 NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 975
          },
          {
            "roomType": "Triple",
            "price": 1075
          },
          {
            "roomType": "Quad",
            "price": 1175
          }
        ]
      },
      {
        "range": "1 NOV 2025 TO 1 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 975
          },
          {
            "roomType": "Triple",
            "price": 1075
          },
          {
            "roomType": "Quad",
            "price": 1175
          }
        ]
      },
      {
        "range": "1 DEC 2025 TO 28 FEB 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1175
          },
          {
            "roomType": "Triple",
            "price": 1275
          },
          {
            "roomType": "Quad",
            "price": 1375
          }
        ]
      }
    ]
  },
  {
    "id": "waqf-al-safi",
    "name": "Waqf Al Safi Hotel",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "HB",
    "stars": 4,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 1 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 825
          },
          {
            "roomType": "Triple",
            "price": 925
          },
          {
            "roomType": "Quad",
            "price": 1025
          }
        ]
      },
      {
        "range": "1 OCT 2025 TO 1 NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 975
          },
          {
            "roomType": "Triple",
            "price": 1075
          },
          {
            "roomType": "Quad",
            "price": 1175
          }
        ]
      },
      {
        "range": "1 NOV 2025 TO 1 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 975
          },
          {
            "roomType": "Triple",
            "price": 1075
          },
          {
            "roomType": "Quad",
            "price": 1175
          }
        ]
      },
      {
        "range": "1 DEC 2025 TO 28 FEB 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1175
          },
          {
            "roomType": "Triple",
            "price": 1275
          },
          {
            "roomType": "Quad",
            "price": 1375
          }
        ]
      }
    ]
  },
  {
    "id": "movenpick-anwar",
    "name": "Hotel Movenpick Anwar",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 3 NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 900
          },
          {
            "roomType": "Triple",
            "price": 1100
          },
          {
            "roomType": "Quad",
            "price": 1300
          }
        ]
      },
      {
        "range": "4 NOV 2025 TO 17 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 1000
          },
          {
            "roomType": "Triple",
            "price": 1200
          },
          {
            "roomType": "Quad",
            "price": 1400
          }
        ]
      },
      {
        "range": "11 JAN 2026 TO 17 FEB 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1050
          },
          {
            "roomType": "Triple",
            "price": 1250
          },
          {
            "roomType": "Quad",
            "price": 1450
          }
        ]
      }
    ]
  },
  {
    "id": "crowne-plaza",
    "name": "Hotel Crowne Plaza",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 30 SEPT 2025",
        "prices": [
          {
            "roomType": "Single",
            "price": 850
          },
          {
            "roomType": "Double",
            "price": 1175
          },
          {
            "roomType": "Triple",
            "price": 1550
          }
        ]
      },
      {
        "range": "30 SEPT 2025 TO 15 DEC 2025",
        "prices": [
          {
            "roomType": "Single",
            "price": 950
          },
          {
            "roomType": "Double",
            "price": 1275
          },
          {
            "roomType": "Triple",
            "price": 1650
          }
        ]
      },
      {
        "range": "15 DEC 2025 TO 15 JAN 2026",
        "prices": [
          {
            "roomType": "Single",
            "price": 1149
          },
          {
            "roomType": "Double",
            "price": 1474
          },
          {
            "roomType": "Triple",
            "price": 1899
          }
        ]
      }
    ]
  },
  {
    "id": "hilton-madinah",
    "name": "Hotel Hilton Madinah",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 31 OCT 2025",
        "prices": [
          {
            "roomType": "Single",
            "price": 1640
          },
          {
            "roomType": "Double",
            "price": 2080
          },
          {
            "roomType": "Triple",
            "price": 2645
          }
        ]
      },
      {
        "range": "1 NOV 2025 TO 16 NOV 2025",
        "prices": [
          {
            "roomType": "Single",
            "price": 1700
          },
          {
            "roomType": "Double",
            "price": 2145
          },
          {
            "roomType": "Triple",
            "price": 2770
          }
        ]
      },
      {
        "range": "17 NOV 2025 TO 18 DEC 2025",
        "prices": [
          {
            "roomType": "Single",
            "price": 2070
          },
          {
            "roomType": "Double",
            "price": 2510
          },
          {
            "roomType": "Triple",
            "price": 3140
          }
        ]
      },
      {
        "range": "19 DEC 2025 TO 11 JAN 2026",
        "prices": [
          {
            "roomType": "Single",
            "price": 2560
          },
          {
            "roomType": "Double",
            "price": 3005
          },
          {
            "roomType": "Triple",
            "price": 3630
          }
        ]
      },
      {
        "range": "12 JAN 2026 TO 17 FEB 2026",
        "prices": [
          {
            "roomType": "Single",
            "price": 1821
          },
          {
            "roomType": "Double",
            "price": 2265
          },
          {
            "roomType": "Triple",
            "price": 2895
          }
        ]
      }
    ]
  },
  {
    "id": "dar-al-hijra",
    "name": "Dar Al Hijra Intercontinental",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "8 SEPT 2025 TO 30 SEPT 2025",
        "prices": [
          {
            "roomType": "Single/Double",
            "price": 750
          },
          {
            "roomType": "Triple",
            "price": 900
          },
          {
            "roomType": "Quad",
            "price": 1050
          }
        ]
      },
      {
        "range": "1 OCT 2025 TO 20 NOV 2025",
        "prices": [
          {
            "roomType": "Single/Double",
            "price": 750
          },
          {
            "roomType": "Triple",
            "price": 900
          },
          {
            "roomType": "Quad",
            "price": 1050
          }
        ]
      },
      {
        "range": "21 NOV 2025 TO 29 NOV 2025",
        "prices": [
          {
            "roomType": "Single/Double",
            "price": 1175
          },
          {
            "roomType": "Triple",
            "price": 1325
          },
          {
            "roomType": "Quad",
            "price": 1475
          }
        ]
      },
      {
        "range": "30 NOV 2025 TO 17 DEC 2025",
        "prices": [
          {
            "roomType": "Single/Double",
            "price": 750
          },
          {
            "roomType": "Triple",
            "price": 900
          },
          {
            "roomType": "Quad",
            "price": 1050
          }
        ]
      },
      {
        "range": "18 DEC 2025 TO 17 JAN 2026",
        "prices": [
          {
            "roomType": "Single/Double",
            "price": 1175
          },
          {
            "roomType": "Triple",
            "price": 1325
          },
          {
            "roomType": "Quad",
            "price": 1475
          }
        ]
      }
    ]
  },
  {
    "id": "dallah-taibah",
    "name": "Hotel Dallah Taibah",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "11 SEPT 2025 TO 30 SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 774
          },
          {
            "roomType": "Triple",
            "price": 909
          },
          {
            "roomType": "Jr Suite (4pax)",
            "price": 1165
          }
        ]
      },
      {
        "range": "1 OCT 2025 TO 31 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 774
          },
          {
            "roomType": "Triple",
            "price": 909
          },
          {
            "roomType": "Jr Suite (4pax)",
            "price": 1165
          }
        ]
      },
      {
        "range": "1 NOV 2025 TO 19 NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 834
          },
          {
            "roomType": "Triple",
            "price": 969
          },
          {
            "roomType": "Jr Suite (4pax)",
            "price": 1225
          }
        ]
      },
      {
        "range": "20 NOV 2025 TO 30 NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 956
          },
          {
            "roomType": "Triple",
            "price": 1090
          },
          {
            "roomType": "Jr Suite (4pax)",
            "price": 1346
          }
        ]
      },
      {
        "range": "1 DEC 2025 TO 19 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 774
          },
          {
            "roomType": "Triple",
            "price": 909
          },
          {
            "roomType": "Jr Suite (4pax)",
            "price": 1165
          }
        ]
      },
      {
        "range": "20 DEC 2025 TO 9 JAN 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1377
          },
          {
            "roomType": "Triple",
            "price": 1573
          },
          {
            "roomType": "Jr Suite (4pax)",
            "price": 2072
          }
        ]
      },
      {
        "range": "10 JAN 2026 TO 18 FEB 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 834
          },
          {
            "roomType": "Triple",
            "price": 969
          },
          {
            "roomType": "Jr Suite (4pax)",
            "price": 1225
          }
        ]
      }
    ]
  },
  {
    "id": "makarem-haram-view",
    "name": "Makarem Haram View Suites",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 5,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 17 SEPT 2025",
        "prices": [
          {
            "roomType": "Jr Suite (2 Pax)",
            "price": 875
          },
          {
            "roomType": "Family Suite (4 Pax)",
            "price": 1325
          },
          {
            "roomType": "3 Bed Suite (6Pax)",
            "price": 1725
          }
        ]
      },
      {
        "range": "18 SEPT 2025 TO 17 DEC 2025",
        "prices": [
          {
            "roomType": "Jr Suite (2 Pax)",
            "price": 955
          },
          {
            "roomType": "Family Suite (4 Pax)",
            "price": 1545
          },
          {
            "roomType": "3 Bed Suite (6Pax)",
            "price": 1825
          }
        ]
      },
      {
        "range": "18 DEC 2025 TO 31 DEC 2025",
        "prices": [
          {
            "roomType": "Jr Suite (2 Pax)",
            "price": 1920
          },
          {
            "roomType": "Family Suite (4 Pax)",
            "price": 3080
          },
          {
            "roomType": "3 Bed Suite (6Pax)",
            "price": 3740
          }
        ]
      }
    ]
  },
  {
    "id": "makarem-haram-view-large",
    "name": "Makarem Haram View Suites (Large)",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 5,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 30 SEPT 2025",
        "prices": [
          {
            "roomType": "Two Bedroom (10 Pax)",
            "price": 750
          },
          {
            "roomType": "Four Bedroom (15 Pax)",
            "price": 950
          }
        ]
      },
      {
        "range": "1 OCT 2025 TO 17 DEC 2025",
        "prices": [
          {
            "roomType": "Two Bedroom (10 Pax)",
            "price": 1950
          },
          {
            "roomType": "Four Bedroom (15 Pax)",
            "price": 2450
          }
        ]
      },
      {
        "range": "18 DEC 2025 TO 31 DEC 2025",
        "prices": [
          {
            "roomType": "Two Bedroom (10 Pax)",
            "price": 1950
          },
          {
            "roomType": "Four Bedroom (15 Pax)",
            "price": 2450
          }
        ]
      }
    ]
  },
  {
    "id": "dar-al-eiman-al-haram",
    "name": "Hotel Dar Al Eiman Al Haram",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 18 SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 875
          },
          {
            "roomType": "Triple",
            "price": 975
          },
          {
            "roomType": "Quad",
            "price": 1075
          }
        ]
      },
      {
        "range": "18 SEPT 2025 TO 11 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 975
          },
          {
            "roomType": "Triple",
            "price": 1125
          },
          {
            "roomType": "Quad",
            "price": 1275
          }
        ]
      },
      {
        "range": "11 DEC 2025 TO 21 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 1225
          },
          {
            "roomType": "Triple",
            "price": 1375
          },
          {
            "roomType": "Quad",
            "price": 1525
          }
        ]
      },
      {
        "range": "21 DEC 2025 TO 4 JAN 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1725
          },
          {
            "roomType": "Triple",
            "price": 1875
          },
          {
            "roomType": "Quad",
            "price": 2025
          }
        ]
      },
      {
        "range": "4 JAN 2026 TO 18 FEB 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1325
          },
          {
            "roomType": "Triple",
            "price": 1475
          },
          {
            "roomType": "Quad",
            "price": 1625
          }
        ]
      }
    ]
  },
  {
    "id": "frontel-al-harithia",
    "name": "Hotel Frontel Al Harithia",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "3 SEPT 2025 TO 18 SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 725
          },
          {
            "roomType": "Triple",
            "price": 850
          },
          {
            "roomType": "Quad",
            "price": 975
          }
        ]
      },
      {
        "range": "18 SEPT 2025 TO 23 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 785
          },
          {
            "roomType": "Triple",
            "price": 910
          },
          {
            "roomType": "Quad",
            "price": 1035
          }
        ]
      },
      {
        "range": "23 OCT 2025 TO 11 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 875
          },
          {
            "roomType": "Triple",
            "price": 1000
          },
          {
            "roomType": "Quad",
            "price": 1125
          }
        ]
      },
      {
        "range": "11 DEC 2025 TO 25 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 1045
          },
          {
            "roomType": "Triple",
            "price": 1185
          },
          {
            "roomType": "Quad",
            "price": 1325
          }
        ]
      },
      {
        "range": "25 DEC 2025 TO 5 JAN 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1395
          },
          {
            "roomType": "Triple",
            "price": 1575
          },
          {
            "roomType": "Quad",
            "price": 1755
          }
        ]
      },
      {
        "range": "5 JAN 2026 TO 18 FEB 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1045
          },
          {
            "roomType": "Triple",
            "price": 1185
          },
          {
            "roomType": "Quad",
            "price": 1325
          }
        ]
      }
    ]
  },
  {
    "id": "dar-al-iman-intercontinental",
    "name": "Dar Al Iman Intercontinental",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "8 SEPT 2025 TO 30 SEPT 2025",
        "prices": [
          {
            "roomType": "Single/Double",
            "price": 1335
          },
          {
            "roomType": "Triple",
            "price": 1635
          },
          {
            "roomType": "Quad",
            "price": 1935
          }
        ]
      },
      {
        "range": "1 OCT 2025 TO 20 NOV 2025",
        "prices": [
          {
            "roomType": "Single/Double",
            "price": 1335
          },
          {
            "roomType": "Triple",
            "price": 1635
          },
          {
            "roomType": "Quad",
            "price": 1935
          }
        ]
      },
      {
        "range": "21 NOV 2025 TO 29 NOV 2025",
        "prices": [
          {
            "roomType": "Single/Double",
            "price": 1575
          },
          {
            "roomType": "Triple",
            "price": 1875
          },
          {
            "roomType": "Quad",
            "price": 2175
          }
        ]
      },
      {
        "range": "30 NOV 2025 TO 17 DEC 2025",
        "prices": [
          {
            "roomType": "Single/Double",
            "price": 1335
          },
          {
            "roomType": "Triple",
            "price": 1635
          },
          {
            "roomType": "Quad",
            "price": 1935
          }
        ]
      },
      {
        "range": "18 DEC 2025 TO 17 JAN 2026",
        "prices": [
          {
            "roomType": "Single/Double",
            "price": 1575
          },
          {
            "roomType": "Triple",
            "price": 1875
          },
          {
            "roomType": "Quad",
            "price": 2175
          }
        ]
      }
    ]
  },
  {
    "id": "millenium-al-aqeeq",
    "name": "Millenium Al Aqeeq",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 15 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 775
          },
          {
            "roomType": "Triple",
            "price": 910
          },
          {
            "roomType": "Quad",
            "price": 1045
          }
        ]
      },
      {
        "range": "16 OCT 2025 TO 19 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 825
          },
          {
            "roomType": "Triple",
            "price": 950
          },
          {
            "roomType": "Quad",
            "price": 1075
          }
        ]
      },
      {
        "range": "20 DEC 2025 TO 5 JAN 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 945
          },
          {
            "roomType": "Triple",
            "price": 1080
          },
          {
            "roomType": "Quad",
            "price": 1215
          }
        ]
      }
    ]
  },
  {
    "id": "diyar-al-taqwa",
    "name": "Hotel Diyar Al Taqwa",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 2 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 445
          },
          {
            "roomType": "Triple",
            "price": 505
          },
          {
            "roomType": "Family Suite (4 pax)",
            "price": 840
          }
        ]
      },
      {
        "range": "2 OCT 2025 TO 6 NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 475
          },
          {
            "roomType": "Triple",
            "price": 535
          },
          {
            "roomType": "Family Suite (4 pax)",
            "price": 900
          }
        ]
      },
      {
        "range": "6 NOV 2025 TO 15 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 495
          },
          {
            "roomType": "Triple",
            "price": 555
          },
          {
            "roomType": "Family Suite (4 pax)",
            "price": 940
          }
        ]
      }
    ]
  },
  {
    "id": "grand-plaza-badr",
    "name": "Grand Plaza Badr Al Maqom",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 18 SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 550
          },
          {
            "roomType": "Triple",
            "price": 620
          },
          {
            "roomType": "Quad",
            "price": 690
          }
        ]
      },
      {
        "range": "18 SEPT 2025 TO 23 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 600
          },
          {
            "roomType": "Triple",
            "price": 670
          },
          {
            "roomType": "Quad",
            "price": 740
          }
        ]
      },
      {
        "range": "23 OCT 2025 TO 11 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 675
          },
          {
            "roomType": "Triple",
            "price": 750
          },
          {
            "roomType": "Quad",
            "price": 825
          }
        ]
      },
      {
        "range": "11 DEC 2025 TO 25 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 790
          },
          {
            "roomType": "Triple",
            "price": 890
          },
          {
            "roomType": "Quad",
            "price": 990
          }
        ]
      },
      {
        "range": "25 DEC 2025 TO 5 JAN 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1040
          },
          {
            "roomType": "Triple",
            "price": 1140
          },
          {
            "roomType": "Quad",
            "price": 1240
          }
        ]
      },
      {
        "range": "5 JAN 2026 TO 18 FEB 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 790
          },
          {
            "roomType": "Triple",
            "price": 890
          },
          {
            "roomType": "Quad",
            "price": 990
          }
        ]
      }
    ]
  },
  {
    "id": "shaza-regency-plaza",
    "name": "Hotel Shaza Regency Plaza",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 18 SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 550
          },
          {
            "roomType": "Triple",
            "price": 620
          },
          {
            "roomType": "Quad",
            "price": 690
          }
        ]
      },
      {
        "range": "18 SEPT 2025 TO 23 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 600
          },
          {
            "roomType": "Triple",
            "price": 670
          },
          {
            "roomType": "Quad",
            "price": 740
          }
        ]
      },
      {
        "range": "23 OCT 2025 TO 11 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 675
          },
          {
            "roomType": "Triple",
            "price": 750
          },
          {
            "roomType": "Quad",
            "price": 825
          }
        ]
      },
      {
        "range": "11 DEC 2025 TO 25 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 790
          },
          {
            "roomType": "Triple",
            "price": 890
          },
          {
            "roomType": "Quad",
            "price": 990
          }
        ]
      },
      {
        "range": "25 DEC 2025 TO 5 JAN 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1040
          },
          {
            "roomType": "Triple",
            "price": 1140
          },
          {
            "roomType": "Quad",
            "price": 1240
          }
        ]
      },
      {
        "range": "5 JAN 2026 TO 18 FEB 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 790
          },
          {
            "roomType": "Triple",
            "price": 890
          },
          {
            "roomType": "Quad",
            "price": 990
          }
        ]
      }
    ]
  },
  {
    "id": "deyar-al-eiman",
    "name": "Hotel Deyar Al Eiman",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "15 SEPT 2025 TO 15 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 420
          },
          {
            "roomType": "Triple",
            "price": 470
          },
          {
            "roomType": "Quad",
            "price": 520
          }
        ]
      },
      {
        "range": "15 OCT 2025 TO 11 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 600
          },
          {
            "roomType": "Triple",
            "price": 650
          },
          {
            "roomType": "Quad",
            "price": 700
          },
          {
            "roomType": "Quint",
            "price": 750
          }
        ]
      },
      {
        "range": "11 DEC 2025 TO 21 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 700
          },
          {
            "roomType": "Triple",
            "price": 750
          },
          {
            "roomType": "Quad",
            "price": 800
          },
          {
            "roomType": "Quint",
            "price": 850
          }
        ]
      },
      {
        "range": "21 DEC 2025 TO 4 JAN 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 900
          },
          {
            "roomType": "Triple",
            "price": 950
          },
          {
            "roomType": "Quad",
            "price": 1000
          },
          {
            "roomType": "Quint",
            "price": 1050
          }
        ]
      },
      {
        "range": "4 JAN 2026 TO 18 FEB 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 700
          },
          {
            "roomType": "Triple",
            "price": 750
          },
          {
            "roomType": "Quad",
            "price": 800
          },
          {
            "roomType": "Quint",
            "price": 850
          }
        ]
      }
    ]
  },
  {
    "id": "saja-al-madinah",
    "name": "Hotel Saja Al Madinah",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 30 SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 585
          },
          {
            "roomType": "Triple",
            "price": 695
          },
          {
            "roomType": "Quad",
            "price": 805
          },
          {
            "roomType": "Quint",
            "price": 915
          }
        ]
      },
      {
        "range": "1 OCT 2025 TO 12 NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 635
          },
          {
            "roomType": "Triple",
            "price": 745
          },
          {
            "roomType": "Quad",
            "price": 855
          },
          {
            "roomType": "Quint",
            "price": 965
          }
        ]
      },
      {
        "range": "13 NOV 2025 TO 14 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 685
          },
          {
            "roomType": "Triple",
            "price": 795
          },
          {
            "roomType": "Quad",
            "price": 905
          },
          {
            "roomType": "Quint",
            "price": 1015
          }
        ]
      },
      {
        "range": "15 DEC 2025 TO 17 FEB 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 865
          },
          {
            "roomType": "Triple",
            "price": 975
          },
          {
            "roomType": "Quad",
            "price": 1085
          },
          {
            "roomType": "Quint",
            "price": 1195
          }
        ]
      }
    ]
  },
  {
    "id": "castle-hotel",
    "name": "Castle Hotel",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 2 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 445
          },
          {
            "roomType": "Triple",
            "price": 530
          },
          {
            "roomType": "Quad",
            "price": 615
          }
        ]
      },
      {
        "range": "2 OCT 2025 TO 6 NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 470
          },
          {
            "roomType": "Triple",
            "price": 555
          },
          {
            "roomType": "Quad",
            "price": 640
          }
        ]
      },
      {
        "range": "6 NOV 2025 TO 15 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 495
          },
          {
            "roomType": "Triple",
            "price": 580
          },
          {
            "roomType": "Quad",
            "price": 665
          }
        ]
      }
    ]
  },
  {
    "id": "diyar-al-huda",
    "name": "Hotel Diyar Al Huda",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 2 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 415
          },
          {
            "roomType": "Triple",
            "price": 460
          },
          {
            "roomType": "Quad",
            "price": 505
          },
          {
            "roomType": "Quint",
            "price": 575
          }
        ]
      },
      {
        "range": "2 OCT 2025 TO 6 NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 440
          },
          {
            "roomType": "Triple",
            "price": 485
          },
          {
            "roomType": "Quad",
            "price": 530
          },
          {
            "roomType": "Quint",
            "price": 600
          }
        ]
      }
    ]
  },
  {
    "id": "prestige-al-mashaer",
    "name": "Prestige Al Mashaer",
    "city": "Makkah",
    "vendor": "Konoz United",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "1/8/2025 TO 1/10/2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 650
          },
          {
            "roomType": "Triple",
            "price": 750
          },
          {
            "roomType": "Quad",
            "price": 850
          }
        ]
      },
      {
        "range": "1/10/2025 TO 20/12/2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 675
          },
          {
            "roomType": "Triple",
            "price": 775
          },
          {
            "roomType": "Quad",
            "price": 875
          }
        ]
      }
    ]
  },
  {
    "id": "makarem-tower-1",
    "name": "Makarem Tower 1",
    "city": "Makkah",
    "vendor": "Konoz United",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "28/6/2025 TO 10/10/2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 660
          },
          {
            "roomType": "Triple",
            "price": 790
          },
          {
            "roomType": "Quad",
            "price": 920
          }
        ]
      },
      {
        "range": "1/10/2025 TO 20/12/2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 700
          },
          {
            "roomType": "Triple",
            "price": 830
          },
          {
            "roomType": "Quad",
            "price": 960
          }
        ]
      }
    ]
  },
  {
    "id": "al-shohada",
    "name": "Al Shohada",
    "city": "Makkah",
    "vendor": "Konoz United",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "24/8/2025 TO 15/12/2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 605
          },
          {
            "roomType": "Triple",
            "price": 705
          },
          {
            "roomType": "Quad",
            "price": 805
          },
          {
            "roomType": "J.Suite",
            "price": 1005
          }
        ]
      },
      {
        "range": "15/12/2025 TO 5/1/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 905
          },
          {
            "roomType": "Triple",
            "price": 1005
          },
          {
            "roomType": "Quad",
            "price": 1105
          },
          {
            "roomType": "J.Suite",
            "price": 1305
          }
        ]
      },
      {
        "range": "5/1/2026 TO 17/2/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 580
          },
          {
            "roomType": "Triple",
            "price": 680
          },
          {
            "roomType": "Quad",
            "price": 780
          },
          {
            "roomType": "J.Suite",
            "price": 980
          }
        ]
      }
    ]
  },
  {
    "id": "olayan-ajyad",
    "name": "Olayan Ajyad",
    "city": "Makkah",
    "vendor": "Konoz United",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "24/8/2025 TO 1/10/2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 775
          },
          {
            "roomType": "Triple",
            "price": 875
          },
          {
            "roomType": "Quad",
            "price": 975
          }
        ]
      },
      {
        "range": "1/10/2025 TO 20/12/2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 800
          },
          {
            "roomType": "Triple",
            "price": 900
          },
          {
            "roomType": "Quad",
            "price": 1000
          }
        ]
      }
    ]
  },
  {
    "id": "azka-al-maqam",
    "name": "Azka Al Maqam",
    "city": "Makkah",
    "vendor": "Konoz United",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "24/8/2025 TO 30/8/2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 650
          },
          {
            "roomType": "Triple",
            "price": 720
          },
          {
            "roomType": "Quad",
            "price": 790
          }
        ]
      },
      {
        "range": "1/9/2025 TO 15/12/2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 700
          },
          {
            "roomType": "Triple",
            "price": 800
          },
          {
            "roomType": "Quad",
            "price": 900
          }
        ]
      }
    ]
  },
  {
    "id": "le-meridien-ajyad",
    "name": "Le Meridien Ajyad",
    "city": "Makkah",
    "vendor": "Konoz United",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "24/8/2025 TO 1/10/2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 700
          },
          {
            "roomType": "Triple",
            "price": 825
          },
          {
            "roomType": "Quad",
            "price": 950
          }
        ]
      }
    ]
  },
  {
    "id": "azka-al-safa",
    "name": "Azka Al Safa",
    "city": "Makkah",
    "vendor": "Konoz United",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "24/8/2025 TO 30/8/2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 550
          },
          {
            "roomType": "Triple",
            "price": 620
          },
          {
            "roomType": "Quad",
            "price": 690
          }
        ]
      },
      {
        "range": "1/9/2025 TO 15/12/2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 590
          },
          {
            "roomType": "Triple",
            "price": 680
          },
          {
            "roomType": "Quad",
            "price": 770
          }
        ]
      }
    ]
  },
  {
    "id": "orinsis",
    "name": "Orinsis",
    "city": "Makkah",
    "vendor": "Konoz United",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "24/8/2025 TO 15/12/2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 720
          },
          {
            "roomType": "Triple",
            "price": 820
          },
          {
            "roomType": "Quad",
            "price": 920
          }
        ]
      },
      {
        "range": "15/12/2025 TO 7/1/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 800
          },
          {
            "roomType": "Triple",
            "price": 900
          },
          {
            "roomType": "Quad",
            "price": 1000
          }
        ]
      }
    ]
  },
  {
    "id": "anjum-makkah",
    "name": "Anjum Makkah",
    "city": "Makkah",
    "vendor": "Konoz United",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "24/8/2025 TO 18/9/2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 590
          },
          {
            "roomType": "Triple",
            "price": 700
          },
          {
            "roomType": "Quad",
            "price": 810
          }
        ]
      },
      {
        "range": "19/9/2025 TO 22/10/2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 660
          },
          {
            "roomType": "Triple",
            "price": 770
          },
          {
            "roomType": "Quad",
            "price": 880
          }
        ]
      },
      {
        "range": "23/10/2025 TO 19/12/2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 700
          },
          {
            "roomType": "Triple",
            "price": 810
          },
          {
            "roomType": "Quad",
            "price": 920
          }
        ]
      },
      {
        "range": "6/1/2026 TO 17/2/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 650
          },
          {
            "roomType": "Triple",
            "price": 760
          },
          {
            "roomType": "Quad",
            "price": 870
          }
        ]
      }
    ]
  },
  {
    "id": "le-meridien-towers",
    "name": "Le Meridien Towers",
    "city": "Makkah",
    "vendor": "Konoz United",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "24/8/2025 TO 31/10/2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 300
          },
          {
            "roomType": "Triple",
            "price": 350
          },
          {
            "roomType": "Quad",
            "price": 420
          }
        ]
      }
    ]
  },
  {
    "id": "saif-al-yamani",
    "name": "Hotel Saif Al Yamani",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 30 OCT 2025",
        "prices": [
          {
            "roomType": "Triple",
            "price": 325
          },
          {
            "roomType": "Quad",
            "price": 370
          },
          {
            "roomType": "Quint",
            "price": 415
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-diyafa",
    "name": "Hotel Maysan Al Diyafa",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 23 SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 290
          },
          {
            "roomType": "Triple",
            "price": 345
          },
          {
            "roomType": "Quad",
            "price": 400
          }
        ]
      }
    ]
  },
  {
    "id": "elaf-al-bait",
    "name": "Hotel Elaf Al Bait",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 15 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 675
          },
          {
            "roomType": "Triple",
            "price": 750
          },
          {
            "roomType": "Quad",
            "price": 825
          }
        ]
      }
    ]
  },
  {
    "id": "kunuz-ajyad",
    "name": "Hotel Kunuz Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 15 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 465
          },
          {
            "roomType": "Triple",
            "price": 505
          },
          {
            "roomType": "Quad",
            "price": 545
          }
        ]
      }
    ]
  },
  {
    "id": "emaar-andalusia",
    "name": "Hotel Emaar Andalusia",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 15 NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 465
          },
          {
            "roomType": "Triple",
            "price": 525
          },
          {
            "roomType": "Quad",
            "price": 585
          }
        ]
      }
    ]
  },
  {
    "id": "maather-al-eiman",
    "name": "Hotel Maather Al Eiman",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 1 NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 380
          },
          {
            "roomType": "Triple",
            "price": 425
          },
          {
            "roomType": "Quad",
            "price": 470
          }
        ]
      },
      {
        "range": "1 NOV 2025 TO 18 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 400
          },
          {
            "roomType": "Triple",
            "price": 445
          },
          {
            "roomType": "Quad",
            "price": 490
          }
        ]
      },
      {
        "range": "18 DEC 2025 TO 10 JAN 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 495
          },
          {
            "roomType": "Quad",
            "price": 540
          }
        ]
      },
      {
        "range": "10 JAN 2026 TO 17 FEB 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 420
          },
          {
            "roomType": "Triple",
            "price": 465
          },
          {
            "roomType": "Quad",
            "price": 510
          }
        ]
      }
    ]
  },
  {
    "id": "zalal-al-nozlaa",
    "name": "Zalal Al Nozlaa ex Rehab Al Kheir",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 10 SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 340
          },
          {
            "roomType": "Triple",
            "price": 380
          },
          {
            "roomType": "Quad",
            "price": 420
          }
        ]
      },
      {
        "range": "11 SEPT 2025 TO 18 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 360
          },
          {
            "roomType": "Triple",
            "price": 400
          },
          {
            "roomType": "Quad",
            "price": 440
          }
        ]
      },
      {
        "range": "19 DEC 2025 TO 20 JAN 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 410
          },
          {
            "roomType": "Triple",
            "price": 450
          },
          {
            "roomType": "Quad",
            "price": 490
          }
        ]
      },
      {
        "range": "21 JAN 2026 TO 18 FEB 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 390
          },
          {
            "roomType": "Triple",
            "price": 430
          },
          {
            "roomType": "Quad",
            "price": 470
          }
        ]
      }
    ]
  },
  {
    "id": "thawarat-diyafah",
    "name": "Thawarat Diyafah Al Rahman",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 430
          },
          {
            "roomType": "Triple",
            "price": 470
          },
          {
            "roomType": "Quad",
            "price": 510
          }
        ]
      }
    ]
  },
  {
    "id": "nawarat-al-shams-1",
    "name": "Hotel Nawarat Al Shams 1",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 420
          },
          {
            "roomType": "Triple",
            "price": 460
          },
          {
            "roomType": "Quad",
            "price": 500
          }
        ]
      }
    ]
  },
  {
    "id": "jawharat-al-misfalah",
    "name": "Hotel Jawharat Al Misfalah",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 370
          },
          {
            "roomType": "Triple",
            "price": 410
          },
          {
            "roomType": "Quad",
            "price": 450
          }
        ]
      }
    ]
  },
  {
    "id": "mira-ajyad",
    "name": "Hotel Mira Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 31 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 520
          },
          {
            "roomType": "Triple",
            "price": 580
          },
          {
            "roomType": "Quad",
            "price": 640
          },
          {
            "roomType": "Quint",
            "price": 700
          }
        ]
      },
      {
        "range": "1 NOV 2025 TO 30 NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 530
          },
          {
            "roomType": "Triple",
            "price": 590
          },
          {
            "roomType": "Quad",
            "price": 650
          },
          {
            "roomType": "Quint",
            "price": 710
          }
        ]
      },
      {
        "range": "1 DEC 2025 TO 5 JAN 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 580
          },
          {
            "roomType": "Triple",
            "price": 640
          },
          {
            "roomType": "Quad",
            "price": 700
          },
          {
            "roomType": "Quint",
            "price": 760
          }
        ]
      },
      {
        "range": "5 JAN 2026 TO 18 FEB 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 530
          },
          {
            "roomType": "Triple",
            "price": 590
          },
          {
            "roomType": "Quad",
            "price": 650
          },
          {
            "roomType": "Quint",
            "price": 710
          }
        ]
      }
    ]
  },
  {
    "id": "lamar-ajyad",
    "name": "Hotel Lamar Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "1 SEPT 2025 TILL 24 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 230
          },
          {
            "roomType": "Triple",
            "price": 275
          },
          {
            "roomType": "Quad",
            "price": 320
          }
        ]
      }
    ]
  },
  {
    "id": "dar-al-lamar",
    "name": "Hotel Dar Al Lamar",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "1 SEPT 2025 TILL 24 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 210
          },
          {
            "roomType": "Triple",
            "price": 255
          },
          {
            "roomType": "Quad",
            "price": 300
          }
        ]
      }
    ]
  },
  {
    "id": "mawten-lamar",
    "name": "Hotel Mawten Lamar",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "1 SEPT 2025 TILL 24 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 210
          },
          {
            "roomType": "Triple",
            "price": 255
          },
          {
            "roomType": "Quad",
            "price": 300
          }
        ]
      }
    ]
  },
  {
    "id": "saja-makkah",
    "name": "Saja Makkah ex Le Meridien Tower 1 & 2",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 1 NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 355
          },
          {
            "roomType": "Triple",
            "price": 445
          },
          {
            "roomType": "Quad",
            "price": 535
          }
        ]
      },
      {
        "range": "1 NOV 2025 TO 1 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 385
          },
          {
            "roomType": "Triple",
            "price": 475
          },
          {
            "roomType": "Quad",
            "price": 565
          }
        ]
      },
      {
        "range": "1 DEC 2025 TO 21 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 485
          },
          {
            "roomType": "Triple",
            "price": 580
          },
          {
            "roomType": "Quad",
            "price": 675
          }
        ]
      }
    ]
  },
  {
    "id": "rawha-al-maqom",
    "name": "Hotel Rawha Al Maqom",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 30 SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 415
          },
          {
            "roomType": "Triple",
            "price": 460
          },
          {
            "roomType": "Quad",
            "price": 505
          }
        ]
      }
    ]
  },
  {
    "id": "dhaifa-al-aziziyah",
    "name": "Hotel Dhaifa Al Aziziyah",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 355
          },
          {
            "roomType": "Triple",
            "price": 395
          },
          {
            "roomType": "Quad",
            "price": 435
          },
          {
            "roomType": "Quint",
            "price": 475
          }
        ]
      },
      {
        "range": "1 OCT 2025 TO 15 NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 385
          },
          {
            "roomType": "Triple",
            "price": 425
          },
          {
            "roomType": "Quad",
            "price": 485
          },
          {
            "roomType": "Quint",
            "price": 545
          }
        ]
      },
      {
        "range": "15 NOV 2025 TO 15 JAN 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 405
          },
          {
            "roomType": "Triple",
            "price": 445
          },
          {
            "roomType": "Quad",
            "price": 505
          },
          {
            "roomType": "Quint",
            "price": 575
          }
        ]
      },
      {
        "range": "15 JAN 2026 TO BEFORE RAMADHAN",
        "prices": [
          {
            "roomType": "Double",
            "price": 355
          },
          {
            "roomType": "Triple",
            "price": 395
          },
          {
            "roomType": "Quad",
            "price": 455
          },
          {
            "roomType": "Quint",
            "price": 505
          }
        ]
      }
    ]
  },
  {
    "id": "al-miqat",
    "name": "Al Miqat Hotel",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 495
          },
          {
            "roomType": "Triple",
            "price": 540
          },
          {
            "roomType": "Quad",
            "price": 585
          }
        ]
      },
      {
        "range": "DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 515
          },
          {
            "roomType": "Triple",
            "price": 560
          },
          {
            "roomType": "Quad",
            "price": 605
          }
        ]
      }
    ]
  },
  {
    "id": "wahat-ajyad",
    "name": "Wahat Ajyad ex Talat Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 380
          },
          {
            "roomType": "Triple",
            "price": 420
          },
          {
            "roomType": "Quad",
            "price": 460
          }
        ]
      },
      {
        "range": "OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 400
          },
          {
            "roomType": "Triple",
            "price": 440
          },
          {
            "roomType": "Quad",
            "price": 480
          }
        ]
      }
    ]
  },
  {
    "id": "kayan-al-raya",
    "name": "Hotel Kayan Al Raya",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 390
          },
          {
            "roomType": "Triple",
            "price": 430
          },
          {
            "roomType": "Quad",
            "price": 470
          }
        ]
      }
    ]
  },
  {
    "id": "nada-ajyad",
    "name": "Hotel Nada Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 410
          },
          {
            "roomType": "Triple",
            "price": 450
          },
          {
            "roomType": "Quad",
            "price": 490
          }
        ]
      },
      {
        "range": "OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 440
          },
          {
            "roomType": "Triple",
            "price": 480
          },
          {
            "roomType": "Quad",
            "price": 520
          }
        ]
      }
    ]
  },
  {
    "id": "al-ayam",
    "name": "Al Ayam Hotel",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 300
          },
          {
            "roomType": "Triple",
            "price": 340
          },
          {
            "roomType": "Quad",
            "price": 380
          }
        ]
      }
    ]
  },
  {
    "id": "sawaed-al-khair",
    "name": "Hotel Sawaed Al Khair",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 435
          },
          {
            "roomType": "Triple",
            "price": 475
          },
          {
            "roomType": "Quad",
            "price": 515
          }
        ]
      }
    ]
  },
  {
    "id": "anwar-al-deafah",
    "name": "Hotel Anwar Al Deafah",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 465
          },
          {
            "roomType": "Triple",
            "price": 505
          },
          {
            "roomType": "Quad",
            "price": 545
          }
        ]
      }
    ]
  },
  {
    "id": "al-kiswah-tower",
    "name": "Hotel Al Kiswah Tower",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 25 DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 210
          },
          {
            "roomType": "Triple",
            "price": 255
          },
          {
            "roomType": "Quad",
            "price": 300
          }
        ]
      },
      {
        "range": "25 DEC 2025 TO 5 JAN 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 230
          },
          {
            "roomType": "Triple",
            "price": 275
          },
          {
            "roomType": "Quad",
            "price": 320
          }
        ]
      },
      {
        "range": "5 JAN 2026 TO 13 FEB 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 210
          },
          {
            "roomType": "Triple",
            "price": 255
          },
          {
            "roomType": "Quad",
            "price": 300
          }
        ]
      }
    ]
  },
  {
    "id": "ajyad-golden",
    "name": "Hotel Ajyad Golden",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 325
          },
          {
            "roomType": "Triple",
            "price": 365
          },
          {
            "roomType": "Quad",
            "price": 405
          }
        ]
      },
      {
        "range": "OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 365
          },
          {
            "roomType": "Triple",
            "price": 405
          },
          {
            "roomType": "Quad",
            "price": 445
          }
        ]
      },
      {
        "range": "NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 385
          },
          {
            "roomType": "Triple",
            "price": 425
          },
          {
            "roomType": "Quad",
            "price": 465
          }
        ]
      },
      {
        "range": "DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 415
          },
          {
            "roomType": "Triple",
            "price": 455
          },
          {
            "roomType": "Quad",
            "price": 495
          }
        ]
      }
    ]
  },
  {
    "id": "ajwad-ajyad",
    "name": "Hotel Ajwad Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 315
          },
          {
            "roomType": "Triple",
            "price": 355
          },
          {
            "roomType": "Quad",
            "price": 395
          }
        ]
      },
      {
        "range": "OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 335
          },
          {
            "roomType": "Triple",
            "price": 375
          },
          {
            "roomType": "Quad",
            "price": 415
          }
        ]
      },
      {
        "range": "NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 345
          },
          {
            "roomType": "Triple",
            "price": 385
          },
          {
            "roomType": "Quad",
            "price": 425
          }
        ]
      },
      {
        "range": "DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 365
          },
          {
            "roomType": "Triple",
            "price": 405
          },
          {
            "roomType": "Quad",
            "price": 445
          }
        ]
      }
    ]
  },
  {
    "id": "manazel-al-wisam",
    "name": "Hotel Manazel Al Wisam Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 315
          },
          {
            "roomType": "Triple",
            "price": 355
          },
          {
            "roomType": "Quad",
            "price": 395
          }
        ]
      },
      {
        "range": "OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 315
          },
          {
            "roomType": "Triple",
            "price": 355
          },
          {
            "roomType": "Quad",
            "price": 395
          }
        ]
      },
      {
        "range": "NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 325
          },
          {
            "roomType": "Triple",
            "price": 365
          },
          {
            "roomType": "Quad",
            "price": 405
          }
        ]
      },
      {
        "range": "DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 335
          },
          {
            "roomType": "Triple",
            "price": 375
          },
          {
            "roomType": "Quad",
            "price": 415
          }
        ]
      }
    ]
  },
  {
    "id": "al-rehab-al-zahabi",
    "name": "Hotel Al Rehab Al Zahabi Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 305
          },
          {
            "roomType": "Triple",
            "price": 345
          },
          {
            "roomType": "Quad",
            "price": 385
          }
        ]
      },
      {
        "range": "OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 315
          },
          {
            "roomType": "Triple",
            "price": 355
          },
          {
            "roomType": "Quad",
            "price": 395
          }
        ]
      },
      {
        "range": "NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 325
          },
          {
            "roomType": "Triple",
            "price": 365
          },
          {
            "roomType": "Quad",
            "price": 405
          }
        ]
      },
      {
        "range": "DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 325
          },
          {
            "roomType": "Triple",
            "price": 365
          },
          {
            "roomType": "Quad",
            "price": 405
          }
        ]
      }
    ]
  },
  {
    "id": "arabi-hotel-ajyad",
    "name": "Hotel Arabi Hotel Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Triple",
            "price": 305
          },
          {
            "roomType": "Quad",
            "price": 365
          }
        ]
      },
      {
        "range": "OCT 2025",
        "prices": [
          {
            "roomType": "Triple",
            "price": 305
          },
          {
            "roomType": "Quad",
            "price": 345
          }
        ]
      },
      {
        "range": "NOV 2025",
        "prices": [
          {
            "roomType": "Triple",
            "price": 355
          },
          {
            "roomType": "Quad",
            "price": 395
          }
        ]
      },
      {
        "range": "DEC 2025",
        "prices": [
          {
            "roomType": "Triple",
            "price": 375
          },
          {
            "roomType": "Quad",
            "price": 415
          }
        ]
      }
    ]
  },
  {
    "id": "dream-zone",
    "name": "Hotel Dream Zone",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 325
          },
          {
            "roomType": "Triple",
            "price": 365
          },
          {
            "roomType": "Quad",
            "price": 405
          }
        ]
      },
      {
        "range": "NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 335
          },
          {
            "roomType": "Triple",
            "price": 375
          },
          {
            "roomType": "Quad",
            "price": 415
          }
        ]
      },
      {
        "range": "DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 345
          },
          {
            "roomType": "Triple",
            "price": 385
          },
          {
            "roomType": "Quad",
            "price": 425
          }
        ]
      }
    ]
  },
  {
    "id": "almowhadeen-ajyad",
    "name": "Hotel Almowhadeen Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 305
          },
          {
            "roomType": "Triple",
            "price": 345
          },
          {
            "roomType": "Quad",
            "price": 385
          }
        ]
      },
      {
        "range": "NOV 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 315
          },
          {
            "roomType": "Triple",
            "price": 355
          },
          {
            "roomType": "Quad",
            "price": 395
          }
        ]
      },
      {
        "range": "DEC 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 335
          },
          {
            "roomType": "Triple",
            "price": 375
          },
          {
            "roomType": "Quad",
            "price": 415
          }
        ]
      }
    ]
  },
  {
    "id": "jada-al-ajyad",
    "name": "Hotel Jada Al Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 315
          },
          {
            "roomType": "Triple",
            "price": 355
          },
          {
            "roomType": "Quad",
            "price": 395
          }
        ]
      },
      {
        "range": "OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 335
          },
          {
            "roomType": "Triple",
            "price": 375
          },
          {
            "roomType": "Quad",
            "price": 415
          }
        ]
      }
    ]
  },
  {
    "id": "dar-al-nahadi",
    "name": "Hotel Dar Al Nahadi Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 325
          },
          {
            "roomType": "Triple",
            "price": 365
          },
          {
            "roomType": "Quad",
            "price": 405
          }
        ]
      },
      {
        "range": "OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 345
          },
          {
            "roomType": "Triple",
            "price": 385
          },
          {
            "roomType": "Quad",
            "price": 425
          }
        ]
      }
    ]
  },
  {
    "id": "al-ahmadi",
    "name": "Hotel Al Ahmadi Hotel",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 285
          },
          {
            "roomType": "Triple",
            "price": 325
          },
          {
            "roomType": "Quad",
            "price": 365
          }
        ]
      },
      {
        "range": "OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 315
          },
          {
            "roomType": "Triple",
            "price": 355
          },
          {
            "roomType": "Quad",
            "price": 395
          }
        ]
      }
    ]
  },
  {
    "id": "loloat-al-azhar",
    "name": "Hotel Loloat Al Azhar",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 285
          },
          {
            "roomType": "Triple",
            "price": 325
          },
          {
            "roomType": "Quad",
            "price": 365
          }
        ]
      },
      {
        "range": "OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 315
          },
          {
            "roomType": "Triple",
            "price": 355
          },
          {
            "roomType": "Quad",
            "price": 395
          }
        ]
      }
    ]
  },
  {
    "id": "basma-al-diyafa",
    "name": "Hotel Basma Al Diyafa Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 320
          },
          {
            "roomType": "Triple",
            "price": 360
          },
          {
            "roomType": "Quad",
            "price": 400
          }
        ]
      }
    ]
  },
  {
    "id": "al-naseeb-al-arbi",
    "name": "Hotel Al Naseeb Al Arbi Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 310
          },
          {
            "roomType": "Triple",
            "price": 350
          },
          {
            "roomType": "Quad",
            "price": 390
          }
        ]
      }
    ]
  },
  {
    "id": "jawharat-al-salah",
    "name": "Hotel Jawharat Al Salah",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 320
          },
          {
            "roomType": "Triple",
            "price": 360
          },
          {
            "roomType": "Quad",
            "price": 400
          }
        ]
      }
    ]
  },
  {
    "id": "fajar-badie-4",
    "name": "Hotel Fajar Badie 4",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 14 SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 280
          },
          {
            "roomType": "Triple",
            "price": 320
          },
          {
            "roomType": "Quad",
            "price": 360
          }
        ]
      },
      {
        "range": "14 SEPT 2025 TO 11 OCT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 290
          },
          {
            "roomType": "Triple",
            "price": 330
          },
          {
            "roomType": "Quad",
            "price": 370
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-mahbas",
    "name": "Hotel Maysan Al Mahbas",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 23 SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 230
          },
          {
            "roomType": "Triple",
            "price": 275
          },
          {
            "roomType": "Quad",
            "price": 320
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-moltazem",
    "name": "Hotel Maysan Al Moltazem",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 23 SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 230
          },
          {
            "roomType": "Triple",
            "price": 275
          },
          {
            "roomType": "Quad",
            "price": 320
          }
        ]
      }
    ]
  },
  {
    "id": "shuraka-al-khair",
    "name": "Hotel Shuraka Al Khair",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 23 SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 220
          },
          {
            "roomType": "Triple",
            "price": 260
          },
          {
            "roomType": "Quad",
            "price": 300
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-safa",
    "name": "Hotel Maysan Al Safa",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 23 SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 225
          },
          {
            "roomType": "Triple",
            "price": 270
          },
          {
            "roomType": "Quad",
            "price": 315
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-aziziah",
    "name": "Hotel Maysan Al Aziziah",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 23 SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 190
          },
          {
            "roomType": "Triple",
            "price": 235
          },
          {
            "roomType": "Quad",
            "price": 280
          }
        ]
      }
    ]
  },
  {
    "id": "saif-al-majd",
    "name": "Hotel Saif Al Majd",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 23 SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 300
          },
          {
            "roomType": "Triple",
            "price": 345
          },
          {
            "roomType": "Quad",
            "price": 390
          }
        ]
      }
    ]
  },
  {
    "id": "miad-al-majd",
    "name": "Hotel Miad Al Majd",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "1 SEPT 2025 TO 23 SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 260
          },
          {
            "roomType": "Triple",
            "price": 305
          },
          {
            "roomType": "Quad",
            "price": 350
          }
        ]
      }
    ]
  },
  {
    "id": "amjad-ajyad",
    "name": "Hotel Amjad Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 255
          },
          {
            "roomType": "Triple",
            "price": 295
          },
          {
            "roomType": "Quad",
            "price": 335
          }
        ]
      }
    ]
  },
  {
    "id": "maather-al-diyafa",
    "name": "Hotel Maather Al Diyafa",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 340
          },
          {
            "roomType": "Triple",
            "price": 380
          },
          {
            "roomType": "Quad",
            "price": 420
          }
        ]
      }
    ]
  },
  {
    "id": "sadan-al-huda",
    "name": "Hotel Sadan Al Huda",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "FB",
    "stars": 2,
    "seasons": [
      {
        "range": "SEPT 2025",
        "prices": [
          {
            "roomType": "Double",
            "price": 310
          },
          {
            "roomType": "Triple",
            "price": 350
          },
          {
            "roomType": "Quad",
            "price": 390
          }
        ]
      }
    ]
  },
  {
    "id": "alharmain-dar-al-eiman-al-haram",
    "name": "Dar Al Eiman Al Haram",
    "city": "Madinah",
    "vendor": "Alharmain",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16 JUN 2026 TO 30 JUN 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1050
          },
          {
            "roomType": "Triple",
            "price": 1350
          },
          {
            "roomType": "Quad",
            "price": 1650
          }
        ]
      },
      {
        "range": "30 JUN 2026 TO 15 AUG 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 850
          },
          {
            "roomType": "Triple",
            "price": 975
          },
          {
            "roomType": "Quad",
            "price": 1100
          }
        ]
      }
    ]
  },
  {
    "id": "alharmain-deyar-al-eiman",
    "name": "Deyar Al Eiman",
    "city": "Madinah",
    "vendor": "Alharmain",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "30 JUN 2026 TO 15 AUG 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 525
          },
          {
            "roomType": "Triple",
            "price": 575
          },
          {
            "roomType": "Quad",
            "price": 625
          },
          {
            "roomType": "Quint",
            "price": 675
          }
        ]
      }
    ]
  },
  {
    "id": "alharmain-durrat-al-eiman",
    "name": "Durrat Al Eiman",
    "city": "Madinah",
    "vendor": "Alharmain",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "30 JUN 2026 TO 15 AUG 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 475
          },
          {
            "roomType": "Triple",
            "price": 525
          },
          {
            "roomType": "Quad",
            "price": 575
          },
          {
            "roomType": "Quint",
            "price": 625
          }
        ]
      }
    ]
  },
  {
    "id": "alharmain-ancra-hotel",
    "name": "Ancra Hotel",
    "city": "Madinah",
    "vendor": "Alharmain",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "25 JUN 2026 TO 15 AUG 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 550
          },
          {
            "roomType": "Triple",
            "price": 625
          },
          {
            "roomType": "Quad",
            "price": 700
          }
        ]
      }
    ]
  },
  {
    "id": "alharmain-movenpick-madina",
    "name": "Movenpick Madina",
    "city": "Madinah",
    "vendor": "Alharmain",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16 JUN 2026 TO 31 DEC 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 900
          },
          {
            "roomType": "Triple",
            "price": 1050
          },
          {
            "roomType": "Quad",
            "price": 1200
          }
        ]
      }
    ]
  },
  {
    "id": "alharmain-emar-royal",
    "name": "Emar Royal",
    "city": "Madinah",
    "vendor": "Alharmain",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "30 JUN 2026 TO 19 AUG 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 625
          },
          {
            "roomType": "Triple",
            "price": 700
          },
          {
            "roomType": "Quad",
            "price": 775
          }
        ]
      }
    ]
  },
  {
    "id": "alharmain-emar-elite",
    "name": "Emar Elite",
    "city": "Madinah",
    "vendor": "Alharmain",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "30 JUN 2026 TO 19 AUG 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 600
          },
          {
            "roomType": "Triple",
            "price": 675
          },
          {
            "roomType": "Quad",
            "price": 750
          }
        ]
      }
    ]
  },
  {
    "id": "alharmain-emar-al-mektan",
    "name": "Emar Al Mektan",
    "city": "Madinah",
    "vendor": "Alharmain",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "30 JUN 2026 TO 19 AUG 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 600
          },
          {
            "roomType": "Triple",
            "price": 675
          },
          {
            "roomType": "Quad",
            "price": 750
          }
        ]
      }
    ]
  },
  {
    "id": "alharmain-emar-taiba",
    "name": "Emar Taiba",
    "city": "Madinah",
    "vendor": "Alharmain",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "30 JUN 2026 TO 19 AUG 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 430
          },
          {
            "roomType": "Triple",
            "price": 470
          },
          {
            "roomType": "Quad",
            "price": 510
          }
        ]
      }
    ]
  },
  {
    "id": "alharmain-peninsula-worth",
    "name": "Peninsula Worth",
    "city": "Madinah",
    "vendor": "Alharmain",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16 JUN 2026 TO 19 AUG 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 700
          },
          {
            "roomType": "Triple",
            "price": 810
          },
          {
            "roomType": "Quad",
            "price": 920
          }
        ]
      }
    ]
  },
  {
    "id": "alharmain-gufran-sofwah",
    "name": "Gufran Sofwah",
    "city": "Makkah",
    "vendor": "Alharmain",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16 JUN 2026 TO 14 OCT 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1200
          },
          {
            "roomType": "Triple",
            "price": 1550
          },
          {
            "roomType": "Quad",
            "price": 1900
          }
        ]
      }
    ]
  },
  {
    "id": "alharmain-le-meredien-tower",
    "name": "Le Meredien Tower",
    "city": "Makkah",
    "vendor": "Alharmain",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "07 JUN 2026 TO 13 AUG 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 370
          },
          {
            "roomType": "Triple",
            "price": 450
          },
          {
            "roomType": "Quad",
            "price": 530
          },
          {
            "roomType": "Quint",
            "price": 610
          }
        ]
      }
    ]
  },
  {
    "id": "alharmain-sheraton-makkah",
    "name": "Sheraton Makkah",
    "city": "Makkah",
    "vendor": "Alharmain",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16 JUN 2026 TO 15 SEP 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 700
          },
          {
            "roomType": "Triple",
            "price": 800
          },
          {
            "roomType": "Quad",
            "price": 900
          }
        ]
      }
    ]
  },
  {
    "id": "alharmain-marriot-jabal-omar",
    "name": "Marriot Jabal Omar",
    "city": "Makkah",
    "vendor": "Alharmain",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "07 JUN 2026 TO 31 JUL 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 780
          },
          {
            "roomType": "Triple",
            "price": 870
          },
          {
            "roomType": "Quad",
            "price": 960
          }
        ]
      },
      {
        "range": "01 AUG 2026 TO 14 NOV 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 830
          },
          {
            "roomType": "Triple",
            "price": 920
          },
          {
            "roomType": "Quad",
            "price": 960
          }
        ]
      }
    ]
  },
  {
    "id": "emaar-royal-madinah",
    "name": "Emaar Royal",
    "city": "Madinah",
    "vendor": "Emaar Al Diyafa",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "30 JUN 2026 TO 19 AUG 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 575
          },
          {
            "roomType": "Triple",
            "price": 650
          },
          {
            "roomType": "Quad",
            "price": 725
          }
        ]
      },
      {
        "range": "19 AUG 2026 TO 16 DEC 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 675
          },
          {
            "roomType": "Triple",
            "price": 775
          },
          {
            "roomType": "Quad",
            "price": 875
          }
        ]
      },
      {
        "range": "16 DEC 2026 TO 09 JAN 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 1100
          },
          {
            "roomType": "Triple",
            "price": 1250
          },
          {
            "roomType": "Quad",
            "price": 1400
          }
        ]
      },
      {
        "range": "09 JAN 2027 TO 08 FEB 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 775
          },
          {
            "roomType": "Triple",
            "price": 875
          },
          {
            "roomType": "Quad",
            "price": 975
          }
        ]
      }
    ]
  },
  {
    "id": "emaar-elite-madinah",
    "name": "Emaar Elite",
    "city": "Madinah",
    "vendor": "Emaar Al Diyafa",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "30 JUN 2026 TO 19 AUG 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 550
          },
          {
            "roomType": "Triple",
            "price": 625
          },
          {
            "roomType": "Quad",
            "price": 700
          }
        ]
      },
      {
        "range": "19 AUG 2026 TO 16 DEC 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 650
          },
          {
            "roomType": "Triple",
            "price": 750
          },
          {
            "roomType": "Quad",
            "price": 850
          }
        ]
      },
      {
        "range": "16 DEC 2026 TO 09 JAN 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 1075
          },
          {
            "roomType": "Triple",
            "price": 1225
          },
          {
            "roomType": "Quad",
            "price": 1375
          }
        ]
      },
      {
        "range": "09 JAN 2027 TO 08 FEB 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 750
          },
          {
            "roomType": "Triple",
            "price": 850
          },
          {
            "roomType": "Quad",
            "price": 950
          }
        ]
      }
    ]
  },
  {
    "id": "emaar-el-mektan-madinah",
    "name": "Emaar El Mektan",
    "city": "Madinah",
    "vendor": "Emaar Al Diyafa",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "16 JUN 2026 TO 19 AUG 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 550
          },
          {
            "roomType": "Triple",
            "price": 625
          },
          {
            "roomType": "Quad",
            "price": 700
          },
          {
            "roomType": "Delux Suite (04 pax)",
            "price": 800
          },
          {
            "roomType": "Family Suite (05 pax)",
            "price": 820
          },
          {
            "roomType": "Royal Suite (05 pax)",
            "price": 890
          }
        ]
      },
      {
        "range": "19 AUG 2026 TO 16 DEC 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 650
          },
          {
            "roomType": "Triple",
            "price": 750
          },
          {
            "roomType": "Quad",
            "price": 850
          },
          {
            "roomType": "Delux Suite (04 pax)",
            "price": 950
          },
          {
            "roomType": "Family Suite (05 pax)",
            "price": 970
          },
          {
            "roomType": "Royal Suite (05 pax)",
            "price": 1040
          }
        ]
      },
      {
        "range": "16 DEC 2026 TO 09 JAN 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 1075
          },
          {
            "roomType": "Triple",
            "price": 1225
          },
          {
            "roomType": "Quad",
            "price": 1375
          },
          {
            "roomType": "Delux Suite (04 pax)",
            "price": 1475
          },
          {
            "roomType": "Family Suite (05 pax)",
            "price": 1495
          },
          {
            "roomType": "Royal Suite (05 pax)",
            "price": 1565
          }
        ]
      },
      {
        "range": "09 JAN 2027 TO 08 FEB 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 750
          },
          {
            "roomType": "Triple",
            "price": 850
          },
          {
            "roomType": "Quad",
            "price": 950
          },
          {
            "roomType": "Delux Suite (04 pax)",
            "price": 1050
          },
          {
            "roomType": "Family Suite (05 pax)",
            "price": 1070
          },
          {
            "roomType": "Royal Suite (05 pax)",
            "price": 1140
          }
        ]
      }
    ]
  },
  {
    "id": "emaar-taibah-madinah",
    "name": "Emaar Taibah",
    "city": "Madinah",
    "vendor": "Emaar Al Diyafa",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "30 JUN 2026 TO 19 AUG 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 380
          },
          {
            "roomType": "Triple",
            "price": 420
          },
          {
            "roomType": "Quad",
            "price": 460
          }
        ]
      },
      {
        "range": "19 AUG 2026 TO 16 DEC 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 425
          },
          {
            "roomType": "Triple",
            "price": 485
          },
          {
            "roomType": "Quad",
            "price": 545
          }
        ]
      },
      {
        "range": "16 DEC 2026 TO 09 JAN 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 600
          },
          {
            "roomType": "Triple",
            "price": 660
          },
          {
            "roomType": "Quad",
            "price": 720
          }
        ]
      },
      {
        "range": "09 JAN 2027 TO 08 FEB 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 470
          },
          {
            "roomType": "Triple",
            "price": 535
          },
          {
            "roomType": "Quad",
            "price": 600
          }
        ]
      }
    ]
  },
  {
    "id": "al-shohada-makkah",
    "name": "Al Shohada Hotel",
    "city": "Makkah",
    "vendor": "Palm Rich",
    "mealPlan": "RO",
    "stars": 5,
    "seasons": [
      {
        "range": "16 JUN 2026 TO 14 JUL 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 500
          },
          {
            "roomType": "Triple",
            "price": 590
          },
          {
            "roomType": "Quad",
            "price": 680
          }
        ]
      },
      {
        "range": "14 JUL 2026 TO 11 SEP 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 535
          },
          {
            "roomType": "Triple",
            "price": 625
          },
          {
            "roomType": "Quad",
            "price": 715
          }
        ]
      },
      {
        "range": "11 SEP 2026 TO 10 NOV 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 660
          },
          {
            "roomType": "Triple",
            "price": 750
          },
          {
            "roomType": "Quad",
            "price": 840
          }
        ]
      },
      {
        "range": "10 NOV 2026 TO 09 DEC 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 710
          },
          {
            "roomType": "Triple",
            "price": 800
          },
          {
            "roomType": "Quad",
            "price": 890
          }
        ]
      },
      {
        "range": "09 DEC 2026 TO 20 JAN 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 1260
          },
          {
            "roomType": "Triple",
            "price": 1350
          },
          {
            "roomType": "Quad",
            "price": 1440
          }
        ]
      },
      {
        "range": "20 JAN 2027 TO 07 FEB 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 710
          },
          {
            "roomType": "Triple",
            "price": 800
          },
          {
            "roomType": "Quad",
            "price": 890
          }
        ]
      }
    ]
  },
  {
    "id": "emaar-grand-makkah",
    "name": "Emaar Grand Hotel",
    "city": "Makkah",
    "vendor": "Emaar Al Diyafa",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16 JUN 2026 TO 15 JUL 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 340
          },
          {
            "roomType": "Triple",
            "price": 410
          },
          {
            "roomType": "Quad",
            "price": 480
          }
        ]
      },
      {
        "range": "15 JUL 2026 TO 12 SEP 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 375
          },
          {
            "roomType": "Triple",
            "price": 445
          },
          {
            "roomType": "Quad",
            "price": 515
          }
        ]
      },
      {
        "range": "12 SEP 2026 TO 10 DEC 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 420
          },
          {
            "roomType": "Triple",
            "price": 490
          },
          {
            "roomType": "Quad",
            "price": 560
          }
        ]
      },
      {
        "range": "10 DEC 2026 TO 21 JAN 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 745
          },
          {
            "roomType": "Triple",
            "price": 815
          },
          {
            "roomType": "Quad",
            "price": 885
          }
        ]
      },
      {
        "range": "21 JAN 2027 TO 07 FEB 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 510
          },
          {
            "roomType": "Triple",
            "price": 580
          },
          {
            "roomType": "Quad",
            "price": 650
          }
        ]
      }
    ]
  },
  {
    "id": "emaar-manar-makkah",
    "name": "Emaar Manar Hotel",
    "city": "Makkah",
    "vendor": "Emaar Al Diyafa",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "16 JUN 2026 TO 15 JUL 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 330
          },
          {
            "roomType": "Triple",
            "price": 400
          },
          {
            "roomType": "Quad",
            "price": 470
          }
        ]
      },
      {
        "range": "15 JUL 2026 TO 12 SEP 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 345
          },
          {
            "roomType": "Triple",
            "price": 415
          },
          {
            "roomType": "Quad",
            "price": 485
          }
        ]
      },
      {
        "range": "12 SEP 2026 TO 10 DEC 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 390
          },
          {
            "roomType": "Triple",
            "price": 460
          },
          {
            "roomType": "Quad",
            "price": 530
          }
        ]
      },
      {
        "range": "10 DEC 2026 TO 21 JAN 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 685
          },
          {
            "roomType": "Triple",
            "price": 755
          },
          {
            "roomType": "Quad",
            "price": 825
          }
        ]
      },
      {
        "range": "21 JAN 2027 TO 07 FEB 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 445
          },
          {
            "roomType": "Triple",
            "price": 515
          },
          {
            "roomType": "Quad",
            "price": 585
          }
        ]
      }
    ]
  },
  {
    "id": "emaar-andalusia-makkah",
    "name": "Emaar Andalusia Hotel",
    "city": "Makkah",
    "vendor": "Emaar Al Diyafa",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "16 JUN 2026 TO 15 JUL 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 330
          },
          {
            "roomType": "Triple",
            "price": 400
          },
          {
            "roomType": "Quad",
            "price": 470
          }
        ]
      },
      {
        "range": "15 JUL 2026 TO 12 SEP 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 345
          },
          {
            "roomType": "Triple",
            "price": 415
          },
          {
            "roomType": "Quad",
            "price": 485
          }
        ]
      },
      {
        "range": "12 SEP 2026 TO 10 DEC 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 390
          },
          {
            "roomType": "Triple",
            "price": 460
          },
          {
            "roomType": "Quad",
            "price": 530
          }
        ]
      },
      {
        "range": "10 DEC 2026 TO 21 JAN 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 685
          },
          {
            "roomType": "Triple",
            "price": 755
          },
          {
            "roomType": "Quad",
            "price": 825
          }
        ]
      },
      {
        "range": "21 JAN 2027 TO 07 FEB 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 445
          },
          {
            "roomType": "Triple",
            "price": 515
          },
          {
            "roomType": "Quad",
            "price": 585
          }
        ]
      }
    ]
  },
  {
    "id": "emaar-khalil-makkah",
    "name": "Emaar Khalil Hotel",
    "city": "Makkah",
    "vendor": "Emaar Al Diyafa",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "16 JUN 2026 TO 15 JUL 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 295
          },
          {
            "roomType": "Triple",
            "price": 365
          },
          {
            "roomType": "Quad",
            "price": 435
          }
        ]
      },
      {
        "range": "15 JUL 2026 TO 12 SEP 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 335
          },
          {
            "roomType": "Triple",
            "price": 405
          },
          {
            "roomType": "Quad",
            "price": 475
          }
        ]
      },
      {
        "range": "12 SEP 2026 TO 10 DEC 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 355
          },
          {
            "roomType": "Triple",
            "price": 425
          },
          {
            "roomType": "Quad",
            "price": 495
          }
        ]
      },
      {
        "range": "10 DEC 2026 TO 21 JAN 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 455
          },
          {
            "roomType": "Triple",
            "price": 525
          },
          {
            "roomType": "Quad",
            "price": 595
          }
        ]
      },
      {
        "range": "21 JAN 2027 TO 07 FEB 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 355
          },
          {
            "roomType": "Triple",
            "price": 425
          },
          {
            "roomType": "Quad",
            "price": 495
          }
        ]
      }
    ]
  },
  {
    "id": "emar-elite-makkah",
    "name": "Emar Elite Makkah",
    "city": "Makkah",
    "vendor": "Emaar Al Diyafa",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "16 JUN 2026 TO 15 JUL 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 215
          },
          {
            "roomType": "Triple",
            "price": 280
          },
          {
            "roomType": "Quad",
            "price": 345
          }
        ]
      },
      {
        "range": "15 JUL 2026 TO 12 SEP 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 240
          },
          {
            "roomType": "Triple",
            "price": 305
          },
          {
            "roomType": "Quad",
            "price": 370
          }
        ]
      },
      {
        "range": "12 SEP 2026 TO 10 DEC 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 285
          },
          {
            "roomType": "Triple",
            "price": 350
          },
          {
            "roomType": "Quad",
            "price": 415
          }
        ]
      },
      {
        "range": "10 DEC 2026 TO 21 JAN 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 390
          },
          {
            "roomType": "Triple",
            "price": 455
          },
          {
            "roomType": "Quad",
            "price": 520
          }
        ]
      },
      {
        "range": "21 JAN 2027 TO 07 FEB 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 265
          },
          {
            "roomType": "Triple",
            "price": 330
          },
          {
            "roomType": "Quad",
            "price": 395
          }
        ]
      }
    ]
  },
  {
    "id": "afaq-al-sud-makkah",
    "name": "Afaq Al Sud Hotel",
    "city": "Makkah",
    "vendor": "Emaar Al Diyafa",
    "mealPlan": "RO",
    "stars": 3,
    "seasons": [
      {
        "range": "16 JUN 2026 TO 15 JUL 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 105
          },
          {
            "roomType": "Triple",
            "price": 120
          },
          {
            "roomType": "Quad",
            "price": 135
          }
        ]
      },
      {
        "range": "15 JUL 2026 TO 12 SEP 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 130
          },
          {
            "roomType": "Triple",
            "price": 145
          },
          {
            "roomType": "Quad",
            "price": 160
          }
        ]
      },
      {
        "range": "12 SEP 2026 TO 10 DEC 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 160
          },
          {
            "roomType": "Triple",
            "price": 175
          },
          {
            "roomType": "Quad",
            "price": 190
          }
        ]
      },
      {
        "range": "10 DEC 2026 TO 21 JAN 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 260
          },
          {
            "roomType": "Triple",
            "price": 275
          },
          {
            "roomType": "Quad",
            "price": 290
          }
        ]
      },
      {
        "range": "21 JAN 2027 TO 07 FEB 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 165
          },
          {
            "roomType": "Triple",
            "price": 180
          },
          {
            "roomType": "Quad",
            "price": 195
          }
        ]
      }
    ]
  },
  {
    "id": "al-dewan-makkah",
    "name": "Al Dewan Hotel",
    "city": "Makkah",
    "vendor": "Emaar Al Diyafa",
    "mealPlan": "RO",
    "stars": 3,
    "seasons": [
      {
        "range": "16 JUN 2026 TO 15 JUL 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 105
          },
          {
            "roomType": "Triple",
            "price": 120
          },
          {
            "roomType": "Quad",
            "price": 135
          }
        ]
      },
      {
        "range": "15 JUL 2026 TO 12 SEP 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 130
          },
          {
            "roomType": "Triple",
            "price": 145
          },
          {
            "roomType": "Quad",
            "price": 160
          }
        ]
      },
      {
        "range": "12 SEP 2026 TO 10 DEC 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 160
          },
          {
            "roomType": "Triple",
            "price": 175
          },
          {
            "roomType": "Quad",
            "price": 190
          }
        ]
      },
      {
        "range": "10 DEC 2026 TO 21 JAN 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 260
          },
          {
            "roomType": "Triple",
            "price": 275
          },
          {
            "roomType": "Quad",
            "price": 290
          }
        ]
      },
      {
        "range": "21 JAN 2027 TO 07 FEB 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 165
          },
          {
            "roomType": "Triple",
            "price": 180
          },
          {
            "roomType": "Quad",
            "price": 195
          }
        ]
      }
    ]
  },
  {
    "id": "austorah-makkah",
    "name": "Austorah Hotel",
    "city": "Makkah",
    "vendor": "Emaar Al Diyafa",
    "mealPlan": "RO",
    "stars": 3,
    "seasons": [
      {
        "range": "16 JUN 2026 TO 15 JUL 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 65
          },
          {
            "roomType": "Triple",
            "price": 80
          },
          {
            "roomType": "Quad",
            "price": 95
          }
        ]
      },
      {
        "range": "15 JUL 2026 TO 12 SEP 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 80
          },
          {
            "roomType": "Triple",
            "price": 95
          },
          {
            "roomType": "Quad",
            "price": 110
          }
        ]
      },
      {
        "range": "12 SEP 2026 TO 10 DEC 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 90
          },
          {
            "roomType": "Triple",
            "price": 105
          },
          {
            "roomType": "Quad",
            "price": 120
          }
        ]
      },
      {
        "range": "10 DEC 2026 TO 21 JAN 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 160
          },
          {
            "roomType": "Triple",
            "price": 175
          },
          {
            "roomType": "Quad",
            "price": 190
          }
        ]
      },
      {
        "range": "21 JAN 2027 TO 07 FEB 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 90
          },
          {
            "roomType": "Triple",
            "price": 105
          },
          {
            "roomType": "Quad",
            "price": 120
          }
        ]
      }
    ]
  },
  {
    "id": "emaar-al-noor-makkah",
    "name": "Emaar Al Noor Hotel",
    "city": "Makkah",
    "vendor": "Emaar Al Diyafa",
    "mealPlan": "RO",
    "stars": 3,
    "seasons": [
      {
        "range": "16 JUN 2026 TO 15 JUL 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 65
          },
          {
            "roomType": "Triple",
            "price": 80
          },
          {
            "roomType": "Quad",
            "price": 95
          }
        ]
      },
      {
        "range": "15 JUL 2026 TO 12 SEP 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 75
          },
          {
            "roomType": "Triple",
            "price": 90
          },
          {
            "roomType": "Quad",
            "price": 105
          }
        ]
      },
      {
        "range": "12 SEP 2026 TO 10 DEC 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 85
          },
          {
            "roomType": "Triple",
            "price": 100
          },
          {
            "roomType": "Quad",
            "price": 115
          }
        ]
      },
      {
        "range": "10 DEC 2026 TO 21 JAN 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 150
          },
          {
            "roomType": "Triple",
            "price": 165
          },
          {
            "roomType": "Quad",
            "price": 180
          }
        ]
      },
      {
        "range": "21 JAN 2027 TO 07 FEB 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 85
          },
          {
            "roomType": "Triple",
            "price": 100
          },
          {
            "roomType": "Quad",
            "price": 115
          }
        ]
      }
    ]
  },
  {
    "id": "emaar-international-makkah",
    "name": "Emaar International Hotel",
    "city": "Makkah",
    "vendor": "Emaar Al Diyafa",
    "mealPlan": "RO",
    "stars": 3,
    "seasons": [
      {
        "range": "12 SEP 2026 TO 10 DEC 2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 75
          },
          {
            "roomType": "Triple",
            "price": 90
          },
          {
            "roomType": "Quad",
            "price": 105
          }
        ]
      },
      {
        "range": "10 DEC 2026 TO 21 JAN 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 120
          },
          {
            "roomType": "Triple",
            "price": 135
          },
          {
            "roomType": "Quad",
            "price": 150
          }
        ]
      },
      {
        "range": "21 JAN 2027 TO 07 FEB 2027",
        "prices": [
          {
            "roomType": "Double",
            "price": 85
          },
          {
            "roomType": "Triple",
            "price": 100
          },
          {
            "roomType": "Quad",
            "price": 115
          }
        ]
      }
    ]
  },
  {
    "id": "wahat-al-diyafah",
    "name": "Wahat Al Diyafah",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 3,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 260
          },
          {
            "roomType": "Triple",
            "price": 290
          },
          {
            "roomType": "Quad",
            "price": 340
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 290
          },
          {
            "roomType": "Triple",
            "price": 340
          },
          {
            "roomType": "Quad",
            "price": 380
          }
        ]
      }
    ]
  },
  {
    "id": "elaf-golden",
    "name": "Elaf Golden",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 380
          },
          {
            "roomType": "Triple",
            "price": 430
          },
          {
            "roomType": "Quad",
            "price": 470
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 430
          },
          {
            "roomType": "Triple",
            "price": 470
          },
          {
            "roomType": "Quad",
            "price": 500
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 460
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 540
          }
        ]
      }
    ]
  },
  {
    "id": "elaf-diamond",
    "name": "Elaf Diamond",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 400
          },
          {
            "roomType": "Triple",
            "price": 445
          },
          {
            "roomType": "Quad",
            "price": 490
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 470
          },
          {
            "roomType": "Triple",
            "price": 525
          },
          {
            "roomType": "Quad",
            "price": 570
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 500
          },
          {
            "roomType": "Triple",
            "price": 545
          },
          {
            "roomType": "Quad",
            "price": 590
          }
        ]
      }
    ]
  },
  {
    "id": "elaf-rayyan",
    "name": "Elaf Rayyan",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 430
          },
          {
            "roomType": "Triple",
            "price": 475
          },
          {
            "roomType": "Quad",
            "price": 520
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 500
          },
          {
            "roomType": "Triple",
            "price": 550
          },
          {
            "roomType": "Quad",
            "price": 600
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 525
          },
          {
            "roomType": "Triple",
            "price": 575
          },
          {
            "roomType": "Quad",
            "price": 625
          }
        ]
      }
    ]
  },
  {
    "id": "snood-ajyad-alharmain",
    "name": "Snood Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 3,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 430
          },
          {
            "roomType": "Triple",
            "price": 480
          },
          {
            "roomType": "Quad",
            "price": 530
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 500
          },
          {
            "roomType": "Triple",
            "price": 550
          },
          {
            "roomType": "Quad",
            "price": 600
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 525
          },
          {
            "roomType": "Triple",
            "price": 575
          },
          {
            "roomType": "Quad",
            "price": 625
          }
        ]
      }
    ]
  },
  {
    "id": "elaf-al-khair",
    "name": "Elaf Al Khair",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 500
          },
          {
            "roomType": "Triple",
            "price": 550
          },
          {
            "roomType": "Quad",
            "price": 600
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 525
          },
          {
            "roomType": "Triple",
            "price": 575
          },
          {
            "roomType": "Quad",
            "price": 625
          }
        ]
      }
    ]
  },
  {
    "id": "marsa-al-jariyah",
    "name": "Marsa Al Jariyah",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 3,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 500
          },
          {
            "roomType": "Triple",
            "price": 550
          },
          {
            "roomType": "Quad",
            "price": 600
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 530
          },
          {
            "roomType": "Triple",
            "price": 580
          },
          {
            "roomType": "Quad",
            "price": 630
          }
        ]
      }
    ]
  },
  {
    "id": "azka-asafa",
    "name": "Azka Asafa",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 570
          },
          {
            "roomType": "Triple",
            "price": 620
          },
          {
            "roomType": "Quad",
            "price": 680
          }
        ]
      }
    ]
  },
  {
    "id": "azka-al-maqom",
    "name": "Azka Al Maqom",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 600
          },
          {
            "roomType": "Triple",
            "price": 680
          },
          {
            "roomType": "Quad",
            "price": 740
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 650
          },
          {
            "roomType": "Triple",
            "price": 750
          },
          {
            "roomType": "Quad",
            "price": 850
          }
        ]
      },
      {
        "range": "01/08/2026 TO 01/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 700
          },
          {
            "roomType": "Triple",
            "price": 800
          },
          {
            "roomType": "Quad",
            "price": 900
          }
        ]
      }
    ]
  },
  {
    "id": "olayan-ajyad-alharmain",
    "name": "Olayan Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 600
          },
          {
            "roomType": "Triple",
            "price": 700
          },
          {
            "roomType": "Quad",
            "price": 800
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 725
          },
          {
            "roomType": "Triple",
            "price": 825
          },
          {
            "roomType": "Quad",
            "price": 925
          }
        ]
      },
      {
        "range": "01/08/2026 TO 01/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 775
          },
          {
            "roomType": "Triple",
            "price": 875
          },
          {
            "roomType": "Quad",
            "price": 975
          }
        ]
      }
    ]
  },
  {
    "id": "sofwah-tower-3",
    "name": "Sofwah Tower 3",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 5,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 900
          },
          {
            "roomType": "Triple",
            "price": 1100
          },
          {
            "roomType": "Quad",
            "price": 1300
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1000
          },
          {
            "roomType": "Triple",
            "price": 1200
          },
          {
            "roomType": "Quad",
            "price": 1400
          }
        ]
      }
    ]
  },
  {
    "id": "elaf-al-bayit",
    "name": "Elaf Al Bayit",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 600
          },
          {
            "roomType": "Triple",
            "price": 675
          },
          {
            "roomType": "Quad",
            "price": 750
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 625
          },
          {
            "roomType": "Triple",
            "price": 725
          },
          {
            "roomType": "Quad",
            "price": 825
          }
        ]
      },
      {
        "range": "01/08/2026 TO 01/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 650
          },
          {
            "roomType": "Triple",
            "price": 750
          },
          {
            "roomType": "Quad",
            "price": 850
          }
        ]
      }
    ]
  },
  {
    "id": "frontel-al-haritzia",
    "name": "Frontel Al Haritzia",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 5,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 800
          },
          {
            "roomType": "Triple",
            "price": 950
          },
          {
            "roomType": "Quad",
            "price": 1100
          }
        ]
      }
    ]
  },
  {
    "id": "grand-plaza-badr-maqom-alharmain",
    "name": "Grand Plaza Badr Maqom",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 570
          },
          {
            "roomType": "Triple",
            "price": 650
          },
          {
            "roomType": "Quad",
            "price": 730
          }
        ]
      }
    ]
  },
  {
    "id": "grand-plaza-madina-alharmain",
    "name": "Grand Plaza Madina",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 530
          },
          {
            "roomType": "Triple",
            "price": 600
          },
          {
            "roomType": "Quad",
            "price": 670
          }
        ]
      }
    ]
  },
  {
    "id": "jiwar-al-saha",
    "name": "Jiwar Al Saha",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 14/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 510
          },
          {
            "roomType": "Triple",
            "price": 560
          },
          {
            "roomType": "Quad",
            "price": 610
          }
        ]
      }
    ]
  },
  {
    "id": "shaza-regency",
    "name": "Shaza Regency",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 5,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 550
          },
          {
            "roomType": "Triple",
            "price": 630
          },
          {
            "roomType": "Quad",
            "price": 710
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-rehab-al-misk-alharmain",
    "name": "Maysan Rehab Al Misk",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 480
          },
          {
            "roomType": "Triple",
            "price": 540
          },
          {
            "roomType": "Quad",
            "price": 600
          }
        ]
      }
    ]
  },
  {
    "id": "arkan-al-manar-alharmain",
    "name": "Arkan Al Manar",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 480
          },
          {
            "roomType": "Triple",
            "price": 540
          },
          {
            "roomType": "Quad",
            "price": 600
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-taqwa-alharmain",
    "name": "Maysan Al Taqwa",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 410
          },
          {
            "roomType": "Triple",
            "price": 460
          },
          {
            "roomType": "Quad",
            "price": 500
          }
        ]
      }
    ]
  },
  ...newRowaHotels,
  ...newAlharmainHotels,
  {
    "id": "elaf-al-bait-akuw",
    "name": "Elaf Al Bait",
    "city": "Makkah",
    "vendor": "AKUW",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 550
          },
          {
            "roomType": "Triple",
            "price": 625
          },
          {
            "roomType": "Quad",
            "price": 700
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 575
          },
          {
            "roomType": "Triple",
            "price": 675
          },
          {
            "roomType": "Quad",
            "price": 775
          }
        ]
      },
      {
        "range": "01/08/2026 TO 01/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 600
          },
          {
            "roomType": "Triple",
            "price": 700
          },
          {
            "roomType": "Quad",
            "price": 800
          }
        ]
      }
    ]
  },
  {
    "id": "marsa-jaria-akuw",
    "name": "Marsa Jaria",
    "city": "Makkah",
    "vendor": "AKUW",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 400
          },
          {
            "roomType": "Triple",
            "price": 450
          },
          {
            "roomType": "Quad",
            "price": 500
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 480
          },
          {
            "roomType": "Triple",
            "price": 530
          },
          {
            "roomType": "Quad",
            "price": 580
          }
        ]
      }
    ]
  },
  {
    "id": "kunuz-ajyad-akuw",
    "name": "Kunuz Ajyad",
    "city": "Makkah",
    "vendor": "AKUW",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 390
          },
          {
            "roomType": "Triple",
            "price": 435
          },
          {
            "roomType": "Quad",
            "price": 480
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 440
          },
          {
            "roomType": "Triple",
            "price": 485
          },
          {
            "roomType": "Quad",
            "price": 530
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 470
          },
          {
            "roomType": "Triple",
            "price": 515
          },
          {
            "roomType": "Quad",
            "price": 560
          }
        ]
      }
    ]
  },
  {
    "id": "elaf-rayyan-akuw",
    "name": "Elaf Rayyan",
    "city": "Makkah",
    "vendor": "AKUW",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 380
          },
          {
            "roomType": "Triple",
            "price": 425
          },
          {
            "roomType": "Quad",
            "price": 470
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 475
          },
          {
            "roomType": "Triple",
            "price": 525
          },
          {
            "roomType": "Quad",
            "price": 575
          }
        ]
      }
    ]
  },
  {
    "id": "elaf-al-khair-akuw",
    "name": "Elaf Al Khair",
    "city": "Makkah",
    "vendor": "AKUW",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 400
          },
          {
            "roomType": "Triple",
            "price": 450
          },
          {
            "roomType": "Quad",
            "price": 500
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 475
          },
          {
            "roomType": "Triple",
            "price": 525
          },
          {
            "roomType": "Quad",
            "price": 575
          }
        ]
      }
    ]
  },
  {
    "id": "elaf-diamond-akuw",
    "name": "Elaf Diamond",
    "city": "Makkah",
    "vendor": "AKUW",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 350
          },
          {
            "roomType": "Triple",
            "price": 395
          },
          {
            "roomType": "Quad",
            "price": 440
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 420
          },
          {
            "roomType": "Triple",
            "price": 475
          },
          {
            "roomType": "Quad",
            "price": 520
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 495
          },
          {
            "roomType": "Quad",
            "price": 540
          }
        ]
      }
    ]
  },
  {
    "id": "elaf-golden-akuw",
    "name": "Elaf Golden",
    "city": "Makkah",
    "vendor": "AKUW",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 330
          },
          {
            "roomType": "Triple",
            "price": 370
          },
          {
            "roomType": "Quad",
            "price": 420
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 380
          },
          {
            "roomType": "Triple",
            "price": 420
          },
          {
            "roomType": "Quad",
            "price": 460
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 410
          },
          {
            "roomType": "Triple",
            "price": 450
          },
          {
            "roomType": "Quad",
            "price": 490
          }
        ]
      }
    ]
  },
  {
    "id": "elaf-noor-akuw",
    "name": "Elaf Noor",
    "city": "Makkah",
    "vendor": "AKUW",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "01/07/2026 TO 01/10/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 150
          },
          {
            "roomType": "Triple",
            "price": 185
          },
          {
            "roomType": "Quad",
            "price": 220
          }
        ]
      }
    ]
  },
  {
    "id": "safwah-tower-3-akuw",
    "name": "Safwah Tower 3",
    "city": "Makkah",
    "vendor": "AKUW",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 850
          },
          {
            "roomType": "Triple",
            "price": 1050
          },
          {
            "roomType": "Quad",
            "price": 1250
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 950
          },
          {
            "roomType": "Triple",
            "price": 1150
          },
          {
            "roomType": "Quad",
            "price": 1350
          }
        ]
      }
    ]
  },
  {
    "id": "olayan-ajyad-akuw",
    "name": "Olayan Ajyad",
    "city": "Makkah",
    "vendor": "AKUW",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 550
          },
          {
            "roomType": "Triple",
            "price": 650
          },
          {
            "roomType": "Quad",
            "price": 750
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 675
          },
          {
            "roomType": "Triple",
            "price": 775
          },
          {
            "roomType": "Quad",
            "price": 875
          }
        ]
      },
      {
        "range": "01/08/2026 TO 01/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 725
          },
          {
            "roomType": "Triple",
            "price": 825
          },
          {
            "roomType": "Quad",
            "price": 925
          }
        ]
      }
    ]
  },
  {
    "id": "azka-maqam-akuw",
    "name": "Azka Maqam",
    "city": "Makkah",
    "vendor": "AKUW",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 550
          },
          {
            "roomType": "Triple",
            "price": 620
          },
          {
            "roomType": "Quad",
            "price": 690
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 600
          },
          {
            "roomType": "Triple",
            "price": 700
          },
          {
            "roomType": "Quad",
            "price": 800
          }
        ]
      },
      {
        "range": "01/08/2026 TO 01/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 650
          },
          {
            "roomType": "Triple",
            "price": 750
          },
          {
            "roomType": "Quad",
            "price": 850
          }
        ]
      }
    ]
  },
  {
    "id": "azka-safa-akuw",
    "name": "Azka Safa",
    "city": "Makkah",
    "vendor": "AKUW",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 520
          },
          {
            "roomType": "Triple",
            "price": 570
          },
          {
            "roomType": "Quad",
            "price": 620
          }
        ]
      }
    ]
  },
  {
    "id": "snood-ajyad-akuw",
    "name": "Snood Ajyad",
    "city": "Makkah",
    "vendor": "AKUW",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 380
          },
          {
            "roomType": "Triple",
            "price": 430
          },
          {
            "roomType": "Quad",
            "price": 480
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 475
          },
          {
            "roomType": "Triple",
            "price": 525
          },
          {
            "roomType": "Quad",
            "price": 575
          }
        ]
      }
    ]
  },
  {
    "id": "waha-diafa-akuw",
    "name": "Waha Diafa",
    "city": "Makkah",
    "vendor": "AKUW",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 210
          },
          {
            "roomType": "Triple",
            "price": 240
          },
          {
            "roomType": "Quad",
            "price": 290
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 250
          },
          {
            "roomType": "Triple",
            "price": 290
          },
          {
            "roomType": "Quad",
            "price": 330
          }
        ]
      }
    ]
  },
  {
    "id": "olayan-ajyad-darmawisata",
    "name": "Olayan Ajyad",
    "city": "Makkah",
    "vendor": "Darmawisata",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 595
          },
          {
            "roomType": "Triple",
            "price": 695
          },
          {
            "roomType": "Quad",
            "price": 795
          }
        ]
      }
    ]
  },
  {
    "id": "al-masa-grand-makkah-darmawisata",
    "name": "AL Masa Grand Makkah",
    "city": "Makkah",
    "vendor": "Darmawisata",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 31/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 420
          },
          {
            "roomType": "Triple",
            "price": 470
          },
          {
            "roomType": "Quad",
            "price": 520
          }
        ]
      }
    ]
  },
  {
    "id": "azka-al-maqam-hotel-darmawisata",
    "name": "Azka Al Maqam Hotel",
    "city": "Makkah",
    "vendor": "Darmawisata",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 580
          },
          {
            "roomType": "Triple",
            "price": 650
          },
          {
            "roomType": "Quad",
            "price": 720
          }
        ]
      }
    ]
  },
  {
    "id": "al-massa-dar-al-fayzeen-hotel-darmawisata",
    "name": "Al Massa Dar Al Fayzeen Hotel",
    "city": "Makkah",
    "vendor": "Darmawisata",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 390
          },
          {
            "roomType": "Triple",
            "price": 440
          },
          {
            "roomType": "Quad",
            "price": 480
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-safa-jarwal-darmawisata",
    "name": "Maysan AL Safa Jarwal",
    "city": "Makkah",
    "vendor": "Darmawisata",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 150
          },
          {
            "roomType": "Triple",
            "price": 190
          },
          {
            "roomType": "Quad",
            "price": 230
          }
        ]
      }
    ]
  },
  {
    "id": "snood-al-rayyan-darmawisata",
    "name": "Snood Al Rayyan",
    "city": "Makkah",
    "vendor": "Darmawisata",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 190
          },
          {
            "roomType": "Triple",
            "price": 230
          },
          {
            "roomType": "Quad",
            "price": 270
          }
        ]
      }
    ]
  },
  {
    "id": "olayan-grand-ex-rawdat-al-bait-darmawisata",
    "name": "Olayan Grand - Ex.Rawdat Al bait",
    "city": "Makkah",
    "vendor": "Darmawisata",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 31/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 195
          },
          {
            "roomType": "Triple",
            "price": 235
          },
          {
            "roomType": "Quad",
            "price": 275
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-multazem-darmawisata",
    "name": "Maysan AL Multazem",
    "city": "Makkah",
    "vendor": "Darmawisata",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "16/06/2026 TO 16/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 185
          },
          {
            "roomType": "Triple",
            "price": 230
          },
          {
            "roomType": "Quad",
            "price": 275
          }
        ]
      }
    ]
  },
  {
    "id": "taiba-front-darmawisata",
    "name": "Taiba Front",
    "city": "Madinah",
    "vendor": "Darmawisata",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "30/06/2026 TO 14/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 730
          },
          {
            "roomType": "Triple",
            "price": 855
          },
          {
            "roomType": "Quad",
            "price": 980
          }
        ]
      }
    ]
  },
  {
    "id": "dallah-taibah-darmawisata",
    "name": "Dallah Taibah",
    "city": "Madinah",
    "vendor": "Darmawisata",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "01/07/2026 TO 20/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 765
          },
          {
            "roomType": "Triple",
            "price": 910
          },
          {
            "roomType": "Quad",
            "price": 1055
          }
        ]
      }
    ]
  },
  {
    "id": "kayan-international-hotel-darmawisata",
    "name": "Kayan International Hotel",
    "city": "Madinah",
    "vendor": "Darmawisata",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "30/06/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 410
          },
          {
            "roomType": "Triple",
            "price": 450
          },
          {
            "roomType": "Quad",
            "price": 490
          }
        ]
      }
    ]
  },
  {
    "id": "odst-darmawisata",
    "name": "Odst",
    "city": "Madinah",
    "vendor": "Darmawisata",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "30/06/2026 TO 14/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 495
          },
          {
            "roomType": "Quad",
            "price": 540
          }
        ]
      }
    ]
  },
  {
    "id": "jawharat-al-rasheed-hotel-darmawisata",
    "name": "Jawharat Al Rasheed Hotel",
    "city": "Madinah",
    "vendor": "Darmawisata",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "30/06/2026 TO 31/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 400
          },
          {
            "roomType": "Triple",
            "price": 440
          },
          {
            "roomType": "Quad",
            "price": 480
          }
        ]
      }
    ]
  },
  {
    "id": "astoneast-taiba-hotel-ex-artal-international-darmawisata",
    "name": "ASTONEAST TAIBA HOTEL (ex Artal International)",
    "city": "Madinah",
    "vendor": "Darmawisata",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "30/06/2026 TO 15/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 390
          },
          {
            "roomType": "Triple",
            "price": 430
          },
          {
            "roomType": "Quad",
            "price": 470
          }
        ]
      }
    ]
  },
  {
    "id": "al-mukhtara-al-gharbi-darmawisata",
    "name": "Al Mukhtara Al Gharbi",
    "city": "Madinah",
    "vendor": "Darmawisata",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "30/06/2026 TO 14/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 350
          },
          {
            "roomType": "Triple",
            "price": 390
          },
          {
            "roomType": "Quad",
            "price": 430
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-altaqwa-darmawisata",
    "name": "MAYSAN ALTAQWA",
    "city": "Madinah",
    "vendor": "Darmawisata",
    "mealPlan": "FB",
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 370
          },
          {
            "roomType": "Triple",
            "price": 420
          },
          {
            "roomType": "Quad",
            "price": 470
          }
        ]
      }
    ]
  },
  {
    "id": "movenpick-makkah-konoz",
    "name": "Movenpick Makkah",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 950
          },
          {
            "roomType": "Triple",
            "price": 1150
          },
          {
            "roomType": "Quad",
            "price": 1350
          }
        ]
      }
    ]
  },
  {
    "id": "pullman-zamzam-konoz",
    "name": "Pullman Zamzam",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 950
          },
          {
            "roomType": "Triple",
            "price": 1150
          },
          {
            "roomType": "Quad",
            "price": 1350
          }
        ]
      }
    ]
  },
  {
    "id": "olayan-ajyad-konoz",
    "name": "Olayan Ajyad",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 575
          },
          {
            "roomType": "Triple",
            "price": 675
          },
          {
            "roomType": "Quad",
            "price": 775
          }
        ]
      },
      {
        "range": "01/08/2026 TO 05/10/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 670
          },
          {
            "roomType": "Triple",
            "price": 770
          },
          {
            "roomType": "Quad",
            "price": 870
          }
        ]
      }
    ]
  },
  {
    "id": "prestige-ajyad-konoz",
    "name": "Prestige Ajyad",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 580
          },
          {
            "roomType": "Triple",
            "price": 680
          },
          {
            "roomType": "Quad",
            "price": 780
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-mashaer-konoz",
    "name": "Maysan Al Mashaer",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 520
          },
          {
            "roomType": "Triple",
            "price": 610
          },
          {
            "roomType": "Quad",
            "price": 700
          }
        ]
      }
    ]
  },
  {
    "id": "azka-al-maqam-konoz",
    "name": "Azka Al Maqam",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "20/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 550
          },
          {
            "roomType": "Triple",
            "price": 620
          },
          {
            "roomType": "Quad",
            "price": 690
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 600
          },
          {
            "roomType": "Triple",
            "price": 690
          },
          {
            "roomType": "Quad",
            "price": 780
          }
        ]
      },
      {
        "range": "01/08/2026 TO 01/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 630
          },
          {
            "roomType": "Triple",
            "price": 730
          },
          {
            "roomType": "Quad",
            "price": 820
          }
        ]
      }
    ]
  },
  {
    "id": "azka-al-safa-konoz",
    "name": "Azka Al Safa",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "20/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 520
          },
          {
            "roomType": "Triple",
            "price": 570
          },
          {
            "roomType": "Quad",
            "price": 620
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 550
          },
          {
            "roomType": "Triple",
            "price": 625
          },
          {
            "roomType": "Quad",
            "price": 700
          }
        ]
      },
      {
        "range": "01/08/2026 TO 01/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 580
          },
          {
            "roomType": "Triple",
            "price": 665
          },
          {
            "roomType": "Quad",
            "price": 750
          }
        ]
      }
    ]
  },
  {
    "id": "al-massa-grand-konoz",
    "name": "Al Massa Grand",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      }
    ]
  },
  {
    "id": "al-massa-dar-al-fayzeen-konoz",
    "name": "Al Massa Dar Al Fayzeen",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 420
          },
          {
            "roomType": "Triple",
            "price": 470
          },
          {
            "roomType": "Quad",
            "price": 520
          }
        ]
      }
    ]
  },
  {
    "id": "snood-ajyad-konoz",
    "name": "Snood Ajyad",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 495
          },
          {
            "roomType": "Quad",
            "price": 540
          }
        ]
      }
    ]
  },
  {
    "id": "sawaed-al-khair-konoz",
    "name": "Sawaed Al Khair",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 420
          },
          {
            "roomType": "Triple",
            "price": 465
          },
          {
            "roomType": "Quad",
            "price": 510
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-maqam-konoz",
    "name": "Maysan Al Maqam",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      }
    ]
  },
  {
    "id": "nada-ajyad-konoz",
    "name": "Nada Ajyad",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 350
          },
          {
            "roomType": "Triple",
            "price": 395
          },
          {
            "roomType": "Quad",
            "price": 440
          }
        ]
      }
    ]
  },
  {
    "id": "talal-ajyad-konoz",
    "name": "Talal Ajyad",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 310
          },
          {
            "roomType": "Triple",
            "price": 355
          },
          {
            "roomType": "Quad",
            "price": 400
          }
        ]
      }
    ]
  },
  {
    "id": "badr-al-massah-konoz",
    "name": "Badr Al Massah",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 270
          },
          {
            "roomType": "Triple",
            "price": 315
          },
          {
            "roomType": "Quad",
            "price": 360
          }
        ]
      }
    ]
  },
  {
    "id": "nawazi-towers-konoz",
    "name": "Nawazi Towers",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 190
          },
          {
            "roomType": "Triple",
            "price": 235
          },
          {
            "roomType": "Quad",
            "price": 280
          }
        ]
      }
    ]
  },
  {
    "id": "snood-al-rayyan-konoz",
    "name": "Snood Al Rayyan",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 170
          },
          {
            "roomType": "Triple",
            "price": 210
          },
          {
            "roomType": "Quad",
            "price": 250
          }
        ]
      }
    ]
  },
  {
    "id": "al-barakah-mawddah-konoz",
    "name": "Al Barakah Mawddah",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 380
          },
          {
            "roomType": "Triple",
            "price": 420
          },
          {
            "roomType": "Quad",
            "price": 460
          }
        ]
      }
    ]
  },
  {
    "id": "maather-al-jiwaar-konoz",
    "name": "Maather Al Jiwaar",
    "city": "Makkah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 250
          },
          {
            "roomType": "Triple",
            "price": 290
          },
          {
            "roomType": "Quad",
            "price": 330
          }
        ]
      }
    ]
  },
  {
    "id": "durrat-al-madinah-konoz",
    "name": "Durrat Al Madinah",
    "city": "Madinah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Quad",
            "price": 530
          }
        ]
      }
    ]
  },
  {
    "id": "ruaa-international-konoz",
    "name": "Ruaa International",
    "city": "Madinah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 490
          },
          {
            "roomType": "Triple",
            "price": 535
          },
          {
            "roomType": "Quad",
            "price": 580
          }
        ]
      }
    ]
  },
  {
    "id": "kayan-international-konoz",
    "name": "Kayan International",
    "city": "Madinah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 470
          },
          {
            "roomType": "Triple",
            "price": 515
          },
          {
            "roomType": "Quad",
            "price": 560
          }
        ]
      }
    ]
  },
  {
    "id": "al-madinah-azhar-salsabil-konoz",
    "name": "Al Madinah Azhar Salsabil",
    "city": "Madinah",
    "vendor": "Konoz",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 360
          },
          {
            "roomType": "Triple",
            "price": 405
          },
          {
            "roomType": "Quad",
            "price": 460
          }
        ]
      }
    ]
  },
  {
    "id": "pullman-zamzam-makkah-darmawisata",
    "name": "Pullman Zamzam Makkah",
    "city": "Makkah",
    "vendor": "PT. Darmawisata Indonesia",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 980
          },
          {
            "roomType": "Triple",
            "price": 1190
          },
          {
            "roomType": "Quad",
            "price": 1400
          }
        ]
      }
    ]
  },
  {
    "id": "le-meridien-makkah-darmawisata",
    "name": "Le Meridien Makkah",
    "city": "Makkah",
    "vendor": "PT. Darmawisata Indonesia",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "01/07/2026 TO 01/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 630
          },
          {
            "roomType": "Triple",
            "price": 815
          },
          {
            "roomType": "Quad",
            "price": 950
          }
        ]
      }
    ]
  },
  {
    "id": "villa-hilton-makkah-darmawisata",
    "name": "VILLA HILTON",
    "city": "Makkah",
    "vendor": "PT. Darmawisata Indonesia",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "01/06/2026 TO 15/12/2026",
        "prices": [
          {
            "roomType": "Per Bed",
            "price": 220
          }
        ]
      }
    ]
  },
  {
    "id": "movenpick-makkah-darmawisata",
    "name": "Movenpick Makkah",
    "city": "Makkah",
    "vendor": "PT. Darmawisata Indonesia",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "16/06/2026 TO 19/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 980
          },
          {
            "roomType": "Triple",
            "price": 1190
          },
          {
            "roomType": "Quad",
            "price": 1000
          }
        ]
      }
    ]
  },
  {
    "id": "maden-taiba-hotel-darmawisata",
    "name": "Maden Taiba Hotel",
    "city": "Madinah",
    "vendor": "PT. Darmawisata Indonesia",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "25/06/2026 TO 14/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 880
          },
          {
            "roomType": "Triple",
            "price": 1040
          },
          {
            "roomType": "Quad",
            "price": 1200
          }
        ]
      }
    ]
  },
  {
    "id": "millineum-al-aqeeq-darmawisata",
    "name": "Millineum Al Aqeeq",
    "city": "Madinah",
    "vendor": "PT. Darmawisata Indonesia",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "30/06/2026 TO 14/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 780
          },
          {
            "roomType": "Triple",
            "price": 915
          },
          {
            "roomType": "Quad",
            "price": 1050
          }
        ]
      }
    ]
  },
  {
    "id": "dar-al-eiman-al-haram-hotel-darmawisata",
    "name": "Dar Al Eiman Al Haram Hotel",
    "city": "Madinah",
    "vendor": "PT. Darmawisata Indonesia",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "30/06/2026 TO 15/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 830
          },
          {
            "roomType": "Triple",
            "price": 965
          },
          {
            "roomType": "Quad",
            "price": 1100
          }
        ]
      }
    ]
  },
  {
    "id": "al-harithia-madinah",
    "name": "The Venue Al Harithia",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "23/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 750
          },
          {
            "roomType": "Triple",
            "price": 900
          },
          {
            "roomType": "Quad",
            "price": 1050
          },
          {
            "roomType": "Junior suite (2 Pax)",
            "price": 900
          },
          {
            "roomType": "Executive Suite (2 Rooms 4 Pax)",
            "price": 1550
          },
          {
            "roomType": "Royal Suite (2 Rooms 4 Pax)",
            "price": 2150
          }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 800
          },
          {
            "roomType": "Triple",
            "price": 950
          },
          {
            "roomType": "Quad",
            "price": 1100
          },
          {
            "roomType": "Junior suite (2 Pax)",
            "price": 950
          },
          {
            "roomType": "Executive Suite (2 Rooms 4 Pax)",
            "price": 1600
          },
          {
            "roomType": "Royal Suite (2 Rooms 4 Pax)",
            "price": 2200
          }
        ]
      }
    ]
  },
  {
    "id": "grand-plaza-badr-almaqam-madinah",
    "name": "Grand Plaza Badr Almaqam",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "26/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 520
          },
          {
            "roomType": "Triple",
            "price": 600
          },
          {
            "roomType": "Quad",
            "price": 680
          }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 550
          },
          {
            "roomType": "Triple",
            "price": 630
          },
          {
            "roomType": "Quad",
            "price": 710
          }
        ]
      }
    ]
  },
  {
    "id": "shaza-regency-plaza-madinah",
    "name": "Shaza Regency Plaza",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "27/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 500
          },
          {
            "roomType": "Triple",
            "price": 580
          },
          {
            "roomType": "Quad",
            "price": 660
          }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 530
          },
          {
            "roomType": "Triple",
            "price": 610
          },
          {
            "roomType": "Quad",
            "price": 690
          }
        ]
      }
    ]
  },
  {
    "id": "grand-plaza-almadina-madinah",
    "name": "Grand Plaza Almadina",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "26/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 480
          },
          {
            "roomType": "Triple",
            "price": 550
          },
          {
            "roomType": "Quad",
            "price": 620
          }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 500
          },
          {
            "roomType": "Triple",
            "price": 570
          },
          {
            "roomType": "Quad",
            "price": 640
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-rehab-elmysk-madinah",
    "name": "Maysan Rehab Elmysk",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 430
          },
          {
            "roomType": "Triple",
            "price": 490
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 455
          },
          {
            "roomType": "Triple",
            "price": 515
          },
          {
            "roomType": "Quad",
            "price": 575
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-rotana-elmysk-madinah",
    "name": "Maysan Rotana Elmysk",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "15/07/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 430
          },
          {
            "roomType": "Triple",
            "price": 490
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 455
          },
          {
            "roomType": "Triple",
            "price": 515
          },
          {
            "roomType": "Quad",
            "price": 575
          }
        ]
      }
    ]
  },
  {
    "id": "arkan-almanar-madinah",
    "name": "Arkan Almanar",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 430
          },
          {
            "roomType": "Triple",
            "price": 490
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 455
          },
          {
            "roomType": "Triple",
            "price": 515
          },
          {
            "roomType": "Quad",
            "price": 575
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-altaqwa-madinah",
    "name": "Maysan Altaqwa",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "23/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 360
          },
          {
            "roomType": "Triple",
            "price": 410
          },
          {
            "roomType": "Quad",
            "price": 460
          }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 390
          },
          {
            "roomType": "Triple",
            "price": 440
          },
          {
            "roomType": "Quad",
            "price": 490
          }
        ]
      }
    ]
  },
  {
    "id": "plaza-inn-ohud-madinah",
    "name": "Plaza Inn Ohud",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "26/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 335
          },
          {
            "roomType": "Triple",
            "price": 385
          },
          {
            "roomType": "Quad",
            "price": 435
          }
        ]
      },
      {
        "range": "20/09/2026 TO 22/10/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 355
          },
          {
            "roomType": "Triple",
            "price": 405
          },
          {
            "roomType": "Quad",
            "price": 455
          }
        ]
      }
    ]
  },
  {
    "id": "dar-al-taqwa-maysan-madinah",
    "name": "Dar Al Taqwa",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "BB",
    "stars": 5,
    "seasons": [
      {
        "range": "05/06/2026 TO 30/08/2026",
        "prices": [
          {
            "roomType": "Double (City View - Weekdays)",
            "price": 945
          },
          {
            "roomType": "Double (City View - Weekend)",
            "price": 1010
          },
          {
            "roomType": "Standard Double (Haram View - Weekdays)",
            "price": 1075
          },
          {
            "roomType": "Standard Double (Haram View - Weekend)",
            "price": 1135
          },
          {
            "roomType": "Business Suite (Weekdays)",
            "price": 1640
          },
          {
            "roomType": "Business Suite (Weekend)",
            "price": 1765
          },
          {
            "roomType": "Business Junior Suite (Weekdays)",
            "price": 1890
          },
          {
            "roomType": "Business Junior Suite (Weekend)",
            "price": 2015
          }
        ]
      },
      {
        "range": "30/08/2026 TO 23/09/2026",
        "prices": [
          {
            "roomType": "Double (City View - Weekdays)",
            "price": 1390
          },
          {
            "roomType": "Double (City View - Weekend)",
            "price": 1450
          },
          {
            "roomType": "Standard Double (Haram View - Weekdays)",
            "price": 1515
          },
          {
            "roomType": "Standard Double (Haram View - Weekend)",
            "price": 1575
          },
          {
            "roomType": "Business Suite (Weekdays)",
            "price": 1955
          },
          {
            "roomType": "Business Suite (Weekend)",
            "price": 2080
          },
          {
            "roomType": "Business Junior Suite (Weekdays)",
            "price": 2205
          },
          {
            "roomType": "Business Junior Suite (Weekend)",
            "price": 2330
          }
        ]
      },
      {
        "range": "23/09/2026 TO 27/09/2026",
        "prices": [
          {
            "roomType": "Double (City View - Weekdays)",
            "price": 1515
          },
          {
            "roomType": "Double (City View - Weekend)",
            "price": 1700
          },
          {
            "roomType": "Standard Double (Haram View - Weekdays)",
            "price": 1700
          },
          {
            "roomType": "Standard Double (Haram View - Weekend)",
            "price": 1890
          },
          {
            "roomType": "Business Suite (Weekdays)",
            "price": 2520
          },
          {
            "roomType": "Business Suite (Weekend)",
            "price": 2740
          },
          {
            "roomType": "Business Junior Suite (Weekdays)",
            "price": 2835
          },
          {
            "roomType": "Business Junior Suite (Weekend)",
            "price": 3055
          }
        ]
      },
      {
        "range": "27/09/2026 TO 22/10/2026",
        "prices": [
          {
            "roomType": "Double (City View - Weekdays)",
            "price": 1390
          },
          {
            "roomType": "Double (City View - Weekend)",
            "price": 1450
          },
          {
            "roomType": "Standard Double (Haram View - Weekdays)",
            "price": 1515
          },
          {
            "roomType": "Standard Double (Haram View - Weekend)",
            "price": 1575
          },
          {
            "roomType": "Business Suite (Weekdays)",
            "price": 1955
          },
          {
            "roomType": "Business Suite (Weekend)",
            "price": 2080
          },
          {
            "roomType": "Business Junior Suite (Weekdays)",
            "price": 2205
          },
          {
            "roomType": "Business Junior Suite (Weekend)",
            "price": 2330
          }
        ]
      }
    ]
  },
  {
    "id": "dar-al-iman-intercontinental-maysan-madinah",
    "name": "Dar Al Iman Intercontinental",
    "city": "Madinah",
    "vendor": "Maysan Int. Group",
    "mealPlan": "BB",
    "stars": 5,
    "seasons": [
      {
        "range": "11/06/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double (City View - Weekdays)",
            "price": 860
          },
          {
            "roomType": "Double (City View - Weekend)",
            "price": 910
          },
          {
            "roomType": "Double (Haram View - Weekdays)",
            "price": 1035
          },
          {
            "roomType": "Double (Haram View - Weekend)",
            "price": 1080
          }
        ]
      },
      {
        "range": "01/08/2026 TO 01/09/2026",
        "prices": [
          {
            "roomType": "Double (City View - Weekdays)",
            "price": 1050
          },
          {
            "roomType": "Double (City View - Weekend)",
            "price": 1165
          },
          {
            "roomType": "Double (Haram View - Weekdays)",
            "price": 1225
          },
          {
            "roomType": "Double (Haram View - Weekend)",
            "price": 1340
          }
        ]
      },
      {
        "range": "01/09/2026 TO 01/10/2026",
        "prices": [
          {
            "roomType": "Double (City View - Weekdays)",
            "price": 1155
          },
          {
            "roomType": "Double (City View - Weekend)",
            "price": 1355
          },
          {
            "roomType": "Double (Haram View - Weekdays)",
            "price": 1330
          },
          {
            "roomType": "Double (Haram View - Weekend)",
            "price": 1530
          }
        ]
      },
      {
        "range": "01/10/2026 TO 31/10/2026",
        "prices": [
          {
            "roomType": "Double (City View - Weekdays)",
            "price": 1175
          },
          {
            "roomType": "Double (City View - Weekend)",
            "price": 1360
          },
          {
            "roomType": "Double (Haram View - Weekdays)",
            "price": 1410
          },
          {
            "roomType": "Double (Haram View - Weekend)",
            "price": 1600
          }
        ]
      }
    ]
  }
];

export const getHotels = (): Hotel[] => {
  const stored = localStorage.getItem('hotels_db');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Hotel[];
      // Replace existing Maysan Int. Group, ROWA and Alharmain Hotels Management hotels in stored parsed data with updated ones from defaultHotels
      const parsedUpdated = parsed.map(ph => {
        const matchingDefault = defaultHotels.find(dh => dh.id === ph.id);
        if (matchingDefault && (matchingDefault.vendor === 'Maysan Int. Group' || matchingDefault.vendor === 'ROWA' || matchingDefault.vendor === 'Alharmain Hotels Management')) {
          return matchingDefault;
        }
        return ph;
      });
      // Merge missing hotels from defaultHotels
      const parsedIds = new Set(parsedUpdated.map(h => h.id));
      const missingHotels = defaultHotels.filter(h => !parsedIds.has(h.id));
      if (missingHotels.length > 0) {
        const merged = [...parsedUpdated, ...missingHotels,
  {
    "id": "mather-al-eiman-diar",
    "name": "Mather Al Eiman",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "30/06/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 280
          },
          {
            "roomType": "Triple",
            "price": 325
          },
          {
            "roomType": "Quad",
            "price": 370
          }
        ]
      },
      {
        "range": "01/08/2026 TO 19/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 300
          },
          {
            "roomType": "Triple",
            "price": 345
          },
          {
            "roomType": "Quad",
            "price": 390
          }
        ]
      }
    ]
  },
  {
    "id": "le-meridien-towers-diar",
    "name": "Le Meridien Towers",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 5,
    "seasons": [
      {
        "range": "07/06/2026 TO 13/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 305
          },
          {
            "roomType": "Triple",
            "price": 385
          },
          {
            "roomType": "Quad",
            "price": 465
          }
        ]
      },
      {
        "range": "14/08/2026 TO 19/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 325
          },
          {
            "roomType": "Triple",
            "price": 405
          },
          {
            "roomType": "Quad",
            "price": 485
          }
        ]
      }
    ]
  },
  {
    "id": "saja-makkah-diar",
    "name": "Saja Makkah",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 4,
    "seasons": [
      {
        "range": "16/06/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 280
          },
          {
            "roomType": "Triple",
            "price": 330
          },
          {
            "roomType": "Quad",
            "price": 380
          }
        ]
      },
      {
        "range": "01/08/2026 TO 19/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 300
          },
          {
            "roomType": "Triple",
            "price": 350
          },
          {
            "roomType": "Quad",
            "price": 400
          }
        ]
      }
    ]
  },
  {
    "id": "fajar-badea-4-diar",
    "name": "Fajar Badea 4",
    "city": "Makkah",
    "vendor": "Diar Al Manasik",
    "mealPlan": "FB",
    "stars": 3,
    "seasons": [
      {
        "range": "16/06/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 220
          },
          {
            "roomType": "Triple",
            "price": 260
          },
          {
            "roomType": "Quad",
            "price": 300
          }
        ]
      },
      {
        "range": "01/08/2026 TO 19/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 240
          },
          {
            "roomType": "Triple",
            "price": 280
          },
          {
            "roomType": "Quad",
            "price": 320
          }
        ]
      }
    ]
  }
,
  {
    "id": "wahat-al-diyafah",
    "name": "Wahat Al Diyafah",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 3,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 260
          },
          {
            "roomType": "Triple",
            "price": 290
          },
          {
            "roomType": "Quad",
            "price": 340
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 290
          },
          {
            "roomType": "Triple",
            "price": 340
          },
          {
            "roomType": "Quad",
            "price": 380
          }
        ]
      }
    ]
  },
  {
    "id": "elaf-golden",
    "name": "Elaf Golden",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 380
          },
          {
            "roomType": "Triple",
            "price": 430
          },
          {
            "roomType": "Quad",
            "price": 470
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 430
          },
          {
            "roomType": "Triple",
            "price": 470
          },
          {
            "roomType": "Quad",
            "price": 500
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 460
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 540
          }
        ]
      }
    ]
  },
  {
    "id": "elaf-diamond",
    "name": "Elaf Diamond",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 400
          },
          {
            "roomType": "Triple",
            "price": 445
          },
          {
            "roomType": "Quad",
            "price": 490
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 470
          },
          {
            "roomType": "Triple",
            "price": 525
          },
          {
            "roomType": "Quad",
            "price": 570
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 500
          },
          {
            "roomType": "Triple",
            "price": 545
          },
          {
            "roomType": "Quad",
            "price": 590
          }
        ]
      }
    ]
  },
  {
    "id": "elaf-rayyan",
    "name": "Elaf Rayyan",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 430
          },
          {
            "roomType": "Triple",
            "price": 475
          },
          {
            "roomType": "Quad",
            "price": 520
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 500
          },
          {
            "roomType": "Triple",
            "price": 550
          },
          {
            "roomType": "Quad",
            "price": 600
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 525
          },
          {
            "roomType": "Triple",
            "price": 575
          },
          {
            "roomType": "Quad",
            "price": 625
          }
        ]
      }
    ]
  },
  {
    "id": "snood-ajyad-alharmain",
    "name": "Snood Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 3,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 430
          },
          {
            "roomType": "Triple",
            "price": 480
          },
          {
            "roomType": "Quad",
            "price": 530
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 500
          },
          {
            "roomType": "Triple",
            "price": 550
          },
          {
            "roomType": "Quad",
            "price": 600
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 525
          },
          {
            "roomType": "Triple",
            "price": 575
          },
          {
            "roomType": "Quad",
            "price": 625
          }
        ]
      }
    ]
  },
  {
    "id": "elaf-al-khair",
    "name": "Elaf Al Khair",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 500
          },
          {
            "roomType": "Triple",
            "price": 550
          },
          {
            "roomType": "Quad",
            "price": 600
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 525
          },
          {
            "roomType": "Triple",
            "price": 575
          },
          {
            "roomType": "Quad",
            "price": 625
          }
        ]
      }
    ]
  },
  {
    "id": "marsa-al-jariyah",
    "name": "Marsa Al Jariyah",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 3,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 450
          },
          {
            "roomType": "Triple",
            "price": 500
          },
          {
            "roomType": "Quad",
            "price": 550
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 500
          },
          {
            "roomType": "Triple",
            "price": 550
          },
          {
            "roomType": "Quad",
            "price": 600
          }
        ]
      },
      {
        "range": "01/08/2026 TO 30/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 530
          },
          {
            "roomType": "Triple",
            "price": 580
          },
          {
            "roomType": "Quad",
            "price": 630
          }
        ]
      }
    ]
  },
  {
    "id": "azka-asafa",
    "name": "Azka Asafa",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 570
          },
          {
            "roomType": "Triple",
            "price": 620
          },
          {
            "roomType": "Quad",
            "price": 680
          }
        ]
      }
    ]
  },
  {
    "id": "azka-al-maqom",
    "name": "Azka Al Maqom",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 600
          },
          {
            "roomType": "Triple",
            "price": 680
          },
          {
            "roomType": "Quad",
            "price": 740
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 650
          },
          {
            "roomType": "Triple",
            "price": 750
          },
          {
            "roomType": "Quad",
            "price": 850
          }
        ]
      },
      {
        "range": "01/08/2026 TO 01/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 700
          },
          {
            "roomType": "Triple",
            "price": 800
          },
          {
            "roomType": "Quad",
            "price": 900
          }
        ]
      }
    ]
  },
  {
    "id": "olayan-ajyad",
    "name": "Olayan Ajyad",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 600
          },
          {
            "roomType": "Triple",
            "price": 700
          },
          {
            "roomType": "Quad",
            "price": 800
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 725
          },
          {
            "roomType": "Triple",
            "price": 825
          },
          {
            "roomType": "Quad",
            "price": 925
          }
        ]
      },
      {
        "range": "01/08/2026 TO 01/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 775
          },
          {
            "roomType": "Triple",
            "price": 875
          },
          {
            "roomType": "Quad",
            "price": 975
          }
        ]
      }
    ]
  },
  {
    "id": "sofwah-tower-3",
    "name": "Sofwah Tower 3",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 5,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 900
          },
          {
            "roomType": "Triple",
            "price": 1100
          },
          {
            "roomType": "Quad",
            "price": 1300
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 1000
          },
          {
            "roomType": "Triple",
            "price": 1200
          },
          {
            "roomType": "Quad",
            "price": 1400
          }
        ]
      }
    ]
  },
  {
    "id": "elaf-al-bayit",
    "name": "Elaf Al Bayit",
    "city": "Makkah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "15/06/2026 TO 01/07/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 600
          },
          {
            "roomType": "Triple",
            "price": 675
          },
          {
            "roomType": "Quad",
            "price": 750
          }
        ]
      },
      {
        "range": "01/07/2026 TO 01/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 625
          },
          {
            "roomType": "Triple",
            "price": 725
          },
          {
            "roomType": "Quad",
            "price": 825
          }
        ]
      },
      {
        "range": "01/08/2026 TO 01/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 650
          },
          {
            "roomType": "Triple",
            "price": 750
          },
          {
            "roomType": "Quad",
            "price": 850
          }
        ]
      }
    ]
  },
  {
    "id": "frontel-al-haritzia",
    "name": "Frontel Al Haritzia",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 5,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 800
          },
          {
            "roomType": "Triple",
            "price": 950
          },
          {
            "roomType": "Quad",
            "price": 1100
          }
        ]
      }
    ]
  },
  {
    "id": "grand-plaza-badr-maqom-alharmain",
    "name": "Grand Plaza Badr Maqom",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 570
          },
          {
            "roomType": "Triple",
            "price": 650
          },
          {
            "roomType": "Quad",
            "price": 730
          }
        ]
      }
    ]
  },
  {
    "id": "grand-plaza-madina-alharmain",
    "name": "Grand Plaza Madina",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 530
          },
          {
            "roomType": "Triple",
            "price": 600
          },
          {
            "roomType": "Quad",
            "price": 670
          }
        ]
      }
    ]
  },
  {
    "id": "jiwar-al-saha",
    "name": "Jiwar Al Saha",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 14/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 510
          },
          {
            "roomType": "Triple",
            "price": 560
          },
          {
            "roomType": "Quad",
            "price": 610
          }
        ]
      }
    ]
  },
  {
    "id": "shaza-regency",
    "name": "Shaza Regency",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 5,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 550
          },
          {
            "roomType": "Triple",
            "price": 630
          },
          {
            "roomType": "Quad",
            "price": 710
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-rehab-al-misk-alharmain",
    "name": "Maysan Rehab Al Misk",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 480
          },
          {
            "roomType": "Triple",
            "price": 540
          },
          {
            "roomType": "Quad",
            "price": 600
          }
        ]
      }
    ]
  },
  {
    "id": "arkan-al-manar-alharmain",
    "name": "Arkan Al Manar",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 480
          },
          {
            "roomType": "Triple",
            "price": 540
          },
          {
            "roomType": "Quad",
            "price": 600
          }
        ]
      }
    ]
  },
  {
    "id": "maysan-al-taqwa-alharmain",
    "name": "Maysan Al Taqwa",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 4,
    "seasons": [
      {
        "range": "30/06/2026 TO 20/09/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 410
          },
          {
            "roomType": "Triple",
            "price": 460
          },
          {
            "roomType": "Quad",
            "price": 500
          }
        ]
      }
    ]
  },
  {
    "id": "plaza-in-houd-alharmain",
    "name": "Plaza In Houd",
    "city": "Madinah",
    "vendor": "Alharmain Hotels Management",
    "mealPlan": "RO",
    "stars": 3,
    "seasons": [
      {
        "range": "30/06/2026 TO 15/08/2026",
        "prices": [
          {
            "roomType": "Double",
            "price": 375
          },
          {
            "roomType": "Triple",
            "price": 425
          },
          {
            "roomType": "Quad",
            "price": 475
          }
        ]
      }
    ]
  }
];
        localStorage.setItem('hotels_db', JSON.stringify(merged));
        return merged as Hotel[];
      }
      return parsed;
    } catch (e) {
      console.error('Failed to parse stored hotels', e);
    }
  }
  return defaultHotels;
};

export const saveHotels = (hotels: Hotel[]) => {
  localStorage.setItem('hotels_db', JSON.stringify(hotels));
};

export const hotels = getHotels();
