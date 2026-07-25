const fs = require('fs');

const newHotels = [
  {
    id: 'marwa-rotana-rowa',
    name: 'Marwa Rotana',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 5,
    seasons: [
      { range: '16/06/2026 TO 08/07/2026', prices: [{ roomType: 'Double', price: 1100 }, { roomType: 'Triple', price: 1370 }, { roomType: 'Quad', price: 1640 }] },
      { range: '09/07/2026 TO 30/09/2026', prices: [{ roomType: 'Double', price: 1180 }, { roomType: 'Triple', price: 1450 }, { roomType: 'Quad', price: 1720 }] },
      { range: '01/10/2026 TO 16/12/2026', prices: [{ roomType: 'Double', price: 1250 }, { roomType: 'Triple', price: 1520 }, { roomType: 'Quad', price: 1790 }] }
    ]
  },
  {
    id: 'movenpick-hajar-rowa',
    name: 'Movenpick Hajar',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 5,
    seasons: [
      { range: '16/06/2026 TO 08/07/2026', prices: [{ roomType: 'Double', price: 950 }, { roomType: 'Triple', price: 1150 }, { roomType: 'Quad', price: 1280 }, { roomType: 'Suite 5 Pax', price: 1600 }, { roomType: 'Suite 6 Pax', price: 1750 }] },
      { range: '09/07/2026 TO 30/08/2026', prices: [{ roomType: 'Double', price: 1100 }, { roomType: 'Triple', price: 1200 }, { roomType: 'Quad', price: 1350 }, { roomType: 'Suite 5 Pax', price: 1650 }, { roomType: 'Suite 6 Pax', price: 1850 }] },
      { range: '31/08/2026 TO 14/10/2026', prices: [{ roomType: 'Double', price: 1050 }, { roomType: 'Triple', price: 1250 }, { roomType: 'Quad', price: 1400 }, { roomType: 'Suite 5 Pax', price: 1750 }, { roomType: 'Suite 6 Pax', price: 1850 }] },
      { range: '15/10/2026 TO 16/12/2026', prices: [{ roomType: 'Double', price: 1100 }, { roomType: 'Triple', price: 1300 }, { roomType: 'Quad', price: 1500 }, { roomType: 'Suite 5 Pax', price: 1800 }, { roomType: 'Suite 6 Pax', price: 2000 }] }
    ]
  },
  {
    id: 'safwa-tower-3-rowa',
    name: 'Safwa Tower 3',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 5,
    seasons: [
      { range: '16/06/2026 TO 08/07/2026', prices: [{ roomType: 'Double', price: 950 }, { roomType: 'Triple', price: 1150 }, { roomType: 'Quad', price: 1350 }] },
      { range: '09/07/2026 TO 16/12/2026', prices: [{ roomType: 'Double', price: 1050 }, { roomType: 'Triple', price: 1250 }, { roomType: 'Quad', price: 1450 }] }
    ]
  },
  {
    id: 'pullman-zamzam-rowa',
    name: 'Pullman Zamzam',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 5,
    seasons: [
      { range: '16/06/2026 TO 08/07/2026', prices: [{ roomType: 'Double', price: 1000 }, { roomType: 'Triple', price: 1200 }, { roomType: 'Quad', price: 1400 }] },
      { range: '09/07/2026 TO 14/10/2026', prices: [{ roomType: 'Double', price: 1050 }, { roomType: 'Triple', price: 1250 }, { roomType: 'Quad', price: 1450 }, { roomType: 'Suite 6 Pax', price: 2250 }, { roomType: 'Suite 7 Pax', price: 2450 }] },
      { range: '15/10/2026 TO 16/12/2026', prices: [{ roomType: 'Double', price: 1150 }, { roomType: 'Triple', price: 1350 }, { roomType: 'Quad', price: 1550 }, { roomType: 'Suite 6 Pax', price: 2350 }, { roomType: 'Suite 7 Pax', price: 2550 }] }
    ]
  },
  {
    id: 'fairmont-rowa',
    name: 'Fairmont',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 5,
    seasons: [
      { range: '16/06/2026 TO 08/07/2026', prices: [{ roomType: 'Double', price: 1350 }, { roomType: 'Triple', price: 1680 }, { roomType: 'Quad', price: 2010 }] },
      { range: '09/07/2026 TO 16/12/2026', prices: [{ roomType: 'Double', price: 1470 }, { roomType: 'Triple', price: 1800 }, { roomType: 'Quad', price: 2130 }] }
    ]
  },
  {
    id: 'swiss-al-maqam-rowa',
    name: 'Swiss Al Maqam',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 5,
    seasons: [
      { range: '16/06/2026 TO 08/07/2026', prices: [{ roomType: 'Double', price: 1080 }, { roomType: 'Triple', price: 1360 }, { roomType: 'Quad', price: 1640 }] },
      { range: '09/07/2026 TO 16/12/2026', prices: [{ roomType: 'Double', price: 1250 }, { roomType: 'Triple', price: 1530 }, { roomType: 'Quad', price: 1810 }] }
    ]
  },
  {
    id: 'hilton-suites-rowa',
    name: 'Hilton Suites',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 5,
    seasons: [
      { range: '16/06/2026 TO 08/07/2026', prices: [{ roomType: 'Double', price: 1000 }, { roomType: 'Triple', price: 1210 }, { roomType: 'Quad', price: 1420 }] },
      { range: '09/07/2026 TO 16/12/2026', prices: [{ roomType: 'Double', price: 1150 }, { roomType: 'Triple', price: 1385 }, { roomType: 'Quad', price: 1620 }] }
    ]
  },
  {
    id: 'rotana-jabal-omar-rowa',
    name: 'Rotana Jabal Omar',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 5,
    seasons: [
      { range: '16/06/2026 TO 08/07/2026', prices: [{ roomType: 'Double', price: 940 }, { roomType: 'Triple', price: 1190 }, { roomType: 'Quad', price: 1390 }] },
      { range: '09/07/2026 TO 03/11/2026', prices: [{ roomType: 'Double', price: 1040 }, { roomType: 'Triple', price: 1290 }, { roomType: 'Quad', price: 1491 }] },
      { range: '04/11/2026 TO 16/12/2026', prices: [{ roomType: 'Double', price: 1040 }, { roomType: 'Triple', price: 1290 }, { roomType: 'Quad', price: 1490 }] }
    ]
  },
  {
    id: 'olayan-ajyad-rowa',
    name: 'Olayan Ajyad',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 4,
    seasons: [
      { range: '16/06/2026 TO 31/07/2026', prices: [{ roomType: 'Double', price: 600 }, { roomType: 'Triple', price: 700 }, { roomType: 'Quad', price: 800 }] },
      { range: '01/08/2026 TO 04/10/2026', prices: [{ roomType: 'Double', price: 660 }, { roomType: 'Triple', price: 760 }, { roomType: 'Quad', price: 860 }] }
    ]
  },
  {
    id: 'prestige-rowa',
    name: 'Prestige',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 4,
    seasons: [
      { range: '16/06/2026 TO 30/06/2026', prices: [{ roomType: 'Double', price: 475 }, { roomType: 'Triple', price: 550 }, { roomType: 'Quad', price: 625 }] },
      { range: '01/07/2026 TO 31/07/2026', prices: [{ roomType: 'Double', price: 500 }, { roomType: 'Triple', price: 575 }, { roomType: 'Quad', price: 650 }] },
      { range: '01/08/2026 TO 04/10/2026', prices: [{ roomType: 'Double', price: 625 }, { roomType: 'Triple', price: 725 }, { roomType: 'Quad', price: 825 }] }
    ]
  },
  {
    id: 'safa-azka-rowa',
    name: 'Safa Azka',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 4,
    seasons: [
      { range: '20/06/2026 TO 30/06/2026', prices: [{ roomType: 'Double', price: 530 }, { roomType: 'Triple', price: 580 }, { roomType: 'Quad', price: 620 }] },
      { range: '01/07/2026 TO 31/07/2026', prices: [{ roomType: 'Double', price: 560 }, { roomType: 'Triple', price: 635 }, { roomType: 'Quad', price: 710 }] },
      { range: '01/08/2026 TO 31/08/2026', prices: [{ roomType: 'Double', price: 590 }, { roomType: 'Triple', price: 675 }, { roomType: 'Quad', price: 760 }] }
    ]
  },
  {
    id: 'al-masa-grand-rowa',
    name: 'Al Masa Grand',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 3,
    seasons: [
      { range: '16/06/2026 TO 31/07/2026', prices: [{ roomType: 'Double', price: 400 }, { roomType: 'Triple', price: 450 }, { roomType: 'Quad', price: 500 }] },
      { range: '01/08/2026 TO 04/10/2026', prices: [{ roomType: 'Double', price: 430 }, { roomType: 'Triple', price: 480 }, { roomType: 'Quad', price: 530 }] }
    ]
  },
  {
    id: 'al-masa-al-fazeen-rowa',
    name: 'Al Masa Al Fazeen',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 3,
    seasons: [
      { range: '16/06/2026 TO 31/07/2026', prices: [{ roomType: 'Double', price: 370 }, { roomType: 'Triple', price: 420 }, { roomType: 'Quad', price: 470 }] },
      { range: '01/08/2026 TO 04/10/2026', prices: [{ roomType: 'Double', price: 380 }, { roomType: 'Triple', price: 430 }, { roomType: 'Quad', price: 480 }] }
    ]
  },
  {
    id: 'snood-ajyad-rowa',
    name: 'Snood Ajyad',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 3,
    seasons: [
      { range: '16/06/2026 TO 31/07/2026', prices: [{ roomType: 'Double', price: 380 }, { roomType: 'Triple', price: 425 }, { roomType: 'Quad', price: 470 }] },
      { range: '01/08/2026 TO 04/10/2026', prices: [{ roomType: 'Double', price: 430 }, { roomType: 'Triple', price: 475 }, { roomType: 'Quad', price: 520 }] }
    ]
  },
  {
    id: 'waha-ajyad-rowa',
    name: 'Waha Ajyad',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 3,
    seasons: [
      { range: '16/06/2026 TO 31/07/2026', prices: [{ roomType: 'Double', price: 290 }, { roomType: 'Triple', price: 330 }, { roomType: 'Quad', price: 370 }] },
      { range: '01/08/2026 TO 04/10/2026', prices: [{ roomType: 'Double', price: 310 }, { roomType: 'Triple', price: 350 }, { roomType: 'Quad', price: 390 }] }
    ]
  },
  {
    id: 'nada-ajyad-rowa',
    name: 'Nada Ajyad',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 3,
    seasons: [
      { range: '16/06/2026 TO 31/07/2026', prices: [{ roomType: 'Double', price: 310 }, { roomType: 'Triple', price: 350 }, { roomType: 'Quad', price: 390 }] },
      { range: '01/08/2026 TO 04/10/2026', prices: [{ roomType: 'Double', price: 330 }, { roomType: 'Triple', price: 370 }, { roomType: 'Quad', price: 410 }] }
    ]
  },
  {
    id: 'diafat-al-rajaa-rowa',
    name: 'Diafat Al Rajaa',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 3,
    seasons: [
      { range: '16/06/2026 TO 31/07/2026', prices: [{ roomType: 'Double', price: 260 }, { roomType: 'Triple', price: 310 }, { roomType: 'Quad', price: 360 }] },
      { range: '01/08/2026 TO 04/10/2026', prices: [{ roomType: 'Double', price: 300 }, { roomType: 'Triple', price: 350 }, { roomType: 'Quad', price: 400 }] }
    ]
  },
  {
    id: 'olayan-golden-rowa',
    name: 'Olayan Golden',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 3,
    seasons: [
      { range: '16/06/2026 TO 31/07/2026', prices: [{ roomType: 'Double', price: 270 }, { roomType: 'Triple', price: 310 }, { roomType: 'Quad', price: 350 }] },
      { range: '01/08/2026 TO 04/10/2026', prices: [{ roomType: 'Double', price: 320 }, { roomType: 'Triple', price: 360 }, { roomType: 'Quad', price: 400 }] }
    ]
  },
  {
    id: 'badr-al-masa-rowa',
    name: 'Badr Al Masa',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 3,
    seasons: [
      { range: '16/06/2026 TO 31/07/2026', prices: [{ roomType: 'Double', price: 260 }, { roomType: 'Triple', price: 300 }, { roomType: 'Quad', price: 340 }] },
      { range: '01/08/2026 TO 04/10/2026', prices: [{ roomType: 'Double', price: 280 }, { roomType: 'Triple', price: 320 }, { roomType: 'Quad', price: 360 }] },
      { range: '05/10/2026 TO 05/10/2026', prices: [{ roomType: 'Double', price: 440 }, { roomType: 'Triple', price: 490 }, { roomType: 'Quad', price: 540 }] }
    ]
  },
  {
    id: 'olayan-grand-rowa',
    name: 'Olayan Grand',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 3,
    seasons: [
      { range: '16/06/2026 TO 31/07/2026', prices: [{ roomType: 'Double', price: 180 }, { roomType: 'Triple', price: 220 }, { roomType: 'Quad', price: 260 }] },
      { range: '01/08/2026 TO 04/10/2026', prices: [{ roomType: 'Double', price: 200 }, { roomType: 'Triple', price: 240 }, { roomType: 'Quad', price: 280 }] }
    ]
  },
  {
    id: 'saja-makkah-rowa',
    name: 'Saja Makkah / Ex.Lemeredian Towers',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 4,
    seasons: [
      { range: '16/06/2026 TO 31/07/2026', prices: [{ roomType: 'Double', price: 270 }, { roomType: 'Triple', price: 320 }, { roomType: 'Quad', price: 370 }] },
      { range: '01/08/2026 TO 04/10/2026', prices: [{ roomType: 'Double', price: 290 }, { roomType: 'Triple', price: 340 }, { roomType: 'Quad', price: 390 }] }
    ]
  },
  {
    id: 'nawazi-towers-rowa',
    name: 'Nawazi Towers',
    city: 'Makkah',
    vendor: 'ROWA',
    mealPlan: 'FB',
    stars: 3,
    seasons: [
      { range: '16/06/2026 TO 31/07/2026', prices: [{ roomType: 'Double', price: 200 }, { roomType: 'Triple', price: 240 }, { roomType: 'Quad', price: 280 }] },
      { range: '01/08/2026 TO 04/10/2026', prices: [{ roomType: 'Double', price: 230 }, { roomType: 'Triple', price: 270 }, { roomType: 'Quad', price: 410 }] }
    ]
  }
];

let content = fs.readFileSync('src/data/hotels.ts', 'utf8');

// Find the actual end of defaultHotels array.
// It's right before `export const getHotels`
const defaultHotelsEnd = content.indexOf('];\n\nexport const getHotels');
if (defaultHotelsEnd !== -1) {
  const newHotelsStr = newHotels.map(h => '  ' + JSON.stringify(h, null, 2).replace(/\n/g, '\n  ')).join(',\n');
  content = content.substring(0, defaultHotelsEnd) + ',\n' + newHotelsStr + '\n' + content.substring(defaultHotelsEnd);
  fs.writeFileSync('src/data/hotels.ts', content);
  console.log('Successfully appended new ROWA hotels.');
} else {
  console.log('Could not find defaultHotels end');
}
