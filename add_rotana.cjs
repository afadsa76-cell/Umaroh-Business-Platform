const fs = require('fs');

const newHotel = {
  id: 'maysan-rotana-elmysk-madinah',
  name: 'Maysan Rotana Elmysk',
  city: 'Madinah',
  vendor: 'Maysan Int. Group',
  mealPlan: 'FB',
  stars: 4,
  seasons: [
    {
      range: '30 JUN 2026 TO 20 SEP 2026',
      prices: [
        { roomType: 'Double', price: 430 },
        { roomType: 'Triple', price: 490 },
        { roomType: 'Quad', price: 550 },
      ],
    },
  ],
};

let content = fs.readFileSync('src/data/hotels.ts', 'utf8');

// Insert before the end of the array
content = content.replace(/  \}\n\];\n\nexport const getHotels/, '  },\n  ' + JSON.stringify(newHotel, null, 2).replace(/\n/g, '\n  ') + '\n];\n\nexport const getHotels');

fs.writeFileSync('src/data/hotels.ts', content);
console.log('Done');
