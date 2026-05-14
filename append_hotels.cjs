const fs = require('fs');
const path = './src/data/hotels.ts';

const newHotels = [
  {
    id: 'pullman-zamzam-makkah-darmawisata',
    name: 'Pullman Zamzam Makkah',
    city: 'Makkah',
    vendor: 'PT. Darmawisata Indonesia',
    mealPlan: 'FB',
    stars: 5,
    seasons: [
      {
        range: '16/06/2026 TO 19/07/2026',
        prices: [
          { roomType: 'Double', price: 980 },
          { roomType: 'Triple', price: 1190 },
          { roomType: 'Quad', price: 1400 }
        ]
      }
    ]
  },
  {
    id: 'le-meridien-makkah-darmawisata',
    name: 'Le Meridien Makkah',
    city: 'Makkah',
    vendor: 'PT. Darmawisata Indonesia',
    mealPlan: 'FB',
    stars: 5,
    seasons: [
      {
        range: '01/07/2026 TO 01/09/2026',
        prices: [
          { roomType: 'Double', price: 630 },
          { roomType: 'Triple', price: 815 },
          { roomType: 'Quad', price: 950 }
        ]
      }
    ]
  },
  {
    id: 'villa-hilton-makkah-darmawisata',
    name: 'VILLA HILTON',
    city: 'Makkah',
    vendor: 'PT. Darmawisata Indonesia',
    mealPlan: 'FB',
    stars: 5,
    seasons: [
      {
        range: '01/06/2026 TO 15/12/2026',
        prices: [
          { roomType: 'Per Bed', price: 220 }
        ]
      }
    ]
  },
  {
    id: 'movenpick-makkah-darmawisata',
    name: 'Movenpick Makkah',
    city: 'Makkah',
    vendor: 'PT. Darmawisata Indonesia',
    mealPlan: 'FB',
    stars: 5,
    seasons: [
      {
        range: '16/06/2026 TO 19/07/2026',
        prices: [
          { roomType: 'Double', price: 980 },
          { roomType: 'Triple', price: 1190 },
          { roomType: 'Quad', price: 1000 }
        ]
      }
    ]
  },
  {
    id: 'maden-taiba-hotel-darmawisata',
    name: 'Maden Taiba Hotel',
    city: 'Madinah',
    vendor: 'PT. Darmawisata Indonesia',
    mealPlan: 'FB',
    stars: 5,
    seasons: [
      {
        range: '25/06/2026 TO 14/08/2026',
        prices: [
          { roomType: 'Double', price: 880 },
          { roomType: 'Triple', price: 1040 },
          { roomType: 'Quad', price: 1200 }
        ]
      }
    ]
  },
  {
    id: 'millineum-al-aqeeq-darmawisata',
    name: 'Millineum Al Aqeeq',
    city: 'Madinah',
    vendor: 'PT. Darmawisata Indonesia',
    mealPlan: 'FB',
    stars: 5,
    seasons: [
      {
        range: '30/06/2026 TO 14/08/2026',
        prices: [
          { roomType: 'Double', price: 780 },
          { roomType: 'Triple', price: 915 },
          { roomType: 'Quad', price: 1050 }
        ]
      }
    ]
  },
  {
    id: 'dar-al-eiman-al-haram-hotel-darmawisata',
    name: 'Dar Al Eiman Al Haram Hotel',
    city: 'Madinah',
    vendor: 'PT. Darmawisata Indonesia',
    mealPlan: 'FB',
    stars: 5,
    seasons: [
      {
        range: '30/06/2026 TO 15/08/2026',
        prices: [
          { roomType: 'Double', price: 830 },
          { roomType: 'Triple', price: 965 },
          { roomType: 'Quad', price: 1100 }
        ]
      }
    ]
  }
];

let content = fs.readFileSync(path, 'utf8');

const newHotelsString = newHotels.map(hotel => JSON.stringify(hotel, null, 2)).join(',\n  ') + ',';

const lastIndex = content.lastIndexOf('];');
if (lastIndex !== -1) {
  content = content.substring(0, lastIndex) + '  ' + newHotelsString + '\n];\n';
  fs.writeFileSync(path, content);
  console.log('Successfully appended hotel data');
} else {
  console.log('Could not find end of array');
}
