const fs = require('fs');

const newHotels = [
  {
    id: 'alharmain-dar-al-eiman-al-haram',
    name: 'Dar Al Eiman Al Haram',
    city: 'Madinah',
    vendor: 'Alharmain',
    mealPlan: 'FB',
    seasons: [
      { range: '16 JUN 2026 TO 30 JUN 2026', prices: [{ roomType: 'Double', price: 1050 }, { roomType: 'Triple', price: 1350 }, { roomType: 'Quad', price: 1650 }] },
      { range: '30 JUN 2026 TO 15 AUG 2026', prices: [{ roomType: 'Double', price: 850 }, { roomType: 'Triple', price: 975 }, { roomType: 'Quad', price: 1100 }] }
    ]
  },
  {
    id: 'alharmain-deyar-al-eiman',
    name: 'Deyar Al Eiman',
    city: 'Madinah',
    vendor: 'Alharmain',
    mealPlan: 'FB',
    seasons: [
      { range: '30 JUN 2026 TO 15 AUG 2026', prices: [{ roomType: 'Double', price: 525 }, { roomType: 'Triple', price: 575 }, { roomType: 'Quad', price: 625 }, { roomType: 'Quint', price: 675 }] }
    ]
  },
  {
    id: 'alharmain-durrat-al-eiman',
    name: 'Durrat Al Eiman',
    city: 'Madinah',
    vendor: 'Alharmain',
    mealPlan: 'FB',
    seasons: [
      { range: '30 JUN 2026 TO 15 AUG 2026', prices: [{ roomType: 'Double', price: 475 }, { roomType: 'Triple', price: 525 }, { roomType: 'Quad', price: 575 }, { roomType: 'Quint', price: 625 }] }
    ]
  },
  {
    id: 'alharmain-ancra-hotel',
    name: 'Ancra Hotel',
    city: 'Madinah',
    vendor: 'Alharmain',
    mealPlan: 'FB',
    seasons: [
      { range: '25 JUN 2026 TO 15 AUG 2026', prices: [{ roomType: 'Double', price: 550 }, { roomType: 'Triple', price: 625 }, { roomType: 'Quad', price: 700 }] }
    ]
  },
  {
    id: 'alharmain-movenpick-madina',
    name: 'Movenpick Madina',
    city: 'Madinah',
    vendor: 'Alharmain',
    mealPlan: 'FB',
    seasons: [
      { range: '16 JUN 2026 TO 31 DEC 2026', prices: [{ roomType: 'Double', price: 900 }, { roomType: 'Triple', price: 1050 }, { roomType: 'Quad', price: 1200 }] }
    ]
  },
  {
    id: 'alharmain-emar-royal',
    name: 'Emar Royal',
    city: 'Madinah',
    vendor: 'Alharmain',
    mealPlan: 'FB',
    seasons: [
      { range: '30 JUN 2026 TO 19 AUG 2026', prices: [{ roomType: 'Double', price: 625 }, { roomType: 'Triple', price: 700 }, { roomType: 'Quad', price: 775 }] }
    ]
  },
  {
    id: 'alharmain-emar-elite',
    name: 'Emar Elite',
    city: 'Madinah',
    vendor: 'Alharmain',
    mealPlan: 'FB',
    seasons: [
      { range: '30 JUN 2026 TO 19 AUG 2026', prices: [{ roomType: 'Double', price: 600 }, { roomType: 'Triple', price: 675 }, { roomType: 'Quad', price: 750 }] }
    ]
  },
  {
    id: 'alharmain-emar-al-mektan',
    name: 'Emar Al Mektan',
    city: 'Madinah',
    vendor: 'Alharmain',
    mealPlan: 'FB',
    seasons: [
      { range: '30 JUN 2026 TO 19 AUG 2026', prices: [{ roomType: 'Double', price: 600 }, { roomType: 'Triple', price: 675 }, { roomType: 'Quad', price: 750 }] }
    ]
  },
  {
    id: 'alharmain-emar-taiba',
    name: 'Emar Taiba',
    city: 'Madinah',
    vendor: 'Alharmain',
    mealPlan: 'FB',
    seasons: [
      { range: '30 JUN 2026 TO 19 AUG 2026', prices: [{ roomType: 'Double', price: 430 }, { roomType: 'Triple', price: 470 }, { roomType: 'Quad', price: 510 }] }
    ]
  },
  {
    id: 'alharmain-peninsula-worth',
    name: 'Peninsula Worth',
    city: 'Madinah',
    vendor: 'Alharmain',
    mealPlan: 'FB',
    seasons: [
      { range: '16 JUN 2026 TO 19 AUG 2026', prices: [{ roomType: 'Double', price: 700 }, { roomType: 'Triple', price: 810 }, { roomType: 'Quad', price: 920 }] }
    ]
  },
  {
    id: 'alharmain-gufran-sofwah',
    name: 'Gufran Sofwah',
    city: 'Makkah',
    vendor: 'Alharmain',
    mealPlan: 'FB',
    seasons: [
      { range: '16 JUN 2026 TO 14 OCT 2026', prices: [{ roomType: 'Double', price: 1200 }, { roomType: 'Triple', price: 1550 }, { roomType: 'Quad', price: 1900 }] }
    ]
  },
  {
    id: 'alharmain-le-meredien-tower',
    name: 'Le Meredien Tower',
    city: 'Makkah',
    vendor: 'Alharmain',
    mealPlan: 'FB',
    seasons: [
      { range: '07 JUN 2026 TO 13 AUG 2026', prices: [{ roomType: 'Double', price: 370 }, { roomType: 'Triple', price: 450 }, { roomType: 'Quad', price: 530 }, { roomType: 'Quint', price: 610 }] }
    ]
  },
  {
    id: 'alharmain-sheraton-makkah',
    name: 'Sheraton Makkah',
    city: 'Makkah',
    vendor: 'Alharmain',
    mealPlan: 'FB',
    seasons: [
      { range: '16 JUN 2026 TO 15 SEP 2026', prices: [{ roomType: 'Double', price: 700 }, { roomType: 'Triple', price: 800 }, { roomType: 'Quad', price: 900 }] }
    ]
  },
  {
    id: 'alharmain-marriot-jabal-omar',
    name: 'Marriot Jabal Omar',
    city: 'Makkah',
    vendor: 'Alharmain',
    mealPlan: 'FB',
    seasons: [
      { range: '07 JUN 2026 TO 31 JUL 2026', prices: [{ roomType: 'Double', price: 780 }, { roomType: 'Triple', price: 870 }, { roomType: 'Quad', price: 960 }] },
      { range: '01 AUG 2026 TO 14 NOV 2026', prices: [{ roomType: 'Double', price: 830 }, { roomType: 'Triple', price: 920 }, { roomType: 'Quad', price: 960 }] }
    ]
  }
];

const content = fs.readFileSync('src/data/hotels.ts', 'utf8');

const startIdx = content.indexOf('export const defaultHotels: Hotel[] = [');
const endIdx = content.indexOf('];\n\nexport const getHotels');

if (startIdx > -1 && endIdx > -1) {
  const arrayStr = content.substring(startIdx + 'export const defaultHotels: Hotel[] = '.length, endIdx + 1);
  
  let hotels = [];
  try {
    hotels = eval('(' + arrayStr + ')');
  } catch (e) {
    console.error('Eval failed', e);
    process.exit(1);
  }

  // Add or update
  for (const newHotel of newHotels) {
    const existingIdx = hotels.findIndex(h => h.id === newHotel.id);
    if (existingIdx > -1) {
      hotels[existingIdx] = newHotel;
    } else {
      hotels.push(newHotel);
    }
  }

  const before = content.substring(0, startIdx + 'export const defaultHotels: Hotel[] = '.length);
  const after = content.substring(endIdx + 1);

  const newContent = before + JSON.stringify(hotels, null, 2) + after;
  fs.writeFileSync('src/data/hotels.ts', newContent);
  console.log('Successfully added Alharmain hotels.');
} else {
  console.log('Could not find array bounds');
}
