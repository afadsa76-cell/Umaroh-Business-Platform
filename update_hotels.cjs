const fs = require('fs');

const newHotels = [
  {
    id: 'wahat-al-diyafah',
    name: 'Wahat Al Diyafah',
    city: 'Makkah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 3,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 260 }, { roomType: 'Triple', price: 290 }, { roomType: 'Quad', price: 340 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 290 }, { roomType: 'Triple', price: 340 }, { roomType: 'Quad', price: 380 }] }
    ]
  },
  {
    id: 'elaf-golden',
    name: 'Elaf Golden',
    city: 'Makkah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 4,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 380 }, { roomType: 'Triple', price: 430 }, { roomType: 'Quad', price: 470 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 430 }, { roomType: 'Triple', price: 470 }, { roomType: 'Quad', price: 500 }] },
      { range: '01/08/2026 TO 30/09/2026', prices: [{ roomType: 'Double', price: 460 }, { roomType: 'Triple', price: 500 }, { roomType: 'Quad', price: 540 }] }
    ]
  },
  {
    id: 'elaf-diamond',
    name: 'Elaf Diamond',
    city: 'Makkah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 4,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 400 }, { roomType: 'Triple', price: 445 }, { roomType: 'Quad', price: 490 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 470 }, { roomType: 'Triple', price: 525 }, { roomType: 'Quad', price: 570 }] },
      { range: '01/08/2026 TO 30/09/2026', prices: [{ roomType: 'Double', price: 500 }, { roomType: 'Triple', price: 545 }, { roomType: 'Quad', price: 590 }] }
    ]
  },
  {
    id: 'elaf-rayyan',
    name: 'Elaf Rayyan',
    city: 'Makkah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 4,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 430 }, { roomType: 'Triple', price: 475 }, { roomType: 'Quad', price: 520 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 500 }, { roomType: 'Triple', price: 550 }, { roomType: 'Quad', price: 600 }] },
      { range: '01/08/2026 TO 30/09/2026', prices: [{ roomType: 'Double', price: 525 }, { roomType: 'Triple', price: 575 }, { roomType: 'Quad', price: 625 }] }
    ]
  },
  {
    id: 'snood-ajyad-alharmain',
    name: 'Snood Ajyad',
    city: 'Makkah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 3,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 430 }, { roomType: 'Triple', price: 480 }, { roomType: 'Quad', price: 530 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 500 }, { roomType: 'Triple', price: 550 }, { roomType: 'Quad', price: 600 }] },
      { range: '01/08/2026 TO 30/09/2026', prices: [{ roomType: 'Double', price: 525 }, { roomType: 'Triple', price: 575 }, { roomType: 'Quad', price: 625 }] }
    ]
  },
  {
    id: 'elaf-al-khair',
    name: 'Elaf Al Khair',
    city: 'Makkah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 4,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 450 }, { roomType: 'Triple', price: 500 }, { roomType: 'Quad', price: 550 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 500 }, { roomType: 'Triple', price: 550 }, { roomType: 'Quad', price: 600 }] },
      { range: '01/08/2026 TO 30/09/2026', prices: [{ roomType: 'Double', price: 525 }, { roomType: 'Triple', price: 575 }, { roomType: 'Quad', price: 625 }] }
    ]
  },
  {
    id: 'marsa-al-jariyah',
    name: 'Marsa Al Jariyah',
    city: 'Makkah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 3,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 450 }, { roomType: 'Triple', price: 500 }, { roomType: 'Quad', price: 550 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 500 }, { roomType: 'Triple', price: 550 }, { roomType: 'Quad', price: 600 }] },
      { range: '01/08/2026 TO 30/09/2026', prices: [{ roomType: 'Double', price: 530 }, { roomType: 'Triple', price: 580 }, { roomType: 'Quad', price: 630 }] }
    ]
  },
  {
    id: 'azka-asafa',
    name: 'Azka Asafa',
    city: 'Makkah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 4,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 570 }, { roomType: 'Triple', price: 620 }, { roomType: 'Quad', price: 680 }] }
    ]
  },
  {
    id: 'azka-al-maqom',
    name: 'Azka Al Maqom',
    city: 'Makkah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 4,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 600 }, { roomType: 'Triple', price: 680 }, { roomType: 'Quad', price: 740 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 650 }, { roomType: 'Triple', price: 750 }, { roomType: 'Quad', price: 850 }] },
      { range: '01/08/2026 TO 01/09/2026', prices: [{ roomType: 'Double', price: 700 }, { roomType: 'Triple', price: 800 }, { roomType: 'Quad', price: 900 }] }
    ]
  },
  {
    id: 'olayan-ajyad',
    name: 'Olayan Ajyad',
    city: 'Makkah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 4,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 600 }, { roomType: 'Triple', price: 700 }, { roomType: 'Quad', price: 800 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 725 }, { roomType: 'Triple', price: 825 }, { roomType: 'Quad', price: 925 }] },
      { range: '01/08/2026 TO 01/09/2026', prices: [{ roomType: 'Double', price: 775 }, { roomType: 'Triple', price: 875 }, { roomType: 'Quad', price: 975 }] }
    ]
  },
  {
    id: 'sofwah-tower-3',
    name: 'Sofwah Tower 3',
    city: 'Makkah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 5,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 900 }, { roomType: 'Triple', price: 1100 }, { roomType: 'Quad', price: 1300 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 1000 }, { roomType: 'Triple', price: 1200 }, { roomType: 'Quad', price: 1400 }] }
    ]
  },
  {
    id: 'elaf-al-bayit',
    name: 'Elaf Al Bayit',
    city: 'Makkah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 4,
    seasons: [
      { range: '15/06/2026 TO 01/07/2026', prices: [{ roomType: 'Double', price: 600 }, { roomType: 'Triple', price: 675 }, { roomType: 'Quad', price: 750 }] },
      { range: '01/07/2026 TO 01/08/2026', prices: [{ roomType: 'Double', price: 625 }, { roomType: 'Triple', price: 725 }, { roomType: 'Quad', price: 825 }] },
      { range: '01/08/2026 TO 01/09/2026', prices: [{ roomType: 'Double', price: 650 }, { roomType: 'Triple', price: 750 }, { roomType: 'Quad', price: 850 }] }
    ]
  },
  {
    id: 'frontel-al-haritzia',
    name: 'Frontel Al Haritzia',
    city: 'Madinah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 5,
    seasons: [
      { range: '30/06/2026 TO 20/09/2026', prices: [{ roomType: 'Double', price: 800 }, { roomType: 'Triple', price: 950 }, { roomType: 'Quad', price: 1100 }] }
    ]
  },
  {
    id: 'grand-plaza-badr-maqom-alharmain',
    name: 'Grand Plaza Badr Maqom',
    city: 'Madinah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 4,
    seasons: [
      { range: '30/06/2026 TO 20/09/2026', prices: [{ roomType: 'Double', price: 570 }, { roomType: 'Triple', price: 650 }, { roomType: 'Quad', price: 730 }] }
    ]
  },
  {
    id: 'grand-plaza-madina-alharmain',
    name: 'Grand Plaza Madina',
    city: 'Madinah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 4,
    seasons: [
      { range: '30/06/2026 TO 20/09/2026', prices: [{ roomType: 'Double', price: 530 }, { roomType: 'Triple', price: 600 }, { roomType: 'Quad', price: 670 }] }
    ]
  },
  {
    id: 'jiwar-al-saha',
    name: 'Jiwar Al Saha',
    city: 'Madinah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 4,
    seasons: [
      { range: '30/06/2026 TO 14/09/2026', prices: [{ roomType: 'Double', price: 510 }, { roomType: 'Triple', price: 560 }, { roomType: 'Quad', price: 610 }] }
    ]
  },
  {
    id: 'shaza-regency',
    name: 'Shaza Regency',
    city: 'Madinah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 5,
    seasons: [
      { range: '30/06/2026 TO 20/09/2026', prices: [{ roomType: 'Double', price: 550 }, { roomType: 'Triple', price: 630 }, { roomType: 'Quad', price: 710 }] }
    ]
  },
  {
    id: 'maysan-rehab-al-misk-alharmain',
    name: 'Maysan Rehab Al Misk',
    city: 'Madinah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 4,
    seasons: [
      { range: '30/06/2026 TO 20/09/2026', prices: [{ roomType: 'Double', price: 480 }, { roomType: 'Triple', price: 540 }, { roomType: 'Quad', price: 600 }] }
    ]
  },
  {
    id: 'arkan-al-manar-alharmain',
    name: 'Arkan Al Manar',
    city: 'Madinah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 4,
    seasons: [
      { range: '30/06/2026 TO 20/09/2026', prices: [{ roomType: 'Double', price: 480 }, { roomType: 'Triple', price: 540 }, { roomType: 'Quad', price: 600 }] }
    ]
  },
  {
    id: 'maysan-al-taqwa-alharmain',
    name: 'Maysan Al Taqwa',
    city: 'Madinah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 4,
    seasons: [
      { range: '30/06/2026 TO 20/09/2026', prices: [{ roomType: 'Double', price: 410 }, { roomType: 'Triple', price: 460 }, { roomType: 'Quad', price: 500 }] }
    ]
  },
  {
    id: 'plaza-in-houd-alharmain',
    name: 'Plaza In Houd',
    city: 'Madinah',
    vendor: 'Alharmain Hotels Management',
    mealPlan: 'RO',
    stars: 3,
    seasons: [
      { range: '30/06/2026 TO 20/09/2026', prices: [{ roomType: 'Double', price: 405 }, { roomType: 'Triple', price: 435 }, { roomType: 'Quad', price: 485 }] }
    ]
  }
];

let content = fs.readFileSync('src/data/hotels.ts', 'utf8');
const insertIndex = content.lastIndexOf('];');
if (insertIndex !== -1) {
  const newContent = content.slice(0, insertIndex) + ',\n' + newHotels.map(h => '  ' + JSON.stringify(h, null, 2).replace(/\n/g, '\n  ')).join(',\n') + '\n' + content.slice(insertIndex);
  fs.writeFileSync('src/data/hotels.ts', newContent);
  console.log('Successfully appended new hotels.');
} else {
  console.log('Could not find end of array.');
}
