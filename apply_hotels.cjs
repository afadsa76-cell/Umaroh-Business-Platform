const fs = require('fs');
const scriptContent = fs.readFileSync('update_hotels.cjs', 'utf8');
const newHotelsStr = scriptContent.match(/const newHotels = (\[[\s\S]*?\]);\n\nlet content/)[1];
const newHotels = eval(newHotelsStr);

let content = fs.readFileSync('src/data/hotels.ts', 'utf8');
const endIdx = content.lastIndexOf('];');
if (endIdx > -1) {
  const before = content.substring(0, endIdx).trim();
  const after = content.substring(endIdx);
  const newContent = before + ',\n' + newHotels.map(h => '  ' + JSON.stringify(h, null, 2).replace(/\n/g, '\n  ')).join(',\n') + '\n' + after;
  fs.writeFileSync('src/data/hotels.ts', newContent);
  console.log('Successfully added new hotels');
} else {
  console.log('Could not find end of array');
}
