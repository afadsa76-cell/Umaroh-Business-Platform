const fs = require('fs');

const content = fs.readFileSync('src/data/hotels.ts', 'utf8');

// The file exports defaultHotels and then some functions.
// We can extract the array by evaluating it or parsing it.
// Let's use a regex to find the array content.
// Actually, it's easier to just use typescript compiler or just string manipulation.

const startIdx = content.indexOf('export const defaultHotels: Hotel[] = [');
const endIdx = content.indexOf('];\n\nexport const getHotels');

if (startIdx > -1 && endIdx > -1) {
  const arrayStr = content.substring(startIdx + 'export const defaultHotels: Hotel[] = '.length, endIdx + 1);
  
  // To parse this, we can use a trick: it's valid JS.
  let hotels = [];
  try {
    hotels = eval('(' + arrayStr + ')');
  } catch (e) {
    console.error('Eval failed', e);
    process.exit(1);
  }

  const uniqueHotels = [];
  const seenIds = new Set();

  for (const h of hotels) {
    if (!seenIds.has(h.id)) {
      seenIds.add(h.id);
      uniqueHotels.push(h);
    } else {
      console.log('Removed duplicate:', h.id);
    }
  }

  const before = content.substring(0, startIdx + 'export const defaultHotels: Hotel[] = '.length);
  const after = content.substring(endIdx + 1);

  const newContent = before + JSON.stringify(uniqueHotels, null, 2) + after;
  fs.writeFileSync('src/data/hotels.ts', newContent);
  console.log('Deduplication complete.');
} else {
  console.log('Could not find array bounds');
}
