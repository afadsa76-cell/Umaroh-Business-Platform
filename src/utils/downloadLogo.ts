import https from 'https';
import fs from 'fs';

https.get('https://umaroh.com/assets/logo-light-D4UzTX0_.png', (res) => {
  const data: any[] = [];
  res.on('data', (chunk) => data.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(data);
    const base64 = buffer.toString('base64');
    fs.writeFileSync('./src/utils/logoBase64.ts', `export const logoBase64 = "data:image/png;base64,${base64}";\n`);
    console.log('Done');
  });
});
