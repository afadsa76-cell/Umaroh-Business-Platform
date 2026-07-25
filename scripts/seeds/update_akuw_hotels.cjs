const fs = require('fs');

const newHotels = [
  {
    id: 'elaf-al-bait-akuw',
    name: 'Elaf Al Bait',
    city: 'Makkah',
    vendor: 'AKUW',
    mealPlan: 'FB',
    stars: 4,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 550 }, { roomType: 'Triple', price: 625 }, { roomType: 'Quad', price: 700 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 575 }, { roomType: 'Triple', price: 675 }, { roomType: 'Quad', price: 775 }] },
      { range: '01/08/2026 TO 01/09/2026', prices: [{ roomType: 'Double', price: 600 }, { roomType: 'Triple', price: 700 }, { roomType: 'Quad', price: 800 }] }
    ]
  },
  {
    id: 'marsa-jaria-akuw',
    name: 'Marsa Jaria',
    city: 'Makkah',
    vendor: 'AKUW',
    mealPlan: 'FB',
    stars: 3,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 400 }, { roomType: 'Triple', price: 450 }, { roomType: 'Quad', price: 500 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 450 }, { roomType: 'Triple', price: 500 }, { roomType: 'Quad', price: 550 }] },
      { range: '01/08/2026 TO 30/09/2026', prices: [{ roomType: 'Double', price: 480 }, { roomType: 'Triple', price: 530 }, { roomType: 'Quad', price: 580 }] }
    ]
  },
  {
    id: 'kunuz-ajyad-akuw',
    name: 'Kunuz Ajyad',
    city: 'Makkah',
    vendor: 'AKUW',
    mealPlan: 'FB',
    stars: 3,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 390 }, { roomType: 'Triple', price: 435 }, { roomType: 'Quad', price: 480 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 440 }, { roomType: 'Triple', price: 485 }, { roomType: 'Quad', price: 530 }] },
      { range: '01/08/2026 TO 30/09/2026', prices: [{ roomType: 'Double', price: 470 }, { roomType: 'Triple', price: 515 }, { roomType: 'Quad', price: 560 }] }
    ]
  },
  {
    id: 'elaf-rayyan-akuw',
    name: 'Elaf Rayyan',
    city: 'Makkah',
    vendor: 'AKUW',
    mealPlan: 'FB',
    stars: 4,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 380 }, { roomType: 'Triple', price: 425 }, { roomType: 'Quad', price: 470 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 450 }, { roomType: 'Triple', price: 500 }, { roomType: 'Quad', price: 550 }] },
      { range: '01/08/2026 TO 30/09/2026', prices: [{ roomType: 'Double', price: 475 }, { roomType: 'Triple', price: 525 }, { roomType: 'Quad', price: 575 }] }
    ]
  },
  {
    id: 'elaf-al-khair-akuw',
    name: 'Elaf Al Khair',
    city: 'Makkah',
    vendor: 'AKUW',
    mealPlan: 'FB',
    stars: 4,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 400 }, { roomType: 'Triple', price: 450 }, { roomType: 'Quad', price: 500 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 450 }, { roomType: 'Triple', price: 500 }, { roomType: 'Quad', price: 550 }] },
      { range: '01/08/2026 TO 30/09/2026', prices: [{ roomType: 'Double', price: 475 }, { roomType: 'Triple', price: 525 }, { roomType: 'Quad', price: 575 }] }
    ]
  },
  {
    id: 'elaf-diamond-akuw',
    name: 'Elaf Diamond',
    city: 'Makkah',
    vendor: 'AKUW',
    mealPlan: 'FB',
    stars: 4,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 350 }, { roomType: 'Triple', price: 395 }, { roomType: 'Quad', price: 440 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 420 }, { roomType: 'Triple', price: 475 }, { roomType: 'Quad', price: 520 }] },
      { range: '01/08/2026 TO 30/09/2026', prices: [{ roomType: 'Double', price: 450 }, { roomType: 'Triple', price: 495 }, { roomType: 'Quad', price: 540 }] }
    ]
  },
  {
    id: 'elaf-golden-akuw',
    name: 'Elaf Golden',
    city: 'Makkah',
    vendor: 'AKUW',
    mealPlan: 'FB',
    stars: 4,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 330 }, { roomType: 'Triple', price: 370 }, { roomType: 'Quad', price: 420 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 380 }, { roomType: 'Triple', price: 420 }, { roomType: 'Quad', price: 460 }] },
      { range: '01/08/2026 TO 30/09/2026', prices: [{ roomType: 'Double', price: 410 }, { roomType: 'Triple', price: 450 }, { roomType: 'Quad', price: 490 }] }
    ]
  },
  {
    id: 'elaf-noor-akuw',
    name: 'Elaf Noor',
    city: 'Makkah',
    vendor: 'AKUW',
    mealPlan: 'FB',
    stars: 3,
    seasons: [
      { range: '01/07/2026 TO 01/10/2026', prices: [{ roomType: 'Double', price: 150 }, { roomType: 'Triple', price: 185 }, { roomType: 'Quad', price: 220 }] }
    ]
  },
  {
    id: 'safwah-tower-3-akuw',
    name: 'Safwah Tower 3',
    city: 'Makkah',
    vendor: 'AKUW',
    mealPlan: 'FB',
    stars: 5,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 850 }, { roomType: 'Triple', price: 1050 }, { roomType: 'Quad', price: 1250 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 950 }, { roomType: 'Triple', price: 1150 }, { roomType: 'Quad', price: 1350 }] }
    ]
  },
  {
    id: 'olayan-ajyad-akuw',
    name: 'Olayan Ajyad',
    city: 'Makkah',
    vendor: 'AKUW',
    mealPlan: 'FB',
    stars: 4,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 550 }, { roomType: 'Triple', price: 650 }, { roomType: 'Quad', price: 750 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 675 }, { roomType: 'Triple', price: 775 }, { roomType: 'Quad', price: 875 }] },
      { range: '01/08/2026 TO 01/09/2026', prices: [{ roomType: 'Double', price: 725 }, { roomType: 'Triple', price: 825 }, { roomType: 'Quad', price: 925 }] }
    ]
  },
  {
    id: 'azka-maqam-akuw',
    name: 'Azka Maqam',
    city: 'Makkah',
    vendor: 'AKUW',
    mealPlan: 'FB',
    stars: 5,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 550 }, { roomType: 'Triple', price: 620 }, { roomType: 'Quad', price: 690 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 600 }, { roomType: 'Triple', price: 700 }, { roomType: 'Quad', price: 800 }] },
      { range: '01/08/2026 TO 01/09/2026', prices: [{ roomType: 'Double', price: 650 }, { roomType: 'Triple', price: 750 }, { roomType: 'Quad', price: 850 }] }
    ]
  },
  {
    id: 'azka-safa-akuw',
    name: 'Azka Safa',
    city: 'Makkah',
    vendor: 'AKUW',
    mealPlan: 'FB',
    stars: 4,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 520 }, { roomType: 'Triple', price: 570 }, { roomType: 'Quad', price: 620 }] }
    ]
  },
  {
    id: 'snood-ajyad-akuw',
    name: 'Snood Ajyad',
    city: 'Makkah',
    vendor: 'AKUW',
    mealPlan: 'FB',
    stars: 3,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 380 }, { roomType: 'Triple', price: 430 }, { roomType: 'Quad', price: 480 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 450 }, { roomType: 'Triple', price: 500 }, { roomType: 'Quad', price: 550 }] },
      { range: '01/08/2026 TO 30/09/2026', prices: [{ roomType: 'Double', price: 475 }, { roomType: 'Triple', price: 525 }, { roomType: 'Quad', price: 575 }] }
    ]
  },
  {
    id: 'waha-diafa-akuw',
    name: 'Waha Diafa',
    city: 'Makkah',
    vendor: 'AKUW',
    mealPlan: 'FB',
    stars: 3,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 210 }, { roomType: 'Triple', price: 240 }, { roomType: 'Quad', price: 290 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 250 }, { roomType: 'Triple', price: 290 }, { roomType: 'Quad', price: 330 }] }
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
  console.log('Successfully appended new AKUW hotels.');
} else {
  console.log('Could not find defaultHotels end');
}
