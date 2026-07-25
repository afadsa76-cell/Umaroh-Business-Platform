const fs = require('fs');

const content = fs.readFileSync('src/data/hotels.ts', 'utf8');

// Extract the array part
const match = content.match(/export const defaultHotels: Hotel\[\] = (\[[\s\S]*?\]);\n\nexport const getHotels/);

if (match) {
  const arrayStr = match[1];
  // It's a bit hard to parse JSON if it's not strictly JSON (it's a JS array).
  // But wait, the file is a TS file.
  // Let's just use eval or Function to parse it.
  
  // Or better, I can just write a TS script to do it.
}
